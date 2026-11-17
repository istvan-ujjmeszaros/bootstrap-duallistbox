#!/usr/bin/env node
/*
 * Single source of truth for every place the version number lives.
 *
 *   node tools/version.js check        # all occurrences agree with package.json (exit 1 if not)
 *   node tools/version.js bump X.Y.Z   # update every occurrence, rebuild dist/, then check
 *
 * If a new file starts carrying the version, add it to TARGETS below; `check` also scans the
 * tracked files for stray copies of the current version as a safety net.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(root, f), s);

const jsonVersion = /("version"\s*:\s*")([^"]+)(")/;          // first "version" key in the file
const bannerVersion = /(Bootstrap Duallistbox - v)(\d+\.\d+\.\d+[^\s]*)/;

const TARGETS = [
  { file: 'package.json', re: jsonVersion },
  { file: 'bower.json', re: jsonVersion },
  { file: 'composer.json', re: jsonVersion },
  { file: 'bootstrap-duallistbox.jquery.json', re: jsonVersion },   // feeds the grunt banner
  { file: 'package-lock.json', lock: true },
  { file: 'dist/jquery.bootstrap-duallistbox.js', re: bannerVersion, built: true },
  { file: 'dist/jquery.bootstrap-duallistbox.min.js', re: bannerVersion, built: true },
  { file: 'dist/bootstrap-duallistbox.css', re: bannerVersion, built: true }
];

// Paths allowed to mention version numbers outside TARGETS: process docs and tooling that
// cite past releases as examples. Everything else that mentions the current version is flagged.
const STRAY_ALLOW = [/^AGENTS\.md$/, /^\.agents\//, /^tools\//, /^test\//];

function current() {
  return JSON.parse(read('package.json')).version;
}

function versionsIn(t) {
  const s = read(t.file);
  if (t.lock) {
    const j = JSON.parse(s);
    const out = [['top-level', j.version]];
    if (j.packages && j.packages['']) { out.push(['packages[""]', j.packages[''].version]); }
    return out;
  }
  const m = s.match(t.re);
  return [['', m ? m[2] : null]];
}

function check({ quiet } = {}) {
  const want = current();
  const problems = [];
  for (const t of TARGETS) {
    for (const [where, v] of versionsIn(t)) {
      const label = t.file + (where ? ' ' + where : '');
      if (v !== want) { problems.push(`${label}: found ${v === null ? 'no version' : v}, expected ${want}`); }
      else if (!quiet) { console.log(`ok  ${label}: ${v}`); }
    }
  }
  // Safety net: any other tracked file mentioning the current version?
  const known = new Set(TARGETS.map(t => t.file));
  let tracked = [];
  try { tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean); }
  catch (e) { /* not a git checkout (e.g. npm tarball) */ }
  const needle = new RegExp('(^|[^\\d.])v?' + want.replace(/\./g, '\\.') + '(?![\\d])');
  for (const f of tracked) {
    if (known.has(f) || STRAY_ALLOW.some(re => re.test(f)) || /\.(png|jpe?g|gif|eot|ttf|woff2?|otf|ico)$/.test(f)) { continue; }
    let s;
    try { s = read(f); } catch (e) { continue; }
    if (needle.test(s)) { problems.push(`${f}: mentions ${want} but is not in tools/version.js TARGETS`); }
  }
  return problems;
}

function bump(next) {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(next || '')) { throw new Error('usage: version.js bump X.Y.Z'); }
  const prev = current();
  const cmp = (a, b) => { const x = a.split(/[.-]/).map(Number), y = b.split(/[.-]/).map(Number);
    for (let i = 0; i < 3; i++) { if (x[i] !== y[i]) { return x[i] - y[i]; } } return 0; };
  if (cmp(next, prev) <= 0) { throw new Error(`${next} is not greater than current ${prev}`); }

  const pre = check({ quiet: true });
  if (pre.length) { throw new Error('versions are already inconsistent, fix first:\n  ' + pre.join('\n  ')); }

  for (const t of TARGETS.filter(t => !t.built)) {
    let s = read(t.file);
    if (t.lock) {
      // Textual edit keeps the lockfile byte-identical apart from the two version fields.
      const j = JSON.parse(s);
      s = s.replace(jsonVersion, `$1${next}$3`);                      // top-level (first key named version)
      if (j.packages && j.packages['']) {
        s = s.replace(/("packages"\s*:\s*\{\s*""\s*:\s*\{[^}]*?"version"\s*:\s*")([^"]+)(")/, `$1${next}$3`);
      }
    } else {
      s = s.replace(t.re, `$1${next}$3`);
    }
    write(t.file, s);
    console.log(`bumped ${t.file}`);
  }
  console.log('rebuilding dist/ (grunt) ...');
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['grunt'], { cwd: root, stdio: 'inherit' });
  const post = check();
  if (post.length) { throw new Error('after bump:\n  ' + post.join('\n  ')); }
  console.log(`\n${prev} -> ${next} everywhere. Review with: git diff --stat`);
}

if (require.main === module) {
  try {
    const [cmd, arg] = process.argv.slice(2);
    if (cmd === 'check') {
      const p = check();
      if (p.length) { console.error('\nVersion mismatch:\n  ' + p.join('\n  ')); process.exit(1); }
      console.log(`\nall version occurrences = ${current()}`);
    } else if (cmd === 'bump') {
      bump(arg);
    } else {
      console.error('usage: node tools/version.js check | bump X.Y.Z');
      process.exit(2);
    }
  } catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
}

module.exports = { check, current, TARGETS };

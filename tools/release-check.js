#!/usr/bin/env node
/*
 * Pre-release guard. Runs automatically before `npm publish` (prepublishOnly) and in CI on
 * every vX.Y.Z tag push. Refuses the release unless everything below holds.
 *
 *   node tools/release-check.js          # local, full checks
 *   node tools/release-check.js --ci     # in GitHub Actions (skips branch/remote-sync checks)
 *
 * Emergency override for a single check is deliberately not provided; fix the cause instead.
 */
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const version = require('./version');

const root = path.join(__dirname, '..');
const CI = process.argv.includes('--ci') || !!process.env.GITHUB_ACTIONS;
const RELEASE_BRANCH = 'v4';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, Object.assign({ cwd: root, encoding: 'utf8' }, opts)).trim();
const tryOut = (cmd, args) => { try { return sh(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; } };

const failures = [];
function step(name, fn) {
  process.stdout.write(`- ${name} ... `);
  try {
    const msg = fn();
    if (msg) { failures.push(`${name}: ${msg}`); console.log('FAIL\n    ' + msg.replace(/\n/g, '\n    ')); }
    else { console.log('ok'); }
  } catch (e) {
    failures.push(`${name}: ${e.message}`); console.log('FAIL\n    ' + e.message);
  }
}

const v = version.current();
const tag = 'v' + v;
const pkg = require(path.join(root, 'package.json'));
console.log(`Release check for ${pkg.name}@${v} (${CI ? 'CI' : 'local'})\n`);

step('all version occurrences agree', () => {
  const p = version.check({ quiet: true });
  return p.length ? p.join('\n') : null;
});

step('working tree clean', () => {
  const s = sh('git', ['status', '--porcelain']);
  return s ? 'uncommitted changes:\n' + s : null;
});

if (!CI) {
  step(`on ${RELEASE_BRANCH} and in sync with origin`, () => {
    const b = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    if (b !== RELEASE_BRANCH) { return `on branch ${b}, releases are cut from ${RELEASE_BRANCH}`; }
    sh('git', ['fetch', '--quiet', 'origin', RELEASE_BRANCH]);
    const local = sh('git', ['rev-parse', 'HEAD']);
    const remote = sh('git', ['rev-parse', 'origin/' + RELEASE_BRANCH]);
    return local === remote ? null : `HEAD ${local.slice(0, 7)} != origin/${RELEASE_BRANCH} ${remote.slice(0, 7)} (push first)`;
  });
}

step(`tag ${tag} exists, is annotated and points at HEAD`, () => {
  const type = tryOut('git', ['cat-file', '-t', tag]);
  if (!type) { return `missing: git tag -a ${tag} -m "${tag}"`; }
  if (type !== 'tag') {
    // actions/checkout recreates the tag lightweight; ask the remote whether it is annotated
    // (an annotated tag has a peeled "^{}" entry).
    const peeled = CI ? tryOut('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}^{}`]) : '';
    if (!peeled) { return `${tag} is a lightweight tag; recreate it with -a`; }
  }
  const at = sh('git', ['rev-parse', tag + '^{commit}']);
  const head = sh('git', ['rev-parse', 'HEAD']);
  return at === head ? null : `${tag} points at ${at.slice(0, 7)}, HEAD is ${head.slice(0, 7)}`;
});

step('HEAD commit is titled exactly ' + tag, () => {
  const subject = sh('git', ['log', '-1', '--format=%s']);
  return subject === tag ? null : `HEAD subject is "${subject}"`;
});

step('lint + behaviour tests (npm test)', () => {
  try { sh(npm, ['test'], { stdio: ['ignore', 'pipe', 'pipe'] }); return null; }
  catch (e) { return ((e.stdout || '') + (e.stderr || '')).split('\n').filter(l => /FAIL|error|Warning/i.test(l)).slice(0, 15).join('\n') || 'npm test failed'; }
});

step('dist/ is freshly built from src/', () => {
  sh(npx, ['grunt'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const diff = sh('git', ['status', '--porcelain', '--', 'dist']);
  if (diff) {
    sh('git', ['checkout', '--', 'dist']);
    return 'running grunt changed dist/ — commit the rebuilt files before releasing:\n' + diff;
  }
  return null;
});

step('npm tarball contains only release files', () => {
  const out = JSON.parse(sh(npm, ['pack', '--dry-run', '--json'], { stdio: ['ignore', 'pipe', 'ignore'] }));
  const files = out[0].files.map(f => f.path);
  const bad = files.filter(f => /^(test|tools|\.agents|\.claude|\.github|node_modules)\//.test(f) || f === 'AGENTS.md');
  const need = ['dist/jquery.bootstrap-duallistbox.js', 'dist/jquery.bootstrap-duallistbox.min.js', 'dist/bootstrap-duallistbox.css', 'dist/bootstrap-duallistbox.min.css'];
  const missing = need.filter(f => !files.includes(f));
  return (bad.length ? 'should not ship: ' + bad.join(', ') : '') + (missing.length ? ' missing: ' + missing.join(', ') : '') || null;
});

step(`${pkg.name}@${v} not yet on npm`, () => {
  const published = tryOut(npm, ['view', `${pkg.name}@${v}`, 'version']);
  return published ? `${v} is already published — bump the version` : null;
});

if (failures.length) {
  console.error(`\nRELEASE BLOCKED (${failures.length} problem${failures.length > 1 ? 's' : ''}). See .agents/skills/release/SKILL.md.`);
  process.exit(1);
}
console.log(`\nAll release checks passed for ${tag}.`);

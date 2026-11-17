/*
 * Runs the baseline behaviour checks plus every test/*.test.js suite against
 * src/jquery.bootstrap-duallistbox.js (or the file given as first argument).
 * A suite exports `async function (src, h) -> [{name, pass, info}]`, where h is ./harness.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const h = require('./harness');

const file = process.argv[2] || path.join(__dirname, '../src/jquery.bootstrap-duallistbox.js');
const src = fs.readFileSync(file, 'utf8');

(async () => {
  const suites = [['baseline', s => h.baseline(s)]];
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
    suites.push([f, require(path.join(__dirname, f))]);
  }
  let failed = 0;
  for (const [name, run] of suites) {
    console.log(`\n# ${name}`);
    for (const r of await run(src, h)) {
      console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  [${r.info}]`);
      if (!r.pass) { failed++; }
    }
  }
  console.log(`\n${failed ? failed + ' check(s) failed' : 'all checks passed'}`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

/*
 * Behavioural test harness for bootstrap-duallistbox (jsdom, no browser needed).
 *
 *   npm run test:behaviour                       # baseline + test/*.test.js against src/
 *   node test/harness.js <plugin.js> [optsJSON]  # baseline only, against any plugin file
 *                                                # (e.g. `git show <ref>:src/... > /tmp/x.js`)
 *
 * Fixture: options "item 0".."item N-1", value "vI"; every 5th (0,5,10,15) is pre-selected.
 * With n=20 and filter "item 1": box1 shows 9 (1,11,12,13,14,16,17,18,19), box2 shows 2 (10,15).
 */
'use strict';
const fs = require('fs');
const { JSDOM } = require('jsdom');
const jquerySrc = fs.readFileSync(require.resolve('jquery'), 'utf8');

const wait = ms => new Promise(r => setTimeout(r, ms));

function make(pluginSrc, opts = {}, { n = 20, count = 1 } = {}) {
  const selects = Array.from({ length: count }, (_, k) =>
    `<select multiple id="s${k}" name="s${k}">` +
    Array.from({ length: n }, (_, i) => `<option value="v${i}"${i % 5 === 0 ? ' selected' : ''}>item ${i}</option>`).join('') +
    '</select>').join('');
  const dom = new JSDOM(`<form>${selects}</form>`, { runScripts: 'outside-only' });
  const w = dom.window;
  const logs = [];
  w.console.log = (...a) => logs.push(a.join(' '));
  w.eval(jquerySrc);
  w.eval(pluginSrc);
  const $ = w.jQuery;
  const inst = [];
  for (let k = 0; k < count; k++) {
    $('#s' + k).bootstrapDualListbox(opts);
    inst.push($('#s' + k).data('plugin_bootstrapDualListbox'));
  }
  return { w, $, d: inst[0], inst, logs };
}

const box1 = d => d.elements.select1.find('option').length;
const box2 = d => d.elements.select2.find('option').length;
const type = (d, i, v) => d.elements['filterInput' + i].val(v).trigger('keyup');
const selectIn1 = (d, value) => d.elements.select1.find(`option[value=${value}]`).prop('selected', true);

// Settle time after interactions; large enough for any debounce the plugin may have.
const SETTLE = 700;

async function baseline(src, opts = {}) {
  const res = [];
  const ok = (name, cond, info) => res.push({ name, pass: !!cond, info });
  const O = extra => Object.assign({}, opts, extra);

  { const { d } = make(src, O({ nonSelectedFilter: 'item 1' })); await wait(SETTLE);
    ok('initial nonSelectedFilter applied', box1(d) === 9, `box1=${box1(d)} exp 9`); }
  { const { d } = make(src, O()); type(d, 1, 'item 1'); await wait(SETTLE);
    ok('typing filters box1', box1(d) === 9, `box1=${box1(d)} exp 9`); }
  { const { d } = make(src, O()); type(d, 1, 'item 1'); type(d, 2, 'item 1'); await wait(SETTLE);
    ok('type box1 then box2 quickly: box1 filtered', box1(d) === 9, `box1=${box1(d)} exp 9`);
    ok('type box1 then box2 quickly: box2 filtered', box2(d) === 2, `box2=${box2(d)} exp 2`); }
  { const { d } = make(src, O()); type(d, 1, 'item 1'); type(d, 2, 'item 1'); await wait(SETTLE);
    selectIn1(d, 'v11'); d.elements.moveButton.click(); await wait(SETTLE);
    ok('move with both filters active: box1 stays filtered', box1(d) === 8, `box1=${box1(d)} exp 8`);
    ok('move with both filters active: box2 stays filtered', box2(d) === 3, `box2=${box2(d)} exp 3`); }
  { const { inst } = make(src, O(), { count: 2 }); type(inst[0], 1, 'item 1'); type(inst[1], 1, 'item 2'); await wait(SETTLE);
    ok('two widgets typed quickly: A filtered', box1(inst[0]) === 9, `A=${box1(inst[0])} exp 9`);
    ok('two widgets typed quickly: B filtered', box1(inst[1]) === 1, `B=${box1(inst[1])} exp 1`); }
  { const { d } = make(src, O()); type(d, 1, 'item 1'); d.elements.moveAllButton.click(); await wait(SETTLE);
    ok('"move all" right after typing moves only matches', box2(d) === 13, `box2=${box2(d)} exp 13`); }
  { const { d } = make(src, O()); d.elements.select2.find('option').prop('selected', true); d.elements.removeAllButton.click();
    ok('"remove all" empties box2', box2(d) === 0 && box1(d) === 20, `box1=${box1(d)} box2=${box2(d)}`); }
  { const { d } = make(src, O()); d.setNonSelectedFilter('item 1', true);
    ok('setNonSelectedFilter(v, true) is synchronous', box1(d) === 9, `box1=${box1(d)} exp 9`); }
  { const { d } = make(src, O()); d.elements.filterInput1.val('(').trigger('keyup'); await wait(SETTLE);
    ok('invalid regex in filter does not throw, matches nothing', box1(d) === 0, `box1=${box1(d)}`); }
  { const { w, d } = make(src, O()); type(d, 1, 'x'); await wait(SETTLE);
    const before = new Set(Object.keys(new JSDOM('').window));
    const leaked = Object.keys(w).filter(k => !before.has(k) && !['jQuery', '$'].includes(k) &&
      !(w[k] instanceof w.Element)); // jsdom exposes element ids as window props
    ok('no globals leaked', leaked.length === 0, leaked.join(',') || 'none'); }
  { const { d, logs } = make(src, O(), { n: 5000 }); const t = Date.now();
    for (const s of ['i', 'it', 'ite', 'item', 'item ', 'item 4']) { type(d, 1, s); }
    const dt = Date.now() - t; await wait(SETTLE);
    ok('perf (info): 6 keystrokes on 5000 options', true, `${dt}ms in handlers; box1=${box1(d)}; console.log calls=${logs.length}`); }
  return res;
}

module.exports = { make, box1, box2, type, selectIn1, wait, SETTLE, baseline };

if (require.main === module) {
  const src = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '../src/jquery.bootstrap-duallistbox.js'), 'utf8');
  const opts = process.argv[3] ? JSON.parse(process.argv[3]) : {};
  baseline(src, opts).then(res => {
    for (const r of res) { console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}  [${r.info}]`); }
    process.exit(res.filter(r => !r.pass).length);
  });
}

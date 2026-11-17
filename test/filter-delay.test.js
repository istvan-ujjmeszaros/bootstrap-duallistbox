/*
 * filterDelay: debounce filtering while typing (#212).
 */
'use strict';

module.exports = async function (src, h) {
  const res = [];
  const ok = (name, cond, info) => res.push({ name, pass: !!cond, info });
  const DELAY = 300;

  // Everything that works without a delay must keep working with one.
  for (const r of await h.baseline(src, { filterDelay: DELAY })) {
    res.push(Object.assign({}, r, { name: `[filterDelay=${DELAY}] ${r.name}` }));
  }

  { const { d } = h.make(src);
    h.type(d, 1, 'item 1');
    ok('default (0): keyup filters synchronously', h.box1(d) === 9, `box1=${h.box1(d)} exp 9`); }

  { const { d } = h.make(src, { filterDelay: DELAY });
    h.type(d, 1, 'item 1');
    const immediately = h.box1(d);
    await h.wait(DELAY / 2);
    h.type(d, 1, 'item 2');                       // keeps typing before the delay expires
    await h.wait(DELAY / 2 + 50);
    const midway = h.box1(d);                     // first keystroke's timer was cancelled
    await h.wait(DELAY);
    ok('delay: nothing filtered while still typing', immediately === 16 && midway === 16,
      `immediately=${immediately} midway=${midway} exp 16`);
    ok('delay: filtered once typing stops', h.box1(d) === 1, `box1=${h.box1(d)} exp 1`); }

  { const { d } = h.make(src, { filterDelay: DELAY });
    h.type(d, 1, 'item 1');
    d.elements.filterInput1.trigger('change');    // blur / Enter
    ok('delay: change event filters immediately', h.box1(d) === 9, `box1=${h.box1(d)} exp 9`); }

  { const { d } = h.make(src, { filterDelay: DELAY });
    h.type(d, 1, 'item 1');
    h.selectIn1(d, 'v11');
    d.elements.moveButton.click();               // before the timer fires
    await h.wait(DELAY + 100);
    ok('delay: move before timer uses the typed filter', h.box1(d) === 8 && h.box2(d) === 5,
      `box1=${h.box1(d)} exp 8, box2=${h.box2(d)} exp 5`); }

  { const { d } = h.make(src);
    d.setFilterDelay('abc'); const a = d.settings.filterDelay;
    d.setFilterDelay(-5);    const b = d.settings.filterDelay;
    d.setFilterDelay('250'); const c = d.settings.filterDelay;
    ok('setFilterDelay sanitises input', a === 0 && b === 0 && c === 250, `abc->${a} -5->${b} '250'->${c}`); }

  { const { d, w } = h.make(src, { filterDelay: DELAY });
    let err = null;
    w.addEventListener('error', e => { err = e.message; });
    h.type(d, 1, 'item 1');
    d.destroy();
    await h.wait(DELAY + 100);
    ok('delay: destroy() cancels a pending filter', err === null, err || 'no error'); }

  return res;
};

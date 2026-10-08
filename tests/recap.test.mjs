// Saved run + "PREVIOUSLY ON SNACKMAN..." recap rules (run: node --test tests/). No browser needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../game/cart/recap-strings.js');
const Recap = require('../game/cart/recap.js');

const run = (o) => Object.assign({ level: 1, score: 1240, best: 1240, master: false }, o);
test('header and card count: opener first, 3-5 cards, chips only on the last card', () => {
  assert.equal(R.header, 'PREVIOUSLY ON SNACKMAN...');
  for (const level of [0, 1, 2, 3]) for (const last of [null, 'cash', 'hoard', 'over']) {
    const choice = last ? { n: 1, cash: +(last === 'cash'), hoard: +(last === 'hoard'), over: +(last === 'over'), last: { r: last } } : undefined;
    const cards = Recap.build(run({ level, score: level ? 900 : 50, choice, ate: { 0: 22 } }), R);
    assert.ok(cards.length >= 3 && cards.length <= 5, `${level}/${last}: ${cards.length}`);
    assert.equal(cards[0].text, R.opener);
    cards.slice(0, -1).forEach((c) => assert.ok(!c.chips));
    assert.ok(cards.at(-1).chips.length >= 1);
  }
});
test('live lines are plain facts: no digits, no drafts, no placeholders, no Nintendo/Namco names', () => {
  const rx = (t) => new RegExp('^' + t.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+') + '$');
  const drafts = Object.entries(R.drafts).filter(([k]) => k !== 'status').map(([, v]) => rx(v));
  const banned = /pac-?man|namco|nintendo|mario|zelda|blinky|pinky|inky|clyde|waka/i;
  for (const level of [0, 1, 2, 3]) for (const r of ['cash', 'hoard', 'over']) {
    for (const c of Recap.build(run({ level, choice: { n: 2, cash: 1, hoard: 1, over: 0, last: { r } }, ate: { 0: 20, 1: 14 } }), R)) {
      assert.ok(!/\d/.test(c.text), c.text); assert.ok(!c.text.includes('{'), c.text); assert.ok(!banned.test(c.text), c.text);
      for (const d of drafts) assert.ok(!d.test(c.text), 'draft leaked: ' + c.text);
    }
  }
  assert.ok(!banned.test(JSON.stringify(R)));
});
test('facts match the saved run: level, depot choice, what is next, stat chips', () => {
  const t = Recap.build(run({ level: 2, score: 2310, choice: { n: 2, cash: 1, hoard: 1, over: 0, last: { r: 'hoard' } }, ate: { 0: 20, 1: 14 } }), R);
  assert.deepEqual(t.map((c) => c.text), [R.opener, 'You cleared Level One: SORT + WASH, and Level Two: WAH WAH.',
    'At the Plastic Depot you hodled your plastic, then cashed in.', 'Now: Level Three, PARTNER CHAIN.']);
  assert.deepEqual(t.at(-1).chips, ['2,310 SATS', '🍽 34 SNACKS', '🛒1 🛢1 💥0']);
  assert.equal(Recap.build(run({ level: 3 }), R).at(-1).text, 'Now: the Master Level, THE SUPERMARKET DEAL.');
});
test('never on a brand-new or finished run; away threshold is 10 minutes', () => {
  assert.deepEqual(Recap.build(null, R), []); assert.deepEqual(Recap.build({ level: 0, score: 0 }, R), []);
  assert.deepEqual(Recap.build({ best: 5000, master: true }, R), []); assert.deepEqual(Recap.build(run({ done: true }), R), []);
  assert.equal(Recap.AWAY_MS, 600000); assert.equal(Recap.AWAY_KEY, 'snackman.away');
  assert.equal(Recap.shouldShowAfterAway(2 * 60000), false); assert.equal(Recap.shouldShowAfterAway(9.9 * 60000), false);
  assert.equal(Recap.shouldShowAfterAway(11 * 60000), true); assert.equal(Recap.shouldShowAfterAway(NaN), false);
});
test('snarky drafts are kept, marked PENDING JOSE\'S OK, PG', () => {
  assert.equal(R.drafts.status, "PENDING JOSE'S OK");
  assert.ok(Object.keys(R.drafts).length >= 8);
  assert.ok(!/damn|hell|shit|fuck|sex|crap/i.test(JSON.stringify(R.drafts)));
  assert.ok(readFileSync(new URL('../game/cart/recap-strings.js', import.meta.url), 'utf8').includes("PENDING JOSE'S OK"));
});
test('recap code makes no network calls (local save only)', () => {
  for (const f of ['recap.js', 'recap-strings.js']) {
    const src = readFileSync(new URL('../game/cart/' + f, import.meta.url), 'utf8');
    assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|window\.va\(/.test(src), f);
  }
});

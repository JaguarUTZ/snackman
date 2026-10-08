// Sound button logic for Snackman (run: node --test tests/). No browser needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const S = createRequire(import.meta.url)('../shared/sound/snack-sound.js');

test('3-way button: 8-BIT (default) -> FORKASHI -> OFF -> 8-BIT, exact labels', () => {
  assert.deepEqual(S.MODES, ['8bit', 'forkashi', 'off']);
  assert.equal(S.nextMode('8bit'), 'forkashi'); assert.equal(S.nextMode('forkashi'), 'off'); assert.equal(S.nextMode('off'), '8bit');
  assert.deepEqual(S.LABELS, { '8bit': '👾 8-BIT', forkashi: '🎶 FORKASHI', off: '🔇 OFF' });
});
test('Snackman theme loops in 30-60 s and every bar is well formed', () => {
  const s = S.loopSeconds(); assert.ok(s >= 30 && s <= 60, String(s));
  for (const bar of S.SONG) { assert.equal(bar.lead.length, 8); for (const t of bar.lead) assert.ok(t === '-' || t === '.' || S.freq(t) > 0, t); }
  assert.equal(Math.round(S.freq('A4')), 440); assert.equal(Math.round(S.freq('Bb4')), 466);
});
test('FORKASHI = the 10 Punk Link Radio mixes, no suspected covers', () => {
  assert.equal(S.RADIO_BASE, 'https://jaguarutz-tuner.vercel.app/radio/');
  assert.equal(S.TRACKS.length, 10);
  const all = S.TRACKS.map((t) => (t.t + ' ' + t.f).toLowerCase()).join('|');
  for (const bad of ['burrocrat', 'resonance', 'baby come around', 'ojos cafes', 'tony stonie', 'creep', 'beatcoiners', 'purple rain', 'gonna give']) assert.ok(!all.includes(bad), bad);
});

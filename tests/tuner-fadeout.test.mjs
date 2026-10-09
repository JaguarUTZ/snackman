// Tuner protocol (FaLoMi): {type:'jaguarutz:audio', action:'fadeout', ms} -> every cart fades ALL its audio out.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadCart() {
  const listeners = {};
  const win = { addEventListener: (t, f) => (listeners[t] = listeners[t] || []).push(f), localStorage: { getItem: () => null } };
  win.window = win; win.parent = win; // standalone cart (outside the shell)
  vm.runInNewContext(fs.readFileSync(new URL('../shared/sound/cart-sound.js', import.meta.url), 'utf8'), win);
  const fire = (t, e) => (listeners[t] || []).forEach((f) => f(e));
  return { S: win.SnackSound, fire };
}

test('cart: only the exact Tuner message shape fades out, from any origin; default 600 ms', () => {
  const { S, fire } = loadCart(), got = [];
  S.onFadeout((ms) => got.push(ms));
  for (const data of [null, 'fadeout', { type: 'jaguarutz:audio' }, { type: 'jaguarutz:audio', action: 'fadein' }, { type: 'other', action: 'fadeout' }, { snackSound: 'off' }])
    fire('message', { data, origin: 'https://evil.example' });
  assert.deepEqual(got, []); assert.equal(S.leaving, false); assert.equal(S.on, true);
  fire('message', { data: { type: 'jaguarutz:audio', action: 'fadeout', ms: 600 }, origin: 'https://jaguarutz-tuner.vercel.app' });
  fire('message', { data: { type: 'jaguarutz:audio', action: 'fadeout' }, origin: 'https://anything.example' });
  assert.deepEqual(got, [600, 600]); assert.equal(S.leaving, true);
  assert.equal(S.on, false, 'no new sounds once leaving'); assert.equal(S.sfx(true, 1), 0);
});
test('cart: pagehide is the fallback (short fade); late handlers still get told', () => {
  const { S, fire } = loadCart(), got = [];
  S.onFadeout((ms) => got.push(ms)); fire('pagehide', {});
  assert.equal(got.length, 1); assert.ok(got[0] > 0 && got[0] <= 200);
  const late = []; S.onFadeout((ms) => late.push(ms)); assert.deepEqual(late, [0]);
});
test('shell + every cart are wired to the protocol', () => {
  const shell = fs.readFileSync(new URL('../shared/sound/snack-sound.js', import.meta.url), 'utf8');
  assert.match(shell, /tunerFadeoutMs\(e\.data\)/); assert.match(shell, /addEventListener\('pagehide'/); assert.match(shell, /visibilitychange/);
  assert.match(shell, /tellCart\(\{ type: 'jaguarutz:audio', action: 'fadeout'/, 'shell forwards the fadeout to the cart');
  const html = fs.readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('music-switch.js') > 0 && html.indexOf('music-switch.js') < html.indexOf('snack-sound.js'));
  for (const f of ['bid-game.js', 'bonus3d.js', 'levels.html'])
    assert.match(fs.readFileSync(new URL('../game/cart/' + f, import.meta.url), 'utf8'), /onFadeout\(/, f);
  const bid = fs.readFileSync(new URL('../game/cart/bid-game.js', import.meta.url), 'utf8');
  assert.match(bid, /xfade:0\.6,/); assert.doesNotMatch(bid, /linearRampToValueAtTime\(A\.duck/, 'sting dips fully out, not a duck under');
});

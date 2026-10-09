// NO CACOPHONY: fade sequencing on a fake clock (same tests in Punk Link).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { createSwitcher, tunerFadeoutMs } = createRequire(import.meta.url)('../shared/sound/music-switch.js');

// Fake clock: timers run in virtual time; each fake source tracks its gain as a linear ramp.
function rig(opts = {}) {
  let now = 0, seq = 0; const timers = [];
  const clock = { setTimeout: (f, ms) => { const id = ++seq; timers.push({ id, at: now + ms, f }); return id; },
    clearTimeout: (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); } };
  const log = [], sources = {};
  function src(id) {
    if (sources[id]) return sources[id];
    const s = { id, playing: false, from: 0, to: 0, t0: 0, dur: 0, starts: 0,
      gain() { if (!this.playing) return 0; const k = this.dur ? Math.min(1, (now - this.t0) / this.dur) : 1; return this.from + (this.to - this.from) * k; },
      start() { this.playing = true; this.from = this.to = 0; this.t0 = now; this.dur = 0; this.starts++; log.push(['start', id, now]); },
      stop() { log.push(['stop', id, now, this.gain()]); this.playing = false; },
      fade(v, sec) { const g = this.gain(); this.from = g; this.to = v; this.t0 = now; this.dur = sec * 1000; } };
    return (sources[id] = s);
  }
  const sw = createSwitcher(Object.assign({ fadeOut: 0.6, fadeIn: 0.6 }, clock, opts));
  let maxAudible = 0, overlapAt = null;
  function run(ms) { // advance virtual time in 5 ms steps, checking that at most one source is audible
    const end = now + ms;
    while (now < end) {
      now += 5; timers.sort((a, b) => a.at - b.at);
      while (timers.length && timers[0].at <= now) timers.shift().f();
      const audible = Object.values(sources).filter((s) => s.playing && s.gain() > 1e-4);
      maxAudible = Math.max(maxAudible, audible.length);
      if (audible.length > 1 && overlapAt == null) overlapAt = now;
      const started = Object.values(sources).filter((s) => s.playing);
      assert.ok(started.length <= 1, `two sources started at ${now} ms: ${started.map((s) => s.id)}`);
    }
  }
  return { sw, src, run, log, get now() { return now; }, get maxAudible() { return maxAudible; }, get overlapAt() { return overlapAt; } };
}

test('switch: the old source fades fully out and stops before the new one starts at gain 0 and fades in', () => {
  const r = rig(), A = r.src('8bit'), B = r.src('forkashi');
  r.sw.request(A); r.run(1000); assert.ok(Math.abs(A.gain() - 1) < 1e-9);
  r.sw.request(B);
  r.run(300); assert.equal(B.playing, false); assert.ok(A.gain() > 0 && A.gain() < 1, 'A is fading out'); assert.equal(B.gain(), 0);
  r.run(310); assert.equal(A.playing, false); assert.equal(B.playing, false, 'silence gap'); r.run(90); assert.equal(B.playing, true);
  const stopA = r.log.find((l) => l[0] === 'stop' && l[1] === '8bit'), startB = r.log.find((l) => l[0] === 'start' && l[1] === 'forkashi');
  assert.ok(stopA[3] < 1e-9, 'A reached 0 before it was stopped'); assert.ok(startB[2] >= stopA[2] + 75, 'B starts only after A stopped + ~80 ms of silence');
  r.run(700); assert.ok(Math.abs(B.gain() - 1) < 1e-9); assert.equal(r.overlapAt, null); assert.equal(r.maxAudible, 1);
});
test('rapid tapping never stacks: only the latest request starts, one source at a time', () => {
  const r = rig(), A = r.src('8bit'), B = r.src('forkashi'), C = r.src('mine'), sw = r.sw;
  sw.request(A); r.run(200);
  sw.request(B); r.run(50); sw.request(C); r.run(50); sw.request(null); r.run(50); sw.request(B); r.run(50); sw.request(C); r.run(2000);
  assert.deepEqual(r.log.filter((l) => l[0] === 'start').map((l) => l[1]), ['8bit', 'mine']);
  assert.equal(B.starts, 0); assert.equal(r.overlapAt, null);
  for (let i = 0; i < 20; i++) { sw.request([A, B, C, null][i % 4]); r.run(37); } sw.request(B); r.run(3000);
  assert.equal(r.overlapAt, null); assert.equal(r.maxAudible, 1); assert.equal(sw.active && sw.active.id, 'forkashi');
});
test('OFF fades out fully and stops; same source again during fade-out fades back up (no second source)', () => {
  const r = rig(), A = r.src('8bit');
  r.sw.request(A); r.run(800); r.sw.request(null); r.run(700); assert.equal(A.playing, false); assert.equal(r.sw.phase, 'idle');
  r.sw.request(A); r.run(800); r.sw.request(null); r.run(200); r.sw.request(A); r.run(800);
  assert.equal(A.playing, true); assert.ok(Math.abs(A.gain() - 1) < 1e-9); assert.equal(A.starts, 2);
});
test('track change / theme change: fade out, swap, fade back in; never overlapping', () => {
  const r = rig(), F = r.src('forkashi'); let track = 1;
  r.sw.request(F); r.run(800);
  r.sw.restart(() => { assert.ok(!F.playing && F.gain() === 0, 'swap happens only after the fade-out'); track = 2; });
  r.run(300); assert.equal(track, 1); r.run(400); assert.equal(track, 2); assert.equal(F.playing, true); r.run(700);
  assert.ok(Math.abs(F.gain() - 1) < 1e-9); assert.equal(F.starts, 2);
  const main = r.src('8bit:main'), calm = r.src('8bit:calm');
  r.sw.request(main); r.run(100); r.sw.request(calm); r.run(100); r.sw.request(main); r.run(100); r.sw.request(calm); r.run(2500);
  assert.equal(r.overlapAt, null); assert.equal(r.sw.active.id, '8bit:calm');
});
test('duck / SFX dip are level ramps on the same source; a level set during fade-out does not revive it', () => {
  const r = rig(), A = r.src('8bit'), B = r.src('forkashi');
  r.sw.request(A); r.run(800); r.sw.setLevel(0.3); r.run(400); assert.ok(Math.abs(A.gain() - 0.3) < 1e-9);
  r.sw.setLevel(0, 0.1); r.run(120); assert.ok(A.gain() < 1e-9, 'SFX dip: music fully out');
  r.sw.setLevel(1, 0.5); r.run(600); assert.ok(Math.abs(A.gain() - 1) < 1e-9);
  r.sw.request(B); r.run(100); r.sw.setLevel(0.8); r.run(600); assert.equal(r.overlapAt, null); assert.equal(r.sw.active.id, 'forkashi');
  r.run(800); assert.ok(Math.abs(B.gain() - 0.8) < 1e-9);
});
test('Tuner fadeout: only the exact message shape, default 600 ms; music reaches 0 within ms and stops', () => {
  assert.equal(tunerFadeoutMs({ type: 'jaguarutz:audio', action: 'fadeout', ms: 600 }), 600);
  assert.equal(tunerFadeoutMs({ type: 'jaguarutz:audio', action: 'fadeout' }), 600);
  assert.equal(tunerFadeoutMs({ type: 'jaguarutz:audio', action: 'fadeout', ms: 250 }), 250);
  assert.equal(tunerFadeoutMs({ type: 'jaguarutz:audio', action: 'fadeout', ms: 99999 }), 5000);
  for (const bad of [null, 'fadeout', {}, { type: 'jaguarutz:audio' }, { type: 'jaguarutz:audio', action: 'fadein' }, { type: 'x', action: 'fadeout' }, { snackSound: 'off' }])
    assert.equal(tunerFadeoutMs(bad), null, JSON.stringify(bad));
  const r = rig(), A = r.src('8bit');
  r.sw.request(A); r.run(800); r.sw.request(null, 0.25); r.run(255); assert.equal(A.playing, false); assert.ok(r.log.at(-1)[3] < 1e-9);
  const r2 = rig(), F = r2.src('forkashi'); r2.sw.request(F); r2.run(800); r2.sw.request(null); r2.run(100); r2.sw.request(null, 0.2); r2.run(205);
  assert.equal(F.playing, false, 'a faster Tuner fade shortens a running fade-out');
});

/* Snackman sound button (shell side). Same 3-way button as every team game:
     👾 8-BIT (default) -> 🎶 FORKASHI -> 🔇 OFF -> 👾 8-BIT      saved in localStorage 'snackman-sound-mode'
   8-BIT    = "Chomp Chomp HODL": Snackman's OWN original chiptune (bouncy, munchy; F major, 150 BPM, ~51 s loop),
              synthesized live with WebAudio (pulse lead, oom-pah triangle bass, noise drums, chomp blips).
              Written for this game; it does not copy or paraphrase any Nintendo or Namco tune (incl. Pac-Man).
   FORKASHI = Jose's own Luke mixes: the 10 files Punk Link Radio (Tuner channel 7) serves, shuffled on a loop.
              No suspected covers. Streamed from the Tuner (Access-Control-Allow-Origin: *).
   The music lives in the shell so it keeps playing across cartridges. Carts keep their sound effects
   (shared/sound/cart-sound.js) and mute their own background music while this button owns the music.
   Audio starts on the first tap/key (autoplay rules). The music ducks under the level cards and the voice sting. */
(function (root) {
  'use strict';
  var MODES = ['8bit', 'forkashi', 'off'];
  var LABELS = { '8bit': '\uD83D\uDC7E 8-BIT', forkashi: '\uD83C\uDFB6 FORKASHI', off: '\uD83D\uDD07 OFF' };
  var KEY = 'snackman-sound-mode';
  var RADIO_BASE = 'https://jaguarutz-tuner.vercel.app/radio/';
  var TRACKS = [
    { t: 'Track 1 (22-9-26)', f: 'track-1-22-9-26.mp3' }, { t: 'Track 2 (22-9-26)', f: 'track-2-22-9-26.mp3' },
    { t: 'Track 5 (22-9-26)', f: 'track-5-22-9-26.mp3' }, { t: 'Diferente (Edit 1)', f: 'diferente-edit-1.mp3' },
    { t: 'Diferente (Edit 2)', f: 'diferente-edit-2.mp3' }, { t: 'El Son del Sol y la Luna (Ver. 1)', f: 'el-son-del-sol-y-la-luna.mp3' },
    { t: 'Crokie (Take 2)', f: 'crokie-take-2.mp3' }, { t: 'Dirty Morning', f: 'dirty-morning.mp3' },
    { t: 'Sololeño', f: 'sololeno.mp3' }, { t: 'Forku2', f: 'forku2.mp3' }
  ];
  function nextMode(m) { return MODES[(MODES.indexOf(m) + 1) % MODES.length]; }

  /* ---------- "Chomp Chomp HODL" (original). One token per eighth: note, '-' hold, '.' rest ---------- */
  function N(s) { return s.trim().split(/\s+/); }
  var LEAD_A = [ /* BID: F Dm Bb C | F Dm Bb C */
    'C5 C5 . F5 . A5 G5 F5', 'D5 - F5 . A5 . F5 D5', 'D5 D5 . F5 . Bb5 A5 G5', 'E5 - G5 - C6 . . .',
    'C5 C5 . F5 . A5 G5 F5', 'A5 - G5 F5 D5 - F5 .', 'Bb5 A5 G5 F5 G5 - D5 -', 'E5 G5 E5 C5 F5 - . .'].map(N);
  var LEAD_B = [ /* HODL ... then DIGEST: Bb C Am Dm | Gm C F C */
    'F5 - - - - - D5 F5', 'G5 - - - - - E5 G5', 'A5 - - - C6 - A5 -', 'F5 - - - D5 - - .',
    'G5 - Bb5 - D6 - Bb5 -', 'C6 - - Bb5 A5 - G5 -', 'A5 C6 A5 F5 C5 F5 A5 C6', 'Bb5 - G5 - E5 - C5 .'].map(N);
  var CH_A = ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C'], CH_B = ['Bb', 'C', 'Am', 'Dm', 'Gm', 'C', 'F', 'C'];
  var CHORD = { F: ['F2', 'A3', 'C4', 'F4'], Dm: ['D3', 'F3', 'A3', 'D4'], Bb: ['Bb2', 'D4', 'F4', 'Bb4'], C: ['C3', 'E4', 'G4', 'C5'],
    Am: ['A2', 'C4', 'E4', 'A4'], Gm: ['G2', 'Bb3', 'D4', 'G4'] };
  var SONG = [];
  [1, 2].forEach(function (pass) {
    LEAD_A.forEach(function (l, i) { SONG.push({ lead: l, chord: CH_A[i], pass: pass }); });
    LEAD_B.forEach(function (l, i) { SONG.push({ lead: l, chord: CH_B[i], pass: pass }); });
  });
  var BPM = 150;
  function loopSeconds() { return SONG.length * 4 * 60 / BPM; }
  function freq(name) {
    var m = /^([A-G])(#|b)?(\d)$/.exec(name); if (!m) return 0;
    var semis = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
    return 440 * Math.pow(2, semis / 12);
  }

  var API = { MODES: MODES, LABELS: LABELS, KEY: KEY, RADIO_BASE: RADIO_BASE, TRACKS: TRACKS, SONG: SONG, BPM: BPM,
    nextMode: nextMode, loopSeconds: loopSeconds, freq: freq };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document === 'undefined') return; /* node tests stop here */

  /* ---------- engine (same design as Punk Link's) ---------- */
  var mode = '8bit', unlocked = false, ducked = false, duckTimer = null;
  try { var v = localStorage.getItem(KEY); if (MODES.indexOf(v) >= 0) mode = v; } catch (e) {}
  var ctx = null, master = null, pulse25 = null, pulse12 = null, noise = null, seqTimer = null, nextTime = 0, step = 0;
  var el = null, order = [], pos = 0, btn = null;

  function ensure() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
        var wave = function (duty) { var n = 32, re = new Float32Array(n), im = new Float32Array(n); for (var k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); return ctx.createPeriodicWave(re, im); };
        pulse25 = wave(0.25); pulse12 = wave(0.125);
        noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume().catch(function () {});
      return ctx;
    } catch (e) { return null; }
  }
  function chipLevel() { return mode !== '8bit' ? 0 : 0.15 * (ducked ? 0.3 : 1); }
  function setChipGain() { if (ctx && master) try { master.gain.setTargetAtTime(chipLevel(), ctx.currentTime, 0.08); } catch (e) {} }
  function tone(f, t, dur, vol, wave, type) {
    if (!f) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    if (wave) o.setPeriodicWave(wave); else o.type = type || 'triangle';
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.setTargetAtTime(vol * 0.5, t + 0.025, 0.06);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.85, 0.015);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.1);
  }
  function chomp(t) { /* the munch: a quick pulse pitch-drop */
    var o = ctx.createOscillator(), g = ctx.createGain(); o.setPeriodicWave(pulse25);
    o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(190, t + 0.07);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1);
  }
  function drum(kind, t) {
    if (kind === 'kick') {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
      g.gain.setValueAtTime(0.85, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.17); return;
    }
    var s = ctx.createBufferSource(), gg = ctx.createGain(), f = ctx.createBiquadFilter(); s.buffer = noise;
    f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7500 : 2000;
    var len = kind === 'hat' ? 0.035 : 0.1, vol = kind === 'hat' ? 0.16 : 0.42;
    gg.gain.setValueAtTime(vol, t); gg.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f); f.connect(gg); gg.connect(master); s.start(t); s.stop(t + len + 0.02);
  }
  function playStep(t) {
    var e = 60 / BPM / 2, bar = SONG[Math.floor(step / 8) % SONG.length], i = step % 8, ch = CHORD[bar.chord], tok = bar.lead[i];
    if (tok !== '-' && tok !== '.') { var n = 1; while (i + n < 8 && bar.lead[i + n] === '-') n++; tone(freq(tok), t, e * n * (n === 1 ? 0.7 : 1), 0.2, pulse25); }
    tone(freq(ch[0]) * (i % 2 ? 2 : 1), t, e * 0.8, 0.5);                       /* oom-pah bass */
    if (bar.pass === 2) tone(freq(ch[1 + (i % 3)]) * 2, t, e * 0.4, 0.05, pulse12); /* sparkle arpeggio */
    if (i === 0 || i === 4) drum('kick', t);
    if (i === 2 || i === 6) drum('snare', t);
    if (i % 2 === 1) drum('hat', t);
    if (bar.pass === 2 && (i === 3 || i === 7)) chomp(t + e / 2);
    step = (step + 1) % (SONG.length * 8);
    return e;
  }
  function schedule() {
    if (!ctx || mode !== '8bit') return;
    try { if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; while (nextTime < ctx.currentTime + 0.25) nextTime += playStep(nextTime); } catch (e) {}
  }
  function startChip() { if (!ensure()) return; setChipGain(); if (!seqTimer) { nextTime = 0; seqTimer = setInterval(schedule, 50); schedule(); } }
  function stopChip() { setChipGain(); if (seqTimer) { clearInterval(seqTimer); seqTimer = null; } }

  var VOL = 0.4;
  function shuffle() { order = TRACKS.map(function (_, i) { return i; }); for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = order[i]; order[i] = order[j]; order[j] = x; } pos = 0; }
  function elVolume() { return VOL * (ducked ? 0.3 : 1); }
  function loadTrack() { if (!order.length) shuffle(); try { el.src = RADIO_BASE + TRACKS[order[pos]].f; } catch (e) {} }
  function playEl() { if (!el) return; try { el.volume = elVolume(); } catch (e) {} var p = el.play(); if (p && p.catch) p.catch(function () {}); }
  function ensureEl() {
    if (el) return el;
    el = new Audio(); el.preload = 'none'; el.id = 'forkashi-audio';
    var errors = 0, skip = function () { pos = (pos + 1) % order.length; loadTrack(); if (mode === 'forkashi') playEl(); };
    el.addEventListener('ended', skip);
    el.addEventListener('error', function () { if (++errors < TRACKS.length) skip(); });
    el.addEventListener('playing', function () { errors = 0; });
    return el;
  }
  function startFork() { ensureEl(); if (!el.src) { shuffle(); loadTrack(); } playEl(); }
  function stopFork() { if (el) try { el.pause(); } catch (e) {} }

  function apply() {
    if (!unlocked) return;
    if (mode === '8bit') startChip(); else stopChip();
    if (mode === 'forkashi') startFork(); else stopFork();
  }
  function frame() { return document.getElementById('emuframe'); }
  function tellCart() { try { frame().contentWindow.postMessage({ snackSound: mode }, location.origin); } catch (e) {} }
  function render() {
    if (!btn) return;
    btn.textContent = LABELS[mode]; btn.setAttribute('data-mode', mode);
    btn.setAttribute('aria-label', 'Sound: ' + LABELS[mode] + '. Tap to switch: 8-BIT, FORKASHI, OFF.');
  }
  function setDuck(v) { v = !!v; if (v === ducked) return; ducked = v; setChipGain(); if (el) try { el.volume = elVolume(); } catch (e) {} }

  var S = root.SnackSound = {
    get mode() { return mode; }, get unlocked() { return unlocked; }, get ducked() { return ducked; },
    get track() { return el && order.length ? TRACKS[order[pos]].t : null; }, get audioElement() { return el; },
    get contextState() { return ctx ? ctx.state : null; },
    labels: LABELS, modes: MODES,
    /* call from a user gesture (shell tap, or a cart's tap via parent.SnackSound.unlock()) */
    unlock: function () { if (unlocked) { if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {}); return; } unlocked = true; apply(); },
    cycle: function () { mode = nextMode(mode); try { localStorage.setItem(KEY, mode); } catch (e) {} unlocked = true; apply(); render(); tellCart(); return mode; },
    /* duck(true|false) or duck(ms) for a timed duck */
    duck: function (v) {
      clearTimeout(duckTimer);
      if (typeof v === 'number') { setDuck(true); duckTimer = setTimeout(function () { setDuck(false); }, v); } else setDuck(v);
    }
  };

  /* button in the emulator bar, before START */
  btn = document.createElement('button'); btn.type = 'button'; btn.id = 'emusound';
  btn.addEventListener('click', function (e) { e.stopPropagation(); S.cycle(); });
  var bar = document.getElementById('emubar'), start = document.getElementById('emustart');
  if (bar) bar.insertBefore(btn, start || null);
  render();
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { addEventListener(ev, function () { S.unlock(); }, { capture: true, passive: true }); });
  var f = frame(); if (f) f.addEventListener('load', function () { setDuck(false); tellCart(); });
  document.addEventListener('visibilitychange', function () {
    if (!unlocked) return;
    if (document.hidden) { stopFork(); try { if (ctx) ctx.suspend(); } catch (e) {} }
    else { try { if (ctx) ctx.resume(); } catch (e) {} if (mode === 'forkashi') playEl(); }
  });
})(typeof window !== 'undefined' ? window : globalThis);

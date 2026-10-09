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

  /* ---------- engine: ONE central audio manager (shared/sound/music-switch.js), same design as Punk Link's ----------
     NO CACOPHONY: every music change goes through the switcher: the old source fades fully OUT (0.6 s) and stops,
     only then the new one fades IN (0.6 s). Carts never play their own background music inside the shell, so the
     button music is the only music; cart SFX that matter dip it fully out first (SnackSound.sfx). The Tuner's
     {type:'jaguarutz:audio', action:'fadeout', ms} message (or pagehide) fades ALL game audio out within ms. */
  var FADE = 0.6;
  var mode = '8bit', unlocked = false, ducked = false, duckTimer = null, hidden = false, leaving = false;
  try { var v = localStorage.getItem(KEY); if (MODES.indexOf(v) >= 0) mode = v; } catch (e) {}
  var ctx = null, bus = null, master = null, forkGain = null, pulse25 = null, pulse12 = null, noise = null, seqTimer = null, nextTime = 0, step = 0;
  var el = null, elRouted = false, order = [], pos = 0, btn = null, dipHardUntil = 0, dipSoftUntil = 0, dipTimer = null;
  var MS = root.MusicSwitch;
  var sw = MS.createSwitcher({ fadeOut: FADE, fadeIn: FADE, onIdle: function () { if ((hidden || leaving) && ctx) try { ctx.suspend(); } catch (e) {} } });

  function ensure() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        ctx = new AC(); bus = ctx.createGain(); bus.gain.value = 1; bus.connect(ctx.destination);
        master = ctx.createGain(); master.gain.value = 0; master.connect(bus);
        forkGain = ctx.createGain(); forkGain.gain.value = 0; forkGain.connect(bus);
        var wave = function (duty) { var n = 32, re = new Float32Array(n), im = new Float32Array(n); for (var k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); return ctx.createPeriodicWave(re, im); };
        pulse25 = wave(0.25); pulse12 = wave(0.125);
        noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended' && !leaving && !hidden) ctx.resume().catch(function () {});
      return ctx;
    } catch (e) { return null; }
  }
  /* gain ramps start from the current value: no jumps, no clicks */
  function ramp(param, to, sec) {
    if (!ctx || !param) return;
    try {
      var t = ctx.currentTime;
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t); else { var cur = param.value; param.cancelScheduledValues(t); param.setValueAtTime(cur, t); }
      param.linearRampToValueAtTime(to, t + Math.max(0.01, sec));
    } catch (e) {}
  }
  function hold(param, val) { if (!ctx || !param) return; try { param.cancelScheduledValues(ctx.currentTime); param.setValueAtTime(val, ctx.currentTime); } catch (e) {} }
  function rampVolume(a, to, sec) {
    if (!a) return; clearInterval(a.__ramp);
    var from = a.volume, t0 = Date.now(), ms = Math.max(10, sec * 1000);
    a.__ramp = setInterval(function () { var k = Math.min(1, (Date.now() - t0) / ms); try { a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); } catch (e) {} if (k >= 1) clearInterval(a.__ramp); }, 25);
  }
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
    if (!ctx || !seqTimer) return;
    try { if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; while (nextTime < ctx.currentTime + 0.25) nextTime += playStep(nextTime); } catch (e) {}
  }
  var CHIP = {
    id: '8bit',
    start: function () { if (!ensure()) return; hold(master.gain, 0); if (!seqTimer) { nextTime = 0; seqTimer = setInterval(schedule, 50); schedule(); } },
    stop: function () { if (seqTimer) { clearInterval(seqTimer); seqTimer = null; } hold(master && master.gain, 0); },
    fade: function (lv, sec) { ramp(master && master.gain, lv * 0.15, sec); }
  };

  /* FORKASHI: <audio> routed through Web Audio so fades also work on iOS (radio host sends CORS *) */
  var VOL = 0.4, ending = false, forkErrors = 0;
  function shuffle() { order = TRACKS.map(function (_, i) { return i; }); for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = order[i]; order[i] = order[j]; order[j] = x; } pos = 0; }
  function loadTrack() { if (!order.length) shuffle(); try { el.src = RADIO_BASE + TRACKS[order[pos]].f; } catch (e) {} }
  function nextTrack() { ending = false; pos = (pos + 1) % order.length; loadTrack(); }
  /* track change = the ending track fades fully out, swap, the next one fades in (never layered) */
  function changeTrack() { if (sw.active === FORK) sw.restart(nextTrack); else nextTrack(); }
  function ensureEl() {
    if (el) return el;
    el = new Audio(); el.preload = 'none'; el.id = 'forkashi-audio'; el.crossOrigin = 'anonymous';
    el.addEventListener('timeupdate', function () {
      if (ending || sw.active !== FORK || sw.phase !== 'on' || !isFinite(el.duration) || !el.duration) return;
      if (el.duration - el.currentTime <= FADE + 0.15) { ending = true; changeTrack(); }
    });
    el.addEventListener('ended', function () { if (!ending) { ending = true; changeTrack(); } });
    el.addEventListener('error', function () { if (++forkErrors < TRACKS.length) { ending = true; changeTrack(); } });
    el.addEventListener('playing', function () { forkErrors = 0; });
    return el;
  }
  function routeEl() {
    if (elRouted || !ensure()) return elRouted;
    try { ctx.createMediaElementSource(el).connect(forkGain); elRouted = true; } catch (e) { elRouted = false; }
    return elRouted;
  }
  var FORK = {
    id: 'forkashi',
    start: function () {
      ensureEl(); routeEl(); if (!el.getAttribute('src')) { shuffle(); loadTrack(); } ending = false;
      if (elRouted) { hold(forkGain.gain, 0); el.volume = 1; } else { clearInterval(el.__ramp); el.volume = 0; }
      var p = el.play(); if (p && p.catch) p.catch(function () {});
    },
    stop: function () { if (el) try { el.pause(); } catch (e) {} if (elRouted) hold(forkGain.gain, 0); },
    fade: function (lv, sec) { if (elRouted) ramp(forkGain.gain, lv * VOL, sec); else rampVolume(el, lv * VOL, sec); }
  };

  function level() { var now = Date.now(); return (ducked ? 0.3 : 1) * (now < dipHardUntil ? 0 : now < dipSoftUntil ? 0.3 : 1); }
  function apply() {
    if (!unlocked || leaving) return;
    if (mode !== 'off') ensure();
    sw.request(hidden ? null : mode === '8bit' ? CHIP : mode === 'forkashi' ? FORK : null);
  }
  /* cart SFX: notable ones (hits, voice sting, jingles) dip the music fully out first and return the delay
     (seconds) to start the SFX at; tiny blips duck it hard. The music comes back after the SFX. */
  function sfx(notable, dur) {
    if (!unlocked || !sw.active) return 0;
    var now = Date.now(), DIP = 0.12; dur = +dur || 0.2;
    if (notable) { dipHardUntil = Math.max(dipHardUntil, now + (DIP + dur + 0.1) * 1000); sw.setLevel(level(), DIP); }
    else { dipSoftUntil = Math.max(dipSoftUntil, now + (dur + 0.15) * 1000); sw.setLevel(level(), 0.04); }
    clearTimeout(dipTimer);
    dipTimer = setTimeout(function back() { if (Date.now() >= Math.max(dipHardUntil, dipSoftUntil)) sw.setLevel(level(), 0.5); else dipTimer = setTimeout(back, 60); }, Math.max(dipHardUntil, dipSoftUntil) - now);
    return notable ? DIP + 0.02 : 0;
  }
  function frame() { return document.getElementById('emuframe'); }
  function tellCart(msg) { try { frame().contentWindow.postMessage(msg || { snackSound: mode }, location.origin); } catch (e) {} }
  /* Tuner leaving / pagehide: fade ALL game audio (button music + the cart's SFX) to 0 within ms, then stop + suspend */
  function fadeAllOut(ms) {
    leaving = true; var sec = Math.max(0.01, (ms == null ? 600 : ms) / 1000) * 0.9;
    sw.request(null, sec); if (bus) ramp(bus.gain, 0, sec);
    tellCart({ type: 'jaguarutz:audio', action: 'fadeout', ms: Math.round(sec * 1000) });
    setTimeout(function () { try { if (el) el.pause(); if (ctx) ctx.suspend(); } catch (e) {} }, sec * 1000 + 20);
  }
  function comeBack() { if (!leaving) return; leaving = false; if (bus) { try { ctx.resume(); } catch (e) {} ramp(bus.gain, 1, 0.05); } apply(); }
  function render() {
    if (!btn) return;
    btn.textContent = LABELS[mode]; btn.setAttribute('data-mode', mode);
    btn.setAttribute('aria-label', 'Sound: ' + LABELS[mode] + '. Tap to switch: 8-BIT, FORKASHI, OFF.');
  }
  function setDuck(v) { v = !!v; if (v === ducked) return; ducked = v; sw.setLevel(level()); }

  var S = root.SnackSound = {
    get mode() { return mode; }, get unlocked() { return unlocked; }, get ducked() { return ducked; },
    get track() { return el && order.length ? TRACKS[order[pos]].t : null; }, get audioElement() { return el; },
    get contextState() { return ctx ? ctx.state : null; }, get switcher() { return sw; }, get leaving() { return leaving; },
    /* test/debug: current gain of each music source (browser no-overlap checks) */
    levels: function () { return { phase: sw.phase, active: sw.active && sw.active.id, chip: master ? master.gain.value : 0, fork: el && !el.paused ? (elRouted ? forkGain.gain.value : el.volume) : 0, bus: bus ? bus.gain.value : 1, ctx: ctx ? ctx.state : null }; },
    labels: LABELS, modes: MODES,
    /* call from a user gesture (shell tap, or a cart's tap via parent.SnackSound.unlock()) */
    unlock: function () { comeBack(); if (unlocked) { if (ctx && ctx.state === 'suspended' && !hidden) ctx.resume().catch(function () {}); return; } unlocked = true; apply(); },
    cycle: function () { mode = nextMode(mode); try { localStorage.setItem(KEY, mode); } catch (e) {} unlocked = true; comeBack(); apply(); render(); tellCart(); return mode; },
    /* duck(true|false) or duck(ms) for a timed duck (a level ramp on the one active source, never a second source) */
    duck: function (v) {
      clearTimeout(duckTimer);
      if (typeof v === 'number') { setDuck(true); duckTimer = setTimeout(function () { setDuck(false); }, v); } else setDuck(v);
    },
    sfx: sfx, fadeAllOut: fadeAllOut
  };

  /* button in the emulator bar, before START */
  btn = document.createElement('button'); btn.type = 'button'; btn.id = 'emusound';
  btn.addEventListener('click', function (e) { e.stopPropagation(); S.cycle(); });
  var bar = document.getElementById('emubar'), start = document.getElementById('emustart');
  if (bar) bar.insertBefore(btn, start || null);
  render();
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { addEventListener(ev, function () { S.unlock(); }, { capture: true, passive: true }); });
  var f = frame(); if (f) f.addEventListener('load', function () { clearTimeout(duckTimer); setDuck(false); tellCart(); if (leaving) tellCart({ type: 'jaguarutz:audio', action: 'fadeout', ms: 0 }); });
  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden; if (!unlocked) return;
    if (hidden) sw.request(null); /* fades out; the switcher suspends the context once idle */
    else { try { if (ctx && !leaving) ctx.resume(); } catch (e) {} apply(); }
  });
  /* Tuner protocol (FaLoMi): any origin, exact shape only */
  addEventListener('message', function (e) { if (e.source === (frame() && frame().contentWindow)) return; var ms = MS.tunerFadeoutMs(e.data); if (ms != null) fadeAllOut(ms); });
  addEventListener('pagehide', function () { fadeAllOut(120); });
  addEventListener('pageshow', function (e) { if (e.persisted) comeBack(); });
})(typeof window !== 'undefined' ? window : globalThis);

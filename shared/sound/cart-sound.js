/* Snackman sound button (cartridge side). The 3-way button and the music live in the shell
   (shared/sound/snack-sound.js). Inside the shell, a cart: keeps its sound effects (OFF mutes them),
   mutes its own background music, hides its old sound button, forwards taps so audio can start,
   and asks the shell to duck the music under cards / voice lines. Outside the shell nothing changes.
   NO CACOPHONY: SnackSound.sfx(notable, seconds) dips the shell music fully out before a notable SFX (returns the
   delay in seconds to start it at). The Tuner's {type:'jaguarutz:audio', action:'fadeout', ms} message (sent to us,
   or forwarded by the shell) and pagehide run every onFadeout(fn(ms)) handler so the cart fades its own audio out. */
(function () {
  'use strict';
  var KEY = 'snackman-sound-mode', MODES = ['8bit', 'forkashi', 'off'], P = null, changeFns = [], gestureFns = [], fadeFns = [], leaving = false;
  try { if (parent !== window && parent.SnackSound && parent.SnackSound.cycle) P = parent.SnackSound; } catch (e) {}
  function mode() { if (P) return P.mode; try { var v = localStorage.getItem(KEY); return MODES.indexOf(v) >= 0 ? v : '8bit'; } catch (e) { return '8bit'; } }
  /* same rule as shared/sound/music-switch.js tunerFadeoutMs: exact shape only, default 600 ms */
  function tunerMs(d) {
    if (!d || typeof d !== 'object' || d.type !== 'jaguarutz:audio' || d.action !== 'fadeout') return null;
    var ms = Number(d.ms); return isFinite(ms) && ms >= 0 ? Math.min(ms, 5000) : 600;
  }
  function fadeout(ms) { leaving = true; fadeFns.forEach(function (f) { try { f(ms); } catch (x) {} }); }
  window.SnackSound = {
    get inShell() { return !!P; }, get mode() { return mode(); }, get on() { return mode() !== 'off' && !leaving; }, get leaving() { return leaving; },
    onChange: function (fn) { changeFns.push(fn); }, onGesture: function (fn) { gestureFns.push(fn); },
    onFadeout: function (fn) { fadeFns.push(fn); if (leaving) try { fn(0); } catch (x) {} },
    duck: function (v) { if (P) try { P.duck(v); } catch (e) {} },
    sfx: function (notable, sec) { if (!P || leaving) return 0; try { return P.sfx(notable, sec) || 0; } catch (e) { return 0; } },
    tunerMs: tunerMs
  };
  addEventListener('message', function (e) { var ms = tunerMs(e.data); if (ms != null) fadeout(ms); });
  addEventListener('pagehide', function () { fadeout(80); });
  if (!P) return;
  document.documentElement.classList.add('snd-shell');
  var st = document.createElement('style'); st.textContent = '.snd-shell #snd,.snd-shell #sndBtn{display:none!important}'; document.head.appendChild(st);
  addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || !e.data.snackSound) return;
    changeFns.forEach(function (f) { try { f(e.data.snackSound); } catch (x) {} });
  });
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) {
    addEventListener(ev, function () { try { P.unlock(); } catch (e) {} if (leaving) leaving = false; gestureFns.forEach(function (f) { try { f(); } catch (x) {} }); }, { capture: true, passive: true });
  });
})();

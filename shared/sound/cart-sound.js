/* Snackman sound button (cartridge side). The 3-way button and the music live in the shell
   (shared/sound/snack-sound.js). Inside the shell, a cart: keeps its sound effects (OFF mutes them),
   mutes its own background music, hides its old sound button, forwards taps so audio can start,
   and asks the shell to duck the music under cards / voice lines. Outside the shell nothing changes. */
(function () {
  'use strict';
  var KEY = 'snackman-sound-mode', MODES = ['8bit', 'forkashi', 'off'], P = null, changeFns = [], gestureFns = [];
  try { if (parent !== window && parent.SnackSound && parent.SnackSound.cycle) P = parent.SnackSound; } catch (e) {}
  function mode() { if (P) return P.mode; try { var v = localStorage.getItem(KEY); return MODES.indexOf(v) >= 0 ? v : '8bit'; } catch (e) { return '8bit'; } }
  window.SnackSound = {
    get inShell() { return !!P; }, get mode() { return mode(); }, get on() { return mode() !== 'off'; },
    onChange: function (fn) { changeFns.push(fn); }, onGesture: function (fn) { gestureFns.push(fn); },
    duck: function (v) { if (P) try { P.duck(v); } catch (e) {} }
  };
  if (!P) return;
  document.documentElement.classList.add('snd-shell');
  var st = document.createElement('style'); st.textContent = '.snd-shell #snd,.snd-shell #sndBtn{display:none!important}'; document.head.appendChild(st);
  addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || !e.data.snackSound) return;
    changeFns.forEach(function (f) { try { f(e.data.snackSound); } catch (x) {} });
  });
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) {
    addEventListener(ev, function () { try { P.unlock(); } catch (e) {} gestureFns.forEach(function (f) { try { f(); } catch (x) {} }); }, { capture: true, passive: true });
  });
})();

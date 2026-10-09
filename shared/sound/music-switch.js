/* Central music switcher for Snackman's shell (same logic as Punk Link's src/music-switch.js). */
(function (root) {
  /* One active music source at a time. NO CACOPHONY: on every switch the old source fades fully OUT (fadeOut s)
     and is stopped; then GAP s of silence (team spec ~80 ms); only then does the new one start at gain 0 and fade IN
     (fadeIn s). No crossfade, no overlap.
     Rapid requests never stack: while a fade-out runs, later requests just replace the target; only the latest one starts.
     A source is { id, start(), stop(), fade(level01, seconds) }: start() must begin silent (gain 0).
     restart(swap): fade the current source out, stop it, run swap() (e.g. load the next track), fade it back in.
     setLevel(v): duck / calm level for the active source (a short ramp, same source, never a second source).
     Timers are injectable so tests can run on a fake clock. */
  function createSwitcher(opt) {
    opt = opt || {};
    var OUT = opt.fadeOut || 0.6, IN = opt.fadeIn || 0.6, LEVEL_RAMP = opt.levelRamp || 0.3, GAP = opt.gap == null ? 0.08 : opt.gap;
    var later = opt.setTimeout || function (f, ms) { return setTimeout(f, ms); };
    var cancel = opt.clearTimeout || function (t) { clearTimeout(t); };
    var active = null, desired = null, phase = 'idle', timer = null, level = 1, swaps = [], onIdle = opt.onIdle || null;
    function clear() { if (timer != null) { cancel(timer); timer = null; } }
    function same(a, b) { return a === b || (!!a && !!b && a.id === b.id); }
    function call(src, fn, a, b) { try { src[fn](a, b); } catch (e) {} }
    function fadeOut(sec) {
      sec = sec > 0 ? sec : OUT;
      clear(); phase = 'out'; call(active, 'fade', 0, sec);
      timer = later(function () {
        timer = null; call(active, 'stop'); active = null; phase = 'idle';
        var s = swaps; swaps = []; s.forEach(function (f) { try { f(); } catch (e) {} });
        // a short beat of silence (team spec: ~80 ms) before the next source starts
        if (GAP > 0 && desired) { phase = 'gap'; timer = later(function () { timer = null; phase = 'idle'; pump(); }, GAP * 1000); } else pump();
      }, sec * 1000);
    }
    function pump() {
      if (active) return;
      if (!desired) { if (onIdle) try { onIdle(); } catch (e) {} return; }
      active = desired; phase = 'in'; call(active, 'start'); call(active, 'fade', level, IN);
      timer = later(function () { timer = null; if (phase === 'in') phase = 'on'; }, IN * 1000);
    }
    return {
      // request(src[, outSeconds]): outSeconds overrides the fade-out (e.g. the Tuner's fadeout ms)
      request: function (src, outSec) {
        desired = src || null;
        if (!active) { if (phase !== 'gap') { clear(); pump(); } return; }
        if (same(active, desired)) {
          if (phase === 'out' && !swaps.length) { clear(); phase = 'in'; call(active, 'fade', level, IN); timer = later(function () { timer = null; phase = 'on'; }, IN * 1000); }
          return;
        }
        if (phase !== 'out') fadeOut(outSec);
        else if (outSec > 0 && !desired) fadeOut(outSec); // a faster stop (Tuner leaving) shortens a running fade-out
      },
      restart: function (swap) {
        if (!active) { try { swap(); } catch (e) {} return; }
        swaps.push(swap); if (phase !== 'out') fadeOut();
      },
      setLevel: function (v, sec) { level = v; if (active && phase !== 'out') call(active, 'fade', v, sec > 0 ? sec : LEVEL_RAMP); },
      get active() { return active; }, get desired() { return desired; }, get phase() { return phase; }, get level() { return level; },
      FADE_OUT: OUT, FADE_IN: IN
    };
  }

  /* Tuner protocol (FaLoMi): on a channel switch the Tuner posts {type:'jaguarutz:audio', action:'fadeout', ms:600}
     to the game iframe and unloads it ~650 ms later. Any origin is accepted, but only this exact shape.
     Returns the fade time in ms (default 600, clamped 0..5000) or null when the message is something else. */
  function tunerFadeoutMs(data) {
    if (!data || typeof data !== 'object' || data.type !== 'jaguarutz:audio' || data.action !== 'fadeout') return null;
    var ms = Number(data.ms);
    return isFinite(ms) && ms >= 0 ? Math.min(ms, 5000) : 600;
  }
  root.MusicSwitch = { createSwitcher: createSwitcher, tunerFadeoutMs: tunerFadeoutMs };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MusicSwitch;
})(typeof window !== 'undefined' ? window : globalThis);

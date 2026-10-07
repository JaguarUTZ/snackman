// STANDALONE stand-in for the hosted /hub/save.js (legacy per-game API used by Snackman).
// Saves only to this browser's localStorage, using the same key and format as the hosted hub:
//   localStorage["hw_save_<game>"] = { at: <ms>, state: <object> }
// No network calls, no accounts. The original lives in shared/hub-live/save.js.
(function () {
  if (window.HWSave && window.HWSave.__standalone) return;
  function key(g) { return 'hw_save_' + g; }
  function get(g) {
    try { var o = JSON.parse(localStorage.getItem(key(g)) || 'null'); return o && o.state !== undefined ? o.state : null; }
    catch (e) { return null; }
  }
  function put(g, st) { try { localStorage.setItem(key(g), JSON.stringify({ at: Date.now(), state: st })); } catch (e) {} }
  var H = window.HWSave = {
    __standalone: true,
    mode: {},
    load: function (g) { H.mode[g] = 'local'; return Promise.resolve(get(g)); },
    save: function (g, state) { put(g, state); },
    flush: function () { return Promise.resolve(); }
  };
})();

// STANDALONE minimal stand-in for the hosted /hub/common.js (hub helpers, login, feedback via /api/*).
// Only the harmless helpers are kept; there is no login, name gate, or feedback upload.
(function () {
  var HW = window.HW = window.HW || {};
  if (HW.__nameEntry) return; HW.__nameEntry = true;
  HW.GAMES = { snackman: { title: 'Snackman', path: './' } };
  HW.me = function () { return Promise.resolve(null); };
  HW.track = function () {};
  HW.post = function () { return Promise.resolve({ ok: false, offline: true }); };
  HW.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  HW.onSave = function () {};
})();

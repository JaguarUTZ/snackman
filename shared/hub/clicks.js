// STANDALONE no-op for the hosted /hub/clicks.js (click counter posted to /api/clicks).
(function () {
  var s = document.currentScript, game = s && s.getAttribute('data-game');
  if (game && !window.HWClicks) window.HWClicks = { game: game, add: function () {} };
})();

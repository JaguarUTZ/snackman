// STANDALONE stand-in for the hosted /hub/level-gate.js (tester-release checkpoint).
// The hosted version asks /api/access before Level 3 and Master; here every level is open.
// The original lives in shared/hub-live/level-gate.js.
(function () {
  window.HWLevelGate = {
    blocked: false,
    enter: function (game, level, continuePlay) { continuePlay(); return Promise.resolve(true); }
  };
})();

// STANDALONE no-op for the hosted /hub/observe.js (activity telemetry to /api/activity).
(function () {
  if (window.__hwObserve) return; window.__hwObserve = true;
  window.va = window.va || function () {};
  window.HWProgress = window.HWProgress || function () {};
})();

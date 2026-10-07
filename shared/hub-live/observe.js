// Runs in the shell and cartridge frames. No keystrokes, recordings, or free-text capture.
(function () {
  if (window.__hwObserve) return; window.__hwObserve = true;
  var m = location.pathname.match(/^\/games\/([^/]+)/); if (!m || m[1] === 'emu') return;
  var game = /^around-the-world-11520(?:-dev|-v1)?$/.test(m[1]) ? 'around-the-world-11520' : m[1];
  var frame = window !== window.top, page = location.pathname, queued = [], last = Date.now(), timer = null;
  var active = !document.hidden, lastMark = '', sentStart = false, ran = false;
  function elapsed() { var now = Date.now(), sec = active && !frame ? Math.max(0, Math.min(120, Math.floor((now-last)/1000))) : 0; last = now; return sec; }
  function event(kind, mark) {
    queued.push({ kind: kind, page: page, checkpoint: String(mark || '').slice(0, 100), seconds: elapsed() });
    if (queued.length > 20) queued.shift();
    if (!timer) timer = setTimeout(function () { timer = null; flush(false); }, 3000);
  }
  function flush(keep) {
    if (!queued.length) return;
    var batch = queued.splice(0, 20);
    fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: !!keep, body: JSON.stringify({ game: game, events: batch }) }).catch(function () {});
  }
  function mark(text) { text = String(text || '').slice(0, 100); if (text && text !== lastMark) { lastMark = text; event('checkpoint', text); } }
  // Existing games already report named milestones to va(). Reuse only whitelisted signals.
  var oldVa = window.va;
  window.va = function () {
    var a = arguments, info = a[1] || {}, name = info.name || info;
    if (a[0] === 'event' && typeof name === 'string') {
      var data = info.data || a[2] || {};
      if (/^atw_(?:scene|arrive|stop|run_start|lose|win|ending|save)$/.test(name)) {
        var label = data.scene || data.where || data.ending || (data.stop != null ? 'Stop ' + data.stop : name.replace('atw_', ''));
        mark(label);
        if (name === 'atw_run_start') { if (ran) event('retry', lastMark); ran = true; }
      }
    }
    if (oldVa) return oldVa.apply(this, a);
    (window.vaq = window.vaq || []).push(a);
  };
  window.HWProgress = function (label) { mark(label); };
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('button,a,[role="button"]');
    if (el && /^(?:retry|try again|restart|play again|new run)\b/i.test((el.textContent || '').trim())) event('retry', lastMark);
  }, true);
  window.addEventListener('error', function () { event('error', lastMark); });
  window.addEventListener('unhandledrejection', function () { event('error', lastMark); });
  if (!frame) {
    fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.user && !sentStart) { sentStart = true; event('start'); }
    }).catch(function () {});
    setInterval(function () { if (active) event('heartbeat', lastMark); }, 60000);
    document.addEventListener('visibilitychange', function () {
      event(document.hidden ? 'pause' : 'resume', lastMark); active = !document.hidden; last = Date.now(); flush(document.hidden);
    });
    window.addEventListener('pagehide', function () { event('exit', lastMark); flush(true); });
  } else window.addEventListener('pagehide', function () { flush(true); });
})();

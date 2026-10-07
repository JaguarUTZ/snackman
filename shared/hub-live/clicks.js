// Small always-on click counter for one game: <script src="/hub/clicks.js" data-game="snackman" defer></script>
// Counts taps/clicks, batches them to /api/clicks, shows the game's total in the bottom-left corner.
// Inside the game's iframe (same origin) it forwards clicks to the parent page's counter instead of drawing a second one.
(function () {
  var s = document.currentScript, game = s && s.getAttribute('data-game'); if (!game) return;
  var P = null; try { if (parent !== window && parent.HWClicks && parent.HWClicks.game === game) P = parent.HWClicks; } catch (e) {}
  if (P) { document.addEventListener('pointerdown', function () { P.add(1); }, true); return; }
  var el = document.createElement('div'); el.id = 'hw-clk'; el.setAttribute('data-va-skip', ''); el.title = 'Clicks on ' + game;
  el.style.cssText = 'position:fixed;left:6px;bottom:4px;z-index:2147483000;font:8px/1.4 ui-monospace,monospace;color:#9fb8ff;opacity:.7;pointer-events:none;text-shadow:0 0 2px #000';
  var base = 0, pend = 0, t;
  function show() { el.textContent = '\u25C9 clicks: ' + (base + pend).toLocaleString(); }
  function flush(beacon) {
    if (!pend) return; var n = pend; pend = 0; var body = JSON.stringify({ game: game, n: n });
    if (beacon && navigator.sendBeacon) { navigator.sendBeacon('/api/clicks', new Blob([body], { type: 'application/json' })); base += n; return; }
    fetch('/api/clicks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true })
      .then(function (r) { return r.json(); }).then(function (j) { if (j && j.n >= 0) base = j.n; show(); }).catch(function () { base += n; show(); });
  }
  function add(k) { pend += k; show(); clearTimeout(t); t = setTimeout(flush, 3000); }
  window.HWClicks = { game: game, add: add };
  document.addEventListener('pointerdown', function () { add(1); }, true);
  addEventListener('pagehide', function () { flush(true); });
  function mount() { document.body.appendChild(el); show(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  fetch('/api/clicks?game=' + encodeURIComponent(game), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { base = j.n || 0; show(); }).catch(show);
})();

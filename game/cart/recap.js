/* Snackman saved-run recap ("PREVIOUSLY ON SNACKMAN..."). Team pattern: team-kit/recap-spec.md; same rules as Punk Link:
   - shows on CONTINUE and when you come back after 10+ minutes away (tab hidden), only on a run in progress;
   - one line at a time: tap / GO ▶ / Enter / → for the next line; SKIP >> (or Esc / ▼) any time;
   - it is an overlay on top of the level screen, so closing it always drops you back exactly where you were;
   - lines come from recap-strings.js (plain facts); built only from the local save; nothing is sent anywhere.
   If building the cards fails, there is no recap: it must never block resuming. */
(function (root) {
  var AWAY_MS = 10 * 60 * 1000, AWAY_KEY = 'snackman.away';
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function fill(t, v) { return String(t).replace(/\{(\w+)\}/g, function (_, k) { return v[k] == null ? '' : String(v[k]); }); }
  function hasRun(s) { return !!s && !s.done && ((s.level | 0) > 0 || (s.score | 0) > 0); }
  function snacks(s) { var a = s && s.ate, t = 0; if (a) for (var k in a) t += +a[k] || 0; return t; }
  function shouldShowAfterAway(ms) { return typeof ms === 'number' && isFinite(ms) && ms >= AWAY_MS; }
  // save {level, score, choice:{n,cash,hoard,over,last:{r}}, ate:{lv:n}} -> [{text, chips?}] (3..5 cards, or [] = no recap)
  function build(s, R) {
    try {
      R = R || root.SNACK_RECAP; if (!R || !hasRun(s)) return [];
      var lv = Math.max(0, Math.min(3, s.level | 0)), cards = [{ text: R.opener }];
      cards.push({ text: [R.clearedNone, R.clearedOne, R.clearedTwo, R.clearedAll][lv] });
      var c = s.choice, last = c && c.last;
      if (last && R.depot[last.r]) cards.push({ text: R.depot[last.r] });
      var L = R.levels[lv], chips = [fill(R.chips.score, { v: fmt(s.score) })], sn = snacks(s);
      if (sn) chips.push(fill(R.chips.snacks, { v: fmt(sn) }));
      if (c && c.n) chips.push(fill(R.chips.bag, { cash: c.cash || 0, hoard: c.hoard || 0, over: c.over || 0 }));
      cards.push({ text: lv === 3 ? R.nextMaster : fill(R.next, { word: L.word, title: L.title }), chips: chips });
      return cards.length >= 3 && cards.length <= 5 ? cards : [];
    } catch (e) { return []; }
  }
  var API = { AWAY_MS: AWAY_MS, AWAY_KEY: AWAY_KEY, build: build, hasRun: hasRun, shouldShowAfterAway: shouldShowAfterAway, active: false };
  root.SnackRecap = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;

  var box = null, cards = [], i = 0, shownAt = 0, onDone = null;
  function esc(t) { return String(t).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function duck(v) { try { if (root.SnackSound) root.SnackSound.duck(v); } catch (e) {} }
  function render() {
    var R = root.SNACK_RECAP, c = cards[i], lastCard = i === cards.length - 1;
    box.innerHTML = '<div class="rcp-box" role="dialog" aria-modal="true" aria-label="' + esc(R.header) + '">' +
      '<div class="rcp-top"><img src="a/snackman.gif" alt="' + esc(R.portraitAlt) + '"><span class="rcp-h">' + esc(R.header) + '</span><span class="rcp-n">' + esc(fill(R.count, { n: i + 1, N: cards.length })) + '</span></div>' +
      '<p class="rcp-line" aria-live="polite">' + esc(c.text) + '</p>' +
      (c.chips && c.chips.length ? '<p class="rcp-chips">' + c.chips.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</p>' : '') +
      '<p class="rcp-hint">' + esc(R.hint) + '</p>' +
      '<div class="rcp-b"><button type="button" class="go rcp-go">' + esc(lastCard ? R.play : R.go) + '</button><button type="button" class="rcp-skip">' + esc(R.skip) + '</button></div></div>';
    box.querySelector('.rcp-go').addEventListener('click', function (e) { e.stopPropagation(); next(); });
    box.querySelector('.rcp-skip').addEventListener('click', function (e) { e.stopPropagation(); close(); });
    try { box.querySelector('.rcp-go').focus({ preventScroll: true }); } catch (e) {}
  }
  function next() {
    if (!API.active || performance.now() - shownAt < 400) return; // the CONTINUE tap must not also skip the opener
    if (++i >= cards.length) close(); else render();
  }
  function close() {
    if (!API.active) return; API.active = false;
    if (box) box.remove(); box = null;
    var card = document.getElementById('gmcard'); duck(!!(card && !card.hidden));
    var f = onDone; onDone = null; if (f) try { f(); } catch (e) {}
  }
  function show(list, done) {
    if (API.active || !list || list.length < 3) { if (done) done(); return false; }
    cards = list; i = 0; shownAt = performance.now(); onDone = done || null; API.active = true;
    box = document.createElement('div'); box.id = 'rcp';
    box.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    box.addEventListener('click', function (e) { if (!e.target.closest('button')) next(); });
    (document.getElementById('gm') || document.body).appendChild(box);
    render(); duck(true); return true;
  }
  // Keys while the recap is up (capture phase, registered before the level engine's own key handler).
  addEventListener('keydown', function (e) {
    if (!API.active) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat) return;
    if (e.key === 'Escape' || e.key === 'ArrowDown') close();
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') next();
  }, true);
  API.show = show; API.next = next; API.skip = close;
})(typeof window !== 'undefined' ? window : globalThis);

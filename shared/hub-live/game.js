// Included by each hosted game page: records the open for THIS game, shows the feedback button and
// (for logged-in Jaguar Utz users) the player badge: 👤 P11 · 💾 saved state, personal link, log out.
(function () {
  if (window !== window.top || window.__hwGameBadge) return;
  window.__hwGameBadge = true;
  var m = location.pathname.match(/^\/games\/([^/]+)/), game = m && m[1];
  if (/^around-the-world-11520(?:-dev|-v1)?$/.test(game || '')) game = 'around-the-world-11520';
  if (!game || !HW.GAMES[game]) return;
  HW.takeLoginFragment();
  var acc = HW.getAccess(game), sk = 'hw_open_' + game;
  try {
    if (!sessionStorage.getItem(sk)) {
      sessionStorage.setItem(sk, '1');
      HW.track('game_open', { game: game, variant: /cart=bonus3d/.test(location.search) ? '3d' : 'main' });
      HW.post('/api/open', { game: game, token: acc && acc.token, where: 'game' }, true).catch(function () {});
    }
  } catch (e) {}
  var badge = null, user = null, save = null;
  function label() {
    if (!badge) return;
    var s = save ? (save.frozen ? ' · 💾 RELOAD' : save.mode === 'server' ? (save.dirty ? ' · 💾 …' : ' · 💾 ✓') : ' · 💾 local') : '';
    if (!user) { badge.textContent = '💾 SAVES ON THIS DEVICE'; return; }
    badge.textContent = '👤 ' + (user.name || user.nym || 'Player') + s;
  }
  HW.onSave = function (S) { save = S; label(); };
  function openGuest() {
    HW.modal('<h2>START WITH YOUR NAME</h2><p>Return to the shelf to start with just a name. No password required.</p><a class="hw-btn" href="/">GAME SHELF ▸</a>');
  }
  function openBadge() {
    if (!user) return openGuest();
    if (save && save.frozen) { location.reload(); return; }
    var ov = HW.modal('<h2>' + HW.esc(user.name || user.nym || 'PLAYER') + '</h2><p>This browser remembers you.</p>' +
      (save ? '<p>' + (save.mode === 'server' ? 'Your progress in <b>' + HW.esc(HW.GAMES[game].title) + '</b> is saved to your player number' + (save.lastAt ? ' (last save ' + HW.esc(HW.when(save.lastAt)) + ')' : '') + '.' : 'Saving in this browser only right now.') + '</p><button class="hw-btn" type="button" id="hw-sn">SAVE NOW</button><div class="hw-err" id="hw-ss" aria-live="polite"></div>' : '<p>Your player is remembered. Save status has not yet been reported by this game.</p>') +
      '<p class="hw-small">' + (user.recoverable ? 'Your optional login is ' + HW.esc(user.nym) + '. Use it and your password to return on another device.' : 'Returning in this browser is automatic. To return elsewhere—or after clearing browser data—save an optional login first.') + '</p>' +
      (!user.recoverable ? '<a class="hw-btn" href="/?recover=1">SAVE LOGIN (OPTIONAL)</a>' : '') + '<a class="hw-btn" href="/">GAME SHELF</a>');
    var q = function (s) { return ov.querySelector(s); };
    if (q('#hw-sn')) q('#hw-sn').onclick = function () { var st = q('#hw-ss'); st.textContent = 'Saving…'; save.saveNow().then(function (ok) { st.textContent = ok ? 'Saved ✓' : (save.frozen ? 'Newer progress exists: reload.' : 'Kept on this device (not reachable / nothing new).'); }); };
  }
  function mount() {
    HW.mountFeedback(game);
    HW.me().then(function (u) {
      user = u || null;
      badge = HW.el('<button class="hw-fab hw-user-fab" type="button" id="hw-user-fab"></button>');
      badge.onclick = openBadge; document.body.appendChild(badge); label();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

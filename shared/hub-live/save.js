// HWSave: server saves per Jaguar Utz user per game (one login for every game: the hw_user cookie).
//   <script src="/hub/save.js" data-game="blue-fire" data-mirror="key1,key2"></script>
// - The user's server save is pulled BEFORE the game boots (HWSave.ready) and written into localStorage,
//   so the game resumes exactly where the player left off, on any device.
// - Mirror mode: the listed localStorage keys (the game's own save) are uploaded when THIS tab writes them.
//   Data mode: games call HWSave.patch({...}) / HWSave.get(k).
// - Saves locally at once, to the server at most every 15 s and when the tab is hidden/closed.
// - Older-tab guard: each upload names the server version it is based on; if another tab/device saved
//   something newer the server refuses (409), this tab stops saving and offers RELOAD.
// - Not logged in (stranger with an email pass) or offline: saves in this browser only.
// - Without data-game: only the small per-game API older pages use: HWSave.load(g) / save(g, state) / flush(g).
(function () {
  var me = document.currentScript || {};
  var ds = me.dataset || {};
  var game = ds.game;
  if (!game) { legacyApi(); return; }
  var keys = (ds.mirror || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var CK = 'hw_save_' + game, MIN_GAP = 15000;
  var LS = window.localStorage, P = Storage.prototype, oSet = P.setItem, oRem = P.removeItem, oGet = P.getItem;
  var S = window.HWSave = {
    game: game, mode: 'loading', who: null, base: 0, dirty: false, frozen: false, seq: 0, lastAt: null,
    state: { ls: {}, data: {} },
  };
  S.data = S.state.data;
  function jget(k) { try { return JSON.parse(oGet.call(LS, k) || 'null'); } catch (e) { return null; } }
  function jset(k, v) { try { oSet.call(LS, k, JSON.stringify(v)); } catch (e) {} }

  function snapshotLs() {
    keys.forEach(function (k) { var v = null; try { v = oGet.call(LS, k); } catch (e) {} if (v != null) S.state.ls[k] = v; else delete S.state.ls[k]; });
  }
  function applyLs(st) {
    keys.forEach(function (k) {
      try { if (st && st.ls && Object.prototype.hasOwnProperty.call(st.ls, k)) oSet.call(LS, k, st.ls[k]); else oRem.call(LS, k); } catch (e) {}
    });
  }
  function setState(st) { S.state = st && typeof st === 'object' ? st : { ls: {}, data: {} }; S.state.ls = S.state.ls || {}; S.state.data = S.state.data || {}; S.data = S.state.data; }
  function writeLocal() { jset(CK, { who: S.who, base: S.base, dirty: S.dirty, at: Date.now(), state: S.state }); }

  // 2) Detect this window's (and same-origin cartridge frames') writes to the mirrored keys.
  function watch(win) {
    try {
      var WP = win.Storage.prototype;
      if (WP.__hwWatched) return; WP.__hwWatched = true;
      var s = WP.setItem, r = WP.removeItem;
      WP.setItem = function (k, v) { s.call(this, k, v); if (this === win.localStorage && keys.indexOf(k) > -1) changed(k); };
      WP.removeItem = function (k) { r.call(this, k); if (this === win.localStorage && keys.indexOf(k) > -1) changed(k); };
    } catch (e) {}
  }
  function changed(k) {
    if (S.frozen) { applyLs(S.state); return; } // an older tab must not clobber newer progress
    if (S.mode === 'loading') return; // the restore itself
    snapshotLs(); touch();
  }
  addEventListener('storage', function (e) { // another tab of ours saved: keep our copy of it current
    if (S.frozen && e.key && keys.indexOf(e.key) > -1) { if (e.newValue == null) delete S.state.ls[e.key]; else S.state.ls[e.key] = e.newValue; }
  });
  watch(window);
  S.watch = watch;

  var timer = null, lastPush = 0, inflight = false;
  function touch() {
    S.dirty = true; S.seq++; writeLocal(); ui();
    if (S.mode !== 'server' || timer) return;
    timer = setTimeout(function () { timer = null; push(false); }, Math.max(2000, MIN_GAP - (Date.now() - lastPush)));
  }
  S.patch = function (obj) { if (S.frozen || !obj) return; Object.keys(obj).forEach(function (k) { S.state.data[k] = obj[k]; }); snapshotLs(); touch(); };
  S.get = function (k) { return S.state.data[k]; };

  function push(keepalive) {
    if (S.mode !== 'server' || S.frozen || !S.dirty || inflight) return Promise.resolve(false);
    snapshotLs();
    var body = JSON.stringify({ game: game, base: S.base, state: S.state });
    if (body.length > 33 * 1024) { console.warn('HWSave: save over 32 KB, kept on this device only'); return Promise.resolve(false); }
    inflight = true; lastPush = Date.now(); var seq = S.seq;
    return fetch('/api/save', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: !!keepalive, body: body })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 200) { S.base = j.v; S.lastAt = j.at; if (S.seq === seq) S.dirty = false; writeLocal(); ui(); return true; }
          if (r.status === 409) { // newer progress exists elsewhere: adopt it and stop saving from this tab
            S.frozen = true; setState(j.state); S.base = j.v; S.lastAt = j.at; S.dirty = false; applyLs(S.state); writeLocal(); newer(); return false;
          }
          if (r.status === 401) { S.mode = 'local'; ui(); }
          return false;
        });
      })
      .catch(function () { return false; })
      .then(function (ok) { inflight = false; if (S.dirty && !S.frozen && S.mode === 'server' && !timer) timer = setTimeout(function () { timer = null; push(false); }, MIN_GAP); return ok; });
  }
  S.flush = function () { if (timer) { clearTimeout(timer); timer = null; } return push(false); };
  addEventListener('pagehide', function () { push(true); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') push(true); });

  // 3) Restore before the game boots.
  function restore(j) {
    var L = jget(CK);
    if (!j || j._s !== 200) { // not logged in (email pass) / game locked / offline: this browser only
      S.mode = j && j._s ? 'local' : 'offline';
      if (L && L.state) { setState(L.state); S.who = L.who; S.base = L.base | 0; }
      return;
    }
    S.mode = 'server'; S.who = j.who;
    var same = L && L.who === j.who;
    if (j.v > 0 && same && L.dirty && L.base === j.v) { // our unsent changes sit on top of the latest server copy
      setState(L.state); S.base = j.v; S.dirty = true; applyLs(S.state);
    } else if (j.v > 0) { // server copy wins (other device, or newer)
      setState(j.state); S.base = j.v; S.lastAt = j.at; applyLs(S.state);
    } else if (L && L.who && L.who !== j.who) { // another user's progress on this device: start fresh
      setState(null); S.base = 0; applyLs(S.state);
    } else { // first time for this user: upload what this browser already has
      setState(L && L.state); snapshotLs(); S.base = 0;
      S.dirty = Object.keys(S.state.ls).length > 0 || Object.keys(S.state.data).length > 0;
    }
    writeLocal();
  }
  var done = false;
  S.ready = new Promise(function (resolve) {
    var t = setTimeout(function () { if (done) return; done = true; restore(null); resolve(S.state); }, 6000);
    fetch('/api/save?game=' + encodeURIComponent(game), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._s = r.status; return j; }); })
      .catch(function () { return null; })
      .then(function (j) { if (done) return; done = true; clearTimeout(t); restore(j); resolve(S.state); });
  }).then(function (st) { if (S.dirty) touch(); mount(); return st; });

  // 4) status for the player badge (hub/game.js)
   function ui() { try { var H = window !== window.top && parent.HW || window.HW; H && H.onSave && H.onSave(S); } catch (e) {} }
  function mount() { ui(); }
  function modal(html) { return window.HW && HW.modal ? HW.modal(html) : null; }
  S.saveNow = function () { snapshotLs(); S.dirty = true; S.seq++; return S.flush(); };
  function newer() {
    ui();
    var ov = modal('<h2>NEWER SAVE FOUND</h2><p>This game was saved more recently on another tab or device. This tab has stopped saving so it can\'t overwrite that progress.</p><button class="hw-btn" type="button" id="hw-rl">RELOAD ▸</button>');
    if (ov) ov.querySelector('#hw-rl').onclick = function () { location.reload(); };
  }

  // Older per-game API (Snackman pages): same server, same user login.
  function legacyApi() {
    // Not logged in (email pass) -> this browser's copy (localStorage hw_save_<game>) instead of an error.
    var H = window.HWSave = window.HWSave || {};
    var v = {}, pend = {}, t = {}, local = {};
    H.mode = {};
    function lk(g) { return 'hw_save_' + g; }
    function lget(g) { try { var o = JSON.parse(localStorage.getItem(lk(g)) || 'null'); return o && o.state !== undefined ? o.state : null; } catch (e) { return null; } }
    function lput(g, st) { try { localStorage.setItem(lk(g), JSON.stringify({ at: Date.now(), state: st })); } catch (e) {} }
    function setMode(g, m) { H.mode[g] = m; try { window.HW && HW.onSave && HW.onSave({ mode: m, legacy: true, game: g, dirty: false, saveNow: function () { return H.flush(g).then(function () { return true; }); } }); } catch (e) {} }
    function put(g, keep) {
      if (!pend[g]) return; var st = pend[g]; pend[g] = null; lput(g, st);
      if (local[g]) return Promise.resolve();
      var body = JSON.stringify({ game: g, base: v[g] || 0, state: st });
      return fetch('/api/save', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: !!keep, body: body })
          .then(function (r) { if (r.status === 401 || r.status === 403) { local[g] = true; setMode(g, 'local'); } return r.json(); })
          .then(function (j) { if (j && j.v != null) v[g] = j.v; }).catch(function () {}); // 409: adopt the server version, don't resend
    }
    H.load = function (g) {
      return fetch('/api/save?game=' + encodeURIComponent(g), { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { if (!r.ok) { local[g] = r.status === 401 || r.status === 403; return null; } return r.json(); })
        .then(function (j) { if (!j) { setMode(g, 'local'); return lget(g); } v[g] = j.v || 0; setMode(g, 'server'); return j.state || null; })
        .catch(function () { setMode(g, 'local'); return lget(g); });
    };
    H.save = function (g, state) { pend[g] = state; lput(g, state); clearTimeout(t[g]); t[g] = setTimeout(function () { put(g); }, 1200); };
    H.flush = function (g) { clearTimeout(t[g]); return put(g) || Promise.resolve(); };
    addEventListener('pagehide', function () { for (var g in pend) put(g, true); });
  }
})();

// Shared helpers for the Jaguar Utz demo hub. Access is stored PER GAME:
// localStorage["hw_access_<game>"] = {email,name,token,at}. One game never unlocks another.
(function () {
  var HW = window.HW = window.HW || {};
  if (HW.__nameEntry) return;
  HW.__nameEntry = true;
  HW.GAMES = {
    'snackman': { title: 'Snackman', path: '/games/snackman/', codes: 'SM' }, // codes: per-game player-code prefix
    'ahau-kakau': { title: 'Ahau Kakau', path: '/games/ahau-kakau/' },
    'blue-fire': { title: 'Blue Fire', path: '/games/blue-fire/', paused: true },
    'falomi': { title: 'FALOMI', path: '/games/falomi/', paused: true },
    'around-the-world-11520': { title: 'Around the World in 11,520 Blocks', path: '/games/around-the-world-11520-dev/', dir: 'around-the-world-11520-dev', aliases: ['around-the-world-11520', 'around-the-world-11520-v1'] }
  };
  // ---- Jaguar Utz user (one login for every game: hw_user cookie) ----
  var meP = null;
  HW.me = function (fresh) { if (!meP || fresh) meP = fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { return j.user || null; }).catch(function () { return null; }); return meP; };
  // /api/login hands the typed form of the code over in the #fragment once: keep it (this device only) for "copy my link".
  HW.takeLoginFragment = function () {
    try { localStorage.removeItem('hw_user_code'); } catch (e) {}
    if (/hwuser=/.test(location.hash)) try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  };
  HW.when = function (t) { try { return new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return t; } };
  HW.key = function (g) { return 'hw_access_' + g; };
  HW.getAccess = function (g) { try { var v = JSON.parse(localStorage.getItem(HW.key(g)) || 'null'); return v && v.token ? v : null; } catch (e) { return null; } };
  HW.setAccess = function (g, v) { try { localStorage.setItem(HW.key(g), JSON.stringify(v)); } catch (e) {} };
  HW.track = function (name, data) { try { window.va && window.va('event', { name: name, data: data || {} }); } catch (e) {} };
  HW.post = function (url, body, keepalive) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: !!keepalive, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  };
  HW.el = function (html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
  HW.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  HW.modal = function (inner) {
    var ov = HW.el('<div class="hw-ov" role="dialog" aria-modal="true"><div class="hw-card"><button class="hw-x" type="button" aria-label="Close">×</button>' + inner + '</div></div>');
    function close() { ov.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    ov.querySelector('.hw-x').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
    ov.close = close;
    return ov;
  };

  // Floating feedback button for ONE game (rating 1-5 + comment), tied to that game's access.
  HW.mountFeedback = function (game, label) {
    if (!HW.GAMES[game] || document.querySelector('.hw-fab[data-game="' + game + '"]')) return;
    var fab = HW.el('<button class="hw-fab" type="button" data-game="' + game + '">' + HW.esc(label || '★ FEEDBACK') + '</button>');
    fab.onclick = function () {
      var acc = HW.getAccess(game) || {};
      var ov = HW.modal('<h2>FEEDBACK</h2><p>' + HW.esc(HW.GAMES[game].title) + (acc.email ? ' · sent as ' + HW.esc(acc.email) : '') + '</p>' +
        '<label>How was it? (1-5)</label><div class="hw-stars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-n="' + n + '">' + n + '★</button>'; }).join('') + '</div>' +
        '<label for="hw-fc">Comment</label><textarea id="hw-fc" maxlength="2000" placeholder="What worked, what broke, what confused you?"></textarea>' +
        '<button class="hw-btn" type="button" id="hw-fs">SEND ▸</button><div class="hw-err" aria-live="polite"></div>');
      var rating = 0, stars = ov.querySelectorAll('.hw-stars button');
      stars.forEach(function (b) { b.onclick = function () { rating = +b.dataset.n; stars.forEach(function (s) { s.classList.toggle('on', +s.dataset.n <= rating); }); }; });
      var err = ov.querySelector('.hw-err'), btn = ov.querySelector('#hw-fs');
      btn.onclick = function () {
        if (!rating) { err.textContent = 'Pick a rating from 1 to 5.'; return; }
        btn.disabled = true; err.textContent = '';
        HW.post('/api/feedback', { game: game, token: acc.token, rating: rating, comment: ov.querySelector('#hw-fc').value, page: location.pathname })
          .then(function (j) {
            if (!j.ok) { btn.disabled = false; err.textContent = j.error || 'Could not send.'; return; }
            HW.track('feedback_submit', { game: game, rating: rating });
            ov.querySelector('.hw-card').innerHTML = '<h2>THANK YOU!</h2><p>Your feedback on ' + HW.esc(HW.GAMES[game].title) + ' reached Jaguar Utz.</p><button class="hw-btn" type="button">CLOSE</button>';
            ov.querySelector('.hw-btn').onclick = ov.close;
          })
          .catch(function () { btn.disabled = false; err.textContent = 'Network error, try again.'; });
      };
    };
    document.body.appendChild(fab);
  };
})();

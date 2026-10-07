// One name to start. Same-browser return is automatic; password recovery is optional.
(function () {
  var q = new URLSearchParams(location.search), ME = null, pending = null;
  // Remove retired credential-bearing query parameters without attempting login.
  ['u', 'code', 'invite', 'login'].forEach(function (k) { q.delete(k); });
  try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '')); } catch (e) {}
  function gameOf(href) {
    var m = String(href || '').match(/\/games\/([^/?#]+)/);
    if (!m) return null;
    if (HW.GAMES[m[1]]) return m[1];
    for (var g in HW.GAMES) if (HW.GAMES[g].dir === m[1] || (HW.GAMES[g].aliases || []).indexOf(m[1]) !== -1) return g;
    return null;
  }
  function enter(g, href) {
    if (HW.GAMES[g] && HW.GAMES[g].paused) {
      HW.modal('<h2>COMING BACK SOON</h2><p>This game is temporarily unavailable during the limited playtest. Your previous progress is safe.</p>');
      return;
    }
    if (ME && ME.focus.allow.indexOf(g) < 0) {
      HW.modal('<h2>GAME NOT OPEN</h2><p>This existing player account has a game access restriction. Contact the game administrator to change it.</p>');
      return;
    }
    var G = HW.GAMES[g];
    location.href = href || G.path;
  }
  function playerForm(mode, g, href) {
    mode = mode || 'start';
    var ov = HW.modal('<h2 id="hw-player-title">WHAT SHOULD WE CALL YOU?</h2><p id="hw-player-copy">A name or nickname is all you need. Progress saves automatically, and this browser remembers you.</p><form><div id="hw-name-fields"><label for="hw-name">Name or nickname</label><input id="hw-name" autocomplete="nickname" maxlength="60" placeholder="Your name"></div><div id="hw-login-fields"><label for="hw-nym">Nym</label><input id="hw-nym" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="3" maxlength="24"><label for="hw-pass">Password</label><input id="hw-pass" type="password" minlength="6" maxlength="128"><div id="hw-confirm"><label for="hw-pass2">Repeat password</label><input id="hw-pass2" type="password" autocomplete="new-password" maxlength="128"></div></div><button class="hw-btn" type="submit" id="hw-player-submit">PLAY ▸</button><div class="hw-err" aria-live="polite"></div><p class="hw-small" id="hw-player-note">We record game progress, time played, retries and errors to improve the games—not your keystrokes or recordings. A password is optional for returning on another device or after clearing browser data.</p></form><button type="button" id="hw-player-mode">Already saved a password? Log in</button>');
    var form = ov.querySelector('form'), btn = ov.querySelector('#hw-player-submit'), err = ov.querySelector('.hw-err');
    function setMode(next) {
      mode = next;
      var start = mode === 'start', setup = mode === 'setup';
      ov.querySelector('#hw-name-fields').hidden = !start;
      ov.querySelector('#hw-login-fields').hidden = start;
      ov.querySelector('#hw-confirm').hidden = !setup;
      ov.querySelector('#hw-name').required = start;
      ov.querySelector('#hw-name').disabled = !start;
      ['#hw-nym', '#hw-pass'].forEach(function (id) { var el = ov.querySelector(id); el.required = !start; el.disabled = start; });
      ov.querySelector('#hw-pass').autocomplete = setup ? 'new-password' : 'current-password';
      ov.querySelector('#hw-pass2').required = setup; ov.querySelector('#hw-pass2').disabled = !setup;
      ov.querySelector('#hw-player-title').textContent = start ? 'WHAT SHOULD WE CALL YOU?' : setup ? 'SAVE A LOGIN (OPTIONAL)' : 'WELCOME BACK';
      ov.querySelector('#hw-player-copy').textContent = start ? 'A name or nickname is all you need. Progress saves automatically, and this browser remembers you.' : setup ? 'Your progress already saves automatically. Add a nym and password only if you want to return on another device or after clearing browser data.' : 'Use the nym and password you saved earlier.';
      ov.querySelector('#hw-player-note').textContent = start ? 'We record game progress, playtime, retries, errors and IP-based country to improve the games—not keystrokes, recordings or raw IP addresses. A password is optional for returning elsewhere.' : 'Nyms use 3–24 letters, numbers, hyphens or underscores; passwords use 6–128 characters. There is no automatic password reset.';
      btn.textContent = start ? 'PLAY ▸' : setup ? 'SAVE LOGIN ▸' : 'LOG IN ▸';
      var switcher = ov.querySelector('#hw-player-mode');
      switcher.hidden = setup;
      switcher.textContent = start ? 'Already saved a password? Log in' : 'New here? Start with just a name';
      err.textContent = '';
      setTimeout(function () { ov.querySelector(start ? '#hw-name' : '#hw-nym').focus(); }, 30);
    }
    ov.querySelector('#hw-player-mode').onclick = function () { setMode(mode === 'start' ? 'login' : 'start'); };
    setMode(mode);
    form.onsubmit = function (e) {
      e.preventDefault();
      var password = ov.querySelector('#hw-pass').value;
      if (mode === 'setup' && password !== ov.querySelector('#hw-pass2').value) { err.textContent = 'Passwords do not match.'; return; }
      var body = mode === 'start' ? { action: 'start', name: ov.querySelector('#hw-name').value.trim() } : { action: mode, nym: ov.querySelector('#hw-nym').value.trim(), password: password };
      if (mode === 'start' && !body.name) { err.textContent = 'Enter a name or nickname.'; return; }
      btn.disabled = true; err.textContent = '';
      // Serialize starts in this tab so rapid clicks cannot create separate players.
      pending = pending || HW.post('/api/login', body);
      pending.then(function (j) {
        pending = null;
        if (!j.ok) throw j;
        ME = j.user; ov.close();
        if (g) enter(g, href); else location.href = '/';
      }).catch(function (j) { pending = null; btn.disabled = false; err.textContent = j.error || 'Network error, try again.'; });
    };
  }
  // Reusable from the in-game save badge; setup keeps the same player and all saves.
  HW.setupPlayer = function () { playerForm('setup'); };
  HW.leavePlayer = function (user) {
    function logout() { HW.post('/api/me', { logout: true }).then(function () { location.href = '/'; }); }
    if (user.recoverable) return logout();
    var ov = HW.modal('<h2>SWITCH PLAYER?</h2><p>Without a saved password, switching players removes this browser’s way to return to your current progress. You can save a login first, or keep playing.</p><button class="hw-btn" type="button" id="hw-keep">KEEP PLAYING</button><button type="button" id="hw-recover">SAVE LOGIN FIRST</button><button type="button" id="hw-switch">SWITCH ANYWAY</button>');
    ov.querySelector('#hw-keep').onclick = ov.close;
    ov.querySelector('#hw-recover').onclick = function () { ov.close(); HW.setupPlayer(); };
    ov.querySelector('#hw-switch').onclick = logout;
  };
  function bar() {
    var hd = document.querySelector('header'); if (!hd) return;
    var el = HW.el('<div class="hw-userbar"></div>');
    if (ME) {
      el.innerHTML = '<span>👤 ' + HW.esc(ME.name || ME.nym || 'Player') + ' · THIS BROWSER REMEMBERS YOU</span>' +
        (!ME.recoverable ? '<button type="button" id="hw-setup">SAVE LOGIN (OPTIONAL)</button>' : '') +
        '<button type="button" id="hw-out">SWITCH PLAYER</button>';
      if (el.querySelector('#hw-setup')) el.querySelector('#hw-setup').onclick = HW.setupPlayer;
      el.querySelector('#hw-out').onclick = function () { HW.leavePlayer(ME); };
    } else {
      el.innerHTML = '<span>JUST A NAME TO START · AUTOMATIC SAVES</span><button type="button" id="hw-start">PLAY</button><button type="button" id="hw-login">LOG IN</button>';
      el.querySelector('#hw-start').onclick = function () { playerForm('start'); };
      el.querySelector('#hw-login').onclick = function () { playerForm('login'); };
    }
    hd.appendChild(el);
  }
  var ready = HW.me().then(function (u) { ME = u; return u; });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.closest('.hw-ov')) return;
    var g = gameOf(a.getAttribute('href')); if (!g) return;
    e.preventDefault();
    ready.then(function () { if (ME) enter(g, a.getAttribute('href')); else playerForm('start', g, a.getAttribute('href')); });
  });
  function boot() {
    ready.then(function () {
      bar();
      var g = q.get('game'), n = q.get('next');
      if (g && HW.GAMES[g]) {
        var next = n && n.charAt(0) === '/' && n.charAt(1) !== '/' && gameOf(n) === g ? n : HW.GAMES[g].path;
        if (ME) enter(g, next); else playerForm('start', g, next);
      } else if (q.get('recover') === '1' && ME) HW.setupPlayer();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

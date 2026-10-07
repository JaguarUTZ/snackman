// Temporary tester-release checkpoint guard. The server decides every entry;
// this screen is only UX, never an authorization source.
(function () {
  var pending = Object.create(null), denied = Object.create(null), panel = null;
  function show(message, contact, retry) {
    if (!panel) {
      panel = document.createElement('div');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.94);color:#fff;font:16px/1.5 system-ui;text-align:center;padding:16px';
      var box = document.createElement('div');
      box.style.cssText = 'max-width:540px;padding:32px;background:#181820;border:2px solid #ffd400;border-radius:12px';
      box.innerHTML = '<h2>MORE GAME AHEAD</h2><p id="hw-limit-message"></p><p id="hw-limit-contact"></p><button type="button" id="hw-check-access">CHECK ACCESS AGAIN</button> <a href="/" style="color:#ffd400">GAME SHELF</a>';
      panel.appendChild(box);
      document.body.appendChild(panel);
    }
    panel.querySelector('#hw-limit-message').textContent = message;
    panel.querySelector('#hw-limit-contact').textContent = contact || '';
    panel.querySelector('#hw-check-access').onclick = retry;
    panel.hidden = false;
    panel.querySelector('#hw-check-access').focus();
  }
  function enter(game, level, continuePlay) {
    var key = game + ':' + level;
    if (pending[key]) return pending[key];
    if (denied[key]) return Promise.resolve(false);
    pending[key] = fetch('/api/access?game=' + encodeURIComponent(game) + '&level=' + level,
      { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
      .then(function (reply) {
        if (reply.ok && reply.data.allowed === true) {
           Object.keys(denied).forEach(function (other) { if (other.indexOf(game + ':') === 0) delete denied[other]; });
          if (panel) panel.hidden = true;
          continuePlay();
          return true;
        }
        denied[key] = true;
        var invited = reply.data.reason === 'invitation-required';
        show(invited ? 'To keep playing beyond Level 2, ask Jay personally for an invitation.' :
          'Could not check your access. Your progress stays saved. Try again shortly.',
        invited ? 'jay@howardwoodsgames.com' : '',
        function () { delete denied[key]; enter(game, level, continuePlay); });
        return false;
      }).catch(function () {
        denied[key] = true;
        show('Could not check your access. Your progress stays saved. Try again shortly.', '',
          function () { delete denied[key]; enter(game, level, continuePlay); });
        return false;
      }).finally(function () { delete pending[key]; });
    return pending[key];
  }
  var gate = { enter: enter };
  Object.defineProperty(gate, 'blocked', { get: function () {
    return Object.keys(pending).length > 0 || Object.keys(denied).length > 0;
  } });
  // The engines also stop updating while blocked. Keep held/typed keys from
  // reaching their global input handlers behind the invitation dialog.
  ['keydown', 'keyup'].forEach(function (name) {
    window.addEventListener(name, function (event) {
      if (!gate.blocked) return;
      if (panel && panel.contains(event.target)) { event.stopImmediatePropagation(); return; }
      event.preventDefault(); event.stopImmediatePropagation();
    }, true);
  });
  window.HWLevelGate = gate;
})();

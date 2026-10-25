/* Snackman offline cache (network first, cache fallback). After one online visit the whole game, the vendored
   language kit and the string tables keep working on a train with no signal. Bump V to drop old caches. */
const V = 'snackman-v4'; // v2 2026-10-24: kit 1.1.2 · v3 2026-10-24: bounce fix (SHELF guard, PPSLayer) · v4 2026-10-25: loop links strip
const CORE = ['./', 'index.html', 'shared/vendor/jaguarutz-kit.js', 'shared/i18n/strings.js',
  'cart/title.html', 'cart/prologue.html', 'cart/levels.html', 'cart/bonus3d.html',
  'cart/bid-game.js', 'cart/levels.js', 'cart/bonus3d.js', 'cart/three.module.min.js', 'cart/cover7.webp',
  'cart/a/snackman.gif', 'cart/a/snackman-hit.ogg', 'cart/a/snackman-hit.m4a', 'cart/a/snackman-plop.ogg', 'cart/a/snackman-plop.m4a',
  'cart/audio/snackman-theme.ogg', 'cart/audio/snackman-theme.m4a', 'cart/audio/snackman-hit.ogg', 'cart/audio/snackman-hit.m4a',
  'cart/audio/snackman-plop.ogg', 'cart/audio/snackman-plop.m4a',
  'cart/audio/act1-fiatpocalypse-loop.ogg', 'cart/audio/act1-fiatpocalypse-loop.m4a',
  'cart/audio/act2-crokie-take2-loop.ogg', 'cart/audio/act2-crokie-take2-loop.m4a',
  'cart/audio/sting-fiatpocalypse-intro.ogg', 'cart/audio/sting-fiatpocalypse-intro.m4a',
  'cart/audio/win-forking-climax.ogg', 'cart/audio/win-forking-climax.m4a',
  '../shared/emu/shell.css', '../shared/emu/shell.js', '../shared/emu/cart.js',
  '../shared/hub/observe.js', '../shared/hub/save.js', '../shared/hub/level-gate.js', '../shared/hub/clicks.js',
  '../shared/hub/hub.css', '../shared/hub/common.js', '../shared/hub/game.js', '../shared/hub/visit.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('snackman-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url);
  const font = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (u.origin !== location.origin && !font) return;
  e.respondWith(fetch(r).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: u.origin === location.origin }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});

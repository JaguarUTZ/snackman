/* SNACKMAN 3D: prototype. Phase 1 "the bid" (eat all plastic along the river) → Phase 2 "sorting" (resin codes → lines) + FACTORY LAYOUT calculator.
   All numbers are ILLUSTRATION. Edit the assumptions below. */
import * as THREE from './three.module.min.js';

/* ===== SCALING ASSUMPTIONS (ILLUSTRATION: real stream data comes later) ===== */
const A = {
  PLANT_TPY: 1000,          // example plant size, t/yr (deck "Model Plant: 1,000 t/yr"); the panel lets you switch 1k / 5k / 20k
  DAYS: 300,                // operating days per year
  HOURS: 16,                // operating hours per day
  BALER_TPH: 1.0,           // one baler line, t/h (PET + rigid HDPE)
  RETORT_TPD: 1.0,          // plastic per retort, t/day
  RETORTS_PER_REACTOR: 3,   // deck: "≥2 pyrolyzers × 3 retorts"
  KG_PER_GAL: 8,            // deck unit chain: 8 kg → 1 gal
  KWH_PER_GAL: 36.5,        // deck unit chain: ~36.5 kWh/gal (gross)
  SATS_PER_KG: 384,         // deck unit chain: ~384 sats/kg (gross bunker proxy)
  CONCRETE_LINE_TPD: 2,     // plastic per Concreto Plástico line, t/day
  COVER_PLASTIC_KG: 6,      // plastic per utility cover (like the #7 cover photo)
  PHASE1_GOAL_KG: 12,       // game kg to eat before sorting starts
  SORT_GOAL: 8,             // phase 2 goal: pieces sorted to the right line
  SORT_TIME: 90,            // phase 2 clock, seconds
  POOP_EVERY: 4,            // ₿ poop every N bites
};
const AUDIO_BASE = 'audio/'; /* shelf copy: sounds bundled next to this file */  // Snackman sounds shared with the 2D game

/* ===== STREAMS (EcoAlquimia wording from the deck's "Every stream has a buyer") ===== */
const ST = {
  SOLD: { name: 'SOLD · BALER LINE', short: 'SOLD', color: '#4FC3F7', out: 'PET + rigid HDPE bales: high-value recyclables, sold' },
  PYRO: { name: 'PYROLYSIS → OIL', short: 'PYRO', color: '#FC9838', out: 'films · multilayer · low-value plastics → oil: heat, fuel, power, ₿' },
  CONC: { name: 'CONCRETO PLÁSTICO', short: '#7', color: '#58D854', out: 'hard "non-recyclables" → covers · EcoTabla · Formaleta' },
  PVC:  { name: 'PVC REJECT', short: 'PVC', color: '#F85898', out: 'special handling, never pyrolysis (chlorine)' },
};
const GATES = ['SOLD', 'PYRO', 'CONC', 'PVC'];
const RES = ['', '♳', '♴', '♵', '♶', '♷', '♸', '♹'];
const ITEMS = [
  { c: 1, n: 'PET bottle', sub: 'rigid', d: 'SOLD', kg: .6, w: 14, shape: 'bottle', col: 0x9fe3ff },
  { c: 2, n: 'HDPE jug', sub: 'rigid', d: 'SOLD', kg: 1.2, w: 7, shape: 'jug', col: 0xf2f2f2 },
  { c: 2, n: 'HDPE bag', sub: 'film', d: 'PYRO', kg: .2, w: 8, shape: 'bag', col: 0xe8e8e8 },
  { c: 3, n: 'PVC pipe', sub: 'rigid', d: 'PVC', kg: 1.6, w: 4, shape: 'pipe', col: 0x9e9e9e },
  { c: 4, n: 'LDPE film', sub: 'film', d: 'PYRO', kg: .2, w: 12, shape: 'bag', col: 0xbfe0ff },
  { c: 5, n: 'PP tub / cap', sub: 'rigid', d: 'PYRO', kg: .4, w: 10, shape: 'tub', col: 0xff5252 },
  { c: 6, n: 'PS foam cup', sub: 'foam', d: 'PYRO', kg: .1, w: 6, shape: 'cup', col: 0xffffff },
  { c: 7, n: 'Mixed hard plastic', sub: 'hard "non-recyclable"', d: 'CONC', kg: 2, w: 14, shape: 'chunk', col: 0x6d4c41 },
  { c: 7, n: 'Multilayer snack bag', sub: 'multilayer', d: 'PYRO', kg: .2, w: 10, shape: 'snack', col: 0xffc107 },
];
const WSUM = ITEMS.reduce((a, b) => a + b.w, 0);
const pick = () => { let r = Math.random() * WSUM; for (const it of ITEMS) { if ((r -= it.w) < 0) return it } return ITEMS[0] };

/* ===== DOM ===== */
const $ = id => document.getElementById(id);
const stage = $('stage'), qs = new URLSearchParams(location.search);
const fmt = n => Math.round(n).toLocaleString('en-US');

/* ===== RENDERER ===== */
const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
const renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.4, powerPreference: 'high-performance', preserveDrawingBuffer: qs.has('shot') });
renderer.setPixelRatio(dpr);
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x86c5e8);
scene.fog = new THREE.Fog(0x86c5e8, 18, 42);
const camera = new THREE.PerspectiveCamera(55, 1, .1, 120);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a5a2a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(4, 10, 6); scene.add(sun);
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .8 ? 68 : 55; camera.updateProjectionMatrix() }
addEventListener('resize', resize); new ResizeObserver(resize).observe(stage);

/* ===== TEXTURE HELPERS ===== */
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }
function textSprite(txt, color = '#FFD400', size = 1.6, bg = null) {
  const t = canvasTex(256, 96, (x, w, h) => { if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h) } x.font = '900 54px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = '#000'; x.strokeText(txt, w / 2, h / 2); x.fillStyle = color; x.fillText(txt, w / 2, h / 2) });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(size, size * .375, 1); s.renderOrder = 10; return s;
}
const hatLogo = canvasTex(128, 128, (x) => { // curved-up arrow mark (EcoAlquimia logo style)
  x.strokeStyle = '#FFE14D'; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.arc(64, 70, 34, Math.PI * .95, Math.PI * 2.25); x.stroke();
  x.fillStyle = '#FFE14D'; x.beginPath(); x.moveTo(98, 20); x.lineTo(112, 58); x.lineTo(76, 50); x.closePath(); x.fill();
});
const flameTex = [0, 1, 2].map(k => canvasTex(32, 48, (x) => { const g = x.createRadialGradient(16, 34, 2, 16, 30, 18 + k * 2); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.25, '#FFD400'); g.addColorStop(.6, '#FC9838'); g.addColorStop(1, 'rgba(248,56,0,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(16, 2 + k * 3); x.quadraticCurveTo(30 - k * 4, 26, 26, 40); x.quadraticCurveTo(16, 48, 6, 40); x.quadraticCurveTo(2 + k * 3, 26, 16, 2 + k * 3); x.fill() }));
const btcTex = canvasTex(64, 64, (x) => { x.fillStyle = '#F7931A'; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '900 40px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('₿', 32, 35) });
const waterTex = canvasTex(64, 64, (x) => { x.fillStyle = '#2f7494'; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 9; i++) x.fillRect((i * 23) % 64, (i * 37) % 64, 14, 2) });
waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
const beltTex = canvasTex(32, 32, (x) => { x.fillStyle = '#222'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#444'; x.fillRect(0, 0, 32, 6) }); beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
const coverTex = new THREE.TextureLoader().load('cover7.webp'); coverTex.colorSpace = THREE.SRGBColorSpace;

/* ===== SNACKMAN MODEL ===== */
const R = .42;
const Y = new THREE.MeshLambertMaterial({ color: 0xFFD400, side: THREE.DoubleSide });
const MOUTH = new THREE.MeshLambertMaterial({ color: 0x5a0d0d });
const HAT = new THREE.MeshLambertMaterial({ color: 0x1FA83A }), HAT2 = new THREE.MeshLambertMaterial({ color: 0x0B6B22 });
const snack = new THREE.Group(), body = new THREE.Group(); snack.add(body);
const upper = new THREE.Group(), lower = new THREE.Group(); body.add(upper, lower);
upper.add(new THREE.Mesh(new THREE.SphereGeometry(R, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), Y));
lower.add(new THREE.Mesh(new THREE.SphereGeometry(R, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), Y));
for (const j of [upper, lower]) { const d = new THREE.Mesh(new THREE.CircleGeometry(R * .98, 18), MOUTH); d.rotation.x = -Math.PI / 2; j.add(d) }
for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(R * .11, 8, 6), new THREE.MeshBasicMaterial({ color: 0x000000 })); e.position.set(s * R * .42, R * .5, R * .72); upper.add(e) }
const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), HAT); dome.scale.y = .78; dome.position.y = R * .38; upper.add(dome);
const brim = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.22, R * 1.22, R * .07, 18), HAT2); brim.position.set(0, R * .4, R * .1); upper.add(brim);
const ridge = new THREE.Mesh(new THREE.BoxGeometry(R * .22, R * .12, R * 1.6), HAT2); ridge.position.y = R * 1.18; upper.add(ridge);
const logo = new THREE.Mesh(new THREE.PlaneGeometry(R * .7, R * .7), new THREE.MeshBasicMaterial({ map: hatLogo, transparent: true })); logo.position.set(0, R * .82, R * .86); logo.rotation.x = -.5; upper.add(logo);
const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex[0], transparent: true, depthWrite: false })); flame.scale.set(R * .5, R * .75, 1); flame.position.set(R * .55, -R * .25, R * .75); lower.add(flame);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(R * .9, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .02; snack.add(shadow);
const heldSlot = new THREE.Group(); heldSlot.position.y = R * 2.4; snack.add(heldSlot);
scene.add(snack);

/* ===== ITEM GEOMETRIES ===== */
const G = {
  bottle: new THREE.CylinderGeometry(.09, .1, .42, 7).rotateZ(Math.PI / 2),
  jug: new THREE.BoxGeometry(.26, .3, .2),
  bag: new THREE.IcosahedronGeometry(.2, 0).scale(1.3, .45, 1.1),
  pipe: new THREE.CylinderGeometry(.08, .08, .55, 7).rotateZ(Math.PI / 2),
  tub: new THREE.CylinderGeometry(.16, .12, .14, 8),
  cup: new THREE.CylinderGeometry(.12, .08, .22, 8),
  chunk: new THREE.DodecahedronGeometry(.2, 0),
  snack: new THREE.BoxGeometry(.3, .06, .22),
};
function itemMesh(it) { const m = new THREE.Mesh(G[it.shape], new THREE.MeshLambertMaterial({ color: it.col })); return m }

/* ===== FX: bursts, coins ===== */
const fx = [];
function burst(txt, pos, color) { const s = textSprite(txt, color); s.position.copy(pos).add(new THREE.Vector3(0, 1.1, 0)); scene.add(s); fx.push({ o: s, t: 0, life: .8, vy: 1.4, kind: 'txt' }) }
const coinGeo = new THREE.CylinderGeometry(.18, .18, .05, 14), coinSide = new THREE.MeshLambertMaterial({ color: 0xF7931A }), coinFace = new THREE.MeshLambertMaterial({ map: btcTex });
function coin(pos) { const m = new THREE.Mesh(coinGeo, [coinSide, coinFace, coinFace]); m.rotation.x = Math.PI / 2; m.position.copy(pos); m.position.y = .5; scene.add(m); fx.push({ o: m, t: 0, life: 3.2, vy: 2.4, kind: 'coin' }) }
function stepFx(dt) { for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; const o = f.o;
  if (f.kind === 'txt') { o.position.y += f.vy * dt; o.material.opacity = Math.max(0, 1 - f.t / f.life) }
  else { f.vy -= 9 * dt; o.position.y = Math.max(.2, o.position.y + f.vy * dt); if (o.position.y <= .2 && f.vy < 0) f.vy = -f.vy * .35; o.rotation.z += dt * 4; if (f.t > f.life - .6) o.scale.setScalar(Math.max(.01, (f.life - f.t) / .6)) }
  if (f.t >= f.life) { scene.remove(o); fx.splice(i, 1) } } }

/* ===== AUDIO ===== */
let soundOn = true, AC = null, theme = null;
const ext = (() => { const a = document.createElement('audio'); return a.canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.m4a' })();
const SFX = {}; for (const n of ['snackman-hit', 'snackman-plop']) { const a = new Audio(AUDIO_BASE + n + ext); a.preload = 'auto'; SFX[n] = a }
function play(n, v = .8) { if (!soundOn) return; const a = SFX[n].cloneNode(); a.volume = v; a.play().catch(() => { }) }
function tone(f0, f1, dur, type = 'square', vol = .06) { if (!soundOn || !AC) return; const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur) }
const waka = () => tone(420, 180, .09), okBlip = () => { tone(520, 880, .08); setTimeout(() => tone(880, 1320, .08), 70) }, buzz = () => tone(140, 90, .28, 'sawtooth', .07);
function startAudio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)() } catch (e) { } if (!theme) { theme = new Audio(AUDIO_BASE + 'snackman-theme' + ext); theme.loop = true; theme.volume = .35 } if (soundOn) theme.play().catch(() => { }) }
$('sndBtn').onclick = () => { soundOn = !soundOn; $('sndBtn').textContent = soundOn ? '🔊' : '🔇'; if (theme) soundOn ? theme.play().catch(() => { }) : theme.pause() };

/* ===== GRID MOVER (classic maze-chase style) ===== */
const mv = { x: 0, z: 0, dx: 0, dz: -1, t: 0, want: null, moving: true, speed: 4.2 };
let passable = () => true, onArrive = () => { };
function setWant(d) { mv.want = d; if (!mv.moving) tryStart() }
function tryStart() { if (mv.want && passable(mv.x + mv.want[0], mv.z + mv.want[1])) { mv.dx = mv.want[0]; mv.dz = mv.want[1]; mv.want = null; mv.moving = true } }
function stepMover(dt) {
  if (mv.want && mv.moving && mv.want[0] === -mv.dx && mv.want[1] === -mv.dz) { mv.x += mv.dx; mv.z += mv.dz; mv.dx = -mv.dx; mv.dz = -mv.dz; mv.t = 1 - mv.t; mv.want = null }
  if (!mv.moving) { tryStart(); return }
  mv.t += mv.speed * dt;
  while (mv.t >= 1) { mv.t -= 1; mv.x += mv.dx; mv.z += mv.dz; onArrive(mv.x, mv.z);
    if (mv.want && passable(mv.x + mv.want[0], mv.z + mv.want[1])) { mv.dx = mv.want[0]; mv.dz = mv.want[1]; mv.want = null }
    if (!passable(mv.x + mv.dx, mv.z + mv.dz)) { mv.t = 0; mv.moving = false; break } }
}

/* ===== INPUT: swipe + keys; camera modes ===== */
let camMode = qs.get('cam') === 'behind' ? 'BEHIND' : 'TOP';
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function input(k) {
  if (camMode === 'BEHIND' && phase === 1) { // relative controls: up = straight, left/right = turn, down = reverse
    const f = [mv.dx, mv.dz], l = [f[1], -f[0]], r = [-f[1], f[0]];
    setWant(k === 'up' ? f : k === 'down' ? [-f[0], -f[1]] : k === 'left' ? l : r); return }
  setWant(DIRS[k]);
}
addEventListener('keydown', e => { const m = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[e.code]; if (m) { e.preventDefault(); input(m) } });
let sw = null;
stage.addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY, done: false } });
stage.addEventListener('pointermove', e => { if (!sw || sw.done) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; if (Math.hypot(dx, dy) > 22) { sw.done = true; input(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')) } });
addEventListener('pointerup', () => { sw = null });
$('camBtn').onclick = () => { camMode = camMode === 'TOP' ? 'BEHIND' : 'TOP'; $('camBtn').textContent = 'CAM: ' + camMode };
$('camBtn').textContent = 'CAM: ' + camMode;

/* ===== HUD ===== */
let kg = 0, btc = 0, bites = 0, phase = 1;
function toast(t, ms = 1400) { const el = $('toast'); el.innerHTML = t; el.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => el.style.opacity = 0, ms) }
function hud() { $('kg').textContent = kg.toFixed(1); $('btc').textContent = btc; $('bar').firstElementChild.style.width = Math.min(100, kg / A.PHASE1_GOAL_KG * 100) + '%' }
function poop(extraMsg) { btc++; const b = new THREE.Vector3(snack.position.x - mv.dx * .6, 0, snack.position.z - mv.dz * .6); coin(b); burst('PFFT!', b, '#FC9838'); play('snackman-plop', .8); hud() }

/* ===== PHASE 1: THE BID (river) ===== */
const W1 = 13, L1 = 90, p1 = new THREE.Group(); scene.add(p1);
const rock = new Set(), trash = new Map(); const key = (x, z) => x + ',' + z;
(function buildRiver() {
  const water = new THREE.Mesh(new THREE.PlaneGeometry(W1 - 2, L1 + 20), new THREE.MeshLambertMaterial({ map: waterTex })); water.rotation.x = -Math.PI / 2; water.position.set(0, 0, L1 / 2); waterTex.repeat.set(4, 34); p1.add(water); p1.userData.water = water;
  const bankMat = new THREE.MeshLambertMaterial({ color: 0x5c8a2e }), sandMat = new THREE.MeshLambertMaterial({ color: 0xc9a86a });
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(8, .6, L1 + 20), bankMat); b.position.set(s * (W1 / 2 + 3.5), .1, L1 / 2); p1.add(b); const sd = new THREE.Mesh(new THREE.BoxGeometry(1, .3, L1 + 20), sandMat); sd.position.set(s * (W1 / 2 - .5), .05, L1 / 2); p1.add(sd) }
  const treeG = new THREE.ConeGeometry(.7, 2, 6), trunkG = new THREE.CylinderGeometry(.12, .15, .6, 5), N = 70;
  const trees = new THREE.InstancedMesh(treeG, new THREE.MeshLambertMaterial({ color: 0x2e7d32 }), N), trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x6d4c41 }), N);
  const m = new THREE.Matrix4(); for (let i = 0; i < N; i++) { const s = i % 2 ? 1 : -1, x = s * (W1 / 2 + 1.2 + Math.random() * 3.5), z = Math.random() * (L1 + 10), sc = .7 + Math.random() * .7; m.makeScale(sc, sc, sc).setPosition(x, 1.4 * sc, z); trees.setMatrixAt(i, m); m.makeScale(1, 1, 1).setPosition(x, .6, z); trunks.setMatrixAt(i, m) } p1.add(trees, trunks);
  // rocks / sandbars = lanes (walls), keep start area clear
  for (let z = 4; z < L1 - 8; z += 3 + (Math.random() * 3 | 0)) { const len = 2 + (Math.random() * 3 | 0), x0 = 1 + (Math.random() * (W1 - 2 - len) | 0); for (let i = 0; i < len; i++) rock.add(key(x0 + i, z)); if (Math.random() < .35) rock.add(key(x0, z + 1)) }
  const rg = new THREE.DodecahedronGeometry(.55, 0), rocks = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: 0x8d8d8d }), rock.size); let i = 0;
  for (const k of rock) { const [x, z] = k.split(',').map(Number); m.makeRotationY(Math.random() * 3).scale(new THREE.Vector3(1, .7, 1)).setPosition(x - (W1 - 1) / 2, .2, z); rocks.setMatrixAt(i++, m) } p1.add(rocks);
  // trash (instanced per shape)
  const shapes = ['bottle', 'bag', 'cup', 'snack', 'tub', 'chunk'], cols = [0x9fe3ff, 0xeeeeee, 0xffffff, 0xffc107, 0xff5252, 0x6d4c41], per = {};
  for (let z = 0; z < L1 - 2; z++) for (let x = 1; x < W1 - 1; x++) { if (rock.has(key(x, z)) || Math.random() > .2) continue; const s = Math.random() * shapes.length | 0; (per[s] = per[s] || []).push({ x, z, kg: .3 + Math.random() * .4, ph: Math.random() * 6 }) }
  p1.userData.inst = [];
  for (const s in per) { const im = new THREE.InstancedMesh(G[shapes[s]], new THREE.MeshLambertMaterial({ color: cols[s] }), per[s].length); per[s].forEach((t, j) => { t.im = im; t.j = j; t.alive = true; trash.set(key(t.x, t.z), t) }); im.userData.list = per[s]; p1.add(im); p1.userData.inst.push(im) }
})();
const X1 = x => x - (W1 - 1) / 2;
function p1Passable(x, z) { return x >= 1 && x <= W1 - 2 && z >= 0 && z <= L1 + 1 && !rock.has(key(x, z)) }
function p1Arrive(x, z) { const t = trash.get(key(x, z)); if (!t || !t.alive) return; t.alive = false; trash.delete(key(x, z)); kg += t.kg; bites++; eatAt = clock.elapsedTime;
  waka(); burst(bites % 5 === 0 ? 'POW!' : 'CHOMP!', snack.position, bites % 5 === 0 ? '#FC9838' : '#FFD400'); if (bites % A.POOP_EVERY === 0) setTimeout(poop, 250); hud();
  if (kg >= A.PHASE1_GOAL_KG && phase === 1) { phase = 1.5; play('snackman-hit', .9); toast('THE BID IS IN!<br>' + kg.toFixed(1) + ' KG EATEN<br><br>NOW SORT IT ▸', 2400); setTimeout(startPhase2, 2200) } }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function stepTrash(t) { const cz = snack.position.z; for (const im of p1.userData.inst) { let dirty = false; for (const it of im.userData.list) { if (Math.abs(it.z - cz) > 22 && it.alive) continue; const sc = it.alive ? 1 : 0; _q.setFromAxisAngle(_v.set(0, 1, 0), it.ph + t * .5); _m.compose(_s.set(X1(it.x), .12 + Math.sin(t * 2 + it.ph) * .05, it.z), _q, new THREE.Vector3(sc, sc, sc)); im.setMatrixAt(it.j, _m); dirty = true } if (dirty) im.instanceMatrix.needsUpdate = true } }

/* ===== PHASE 2: SORTING FLOOR ===== */
const W2 = 9, p2 = new THREE.Group(); p2.visible = false; scene.add(p2);
const GATE_X = [1, 3, 5, 7], PICK = [4, 9];
const tally = { SOLD: 0, PYRO: 0, CONC: 0, PVC: 0 }; let held = null, belt = null, sorted = 0, wrong = 0, p2T = A.SORT_TIME, mark = null;
const lines = {};
function buildFloor() {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W2, .2, 9), new THREE.MeshLambertMaterial({ color: 0x6f6f6f })); floor.position.set(0, -.1, 4.5); p2.add(floor);
  const grid = new THREE.GridHelper(9, 9, 0x555555, 0x555555); grid.position.set(0, .01, 4.5); p2.add(grid);
  const beltM = new THREE.Mesh(new THREE.BoxGeometry(W2 + 4, .25, 1), new THREE.MeshLambertMaterial({ map: beltTex })); beltTex.repeat.set(13, 1); beltM.position.set(0, .02, 9.2); p2.add(beltM);
  const yard = new THREE.Mesh(new THREE.BoxGeometry(W2 + 6, .1, 7), new THREE.MeshLambertMaterial({ color: 0x3d3d3d })); yard.position.set(0, -.15, -3.2); p2.add(yard);
  { // PICKUP tile: glowing, pulsing ring + bobbing arrow + label (phase 2 had no cue)
    const mx = PICK[0] - 4, mz = PICK[1], g = new THREE.Group(); g.position.set(mx, 0, mz); p2.add(g);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xFFD400, transparent: true, opacity: .45, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = .17; g.add(glow);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.42, .58, 36), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .18; g.add(ring);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.34, .7, 14), new THREE.MeshBasicMaterial({ color: 0xFFD400 })); arrow.rotation.x = Math.PI; arrow.position.y = 1.3; g.add(arrow);
    const lab = textSprite('PICK UP', '#FFD400', 1.6); lab.position.y = 2.2; g.add(lab);
    mark = { g, glow, ring, arrow };
  }
  GATES.forEach((g, i) => { const x = GATE_X[i] - 4, col = new THREE.Color(ST[g].color), mat = new THREE.MeshLambertMaterial({ color: col });
    for (const s of [-.45, .45]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.4, .12), mat); p.position.set(x + s, .7, -.1); p2.add(p) }
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, .18, .16), mat); top.position.set(x, 1.4, -.1); p2.add(top);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .45 })); pad.rotation.x = -Math.PI / 2; pad.position.set(x, .02, 0); p2.add(pad);
    const lab = textSprite(ST[g].short, ST[g].color, 1.3); lab.position.set(x, 1.95, -.1); p2.add(lab);
    const grp = new THREE.Group(); grp.position.set(x, 0, -2.2); p2.add(grp); lines[g] = grp; });
}
function growLine(g) {
  const grp = lines[g], n = grp.children.length;
  if (g === 'SOLD') { const b = new THREE.Mesh(new THREE.BoxGeometry(.55, .4, .45), new THREE.MeshLambertMaterial({ color: 0x4FC3F7 })); b.position.set((n % 2) * .6 - .3, .2 + Math.floor(n / 4) * .42, -((n >> 1) % 2) * .5); grp.add(b) }
  if (g === 'PYRO') { if (n < 6) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 1 + n * .05, 10), new THREE.MeshLambertMaterial({ color: 0x9e9e9e })); r.position.set((n % 3) * .55 - .55, .5, -Math.floor(n / 3) * .7); grp.add(r); const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex[n % 3], transparent: true, depthWrite: false })); fl.scale.set(.3, .45, 1); fl.position.set(r.position.x, .25, r.position.z + .3); fl.userData.fl = 1; grp.add(fl) } }
  if (g === 'CONC') { const c = new THREE.Mesh(new THREE.BoxGeometry(.6, .08, .6), [coinSide, coinSide, new THREE.MeshLambertMaterial({ map: coverTex }), coinSide, coinSide, coinSide]); c.material[0] = c.material[1] = c.material[3] = c.material[4] = c.material[5] = new THREE.MeshLambertMaterial({ color: 0x222222 }); c.position.set((n % 2) * .7 - .35, .04 + Math.floor(n / 2) * .09, 0); c.rotation.y = (Math.random() - .5) * .3; grp.add(c) }
  if (g === 'PVC') { if (!grp.userData.bin) { const bin = new THREE.Mesh(new THREE.BoxGeometry(.9, .8, .7), new THREE.MeshLambertMaterial({ color: 0xF85898, transparent: true, opacity: .55 })); bin.position.y = .4; grp.add(bin); const fill = new THREE.Mesh(new THREE.BoxGeometry(.8, 1, .6), new THREE.MeshLambertMaterial({ color: 0x9e9e9e })); fill.scale.y = .01; fill.position.y = .01; grp.add(fill); grp.userData.bin = bin; grp.userData.fill = fill } const f = grp.userData.fill; f.scale.y = Math.min(.75, f.scale.y + .12); f.position.y = f.scale.y / 2 + .02 }
}
function nextItem() { const it = pick(), m = itemMesh(it); m.scale.setScalar(1.6); m.position.set(7, .35, 9.2); p2.add(m); belt = { it, m, arrive: 0 } }
function showHeld() { const el = $('held'); if (!held) { el.style.display = 'none'; return } el.style.display = 'block'; el.innerHTML = '<div class="code">' + RES[held.it.c] + ' ' + held.it.c + '</div>' + held.it.n.toUpperCase() + ' <span style="color:#9a9a9a">(' + held.it.sub + ')</span><div style="margin-top:4px;color:#58D854">ROLL IT TO ITS LINE ▲</div>' }
function p2Passable(x, z) { if (z === 9) return x === PICK[0]; if (z === 0) return GATE_X.includes(x); return x >= 0 && x < W2 && z >= 1 && z <= 8 }
function tryPick() { if (held || !belt || !belt.arrive) return; held = belt; belt = null; p2.remove(held.m); held.m.scale.setScalar(1.3); held.m.position.set(0, 0, 0); heldSlot.add(held.m); waka(); burst('CHOMP!', snack.position); showHeld(); setTimeout(nextItem, 500); setWant([0, -1]) }
function p2Arrive(x, z) {
  if (x === PICK[0] && z === PICK[1]) tryPick();
  if (z === 0) { const g = GATES[GATE_X.indexOf(x)];
    if (held) { if (held.it.d === g) { tally[g] += held.it.kg; sorted++; growLine(g); okBlip(); burst('POW!', snack.position, ST[g].color); heldSlot.remove(held.m); held = null; showHeld(); if (g === 'PYRO') setTimeout(poop, 200); if (sorted >= A.SORT_GOAL) { panel(); return endP2() } if (sorted % 3 === 0) toast(sorted + ' / ' + A.SORT_GOAL + ' SORTED!'); panel() }
      else { wrong++; buzz(); burst('WRONG LINE', snack.position, '#F85898'); toast(RES[held.it.c] + ' ' + held.it.n.toUpperCase() + '<br>→ ' + ST[held.it.d].name, 1800) } }
    setWant([0, 1]) }
}
function startPhase2() {
  phase = 2; p1.visible = false; p2.visible = true; document.body.classList.add('p2'); scene.fog.near = 30; scene.fog.far = 60; scene.background.set(0x9fb8c8);
  $('phase').textContent = 'PHASE 2 · SORTING'; $('skipBtn').style.display = 'none'; $('camBtn').style.display = 'none';
  if (!p2.children.length) buildFloor();
  passable = p2Passable; onArrive = p2Arrive; Object.assign(mv, { x: 4, z: 7, dx: 0, dz: 1, t: 0, want: null, moving: true, speed: 4.6 }); nextItem(); panel(); resize();
  p2T = A.SORT_TIME; $('toast').style.opacity = 0; clearTimeout(toast.h); setTimeout(() => toast('🎯 SORT ' + A.SORT_GOAL + ' IN ' + A.SORT_TIME + 's<br><span style="font-size:10px">ROLL ONTO THE GLOWING YELLOW TILE</span>', 2200), 300); p2Hud();
}
function p2Hud() { $('phase').textContent = '🎯 ' + sorted + '/' + A.SORT_GOAL + ' SORTED · ⏱ ' + Math.ceil(p2T) }
/* Phase 2 end card: result + your plant (ILLUSTRATION) + back to the game */
function endP2() {
  if (phase === 3) return; const won = sorted >= A.SORT_GOAL; phase = 3; running = false; mv.moving = false; p2Hud();
  const c = calc(), stars = won ? (wrong === 0 ? '★★★' : wrong <= 2 ? '★★☆' : '★☆☆') : '☆☆☆', o = $('over');
  o.innerHTML = '<h1 class="px">' + (won ? '🎯 SORTED ' + sorted + '/' + A.SORT_GOAL + '!' : '⏱ TIME! ' + sorted + '/' + A.SORT_GOAL + ' SORTED') + '</h1>' +
    '<p class="px" style="font-size:18px;color:#FFD400">' + stars + '</p>' +
    '<p>✔ ' + sorted + ' right line · ✖ ' + wrong + ' wrong line</p>' +
    '<p>🏭 Your plant at ' + fmt(plantTpy) + ' t/yr: ' + c.balers + ' baler · ' + c.reactors + ' pyrolysis reactor · ' + c.clines + ' block line <span class="ill">ILLUSTRATION</span></p>' +
    '<button class="btn g" id="backBtn" type="button">◀ BACK TO SNACKMAN</button><button class="btn s" id="againBtn" type="button">↺ PLAY AGAIN</button>';
  o.style.display = 'flex'; $('backBtn').onclick = () => { location.href = 'title.html' }; $('againBtn').onclick = () => { location.href = 'bonus3d.html?phase=2' };
  play('snackman-hit', .9); window.SNACK3D_END = { won, sorted, wrong };
}
$('skipBtn').onclick = () => { if (phase !== 1) return; kg = Math.max(kg, A.PHASE1_GOAL_KG); hud(); phase = 1.5; startPhase2() };

/* ===== FACTORY LAYOUT CALCULATOR ===== */
let plantTpy = A.PLANT_TPY;
function calc() {
  const tot = Object.values(tally).reduce((a, b) => a + b, 0) || 1, sh = {}, tpy = {};
  for (const g of GATES) { sh[g] = tally[g] / tot; tpy[g] = sh[g] * plantTpy }
  const hrs = A.DAYS * A.HOURS;
  const balers = tpy.SOLD > 0 ? Math.max(1, Math.ceil(tpy.SOLD / (A.BALER_TPH * hrs))) : 0;
  const reactors = tpy.PYRO > 0 ? Math.max(1, Math.ceil(tpy.PYRO / A.DAYS / (A.RETORT_TPD * A.RETORTS_PER_REACTOR))) : 0;
  const gal = tpy.PYRO * 1000 / A.KG_PER_GAL, mwh = gal * A.KWH_PER_GAL / 1000, btcY = tpy.PYRO * 1000 * A.SATS_PER_KG / 1e8;
  const clines = tpy.CONC > 0 ? Math.max(1, Math.ceil(tpy.CONC / A.DAYS / A.CONCRETE_LINE_TPD)) : 0, covers = tpy.CONC * 1000 / A.COVER_PLASTIC_KG;
  return { tot, sh, tpy, balers, reactors, gal, mwh, btcY, clines, covers };
}
function panel() {
  const c = calc(), any = sorted > 0;
  $('tally').innerHTML = '<tr class="small"><td>Stream</td><td class="n">sorted (game kg)</td><td class="n">share</td><td class="n">t/yr*</td></tr>' + GATES.map(g => '<tr><td><span class="sw" style="background:' + ST[g].color + '"></span>' + ST[g].name + '<div class="small">' + ST[g].out + '</div></td><td class="n">' + tally[g].toFixed(1) + '</td><td class="n">' + (any ? Math.round(c.sh[g] * 100) : 0) + '%</td><td class="n">' + (any ? fmt(c.tpy[g]) : '–') + '</td></tr>').join('');
  $('scale').innerHTML = '*Example: your sorted mix scaled to a <select id="tpy" style="background:#000;color:#FFD400;border:1px solid #444;font:inherit">' + [1000, 5000, 20000].map(v => '<option value="' + v + '"' + (v === plantTpy ? ' selected' : '') + '>' + fmt(v) + ' t/yr</option>').join('') + '</select> plant. <b style="color:#FC9838">ILLUSTRATION</b>. ' + sorted + ' sorted · ' + wrong + ' wrong line';
  $('tpy').onchange = e => { plantTpy = +e.target.value; panel() };
  $('diag').innerHTML = diagram(c, any);
  $('assump').innerHTML = 'Assumptions (edit at top of game.js): ' + A.DAYS + ' days × ' + A.HOURS + ' h · baler ' + A.BALER_TPH + ' t/h · ' + A.RETORTS_PER_REACTOR + ' retorts/reactor × ' + A.RETORT_TPD + ' t/day · ' + A.KG_PER_GAL + ' kg → 1 gal · ' + A.KWH_PER_GAL + ' kWh/gal · ' + A.SATS_PER_KG + ' sats/kg gross proxy · block line ' + A.CONCRETE_LINE_TPD + ' t/day · ' + A.COVER_PLASTIC_KG + ' kg plastic per cover. All ILLUSTRATION.';
}
function diagram(c, any) {
  const W = 360, rowH = 64, top = 30, H = top + rowH * 4 + 18; let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif" font-size="9" fill="#ddd">';
  s += '<text x="8" y="16" fill="#FC9838" font-weight="700">ILLUSTRATION · ' + fmt(plantTpy) + ' t/yr</text>';
  s += '<rect x="6" y="' + (top + 4) + '" width="58" height="' + (rowH * 4 - 8) + '" rx="6" fill="#222" stroke="#FFD400"/><text x="35" y="' + (top + rowH * 2) + '" text-anchor="middle" fill="#FFD400" font-weight="700" transform="rotate(-90 35 ' + (top + rowH * 2) + ')">SORTING FLOOR</text>';
  const rows = [
    ['SOLD', 'BALER LINE', c.balers, 'box', (any ? fmt(c.tpy.SOLD) : 0) + ' t/yr bales · ' + c.balers + ' baler' + (c.balers === 1 ? '' : 's')],
    ['PYRO', 'PYROLYSIS', c.reactors, 'reactor', c.reactors + ' reactor' + (c.reactors === 1 ? '' : 's') + ' × ' + A.RETORTS_PER_REACTOR + ' retorts', fmt(c.gal) + ' gal oil · ' + fmt(c.mwh) + ' MWh · ≈' + c.btcY.toFixed(2) + ' ₿/yr gross'],
    ['CONC', 'CONCRETO PLÁSTICO', c.clines, 'cover', c.clines + ' block line' + (c.clines === 1 ? '' : 's'), '≈' + fmt(c.covers) + ' covers/yr (like the photo)'],
    ['PVC', 'PVC REJECT BIN', any && c.tpy.PVC > 0 ? 1 : 0, 'bin', (any ? fmt(c.tpy.PVC) : 0) + ' t/yr · special handling'],
  ];
  rows.forEach(([g, lab, n, kind, note, note2], i) => { const y = top + i * rowH, col = ST[g].color, share = any ? c.sh[g] : 0;
    s += '<path d="M64 ' + (y + rowH / 2) + ' H84" stroke="' + col + '" stroke-width="' + (1 + share * 10).toFixed(1) + '"/>';
    s += '<text x="88" y="' + (y + 13) + '" fill="' + col + '" font-weight="700">' + lab + '</text>';
    const k = Math.min(n, 8); for (let j = 0; j < k; j++) { const x = 88 + j * 30;
      if (kind === 'box') s += '<rect x="' + x + '" y="' + (y + 19) + '" width="24" height="20" rx="2" fill="' + col + '"/>';
      if (kind === 'reactor') { s += '<rect x="' + x + '" y="' + (y + 17) + '" width="26" height="24" rx="4" fill="#555" stroke="' + col + '"/>'; for (let r = 0; r < 3; r++) s += '<circle cx="' + (x + 6 + r * 7) + '" cy="' + (y + 29) + '" r="3" fill="' + col + '"/>' }
      if (kind === 'cover') s += '<image href="cover7.webp" x="' + x + '" y="' + (y + 17) + '" width="24" height="24"/>';
      if (kind === 'bin') s += '<rect x="' + x + '" y="' + (y + 19) + '" width="26" height="20" rx="2" fill="none" stroke="' + col + '"/><rect x="' + (x + 2) + '" y="' + (y + 29) + '" width="22" height="8" fill="' + col + '"/>'; }
    if (n > 8) s += '<text x="' + (88 + 8 * 30) + '" y="' + (y + 33) + '">+' + (n - 8) + '</text>';
    if (!n) s += '<text x="88" y="' + (y + 33) + '" fill="#666">(nothing sorted here yet)</text>';
    const bw = Math.max(0, share * (W - 96)); s += '<rect x="88" y="' + (y + 45) + '" width="' + bw.toFixed(1) + '" height="4" fill="' + col + '"/>';
    s += '<text x="88" y="' + (y + 59) + '" fill="#aaa">' + note + '</text>'; if (note2 && n) s += '<text x="' + (W - 4) + '" y="' + (y + 13) + '" text-anchor="end" fill="#fff" font-weight="700">' + note2 + '</text>' });
  return s + '</svg>';
}

/* ===== MAIN LOOP ===== */
const clock = new THREE.Clock(); let eatAt = -9, camYaw = Math.PI, running = false;
function setPhase1() { passable = p1Passable; onArrive = p1Arrive; Object.assign(mv, { x: 6, z: L1 - 2, dx: 0, dz: -1, t: 0, moving: true }) }
setPhase1(); hud();
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function frame() {
  if (window.__emuPaused) { clock.getDelta(); requestAnimationFrame(frame); return }
  const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
  if (running && phase !== 1.5) stepMover(dt);
  const px = (phase === 2 ? mv.x - 4 : X1(mv.x)) + mv.dx * mv.t, pz = mv.z + mv.dz * mv.t;
  snack.position.set(px, 0, pz);
  const yaw = Math.atan2(mv.dx, mv.dz); let dy = yaw - snack.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); snack.rotation.y += dy * Math.min(1, dt * 14);
  const open = mv.moving ? (Math.sin(t * 18) * .5 + .5) * .5 : .15, burstOpen = t - eatAt < .15 ? .7 : 0;
  upper.rotation.x = -Math.max(open, burstOpen) * .9; lower.rotation.x = Math.max(open, burstOpen) * .5;
  body.position.y = R + Math.abs(Math.sin(t * 9)) * (mv.moving ? .06 : .02); body.rotation.z = Math.sin(t * 9) * (mv.moving ? .06 : 0);
  flame.material.map = flameTex[(t * 12 | 0) % 3]; flame.scale.set(R * (.45 + Math.random() * .1), R * (.7 + Math.random() * .15), 1);
  heldSlot.rotation.y = t * 1.5; heldSlot.position.y = R * 2.5 + Math.sin(t * 3) * .06;
  if (phase < 2) { waterTex.offset.y -= dt * .25; stepTrash(t);
    if (camMode === 'TOP') { camPos.set(px * .6, 7.2, pz + 6.4); camLook.set(px * .6, 0, pz - 3) }
    else { let d = Math.atan2(mv.dx, mv.dz) - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camYaw += d * Math.min(1, dt * 5); camPos.set(px - Math.sin(camYaw) * 4.2, 2.8, pz - Math.cos(camYaw) * 4.2); camLook.set(px + Math.sin(camYaw) * 4, .4, pz + Math.cos(camYaw) * 4) } }
  else { beltTex.offset.x -= dt * .8; if (belt && !belt.arrive) { belt.m.position.x -= dt * 5; belt.m.rotation.y += dt * 3; if (belt.m.position.x <= 0) { belt.m.position.x = 0; belt.arrive = 1; if (mv.x === PICK[0] && mv.z === PICK[1] && !mv.moving) tryPick() } } else if (belt) belt.m.rotation.y += dt;
    for (const g of GATES) for (const o of lines[g].children) if (o.userData.fl) o.material.map = flameTex[(t * 10 + o.id | 0) % 3];
    if (mark) { const ready = belt && belt.arrive && !held, k = .5 + .5 * Math.sin(t * 6); mark.ring.scale.setScalar(1 + k * .35); mark.ring.material.opacity = (held ? .25 : .5) + (held ? .2 : .5) * (1 - k); mark.glow.material.opacity = (held ? .15 : ready ? .55 : .35) + .3 * k; mark.arrow.position.y = 1.2 + Math.abs(Math.sin(t * 4)) * .35; mark.arrow.rotation.y = t * 2 }
    if (running && phase === 2) { const s0 = Math.ceil(p2T); p2T -= dt; if (Math.ceil(p2T) !== s0) p2Hud(); if (p2T <= 0) { p2T = 0; endP2() } }
    const narrow = stage.clientWidth / stage.clientHeight < .9; camPos.set(px * .25, narrow ? 14 : 11, narrow ? 15.5 : 13.5); camLook.set(px * .2, 0, narrow ? 3.6 : 3.4) }
  camera.position.lerp(camPos, Math.min(1, dt * 6)); if (!frame.init) { camera.position.copy(camPos); frame.init = 1 } camera.lookAt(camLook);
  stepFx(dt); renderer.render(scene, camera); requestAnimationFrame(frame);
}
resize(); requestAnimationFrame(frame);
$('startBtn').onclick = () => { $('over').style.display = 'none'; running = true; startAudio(); toast('EAT ALL THE PLASTIC!<br><span style="font-size:10px">SWIPE / ARROWS</span>', 1800) };
if (qs.get('phase') === '2') { $('over').style.display = 'none'; running = true; kg = A.PHASE1_GOAL_KG; hud(); startPhase2() }
if (qs.has('autoplay')) { $('over').style.display = 'none'; running = true }
window.SNACK3D = { A, tally, input, startPhase2, calc, GATE_X, GATES, get phase() { return phase }, get sorted() { return sorted }, get wrong() { return wrong }, get p2T() { return p2T }, setTime(v) { p2T = +v }, get heldD() { return held && held.it.d }, get pos() { return [mv.x, mv.z] }, PICK, get mv() { return mv }, get held() { return held }, get kg() { return kg },
  demo(t) { for (const g in t) { tally[g] += t[g]; sorted += Math.round(t[g] / .6); for (let i = 0; i < Math.min(8, t[g] / .6); i++) growLine(g) } panel() } };

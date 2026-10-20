// Feather & Field: the 3D test farm (the browser version of the Unity farm).
// The same models, camera and light as the Unity farm, built to run smoothly on a phone:
// - lighter models (export_web.py), each drawn in a few calls (vertex colours, a handful of shared materials);
// - the shadows of things that never move are drawn once, the birds get soft round shadows;
// - grass is drawn in batches; the screen is drawn at most at twice the CSS resolution;
// - 30 frames a second when nobody is touching, 60 while dragging or zooming, nothing in the background;
// - if the phone struggles, the quality steps down by itself.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODELS = './models/';
const params = new URLSearchParams(location.search);
const DEG = Math.PI / 180;

// ------------------------------------------------------------------ quality levels (the first one the device can manage)
const QUALITY = [
  { dpr: 2, shadow: 2048, grass: 1.0, aa: true },
  { dpr: 1.5, shadow: 2048, grass: 0.8, aa: true },
  { dpr: 1.25, shadow: 1024, grass: 0.55, aa: false },
  { dpr: 1, shadow: 1024, grass: 0.35, aa: false },
];
let q = Math.max(0, Math.min(QUALITY.length - 1, parseInt(params.get('q') || '0', 10) || 0));

// ------------------------------------------------------------------ renderer, scene, camera, light
const canvas = document.getElementById('farm');
let renderer = makeRenderer(QUALITY[q].aa);
function makeRenderer(aa) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: aa, powerPreference: 'high-performance', stencil: false });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NoToneMapping;                     // like the Unity farm: colours as they are, no film curve
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.shadowMap.autoUpdate = false;                          // drawn once: only things that never move cast shadows
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[q].dpr));
  return r;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color('#8cb85c');
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const view = { target: new THREE.Vector3(), start: new THREE.Vector3(), size: 4.4, min: 1.2, max: 7.5 };
// the game's view: 42 degrees down, 45 degrees round (the Unity farm's camera)
const VIEW_DIR = new THREE.Vector3(Math.sin(45 * DEG) * Math.cos(42 * DEG), Math.sin(42 * DEG), Math.cos(45 * DEG) * Math.cos(42 * DEG)).normalize();
const PITCH_SIN = Math.sin(42 * DEG);

// light: the Unity farm's warm sun and sky-tinted ambient light (three.js lights are physical: about pi times Unity's numbers)
const hemi = new THREE.HemisphereLight(new THREE.Color().setRGB(0.64, 0.74, 0.86, THREE.SRGBColorSpace),
  new THREE.Color().setRGB(0.36, 0.42, 0.27, THREE.SRGBColorSpace), parseFloat(params.get('hemi') || '2.6'));
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', parseFloat(params.get('sun') || '5.2'));
sun.castShadow = true;
scene.add(sun, sun.target);

function placeCamera() {
  const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
  const a = w / Math.max(1, h);
  camera.top = view.size; camera.bottom = -view.size; camera.left = -view.size * a; camera.right = view.size * a;
  camera.position.copy(view.target).addScaledVector(VIEW_DIR, 60);
  camera.lookAt(view.target);
  camera.updateProjectionMatrix();
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  placeCamera();
  wake(400);
}
window.addEventListener('resize', resize);

// ------------------------------------------------------------------ colours: a touch richer, like the Unity farm's grading
const SAT = 1.15;
function richer(geo) {
  const c = geo.getAttribute('color');
  if (!c || geo.userData.richer) return;
  const n = c.normalized, arr = c.array, k = n ? 255 : 1;
  for (let i = 0; i < c.count; i++) {
    const o = i * c.itemSize;
    const r = arr[o] / k, g = arr[o + 1] / k, b = arr[o + 2] / k;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    arr[o] = Math.min(1, Math.max(0, l + (r - l) * SAT)) * k;
    arr[o + 1] = Math.min(1, Math.max(0, l + (g - l) * SAT)) * k;
    arr[o + 2] = Math.min(1, Math.max(0, l + (b - l) * SAT)) * k;
  }
  c.needsUpdate = true;
  geo.userData.richer = true;
}

// ------------------------------------------------------------------ a little seeded randomness (the meadow looks the same every time)
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(r) { const u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ------------------------------------------------------------------ loading
const loading = document.getElementById('loading');
const bar = loading.querySelector('.fill');
const progress = {};
function showProgress() {
  let got = 0, total = 0;
  for (const k in progress) { got += progress[k][0]; total += progress[k][1] || 1; }
  bar.style.width = Math.round(100 * got / Math.max(1, total)) + '%';
}
function loadGLB(name) {
  return new Promise((resolve, reject) => new GLTFLoader().load(MODELS + name, resolve,
    e => { progress[name] = [e.loaded, e.total || 1]; showProgress(); }, reject));
}
function loadJSON(name) { return fetch(MODELS + name).then(r => { if (!r.ok) throw new Error(name); return r.json(); }); }
function loadImage(name) {
  return new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = MODELS + name; });
}

// a model from the files: its meshes, ready to copy
const parts = {};
function part(name) {
  const p = parts[name];
  if (!p) throw new Error('missing model ' + name);
  return p.clone();
}
function meshesOf(o) { const out = []; o.traverse(c => { if (c.isMesh) out.push(c); }); return out; }

// ------------------------------------------------------------------ the farm
let L = null;                 // the layout
const birds = [];
let grassSets = [];           // [{ mesh, full }] instanced batches, thinned out on slower phones

async function start() {
  const [farm, flock, layout, meadow] = await Promise.all([loadGLB('farm.glb'), loadGLB('birds.glb'), loadJSON('layout.json'), loadImage('meadow.jpg')]);
  L = layout;
  for (const g of [farm, flock]) {
    for (const child of [...g.scene.children]) {
      child.updateMatrixWorld(true);
      for (const m of meshesOf(child)) {
        richer(m.geometry);
        if (m.material) { m.material.vertexColors = true; m.material.needsUpdate = true; }
      }
      parts[child.name] = child;
    }
  }
  buildGround(meadow);
  buildFarm();
  buildMeadow();
  buildBirds();
  view.target.set(...L.camera.target); view.start.copy(view.target); view.size = L.camera.size;
  aimSun();
  resize();
  renderer.shadowMap.needsUpdate = true;
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 600);
  hint('Drag to look around, pinch or scroll to zoom, tap a hen.');
  requestAnimationFrame(frame);
}

function aimSun() {
  const d = new THREE.Vector3(...L.sun.dir).normalize();
  const c = new THREE.Vector3(0.2, 0, 0.3);
  sun.target.position.copy(c);
  sun.position.copy(c).addScaledVector(d, -20);
  const s = sun.shadow;
  s.mapSize.set(QUALITY[q].shadow, QUALITY[q].shadow);
  s.camera.left = -8; s.camera.right = 8; s.camera.top = 8; s.camera.bottom = -8; s.camera.near = 1; s.camera.far = 45;
  s.bias = -0.0004; s.normalBias = 0.02; s.radius = 3;
  s.camera.updateProjectionMatrix();
  if (s.map) { s.map.dispose(); s.map = null; }
}

function buildGround(img) {
  // the painted meadow, a little richer, once
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, cv.width, cv.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const l = 0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2];
    a[i] = Math.min(255, Math.max(0, l + (a[i] - l) * 1.12)); a[i + 1] = Math.min(255, Math.max(0, l + (a[i + 1] - l) * 1.12)); a[i + 2] = Math.min(255, Math.max(0, l + (a[i + 2] - l) * 1.12));
  }
  cx.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.matrixAutoUpdate = false; ground.updateMatrix();
  scene.add(ground);
}

function still(o, cast, receive) {          // a part of the farm that never moves
  o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } });
  o.updateMatrixWorld(true);
  o.traverse(c => { c.matrixAutoUpdate = false; });
  scene.add(o);
  return o;
}

function buildFarm() {
  still(part('coop'), true, true);
  still(part('path'), false, true);
  for (const t of L.trees) {
    const o = part(t.model);
    o.position.set(...t.pos); o.scale.setScalar(t.scale); o.rotation.y = -t.yaw * DEG;
    still(o, true, true);
  }
  // apples hanging low on the big tree, and a few in the grass: one batch for all of them
  const apples = [];
  for (const p of L.apples) apples.push(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion(), new THREE.Vector3(1.4, 1.4, 1.4)));
  const r = rng(11), c = L.trees[0].pos;
  for (let i = 0; i < 7; i++) {
    const ang = r() * Math.PI * 2, dd = 0.3 + r() * 0.8;
    const x = c[0] + Math.cos(ang) * dd, z = c[2] + Math.sin(ang) * dd;
    if (inPen(x, z, 0.1)) continue;
    apples.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), new THREE.Vector3(1, 1, 1)));
  }
  batch('apple', apples, false);
  // the straw nest with a few eggs, and the grain in the feeder
  const straw = new THREE.MeshLambertMaterial({ color: '#e2c169' }), straw2 = new THREE.MeshLambertMaterial({ color: '#c9a24f' });
  const egg = new THREE.MeshStandardMaterial({ color: '#d39b68', roughness: 0.45 });
  const nest = new THREE.Group(); nest.position.set(...L.nest);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.032, 24), straw2); rim.position.y = 0.016; rim.scale.z = 0.9;
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.024, 24), straw); bed.position.y = 0.024; bed.scale.z = 0.88;
  nest.add(rim, bed);
  const eggs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 12, 9), egg, 3);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.4, d = 0.03 + 0.05 * i;
    eggs.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * d, 0.062, Math.sin(a) * d * 0.9),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4 * i, i, 0.3)), new THREE.Vector3(0.055, 0.07, 0.055)));
  }
  eggs.computeBoundingSphere();
  nest.add(eggs);
  still(nest, false, true);
  const grain = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.02, 24), new THREE.MeshLambertMaterial({ color: '#d9b45a' }));
  grain.position.set(L.feeder[0], 0.065, L.feeder[2]);
  still(grain, false, true);
}

function inPen(x, z, m) { return x > L.pen.min[0] - m && x < L.pen.max[0] + m && z > L.pen.min[2] - m && z < L.pen.max[2] + m; }

// many copies of one model, drawn together (one draw per material)
function batch(name, matrices, lambert) {
  const out = [];
  for (const m of meshesOf(parts[name])) {
    const mat = lambert ? new THREE.MeshLambertMaterial({ vertexColors: true }) : m.material;
    const inst = new THREE.InstancedMesh(m.geometry, mat, matrices.length);
    matrices.forEach((mx, i) => inst.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(mx, m.matrixWorld)));
    inst.receiveShadow = true;
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    inst.matrixAutoUpdate = false;
    scene.add(inst);
    out.push(inst);
  }
  return out;
}

// ------------------------------------------------------------------ grass and flowers, in batches (one draw per kind)
function buildMeadow() {
  const r = rng(11), half = 8.5, centres = [];
  for (let i = 0; i < 140; i++) centres.push([(r() * 2 - 1) * half, (r() * 2 - 1) * half]);
  const kinds = ['grass_tuft_0', 'grass_tuft_1', 'grass_tuft_2'], flowers = ['flower_daisy', 'flower_daisy', 'flower_butter', 'flower_clover'];
  const spots = {};
  const blocked = (x, z) => {
    if (inPen(x, z, 0.0)) return true;
    for (const p of L.path) { const dx = x - p[0], dz = z - p[2]; if (dx * dx + dz * dz < 0.42 * 0.42) return true; }
    for (const t of L.trees) { const dx = x - t.pos[0], dz = z - t.pos[2]; if (dx * dx + dz * dz < 0.04) return true; }
    return false;
  };
  let placed = 0;
  for (let i = 0; i < 3200 && placed < 1100; i++) {
    let x, z;
    if (r() < 0.78) { const c = centres[Math.floor(r() * centres.length)]; x = c[0] + gauss(r) * 0.14; z = c[1] + gauss(r) * 0.14; }
    else { x = (r() * 2 - 1) * half; z = (r() * 2 - 1) * half; }
    if (blocked(x, z)) continue;
    const flower = r() < 0.07;
    const kind = flower ? flowers[Math.floor(r() * flowers.length)] : kinds[Math.floor(r() * kinds.length)];
    const s = flower ? 1.3 + r() * 0.6 : 1.3 + r() * 1.1;
    (spots[kind] = spots[kind] || []).push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2), new THREE.Vector3(s, s, s)));
    placed++;
  }
  for (const kind in spots) for (const inst of batch(kind, spots[kind], true)) grassSets.push({ mesh: inst, full: inst.count });
  applyGrass();
}
function applyGrass() { for (const g of grassSets) g.mesh.count = Math.max(1, Math.round(g.full * QUALITY[q].grass)); }

// ------------------------------------------------------------------ the birds: walk, stop, peck, waddle, and keep a little room around each other
const HEN_NAMES = ['Henrietta', 'Clover', 'Mabel', 'Peggy', 'Dotty', 'Hazel', 'Maple', 'Willow', 'Biscuit', 'Nutmeg', 'Poppy', 'Daisy', 'Pearl', 'Ginger'];
const ROO_NAMES = ['Rupert', 'Albert', 'Barnaby', 'Chester', 'Percy', 'Reginald'];
const ROOM = 0.45, PERSONAL = 0.26;
let blobGeo, blobMat;

class Bird {
  constructor(kind, pos, yaw, name, r) {
    this.kind = kind; this.name = name; this.r = r;
    this.root = new THREE.Group(); this.visual = new THREE.Group(); this.root.add(this.visual);
    this.stand = part(kind + '_stand'); this.peck = part(kind + '_peck'); this.peck.visible = false;
    for (const o of [this.stand, this.peck]) o.traverse(c => { if (c.isMesh) { c.receiveShadow = true; c.castShadow = false; } });
    this.visual.add(this.stand, this.peck);
    const small = kind === 'chick';
    const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.004;
    blob.scale.setScalar(small ? 0.55 : 1); blob.renderOrder = 1; this.root.add(blob);
    this.root.position.set(pos[0], 0.015, pos[2]); this.root.rotation.y = yaw;
    this.speed = small ? 0.24 : 0.32; this.turn = 260 * DEG;
    this.hitR = small ? 0.12 : 0.17; this.hitY = small ? 0.08 : 0.17;
    this.target = this.root.position.clone(); this.wait = 0.2 + r() * 2.3; this.peckT = 0; this.phase = r() * 10; this.hop = 0;
    scene.add(this.root);
  }
  free(x, z) {
    if (x < L.yard.min[0] || x > L.yard.max[0] || z < L.yard.min[2] || z > L.yard.max[2]) return false;
    for (const o of L.obstacles) { const dx = x - o[0], dz = z - o[2]; if (dx * dx + dz * dz < o[3] * o[3]) return false; }
    return true;
  }
  roomAt(x, z) {
    let d = 99;
    for (const b of birds) if (b !== this) {
      d = Math.min(d, Math.hypot(b.root.position.x - x, b.root.position.z - z), Math.hypot(b.target.x - x, b.target.z - z));
    }
    return d;
  }
  clearPath(ax, az, bx, bz) {
    const len = Math.hypot(bx - ax, bz - az);
    for (let k = 0.1; k < len; k += 0.1) if (!this.free(ax + (bx - ax) * k / len, az + (bz - az) * k / len)) return false;
    return true;
  }
  pickTarget() {
    const p = this.root.position, startFree = this.free(p.x, p.z);
    let best = null, bestRoom = -1;
    for (let i = 0; i < 30; i++) {
      const x = L.yard.min[0] + this.r() * (L.yard.max[0] - L.yard.min[0]), z = L.yard.min[2] + this.r() * (L.yard.max[2] - L.yard.min[2]);
      if (!this.free(x, z) || (startFree && !this.clearPath(p.x, p.z, x, z))) continue;
      const room = this.roomAt(x, z);
      if (room >= ROOM) { this.target.set(x, p.y, z); return; }
      if (room > bestRoom) { bestRoom = room; best = [x, z]; }
    }
    if (best) this.target.set(best[0], p.y, best[1]); else this.target.copy(p);
  }
  someoneAhead() {
    const p = this.root.position, fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y);
    for (const b of birds) if (b !== this) {
      const dx = b.root.position.x - p.x, dz = b.root.position.z - p.z, d = Math.hypot(dx, dz);
      if (d < PERSONAL && dx * fx + dz * fz > 0.2 * d) return true;
    }
    return false;
  }
  tooClose() { for (const b of birds) if (b !== this && Math.hypot(b.root.position.x - this.root.position.x, b.root.position.z - this.root.position.z) < 0.2) return true; return false; }
  setPeck(down) { this.stand.visible = !down; this.peck.visible = down; }
  waddle(walking) {
    const w = walking ? Math.sin(this.phase * 16) : 0;
    this.visual.rotation.z = w * 5 * DEG;
    this.visual.position.y = (walking ? Math.abs(w) * 0.012 : 0) + Math.max(0, Math.sin(Math.min(1, this.hop) * Math.PI)) * 0.12;
  }
  update(dt) {
    this.phase += dt;
    if (this.hop > 0) { this.hop = Math.max(0, this.hop - dt * 2.2); }
    if (this.peckT > 0) {
      this.peckT -= dt; this.setPeck((this.peckT % 0.6) > 0.25); this.waddle(false);
      if (this.peckT <= 0) { this.setPeck(false); this.wait = 0.4 + this.r() * 1.1; }
      return;
    }
    if (this.wait > 0) {
      if (this.wait > 0.3 && this.tooClose()) this.wait = 0.3;
      this.wait -= dt; this.waddle(false);
      if (this.wait <= 0) { if (this.r() < 0.45) this.peckT = 1.2 + this.r() * 1.8; else this.pickTarget(); }
      return;
    }
    const p = this.root.position, dx = this.target.x - p.x, dz = this.target.z - p.z, dist = Math.hypot(dx, dz);
    if (dist < 0.04) { this.wait = 0.6 + this.r() * 2.4; this.waddle(false); return; }
    const want = Math.atan2(dx, dz);
    let diff = ((want - this.root.rotation.y + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const step = this.turn * dt;
    this.root.rotation.y += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
    diff = Math.abs(diff) < step ? 0 : diff - Math.sign(diff) * step;
    const facing = Math.abs(diff) < 25 * DEG;
    if (facing && this.someoneAhead()) { this.wait = 0.3 + this.r() * 0.6; this.waddle(false); return; }
    if (facing) {
      const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y), s = Math.min(this.speed * dt, dist);
      const nx = p.x + fx * s, nz = p.z + fz * s;
      if (this.free(nx, nz) || !this.free(p.x, p.z)) { p.x = nx; p.z = nz; } else this.wait = 0.5;
    }
    this.waddle(facing);
  }
}

function buildBirds() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const cx = cv.getContext('2d'), gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
  blobGeo = new THREE.CircleGeometry(0.16, 20);
  blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, color: '#20301a' });
  const r = rng(7), hens = HEN_NAMES.slice(), roos = ROO_NAMES.slice();
  const name = (list) => list.splice(Math.floor(r() * list.length), 1)[0];
  for (const h of L.hens) birds.push(new Bird(h.model, h.pos, -h.yaw * DEG + Math.PI, h.model === 'rooster' ? name(roos) : name(hens), r));
  birds.push(new Bird('chick', [0.55, 0, 1.7], 0.5, 'Pip', r));                // a chick, to see one on the farm
  for (const b of birds) if (!b.free(b.root.position.x, b.root.position.z)) { b.pickTarget(); b.root.position.copy(b.target); }
}

// ------------------------------------------------------------------ touch, mouse and trackpad: drag to move, pinch or scroll to zoom, tap a hen
const pointers = new Map();
let drag = null, pinch = 0;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
  if (pointers.size === 1) drag = { moved: false };
  if (pointers.size === 2) { drag = null; pinch = spread(); }
  wake(1000);
});
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (pointers.size >= 2) {
    const s = spread(); if (pinch > 0 && s > 0) zoomBy(pinch / s); pinch = s;
  } else if (drag) {
    if (Math.hypot(p.x - p.x0, p.y - p.y0) > 8) drag.moved = true;
    if (drag.moved) pan(dx, dy);
  }
  wake(1000);
});
function endPointer(e) {
  const p = pointers.get(e.pointerId); if (!p) return;
  pointers.delete(e.pointerId);
  if (drag && !drag.moved && pointers.size === 0 && performance.now() - p.t0 < 500) tapAt(e.clientX, e.clientY);
  if (pointers.size < 2) pinch = 0;
  if (pointers.size === 0) drag = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0016))); wake(1000); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

function spread() { const a = [...pointers.values()]; return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
function zoomBy(f) { view.size = Math.min(view.max, Math.max(view.min, view.size * f)); placeCamera(); }
function pan(dx, dy) {
  const upp = 2 * view.size / Math.max(1, canvas.clientHeight);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion); up.y = 0; up.normalize();
  view.target.addScaledVector(right, -dx * upp).addScaledVector(up, dy * upp / PITCH_SIN);
  const off = new THREE.Vector3().subVectors(view.target, view.start); off.y = 0;
  if (off.length() > 9) view.target.copy(view.start).add(off.setLength(9));
  placeCamera();
}

const tag = document.getElementById('tag');
let tagBird = null, tagLeft = 0;
function tapAt(x, y) {
  ndc.set(x / canvas.clientWidth * 2 - 1, -(y / canvas.clientHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  let best = null, bestD = Infinity;
  const s = new THREE.Sphere();
  for (const b of birds) {
    s.center.set(b.root.position.x, b.root.position.y + b.hitY, b.root.position.z); s.radius = b.hitR;
    const hit = ray.ray.intersectSphere(s, new THREE.Vector3());
    if (hit) { const d = hit.distanceTo(ray.ray.origin); if (d < bestD) { bestD = d; best = b; } }
  }
  if (!best) return;
  best.hop = 1; tagBird = best; tagLeft = 2.5;
  tag.textContent = best.name + (best.kind === 'chick' ? ' (chick)' : best.kind === 'rooster' ? ' (rooster)' : '');
  tag.classList.add('on');
}
function placeTag(dt) {
  if (!tagBird) return;
  tagLeft -= dt;
  if (tagLeft <= 0) { tag.classList.remove('on'); tagBird = null; return; }
  const v = tagBird.root.position.clone(); v.y += tagBird.kind === 'chick' ? 0.3 : 0.55; v.project(camera);
  tag.style.transform = `translate(${(v.x + 1) / 2 * canvas.clientWidth}px, ${(1 - v.y) / 2 * canvas.clientHeight}px) translate(-50%, -100%)`;
}

const hintEl = document.getElementById('hint');
function hint(t) { hintEl.textContent = t; hintEl.classList.add('on'); setTimeout(() => hintEl.classList.remove('on'), 4500); }

// ------------------------------------------------------------------ the loop: 30 frames a second when idle, 60 while touched
let awakeUntil = 0, lastFrame = 0, lastSim = 0;
function wake(ms) { awakeUntil = Math.max(awakeUntil, performance.now() + ms); }
const meter = { frames: 0, late: 0, since: 0, fps: 0, slow: 0 };
const readout = document.getElementById('readout');
let details = params.has('details');
readout.addEventListener('click', () => { details = !details; showReadout(); });

function frame(now) {
  requestAnimationFrame(frame);
  const busy = now < awakeUntil || pointers.size > 0;
  if (!busy && now - lastFrame < 1000 / 30 - 3) return;              // idle: every other screen refresh is enough
  const dt = Math.min(0.1, (now - (lastSim || now)) / 1000); lastSim = now;
  for (const b of birds) b.update(dt);
  placeTag(dt);
  renderer.render(scene, camera);
  // how smooth it is: a frame is late when it came much later than planned (1/60 s while touched, 1/30 s otherwise)
  const gap = now - lastFrame;
  if (lastFrame && gap < 1000 && gap > (busy ? 1000 / 60 : 1000 / 30) * 1.6) meter.late++;
  lastFrame = now;
  meter.frames++;
  if (!meter.since) meter.since = now;
  if (now - meter.since >= 2000) {
    meter.fps = meter.frames * 1000 / (now - meter.since);
    meter.slow = meter.late > meter.frames * 0.4 ? meter.slow + 1 : 0;      // two slow stretches in a row: step down
    meter.frames = 0; meter.late = 0; meter.since = now;
    if (meter.slow >= 2 && q < QUALITY.length - 1 && !params.has('q')) { stepDown(); meter.slow = 0; }
    showReadout();
  }
}

function stepDown() {
  q++;
  const Q = QUALITY[q];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr));
  applyGrass();
  aimSun(); renderer.shadowMap.needsUpdate = true;
  resize();
}

function showReadout() {
  const fps = Math.round(meter.fps);
  const word = fps >= 50 ? 'Smooth' : fps >= 26 ? 'Smooth' : fps >= 18 ? 'A bit slow' : 'Slow';
  const info = renderer.info.render;
  readout.textContent = details
    ? `${fps} fps · quality ${q + 1} of ${QUALITY.length} · ${renderer.getPixelRatio().toFixed(2)}× · ${Math.round(info.triangles / 1000)}k triangles · ${info.calls} draws`
    : `${word} · ${fps} fps`;
  readout.classList.toggle('slow', fps < 18);
}

document.addEventListener('visibilitychange', () => { lastSim = 0; meter.since = 0; meter.frames = 0; });

window.__farm = { birds, view, renderer, scene, camera, quality: () => q, meter, setQuality: (n) => { while (q < n) stepDown(); } };
start().catch(err => {
  console.error(err);
  loading.querySelector('.msg').textContent = 'The farm could not load. Check your connection and try again.';
});

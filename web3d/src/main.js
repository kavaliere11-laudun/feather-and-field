// Feather & Field: the 3D village (steps 1 and 2 of the 3D conversion).
// The game's village in 3D, laid out like the 2D map: ten clusters of four plots round a green with a pond, lanes, two streams
// with footbridges, the farmhouse and fields at the top, the pasture at the bottom, woods all round.
// Step 2: every coop style (Red Barn, Thatched Cottage, Stone Cottage, Timber Lodge, Pagoda Coop) plain and Deluxe, and every
// breed as hens, roosters and chicks with the 11 Silkie colours (birds.js), moved by bones: walking, pecking, scratching,
// looking round, flapping, resting; roosters crow; chicks keep near their mum.
// Built to run smoothly on a phone:
// - light models, each drawn in a few calls; anything repeated (trees, bushes, flowers, grass, pebbles) is drawn in batches;
// - shadows come only from things that never move, drawn for the area round the view and redrawn only when the view moves on;
// - birds get soft round shadows, and only birds near the view walk about;
// - at most 2x pixel ratio; 30 frames a second when nobody is touching, 60 while dragging or zooming, nothing in the background;
// - if the phone struggles, the quality steps down by itself.
// Test page options: ?coops=N fills the first N plots (default 10: every coop style, plain and Deluxe), ?lineup shows every breed
// and Silkie colour in the pasture, ?q=0..3 fixes the quality, ?details shows the numbers.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BREEDS, SILKIE, BREED_NAMES, initFlock, Rig, setFar, setFurDetail, setHairTexture, setSoftFur } from './birds.js';

const MODELS = './models/';
const VERSION = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'test';      // when this version was published (shown with the details)
const params = new URLSearchParams(location.search);
const DEG = Math.PI / 180, R2 = Math.SQRT1_2;

// ------------------------------------------------------------------ quality levels (the first one the device can manage)
const QUALITY = [
  { dpr: 2, shadow: 2048, grass: 1.0, aa: true, fur: 1 },
  { dpr: 1.5, shadow: 2048, grass: 0.8, aa: true, fur: 1 },
  { dpr: 1.25, shadow: 1024, grass: 0.55, aa: false, fur: 0.67 },
  { dpr: 1, shadow: 1024, grass: 0.35, aa: false, fur: 0.34 },
];
let q = Math.max(0, Math.min(QUALITY.length - 1, parseInt(params.get('q') || '0', 10) || 0));

// ------------------------------------------------------------------ renderer, scene, camera, light
const canvas = document.getElementById('farm');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY[q].aa, powerPreference: 'high-performance', stencil: false });
setSoftFur(renderer.getContext().getContextAttributes().antialias);          // soft fluff edges where the phone antialiases
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;               // like the Unity farm: colours as they are, no film curve
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;                    // redrawn only when the view moves on (only still things cast shadows)
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[q].dpr));

const scene = new THREE.Scene();
scene.background = new THREE.Color('#8cb85c');
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
const view = { target: new THREE.Vector3(), size: 4.4, min: 1.4, max: 9 };
// the game's view: 42 degrees down, 45 degrees round
const VIEW_DIR = new THREE.Vector3(Math.sin(45 * DEG) * Math.cos(42 * DEG), Math.sin(42 * DEG), Math.cos(45 * DEG) * Math.cos(42 * DEG)).normalize();
const PITCH_SIN = Math.sin(42 * DEG);

// light: the Unity farm's warm sun and sky-tinted ambient light (three.js lights are physical: about pi times Unity's numbers)
const hemi = new THREE.HemisphereLight(new THREE.Color().setRGB(0.64, 0.74, 0.86, THREE.SRGBColorSpace),
  new THREE.Color().setRGB(0.36, 0.42, 0.27, THREE.SRGBColorSpace), parseFloat(params.get('hemi') || '2.6'));
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', parseFloat(params.get('sun') || '5.2'));
sun.castShadow = true;
scene.add(sun, sun.target);
const SUN_DIR = new THREE.Vector3(0.55, -0.72, -0.62).normalize();
const SHADOW_REACH = 15;                                  // metres round the view that get shadows
let shadowAt = null;

function placeCamera() {
  const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
  const a = w / Math.max(1, h);
  camera.top = view.size; camera.bottom = -view.size; camera.left = -view.size * a; camera.right = view.size * a;
  camera.position.copy(view.target).addScaledVector(VIEW_DIR, 80);
  camera.lookAt(view.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  aimShadows(false);
}

// shadows for the area round the view: redrawn when the view has moved a good way, or zoomed out past what they cover
function aimShadows(force) {
  const t = view.target;
  const reach = Math.max(SHADOW_REACH, view.size * 2.4);
  if (!force && shadowAt && shadowAt.p.distanceTo(t) < reach * 0.35 && shadowAt.reach >= reach * 0.99) return;
  shadowAt = { p: t.clone(), reach };
  sun.target.position.set(t.x, 0, t.z);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, -40);
  const s = sun.shadow;
  s.mapSize.set(QUALITY[q].shadow, QUALITY[q].shadow);
  s.camera.left = -reach; s.camera.right = reach; s.camera.top = reach; s.camera.bottom = -reach; s.camera.near = 5; s.camera.far = 80;
  s.bias = -0.0005; s.normalBias = 0.03; s.radius = 3;
  s.camera.updateProjectionMatrix();
  if (s.map && s.map.width !== QUALITY[q].shadow) { s.map.dispose(); s.map = null; }
  sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  renderer.shadowMap.needsUpdate = true;
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  placeCamera();
  furDetail();
  wake(400);
}
window.addEventListener('resize', resize);
// how much fur and fluff to draw: from how big birds are on screen, and the quality level
function furDetail() { setFurDetail(renderer.getPixelRatio() * (canvas.clientHeight || window.innerHeight) / (2 * view.size), QUALITY[q].fur); }

// ------------------------------------------------------------------ colours: a touch richer, like the Unity farm's grading
const SAT = 1.15;
function richer(geo, sat = SAT, lift = 1) {
  const c = geo.getAttribute('color');
  if (!c || geo.userData.richer) return;
  const n = c.normalized, arr = c.array, k = n ? 255 : 1;
  for (let i = 0; i < c.count; i++) {
    const o = i * c.itemSize;
    const r = arr[o] / k, g = arr[o + 1] / k, b = arr[o + 2] / k;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    arr[o] = Math.min(1, Math.max(0, (l + (r - l) * sat) * lift)) * k;
    arr[o + 1] = Math.min(1, Math.max(0, (l + (g - l) * sat) * lift)) * k;
    arr[o + 2] = Math.min(1, Math.max(0, (l + (b - l) * sat) * lift)) * k;
  }
  c.needsUpdate = true;
  geo.userData.richer = true;
}

// ------------------------------------------------------------------ a little seeded randomness (the village looks the same every time)
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

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

const parts = {};
function part(name) {
  const p = parts[name];
  if (!p) throw new Error('missing model ' + name);
  return p.clone();
}
function meshesOf(o) { const out = []; o.traverse(c => { if (c.isMesh) out.push(c); }); return out; }

// one geometry and one material for a model (birds: one draw instead of three)
const solids = {};
function solid(name) {
  if (solids[name]) return solids[name];
  const geos = meshesOf(parts[name]).map(m => m.geometry.clone().applyMatrix4(m.matrixWorld));
  for (const g of geos) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  const geo = mergeGeometries(geos, false);
  return (solids[name] = { geo, mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }) });
}

// ------------------------------------------------------------------ the village
let V = null, PEN = null, COOPS = null;     // the village plan, and the inside of a pen (from the single farm: yard, obstacles, nest, feeder)
const plots = [];
const allBirds = [];
const grassTiles = [];

async function start() {
  const [farm, flock, village, plan, pen, meadow, flockInfo, coopsGlb, coopsInfo] = await Promise.all([loadGLB('plants.glb'), loadGLB('flock.glb'),
    loadGLB('village.glb'), loadJSON('village.json'), loadJSON('layout.json'), loadImage('meadow.jpg'), loadJSON('flock.json'), loadGLB('coops.glb'),
    loadJSON('coops.json'), new THREE.TextureLoader().loadAsync(MODELS + 'silkie_hair.jpg').then(setHairTexture)]);
  V = plan; PEN = pen; COOPS = coopsInfo;
  initFlock(flock, flockInfo);
  for (const g of [farm, village, coopsGlb]) {
    for (const child of [...g.scene.children]) {
      child.updateMatrixWorld(true);
      for (const m of meshesOf(child)) {
        richer(m.geometry, g === village ? 1.22 : SAT, g === village ? 1.08 : 1);
        if (m.material) { m.material.vertexColors = true; m.material.needsUpdate = true; }
      }
      parts[child.name] = child;
    }
  }
  buildGround(meadow);
  buildWater();
  buildPaths();
  buildProps();
  buildNature();
  buildPlots(Math.max(0, Math.min(40, parseInt(params.get('coops') || '10', 10))));
  if (params.has('lineup')) buildLineup();
  if (allBirds.length) makeBlobs();
  buildGrass();
  const s = V.plots[0].pos;
  view.target.set(s[0], 0, s[2]).add(new THREE.Vector3(0.6, 0, -1.2));
  view.size = 4.4;
  if (lineup) { view.target.copy(lineup.centre); view.size = 2.2; }
  resize();
  aimShadows(true);
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 600);
  hint('Drag to look round the village, pinch or scroll to zoom, tap a bird.');
  requestAnimationFrame(frame);
}

function buildGround(img) {
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
  tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;   // seamless however far it goes
  tex.repeat.set(6, 6);                                    // one picture every 20 m
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const c = villageCentre();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(c.x, 0, c.z);
  still(ground);
}

function villageCentre() { const c = V.bounds.corners; return new THREE.Vector3((c[0][0] + c[2][0]) / 2, 0, (c[0][2] + c[2][2]) / 2); }

function still(o, cast = false, receive = true) {          // a part of the village that never moves
  o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } });
  o.updateMatrixWorld(true);
  o.traverse(c => { c.matrixAutoUpdate = false; });
  scene.add(o);
  return o;
}

// a ribbon along a line on the ground (paths, streams, their banks), with round ends so lanes join smoothly
function ribbon(points, half, y) {
  const pos = [], idx = [];
  const P = points.map(p => new THREE.Vector2(p[0], p[2]));
  const n = P.length;
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    const d = new THREE.Vector2().subVectors(b, a).normalize();
    const nx = -d.y, nz = d.x;
    pos.push(P[i].x + nx * half, y, P[i].y + nz * half, P[i].x - nx * half, y, P[i].y - nz * half);
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  for (const end of [P[0], P[n - 1]]) {                    // round caps
    const c = pos.length / 3; pos.push(end.x, y, end.y);
    for (let s = 0; s <= 16; s++) { const t = s / 16 * Math.PI * 2; pos.push(end.x + Math.cos(t) * half, y, end.y + Math.sin(t) * half); }
    for (let s = 0; s < 16; s++) idx.push(c, c + 2 + s, c + 1 + s);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;      // flat on the ground
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return g;
}

const DIRT = new THREE.MeshLambertMaterial({ color: '#c79a62', side: THREE.DoubleSide });
const BANK = new THREE.MeshLambertMaterial({ color: '#b48c5c', side: THREE.DoubleSide });
const WATER = new THREE.MeshStandardMaterial({ color: '#5fb3d6', roughness: 0.12, metalness: 0.0, side: THREE.DoubleSide });

function buildPaths() {
  const geos = V.paths.map((p, i) => ribbon(p, V.pathHalf, 0.004 + (i % 7) * 0.0003));
  still(new THREE.Mesh(mergeGeometries(geos, false), DIRT));
  // pebbles along the edges, in one batch
  const peb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshLambertMaterial({ color: '#cfc8ba' }), V.pebbles.length);
  const r = rng(5), m = new THREE.Matrix4(), qn = new THREE.Quaternion(), e = new THREE.Euler();
  V.pebbles.forEach((p, i) => {
    const s = 0.6 + r() * 0.8;
    m.compose(new THREE.Vector3(p[0], 0.008, p[2]), qn.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(s * 1.2, s * 0.6, s));
    peb.setMatrixAt(i, m);
  });
  peb.computeBoundingSphere();
  still(peb);
}

function buildWater() {
  // the pond: an ellipse of water in a ring of bank
  const P = V.pond, c = new THREE.Vector3(...P.center), au = new THREE.Vector3(...P.axisU), av = new THREE.Vector3(...P.axisV);
  const ellipse = (scale, y) => {
    const pos = [c.x, y, c.z], idx = [];
    for (let s = 0; s <= 64; s++) {
      const t = s / 64 * Math.PI * 2, w = 1 + 0.035 * Math.sin(t * 5 + 1) + 0.02 * Math.sin(t * 9);
      pos.push(c.x + (au.x * Math.cos(t) + av.x * Math.sin(t)) * scale * w, y, c.z + (au.z * Math.cos(t) + av.z * Math.sin(t)) * scale * w);
    }
    for (let s = 0; s < 64; s++) idx.push(0, s + 1, s + 2);      // counter-clockwise seen from above: facing up
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    return g;
  };
  still(new THREE.Mesh(ellipse(1.12, 0.003), BANK));
  still(new THREE.Mesh(ellipse(1.0, 0.007), WATER));
  // the streams, each in its banks
  for (const st of V.streams) {
    still(new THREE.Mesh(ribbon(st, V.streamHalf + 0.16, 0.0035), BANK));
    still(new THREE.Mesh(ribbon(st, V.streamHalf, 0.0075), WATER));
  }
}

// many copies of one model, drawn together (one draw per material). A batch is drawn whole whenever any of it is in view, so
// copies spread over the village are split into tiles: the phone then only draws the tiles near the view.
function batch(name, matrices, opts = {}) {
  const TILE = opts.tile === undefined ? 12 : opts.tile;
  if (!TILE) return batchOne(name, matrices, opts);
  const tiles = new Map();
  for (const m of matrices) {
    const key = Math.floor(m.elements[12] / TILE) + ',' + Math.floor(m.elements[14] / TILE);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(m);
  }
  const out = [];
  for (const list of tiles.values()) out.push(...batchOne(name, list, opts));
  return out;
}
function batchOne(name, matrices, opts) {
  const out = [];
  if (!matrices.length) return out;
  for (const m of meshesOf(parts[name])) {
    const mat = opts.lambert ? new THREE.MeshLambertMaterial({ vertexColors: true, side: opts.twoSided ? THREE.DoubleSide : THREE.FrontSide }) : m.material;
    const inst = new THREE.InstancedMesh(m.geometry, mat, matrices.length);
    inst.userData.model = name;
    matrices.forEach((mx, i) => inst.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(mx, m.matrixWorld)));
    inst.castShadow = !!opts.cast; inst.receiveShadow = true;
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    inst.matrixAutoUpdate = false;
    scene.add(inst);
    out.push(inst);
  }
  return out;
}
function place(x, y, z, deg, s) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deg * DEG), new THREE.Vector3(s, s, s));
}

function buildProps() {
  // buildings, the pasture, fields, decorations, bridges and the dock: grouped by model, each group in one batch
  const byModel = {};
  for (const p of V.props) (byModel[p.model] = byModel[p.model] || []).push(place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1));
  for (const name in byModel) {
    if (!parts[name]) { console.warn('no model for', name); continue; }
    batch(name, byModel[name], { cast: true });
  }
  for (const mx of byModel.wheat_field || []) wheat(mx, 4.4, 2.4);
}

// ripe wheat standing on its field: golden stalks with an ear on each (the field's growing stages come later)
function wheat(fieldMatrix, w, d) {
  const r = rng(31), stalks = [], ears = [];
  for (let x = -w / 2 + 0.12; x < w / 2 - 0.1; x += 0.15) {
    for (let y = -d / 2 + 0.12; y < d / 2 - 0.1; y += 0.15) {
      const px = x + (r() - 0.5) * 0.06, pz = y + (r() - 0.5) * 0.06, h = 0.85 + r() * 0.3;
      const local = new THREE.Matrix4().compose(new THREE.Vector3(px, 0.02, pz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28),
        new THREE.Vector3(2.4, 7 * h, 2.4));
      stalks.push(new THREE.Matrix4().multiplyMatrices(fieldMatrix, local));
      for (let k = 0; k < 2; k++) {
        const a = r() * 6.28, e = new THREE.Matrix4().compose(new THREE.Vector3(px + Math.cos(a) * 0.035, 0.02 + 0.36 * h, pz + Math.sin(a) * 0.035),
          new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5)), new THREE.Vector3(1, 1, 1));
        ears.push(new THREE.Matrix4().multiplyMatrices(fieldMatrix, e));
      }
    }
  }
  const stalkGeo = meshesOf(parts.grass_tuft_1)[0].geometry;
  const st = new THREE.InstancedMesh(stalkGeo, new THREE.MeshLambertMaterial({ color: '#d9b24e', side: THREE.DoubleSide }), stalks.length);
  stalks.forEach((m, i) => st.setMatrixAt(i, m));
  const ea = new THREE.InstancedMesh(new THREE.ConeGeometry(0.016, 0.09, 4, 1), new THREE.MeshLambertMaterial({ color: '#e7bf55' }), ears.length);
  ears.forEach((m, i) => ea.setMatrixAt(i, m));
  for (const o of [st, ea]) { o.computeBoundingSphere(); o.receiveShadow = true; o.castShadow = o === st; still(o, o === st, true); }
}

function buildNature() {
  const r = rng(21);
  // trees: three kinds of shady tree for the woods and the green, apple trees in the orchard
  const kinds = { a: [], b: [], c: [], apple: [] };
  V.trees.forEach((t, i) => {
    const m = place(t.pos[0], 0, t.pos[2], r() * 360, t.h / 2.1);
    if (t.kind === 'apple') kinds.apple.push(m); else kinds['abc'[i % 3]].push(m);
  });
  batch('tree_a', kinds.a, { cast: true }); batch('tree_b', kinds.b, { cast: true }); batch('tree_c', kinds.c, { cast: true });
  batch('tree_apple', kinds.apple, { cast: true });
  // bushes and rocks
  const ba = [], bb = [];
  V.bushes.forEach((b, i) => (i % 2 ? bb : ba).push(place(b.pos[0], 0, b.pos[2], b.rot, b.s * 1.1)));
  batch('bush_a', ba, { cast: true }); batch('bush_b', bb, { cast: true });
  const ra = [], rb = [];
  V.rocks.forEach((k, i) => (i % 2 ? rb : ra).push(place(k.pos[0], 0, k.pos[2], k.rot, k.s * 1.2)));
  batch('rock_a', ra); batch('rock_b', rb);
  // wildflowers in little drifts
  const fl = { flower_daisy: [], flower_butter: [], flower_clover: [] }, names = Object.keys(fl);
  for (const f of V.flowers) {
    const pick = [names[Math.floor(r() * 3)], names[Math.floor(r() * 3)]];
    const n = 5 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * f.r;
      fl[pick[k % 2]].push(place(f.pos[0] + Math.cos(a) * d, 0, f.pos[2] + Math.sin(a) * d, r() * 360, 1.3 + r() * 0.6));
    }
  }
  for (const n of names) batch(n, fl[n], { lambert: true, twoSided: true });
}

// grass tufts in tiles of 6 m, so the phone only draws the tiles in view; fewer on slower phones, none when zoomed far out
function buildGrass() {
  const TILE = 6, tiles = new Map();
  for (const t of V.tufts) {
    const key = Math.floor(t[0] / TILE) + ',' + Math.floor(t[2] / TILE);
    if (!tiles.has(key)) tiles.set(key, [[], [], []]);
    tiles.get(key)[t[3]].push(place(t[0], 0, t[2], t[4] / DEG, t[5]));
  }
  for (const lists of tiles.values()) {
    lists.forEach((list, k) => {
      for (const inst of batch('grass_tuft_' + k, list, { lambert: true, tile: 0, twoSided: true })) grassTiles.push({ mesh: inst, full: inst.count });
    });
  }
  applyGrass();
}
function applyGrass() {
  setFar(view.size > 5.5);
  furDetail();
  const far = view.size > 7.2;
  for (const g of grassTiles) { g.mesh.count = Math.max(1, Math.round(g.full * QUALITY[q].grass)); g.mesh.visible = !far; }
}

// ------------------------------------------------------------------ plots: a coop with its birds, an empty plot ready to build, or a plot for sale
const COOP_SHIFT = new THREE.Vector3(-0.075, 0, -0.85);   // the coop model's pen, centred on its plot
function buildPlots(nCoops) {
  const r = rng(7), coopParts = {};
  V.plots.forEach((p, i) => {
    const g = new THREE.Group();
    g.position.set(p.pos[0], 0, p.pos[2]); g.rotation.y = p.deg * DEG;
    scene.add(g);
    const plot = { index: i, group: g, birds: [], kind: i < nCoops ? 'coop' : i < nCoops + 2 ? 'empty' : 'sale', centre: new THREE.Vector3(p.pos[0], 0, p.pos[2]) };
    plots.push(plot);
    if (plot.kind === 'coop') {
      const frame = new THREE.Group(); frame.position.copy(COOP_SHIFT); g.add(frame);
      addNest(frame);
      plot.frame = frame;
      plot.breed = BREEDS[i % BREEDS.length]; plot.deluxe = Math.floor(i / BREEDS.length) % 2 === 1;
      g.updateMatrixWorld(true);                            // the coop itself never moves: it joins its style's batch
      const at = frame.matrixWorld.clone(), house = 'house_' + plot.breed;
      (coopParts[house] = coopParts[house] || []).push(at);
      (coopParts.pen_base = coopParts.pen_base || []).push(at);
      const fence = plot.deluxe ? 'fence_dx' : 'fence'; (coopParts[fence] = coopParts[fence] || []).push(at);
      if (plot.deluxe) { const t = COOPS.tops[house]; (coopParts.vane = coopParts.vane || []).push(at.clone().multiply(new THREE.Matrix4().makeTranslation(t[0], t[1] - 0.02, t[2]))); }
      const silk = plot.breed === 'sil' ? Math.floor(i / BREEDS.length) : 0;
      let k = 0;
      const colour = () => plot.breed === 'sil' ? SILKIE[(silk * 7 + k++) % SILKIE.length] : null;
      for (const h of PEN.hens) plot.birds.push(new Bird(plot, plot.breed, h.model, colour(), h.pos, -h.yaw * DEG + Math.PI, r));
      const mum = plot.birds.find(b => b.kind === 'hen');
      for (let c = 0; c < 2; c++) {
        const chick = new Bird(plot, plot.breed, 'chick', colour(), [mum.root.position.x + 0.3 - c * 0.5, 0, mum.root.position.z + 0.25], r() * 6, r);
        chick.mum = mum; plot.birds.push(chick);
      }
      for (const b of plot.birds) if (!b.free(b.root.position.x, b.root.position.z)) { b.pickTarget(); b.root.position.copy(b.target); }
      allBirds.push(...plot.birds);
    } else {
      const m = part(plot.kind === 'empty' ? 'plot_empty' : 'plot_sale');
      m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      g.add(m);
      if (plot.kind === 'empty') {                          // trodden earth, ready to build on
        const earth = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.5), new THREE.MeshLambertMaterial({ color: '#b98d5c' }));
        earth.rotation.x = -Math.PI / 2; earth.position.y = 0.003; earth.receiveShadow = true; g.add(earth);
      }
    }
    g.updateMatrixWorld(true);
    g.traverse(c => { if (c !== g && !c.userData.moves) c.matrixAutoUpdate = false; });
    g.matrixAutoUpdate = false;
  });
  for (const name in coopParts) batch(name, coopParts[name], { cast: true });
}

const STRAW = new THREE.MeshLambertMaterial({ color: '#e2c169' }), STRAW2 = new THREE.MeshLambertMaterial({ color: '#c9a24f' });
const EGG = new THREE.MeshStandardMaterial({ color: '#d39b68', roughness: 0.45 }), GRAIN = new THREE.MeshLambertMaterial({ color: '#d9b45a' });
const RIM_GEO = new THREE.CylinderGeometry(0.2, 0.2, 0.032, 20), BED_GEO = new THREE.CylinderGeometry(0.16, 0.16, 0.024, 20);
const EGG_GEO = new THREE.SphereGeometry(0.5, 10, 8), GRAIN_GEO = new THREE.CylinderGeometry(0.135, 0.135, 0.02, 20);
function addNest(frame) {
  const nest = new THREE.Group(); nest.position.set(...PEN.nest);
  const rim = new THREE.Mesh(RIM_GEO, STRAW2); rim.position.y = 0.016; rim.scale.z = 0.9;
  const bed = new THREE.Mesh(BED_GEO, STRAW); bed.position.y = 0.024; bed.scale.z = 0.88;
  const eggs = new THREE.InstancedMesh(EGG_GEO, EGG, 3);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.4, d = 0.03 + 0.05 * i;
    eggs.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * d, 0.062, Math.sin(a) * d * 0.9),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4 * i, i, 0.3)), new THREE.Vector3(0.055, 0.07, 0.055)));
  }
  eggs.computeBoundingSphere();
  nest.add(rim, bed, eggs);
  const grain = new THREE.Mesh(GRAIN_GEO, GRAIN); grain.position.set(PEN.feeder[0], 0.065, PEN.feeder[2]);
  for (const o of [rim, bed, eggs, grain]) o.receiveShadow = true;
  frame.add(nest, grain);
}

// ------------------------------------------------------------------ birds: walk, stop, peck, waddle, and keep a little room round each other
const HEN_NAMES = ['Henrietta', 'Clover', 'Mabel', 'Peggy', 'Dotty', 'Hazel', 'Maple', 'Willow', 'Biscuit', 'Nutmeg', 'Poppy', 'Daisy', 'Pearl', 'Ginger',
  'Olive', 'Rosie', 'Marigold', 'Bramble', 'Truffle', 'Pippa', 'Dumpling', 'Ivy', 'Cosette', 'Margot', 'Brioche', 'Lulu', 'Fern', 'Juniper'];
const ROO_NAMES = ['Rupert', 'Albert', 'Barnaby', 'Chester', 'Percy', 'Reginald', 'Gus', 'Hamish', 'Basil', 'Monty', 'Fergus', 'Rocco'];
const CHICK_NAMES = ['Pip', 'Peanut', 'Button', 'Sprout', 'Nugget', 'Bean', 'Pebble', 'Tiny', 'Puff', 'Dot'];
const ROOM = 0.5, PERSONAL = 0.34, BODY = 0.32, CHICK_BODY = 0.2;
let blobGeo, blobMat, blobs = null, nameSeed = 0;
const tmpM = new THREE.Matrix4(), blobScale = new THREE.Matrix4();
// every bird's soft round shadow, drawn in one batch; a bird's shadow follows her when she moves
function makeBlobs() {
  scene.updateMatrixWorld(true);
  blobs = new THREE.InstancedMesh(blobGeo, blobMat, Math.max(1, allBirds.length));
  blobs.renderOrder = 1; blobs.frustumCulled = false;
  allBirds.forEach((b, i) => { b.blob = i; placeBlob(b); });
  blobs.count = allBirds.length;
  scene.add(blobs);
}
function placeBlob(b) {
  b.root.updateMatrix();
  tmpM.multiplyMatrices(b.plot.frame.matrixWorld, b.root.matrix).multiply(b.blobLocal);
  if (b.hopT > 0.24 && b.hopT < 0.86) { const k = 1 - 0.3 * Math.sin((b.hopT - 0.24) / 0.62 * Math.PI); tmpM.multiply(blobScale.makeScale(k, k, 1)); }   // smaller in the air
  blobs.setMatrixAt(b.blob, tmpM);
  blobs.instanceMatrix.needsUpdate = true;
}

// a bird: walks where there's room, pecks, scratches, looks round, stretches her wings, rests; roosters crow; chicks keep near mum
class Bird {
  constructor(plot, breed, kind, colour, pos, yaw, r) {
    this.plot = plot; this.breed = breed; this.kind = kind; this.colour = colour; this.r = r;
    this.name = kind === 'chick' ? CHICK_NAMES[nameSeed++ % CHICK_NAMES.length] : kind === 'rooster' ? ROO_NAMES[nameSeed++ % ROO_NAMES.length] : HEN_NAMES[(nameSeed++ * 7) % HEN_NAMES.length];
    if (!blobGeo) makeBlob();
    this.root = new THREE.Group(); this.visual = new THREE.Group(); this.root.add(this.visual);
    this.rig = new Rig(breed, kind, colour);
    this.visual.add(this.rig.mesh); if (this.rig.lo) this.visual.add(this.rig.lo);
    const small = kind === 'chick', size = this.rig.scale / 0.5;
    this.blobLocal = new THREE.Matrix4().compose(new THREE.Vector3(0, -0.011, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
      new THREE.Vector3(small ? 0.55 : size, small ? 0.55 : size, 1));
    this.root.position.set(pos[0], 0.015, pos[2]); this.root.rotation.y = yaw;
    for (const o of [this.root, this.visual]) o.userData.moves = true;
    this.speed = small ? 0.26 : 0.32; this.turn = 260 * DEG; this.stepRate = small ? 26 : 17;
    this.hitR = small ? 0.12 : 0.17 * size; this.hitY = small ? 0.08 : 0.17 * size;
    this.target = this.root.position.clone(); this.wait = 0.2 + r() * 2.3; this.phase = r() * 10; this.hopT = -1;
    this.act = null;                       // what she's doing while standing: peck, scratch, flap, crow, rest, ruffle
    this.A = { walk: 0, phase: r() * 6, peck: 0, lookYaw: 0, lookTilt: 0, flap: 0, crow: 0, sit: 0, kick: 0, kickT: 0, kickLeg: 0, wag: 0, t: r() * 10,
               hopT: -1, turn: 0, ruffle: 0, dt: 1 / 30 };
    this.lastYaw = yaw;
    this.look = { yaw: 0, tilt: 0, next: r() * 2 };
    this.stay = false;                     // line-up birds stand in their place
    plot.frame.add(this.root);
  }
  get flock() { return this.plot.birds; }
  get label() {
    const what = this.breed === 'sil' ? 'Silkie, ' + this.colour : BREED_NAMES[this.breed];
    return this.name + ' · ' + what + (this.kind === 'chick' ? ' chick' : this.kind === 'rooster' ? ' rooster' : '');
  }
  free(x, z) {
    if (this.plot.kind === 'lineup') return true;
    const Y = PEN.yard;
    if (x < Y.min[0] || x > Y.max[0] || z < Y.min[2] || z > Y.max[2]) return false;
    for (const o of PEN.obstacles) { const dx = x - o[0], dz = z - o[2]; if (dx * dx + dz * dz < o[3] * o[3]) return false; }
    return true;
  }
  roomAt(x, z) {
    let d = 99;
    for (const b of this.flock) if (b !== this) d = Math.min(d, Math.hypot(b.root.position.x - x, b.root.position.z - z), Math.hypot(b.target.x - x, b.target.z - z));
    return d;
  }
  clearPath(ax, az, bx, bz) {
    const len = Math.hypot(bx - ax, bz - az);
    for (let k = 0.1; k < len; k += 0.1) if (!this.free(ax + (bx - ax) * k / len, az + (bz - az) * k / len)) return false;
    return true;
  }
  pickTarget() {
    const p = this.root.position, startFree = this.free(p.x, p.z), Y = PEN.yard;
    if (this.stay) { this.target.copy(p); return; }
    const mum = this.mum && this.mum.root.position;
    let best = null, bestRoom = -1;
    for (let i = 0; i < 30; i++) {
      let x, z;
      if (mum && i < 20) { const a = this.r() * 6.28, d = 0.28 + this.r() * 0.3; x = mum.x + Math.cos(a) * d; z = mum.z + Math.sin(a) * d; }     // chicks keep near mum
      else { x = Y.min[0] + this.r() * (Y.max[0] - Y.min[0]); z = Y.min[2] + this.r() * (Y.max[2] - Y.min[2]); }
      if (!this.free(x, z) || (startFree && !this.clearPath(p.x, p.z, x, z))) continue;
      const room = this.roomAt(x, z), need = this.kind === 'chick' ? 0.3 : ROOM;
      if (room >= need) { this.target.set(x, p.y, z); return; }
      if (room > bestRoom) { bestRoom = room; best = [x, z]; }
    }
    if (best) this.target.set(best[0], p.y, best[1]); else this.target.copy(p);
  }
  someoneAhead() {
    const p = this.root.position, fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y);
    const reach = this.kind === 'chick' ? 0.22 : PERSONAL;
    for (const b of this.flock) if (b !== this) {
      const dx = b.root.position.x - p.x, dz = b.root.position.z - p.z, d = Math.hypot(dx, dz);
      if (d < reach && dx * fx + dz * fz > 0.2 * d) return true;
    }
    return false;
  }
  tooClose() {
    const near = this.kind === 'chick' ? 0.2 : 0.3;
    for (const b of this.flock) if (b !== this && Math.hypot(b.root.position.x - this.root.position.x, b.root.position.z - this.root.position.z) < near) return true;
    return false;
  }
  // something to do while standing still
  chooseAct() {
    const x = this.r(), rooster = this.kind === 'rooster', chick = this.kind === 'chick';
    if (x < 0.36) return { type: 'peck', left: 1.2 + this.r() * 1.8 };
    if (x < 0.5 && !chick) return { type: 'scratch', left: 1.9, leg: this.r() < 0.5 ? 0 : 1 };
    if (x < 0.55) return { type: 'flap', left: 0.9 };
    if (rooster && x < 0.66) return { type: 'crow', left: 2.0 };
    if (x < (rooster ? 0.69 : 0.59) && !this.mum) return { type: 'rest', left: 3 + this.r() * 4 };
    if (x < (rooster ? 0.74 : 0.65)) return { type: 'ruffle', left: 0.75 };             // a quick shake of the feathers
    return null;
  }
  tapped() {                               // a hop and a flap (a rooster may crow)
    this.hopT = 0;
    if (this.kind === 'rooster' && this.r() < 0.5) { this.act = { type: 'crow', left: 2.0 }; this.wait = Math.max(this.wait, 2.0); }
    else { this.act = { type: 'flap', left: 0.8 }; this.wait = Math.max(this.wait, 0.8); }
  }
  update(dt) {
    this.phase += dt;
    const A = this.A, k = Math.min(1, dt * 14);
    A.t += dt;
    if (this.hopT >= 0) { this.hopT += dt / 0.8; if (this.hopT >= 1) this.hopT = -1; }        // a hop lasts 0.8 s
    let walking = false, peckGoal = 0, sitGoal = 0, kick = 0, flap = 0, crow = 0, wag = 0, ruffle = 0;
    const act = this.act;
    if (act) {
      act.left -= dt;
      if (act.type !== 'crow' && act.type !== 'flap' && this.tooClose()) act.left = Math.min(act.left, 0.05);
      if (act.type === 'peck') peckGoal = (act.left % 0.55) > 0.24 ? 1 : 0.3;
      if (act.type === 'scratch') {                // two kicks back, a step back, then a look at what turned up
        if (act.left > 0.9) { kick = 1; A.kickLeg = act.leg; A.kickT += dt; } else peckGoal = (act.left % 0.45) > 0.2 ? 1 : 0.4;
      }
      if (!act.dur) act.dur = act.left + dt;
      if (act.type === 'flap') flap = Math.sin(Math.max(0, Math.min(1, (act.dur - act.left) / act.dur)) * Math.PI);
      if (act.type === 'crow') { const t = act.dur - act.left; flap = t < 0.45 ? Math.sin(t / 0.45 * Math.PI) : 0; crow = t < 0.45 ? 0 : Math.min(1, (t - 0.45) / 0.25) * Math.min(1, act.left / 0.3); }
      if (act.type === 'rest') { sitGoal = 1; wag = 0; }
      if (act.type === 'ruffle') ruffle = Math.sin(Math.max(0, Math.min(1, (act.dur - act.left) / act.dur)) * Math.PI);
      if (act.left <= 0) { this.act = null; this.wait = Math.min(this.wait, 0.2 + this.r() * 0.6); this.acted = true; }
    } else if (this.wait > 0) {
      if (this.wait > 0.3 && this.tooClose()) this.wait = 0.3;
      this.wait -= dt;
      if (this.wait <= 0) {
        const next = this.acted ? null : this.chooseAct();          // after doing something, she walks on
        this.acted = false;
        if (next && !(next.type !== 'flap' && next.type !== 'crow' && this.tooClose())) { this.act = next; this.wait = 0.4 + this.r() * 1.0; }
        else this.pickTarget();
      }
    } else {
      const p = this.root.position, dx = this.target.x - p.x, dz = this.target.z - p.z, dist = Math.hypot(dx, dz);
      if (dist < 0.04) { this.wait = 0.5 + this.r() * 2.0; wag = 1; }
      else {
        const want = Math.atan2(dx, dz);
        let diff = ((want - this.root.rotation.y + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        const step = this.turn * dt;
        this.root.rotation.y += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
        diff = Math.abs(diff) < step ? 0 : diff - Math.sign(diff) * step;
        const facing = Math.abs(diff) < 25 * DEG;
        if (facing && this.someoneAhead()) this.wait = 0.3 + this.r() * 0.6;
        else if (facing) {
          const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y), s = Math.min(this.speed * dt, dist);
          const nx = p.x + fx * s, nz = p.z + fz * s;
          if (this.free(nx, nz) || !this.free(p.x, p.z)) { p.x = nx; p.z = nz; walking = true; } else this.wait = 0.5;
        } else walking = Math.abs(diff) > 2 * DEG;      // little steps on the spot while turning
      }
    }
    // looking round while standing: a new glance now and then, and a curious head tilt
    this.look.next -= dt;
    if (this.look.next <= 0) {
      this.look.next = 0.6 + this.r() * 1.8;
      const busy = walking || peckGoal > 0;
      this.look.yaw = busy ? 0 : (this.r() - 0.5) * 1.3; this.look.tilt = busy ? 0 : (this.r() < 0.35 ? (this.r() - 0.5) * 0.7 : 0);
    }
    A.lookYaw += (this.look.yaw - A.lookYaw) * Math.min(1, dt * 8); A.lookTilt += (this.look.tilt - A.lookTilt) * Math.min(1, dt * 6);
    A.walk += ((walking ? 1 : 0) - A.walk) * Math.min(1, dt * 10);
    if (walking) A.phase += dt * this.stepRate;
    A.peck += (peckGoal - A.peck) * Math.min(1, dt * (peckGoal > A.peck ? 22 : 12));
    A.sit += (sitGoal - A.sit) * Math.min(1, dt * 3.5);
    A.kick += (kick - A.kick) * k; if (!kick) A.kickT = 0;
    A.flap += (flap - A.flap) * Math.min(1, dt * 20); A.crow += (crow - A.crow) * Math.min(1, dt * 10);
    A.wag += (wag - A.wag) * Math.min(1, dt * 3); if (!wag) A.wag *= 0.98;
    A.ruffle += (ruffle - A.ruffle) * Math.min(1, dt * 18);
    // how fast she is turning (the tail swings out the other way)
    let dy = this.root.rotation.y - this.lastYaw; this.lastYaw = this.root.rotation.y;
    dy = ((dy + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    A.turn += ((dt > 0 ? dy / dt : 0) - A.turn) * Math.min(1, dt * 12);
    A.hopT = this.hopT; A.dt = dt;
    this.rig.pose(A);
  }
}

// every breed and Silkie colour standing in rows on open grass beside the village, for a close look (?lineup)
let lineup = null;
function buildLineup() {
  const c = villageCentre().add(new THREE.Vector3(32, 0, 32));
  const frame = new THREE.Group(); frame.position.copy(c); frame.rotation.y = 45 * DEG; scene.add(frame);      // rows run across the screen
  lineup = { kind: 'lineup', frame, birds: [], centre: c };
  plots.push(lineup);
  const r = rng(99), yaw = 0;
  const row = (z, list, step) => list.forEach(([breed, kind, colour], i) => {
    const b = new Bird(lineup, breed, kind, colour, [(i - (list.length - 1) / 2) * step, 0, z], yaw + (r() - 0.5) * 0.6, r);
    b.stay = true; lineup.birds.push(b);
  });
  const breeds = BREEDS.filter(b => b !== 'sil');
  row(1.2, breeds.flatMap(b => [[b, 'hen'], [b, 'rooster'], [b, 'chick']]), 0.45);
  row(0.45, SILKIE.map(c => ['sil', 'chick', c]), 0.45);
  row(-0.1, SILKIE.map(c => ['sil', 'hen', c]), 0.45);
  row(-0.75, SILKIE.map(c => ['sil', 'rooster', c]), 0.45);
  allBirds.push(...lineup.birds);
  frame.updateMatrixWorld(true);
}

function makeBlob() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const cx = cv.getContext('2d'), gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
  blobGeo = new THREE.CircleGeometry(0.16, 20);
  blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, color: '#20301a' });
}

// birds in the same pen never overlap: two that end up too close gently step apart
function separate(flock, dt) {
  const k = Math.min(1, dt * 8);
  for (let i = 0; i < flock.length; i++) for (let j = i + 1; j < flock.length; j++) {
    const a = flock[i].root.position, b = flock[j].root.position;
    const min = flock[i].kind === 'chick' || flock[j].kind === 'chick' ? CHICK_BODY : BODY;
    let dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d >= min) continue;
    if (d < 1e-4) { dx = 1; dz = 0; d = 1; } else { dx /= d; dz /= d; }
    const push = (min - Math.min(d, min)) * 0.5 * k;
    const ax = a.x - dx * push, az = a.z - dz * push, bx = b.x + dx * push, bz = b.z + dz * push;
    const aFree = flock[i].free(ax, az), bFree = flock[j].free(bx, bz);
    if (aFree) { a.x = ax; a.z = az; } else if (bFree) { b.x += dx * push; b.z += dz * push; }
    if (bFree) { b.x = bx; b.z = bz; } else if (aFree) { a.x -= dx * push; a.z -= dz * push; }
  }
}

// only pens near the view are brought to life (the others wait where they are)
const frustum = new THREE.Frustum(), projView = new THREE.Matrix4(), sphere = new THREE.Sphere();
function livePlots() {
  projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projView);
  const out = [];
  for (const p of plots) {
    if (p.kind !== 'coop' && p.kind !== 'lineup') continue;
    sphere.center.copy(p.centre); sphere.radius = p.kind === 'lineup' ? 4 : 3.2;
    if (frustum.intersectsSphere(sphere)) out.push(p);
  }
  return out;
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
function zoomBy(f) {
  const before = view.size;
  view.size = Math.min(view.max, Math.max(view.min, view.size * f));
  const crossed = t => (before > t) !== (view.size > t);
  if (crossed(7.2) || crossed(5.5)) applyGrass(); else furDetail();
  placeCamera();
}
// the view stays over the village: its centre is kept inside the map (in the map's own across/up directions)
function clampView() {
  if (lineup) return;
  const t = view.target, by = -t.z;
  let u = (t.x + by) * R2, v = (by - t.x) * R2;
  u = Math.max(V.bounds.u[0] + 2, Math.min(V.bounds.u[1] - 2, u));
  v = Math.max(V.bounds.v[0] + 2, Math.min(V.bounds.v[1] - 1, v));
  t.x = (u - v) * R2; t.z = -(u + v) * R2;
}
function pan(dx, dy) {
  const upp = 2 * view.size / Math.max(1, canvas.clientHeight);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion); up.y = 0; up.normalize();
  view.target.addScaledVector(right, -dx * upp).addScaledVector(up, dy * upp / PITCH_SIN);
  clampView();
  placeCamera();
}

const tag = document.getElementById('tag');
let tagBird = null, tagLeft = 0;
function tapAt(x, y) {
  ndc.set(x / canvas.clientWidth * 2 - 1, -(y / canvas.clientHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  let best = null, bestD = Infinity;
  const s = new THREE.Sphere(), w = new THREE.Vector3();
  for (const p of livePlots()) for (const b of p.birds) {
    b.root.getWorldPosition(w);
    s.center.set(w.x, w.y + b.hitY, w.z); s.radius = b.hitR;
    const hit = ray.ray.intersectSphere(s, new THREE.Vector3());
    if (hit) { const d = hit.distanceTo(ray.ray.origin); if (d < bestD) { bestD = d; best = b; } }
  }
  if (!best) return;
  best.tapped(); tagBird = best; tagLeft = 2.8;
  tag.textContent = best.label;
  tag.classList.add('on');
}
function placeTag(dt) {
  if (!tagBird) return;
  tagLeft -= dt;
  if (tagLeft <= 0) { tag.classList.remove('on'); tagBird = null; return; }
  const v = new THREE.Vector3(); tagBird.root.getWorldPosition(v); v.y += tagBird.kind === 'chick' ? 0.3 : 0.55; v.project(camera);
  tag.style.transform = `translate(${(v.x + 1) / 2 * canvas.clientWidth}px, ${(1 - v.y) / 2 * canvas.clientHeight}px) translate(-50%, -100%)`;
}

const hintEl = document.getElementById('hint');
function hint(t) { hintEl.textContent = t; hintEl.classList.add('on'); setTimeout(() => hintEl.classList.remove('on'), 4500); }

// ------------------------------------------------------------------ the loop: 30 frames a second when idle, 60 while touched
let awakeUntil = 0, lastFrame = 0, lastSim = 0, frozen = false, paused = false;
function wake(ms) { awakeUntil = Math.max(awakeUntil, performance.now() + ms); }
const meter = { frames: 0, late: 0, since: 0, fps: 0, slow: 0 };
const readout = document.getElementById('readout');
let details = params.has('details');
readout.addEventListener('click', () => { details = !details; showReadout(); });

function frame(now) {
  requestAnimationFrame(frame);
  if (paused) return;
  const busy = now < awakeUntil || pointers.size > 0;
  if (!busy && now - lastFrame < 1000 / 30 - 3) return;              // idle: every other screen refresh is enough
  const dt = Math.min(0.1, (now - (lastSim || now)) / 1000); lastSim = now;
  if (!frozen) for (const p of livePlots()) { for (const b of p.birds) b.update(dt); if (p.kind === 'coop') separate(p.birds, dt); for (const b of p.birds) placeBlob(b); }
  placeTag(dt);
  renderer.render(scene, camera);
  const gap = now - lastFrame;
  // a frame counts as late below 25 a second (it used to be below 37 while touched, which lowered the quality on phones
  // that were still smooth)
  if (lastFrame && gap < 1000 && gap > 40) meter.late++;
  lastFrame = now;
  meter.frames++;
  if (!meter.since) meter.since = now;
  if (now - meter.since >= 2000) {
    meter.fps = meter.frames * 1000 / (now - meter.since);
    meter.slow = meter.late > meter.frames * 0.4 ? meter.slow + 1 : 0;      // two slow stretches in a row: step down
    meter.frames = 0; meter.late = 0; meter.since = now;
    if (meter.slow >= 2 && q < QUALITY.length - 1 && !params.has('q')) { stepDown(); meter.slow = 0; }
    // back up again once the view is clearly lighter than where it got slow (zoomed in), a few times at most
    else if (q > START_Q && !meter.slow && view.size < slowAt * 0.7 && stepUps < 4 && !params.has('q')) stepUp();
    showReadout();
  }
}

// a slow stretch steps the quality down (lower resolution, fewer shadows, less grass and fur); it used to stay down for the
// rest of the visit, so one heavy zoomed-out look left everything blurry afterwards
const START_Q = q;
let slowAt = Infinity, stepUps = 0;
function setQuality(n) {
  q = n;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY[q].dpr));
  applyGrass();
  aimShadows(true);
  resize();
}
function stepDown() { slowAt = view.size; setQuality(q + 1); }
function stepUp() { stepUps++; slowAt = q - 1 > START_Q ? slowAt * 0.7 : Infinity; setQuality(q - 1); }

function showReadout() {
  const fps = Math.round(meter.fps);
  const word = fps >= 26 ? 'Smooth' : fps >= 18 ? 'A bit slow' : 'Slow';
  const info = renderer.info.render;
  readout.textContent = details
    ? `${fps} fps · quality ${q + 1} of ${QUALITY.length} · ${renderer.getPixelRatio().toFixed(2)}× · ${Math.round(info.triangles / 1000)}k triangles · ${info.calls} draws · version ${VERSION}`
    : `${word} · ${fps} fps`;
  readout.classList.toggle('slow', fps < 18);
}

document.addEventListener('visibilitychange', () => { lastSim = 0; meter.since = 0; meter.frames = 0; });

window.__separate = (dt) => { for (const p of plots) if (p.birds.length) separate(p.birds, dt); };
window.__farm = {
  get birds() { return plots[0] ? plots[0].birds : []; }, allBirds, plots, view, renderer, scene, camera, quality: () => q, meter,
  setQuality: (n) => { while (q < n) stepDown(); },
  lookAt: (x, z, size) => { view.target.set(x, 0, z); if (size) view.size = size; clampView(); applyGrass(); placeCamera(); wake(500); },
  plan: () => V, THREE,
  act: (type, left) => { for (const b of allBirds) { b.act = { type, left: left || 2, leg: 0 }; b.wait = Math.max(b.wait, left || 2); } },
  hop: () => { for (const b of allBirds) b.tapped(); },
  freeze: (on) => { frozen = on; },
  pause: (on) => { paused = on; },                         // tests: stop drawing (the test browser draws slowly) and draw once on demand
  draw: () => { for (const p of plots) for (const b of p.birds) placeBlob(b); renderer.render(scene, camera); },
  step: (dt, n) => { for (let i = 0; i < n; i++) for (const p of plots) if (p.birds.length) { for (const b of p.birds) b.update(dt); if (p.kind === 'coop') separate(p.birds, dt); for (const b of p.birds) placeBlob(b); } wake(300); },
};
start().catch(err => {
  console.error(err);
  loading.querySelector('.msg').textContent = 'The village could not load. Check your connection and try again.';
});

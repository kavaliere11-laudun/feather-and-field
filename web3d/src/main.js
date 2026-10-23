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
import { BREEDS, SILKIE, BREED_NAMES, initFlock, Rig, setFar, setFurDetail, setHairTexture, setSoftFur, setMaterialHook } from './birds.js';
import { FarmDog, nameBoard, KENNEL } from './dog.js';
import { initBeasts, DogLineup, FoxFamily, FoxLineup } from './beasts.js';
import { initGeese, GeeseLineup, GeeseFlock } from './geese.js';
import { NavGrid, NightVisit } from './nightvisit.js';

const MODELS = './models/';
// each published version asks for its own copies of the models (?v=...), so a phone never mixes an old model kept from an
// earlier visit with new code
const BUST = typeof __BUST__ !== 'undefined' ? '?v=' + __BUST__ : '';
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
  DAY.shadowDir.copy(SUN_DIR);                              // (only ever called once the page has loaded)
  const s = sun.shadow;
  s.mapSize.set(QUALITY[q].shadow, QUALITY[q].shadow);
  s.camera.left = -reach; s.camera.right = reach; s.camera.top = reach; s.camera.bottom = -reach; s.camera.near = 5; s.camera.far = 80;
  s.bias = -0.0005; s.normalBias = 0.03; s.radius = 3;
  s.camera.updateProjectionMatrix();
  if (s.map && s.map.width !== QUALITY[q].shadow) { s.map.dispose(); s.map = null; }
  sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  renderer.shadowMap.needsUpdate = true;
}

// ------------------------------------------------------------------ day and night: the player's own clock, as in the game
// (day 7:00-18:00, dusk 18:00-21:00, night 21:00-7:00): a warm orange from about 17:30, deep blue from about 20:30, brightening
// again between 6:00 and 7:30. The sun rises on one side and sets on the other, low and long-shadowed; at night the moon
// gives a soft blue light, and the lamps, lanterns and the farmhouse's windows light up with warm pools on the ground.
// Midday is the look we had all along. ?time=21:30 fixes the hour (to see the night by day), ?daylapse=3 runs a whole day in
// 3 minutes, from ?time if given.
// Each key: hour, sun colour, sun strength, sun height and turn (degrees; turn 0 is the midday direction), sky light,
// ground light, their strength, the colour round the village, how lit the lamps are.
const DAY_KEYS = [
  [0, '#8ea6ff', 1.6, 50, 15, '#31457f', '#151d20', 1.5, '#1c2b40', 1],
  [5.4, '#8ea6ff', 1.6, 50, 35, '#31457f', '#151d20', 1.5, '#1c2b40', 1],
  [6.3, '#ff9a72', 1.3, 3, -72, '#6e74ad', '#2b2f2c', 1.4, '#3a4a45', 0.8],
  [6.9, '#ffc49a', 3.2, 11, -64, '#a3a8c9', '#4a4b34', 2.0, '#6d8a4c', 0.25],
  [7.5, '#ffe9cf', 4.6, 22, -52, '#a8bcd8', '#5a6943', 2.45, '#86b159', 0],
  [12.5, '#fff1dc', 5.2, 46, 0, '#a3bddb', '#5c6b45', 2.6, '#8cb85c', 0],
  [17.2, '#fff1dc', 5.0, 30, 46, '#a3bddb', '#5c6b45', 2.55, '#8cb85c', 0],
  [18.2, '#ffd8aa', 4.5, 19, 56, '#bcbfcc', '#5e6343', 2.4, '#8aad57', 0],
  [19.2, '#ffb47c', 3.2, 9, 64, '#b9a6ac', '#56513c', 2.0, '#7a8e50', 0.15],
  [20.2, '#ff8a5e', 1.4, 2, 70, '#6c6596', '#2c2a2a', 1.85, '#3e4a40', 0.7],
  [21.0, '#8ea6ff', 1.5, 40, -10, '#384a84', '#181f22', 1.5, '#203046', 1],
  [24, '#8ea6ff', 1.6, 50, 15, '#31457f', '#151d20', 1.5, '#1c2b40', 1],
].map(k => [k[0], new THREE.Color(k[1]), k[2], k[3], k[4], new THREE.Color(k[5]), new THREE.Color(k[6]), k[7], new THREE.Color(k[8]), k[9]]);
const DAY = { hour: 12, glow: { value: 0 }, warm: { value: new THREE.Color('#ffc46e') }, shadowDir: SUN_DIR.clone(), shadowAt: 0 };
const NOON_FROM = new THREE.Vector3(-SUN_DIR.x, 0, -SUN_DIR.z).normalize();                // where the midday sun is, seen from above
const dayStart = (() => {                      // ?time=HH:MM and ?daylapse=minutes for a whole day
  const t = /^(\d{1,2})(?::(\d{2}))?$/.exec(params.get('time') || (params.has('visit') ? '23:30' : '')), lapse = parseFloat(params.get('daylapse') || '0');
  // automated tests (a browser driven by a script) see midday unless they ask for a time, so they don't depend on the clock
  const fixed = t ? Math.min(24, +t[1] + (+t[2] || 0) / 60) : navigator.webdriver ? 12.5 : null;
  return { fixed, lapse: lapse > 0 ? lapse : 0, at: performance.now() };
})();
function clockHour() {
  if (DAY.override !== undefined) return DAY.override;
  if (dayStart.lapse) {
    const from = dayStart.fixed ?? 6;
    return (from + (performance.now() - dayStart.at) / 60000 / dayStart.lapse * 24) % 24;
  }
  if (dayStart.fixed !== null) return dayStart.fixed;
  const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
const _c = new THREE.Color(), _dir = new THREE.Vector3();
function applyDaylight(h) {
  DAY.hour = h;
  let i = 0; while (i < DAY_KEYS.length - 2 && h >= DAY_KEYS[i + 1][0]) i++;
  const A = DAY_KEYS[i], B = DAY_KEYS[i + 1], t = Math.min(1, Math.max(0, (h - A[0]) / (B[0] - A[0]))), u = t * t * (3 - 2 * t);
  const mix = (k) => A[k] + (B[k] - A[k]) * u;
  sun.color.copy(A[1]).lerp(B[1], u); sun.intensity = mix(2);
  hemi.color.copy(A[5]).lerp(B[5], u); hemi.groundColor.copy(A[6]).lerp(B[6], u); hemi.intensity = mix(7);
  scene.background.copy(A[8]).lerp(B[8], u);
  DAY.glow.value = mix(9); lampPools.update();
  GRADE.value = DAY.glow.value * (inside.open ? 0.22 : 0.6);          // inside, by the lantern, colours keep more of themselves
  // where the light comes from: its height and how far round from midday
  const el = mix(3) * DEG, turn = mix(4) * DEG;
  _dir.copy(NOON_FROM).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn).multiplyScalar(Math.cos(el)); _dir.y = Math.sin(el);
  SUN_DIR.copy(_dir).negate().normalize();
  // the shadows are drawn again when the light has moved a little (not every frame: they're the costly part)
  const now = performance.now();
  if (SUN_DIR.angleTo(DAY.shadowDir) > 0.6 * DEG && now - DAY.shadowAt > 400) { DAY.shadowDir.copy(SUN_DIR); DAY.shadowAt = now; aimShadows(true); }
  else if (shadowAt) { sun.position.copy(sun.target.position).addScaledVector(DAY.shadowDir, -40); }
}
// lamps, lanterns and lit windows: their own materials (glow, window) gain a warm light of their own as night falls
function lightUp(mat) {
  if (mat.userData.lit || (mat.name !== 'glow' && mat.name !== 'window')) return;
  const lamp = mat.name === 'glow';
  mat.userData.lit = true;
  mat.onBeforeCompile = sh => {
    sh.uniforms.dayGlow = DAY.glow; sh.uniforms.dayWarm = DAY.warm;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float dayGlow;\nuniform vec3 dayWarm;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (lamp
        ? '#ifdef USE_COLOR\ntotalEmissiveRadiance += mix(vColor.rgb, dayWarm, 0.35) * dayGlow * 2.4;\n#else\ntotalEmissiveRadiance += dayWarm * dayGlow * 2.4;\n#endif'
        : 'totalEmissiveRadiance += dayWarm * dayGlow * 1.25;'));
  };
  mat.customProgramCacheKey = () => 'lit-' + mat.name;
  mat.needsUpdate = true;
}
// night colours: by moonlight the eye sees little colour, so as night falls every material greys towards a moonlit blue
// (the lamps and lit windows keep their warm colour). One line added to each material's shader, after its own changes.
const NIGHT_TINT = { value: new THREE.Vector3(0.78, 0.92, 1.32) }, GRADE = { value: 0 };     // how far (0-1)
function nightGrade(mat) {
  if (!mat || mat.userData.graded || mat.userData.noGrade || mat.name === 'glow' || mat.name === 'window') return;
  mat.userData.graded = true;
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(mat, sh, r);
    sh.uniforms.dayNight = GRADE; sh.uniforms.nightTint = NIGHT_TINT;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float dayNight;\nuniform vec3 nightTint;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n{ float nl = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor.rgb = mix(gl_FragColor.rgb, nl * nightTint, dayNight); }');
  };
  if (prevKey && prevKey !== THREE.Material.prototype.customProgramCacheKey) mat.customProgramCacheKey = () => prevKey.call(mat) + '+night';
  mat.needsUpdate = true;
}
function gradeScene() { scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) nightGrade(m); }); }

// warm pools of light on the ground under the lamps and lanterns (soft discs, added on top, only at night)
const lampPools = {
  spots: [], mesh: null,
  add(x, z, r) { this.spots.push([x, z, r]); },
  build() {
    if (!this.spots.length) return;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const cx = cv.getContext('2d'), gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: '#ffb25a', transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    mat.userData.noGrade = true;
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mat, this.spots.length);
    this.spots.forEach(([x, z, r], i) => this.mesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, 0.012, z), new THREE.Quaternion(), new THREE.Vector3(r, 1, r))));
    this.mesh.computeBoundingSphere(); this.mesh.renderOrder = 2; this.mesh.visible = false;
    still(this.mesh);
  },
  update() { if (!this.mesh) return; const g = DAY.glow.value; this.mesh.material.opacity = 0.42 * g; this.mesh.visible = g > 0.01; },
};

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  placeCamera();
  furDetail();
  if (inside.open) insideFrameCamera();
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
  return new Promise((resolve, reject) => new GLTFLoader().load(MODELS + name + BUST, resolve,
    e => { progress[name] = [e.loaded, e.total || 1]; showProgress(); }, reject));
}
function loadJSON(name) { return fetch(MODELS + name + BUST).then(r => { if (!r.ok) throw new Error(name); return r.json(); }); }
function loadImage(name) {
  return new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = MODELS + name + BUST; });
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
  const [farm, flock, village, plan, pen, meadow, flockInfo, coopsGlb, coopsInfo, , insideGlb, insideInfo, beastsGlb, beastsInfo, faunaGlb, geeseGlb, geeseInfo] = await Promise.all([loadGLB('plants.glb'), loadGLB('flock.glb'),
    loadGLB('village.glb'), loadJSON('village.json'), loadJSON('layout.json'), loadImage('meadow.jpg'), loadJSON('flock.json'), loadGLB('coops.glb'),
    loadJSON('coops.json'), new THREE.TextureLoader().loadAsync(MODELS + 'silkie_hair.jpg' + BUST).then(setHairTexture), loadGLB('interiors.glb'), loadJSON('interiors.json'),
    loadGLB('beasts.glb'), loadJSON('beasts.json'), loadGLB('fauna.glb'), loadGLB('geese.glb'), loadJSON('geese.json')]);
  V = plan; PEN = pen; COOPS = coopsInfo;
  inside.rooms = Object.fromEntries(Object.entries(insideInfo.rooms).map(([k, v]) => [k.replace('inside_', ''), v]));
  // the straw nest in the yard has moved into the coop's nest box: its spot is free again
  PEN.obstacles = PEN.obstacles.filter(o => Math.hypot(o[0] - PEN.nest[0], o[2] - PEN.nest[2]) > 1e-3);
  initFlock(flock, flockInfo); initBeasts(beastsGlb, beastsInfo); initGeese(geeseGlb, geeseInfo);
  for (const g of [farm, village, coopsGlb, insideGlb, faunaGlb]) {
    for (const child of [...g.scene.children]) {
      child.updateMatrixWorld(true);
      for (const m of meshesOf(child)) {
        richer(m.geometry, g === village ? 1.22 : SAT, g === village ? 1.08 : 1);
        if (m.material) { m.material.vertexColors = true; m.material.needsUpdate = true; lightUp(m.material); }
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
  if (params.has('lineup') && !['foxes', 'geese', 'dog'].includes(params.get('lineup'))) buildLineup();
  if (params.get('lineup') === 'geese') geeseLineup = new GeeseLineup(scene, villageCentre().add(new THREE.Vector3(32, 0, 32)), 45 * DEG, rng(41));
  buildFoxes(beastsInfo.joints);
  buildGeese();
  buildDog(beastsInfo.joints);
  if (allBirds.length) makeBlobs();
  buildGrass();
  addLampPools();
  gradeScene(); setMaterialHook(nightGrade);           // the night colours, also for materials made later (a laying hen's own)
  for (const k in parts) if (k.startsWith('inside_')) parts[k].traverse(o => { if (o.material) for (const m of [].concat(o.material)) nightGrade(m); });
  applyDaylight(clockHour());
  const s = V.plots[0].pos;
  view.target.set(s[0], 0, s[2]).add(new THREE.Vector3(0.6, 0, -1.2));
  view.size = 4.4;
  if (lineup) { view.target.copy(lineup.centre); view.size = 2.2; }
  if (foxLineup) { foxLineup.group.updateMatrixWorld(true); view.target.copy(foxLineup.group.localToWorld(new THREE.Vector3(0, 0, -0.1))); view.size = 2.35; }
  if (geeseLineup) { geeseLineup.group.updateMatrixWorld(true); view.target.copy(geeseLineup.group.localToWorld(new THREE.Vector3(0, 0, -1.6))); view.size = 1.6; }
  if (geeseFlock && params.has('geese')) { const c = geeseFlock.centre(new THREE.Vector3()); view.target.set(c.x + 0.3, 0, c.z + 0.3); view.size = 2.6; }
  if (farmDog && params.has('dog')) { const c = farmDog.centre(new THREE.Vector3()); view.target.set(c.x + 0.3, 0, c.z + 0.3); view.size = 2.4; }
  resize();
  aimShadows(true);
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 600);
  hint('Drag to look round the village, pinch or scroll to zoom, tap a bird.');
  requestAnimationFrame(frame);
}

// where the night's pools of lamplight go: under each lamp post round the green, and each coop's lanterns (the lodge's post,
// the pagoda's paper lantern, a Deluxe arch's pair)
function addLampPools() {
  const v = new THREE.Vector3();
  for (const p of V.props) if (p.model === 'lamp_post') {
    v.set(0.24, 0, 0).applyMatrix4(place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1));
    lampPools.add(v.x, v.z, 1.25 * (p.s || 1));
  }
  for (const pl of plots) {
    if (pl.kind !== 'coop') continue;
    const L = [...(COOPS.lights['house_' + pl.breed] || []), ...(pl.deluxe ? COOPS.lights.fence_dx || [] : [])];
    for (const l of L) { v.set(l[0], 0, l[2]); pl.frame.localToWorld(v); lampPools.add(v.x, v.z, 0.75); }
  }
  lampPools.build();
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
// wind: plants bend with their height above the ground (squared, so stems stay rooted and tops move most), in gusts that roll
// across the village, with a quicker flutter on top. One clock for everything (WIND.time)
const WIND = { time: { value: 0 } };
function addWind(mat, amp) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.windTime = WIND.time; sh.uniforms.windAmp = { value: amp };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float windTime;\nuniform float windAmp;')
      .replace('#include <project_vertex>', `
        vec4 wBase = vec4(0.0, 0.0, 0.0, 1.0), wPos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        wBase = instanceMatrix * wBase; wPos = instanceMatrix * wPos;
        #endif
        wBase = modelMatrix * wBase; wPos = modelMatrix * wPos;
        float wH = max(wPos.y, 0.0);
        // gusts: waves 3.5 m long rolling with the wind at about 1 m a second, now stronger, now calmer
        float gust = (0.5 + 0.5 * sin(windTime * 1.6 - (wBase.x * 0.8 + wBase.z * 0.6) * 1.8)) * (0.65 + 0.35 * sin(windTime * 0.31 + wBase.x * 0.02));
        float flutter = sin(windTime * 4.3 + wBase.x * 1.9 - wBase.z * 1.3 + wH * 2.0);
        wPos.xz += vec2(0.8, 0.6) * windAmp * wH * wH * (gust + 0.22 * flutter);
        vec4 mvPosition = viewMatrix * wPos;
        gl_Position = projectionMatrix * mvPosition;`);
  };
  mat.customProgramCacheKey = () => 'wind' + amp;
  mat.needsUpdate = true;
  return mat;
}
function batchOne(name, matrices, opts) {
  const out = [];
  if (!matrices.length) return out;
  for (const m of meshesOf(parts[name])) {
    let mat = opts.lambert ? new THREE.MeshLambertMaterial({ vertexColors: true, side: opts.twoSided ? THREE.DoubleSide : THREE.FrontSide }) : m.material;
    if (opts.wind) mat = addWind(opts.lambert ? mat : mat.clone(), opts.wind);      // its own copy: other models may share the material
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

// the wheat field in the game's four stages (as in the 2D game): bare ploughed soil, the first green shoots (a fifth of the
// plants, short, the furrows still showing), growing tall and green, and ripe: golden stalks with ears. Everything sways
// in the wind. ?wheat=soil|sprouts|growing|ripe picks one; tapping the field shows the next (in the test page)
const WHEAT_STAGES = ['soil', 'sprouts', 'growing', 'ripe'];
const WHEAT_NAMES = { soil: 'Ploughed, ready to sow', sprouts: 'The first green shoots', growing: 'Growing tall and green', ripe: 'Golden and ready' };
const wheatField = { stage: WHEAT_STAGES.includes(params.get('wheat')) ? params.get('wheat') : 'ripe', parts: {}, inverse: null, half: [0, 0] };
function wheat(fieldMatrix, w, d) {
  const r = rng(31), spots = [];
  for (let x = -w / 2 + 0.12; x < w / 2 - 0.1; x += 0.15)
    for (let y = -d / 2 + 0.12; y < d / 2 - 0.1; y += 0.15)
      spots.push({ x: x + (r() - 0.5) * 0.06, z: y + (r() - 0.5) * 0.06, h: 0.85 + r() * 0.3, turn: r() * 6.28, keep: r(), shade: 0.86 + r() * 0.22, ears: [0, 1].map(() => [r() * 6.28, r() - 0.5, r() - 0.5]) });
  const Y = new THREE.Vector3(0, 1, 0), stalkGeo = meshesOf(parts.grass_tuft_1)[0].geometry;
  const at = (m) => new THREE.Matrix4().multiplyMatrices(fieldMatrix, m);
  function stalks(list, height, width, colour) {
    const mesh = new THREE.InstancedMesh(stalkGeo, addWind(new THREE.MeshLambertMaterial({ color: colour, side: THREE.DoubleSide }), 0.3), list.length);
    const c = new THREE.Color();
    list.forEach((s, i) => {
      mesh.setMatrixAt(i, at(new THREE.Matrix4().compose(new THREE.Vector3(s.x, 0.02, s.z), new THREE.Quaternion().setFromAxisAngle(Y, s.turn), new THREE.Vector3(width, 7 * s.h * height, width))));
      mesh.setColorAt(i, c.setScalar(s.shade));
    });
    return mesh;
  }
  // ploughed furrows along the field (bare and sprouting)
  const ridgeGeo = new THREE.CapsuleGeometry(0.07, w - 0.45, 3, 8).rotateZ(Math.PI / 2).scale(1, 0.45, 1);
  const ridges = new THREE.InstancedMesh(ridgeGeo, new THREE.MeshLambertMaterial({ color: '#6e4b2c' }), 8);
  for (let i = 0; i < 8; i++) ridges.setMatrixAt(i, at(new THREE.Matrix4().makeTranslation(0, 0.05, -1.05 + i * 0.3)));
  // ripe ears, two on each stalk
  const ears = [];
  for (const s of spots) for (const [a, ex, ez] of s.ears)
    ears.push(at(new THREE.Matrix4().compose(new THREE.Vector3(s.x + Math.cos(a) * 0.035, 0.02 + 0.36 * s.h, s.z + Math.sin(a) * 0.035),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(ex * 0.5, 0, ez * 0.5)), new THREE.Vector3(1, 1, 1))));
  const ea = new THREE.InstancedMesh(new THREE.ConeGeometry(0.016, 0.09, 4, 1), addWind(new THREE.MeshLambertMaterial({ color: '#e7bf55' }), 0.3), ears.length);
  ears.forEach((m, i) => ea.setMatrixAt(i, m));
  const P = wheatField.parts;
  P.soil = [ridges];
  P.sprouts = [ridges, stalks(spots.filter(s => s.keep < 0.4), 0.3, 2.0, '#86c24a')];
  P.growing = [stalks(spots, 0.55, 2.2, '#5f9c36')];
  P.ripe = [stalks(spots, 1, 2.4, '#d9b24e'), ea];
  for (const list of Object.values(P)) for (const o of list) if (!o.parent) { o.computeBoundingSphere(); o.receiveShadow = true; still(o, o !== ridges && o !== ea, true); }
  wheatField.inverse = fieldMatrix.clone().invert(); wheatField.half = [w / 2, d / 2];
  wheatField.centre = new THREE.Vector3().setFromMatrixPosition(fieldMatrix).add(new THREE.Vector3(0, 0.8, 0));
  setWheat(wheatField.stage);
}
function setWheat(stage) {
  wheatField.stage = stage;
  for (const o of new Set(Object.values(wheatField.parts).flat())) o.visible = wheatField.parts[stage].includes(o);
  aimShadows(true);
}

function buildNature() {
  const r = rng(21);
  // trees: three kinds of shady tree for the woods and the green, apple trees in the orchard
  const kinds = { a: [], b: [], c: [], apple: [] };
  V.trees.forEach((t, i) => {
    const m = place(t.pos[0], 0, t.pos[2], r() * 360, t.h / 2.1);
    if (t.kind === 'apple') kinds.apple.push(m); else kinds['abc'[i % 3]].push(m);
  });
  batch('tree_a', kinds.a, { cast: true, wind: 0.006 }); batch('tree_b', kinds.b, { cast: true, wind: 0.006 }); batch('tree_c', kinds.c, { cast: true, wind: 0.006 });
  batch('tree_apple', kinds.apple, { cast: true, wind: 0.007 });
  // bushes and rocks
  const ba = [], bb = [];
  V.bushes.forEach((b, i) => (i % 2 ? bb : ba).push(place(b.pos[0], 0, b.pos[2], b.rot, b.s * 1.1)));
  batch('bush_a', ba, { cast: true, wind: 0.05 }); batch('bush_b', bb, { cast: true, wind: 0.05 });
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
  for (const n of names) batch(n, fl[n], { lambert: true, twoSided: true, wind: 1.2 });
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
      for (const inst of batch('grass_tuft_' + k, list, { lambert: true, tile: 0, twoSided: true, wind: 1.2 })) grassTiles.push({ mesh: inst, full: inst.count });
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
      plot.frame = frame;
      plot.breed = BREEDS[i % BREEDS.length]; plot.deluxe = Math.floor(i / BREEDS.length) % 2 === 1;
      addNest(frame, plot);
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
      plot.birds.filter(b => b.kind === 'hen').forEach((h, k) => { h.pers = PERS_IDS[(i * 2 + k) % PERS_IDS.length]; h.layIn = 6 + r() * 70; });
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
  buildDoors();
}

// the hens lay inside their coop, on a straw nest seen through a little window on the front (stylized/coops.py nest_window;
// coops.json nests, per house: floor height, window [x, bottom, top, width], seat, inside (where she comes in from, behind
// the wall), pop (the pop door's threshold), foot (the bottom of the ramp)). Egg slots round the seat.
// where the eggs lie, from her seat: under her breast, towards the window (further in, the window's top would hide them)
const NEST_SLOTS = [[0, 0.08], [0.06, 0.06], [-0.06, 0.07], [0.045, 0.12], [-0.045, 0.12], [0.0, 0.03]];
const nestOf = plot => COOPS.nests['house_' + plot.breed];
const EGG_COLOUR = { rir: '#b97a4f', orp: '#dcae7f', leg: '#a9d4ca', bra: '#d9b48c', sil: '#efe4cf' };
const EGG_MATS = {}, EGG_GEO = new THREE.SphereGeometry(0.5, 10, 8);
const GRAIN = new THREE.MeshLambertMaterial({ color: '#d9b45a' }), GRAIN_GEO = new THREE.CylinderGeometry(0.135, 0.135, 0.02, 20);
function addNest(frame, plot) {
  const m = EGG_MATS[plot.breed] || (EGG_MATS[plot.breed] = new THREE.MeshStandardMaterial({ color: EGG_COLOUR[plot.breed], roughness: 0.45 }));
  const eggs = new THREE.InstancedMesh(EGG_GEO, m, NEST_SLOTS.length);
  eggs.userData.moves = true; eggs.receiveShadow = true; eggs.castShadow = false;
  frame.add(eggs);
  plot.nest = { eggs, count: 0, pop: 1, by: null };
  plot.block = (nestOf(plot) || {}).block || [];         // things in front of the house to walk round (a let-down door, a pot...)
  plot.nest.count = 2;                                   // a couple already laid this morning
  showEggs(plot);
  const grain = new THREE.Mesh(GRAIN_GEO, GRAIN); grain.position.set(PEN.feeder[0], 0.065, PEN.feeder[2]);
  grain.receiveShadow = true;
  frame.add(grain);
}
const eggM = new THREE.Matrix4(), eggQ = new THREE.Quaternion(), eggE = new THREE.Euler(), eggP = new THREE.Vector3(), eggS = new THREE.Vector3();
function showEggs(plot) {
  const n = plot.nest, k = Math.min(n.count, NEST_SLOTS.length), G = nestOf(plot);
  for (let i = 0; i < k; i++) {
    const [dx, dz] = NEST_SLOTS[i], s = i === k - 1 ? n.pop : 1;       // the newest egg pops in
    eggP.set(G.seat[0] + dx, (G.bed ?? G.floor + 0.05) + 0.004 + 0.012 * s, G.seat[1] + dz);      // nestled in the straw
    eggQ.setFromEuler(eggE.set(1.2 + 0.3 * Math.sin(i * 3.1), i * 1.7, 0.2 * Math.cos(i * 2.3)));
    n.eggs.setMatrixAt(i, eggM.compose(eggP, eggQ, eggS.set(0.05 * s, 0.064 * s, 0.05 * s)));
  }
  n.eggs.count = k; n.eggs.instanceMatrix.needsUpdate = true; n.eggs.computeBoundingSphere();
}

// a hen's song after laying: notes rising over her head, one for each "buk" and a big one for the "ba-KAWK"
const NOTES = [];
let noteMat = null;
function spawnNote(bird, big, loud) {
  if (!noteMat) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const draw = (col, w) => {          // a quaver: an oval head, a stem and a flag
      c.save(); c.translate(24, 44); c.rotate(-0.35); c.beginPath(); c.ellipse(0, 0, 11, 8, 0, 0, Math.PI * 2); c.restore();
      c.moveTo(33, 41); c.lineTo(33, 10); c.quadraticCurveTo(46, 18, 48, 30);
      c.lineWidth = w; c.strokeStyle = col; c.fillStyle = col;
    };
    draw('#2b3a24', 9); c.stroke(); c.fill();
    c.beginPath(); draw('#fffaf0', 4); c.stroke(); c.fill();
    noteMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false });
  }
  let n = NOTES.find(x => x.life <= 0);
  if (!n) { if (NOTES.length > 40) return; const sm = noteMat.clone(); nightGrade(sm); n = { sprite: new THREE.Sprite(sm), life: 0 }; n.sprite.renderOrder = 3; scene.add(n.sprite); NOTES.push(n); }
  const p = bird.root.getWorldPosition(new THREE.Vector3()), up = bird.rig.scale * 0.95;
  n.sprite.position.set(p.x + (Math.random() - 0.5) * 0.08, p.y + up, p.z + (Math.random() - 0.5) * 0.08);
  n.size = (big ? 0.17 : 0.115) * (0.75 + 0.25 * loud); n.life = n.full = big ? 1.4 : 1.0;
  n.drift = [(Math.random() - 0.5) * 0.12, 0.2 + 0.1 * Math.random(), (Math.random() - 0.5) * 0.12];
  n.sprite.visible = true;
}
function tickNotes(dt) {
  for (const n of NOTES) {
    if (n.life <= 0) continue;
    n.life -= dt;
    if (n.life <= 0) { n.sprite.visible = false; continue; }
    const t = 1 - n.life / n.full;
    n.sprite.position.x += n.drift[0] * dt; n.sprite.position.y += n.drift[1] * dt; n.sprite.position.z += n.drift[2] * dt;
    const s = n.size * Math.min(1, t * 5); n.sprite.scale.set(s, s, s);
    n.sprite.material.opacity = Math.min(1, (1 - t) * 3);
  }
}

// ------------------------------------------------------------------ the fox family: a den at the edge of the woods, a meadow to play in
// (beasts.js). Now and then by day (every 10-20 minutes, for 5-7 minutes) Rusty, Fennel and their three cubs come out of the
// den to play; ?foxes brings them out at once and keeps them out. The "Foxes" button at the top takes the view there.
const FOX_FIELD = [-8.0, -33.0, 2.5], FOX_DEN = [-7.49, -35.94, Math.atan2(-0.17, 0.985)];    // a clear meadow; the den, at the edge of the wood, faces it
let foxes = null, foxLineup = null, geeseLineup = null, geeseFlock = null;
const foxBtn = document.getElementById('foxbtn');
const foxGroups = () => [foxes, foxLineup].filter(g => g && (g.visible() || (nightVisit && g === foxes && nightVisit.active())));
function buildFoxes(joints) {
  if (params.get('lineup') === 'foxes') foxLineup = new FoxLineup(scene, villageCentre().add(new THREE.Vector3(32, 0, 32)), 45 * DEG, joints, rng(31));
  if (params.get('lineup') === 'dog') foxLineup = new DogLineup(scene, villageCentre().add(new THREE.Vector3(32, 0, 32)), 45 * DEG, joints, rng(33), dogName);
  // round the meadow: the bushes and tree trunks they walk round
  const obstacles = [];
  for (const b of V.bushes) if (Math.hypot(b.pos[0] - FOX_FIELD[0], b.pos[2] - FOX_FIELD[1]) < 7) obstacles.push([b.pos[0], b.pos[2], 0.5 * (b.s || 1)]);
  for (const t of V.trees) if (Math.hypot(t.pos[0] - FOX_FIELD[0], t.pos[2] - FOX_FIELD[1]) < 8) obstacles.push([t.pos[0], t.pos[2], 0.3]);
  if (parts.den) {
    const den = part('den'); den.position.set(FOX_DEN[0], 0, FOX_DEN[1]); den.rotation.y = FOX_DEN[2] - Math.PI / 2;
    still(den, true, true);
    V.tufts = V.tufts.filter(t => Math.hypot(t[0] - FOX_DEN[0], t[2] - FOX_DEN[1]) > 1.3);     // no grass growing through it
  }
  foxes = new FoxFamily(scene, { den: FOX_DEN, field: FOX_FIELD, joints, obstacles, firstIn: params.has('foxes') ? 0.3 : 15 }, rng(23));
  buildNightVisit();
  if (foxBtn) foxBtn.addEventListener('click', () => { const c = nightVisit && nightVisit.active() ? nightVisit.fox.pos.clone().sub(new THREE.Vector3(0.3, 0, 0.3)) : foxes.centre(new THREE.Vector3()); view.target.set(c.x, 0, c.z).add(new THREE.Vector3(0.3, 0, 0.3)); view.size = 2.8; clampView(); applyGrass(); placeCamera(); wake(800); });
}
let foxHinted = false;

// ------------------------------------------------------------------ the farm dog's name: Biscuit, unless the player chooses another.
// Checked as the game checks every name (no control characters or < >, spaces tidied, at most 20 letters), kept in this
// browser only, and always shown as plain text. Tap the dog, then "Rename Biscuit".
const DOG_KEY = 'ff3d.dogName', DOG_DEFAULT = 'Biscuit';
function cleanName(s, fallback) {
  const v = Array.from(String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f<>]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 20).join('').trim();
  return v || fallback;
}
function loadDogName() { try { return cleanName(localStorage.getItem(DOG_KEY), DOG_DEFAULT); } catch (e) { return DOG_DEFAULT; } }
let dogName = loadDogName();
const DOG_TEXT = { rename: ['Rename {n}', 'Renommer {n}'], label: ["Your dog's name", 'Le nom de votre chien'], save: ['Save', 'Enregistrer'], cancel: ['Cancel', 'Annuler'],
  named: ['Your dog is called {n}', 'Votre chien s’appelle {n}'] };
const dogT = (k, n) => DOG_TEXT[k][LANG === 'fr' ? 1 : 0].replace('{n}', n || '');
const dogEls = { btn: document.getElementById('dogbtn'), form: document.getElementById('dogname'), input: document.getElementById('dogname-in'),
  label: document.getElementById('dogname-label'), save: document.getElementById('dogname-save'), cancel: document.getElementById('dogname-cancel') };
let dogBtnLeft = 0;
const dogs = () => [...foxGroups(), ...(farmDog ? [farmDog] : [])].flatMap(g => g.foxes.filter(f => f.role === 'dog'));
function setDogName(n) {
  dogName = cleanName(n, DOG_DEFAULT);
  try { if (dogName === DOG_DEFAULT) localStorage.removeItem(DOG_KEY); else localStorage.setItem(DOG_KEY, dogName); } catch (e) { /* (private browsing: just for now) */ }
  for (const G of [foxes, foxLineup, farmDog]) if (G) for (const f of G.foxes) if (f.role === 'dog') f.rename(dogName);
  if (kennelBoard) kennelBoard.draw(dogName);
}
function dogTapped() {                       // after tapping him: a button to rename him, for a few seconds
  if (!dogEls.btn || !dogEls.form.hidden || (farmerBtn && !farmerBtn.hidden)) return;
  dogEls.btn.textContent = dogT('rename', dogName); dogEls.btn.hidden = false; dogBtnLeft = 6;
}
function tickDogBtn(dt) { if (dogBtnLeft > 0 && (dogBtnLeft -= dt) <= 0 && dogEls.btn) dogEls.btn.hidden = true; }
function openDogName() {
  dogEls.btn.hidden = true; dogBtnLeft = 0;
  dogEls.label.textContent = dogT('label'); dogEls.save.textContent = dogT('save'); dogEls.cancel.textContent = dogT('cancel');
  dogEls.input.value = dogName; dogEls.input.placeholder = DOG_DEFAULT; dogEls.form.hidden = false;
  tag.classList.remove('on'); tagBird = null; fieldTag = 0;                    // (his label off, out of the card's way)
  dogEls.input.focus(); dogEls.input.select();
}
function closeDogName() { dogEls.form.hidden = true; dogEls.input.blur(); }
if (dogEls.btn) {
  dogEls.btn.addEventListener('click', openDogName);
  dogEls.cancel.addEventListener('click', closeDogName);
  dogEls.form.addEventListener('submit', e => {
    e.preventDefault(); setDogName(dogEls.input.value); closeDogName();
    const d = dogs()[0]; tag.textContent = dogT('named', dogName);
    if (d) { tagBird = d; tagLeft = 3.2; } else { tagBird = null; fieldTag = 0; }
    tag.classList.add('on'); wake(800);
  });
}

// ------------------------------------------------------------------ the geese (geese.js): Gertrude and Hector live round the pond in
// the middle of the village. ?geese starts the view on them.
function buildGeese() {
  if (params.get('lineup')) return;                  // (not on the line-up pages)
  const avoid = [];
  if (parts.dock) {                                  // the dock out over the water: circles along it to swim round
    const box = new THREE.Box3().setFromObject(parts.dock);
    for (const p of V.props) if (p.model === 'dock') {
      const m = place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1), long = box.max.x - box.min.x > box.max.z - box.min.z, half = (long ? box.max.z - box.min.z : box.max.x - box.min.x) / 2;
      for (let k = 0; k <= 4; k++) {
        const u = k / 4, c = long ? new THREE.Vector3(box.min.x + (box.max.x - box.min.x) * u, 0, (box.min.z + box.max.z) / 2) : new THREE.Vector3((box.min.x + box.max.x) / 2, 0, box.min.z + (box.max.z - box.min.z) * u);
        c.applyMatrix4(m); avoid.push([c.x, c.z, half + 0.3]);
      }
    }
  }
  const P = V.pond, mouths = [];
  for (const st of V.streams) for (const e of [st[0], st[st.length - 1]]) if (Math.hypot(e[0] - P.center[0], e[2] - P.center[2]) < 8) mouths.push([e[0], e[2]]);
  geeseFlock = new GeeseFlock(scene, { pond: P, nav: navGrid(), avoid, mouths, groundY, watch: () => params.has('noguard') ? null : nightVisit, dog: () => farmDog ? farmDog.dog : null }, rng(57));      // (?noguard: they sleep through it, for the fox's own tests)
  geeseFlock.update(1 / 60, clockHour());
}

// ------------------------------------------------------------------ Biscuit the farm dog (dog.js): his kennel by the farmhouse, left of the
// path in front of it, its door turned to the path; his day on the farm. ?dog starts the view on him.
const KENNEL_AT = [-24.47, -21.64, 1.249];        // x, z, the way its door faces
let farmDog = null, kennelBoard = null, dogSpots = null;
function buildDog(joints) {
  if (parts.kennel) {
    const k = part('kennel'); k.position.set(KENNEL_AT[0], 0, KENNEL_AT[1]); k.rotation.y = KENNEL_AT[2] - Math.PI / 2;
    still(k, true, true);
    V.tufts = V.tufts.filter(t => { const dx = t[0] - KENNEL_AT[0], dz = t[2] - KENNEL_AT[1]; return Math.hypot(dx, dz) > 1.15; });     // no grass through it
    kennelBoard = nameBoard(); const [bx, by] = KENNEL.board;
    kennelBoard.mesh.position.set(bx + 0.003, by, 0); kennelBoard.mesh.rotation.y = Math.PI / 2; k.add(kennelBoard.mesh);
    kennelBoard.draw(dogName);
    if (document.fonts && document.fonts.load) document.fonts.load('600 40px Fredoka').then(() => kennelBoard.draw(dogName)).catch(() => {});
  }
  if (params.get('lineup')) return;                  // (not on the line-up pages)
  farmDog = new FarmDog(scene, { joints, name: dogName, kennel: KENNEL_AT, nav: navGrid(), groundY, spots: farmSpots, geese: () => geeseFlock,
    foxes: () => foxes, toCamera: (x, z) => Math.atan2(camera.position.x - x, camera.position.z - z) }, rng(61));
  farmDog.update(1 / 60, clockHour());
}
// where he goes on his rounds: outside each coop's front fence (facing the hens), and the farm's corners (benches, the well,
// the stall, the scarecrow, the bales...), not too far from home and well away from the foxes' meadow
function farmSpots() {
  if (dogSpots) return dogSpots;
  const nav = navGrid(), v = new THREE.Vector3(), c = new THREE.Vector3(), coopsAt = [], farm = [];
  for (const p of plots) {
    if (p.kind !== 'coop' || !p.frame) continue;
    p.frame.updateWorldMatrix(true, false);
    p.frame.localToWorld(v.set(0.3, 0, 3.35)); p.frame.localToWorld(c.set(0.3, 0, 1.4));
    const f = nav.nearestFree(v.x, v.z, 1.0); if (f) coopsAt.push([f[0], f[1], Math.atan2(c.x - f[0], c.z - f[1])]);
  }
  const KINDS = { bench: 1, well: 1, egg_stall: 1, scarecrow: 1, wheelbarrow: 1, hay_stack: 1, round_bale: 1, veg_patch: 1, veg_patch_sq: 1, sunflowers: 1, barrels: 1, log_pile: 1, planter: 1 };
  for (const p of V.props) {
    if (!KINDS[p.model]) continue;
    const d = Math.hypot(p.pos[0] - KENNEL_AT[0], p.pos[2] - KENNEL_AT[1]), df = Math.hypot(p.pos[0] - FOX_FIELD[0], p.pos[2] - FOX_FIELD[1]);
    if (d > 34 || df < 9) continue;
    const f = nav.nearestFree(p.pos[0] + 1.0, p.pos[2] + 1.0, 2.0); if (f) farm.push(f);
  }
  return (dogSpots = { coops: coopsAt, farm });
}

// ------------------------------------------------------------------ the fox's night visit (nightvisit.js): late at night Rusty goes to a
// coop (one left open, if there is one), pokes his nose in and gets pecked, or finds the door shut; "Send the farmer" brings
// the farmer's torch from the farmhouse and Rusty bolts home. ?visit starts one at once (at 23:30 unless ?time says), and
// another 25 s after each; ?visit=N sends him to coop N. Texts in English, or French with ?lang=fr.
const VISIT_TEXT = {
  out: ['Rusty the fox has slipped out of his den…', 'Rusty le renard est sorti de son terrier…'],
  btnFox: ['Fox!', 'Renard !'],
  send: ['Send the farmer', 'Envoyer le fermier'],
  squawk: ['Squawk! Squawk!', 'Cot cot codet !'],
  shut: ['The door is shut!', 'La porte est fermée !'],
  sent: ['The farmer is on his way with his torch…', 'Le fermier arrive avec sa lampe…'],
  shoo: ['Shoo! Off you go, Rusty!', 'Ouste ! File, Rusty !'],
  safe: ['Rusty ran home. The hens can go back to sleep.', 'Rusty est rentré chez lui. Les poules peuvent se rendormir.'],
  feather: ['Rusty went home with a feather on his nose.', 'Rusty est rentré avec une plume sur le nez.'],
  allShut: ['Rusty went home: the doors were shut.', 'Rusty est rentré : les portes étaient fermées.'],
  atDoor: ['Rusty the fox is at the door!', 'Rusty le renard est à la porte !'],
  inWay: ["Rusty's nose is in the way!", 'Le nez de Rusty est dans le passage !'],
  geeseHeard: ['The geese have heard Rusty! They\'re raising the alarm…', 'Les oies ont entendu Rusty ! Elles donnent l\'alerte…'],
  geeseSafe: ['The geese chased Rusty all the way home!', 'Les oies ont chassé Rusty jusque chez lui !'],
  geeseProud: ['Victory! The geese are so proud of themselves, they\'re parading round the farm.', 'Victoire ! Les oies sont si fières d\'elles qu\'elles paradent dans la ferme.'],
};
const VISIT_PLOT = /^\d+$/.test(params.get('visit') || '') ? parseInt(params.get('visit'), 10) : undefined;
const LANG = params.get('lang') === 'fr' ? 'fr' : 'en';
const farmerBtn = document.getElementById('farmerbtn');
let nightVisit = null;
// the village as a grid for finding a way round: trees, bushes, rocks, buildings and props, pens and plots, the den, the
// pond and the streams (except where a path crosses them, on the bridges); grown by about a fox's half width
let NAV = null;
const navGrid = () => NAV || (NAV = buildNav());          // (one grid for everyone who finds a way round the village)
function buildNav() {
  const c = V.bounds.corners, xs = c.map(p => p[0]), zs = c.map(p => p[2]);
  const nav = new NavGrid(Math.min(...xs) - 2, Math.min(...zs) - 2, Math.max(...xs) + 2, Math.max(...zs) + 2, 0.25);
  const GROW = 0.22, seg = (px, pz, a, b) => { const ax = a[0], az = a[2], dx = b[0] - ax, dz = b[2] - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
  const nearLine = (lines, px, pz, r) => lines.some(l => { for (let i = 1; i < l.length; i++) if (seg(px, pz, l[i - 1], l[i]) < r) return true; return false; });
  for (const t of V.trees) nav.circle(t.pos[0], t.pos[2], 0.3 + GROW);
  for (const b of V.bushes) nav.circle(b.pos[0], b.pos[2], 0.42 * (b.s || 1) + GROW);
  for (const k of V.rocks) nav.circle(k.pos[0], k.pos[2], 0.17 * k.s * 1.2 + GROW);
  const WALK = { bridge: 1, dock: 1, wheat_field: 1, mushrooms: 1 };
  const box = new THREE.Box3(), wb = new THREE.Box3(), inv = new THREE.Matrix4();
  for (const p of V.props) {
    if (WALK[p.model] || !parts[p.model]) continue;
    const m = place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1);
    box.setFromObject(parts[p.model]); wb.copy(box).applyMatrix4(m);
    nav.box(inv.copy(m).invert(), box.min.clone().multiplyScalar(1), box.max, GROW / (p.s || 1), wb);
  }
  for (const pl of plots) {
    if (pl.kind === 'lineup' || !pl.group) continue;
    const frame = pl.frame || pl.group; frame.updateWorldMatrix(true, false);
    const lo = pl.kind === 'coop' ? new THREE.Vector3(-1.66, 0, -0.81) : new THREE.Vector3(-1.56, 0, -1.3);
    const hi = pl.kind === 'coop' ? new THREE.Vector3(1.81, 0, 2.55) : new THREE.Vector3(1.82, 0, 1.68);
    wb.makeEmpty(); for (const x of [lo.x, hi.x]) for (const z of [lo.z, hi.z]) wb.expandByPoint(frame.localToWorld(new THREE.Vector3(x, 0, z)));
    nav.box(inv.copy(frame.matrixWorld).invert(), lo, hi, pl.kind === 'coop' ? 0.4 : GROW, wb);      // (a fox's brush sweeps wide as he turns)
  }
  nav.circle(FOX_DEN[0] - Math.sin(FOX_DEN[2]) * 0.08, FOX_DEN[1] - Math.cos(FOX_DEN[2]) * 0.08, 0.68 + GROW);
  {                                                  // Biscuit's kennel and his bowls
    const th = KENNEL_AT[2] - Math.PI / 2, m = new THREE.Matrix4().makeRotationY(th).setPosition(KENNEL_AT[0], 0, KENNEL_AT[1]);
    const lo = new THREE.Vector3(KENNEL.x0 - 0.1, 0, -KENNEL.half - 0.1), hi = new THREE.Vector3(KENNEL.x1 + 0.06, 0, KENNEL.half + 0.1);
    wb.makeEmpty(); for (const x of [lo.x, hi.x]) for (const z of [lo.z, hi.z]) wb.expandByPoint(new THREE.Vector3(x, 0, z).applyMatrix4(m));
    nav.box(inv.copy(m).invert(), lo, hi, GROW, wb);
    for (const b of [KENNEL.food, KENNEL.water]) { const w = new THREE.Vector3(b[0], 0, b[1]).applyMatrix4(m); nav.circle(w.x, w.z, KENNEL.r + GROW); }
  }
  const P = V.pond, pu = new THREE.Vector2(P.axisU[0], P.axisU[2]), pv = new THREE.Vector2(P.axisV[0], P.axisV[2]), lu = pu.length() + 0.35, lv = pv.length() + 0.35;
  pu.normalize(); pv.normalize();
  nav.mark(P.center[0] - 6, P.center[2] - 6, P.center[0] + 6, P.center[2] + 6, (x, z) => { const dx = x - P.center[0], dz = z - P.center[2]; return ((dx * pu.x + dz * pu.y) / lu) ** 2 + ((dx * pv.x + dz * pv.y) / lv) ** 2 <= 1; });
  for (const st of V.streams) {
    const sx = st.map(p => p[0]), sz = st.map(p => p[2]), r = V.streamHalf + GROW;
    nav.mark(Math.min(...sx) - r, Math.min(...sz) - r, Math.max(...sx) + r, Math.max(...sz) + r, (x, z) => nearLine([st], x, z, r) && !nearLine(V.paths, x, z, V.pathHalf * 0.9));
  }
  // the footbridges: rails and all are in the way, but a crossing links their two ends, walked straight along the middle
  if (parts.bridge) {
    box.setFromObject(parts.bridge);
    for (const p of V.props) if (p.model === 'bridge') {
      const m = place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1); wb.copy(box).applyMatrix4(m);
      nav.box(inv.copy(m).invert(), box.min, box.max, 0.05, wb);
      const a = new THREE.Vector3(box.min.x - 0.32, 0, 0).applyMatrix4(m), b = new THREE.Vector3(box.max.x + 0.32, 0, 0).applyMatrix4(m);
      const fa = nav.freeAt(a.x, a.z), fb = nav.freeAt(b.x, b.z);
      if (fa && fb) nav.link(a.x, a.z, b.x, b.z); else console.warn('bridge end not free', p.pos, fa, fb);
    }
  }
  return nav;
}
// the deck of the footbridges, arched: its height along the bridge, measured from the model (straight down at its middle)
let BRIDGES = null;
function bridgeDecks() {
  if (BRIDGES || !parts.bridge) return BRIDGES || [];
  const box = new THREE.Box3().setFromObject(parts.bridge), rc = new THREE.Raycaster(), prof = [], N = 24;
  const meshes = meshesOf(parts.bridge);
  for (let k = 0; k <= N; k++) {
    const x = box.min.x + (box.max.x - box.min.x) * k / N;
    rc.set(new THREE.Vector3(x, 3, 0), new THREE.Vector3(0, -1, 0));
    const hit = rc.intersectObjects(meshes, false)[0]; prof.push(hit ? Math.max(0, hit.point.y) : 0);
  }
  BRIDGES = V.props.filter(p => p.model === 'bridge').map(p => {
    const m = place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1);
    return { inv: m.clone().invert(), s: p.s || 1, x0: box.min.x, x1: box.max.x, half: box.max.z, prof, pos: p.pos };
  });
  return BRIDGES;
}
const deckV = new THREE.Vector3();
// on a footbridge or stepping on or off it (tests)
function onBridge(x, z) {
  for (const B of bridgeDecks()) { deckV.set(x, 0, z).applyMatrix4(B.inv); if (deckV.x > B.x0 - 0.45 && deckV.x < B.x1 + 0.45 && Math.abs(deckV.z) < B.half + 0.1) return true; }
  return false;
}
function groundY(x, z) {
  for (const B of bridgeDecks()) {
    if (Math.abs(x - B.pos[0]) > 1.5 || Math.abs(z - B.pos[2]) > 1.5) continue;
    deckV.set(x, 0, z).applyMatrix4(B.inv);
    if (deckV.x < B.x0 || deckV.x > B.x1 || Math.abs(deckV.z) > B.half) continue;
    const u = (deckV.x - B.x0) / (B.x1 - B.x0) * (B.prof.length - 1), i = Math.min(B.prof.length - 2, Math.floor(u)), t = u - i;
    return (B.prof[i] * (1 - t) + B.prof[i + 1] * t) * B.s;
  }
  return 0;
}
function buildNightVisit() {
  const fh = V.props.find(p => p.model === 'farmhouse'), house = fh ? [fh.pos[0], fh.pos[2]] : [V.house[0], V.house[2]];
  nightVisit = new NightVisit({
    scene, fam: foxes, nav: navGrid(), coops: () => plots.filter(p => p.kind === 'coop'), doorOpen, nestOf, D2, house,
    grade: nightGrade, text: VISIT_TEXT, lang: LANG, r: rng(41), penObstacles: PEN.obstacles, groundY,
    busyPlot: p => inside.open && inside.plot === p,
    toCamera: (x, z) => Math.atan2(camera.position.x - x, camera.position.z - z),     // which way faces the player
    // a first visit 2-4 minutes into a night, then every 15-30 minutes (automated tests only get one with ?visit)
    firstIn: params.has('visit') ? 2.5 : navigator.webdriver ? Infinity : 120 + Math.random() * 120,
    again: () => params.has('visit') ? 25 : navigator.webdriver ? Infinity : 900 + Math.random() * 900,
    say(text, at, secs) { tag.textContent = text; tagBird = null; tagSpot.copy(at); tag.classList.add('on'); fieldTag = secs; },
    hint,
  });
  const go = nightVisit.start.bind(nightVisit);
  nightVisit.start = (i) => {               // ?visit: look at the coop he's going to
    const ok = go(i);
    if (ok && params.has('visit') && !inside.open) { const c = nightVisit.target.frame.getWorldPosition(new THREE.Vector3()); view.target.set(c.x - 0.6, 0, c.z + 0.2); view.size = 4.6; clampView(); applyGrass(); placeCamera(); }
    return ok;
  };
  if (farmerBtn) { farmerBtn.textContent = nightVisit.T('send'); farmerBtn.addEventListener('click', () => { nightVisit.sendFarmer(); wake(800); }); }
}
function tickFoxes(dt) {
  if (farmDog) farmDog.update(dt, clockHour());
  if (geeseFlock) geeseFlock.update(dt, clockHour());
  if (!foxes) return;
  foxes.update(dt, clockHour(), params.has('foxes'));
  if (foxLineup) foxLineup.update(dt);
  if (geeseLineup) { geeseLineup.update(dt); wake(100); }
  if (nightVisit) nightVisit.update(dt, clockHour(), { plot: VISIT_PLOT });
  const prowl = !!(nightVisit && nightVisit.active() && nightVisit.fox.root.visible), out = foxes.visible() || prowl;
  if (foxBtn && foxBtn.hidden === out) foxBtn.hidden = !out;
  if (foxBtn && foxBtn.classList.contains('alarm') !== prowl) { foxBtn.classList.toggle('alarm', prowl); foxBtn.textContent = prowl ? nightVisit.T('btnFox') : 'Foxes'; }
  const send = !!(nightVisit && nightVisit.canSend());
  if (farmerBtn && farmerBtn.hidden === send) farmerBtn.hidden = !send;
  if (foxes.visible() && !foxHinted) { foxHinted = true; hint('The foxes are out playing in the meadow: tap "Foxes" at the top to watch them.'); }
}

// ------------------------------------------------------------------ the pop doors: shut at night once everyone's in, open in the morning
// Each coop's pop door has a sliding door (coops.glb popdoor_<style>, stylized/coops.py pop_slider: boards and a Z brace in
// the house's colours, the pagoda's a red lattice). By day it is up out of sight; at night, once every bird of the coop is in
// bed, a badge over the door asks for it to be shut: tap the door (or the badge) and it slides down. In the morning the
// birds wait inside until it's opened (a badge with a sun); if nobody does by 7:30 it opens by itself. The door is drawn
// cut off at the opening's top (as if it ran up inside the wall), with all of a style's doors in one batch.
const POP_H = 0.46, DOOR_RUN = POP_H + 0.02;
const doorEase = u => { u = Math.min(1, Math.max(0, u)); return u * u * u * (u * (u * 6 - 15) + 10); };
const DOORS = { styles: {} };                // per style: { meshes: [InstancedMesh], plots: [] }
function doorShader(mat) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float doorSlide;\nvarying float vDoorY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += doorSlide;\nvDoorY = transformed.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDoorY;')
      .replace('void main() {', 'void main() {\n  if (vDoorY > ' + POP_H.toFixed(3) + ') discard;');
  };
  mat.customProgramCacheKey = () => 'popdoor';
  mat.needsUpdate = true;
}
function buildDoors() {
  for (const p of plots) if (p.kind === 'coop') {
    const S = DOORS.styles[p.breed] = DOORS.styles[p.breed] || { meshes: [], plots: [] };
    p.door = { shut: false, s: 1, goal: 1, i: S.plots.length, badge: null, kind: null };
    S.plots.push(p);
  }
  for (const style in DOORS.styles) {
    const S = DOORS.styles[style], name = 'popdoor_' + style;
    if (!parts[name]) continue;
    for (const m of meshesOf(parts[name])) {
      const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
      geo.setAttribute('doorSlide', new THREE.InstancedBufferAttribute(new Float32Array(S.plots.length).fill(DOOR_RUN), 1));
      const mat = m.material.clone(); doorShader(mat);
      const inst = new THREE.InstancedMesh(geo, mat, S.plots.length);
      S.plots.forEach((p, i) => {
        const G = nestOf(p);
        inst.setMatrixAt(i, p.frame.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(G.pop[0], G.house, D2)));
      });
      inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); inst.boundingSphere.radius += DOOR_RUN;
      inst.castShadow = false; inst.receiveShadow = true; inst.matrixAutoUpdate = false; inst.visible = false;
      scene.add(inst); S.meshes.push(inst);
    }
  }
}
const doorOpen = p => !p.door || p.door.s >= 1;
function setDoor(p, open) { if (p.door) { p.door.goal = open ? 1 : 0; p.door.shut = !open; wake(1200); } }
let BADGE_TEX = null;
function badgeTextures() {
  const make = sun => fxTexture64(128, c => {
    c.beginPath(); c.arc(64, 64, 56, 0, Math.PI * 2); c.fillStyle = sun ? '#fff4d8' : '#e6ecfb'; c.fill();
    c.lineWidth = 7; c.strokeStyle = '#2b3a24'; c.stroke();
    // the little door: boards, a Z, a ring
    c.fillStyle = '#a8572f'; c.beginPath(); c.roundRect(38, 44, 40, 56, 5); c.fill();
    c.strokeStyle = 'rgba(60,25,10,0.55)'; c.lineWidth = 2.5;
    for (const x of [51.3, 64.6]) { c.beginPath(); c.moveTo(x, 46); c.lineTo(x, 98); c.stroke(); }
    c.strokeStyle = '#f6efe0'; c.lineWidth = 4.5; c.beginPath(); c.moveTo(42, 54); c.lineTo(74, 54); c.lineTo(42, 90); c.lineTo(74, 90); c.stroke();
    if (sun) {                                   // a sun: open me, it's morning
      c.fillStyle = '#f2b632'; c.beginPath(); c.arc(86, 40, 10, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#f2b632'; c.lineWidth = 3.5;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.beginPath(); c.moveTo(86 + Math.cos(a) * 13.5, 40 + Math.sin(a) * 13.5); c.lineTo(86 + Math.cos(a) * 18.5, 40 + Math.sin(a) * 18.5); c.stroke(); }
    } else {                                     // a crescent moon: shut me, they're all in bed
      c.fillStyle = '#f2cf5a'; c.beginPath(); c.arc(84, 41, 13, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e6ecfb'; c.beginPath(); c.arc(90, 36, 11, 0, Math.PI * 2); c.fill();
    }
  });
  return { moon: make(false), sun: make(true) };
}
function fxTexture64(size, draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'); draw(c);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const doorV = new THREE.Vector3();
function evening() { return DAY.hour >= 20 || DAY.hour < 5.5; }
function tickDoors(dt, now = performance.now()) {
  const h = DAY.hour;
  for (const style in DOORS.styles) {
    const S = DOORS.styles[style]; let any = false, moved = false;
    const slide = S.meshes.length ? S.meshes[0].geometry.getAttribute('doorSlide') : null;
    for (const p of S.plots) {
      const d = p.door;
      if (d.goal === 0 && h >= 7.5 && h < 20) setDoor(p, true);                 // nobody opened it: it opens by itself at 7:30
      if (d.s !== d.goal) { d.s = d.goal > d.s ? Math.min(d.goal, d.s + dt / 0.9) : Math.max(d.goal, d.s - dt / 0.9); moved = true; wake(300); }
      const v = doorEase(d.s) * DOOR_RUN;
      if (slide && slide.array[d.i] !== v) { for (const m of S.meshes) { const a = m.geometry.getAttribute('doorSlide'); a.array[d.i] = v; a.needsUpdate = true; } }
      if (d.s < 1) any = true;
      // the badge: a moon when everyone's in bed and the door is still open; a sun when it's shut and they're waiting to get up
      let kind = null;
      if (nightVisit && nightVisit.active() && nightVisit.target === p) kind = null;           // Rusty's at this door: keep him in view
      else if (d.goal === 1 && d.s >= 1 && evening() && p.birds.length && p.birds.every(b => b.asleep)) kind = 'moon';
      else if (d.goal === 0 && d.s <= 0 && p.birds.some(b => b.asleep && !b.nightNow())) kind = 'sun';
      if (kind && !d.badge) {
        BADGE_TEX = BADGE_TEX || badgeTextures();
        d.badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: BADGE_TEX.moon, transparent: true, depthTest: false, depthWrite: false }));
        d.badge.renderOrder = 10; scene.add(d.badge);
      }
      if (d.badge) {
        d.badge.visible = !!kind;
        if (kind) {
          if (d.kind !== kind) { d.kind = kind; d.badge.material.map = BADGE_TEX[kind]; d.badge.material.needsUpdate = true; }
          const G = nestOf(p), sz = Math.min(1.2, Math.max(0.3, view.size * 0.13));          // about 40 points across on screen
          doorV.set(G.pop[0], G.house + POP_H + 0.1 + sz * 0.45 + 0.03 * Math.sin(now / 1000 * 2.4 + p.index), D2 + 0.3); p.frame.localToWorld(doorV);
          d.badge.position.copy(doorV); d.badge.scale.set(sz, sz, sz);
        }
      }
    }
    for (const m of S.meshes) m.visible = any;
  }
}
function doorWho(list) {
  const n = list.map(b => b.name);
  if (n.length === 1) return n[0] + ' is still out';
  if (n.length === 2) return n[0] + ' and ' + n[1] + ' are still out';
  return n[0] + ', ' + n[1] + ' and ' + (n.length - 2) + ' more are still out';
}
// a tap on a coop's pop door (or its badge, or the door inside): shut it at night once everyone's in, open it again
function doorTap(p, at) {
  const d = p.door; if (!d) return;
  let msg;
  if (d.goal === 1 && nightVisit && nightVisit.active() && nightVisit.target === p && nightVisit.lz != null) msg = nightVisit.T('inWay');
  else if (d.goal === 0) {
    setDoor(p, true);
    msg = p.birds.some(b => b.asleep && !b.nightNow()) ? 'Good morning! Door open' : 'Door open';
  } else if (!evening()) msg = 'The door stays open in the daytime';
  else {
    const out = p.birds.filter(b => !b.asleep);
    if (out.length) msg = "Not everyone's in yet: " + doorWho(out);
    else { setDoor(p, false); msg = 'Door shut. Sleep well!'; }
  }
  tag.textContent = msg; tagBird = null; tag.classList.add('on'); fieldTag = 2.6;
  if (at) tagSpot.copy(at);
  else { const G = nestOf(p); tagSpot.set(G.pop[0], G.house + POP_H + 0.12, D2 + 0.1); p.frame.localToWorld(tagSpot); }
}

// ------------------------------------------------------------------ birds: walk, stop, peck, waddle, and keep a little room round each other
const HEN_NAMES = ['Henrietta', 'Clover', 'Mabel', 'Peggy', 'Dotty', 'Hazel', 'Maple', 'Willow', 'Biscuit', 'Nutmeg', 'Poppy', 'Daisy', 'Pearl', 'Ginger',
  'Olive', 'Rosie', 'Marigold', 'Bramble', 'Truffle', 'Pippa', 'Dumpling', 'Ivy', 'Cosette', 'Margot', 'Brioche', 'Lulu', 'Fern', 'Juniper'];
const ROO_NAMES = ['Rupert', 'Albert', 'Barnaby', 'Chester', 'Percy', 'Reginald', 'Gus', 'Hamish', 'Basil', 'Monty', 'Fergus', 'Rocco'];
const CHICK_NAMES = ['Pip', 'Peanut', 'Button', 'Sprout', 'Nugget', 'Bean', 'Pebble', 'Tiny', 'Puff', 'Dot'];
const smooth01 = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
const ROOM = 0.5, PERSONAL = 0.34, BODY = 0.32, CHICK_BODY = 0.2;
// the game's five personalities: each hen celebrates her egg in her own way
const PERS_IDS = ['diva', 'brave', 'glutton', 'mum', 'rebel'];
const PERS_NAMES = { diva: 'Diva', brave: 'Brave', glutton: 'Glutton', mum: 'Good mum', rebel: 'Rebel' };
const SONG = { diva: [4.5, 1.2], brave: [3.6, 1.1], glutton: [2.2, 0.9], mum: [2.6, 0.65], rebel: [2.0, 1.0] };   // seconds, how loud
// going in to lay: the rebel and the brave jump straight in at the nest window (and jump out of it after); the others behave
// and go up the ramp and in at the pop door
const JUMPERS = { rebel: true, brave: true };
const D2 = 0.44;                                   // the front of every house (pen frame: the houses share the Red Barn's footprint)
const HOUSE_LO = new THREE.Vector3(-0.66, -0.3, -0.5), HOUSE_HI = new THREE.Vector3(0.66, 2.2, D2);     // inside a house
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
const NO_BLOB = new THREE.Matrix4().makeScale(0, 0, 0);
function placeBlob(b) {
  if (!b.root.visible) { blobs.setMatrixAt(b.blob, NO_BLOB); blobs.instanceMatrix.needsUpdate = true; return; }     // in bed
  const y = b.root.position.y;
  if (b.shadowY !== undefined) b.root.position.y = b.shadowY;          // leaping: the shadow stays on the ground (or the nest's floor)
  b.root.updateMatrix();
  tmpM.multiplyMatrices(b.plot.frame.matrixWorld, b.root.matrix).multiply(b.blobLocal);
  if (b.shadowY !== undefined) { b.root.position.y = y; b.root.updateMatrix(); }
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
    const pers = this.pers ? ' · ' + PERS_NAMES[this.pers] : '';
    const doing = this.laying && this.laying.inside ? ' · laying' : '';
    return this.name + ' · ' + what + (this.kind === 'chick' ? ' chick' : this.kind === 'rooster' ? ' rooster' : '') + pers + doing;
  }
  free(x, z) {
    if (this.plot.kind === 'lineup') return true;
    const Y = PEN.yard;
    if (x < Y.min[0] || x > Y.max[0] || z < Y.min[2] || z > Y.max[2]) return false;
    for (const o of PEN.obstacles) { const dx = x - o[0], dz = z - o[2]; if (dx * dx + dz * dz < o[3] * o[3]) return false; }
    return !this.inBlock(x, z);
  }
  inBlock(x, z) {
    for (const o of this.plot.block || []) { const dx = x - o[0], dz = z - o[1]; if (dx * dx + dz * dz < o[2] * o[2]) return true; }
    return false;
  }
  // stepping to (x, z) facing yaw: her breast and beak, ahead of her feet, mustn't go into the house's walls, through the fence
  // or into what stands in front of the house
  clearAhead(x, z, yaw) {
    if (this.plot.kind === 'lineup') return true;
    const reach = 0.22 * this.rig.scale / 0.5, Y = PEN.yard, m = 0.12;
    const px = x + Math.sin(yaw) * reach, pz = z + Math.cos(yaw) * reach;
    if (px < Y.min[0] - m || px > Y.max[0] + m || pz < Y.min[2] - m || pz > Y.max[2] + m) return false;
    return !this.inBlock(px, pz);
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
  // bedtime: at dusk the birds go in for the night, up the ramp and in at the pop door, one by one (the rooster last), and in
  // the morning they come out again (the rooster first, with a crow). Each has her own times, by the player's clock: hens go
  // in between 22:00 and 22:40, the rooster at 22:45 (Audrey: "Bedtime between 22:00 and 22:45", so the evening is for
  // playing); out between 6:05 and 6:40, the rooster at 6:00; chicks with their mum
  bedHours() {
    if (!this.bed) {
      if (this.kind === 'rooster') this.bed = { in: 22.75, out: 6.0 };
      else if (this.kind === 'chick' && this.mum) { const m = this.mum.bedHours(); this.bed = { in: m.in + 0.02 + this.r() * 0.03, out: m.out + 0.02 + this.r() * 0.03 }; }
      else this.bed = { in: 22.0 + this.r() * 0.65, out: 6.08 + this.r() * 0.58 };
    }
    return this.bed;
  }
  nightNow(early = 0) { const h = DAY.hour, b = this.bedHours(); return h >= b.in - early || h < b.out; }
  houseBox() { const f = this.plot.frame; f.updateMatrixWorld(true); return { inv: new THREE.Matrix4().copy(f.matrixWorld).invert(), lo: HOUSE_LO, hi: HOUSE_HI }; }
  goToBed() {
    this.act = null; this.route = null; this.then = null; this.wait = 0; this.proudGoal = 0;
    this.roost = { phase: 'go', t: 0 };
  }
  sleepNow() {                             // inside for the night: out of sight, just inside the pop door
    const G = nestOf(this.plot);
    this.roost = null; this.asleep = true; this.act = null; this.route = null; this.then = null;
    this.root.position.set(G.pop[0], G.house, D2 - 0.3); this.root.rotation.y = 0; this.root.visible = false;
    this.rig.indoor(null);
  }
  wakeUp() {                               // out again: from just inside the pop door, down the ramp into the yard
    const G = nestOf(this.plot), ground = 0.015, Y = PEN.yard;
    this.asleep = false; this.root.visible = true; this.rig.indoor(this.houseBox());
    let spot = null;
    for (let k = 0; k < 20 && !spot; k++) {
      const x = G.foot[0] + (this.r() - 0.3) * 1.2, z = G.foot[1] + 0.25 + this.r() * 0.5;
      if (x > Y.min[0] + 0.1 && x < Y.max[0] - 0.1 && z < Y.max[2] - 0.1 && this.free(x, z)) spot = [x, z];
    }
    spot = spot || [G.foot[0], G.foot[1] + 0.3];
    this.roost = { phase: 'out', t: 0, path: [[G.pop[0], G.pop[1] + 0.02, G.house], [G.foot[0], G.foot[1], ground], [spot[0], spot[1], ground]] };
  }
  roostStep(dt) {
    const R = this.roost, p = this.root.position, o = { walking: false, sit: 0, flap: 0, ruffle: 0, sing: 0, cluck: 0, kawk: 0 };
    const G = nestOf(this.plot), FL = G.house, ground = 0.015;
    const atPop = p.y > FL - 0.12 && p.z > D2 - 0.36 && p.z < D2 + 0.34;
    R.t += dt;
    if (R.phase === 'go') {                  // across the yard to the foot of the ramp
      const r = this.stepToward(G.foot[0], G.foot[1] + 0.1, dt); o.walking = r.walking;
      if (r.arrived || R.t > 20 || (r.blocked && R.t > 3)) {
        R.phase = 'up'; R.path = [[G.foot[0], G.foot[1], ground], [G.pop[0], G.pop[1], FL], [G.pop[0], D2 - 0.3, FL]];
        this.rig.indoor(this.houseBox());
      }
    } else {                                 // up the ramp and in for the night, or out in the morning
      const r = this.walkPath(dt, R.phase === 'up' ? 0.7 : 0.8, R); o.walking = r.walking;
      if (atPop) o.duck = 1;
      if (r.done) {
        if (R.phase === 'up') this.sleepNow();
        else {
          this.roost = null; this.rig.indoor(null); this.wait = 0.3 + this.r();
          if (this.kind === 'rooster') { this.act = { type: 'crow', left: 2.0 }; this.wait = 2.2; }      // good morning!
        }
      }
    }
    return o;
  }
  tapped() {                               // a hop and a flap (a rooster may crow)
    if (this.laying || this.roost || this.asleep) return;      // a laying hen isn't disturbed, nor one going to bed
    this.hopT = 0;
    if (this.kind === 'rooster' && this.r() < 0.5) { this.act = { type: 'crow', left: 2.0 }; this.wait = Math.max(this.wait, 2.0); }
    else { this.act = { type: 'flap', left: 0.8 }; this.wait = Math.max(this.wait, 0.8); }
  }
  // walk towards (tx, tz): turn first, then step; obey: keep to the yard and round obstacles
  stepToward(tx, tz, dt, pace = 1, obey = true) {
    const p = this.root.position, dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz);
    if (dist < 0.04) return { arrived: true, walking: false };
    const turning = this.turnTo(Math.atan2(dx, dz), dt);
    if (turning.diff < 25 * DEG) {
      const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y), s = Math.min(this.speed * pace * dt, dist);
      const nx = p.x + fx * s, nz = p.z + fz * s;
      if (!obey || (this.free(nx, nz) && (this.laying || this.clearAhead(nx, nz, this.root.rotation.y))) || !this.free(p.x, p.z)) { p.x = nx; p.z = nz; return { arrived: false, walking: true }; }
      return { arrived: false, walking: false, blocked: true };
    }
    return { arrived: false, walking: turning.walking };
  }
  turnTo(yaw, dt) {
    let diff = ((yaw - this.root.rotation.y + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const step = this.turn * dt;
    this.root.rotation.y += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
    diff = Math.abs(diff) < step ? 0 : Math.abs(diff) - step;
    return { diff, done: diff < 0.02, walking: diff > 2 * DEG };         // little steps on the spot while turning
  }
  // laying: up the ramp and in at the little door, along inside to the nest behind the window, turn to face out and settle on
  // the straw, sit until the egg comes, get up (the egg is in the straw), back out the way she came and down the ramp, sing
  // the egg song, then celebrate in her own way
  startLaying(sit) {
    this.plot.nest.by = this;
    this.laying = { phase: 'go', t: 0, sit: sit ?? 30 + this.r() * 15, shuffle: 4 + this.r() * 4, beat: -1, jump: !!JUMPERS[this.pers] };
    this.act = null; this.route = null; this.wait = 0;
    const f = this.plot.frame; f.updateMatrixWorld(true);                   // inside the house she is in its shade
    this.rig.indoor({ inv: new THREE.Matrix4().copy(f.matrixWorld).invert(), lo: HOUSE_LO, hi: HOUSE_HI });
  }
  // a leap from L.from to L.to over `dur` seconds: crouch, spring (wings beating, legs tucked, neck out), land and settle.
  // The arc is high enough for her feet to clear the window's sill where she crosses the wall. Returns true when done.
  leap(dt, o, G, dur) {
    const L = this.laying, p = this.root.position, u = Math.min(1, L.t / dur), a = smooth01((u - 0.24) / 0.62);
    const F = L.from, T = L.to, sz = Math.min(1.2, this.rig.scale / 0.5);
    if (L.hh === undefined) {                                  // how much higher than the hop's own lift the arc must go
      const aw = Math.min(0.95, Math.max(0.05, (F.z - D2) / (F.z - T.z))), sill = G.win[1] - 0.06;   // her body through the middle of the opening
      let lo = 0, hi = 1;                                       // the hop's own lift runs on straight time: when is she at aw?
      for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (smooth01(m) < aw) lo = m; else hi = m; }
      const base = F.y + (T.y - F.y) * aw + 0.12 * sz * Math.sin(lo * Math.PI);
      L.hh = Math.max(-0.12 * sz * Math.sin(lo * Math.PI), (sill - base) / Math.sin(aw * Math.PI));     // lower for a low window
    }
    p.x = F.x + (T.x - F.x) * a; p.z = F.z + (T.z - F.z) * a;
    p.y = F.y + (T.y - F.y) * a + L.hh * Math.sin(a * Math.PI);
    this.hopT = u < 1 ? u : -1;
    const air = u > 0.2 && u < 0.9;
    o.flap = air && p.z > D2 + 0.06 ? 1 : 0; o.stretch = u < 0.9 ? 1 : 0;       // long and flat from the crouch; wings folded through the window
    this.shadowY = air ? (p.z > D2 ? 0.0 : G.floor + 0.02) : undefined;
    return u >= 1;
  }
  // a scripted walk along points [x, z, y]: she turns to each and walks there (height from point to point: up the ramp)
  walkPath(dt, pace = 0.8, L = this.laying) {
    const p = this.root.position, P = L.path;
    if (!P.length) return { done: true, walking: false };
    const [tx, tz, ty] = P[0], dx = tx - p.x, dz = tz - p.z, dist = Math.hypot(dx, dz);
    if (L.seg === undefined) L.seg = { from: p.clone(), len: Math.max(dist, 1e-3) };
    const t = this.turnTo(Math.atan2(dx, dz), dt * 1.4);
    let walking = t.walking;
    if (t.diff < 30 * DEG || dist < 0.05) {
      const st = Math.min(this.speed * pace * dt, dist); p.x += dx / (dist || 1) * st; p.z += dz / (dist || 1) * st; walking = true;
      const u = 1 - Math.hypot(tx - p.x, tz - p.z) / L.seg.len; p.y = L.seg.from.y + (ty - L.seg.from.y) * Math.min(1, Math.max(0, u));
    }
    if (Math.hypot(tx - p.x, tz - p.z) < 0.02) { p.y = ty; P.shift(); L.seg = undefined; }
    return { done: !P.length, walking };
  }
  layStep(dt) {
    const L = this.laying, p = this.root.position, o = { walking: false, sit: 0, flap: 0, ruffle: 0, sing: 0, cluck: 0, kawk: 0 };
    const next = ph => { L.phase = ph; L.t = 0; L.from = p.clone(); L.yaw0 = undefined; };
    // turning in step with a move (k 0..1), the shorter way round (or dir +1 / -1): in the nest there's no room to turn first
    const swing = (to, k, dir) => {
      if (L.yaw0 === undefined) {
        L.yaw0 = this.root.rotation.y; let d = ((to - L.yaw0 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        if (dir && Math.sign(d) !== dir && Math.abs(d) > 1e-3) d += dir * 2 * Math.PI;
        L.dyaw = d;
      }
      this.root.rotation.y = L.yaw0 + L.dyaw * k;
    };
    L.t += dt;
    const G = nestOf(this.plot), FL = G.house, NF = G.floor, ground = 0.015;      // the house's floor, the nest's
    const front = [G.pop[0], Math.max(G.foot[1] + 0.16, 1.2)];             // in the yard, in front of the ramp
    const launch = [G.seat[0], D2 + 0.51];                                  // in the yard, in front of the nest window (and its door)
    const inDoor = [G.pop[0], D2 - 0.3], seatY = NF + 0.005;               // inside the pop door, where the passage has room to turn round;
                                                                            // on the nest she sinks into the straw
    // inside, the nest is too small for a hen to turn round just anywhere without her head or tail going through a wall: she
    // comes along the passage (hall) to beside the nest (pre), turns to the window while stepping over behind the seat (stand:
    // standing there her head is still inside), and only moves forward onto the seat as she sits down (her face at the
    // window); getting up she backs off it again
    const hall = [G.seat[0] - 0.3, D2 - 0.24], pre = [G.seat[0] - 0.2, D2 - 0.26], stand = [G.seat[0], D2 - 0.3];
    const onNest = () => {                                 // forward onto the seat only once she's most of the way down
      const s = this.A.sit, k = smooth01((s - 0.35) / 0.65);
      p.x = G.seat[0]; p.z = stand[1] + (G.seat[1] - stand[1]) * k; p.y = NF + 0.02 + (seatY - NF - 0.02) * s;
    };
    // going through the pop door she stretches her neck out and ducks, from when her head reaches it until she's through
    const atPop = () => p.x < G.inside[0] - 0.05 && p.y > FL - 0.12 && p.z > D2 - 0.36 && p.z < D2 + 0.34;
    switch (L.phase) {
      case 'go': {                                           // across the yard to the foot of the ramp (or below the window)
        if (L.jump && !L.route) L.route = this.plan([launch]);          // a jumper goes round the feeder and the rest to her take-off spot
        const to = L.jump ? (L.route.length > 1 ? L.route[0] : launch) : front, r = this.stepToward(to[0], to[1], dt);
        o.walking = r.walking;
        if (L.jump && r.arrived && L.route.length > 1) { L.route.shift(); break; }
        if (r.arrived || L.t > 25 || (r.blocked && L.t > 4)) {
          if (L.jump && r.blocked && !r.arrived && Math.hypot(p.x - launch[0], p.z - launch[1]) > 0.08) { L.jump = false; L.t = 5; break; }   // can't get there: the ramp
          if (L.jump) { next('aim'); break; }
          next('in'); L.inside = true;
          L.path = [[G.foot[0], G.foot[1], ground], [G.pop[0], G.pop[1], FL], [inDoor[0], inDoor[1], FL], [hall[0], hall[1], FL], [pre[0], pre[1], NF + 0.02]];
        }
        break;
      }
      case 'aim': {                                          // a jumper: faces the window, sizes it up...
        const t = this.turnTo(Math.PI, dt * 1.2); o.walking = t.walking;
        if (t.done && L.t > 0.5) { next('leapin'); L.inside = true; L.to = new THREE.Vector3(G.seat[0], NF + 0.025, D2 - 0.4); }
        break;
      }
      case 'leapin':                                         // ...and jumps straight in at the window, wings beating
        if (this.leap(dt, o, G, 1.0)) { next('turnin'); L.step = 0; }
        break;
      case 'turnin': {                                       // inside: turns round by her left, stepping over that way (where there's
        if (!L.step) {                                       // room) as she turns, then round to face out
          const k = smooth01(L.t / 0.9);
          swing(-Math.PI / 2, k, 1); p.x = L.from.x + (G.seat[0] - 0.2 - L.from.x) * k; p.z = L.from.z + (D2 - 0.34 - L.from.z) * k; o.walking = true;
          if (L.t > 0.9) { L.step = 1; L.t = 0; }
        } else {
          const t = this.turnTo(0, dt * 0.9); o.walking = t.walking;
          if (t.done) next('turn');
        }
        break;
      }
      case 'in': {                                           // up the ramp, in at the pop door (ducking), along inside to the nest
        const r = this.walkPath(dt, L.jump ? 0.5 : 0.75); o.walking = r.walking;
        if (atPop()) o.duck = 1;
        if (r.done) next('turn');
        break;
      }
      case 'turn': {                                         // turn to face out of the window, stepping over behind the seat
        const k = smooth01(L.t / 1.0);
        swing(0, k); p.x = L.from.x + (stand[0] - L.from.x) * k; p.z = L.from.z + (stand[1] - L.from.z) * k;
        p.y = L.from.y + (NF + 0.02 - L.from.y) * k; o.walking = k < 1;
        if (L.t > 1.0) next('settle');
        break;
      }
      case 'unseat': {                                       // getting off the nest: stepping over beside it as she turns to go in
        const k = smooth01(L.t / 1.0);
        swing(-Math.PI / 2, k, -1); p.x = L.from.x + (pre[0] - L.from.x) * k; p.z = L.from.z + (pre[1] - L.from.z) * k;
        p.y = L.from.y + (NF + 0.02 - L.from.y) * k; o.walking = true;
        if (L.t > 1.0) {
          next('out');
          L.path = [[hall[0], hall[1], FL], [inDoor[0] + 0.11, inDoor[1], FL], [G.pop[0], G.pop[1] + 0.02, FL], [G.foot[0], G.foot[1], ground], [front[0], front[1], ground]];
        }
        break;
      }
      case 'settle':                                         // down onto the straw with a wriggle, settling in low (and forward, her
        o.sit = 1; o.brood = 1; o.ruffle = L.t < 1.0 ? 0.45 * Math.sin(L.t / 1.0 * Math.PI) : 0;     // face to the window)
        onNest();
        if (L.t > 1.4) next('sit');
        break;
      case 'sit':                                            // sitting on the nest: now and then a little shuffle and a look out
        o.sit = 1; o.brood = 1; onNest();
        L.shuffle -= dt;
        if (L.shuffle < 0.5 && L.shuffle > 0) o.ruffle = 0.3 * Math.sin(L.shuffle / 0.5 * Math.PI);
        if (L.shuffle <= 0) L.shuffle = 5 + this.r() * 6;
        if (L.t > L.sit) { next('rise'); const n = this.plot.nest; n.count++; n.pop = 0; showEggs(this.plot); }
        break;
      case 'rise': {                                         // she stands, backing off the seat: the new egg is in the straw
        const n = this.plot.nest; n.pop = Math.min(1, L.t / 0.35); showEggs(this.plot); onNest();
        if (L.t > 1.0) {
          if (L.jump) { next('leapout'); L.to = new THREE.Vector3(G.seat[0], ground, D2 + 0.51); L.hh = undefined; break; }
          next('unseat');
        }
        break;
      }
      case 'leapout':                                        // a jumper leaves the way she came: out of the window and down
        if (this.leap(dt, o, G, 1.0)) { L.inside = false; next('sing'); this.plot.nest.by = null; this.answer(); this.rig.indoor(null); }
        break;
      case 'out': {                                          // back inside, out at the pop door and down the ramp
        const r = this.walkPath(dt, 0.8); o.walking = r.walking;
        if (atPop()) o.duck = 1;
        if (p.z > G.foot[1] - 0.05) L.inside = false;
        if (r.done) { L.inside = false; next('sing'); this.plot.nest.by = null; this.answer(); this.rig.indoor(null); }
        break;
      }
      case 'sing': {                                         // "buk buk buk buk ba-KAWK", her head bobbing, notes rising
        const [dur, loud] = SONG[this.pers] || SONG.mum;
        o.sing = Math.min(1, L.t / 0.3) * Math.min(1, (dur - L.t) / 0.3);
        const c = L.t % 1.5, cyc = Math.floor(L.t / 1.5), beats = [0, 0.22, 0.44, 0.66, 0.86];
        beats.forEach((b, i) => { const u = (c - b) / 0.13; if (u >= 0 && u < 1) o.cluck = Math.sin(u * Math.PI) * (i === 4 ? 0.6 : 1) * Math.min(1, loud); });
        if (c >= 0.98 && c < 1.4) o.kawk = Math.sin((c - 0.98) / 0.42 * Math.PI) * Math.min(1, loud);
        const beat = cyc * 6 + (c >= 0.98 ? 5 : beats.filter(b => c >= b).length - 1);
        if (beat !== L.beat && L.t < dur - 0.2) { L.beat = beat; if (beat % 6 === 5 || loud > 0.8 || beat % 2 === 0) spawnNote(this, beat % 6 === 5, loud); }
        if (this.pers === 'diva' && L.t > dur - 0.8) o.flap = Math.sin((L.t - dur + 0.8) / 0.8 * Math.PI);
        if (L.t > dur) this.celebrate();
        break;
      }
    }
    return o;
  }
  answer() {                                                 // the rooster sometimes joins in with a crow
    const roo = this.flock.find(b => b.kind === 'rooster');
    if (roo && !roo.laying && this.r() < 0.55) roo.answerIn = 1.0 + this.r() * 1.2;
  }
  // after the song: each personality has her own way of being pleased with herself
  celebrate() {
    this.laying = null; this.layIn = 240 + this.r() * 240; this.rig.indoor(null); this.shadowY = undefined;
    const Y = PEN.yard, p = this.root.position, cx = (Y.min[0] + Y.max[0]) / 2, cz = (Y.min[2] + Y.max[2]) / 2;
    // the nearest free spot in the yard to (x, z)
    const ok = (x, z) => {
      x = Math.max(Y.min[0] + 0.15, Math.min(Y.max[0] - 0.15, x)); z = Math.max(Y.min[2] + 0.15, Math.min(Y.max[2] - 0.15, z));
      for (let r = 0; r < 1.2; r += 0.08) for (let a = 0; a < 6.28; a += r ? 0.5 / r * 0.08 + 0.3 : 7) {
        const qx = x + Math.cos(a) * r, qz = z + Math.sin(a) * r;
        if (this.free(qx, qz)) return [qx, qz];
      }
      return [cx, cz];
    };
    this.route = null; this.pace = 1; this.proudGoal = 0; this.then = null;
    if (this.pers === 'diva') {            // a slow, proud strut round the yard, chest out and head high, then a shake: ta-da
      this.route = [ok(p.x - 0.45, p.z + 0.35), ok(cx - 0.2, cz + 0.35), ok(cx + 0.35, cz + 0.1), ok(p.x, p.z + 0.25)];
      this.pace = 0.55; this.proudGoal = 1; this.then = { type: 'ruffle', left: 0.75 };
    } else if (this.pers === 'brave') {    // marches round the yard on patrol, stopping to look about
      this.route = [ok(Y.max[0], cz), ok(Y.max[0], Y.max[2], 0), ok(cx, Y.max[2]).concat(0.8), ok(Y.min[0], Y.max[2]).concat(0.8), ok(PEN.gate[0], Y.max[2]).concat(1.0)];
      this.pace = 1.15; this.proudGoal = 0.6; this.then = { type: 'flap', left: 0.9 };
    } else if (this.pers === 'glutton') {  // straight to the feeder for a well-earned snack
      const f = PEN.feeder, a = Math.atan2(cx - f[0], cz - f[2]), at = ok(f[0] + Math.sin(a) * 0.36, f[2] + Math.cos(a) * 0.36);
      this.route = [at, [at[0] - Math.sin(a) * 0.07, at[1] - Math.cos(a) * 0.07]];
      this.pace = 1.3; this.then = { type: 'peck', left: 4.5 };
    } else if (this.pers === 'rebel') {    // a hop and a flap, then a dash to the far corner
      this.hopT = 0; this.act = { type: 'flap', left: 0.8 };
      const far = [[Y.min[0], Y.max[2]], [Y.max[0], Y.max[2]], [Y.min[0], Y.min[2]], [Y.max[0], Y.min[2]]].map(c => ok(c[0], c[1]))
        .sort((a, b) => Math.hypot(b[0] - p.x, b[1] - p.z) - Math.hypot(a[0] - p.x, a[1] - p.z))[0];
      this.route = [far, ok(far[0] * 0.7 + cx * 0.3, far[1] * 0.7 + cz * 0.3)];
      this.pace = 1.9; this.then = { type: 'flap', left: 0.8 };
    } else {                               // a good mum: a contented shake, then back to her chicks
      this.act = { type: 'ruffle', left: 0.75 };
      const chick = this.flock.find(b => b.mum === this);
      if (chick) this.route = [ok(chick.root.position.x + 0.25, chick.root.position.z)];
    }
    if (this.route) { this.route = this.plan(this.route); this.nextLeg(); }
    if (this.act) this.wait = this.act.left;
  }
  // a route that goes round the feeder, the water and the hay: where a leg is blocked, a detour point beside it
  plan(points) {
    const out = []; let a = [this.root.position.x, this.root.position.z];
    for (const b of points) {
      if (!this.clearPath(a[0], a[1], b[0], b[1])) {
        const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
        let m = null;
        for (const d of [0.3, -0.3, 0.5, -0.5, 0.75, -0.75]) {
          const q = [mx + nx * d, mz + nz * d];
          if (this.free(q[0], q[1]) && this.clearPath(a[0], a[1], q[0], q[1]) && this.clearPath(q[0], q[1], b[0], b[1])) { m = q; break; }
        }
        if (!m) continue;                    // no way round: leave that point out
        out.push(m);
      }
      out.push(b); a = b;
    }
    return out;
  }
  nextLeg() {
    const p = this.root.position;
    this.legTime = 0;
    if (this.route && this.route.length) { const n = this.route.shift(); this.target.set(n[0], p.y, n[1]); this.wait = Math.max(this.wait || 0, n[2] || 0); return; }
    this.route = null; this.pace = 1; this.proudGoal = 0;
    if (this.then) { this.act = this.then; this.then = null; this.wait = this.act.left + 0.2; } else this.wait = 0.5 + this.r() * 1.5;
  }
  update(dt) {
    this.phase += dt;
    const A = this.A, k = Math.min(1, dt * 14);
    A.t += dt;
    if (this.hopT >= 0) { this.hopT += dt / 0.8; if (this.hopT >= 1) this.hopT = -1; }        // a hop lasts 0.8 s
    let walking = false, peckGoal = 0, sitGoal = 0, kick = 0, flap = 0, crow = 0, wag = 0, ruffle = 0, song = null;
    // bedtime and getting up (coop birds): already night when the page opens, she's in bed; asleep, nothing to do but wake
    if (this.plot.kind === 'coop' && !this.stay) {
      const night = this.nightNow();
      if (!this.looked) { this.looked = true; if (night && !this.laying) this.sleepNow(); }
      if (this.asleep) { if (night || !doorOpen(this.plot)) return; this.wakeUp(); }          // the door shut: they wait
      else if (night && !this.roost && !this.laying) this.goToBed();
    }
    // time to lay? (hens in a coop, one in the nest box at a time; not just before bedtime)
    if (this.layIn !== undefined && !this.laying && !this.roost && !this.stay && this.plot.nest) {
      this.layIn -= dt;
      if (this.layIn <= 0) { if (!this.plot.nest.by && !this.route && !this.nightNow(0.25)) this.startLaying(); else this.layIn = 8 + this.r() * 12; }
    }
    if (this.route) { this.legTime = (this.legTime || 0) + dt; if (this.legTime > 8) this.nextLeg(); }       // never stuck on a leg
    if (this.answerIn > 0) { this.answerIn -= dt; if (this.answerIn <= 0 && !this.act) { this.act = { type: 'crow', left: 2.0 }; this.wait = Math.max(this.wait, 2.0); } }
    const act = this.act;
    if (this.laying) {
      song = this.layStep(dt);
      walking = song.walking; sitGoal = song.sit; flap = song.flap; ruffle = song.ruffle;
    } else if (this.roost) {
      song = this.roostStep(dt); walking = song.walking;
    } else if (act) {
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
      if (this.wait <= 0 && !this.route) {
        const next = this.acted ? null : this.chooseAct();          // after doing something, she walks on
        this.acted = false;
        if (next && !(next.type !== 'flap' && next.type !== 'crow' && this.tooClose())) { this.act = next; this.wait = 0.4 + this.r() * 1.0; }
        else this.pickTarget();
      }
    } else {
      const p = this.root.position, dx = this.target.x - p.x, dz = this.target.z - p.z, dist = Math.hypot(dx, dz);
      if (dist < 0.04) { if (this.route) this.nextLeg(); else { this.wait = 0.5 + this.r() * 2.0; wag = 1; } }
      else {
        const want = Math.atan2(dx, dz);
        let diff = ((want - this.root.rotation.y + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        const step = this.turn * dt;
        this.root.rotation.y += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
        diff = Math.abs(diff) < step ? 0 : diff - Math.sign(diff) * step;
        const facing = Math.abs(diff) < 25 * DEG;
        if (facing && this.someoneAhead() && !(this.route && this.legTime > 1.2)) this.wait = this.route ? 0.15 : 0.3 + this.r() * 0.6;      // on parade she doesn't wait long
        else if (facing) {
          const fx = Math.sin(this.root.rotation.y), fz = Math.cos(this.root.rotation.y), s = Math.min(this.speed * (this.pace || 1) * dt, dist);
          const nx = p.x + fx * s, nz = p.z + fz * s;
          if ((this.free(nx, nz) && this.clearAhead(nx, nz, this.root.rotation.y)) || !this.free(p.x, p.z)) { p.x = nx; p.z = nz; walking = true; }
          else if (this.route) {                       // on parade: step round whatever is in the way
            for (const da of [0.6, -0.6, 1.1, -1.1, 1.6, -1.6]) {
              const a = this.root.rotation.y + da, sx = p.x + Math.sin(a) * s, sz = p.z + Math.cos(a) * s;
              if (this.free(sx, sz) && this.clearAhead(sx, sz, this.root.rotation.y)) { p.x = sx; p.z = sz; walking = true; break; }
            }
            if (!walking) this.wait = 0.3;
          } else this.wait = 0.5;
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
    const pace = this.pace || 1;
    if (walking) A.phase += dt * this.stepRate * (pace > 1 ? pace : 0.6 + 0.4 * pace);
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
    A.sing = song ? song.sing : 0; A.cluck = song ? song.cluck : 0; A.kawk = song ? song.kawk : 0;
    A.brood = (A.brood || 0) + ((song && song.brood ? 1 : 0) - (A.brood || 0)) * Math.min(1, dt * 3);
    A.duck = (A.duck || 0) + ((song && song.duck ? 1 : 0) - (A.duck || 0)) * Math.min(1, dt * 7);
    A.stretch = (A.stretch || 0) + ((song && song.stretch ? 1 : 0) - (A.stretch || 0)) * Math.min(1, dt * 14);
    if (A.sing > 0) { A.lookYaw *= 0.8; A.lookTilt *= 0.8; }
    A.proud = (A.proud || 0) + ((this.proudGoal || 0) - (A.proud || 0)) * Math.min(1, dt * 3);
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
    const off = b => (b.laying && b.laying.inside) || b.roost || b.asleep;      // on a scripted walk, or in bed
    if (off(flock[i]) || off(flock[j])) continue;
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
  if (inside.open) {                                    // inside: a sideways drag looks along the room
    if (drag && Math.hypot(p.x - p.x0, p.y - p.y0) > 8) drag.moved = true;
    if (drag && drag.moved && pointers.size === 1 && inside.panMax > 0) { inside.pan -= dx * inside.mPerPx; insideFrameCamera(); }
    wake(1000); return;
  }
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
  if (drag && !drag.moved && pointers.size === 0 && performance.now() - p.t0 < 500) (inside.open ? insideTap : tapAt)(e.clientX, e.clientY);
  if (pointers.size < 2) pinch = 0;
  if (pointers.size === 0) drag = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => { e.preventDefault(); if (inside.open) { inside.pan += (e.deltaX || e.deltaY) * inside.mPerPx * 0.5; insideFrameCamera(); wake(1000); return; } zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0016))); wake(1000); }, { passive: false });
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
  if (lineup || foxLineup || geeseLineup) return;
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
  for (const G of [...foxGroups(), ...(farmDog ? [farmDog] : [])]) for (const f of G.foxes) {
    if (!f.root.visible) continue;
    f.root.getWorldPosition(w); s.center.set(w.x, w.y + f.hitY, w.z); s.radius = f.hitR;
    const hit = ray.ray.intersectSphere(s, new THREE.Vector3());
    if (hit) { const d = hit.distanceTo(ray.ray.origin); if (d < bestD) { bestD = d; best = f; } }
  }
  for (const g of [...(geeseLineup ? geeseLineup.geese : []), ...(geeseFlock ? geeseFlock.geese : [])]) {
    if (!g.root.visible) continue;
    g.root.getWorldPosition(w); s.center.set(w.x, w.y + g.hitY, w.z); s.radius = g.hitR;
    const hit = ray.ray.intersectSphere(s, new THREE.Vector3());
    if (hit) { const d = hit.distanceTo(ray.ray.origin); if (d < bestD) { bestD = d; best = g; } }
  }
  for (const p of livePlots()) for (const b of p.birds) {
    if (!b.root.visible) continue;                       // in bed
    b.root.getWorldPosition(w);
    s.center.set(w.x, w.y + b.hitY, w.z); s.radius = b.hitR;
    const hit = ray.ray.intersectSphere(s, new THREE.Vector3());
    if (hit) { const d = hit.distanceTo(ray.ray.origin); if (d < bestD) { bestD = d; best = b; } }
  }
  if (!best) {
    const loc = new THREE.Ray(), inv = new THREE.Matrix4(), hitP = new THREE.Vector3(), nb = new THREE.Box3();
    // a coop's pop door (or the badge over it): shut it for the night, open it in the morning
    for (const p of livePlots()) {
      if (!p.door) continue;
      const bd = p.door.badge;
      if (bd && bd.visible && ray.ray.intersectSphere(new THREE.Sphere(bd.position, bd.scale.x * 0.62), hitP)) { doorTap(p); return; }
      const G = nestOf(p);
      nb.min.set(G.pop[0] - 0.22, G.house - 0.06, D2 - 0.12); nb.max.set(G.pop[0] + 0.22, G.house + POP_H + 0.08, D2 + 0.3);
      loc.copy(ray.ray).applyMatrix4(inv.copy(p.frame.matrixWorld).invert());
      if (loc.intersectBox(nb, hitP)) { doorTap(p); return; }
    }
    // a coop whose birds are in bed: go inside and see them asleep
    for (const p of livePlots()) {
      if (!anyAsleep(p)) continue;
      nb.min.set(-0.72, 0, -0.52); nb.max.set(0.72, 1.6, 0.6);
      loc.copy(ray.ray).applyMatrix4(inv.copy(p.frame.matrixWorld).invert());
      if (loc.intersectBox(nb, hitP)) { openInside(p); return; }
    }
    // a coop's nest box: collect the eggs
    for (const p of livePlots()) {
      if (!p.nest) continue;
      const G = nestOf(p), w = G.win;                       // the nest window (and a little round it)
      nb.min.set(w[0] - w[3] / 2 - 0.06, w[1] - 0.06, 0.3); nb.max.set(w[0] + w[3] / 2 + 0.06, w[2] + 0.06, 0.56);
      loc.copy(ray.ray).applyMatrix4(inv.copy(p.frame.matrixWorld).invert());
      if (!loc.intersectBox(nb, hitP)) continue;
      const n = p.nest, sitting = n.by && n.by.laying && n.by.laying.inside;
      if (sitting) tag.textContent = n.by.name + ' is laying…';
      else if (n.count) { tag.textContent = n.count === 1 ? 'Collected 1 egg' : 'Collected ' + n.count + ' eggs'; n.count = 0; showEggs(p); }
      else tag.textContent = 'No eggs yet';
      tagBird = null; tagSpot.set(G.seat[0], G.win[2] + 0.12, 0.44); p.frame.localToWorld(tagSpot); tag.classList.add('on'); fieldTag = 2.8;
      return;
    }
    // the wheat field: show its next growing stage
    const g = new THREE.Vector3();
    if (wheatField.inverse && ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), g)) {
      g.applyMatrix4(wheatField.inverse);
      if (Math.abs(g.x) < wheatField.half[0] && Math.abs(g.z) < wheatField.half[1]) {
        const next = WHEAT_STAGES[(WHEAT_STAGES.indexOf(wheatField.stage) + 1) % 4];
        setWheat(next);
        tagBird = null; tag.textContent = 'Wheat field · ' + WHEAT_NAMES[next]; tag.classList.add('on'); fieldTag = 2.8; tagSpot.copy(wheatField.centre);
      }
    }
    return;
  }
  if (best.fam) best.fam.tapped(best); else if (best.isGoose) best.tapped(VIEW_DIR); else best.tapped();
  if (best.role === 'dog') dogTapped();
  tagBird = best; tagLeft = 2.8;
  tag.textContent = best.label;
  tag.classList.add('on');
}
let fieldTag = 0;
const tagSpot = new THREE.Vector3();          // where a label that isn't a bird's stands (the wheat field, a nest box)
function placeTag(dt) {
  if (!tagBird && fieldTag <= 0) return;
  const v = new THREE.Vector3();
  if (!tagBird) {                               // the wheat field's label, over the field
    fieldTag -= dt;
    if (fieldTag <= 0) { tag.classList.remove('on'); return; }
    v.copy(tagSpot).project(inside.open ? inside.camera : camera);
    moveTag(v);
    return;
  }
  fieldTag = 0;
  tagLeft -= dt;
  if (tagLeft <= 0) { tag.classList.remove('on'); tagBird = null; return; }
  tagBird.root.getWorldPosition(v); v.y += tagBird.tagY || (tagBird.kind === 'chick' ? 0.3 : 0.55); v.project(inside.open ? inside.camera : camera);
  moveTag(v);
}
function moveTag(v) {          // v: the spot on screen (-1..1) the label stands on; kept on screen, and inside never over the title
  const W = canvas.clientWidth, hw = tag.offsetWidth / 2 + 6;
  let y = (1 - v.y) / 2 * canvas.clientHeight, x = (v.x + 1) / 2 * W;
  if (inside.open) y = Math.max(y, insideEls.title.getBoundingClientRect().bottom + 8 + tag.offsetHeight);
  if (W > 2 * hw) x = Math.max(hw, Math.min(W - hw, x));
  tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
}

const hintEl = document.getElementById('hint');
function hint(t) { hintEl.textContent = t; hintEl.classList.add('on'); setTimeout(() => hintEl.classList.remove('on'), 4500); }

// ------------------------------------------------------------------ inside a coop at night
// Tap a coop while its birds are in bed and you're inside (a little room in the coop's own style): the hens and the rooster
// asleep in a row on the perch, heads tucked in, the chicks curled up in the straw by the nest boxes, a lantern turned low,
// the night sky in the window, the odd "z" floating up. Tap a bird and she wakes for a cuddle (hearts), then dozes off
// again; tap the nest boxes to collect the eggs. "Back to the farm", or the time to get up, brings you out again.
const STYLE_NAMES = { rir: 'Red Barn', orp: 'Thatched Cottage', leg: 'Stone Cottage', bra: 'Timber Lodge', sil: 'Pagoda Coop' };
const inside = { open: false, busy: false, plot: null, scene: null, camera: null, rooms: null, rooms3d: {}, birds: [], saved: [], eggs: null, fx: [], zIn: 0.6, pan: 0, panMax: 0, mPerPx: 0.002, hinted: false };
const insideEls = { top: document.getElementById('inside-top'), title: document.getElementById('inside-title'), back: document.getElementById('inside-back'), fade: document.getElementById('fade') };
insideEls.back.addEventListener('click', () => closeInside());
function fxTexture(draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'); draw(c);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildInside() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#121826');
  inside.hemi = new THREE.HemisphereLight(new THREE.Color('#566aa0'), new THREE.Color('#2e2418'), 1.25);
  inside.lamp = new THREE.PointLight('#ffb35e', 2.6, 3.4, 1.3);
  inside.moon = new THREE.DirectionalLight('#9fb6ff', 1.1);
  sc.add(inside.hemi, inside.lamp, inside.moon, inside.moon.target);
  inside.group = new THREE.Group(); sc.add(inside.group);
  inside.scene = sc;
  inside.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
  inside.zTex = fxTexture(c => { c.font = 'bold 50px Fredoka, Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = 'rgba(30,40,70,0.9)'; c.strokeText('z', 32, 34); c.fillStyle = '#e8eeff'; c.fillText('z', 32, 34); });
  inside.heartTex = fxTexture(c => { c.fillStyle = '#ff6b8a'; c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(4, 34, 10, 8, 32, 22); c.bezierCurveTo(54, 8, 60, 34, 32, 54); c.fill(); c.lineWidth = 3; c.strokeStyle = '#fff4f6'; c.stroke(); });
}
// The camera: the room's full height; across, the whole room on a wide screen, about a metre of it on a phone held upright,
// where a sideways drag looks along it (from the perch to the nest boxes)
function insideFrameCamera() {
  const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight, a = w / Math.max(1, h);
  const cam = inside.camera, half = Math.tan(cam.fov / 2 * DEG);
  const whole = Math.max(0.81 / (half * a), 0.58 / half);
  const d = Math.min(whole, Math.max(0.52 / (half * a), 0.58 / half));
  inside.panMax = Math.max(0, 0.78 - (d - 0.45) * half * a);
  inside.pan = Math.max(-inside.panMax, Math.min(inside.panMax, inside.pan));
  const el = Math.min(13 * DEG, Math.asin(Math.min(1, 0.42 / d)));             // looking down a little, from under the ceiling
  // towards either end the view turns a little to that side wall (the pop door and window on the left, the nest boxes' side)
  const yaw = inside.panMax > 0.01 ? -(inside.pan / inside.panMax) * 34 * DEG : 0;
  const look = new THREE.Vector3(inside.pan, 0.5, -0.06), dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(el), Math.sin(el), Math.cos(yaw) * Math.cos(el));
  cam.aspect = a; cam.position.copy(look).addScaledVector(dir, d); cam.lookAt(look); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  inside.dist = d; inside.mPerPx = 2 * d * half / h;
  // fur and fluff as fine as the birds are big on screen here
  setFar(false); setFurDetail(renderer.getPixelRatio() * h / (2 * d * half), QUALITY[q].fur);
}
function anyAsleep(p) { return p.kind === 'coop' && p.birds.some(b => b.asleep); }
function openInside(plot) {
  if (inside.open || inside.busy) return;
  if (nightVisit && nightVisit.active() && nightVisit.target === plot) {
    const G = nestOf(plot); tag.textContent = nightVisit.T('atDoor'); tagBird = null; tag.classList.add('on'); fieldTag = 2.4;
    tagSpot.set(G.pop[0], G.house + POP_H + 0.12, D2 + 0.1); plot.frame.localToWorld(tagSpot); return;
  }
  if (!inside.scene) buildInside();
  inside.busy = true; inside.morning = false; insideEls.fade.classList.add('on'); tag.classList.remove('on'); tagBird = null; fieldTag = 0;
  setTimeout(() => {
    const style = plot.breed, R = inside.rooms[style];
    let room = inside.rooms3d[style];
    if (!room) { room = part('inside_' + style); room.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; } }); inside.rooms3d[style] = room; }
    inside.group.add(room);
    if (!inside.popDoor && parts.inside_pop) inside.popDoor = part('inside_pop');
    if (inside.popDoor) { inside.group.add(inside.popDoor); placeInsideDoor(plot, R); }
    inside.lamp.position.set(...R.lamp).add(new THREE.Vector3(0, -0.05, 0.06));
    inside.moon.position.set(R.window[0] - 1.5, R.window[1] + 0.9, R.window[2] + 0.4); inside.moon.target.position.set(0.1, 0.3, -0.1);
    // the sleepers: up to three hens along the lower bar; the rooster and the other hens on the top bar in the gaps between
    // them, so every one shows; anyone left over beds down in the straw in front; the chicks in their corner by the nest boxes
    const sleepers = plot.birds.filter(b => b.asleep), adults = sleepers.filter(b => b.kind !== 'chick'), chicks = sleepers.filter(b => b.kind === 'chick');
    const roo = adults.filter(b => b.kind === 'rooster'), hens = adults.filter(b => b.kind !== 'rooster');
    const low = R.perches[0], high = R.perches[1], mid = (low.x0 + low.x1) / 2, gap = 0.29;
    const lowBirds = hens.slice(0, 3), rest = [...roo, ...hens.slice(3)];
    const c = lowBirds.length, gaps = c === 2 ? [0, -1, 1] : c === 0 ? [0, -1, 1, -2, 2] : [0.5, -0.5, 1.5, -1.5];
    const highBirds = rest.slice(0, gaps.length - (c === 0 ? 2 : 0)), floor = rest.slice(highBirds.length);
    const spots = [];
    lowBirds.forEach((b, i) => spots.push([b, mid + (i - (c - 1) / 2) * gap, low.top, low.z]));
    highBirds.forEach((b, i) => spots.push([b, Math.max(high.x0, Math.min(high.x1, mid + gaps[i] * gap)), high.top, high.z]));
    floor.forEach((b, i) => spots.push([b, -0.24 + (i % 3) * 0.27, 0.03, 0.08 + Math.floor(i / 3) * 0.06]));
    chicks.forEach((b, i) => spots.push([b, R.chicks[0] + (i - (chicks.length - 1) / 2) * 0.12, R.chicks[1] + 0.02, R.chicks[2] + (i % 2) * 0.05]));
    inside.saved = []; inside.birds = [];
    for (const [b, x, y, z] of spots) {
      inside.saved.push({ b, parent: b.root.parent, pos: b.root.position.clone(), rot: b.root.rotation.y });
      inside.group.add(b.root); b.root.position.set(x, y, z); b.root.rotation.y = (b.kind === 'chick' ? 0.4 * (b.r() - 0.5) : 0);
      b.root.visible = true; b.rig.indoor(null); b.rig.sleepy(true); b.woken = 0;
      const A = b.A; A.walk = 0; A.peck = 0; A.flap = 0; A.crow = 0; A.kick = 0; A.ruffle = 0; A.turn = 0; A.sing = 0; A.cluck = 0; A.kawk = 0;
      A.proud = 0; A.duck = 0; A.stretch = 0; A.hopT = -1; A.sit = 1; A.brood = 1; A.sleep = 1; A.lookYaw = 0; A.lookTilt = 0;
      inside.birds.push(b);
    }
    // the eggs in the nest boxes, three to a box
    const n = Math.min(6, plot.nest.count);
    if (!inside.eggs || inside.eggs.material !== plot.nest.eggs.material) {
      if (inside.eggs) inside.eggs.removeFromParent();
      inside.eggs = new THREE.InstancedMesh(EGG_GEO, plot.nest.eggs.material, 6); inside.group.add(inside.eggs);
    }
    const m = new THREE.Matrix4(), qn = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const box = R.nests[i % 2], k = Math.floor(i / 2);
      m.compose(new THREE.Vector3(box[0] + (k - 1) * 0.055, box[1] + 0.035, box[2] + (k % 2 ? 0.03 : -0.02)), qn.setFromEuler(e.set(1.25, i * 1.7, 0.2)), new THREE.Vector3(0.05, 0.064, 0.05));
      inside.eggs.setMatrixAt(i, m);
    }
    inside.eggs.count = n; inside.eggs.instanceMatrix.needsUpdate = true; inside.eggs.computeBoundingSphere();
    inside.plot = plot; inside.open = true; inside.busy = false;
    inside.pan = -0.08; insideFrameCamera();
    insideEls.title.textContent = `Inside the ${STYLE_NAMES[style]} · ${sleepers.length} asleep`;
    insideEls.top.hidden = false; insideEls.back.hidden = false; document.body.classList.add('inside');
    applyDaylight(clockHour());
    insideEls.fade.classList.remove('on'); wake(800);
    if (inside.panMax > 0.05 && !inside.hinted) { inside.hinted = true; hint('Drag sideways to look around the coop'); }
  }, 300);
}
function closeInside(note) {
  if (!inside.open || inside.busy) return;
  inside.busy = true; insideEls.fade.classList.add('on'); tag.classList.remove('on'); tagBird = null; fieldTag = 0;
  setTimeout(() => {
    for (const s of inside.saved) {
      s.parent.add(s.b.root); s.b.root.position.copy(s.pos); s.b.root.rotation.y = s.rot;
      s.b.root.visible = !s.b.asleep; s.b.A.sleep = 0; s.b.rig.sleepy(false);
    }
    for (const f of inside.fx) f.sprite.removeFromParent();
    inside.fx = []; inside.birds = []; inside.saved = [];
    inside.group.clear(); inside.eggs = null;
    showEggs(inside.plot);
    inside.open = false; inside.busy = false; inside.plot = null;
    insideEls.top.hidden = true; insideEls.back.hidden = true; document.body.classList.remove('inside');
    applyGrass(); placeCamera(); applyDaylight(clockHour());
    insideEls.fade.classList.remove('on'); wake(800);
    if (note) hint(note);
  }, 300);
}
function insideFx(tex, at, life, size, rise, drift) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.position.copy(at); sp.scale.setScalar(0.001); sp.renderOrder = 3; inside.scene.add(sp);
  inside.fx.push({ sprite: sp, t: 0, life, size, rise, drift });
}
function updateInside(dt) {
  // morning: out they go once the door is open (shut, a hint to open it, once)
  if (inside.birds.length && inside.birds.every(b => !b.nightNow())) {
    if (doorOpen(inside.plot)) { closeInside('Good morning! Everyone is getting up.'); return; }
    if (!inside.morning) { inside.morning = true; hint('Morning! Tap the pop door to let them out.'); }
  }
  placeInsideDoor(inside.plot, inside.rooms[inside.plot.breed]);
  const v = new THREE.Vector3();
  for (const b of inside.birds) {
    const A = b.A, awake = b.woken > 0;
    b.woken -= dt;
    A.t += dt; A.dt = dt;
    A.sleep += ((awake ? 0 : 1) - A.sleep) * Math.min(1, dt * (awake ? 5 : 1.2));
    A.brood += ((awake ? 0.3 : 1) - A.brood) * Math.min(1, dt * 3);
    A.ruffle = awake && b.woken > 1.6 ? 0.35 * Math.sin((2.2 - b.woken) / 0.6 * Math.PI) : 0;
    A.lookYaw = awake ? 0.25 * Math.sin(A.t * 1.3) : 0;
    if (awake ? A.sleep < 0.6 : A.sleep > 0.75) b.rig.sleepy(!awake);           // eyes open as she wakes, shut as she dozes off
    b.rig.pose(A);
  }
  // now and then a "z" floats up from a sleeper
  inside.zIn -= dt;
  if (inside.zIn <= 0 && inside.birds.length) {
    inside.zIn = 0.7 + Math.random() * 0.9;
    const sleepers = inside.birds.filter(b => b.woken <= 0);
    if (sleepers.length) {
      const b = sleepers[Math.floor(Math.random() * sleepers.length)];
      b.root.getWorldPosition(v); v.y += b.rig.scale * (b.kind === 'chick' ? 0.7 : 0.62); v.x += 0.04;
      insideFx(inside.zTex, v, 2.4, b.kind === 'chick' ? 0.06 : 0.085, 0.16, 0.08);
    }
  }
  for (let i = inside.fx.length - 1; i >= 0; i--) {
    const f = inside.fx[i]; f.t += dt;
    const u = f.t / f.life;
    if (u >= 1) { f.sprite.removeFromParent(); inside.fx.splice(i, 1); continue; }
    f.sprite.position.y += f.rise * dt / f.life * 1.6; f.sprite.position.x += Math.sin(f.t * 2.2) * f.drift * dt;
    f.sprite.scale.setScalar(f.size * Math.min(1, u * 5) * (1 + 0.4 * u));
    f.sprite.material.opacity = Math.min(1, (1 - u) * 2.5, (0.97 - f.sprite.position.y) / 0.12);       // gone before the ceiling
  }
}
function placeInsideDoor(plot, R) {           // inside, the pop door's panel slides up in its guides to open
  if (!inside.popDoor || !R.pop) return;
  inside.popDoor.position.set(R.pop[0], R.pop[1] + doorEase(plot.door ? plot.door.s : 1) * (R.pop_h + 0.02), R.pop[2]);
}
function insideTap(x, y) {
  ndc.set(x / canvas.clientWidth * 2 - 1, -(y / canvas.clientHeight) * 2 + 1);
  ray.setFromCamera(ndc, inside.camera);
  let best = null, bestD = Infinity;
  const s = new THREE.Sphere(), w = new THREE.Vector3();
  for (const b of inside.birds) {
    b.root.getWorldPosition(w); s.center.set(w.x, w.y + b.hitY * 0.8, w.z); s.radius = b.hitR;
    const hit = ray.ray.intersectSphere(s, new THREE.Vector3());
    if (hit) { const d = hit.distanceTo(ray.ray.origin); if (d < bestD) { bestD = d; best = b; } }
  }
  if (best) {                                             // a sleepy cuddle: she wakes, shakes her feathers, hearts, dozes off again
    best.woken = 2.2;
    const v = best.root.getWorldPosition(new THREE.Vector3()); v.y += best.rig.scale * 0.7;
    for (let k = 0; k < 4; k++) setTimeout(() => inside.open && insideFx(inside.heartTex, v.clone().add(new THREE.Vector3((k - 1.5) * 0.05, 0, 0)), 1.6, 0.09, 0.28, 0.05), k * 180);
    tagBird = best; tagLeft = 2.6; tag.textContent = best.label + ' · sleepy'; tag.classList.add('on');
    return;
  }
  // the nest boxes: collect the eggs
  const R = inside.rooms[inside.plot.breed], hitP = new THREE.Vector3(), box = new THREE.Box3();
  if (R.pop) {                                            // the pop door: shut it (everyone's in) or open it
    box.min.set(R.pop[0] - 0.1, R.pop[1] - 0.02, R.pop[2] - 0.2); box.max.set(R.pop[0] + 0.12, R.pop[1] + 2 * R.pop_h + 0.06, R.pop[2] + 0.2);      // the opening, and the door raised over it
    if (ray.ray.intersectBox(box, hitP)) { doorTap(inside.plot, new THREE.Vector3(R.pop[0] + 0.1, R.pop[1] + R.pop_h + 0.12, R.pop[2])); return; }
  }
  for (const nb of R.nests) {
    box.min.set(nb[0] - 0.12, nb[1] - 0.1, nb[2] - 0.2); box.max.set(nb[0] + 0.12, nb[1] + 0.22, nb[2] + 0.16);
    if (!ray.ray.intersectBox(box, hitP)) continue;
    const n = inside.plot.nest;
    tag.textContent = n.count ? (n.count === 1 ? 'Collected 1 egg' : 'Collected ' + n.count + ' eggs') : 'No eggs here';
    n.count = 0; if (inside.eggs) inside.eggs.count = 0;
    tagBird = null; tagSpot.set(nb[0], nb[1] + 0.3, nb[2]); tag.classList.add('on'); fieldTag = 2.4;
    return;
  }
}

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
  if (!frozen) { for (const p of livePlots()) { if (p === inside.plot) continue; for (const b of p.birds) b.update(dt); if (p.kind === 'coop') separate(p.birds, dt); for (const b of p.birds) placeBlob(b); } tickNotes(dt); tickDoors(dt, now); tickFoxes(dt); if (foxGroups().length) wake(100); }
  placeTag(dt); tickDogBtn(dt);
  if (!frozen) WIND.time.value = now / 1000;
  if (now - (DAY.lastSet || 0) > 250) { DAY.lastSet = now; applyDaylight(clockHour()); }      // the light follows the clock
  if (inside.open) { updateInside(dt); renderer.render(inside.scene, inside.camera); }
  else renderer.render(scene, camera);
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
  wheat: (stage) => setWheat(stage), field: () => wheatField, wind: (t) => { WIND.time.value = t; },
  freeze: (on) => { frozen = on; },
  pause: (on) => { paused = on; },                         // tests: stop drawing (the test browser draws slowly) and draw once on demand
  draw: () => { for (const p of plots) for (const b of p.birds) placeBlob(b); placeTag(0); renderer.render(scene, camera); },
  step: (dt, n) => { for (let i = 0; i < n; i++) { for (const p of plots) if (p.birds.length) { for (const b of p.birds) b.update(dt); if (p.kind === 'coop') separate(p.birds, dt); for (const b of p.birds) placeBlob(b); } tickNotes(dt); tickDoors(dt); tickFoxes(dt); } placeTag(dt * n); wake(300); },
  foxes: () => foxes, foxLineup: () => foxLineup, dog: () => farmDog, kennel: KENNEL_AT, kennelName: () => kennelBoard && kennelBoard.mesh.userData.name, dogName: () => dogName, setDogName, cleanName, geeseLineup: () => geeseLineup, geese: () => geeseFlock, nav: () => navGrid(), visit: () => nightVisit, onBridge, penObstacles: () => PEN.obstacles,
  doorTap, setDoor, doors: DOORS,
  // tests: the first free hen of a pen goes to lay now (sitting for `sit` seconds); every other hen waits
  layNow: (i, sit) => { const pl = plots[i]; for (const b of pl.birds) if (b.layIn !== undefined) b.layIn = 1e9; const h = pl.birds.find(b => b.kind === 'hen' && !b.laying); h.startLaying(sit); return h.name + ' (' + h.pers + ')'; },
  layAs: (i, pers, sit) => { const pl = plots[i]; for (const b of pl.birds) if (b.layIn !== undefined) b.layIn = 1e9; const h = pl.birds.find(b => b.kind === 'hen' && !b.laying); h.pers = pers; h.startLaying(sit); return h.name; },
  noLaying: () => { for (const b of allBirds) if (b.layIn !== undefined) b.layIn = 1e9; },
  nestOf, showEggs,
  // tests: set the hour (0-24) the light shows, or undefined for the clock again
  setHour: (h) => { DAY.override = h; DAY.shadowAt = 0; applyDaylight(clockHour()); }, day: DAY,
  inside, openInside, closeInside, insideTap, drawInside: () => { updateInside(1 / 30); placeTag(1 / 30); renderer.render(inside.scene, inside.camera); },
  stepInside: (dt, n) => { for (let k = 0; k < n && inside.open; k++) updateInside(dt); placeTag(dt * n); if (inside.open) renderer.render(inside.scene, inside.camera); },
};
start().catch(err => {
  console.error(err);
  loading.querySelector('.msg').textContent = 'The village could not load. Check your connection and try again.';
});

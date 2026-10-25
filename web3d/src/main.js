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
import { initBeasts, DogLineup, FoxFamily, FoxLineup, PosterDog } from './beasts.js';
import { initGeese, GeeseLineup, GeeseFlock, DuckLineup, Goose, LINE as GOOSE_POSE } from './geese.js';
import { NavGrid, NightVisit } from './nightvisit.js';
import { Replay, REPLAY_TEXT } from './replay.js';
import { FrogLineup, FrogPond } from './pond.js';
import { DuckFlock } from './ducks.js';
import { initFarmer, FarmerLineup, FARMER_NAME, Farmer, loadOutfit, outfitLoaded } from './farmer.js';
import { FarmLife } from './farmlife.js';
import { Corn } from './penvisit.js';
import { DecorLife } from './decorlife.js';
import { Game, NEST_MAX, SIT_MS, GROW_MS, YOUNG_MS, HOME_COOP, DECOR, WHEAT, GUIDE } from './game.js';
import { GameUI } from './gameui.js';
import { loadShow, ShowLineup, SHOW } from './showground.js';
import { ShowDay } from './showday.js';

const MODELS = './models/';
// each published version asks for its own copies of the models (?v=...), so a phone never mixes an old model kept from an
// earlier visit with new code
const BUST = typeof __BUST__ !== 'undefined' ? '?v=' + __BUST__ : '';
const VERSION = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'test';      // when this version was published (shown with the details)
const params = new URLSearchParams(location.search);
// ---- the game (play.html, body.game): the farm comes from the player's save (game.js) and its screens (gameui.js); the
// test page (index.html) shows the whole village. In the game the geese, the dog and the decorations are bought, so a new
// farm has none of them yet; the fox doesn't visit before the geese can be bought.
const GAME_MODE = document.body.classList.contains('game');
const game = GAME_MODE ? new Game() : null;
let gameUI = null;
const POSTER = params.has('poster');                     // (the welcome picture's stage: its own cast, nobody else about)
const HAS_GEESE = !GAME_MODE && !POSTER, HAS_DOG = !GAME_MODE && !POSTER, HAS_DECOR = !GAME_MODE && !POSTER;
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
// the game played sideways first (Audrey, 24 Oct): held sideways the farm comes a little closer (its views, and how near
// and far a pinch goes), so it fills the shorter height as it fills the width upright; turning the phone swaps it over
const SIDE_K = 0.7, sideways = () => window.innerWidth > 1.25 * window.innerHeight;
let wasSide = null;
function sideScale(k) { view.size *= k; view.min *= k; view.max *= k; }

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
  DAY.glow.value = mix(9); lampPools.update(); WATER_DAY.value = Math.max(0, 1 - DAY.glow.value * 1.4);
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
  if (GAME_MODE && wasSide !== null && sideways() !== wasSide) { wasSide = !wasSide; sideScale(wasSide ? SIDE_K : 1 / SIDE_K); applyGrass(); }
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
  let welcome = null;
  if (GAME_MODE) {
    loading.querySelector('.msg').textContent = game.t('loading');
    gameUI = new GameUI(game, { version: VERSION, bust: BUST, reload: () => location.reload(), say: t => hint(t), loaded: () => { try { sessionStorage.setItem('ff3d.loaded', '1'); } catch (e) { /* */ } location.reload(); }, onClose: gameSheetClosed, coops: () => coopsSheet(), shop: () => shopSheet(), outfit: () => dressFarmer(), shows: () => showsSheet(), jobs: () => jobsSheet(), cuddle: id => gameCuddle(id), cuddleState: () => farmerAsleep() ? 'night' : 'ok' });
    if (!game.data) welcome = gameUI.welcome();          // (a new farm: who's farming, while the farm loads)
  }
  const fieldsP = GAME_MODE ? loadJSON('fields.json') : null;          // (the game's fields: fields.py)
  const [farm, flock, village, plan, pen, meadow, flockInfo, coopsGlb, coopsInfo, , insideGlb, insideInfo, beastsGlb, beastsInfo, faunaGlb, geeseGlb, geeseInfo, farmerGlb, farmerInfo, decorGlb, decorInfo] = await Promise.all([loadGLB('plants.glb'), loadGLB('flock.glb'),
    loadGLB('village.glb'), loadJSON('village.json'), loadJSON('layout.json'), loadImage('meadow.jpg'), loadJSON('flock.json'), loadGLB('coops.glb'),
    loadJSON('coops.json'), new THREE.TextureLoader().loadAsync(MODELS + 'silkie_hair.jpg' + BUST).then(setHairTexture), loadGLB('interiors.glb'), loadJSON('interiors.json'),
    loadGLB('beasts.glb'), loadJSON('beasts.json'), loadGLB('fauna.glb'), loadGLB('geese.glb'), loadJSON('geese.json'), loadGLB('farmer.glb'), loadJSON('farmer.json'), loadGLB('decor.glb'), loadJSON('decor.json')]);
  if (welcome) game.newFarm(await welcome);
  if (GAME_MODE) { LANG = game.lang; FARMER_LOOK = game.data.farmer.look; document.documentElement.lang = LANG; }
  V = plan; PEN = pen; COOPS = coopsInfo;
  tagNature();
  if (GAME_MODE) {                                         // the game: its fields; no set places for coops, so no little paths to them
    FIELDS = await fieldsP;
    V.paths = V.paths.filter(l => l.length > 3);
    V.props = V.props.filter(p => p.model !== 'wheat_field');      // (the village's wheat field: the farm has its own, on its land)
    fillPlotGaps();
    const near = (x, z) => V.paths.some(l => { for (let i = 1; i < l.length; i++) { const a = l[i - 1], b = l[i], dx = b[0] - a[0], dz = b[2] - a[2], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / L)); if (Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t) < V.pathHalf + 0.6) return true; } return false; });
    V.pebbles = V.pebbles.filter(q => near(q[0], q[2]));
  }
  inside.rooms = Object.fromEntries(Object.entries(insideInfo.rooms).map(([k, v]) => [k.replace('inside_', ''), v]));
  // the straw nest in the yard has moved into the coop's nest box: its spot is free again
  PEN.obstacles = PEN.obstacles.filter(o => Math.hypot(o[0] - PEN.nest[0], o[2] - PEN.nest[2]) > 1e-3);
  initFlock(flock, flockInfo); initBeasts(beastsGlb, beastsInfo); initGeese(geeseGlb, geeseInfo); initFarmer(farmerGlb, farmerInfo);
  for (const g of [farm, village, coopsGlb, insideGlb, faunaGlb, decorGlb]) {
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
  placeDecor(decorInfo);
  if (GAME_MODE && DECOR_INFO) DECOR_INFO.foot.wheat = [-2.25, -1.25, 2.25, 1.25];      // (the wheat field's footprint: its bed)
  if (GAME_MODE) { settleCoops(); settleDecor(); hidePebbles(); }        // (each coop and decoration where it can stand, what's under it cleared)
  buildProps(); if (GAME_MODE) syncDecor(); else buildDecor();
  buildNature();
  buildPlots(Math.max(0, Math.min(40, parseInt(params.get('coops') || '10', 10))));
  if (params.has('lineup') && !['foxes', 'geese', 'dog', 'frogs', 'ducks', 'farmer', 'show'].includes(params.get('lineup'))) buildLineup();
  if (params.get('lineup') === 'geese') geeseLineup = new GeeseLineup(scene, villageCentre().add(new THREE.Vector3(32, 0, 32)), 45 * DEG, rng(41));
  if (params.get('lineup') === 'ducks') { geeseLineup = new DuckLineup(scene, villageCentre().add(new THREE.Vector3(32, 0, 32)), 45 * DEG, nightGrade, rng(42)); view.min = 0.5; }
  if (params.get('lineup') === 'farmer') { farmerLineup = new FarmerLineup(scene, villageCentre().add(new THREE.Vector3(32, 0, 32)), 45 * DEG, nightGrade, rng(44), parseInt(params.get('set') || '1', 10)); view.min = 0.4; }
  if (farmerLineup) await farmerLineup.dress(loadGLB, loadJSON);          // (its outfits: &set=4, &outfit=, &wear=)
  if (params.get('lineup') === 'frogs') { frogLineup = new FrogLineup(scene, villageCentre().add(new THREE.Vector3(32, 0, 32)), 45 * DEG, nightGrade, rng(43)); view.min = 0.4; }
  if (params.get('lineup') === 'show') { await loadShow(loadGLB, loadJSON); new ShowLineup({ scene, centre: villageCentre().add(new THREE.Vector3(32, 0, 32)), grade: nightGrade, newBird: (...a) => new Bird(...a), plots, allBirds, r: rng(45), params }); view.min = 0.4; }
  if (POSTER) buildPoster(beastsInfo.joints);
  buildFoxes(beastsInfo.joints);
  buildGeese();
  buildDog(beastsInfo.joints);
  buildFarmer();
  if (GAME_MODE) await dressFarmer();                     // (in the outfit last worn)
  beastJoints = beastsInfo.joints; setupReplay();
  if (allBirds.length) makeBlobs();
  buildGrass();
  addLampPools();
  gradeScene(); setMaterialHook(nightGrade);           // the night colours, also for materials made later (a laying hen's own)
  for (const k in parts) if (k.startsWith('inside_')) parts[k].traverse(o => { if (o.material) for (const m of [].concat(o.material)) nightGrade(m); });
  applyDaylight(clockHour());
  const s = V.plots[0].pos;
  view.target.set(s[0], 0, s[2]).add(new THREE.Vector3(0.6, 0, -1.2));
  view.size = 4.4;
  if (GAME_MODE) {                                       // the game: your first coop, its house and pen
    const home = plots.find(p => p.kind === 'coop' && p.frame);
    if (home) { const c = home.frame.localToWorld(new THREE.Vector3(-0.1, 0, 0.85)); view.target.set(c.x, 0, c.z); view.size = 2.9; }
    wasSide = sideways(); if (wasSide) sideScale(SIDE_K);
  }
  if (lineup) { view.target.copy(lineup.centre); view.size = 2.2; }
  if (foxLineup) { foxLineup.group.updateMatrixWorld(true); view.target.copy(foxLineup.group.localToWorld(new THREE.Vector3(0, 0, -0.1))); view.size = 2.35; }
  if (geeseLineup && params.get('lineup') === 'ducks') { geeseLineup.group.updateMatrixWorld(true); view.target.copy(geeseLineup.group.localToWorld(new THREE.Vector3(0, 0, 0.5))); view.size = 1.58; }
  else if (geeseLineup) { geeseLineup.group.updateMatrixWorld(true); view.target.copy(geeseLineup.group.localToWorld(new THREE.Vector3(0, 0, -1.6))); view.size = 1.6; }
  if (farmerLineup) { farmerLineup.group.updateMatrixWorld(true); const s3 = farmerLineup.set === 3; view.target.copy(farmerLineup.group.localToWorld(new THREE.Vector3(0, 0, s3 ? 0.2 : -0.5))); if (s3) view.target.sub(new THREE.Vector3(1, 0, 1).normalize().multiplyScalar(1.12 / Math.tan(42 * DEG))); view.size = s3 ? 0.5 : 3.9; }      // (set 3: the ground point behind their faces, from the camera)
  if (frogLineup) { frogLineup.group.updateMatrixWorld(true); view.target.copy(frogLineup.group.localToWorld(new THREE.Vector3(0, 0, -0.02))); view.size = 0.52; }
  if (ShowLineup.on) ShowLineup.on.frameView(view);
  if (geeseFlock && params.has('geese')) { const c = geeseFlock.centre(new THREE.Vector3()); view.target.set(c.x + 0.3, 0, c.z + 0.3); view.size = 2.6; }
  if (duckFlock && params.has('ducks')) { const c = duckFlock.centre(new THREE.Vector3()); view.target.set(c.x + 0.2, 0, c.z + 0.2); view.size = 1.9; }
  if (frogPond && params.has('frogs')) { const f = frogPond.frogs[0]; view.target.set(f.pos.x + 0.2, 0, f.pos.z + 0.2); view.size = 1.6; }
  if (farmLife && params.has('farmer')) { const p = farmLife.pos; view.target.set(p.x + 0.3, 0, p.z + 0.3); view.size = 2.6; }
  if (farmDog && params.has('dog')) { const c = farmDog.centre(new THREE.Vector3()); view.target.set(c.x + 0.3, 0, c.z + 0.3); view.size = 2.4; }
  resize();
  aimShadows(true);
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 600);
  if (GAME_MODE) syncLand(true);
  if (GAME_MODE) {
    openedAt = Date.now(); newsFrom = performance.now() + 1500; gameUI.showBar(); if (!welcome) hint(game.t('hint_move'));
    startFirstDay(!!welcome);                              // (a new farm: the pictures, then the first day's guide)
    try { if (sessionStorage.getItem('ff3d.loaded')) { sessionStorage.removeItem('ff3d.loaded'); hint(game.t('code_loaded', { n: game.level })); } } catch (e) { /* */ }      // (a farm code just loaded)
    if (!welcome && game.data.lastSeen && openedAt - game.data.lastSeen >= AWAY_MIN) AWAY = { from: game.data.lastSeen };      // (away a while: the summary first)
    gameTick(Date.now(), true);                            // (the eggs laid while away, at once)
  }
  else hint('Drag to look round the village, pinch or scroll to zoom, tap a bird.');
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
    pl.pools = { from: lampPools.spots.length, L };
    for (const l of L) { v.set(l[0], 0, l[2]); pl.frame.localToWorld(v); lampPools.add(v.x, v.z, 0.75); }
  }
  lampPools.build();
}
function rebuildPools() {                                  // (a coop more, or less)
  if (lampPools.mesh) { lampPools.mesh.removeFromParent(); lampPools.mesh.material.map.dispose(); lampPools.mesh.material.dispose(); lampPools.mesh.geometry.dispose(); lampPools.mesh = null; }
  lampPools.spots = []; addLampPools();
}
function placePools(pl) {                                    // (its coop moved)
  const P = pl.pools, M = lampPools.mesh; if (!P || !M) return;
  const v = new THREE.Vector3(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(0.75, 1, 0.75);
  P.L.forEach((l, k) => { v.set(l[0], 0, l[2]); pl.frame.localToWorld(v); lampPools.spots[P.from + k] = [v.x, v.z, 0.75]; M.setMatrixAt(P.from + k, m.compose(new THREE.Vector3(v.x, 0.012, v.z), q, sc)); });
  M.instanceMatrix.needsUpdate = true; M.computeBoundingSphere();
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
function ribbon(points, half, y, flowing = false) {
  const pos = [], idx = [], flow = [];
  const P = points.map(p => new THREE.Vector2(p[0], p[2]));
  const n = P.length; let along = 0; const dirs = [], alongs = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    const d = new THREE.Vector2().subVectors(b, a).normalize();
    const nx = -d.y, nz = d.x;
    if (i) along += P[i].distanceTo(P[i - 1]);
    dirs.push(d); alongs.push(along);
    pos.push(P[i].x + nx * half, y, P[i].y + nz * half, P[i].x - nx * half, y, P[i].y - nz * half);
    flow.push(along, 1, d.x, d.y, along, -1, d.x, d.y);            // (along it in metres, across it -1..1, its way)
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  for (const [end, d, al] of [[P[0], dirs[0], alongs[0]], [P[n - 1], dirs[n - 1], alongs[n - 1]]]) {        // round caps
    const c = pos.length / 3; pos.push(end.x, y, end.y); flow.push(al, 0, d.x, d.y);
    for (let s = 0; s <= 16; s++) {
      const t = s / 16 * Math.PI * 2, ox = Math.cos(t) * half, oz = Math.sin(t) * half;
      pos.push(end.x + ox, y, end.y + oz); flow.push(al + ox * d.x + oz * d.y, (ox * -d.y + oz * d.x) / half, d.x, d.y);
    }
    for (let s = 0; s < 16; s++) idx.push(c, c + 2 + s, c + 1 + s);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (flowing) g.setAttribute('flow', new THREE.Float32BufferAttribute(flow, 4));
  g.setIndex(idx);
  const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;      // flat on the ground
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return g;
}

const DIRT = new THREE.MeshLambertMaterial({ color: '#c79a62', side: THREE.DoubleSide });
const BANK = new THREE.MeshLambertMaterial({ color: '#b48c5c', side: THREE.DoubleSide });
const WATER = new THREE.MeshStandardMaterial({ color: '#5fb3d6', roughness: 0.12, metalness: 0.0, side: THREE.DoubleSide });
// ------------------------------------------------------------------ moving water (Audrey, 23 Oct: "Perfect next": the pond's moving
// water, frogs and ducks). The pond: little wind ripples drifting across it (a few travelling waves of different lengths
// and ways, their strength coming and going in gusts), which the light catches: each wave's side facing you a shade
// lighter, the other darker, and the sun glinting off them; deeper blue in the middle, lighter in the shallows, a bright
// wet line at the bank. The streams: the water flowing along them, faster in the middle, with streaks and ripples carried
// downstream and a little white water round the edges. Worked out in the material's own shader, from where each point
// is (no textures); the night colours apply as before.
const WATER_T = { value: 0 }, WATER_DAY = { value: 1 };            // (the sparkles fade out at night)
function waterShader(mat, kind, extra = {}) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.wTime = WATER_T; sh.uniforms.wDay = WATER_DAY;
    for (const k in extra) sh.uniforms[k] = extra[k];
    const stream = kind === 'stream';
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;' + (stream ? '\nattribute vec4 flow;\nvarying vec4 vFlow;' : ''))
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;' + (stream ? '\nvFlow = flow;' : ''));
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float wTime; uniform float wDay;
varying vec3 vWPos;
${stream ? 'varying vec4 vFlow;' : 'uniform vec3 pondC; uniform vec3 pondU; uniform vec3 pondV;'}
float wh, whf; vec2 wg; float wEdge;
void wave(vec2 p, vec2 d, float k, float sp, float a) { float ph = dot(p, d) * k - wTime * sp; float v = a * sin(ph); wh += v; if (k > 10.0) whf += v; wg += a * k * cos(ph) * d; }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  wh = 0.0; wg = vec2(0.0);
  ${stream ? `
  // along the stream (metres) and across it (-1 at one bank, 1 at the other); the flow is fastest in the middle
  float al = vFlow.x, ac = vFlow.y; vec2 dir = normalize(vFlow.zw), side = vec2(-dir.y, dir.x);
  float run = wTime * (0.55 + 0.25 * (1.0 - ac * ac));
  vec2 q = vec2(al - run, ac * 0.42);
  float g1 = 0.0; vec2 gq = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    float fi = float(i), k = 3.1 + fi * 2.3; vec2 d = normalize(vec2(1.0, (fi - 1.5) * 0.9));
    float ph = dot(q, d) * k + fi * 1.7 + sin(q.x * 0.7 + fi) * 1.3;
    float a = 0.016 / (1.0 + fi * 0.6);
    wh += a * sin(ph); gq += a * k * cos(ph) * d;
  }
  wg = gq.x * dir + gq.y * side * 0.42 / 0.42;
  wEdge = abs(ac);` : `
  // where in the pond: 0 in the middle, 1 at the bank (the ellipse with its wobble)
  vec2 rel = vWPos.xz - pondC.xz;
  float pa = dot(rel, pondU.xz) / dot(pondU.xz, pondU.xz), pb = dot(rel, pondV.xz) / dot(pondV.xz, pondV.xz);
  float at = atan(pb, pa), wob = 1.0 + 0.035 * sin(at * 5.0 + 1.0) + 0.02 * sin(at * 9.0);
  wEdge = length(vec2(pa, pb)) / wob;
  vec2 p = vWPos.xz;
  p += 0.32 * vec2(sin(p.y * 0.83 + wTime * 0.29), sin(p.x * 0.71 - wTime * 0.23));        // (so the ripples aren't in neat rows)
  // patches of the pond ruffled by the breeze and calmer patches between, drifting across it
  float gust = 0.35 + 0.65 * smoothstep(-0.6, 0.9, sin(p.x * 0.53 + wTime * 0.21) * sin(p.y * 0.61 - wTime * 0.16) + 0.35 * sin((p.x + p.y) * 0.9 + wTime * 0.4));
  whf = 0.0;
  wave(p, normalize(vec2(0.8, 0.6)), 1.9, 0.9, 0.006);
  wave(p, normalize(vec2(-0.45, 0.89)), 4.7, 1.7, 0.0045 * gust);
  wave(p, normalize(vec2(0.31, -0.95)), 7.3, 2.2, 0.0035 * gust);
  wave(p, normalize(vec2(-0.93, -0.36)), 11.0, 2.8, 0.0024 * gust);
  wave(p, normalize(vec2(0.97, -0.22)), 15.5, 3.4, 0.0016 * gust);
  wave(p, normalize(vec2(0.55, 0.83)), 21.0, 4.1, 0.0011 * gust);
  wg *= 1.0 - 0.6 * smoothstep(0.86, 1.0, wEdge);          // (calmer right at the bank)`}
  vec3 nW = normalize(vec3(-wg.x, 1.0, -wg.y));
  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
}`)
      .replace('#include <emissivemap_fragment>', `
{
  // (after the normal is worked out, before the light falls on it) the light on the ripples: the side of a wave facing the player lighter, the far side darker
  vec2 toCam = normalize(cameraPosition.xz - vWPos.xz);
  float face = dot(wg, toCam);
  ${stream ? `
  vec3 deep = vec3(0.05, 0.3, 0.47), shallow = vec3(0.19, 0.55, 0.68);          // (linear colours: #3c94b6 and #78c2d6)
  diffuseColor.rgb = mix(deep, shallow, smoothstep(0.35, 1.0, wEdge));
  float streak = smoothstep(0.55, 1.0, sin((vFlow.x - wTime * 0.75) * 2.3 + sin(vFlow.y * 4.0 + vFlow.x * 0.9) * 1.8) * 0.5 + 0.5) * (1.0 - wEdge * 0.6);
  diffuseColor.rgb += vec3(0.1, 0.12, 0.12) * streak;
  float foam = smoothstep(0.78, 0.98, wEdge) * (0.55 + 0.45 * sin(vFlow.x * 7.0 - wTime * 2.4 + vFlow.y * 3.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.96, 0.97), foam * 0.45);
  diffuseColor.rgb *= 1.0 + 3.6 * face;` : `
  vec3 deep = vec3(0.035, 0.24, 0.42), shallow = vec3(0.17, 0.53, 0.66);         // (linear colours: #3487ad and #72bfd4)
  diffuseColor.rgb = mix(deep, shallow, smoothstep(0.4, 0.98, wEdge));
  diffuseColor.rgb *= 1.0 + 3.4 * face;
  diffuseColor.rgb += vec3(0.07, 0.09, 0.09) * smoothstep(0.04, 0.065, face) * (1.0 - smoothstep(0.88, 0.97, wEdge));     // (the brightest ripple faces, crisp)
  // little sparkles of light here and there, each twinkling on and off, more where the breeze ruffles the water, by day
  vec2 sp = vWPos.xz * 3.2, cell = floor(sp), fr = fract(sp) - 0.5;
  float rnd = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.55);
  vec2 off = (vec2(fract(rnd * 17.3), fract(rnd * 31.7)) - 0.5) * 0.55;
  float tw = smoothstep(0.6, 1.0, sin(wTime * (1.6 + rnd * 2.8) + rnd * 60.0));
  float spark = (1.0 - smoothstep(0.05, 0.11, length((fr - off) * vec2(1.0, 1.7)))) * tw * step(0.5, rnd) * smoothstep(0.0, 0.004, whf + 0.002);
  spark *= 1.0 - smoothstep(0.85, 0.97, wEdge);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.98, 1.0), spark * 0.8 * wDay);
  // a bright wet line where the water meets the bank, coming and going with the little waves
  float lap = smoothstep(0.93, 0.985, wEdge) * (1.0 - smoothstep(0.985, 1.0, wEdge));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.94, 0.95), lap * (0.45 + 0.25 * sin(wTime * 1.3 + atan(vWPos.z - pondC.z, vWPos.x - pondC.x) * 9.0)));`}
}
#include <emissivemap_fragment>`);
  };
  mat.customProgramCacheKey = () => 'water-' + kind;
  mat.needsUpdate = true;
  return mat;
}

function buildPaths() {
  const geos = V.paths.map((p, i) => ribbon(p, V.pathHalf, 0.004 + (i % 7) * 0.0003));
  still(new THREE.Mesh(mergeGeometries(geos, false), DIRT));
  // pebbles along the edges, in one batch
  const peb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshLambertMaterial({ color: '#cfc8ba' }), V.pebbles.length);
  const r = rng(5), m = new THREE.Matrix4(), qn = new THREE.Quaternion(), e = new THREE.Euler();
  PEBBLES.mesh = peb; PEBBLES.at = [];
  V.pebbles.forEach((p, i) => {
    const s = 0.6 + r() * 0.8;
    m.compose(new THREE.Vector3(p[0], 0.008, p[2]), qn.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(s * 1.2, s * 0.6, s));
    peb.setMatrixAt(i, m); PEBBLES.at.push(m.clone());
  });
  peb.computeBoundingSphere();
  still(peb);
  hidePebbles();
}
const PEBBLES = { mesh: null, at: [] };
function hidePebbles() {                                    // (none showing through a coop)
  if (!PEBBLES.mesh || !GAME_MODE) return;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  V.pebbles.forEach((p, i) => PEBBLES.mesh.setMatrixAt(i, underCoop(p[0], p[2], 0.1) ? zero : PEBBLES.at[i]));
  PEBBLES.mesh.instanceMatrix.needsUpdate = true;
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
  const pond = waterShader(WATER.clone(), 'pond', { pondC: { value: c }, pondU: { value: au }, pondV: { value: av } });
  still(new THREE.Mesh(ellipse(1.0, 0.007), pond));
  // the streams, each in its banks, flowing from its first point to its last (the west one into the pond, the other out of it)
  const flowing = waterShader(WATER.clone(), 'stream');
  for (const st of V.streams) {
    still(new THREE.Mesh(ribbon(st, V.streamHalf + 0.16, 0.0035), BANK));
    still(new THREE.Mesh(ribbon(st, V.streamHalf, 0.0075, true), flowing));
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
    inst.userData.model = name; inst.userData.ownMat = mat !== m.material;
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

// ------------------------------------------------------------------ the decorations the player buys (the 2D game's "Decorate your farm":
// the same eight, from its own Blender script, stylized/export_decor.py): each starts where the 2D game puts it, on open
// grass near it (never on a path, a plot, the pond, a stream, a tree or anything else), turned to face the player. They
// join the village's props: batched like them, and everyone walks round them. The windmill's sails turn; the duck house
// floats on the pond (the geese, the ducks and the frogs swim round it). Tap one: its name.
const DECOR_NAMES = {
  flowers: ['Cottage flower bed', 'Massif de fleurs'], birdbath: ['Bird bath', 'Bain d’oiseaux'], beehives: ['Beehives', 'Ruches'],
  duckhouse: ['Duck house', 'Maison des canards'], greenhouse: ['Greenhouse', 'Serre'], windmill: ['Windmill', 'Moulin à vent'],
  bandstand: ['Bandstand', 'Kiosque à musique'], statue: ['Golden cockerel', 'Coq d’or'],
};
const DECOR_ROUND = { bandstand: 1.45, windmill: 1.45, flowers: 0.95, birdbath: 0.7 };     // (round ones: their circle)
let DECOR_INFO = null, decorFree = null, decorSpots = null;
const decorList = [];                                          // { model, pos, deg, box (its own frame), m (world matrix) }
function placeDecor(info) {
  DECOR_INFO = info;
  if (!info || params.has('nodecor') || !HAS_DECOR) return;
  const P = V.pond, house = V.props.find(p => p.model === 'farmhouse'), wheat = V.props.find(p => p.model === 'wheat_field'),
    sun = V.props.find(p => p.model === 'sunflowers'), veg = V.props.find(p => p.model === 'veg_patch'), dock = V.props.find(p => p.model === 'dock');
  const at = (p, dx, dz) => [p.pos[0] + dx, p.pos[2] + dz];
  // where the 2D game starts each one (south on its map is towards the player here)
  const WANT = [
    ['flowers', house ? at(house, 3.2, -1.2) : [0, 0]], ['birdbath', house && veg ? [(house.pos[0] + veg.pos[0]) / 2 + 0.5, (house.pos[2] + veg.pos[2]) / 2 + 0.5] : [0, 0]],
    ['beehives', wheat ? at(wheat, 3.2, 3.2) : [0, 0]], ['greenhouse', sun ? at(sun, 3.0, 3.0) : [0, 0]],
    // (the 2D game has the bandstand south of the pond and the cockerel north; seen from here the tall bandstand in front
    // would hide the pond, so they swap: the bandstand behind it, the cockerel in front)
    ['windmill', wheat ? at(wheat, -4.5, 1.5) : [0, 0]], ['statue', [P.center[0] + 4.6, P.center[2] + 4.6]], ['bandstand', [P.center[0] - 5.2, P.center[2] - 5.2]],
  ];
  // what's in the way: the paths, the plots, the pond and the streams, trees, bushes and rocks, the other props, the kennel
  const seg = (px, pz, a, b) => { const ax = a[0], az = a[2], dx = b[0] - ax, dz = b[2] - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
  const nearLine = (lines, px, pz, r) => lines.some(l => { for (let i = 1; i < l.length; i++) if (seg(px, pz, l[i - 1], l[i]) < r) return true; return false; });
  const plotsAt = V.plots.map(p => { const a = p.deg * DEG; return [p.pos[0], p.pos[2], Math.cos(a), Math.sin(a)]; });
  const inPlot = (x, z) => plotsAt.some(([px, pz, c, s]) => { const dx = x - px, dz = z - pz, lx = dx * c - dz * s, lz = dx * s + dz * c; return lx > -2.35 && lx < 2.4 && lz > -2.3 && lz < 2.3; });
  const pu = new THREE.Vector2(P.axisU[0], P.axisU[2]), pv = new THREE.Vector2(P.axisV[0], P.axisV[2]), lu = pu.length(), lv = pv.length(); pu.normalize(); pv.normalize();
  const inPond = (x, z, m) => { const dx = x - P.center[0], dz = z - P.center[2]; return ((dx * pu.x + dz * pu.y) / (lu + m)) ** 2 + ((dx * pv.x + dz * pv.y) / (lv + m)) ** 2 <= 1; };
  const circles = [...V.trees.map(t => [t.pos[0], t.pos[2], 0.65]), ...V.bushes.map(b => [b.pos[0], b.pos[2], 0.42 * (b.s || 1) + 0.15]), ...V.rocks.map(k => [k.pos[0], k.pos[2], 0.25 * (k.s || 1) + 0.1]),
    [KENNEL_AT[0], KENNEL_AT[1], 2.2], [FOX_FIELD[0], FOX_FIELD[1], 9], [FOX_DEN[0], FOX_DEN[1], 3]];
  const boxes = [];
  for (const p of V.props) {
    if (p.model === 'wheat_field') {                             // (the field is made here, not a model: its own size)
      const b = new THREE.Box3(new THREE.Vector3(-2.2, 0, -1.2), new THREE.Vector3(2.2, 1, 1.2)).applyMatrix4(place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1)); b.expandByScalar(0.4); boxes.push(b);
    }
    if (!parts[p.model]) continue;
    const b = new THREE.Box3().setFromObject(parts[p.model]).applyMatrix4(place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1)); b.expandByScalar(0.3); boxes.push(b);
  }
  const mid = V.bounds.corners.reduce((s, c) => [s[0] + c[0] / 4, s[1] + c[2] / 4], [0, 0]);
  const pt = new THREE.Vector3();
  const free = (x, z) => !inPlot(x, z) && !inPond(x, z, 0.6) && !nearLine(V.paths, x, z, V.pathHalf + 0.2) && !nearLine(V.streams, x, z, V.streamHalf + 0.45)
    && !circles.some(c => Math.hypot(x - c[0], z - c[1]) < c[2]) && !boxes.some(b => b.containsPoint(pt.set(x, 0.5, z)))
    && !decorList.some(d => d.wb.containsPoint(pt.set(x, 0.5, z))) && Math.hypot(x - mid[0], z - mid[1]) < 40;
  decorFree = free;
  const ROUND = DECOR_ROUND;
  const fits = (name, x, z) => {                                 // every point of its footprint (and a margin) free
    const f = info.foot[name], m = place(x, 0, z, 45, 1), v = new THREE.Vector3(), M = 0.25;
    for (let fx = f[0] - M; fx <= f[2] + M + 1e-6; fx += 0.25) for (let fz = f[1] - M; fz <= f[3] + M + 1e-6; fz += 0.25) {
      if (ROUND[name] && Math.hypot(fx, fz) > ROUND[name] + M && !(name === 'bandstand' && Math.abs(fx) < 0.5 + M && fz > 0)) continue;     // (round ones: their circle, the bandstand's steps)
      v.set(Math.min(fx, f[2] + M), 0, Math.min(fz, f[3] + M)).applyMatrix4(m);
      if (!free(v.x, v.z)) return false;
    }
    return true;
  };
  const add = (name, x, z) => {
    const m = place(x, 0, z, 45, 1), box = new THREE.Box3().setFromObject(parts[name]), wb = box.clone().applyMatrix4(m).expandByScalar(0.6);
    decorList.push({ model: name, pos: [x, z], deg: 45, box, m, wb });
    V.props.push({ model: name, pos: [x, 0, z], deg: 45, s: 1, decor: true });
  };
  for (const [name, [ax, az]] of WANT) {
    if (!parts[name] || !info.foot[name]) continue;
    let spot = null;
    for (let r = 0; r <= (name === 'bandstand' || name === 'statue' ? 16 : 9) && !spot; r += 0.35) for (let k = 0, n = Math.max(1, Math.round(r * 6)); k < n && !spot; k++) {
      const a = k / n * Math.PI * 2 + r, x = ax + Math.cos(a) * r, z = az + Math.sin(a) * r;
      if (fits(name, x, z)) spot = [x, z];
    }
    if (spot) add(name, spot[0], spot[1]); else console.warn('no room for', name);
  }
  // the duck house floats on the pond: along its long axis, at the end away from the dock
  if (parts.duckhouse) {
    const c = P.center, e1 = [c[0] + P.axisU[0] * 0.42, c[2] + P.axisU[2] * 0.42], e2 = [c[0] - P.axisU[0] * 0.42, c[2] - P.axisU[2] * 0.42];
    const far = !dock || Math.hypot(e1[0] - dock.pos[0], e1[1] - dock.pos[2]) > Math.hypot(e2[0] - dock.pos[0], e2[1] - dock.pos[2]) ? e1 : e2;
    add('duckhouse', far[0], far[1]);
  }
}
// in the pond: circles round the duck house's raft (for whoever swims)
function decorAvoid() {
  const out = [];
  for (const d of decorList) if (d.model === 'duckhouse') { const c = new THREE.Vector3(); d.box.getCenter(c).applyMatrix4(d.m); out.push([c.x, c.z, 0.85]); }
  return out;
}
// the windmill's sails, turning slowly in the wind (one turn in about 14 s); the life round them (decorlife.js: bees,
// butterflies, birds at the bath, the cockerel's glints, the bandstand's music)
let sails = null, decorLife = null;
function buildDecor() {
  for (const d of decorList) for (const m of meshesOf(parts[d.model])) if (m.material && m.material.name === 'glass') { m.material.transparent = true; m.material.opacity = 0.34; m.material.depthWrite = false; m.material.needsUpdate = true; }
  const w = decorList.find(d => d.model === 'windmill');
  if (w && parts.sails && DECOR_INFO.hub) {
    sails = new THREE.Group(); const s = part('sails'); sails.add(s);
    sails.position.fromArray(DECOR_INFO.hub).applyMatrix4(w.m); sails.rotation.y = 45 * DEG;
    s.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(sails);
  }
  if (decorList.length && !params.has('nolife')) decorLife = new DecorLife(scene, decorList, { grade: nightGrade, hour: () => DAY.hour, toCam: VIEW_DIR }, rng(91));
}
function tickDecor(dt) {
  if (sails) sails.children[0].rotation.z -= dt * (Math.PI * 2 / 14) * (0.8 + 0.4 * Math.sin(WIND.time.value * 0.31));
  if (decorLife) decorLife.update(dt);
  if (GAME_MODE) { tickBits(dt); tickHoneyFrame(); }
}
// a tap on one: its name over it
function decorAt(ray) {
  const loc = new THREE.Ray(), inv = new THREE.Matrix4(), hit = new THREE.Vector3();
  let best = null, bestD = Infinity;
  for (const d of decorList) {
    loc.copy(ray).applyMatrix4(inv.copy(d.m).invert());
    if (loc.intersectBox(d.box, hit)) { const dd = hit.applyMatrix4(d.m).distanceTo(ray.origin); if (dd < bestD) { bestD = dd; best = d; } }
  }
  decorAt.dist = bestD;                                        // (how far along the ray: nearer than a coop behind it?)
  return best;
}

function buildProps() {
  // buildings, the pasture, fields, decorations, bridges and the dock: grouped by model, each group in one batch
  const byModel = {};
  for (const p of V.props) if (!p.own) (byModel[p.model] = byModel[p.model] || []).push(place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1));      // (not the game's decorations: their own copies)
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
const wheatField = { stage: GAME_MODE ? 'soil' : WHEAT_STAGES.includes(params.get('wheat')) ? params.get('wheat') : 'ripe', parts: {}, inverse: null, half: [0, 0] };
function wheat(fieldMatrix, w, d, parent = null) {      // (parent: the game's own field, drawn in its frame: its parts back)
  const r = rng(31), spots = [];
  for (let x = -w / 2 + 0.12; x < w / 2 - 0.1; x += 0.15)
    for (let y = -d / 2 + 0.12; y < d / 2 - 0.1; y += 0.15)
      spots.push({ x: x + (r() - 0.5) * 0.06, z: y + (r() - 0.5) * 0.06, h: 0.85 + r() * 0.3, turn: r() * 6.28, keep: r(), shade: 0.86 + r() * 0.22, ears: [0, 1].map(() => [r() * 6.28, r() - 0.5, r() - 0.5]) });
  const Y = new THREE.Vector3(0, 1, 0), stalkGeo = meshesOf(parts.grass_tuft_1)[0].geometry;
  const at = (m) => parent ? m : new THREE.Matrix4().multiplyMatrices(fieldMatrix, m);
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
  const P = parent ? {} : wheatField.parts;
  P.soil = [ridges];
  P.sprouts = [ridges, stalks(spots.filter(s => s.keep < 0.4), 0.3, 2.0, '#86c24a')];
  P.growing = [stalks(spots, 0.55, 2.2, '#5f9c36')];
  P.ripe = [stalks(spots, 1, 2.4, '#d9b24e'), ea];
  for (const list of Object.values(P)) for (const o of list) if (!o.parent) {
    o.computeBoundingSphere(); o.receiveShadow = true;
    if (parent) { o.castShadow = o !== ridges && o !== ea; nightGrade(o.material); parent.add(o); } else still(o, o !== ridges && o !== ea, true);
  }
  if (parent) return P;
  wheatField.inverse = fieldMatrix.clone().invert(); wheatField.half = [w / 2, d / 2];
  wheatField.centre = new THREE.Vector3().setFromMatrixPosition(fieldMatrix).add(new THREE.Vector3(0, 0.8, 0));
  setWheat(wheatField.stage);
}
function setWheat(stage) {
  wheatField.stage = stage;
  for (const o of new Set(Object.values(wheatField.parts).flat())) o.visible = wheatField.parts[stage].includes(o);
  aimShadows(true);
}

// whether a spot (and a couple of metres round it) is in full view from the game's camera, with no tree's crown or the
// farmhouse between: where the geese and Biscuit choose to have their victory parade, so the player sees it
function inView(x, z, m = 1.6) {
  const cx = VIEW_DIR.x, cz = VIEW_DIR.z, n = Math.hypot(cx, cz), ux = cx / n, uz = cz / n, rise = VIEW_DIR.y / n;
  const hides = (px, pz, r, h) => {
    const dx = px - x, dz = pz - z, along = dx * ux + dz * uz, perp = Math.abs(dx * uz - dz * ux);
    return perp < r + m && along > -(r + m) && along < (h - 0.3) / rise + r + m;
  };
  for (const t of V.trees) if (hides(t.pos[0], t.pos[2], t.r || 1.3, t.h)) return false;
  return !hides(V.house[0], V.house[2], 3.2, 6);
}
// each tree, bush and rock with its own id (t12, b40, r3: the game saves the ones cleared for a coop), model and turn, and
// each drift of wildflowers its flowers, all decided once so they stay the same as some are cleared
function tagNature() {
  const r = rng(21), names = ['flower_daisy', 'flower_butter', 'flower_clover'];
  // trees: three kinds of shady tree for the woods and the green, apple trees in the orchard
  V.trees.forEach((t, i) => { t.id = 't' + i; t.model = t.kind === 'apple' ? 'tree_apple' : 'tree_' + 'abc'[i % 3]; t.yaw = r() * 360; });
  V.bushes.forEach((b, i) => { b.id = 'b' + i; b.model = i % 2 ? 'bush_b' : 'bush_a'; });
  V.rocks.forEach((k, i) => { k.id = 'r' + i; k.model = i % 2 ? 'rock_b' : 'rock_a'; });
  for (const f of V.flowers) {
    const pick = [names[Math.floor(r() * 3)], names[Math.floor(r() * 3)]], n = 5 + Math.floor(r() * 5);
    f.pts = [];
    for (let k = 0; k < n; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * f.r; f.pts.push([pick[k % 2], f.pos[0] + Math.cos(a) * d, f.pos[2] + Math.sin(a) * d, r() * 360, 1.3 + r() * 0.6]); }
  }
}
const natureMatrix = o => o.id[0] === 't' ? place(o.pos[0], 0, o.pos[2], o.yaw, o.h / 2.1) : place(o.pos[0], 0, o.pos[2], o.rot, o.s * (o.id[0] === 'b' ? 1.1 : 1.2));
const NATURE = [];
function dropMeshes(list) { for (const m of list) { m.removeFromParent(); if (m.userData.ownMat) m.material.dispose(); } list.length = 0; }
function buildNature() {
  dropMeshes(NATURE);
  const lists = {};
  for (const o of [...V.trees, ...V.bushes, ...V.rocks]) (lists[o.model] = lists[o.model] || []).push(natureMatrix(o));
  for (const name of ['tree_a', 'tree_b', 'tree_c', 'tree_apple', 'bush_a', 'bush_b', 'rock_a', 'rock_b'])
    NATURE.push(...batch(name, lists[name] || [], name === 'tree_apple' ? { cast: true, wind: 0.007 } : name[0] === 't' ? { cast: true, wind: 0.006 } : name[0] === 'b' ? { cast: true, wind: 0.05 } : {}));
  // wildflowers in little drifts (none through a coop)
  const fl = { flower_daisy: [], flower_butter: [], flower_clover: [] };
  for (const f of V.flowers) for (const [name, x, z, yaw, sc] of f.pts) if (!underCoop(x, z, 0.1)) fl[name].push(place(x, 0, z, yaw, sc));
  for (const n in fl) NATURE.push(...batch(n, fl[n], { lambert: true, twoSided: true, wind: 1.2 }));
}

// grass tufts in tiles of 6 m, so the phone only draws the tiles in view; fewer on slower phones, none when zoomed far out
const VGRASS = [];
function buildGrass() {
  for (const m of VGRASS) { const i = grassTiles.findIndex(g => g.mesh === m); if (i >= 0) grassTiles.splice(i, 1); }
  dropMeshes(VGRASS);
  const TILE = 6, tiles = new Map();
  for (const t of V.tufts) {
    if (underCoop(t[0], t[2], 0.05)) continue;
    const key = Math.floor(t[0] / TILE) + ',' + Math.floor(t[2] / TILE);
    if (!tiles.has(key)) tiles.set(key, [[], [], []]);
    tiles.get(key)[t[3]].push(place(t[0], 0, t[2], t[4] / DEG, t[5]));
  }
  for (const lists of tiles.values()) {
    lists.forEach((list, k) => {
      for (const inst of batch('grass_tuft_' + k, list, { lambert: true, tile: 0, twoSided: true, wind: 1.2 })) { grassTiles.push({ mesh: inst, full: inst.count }); VGRASS.push(inst); }
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
  const r = rng(7);
  // (the game: its coops where the player put them; no set places, the land is fields: syncLand)
  if (GAME_MODE) game.data.coops.forEach((gc, i) => makePlot(i, [gc.x, 0, gc.z], gc.deg, gc, r, 'coop'));
  else V.plots.forEach((p, i) => makePlot(i, p.pos, p.deg, null, r, i < nCoops ? 'coop' : i < nCoops + 2 ? 'empty' : 'sale'));
  batchCoops();
  buildDoors();
}
function makePlot(i, pos, deg, gc, r, kind, trio = null) {
  const g = new THREE.Group();
  g.position.set(pos[0], 0, pos[2]); g.rotation.y = deg * DEG;
  scene.add(g);
  const plot = { index: i, group: g, birds: [], kind, centre: new THREE.Vector3(pos[0], 0, pos[2]) };
  plots.push(plot);
  if (plot.kind === 'coop') {
    const frame = new THREE.Group(); frame.position.copy(COOP_SHIFT); g.add(frame);
    plot.frame = frame;
    const look = params.has('looks') ? Math.floor(i / BREEDS.length) % 3 : -1;      // (the test page's ?looks: rows of rustic, plain, Deluxe)
    plot.breed = gc ? gc.breed : BREEDS[i % BREEDS.length]; plot.deluxe = gc ? gc.tier >= 4 : look >= 0 ? look === 2 : Math.floor(i / BREEDS.length) % 2 === 1;
    plot.gc = gc; plot.rustic = gc ? gc.tier === 0 : look === 0;     // (a new breed's coop comes rustic)
    addNest(frame, plot);
    g.updateMatrixWorld(true);                            // the coop itself stays put (till it's moved): it joins its style's batch
    const silk = plot.breed === 'sil' ? Math.floor(i / BREEDS.length) : 0;
    let k = 0;
    const colour = () => plot.breed === 'sil' ? (gc ? 'white' : SILKIE[(silk * 7 + k++) % SILKIE.length]) : null;      // (the game's Silkies: the white trio)
    if (gc) {                                             // the game: this coop's forever birds, each with its own name and personality
      const henAt = PEN.hens.filter(h => h.model === 'hen'), rooAt = PEN.hens.find(h => h.model === 'rooster'); let k = 0;
      for (const gb of trio || game.birdsIn(gc.id)) {
        const h = gb.sex === 'r' ? rooAt : henAt[k++ % henAt.length];
        const b = new Bird(plot, plot.breed, gb.sex === 'r' ? 'rooster' : 'hen', colour(), h.pos, -h.yaw * DEG + Math.PI, r);
        b.name = gb.name; b.pers = gb.pers; b.gid = gb.id; plot.birds.push(b);
      }
    } else {
      for (const h of PEN.hens) plot.birds.push(new Bird(plot, plot.breed, h.model, colour(), h.pos, -h.yaw * DEG + Math.PI, r));
      plot.birds.filter(b => b.kind === 'hen').forEach((h, k) => { h.pers = PERS_IDS[(i * 2 + k) % PERS_IDS.length]; h.layIn = 6 + r() * 70; });
      const mum = plot.birds.find(b => b.kind === 'hen');
      for (let c = 0; c < 2; c++) {
        const chick = new Bird(plot, plot.breed, 'chick', colour(), [mum.root.position.x + 0.3 - c * 0.5, 0, mum.root.position.z + 0.25], r() * 6, r);
        chick.mum = mum; plot.birds.push(chick);
      }
    }
    for (const b of plot.birds) if (!b.free(b.root.position.x, b.root.position.z)) { b.pickTarget(); b.root.position.copy(b.target); }
    allBirds.push(...plot.birds);
  } else if (plot.kind === 'empty' || plot.kind === 'sale') {
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
  return plot;
}
// a coop's parts drawn in its style's batch: [model, where in its frame]
function coopParts(plot) {
  const house = (plot.rustic && parts['rustic_' + plot.breed] ? 'rustic_' : 'house_') + plot.breed, I = new THREE.Matrix4();
  const out = [[house, I], ['pen_base', I], [plot.deluxe ? 'fence_dx' : plot.rustic && parts.fence_rustic ? 'fence_rustic' : 'fence', I]];
  if (plot.deluxe) { const t = COOPS.tops[house]; out.push(['vane', new THREE.Matrix4().makeTranslation(t[0], t[1] - 0.02, t[2])]); }
  return out;
}
// the coops in their styles' batches (made again when one's moved; the one being moved is drawn on its own meanwhile)
const COOP_BATCH = [];
function batchCoops() {
  dropMeshes(COOP_BATCH);
  const lists = {};
  for (const p of plots) if (p.kind === 'coop' && p.frame && p !== MOVE.plot) for (const [name, M] of coopParts(p)) (lists[name] = lists[name] || []).push(p.frame.matrixWorld.clone().multiply(M));
  for (const name in lists) COOP_BATCH.push(...batch(name, lists[name], { cast: true }));
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
  plot.nest.count = GAME_MODE ? (plot.gc ? plot.gc.eggs : 0) : 2;      // (the game: its save; on the test page a couple already laid this morning)
  showEggs(plot);
  const grain = new THREE.Mesh(GRAIN_GEO, GRAIN); grain.position.set(PEN.feeder[0], 0.065, PEN.feeder[2]);
  grain.receiveShadow = true; grain.userData.moves = true;
  frame.add(grain); plot.feedMesh = grain;
  if (GAME_MODE && plot.gc) setFeed(plot, game.feedLeft(plot.gc));
}
// the grain in the feeder, from empty (none) to full
function setFeed(plot, u) {
  if (!plot.feedMesh) return;
  u = Math.max(0, Math.min(1, u)); plot.feedMesh.visible = u > 0.01;
  plot.feedMesh.position.y = FEEDER_LOW + (FEEDER_FULL - FEEDER_LOW) * u;
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
  n.size = (big ? 0.17 : 0.115) * (0.75 + 0.25 * loud); n.life = n.full = big ? 1.4 : 1.0; n.sprite.scale.setScalar(1e-4);      // (grown in tickNotes)
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
let foxes = null, foxLineup = null, geeseLineup = null, geeseFlock = null, frogLineup = null, frogPond = null, duckFlock = null, farmerLineup = null;
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
  FOX_OBSTACLES = obstacles;
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
  const avoid = [...decorAvoid()];                   // (the duck house's raft)
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
  GEESE_OPTS = { pond: P, nav: navGrid(), avoid, mouths, groundY, inView };
  geeseFlock = new GeeseFlock(scene, { pond: P, nav: navGrid(), avoid, mouths, groundY, inView, watch: () => params.has('noguard') || params.has('nogeese') ? null : nightVisit, dog: () => farmDog ? farmDog.dog : null,
    others: () => [...(duckFlock ? duckFlock.ducks : []), ...(farmLife && !farmLife.home ? [farmLife.f] : [])] }, rng(57));      // (?noguard: they sleep through it, for the fox's own tests)
  if (HAS_GEESE) geeseFlock.update(1 / 60, clockHour());
  else { geeseFlock.group.visible = false; geeseFlock.geese = []; }        // (the game: none bought yet; the pond's ways stay for the others)
  // the pond's frogs (pond.js): they jump in when a goose, Biscuit or Rusty comes near
  frogPond = new FrogPond(scene, { pond: P, avoid, mouths, spots: V.frogs, grade: nightGrade, lang: LANG, near: () => {
    const out = [];
    if (geeseFlock) for (const g of geeseFlock.geese) out.push([g.pos.x, g.pos.z]);
    if (duckFlock) for (const d of duckFlock.ducks) out.push([d.pos.x, d.pos.z]);
    if (farmDog && farmDog.group.visible) out.push([farmDog.dog.pos.x, farmDog.dog.pos.z]);
    if (nightVisit && nightVisit.fox.root.visible) out.push([nightVisit.fox.pos.x, nightVisit.fox.pos.z]);
    if (farmLife && !farmLife.home) out.push([farmLife.pos.x, farmLife.pos.z]);
    return out;
  }, heard: (x, z) => { if (duckFlock) duckFlock.heard(x, z); } }, rng(81));
  // the pond's mallards (ducks.js): Rocco, Daisy and Dot; they keep clear of the geese, Biscuit and Rusty
  // their house, if it's on the pond (a decoration): its own frame, to and from the world
  const dh = decorList.find(d => d.model === 'duckhouse'), hv = new THREE.Vector3(), hinv = dh ? dh.m.clone().invert() : null;
  const house = dh ? { local: (x, z) => { hv.set(x, 0, z).applyMatrix4(hinv); return [hv.x, hv.z]; }, world: (lx, lz) => { hv.set(lx, 0, lz).applyMatrix4(dh.m); return [hv.x, hv.z]; } } : null;
  duckFlock = new DuckFlock(scene, { pond: P, nav: navGrid(), avoid, mouths, groundY, lang: LANG, geeseBed: geeseFlock.bed, fx: () => frogPond, house,
    light: () => 0.35 + 0.65 * WATER_DAY.value,
    others: () => [...geeseFlock.geese, ...(farmDog && farmDog.group.visible ? [farmDog.dog] : []), ...(nightVisit && nightVisit.fox.root.visible ? [nightVisit.fox] : []), ...(farmLife && !farmLife.home ? [farmLife.f] : [])] }, rng(91));
}

// ------------------------------------------------------------------ Biscuit the farm dog (dog.js): his kennel by the farmhouse, left of the
// path in front of it, its door turned to the path; his day on the farm. ?dog starts the view on him.
const KENNEL_AT = [-24.47, -21.64, 1.249];        // x, z, the way its door faces
let farmDog = null, kennelBoard = null, dogSpots = null;
function buildDog(joints) {
  if (!HAS_DOG) return;
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
    foxes: () => foxes, toCamera: (x, z) => Math.atan2(camera.position.x - x, camera.position.z - z),
    visit: () => params.has('noguard') || params.has('nodog') ? null : nightVisit, den: FOX_DEN }, rng(61));         // (?noguard: he sleeps through it too; ?nodog: just him, as if the farm had only the geese)
  if (nightVisit) nightVisit.dogName = () => dogName;
  farmDog.update(1 / 60, clockHour());
}
// where he goes on his rounds: outside each coop's front fence (facing the hens), and the farm's corners (benches, the well,
// the stall, the scarecrow, the bales...), not too far from home and well away from the foxes' meadow
// every cell one can walk to from the farmhouse door: the farm's spots are picked in it (a free cell can be shut in, between
// a pen's fence and a hedge, say, and a way there never found)
let REACH = null;
function farmReach() {
  if (REACH) return REACH;
  const D = farmDoor(); return (REACH = navGrid().reach(D[0] + Math.sin(D[2]) * 0.9, D[1] + Math.cos(D[2]) * 0.9));
}
// in front of a coop's pen at (x, its own frame), facing the coop: the nearest place there that can be got to, going out
// from the coop till it's outside the pen's fence (a bigger pen reaches further); if its front is shut in (coops facing
// each other round a shared yard), round to a side that's open
function coopFront(p, x) {
  const nav = navGrid(), v = new THREE.Vector3(), c = new THREE.Vector3();
  p.frame.updateWorldMatrix(true, false); p.frame.localToWorld(c.set(x, 0, 1.4));
  for (const a of [0, 0.5, -0.5, 1.0, -1.0, 1.57, -1.57, 2.2, -2.2, 3.14])
    for (let r = 2.0; r < 5.6; r += 0.3) {
      p.frame.localToWorld(v.set(x + Math.sin(a) * r, 0, 1.4 + Math.cos(a) * r));
      const f = nav.nearestIn(farmReach(), v.x, v.z, 0.45);
      if (f) return [f[0], f[1], Math.atan2(c.x - f[0], c.z - f[1])];
    }
  return null;
}
function farmSpots() {
  if (dogSpots) return dogSpots;
  const nav = navGrid(), coopsAt = [], farm = [];
  for (const p of plots) {
    if (p.kind !== 'coop' || !p.frame) continue;
    const f = coopFront(p, 0.3); if (f) coopsAt.push(f);
  }
  const KINDS = { bench: 1, well: 1, egg_stall: 1, scarecrow: 1, wheelbarrow: 1, hay_stack: 1, round_bale: 1, veg_patch: 1, veg_patch_sq: 1, sunflowers: 1, barrels: 1, log_pile: 1, planter: 1 };
  for (const p of V.props) {
    if (!KINDS[p.model]) continue;
    const d = Math.hypot(p.pos[0] - KENNEL_AT[0], p.pos[2] - KENNEL_AT[1]), df = Math.hypot(p.pos[0] - FOX_FIELD[0], p.pos[2] - FOX_FIELD[1]);
    if (d > 34 || df < 9) continue;
    const f = nav.nearestIn(farmReach(), p.pos[0] + 1.0, p.pos[2] + 1.0, 2.0); if (f) farm.push(f);
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
  send: ['Send {farmer}', 'Envoyer {farmer}'],
  squawk: ['Squawk! Squawk!', 'Cot cot codet !'],
  shut: ['The door is shut!', 'La porte est fermée !'],
  sent: ['{farmer} is on the way with the torch…', '{farmer} arrive avec sa lampe…'],
  shoo: ['Shoo! Off you go, Rusty!', 'Ouste ! File, Rusty !'],
  safe: ['Rusty ran home. The hens can go back to sleep.', 'Rusty est rentré chez lui. Les poules peuvent se rendormir.'],
  feather: ['Rusty went home with a feather on his nose.', 'Rusty est rentré avec une plume sur le nez.'],
  allShut: ['Rusty went home: the doors were shut.', 'Rusty est rentré : les portes étaient fermées.'],
  atDoor: ['Rusty the fox is at the door!', 'Rusty le renard est à la porte !'],
  inWay: ["Rusty's nose is in the way!", 'Le nez de Rusty est dans le passage !'],
  geeseHeard: ['The geese have heard Rusty! They\'re raising the alarm…', 'Les oies ont entendu Rusty ! Elles donnent l\'alerte…'],
  geeseSafe: ['The geese chased Rusty all the way home!', 'Les oies ont chassé Rusty jusque chez lui !'],
  geeseProud: ['Victory! The geese are so proud of themselves, they\'re parading round the farm.', 'Victoire ! Les oies sont si fières d\'elles qu\'elles paradent dans la ferme.'],
  // Biscuit out after Rusty too ({dog}: his name, as the player chose it; only ever shown as text)
  dogHeard: ['{dog} has heard Rusty! Woof! He\'s off after him…', '{dog} a entendu Rusty ! Ouaf ! Il file après lui…'],
  dogToo: ['{dog} is up too, barking! He\'s off after Rusty…', '{dog} est réveillé aussi, il aboie ! Il file après Rusty…'],
  dogSafe: ['{dog} chased Rusty all the way home!', '{dog} a chassé Rusty jusque chez lui !'],
  bothHeard: ['The geese and {dog} have heard Rusty! Honking and barking, they\'re off after him…', 'Les oies et {dog} ont entendu Rusty ! En cacardant et en aboyant, ils filent après lui…'],
  geeseToo: ['The geese have heard {dog} barking! They\'re coming too, honking…', 'Les oies ont entendu {dog} aboyer ! Elles arrivent aussi en cacardant…'],
  teamSafe: ['The geese and {dog} chased Rusty all the way home!', 'Les oies et {dog} ont chassé Rusty jusque chez lui !'],
  teamProud: ['Victory! The geese and {dog} are so proud of themselves, they\'re parading round the farm.', 'Victoire ! Les oies et {dog} sont si fiers d\'eux qu\'ils paradent dans la ferme.'],
};
const VISIT_PLOT = /^\d+$/.test(params.get('visit') || '') ? parseInt(params.get('visit'), 10) : undefined;
let LANG = GAME_MODE ? game.lang : params.get('lang') === 'fr' ? 'fr' : 'en';
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
    if (pl.kind === 'lineup' || pl.kind === 'none' || pl.kind === 'land' || (GAME_MODE && pl.kind === 'sale') || !pl.group) continue;
    const frame = pl.frame || pl.group; frame.updateWorldMatrix(true, false);
    const lo = pl.kind === 'coop' ? new THREE.Vector3(-1.66, 0, -0.81) : new THREE.Vector3(-1.56, 0, -1.3);
    const hi = pl.kind === 'coop' ? new THREE.Vector3(1.81, 0, 2.55) : new THREE.Vector3(1.82, 0, 1.68);
    wb.makeEmpty(); for (const x of [lo.x, hi.x]) for (const z of [lo.z, hi.z]) wb.expandByPoint(frame.localToWorld(new THREE.Vector3(x, 0, z)));
    // the plot and a margin round it (a fox's brush sweeps wide as he turns), but where a path runs through the margin, only
    // the plot itself: the paths between plots and to their gates stay open (plots corner to corner could shut them in)
    const g = pl.kind === 'coop' ? 0.4 : GROW, m = inv.copy(frame.matrixWorld).invert(), v = new THREE.Vector3();
    nav.mark(wb.min.x - g, wb.min.z - g, wb.max.x + g, wb.max.z + g, (x, z) => {
      v.set(x, 0, z).applyMatrix4(m);
      if (v.x < lo.x - g || v.x > hi.x + g || v.z < lo.z - g || v.z > hi.z + g) return false;
      if (v.x > lo.x - 0.1 && v.x < hi.x + 0.1 && v.z > lo.z - 0.1 && v.z < hi.z + 0.1) return true;
      return !nearLine(V.paths, x, z, V.pathHalf + 0.05);
    });
  }
  nav.circle(FOX_DEN[0] - Math.sin(FOX_DEN[2]) * 0.08, FOX_DEN[1] - Math.cos(FOX_DEN[2]) * 0.08, 0.68 + GROW);
  if (HAS_DOG) {                                     // Biscuit's kennel and his bowls
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
  // the game: the wild meadow's fence (the farmer keeps to your land and the lanes), and its edge with the woods round the
  // farm closed too (no way round into it from outside)
  if (GAME_MODE && FIELDS && game.data) for (const pts of [...fenceLines(), ...fenceLines('edge')]) for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
    nav.mark(Math.min(ax, bx) - 0.3, Math.min(az, bz) - 0.3, Math.max(ax, bx) + 0.3, Math.max(az, bz) + 0.3, (x, z) => { const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); return Math.hypot(x - ax - dx * t, z - az - dz * t) < 0.2; });
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
// ------------------------------------------------------------------ the farmer (farmer.js, farmlife.js): Arthur by default, Rosie with
// ?farmer=f (in the game, the player's own choice and name). The farmhouse door: in front of the porch, facing out over
// the farm. ?farmer starts the view on the farmer.
let FARMER_LOOK = GAME_MODE ? (game.data ? game.data.farmer.look : 'm') : params.get('farmer') === 'f' ? 'f' : 'm';
const farmerName = () => GAME_MODE ? game.farmerName() : FARMER_NAME[FARMER_LOOK][LANG === 'fr' ? 1 : 0];
let farmLife = null, DOOR = null;
function farmDoor() {
  if (DOOR) return DOOR;
  const fh = V.props.find(p => p.model === 'farmhouse'), c = fh ? fh.pos : V.house, h = (fh ? fh.deg : 45) * DEG;
  const out = [Math.sin(h), Math.cos(h)], nav = navGrid();
  let at = null;
  for (let d = 1.3; d < 3 && !at; d += 0.1) { const x = c[0] + out[0] * d, z = c[2] + out[1] * d; if (nav.freeAt(x, z)) at = [x, z]; }
  return (DOOR = [...(at || [c[0] + out[0] * 2, c[2] + out[1] * 2]), h]);
}
// the farmer keeps to the paths: walking a path costs 1, the grass 3.2 (the village grid's own costs)
function pathCosts(nav) {
  if (nav.cost) return;
  nav.costs(3.2);
  for (const l of V.paths) for (let i = 1; i < l.length; i++) nav.costLine(l[i - 1][0], l[i - 1][2], l[i][0], l[i][2], V.pathHalf * 0.85, 1);
}
function buildFarmer() {
  if (params.get('lineup') || POSTER) return;
  const nav = navGrid(); pathCosts(nav);
  const door = farmDoor(), kh = KENNEL_AT[2], kd = nav.nearestIn(farmReach(), KENNEL_AT[0] + Math.sin(kh) * 1.7, KENNEL_AT[1] + Math.cos(kh) * 1.7, 0.8);
  // on the bank, a step back from where the geese go in and out, facing the water
  const R = farmReach(), pondSpots = geeseFlock ? geeseFlock.ways.filter((w, i) => i % 3 === 1).map(w => { const p = geeseFlock.at(w.t, 1.48), e = geeseFlock.at(w.t, 1.0); return [p[0], p[1], Math.atan2(e[0] - p[0], e[1] - p[1])]; }).filter(p => nav.freeAt(p[0], p[1]) && R[nav.iz(p[1]) * nav.nx + nav.ix(p[0])]) : [];
  const pond = () => pondSpots;
  const spots = () => {                                   // in front of each coop's fence (beside where Biscuit sits), the farm's corners
    const S = farmSpots(), coops = [];
    for (const p of plots) if (p.kind === 'coop' && p.frame) { const f = coopFront(p, -0.55); if (f) coops.push(f); }
    if (!decorSpots) decorSpots = decorList.filter(d => d.model !== 'duckhouse').map(d => { const c = new THREE.Vector3(); d.box.getCenter(c); c.applyMatrix4(d.m); return nav.nearestIn(farmReach(), c.x + 1.4, c.z + 1.4, 2.5); }).filter(Boolean);
    return { coops, farm: [...S.farm, ...decorSpots] };          // (the farmer stops by the decorations too)
  };
  farmLife = new FarmLife(scene, { look: FARMER_LOOK, name: farmerName(), nav, door, groundY, spots, pond, grade: nightGrade, lang: LANG, onBridge, greet: greetFarmer,
    kennel: kd && HAS_DOG ? [kd[0], kd[1]] : null, dog: () => farmDog, visit: () => nightVisit, dogName: () => dogName,
    others: () => [...(geeseFlock ? geeseFlock.geese : []), ...(duckFlock ? duckFlock.ducks.filter(d => d.wet < 0.3) : []), ...(farmDog && farmDog.group.visible ? [farmDog.dog] : [])],
    toCamera: (x, z) => Math.atan2(camera.position.x - x, camera.position.z - z), inView: (x, z) => inView(x, z, 2.2) }, rng(71));
}

// ------------------------------------------------------------------ the farmer in a pen: a cuddle, or filling the feeder
// Tap a hen by day: "♥ Cuddle" and "Fill the feeder" (the game's own words). The farmer comes to the pen, in through its open
// gate (round the water dish), and either crouches for her (she hurries over and settles in front of him; he strokes her,
// "There, there…", hearts float up) or tips the pail into the feeder and scatters corn ("Dinner time!"), the hens rushing
// over to peck it up grain by grain; then out by the gate again. The other birds keep out of his way. (In the game the
// effect is the game's; this is only the show.) Everything here is in the pen's own frame (plot.frame).
const HEN_TEXT = { cuddle: ['♥ Cuddle', '♥ Faire un câlin'], fill: ['Fill the feeder', 'Remplir la mangeoire'],
  coming: ['{farmer} is on the way…', '{farmer} arrive…'] };
const henT = k => HEN_TEXT[k][LANG === 'fr' ? 1 : 0].replace('{farmer}', farmerName());
const henEls = { box: document.getElementById('henbtns'), cuddle: document.getElementById('cuddlebtn'), fill: document.getElementById('feedbtn') };
let henBird = null, henBtnLeft = 0;
const FEEDER_LOW = 0.04, FEEDER_FULL = 0.065;
// a spot in the yard a grain can land on: inside the fence, off the feeder, the water and the hay
function yardFree(x, z) {
  const Y = PEN.yard;
  if (x < Y.min[0] + 0.06 || x > Y.max[0] - 0.06 || z < Y.min[2] + 0.06 || z > Y.max[2] - 0.06) return false;
  for (const o of PEN.obstacles) if (Math.hypot(x - o[0], z - o[2]) < o[3] + 0.03) return false;
  return true;
}
function penSpec(plot) {
  const f = plot.frame; f.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(f.matrixWorld).invert(), v = new THREE.Vector3();
  const W = (x, z) => { v.set(x, 0, z).applyMatrix4(f.matrixWorld); return [v.x, v.z]; };
  const H = (a, b) => { const A = W(a[0], a[1]), B = W(b[0], b[1]); return Math.atan2(B[0] - A[0], B[1] - A[1]); };
  const gx = PEN.gate[0], gz = PEN.pen.max[2], o = W(gx, gz + 0.6), out = navGrid().nearestIn(farmReach(), o[0], o[1], 0.6);
  if (!out) return null;
  // (pen frame) just inside the gate, a step on (clear of the water dish), beside the feeder; then where he stands at the
  // back of the yard and where the corn goes (or where the hen settles), of three ways round the one that faces the player.
  // The pail hangs from his left hand, ahead of him and to his left (POUR, SCATTER: where it is then, in his own frame,
  // measured from the rig): he stands so that tipped it's just over the feeder's tray, clear of its tube and hat (Audrey:
  // "There is clipping with the farmer seed bucket"), and scatters the corn and walks with it clear of the feeder too
  const FD = [PEN.feeder[0], PEN.feeder[2]], POUR = [0.38, 0.27], over = 0.31, pr = Math.hypot(POUR[0], POUR[1]), side = Math.atan2(POUR[0], POUR[1]);
  const IN = [gx + 0.15, 2.26], S = [gx + 0.47, 2.08], CLEAR = [0.45, 1.5];
  const c = W(0.4, 1.3), camH = Math.atan2(camera.position.x - c[0], camera.position.z - c[1]), off = h => Math.abs(Math.atan2(Math.sin(h - camH), Math.cos(h - camH)));
  const best = list => list.reduce((a, b) => off(H(a[0], a[1])) <= off(H(b[0], b[1])) ? a : b);
  const [B, SC] = best([[[0.66, 0.98], [0.22, 1.6]], [[0.2, 0.95], [0.8, 1.55]], [[0.55, 0.95], [0.55, 1.75]]]);
  const [CB, ahead] = best([[[0.78, 1.05], [0.47, 1.36]], [[0.25, 1.0], [0.56, 1.31]], [[0.55, 1.0], [0.55, 1.44]]]);
  // where he pours from: round the feeder, in the yard and clear of what's in it, the one where he faces the player most
  const Y = PEN.yard, pours = [131, 15, 60, 95].map(d => { const a = d * DEG; return [FD[0] - (pr + over) * Math.sin(a), FD[1] - (pr + over) * Math.cos(a)]; })
    .filter(([x, z]) => x > Y.min[0] + 0.2 && x < Y.max[0] - 0.2 && z > Y.min[2] + 0.12 && z < Y.max[2] - 0.15 && !PEN.obstacles.some(o => o !== PEN.obstacles.find(q => q[0] === FD[0] && q[2] === FD[1]) && Math.hypot(x - o[0], z - o[2]) < o[3] + 0.18));
  const FS = pours.reduce((a, b) => off(H(a, FD) - side) <= off(H(b, FD) - side) ? a : b);
  // the hen settles a little in front of him and to his right, under his stroking hand
  const fl = Math.hypot(ahead[0] - CB[0], ahead[1] - CB[1]), fx = (ahead[0] - CB[0]) / fl, fz = (ahead[1] - CB[1]) / fl;
  const spot = [CB[0] + fx * 0.44 - fz * 0.04, CB[1] + fz * 0.44 + fx * 0.04];      // (clear of his knees as he crouches)
  const base = plot.block || [];
  const P = {
    plot, out,
    in: [W(gx, gz + 0.12), W(IN[0], IN[1]), W(S[0], S[1])], back: [W(S[0], S[1]), W(IN[0], IN[1]), W(gx, gz + 0.12), out],
    toGate: H([gx, gz + 0.6], [gx, gz]), feederAt: W(FS[0], FS[1]), toFeeder: H(FS, FD) - side, clear: W(CLEAR[0], CLEAR[1]),
    throwAt: W(B[0], B[1]), toCorn: H(B, SC), crouchAt: W(CB[0], CB[1]), toHen: H(CB, ahead),
    enter() { plot.fb = [S[0], S[1], 0.42]; plot.pb = [S[0], S[1], 0]; plot.block = [...base, plot.fb, plot.pb]; plot.farmer = { x: S[0], z: S[1], hen: null }; },      // (the hens keep clear of him: no one through his legs)
    // where he is (and his pail, when he has it: the hens keep out of it too)
    at(pos, pail) {
      if (!plot.farmer) return;
      v.copy(pos).applyMatrix4(inv); const F = plot.farmer, mx = v.x - F.x, mz = v.z - F.z; F.mv = Math.hypot(mx, mz) > 0.004; if (F.mv) F.dir = Math.atan2(mx, mz); F.x = plot.fb[0] = v.x; F.z = plot.fb[1] = v.z;      // (and which way he's going)
      if (pail) { v.copy(pail).applyMatrix4(inv); plot.farmer.px = plot.pb[0] = v.x; plot.farmer.pz = plot.pb[1] = v.z; plot.pb[2] = 0.2; }
      else { plot.farmer.px = undefined; plot.pb[2] = 0; }
    },
    leave() { plot.block = base; plot.farmer = null; plot.fb = null; plot.pb = null; for (const b of plot.birds) b.called = false; },
    reserve(b) { if (b) b.called = true; },                  // (sent for: she doesn't go off to lay meanwhile)
    // the hens and the rooster, where he must mind them (world)
    hens() { return plot.birds.filter(b => b.root.visible && !(b.laying && b.laying.inside)).map(b => ({ pos: b.root.getWorldPosition(new THREE.Vector3()), R: 0.32, noPush: true })); },
    fill(u) { if (plot.feedMesh) plot.feedMesh.position.y = FEEDER_LOW + (FEEDER_FULL - FEEDER_LOW) * Math.max(0, Math.min(1, u)); },
    scatter(hand, n) {
      const C = plot.corn || (plot.corn = new Corn(plot.frame, yardFree, rng(77 + plots.indexOf(plot)), nightGrade));
      const first = !C.left, F = plot.farmer;
      C.handful(v.copy(hand).applyMatrix4(inv), SC[0], SC[1], 0.42, n, F ? [F.x, F.z, 0.55] : null);
      if (first) for (const b of plot.birds) if (!b.busy() && !b.cuddle) b.feedIn = b.pers === 'glutton' ? 0.45 : 0.6 + b.r() * 0.9;      // corn! off they go
    },
    callHen(b) {
      if (!plot.farmer || !b || b.busy()) return null;
      plot.farmer.hen = b; plot.block = [...plot.block, [spot[0], spot[1], 0.22, b]];
      for (const o of plot.birds) if (o !== b && o.root.visible && !o.busy() && Math.hypot(o.root.position.x - spot[0], o.root.position.z - spot[1]) < 0.4) o.shooFrom(spot[0], spot[1]);      // (anyone sitting where she'll be: up and off)
      return b.comeForCuddle(spot, Math.atan2(CB[0] - spot[0], CB[1] - spot[1]), [plot.farmer.x, plot.farmer.z])
        ? () => !b.cuddle || (b.cuddle.ready && Math.hypot(b.root.position.x - spot[0], b.root.position.z - spot[1]) < 0.16) : null;      // (there in front of him: only then is she picked up)
    },
    letGo(b) { if (b) { b.called = false; if (b.cuddle) { b.cuddle.carry = null; b.cuddle.done = true; } b.shadowY = undefined; b.root.position.y = 0.015; if (b.rig.shut) b.rig.sleepy(false); } },
    // lifted k of the way from where she settled (0) into his arms (1): in front of his chest, across his arms with her head
    // to his left, sitting, her eyes shut once she's up; her shadow stays on the ground
    lift(b, k, Lf) {
      const C = b.cuddle; if (!C) return;
      if (!Lf || k <= 0) { C.carry = null; b.shadowY = undefined; b.root.position.y = 0.015; if (b.rig.shut) b.rig.sleepy(false); return; }
      const h = Lf.heading, Lp = Lf.pos, hold = v.set(Lp.x + Math.sin(h) * 0.22, 0.69, Lp.z + Math.cos(h) * 0.22).applyMatrix4(inv);
      const ground = C.from || (C.from = { x: b.root.position.x, z: b.root.position.z, yaw: b.root.rotation.y });
      const ry = (h + Math.PI / 2) - plot.group.rotation.y, dy = Math.atan2(Math.sin(ry - ground.yaw), Math.cos(ry - ground.yaw));
      const arc = Math.sin(k * Math.PI) * 0.06;
      C.carry = { k, x: ground.x + (hold.x - ground.x) * k, y: 0.015 + (hold.y - 0.015) * k + arc, z: ground.z + (hold.z - ground.z) * k, yaw: ground.yaw + dy * Math.min(1, k * 1.4) };
      b.shadowY = 0.015;
      b.rig.sleepy(k > 0.9);
    },
    heart(b) { const p = b.root.getWorldPosition(new THREE.Vector3()); p.y += b.rig.scale * 0.8; spawnHeart(p); },
  };
  return P;
}
// hearts floating up (a cuddle): sprites from a little pool, as the song's notes
const HEARTS = []; let heartMat = null;
function spawnHeart(at) {
  if (!heartMat) {
    heartMat = new THREE.SpriteMaterial({ map: fxTexture64(64, c => { c.fillStyle = '#ff6b8a'; c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(4, 34, 10, 8, 32, 22); c.bezierCurveTo(54, 8, 60, 34, 32, 54); c.fill(); c.lineWidth = 3; c.strokeStyle = '#fff4f6'; c.stroke(); }), transparent: true, depthWrite: false });
    heartMat.userData.noGrade = true;
  }
  let n = HEARTS.find(x => x.life <= 0);
  if (!n) { if (HEARTS.length > 24) return; n = { sprite: new THREE.Sprite(heartMat.clone()), life: 0 }; n.sprite.renderOrder = 3; scene.add(n.sprite); HEARTS.push(n); }
  n.sprite.position.set(at.x + (Math.random() - 0.5) * 0.1, at.y, at.z + (Math.random() - 0.5) * 0.1); n.sprite.scale.setScalar(1e-4);
  n.size = 0.1 + Math.random() * 0.04; n.life = n.full = 1.5;
  n.drift = [(Math.random() - 0.5) * 0.08, 0.32 + 0.08 * Math.random(), (Math.random() - 0.5) * 0.08];
  n.sprite.visible = true;
}
function tickPenFx(dt) {
  for (const n of HEARTS) {
    if (n.life <= 0) continue;
    n.life -= dt; if (n.life <= 0) { n.sprite.visible = false; continue; }
    const t = 1 - n.life / n.full;
    n.sprite.position.x += n.drift[0] * dt; n.sprite.position.y += n.drift[1] * dt; n.sprite.position.z += n.drift[2] * dt;
    const s = n.size * Math.min(1, t * 6); n.sprite.scale.set(s, s, s); n.sprite.material.opacity = Math.min(1, (1 - t) * 2.5);
  }
  for (const p of plots) if (p.corn) p.corn.update(dt);
  tickDecor(dt);
}
// the buttons after tapping a hen (by day, the farmer out and about, she not laying or off to bed)
function henTapped(b) {
  if (!henEls.box || !farmLife || farmLife.home || farmLife.running || !b.plot || b.plot.kind !== 'coop' || b.busy() || b.nightNow(0.3)) { henOff(); return; }
  if (dogEls.btn) { dogEls.btn.hidden = true; dogBtnLeft = 0; }
  henBird = b; henEls.cuddle.textContent = henT('cuddle'); henEls.fill.textContent = henT('fill'); henEls.box.hidden = false; henBtnLeft = 6;
}
function henOff() { if (henEls.box) henEls.box.hidden = true; henBtnLeft = 0; }
function tickHenBtns(dt) { if (henBtnLeft > 0 && (henBtnLeft -= dt) <= 0) henOff(); }
function sendToPen(kind) {
  const b = henBird; henOff();
  if (!b || !farmLife) return null;
  const P = penSpec(b.plot); if (!P) return null;
  if (kind === 'fill') P.fill(0);                          // (the feeder was running low)
  const ok = farmLife.visitPen(P, kind, b);
  if (ok) hint(henT('coming'));
  return ok ? P : null;
}
if (henEls.box) { henEls.cuddle.addEventListener('click', () => sendToPen('cuddle')); henEls.fill.addEventListener('click', () => sendToPen('fill')); }

function buildNightVisit() {
  const fh = V.props.find(p => p.model === 'farmhouse'), house = fh ? [fh.pos[0], fh.pos[2]] : [V.house[0], V.house[2]];
  nightVisit = new NightVisit({ door: farmDoor(), farmerName,
    scene, fam: foxes, nav: navGrid(), coops: () => plots.filter(p => p.kind === 'coop'), doorOpen, nestOf, D2, house,
    grade: nightGrade, text: VISIT_TEXT, lang: LANG, r: rng(41), penObstacles: PEN.obstacles, groundY,
    busyPlot: p => inside.open && inside.plot === p,
    toCamera: (x, z) => Math.atan2(camera.position.x - x, camera.position.z - z),     // which way faces the player
    // a first visit 2-4 minutes into a night, then every 15-30 minutes (automated tests only get one with ?visit)
    firstIn: GAME_MODE ? Infinity : params.has('visit') ? 2.5 : navigator.webdriver ? Infinity : 120 + Math.random() * 120,
    again: () => GAME_MODE ? Infinity : params.has('visit') ? 25 : navigator.webdriver ? Infinity : 900 + Math.random() * 900,
    say(text, at, secs) { tag.textContent = text; tagBird = null; tagSpot.copy(at); tag.classList.add('on'); fieldTag = secs; },
    hint,
  });
  const go = nightVisit.start.bind(nightVisit);
  nightVisit.start = (i) => {               // ?visit: look at the coop he's going to
    const ok = go(i);
    if (ok) lastNight = { coop: nightVisit.target.index, open: doorOpen(nightVisit.target), hour: clockHour(), hen: heroHen(nightVisit.target) };     // (for the morning's replay)
    if (ok && params.has('visit') && !inside.open) { const c = nightVisit.target.frame.getWorldPosition(new THREE.Vector3()); view.target.set(c.x - 0.6, 0, c.z + 0.2); view.size = 4.6; clampView(); applyGrass(); placeCamera(); }
    return ok;
  };
  if (farmerBtn) { farmerBtn.textContent = nightVisit.T('send'); farmerBtn.addEventListener('click', () => { nightVisit.sendFarmer(); wake(800); }); }
}
function tickFoxes(dt) {
  if (farmDog) farmDog.update(dt, clockHour());
  if (geeseFlock && HAS_GEESE) geeseFlock.update(dt, clockHour());
  if (frogPond) frogPond.update(dt, clockHour());
  if (duckFlock) duckFlock.update(dt, clockHour());
  if (farmLife) farmLife.update(dt, clockHour());
  if (!foxes) return;
  foxes.update(dt, clockHour(), params.has('foxes'));
  if (foxLineup) foxLineup.update(dt);
  if (geeseLineup) { geeseLineup.update(dt); wake(100); }
  if (frogLineup) { frogLineup.update(dt); wake(100); }
  if (farmerLineup) { farmerLineup.update(dt); wake(100); }
  if (ShowLineup.on) { ShowLineup.on.update(dt); wake(100); }
  if (SHOWDAY) { SHOWDAY.update(dt); wake(100); }
  if (nightVisit) nightVisit.update(dt, clockHour(), { plot: VISIT_PLOT });
  if (farmDog) farmDog.separate();                   // (Biscuit out of Rusty's way, after everyone has moved)
  const prowl = !!(nightVisit && nightVisit.active() && nightVisit.fox.root.visible), out = foxes.visible() || prowl;
  if (foxBtn && foxBtn.hidden === out) foxBtn.hidden = !out;
  if (foxBtn && foxBtn.classList.contains('alarm') !== prowl) { foxBtn.classList.toggle('alarm', prowl); foxBtn.textContent = prowl ? nightVisit.T('btnFox') : 'Foxes'; }
  const send = !!(nightVisit && nightVisit.canSend());
  if (farmerBtn && farmerBtn.hidden === send) farmerBtn.hidden = !send;
  if (foxes.visible() && !foxHinted && !GAME_MODE) { foxHinted = true; hint('The foxes are out playing in the meadow: tap "Foxes" at the top to watch them.'); }
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
    const o = p.door || {};                                 // (made again, a new coop: each door as it was)
    p.door = { shut: !!o.shut, s: o.s ?? 1, goal: o.goal ?? 1, i: S.plots.length, badge: o.badge || null, kind: o.kind || null };
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
function rebuildDoors() {                                  // (a coop more, or less)
  for (const k in DOORS.styles) for (const m of DOORS.styles[k].meshes) { m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); }
  DOORS.styles = {};
  buildDoors();
}
function placeDoor(p) {                                    // (its coop moved)
  const S = DOORS.styles[p.breed]; if (!S || !p.door) return;
  const G = nestOf(p), M = p.frame.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(G.pop[0], G.house, D2));
  for (const inst of S.meshes) { inst.setMatrixAt(p.door.i, M); inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); inst.boundingSphere.radius += DOOR_RUN; }
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
      else if (d.goal === 1 && d.s >= 1 && evening() && p.birds.length && p.birds.every(inForNight)) kind = 'moon';
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
  if (n.length === 1) return vt('out1', { a: n[0] });
  if (n.length === 2) return vt('out2', { a: n[0], b: n[1] });
  return vt('outn', { a: n[0], b: n[1], n: n.length - 2 });
}
// a tap on a coop's pop door (or its badge, or the door inside): shut it at night once everyone's in, open it again
function doorTap(p, at) {
  const d = p.door; if (!d) return;
  let msg;
  if (d.goal === 1 && nightVisit && nightVisit.active() && nightVisit.target === p && nightVisit.lz != null) msg = nightVisit.T('inWay');
  else if (d.goal === 0) {
    setDoor(p, true);
    msg = p.birds.some(b => b.asleep && !b.nightNow()) ? vt('door_morning') : vt('door_open');
  } else if (!evening()) msg = vt('door_day');
  else {
    const out = p.birds.filter(b => !inForNight(b));
    if (out.length) msg = vt('door_notyet', { who: doorWho(out) });
    else { setDoor(p, false); msg = vt('door_shut'); }
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
const freeBlobs = [];                       // (the game: room for chicks hatched later)
function makeBlobs() {
  scene.updateMatrixWorld(true);
  const room = allBirds.length + (GAME_MODE ? 40 : 0);
  blobs = new THREE.InstancedMesh(blobGeo, blobMat, Math.max(1, room));
  blobs.renderOrder = 1; blobs.frustumCulled = false;
  allBirds.forEach((b, i) => { b.blob = i; placeBlob(b); });
  for (let i = room - 1; i >= allBirds.length; i--) { blobs.setMatrixAt(i, NO_BLOB); freeBlobs.push(i); }
  blobs.count = room;
  scene.add(blobs);
}
const NO_BLOB = new THREE.Matrix4().makeScale(0, 0, 0);
function placeBlob(b) {
  if (b.blob === undefined || b.blob < 0) return;
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
    if (GAME_MODE) return this.name;
    const what = this.breed === 'sil' ? 'Silkie, ' + this.colour : BREED_NAMES[this.breed];
    const pers = this.pers ? ' · ' + PERS_NAMES[this.pers] : '';
    const doing = this.laying && this.laying.inside ? ' · laying' : '';
    return this.name + ' · ' + what + (this.kind === 'chick' ? ' chick' : this.kind === 'rooster' ? ' rooster' : '') + pers + doing;
  }
  free(x, z, notFarmer = false) {
    if (this.plot.kind === 'lineup') return true;
    const Y = PEN.yard;
    if (x < Y.min[0] || x > Y.max[0] || z < Y.min[2] || z > Y.max[2]) return false;
    for (const o of PEN.obstacles) { const dx = x - o[0], dz = z - o[2]; if (dx * dx + dz * dz < o[3] * o[3]) return false; }
    return !this.inBlock(x, z, notFarmer);
  }
  inBlock(x, z, notFarmer = false) {
    for (const o of this.plot.block || []) { if (o[3] === this || (notFarmer && o === this.plot.pb) || (notFarmer === true && o === this.plot.fb)) continue; const dx = x - o[0], dz = z - o[1], r = o === this.plot.fb && this.cuddle && !this.cuddle.greet ? 0.3 : o[2]; if (dx * dx + dz * dz < r * r) return true; }      // (notFarmer: him and his pail, or 'pail': just that; the hen he's called may come up close in front of him)
    return false;
  }
  // stepping to (x, z) facing yaw: her breast and beak, ahead of her feet, mustn't go into the house's walls, through the fence
  // or into what stands in front of the house
  clearAhead(x, z, yaw) {
    if (this.plot.kind === 'lineup') return true;
    const reach = 0.22 * this.rig.scale / 0.5, Y = PEN.yard, m = 0.12;
    const px = x + Math.sin(yaw) * reach, pz = z + Math.cos(yaw) * reach;
    if (px < Y.min[0] - m || px > Y.max[0] + m || pz < Y.min[2] - m || pz > Y.max[2] + m) return false;
    return !this.inBlock(px, pz, this.cuddle && !this.cuddle.greet ? true : false);      // (the hen he's called: her beak may come up to him, he's reaching for her)
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
  // ---- the farmer in the pen (farmlife.js visitPen, penvisit.js): plot.farmer is where he is in the pen's frame
  busy() { return this.laying || this.roost || this.asleep || this.leaving; }
  // grown and off to a new farm (main.js chicksGo, tickFarewell): to her place in the line just inside the gate ('gather'),
  // turning to face out, hopping for joy there ('party': tickFarewell's hops; the flaps here), then out of the gate along
  // the way out ('exit'), and gone down the lane ('fade')
  leaveStep(dt) {
    const L = this.leaving, p = this.root.position;
    L.t = (L.t || 0) + dt;
    if (L.phase === 'fade') {                                               // (past the farm's edge: still trotting on as they go)
      const s = Math.max(0, 1 - L.t / 0.7); this.root.scale.setScalar((this.size || 1) * s); if (L.t >= 0.7) L.gone = true;
      if (L.on) { const y = this.root.rotation.y; p.x += Math.sin(y) * L.on * dt; p.z += Math.cos(y) * L.on * dt; this.pace = 1.9; return true; }
      return false;
    }
    if (L.phase === 'gather' || L.phase === 'party') {
      let walking = false, flap = 0;
      if (L.route && L.route.length) {
        const q = L.route[0], r = this.stepToward(q[0], q[1], dt, 1.3, !(L.stuck > 0.6));
        walking = r.walking; L.stuck = r.blocked ? (L.stuck || 0) + dt : 0;
        if (r.arrived || L.t > 12) L.route.shift();
      } else if (L.face !== undefined) walking = this.turnTo(L.face, dt).walking;
      if (L.flapT !== undefined && L.flapT < 0.8) { L.flapT += dt; flap = Math.sin(Math.min(1, L.flapT / 0.8) * Math.PI); }
      return { walking, flap };
    }
    const q = L.path && L.path[0];                                          // 'exit': out of the gate and off the farm, a trot
    if (!q || L.t > 120) { L.phase = 'fade'; L.t = 0; return false; }
    const dx = q[0] - p.x, dz = q[1] - p.z, dist = Math.hypot(dx, dz);
    if (dist < 0.06) { L.path.shift(); if (!L.path.length) { L.phase = 'fade'; L.t = 0; L.on = 0.7; } return true; }
    const want = Math.atan2(dx, dz); let diff = ((want - this.root.rotation.y + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    this.root.rotation.y += Math.max(-dt * 6, Math.min(dt * 6, diff));
    const A = L.ahead && L.ahead.leaving && !L.ahead.leaving.gone && L.ahead.plot.birds.includes(L.ahead) ? L.ahead.root.position : null;
    const close = A && Math.hypot(A.x - p.x, A.z - p.z) < 0.42 && (A.x - p.x) * dx + (A.z - p.z) * dz > 0;     // (the one ahead: never into her)
    if (Math.abs(diff) < 0.6 && !close) { const st = Math.min(dist, 0.7 * dt); p.x += dx / dist * st; p.z += dz / dist * st; }
    this.plot.frame.localToWorld(bubV.set(p.x, 0, p.z)); p.y = 0.015 + groundY(bubV.x, bubV.z);      // (over a footbridge: its deck)
    this.pace = 2.1;
    return !close || Math.abs(diff) > 0.1;
  }
  penStep(dt) {
    const F = this.plot.farmer;
    if (this.shooT > 0) this.shooT -= dt;
    const onGround = !this.roost && !this.asleep && (!this.laying || this.laying.phase === 'go' || this.laying.phase === 'sing');
    if (F && onGround) {                                   // never inside his boots: out to the edge of where he stands
      const p = this.root.position, dx = p.x - F.x, dz = p.z - F.z, d = Math.hypot(dx, dz), min = this.kind === 'chick' ? 0.27 : 0.33;
      if (d < min) {
        const a0 = d > 1e-4 ? Math.atan2(dx, dz) : this.r() * 6.28;
        for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4]) {        // (squeezed against the feeder, say: round him)
          const tx = F.x + Math.sin(a0 + da) * min, tz = F.z + Math.cos(a0 + da) * min;
          if (!this.free(tx, tz, true)) continue;
          const k = Math.min(1, dt * 20); p.x += (tx - p.x) * k; p.z += (tz - p.z) * k; break;
        }
      }
    }
    if (F && onGround && F.px !== undefined) {           // nor in his pail: out to its edge
      const p = this.root.position, dx = p.x - F.px, dz = p.z - F.pz, d = Math.hypot(dx, dz), min = this.kind === 'chick' ? 0.2 : this.kind === 'rooster' ? 0.34 : 0.27;      // (his tail too)
      if (d < min) {
        const a0 = d > 1e-4 ? Math.atan2(dx, dz) : this.r() * 6.28;
        for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4]) {
          const tx = F.px + Math.sin(a0 + da) * min, tz = F.pz + Math.cos(a0 + da) * min;
          if (!this.free(tx, tz, 'pail') || Math.hypot(tx - F.x, tz - F.z) < (this.kind === 'chick' ? 0.27 : 0.33)) continue;      // (never into his boots instead)
          const k = Math.min(1, dt * 30); p.x += (tx - p.x) * k; p.z += (tz - p.z) * k; break;
        }
      }
    }
    if (F && !this.busy() && this !== F.hen && !(this.shooT > 0)) {        // right by him: a few quick steps out of his way
      const p = this.root.position, dx = p.x - F.x, dz = p.z - F.z, d = Math.hypot(dx, dz);
      if (d < 0.42) {
        let a0 = d > 1e-3 ? Math.atan2(dx, dz) : this.r() * 6.28, das = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.2, -2.2];
        if (F.mv && F.dir !== undefined) {         // (he's walking her way: aside, off his line, not on ahead of him to be herded along)
          const rel = Math.atan2(Math.sin(a0 - F.dir), Math.cos(a0 - F.dir));
          if (Math.abs(rel) < 1.9) { const s = rel >= 0 ? 1 : -1, d0 = a0 - F.dir; a0 = F.dir; das = [s * 1.57, s * 1.15, s * 2.0, s * 0.8, s * 2.5, -s * 1.57, -s * 2.0, -s * 1.15, ...das.map(x => x + d0)]; }      // (or, hemmed in, any way out)
        }
        for (const da of das) {
          const x = F.x + Math.sin(a0 + da) * 0.75, z = F.z + Math.cos(a0 + da) * 0.75;
          if (!this.free(x, z)) continue;
          this.act = null; this.wait = 0; this.then = null; this.eatAt = null; this.route = this.plan([[x, z]]); this.pace = 1.5; this.nextLeg();
          this.shooT = 0.9; if (this.plot.corn && this.plot.corn.left) this.feedIn = 1.0 + this.r() * 0.5;
          break;
        }
      }
    }
    if (this.feedIn > 0 && !this.busy() && !this.cuddle) { this.feedIn -= dt; if (this.feedIn <= 0) this.goEat(); }
  }
  // corn on the ground: off to the nearest grains (hurrying; the glutton fastest), a good peck there, then the next
  goEat() {
    const C = this.plot.corn; if (!C || this.busy() || this.cuddle) return false;
    const p = this.root.position, g = C.pick(p.x, p.z, this, this.flock);
    if (!g) { this.eatAt = null; if (C.flying) this.feedIn = 0.3; return false; }
    const dx = g[0] - p.x, dz = g[1] - p.z, d = Math.hypot(dx, dz), reach = 0.13 * this.rig.scale / 0.5;
    this.eatAt = g; this.act = null; this.wait = 0; this.then = { type: 'peck', left: 1.2 + this.r() * 1.2, eat: true };
    if (d > reach + 0.05) {
      let sx = g[0] - dx / d * reach, sz = g[1] - dz / d * reach;
      if (!this.free(sx, sz)) { sx = g[0]; sz = g[1]; }
      this.route = this.plan([[sx, sz]]); this.pace = this.pers === 'glutton' ? 1.9 : this.kind === 'chick' ? 1.3 : 1.55; this.nextLeg();
    } else { this.root.rotation.y = Math.atan2(dx, dz); this.route = null; this.act = this.then; this.then = null; this.wait = this.act.left + 0.1; }
    return true;
  }
  ate() {                                  // the end of a peck: the grains under her beak gone, then on to the next
    const C = this.plot.corn; if (!C) return;
    const p = this.root.position, y = this.root.rotation.y, reach = 0.13 * this.rig.scale / 0.5;
    C.eat(p.x + Math.sin(y) * reach, p.z + Math.cos(y) * reach, 0.1, 4);
    this.eatAt = null; if (C.left > 0) this.feedIn = 0.12 + this.r() * 0.35;
  }
  // the farmer crouched in the pen for a cuddle: she hurries over to `spot` and settles there facing him (face: her heading)
  // up and a few steps away from (cx, cz)
  shooFrom(cx, cz) {
    const p = this.root.position, a0 = Math.atan2(p.x - cx, p.z - cz);
    for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.2, -2.2]) {
      const x = cx + Math.sin(a0 + da) * 0.7, z = cz + Math.cos(a0 + da) * 0.7;
      if (!this.free(x, z)) continue;
      this.act = null; this.wait = 0; this.then = null; this.eatAt = null; this.route = this.plan([[x, z]]); this.pace = 1.5; this.nextLeg(); this.shooT = 0.9;
      return true;
    }
    return false;
  }
  comeForCuddle(spot, face, around) {
    if (this.busy()) return false;
    this.cuddle = { spot, face, ready: false, done: false }; this.eatAt = null; this.feedIn = 0;
    this.act = null; this.wait = 0; this.then = { type: 'cuddle', left: 60 };
    // (from behind him: round him, wide of his feet, never through him)
    let route = this.plan([spot]);
    if (around && route[route.length - 1] !== spot) {
      const ux = spot[0] - around[0], uz = spot[1] - around[1], ul = Math.hypot(ux, uz) || 1, side = a => { const c = Math.cos(a), s = Math.sin(a); return [around[0] + (ux * c - uz * s) / ul * 0.66, around[1] + (ux * s + uz * c) / ul * 0.66]; };
      for (const via of [[side(1.15)], [side(-1.15)], [side(2.4), side(1.15)], [side(-2.4), side(-1.15)]]) {
        if (!via.every(q => this.free(q[0], q[1]))) continue;
        const r = this.plan([...via, spot]); if (r[r.length - 1] === spot && r.length >= via.length + 1) { route = r; break; }
      }
    }
    this.route = route; this.pace = 1.9; this.nextLeg();
    return true;
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
    // the farmer in the pen near where a jumper takes off or lands: she waits for him to move on before she leaps
    const farmerBy = () => { const F = this.plot.farmer; return F && Math.hypot(F.x - launch[0], F.z - launch[1]) < 0.6; };
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
        if (t.done && L.t > 0.5 && !farmerBy()) { next('leapin'); L.inside = true; L.to = new THREE.Vector3(G.seat[0], NF + 0.025, D2 - 0.4); }
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
        if (L.broody && L.t > L.sit && this.nightNow(0.1)) L.sit = L.t + 20;          // (hatched in the night: she stays put till morning)
        if (L.t > L.sit) { next('rise'); if (!L.broody) { const n = this.plot.nest; n.count++; n.pop = 0; if (GAME_MODE) gameLaid(this); showEggs(this.plot); } }
        break;
      case 'rise': {                                         // she stands, backing off the seat: the new egg is in the straw
        const n = this.plot.nest; n.pop = Math.min(1, L.t / 0.35); showEggs(this.plot); onNest();
        if (L.t > 1.0) {
          if (L.jump && farmerBy()) break;
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
        if (r.done) { L.inside = false; next('sing'); this.plot.nest.by = null; this.answer(); this.rig.indoor(null); if (L.broody) hatchOut(this); }
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
    this.laying = null; this.layIn = GAME_MODE ? undefined : 240 + this.r() * 240; this.rig.indoor(null); this.shadowY = undefined;
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
      else if (night && !this.roost && !this.laying && !this.leaving) this.goToBed();
    }
    if (this.plot.kind === 'coop' && !this.stay) this.penStep(dt);          // the farmer in the pen: keeping clear, corn, a cuddle
    // time to lay? (hens in a coop, one in the nest box at a time; not just before bedtime)
    if (this.layIn !== undefined && !this.laying && !this.roost && !this.stay && this.plot.nest && !this.cuddle && !this.called && !this.plot.farmer) {
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
    } else if (this.leaving) {
      const o = this.leaveStep(dt);
      if (o && typeof o === 'object') { walking = o.walking; flap = o.flap; } else walking = !!o;
    } else if (act) {
      act.left -= dt;
      if (act.type !== 'crow' && act.type !== 'flap' && act.type !== 'cuddle' && this.tooClose()) act.left = Math.min(act.left, 0.05);
      if (act.type === 'cuddle') {                 // settled in front of the farmer, facing him, till he's done (greeting him at the fence: standing)
        const C = this.cuddle, G = C && C.greet; sitGoal = G ? 0 : 1;
        if (C && !C.done) {
          const p = this.root.position, off = G || C.carry ? 0 : Math.hypot(C.spot[0] - p.x, C.spot[1] - p.z);
          if (C.carry) { const K = C.carry; p.set(K.x, K.y, K.z); this.root.rotation.y = K.yaw; }      // (in his arms, or on the way up or down)
          else if (off > 0.06) {                   // (not quite there yet: the last little steps up to him)
            const r = this.stepToward(C.spot[0], C.spot[1], dt, 0.8, !(C.stuck > 1.2)); walking = r.walking; C.stuck = r.blocked || C.stuck > 1.2 ? (C.stuck || 0) + dt : 0; sitGoal = 0;
          } else this.turnTo(C.face, dt);
          C.ready = off < 0.12; if (G) { if (!G.t) heartOver(this); G.t += dt; if (G.t > 2.6) C.done = true; }
        } else act.left = 0;
      }
      if (act.type === 'peck') peckGoal = (act.left % 0.55) > 0.24 ? 1 : 0.3;
      if (act.type === 'scratch') {                // two kicks back, a step back, then a look at what turned up
        if (act.left > 0.9) { kick = 1; A.kickLeg = act.leg; A.kickT += dt; } else peckGoal = (act.left % 0.45) > 0.2 ? 1 : 0.4;
      }
      if (!act.dur) act.dur = act.left + dt;
      if (act.type === 'flap') flap = Math.sin(Math.max(0, Math.min(1, (act.dur - act.left) / act.dur)) * Math.PI);
      if (act.type === 'crow') { const t = act.dur - act.left; flap = t < 0.45 ? Math.sin(t / 0.45 * Math.PI) : 0; crow = t < 0.45 ? 0 : Math.min(1, (t - 0.45) / 0.25) * Math.min(1, act.left / 0.3); }
      if (act.type === 'rest') { sitGoal = 1; wag = 0; }
      if (act.type === 'ruffle') ruffle = Math.sin(Math.max(0, Math.min(1, (act.dur - act.left) / act.dur)) * Math.PI);
      if (act.left <= 0) {
        this.act = null; this.wait = Math.min(this.wait, 0.2 + this.r() * 0.6); this.acted = true;
        if (act.eat) this.ate();
        if (act.type === 'cuddle') { this.cuddle = null; this.act = { type: 'ruffle', left: 0.75 }; this.wait = 0.9; }      // a happy shake
      }
    } else if (this.wait > 0) {
      if (this.held) { this.wait = Math.max(this.wait, 0.6); const t = this.turnTo(Math.atan2(VIEW_DIR.x, VIEW_DIR.z) - this.plot.group.rotation.y, dt * 0.8); walking = t.walking; }     // (her card's open: she stays and faces you)
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
    if (this.posterPose) this.posterPose(A, dt);            // (the welcome picture: a pose held just so)
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

// ------------------------------------------------------------------ ?poster: the stage for the game's welcome picture (Audrey, 24 Oct:
// "an image that would represent the game with a farmer, few chickens from different breeds, the geese, the dog. All of them
// together and interacting needs to be funny"). Breakfast at the Red Barn: the farmer throws the corn and the hens of every
// breed rush in to peck it up; the Rhode Island Red rooster crows from the top of a round bale; Gertrude hisses, wings out,
// at Biscuit, who answers with a delighted play bow, a chick riding on his back; Hector honks his support from behind her.
// Out on the grass past the village (as the line-ups), its own little set round it. gamefilm-style scripts pose and shoot it.
let poster = null;
function buildPoster(joints) {
  const O = villageCentre().add(new THREE.Vector3(32, 0, 32)), r = rng(123);
  const g = new THREE.Group(); g.position.copy(O); g.rotation.y = 45 * DEG; scene.add(g); g.updateMatrixWorld(true);     // (its +z towards the camera)
  const set = [];
  const prop = (name, x, z, deg = 0, s = 1) => { if (!parts[name]) return null; const m = part(name); m.position.set(x, 0, z); m.rotation.y = deg * DEG; m.scale.setScalar(s); still(m, true, true); g.add(m); set.push(m); return m; };
  prop('house_rir', -0.35, -2.75, 0); prop('round_bale', 0.6, -1.25, 75); prop('wheelbarrow', 1.75, -1.45, -35); prop('flower_pots', 0.75, -2.35, 0);
  prop('tree_apple', 2.4, -3.6, 0); prop('tree_a', -2.9, -3.8, 40); prop('bush_a', 1.7, -2.6, 0, 0.8); prop('bush_b', -2.1, -2.2, 0, 0.7);
  prop('bush_b', 3.5, 0.5, 30, 0.75); prop('bush_a', -3.4, 0.9, 0, 0.7); prop('flower_pots', 3.0, -0.9, 20, 0.9);     // (the sides, for the wide picture)
  for (let i = 0; i < 110; i++) { const a = r() * 6.28, d = 0.8 + r() * 4.2, x = Math.cos(a) * d * 1.3, z = Math.sin(a) * d - 0.4; if (Math.abs(x) < 1.6 && z > -0.9 && z < 1.6) continue; prop(['grass_tuft_0', 'grass_tuft_1', 'grass_tuft_2', 'flower_daisy', 'flower_butter'][i % 5], x, z, r() * 360, 0.8 + r() * 0.5); }
  const plot = { kind: 'lineup', frame: g, birds: [], centre: O, poster: true };
  plots.push(plot);
  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  const bird = (breed, kind, colour, x, z, tx, tz, act) => { const b = new Bird(plot, breed, kind, colour, [x, 0, z], face(x, z, tx, tz), r); b.stay = true; b.posterAct = act; plot.birds.push(b); return b; };
  const rooster = bird('rir', 'rooster', null, 0.6, -1.25, 0.2, 2, 'crow');
  // (the hens, each busy in her own space: the Orpington and the Brahma in a tug of war over a worm, the Cream Legbar
  // leaping in, wings wide, the black Silkie scratching the corn heap so the grains fly, the white Silkie running in late)
  const C = [-0.2, 0.85];
  const orp = bird('orp', 'hen', null, -0.7, 1.28, 1, 1.28, null), bra = bird('bra', 'hen', null, 0.02, 1.28, -1.5, 1.28, null);
  const leg = bird('leg', 'hen', null, 1.62, 1.92, 0.6, 2.75, null), blk = bird('sil', 'hen', 'black', 0.92, 1.02, 2.2, 1.1, null);
  const wht = bird('sil', 'hen', 'white', -0.42, 0.62, -1.4, 0.75, null);
  const hens = [orp, bra, leg, blk, wht];
  const hold = (b, f) => { b.posterPose = f; };
  // the tug of war: the worm in the bill, leaning back hard, wings half out for balance
  for (const b of [orp, bra]) hold(b, A => { A.peck = 0.32; A.walk = 0; A.flap = 0.35; A.wag = 0.5; A.lookYaw = 0; A.lookTilt = 0.12; });
  // the Legbar in mid-leap: legs tucked, wings wide (A.t: the moment in the beat they're fully open)
  hold(leg, (A, dt) => { A.hopT = 0.52; A.flap = 1; A.t = 2.3; A.peck = 0; A.lookYaw = 0; A.lookTilt = 0; A.walk = 0; });
  // the black Silkie scratching: a kick back, head down at the heap
  hold(blk, A => { A.kick = 1; A.kickT = 0.18; A.kickLeg = 1; A.peck = 0.35; A.walk = 0; A.flap = 0; });
  // the white Silkie jumping up to catch a grain out of the air, beak up
  hold(wht, A => { A.hopT = 0.5; A.crow = 0.75; A.flap = 0.6; A.t = 2.3; A.peck = 0; A.walk = 0; A.lookYaw = 0; A.lookTilt = 0.1; });
  const chick = bird('sil', 'chick', 'buff', 1.2, 0.9, 1.5, 2, null);
  const hatHen = bird('sil', 'hen', 'buff', -1.0, 0.1, 0.5, 2, 'rest');          // (a Silkie sitting on his hat, quite at home)
  allBirds.push(...plot.birds);
  const farmer = new Farmer(g, 'm', nightGrade, r); farmer.pos.set(-1.15, 0, -0.05); farmer.root.rotation.y = 0.85;
  const gert = new Goose(g, 'embden', r), hector = new Goose(g, 'toulouse', r);
  gert.pos.set(2.2, 0, 0.16); gert.heading = -1.5;      // (a good beak's length between her and his nose: Audrey, "should not be almost touching the dog")
  gert.task = GOOSE_POSE.hiss;
  hector.pos.set(1.62, 0, -1.08); hector.heading = -2.2; hector.task = GOOSE_POSE.honk;
  for (const m of [gert, hector]) m.root.traverse(o => { if (o.material) for (const x of [].concat(o.material)) nightGrade(x); });
  const dog = new PosterDog(g, 0.86, 0.1, 1.58, joints, r);
  // the corn: a handful in the air, from his hand towards the hens, and some already down
  const grain = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color: '#e8b84e' }), 60);
  grain.castShadow = true; grain.frustumCulled = false; g.add(grain); nightGrade(grain.material);
  // the worm the two of them are tugging at (pink, stretched between their bills, a little sag)
  const worm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(1, 0, 0)), 8, 0.012, 6), new THREE.MeshStandardMaterial({ color: '#d9776f', roughness: 0.5 }));
  worm.castShadow = true; g.add(worm); nightGrade(worm.material);
  poster = { g, set, birds: plot.birds, rooster, hens, orp, bra, leg, blk, wht, worm, chick, hatHen, farmer, gert, hector, dog, grain, t: 0, toss: 0.62, r };
  tickPoster(0);
}
// the tip of a bird's bill, world (the frontmost point of what the head bone carries, found once); back: that far behind it
function billTip(b, back = 0) {
  if (!b.billAt) {
    const m = b.rig.mesh, g = m.geometry, sk = m.skeleton, hi = sk.bones.indexOf(b.rig.bones.head);
    const pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, best = new THREE.Vector3(0, 0, -1e9);
    for (let i = 0; i < pos.count; i++) {
      let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hi) w += sw.getComponent(i, k);
      if (w > 0.6 && pos.getZ(i) > best.z) best.fromBufferAttribute(pos, i);
    }
    b.billAt = best.applyMatrix4(m.bindMatrix).applyMatrix4(sk.boneInverses[hi]);
  }
  const h = b.rig.bones.head; b.root.updateMatrixWorld(true);
  const v = h.localToWorld(b.billAt.clone());
  if (back) { const w = h.localToWorld(b.billAt.clone().add(new THREE.Vector3(0, 0, -1))); v.add(w.sub(v).normalize().multiplyScalar(back)); }
  return v;
}
function placeGrain(hand) {           // hand: his throwing hand (the stage's frame); the corn: out of his hand in an arc, one grain just over
  const P = poster, m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), r = rng(7), to = [1.16, 1.04];   // the white Silkie's beak; a heap the black Silkie is scratching, the grains she kicks flying behind her
  const bill = P.whtBill || new THREE.Vector3(-0.42, 0.6, 0.62);
  for (let i = 0; i < 60; i++) {
    let x, y, z;
    if (i === 0) { x = bill.x + 0.02; y = bill.y + 0.07; z = bill.z + 0.01; }
    else if (i < 16) { const u = 0.12 + 0.75 * r(), spread = (r() - 0.5) * 0.2 * u;                // in the air: an arc from his hand towards her
      x = hand.x + (bill.x - hand.x) * u * 1.3 + spread; z = hand.z + (bill.z - hand.z) * u * 1.3 - spread * 0.5; y = hand.y + Math.sin(u * Math.PI) * 0.18 - u * u * (hand.y - bill.y) * 0.9 + (r() - 0.5) * 0.04; }
    else if (i < 28) { const u = 0.2 + 0.8 * r(), sp = (r() - 0.5) * 0.18;                             // kicked up behind the black Silkie
      x = 0.86 - 0.36 * u; z = 1.0 + sp - 0.03 * u; y = 0.04 + Math.sin(u * Math.PI) * 0.17 + r() * 0.03; }
    else { const a = r() * 6.28, d = Math.sqrt(r()) * 0.16; x = to[0] + Math.cos(a) * d; z = to[1] + Math.sin(a) * d * 0.7; y = 0.012; }      // the heap
    m.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)), new THREE.Vector3(0.011, 0.008, 0.009));
    P.grain.setMatrixAt(i, m);
  }
  P.grain.instanceMatrix.needsUpdate = true;
}
function tickPoster(dt) {
  const P = poster; P.t += dt;
  for (const b of P.birds) if (b.posterAct && (!b.act || b.act.type !== b.posterAct)) b.act = { type: b.posterAct, left: b.posterAct === 'flap' ? 1.1 : 40 + b.r() * 0.55 };          // (pecking out of step)
  P.rooster.root.position.y = (P.baleTop ?? 0.62);
  P.g.updateMatrixWorld(true);
  const hat = P.farmer.rig.B.hat.getWorldPosition(new THREE.Vector3()); P.g.worldToLocal(hat); P.hatHen.root.position.set(hat.x, hat.y + (P.hatUp ?? 0.16), hat.z);
  if (!P.grained || dt === 0) { const h = P.farmer.rig.B.wristR.getWorldPosition(new THREE.Vector3()); P.g.worldToLocal(h); placeGrain(h); P.grained = P.t > 2; }
  // the farmer throwing: his arm out at the moment of letting go (toss: how far through the throw), grinning, an eye on the goose
  P.farmer.want = { pose: 'feed', face: 'happy', props: { pail: true }, anim: (Q, F) => { const u = P.toss; Q.shR[1] += -30 * Math.sin(u * Math.PI); Q.elR[1] += 20 * Math.sin(u * Math.PI); Q.wrR[1] += -30 * Math.sin(u * Math.PI); F.look = P.look || [0.15, 0.8]; Q.head[2] += 6; Q.head[1] -= 6; } };
  if (dt > 0) { P.farmer.update(dt); P.gert.update(dt); P.hector.update(dt); P.dog.update(dt); }
  // the Legbar up in the air; the tug of war's worm from bill to bill
  P.leg.root.position.y = P.legUp ?? 0.24; P.wht.root.position.y = P.whtUp ?? 0.1;
  P.g.updateMatrixWorld(true); P.whtBill = P.g.worldToLocal(billTip(P.wht));
  for (const b of [P.orp, P.bra]) { b.root.rotation.x = 0; b.visual.rotation.x = -(P.lean ?? 0.3); }
  {
    const tip = b => P.g.worldToLocal(billTip(b, 0.012));
    P.g.updateMatrixWorld(true); for (const b of [P.orp, P.bra]) b.root.updateMatrixWorld(true);
    const a = tip(P.orp), c = tip(P.bra), mid = a.clone().add(c).multiplyScalar(0.5); mid.y -= 0.035;
    P.worm.geometry.dispose(); P.worm.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, c), 16, 0.014, 8);
  }
  // the chick riding on Biscuit's back
  const d = P.dog.foxes[0], bone = d.q.bones.chest || d.q.bones.spine || d.q.bones.hips;
  if (bone) { P.g.updateMatrixWorld(true); const w = bone.getWorldPosition(new THREE.Vector3()); P.g.worldToLocal(w); P.chick.root.position.set(w.x, w.y + (P.chickUp ?? 0.11), w.z); }
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
    const off = b => (b.laying && b.laying.inside) || b.roost || b.asleep || (b.cuddle && b.cuddle.carry) || (b.leaving && (b.leaving.phase === 'exit' || b.leaving.phase === 'fade'));      // on a scripted walk, in bed, in his arms, or out of the gate
    if (off(flock[i]) || off(flock[j])) continue;
    const a = flock[i].root.position, b = flock[j].root.position;
    const min = flock[i].kind === 'chick' || flock[j].kind === 'chick' ? CHICK_BODY : BODY;
    let dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d >= min) continue;
    if (d < 1e-4) { dx = 1; dz = 0; d = 1; } else { dx /= d; dz /= d; }
    const push = (min - Math.min(d, min)) * 0.5 * k;
    const ax = a.x - dx * push, az = a.z - dz * push, bx = b.x + dx * push, bz = b.z + dz * push;
    const lead = q => q.cuddle && !q.cuddle.greet && !q.cuddle.done;      // (the hen on her way up to him for a cuddle: the others make way)
    if (lead(flock[i]) !== lead(flock[j])) { const o = lead(flock[i]) ? b : a, sg = lead(flock[i]) ? 1 : -1; o.x += dx * push * 2 * sg; o.z += dz * push * 2 * sg; continue; }
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
  if (replay && replay.on) return;                       // (the morning replay films itself)
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
  if (pointers.size === 1) drag = { moved: false };
  if (pointers.size === 2) { drag = null; pinch = spread(); MOVE.drag = null; DMOVE.drag = null; }
  if (MOVE.plot && pointers.size === 1 && moveGrab(e)) drag = { moved: false, coop: true };      // (moving a coop: a finger on it carries it)
  if (DMOVE.id && pointers.size === 1 && decGrab(e)) drag = { moved: false, coop: true };       // (and a decoration)
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
  } else if (MOVE.drag && MOVE.drag.id === e.pointerId) {
    if (Math.hypot(p.x - p.x0, p.y - p.y0) > 6 && drag) drag.moved = true;
    if (!drag || drag.moved) moveDrag(p.x, p.y);
  } else if (DMOVE.drag && DMOVE.drag.id === e.pointerId) {
    if (Math.hypot(p.x - p.x0, p.y - p.y0) > 6 && drag) drag.moved = true;
    if (!drag || drag.moved) decDrag(p.x, p.y);
  } else if (drag) {
    if (Math.hypot(p.x - p.x0, p.y - p.y0) > 8) drag.moved = true;
    if (drag.moved) pan(dx, dy);
  }
  wake(1000);
});
function endPointer(e) {
  const p = pointers.get(e.pointerId); if (!p) return;
  pointers.delete(e.pointerId);
  if (MOVE.drag && MOVE.drag.id === e.pointerId) MOVE.drag = null;
  if (DMOVE.drag && DMOVE.drag.id === e.pointerId) DMOVE.drag = null;
  if (drag && !drag.moved && pointers.size === 0 && performance.now() - p.t0 < 500) (inside.open ? insideTap : MOVE.plot ? moveTap : DMOVE.id ? decTap : tapAt)(e.clientX, e.clientY);
  if (pointers.size < 2) pinch = 0;
  if (pointers.size === 0) drag = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => { e.preventDefault(); if (replay && replay.on) return; if (inside.open) { inside.pan += (e.deltaX || e.deltaY) * inside.mPerPx * 0.5; insideFrameCamera(); wake(1000); return; } zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0016))); wake(1000); }, { passive: false });
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
  if (lineup || foxLineup || geeseLineup || frogLineup || farmerLineup || ShowLineup.on || SHOWDAY) return;
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
  if (SHOWDAY) return;                                   // (the show day: watch, or Skip)
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
  for (const g of [...(geeseLineup ? geeseLineup.geese : []), ...(geeseFlock ? geeseFlock.geese : []), ...(duckFlock ? duckFlock.ducks : []), ...(farmLife && !farmLife.home ? [farmLife.f] : [])]) {
    if (!g.root.visible) continue;
    g.root.getWorldPosition(w); s.center.set(w.x, w.y + g.hitY, w.z); s.radius = g.hitR;
    const hit = ray.ray.intersectSphere(s, new THREE.Vector3());
    if (hit) { const d = hit.distanceTo(ray.ray.origin); if (d < bestD) { bestD = d; best = g; } }
  }
  if (frogPond) for (const f of frogPond.frogs) {
    if (!f.root.visible) continue;
    s.center.set(f.pos.x, f.pos.y + f.hitY, f.pos.z); s.radius = f.hitR;
    const hit = ray.ray.intersectSphere(s, new THREE.Vector3());
    if (hit) { const d = hit.distanceTo(ray.ray.origin); if (d < bestD) { bestD = d; best = f; } }
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
    // a coop's nest box: collect the eggs (the game: sold)
    for (const p of livePlots()) {
      if (!p.nest) continue;
      const G = nestOf(p), w = G.win;                       // the nest window (and a little round it)
      nb.min.set(w[0] - w[3] / 2 - 0.06, w[1] - 0.06, 0.3); nb.max.set(w[0] + w[3] / 2 + 0.06, w[2] + 0.06, 0.56);
      loc.copy(ray.ray).applyMatrix4(inv.copy(p.frame.matrixWorld).invert());
      if (!loc.intersectBox(nb, hitP)) continue;
      const n = p.nest, sitting = n.by && n.by.laying && n.by.laying.inside;
      if (GAME_MODE && p.gc) {
        if (!p.gc.eggs) { tag.textContent = sitting ? game.t('laying', { name: n.by.name }) : game.t('no_eggs'); }
        else { collectAt(p); return; }
      }
      else if (sitting) tag.textContent = n.by.name + ' is laying…';
      else if (n.count) { tag.textContent = n.count === 1 ? 'Collected 1 egg' : 'Collected ' + n.count + ' eggs'; n.count = 0; showEggs(p); }
      else tag.textContent = 'No eggs yet';
      tagBird = null; tagSpot.set(G.seat[0], G.win[2] + 0.12, 0.44); p.frame.localToWorld(tagSpot); tag.classList.add('on'); fieldTag = 2.8;
      return;
    }
    // the game: a coop's feeder (its card: how full, fill it)
    if (GAME_MODE) for (const p of livePlots()) {
      if (!p.gc) continue;
      const f = PEN.feeder;
      nb.min.set(f[0] - 0.2, 0, f[2] - 0.2); nb.max.set(f[0] + 0.2, 0.55, f[2] + 0.2);
      loc.copy(ray.ray).applyMatrix4(inv.copy(p.frame.matrixWorld).invert());
      if (loc.intersectBox(nb, hitP)) { feederCard(p); return; }
    }
    // the game: a coop (its house or its pen): its card (who lives there; move it); a decoration in front of it: its own
    let gdc = GAME_MODE ? decorAt(ray.ray) : null, gdd = gdc ? decorAt.dist : Infinity;
    // (the wheat field: a tap on the ground inside it, unless a decoration stands in front)
    const WF = GAME_MODE ? DEC.items.wheat : null, gw = WF && ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (gw && (!gdc || gw.distanceTo(ray.ray.origin) < gdd)) { const [lx, lz] = inSpot(decSp(WF.d.pos[0], WF.d.pos[1], WF.d.deg), gw.x, gw.z); if (decGap('wheat', lx, lz) < 0.05) { gdc = WF.d; gdd = gw.distanceTo(ray.ray.origin); } }
    if (GAME_MODE) for (const p of livePlots()) {
      if (!p.gc) continue;
      nb.min.set(-1.66, 0, -0.81); nb.max.set(1.81, 2.1, 2.55);
      loc.copy(ray.ray).applyMatrix4(inv.copy(p.frame.matrixWorld).invert());
      if (!loc.intersectBox(nb, hitP)) continue;
      if (!gdc) { coopCard(p); return; }
      nb.min.set(-0.8, 0, -0.6); nb.max.set(0.8, 1.9, 0.7);         // (a decoration hit too: the coop only if its house is in front of it)
      if (loc.intersectBox(nb, hitP) && hitP.applyMatrix4(p.frame.matrixWorld).distanceTo(ray.ray.origin) < gdd) { coopCard(p); return; }
    }
    // the game: the farmhouse, the Breed Book on its shelf (after the birds and the coops, before the land behind it); a
    // decoration or the wheat field in front of it: theirs (the field's card, or the harvest; the hives' honey)
    const hd = GAME_MODE && game.data && farmhouseAt(ray.ray) ? farmhouseAt.dist : Infinity;
    if (gdc && gdd < hd) {
      if (gdc.model === 'wheat') { wheatTap(); return; }
      if (gdc.model === 'bandstand' && decorLife) decorLife.play();
      if (gdc.model === 'beehives' && game.honeyAt() > 0) { honeyTap(); return; }
      decorCard(gdc.model); return;
    }
    if (hd < Infinity) { bookSheet(); return; }
    // the game: the field for sale (its card), or the wild meadow (when it comes up for sale)
    if (GAME_MODE && FIELDS && game.data) {
      const gp = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP), f = gp ? fieldAt(gp.x, gp.z) : -1;
      if (f >= 0 && f === SALE.field) { landCard(); return; }
      if (f >= game.data.land.length) { tagBird = null; tag.textContent = game.t('land_wild', { n: f + 1 }); tagSpot.set(gp.x, 0.6, gp.z); tag.classList.add('on'); fieldTag = 2.4; return; }
    }
    // a decoration: its name over it
    const dc = decorAt(ray.ray);
    if (dc && GAME_MODE) { decorCard(dc.model); return; }
    if (dc) {
      tagBird = null; tag.textContent = DECOR_NAMES[dc.model][LANG === 'fr' ? 1 : 0]; tag.classList.add('on'); fieldTag = 2.8;
      if (dc.model === 'bandstand' && decorLife) decorLife.play();          // (and a little tune)
      dc.box.getCenter(tagSpot); tagSpot.y = dc.box.max.y + 0.1; tagSpot.applyMatrix4(dc.m);
      return;
    }
    // the wheat field: show its next growing stage
    const g = new THREE.Vector3();
    if (!GAME_MODE && wheatField.inverse && ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), g)) {
      g.applyMatrix4(wheatField.inverse);
      if (Math.abs(g.x) < wheatField.half[0] && Math.abs(g.z) < wheatField.half[1]) {
        const next = WHEAT_STAGES[(WHEAT_STAGES.indexOf(wheatField.stage) + 1) % 4];
        setWheat(next);
        tagBird = null; tag.textContent = 'Wheat field · ' + WHEAT_NAMES[next]; tag.classList.add('on'); fieldTag = 2.8; tagSpot.copy(wheatField.centre);
      }
    }
    if (GAME_MODE && gameUI && gameUI.kind === 'bird') gameUI.close();      // (a tap on nothing: the card goes)
    return;
  }
  if (best.isFarmer) best.life.tapped(); else if (best.fam) best.fam.tapped(best); else if (best.isGoose) best.tapped(VIEW_DIR); else if (best.pond) best.pond.tapped(best); else best.tapped();
  if (GAME_MODE) { henOff(); if (best.gid) openBirdCard(best); else if (best.gameChick && best.plot.gc) chickCard(best); else if (gameUI.kind === 'bird') gameUI.close(); }
  else if (best.role === 'dog') { dogTapped(); henOff(); }
  else if (best.plot && best.rig && !best.isGoose) henTapped(best); else henOff();
  tagBird = best; tagLeft = 2.8;
  tag.textContent = best.label;
  tag.classList.add('on');
}
// the game: a bird's card, the view gliding over to her so she shows above the card
let heldBird = null;
function holdBird(b) {                       // a bird whose card is open stays where she is, facing you
  if (heldBird && heldBird !== b) { heldBird.held = false; heldBird.wait = Math.min(heldBird.wait, 0.4 + heldBird.r()); }
  heldBird = b;
  if (b && !b.laying && !b.roost && !b.asleep) { b.held = true; b.target.copy(b.root.position); b.route = null; b.wait = Math.max(b.wait, 0.6); }
}
// ---- cuddles, trust and stars (release 1 step 7; game.js cuddle, stars). "♥ Cuddle" on a bird's card: the cuddle counts
// at once (happy for 6 hours, trust and a little experience); the farmer comes into the pen, crouches and strokes her,
// hearts floating up (by day, out and about: at night "Cuddles in the morning"). A new trust level or star: a word.
// Trusting birds come to the front fence to greet the farmer when he stops to look at their coop.
function farmerAsleep() { return !farmLife || farmLife.home || DAY.hour >= 21.8 || DAY.hour < 6.3; }
function gameCuddle(id) {
  const r = game.cuddle(id); if (!r || r.happy) return r;
  const b = allBirds.find(x => x.gid === id), gb = game.bird(id), farmer = farmerName();
  gameUI.close(); holdBird(null);
  if (b && farmLife && !farmLife.home && !farmLife.running && !b.busy() && !b.nightNow(0.3)) {
    const P = penSpec(b.plot);
    if (P && farmLife.visitPen(P, 'cuddle', b)) wake(1500);
  }
  hint(r.up ? game.t('trust_up' + r.up, { name: gb.name, farmer, xp: r.xp }) : game.t('cuddle_done', { name: gb.name, farmer }));
  if (r.xp) { gameUI.refresh(); gameUI.bumpCoins(); }
  starsSeen.set(id, game.stars(gb));                      // (a star from the cuddle: said with it)
  if (r.star && !r.up) hint(game.t('star_up', { name: gb.name }));
  jobsDone(r.done); guideDid('cuddle');
  return r;
}
// a bird gaining a star while you watch (time on the farm, a brood, a cuddle): a word and a little burst of stars over her
const starsSeen = new Map();
function watchStars() {
  for (const gb of game.data.birds) {
    const s = game.stars(gb), was = starsSeen.get(gb.id);
    starsSeen.set(gb.id, s);
    if (was === undefined || s <= was) continue;
    hint(game.t('star_up', { name: gb.name }));
    const b = allBirds.find(x => x.gid === gb.id);
    if (b && b.root.visible) { const w = b.root.getWorldPosition(new THREE.Vector3()); w.y += b.rig.scale * 0.95; for (let k = 0; k < 3; k++) setTimeout(() => spawnHeart(w.clone().add(new THREE.Vector3((k - 1) * 0.08, k * 0.05, 0))), k * 180); }
  }
}
// the farmer stops at a coop's fence: its trusting birds trot over to the front fence to say hello, a heart over each
function greetFarmer(at) {
  if (!GAME_MODE || !game.data) return;
  let plot = null, best = 6;
  for (const p of gamePlots()) { const d = Math.hypot(p.centre.x - at[0], p.centre.z - at[1]); if (d < best) { best = d; plot = p; } }
  if (!plot) return;
  const f = plot.frame, v = new THREE.Vector3(at[0], 0, at[1]); f.updateMatrixWorld(true); f.worldToLocal(v);
  const Y = PEN.yard, fx = Math.max(Y.min[0] + 0.25, Math.min(Y.max[0] - 0.25, v.x)), fz = Y.max[2] - 0.2;
  let k = 0;
  for (const b of plot.birds) {
    const gb = b.gid && game.bird(b.gid);
    if (!gb || game.trustLevel(gb) < 2 || b.busy() || b.asleep || b.cuddle || b.nightNow(0.3)) continue;
    const off = [0, 0.32, -0.32, 0.6][k++] || 0, x = Math.max(Y.min[0] + 0.15, Math.min(Y.max[0] - 0.15, fx + off)), z = fz - (k > 2 ? 0.25 : 0);
    if (!yardFree(x, z)) continue;
    if (b.comeForCuddle([x, z], Math.atan2(v.x - x, v.z - z))) b.cuddle.greet = { t: 0 };      // (a heart when she's there, then off she goes)
  }
}
function openBirdCard(b) {
  const gb = game.data.birds.find(x => x.id === b.gid); if (!gb) return;
  gameUI.birdCard(gb); holdBird(b);
  const w = b.root.getWorldPosition(new THREE.Vector3()), hz = Math.hypot(VIEW_DIR.x, VIEW_DIR.z);
  if (sideways()) {                 // (sideways: the card on the right, she in the middle of the space beside it)
    const size = Math.min(view.size, 0.85), up = -0.2 * size / PITCH_SIN, upp = 2 * size / Math.max(1, canvas.clientHeight);
    const side = (gameUI.sheet.offsetWidth + 24) / 2 * upp, right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
    focusOn(w.x + VIEW_DIR.x / hz * up + right.x * side, w.z + VIEW_DIR.z / hz * up + right.z * side, size);
    return;
  }
  const size = Math.min(view.size, 1.35), up = 0.32 * size / PITCH_SIN;      // (upright: her feet a third of the way up the screen, her head under the top bar)
  focusOn(w.x + VIEW_DIR.x / hz * up, w.z + VIEW_DIR.z / hz * up, size);
}
function gameSheetClosed(k) { holdBird(null); if (k === 'showres') endShowDay(); if (k === 'intro') { GUIDE_UI.intro = false; GUIDE_UI.on = true; } wake(300); }

// ---- the game's eggs and feed (game.js has the rules; here they're seen). Once a second: the lays that are due. A hen
// whose time has just come walks in and lays (the egg counts when it's in the straw, gameLaid); one that can't go yet
// (busy, the nest taken, the page not in view) has a couple of minutes, then her egg is simply there, as for a lay while
// the game was shut. The feeders' grain goes down with the save's level; bubbles over a nest with eggs and a feeder low.
const LIVE_LAY = 150e3;
let gameTickAt = 0, fullNoted = 0, jobsDay = '';
const gamePlots = () => plots.filter(p => p.gc && !p.draft);          // (not a new coop still being placed)
function syncNest(plot) { const c = plot.gc && game.coop(plot.gc.id); if (!c) return; plot.gc = c; if (plot.nest.count !== c.eggs) { plot.nest.count = c.eggs; plot.nest.pop = 1; showEggs(plot); } }
function canLayNow(b) {
  return b.root.visible && !b.laying && !b.roost && !b.asleep && !b.cuddle && !b.called && !b.held && !b.plot.farmer && !b.plot.fw && !b.plot.nest.by && !b.nightNow(0.25) && !(inside.open && inside.plot === b.plot);
}
function gameTick(now = Date.now(), force = false) {
  if (!GAME_MODE || !game.data || (!force && now - gameTickAt < 1000)) return;
  gameTickAt = now;
  const live = document.visibilityState !== 'hidden';
  const news = game.broodTick(now);
  if (news.length) broodNews(news, now);
  if (game.showTick(now).length) gameUI.refresh();                    // (a show judged: its results card once the farm's free)
  const jd = game.jobs(now).day; if (jd !== jobsDay) { jobsDay = jd; gameUI.refresh(); }      // (midnight: new jobs, the clipboard's dot)
  for (const p of gamePlots()) syncBrood(p, now, live, news);
  for (const e of game.dueLays(now)) {
    const b = allBirds.find(x => x.gid === e.hen);
    if (b && b.layEvt && !b.laying) b.layEvt = null;                     // (a lay cut short: she'll go again, or it's simply there)
    if (b && b.layEvt) continue;                                          // on her way to lay it
    const c = game.coop(e.coop);
    if (b && c && now - e.t < LIVE_LAY && game.feedAt(c, e.t) > 0 && c.eggs < NEST_MAX) {
      if (live && canLayNow(b)) { b.layEvt = e; b.startLaying(); wake(1500); }
      continue;                                                            // (or a little later)
    }
    const res = game.layEgg(e.hen, e.t, now);
    if (res === 'full' && now - fullNoted > 600e3) { fullNoted = now; hint(game.t('nest_full')); }
    if (res === 'laid' && e.first && b) hint(game.t('first_egg', { name: b.name }));
  }
  for (const p of gamePlots()) { syncNest(p); if (!(p.pourUntil > performance.now())) setFeed(p, game.feedLeft(p.gc, now)); }
  bubbleText(now);
  tickWheat();
  if (now - (game.data.lastSeen || 0) > 60e3) game.seenNow(now);      // (while open: when the farm was last seen, for the welcome-back summary)
  syncLand();
  watchStars();
  showNews();
}
function gameLaid(b) {                       // her egg is in the straw: into the save
  const e = b.layEvt; b.layEvt = null;
  if (!e) return;
  const res = game.layEgg(e.hen, e.t);
  if (res === 'laid' && e.first) hint(game.t('first_egg', { name: b.name }));
  b.plot.gc = game.coop(b.plot.gc.id) || b.plot.gc;
  b.plot.nest.count = b.plot.gc.eggs;                                     // (the save's count, the new egg popping in)
  bubbleText(Date.now(), b.plot);
}
// the bubbles: built once for each coop, their words now and then, placed over the nest and the feeder every frame
function bubbleFor(plot) {
  if (plot.bub) return plot.bub;
  const mk = (cls, onTap) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'gbub ' + cls; e.hidden = true; e.addEventListener('click', ev => { ev.stopPropagation(); onTap(); }); document.body.append(e); return e; };
  const eggs = mk('geggs', () => collectAt(plot)), feed = mk('gfeed', () => feederCard(plot));
  const brood = mk('gbrood', () => { const c = game.coop(plot.gc.id), m = c && c.brood && plot.birds.find(b => b.gid === c.brood.hen); if (m) openBirdCard(m); });
  eggs.style.setProperty('--egg', EGG_COLOUR[plot.breed]);
  return (plot.bub = { eggs, feed, brood, n: -1, f: '', b: '' });
}
function bubbleText(now = Date.now(), only = null) {
  for (const p of only ? [only] : gamePlots()) {
    const B = bubbleFor(p), c = p.gc, n = c.eggs;
    if (n !== B.n) {
      B.eggs.replaceChildren(Object.assign(document.createElement('span'), { className: 'gegg-i' }), document.createTextNode(String(n)));
      B.eggs.classList.toggle('full', n >= NEST_MAX); B.eggs.setAttribute('aria-label', game.t('eggs') + ' ' + n);
      if (n > B.n && B.n >= 0) { B.eggs.classList.remove('pop'); void B.eggs.offsetWidth; B.eggs.classList.add('pop'); }
      B.n = n; if (!n) B.eggs.hidden = true;
    }
    // sitting on her eggs: how long till they hatch
    const br = c.brood && !c.brood.hatched ? c.brood : null, ms = br ? game.hatchAt(c) - now : 0;
    const bt = br ? '🐣 ' + (ms < 3600e3 ? game.t('min', { n: Math.max(1, Math.round(ms / 60e3)) }) : game.t('h', { n: Math.round(ms / 3600e3) })) : '';
    if (bt !== B.b) { B.b = bt; B.brood.textContent = bt; }
    const left = game.feedLeft(c, now), f = left <= 0 ? 'empty' : left < 0.25 ? 'low' : '';
    if (f !== B.f) { B.f = f; B.feed.className = 'gbub gfeed ' + f; B.feed.textContent = f ? '🌾 ' + game.t(f === 'empty' ? 'bub_empty' : 'bub_low') : ''; }
  }
}
const bubV = new THREE.Vector3();
function placeBubbles() {
  if (!GAME_MODE) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (game.data) { fieldBubbles(w, h); tickGuide(); }
  { // the patch for sale: "🪧 For sale · 100" over its sign
    const B = saleBubble(), n = SALE.field >= 0 && SALE.at && game.landForSale();
    if (!n || inside.open) B.hidden = true;
    else {
      const txt = '🪧 ' + game.t('bub_sale') + ' · ' + n.price; if (B.textContent !== txt) B.textContent = txt;
      bubV.copy(SALE.at); bubV.project(camera);
      const sx = (bubV.x + 1) / 2 * w, sy = (1 - bubV.y) / 2 * h;
      if (bubV.z > 1 || sx < -40 || sx > w + 40 || sy < 20 || sy > h + 40) B.hidden = true;
      else { B.hidden = false; B.style.left = sx.toFixed(1) + 'px'; B.style.top = sy.toFixed(1) + 'px'; }
    }
  }
  for (const p of gamePlots()) {
    const B = p.bub; if (!B) continue;
    const put = (e, show, x, y, z) => {
      if (!show || inside.open) { e.hidden = true; return; }
      bubV.set(x, y, z); p.frame.localToWorld(bubV); bubV.project(camera);
      const sx = (bubV.x + 1) / 2 * w, sy = (1 - bubV.y) / 2 * h;
      if (bubV.z > 1 || sx < -40 || sx > w + 40 || sy < 20 || sy > h + 40) { e.hidden = true; return; }
      e.hidden = false; e.style.left = sx.toFixed(1) + 'px'; e.style.top = sy.toFixed(1) + 'px';
    };
    const G = nestOf(p), f = PEN.feeder;
    put(B.eggs, B.n > 0, G.win[0], G.win[2] - 0.05, 0.52);            // (its tail on the nest window)
    put(B.feed, !!B.f, f[0], 0.46, f[2]);
    put(B.brood, !!B.b, G.win[0] - 0.55, G.win[2] - 0.05, 0.52);
  }
}
// the welcome-back card's "Collect all eggs": every nest's eggs fly to the coins at once, sold
function collectAll() {
  gameUI.close();
  let n = 0, coins = 0; const done = [];
  for (const plot of gamePlots()) {
    if (!plot.gc.eggs) continue;
    const B = bubbleFor(plot), at = B.eggs.hidden ? null : B.eggs.getBoundingClientRect();
    const r = game.collect(plot.gc.id); if (!r) continue;
    n += r.n; coins += r.coins; if (r.done) done.push(...[].concat(r.done));
    plot.gc = game.coop(plot.gc.id); plot.nest.count = 0; showEggs(plot); bubbleText(Date.now(), plot);
    gameUI.flyEggs(at ? { x: at.left + at.width / 2, y: at.top + at.height / 2 } : { x: canvas.clientWidth / 2, y: canvas.clientHeight * 0.6 }, r.n, EGG_COLOUR[plot.breed]);
  }
  if (n) { hint(game.t('away_sold', { n, c: coins })); guideDid('eggs'); }
  jobsDone(done);
  return { n, coins };
}
// tap a nest (or its bubble): the eggs fly to the coins, sold
function collectAt(plot) {
  const r = game.collect(plot.gc.id);
  if (!r) { tagBird = null; tag.textContent = game.t('no_eggs'); const G = nestOf(plot); tagSpot.set(G.seat[0], G.win[2] + 0.12, 0.44); plot.frame.localToWorld(tagSpot); tag.classList.add('on'); fieldTag = 2.4; return; }
  const B = bubbleFor(plot), at = B.eggs.hidden ? null : B.eggs.getBoundingClientRect();
  let from;
  if (at) from = { x: at.left + at.width / 2, y: at.top + at.height / 2 };
  else { const G = nestOf(plot); bubV.set(G.seat[0], G.win[1] + 0.1, 0.5); plot.frame.localToWorld(bubV); bubV.project(camera); from = { x: (bubV.x + 1) / 2 * canvas.clientWidth, y: (1 - bubV.y) / 2 * canvas.clientHeight }; }
  plot.gc = game.coop(plot.gc.id); plot.nest.count = 0; showEggs(plot); bubbleText(Date.now(), plot);
  gameUI.flyEggs(from, r.n, EGG_COLOUR[plot.breed]);
  hint(game.t(r.n === 1 ? 'eggs_sold1' : 'eggs_sold', { n: r.n, c: r.coins }));
  jobsDone(r.done); guideDid('eggs');
}
// ---- broody hens and chicks (game.js broodTick): the farm follows the save. A hen whose brood has just begun walks in
// and settles on the nest; otherwise she's simply there, sitting (sitNow). Hatched: she comes out with her chicks, or
// they're there round her. A day on they're young hens and roosters (a pop, in view), growing. Grown and gone: a farewell
// at the gate (by day, in view), or they're simply gone; then the congratulations card (showNews)
const sayName = id => { const b = game.bird(id); return b ? b.name : ''; };
function broodNews(news, now) {
  const pick = t => [...news].reverse().find(e => e.type === t);
  const e = pick('hatch') || pick('broody');                            // (grown and gone: the card says it, showNews)
  if (!e) return;
  gameUI.refresh();
  hint(game.t(e.type === 'hatch' ? 'hatched' : 'broody', { name: sayName(e.hen), n: e.n }));
  if (gameUI.kind === 'bird' && gameUI.bird) { const b = game.bird(gameUI.bird); if (b) gameUI.birdCard(b); }
}
function sitNow(b, secs) {                   // on the nest, sitting on her eggs, as if she'd been there all along
  if (b.asleep) { b.asleep = false; b.root.visible = true; b.rig.sleepy(false); }
  b.roost = null; b.act = null; b.route = null; b.layEvt = null;
  b.startLaying(secs); const L = b.laying; L.broody = true; L.jump = false; L.phase = 'sit'; L.t = 0; L.inside = true;
  const G = nestOf(b.plot); b.root.position.set(G.seat[0], G.floor + 0.005, G.seat[1]); b.root.rotation.y = 0; b.A.sit = 1; b.A.brood = 1;
}
// a brood's youngsters on the farm (chicks, then young hens and roosters), not yet on their way
function gameChicks(plot) { return plot.birds.filter(b => b.gameChick && !b.leaving); }
const kidRng = (plot) => rng(9001 + plots.indexOf(plot) * 31 + plot.birds.length * 7 + (Date.now() % 997));
function addChick(plot, mum, x, z, asleep, i) {
  const r = kidRng(plot);
  const c = new Bird(plot, plot.breed, 'chick', plot.breed === 'sil' ? mum.colour : null, [x, 0, z], r() * 6.28, r);
  c.mum = mum; c.gameChick = true; c.kidI = i; c.blob = freeBlobs.length ? freeBlobs.pop() : -1; c.size = 1; c.appear = asleep ? 1 : 0; c.root.scale.setScalar(asleep ? 1 : 0.05);
  plot.birds.push(c); allBirds.push(c);
  if (asleep) c.sleepNow();
  return c;
}
// a young hen (sex 'h') or rooster ('r'): her own bird, smaller than the grown ones and growing, her mum's for the card
function addYoung(plot, mum, sex, x, z, yaw, asleep, i, name) {
  const r = kidRng(plot);
  const y = new Bird(plot, plot.breed, sex === 'r' ? 'rooster' : 'hen', plot.breed === 'sil' ? mum.colour : null, [x, 0, z], yaw ?? r() * 6.28, r);
  if (name) y.name = name;
  y.gameChick = true; y.young = sex === 'r' ? 'r' : 'h'; y.kidOf = mum; y.kidI = i; y.blob = freeBlobs.length ? freeBlobs.pop() : -1;
  y.size = 0.62; y.appear = 1; y.root.scale.setScalar(0.62); y.stepRate = 22;
  plot.birds.push(y); allBirds.push(y);
  if (asleep) y.sleepNow();
  return y;
}
// a chick turning into a young hen or rooster where she stands (pop: in view, a little burst and a heart)
function turnYoung(ch, sex, pop) {
  const p = ch.root.position, plot = ch.plot, at = [p.x, p.z], yaw = ch.root.rotation.y, asleep = ch.asleep;
  removeBird(ch);
  const y = addYoung(plot, ch.mum, sex, at[0], at[1], yaw, asleep, ch.kidI, ch.name);
  if (pop) { y.appear = 0.45; y.hopT = 0; heartOver(y); }
  return y;
}
function heartOver(b) { const w = b.root.getWorldPosition(new THREE.Vector3()); w.y += b.rig.scale * (b.size || 1) * 0.95; spawnHeart(w); }
function removeBird(b) {
  b.root.removeFromParent();
  const i = b.plot.birds.indexOf(b); if (i >= 0) b.plot.birds.splice(i, 1);
  const j = allBirds.indexOf(b); if (j >= 0) allBirds.splice(j, 1);
  if (b.blob >= 0) { blobs.setMatrixAt(b.blob, NO_BLOB); blobs.instanceMatrix.needsUpdate = true; freeBlobs.push(b.blob); b.blob = -1; }
  if (tagBird === b) { tagBird = null; tag.classList.remove('on'); }
  if (heldBird === b) heldBird = null;
}
// out of the coop with her new chicks: they tumble down the ramp behind her
function hatchOut(mum) {
  const c = mum.plot.gc && game.coop(mum.plot.gc.id), br = c && c.brood;
  if (!br || br.hen !== mum.gid) return;
  const G = nestOf(mum.plot), have = new Set(gameChicks(mum.plot).map(ch => ch.kidI));
  for (let i = 0; i < br.n; i++) if (!have.has(i)) addChick(mum.plot, mum, G.foot[0] + (i - 1) * 0.12, G.foot[1] + 0.05 + (i % 2) * 0.08, false, i);
  wake(2000);
}
function syncBrood(plot, now, live, news) {
  if (inside.open && inside.plot === plot) return;                        // (not while you're looking inside: when you come out)
  const c = game.coop(plot.gc.id), br = c && c.brood, mum = br && plot.birds.find(b => b.gid === br.hen);
  const chicks = gameChicks(plot);
  if (br && !br.hatched && mum) {                                         // sitting on her eggs
    const left = (game.hatchAt(c) - now) / 1000, L = mum.laying;
    if (L && L.broody) { if (L.phase === 'sit') L.sit = L.t + Math.max(1, left); }
    else if (!L && !mum.roost) {
      if (plot.synced && now - br.start < LIVE_LAY && !mum.asleep) {         // (just now, with the farm in view: she walks in)
        if (live && canLayNow(mum)) { mum.startLaying(Math.max(5, left)); mum.laying.broody = true; mum.laying.jump = false; wake(1500); }
      }
      else sitNow(mum, Math.max(5, left));
    }
  } else if (br && br.hatched && mum) {                                   // raising her chicks, then her young hens and roosters
    plot.lastMum = br.hen;
    const L = mum.laying, youngAt = game.youngAt(c), young = now >= youngAt, kids = br.kids && br.kids.length === br.n ? br.kids : game.kidsOf(c, br);
    const sexOf = i => (kids[i] && kids[i].sex) || 'h';
    if (L && L.broody) { if (L.phase === 'sit' && !mum.nightNow(0.1)) L.sit = Math.min(L.sit, L.t); }      // (out she comes)
    else if (!L && chicks.length < br.n) {                                // (the page opened: they're there)
      const at = mum.root.position, G = nestOf(plot), have = new Set(chicks.map(ch => ch.kidI));
      for (let i = 0; i < br.n; i++) {
        if (have.has(i)) continue;
        const a = i * 2.1, d = young ? 0.55 : 0.3, x = mum.asleep ? G.foot[0] : at.x + Math.sin(a) * d, z = mum.asleep ? G.foot[1] : at.z + Math.cos(a) * d;
        const ch = young ? addYoung(plot, mum, sexOf(i), x, z, null, mum.asleep, i) : addChick(plot, mum, x, z, mum.asleep, i);
        if (!mum.asleep && !ch.free(x, z)) { ch.pickTarget(); ch.root.position.copy(ch.target); }
      }
    }
    if (young) {                                                          // a day old: young hens and roosters
      const pop = live && plot.synced && now - youngAt < LIVE_LAY;
      let turned = 0;
      for (const ch of gameChicks(plot)) if (!ch.young) { turnYoung(ch, sexOf(ch.kidI), pop && !ch.asleep); turned++; }
      if (turned && pop) { hint(game.t('turned', { name: mum.name })); wake(1500); }
    }
    const gc = Math.max(0, Math.min(1, (now - game.hatchAt(c)) / YOUNG_MS)), gy = Math.max(0, Math.min(1, (now - youngAt) / Math.max(1, game.grownAt(c) - youngAt)));
    for (const ch of gameChicks(plot)) ch.size = ch.young ? 0.62 + 0.23 * gy : 1 + 0.4 * gc;
  } else if (!br && chicks.length && MOVE.plot !== plot) {              // (not while their coop's being moved: once it's down)
    const e = news.find(x => x.type === 'sold' && x.coop === plot.gc.id);
    chicksGo(plot, live && !!e && now - e.t < LIVE_LAY, e);
  }
  plot.synced = true;
}
// grown and off to a new farm (their coins and the news: game.js broodTick). Seen (by day, in view, the farmer out and
// about): a farewell at the gate (tickFarewell). Otherwise they're simply gone. Then the congratulations card (showNews)
function chicksGo(plot, live, e) {
  const kids = gameChicks(plot);
  for (const k of kids) { k.act = null; k.route = null; k.then = null; k.eatAt = null; k.feedIn = 0; k.held = false; k.leaving = { phase: 'fade', t: 0 }; }
  if (!live || !kids.length || !farmLife || farmLife.home || farmLife.running || inside.open || kids.some(k => k.asleep || k.roost || !k.root.visible) || kids[0].nightNow(0.5)) return;
  const G = gateOf(plot, kids[0]); if (!G) return;
  const fw = plot.fw = { phase: 'wait', t: 0, all: 0, kids, G, hen: e && e.hen, ready: false };
  kids.forEach((k, i) => { k.leaving = { phase: 'gather', t: 0, i, spot: G.line[i], route: k.plan([G.line[i]]), face: G.faceIn[i] }; });
  fw.order = [...kids].sort((a, b) => Math.abs(a.leaving.spot[0] - G.gx) - Math.abs(b.leaving.spot[0] - G.gx));      // (nearest the gate first)
  // (the view stays where the player has it: Audrey, 25 Oct: "the camera doesn't move by itself")
  const watch = () => { const k = kids.filter(c => plot.birds.includes(c) && c.leaving.phase !== 'fade'); if (!k.length) return null; fwV.set(0, 0, 0); for (const c of k) fwV.add(c.root.getWorldPosition(tmpV3)); fwV.divideScalar(k.length); return [fwV.x, fwV.z]; };
  fw.watch = watch;
  if (!farmLife.cheerAt(G.stand, G.face, () => { fw.ready = true; }, () => plot.fw !== fw || fw.cheered, watch)) fw.ready = true;
  hint(game.t('young_going', { name: sayName(fw.hen) }));
  wake(2000);
}
// the gate (pen frame: gx, gz): the way off the farm from just outside it (farmExit); where the farmer stands outside the
// gate (beside the way out, clear of it: the far side from the player if he can, so his face shows as he watches them)
// and his heading (the youngsters lined up inside the gate); where they line up just inside it (clear of the water dish)
// facing out; their way out: through the gate, then along the way off the farm (pen frame)
function gateOf(plot, kid) {
  const f = plot.frame; f.updateMatrixWorld(true);
  const v = new THREE.Vector3(), inv = new THREE.Matrix4().copy(f.matrixWorld).invert();
  const W = (x, z) => { v.set(x, 0, z).applyMatrix4(f.matrixWorld); return [v.x, v.z]; }, L = (x, z) => { v.set(x, 0, z).applyMatrix4(inv); return [v.x, v.z]; };
  const gx = PEN.gate[0], gz = PEN.pen.max[2], nav = navGrid(), o = W(gx, gz + 0.95);
  const away = plot.exitWay || (plot.exitWay = farmExit(o[0], o[1]) || []);
  const route = away.map(q => L(q[0], q[1])), way = [[gx, gz + 0.3], ...(route.length > 1 ? route : [[gx, gz + 1.7]])];
  const clear = (x, z) => { let m = 9; for (let i = 1; i < way.length; i++) { const a = way[i - 1], c = way[i], dx = c[0] - a[0], dz = c[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return m; };
  // where he stands: beside the gate, on the far side from the player if their way leaves room there (his face shows as
  // he watches them), else on the near side; always clear of their way
  const cam = camera.position.clone().applyMatrix4(inv), pref = cam.x > gx ? -1 : 1, spots = [];
  for (const side of [pref, -pref]) for (const [dx, dz] of [[0.62, 0.5], [0.85, 0.45], [1.1, 0.4], [0.85, 0.85], [1.35, 0.6]]) spots.push([gx + side * dx, gz + dz, side]);
  let stand = null, s = pref, first = null;
  for (const [x, z, side] of spots) {
    const w = W(x, z), q = nav.nearestIn(farmReach(), w[0], w[1], 0.2); if (!q) continue;
    if (!first) first = [q, side];
    if (clear(x, z) >= 0.5) { stand = q; s = side; break; }
  }
  if (!stand && first) [stand, s] = first;
  if (!stand) return null;
  const g = W(gx, gz - 0.3), face = Math.atan2(g[0] - stand[0], g[1] - stand[1]);         // (looking at them)
  const line = [], faceIn = [];
  for (let i = 0; i < 4; i++) {
    const x0 = gx + (i - 1.5) * 0.32 + (i < 2 ? -0.02 : 0.02);
    let q = [x0, gz - 0.3];
    find: for (const dz of [0, -0.12, -0.24, -0.36]) for (const dx of [0, 0.1, -0.1]) {
      const x = x0 + dx, z = gz - 0.3 + dz;
      if (kid.free(x, z) && line.every(o => Math.hypot(o[0] - x, o[1] - z) > 0.27)) { q = [x, z]; break find; }
    }
    line.push(q); faceIn.push(Math.atan2(gx - q[0], gz + 0.5 - q[1]));
  }
  const path = route.length > 1 ? [[gx, gz - 0.3], [gx, gz + 0.3], ...route] : [[gx, gz - 0.3], [gx, gz + 0.3], [gx - s * 0.18, gz + 0.95], [gx - s * 0.42, gz + 1.7]];
  return { stand, face, line, faceIn, path, s, gx, gz, W };
}
// the way off the farm from (x, z) (world): the cheapest (the paths preferred, as the farmer walks; over a footbridge if
// need be) to just past the farm's edge, beyond the trees along it (still in view as they go) (the village's bounds: u, v as clampView);
// [] if there's none
function farmExit(x, z) {
  const nav = navGrid(); pathCosts(nav);
  const s = nav.nearestFree(x, z); if (!s) return [];
  const B = V.bounds, M = 1.3, nx = nav.nx, N = nav.block.length, Wc = nav.cost;
  const outside = i => { const cx = nav.cx(i % nx), cz = nav.cz((i / nx) | 0), u = (cx - cz) * R2, v = (-cz - cx) * R2; return u < B.u[0] - M || u > B.u[1] + M || v < B.v[0] - M || v > B.v[1] + M; };
  const cost = new Float32Array(N).fill(Infinity), done = new Uint8Array(N), heap = [];
  const push = (i, c) => { heap.push([c, i]); let k = heap.length - 1; while (k > 0) { const q = (k - 1) >> 1; if (heap[q][0] <= heap[k][0]) break; [heap[q], heap[k]] = [heap[k], heap[q]]; k = q; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const si = nav.iz(s[1]) * nx + nav.ix(s[0]); cost[si] = 0; push(si, 0);
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let goal = -1;
  while (heap.length) {
    const [, i] = pop(); if (done[i]) continue; done[i] = 1;
    if (outside(i)) { goal = i; break; }
    const X0 = i % nx, Z0 = (i / nx) | 0;
    for (const [dx, dz, c] of D) {
      const X = X0 + dx, Z = Z0 + dz; if (X < 0 || Z < 0 || X >= nx || Z >= nav.nz) continue;
      const j = Z * nx + X; if (nav.block[j] || done[j] || (dx && dz && (nav.block[Z0 * nx + X] || nav.block[Z * nx + X0]))) continue;
      const nc = cost[i] + c * Wc[j]; if (nc < cost[j]) { cost[j] = nc; push(j, nc); }
    }
    const Lk = nav.links.get(i); if (Lk) for (const [j, c] of Lk) if (!done[j] && cost[i] + c < cost[j]) { cost[j] = cost[i] + c; push(j, cost[j]); }
  }
  if (goal < 0) return [];
  return nav.find(s[0], s[1], nav.cx(goal % nx), nav.cz((goal / nx) | 0), true) || [];
}
// each frame: the farewell. They line up inside the gate and the farmer comes to stand outside it ('wait': for him half a
// minute at most); the party ('party', 4.6 s: the youngsters hop and flap, hearts over them; the hens flap and hop, the
// rooster crows, their mum sings); then out of the gate one by one, past him, and along the way off the farm till
// they're past its edge; he cheers them on their way, watching them go. Two and a half minutes for it all at most. The
// view never moves by itself: the player can follow them if they like
const fwV = new THREE.Vector3();
function tickFarewell(dt) {
  for (const p of gamePlots()) {
    const F = p.fw; if (!F) continue;
    F.t += dt; F.all += dt; wake(500);
    const kids = F.kids.filter(k => p.birds.includes(k));
    if (!kids.length) { p.fw = null; continue; }
    if (F.all > 150) { for (const k of kids) if (k.leaving.phase !== 'fade') { k.leaving.phase = 'fade'; k.leaving.t = 0; } continue; }
    const at = t0 => F.t >= t0 && F.t - dt < t0;                          // (the moment t0 is passed)
    if (F.phase === 'wait') {
      if ((F.ready && F.t > 1 && kids.every(k => !(k.leaving.route && k.leaving.route.length))) || F.t > 30) { F.phase = 'party'; F.t = 0; }
    } else if (F.phase === 'party') {
      kids.forEach((k, i) => { for (const t0 of [0.15, 1.45, 2.75]) if (at(t0 + i * 0.17)) { k.hopT = 0; k.leaving.flapT = 0; heartOver(k); } });
      for (const b of p.birds) {
        if (b.gameChick || b.busy() || b.cuddle || b.held || !b.root.visible) continue;
        const mum = b.gid && b.gid === F.hen;
        if (b.kind === 'rooster') { if (at(0.5) || at(3.0)) { b.act = { type: 'crow', left: 2.0 }; b.wait = Math.max(b.wait, 2.3); b.route = null; } }
        else if (at(mum ? 0.3 : 0.65) || at(mum ? 2.2 : 2.6)) { b.act = { type: 'flap', left: 0.8 }; b.hopT = 0; b.wait = Math.max(b.wait, 1.1); b.route = null; }
        if (mum && F.t > 0.8 && F.t < 4.2 && Math.floor(F.t / 0.3) !== Math.floor((F.t - dt) / 0.3)) spawnNote(b, Math.floor(F.t / 0.3) % 4 === 3, 0.8);
      }
      if (F.t > 4.6) { F.phase = 'exit'; F.t = 0; }
    } else if (F.phase === 'exit') {
      F.order.forEach((k, i) => {
        const L = k.leaving;
        if (p.birds.includes(k) && (L.phase === 'gather' || L.phase === 'party') && F.t >= i * 0.85) { L.phase = 'exit'; L.t = 0; L.path = F.G.path.map(q => [...q]); L.ahead = F.order[i - 1] || null; k.hopT = 0; }
      });
      if (F.t > F.order.length * 0.85 + 3.5) F.cheered = true;            // (all on their way: he can go about his day)
      // (for the tests: how far past the farm's edge they got; how far off from looking at them he was while cheering)
      for (const k of kids) { k.root.getWorldPosition(tmpV3); const u = (tmpV3.x - tmpV3.z) * R2, v = (-tmpV3.z - tmpV3.x) * R2, B = V.bounds; F.past = Math.max(F.past || -99, Math.max(B.u[0] - u, u - B.u[1], B.v[0] - v, v - B.v[1])); }
      const w = F.watch(), fp = farmLife && farmLife.pos;
      if (w && fp && !F.cheered && F.t > 1 && Math.hypot(fp.x - F.G.stand[0], fp.z - F.G.stand[1]) < 0.4) { const d = Math.atan2(w[0] - fp.x, w[1] - fp.z) - farmLife.heading; F.look = Math.max(F.look || 0, Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) / DEG); }
      p.lastExit = { past: +(F.past || 0).toFixed(2), look: Math.round(F.look || 0), way: F.G.path.length };
    }
  }
}
const tmpV3 = new THREE.Vector3();
// each frame: youngsters popping into being and growing, those gone taken away; the farewells
function tickChicks(dt) {
  for (const p of gamePlots()) {
    for (const b of [...p.birds]) {
      if (!b.gameChick) continue;
      if (b.leaving && b.leaving.gone) { removeBird(b); continue; }
      if (b.leaving && b.leaving.phase === 'fade') continue;
      if (b.appear < 1) b.appear = Math.min(1, b.appear + dt / 0.45);
      const s = (b.size || 1) * (b.appear < 1 ? 0.05 + 0.95 * smooth01(b.appear) * (1 + 0.15 * Math.sin(b.appear * Math.PI)) : 1);
      if (Math.abs(b.root.scale.x - s) > 1e-3) b.root.scale.setScalar(s);
    }
  }
  tickFarewell(dt);
}
// a youngster's card: a chick (whose, when she's a young hen or rooster) or a young hen or rooster (when off to a new farm)
function chickCard(ch) {
  const c = game.coop(ch.plot.gc.id), m = ch.young ? ch.kidOf : ch.mum, mum = m && m.gid ? game.bird(m.gid) : null;
  if (!c) return;
  if (ch.young) gameUI.youngCard(ch.name, ch.young, c, mum, c.brood ? game.grownAt(c) - Date.now() : 0);
  else gameUI.chickCard(ch.name, c, mum, c.brood ? game.youngAt(c) - Date.now() : 0);
}
// congratulations: a brood grown up and gone (game.js news), its card once the farewell's over, or (grown while the farm
// was shut) a moment after it opens; one at a time, never over another card. Back after an hour or more away (the farm
// opened, or the page shown again): the welcome-back summary first (release 1 step 9f)
let newsFrom = Infinity, openedAt = 0, AWAY = null, hiddenAt = 0;
const AWAY_MIN = 3600e3;
function showNews() {
  if (!GAME_MODE || !game.data || gameUI.isOpen || inside.open || MOVE.plot || DMOVE.id || SHOWDAY || GUIDE_UI.intro || performance.now() < newsFrom) return;
  if (AWAY) {
    const sum = game.awaySummary(AWAY.from); AWAY = null;
    if (sum.items.length || sum.paused) { holdBird(null); henOff(); gameUI.awayCard(sum, { collectAll: () => collectAll() }); return; }
  }
  const n = game.unseenNews().find(n => !gamePlots().some(p => p.fw && p.gc.id === n.coop));
  if (n) { holdBird(null); gameUI.congratsCard(n, n.t < openedAt - 2000); return; }
  const sr = game.unseenShows();                                           // (the show results: the show day first, by day)
  if (sr.length) { holdBird(null); if (!offerShowDay(sr)) gameUI.showResults(sr); return; }
  const L = game.levelNews();                                               // (then a new level's card: what it brings)
  if (L && !gamePlots().some(p => p.fw)) {
    holdBird(null); syncLand(); gameUI.refresh();
    gameUI.levelUpCard(L, game.landForSale(), () => { if (SALE.at) focusOn(SALE.at.x, SALE.at.z, Math.min(view.size, sideways() ? 2.4 : 3.2)); }, game.newAt(L, game.data.lvSeen || 1), b => startPlace(b));
  }
}
// ---- levels and land (release 1 step 5; game.js landForSale, buyLand; the fields: fields.py, models/fields.json). The
// farm is split into fields along its lanes and the stream. Your land is the mown farm you know; the rest is wild meadow
// (a warmer, longer-grassed look: a tint over the ground, tall grass and wildflowers), fenced off along its edges with the
// lanes and your land. The next field, once your level allows it, has a FOR SALE sign at its edge nearest your land,
// stakes with red ribbons along its borders with the rest of the meadow, and a bubble. Tap it for its card; buy it and
// its long grass is cut (shrinking away), the fence moves out round your land, and the next sign goes up when the level
// allows (Audrey: "Fields with natural borders", "Wild meadow, fenced off", "One each level")
let FIELDS = null;
function fieldAt(x, z) {                                   // which field (x, z) is in, or -1 (a lane, the water, off the farm)
  if (!FIELDS) return -1;
  const k = Math.floor((z - FIELDS.z0) / FIELDS.cell), i = Math.floor((x - FIELDS.x0) / FIELDS.cell);
  if (k < 0 || k >= FIELDS.nz) return -1;
  const r = FIELDS.rows[k];
  for (let j = 0; j < r.length; j += 3) { if (i < r[j]) return -1; if (i < r[j] + r[j + 1]) return r[j + 2]; }
  return -1;
}
const owned = f => GAME_MODE && game.data && f >= 0 && f < game.data.land.length;
// the wild meadow's edges to fence: a wild field's borders with your land or a lane (not between two wild fields, the
// farm's edge or the water)
// (each smoothed: the fields' edges come from a grid, a little stepped)
function fenceLines(by) {
  const out = [], n = game.data.land.length;
  for (const F of FIELDS.fields) {
    if (F.id < n) continue;
    for (const L of F.lines) if (by ? L.by === by : L.by === 'lane' || (typeof L.by === 'number' && L.by < n)) out.push(smoothLine(L.pts));
  }
  return out;
}
function smoothLine(pts) {
  let p = pts.map(q => [q[0], q[1]]);
  for (let it = 0; it < 3 && p.length > 2; it++) {
    const o = [p[0]];
    for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    o.push(p[p.length - 1]); p = o;
  }
  return p;
}
const SALE = { sign: null, stakes: null, field: -1, at: null };
const LAND = { tint: null, tintCv: null, fence: [], grass: [], mow: null };
const WOOD = new THREE.MeshLambertMaterial({ color: '#9c7b56' }), STAKE = new THREE.MeshLambertMaterial({ color: '#d8c39a' }), RIBBON = new THREE.MeshLambertMaterial({ color: '#d2402f', side: THREE.DoubleSide });
// the wild meadow's tint: a picture of the fields over the ground (soft-edged), warmer where it's wild
function landTint() {
  const nx = FIELDS.nx, nz = FIELDS.nz, n = game.data.land.length;
  if (!LAND.tintCv) {
    LAND.tintCv = document.createElement('canvas'); LAND.tintCv.width = nx; LAND.tintCv.height = nz;
    const tex = new THREE.CanvasTexture(LAND.tintCv); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    nightGrade(mat);
    const w = nx * FIELDS.cell, h = nz * FIELDS.cell, m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(FIELDS.x0 + w / 2, 0.0022, FIELDS.z0 + h / 2); m.receiveShadow = true; m.renderOrder = -1;
    scene.add(m); LAND.tint = m; m.updateMatrixWorld(true); m.matrixAutoUpdate = false;
  }
  const c = LAND.tintCv.getContext('2d'), img = c.createImageData(nx, nz), d = img.data;
  for (let k = 0; k < nz; k++) {
    const r = FIELDS.rows[k], row = k;                     // (the canvas's top row is the plane's top: the lowest z, laid flat)
    for (let j = 0; j < r.length; j += 3) {
      if (r[j + 2] < n) continue;
      for (let i = r[j]; i < r[j] + r[j + 1]; i++) { const o = (row * nx + i) * 4; d[o] = 196; d[o + 1] = 186; d[o + 2] = 92; d[o + 3] = 92; }
    }
  }
  c.putImageData(img, 0, 0);
  c.filter = 'blur(2px)'; c.drawImage(LAND.tintCv, 0, 0); c.filter = 'none';
  LAND.tint.material.map.needsUpdate = true;
}
// long grass and wildflowers over the wild fields (not under trees, bushes, rocks, props, the coops); `only`: just that
// field's (for its mowing)
function wildPlants(only = -1) {
  const nav = navGrid(), n = game.data.land.length, tufts = [[], [], []], flowers = { flower_daisy: [], flower_butter: [], flower_clover: [] }, fn = Object.keys(flowers);
  const step = 0.85;
  for (let z = FIELDS.z0, zi = 0; z < FIELDS.z0 + FIELDS.nz * FIELDS.cell; z += step, zi++) for (let x = FIELDS.x0, xi = 0; x < FIELDS.x0 + FIELDS.nx * FIELDS.cell; x += step, xi++) {
    const r = rng(xi * 7919 + zi * 104729 + 13);         // (each spot its own: the meadow stays the same as fields are bought)
    const px = x + r() * step, pz = z + r() * step, f = fieldAt(px, pz);
    if (only >= 0 ? f !== only : f < n) continue;
    if (!nav.freeAt(px, pz)) continue;
    tufts[Math.floor(r() * 3)].push(new THREE.Matrix4().compose(new THREE.Vector3(px, 0, pz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), new THREE.Vector3(1.3 + r() * 0.5, 1.9 + r() * 0.9, 1.3 + r() * 0.5)));
    if (r() < 0.22) { const k = fn[Math.floor((Math.sin(px * 0.31) + Math.cos(pz * 0.27) + 2) * 0.75) % 3]; for (let j = 0; j < 3; j++) flowers[k].push(place(px + (r() - 0.5) * 0.5, 0, pz + (r() - 0.5) * 0.5, r() * 360, 1.4 + r() * 0.6)); }
  }
  const made = [];
  tufts.forEach((list, k) => made.push(...batch('grass_tuft_' + k, list, { lambert: true, tile: 6, twoSided: true, wind: 1.2 })));
  for (const k of fn) made.push(...batch(k, flowers[k], { lambert: true, twoSided: true, wind: 1.2 }));
  return made;
}
// the wild meadow's fence: posts every metre and a half or so, two rails between them
function buildFence(lines) {
  const posts = [], rails = [], m = new THREE.Matrix4(), qn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const pts of lines) {
    // posts evenly along it (about every metre and a half), rails straight between them
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[cum.length - 1]; if (total < 0.3) continue;
    const n = Math.max(1, Math.round(total / 1.5)), at = d => { let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const u = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; };
    const P = Array.from({ length: n + 1 }, (_, k) => at(total * k / n));
    P.forEach(([x, z], k) => {
      const j = Math.sin(x * 12.9 + z * 78.2) * 0.04, nb = P[Math.min(n, k + 1)], pb = P[Math.max(0, k - 1)], yaw = Math.atan2(nb[0] - pb[0], nb[1] - pb[1]);
      posts.push(m.compose(new THREE.Vector3(x, 0.36, z), qn.setFromAxisAngle(up, yaw + j), new THREE.Vector3(1, 1 + j, 1)).clone());
      if (k < n) {
        const [bx, bz] = P[k + 1], l = Math.hypot(bx - x, bz - z), ry = Math.atan2(bx - x, bz - z);
        for (const y of [0.3, 0.58]) rails.push(m.compose(new THREE.Vector3((x + bx) / 2, y + j * 0.2, (z + bz) / 2), qn.setFromAxisAngle(up, ry), new THREE.Vector3(1, 1, l + 0.06)).clone());
      }
    });
  }
  const out = [];
  for (const [geo, list] of [[new THREE.BoxGeometry(0.075, 0.72, 0.075), posts], [new THREE.BoxGeometry(0.045, 0.06, 1), rails]]) {
    if (!list.length) continue;
    const inst = new THREE.InstancedMesh(geo, WOOD, list.length);
    list.forEach((mx, i) => inst.setMatrixAt(i, mx));
    inst.castShadow = true; inst.receiveShadow = true; inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); inst.matrixAutoUpdate = false;
    scene.add(inst); out.push(inst);
  }
  return out;
}
// the sign for the field for sale, at its edge nearest your land (else a lane), facing out; stakes with red ribbons along
// its borders with the rest of the meadow
function saleSign(F) {
  const n = game.data.land.length;
  // (along its edges with your land, else a lane, the spot nearest the middle of the longest stretch that's clear ground)
  const nav = navGrid(), spots = [], c0 = gamePlots()[0], home = c0 ? [c0.centre.x, c0.centre.z] : FIELDS.fields[0].mid;      // (near your first coop, where you look most)
  for (const L of F.lines) {
    const mine = typeof L.by === 'number' && L.by < n, lane = L.by === 'lane';
    if (!mine && !lane) continue;
    for (let i = 1; i < L.pts.length; i++) {
      const [ax, az] = L.pts[i - 1], [bx, bz] = L.pts[i], len = Math.hypot(bx - ax, bz - az); if (len < 0.8) continue;
      let nx = -(bz - az) / len, nz = (bx - ax) / len;
      if (fieldAt((ax + bx) / 2 + nx * 0.6, (az + bz) / 2 + nz * 0.6) !== F.id) { nx = -nx; nz = -nz; }     // (into the field)
      for (let u = 0.15; u <= 0.851; u += 0.1) {
        const sx = ax + (bx - ax) * u + nx * 0.62, sz = az + (bz - az) * u + nz * 0.62;      // (just inside its fence)
        let room = fieldAt(sx, sz) === F.id && !V.trees.some(t => Math.hypot(t.pos[0] - sx, t.pos[2] - sz) < 2.3);     // (not under a tree)
        for (let a = 0; a < 8 && room; a++) room = nav.freeAt(sx + Math.cos(a * 0.785) * 0.3, sz + Math.sin(a * 0.785) * 0.3);
        if (room) spots.push({ sx, sz, nx, nz, score: Math.min(len, 6) * (mine ? 3 : 1) * (1 - Math.abs(u - 0.5)) - 0.25 * Math.hypot(sx - home[0], sz - home[1]) });
      }
    }
  }
  const best = spots.sort((a, b) => b.score - a.score)[0];
  const g = new THREE.Group();
  if (best) {
    const { sx, sz, nx, nz } = best, face = Math.atan2(-nx, -nz);
    const sign = new THREE.Group(); sign.position.set(sx, 0, sz); sign.rotation.y = face;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95, 0.07), WOOD); post.position.y = 0.47; post.castShadow = true;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.34, 0.035), WOOD); board.position.set(0, 0.86, 0.04); board.castShadow = true;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.29), signLabel()); label.position.set(0, 0.86, 0.06);
    sign.add(post, board, label); g.add(sign);
    SALE.at = new THREE.Vector3(sx, 1.15, sz);
  } else SALE.at = new THREE.Vector3(F.mid[0], 1.0, F.mid[1]);
  const stakes = [], m = new THREE.Matrix4(), qn = new THREE.Quaternion();
  for (const L of F.lines) {
    if (!(typeof L.by === 'number' && L.by >= n)) continue;
    for (let i = 1; i < L.pts.length; i++) {
      const [ax, az] = L.pts[i - 1], [bx, bz] = L.pts[i], len = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.round(len / 2.4));
      for (let j = 0; j <= k; j++) stakes.push([ax + (bx - ax) * j / k, az + (bz - az) * j / k]);
    }
  }
  if (stakes.length) {
    const st = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.5, 0.035), STAKE, stakes.length), rb = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.16), RIBBON, stakes.length);
    stakes.forEach(([x, z], i) => {
      st.setMatrixAt(i, m.compose(new THREE.Vector3(x, 0.25, z), qn.identity(), new THREE.Vector3(1, 1, 1)));
      rb.setMatrixAt(i, m.compose(new THREE.Vector3(x + 0.03, 0.42, z), qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (x * 7.1 + z * 3.3) % 6.28), new THREE.Vector3(1, 1, 1)));
    });
    for (const im of [st, rb]) { im.castShadow = true; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); g.add(im); }
  }
  scene.add(g); g.updateMatrixWorld(true);
  return g;
}
let signMat = null;
function signLabel() {
  if (signMat && signMat.userData.lang === LANG) return signMat;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#f6efdc'; c.fillRect(0, 0, 256, 128); c.strokeStyle = '#b8332a'; c.lineWidth = 10; c.strokeRect(8, 8, 240, 112);
  c.fillStyle = '#b8332a'; c.textAlign = 'center'; c.textBaseline = 'middle'; let f = 58; c.font = `800 ${f}px Nunito, system-ui, sans-serif`;
  const t = game.t('sale_sign'); while (c.measureText(t).width > 212 && f > 30) { f -= 2; c.font = `800 ${f}px Nunito, system-ui, sans-serif`; }
  c.fillText(t, 128, 68);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  signMat = new THREE.MeshLambertMaterial({ map: tex }); signMat.userData.lang = LANG; nightGrade(signMat);
  return signMat;
}
// the land as the save says: the tint, the wild plants, the fence, the nav (the farmer keeps out of the wild meadow), the
// sign; fresh: everything from scratch (the farm opening), else what's changed (a field bought: its plants mown)
let landOwned = -1;
function syncLand(fresh = false) {
  if (!GAME_MODE || !game.data || !FIELDS) return;
  const n = game.data.land.length, sale = game.landForSale(), saleF = sale ? sale.field : -1;
  if (fresh || n !== landOwned) {
    const bought = !fresh && landOwned >= 0 && n > landOwned ? landOwned : -1;
    landOwned = n;
    landTint();
    for (const m of LAND.grass) { m.removeFromParent(); const i = grassTiles.findIndex(g => g.mesh === m); if (i >= 0) grassTiles.splice(i, 1); }
    for (const m of LAND.fence) { m.removeFromParent(); m.geometry.dispose(); }
    LAND.fence = buildFence(fenceLines());
    rebuildNav();
    if (bought >= 0) { if (LAND.mow) for (const m of LAND.mow.meshes) m.removeFromParent(); LAND.mow = { meshes: wildPlants(bought), t: 0 }; for (const m of LAND.mow.meshes) m.matrixAutoUpdate = true; }
    LAND.grass = wildPlants(); for (const m of LAND.grass) grassTiles.push({ mesh: m, full: m.count });
    applyGrass();
    renderer.shadowMap.needsUpdate = true;
  }
  if (saleF !== SALE.field) {
    if (SALE.sign) { SALE.sign.removeFromParent(); SALE.sign = null; }
    SALE.field = saleF;
    if (saleF >= 0) { SALE.sign = saleSign(FIELDS.fields[saleF]); renderer.shadowMap.needsUpdate = true; wake(500); }
  }
}
// the farm's walking grid made again in place (everyone keeps the same one): the fence now somewhere else
function rebuildNav() {
  if (!NAV) return;
  const fresh = buildNav();
  NAV.block = fresh.block; NAV.links = fresh.links; NAV.linkAt = fresh.linkAt; NAV.cost = null; pathCosts(NAV);
  REACH = null; dogSpots = null; for (const p of plots) p.exitWay = null;
}
function landCard() {
  holdBird(null);
  const n = game.landForSale(); if (!n) return;
  gameUI.landCard(n, () => buyField());
}
function buyField() {
  const r = game.buyLand();
  if (!r || r.broke) return r;
  gameUI.close(); gameUI.refresh(); gameUI.bumpCoins();
  hint(game.t('land_bought'));
  syncLand(); wake(1500);
  return r;
}
// each frame: a bought field's long grass shrinking away as it's cut
function tickLand(dt) {
  const M = LAND.mow; if (!M) return;
  M.t = Math.min(1, M.t + dt / 0.8); const k = 1 - M.t * M.t;
  for (const m of M.meshes) { m.scale.set(1, Math.max(0.001, k), 1); m.updateMatrix(); m.updateMatrixWorld(true); }
  if (M.t >= 1) { for (const m of M.meshes) m.removeFromParent(); LAND.mow = null; }
  wake(100);
}
// ---- coops where you like (release 1 step 5b; Audrey, 25 Oct: "people will have choice to put their coops where they
// want so no predefined places", "Drag anywhere, clears the way"). Each coop stands where the player put it on their own
// land, facing one of four ways (game.js: x, z, deg). Tap a coop by day: its card, "Move this coop"; then drag it about
// (or tap where it should go), turn it, and put it there. Anywhere on your own land: never on a lane, in the water or the
// wild meadow, over the farmhouse or anything else, or too near another coop, and its gate open to the farm. Trees,
// bushes and rocks where it goes are cleared (shrinking away in a puff), for good: the save lists them. Its birds come
// along in their pen; the walking grid, its lantern's pool of light at night and the grass round it all follow.
const FOOT = { x0: -1.74, z0: -1.67, x1: 1.74, z1: 1.67 };   // a coop and its pen, in its own place (its middle; its gate towards +z)
const APRON = { x0: -0.3, z0: 1.67, x1: 0.66, z1: 2.45 };    // the ground just outside its gate: kept open, to come and go
const spotOf = c => ({ x: c.x, z: c.z, deg: c.deg });
function inSpot(sp, x, z) { const a = sp.deg * DEG, c = Math.cos(a), s = Math.sin(a), dx = x - sp.x, dz = z - sp.z; return [dx * c - dz * s, dx * s + dz * c]; }
const rectGap = (R, lx, lz) => Math.hypot(Math.max(R.x0 - lx, 0, lx - R.x1), Math.max(R.z0 - lz, 0, lz - R.z1));
function segDist(px, pz, a, b) { const ax = a[0], az = a[2], dx = b[0] - ax, dz = b[2] - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)); return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
const nearLines = (lines, px, pz, r) => lines.some(l => { for (let i = 1; i < l.length; i++) if (segDist(px, pz, l[i - 1], l[i]) < r) return true; return false; });
function inPondAt(x, z, m) { const P = V.pond, ux = P.axisU[0], uz = P.axisU[2], vx = P.axisV[0], vz = P.axisV[2], lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz), dx = x - P.center[0], dz = z - P.center[2]; return ((dx * ux + dz * uz) / lu / (lu + m)) ** 2 + ((dx * vx + dz * vz) / lv / (lv + m)) ** 2 <= 1; }
// whether (x, z) is under one of the farm's coops (where the save has them), or within m of one
function underCoop(x, z, m = 0) {
  if (!GAME_MODE || !game.data) return false;
  for (const c of game.data.coops) { const [lx, lz] = inSpot(c, x, z); if (rectGap(FOOT, lx, lz) <= m) return true; }
  if (MOVE.plot && MOVE.at) { const [lx, lz] = inSpot(MOVE.at, x, z); if (rectGap(FOOT, lx, lz) <= m) return true; }     // (and where one's being moved to)
  return underDecor(x, z, m);                               // (and the decorations: no grass, flowers or pebbles through them)
}
// what a coop can't stand on: the buildings and props (a little round them), the way out of the farmhouse's front door,
// the den, the kennel
let BLOCKERS = null;
function blockers() {
  if (BLOCKERS) return BLOCKERS;
  const out = [];
  for (const p of V.props) {
    if (p.model === 'bridge' || p.model === 'dock') continue;                // (on the lanes and the water anyway)
    const box = p.model === 'wheat_field' ? new THREE.Box3(new THREE.Vector3(-2.2, 0, -1.2), new THREE.Vector3(2.2, 1, 1.2)) : parts[p.model] ? new THREE.Box3().setFromObject(parts[p.model]) : null;
    if (!box) continue;
    const pad = 0.15 / (p.s || 1);
    out.push({ p, inv: place(p.pos[0], 0, p.pos[2], p.deg, p.s || 1).invert(), x0: box.min.x - pad, x1: box.max.x + pad, z0: box.min.z - pad, z1: box.max.z + pad });
  }
  const fh = V.props.find(p => p.model === 'farmhouse');
  if (fh) { const h = fh.deg * DEG; out.push({ c: [fh.pos[0] + Math.sin(h) * 2.4, fh.pos[2] + Math.cos(h) * 2.4], r: 1.2 }); }
  out.push({ c: [FOX_DEN[0], FOX_DEN[1]], r: 1.6 });
  if (HAS_DOG) out.push({ c: [KENNEL_AT[0], KENNEL_AT[1]], r: 1.4 });
  return (BLOCKERS = out);
}
// a coop at sp ({ x, z, deg }; self: the coop itself, in the save): whether it can stand there and if not why, and the
// trees, bushes and rocks to clear
function coopSpot(sp, self) {
  const a = sp.deg * DEG, c = Math.cos(a), s = Math.sin(a), B = blockers(), v = new THREE.Vector3();
  const others = GAME_MODE ? game.data.coops.filter(o => o !== self) : [];
  let land = false, lane = false, room = false, near = false;
  // (off the fields: right up to a lane's edge is fine (the fields stop a little short of it), and the way out of the gate
  // can open onto a lane; never on a lane itself, in the water, or off the farm)
  const check = (R, m, gate) => {
    for (let lz = R.z0 - m; lz < R.z1 + m + 0.124; lz += 0.25) for (let lx = R.x0 - m; lx < R.x1 + m + 0.124; lx += 0.25) {
      const px = Math.min(lx, R.x1 + m), pz = Math.min(lz, R.z1 + m), x = sp.x + px * c + pz * s, z = sp.z - px * s + pz * c, f = fieldAt(x, z);
      if (f < 0) {
        if (nearLines(V.paths, x, z, gate ? V.pathHalf + 0.5 : V.pathHalf + 0.02)) { if (!gate) lane = true; }
        else if (nearLines(V.paths, x, z, V.pathHalf + 0.4)) { /* its verge */ }
        else if (nearLines(V.streams, x, z, V.streamHalf + 0.7) || inPondAt(x, z, 0.6)) lane = true; else land = true;
      } else if (!owned(f)) land = true;
      if (!room) for (const b of B) {
        if (b.r) { if (Math.hypot(x - b.c[0], z - b.c[1]) < b.r) { room = true; break; } continue; }
        v.set(x, 0, z).applyMatrix4(b.inv); if (v.x > b.x0 && v.x < b.x1 && v.z > b.z0 && v.z < b.z1) { room = true; break; }
      }
      if (!near) for (const o of others) { const [ox, oz] = inSpot(o, x, z); if (rectGap(FOOT, ox, oz) < 0.35 || rectGap(APRON, ox, oz) < 0.2) { near = true; break; } }
    }
  };
  check(FOOT, 0, false); check(APRON, 0, true);
  const clear = [], hits = (o, r) => { const [lx, lz] = inSpot(sp, o.pos[0], o.pos[2]); return rectGap(FOOT, lx, lz) < r || rectGap(APRON, lx, lz) < r * 0.7; };
  for (const t of V.trees) if (hits(t, 0.75 * (t.r || 1.3))) clear.push(t);
  for (const b of V.bushes) if (hits(b, 0.46 * (b.s || 1) + 0.05)) clear.push(b);
  for (const k of V.rocks) if (hits(k, 0.2 * (k.s || 1) + 0.05)) clear.push(k);
  const why = lane ? 'move_lane' : land ? 'move_land' : near ? 'move_coop' : room ? 'move_room' : null;
  return { ok: !why, why, clear };
}
// the farm opening: every coop where it can stand (a save from before, or a spot that's no good any more: the nearest
// good one to home), what's under them cleared, and the trees, bushes and rocks cleared for good taken away
function settleCoops() {
  let changed = false;
  for (const c of game.data.coops) {
    if (coopSpot(c, c).ok) continue;
    const f = freeSpot(c); if (f) { Object.assign(c, f); changed = true; }
  }
  const gone = new Set(game.data.cleared);
  for (const c of game.data.coops) for (const o of coopSpot(c, c).clear) if (!gone.has(o.id)) { gone.add(o.id); game.data.cleared.push(o.id); changed = true; }
  V.trees = V.trees.filter(o => !gone.has(o.id)); V.bushes = V.bushes.filter(o => !gone.has(o.id)); V.rocks = V.rocks.filter(o => !gone.has(o.id));
  if (changed) game.save();
}
function freeSpot(self) {
  const h = HOME_COOP;
  for (let r = 0; r < 34; r += 0.5) for (let k = 0, n = Math.max(1, Math.round(r * 8)); k < n; k++) {
    const a = k / n * Math.PI * 2, x = Math.round((h.x + Math.cos(a) * r) * 4) / 4, z = Math.round((h.z + Math.sin(a) * r) * 4) / 4;
    if (!owned(fieldAt(x, z))) continue;
    for (const deg of [self.deg, 90, 0, 180, 270]) if (coopSpot({ x, z, deg }, self).ok) return { x, z, deg };
  }
  return null;
}
// the village's plots had no grass of their own: in the game there are none, so the grass grows there like round it (as
// thick as round each, in patches)
function fillPlotGaps() {
  V.plots.forEach((p, pi) => {
    const a = p.deg * DEG, c = Math.cos(a), s = Math.sin(a), W = (lx, lz) => [p.pos[0] + lx * c + lz * s, p.pos[2] - lx * s + lz * c];
    const ringAt = (lx, lz) => { const m = Math.max(Math.abs(lx - 0.25), Math.abs(lz - 0.25)); return m > 2.6 && m < 4.2; };
    const ring = V.tufts.filter(t => { const dx = t[0] - p.pos[0], dz = t[2] - p.pos[2]; return ringAt(dx * c - dz * s, dx * s + dz * c); });
    let area = 0;
    for (let lz = -3.95; lz < 4.45; lz += 0.25) for (let lx = -3.95; lx < 4.45; lx += 0.25) if (ringAt(lx, lz)) { const [x, z] = W(lx, lz); if (fieldAt(x, z) >= 0) area += 0.0625; }
    if (ring.length < 4 || area < 2) return;
    const per = ring.length / area * 0.25, r = rng(500 + pi);                 // (tufts in each half-metre square)
    for (let lz = -2.25; lz < 2.7; lz += 0.5) for (let lx = -2.25; lx < 2.7; lx += 0.5) {
      const patch = 0.35 + 1.3 * (0.5 + 0.5 * Math.sin(lx * 1.3 + pi) * Math.cos(lz * 1.1 - pi * 0.7));
      for (let n = Math.floor(per * patch + r()); n > 0; n--) {
        const [x, z] = W(lx + r() * 0.5, lz + r() * 0.5), t = ring[Math.floor(r() * ring.length)];
        if (fieldAt(x, z) >= 0) V.tufts.push([x, 0, z, t[3], r() * 6.283, t[5]]);
      }
    }
  });
}
// ---- moving one
const MOVE = { plot: null, from: null, at: null, spot: null, ghost: null, foot: null, drag: null, moved: false, nav: false, grassAt: 0, grass: false };
const FOOT_OK = '#7be070', FOOT_NO = '#ff6a55';
function moveBusy(p) {
  return !!(p.fw || p.farmer || inside.open || (farmLife && (farmLife.pen || [farmLife.task, farmLife.pending].some(t => t && t.name === 'pen'))) || (nightVisit && nightVisit.active()));
}
function coopCard(p) {
  holdBird(null); henOff();
  gameUI.coopCard(p.gc, () => startMove(p));
}
function startMove(p) {
  if (!p || !p.gc || MOVE.plot || DMOVE.id) return;
  gameUI.close();
  if (!p.draft && moveBusy(p)) { hint(game.t('move_busy')); return; }
  holdBird(null); henOff(); tagBird = null; tag.classList.remove('on');
  MOVE.plot = p; MOVE.from = p.draft ? null : spotOf(p.gc); MOVE.at = spotOf(p.gc); MOVE.moved = !!p.draft; MOVE.nav = false;
  // its own copy while it moves (out of its style's batch), and its outline on the ground: green where it can go, red not
  const ghost = new THREE.Group();
  for (const [name, M] of coopParts(p)) for (const m of meshesOf(parts[name])) {
    const k = new THREE.Mesh(m.geometry, m.material); k.matrixAutoUpdate = false; k.matrix.copy(M).multiply(m.matrixWorld); k.castShadow = true; k.receiveShadow = true; ghost.add(k);
  }
  p.frame.add(ghost); MOVE.ghost = ghost;
  MOVE.foot = footMark(); p.group.add(MOVE.foot);
  batchCoops();
  if (farmLife && farmLife.task && farmLife.task.name === 'coop') farmLife.task = null;      // (he was off to watch them: something else)
  gameUI.moveBar(true, { turn: () => { MOVE.moved = true; moveTo(MOVE.at.x, MOVE.at.z, (MOVE.at.deg + 90) % 360, true); }, cancel: () => endMove(false), place: () => placeCoop() });
  moveTo(MOVE.at.x, MOVE.at.z, MOVE.at.deg, true);
  const size = Math.max(view.size, sideways() ? 3.4 : 4.4), v = viewAbove(p.centre.x, p.centre.z, size);
  focusOn(v[0], v[1], size);                                // (the player's tap: room round it in view, above the bar)
}
// where the view's middle goes so that (x, z) is in the middle of the farm above the bar
function viewAbove(x, z, size) {
  const H = canvas.clientHeight, dy = (H - Math.min(H, gameUI.moveTop())) / 2, k = dy * 2 * size / Math.max(1, H) / PITCH_SIN;
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion); up.y = 0; up.normalize();
  return [x - up.x * k, z - up.z * k];
}
let FOOT_TEX = null;
function footMark() {
  const X0 = FOOT.x0 - 0.25, X1 = FOOT.x1 + 0.25, Z0 = FOOT.z0 - 0.25, Z1 = APRON.z1 + 0.15, w = X1 - X0, h = Z1 - Z0;
  if (!FOOT_TEX) {
    const W = 256, H = Math.round(256 * h / w), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), px = x => (x - X0) / w * W, pz = z => (z - Z0) / h * H;
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.strokeStyle = '#fff'; c.lineWidth = 9; c.lineJoin = 'round';
    c.beginPath(); c.roundRect(px(FOOT.x0), pz(FOOT.z0), px(FOOT.x1) - px(FOOT.x0), pz(FOOT.z1) - pz(FOOT.z0), 22); c.fill(); c.stroke();
    // the way out of its gate
    const gx = px((APRON.x0 + APRON.x1) / 2), y0 = pz(FOOT.z1) + 4, y1 = pz(APRON.z1) - 4;
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(gx - 9, y0); c.lineTo(gx + 9, y0); c.lineTo(gx + 9, y1 - 18); c.lineTo(gx + 20, y1 - 18); c.lineTo(gx, y1); c.lineTo(gx - 20, y1 - 18); c.lineTo(gx - 9, y1 - 18); c.closePath(); c.fill();
    FOOT_TEX = new THREE.CanvasTexture(cv); FOOT_TEX.colorSpace = THREE.SRGBColorSpace;
  }
  const mat = new THREE.MeshBasicMaterial({ map: FOOT_TEX, color: FOOT_OK, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  mat.userData.noGrade = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), mat);
  m.position.set((X0 + X1) / 2, 0.025, (Z0 + Z1) / 2); m.renderOrder = 3; m.matrixAutoUpdate = false; m.updateMatrix();
  return m;
}
function moveTo(x, z, deg, force = false) {
  const p = MOVE.plot; if (!p) return;
  x = Math.round(x * 4) / 4; z = Math.round(z * 4) / 4;
  if (!force && x === MOVE.at.x && z === MOVE.at.z && deg === MOVE.at.deg) return;
  if (x !== MOVE.at.x || z !== MOVE.at.z) MOVE.moved = true;
  MOVE.at = { x, z, deg };
  const g = p.group; g.position.set(x, 0, z); g.rotation.y = deg * DEG; g.updateMatrix(); g.updateMatrixWorld(true);
  p.centre.set(x, 0, z); placeDoor(p); placePools(p);
  const S = MOVE.spot = coopSpot(MOVE.at, p.gc);
  MOVE.foot.material.color.set(S.ok ? FOOT_OK : FOOT_NO);
  gameUI.moveStatus(game.t(!MOVE.moved ? 'move_hint' : S.ok ? (S.clear.length ? 'move_clear' : 'move_ok') : S.why), S.ok);
  MOVE.grassAt = performance.now() + 220;                   // (once it's still a moment: no grass through its pen)
  renderer.shadowMap.needsUpdate = true; wake(600);
}
function groundAt(cx, cy, out = new THREE.Vector3()) {
  ndc.set(cx / canvas.clientWidth * 2 - 1, -(cy / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), out);
}
// a finger down on the coop: it's carried along; a tap elsewhere: it goes there
function moveGrab(e) {
  const g = groundAt(e.clientX, e.clientY); if (!g) return false;
  const [lx, lz] = inSpot(MOVE.at, g.x, g.z);
  if (rectGap(FOOT, lx, lz) > 0.35) return false;
  MOVE.drag = { id: e.pointerId, dx: g.x - MOVE.at.x, dz: g.z - MOVE.at.z }; return true;
}
function moveDrag(cx, cy) { const g = groundAt(cx, cy); if (g) moveTo(g.x - MOVE.drag.dx, g.z - MOVE.drag.dz, MOVE.at.deg); }
function moveTap(cx, cy) {
  const g = groundAt(cx, cy); if (!g) return;
  const [lx, lz] = inSpot(MOVE.at, g.x, g.z); if (rectGap(FOOT, lx, lz) < 0.05) return;
  moveTo(g.x, g.z, MOVE.at.deg);
}
// each frame: carried to the edge of the screen, the view goes along
function tickMove(dt) {
  tickDecMove(dt);
  if (MOVE.plot && MOVE.grassAt && !MOVE.drag && performance.now() > MOVE.grassAt) { MOVE.grassAt = 0; MOVE.grass = true; buildGrass(); wake(200); }
  const D = MOVE.drag; if (!D) return;
  const p = pointers.get(D.id); if (!p) return;
  const W = canvas.clientWidth, H = canvas.clientHeight, bar = gameUI.moveTop(), E = 44;
  const ex = p.x < E ? -1 : p.x > W - E ? 1 : 0, ey = p.y < 70 ? -1 : p.y > Math.min(H, bar) - E ? 1 : 0;
  if (!ex && !ey) return;
  pan(-ex * 320 * dt, -ey * 320 * dt); moveDrag(p.x, p.y); wake(300);
}
function placeCoop() {
  const p = MOVE.plot; if (!p || !MOVE.spot || !MOVE.spot.ok) return false;
  const at = MOVE.at, from = MOVE.from;
  if (from && at.x === from.x && at.z === from.z && at.deg === from.deg) { endMove(false); return true; }
  // its gate must open onto the farm: the walking grid with it there, and what's in its way gone
  const clear = MOVE.spot.clear, ids = new Set(clear.map(o => o.id)), keep = [V.trees, V.bushes, V.rocks];
  V.trees = V.trees.filter(o => !ids.has(o.id)); V.bushes = V.bushes.filter(o => !ids.has(o.id)); V.rocks = V.rocks.filter(o => !ids.has(o.id));
  rebuildNav(); MOVE.nav = true;
  if (!penSpec(p)) {
    [V.trees, V.bushes, V.rocks] = keep;
    MOVE.spot = { ok: false, why: 'move_gate', clear: [] }; MOVE.foot.material.color.set(FOOT_NO); gameUI.moveStatus(game.t('move_gate'), false);
    return false;
  }
  let said = game.t('moved');
  if (p.draft) {                                            // a new breed's coop: on the farm now, its trio with it
    const c = game.placeCoop(p.draft, at, [...ids]);
    if (!c) { [V.trees, V.bushes, V.rocks] = keep; endMove(false); return false; }
    p.gc = c; delete p.draft;
    const names = game.birdsIn(c.id).sort((a, b) => (b.sex === 'r') - (a.sex === 'r')).map(b => b.name);
    said = game.t('welcome_trio', { names: names.slice(0, -1).join(', ') + ' ' + game.t('and') + ' ' + names[names.length - 1] });
    gameUI.refresh();
  } else game.moveCoop(p.gc.id, at.x, at.z, at.deg, [...ids]);
  for (const o of clear) clearAway(o);
  endMove(true);
  hint(said);
  return true;
}
function endMove(placed) {
  const p = MOVE.plot; if (!p) return;
  if (!placed && p.draft) dropPlot(p);                      // (a new coop not placed after all: back to Your coops)
  else if (!placed) {
    const f = MOVE.from, g = p.group; g.position.set(f.x, 0, f.z); g.rotation.y = f.deg * DEG; g.updateMatrix(); g.updateMatrixWorld(true);
    p.centre.set(f.x, 0, f.z); placeDoor(p); placePools(p);
  }
  MOVE.ghost.removeFromParent(); MOVE.foot.removeFromParent(); MOVE.foot.geometry.dispose(); MOVE.foot.material.dispose();
  const nav = MOVE.nav, grass = MOVE.grass;
  MOVE.plot = MOVE.ghost = MOVE.foot = MOVE.drag = MOVE.spot = null; MOVE.nav = MOVE.grass = false; MOVE.grassAt = 0;
  batchCoops();
  if (placed) { buildNature(); buildGrass(); hidePebbles(); clearWalkers(p); }
  else { if (nav) rebuildNav(); if (grass) buildGrass(); }
  gameUI.moveBar(false);
  renderer.shadowMap.needsUpdate = true; wake(1000);
}
// ---- new breeds (release 1 step 6): Your coops (the little barn in the top bar, a red dot when one's waiting), and
// placing a waiting breed's coop: it appears at the nearest good spot to the view with its trio, and is moved like any
// other; put down, it's on the farm for good ("Welcome, Duke, Honey and Clover!"); Cancel, and it waits again
function coopsSheet() {
  holdBird(null); henOff();
  gameUI.coopsSheet({ place: b => { gameUI.close(); startPlace(b); }, move: id => { const p = gamePlots().find(q => q.gc.id === id); gameUI.close(); if (p) startMove(p); }, book: () => bookSheet() });
}
// ---- the Breed Book (release 1 step 8; gameui.js bookSheet, game.js bookPages): on the farmhouse shelf. A tap on the
// farmhouse (by day or night) opens it, or "📖 Breed Book" at the bottom of Your coops. A page for each breed: found or
// not yet, how it comes, its eggs (their colours as the farm's own) and its coop; a breed waiting can be placed from it
// ---- shows (release 1 step 9; game.js shows, gameui.js showsSheet): the rosette up top opens today's shows; entering a
// bird (the fee); the results the next morning at 7:00 (game.showTick), their card once the farm's free (showNews)
function showsSheet(more) {
  holdBird(null); henOff();
  game.lookedAtShows(); gameUI.refresh();
  gameUI.showsSheet({ enter: (id, bid) => {
    const s = game.enterShow(id, bid), b = game.bird(bid);
    if (!s || !b) return;
    hint(game.t('show_entered', { name: b.name, show: game.showName(id) }, b.sex === 'h'));
    gameUI.refresh(); gameUI.bumpCoins(); showsSheet(); jobsDone(s.done);
  } }, more);
}
// ---- the show day (release 1 step 9b; showday.js): the results in and the farm free, by day: "🎀 Show day!" with "Watch
// the judging" (the view goes to the show tent on the green: the player's tap) or "Just the results". The scene, then the
// results card; the tent goes once it's closed. Meanwhile the farm's own farmer and her bird are away at the show (hidden)
let SHOWDAY = null, showDayOffered = '', SHOW_WHY = null, showFrom = null;
const SHOW_DAY_HOURS = [7, 21];
function offerShowDay(list) {
  const d = new Date(Date.now()), h = d.getHours() + d.getMinutes() / 60, key = list.map(r => r.id + r.bird).join();      // (the phone's own clock, as the shows')
  if (h < SHOW_DAY_HOURS[0] || h >= SHOW_DAY_HOURS[1] || showDayOffered === key || gamePlots().some(p => p.fw) || (farmLife && farmLife.pen)) return false;
  const r = pickShowDay(list); if (!r || !showSpot()) return false;
  showDayOffered = key;
  gameUI.showDayCard(game.showName(r.id), () => startShowDay(r, list), () => gameUI.showResults(list));
  return true;
}
const pickShowDay = list => list.slice().sort((a, b) => 'vcn'.indexOf(b.id[0]) - 'vcn'.indexOf(a.id[0]) || a.place - b.place)[0];
// where the show tent goes: the village's show field, on open grass just past the farm's edge beside the first coop (or past
// its front), clear of the lanes, the water, the buildings and the trees (the farm's own land is too full for it);
// the view goes there for the show (the player's tap) and back after; worked out once a visit
let SHOW_SPOT;
function showSpot() {
  if (SHOW_SPOT !== undefined) return SHOW_SPOT;
  const foot = [-3.55, -2.1, 3.22, 1.94], M = 0.4, a = 45 * DEG, c = Math.cos(a), s = Math.sin(a), B = blockers(), v = new THREE.Vector3();
  const trees = [...V.trees.map(t => [t.pos[0], t.pos[2], 0.75 * (t.r || 1.3)]), ...V.bushes.map(b => [b.pos[0], b.pos[2], 0.5 * (b.s || 1)]), ...V.rocks.map(k => [k.pos[0], k.pos[2], 0.3 * (k.s || 1)])];
  const why = SHOW_WHY = {}, no = k => { why[k] = (why[k] || 0) + 1; return false; };
  const fits = (X, Z) => {
    for (let lz = foot[1] - M; lz <= foot[3] + M + 1e-6; lz += 0.35) for (let lx = foot[0] - M; lx <= foot[2] + M + 1e-6; lx += 0.35) {
      const x = X + lx * c + lz * s, z = Z - lx * s + lz * c;
      if (fieldAt(x, z) >= 0) return no('field');
      if (nearLines(V.paths, x, z, V.pathHalf + 0.15) || nearLines(V.streams, x, z, V.streamHalf + 0.6) || inPondAt(x, z, 0.5)) return no('lane');
      if (B.some(b => b.r ? Math.hypot(x - b.c[0], z - b.c[1]) < b.r : (v.set(x, 0, z).applyMatrix4(b.inv), v.x > b.x0 && v.x < b.x1 && v.z > b.z0 && v.z < b.z1))) return no('prop');
      if (trees.some(t => Math.hypot(x - t[0], z - t[1]) < t[2])) return no('tree');
    }
    return true;
  };
  // (u across the screen, v up it): just past the farm's left or right edge, as far up as the first coop, the nearer side
  // first; else past its front edge
  const hc = game.data.coops[0] || HOME_COOP, hu = (hc.x - hc.z) * R2, hv = (-hc.z - hc.x) * R2, out = [];
  for (const side of hu < 0 ? [-1, 1] : [1, -1]) for (let du = 3; du < 12; du += 0.5) for (const dv of [0, -1, 1, -2, 2, -3, 3, -4, 4, -6, 6]) {
    const u = side < 0 ? V.bounds.u[0] - du : V.bounds.u[1] + du, vv = Math.max(V.bounds.v[0] + 3, Math.min(V.bounds.v[1] - 4, hv + dv));
    out.push([u, vv]);
  }
  for (let dv = 2.5; dv < 14; dv += 0.5) for (const du of [0, 2, -2, 4, -4, 6, -6]) out.push([Math.max(V.bounds.u[0] + 3, Math.min(V.bounds.u[1] - 3, hu + du)), V.bounds.v[0] - dv]);
  for (const [u, vv] of out) { const X = (u - vv) * R2, Z = -(u + vv) * R2; if (fits(X, Z)) return (SHOW_SPOT = { x: X, z: Z }); }
  return (SHOW_SPOT = null);
}
async function startShowDay(r, list) {
  const at = showSpot(), gb = game.bird(r.bird), real = allBirds.find(x => x.gid === r.bird);
  if (!at || !gb) { gameUI.showResults(list); return; }
  holdBird(null); henOff();
  try { await loadShow(loadGLB, loadJSON); } catch (e) { gameUI.showResults(list); return; }
  const f = gb.sex === 'h';
  SHOWDAY = new ShowDay({ scene, grade: nightGrade, newBird: (...a) => new Bird(...a), plots, allBirds, r: rng([...(r.id + r.bird)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)), at, look: FARMER_LOOK,
    bird: { breed: gb.breed, kind: f ? 'hen' : 'rooster', colour: real ? real.colour : (gb.breed === 'sil' ? 'white' : null) }, place: r.place, champTier: r.id[0] !== 'v',
    title: game.t('show_sign_' + r.id[0]), sub: r.id[0] === 'n' ? '' : game.showName(r.id).replace(/ (Village|County) Show$/, '').replace(/^Concours (de |d’|régional du )/, ''),
    hearts: w => spawnHeart(w), say: k => hint(game.t('sd_' + k, { farmer: game.farmerName(), name: gb.name }, f)),
    onEnd: () => { if (SHOWDAY) gameUI.showResults(list); } });
  { const wo = game.outfitWorn(); if (wo !== 'classic' && outfitLoaded(wo)) SHOWDAY.farmer.wear(wo); }      // (in the outfit he wears on the farm)
  SHOWDAY.real = real; if (real) real.root.visible = false;
  if (farmLife) farmLife.group.visible = false;
  showFrom = [view.target.x, view.target.z, view.size];
  const c = SHOWDAY.centre(), asp = innerWidth / Math.max(1, innerHeight); focusOn(c.x, c.z, Math.min(view.max, Math.max(2.25, 6.2 / (2 * asp))));      // (the whole tent across the screen, upright too)
  gameUI.skipBtn(true, () => { if (SHOWDAY) SHOWDAY.skip(); });
  wake(1000);
}
function endShowDay() {
  if (!SHOWDAY) return;
  if (SHOWDAY.real) SHOWDAY.real.root.visible = true;
  if (farmLife) farmLife.group.visible = true;
  SHOWDAY.dispose(); SHOWDAY = null; gameUI.skipBtn(false);
  if (showFrom) { focusOn(showFrom[0], showFrom[1], showFrom[2]); showFrom = null; }      // (back to the farm, where the view was)
  wake(300);
}
// ---- Today's jobs (release 1 step 9c; game.js jobs): the clipboard up top; a job done: Collect its reward
function jobsSheet() {
  holdBird(null); henOff(); guideDid('jobs');
  game.lookedAtJobs(); gameUI.refresh();
  gameUI.jobsSheet({ claim: i => {
    const r = game.claimJob(i); if (!r) return;
    hint(game.t('job_claimed', { c: r.coins, xp: r.xp })); gameUI.refresh(); gameUI.bumpCoins(); jobsSheet();
  } });
}
function bookSheet() {
  holdBird(null); henOff();
  gameUI.bookSheet({ egg: EGG_COLOUR, place: b => { gameUI.close(); startPlace(b); } });
}
// whether a ray meets the farmhouse (its model's box, where the village has it)
let HOUSE_HIT = null;
function farmhouseAt(r) {
  if (!HOUSE_HIT) {
    const fh = V.props.find(p => p.model === 'farmhouse'); if (!fh || !parts.farmhouse) return false;
    const m = place(fh.pos[0], 0, fh.pos[2], fh.deg, fh.s || 1);
    HOUSE_HIT = { m, inv: m.clone().invert(), box: new THREE.Box3().setFromObject(parts.farmhouse) };
  }
  const p = new THREE.Ray().copy(r).applyMatrix4(HOUSE_HIT.inv).intersectBox(HOUSE_HIT.box, new THREE.Vector3());
  farmhouseAt.dist = p ? p.applyMatrix4(HOUSE_HIT.m).distanceTo(r.origin) : Infinity;
  return !!p;
}
function startPlace(breed) {
  if (MOVE.plot || DMOVE.id || inside.open || !game.waitingCoops().includes(breed)) return false;
  const at = placeSpot(breed); if (!at) { hint(game.t('no_room')); return false; }
  const d = game.draftCoop(breed, at); if (!d) return false;
  const p = makePlot(Math.max(-1, ...plots.map(q => q.index)) + 1, [at.x, 0, at.z], at.deg, d.coop, rng(97 + plots.length), 'coop', d.birds);
  p.draft = d;
  for (const b of p.birds) b.blob = freeBlobs.length ? freeBlobs.pop() : -1;
  rebuildDoors(); rebuildPools();
  startMove(p);
  return true;
}
// where a new coop first appears: the nearest spot to the middle of the view where it can stand, facing you, best with
// nothing to clear
function placeSpot(breed) {
  const self = { breed }, cx = Math.round(view.target.x * 4) / 4, cz = Math.round(view.target.z * 4) / 4;
  const quick = (x, z) => [[0, 0], [-1.7, -1.6], [1.7, -1.6], [-1.7, 1.6], [1.7, 1.6]].every(([dx, dz]) => owned(fieldAt(x + dx, z + dz)));
  let best = null;
  for (let r = 0; r < 40 && !best; r += 1) for (let k = 0, n = Math.max(1, Math.round(r * 6)); k < n; k++) {
    const a = k / n * Math.PI * 2, x = Math.round((cx + Math.cos(a) * r) * 4) / 4, z = Math.round((cz + Math.sin(a) * r) * 4) / 4;
    if (!quick(x, z)) continue;
    for (const deg of [90, 0]) { const S = coopSpot({ x, z, deg }, self); if (S.ok && (!best || S.clear.length < best.n)) best = { x, z, deg, n: S.clear.length }; if (best && !best.n) break; }
    if (best && !best.n) break;
  }
  return best && { x: best.x, z: best.z, deg: best.deg };
}
function dropPlot(p) {
  for (const b of [...p.birds]) removeBird(b);
  p.group.removeFromParent();
  const i = plots.indexOf(p); if (i >= 0) plots.splice(i, 1);
  rebuildDoors(); rebuildPools();
}
// a coop put down where the farmer was walking: he steps out of its way (to the nearest open ground, in its puff), and
// whatever he was off to do he thinks again about with the farm as it is now
function clearWalkers(p) {
  if (!farmLife || farmLife.home) return;
  const L = farmLife, at = L.pos, [lx, lz] = inSpot(spotOf(p.gc), at.x, at.z);
  if (rectGap(FOOT, lx, lz) < 0.5 || rectGap(APRON, lx, lz) < 0.2 || !navGrid().freeAt(at.x, at.z)) {
    const f = navGrid().nearestIn(farmReach(), at.x, at.z, 5);
    if (f) { at.x = f[0]; at.z = f[1]; }
  }
  if (L.task && !/^(out|home|pen)$/.test(L.task.name)) L.task = null;
}
// a tree, bush or rock cleared: it shrinks away in a puff of leaves (or dust)
const CLEARING = [];
let PUFF_TEX = null;
function clearAway(o) {
  const g = new THREE.Group(), base = new THREE.Vector3();
  for (const m of meshesOf(parts[o.model])) { const k = new THREE.Mesh(m.geometry, m.material); k.matrixAutoUpdate = false; k.matrix.copy(m.matrixWorld); k.castShadow = true; k.receiveShadow = true; g.add(k); }
  natureMatrix(o).decompose(g.position, g.quaternion, g.scale); base.copy(g.scale); scene.add(g);
  if (!PUFF_TEX) PUFF_TEX = fxTexture64(64, c => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.fill(); });
  const mat = new THREE.SpriteMaterial({ map: PUFF_TEX, color: o.id[0] === 'r' ? '#d8cfbf' : o.id[0] === 't' ? '#8cc26a' : '#9fcf78', transparent: true, depthWrite: false });
  const R = rng(o.pos[0] * 131 + o.pos[2] * 71), H = o.id[0] === 't' ? (o.h || 3) * 0.55 : o.id[0] === 'b' ? 0.45 : 0.2, bits = [];
  for (let i = 0; i < (o.id[0] === 't' ? 16 : 9); i++) {
    const sp = new THREE.Sprite(mat), a = R() * Math.PI * 2, up = R();
    sp.position.set(o.pos[0], H * (0.3 + 0.7 * up), o.pos[2]); sp.scale.setScalar(0.01);
    bits.push({ sp, v: new THREE.Vector3(Math.cos(a) * (0.6 + R()), 0.4 + R() * 0.8, Math.sin(a) * (0.6 + R())), s: (o.id[0] === 't' ? 0.5 : 0.28) * (0.7 + R() * 0.6) });
    scene.add(sp);
  }
  CLEARING.push({ g, base, t: 0, bits, mat });
}
function tickClearing(dt) {
  for (let i = CLEARING.length - 1; i >= 0; i--) {
    const C = CLEARING[i]; C.t += dt;
    const k = Math.max(0.001, 1 - Math.min(1, C.t / 0.55) ** 2); C.g.scale.copy(C.base).multiplyScalar(k);
    const u = Math.min(1, C.t / 1.1);
    for (const b of C.bits) { b.sp.position.addScaledVector(b.v, dt); b.v.multiplyScalar(1 - dt * 2.2); b.sp.scale.setScalar(b.s * (0.4 + u)); }
    C.mat.opacity = 0.9 * (1 - u) * Math.min(1, C.t / 0.08);
    if (C.t >= 1.1) { C.g.removeFromParent(); for (const b of C.bits) b.sp.removeFromParent(); C.mat.dispose(); CLEARING.splice(i, 1); }
  }
  if (CLEARING.length) wake(100);
}
// ---- decorations on the farm (release 1 step 9d; Audrey, 25 Oct: "Decorations and outfits (Recommended)"). The shop
// (tap your coins at the top: "Decorate your farm", game.js DECOR) has the 2D game's eight, each from its level. Bought, it
// appears at the nearest good spot to the view and is moved like a coop: dragged about, or a tap where it should go, then
// "Put it here" (paid for then: Cancel costs nothing). Anywhere on your own land: never on a lane or in the water, over a
// building, a coop or another decoration, and never shutting off the way to a coop's gate; trees, bushes and rocks in the
// way are cleared (in their puff, for good, like a coop's). The duck house goes straight onto the pond, where the village
// has it (the ducks sleep in it from that night). Tap one on the farm: its card, Move. Each stands as its own copy (not in
// a batch: they come and go and move), facing the player like the village's; everyone walks round them; the life round
// them is the village's (bees, butterflies, birds at the bath, the cockerel's glints, the music, the windmill's sails)
const DEC = { items: {}, lifeRoot: null };                   // items[id]: { group, prop (its V.props entry), d (its decorList entry) }
const DMOVE = { id: null, item: null, buy: false, from: null, at: null, spot: null, foot: null, drag: null, moved: false, nav: false, grassAt: 0, grass: false };
// how far (lx, lz: in its own frame) a point is outside its footprint (round ones: their circle; the bandstand's steps too)
function decGap(id, lx, lz) {
  const f = DECOR_INFO.foot[id], R = DECOR_ROUND[id];
  if (R && !(id === 'bandstand' && Math.abs(lx) < 0.5 && lz > 0)) return Math.max(0, Math.hypot(lx, lz) - R);
  return Math.hypot(Math.max(f[0] - lx, 0, lx - f[2]), Math.max(f[1] - lz, 0, lz - f[3]));
}
const decSp = (x, z, deg = 45) => ({ x, z, deg });
// whether (x, z) is under one of the farm's decorations (where the save has them, and where one's being moved to)
function underDecor(x, z, m = 0) {
  if (!GAME_MODE || !game.data || !DECOR_INFO) return false;
  for (const o of game.data.decor || []) { if (o.x === undefined || o.x === null) continue; const [lx, lz] = inSpot(decSp(o.x, o.z), x, z); if (decGap(o.id, lx, lz) <= m) return true; }
  const W = game.data.wheat;                                // (and the wheat field)
  if (W && W.x !== null && DECOR_INFO.foot.wheat) { const [lx, lz] = inSpot(decSp(W.x, W.z, W.deg), x, z); if (decGap('wheat', lx, lz) <= m) return true; }
  if (DMOVE.id && DMOVE.at) { const [lx, lz] = inSpot(decSp(DMOVE.at.x, DMOVE.at.z, DMOVE.at.deg), x, z); if (decGap(DMOVE.id, lx, lz) <= m) return true; }
  return false;
}
// a decoration at (x, z): whether it can stand there and if not why, and the trees, bushes and rocks to clear
function decorSpot(id, x, z, deg = 45) {
  const f = DECOR_INFO.foot[id], sp = decSp(x, z, deg), a = deg * DEG, c = Math.cos(a), s = Math.sin(a), B = blockers(), v = new THREE.Vector3();
  const self = DEC.items[id] && DEC.items[id].prop;
  let land = false, lane = false, room = false;
  for (let lz = f[1]; lz < f[3] + 0.124; lz += 0.25) for (let lx = f[0]; lx < f[2] + 0.124; lx += 0.25) {
    const px = Math.min(lx, f[2]), pz = Math.min(lz, f[3]);
    if (decGap(id, px, pz) > 0.01) continue;
    const wx = x + px * c + pz * s, wz = z - px * s + pz * c, fi = fieldAt(wx, wz);
    if (fi < 0) {
      if (nearLines(V.paths, wx, wz, V.pathHalf + 0.02)) lane = true;
      else if (nearLines(V.paths, wx, wz, V.pathHalf + 0.4)) { /* its verge */ }
      else if (nearLines(V.streams, wx, wz, V.streamHalf + 0.5) || inPondAt(wx, wz, 0.5)) lane = true; else land = true;
    } else if (!owned(fi)) land = true;
    if (!room) for (const b of B) {
      if (b.p && b.p === self) continue;
      if (b.r) { if (Math.hypot(wx - b.c[0], wz - b.c[1]) < b.r) { room = true; break; } continue; }
      v.set(wx, 0, wz).applyMatrix4(b.inv); if (v.x > b.x0 && v.x < b.x1 && v.z > b.z0 && v.z < b.z1) { room = true; break; }
    }
    if (!room) for (const o of game.data.coops) { const [ox, oz] = inSpot(o, wx, wz); if (rectGap(FOOT, ox, oz) < 0.3 || rectGap(APRON, ox, oz) < 0.3) { room = true; break; } }
  }
  const clear = [], hits = (o, r) => { const [lx, lz] = inSpot(sp, o.pos[0], o.pos[2]); return decGap(id, lx, lz) < r; };
  for (const t of V.trees) if (hits(t, 0.75 * (t.r || 1.3))) clear.push(t);
  for (const b of V.bushes) if (hits(b, 0.46 * (b.s || 1) + 0.05)) clear.push(b);
  for (const k of V.rocks) if (hits(k, 0.2 * (k.s || 1) + 0.05)) clear.push(k);
  const why = lane ? 'dec_bad_lane' : land ? 'dec_bad_land' : room ? 'dec_bad_room' : null;
  return { ok: !why, why, clear };
}
// the nearest good spot to (cx, cz), best with nothing to clear, and (way: when it's offered to be put down) the way to
// every coop's gate still open with it there
function decorFreeNear(id, cx, cz, far = 40, way = false, degs = [45]) {
  cx = Math.round(cx * 4) / 4; cz = Math.round(cz * 4) / 4;
  const no = new Set();
  for (let tries = 0; tries < 6; tries++) {
    let best = null, until = far;
    for (let r = 0; r < Math.min(far, until) && !(best && !best.n); r += 1) for (let k = 0, n = Math.max(1, Math.round(r * 6)); k < n && !(best && !best.n); k++) {
      const a = k / n * Math.PI * 2, x = Math.round((cx + Math.cos(a) * r) * 4) / 4, z = Math.round((cz + Math.sin(a) * r) * 4) / 4;
      if (!owned(fieldAt(x, z)) || no.has(x + ',' + z)) continue;
      for (const deg of degs) {                             // (the wheat field: either way round)
        const S = decorSpot(id, x, z, deg);
        if (S.ok && (!best || S.clear.length < best.n)) { if (!best) until = r + 3; best = { x, z, deg, n: S.clear.length }; if (!best.n) break; }      // (a few steps further for one with nothing to clear)
      }
    }
    if (!best) return null;
    if (!way || decorWayOk(id, best.x, best.z, best.deg)) return { x: best.x, z: best.z, deg: best.deg };
    for (let dx = -1; dx <= 1; dx += 0.25) for (let dz = -1; dz <= 1; dz += 0.25) no.add((best.x + dx) + ',' + (best.z + dz));      // (and not just beside it)
  }
  return null;
}
// whether with it at (x, z) the farmer can still get to every coop's gate (the walking grid made with it there, then as it was)
function decorWayOk(id, x, z, deg = 45) {
  if (id === 'wheat') return true;                          // (the field can be walked over)
  const it = DEC.items[id], tmp = it ? null : { model: id, pos: [x, 0, z], deg, s: 1, decor: true, own: true }, old = it && it.prop.pos;
  if (tmp) V.props.push(tmp); else it.prop.pos = [x, 0, z];
  rebuildNav();
  const ok = !gamePlots().some(p => !penSpec(p));
  if (tmp) V.props.splice(V.props.indexOf(tmp), 1); else it.prop.pos = old;
  rebuildNav();
  return ok;
}
// the duck house on the pond: along its long axis, at the end away from the dock (as in the village)
function duckHouseSpot() {
  const P = V.pond, c = P.center, dock = V.props.find(p => p.model === 'dock');
  const e1 = [c[0] + P.axisU[0] * 0.42, c[2] + P.axisU[2] * 0.42], e2 = [c[0] - P.axisU[0] * 0.42, c[2] - P.axisU[2] * 0.42];
  return !dock || Math.hypot(e1[0] - dock.pos[0], e1[1] - dock.pos[2]) > Math.hypot(e2[0] - dock.pos[0], e2[1] - dock.pos[2]) ? e1 : e2;
}
// the farm opening: every decoration where it can stand (a spot that's no good any more, or none: the nearest good one),
// what's under them cleared
function settleDecor() {
  if (!game.data.decor) game.data.decor = [];
  if (!DECOR_INFO) return;
  let changed = false;
  const gone = new Set(game.data.cleared);
  for (const o of game.data.decor) {
    if (DECOR[o.id].pond || !DECOR_INFO.foot[o.id] || !parts[o.id]) continue;
    if (o.x === null || o.z === null || !decorSpot(o.id, o.x, o.z).ok) {
      const hc = game.data.coops[0] || HOME_COOP, f = o.x !== null && o.z !== null ? decorFreeNear(o.id, o.x, o.z) : decorFreeNear(o.id, hc.x + 3, hc.z + 3);
      if (f) { o.x = f.x; o.z = f.z; } else { o.x = o.z = null; }
      changed = true;
    }
    if (o.x === null) continue;
    for (const t of decorSpot(o.id, o.x, o.z).clear) if (!gone.has(t.id)) { gone.add(t.id); game.data.cleared.push(t.id); changed = true; }
    V.trees = V.trees.filter(t => !gone.has(t.id)); V.bushes = V.bushes.filter(t => !gone.has(t.id)); V.rocks = V.rocks.filter(t => !gone.has(t.id));
    addDecor(o.id, o.x, o.z);                                 // (in V.props: the next one keeps clear of it)
  }
  // the wheat field: on your land from the start, a little way out from the farmhouse (Audrey: "On your land from
  // the start"), on the side of the farmhouse that faces you; a spot that's no good any more: the nearest good one
  const W = game.wheat();
  if (DECOR_INFO.foot.wheat) {
    if (W.x === null || W.z === null || !decorSpot('wheat', W.x, W.z, W.deg).ok) {
      const fh = V.props.find(p => p.model === 'farmhouse'), vl = Math.hypot(VIEW_DIR.x, VIEW_DIR.z), c = fh ? [fh.pos[0] + VIEW_DIR.x / vl * 6.5, fh.pos[2] + VIEW_DIR.z / vl * 6.5] : [HOME_COOP.x, HOME_COOP.z];      // (in front of the farmhouse as you look at it, so it shows)
      const f = W.x !== null && W.z !== null ? decorFreeNear('wheat', W.x, W.z, 40, false, [W.deg, W.deg === 45 ? 135 : 45]) : decorFreeNear('wheat', c[0], c[1], 40, false, [45, 135]);
      if (f) { W.x = f.x; W.z = f.z; W.deg = f.deg; } else { W.x = W.z = null; }
      changed = true;
    }
    if (W.x !== null) {
      for (const t of decorSpot('wheat', W.x, W.z, W.deg).clear) if (!gone.has(t.id)) { gone.add(t.id); game.data.cleared.push(t.id); changed = true; }
      V.trees = V.trees.filter(t => !gone.has(t.id)); V.bushes = V.bushes.filter(t => !gone.has(t.id)); V.rocks = V.rocks.filter(t => !gone.has(t.id));
      addDecor('wheat', W.x, W.z, W.deg);
    }
  }
  if (changed) game.save();
}
// its own copy of the model (and the windmill's sails), not yet anywhere
function decorModel(id) {
  const g = new THREE.Group(); g.matrixAutoUpdate = false;
  if (id === 'wheat') {                                     // (the wheat field: its bed, and its wheat in the four stages)
    if (parts.wheat_field) for (const m of meshesOf(parts.wheat_field)) { nightGrade(m.material); const k = new THREE.Mesh(m.geometry, m.material); k.matrixAutoUpdate = false; k.matrix.copy(m.matrixWorld); k.receiveShadow = true; g.add(k); }
    g.userData.wheat = wheat(null, 4.4, 2.4, g);
    return g;
  }
  for (const m of meshesOf(parts[id])) {
    if (m.material && m.material.name === 'glass') { m.material.transparent = true; m.material.opacity = 0.34; m.material.depthWrite = false; }
    nightGrade(m.material);
    const k = new THREE.Mesh(m.geometry, m.material); k.matrixAutoUpdate = false; k.matrix.copy(m.matrixWorld); k.castShadow = true; k.receiveShadow = true; g.add(k);
  }
  if (id === 'windmill' && parts.sails && DECOR_INFO.hub) {
    const w = new THREE.Group(), s = part('sails'); w.add(s); w.position.fromArray(DECOR_INFO.hub);
    s.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; nightGrade(o.material); } });
    g.add(w); g.userData.sails = w;
  }
  return g;
}
// one on the farm: drawn, in everyone's way (V.props), and tappable (decorList); its life is made again with the rest's
function addDecor(id, x, z, deg = 45) {
  let it = DEC.items[id];
  if (!it) {
    const box = id === 'wheat' ? new THREE.Box3(new THREE.Vector3(-2.2, 0, -1.2), new THREE.Vector3(2.2, 0.6, 1.2)) : new THREE.Box3().setFromObject(parts[id]);
    it = DEC.items[id] = { group: decorModel(id), prop: { model: id === 'wheat' ? 'wheat_field' : id, pos: [x, 0, z], deg, s: 1, decor: true, own: true }, d: { model: id, box } };
    scene.add(it.group); V.props.push(it.prop);
  }
  setDecorAt(it, x, z, deg);
  return it;
}
function setDecorAt(it, x, z, deg = 45) {
  const m = place(x, 0, z, deg, 1);
  it.group.matrix.copy(m); it.group.matrixWorldNeedsUpdate = true;
  it.prop.pos = [x, 0, z]; it.prop.deg = deg; Object.assign(it.d, { pos: [x, z], deg, m, wb: it.d.box.clone().applyMatrix4(m).expandByScalar(0.6) });
  BLOCKERS = null; decorSpots = null;
  renderer.shadowMap.needsUpdate = true; wake(500);
}
function dropDecor(id) {
  const it = DEC.items[id]; if (!it) return;
  it.group.removeFromParent();
  const i = V.props.indexOf(it.prop); if (i >= 0) V.props.splice(i, 1);
  const k = decorList.indexOf(it.d); if (k >= 0) decorList.splice(k, 1);
  delete DEC.items[id]; BLOCKERS = null; decorSpots = null;
}
// what's drawn as the save has it (the farm opening, and after each change): the duck house on the pond; the windmill's
// sails turning; the life round them all
function syncDecor() {
  if (!GAME_MODE || !game.data || !DECOR_INFO) return;
  for (const o of game.data.decor) {
    if (!parts[o.id]) continue;
    const at = DECOR[o.id].pond ? duckHouseSpot() : o.x === null ? null : [o.x, o.z];
    if (!at) continue;
    const it = addDecor(o.id, at[0], at[1]);
    if (!decorList.includes(it.d)) decorList.push(it.d);
  }
  const W = game.wheat();                                   // (the wheat field, as the save has it)
  if (W.x !== null && DECOR_INFO.foot.wheat && !(DMOVE.id === 'wheat')) { addDecor('wheat', W.x, W.z, W.deg); FIELD.shown = ''; tickWheat(); }
  const w = DEC.items.windmill; sails = w ? w.group.userData.sails || null : null;
  decorLifeAgain();
}
// the bees, butterflies, bath birds, glints and music: made again for the decorations there are (skip: one being moved)
function decorLifeAgain(skip = null) {
  if (DEC.lifeRoot) {
    DEC.lifeRoot.removeFromParent();
    DEC.lifeRoot.traverse(o => { if (o.geometry) o.geometry.dispose(); for (const m of [].concat(o.material || [])) { if (m.map) m.map.dispose(); m.dispose(); } });
    DEC.lifeRoot = null; decorLife = null;
  }
  const list = decorList.filter(d => d.model !== skip);
  if (!list.length || params.has('nolife')) return;
  DEC.lifeRoot = new THREE.Group(); scene.add(DEC.lifeRoot);
  decorLife = new DecorLife(DEC.lifeRoot, list, { grade: nightGrade, hour: () => DAY.hour, toCam: VIEW_DIR }, rng(91));
}
// the duck house bought: the ducks' house from tonight, its raft for whoever swims to keep clear of
function duckHouseOn() {
  const dh = DEC.items.duckhouse; if (!dh || !duckFlock || duckFlock.house) return;
  const hv = new THREE.Vector3(), hinv = dh.d.m.clone().invert();
  duckFlock.setHouse({ local: (x, z) => { hv.set(x, 0, z).applyMatrix4(hinv); return [hv.x, hv.z]; }, world: (lx, lz) => { hv.set(lx, 0, lz).applyMatrix4(dh.d.m); return [hv.x, hv.z]; } });
  if (GEESE_OPTS && GEESE_OPTS.avoid) GEESE_OPTS.avoid.push(...decorAvoid());
  duckFlock.places();
}
// ---- the shop, and a decoration's card
function shopSheet(tab = 'decor') {
  if (DMOVE.id || MOVE.plot) return;
  holdBird(null); henOff(); guideDid('shop');
  gameUI.shopSheet(shopHands(), tab);
}
function shopHands() { return { buy: id => buyDecor(id), move: id => { gameUI.close(); startDecor(id); }, outfits: true, buyOutfit: id => buyOutfit(id), wear: id => wearOutfit(id) }; }
// ---- the farmer's outfits (the shop's second shelf; farmer.js loadOutfit, wear): bought and put on at once, or another
// worn; the farm's farmer in it (each outfit's hat and bits loaded only when worn), and on show day too. Bought: the view
// to him (the player's tap), so it's seen
async function dressFarmer() {
  if (!GAME_MODE || !game.data) return;
  const id = game.outfitWorn();
  if (id !== 'classic') { try { await loadOutfit(id, loadGLB, loadJSON); } catch (e) { console.warn('outfit', id, e); return; } }
  if (game.outfitWorn() !== id) return;                    // (another chosen meanwhile)
  if (farmLife) farmLife.wear(id === 'classic' ? null : id);
  if (SHOWDAY && SHOWDAY.farmer) SHOWDAY.farmer.wear(id === 'classic' ? null : id);
  renderer.shadowMap.needsUpdate = true; wake(500);
}
async function buyOutfit(id) {
  const r = game.buyOutfit(id); if (!r) return false;
  gameUI.refresh(); gameUI.bumpCoins();
  await dressFarmer();
  gameUI.close();
  if (farmLife && !farmLife.home) { const p = farmLife.pos; focusOn(p.x + 0.2, p.z + 0.2, Math.min(view.size, sideways() ? 2.2 : 2.8)); }
  hint(game.t('out_bought', { farmer: game.farmerName(), name: game.outfitName(id), xp: r.xp }));
  return true;
}
async function wearOutfit(id) {
  if (!game.wearOutfit(id)) return false;
  await dressFarmer();
  gameUI.shopSheet(shopHands(), 'outfits');
  hint(game.t('out_worn', { farmer: game.farmerName(), name: game.outfitName(id) }));
  return true;
}
function decorCard(id) {
  holdBird(null); henOff();
  gameUI.decorCard(id, () => startDecor(id));
}
function buyDecor(id) {
  if (!game.decorNext(id) || game.data.coins < DECOR[id].price) return false;
  if (!DECOR[id].pond) { gameUI.close(); return startDecor(id); }
  const r = game.buyDecor(id, null); if (!r) return false;           // (the duck house: straight onto the pond)
  gameUI.close(); syncDecor(); duckHouseOn(); BLOCKERS = null; rebuildNav();
  gameUI.refresh(); gameUI.bumpCoins();
  const [x, z] = duckHouseSpot(); focusOn(x, z, Math.min(view.max, Math.max(view.size, 2.6)));      // (the player's tap: the view to it)
  hint(game.t('dec_placed', { name: game.decorName(id), xp: r.xp })); hintNext(game.t('dec_pond_hint'));
  return true;
}
// ---- placing one (bought, not yet paid for) or moving one: it, and its outline on the ground (green where it can go, red not)
let DFOOT_TEX = {};
function decorFootMark(id) {
  const f = DECOR_INFO.foot[id], M = 0.2, X0 = f[0] - M, X1 = f[2] + M, Z0 = f[1] - M, Z1 = f[3] + M, w = X1 - X0, h = Z1 - Z0;
  if (!DFOOT_TEX[id]) {
    const W = 256, H = Math.round(256 * h / w), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), px = x => (x - X0) / w * W, pz = z => (z - Z0) / h * H, R = DECOR_ROUND[id];
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.strokeStyle = '#fff'; c.lineWidth = 9; c.lineJoin = 'round';
    c.beginPath();
    if (R) c.ellipse(px(0), pz(0), R / w * W, R / h * H, 0, 0, Math.PI * 2);
    else c.roundRect(px(f[0]), pz(f[1]), px(f[2]) - px(f[0]), pz(f[3]) - pz(f[1]), 22);
    c.fill(); c.stroke();
    DFOOT_TEX[id] = new THREE.CanvasTexture(cv); DFOOT_TEX[id].colorSpace = THREE.SRGBColorSpace;
  }
  const mat = new THREE.MeshBasicMaterial({ map: DFOOT_TEX[id], color: FOOT_OK, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  mat.userData.noGrade = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), mat);
  m.position.set((X0 + X1) / 2, 0.025, (Z0 + Z1) / 2); m.renderOrder = 3; m.matrixAutoUpdate = false; m.updateMatrix();
  return m;
}
function startDecor(id) {
  const isW = id === 'wheat';                               // (the wheat field: moved the same way, and turned)
  if (DMOVE.id || MOVE.plot || inside.open || SHOWDAY || !DECOR_INFO || (isW ? !DECOR_INFO.foot.wheat || FIELD.work : !DECOR[id] || DECOR[id].pond || !parts[id])) return false;
  const own = isW ? game.wheat() : game.decorOwned(id);
  if (!own && (!game.decorNext(id) || game.data.coins < DECOR[id].price)) return false;
  gameUI.close(); holdBird(null); henOff(); tagBird = null; tag.classList.remove('on');
  let at = own && own.x !== null ? { x: own.x, z: own.z, deg: own.deg || 45 } : null;
  if (!at) { at = decorFreeNear(id, view.target.x, view.target.z, 40, true, isW ? [45, 135] : [45]); if (!at) { hint(game.t('dec_no_room')); return false; } }
  DMOVE.id = id; DMOVE.buy = !own; DMOVE.from = own && own.x !== null ? { ...at } : null; DMOVE.at = { ...at }; DMOVE.moved = false; DMOVE.nav = false;
  DMOVE.item = addDecor(id, at.x, at.z, at.deg);
  decorLifeAgain(id);                                       // (its bees and birds wait till it's down)
  DMOVE.foot = decorFootMark(id); DMOVE.item.group.add(DMOVE.foot);
  gameUI.moveBar(true, { turn: isW ? () => { DMOVE.moved = true; decMoveTo(DMOVE.at.x, DMOVE.at.z, true, DMOVE.at.deg === 45 ? 135 : 45); } : null, cancel: () => endDecor(false), place: () => putDecor() });
  decMoveTo(at.x, at.z, true, at.deg);
  const tall = DMOVE.item.d.box.max.y, size = Math.max(view.size, sideways() ? 3.4 : 4.4, Math.min(view.max, tall * 0.62)), v = viewAbove(at.x, at.z, size);
  focusOn(v[0], v[1], size);                                // (the player's tap: room round it in view, above the bar)
  return true;
}
function decMoveTo(x, z, force = false, deg = DMOVE.at ? DMOVE.at.deg || 45 : 45) {
  if (!DMOVE.id) return;
  x = Math.round(x * 4) / 4; z = Math.round(z * 4) / 4;
  if (!force && x === DMOVE.at.x && z === DMOVE.at.z && deg === DMOVE.at.deg) return;
  if (x !== DMOVE.at.x || z !== DMOVE.at.z) DMOVE.moved = true;
  DMOVE.at = { x, z, deg };
  setDecorAt(DMOVE.item, x, z, deg);
  const S = DMOVE.spot = decorSpot(DMOVE.id, x, z, deg);
  DMOVE.foot.material.color.set(S.ok ? FOOT_OK : FOOT_NO);
  gameUI.moveStatus(game.t(!DMOVE.moved ? 'dec_place_hint' : S.ok ? (S.clear.length ? 'dec_ok_clear' : 'dec_ok') : S.why), S.ok);
  DMOVE.grassAt = performance.now() + 220;
  wake(600);
}
// a finger down on it (its model, or its outline on the ground): it's carried along; a tap elsewhere: it goes there
function decorHit(cx, cy) {
  const it = DMOVE.item; if (!it) return false;
  ndc.set(cx / canvas.clientWidth * 2 - 1, -(cy / canvas.clientHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const loc = new THREE.Ray().copy(ray.ray).applyMatrix4(it.d.m.clone().invert());
  if (loc.intersectsBox(it.d.box)) return true;
  const g = groundAt(cx, cy); if (!g) return false;
  const [lx, lz] = inSpot(decSp(DMOVE.at.x, DMOVE.at.z, DMOVE.at.deg), g.x, g.z);
  return decGap(DMOVE.id, lx, lz) < 0.3;
}
function decGrab(e) {
  if (!decorHit(e.clientX, e.clientY)) return false;
  const g = groundAt(e.clientX, e.clientY); if (!g) return false;
  DMOVE.drag = { id: e.pointerId, dx: g.x - DMOVE.at.x, dz: g.z - DMOVE.at.z }; return true;
}
function decDrag(cx, cy) { const g = groundAt(cx, cy); if (g) decMoveTo(g.x - DMOVE.drag.dx, g.z - DMOVE.drag.dz); }
function decTap(cx, cy) {
  if (decorHit(cx, cy)) return;
  const g = groundAt(cx, cy); if (g) decMoveTo(g.x, g.z);
}
function tickDecMove(dt) {
  if (DMOVE.id && DMOVE.grassAt && !DMOVE.drag && performance.now() > DMOVE.grassAt) { DMOVE.grassAt = 0; DMOVE.grass = true; buildGrass(); wake(200); }
  const D = DMOVE.drag; if (!D) return;
  const p = pointers.get(D.id); if (!p) return;
  const W = canvas.clientWidth, H = canvas.clientHeight, bar = gameUI.moveTop(), E = 44;
  const ex = p.x < E ? -1 : p.x > W - E ? 1 : 0, ey = p.y < 70 ? -1 : p.y > Math.min(H, bar) - E ? 1 : 0;
  if (!ex && !ey) return;
  pan(-ex * 320 * dt, -ey * 320 * dt); decDrag(p.x, p.y); wake(300);
}
function putDecor() {
  const id = DMOVE.id; if (!id || !DMOVE.spot || !DMOVE.spot.ok) return false;
  const at = DMOVE.at, from = DMOVE.from;
  if (from && at.x === from.x && at.z === from.z && at.deg === from.deg) { endDecor(false); return true; }
  // the way to every coop's gate still open with it there, and what's in its way gone
  const clear = DMOVE.spot.clear, ids = new Set(clear.map(o => o.id)), keep = [V.trees, V.bushes, V.rocks];
  V.trees = V.trees.filter(o => !ids.has(o.id)); V.bushes = V.bushes.filter(o => !ids.has(o.id)); V.rocks = V.rocks.filter(o => !ids.has(o.id));
  rebuildNav(); DMOVE.nav = true;
  if (gamePlots().some(p => !penSpec(p))) {
    [V.trees, V.bushes, V.rocks] = keep;
    DMOVE.spot = { ok: false, why: 'dec_bad_way', clear: [] }; DMOVE.foot.material.color.set(FOOT_NO); gameUI.moveStatus(game.t('dec_bad_way'), false);
    return false;
  }
  let said;
  if (DMOVE.buy) {
    const r = game.buyDecor(id, at, [...ids]);
    if (!r) { [V.trees, V.bushes, V.rocks] = keep; endDecor(false); return false; }
    said = game.t('dec_placed', { name: game.decorName(id), xp: r.xp });
    gameUI.refresh(); gameUI.bumpCoins();
  } else if (id === 'wheat') { game.placeWheat(at, [...ids]); said = game.t('dec_moved', { name: game.t('wheat_title') }); }
  else { game.moveDecor(id, at, [...ids]); said = game.t('dec_moved', { name: game.decorName(id) }); }
  for (const o of clear) clearAway(o);
  endDecor(true);
  hint(said);
  return true;
}
function endDecor(placed) {
  const id = DMOVE.id; if (!id) return;
  const it = DMOVE.item;
  DMOVE.foot.removeFromParent(); DMOVE.foot.geometry.dispose(); DMOVE.foot.material.dispose();
  if (!placed && (DMOVE.buy || !DMOVE.from)) dropDecor(id);      // (not bought after all, or never placed: gone)
  else if (!placed) setDecorAt(it, DMOVE.from.x, DMOVE.from.z, DMOVE.from.deg);
  const nav = DMOVE.nav, grass = DMOVE.grass;
  Object.assign(DMOVE, { id: null, item: null, buy: false, from: null, at: null, spot: null, foot: null, drag: null, moved: false, nav: false, grassAt: 0, grass: false });
  BLOCKERS = null; decorSpots = null;
  if (placed) { if (!decorList.includes(it.d) && id !== 'wheat') decorList.push(it.d); buildNature(); buildGrass(); hidePebbles(); clearDecorWalkers(it); }
  else { if (nav) rebuildNav(); if (grass) buildGrass(); }
  syncDecor();
  gameUI.moveBar(false);
  renderer.shadowMap.needsUpdate = true; wake(1000);
}
// one put down where the farmer was walking: he steps out of its way, and thinks again about where he was off to
function clearDecorWalkers(it) {
  if (!farmLife || farmLife.home) return;
  const L = farmLife, at = L.pos, [lx, lz] = inSpot(decSp(it.d.pos[0], it.d.pos[1], it.d.deg), at.x, at.z);
  if (decGap(it.d.model, lx, lz) < 0.4 || !navGrid().freeAt(at.x, at.z)) {
    const f = navGrid().nearestIn(farmReach(), at.x, at.z, 5);
    if (f) { at.x = f[0]; at.z = f[1]; }
  }
  if (L.task && !/^(out|home|pen)$/.test(L.task.name)) L.task = null;
}
// ---- the wheat field and the honey (release 1 step 9e; Audrey, 25 Oct: the wheat field "On your land from the start";
// then "Bees are great idea, let’s make sure the farmer can harvest the honey and sell it !"). The field (game.js WHEAT)
// lies on your land from the start, a little way out from the farmhouse (moved like a decoration, and turned); its sign
// says what to do ("Sow", how long till it's ripe, "Harvest"). Tap it: its card (Sow, Move the field); a ripe field is
// harvested at once. Sowing and harvesting count straight away (the save); by day the farmer hurries over with the pail
// and scatters the seed, or crouches and cuts the wheat (golden bits, then the grain into store for the feeders), and the
// field shows it once he's done; at night (or out after Rusty) it simply is. The beehives fill a jar every 8 hours
// (game.js HONEY): a honey pot over them with the number; tap it: the farmer goes to the hives, lifts out a frame of
// honey, and the jars fly to the coins, sold
const FIELD = { shown: '', hold: null, work: null, bub: null, hbub: null, frame: null, frameOn: false, honey: false };
function showWheat(stage) {
  const it = DEC.items.wheat; if (!it) return;
  const P = it.group.userData.wheat, want = stage === 'sown' ? 'soil' : stage;
  if (FIELD.shown === want) return;
  FIELD.shown = want;
  for (const o of new Set(Object.values(P).flat())) o.visible = P[want].includes(o);
  renderer.shadowMap.needsUpdate = true; wake(300);
}
// each second (and after a change): the field as the save has it (or as it was, till the farmer's done)
function tickWheat() {
  if (!GAME_MODE || !game.data) return;
  showWheat(FIELD.hold || game.wheatStage());
  if (FIELD.work && performance.now() > FIELD.work.until) FIELD.work.seq.finish();      // (he never got there: it's done anyway)
}
// where the farmer stands to work at the field (the middle of its edge most towards the player, or near it, facing in)
// or at the hives (in front of them, facing them)
function workSpot(kind) {
  const it = kind === 'honey' ? DEC.items.beehives : DEC.items.wheat; if (!it) return null;
  const m = it.d.m, v = new THREE.Vector3(), c = new THREE.Vector3(), nav = navGrid(), R = farmReach();
  it.d.box.getCenter(c).applyMatrix4(m); c.y = 0;
  const pts = kind === 'honey' ? [[0, 1.55], [-0.6, 1.55], [0.6, 1.55], [0, 1.9]] : [[0, 1.6], [1.3, 1.6], [-1.3, 1.6], [0, -1.6], [2.6, 0], [-2.6, 0]];
  let best = null, bs = -Infinity;
  for (const [lx, lz] of pts) {
    v.set(lx, 0, lz).applyMatrix4(m);
    const f = nav.nearestIn(R, v.x, v.z, 0.7); if (!f) continue;
    const sc = (f[0] - c.x) * VIEW_DIR.x + (f[1] - c.z) * VIEW_DIR.z - 0.6 * Math.hypot(f[0] - v.x, f[1] - v.z);
    if (sc > bs) { bs = sc; best = f; }
    if (kind === 'honey') break;                            // (in front of the hives if he can be)
  }
  return best && { at: best, face: Math.atan2(c.x - best[0], c.z - best[1]) };
}
// sowing, harvesting, honey: the farmer's work there (false: he isn't about, it's simply done)
function farmerWork(kind, done) {
  if (!farmLife || farmLife.home || farmLife.running || FIELD.work || farmLife.pending) return false;      // (busy with another: it's simply done)
  const S = workSpot(kind); if (!S) return false;
  let acts, o = {};
  if (kind === 'sow') {                                      // four handfuls of seed over the field
    let thrown = 0; o = { pail: true, say: 'sow' };
    acts = [['scatter', 3.9, (W, u, L) => { W.pose = 'feed'; W.face = 'feeding'; W.scatter = u; const k = Math.floor(u * 1.1 + 0.45); if (k > thrown && thrown < 4) { thrown = k; seedThrow(L.handTip(), L.heading, thrown); } }], 'done'];
  } else if (kind === 'harvest') {                           // crouched, cutting, the straw flying; then hooray
    let bit = 0.3;
    acts = [['cut', 3.0, (W, u, L) => { W.pose = 'pet'; W.face = 'happy'; W.patting = true; W.look = [0, -0.4]; if (u > bit) { bit += 0.35; strawBits(L.handTip(), 5); } }], 'done',
      ['hooray', 1.4, W => { W.pose = 'stretch'; W.face = 'happy'; }]];
    o = { say: 'harvest' };
  } else {                                                   // a frame of honey lifted out, held up to look at, the jars
    acts = [['bend', 1.1, (W, u) => { W.pose = 'scoop'; W.face = 'happy'; W.look = [0, -0.5]; FIELD.frameOn = u > 0.8; }],
      ['up', 0.5, W => { W.pose = 'hold'; W.face = 'happy'; FIELD.frameOn = true; }], 'camera',          // (turned round to show it)
      ['show', 2.2, W => { W.pose = 'hold'; W.face = 'happy'; W.look = [0, -0.3]; FIELD.frameOn = true; }],
      'done', ['away', 0.4, W => { W.pose = 'turn'; W.face = 'happy'; FIELD.frameOn = false; }]];
    o = { say: 'honey' };
  }
  const seq = farmLife.workAt(S.at, S.face, acts, () => { FIELD.frameOn = false; if (FIELD.work && FIELD.work.seq === seq) FIELD.work = null; done(); }, o);
  if (!seq) return false;
  FIELD.work = { kind, seq, until: performance.now() + 100e3 };
  return true;
}
// the field tapped (or its sign): ripe, harvested; otherwise its card
function wheatTap() {
  if (FIELD.work && FIELD.work.kind !== 'honey') { hint(game.t(FIELD.work.kind === 'sow' ? 'wheat_sowing' : 'wheat_cutting', { farmer: farmerName(), c: WHEAT.sow })); return; }
  if (game.wheatStage() === 'ripe') { harvestWheat(); return; }
  holdBird(null); henOff();
  gameUI.wheatSheet({ sow: () => sowWheat(), harvest: () => harvestWheat(), move: () => { gameUI.close(); startDecor('wheat'); } });
}
function sowWheat() {
  if (FIELD.work && FIELD.work.kind !== 'honey') return false;
  const r = game.sowWheat(); if (!r) return false;
  if (r.broke) { hint(game.t('wheat_broke')); return false; }
  gameUI.close(); gameUI.refresh(); gameUI.bumpCoins();
  FIELD.hold = 'soil';
  const done = () => { FIELD.hold = null; tickWheat(); };
  if (farmerWork('sow', done)) hint(game.t('wheat_sowing', { farmer: farmerName(), c: r.cost }));
  else { done(); seedsOver(); hint(game.t('wheat_sowed', { c: r.cost })); }
  guideDid('sow');
  tickWheat();
  return true;
}
function harvestWheat() {
  if (FIELD.work && FIELD.work.kind !== 'honey') return false;
  const r = game.harvestWheat(); if (!r) return false;
  gameUI.close(); gameUI.refresh();
  FIELD.hold = 'ripe';
  const said = game.t(r.grain ? 'wheat_done' : 'wheat_full', { g: r.grain, xp: r.xp });
  const done = () => { FIELD.hold = null; tickWheat(); harvestPuff(); hint(said); gameUI.refresh(); };
  if (farmerWork('harvest', done)) hint(game.t('wheat_cutting', { farmer: farmerName() }));
  else done();
  tickWheat();
  return true;
}
// the honey pot (or the hives) tapped: the jars sold, flying to the coins once the farmer has them
function honeyTap() {
  if (FIELD.honey) return false;
  const r = game.collectHoney(); if (!r) { decorCard('beehives'); return false; }
  const fly = () => {
    FIELD.honey = false;
    const it = DEC.items.beehives, v = new THREE.Vector3(); it.d.box.getCenter(v); v.y = it.d.box.max.y; v.applyMatrix4(it.d.m); v.project(camera);
    gameUI.flyEggs({ x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight }, r.n, null, null, 'gjar');
    hint(game.t(r.n === 1 ? 'honey_sold1' : 'honey_sold', { n: r.n, c: r.coins }));
  };
  FIELD.honey = true;
  if (farmerWork('honey', fly)) hint(game.t('honey_going', { farmer: farmerName() }));
  else fly();
  return true;
}
// little bits flying: seed from his hand onto the field, straw as he cuts, a golden puff over the field when it's done
const BITS = [];
let BIT_TEX = null;
function bitsAt(at, n, colour, o = {}) {
  if (!BIT_TEX) BIT_TEX = fxTexture64(64, c => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.fill(); });
  const R = Math.random;
  for (let i = 0; i < n; i++) {
    const mat = new THREE.SpriteMaterial({ map: BIT_TEX, color: colour, transparent: true, depthWrite: false }); mat.userData.noGrade = true;
    const sp = new THREE.Sprite(mat), a = (o.dir ?? R() * Math.PI * 2) + (R() - 0.5) * (o.spread ?? 6.3), v = (o.speed || 1) * (0.5 + R() * 0.7);
    sp.position.copy(at); sp.scale.setScalar(o.size || 0.03); scene.add(sp);
    BITS.push({ sp, v: new THREE.Vector3(Math.sin(a) * v, (o.up ?? 1.2) * (0.6 + R() * 0.6), Math.cos(a) * v), t: 0, life: o.life || 1.1, g: o.g ?? 6, floor: o.floor ?? 0.02, size: o.size || 0.03, grow: o.grow || 0 });
  }
  wake(1500);
}
function tickBits(dt) {
  for (let i = BITS.length - 1; i >= 0; i--) {
    const B = BITS[i]; B.t += dt;
    B.v.y -= B.g * dt; B.sp.position.addScaledVector(B.v, dt);
    if (B.sp.position.y < B.floor) { B.sp.position.y = B.floor; B.v.set(0, 0, 0); }
    B.sp.scale.setScalar(B.size * (1 + B.grow * B.t));
    B.sp.material.opacity = Math.min(1, (B.life - B.t) * 3);
    if (B.t >= B.life) { B.sp.removeFromParent(); B.sp.material.dispose(); BITS.splice(i, 1); }
  }
  if (BITS.length) wake(100);
}
function seedThrow(hand, heading, k) { bitsAt(hand, 14, '#d9c08a', { dir: heading + (k - 2.5) * 0.35, spread: 0.9, speed: 1.6, up: 0.9, life: 1.3, size: 0.022 }); }
function seedsOver() {                                       // (sown with nobody there to see: the seed just lands)
  const it = DEC.items.wheat; if (!it) return;
  const v = new THREE.Vector3();
  for (let i = 0; i < 6; i++) { v.set((Math.random() - 0.5) * 3.6, 0.6, (Math.random() - 0.5) * 1.8).applyMatrix4(it.d.m); bitsAt(v, 6, '#d9c08a', { speed: 0.4, up: 0.3, life: 1, size: 0.022 }); }
}
function strawBits(hand, n) { bitsAt(hand, n, '#e7bf55', { speed: 0.7, up: 1.6, life: 0.9, size: 0.035, g: 5 }); }
function harvestPuff() {
  const it = DEC.items.wheat; if (!it) return;
  const v = new THREE.Vector3();
  for (let i = 0; i < 10; i++) { v.set((Math.random() - 0.5) * 4, 0.35, (Math.random() - 0.5) * 2).applyMatrix4(it.d.m); bitsAt(v, 3, '#f2d27a', { speed: 0.5, up: 1.4, life: 1.2, size: 0.12, g: 1.5, grow: 0.8 }); }
}
// the frame of honey in his hands (between them, as he holds it up)
function tickHoneyFrame() {
  if (!FIELD.frameOn || !farmLife || !farmLife.f.rig) { if (FIELD.frame) FIELD.frame.visible = false; return; }
  if (!FIELD.frame) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;                 // (the comb: golden cells, a few capped)
    const cx = cv.getContext('2d'); cx.fillStyle = '#e39a1c'; cx.fillRect(0, 0, 128, 96);
    for (let r = 0; r < 9; r++) for (let q = 0; q < 12; q++) {
      const x = q * 11 + (r % 2) * 5.5 + 3, y = r * 10.5 + 4; cx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; cx.lineTo(x + Math.cos(a) * 5.4, y + Math.sin(a) * 5.4); }
      cx.closePath(); cx.fillStyle = (q * 7 + r * 3) % 5 === 0 ? '#f6d48a' : '#f2b13a'; cx.fill(); cx.strokeStyle = '#b8740f'; cx.lineWidth = 1.2; cx.stroke();
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ color: '#c8a26a' }), comb = new THREE.MeshLambertMaterial({ map: tex, emissive: '#3a2000' });
    const add = (w, h, d, x, y, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, 0); m.castShadow = true; g.add(m); };
    add(0.25, 0.018, 0.03, 0, 0.09, wood); add(0.25, 0.012, 0.025, 0, -0.085, wood); add(0.014, 0.18, 0.025, -0.118, 0, wood); add(0.014, 0.18, 0.025, 0.118, 0, wood);
    add(0.222, 0.16, 0.016, 0, 0, comb);
    for (const m of [wood, comb]) nightGrade(m);
    scene.add(g); FIELD.frame = g;
  }
  const B = farmLife.f.rig.B, a = B.wristL.getWorldPosition(new THREE.Vector3()), b = B.wristR.getWorldPosition(new THREE.Vector3()), h = farmLife.heading;
  FIELD.frame.position.copy(a).add(b).multiplyScalar(0.5).add(new THREE.Vector3(Math.sin(h) * 0.07, 0.07, Math.cos(h) * 0.07));
  FIELD.frame.rotation.set(-0.85, h, 0, 'YXZ'); FIELD.frame.visible = true;          // (tipped back: its comb shows)
}
// the field's sign and the honey pot: placed each frame (game bubbles), their words when they change
function fieldBubbles(w, h) {
  const mk = (cls, onTap) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'gbub ' + cls; e.hidden = true; e.addEventListener('click', ev => { ev.stopPropagation(); onTap(); }); document.body.append(e); return e; };
  if (!FIELD.bub) FIELD.bub = mk('gwheat', () => wheatTap());
  if (!FIELD.hbub) FIELD.hbub = mk('ghoney', () => honeyTap());
  const put = (e, show, v) => {
    if (!show || inside.open || SHOWDAY) { e.hidden = true; return; }
    v.project(camera);
    const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * h;
    if (v.z > 1 || sx < -40 || sx > w + 40 || sy < 20 || sy > h + 40) { e.hidden = true; return; }
    e.hidden = false; e.style.left = sx.toFixed(1) + 'px'; e.style.top = sy.toFixed(1) + 'px';
  };
  const W = DEC.items.wheat, st = game.wheatStage(), busy = FIELD.work && FIELD.work.kind !== 'honey';
  if (W && !busy && DMOVE.id !== 'wheat') {
    const txt = st === 'soil' ? '🌾 ' + game.t('bub_sow') : st === 'ripe' ? '🌾 ' + game.t('bub_harvest') : '🌱 ' + gameUI.dur(game.wheatLeft());
    if (FIELD.bub.textContent !== txt) { FIELD.bub.textContent = txt; FIELD.bub.classList.toggle('ripe', st === 'ripe'); }
    put(FIELD.bub, true, bubV.set(0, 0.5, 1.0).applyMatrix4(W.d.m));
  } else FIELD.bub.hidden = true;
  const Hv = DEC.items.beehives, n = Hv && !FIELD.honey && DMOVE.id !== 'beehives' ? game.honeyAt() : 0;
  if (n) {
    const txt = '🍯 ' + n; if (FIELD.hbub.textContent !== txt) FIELD.hbub.textContent = txt;
    Hv.d.box.getCenter(bubV); bubV.y = Hv.d.box.max.y + 0.05; put(FIELD.hbub, true, bubV.applyMatrix4(Hv.d.m));
  } else FIELD.hbub.hidden = true;
}
// ---- the first day (release 1 step 10; Audrey: "Scenes from the 3D farm"): on a new farm, four pictures first (gameui
// introCards: your forever flock, eggs and chicks, land and new breeds, shows and honey), then a guide: a little card
// under the top bar ("First day · 1 of 5") saying what to do, and a bouncing arrow over where to tap: collect the first egg,
// cuddle a hen (then ♥ Cuddle in her card), sow the wheat field (its sign, then Sow), Today's jobs, the shop. Each done:
// a few coins ("Well done! +10 coins"), the last a bonus. Something off screen: "Show me" brings the view there (the
// player's tap; the view never moves by itself). Skip: no more guide. Hidden while a card's open (unless the arrow points
// into it), while something's being moved, inside a coop, on show day
const GUIDE_UI = { card: null, n: null, text: null, show: null, arrow: null, on: false, intro: false, k: '' };
const GUIDE_OFF = params.has('q') && !params.has('firstday');      // (the automated tests' pages: none, unless asked for)
function guideEls() {
  if (GUIDE_UI.card) return GUIDE_UI;
  const G = GUIDE_UI, mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; return e; };
  G.card = mk('section', 'gguide'); G.card.hidden = true;
  G.n = mk('div', 'gguide-n'); G.text = mk('p', 'gguide-t');
  const row = mk('div', 'gguide-row'); G.show = mk('button', 'gguide-show'); G.show.type = 'button';
  const skip = mk('button', 'gguide-skip'); skip.type = 'button';
  G.show.addEventListener('click', () => { const T = guideTarget(game.guideStep()); if (T && T.world) focusOn(T.world.x, T.world.z, Math.min(view.size, sideways() ? 2.6 : 3.2)); });
  skip.addEventListener('click', () => { game.guideSkip(); G.on = false; G.card.hidden = true; G.arrow.hidden = true; });
  row.append(G.show, skip); G.card.append(G.n, G.text, row); document.body.append(G.card);
  G.arrow = mk('div', 'garrow'); G.arrow.hidden = true;
  G.arrow.innerHTML = '<svg viewBox="0 0 34 40"><path d="M10 2h14v18h8L17 38 2 20h8z" fill="#f2c94c" stroke="#7a5200" stroke-width="2.4" stroke-linejoin="round"/></svg>';
  document.body.append(G.arrow);
  G.skipEl = skip;
  return G;
}
// where to tap for a step: a thing on screen (el), or a place on the farm (world), and what the card says
function guideTarget(k) {
  if (!k) return null;
  const sheetEl = sel => gameUI.isOpen ? document.querySelector('.gsheet ' + sel) : null, plot = gamePlots()[0], v = new THREE.Vector3();
  if (k === 'eggs') {
    const B = plot && bubbleFor(plot);
    if (B && plot.gc.eggs > 0) { const G = nestOf(plot); v.set(G.win[0], G.win[2] + 0.1, 0.52); plot.frame.localToWorld(v); return { el: B.eggs.hidden ? null : B.eggs, world: v, say: 'guide_eggs' }; }
    if (plot) { const G = nestOf(plot); v.set(G.seat[0], G.win[2], 0.5); plot.frame.localToWorld(v); }
    return { world: plot ? v : null, say: 'guide_eggs_wait', none: true };
  }
  if (k === 'cuddle') {
    if (gameUI.kind === 'bird') { const e = sheetEl('.gcuddle'); return { el: e, say: 'guide_cuddle_card', inSheet: true }; }
    const hen = plot && plot.birds.find(b => b.kind === 'hen' && b.root.visible && !b.asleep);
    if (hen) { hen.root.getWorldPosition(v); v.y += hen.hitY + 0.35; }
    return { world: hen ? v : null, say: 'guide_cuddle' };
  }
  if (k === 'sow') {
    if (gameUI.kind === 'wheat') return { el: sheetEl('.gbtn'), say: 'guide_sow_card', inSheet: true };
    const W = DEC.items.wheat; if (W) v.set(0, 0.5, 1.0).applyMatrix4(W.d.m);
    return { el: FIELD.bub && !FIELD.bub.hidden ? FIELD.bub : null, world: W ? v : null, say: 'guide_sow' };
  }
  if (k === 'jobs') return { el: document.querySelector('.gbar .gjobs'), say: 'guide_jobs' };
  if (k === 'shop') return { el: document.querySelector('.gbar .gpill:not(.glvl)'), say: 'guide_shop' };
  return null;
}
// each frame: the card and the arrow
function tickGuide() {
  if (!GAME_MODE || !game.data) return;
  const G = guideEls(), k = game.guideStep();
  const off = () => { G.card.hidden = true; G.arrow.hidden = true; };
  if (!k || !G.on || inside.open || MOVE.plot || DMOVE.id || SHOWDAY || gameUI.kind === 'intro' || (replay && replay.on)) { off(); return; }
  const T = guideTarget(k);
  if (!T) { off(); return; }
  const sheetOpen = gameUI.isOpen;
  if (sheetOpen && !T.inSheet) { off(); return; }
  // the card: its words, Show me when the place is off screen
  let sx = 0, sy = 0, onScreen = false;
  if (T.el) { const r = T.el.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top; onScreen = r.width > 0 && r.bottom > 0 && r.top < innerHeight; }
  else if (T.world) { bubV.copy(T.world).project(camera); sx = (bubV.x + 1) / 2 * canvas.clientWidth; sy = (1 - bubV.y) / 2 * canvas.clientHeight; onScreen = bubV.z < 1 && sx > 20 && sx < canvas.clientWidth - 20 && sy > 60 && sy < canvas.clientHeight - 20; }
  const idx = GUIDE.indexOf(k) + 1, nTxt = game.t('guide_n', { n: idx, of: GUIDE.length }), txt = game.t(T.say);
  if (G.k !== k + T.say) { G.k = k + T.say; G.n.textContent = nTxt; G.text.textContent = txt; G.show.textContent = game.t('guide_show'); G.skipEl.textContent = game.t('guide_skip'); }
  G.card.hidden = sheetOpen;
  G.show.hidden = onScreen || !T.world;
  // the arrow: over the place to tap, bouncing
  if (onScreen && !T.none) { G.arrow.hidden = false; G.arrow.style.left = sx.toFixed(1) + 'px'; G.arrow.style.top = (sy - 2).toFixed(1) + 'px'; }
  else G.arrow.hidden = true;
}
// a step done (k): its coins, the word after what was said; the last: the bonus
function guideDid(k) {
  if (GUIDE_OFF) return;
  const r = game.guideDid(k); if (!r) return;
  gameUI.refresh(); gameUI.bumpCoins();
  hintNext(game.t(r.done ? 'guide_done' : 'guide_did', { c: r.coins }));
  GUIDE_UI.k = '';
}
// the first day starts: the pictures (a new farm), then the guide
function startFirstDay(isNew) {
  if (!GAME_MODE || !game.data || !game.guideStep() || GUIDE_OFF) return;
  if (isNew) { GUIDE_UI.intro = true; holdBird(null); gameUI.introCards(() => {}); }
  else GUIDE_UI.on = true;
}
let saleBub = null;
function saleBubble() {
  if (saleBub) return saleBub;
  saleBub = document.createElement('button'); saleBub.type = 'button'; saleBub.className = 'gbub gsale'; saleBub.hidden = true;
  saleBub.addEventListener('click', ev => { ev.stopPropagation(); landCard(); });
  document.body.append(saleBub); return saleBub;
}
// a feeder's card, and filling it: the save at once, the farmer bringing the feed (by day, out and about) or straight in
function feederCard(plot) {
  if (!plot.gc) return;
  holdBird(null);
  gameUI.feederSheet(plot.gc, () => fillFeeder(plot));
}
function fillFeeder(plot) {
  const c = plot.gc, before = game.feedLeft(c), q = game.fillFeeder(c.id);
  if (!q || q.full || q.broke) return null;
  gameUI.close(); gameUI.refresh(); jobsDone(q.done);
  const P = farmLife && !farmLife.home && !farmLife.running ? penSpec(plot) : null;
  if (P) {
    P.fill = u => { plot.pourUntil = performance.now() + 4000; setFeed(plot, before + (q.level - before) * Math.max(0, Math.min(1, u))); };
    const leave = P.leave; P.leave = () => { leave(); plot.pourUntil = 0; };
    if (farmLife.visitPen(P, 'fill', null)) {
      plot.pourUntil = performance.now() + 90e3;                          // (the grain stays as it was until he pours)
      hint(game.t(q.scraps ? 'farmer_scraps' : 'farmer_feed', { farmer: farmerName(), c: q.cost }));
      bubbleText(Date.now(), plot); wake(1000);
      return q;
    }
  }
  setFeed(plot, q.level); bubbleText(Date.now(), plot);
  hint(game.t(q.scraps ? 'filled_scraps' : 'filled', { c: q.cost }));
  return q;
}
let focus = null;
function focusOn(x, z, size) { focus = { fx: view.target.x, fz: view.target.z, tx: x, tz: z, s0: view.size, s1: size, t: 0 }; wake(1000); }
function tickFocus(dt) {
  if (!focus) return;
  if (pointers.size) { focus = null; return; }                 // (a finger on the farm: it's theirs)
  focus.t = Math.min(1, focus.t + dt / 0.65); const u = focus.t * focus.t * (3 - 2 * focus.t);
  view.target.set(focus.fx + (focus.tx - focus.fx) * u, 0, focus.fz + (focus.tz - focus.fz) * u); view.size = focus.s0 + (focus.s1 - focus.s0) * u;
  clampView(); applyGrass(); placeCamera(); furDetail(); wake(200);
  if (focus.t >= 1) focus = null;
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

// the village's own words (the coop doors, inside a coop at night), in English and French
const VT = {
  door_open: ['Door open', 'Porte ouverte'], door_morning: ['Good morning! Door open', 'Bonjour ! Porte ouverte'],
  door_day: ['The door stays open in the daytime', 'La porte reste ouverte la journée'],
  door_notyet: ['Not everyone’s in yet: {who}', 'Tout le monde n’est pas rentré : {who}'], door_shut: ['Door shut. Sleep well!', 'Porte fermée. Dormez bien !'],
  out1: ['{a} is still out', '{a} est encore dehors'], out2: ['{a} and {b} are still out', '{a} et {b} sont encore dehors'],
  outn: ['{a}, {b} and {n} more are still out', '{a}, {b} et {n} autres sont encore dehors'],
  inside1: ['Inside the {coop} · 1 asleep', '{coop} · 1 endormi'], insiden: ['Inside the {coop} · {n} asleep', '{coop} · {n} endormis'],
  inside_drag: ['Drag sideways to look around the coop', 'Glissez sur le côté pour regarder le poulailler'],
  inside_morning: ['Morning! Tap the pop door to let them out.', 'C’est le matin ! Touchez la trappe pour les faire sortir.'],
  inside_up: ['Good morning! Everyone is getting up.', 'Bonjour ! Tout le monde se lève.'],
  sleepy: ['sleepy', 'zzz'], no_eggs_here: ['No eggs here', 'Pas d’œufs ici'], eggs1: ['Collected 1 egg', '1 œuf ramassé'], eggsn: ['Collected {n} eggs', '{n} œufs ramassés'],
};
const vt = (k, v = {}) => VT[k][LANG === 'fr' ? 1 : 0].replace(/\{(\w+)\}/g, (m, x) => (v[x] !== undefined ? v[x] : m));
const hintEl = document.getElementById('hint');
let hintLeft = 0;
const HINT_NEXT = [];                                    // (words to say once the one showing has had its time: a job done)
function hint(t) { hintEl.textContent = t; hintEl.classList.add('on'); hintLeft = 4.5; }      // (a new one gets its full time; it goes with the farm's own time)
function hintNext(t) { if (hintLeft > 0) HINT_NEXT.push(t); else hint(t); }
function tickHint(dt) { if (hintLeft > 0 && (hintLeft -= dt) <= 0) { if (HINT_NEXT.length) hint(HINT_NEXT.shift()); else hintEl.classList.remove('on'); } }
// jobs just done (game.js job): said after what was done, the clipboard's number up
function jobsDone(done) { if (!done || !done.length) return; for (const j of done) hintNext(game.t('job_done', { job: game.jobText(j) })); gameUI.refresh(); }

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
const inForNight = b => b.asleep || !!(b.laying && b.laying.broody && b.laying.inside);       // (a hen sitting on her eggs is in)
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
    const broody = plot.birds.find(b => b.laying && b.laying.broody && b.laying.inside);
    if (broody && R.nests && R.nests.length) { const nb = R.nests[0]; spots.push([broody, nb[0], nb[1] + 0.03, nb[2] - 0.02, true]); }
    for (const [b, x, y, z, awake] of spots) {
      inside.saved.push({ b, parent: b.root.parent, pos: b.root.position.clone(), rot: b.root.rotation.y });
      inside.group.add(b.root); b.root.position.set(x, y, z); b.root.rotation.y = (b.kind === 'chick' ? 0.4 * (b.r() - 0.5) : 0);
      b.root.visible = true; b.rig.indoor(null); b.rig.sleepy(true); b.woken = 0;
      const A = b.A; A.walk = 0; A.peck = 0; A.flap = 0; A.crow = 0; A.kick = 0; A.ruffle = 0; A.turn = 0; A.sing = 0; A.cluck = 0; A.kawk = 0;
      A.proud = 0; A.duck = 0; A.stretch = 0; A.hopT = -1; A.sit = 1; A.brood = 1; A.sleep = awake ? 0 : 1; A.lookYaw = 0; A.lookTilt = 0;
      if (awake) b.rig.sleepy(false);
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
    insideEls.title.textContent = vt(sleepers.length === 1 ? 'inside1' : 'insiden', { coop: GAME_MODE && plot.gc ? game.coopName(plot.gc) : STYLE_NAMES[style], n: sleepers.length });
    insideEls.top.hidden = false; insideEls.back.hidden = false; document.body.classList.add('inside');
    applyDaylight(clockHour());
    insideEls.fade.classList.remove('on'); wake(800);
    if (inside.panMax > 0.05 && !inside.hinted) { inside.hinted = true; hint(vt('inside_drag')); }
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
    if (doorOpen(inside.plot)) { closeInside(vt('inside_up')); return; }
    if (!inside.morning) { inside.morning = true; hint(vt('inside_morning')); }
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
    tagBird = best; tagLeft = 2.6; tag.textContent = best.label + ' · ' + vt('sleepy'); tag.classList.add('on');
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
    if (GAME_MODE && inside.plot.gc) {
      const r = game.collect(inside.plot.gc.id);
      tag.textContent = r ? game.t(r.n === 1 ? 'eggs_sold1' : 'eggs_sold', { n: r.n, c: r.coins }) : game.t('no_eggs');
      if (r) { gameUI.refresh(); gameUI.bumpCoins(); jobsDone(r.done); }
    } else tag.textContent = n.count ? (n.count === 1 ? vt('eggs1') : vt('eggsn', { n: n.count })) : vt('no_eggs_here');
    n.count = 0; if (inside.eggs) inside.eggs.count = 0;
    tagBird = null; tagSpot.set(nb[0], nb[1] + 0.3, nb[2]); tag.classList.add('on'); fieldTag = 2.4;
    return;
  }
}

// ------------------------------------------------------------------ the loop: 30 frames a second when idle, 60 while touched
// ------------------------------------------------------------------ the morning replay of last night's fox visit (replay.js)
// Audrey (23 Oct): an old silent film, from a "Last night" button in the morning. In the game it shows the morning after a
// night with a visit; this test page offers one every morning (6:00-12:00) until it's been watched that day: last night's
// visit if this page saw one, otherwise the one Rusty would have made (a coop left open if there is one, as he picks).
// ?replay shows the button at any hour (?replay=N: coop N; &shut: its door was shut). The cast (Rusty, the geese, Biscuit)
// is the farm's own kind, built the first time; ?nodog, ?nogeese or ?noguard leave them out as on the farm.
let replay = null, replayCast = null, beastJoints = null, FOX_OBSTACLES = [], GEESE_OPTS = null, lastNight = null, replaySaved = null;
const replayBtn = document.getElementById('replaybtn');
const REPLAY_KEY = 'ff3d.replaySeen';               // the day it was last watched, "YYYY-MM-DD" (checked when read)
function dayKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
let seenCheck = { at: -1e9, v: false };
function replaySeenToday() {                       // (read again every few seconds at most)
  const now = performance.now(); if (now - seenCheck.at < 5000) return seenCheck.v;
  seenCheck = { at: now, v: readSeen() }; return seenCheck.v;
}
function readSeen() { try { const v = localStorage.getItem(REPLAY_KEY); return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && v === dayKey(); } catch (e) { return false; } }
function heroHen(p) {                              // the hen who sees him off: the Brave if the coop has her, else the Rebel, else the first
  const hens = p.birds.filter(b => b.kind === 'hen');
  const h = hens.find(b => b.pers === 'brave') || hens.find(b => b.pers === 'rebel') || hens[0] || p.birds[0];
  return h ? h.name : '';
}
function replayRecord() {
  const coops = plots.filter(p => p.kind === 'coop' && p.birds.length), want = params.get('replay');
  const forced = want && /^\d{1,2}$/.test(want) ? coops.find(p => p.index === +want) : null;
  if (lastNight && !forced) return lastNight;
  if (!coops.length) return null;
  const d = new Date(), r = rng(d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate());
  let p = forced;
  if (!p) {                                         // as Rusty picks: a coop left open first, the nearer the den the likelier
    const open = coops.filter(doorOpen), pool = open.length ? open : coops;
    const w = pool.map(c => 1 / Math.max(3, Math.hypot(c.centre.x - FOX_DEN[0], c.centre.z - FOX_DEN[1])) ** 2);
    let x = r() * w.reduce((a, b) => a + b, 0); p = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) { p = pool[i]; break; } }
  }
  return { coop: p.index, open: params.has('shut') ? false : doorOpen(p), hour: (23.1 + r() * 3.2) % 24, hen: heroHen(p) };
}
function buildReplayCast() {
  const has = k => !params.has('noguard') && !params.has(k);
  const fam = new FoxFamily(scene, { den: FOX_DEN, field: FOX_FIELD, joints: beastJoints, obstacles: FOX_OBSTACLES, only: 'dad', firstIn: 1e9 }, rng(71));
  const fh = V.props.find(p => p.model === 'farmhouse'), house = fh ? [fh.pos[0], fh.pos[2]] : [V.house[0], V.house[2]];
  const visit = new NightVisit({
    scene, fam, nav: navGrid(), coops: () => plots.filter(p => p.kind === 'coop'), doorOpen, nestOf, D2, house,
    grade: nightGrade, text: VISIT_TEXT, lang: LANG, r: rng(43), penObstacles: PEN.obstacles, groundY,
    toCamera: (x, z) => Math.atan2(camera.position.x - x, camera.position.z - z),
    firstIn: Infinity, again: () => Infinity,
    say(text, at, secs) { tag.textContent = text; tagBird = null; tagSpot.copy(at); tag.classList.add('on'); fieldTag = secs; },
    hint: () => {},                                 // (the film has its own cards)
  });
  visit.dogName = () => dogName;
  const c = { fam, visit, geese: null, dog: null };
  if (geeseFlock && GEESE_OPTS && has('nogeese')) c.geese = new GeeseFlock(scene, Object.assign({}, GEESE_OPTS, { watch: () => visit, dog: () => c.dog ? c.dog.dog : null, wakeOn: () => replay.alarm }), rng(58));
  if (farmDog && has('nodog')) {
    c.dog = new FarmDog(scene, { joints: beastJoints, name: dogName, kennel: KENNEL_AT, nav: navGrid(), groundY, spots: farmSpots, geese: () => c.geese,
      foxes: () => fam, toCamera: (x, z) => Math.atan2(camera.position.x - x, camera.position.z - z), visit: () => visit, den: FOX_DEN, wakeOn: () => replay.dogAlarm }, rng(62));
  }
  for (const g of [fam.group, c.geese && c.geese.group, c.dog && c.dog.group]) if (g) { g.traverse(o => { if (o.material) for (const m of [].concat(o.material)) nightGrade(m); }); g.visible = false; }
  return c;
}
// the farm's own hidden and paused for the film (the night's light, the visited coop's door as it was), or all put back
function replayLive(on, rec) {
  const castGroups = c => [c.fam.group, c.geese && c.geese.group, c.dog && c.dog.group].filter(Boolean);
  if (on) {
    replaySaved = { target: view.target.clone(), size: view.size, override: DAY.override, birds: [], doors: [] };
    for (const p of plots) for (const b of p.birds) { replaySaved.birds.push([b, b.root.visible]); b.root.visible = false; placeBlob(b); }
    for (const p of plots) if (p.door) replaySaved.doors.push([p, p.door.s, p.door.goal, p.door.shut]);
    const t = plots.find(p => p.index === rec.coop);
    if (t && t.door) { t.door.s = t.door.goal = rec.open ? 1 : 0; t.door.shut = !rec.open; }
    for (const g of [foxes && foxes.group, geeseFlock && geeseFlock.group, farmDog && farmDog.group, frogPond && frogPond.group, duckFlock && duckFlock.group, farmLife && farmLife.group]) if (g) g.visible = false;
    for (const g of castGroups(replayCast)) g.visible = true;
    if (nightVisit) nightVisit.fx.list.forEach(s => { s.sp.visible = false; });
    for (const n of NOTES) { n.life = 0; n.sprite.visible = false; }                 // (a song's notes from this morning)
    tag.classList.remove('on'); hintEl.classList.remove('on'); dogBtnLeft = 0; if (dogEls.btn) dogEls.btn.hidden = true; closeDogName();
    document.body.classList.add('replaying'); replayBtn.hidden = true;
    DAY.override = rec.hour; DAY.shadowAt = 0; applyDaylight(clockHour());
  } else {
    const S = replaySaved; if (!S) return;
    for (const [b, vis] of S.birds) { b.root.visible = vis; placeBlob(b); }
    for (const [p, s, goal, shut] of S.doors) { p.door.s = s; p.door.goal = goal; p.door.shut = shut; }
    for (const g of [foxes && foxes.group, geeseFlock && geeseFlock.group, farmDog && farmDog.group, frogPond && frogPond.group, duckFlock && duckFlock.group, farmLife && farmLife.group]) if (g) g.visible = true;
    for (const g of castGroups(replayCast)) g.visible = false;
    tag.classList.remove('on');
    document.body.classList.remove('replaying');
    if (S.override === undefined) delete DAY.override; else DAY.override = S.override;
    DAY.shadowAt = 0; applyDaylight(clockHour()); tickDoors(0);
    view.target.copy(S.target); view.size = S.size; clampView(); applyGrass(); placeCamera(); furDetail();
    replaySaved = null; lastSim = 0; wake(800);
  }
}
function setupReplay() {
  if (params.get('lineup') || !foxes || !nightVisit) return;
  const el = id => document.getElementById(id);
  replay = new Replay({
    cast: () => (replayCast = replayCast || buildReplayCast()),
    live: replayLive,
    look: (x, z, size) => { view.target.set(x, 0, z); view.size = size; clampView(); applyGrass(); placeCamera(); furDetail(); },
    lang: LANG, dogName: () => dogName,
    els: { film: el('film'), grain: el('film-grain'), flick: el('film-flick'), scratches: [el('film-s1'), el('film-s2')], iris: el('film-iris'),
      card: el('film-card'), title: el('film-title'), sub: el('film-sub'), skip: el('film-skip'), canvas },
  });
  replay.onClose = () => { try { localStorage.setItem(REPLAY_KEY, dayKey()); } catch (e) {} replayDone = true; seenCheck.at = -1e9; };
  if (replayBtn) { replayBtn.textContent = '🎞 ' + REPLAY_TEXT.btn[LANG === 'fr' ? 1 : 0]; replayBtn.addEventListener('click', () => startReplay()); }
}
let replayDone = false;
function startReplay() {
  if (!replay || replay.on || inside.open) return false;
  const rec = replayRecord(); if (!rec) return false;
  return replay.start(rec);
}
// the button: in the morning until it's been watched (?replay: at any hour, once), not while inside a coop or while another
// button has the spot
function tickReplayBtn() {
  if (!replay || !replayBtn) return;
  const h = clockHour(), want = !GAME_MODE && !replay.on && !inside.open && !replayDone && (params.has('replay') || (h >= 6 && h < 12 && !replaySeenToday()))
    && (!farmerBtn || farmerBtn.hidden) && (!dogEls.btn || dogEls.btn.hidden) && dogEls.form && dogEls.form.hidden;
  if (replayBtn.hidden === want) {
    replayBtn.hidden = !want;
    if (want && document.fonts && document.fonts.load) for (const f of ['italic 27px Fell', '44px Fell']) document.fonts.load(f).catch(() => {});      // (the cards' type, ready)
  }
}
function replayFrame(now) {
  if (now - lastFrame < 1000 / 16 - 2) return;            // a silent film: 16 pictures a second (and the quality left alone)
  const dt = Math.min(0.1, (now - (lastSim || now)) / 1000); lastSim = now; lastFrame = now;
  replay.update(dt); tickDoors(dt, now); placeTag(dt);
  WIND.time.value = now / 1000; WATER_T.value = (now / 1000) % 3600;
  if (now - (DAY.lastSet || 0) > 250) { DAY.lastSet = now; applyDaylight(clockHour()); }
  renderer.render(scene, camera);
  wake(300);
}

let awakeUntil = 0, lastFrame = 0, lastSim = 0, frozen = false, paused = false;
function wake(ms) { awakeUntil = Math.max(awakeUntil, performance.now() + ms); }
const meter = { frames: 0, late: 0, since: 0, fps: 0, slow: 0 };
const readout = document.getElementById('readout');
let details = params.has('details');
readout.addEventListener('click', () => { details = !details; showReadout(); });

function frame(now) {
  requestAnimationFrame(frame);
  if (paused) return;
  if (replay && replay.on) { replayFrame(now); return; }
  const busy = now < awakeUntil || pointers.size > 0;
  if (!busy && now - lastFrame < 1000 / 30 - 3) return;              // idle: every other screen refresh is enough
  const dt = Math.min(0.1, (now - (lastSim || now)) / 1000); lastSim = now;
  if (!frozen) { for (const p of livePlots()) { if (p === inside.plot) continue; for (const b of p.birds) b.update(dt); if (p.kind === 'coop') separate(p.birds, dt); for (const b of p.birds) placeBlob(b); } tickNotes(dt); tickPenFx(dt); tickDoors(dt, now); tickFoxes(dt); if (foxGroups().length) wake(100); }
  if (poster) { tickPoster(dt); wake(100); }
  tickFocus(dt); placeTag(dt); tickDogBtn(dt); tickHenBtns(dt); tickReplayBtn(); tickHint(dt);
  if (GAME_MODE) { gameTick(); tickChicks(dt); tickLand(dt); tickMove(dt); tickClearing(dt); placeBubbles(); }
  if (!frozen) { WIND.time.value = now / 1000; WATER_T.value = (now / 1000) % 3600; }
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

document.addEventListener('visibilitychange', () => {
  lastSim = 0; meter.since = 0; meter.frames = 0;
  if (!GAME_MODE || !game || !game.data) return;
  if (document.hidden) hiddenAt = Date.now();               // (put away: the save keeps when it was last seen, to the minute)
  else if (hiddenAt && Date.now() - hiddenAt >= AWAY_MIN) { AWAY = { from: hiddenAt }; newsFrom = performance.now() + 1500; }      // (back after a while: the summary)
});

window.__separate = (dt) => { for (const p of plots) if (p.birds.length) separate(p.birds, dt); };
window.__farm = {
  get birds() { return plots[0] ? plots[0].birds : []; }, allBirds, plots, view, renderer, scene, camera, quality: () => q, meter,
  setQuality: (n) => { while (q < n) stepDown(); },
  lookAt: (x, z, size) => { view.target.set(x, 0, z); if (size) view.size = size; clampView(); applyGrass(); placeCamera(); wake(500); },
  plan: () => V, THREE,
  act: (type, left) => { for (const b of allBirds) { b.act = { type, left: left || 2, leg: 0 }; b.wait = Math.max(b.wait, left || 2); } },
  hop: () => { for (const b of allBirds) b.tapped(); },
  wheat: (stage) => setWheat(stage), field: () => wheatField, wind: (t) => { WIND.time.value = t; }, water: (t) => { WATER_T.value = t; },
  freeze: (on) => { frozen = on; },
  pause: (on) => { paused = on; },                         // tests: stop drawing (the test browser draws slowly) and draw once on demand
  draw: () => { for (const p of plots) for (const b of p.birds) placeBlob(b); placeTag(0); placeBubbles(); renderer.render(scene, camera); },
  step: (dt, n) => { for (let i = 0; i < n; i++) { tickFocus(dt); if (poster) tickPoster(dt); for (const p of plots) if (p.birds.length) { for (const b of p.birds) b.update(dt); if (p.kind === 'coop') separate(p.birds, dt); for (const b of p.birds) placeBlob(b); } tickNotes(dt); tickPenFx(dt); tickDoors(dt); tickFoxes(dt); if (GAME_MODE) { tickChicks(dt); tickLand(dt); tickMove(dt); tickClearing(dt); } } placeTag(dt * n); tickHint(dt * n); wake(300); },
  decor: () => decorList, sails: () => sails, decorLife: () => decorLife, decorFree: (x, z) => decorFree && decorFree(x, z), coopPlots: () => plots.filter(p => p.kind === 'coop'), penVisit: (i, kind, j = 0) => { const p = plots.filter(q => q.kind === 'coop')[i]; henBird = p && p.birds[j]; return sendToPen(kind); }, penSpec, henTap: b => henTapped(b),
  foxes: () => foxes, foxLineup: () => foxLineup, dog: () => farmDog, kennel: KENNEL_AT, kennelName: () => kennelBoard && kennelBoard.mesh.userData.name, dogName: () => dogName, setDogName, cleanName, geeseLineup: () => geeseLineup, frogLineup: () => frogLineup, farmerLineup: () => farmerLineup, frogs: () => frogPond, ducks: () => duckFlock, farmer: () => farmLife, geese: () => geeseFlock, nav: () => navGrid(), visit: () => nightVisit, onBridge, penObstacles: () => PEN.obstacles,
  doorTap, setDoor, doors: DOORS,
  game: () => game, gameUI: () => gameUI, openBirdCard,
  // tests (the game's eggs and feed): the upkeep at a given time, a coop's nest collected, its feeder's card, filled
  gameTick: (t, force = true) => gameTick(t ?? Date.now(), force), gamePlots, gameChicks: i => gameChicks(gamePlots()[i]).length, chickCard, showNews,
  youngs: i => gameChicks(gamePlots()[i]).map(b => b.young || 'chick'), farewell: i => { const F = gamePlots()[i].fw; return F ? { phase: F.phase, ready: F.ready, t: +F.t.toFixed(2), left: F.kids.filter(k => k.plot.birds.includes(k)).length } : null; },
  lastExit: i => gamePlots()[i].lastExit || null, farmExit,
  // tests (levels and land): the patches as drawn, a patch's card, buying the one for sale
  saleSign: () => { const o = []; if (SALE.sign) SALE.sign.traverse(c => { if (c.isMesh) { const w = c.getWorldPosition(new THREE.Vector3()); o.push([c.type, c.isInstancedMesh ? c.count : 1, +w.x.toFixed(2), +w.y.toFixed(2), +w.z.toFixed(2), c.visible]); } }); return o; },
  farmerCanReach: (x, z) => { const R = farmReach(), nav = navGrid(), i = nav.ix(x), k = nav.iz(z); return !!(R[k * nav.nx + i] || R[k * nav.nx + i + 1] || R[(k + 1) * nav.nx + i]); },
  wildIn: f => { let c = 0; const m = new THREE.Matrix4(), v = new THREE.Vector3(); for (const im of LAND.grass) for (let i = 0; i < im.instanceMatrix.count; i++) { im.getMatrixAt(i, m); v.setFromMatrixPosition(m); if (fieldAt(v.x, v.z) === f) c++; } return c; },
  land: () => ({ owned: landOwned, sale: SALE.field, fence: LAND.fence.reduce((a, m) => a + m.count, 0), grass: LAND.grass.reduce((a, m) => a + m.instanceMatrix.count, 0), at: SALE.at && [SALE.at.x, SALE.at.z].map(v => +v.toFixed(2)) }), fieldAt, fields: () => FIELDS, landCard: () => landCard(), buyLand: () => buyField(), coopCard: i => coopCard(gamePlots()[i]),
  move: { start: i => startMove(gamePlots()[i]), to: (x, z, deg) => moveTo(x, z, deg === undefined ? MOVE.at.deg : deg), place: () => placeCoop(), cancel: () => endMove(false),
    state: () => ({ on: !!MOVE.plot, at: MOVE.at, ok: !!(MOVE.spot && MOVE.spot.ok), why: MOVE.spot && MOVE.spot.why, clear: MOVE.spot ? MOVE.spot.clear.map(o => o.id) : [], text: document.querySelector('.gmove-t') && document.querySelector('.gmove-t').textContent, batch: COOP_BATCH.length }) },
  // tests (decorations): the shop, buying one, placing and moving it, what's on the farm
  deco: { shop: () => shopSheet(), buy: id => buyDecor(id), start: id => startDecor(id), to: (x, z) => decMoveTo(x, z), place: () => putDecor(), cancel: () => endDecor(false), card: id => decorCard(id),
    spot: (id, x, z) => { const S = decorSpot(id, x, z); return { ok: S.ok, why: S.why, clear: S.clear.map(o => o.id) }; }, free: (id, x, z) => decorFreeNear(id, x, z, 40, true), way: (id, x, z) => decorWayOk(id, x, z),
    state: () => ({ on: DMOVE.id, at: DMOVE.at, ok: !!(DMOVE.spot && DMOVE.spot.ok), why: DMOVE.spot && DMOVE.spot.why, clear: DMOVE.spot ? DMOVE.spot.clear.map(o => o.id) : [], text: document.querySelector('.gmove-t') && document.querySelector('.gmove-t').textContent }),
    items: () => Object.entries(DEC.items).filter(([id]) => id !== 'wheat').map(([id, it]) => ({ id, at: it.d.pos, shown: !!it.group.parent, prop: V.props.includes(it.prop), tap: decorList.includes(it.d) })), life: () => decorLife && decorLife.state(), duckHouse: () => !!(duckFlock && duckFlock.house),
    blocked: (x, z) => !navGrid().freeAt(x, z), sails: () => sails && sails.children[0].rotation.z,
    wheat: { tap: () => wheatTap(), sow: () => sowWheat(), harvest: () => harvestWheat(), move: () => startDecor('wheat'),
      state: () => { const it = DEC.items.wheat; return { stage: game.wheatStage(), shown: FIELD.shown, hold: FIELD.hold, work: FIELD.work && FIELD.work.kind, at: it && it.d.pos, deg: it && it.d.deg, grain: game.data.grain, bub: FIELD.bub && !FIELD.bub.hidden ? FIELD.bub.textContent : null, under: it ? underCoop(it.d.pos[0], it.d.pos[1]) : null, owned: it ? owned(fieldAt(it.d.pos[0], it.d.pos[1])) : null }; } },
    away: { at: t => { AWAY = { from: t }; newsFrom = 0; }, pending: () => !!AWAY, collectAll: () => collectAll() },
    guide: { state: () => ({ step: game.guideStep(), on: GUIDE_UI.on, intro: GUIDE_UI.intro, card: GUIDE_UI.card && !GUIDE_UI.card.hidden ? GUIDE_UI.text.textContent : null, n: GUIDE_UI.card ? GUIDE_UI.n.textContent : null, arrow: GUIDE_UI.arrow && !GUIDE_UI.arrow.hidden ? [parseFloat(GUIDE_UI.arrow.style.left), parseFloat(GUIDE_UI.arrow.style.top)] : null, show: GUIDE_UI.show && !GUIDE_UI.show.hidden }), target: () => { const T = guideTarget(game.guideStep()); return T && { el: T.el ? T.el.className : null, world: T.world ? [T.world.x, T.world.y, T.world.z] : null }; } },
    honey: { tap: () => honeyTap(), n: () => game.honeyAt(), state: () => ({ n: game.honeyAt(), going: FIELD.honey, work: FIELD.work && FIELD.work.kind, frame: FIELD.frameOn, bub: FIELD.hbub && !FIELD.hbub.hidden ? FIELD.hbub.textContent : null }) } },
  place: b => startPlace(b), coopsSheet: () => coopsSheet(), showsSheet: () => showsSheet(), jobsSheet: () => jobsSheet(), showSpot: () => showSpot(), showWhy: () => SHOW_WHY, showDay: () => SHOWDAY, showDayAt: (r) => startShowDay(r, game.unseenShows()), coopModels: () => [...new Set(COOP_BATCH.map(m => m.userData.model))].sort(),
  // tests (the Breed Book): open it; a point inside the farmhouse's box, up under its roof (x, y, z), to tap
  book: () => bookSheet(), farmhouseSpot: () => { farmhouseAt(new THREE.Ray()); const B = HOUSE_HIT.box, c = B.getCenter(new THREE.Vector3()); c.y = B.min.y + 0.72 * (B.max.y - B.min.y); c.applyMatrix4(HOUSE_HIT.m); return [c.x, c.y, c.z]; },
  coopSpot: (x, z, deg, i = 0) => { const S = coopSpot({ x, z, deg }, gamePlots()[i].gc); return { ok: S.ok, why: S.why, clear: S.clear.map(o => o.id) }; },
  nature: () => ({ trees: V.trees.length, bushes: V.bushes.length, rocks: V.rocks.length, has: id => [...V.trees, ...V.bushes, ...V.rocks].some(o => o.id === id) }), underCoop: (x, z, m) => underCoop(x, z, m),
  screenOf: (x, z, y = 0) => { const v = new THREE.Vector3(x, y, z).project(camera); return { x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight }; },
  viewAbove: (x, z, size) => viewAbove(x, z, size),
  penOut: i => { const P = penSpec(gamePlots()[i]); return P && P.out; }, grassIn: i => { const c = game.data.coops[i], m = new THREE.Matrix4(), v = new THREE.Vector3(); let n = 0; for (const g of VGRASS) for (let k = 0; k < g.count; k++) { g.getMatrixAt(k, m); v.setFromMatrixPosition(m); const [lx, lz] = inSpot(c, v.x, v.z); if (rectGap(FOOT, lx, lz) <= 0) n++; } return n; }, coopAt: i => { const g = gamePlots()[i].group; return [g.position.x, g.position.z, Math.round(g.rotation.y / DEG)]; }, navFree: (x, z) => navGrid().freeAt(x, z), collectAt: i => collectAt(gamePlots()[i]), feederCard: i => feederCard(gamePlots()[i]), fillFeeder: i => fillFeeder(gamePlots()[i]),
  // tests: a close look with a perspective camera at a world point (at), from azimuth az and elevation el (degrees)
  closeShot: (o) => { const cam = new THREE.PerspectiveCamera(o.fov || 30, canvas.clientWidth / canvas.clientHeight, 0.05, 200), t = new THREE.Vector3(...o.at);
    const dir = new THREE.Vector3(0, Math.sin((o.el ?? 25) * DEG), Math.cos((o.el ?? 25) * DEG)).applyAxisAngle(new THREE.Vector3(0, 1, 0), 45 * DEG + (o.az || 0) * DEG);
    cam.position.copy(t).addScaledVector(dir, o.dist || 3); cam.lookAt(t); cam.updateMatrixWorld(); for (const p of plots) for (const b of p.birds) placeBlob(b); renderer.render(scene, cam); return true; },
  poster: () => poster, posterShot: (o) => {                // the welcome picture: a perspective camera on the stage
    const P = poster, cam = new THREE.PerspectiveCamera(o.fov || 24, o.aspect || 0.93, 0.1, 200), t = new THREE.Vector3(...(o.at || [0.15, 0.4, 0.05]));
    P.g.updateMatrixWorld(true); const tw = P.g.localToWorld(t.clone()), dir = new THREE.Vector3(0, Math.sin((o.el || 26) * DEG), Math.cos((o.el || 26) * DEG)).applyAxisAngle(new THREE.Vector3(0, 1, 0), 45 * DEG + (o.az || 0) * DEG);
    cam.position.copy(tw).addScaledVector(dir, o.dist || 9); cam.lookAt(tw); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    view.target.set(tw.x, 0, tw.z); aimShadows(true); for (const p of plots) for (const b of p.birds) placeBlob(b);
    // (the best it can be: crisp shadows over just the stage, fur and fluff as fine as they come at this size)
    const sh = sun.shadow, R = o.shadowReach || 4.5; sh.mapSize.set(4096, 4096); if (sh.map) { sh.map.dispose(); sh.map = null; }
    sh.camera.left = -R; sh.camera.right = R; sh.camera.top = R; sh.camera.bottom = -R; sh.camera.updateProjectionMatrix(); sh.radius = 2.5; sh.needsUpdate = true;
    const h = (canvas.clientHeight || innerHeight) * renderer.getPixelRatio(); setFar(false); setFurDetail(h / (2 * (o.dist || 9) * Math.tan((o.fov || 24) / 2 * DEG)), 1);
    renderer.render(scene, cam); return true; },
  replay: () => replay, startReplay, replayRecord, replayBtn: () => replayBtn,
  replayTick: (dt, n) => { for (let i = 0; i < n && replay && replay.on; i++) { replay.update(dt); tickDoors(dt); } placeTag(dt * n); if (replay && replay.on) applyDaylight(clockHour()); },
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

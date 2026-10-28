// The fish (release 5, fishing; game-plan-v2.md §8): fourteen species, seven in the pond and seven in the river, in each
// water four common, two rare and one legendary with a name. Pond: rudd, roach, perch, tench; the golden tench and the koi
// (rare); Big Bertha, the giant mirror carp. River: minnow, gudgeon, dace, chub; the brown trout and the grayling (rare);
// Old Snapjaw, the pike.
//
// A fish is built here from simple shapes (no model file), as the frogs are: a smooth body lofted nose to tail from rings
// (each species its own depth, hump, width and mouth: a rudd's upturned, a gudgeon's underneath, a pike's long flat snout),
// thin fins as little fans (forked, rounded or square tails, a perch's spiny first dorsal, a grayling's sail, the trout's
// and grayling's adipose fin), eyes with their own iris colours and a catch-light, a mouth line and the barbels of the
// tench, the carp, the koi and the gudgeon. The body's colours and markings are drawn per pixel (so they stay crisp
// close up): dark back, coloured sides and pale belly, scales, a gill line, and each species' own marks: the perch's bars,
// the trout's black and red spots, the pike's pale beans, the koi's patches, Big Bertha's great mirror scales.
// One mesh, one draw. It swims in place: a wave down the body to the tail, stronger towards the tail (a curl for a fish
// held up). The fish's own frame: x to its left, y up, z forward (its nose at +L/2).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const C = h => new THREE.Color(h);
// the species. L: its length as drawn in the game (metres, nose to tail tip; the small ones a little larger than life, so
// they read on a phone); cm: the real length range (the catch's size). body: H its depth for its body's length, sH where it's
// deepest (0 nose .. 1 tail's root), p the nose (under 1 blunt, over 1 pointed), ped the tail's root depth, hump how much of
// the depth is above the middle, W its width for its depth, mouth up (+) or under (-), tail the tail fin's share of L,
// snout a pike's wide flat snout. dorsal: fins on the back [from, to, height] (as shares of the body's length); anal the
// fin underneath; pelvic and pect where the pairs are; adipose the little fin before the tail (trout and grayling).
export const FISH = {
  // ---- the pond
  rudd: { water: 'pond', rare: 0, L: 0.26, cm: [15, 30], names: ['Rudd', 'Rotengle'],
    body: { H: 0.4, sH: 0.42, p: 0.6, ped: 0.3, hump: 0.56, W: 0.34, mouth: 0.55, tail: 0.21 },
    dorsal: [[0.52, 0.66, 0.2]], anal: [0.66, 0.82, 0.15], pelvic: 0.45, pect: 0.24, tailShape: 'fork',
    eye: { k: 0.052, iris: '#e3b23a', spot: '#d2402a' },
    col: { back: '#4d5a36', side: '#d6b552', belly: '#f3e8c6' }, fins: { all: '#dd4328' },
    scale: [15, 0.42], gill: 0.25 },
  roach: { water: 'pond', rare: 0, L: 0.24, cm: [12, 25], names: ['Roach', 'Gardon'],
    body: { H: 0.36, sH: 0.4, p: 0.62, ped: 0.3, hump: 0.53, W: 0.35, mouth: 0.05, tail: 0.21 },
    dorsal: [[0.42, 0.56, 0.21]], anal: [0.64, 0.8, 0.14], pelvic: 0.44, pect: 0.24, tailShape: 'fork',
    eye: { k: 0.055, iris: '#c9302a' },
    col: { back: '#3e5368', side: '#c9d3d9', belly: '#f3f3ee' }, fins: { all: '#cf7a4a', d: '#8a8e92', t: '#9a8a80', p: '#d8a080' },
    scale: [16, 0.38], gill: 0.25 },
  perch: { water: 'pond', rare: 0, L: 0.27, cm: [15, 35], names: ['Perch', 'Perche'],
    body: { H: 0.37, sH: 0.36, p: 0.68, ped: 0.24, hump: 0.62, W: 0.38, mouth: 0.08, tail: 0.19 },
    dorsal: [[0.24, 0.5, 0.25, 'spiny'], [0.53, 0.7, 0.16]], anal: [0.68, 0.8, 0.15], pelvic: 0.34, pect: 0.27, tailShape: 'notch',
    eye: { k: 0.058, iris: '#e6b733' },
    col: { back: '#34502a', side: '#a4b84c', belly: '#f1efd2' }, fins: { all: '#e85a2b', d: '#8a9064', d2: '#9aa070', p: '#d9a35a', t: '#d87a3c' },
    finSpot: { d: '#151a12' }, bars: [6, 0.62, 0.2, 0.86], barCol: '#22351a', scale: [22, 0.22], gill: 0.29 },
  tench: { water: 'pond', rare: 0, L: 0.32, cm: [20, 45], names: ['Tench', 'Tanche'],
    body: { H: 0.32, sH: 0.44, p: 0.52, ped: 0.42, hump: 0.5, W: 0.48, mouth: 0.0, tail: 0.18 },
    dorsal: [[0.37, 0.58, 0.15, 'round']], anal: [0.63, 0.8, 0.13, 'round'], pelvic: 0.42, pect: 0.24, tailShape: 'square', bigFins: 1.15,
    eye: { k: 0.044, iris: '#d4482c' }, barbels: 2,
    col: { back: '#28361c', side: '#5f7434', belly: '#c6b267' }, fins: { all: '#34441f' },
    scale: [40, 0.12], gill: 0.25, mottle: [9, 0.12] },
  golden_tench: { water: 'pond', rare: 1, L: 0.32, cm: [20, 40], names: ['Golden tench', 'Tanche dorée'],
    body: { H: 0.32, sH: 0.44, p: 0.52, ped: 0.42, hump: 0.5, W: 0.48, mouth: 0.0, tail: 0.18 },
    dorsal: [[0.37, 0.58, 0.15, 'round']], anal: [0.63, 0.8, 0.13, 'round'], pelvic: 0.42, pect: 0.24, tailShape: 'square', bigFins: 1.15,
    eye: { k: 0.044, iris: '#2c2420' }, barbels: 2,
    col: { back: '#e08a14', side: '#f6b72f', belly: '#fbe09a' }, fins: { all: '#ef9e2c' },
    spotA: [0.32, 0.016, 0.0, 1.0], spotACol: '#2e2010', scale: [40, 0.1], gill: 0.25 },
  koi: { water: 'pond', rare: 1, L: 0.38, cm: [30, 60], names: ['Koi', 'Koï'],
    body: { H: 0.31, sH: 0.4, p: 0.58, ped: 0.34, hump: 0.56, W: 0.44, mouth: -0.05, tail: 0.2 },
    dorsal: [[0.34, 0.68, 0.14, 'long']], anal: [0.7, 0.8, 0.14], pelvic: 0.44, pect: 0.24, tailShape: 'fork', bigFins: 1.15,
    eye: { k: 0.042, iris: '#1e1c1c', ring: '#d6b04a' }, barbels: 4,
    col: { back: '#fbf7ee', side: '#f8f4ea', belly: '#f7f3ea' }, fins: { all: '#f4eee2', t: '#f3e6d8' },
    patch: [3.2, 0.5, 0.72, 1], patchCol: '#e4532a', patch2Col: '#1c1c22', scale: [15, 0.16], gill: 0.25 },
  big_bertha: { water: 'pond', rare: 2, L: 0.9, cm: [85, 95], names: ['Big Bertha', 'Grosse Berthe'], legend: true,
    body: { H: 0.4, sH: 0.38, p: 0.58, ped: 0.32, hump: 0.64, W: 0.42, mouth: -0.08, tail: 0.18 },
    dorsal: [[0.34, 0.7, 0.14, 'long']], anal: [0.7, 0.8, 0.15], pelvic: 0.44, pect: 0.24, tailShape: 'fork',
    eye: { k: 0.034, iris: '#d9a43a' }, barbels: 4,
    col: { back: '#4a4426', side: '#ad8738', belly: '#ead398' }, fins: { all: '#7d5a34', a: '#a5603a', t: '#8f5a36' },
    mirror: [0.085, 0.8], mirrorCol: '#d9b55e', scale: [44, 0.08], gill: 0.25, mottle: [5, 0.1] },
  // ---- the river
  minnow: { water: 'river', rare: 0, L: 0.12, cm: [5, 10], names: ['Minnow', 'Vairon'],
    body: { H: 0.21, sH: 0.4, p: 0.52, ped: 0.4, hump: 0.52, W: 0.5, mouth: 0.0, tail: 0.2 },
    dorsal: [[0.5, 0.62, 0.18]], anal: [0.66, 0.78, 0.15], pelvic: 0.48, pect: 0.24, tailShape: 'fork',
    eye: { k: 0.07, iris: '#e0c470' },
    col: { back: '#46522f', side: '#b3b07c', belly: '#f2e3c8' }, fins: { all: '#c9c09a', v: '#e2a08a', p: '#e2a08a' },
    blotch: [11, 0.62, 0.15, 0.95], blotchCol: '#323a24', gill: 0.26 },
  gudgeon: { water: 'river', rare: 0, L: 0.15, cm: [8, 15], names: ['Gudgeon', 'Goujon'],
    body: { H: 0.2, sH: 0.3, p: 0.58, ped: 0.38, hump: 0.62, W: 0.62, mouth: -0.5, tail: 0.19 },
    dorsal: [[0.36, 0.5, 0.21]], anal: [0.66, 0.78, 0.14], pelvic: 0.44, pect: 0.22, tailShape: 'fork', bigFins: 1.1,
    eye: { k: 0.068, iris: '#c9b07a', up: 0.55 }, barbels: 2,
    col: { back: '#625842', side: '#bdae8c', belly: '#f2eadb' }, fins: { all: '#cfc09a' }, finSpot: { all: '#4a3e2c' },
    blotch: [8, 0.7, 0.18, 0.92], blotchCol: '#4b4232', spotA: [0.5, 0.012, 0.35, 1.0], spotACol: '#4b4232', scale: [16, 0.2], gill: 0.25 },
  dace: { water: 'river', rare: 0, L: 0.22, cm: [15, 25], names: ['Dace', 'Vandoise'],
    body: { H: 0.23, sH: 0.4, p: 0.66, ped: 0.3, hump: 0.53, W: 0.4, mouth: -0.08, tail: 0.21 },
    dorsal: [[0.44, 0.56, 0.2]], anal: [0.66, 0.78, 0.14], pelvic: 0.46, pect: 0.24, tailShape: 'fork',
    eye: { k: 0.056, iris: '#e8dca2' },
    col: { back: '#46596a', side: '#dce1e4', belly: '#f8f8f4' }, fins: { all: '#d8d3c0', a: '#e9d9a2', v: '#e9d9a2' },
    scale: [17, 0.34], gill: 0.25, line: [0.5, 0.08] },
  chub: { water: 'river', rare: 0, L: 0.38, cm: [30, 50], names: ['Chub', 'Chevesne'],
    body: { H: 0.25, sH: 0.4, p: 0.52, ped: 0.34, hump: 0.55, W: 0.52, mouth: 0.08, tail: 0.19 },
    dorsal: [[0.44, 0.56, 0.18]], anal: [0.66, 0.78, 0.16, 'round'], pelvic: 0.45, pect: 0.24, tailShape: 'notch',
    eye: { k: 0.05, iris: '#d0a944' },
    col: { back: '#36412f', side: '#b4b293', belly: '#ede6cf' }, fins: { all: '#3c3b30', a: '#d76a34', v: '#d97a3c', p: '#c9884a' },
    scale: [14, 0.75], gill: 0.27 },
  brown_trout: { water: 'river', rare: 1, L: 0.38, cm: [25, 50], names: ['Brown trout', 'Truite fario'],
    body: { H: 0.25, sH: 0.42, p: 0.62, ped: 0.38, hump: 0.54, W: 0.42, mouth: 0.0, tail: 0.18 },
    dorsal: [[0.4, 0.54, 0.18]], adipose: 0.84, anal: [0.68, 0.79, 0.15], pelvic: 0.5, pect: 0.24, tailShape: 'square',
    eye: { k: 0.048, iris: '#d9a744' },
    col: { back: '#55451f', side: '#c49a48', belly: '#f3e2b2' }, fins: { all: '#9a7a44', d: '#8a6a3a', t: '#8a6a3a', ad: '#c8402a' }, finSpot: { d: '#1d1610' },
    spotA: [0.62, 0.015, 0.05, 1.0], spotACol: '#1d1610', spotB: [0.5, 0.017, -0.35, 0.25], spotBCol: '#c9311f', halo: '#f2e2c4', scale: [50, 0.06], gill: 0.25 },
  grayling: { water: 'river', rare: 1, L: 0.36, cm: [25, 45], names: ['Grayling', 'Ombre'],
    body: { H: 0.23, sH: 0.38, p: 0.68, ped: 0.32, hump: 0.55, W: 0.4, mouth: -0.1, tail: 0.2 },
    dorsal: [[0.26, 0.6, 0.34, 'sail']], adipose: 0.84, anal: [0.68, 0.79, 0.14], pelvic: 0.46, pect: 0.23, tailShape: 'fork',
    eye: { k: 0.05, iris: '#dcc274' },
    col: { back: '#46525f', side: '#bbbfc6', belly: '#efeeea' }, fins: { all: '#b9a0a8', d: '#7a4a6a', v: '#c76a7a' }, finSpot: { d: '#1f1a24' }, finEdge: { d: '#d8443a' },
    spotA: [0.42, 0.011, 0.0, 0.9], spotACol: '#25262c', spotAFront: 0.55, scale: [20, 0.3], gill: 0.25, stripes: [0.22, 8] },
  old_snapjaw: { water: 'river', rare: 2, L: 1.0, cm: [100, 110], names: ['Old Snapjaw', 'Vieux Claquemâchoire'], legend: true,
    body: { H: 0.2, sH: 0.4, p: 0.8, ped: 0.5, hump: 0.5, W: 0.62, mouth: -0.04, tail: 0.15, snout: 0.7 },
    dorsal: [[0.74, 0.88, 0.17]], anal: [0.76, 0.9, 0.15], pelvic: 0.56, pect: 0.24, tailShape: 'fork',
    eye: { k: 0.03, iris: '#e3b432', up: 0.62 },
    col: { back: '#2b3c20', side: '#6e893a', belly: '#efe8c6' }, fins: { all: '#7d6b3a', p: '#a08a50' }, finSpot: { all: '#2c2414' },
    beans: [0.6, 0.016, -0.3, 0.92], beanCol: '#d8d78e', scale: [60, 0.06], gill: 0.2, mottle: [6, 0.12] },
};
export const FISH_IDS = Object.keys(FISH);
// ---- and one more, in no water's catch and never in the Book: the pond's secret (Audrey, 28 Oct: "A salmon and a frog are
// in love ... the salmon cannot be fished"; pond.js FrogPond.love). A silver salmon, a blue-grey back with black spots,
// his sides a little rosy, big soft eyes; his cheeks blush when he sees her (the material's blush)
export const SECRET = {
  salmon: { water: null, rare: 0, L: 0.46, cm: [60, 80], names: ['Salmon', 'Saumon'],
    body: { H: 0.25, sH: 0.4, p: 0.62, ped: 0.3, hump: 0.55, W: 0.4, mouth: 0.02, tail: 0.17 },
    dorsal: [[0.38, 0.52, 0.18]], adipose: 0.83, anal: [0.68, 0.79, 0.14], pelvic: 0.5, pect: 0.23, tailShape: 'notch',
    eye: { k: 0.058, iris: '#d8bf72' },
    col: { back: '#3d5872', side: '#ddd1d7', belly: '#f8f3f2' }, fins: { all: '#7d8a99', t: '#5b6c80', d: '#5f7085' },
    spotA: [0.42, 0.014, 0.22, 1.0], spotACol: '#1f2530', scale: [44, 0.1], gill: 0.24, line: [0.5, 0.05] },
};
const specOf = id => FISH[id] || SECRET[id];
const NS = 48, NA = 32;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// the body's depth (0..1 of its deepest) at s, nose (0) to the tail's root (1)
function depthAt(B, s) {
  if (s <= B.sH) return Math.pow(Math.sin(Math.min(1, s / B.sH) * Math.PI / 2), B.p);
  return B.ped + (1 - B.ped) * Math.pow(Math.cos((s - B.sH) / (1 - B.sH) * Math.PI / 2), 1.5);
}
// one species' body measures, in metres
function measures(sp) {
  const B = sp.body, L = sp.L, Lb = L * (1 - B.tail), zN = L / 2;
  const ring = s => {
    const D = B.H * Lb * depthAt(B, s), top = D * B.hump, bot = D * (1 - B.hump);
    const w = D * B.W / 2 * (1 + (B.snout || 0) * Math.pow(1 - s, 5));
    const yc = B.mouth * B.H * Lb * 0.32 * Math.pow(1 - Math.min(1, s / B.sH), 2.2) + (B.hump - 0.5) * B.H * Lb * 0.4 * (1 - depthAt(B, s));
    return { z: zN - s * Lb, top, bot, w, yc };
  };
  // where a ring's surface is at angle a (0 its left side, pi/2 its back)
  const at = (s, a, side = 1) => {
    const r = ring(s), c = Math.cos(a), n = Math.sin(a);
    return new THREE.Vector3(side * r.w * Math.sign(c) * Math.pow(Math.abs(c), 0.86), r.yc + (n > 0 ? r.top : r.bot) * Math.sign(n) * Math.pow(Math.abs(n), 0.86), r.z);
  };
  return { B, L, Lb, zN, ring, at };
}

// a fin: a fan from its root (base(u), u 0..1 along the body) out to its edge (edge(u)); its colours per point
function fin(base, edge, NU, NR, colour, out) {
  const pos = [], col = [], fd = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, b = base(u), e = edge(u);
    for (let j = 0; j <= NR; j++) {
      const r = j / NR, p = b.clone().lerp(e, r);
      pos.push(p.x, p.y, p.z); colour(c, u, r); col.push(c.r, c.g, c.b); fd.push(r, u, 1);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NR; j++) {
    const a = i * (NR + 1) + j, b = a + NR + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('fd', new THREE.Float32BufferAttribute(fd, 3)); g.setIndex(idx); g.computeVertexNormals();
  out.push(g);
}
// a part in one colour (an eye, a barbel): its colour per point, marked to keep it
function solid(g, colour, out) {
  g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv');
  const p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count * 3), fd = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { colour(c, p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)); col.set([c.r, c.g, c.b], i * 3); fd[i * 3 + 2] = 2; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('fd', new THREE.BufferAttribute(fd, 3));
  out.push(g);
}

const GEO = {};
export function fishGeometry(id) {
  if (GEO[id]) return GEO[id];
  const sp = specOf(id), M = measures(sp), { B, L, Lb, zN, ring, at } = M, parts = [];
  const finCol = k => C((sp.fins && (sp.fins[k] || sp.fins.all)) || '#999999');
  const big = sp.bigFins || 1;
  // ---- the body: rings nose to tail, each round its middle (a little squarer than an ellipse); the tail's root closed
  {
    const pos = [], col = [], fd = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const s = i / NS;
      for (let j = 0; j < NA; j++) {
        const a = j / NA * Math.PI * 2, p = at(s, a, 1);
        pos.push(p.x, p.y, p.z); col.push(1, 1, 1); fd.push(s, Math.sin(a), 0);
      }
    }
    const tip = pos.length / 3, r1 = ring(1); pos.push(0, r1.yc, r1.z - 0.002 * L); col.push(1, 1, 1); fd.push(1, 0, 0);
    for (let i = 0; i < NS; i++) for (let j = 0; j < NA; j++) {
      const a = i * NA + j, b = i * NA + (j + 1) % NA, c = a + NA, d = b + NA;
      idx.push(a, c, b, b, c, d);
    }
    for (let j = 0; j < NA; j++) idx.push(NS * NA + j, tip, NS * NA + (j + 1) % NA);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('fd', new THREE.Float32BufferAttribute(fd, 3)); g.setIndex(idx); g.computeVertexNormals();
    parts.push(g);
  }
  const spotty = (k, cBase) => (c, u, r) => {        // a fin's colour: its own, paler towards the edge; spots, an edge where it has them
    c.copy(cBase);
    const fs = sp.finSpot && (sp.finSpot[k] || (k !== 'ad' && sp.finSpot.all));
    if (fs) { const h = hash(Math.floor(u * 9), Math.floor(r * 5)); if (h < 0.42 && r > 0.12 && r < 0.88) c.lerp(C(fs), 0.75); }
    if (id === 'perch' && k === 'd' && u > 0.72 && r > 0.25) c.lerp(C('#141810'), 0.85);         // (the perch's black spot)
    const fe = sp.finEdge && sp.finEdge[k]; if (fe && r > 0.82) c.lerp(C(fe), 0.85);
  };
  // ---- the tail fin: from the tail's root, forked, notched, square or rounded, spreading
  {
    const r1 = ring(1), tl = sp.L * B.tail * 1.04, h0 = (r1.top + r1.bot) * 1.05, zr = r1.z + 0.004 * L;
    const shape = { fork: u => 0.5 + 0.5 * Math.pow(Math.abs(2 * u - 1), 0.9), notch: u => 0.78 + 0.22 * Math.abs(2 * u - 1), square: u => 0.92 + 0.08 * Math.abs(2 * u - 1), round: u => 1 - 0.3 * (2 * u - 1) ** 2 }[sp.tailShape || 'fork'];
    fin(u => new THREE.Vector3(0, r1.yc + (u - 0.5) * h0, zr), u => { const k = shape(u); return new THREE.Vector3(0, r1.yc + (u - 0.5) * (h0 + tl * 1.25 * big * Math.min(1, 0.6 + 0.6 * k)), zr - tl * k); },
      16, 8, spotty('t', finCol('t')), parts);
  }
  // ---- the fins on the back (a perch's spiny first one, a grayling's sail, a carp's long one), underneath, the pairs
  const topAt = s => { const r = ring(s); return new THREE.Vector3(0, r.yc + r.top * 0.96, r.z); };
  const botAt = s => { const r = ring(s); return new THREE.Vector3(0, r.yc - r.bot * 0.96, r.z); };
  (sp.dorsal || []).forEach(([a, b, h, kind], k) => {
    const H = h * Lb * big, key = k ? 'd2' : 'd';
    const prof = { spiny: u => (0.75 + 0.25 * Math.abs(Math.sin(u * Math.PI * 6))) * (u < 0.15 ? u / 0.15 : 1 - 0.55 * u), sail: u => (0.55 + 0.45 * u) * Math.min(1, u * 7) * (u > 0.9 ? (1 - u) * 10 : 1),
      round: u => Math.pow(Math.sin(Math.min(1, u * 1.02) * Math.PI), 0.55) * 0.9 + 0.1, long: u => (u < 0.12 ? u / 0.12 : 1 - 0.65 * (u - 0.12) / 0.88) }[kind] || (u => (u < 0.18 ? u / 0.18 : 1 - 0.78 * (u - 0.18) / 0.82));
    fin(u => topAt(a + (b - a) * u), u => { const p = topAt(a + (b - a) * u); return p.add(new THREE.Vector3(0, H * prof(u), -H * 0.45 * (kind === 'sail' ? 0.4 : kind === 'round' ? 0.3 : 1))); },
      kind === 'sail' ? 20 : 12, 7, spotty(key, finCol(key)), parts);
  });
  if (sp.adipose) { const a = sp.adipose, H = 0.05 * Lb; fin(u => topAt(a + 0.05 * u), u => topAt(a + 0.05 * u).add(new THREE.Vector3(0, H * Math.sin(u * Math.PI) * 0.9 + 0.001, -H * 0.4)), 6, 3, spotty('ad', finCol('ad')), parts); }
  if (sp.anal) {
    const [a, b, h, kind] = sp.anal, H = h * Lb * big;
    const prof = kind === 'round' ? (u => Math.pow(Math.sin(Math.min(1, u * 1.02) * Math.PI), 0.55) * 0.9 + 0.1) : (u => (u < 0.2 ? u / 0.2 : 1 - 0.7 * (u - 0.2) / 0.8));
    fin(u => botAt(a + (b - a) * u), u => botAt(a + (b - a) * u).add(new THREE.Vector3(0, -H * prof(u), -H * 0.5)), 10, 6, spotty('a', finCol('a')), parts);
  }
  for (const side of [1, -1]) {
    // the pelvic fins under the belly, angled out; the pectoral fins behind the gills, low on the side
    const pv = sp.pelvic, Hv = 0.13 * Lb * big;
    fin(u => at(pv + 0.035 * u, -Math.PI / 2 + side * 0.5, side),
      u => at(pv + 0.0175, -Math.PI / 2 + side * 0.5, side).add(new THREE.Vector3(side * Hv * 0.45, -Hv * (0.5 - 0.25 * u), -Hv * 0.85 + (u - 0.5) * Hv * 0.75)), 8, 5, spotty('v', finCol('v')), parts);
    const pc = sp.pect, Hp = 0.16 * Lb * big;
    fin(u => at(pc + 0.03 * u, -0.5 - 0.3 * u, side), u => at(pc + 0.015, -0.65, side).add(new THREE.Vector3(side * Hp * 0.6, -Hp * (0.2 + 0.3 * u), -Hp * 0.8 + (u - 0.5) * Hp * 0.6)), 8, 5, spotty('p', finCol('p')), parts);
  }
  // ---- the eyes: round, a little proud of the head, the iris in its colour round a black pupil, a catch-light
  {
    const E = sp.eye, re = E.k * L, se = E.s || (0.145 + (B.snout ? 0.1 : 0)), up = E.up || 0.32;
    for (const side of [1, -1]) {
      const p = at(se, up, side), r = ring(se), nrm = new THREE.Vector3(side * 1, 0.35 * (up > 0.5 ? 1.6 : 1), 0.12).normalize();
      const c0 = p.clone().addScaledVector(nrm, -re * 0.38);
      const g = new THREE.SphereGeometry(re, 18, 12); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm)); g.translate(c0.x, c0.y, c0.z);
      const iris = C(E.iris), ring_ = C(E.ring || E.iris).multiplyScalar(0.85), pupil = C('#0d0b0a'), rim = C(sp.col.back).lerp(C('#222'), 0.3), spot = E.spot ? C(E.spot) : null;
      solid(g, (c, x, y, z) => {
        const d = new THREE.Vector3(x - c0.x, y - c0.y, z - c0.z).normalize(), k = d.dot(nrm);
        if (k > 0.86) c.copy(pupil); else if (k > 0.52) { c.copy(iris); if (k < 0.62) c.copy(ring_); if (spot && d.y - nrm.y * k > 0.25) c.lerp(spot, 0.7); } else c.copy(rim);
      }, parts);
      const hl = new THREE.SphereGeometry(re * 0.24, 8, 6); const hp = c0.clone().addScaledVector(nrm, re * 0.92).add(new THREE.Vector3(0, re * 0.32, re * 0.22)); hl.translate(hp.x, hp.y, hp.z);
      solid(hl, c => c.set('#ffffff'), parts);
      void r;
    }
  }
  // ---- the mouth: a dark line from the nose back to its corner (a little smile); the barbels where it has them
  {
    const m = B.mouth, sM = 0.085 + (B.snout ? 0.12 : 0), a0 = m > 0.3 ? 1.0 : m < -0.3 ? -1.05 : -0.12 + m * 0.6, dark = C('#2a1d18');
    for (const side of [1, -1]) {
      const pts = [];
      for (let k = 0; k <= 8; k++) { const u = k / 8, s = 0.004 + sM * u, a = a0 + (m > 0.3 ? -0.5 : 0.35) * u * u; const p = at(s, a, side); const n = p.clone().sub(new THREE.Vector3(0, ring(s).yc, ring(s).z)).normalize(); pts.push(p.addScaledVector(n, 0.002 * L)); }
      solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0055 * L, 5, false), c => c.copy(dark), parts);
      const nb = sp.barbels || 0;
      for (let k = 0; k < nb / 2; k++) {
        const o = pts[8 - k * 3], len = (k ? 0.05 : 0.075) * L * (id === 'big_bertha' ? 0.7 : 1);
        const curve = new THREE.CatmullRomCurve3([o, o.clone().add(new THREE.Vector3(side * len * 0.25, -len * 0.45, -len * 0.15)), o.clone().add(new THREE.Vector3(side * len * 0.4, -len * 0.75, -len * 0.55))]);
        solid(new THREE.TubeGeometry(curve, 8, 0.006 * L, 5, false), c => c.copy(C(sp.col.side)).lerp(C(sp.col.belly), 0.4), parts);
      }
    }
  }
  const g = mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)));
  g.computeBoundingSphere();
  return (GEO[id] = g);
}

// ---- the material: the body's colours and marks per pixel, the fins' rays, the swim
export function fishMaterial(id, grade) {
  const sp = specOf(id), B = sp.body, L = sp.L, Lb = L * (1 - B.tail);
  const v4 = (a, d) => new THREE.Vector4(...(a ? a.concat([0, 0, 0, 0]).slice(0, 4) : d));
  const U = {
    swimT: { value: 0 }, swimA: { value: 0.05 }, curl: { value: 0 }, fishL: { value: L }, zNose: { value: L / 2 }, lb: { value: Lb / L },
    cBack: { value: C(sp.col.back) }, cSide: { value: C(sp.col.side) }, cBelly: { value: C(sp.col.belly) },
    scl: { value: new THREE.Vector2(...(sp.scale || [20, 0])) }, gill: { value: sp.gill || 0.25 },
    bars: { value: v4(sp.bars, [0, 0, 0, 0]) }, barCol: { value: C(sp.barCol || '#000000') },
    blotch: { value: v4(sp.blotch, [0, 0, 0, 0]) }, blotchCol: { value: C(sp.blotchCol || '#000000') },
    spotA: { value: v4(sp.spotA, [0, 0, 0, 0]) }, spotACol: { value: C(sp.spotACol || '#000000') }, spotAFront: { value: sp.spotAFront || 2 },
    spotB: { value: v4(sp.spotB, [0, 0, 0, 0]) }, spotBCol: { value: C(sp.spotBCol || '#000000') }, halo: { value: C(sp.halo || '#ffffff') }, hasHalo: { value: sp.halo ? 1 : 0 },
    beans: { value: v4(sp.beans, [0, 0, 0, 0]) }, beanCol: { value: C(sp.beanCol || '#ffffff') },
    koiP: { value: v4(sp.patch, [0, 0, 0, 0]) }, patchCol: { value: C(sp.patchCol || '#000000') }, patch2Col: { value: C(sp.patch2Col || '#000000') },
    mirror: { value: new THREE.Vector2(...(sp.mirror || [0, 0])) }, mirrorCol: { value: C(sp.mirrorCol || '#ffffff') },
    mottle: { value: new THREE.Vector2(...(sp.mottle || [0, 0])) }, lline: { value: new THREE.Vector2(...(sp.line || [0, 0])) },
    stripes: { value: new THREE.Vector2(...(sp.stripes || [0, 0])) }, blush: { value: 0 },
  };
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.0, side: THREE.DoubleSide });
  m.name = 'fish'; m.userData.fish = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 fd; varying vec3 vFd; varying vec3 vLP;
uniform float swimT, swimA, curl, fishL, zNose;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vFd = fd; vLP = position / fishL;
{ float tt = clamp((zNose - position.z) / fishL, 0.0, 1.3);
  float w = 0.18 * tt + 0.82 * tt * tt;
  transformed.x += fishL * (swimA * w * sin(swimT - tt * 5.5) - swimA * 0.25 * sin(swimT) * (1.0 - tt) + curl * tt * tt); }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vFd; varying vec3 vLP;
uniform float lb, gill, spotAFront, hasHalo, blush;
uniform vec3 cBack, cSide, cBelly, barCol, blotchCol, spotACol, spotBCol, halo, beanCol, patchCol, patch2Col, mirrorCol;
uniform vec2 scl, mirror, mottle, lline, stripes;
uniform vec4 bars, blotch, spotA, spotB, beans, koiP;
float fh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 fh2(vec2 p) { return vec2(fh(p), fh(p + 17.31)); }
float fnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fh(i), fh(i + vec2(1, 0)), f.x), mix(fh(i + vec2(0, 1)), fh(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { return 0.6 * fnoise(p) + 0.3 * fnoise(p * 2.1 + 3.7) + 0.1 * fnoise(p * 4.3 + 9.1); }
// round spots on a jittered grid: 0 outside, 1 inside (cell = spacing, dens = how many cells have one, rad = its radius in cells)
float fspots(vec2 q, float cell, float dens, float rad, float seed, out float ring) {
  vec2 g = q / cell, c = floor(g); float best = 9.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    vec2 o = c + vec2(float(i), float(j)); vec2 h = fh2(o + seed);
    if (h.x > dens) continue;
    vec2 p = o + 0.2 + 0.6 * fh2(o + seed + 5.0); float r = rad * (0.65 + 0.7 * h.y);
    best = min(best, length((g - p) * vec2(1.0, 1.15)) / r);
  }
  float aa = fwidth(best) + 0.02;
  ring = (1.0 - smoothstep(1.55, 1.55 + aa, best)) * smoothstep(1.0 - aa, 1.0, best);
  return 1.0 - smoothstep(1.0 - aa, 1.0, best);
}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nif (vFd.z < 0.5) {\n  float s = vFd.x, v = vFd.y;\n' + BODY_GLSL + '\n}\n');
  };
  m.customProgramCacheKey = () => 'fish';
  if (grade) grade(m);
  return m;
}
// the body's colours and marks (q: where on the fish, in its lengths: x back from the nose, y up)
const BODY_GLSL = `
  vec2 q = vec2(0.5 - vLP.z, vLP.y);
  vec3 col = mix(cBelly, cSide, smoothstep(-0.78, -0.12, v));
  col = mix(col, cBack, smoothstep(0.22, 0.88, v));
  // scales: little overlapping arcs, darker at their edges (fading out where they'd be finer than a pixel)
  if (scl.y > 0.0) {
    vec2 g = vec2(q.x, q.y * 1.25) * scl.x / lb; float row = floor(g.y); g.x += 0.5 * mod(row, 2.0);
    vec2 f = fract(g) - vec2(0.15, 0.5); float d = length(f * vec2(1.1, 1.0));
    float fade = clamp(1.4 - max(fwidth(g.x), fwidth(g.y)) * 2.2, 0.0, 1.0);
    float edge = smoothstep(0.42, 0.55, d) * (1.0 - smoothstep(0.62, 0.72, d));
    col *= 1.0 - scl.y * fade * (0.28 * edge - 0.05 * (1.0 - smoothstep(0.0, 0.4, d)));
  }
  // long stripes (the grayling's): faint darker lines along the scale rows
  if (stripes.x > 0.0) { float st = abs(fract(q.y * stripes.y / lb * 6.0) - 0.5); col *= 1.0 - stripes.x * (1.0 - smoothstep(0.08, 0.2, st)) * smoothstep(-0.6, 0.0, v); }
  // mottling (the tench, the pike, Big Bertha): soft darker cloud on the back and sides
  if (mottle.y > 0.0) col *= 1.0 - mottle.y * smoothstep(0.45, 0.75, fbm(q * mottle.x * 3.0)) * smoothstep(-0.5, 0.3, v);
  // the koi's patches: red clouds over the back and sides, a few black ones
  if (koiP.x > 0.0) {
    float n = fbm(q * koiP.x * 3.0 + 1.7); float pm = smoothstep(koiP.y, koiP.y + 0.03, n) * smoothstep(-0.55, -0.25, v) * smoothstep(0.02, 0.08, s);
    col = mix(col, patchCol, pm);
    float n2 = fbm(q * koiP.x * 5.0 + 11.3); col = mix(col, patch2Col, smoothstep(koiP.z, koiP.z + 0.02, n2) * smoothstep(-0.1, 0.2, v) * 0.95);
  }
  // the perch's bars: dark bands down from the back, wider at the top
  if (bars.x > 0.0) {
    float x = (s - bars.z) / (bars.w - bars.z); float b = abs(fract(x * bars.x) - 0.5);
    float on = (1.0 - smoothstep(0.13 + 0.12 * v, 0.2 + 0.12 * v, b)) * step(0.0, x) * step(x, 1.0) * smoothstep(-0.55, -0.15, v);
    col = mix(col, barCol, on * bars.y);
  }
  // blotches along the side (the minnow, the gudgeon)
  if (blotch.x > 0.0) {
    float x = (s - blotch.z) / (blotch.w - blotch.z); float b = length(vec2((fract(x * blotch.x) - 0.5) * 1.0, (v - 0.05) * 2.2));
    float on = (1.0 - smoothstep(0.32, 0.42, b)) * step(0.0, x) * step(x, 1.0);
    col = mix(col, blotchCol, on * blotch.y);
  }
  float rg;
  // spots: dark ones (the trout, the grayling, the golden tench, the gudgeon's speckles)
  if (spotA.x > 0.0) { float m = fspots(q / lb, spotA.y * 3.0, spotA.x, 0.32, 1.0, rg) * step(spotA.z, v) * step(v, spotA.w) * (1.0 - smoothstep(spotAFront - 0.05, spotAFront, s)) * smoothstep(0.08, 0.14, s); col = mix(col, spotACol, m * 0.92); }
  // red spots with pale rings (the trout's)
  if (spotB.x > 0.0) { float m = fspots(q / lb, spotB.y * 3.0, spotB.x, 0.34, 7.0, rg) * step(spotB.z, v) * step(v, spotB.w) * smoothstep(0.12, 0.2, s); col = mix(col, halo, rg * hasHalo * step(spotB.z, v) * step(v, spotB.w) * smoothstep(0.12, 0.2, s)); col = mix(col, spotBCol, m); }
  // the pike's pale beans, in rows along the side
  if (beans.x > 0.0) { vec2 bq = vec2(q.x / lb, q.y / lb * 1.6); float m = fspots(bq, beans.y * 3.0, beans.x, 0.4, 3.0, rg) * step(beans.z, v) * step(v, beans.w) * smoothstep(0.1, 0.18, s); col = mix(col, beanCol, m * 0.9); }
  // Big Bertha's mirror scales: big shining plates along her back and her side's middle, dark-edged
  if (mirror.x > 0.0) {
    // (two rows, along the back and along the side's middle; each plate rounded, its own size, a little out of line)
    float best = 9.0, bh = 0.0, bdy = 0.0;
    for (int r = 0; r < 2; r++) {
      float vr = r == 0 ? 0.7 : 0.08, cx = (s - 0.2) / mirror.x, ci = floor(cx);
      for (int k = -1; k <= 1; k++) {
        float c = ci + float(k), h = fh(vec2(c, float(r) + 3.0)), h2 = fh(vec2(c + 7.1, float(r)));
        if (h < 0.18 || c < 0.0 || (c + 0.5) * mirror.x + 0.2 > 0.9) continue;
        float sc = (c + 0.5 + (h2 - 0.5) * 0.35) * mirror.x + 0.2, vc = vr + (h - 0.5) * 0.12, sz = 0.75 + 0.45 * h2;
        vec2 dd = vec2((s - sc) / (mirror.x * 0.62 * sz), (v - vc) / (0.2 * sz * (r == 0 ? 0.85 : 1.0)));
        float d = length(dd);
        if (d < best) { best = d; bh = h2; bdy = dd.y; }
      }
    }
    float aa = fwidth(best) + 0.02;
    float plate = 1.0 - smoothstep(1.0 - aa, 1.0, best), rim = plate * smoothstep(0.66, 0.84, best);
    col = mix(col, mirrorCol * (1.0 + 0.16 * clamp(0.6 - bdy, 0.0, 1.0) + 0.06 * bh), plate * mirror.y); col = mix(col, cBack * 0.75, rim * 0.75);
  }
  // the lateral line (the dace): a faint dotted line along the middle of the side
  if (lline.x > 0.0) { float ll = abs(v - lline.y); col *= 1.0 - lline.x * 0.4 * (1.0 - smoothstep(0.015, 0.04, ll)) * step(0.0, sin(s * 300.0)) * smoothstep(0.22, 0.28, s); }
  // the gill cover's edge: a curved line behind the head
  { float gl = abs(s - gill + 0.06 * v * v); float aa = fwidth(s) * 1.2; float on = (1.0 - smoothstep(0.004, 0.006 + aa, gl)) * (1.0 - smoothstep(0.78, 0.92, abs(v))); col *= 1.0 - 0.38 * on; }
  // a blush on his cheeks, under and behind the eye (the salmon, when he sees her)
  if (blush > 0.0) { float d = length(vec2((s - 0.215) / 0.05, (v + 0.06) / 0.3)); col = mix(col, vec3(0.97, 0.47, 0.56), blush * 0.85 * (1.0 - smoothstep(0.45, 1.0, d))); }
  diffuseColor.rgb = col;
} else if (vFd.z < 1.5) {               // a fin: its rays, paler and a little see-through towards its edge
  float ray = abs(sin(vFd.y * 3.14159 * 11.0)); diffuseColor.rgb *= 1.0 - 0.14 * smoothstep(0.75, 1.0, ray) * smoothstep(0.1, 0.4, vFd.x);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.15 + 0.04, vFd.x * 0.45);
`;

// one fish to show or to swim: its mesh in a group (the group placed and turned, the fish swimming in it)
export class Fish {
  constructor(id, grade) {
    this.id = id; this.spec = specOf(id);
    this.mesh = new THREE.Mesh(fishGeometry(id), fishMaterial(id, grade)); this.mesh.castShadow = true;
    this.root = new THREE.Group(); this.root.add(this.mesh);
    this.U = this.mesh.material.userData.fish; this.t = Math.random() * 6; this.rate = 7; this.amp = 0.05; this.curl = 0;
  }
  update(dt) { this.t += dt * this.rate; this.U.swimT.value = this.t; this.U.swimA.value = this.amp; this.U.curl.value = this.curl; }
}

// ---- the fish line-up (?lineup=fish): each species on its own, broadside to the camera (left side, head to the left),
// gently swimming, in a row (the pond's, then the river's); spaced so a picture can be taken of each
export class FishLineup {
  constructor(scene, centre, grade, viewDir) {
    this.group = new THREE.Group(); this.group.position.copy(centre); scene.add(this.group);
    const back = viewDir.clone().normalize(), up = new THREE.Vector3(0, 1, 0).addScaledVector(back, -back.y).normalize(), right = new THREE.Vector3().crossVectors(up, back);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(back, up, right.clone().negate()));
    const ids = typeof location !== 'undefined' && /[?&]salmon\b/.test(location.search) ? ['salmon'] : FISH_IDS;      // (&salmon: the secret one alone)
    this.fish = ids.map((id, i) => {
      const f = new Fish(id, grade);
      f.root.quaternion.copy(q); f.root.position.copy(right.clone().multiplyScalar((i - 6.5) * 1.5)).add(new THREE.Vector3(0, 0.9, 0));
      this.group.add(f.root); return f;
      if (typeof location !== 'undefined' && /[?&]backdrop\b/.test(location.search)) {      // (&backdrop: plain cream behind them, for the cards' pictures)
      const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshBasicMaterial({ color: '#fffdf7' })); m.material.userData.noGrade = true;
      m.position.copy(back.clone().multiplyScalar(-0.7)).add(new THREE.Vector3(0, 0.9, 0)); m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, back)); this.group.add(m);
    }
  });
    if (typeof location !== 'undefined' && /[?&]backdrop\b/.test(location.search)) {      // (&backdrop: plain cream behind them, for the cards' pictures)
      const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshBasicMaterial({ color: '#fffdf7' })); m.material.userData.noGrade = true;
      m.position.copy(back.clone().multiplyScalar(-0.7)).add(new THREE.Vector3(0, 0.9, 0)); m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, back)); this.group.add(m);
    }
  }
  update(dt) { for (const f of this.fish) f.update(dt); }
  // where fish i is (to frame a picture of it)
  at(i) { return this.fish[i].root.getWorldPosition(new THREE.Vector3()); }
}

// Feather & Field: the flock in 3D. Every breed as hens, roosters and chicks, the 11 Silkie colours, and bones that move.
// The models (flock.glb, from stylized/export_birds.py) carry a paint region per vertex: plumage is painted here, so one
// Silkie model wears any colour, and one chick model is every breed's chick. Each bird is one draw (a skinned mesh).
import * as THREE from 'three';

export const BREEDS = ['rir', 'orp', 'leg', 'bra', 'sil'];
export const SILKIE = ['white', 'black', 'blue', 'buff', 'partridge', 'grey', 'splash', 'cuckoo', 'red', 'paint', 'lavender'];
export const BREED_NAMES = { rir: 'Rhode Island Red', orp: 'Buff Orpington', leg: 'Cream Legbar', bra: 'Light Brahma', sil: 'Silkie' };
const R = { keep: 0, body: 1, wing: 2, prim: 3, tail: 4, crest: 5, legfeather: 6, down: 7, cwing: 8, cleg: 9, cbeak: 10 };
const JOINTS = ['root', 'body', 'head', 'wingL', 'wingR', 'tail', 'legL', 'legR'];
const PARENT = { root: null, body: 'root', head: 'body', wingL: 'body', wingR: 'body', tail: 'body', legL: 'root', legR: 'root' };

// ------------------------------------------------------------------ colours (sRGB, as a painter would mix them)
// body: main plumage; top: lighter back; hackle: neck feathers; head; saddle: a rooster's back by the tail; breast;
// wing, prim (flight feathers), tail, crest, legfeather. pattern: bars (barring), stripes (a Brahma's striped hackle),
// splash, paint, pencil (partridge), cuckoo.
const ADULT = {
  rir_h: { body: '#8a3517', top: '#a3461f', hackle: '#b1552a', head: '#9a4220', wing: '#7a2c14', prim: '#3a180c', tail: '#2a1a13' },
  rir_r: { body: '#73230f', top: '#952f12', hackle: '#d06b2b', saddle: '#c55b24', head: '#b04d1f', wing: '#922f12', prim: '#211d18', tail: '#15120f' },
  orp_h: { body: '#dc9f48', top: '#e9b562', hackle: '#e8b25a', head: '#e1a84f', wing: '#d49744', prim: '#c9903f', tail: '#dba450' },
  orp_r: { body: '#d4923b', top: '#e3a850', hackle: '#ecb65c', saddle: '#e9b058', head: '#e4a64d', wing: '#cf8b36', prim: '#c08234', tail: '#c98637' },
  leg_h: { body: '#b1ab9e', bars: '#857f74', breast: '#c98f6c', hackle: '#e2d9c4', head: '#dad1bb', crest: '#d7cdb6', wing: '#a8a194', prim: '#888276', tail: '#c7c0b0', pattern: 'bars' },
  leg_r: { body: '#bab4a7', bars: '#8a857a', hackle: '#efe3c0', saddle: '#ebdfbb', head: '#eee2c3', crest: '#e9ddbb', wing: '#b2ac9e', prim: '#8e887c', tail: '#e1dccf', pattern: 'bars' },
  bra_h: { body: '#f0ece3', top: '#f4f1ea', hackle: '#f2eee6', stripe: '#29292c', head: '#f4f0e8', wing: '#ece7dd', prim: '#7d7d82', tail: '#1c1b1b', legfeather: '#ece8df', pattern: 'stripes' },
  bra_r: { body: '#f0ece3', top: '#f4f1ea', hackle: '#f2eee6', stripe: '#29292c', saddle: '#f2eee6', head: '#f4f0e8', wing: '#ece7dd', prim: '#5a5a5f', tail: '#1a1919', legfeather: '#ece8df', pattern: 'stripes' },
};
const SIL = {
  white: { body: '#f5f2eb' },
  black: { body: '#2c2c36', top: '#3b3b47' },
  blue: { body: '#7e8aa0', top: '#8d98ad' },
  buff: { body: '#e3bb6f', top: '#ecc983', hackle: '#ebc77f' },
  partridge: { body: '#8c5b35', top: '#9a6a40', dark: '#5a3920', hackle: '#c99a56', head: '#b8874c', crest: '#a87a46', pattern: 'pencil',
               rooster: { body: '#2b2420', top: '#33291f', hackle: '#d08b3b', saddle: '#c87c32', head: '#cf8a3a', crest: '#b8742e', wing: '#a4592a', prim: '#2b2420', tail: '#2b2420', pattern: null } },
  grey: { body: '#a6a8a7', top: '#b3b5b4' },
  splash: { body: '#efede8', spot: '#7a879b', pattern: 'splash' },
  cuckoo: { body: '#b1b3b6', bars: '#5d6067', pattern: 'cuckoo' },
  red: { body: '#b1501f', top: '#c4622a', hackle: '#c8662b' },
  paint: { body: '#f5f2eb', spot: '#26252b', pattern: 'paint' },
  lavender: { body: '#b8b2c5', top: '#c3bdd0' },
};
const CHICK = {
  rir: { down: '#c7843d', top: '#b06d2d', face: '#e2aa5c', wing: '#b67535' },
  orp: { down: '#f1d06a', top: '#ebc65b', face: '#f6dc84', wing: '#e6c25a', leg: '#e8c2ad', beak: '#e8c49a' },
  leg: { down: '#b88f60', top: '#a37b4e', face: '#e3cd9e', wing: '#9f794f', stripe: '#5a3e25', pattern: 'chipmunk' },
  bra: { down: '#f0e8cc', top: '#e8e0c4', face: '#f5efd9', wing: '#d6d2c6' },
};
const SIL_CHICK = {
  white: { down: '#f6f3e6' }, black: { down: '#33333b', face: '#45454f' }, blue: { down: '#8792a5' }, buff: { down: '#efd38a' },
  partridge: { down: '#a8784a', stripe: '#5f4027', face: '#d0a874', pattern: 'chipmunk' }, grey: { down: '#b0b2b0' },
  splash: { down: '#ebe9e3', spot: '#8a96a8', pattern: 'splash' }, cuckoo: { down: '#8e9095', spot: '#d8d8d4', pattern: 'splash' },
  red: { down: '#c56a33' }, paint: { down: '#f4f1e8', spot: '#2a2a30', pattern: 'paint' }, lavender: { down: '#c1bbcb' },
};
const LEG = { rir: '#efbd3c', orp: '#ecc6b2', leg: '#e9bd45', bra: '#efc24a', sil: '#5c5868' };

// ------------------------------------------------------------------ a little value noise for patterns (splashes, spots, mottling)
function hash(x, y, z) { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
           L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const colourCache = {};
function lin(hex) { return colourCache[hex] || (colourCache[hex] = new THREE.Color(hex)); }      // three.js turns sRGB into linear

// ------------------------------------------------------------------ models
let MODELS = null;
export function initFlock(gltf, json) {
  MODELS = {};
  for (const child of gltf.scene.children) {
    let mesh = null; child.traverse(c => { if (c.isMesh && !mesh) mesh = c; });
    if (!mesh) continue;
    const geo = mesh.geometry;
    geo.computeBoundingBox();
    MODELS[child.name] = { geo, piv: json.models[child.name], top: geo.boundingBox.max.y, painted: {} };
  }
}

// the colour of one vertex of a grown bird
function adultColour(S, rooster, reg, x, y, z, hw, top, out, nb, hc) {
  const key = reg === R.wing ? 'wing' : reg === R.prim ? 'prim' : reg === R.tail ? 'tail' : reg === R.crest ? 'crest' : reg === R.legfeather ? 'legfeather' : 'body';
  let c = S[key] || S.body;
  const h = y / top;                                                      // 0 at the feet, 1 at the top of the head or tail
  if (key === 'body') {
    if (hw > 0.97) c = S.head || S.hackle || S.body;
    else if (hw > 0.04) c = S.hackle || S.body;
    else if (rooster && S.saddle && z < -0.06 * top / 0.5 && h > 0.5) c = S.saddle;
    else if (S.breast && z > 0.03 && h < 0.62 && h > 0.2) c = S.breast;
    else if (S.top && h > 0.55) c = S.top;
  }
  out.copy(lin(c));
  const n = noise(x * 60, y * 60, z * 60);
  switch (S.pattern) {
    case 'bars': if (key !== 'crest' && !(key === 'body' && (hw > 0.04 || c === S.breast))) {
      const b = Math.sin((y + 0.012 * Math.sin(x * 40 + z * 30)) * 2 * Math.PI / 0.03);
      out.lerp(lin(S.bars), smooth(0.2, 0.7, b) * 0.85);
    } break;
    case 'cuckoo': { const b = Math.sin((y + 0.01 * Math.sin(x * 35 + z * 25)) * 2 * Math.PI / 0.034); out.lerp(lin(S.bars), smooth(0.0, 0.8, b) * 0.75); } break;
    case 'stripes': if (key === 'body' && hw < 0.97) {                           // a Brahma's cape: black feathers edged in white, round the neck
      const k = top / 0.55, mx = (nb[0] + hc[0]) / 2, my = (nb[1] + hc[1]) / 2 - 0.01, mz = (nb[2] + hc[2]) / 2;
      const d = Math.hypot(x - mx, (y - my) * 0.75, z - mz) / k, cape = 1 - smooth(0.075, 0.12, d);
      if (cape > 0) { const a = Math.atan2(x, z - mz); out.lerp(lin(S.stripe), (0.72 + 0.25 * Math.sin(a * 6 + y * 25)) * cape); }
      else if (rooster && c === S.saddle) { const a = Math.atan2(x, -z); out.lerp(lin(S.stripe), smooth(0.4, 0.8, Math.sin(a * 16)) * 0.6); }
    } break;
    case 'splash': { const m = noise(x * 22 + 3, y * 22, z * 22); out.lerp(lin(S.spot), smooth(0.56, 0.66, m) * 0.9); } break;
    case 'paint': { const m = noise(x * 14 + 7, y * 14, z * 14 + 2); out.lerp(lin(S.spot), smooth(0.58, 0.64, m)); } break;
    case 'pencil': if (!(key === 'body' && hw > 0.04)) { const m = noise(x * 90, y * 90, z * 90); out.lerp(lin(S.dark), smooth(0.45, 0.75, m) * 0.7); } break;
  }
  const shade = 0.84 + 0.16 * smooth(0.15, 0.6, h) + (n - 0.5) * 0.07;      // a touch darker underneath, soft feather texture
  return out.multiplyScalar(shade);
}

function chickColour(S, legHex, beakHex, reg, x, y, z, hw, top, out) {
  if (reg === R.cleg) return out.copy(lin(legHex));
  if (reg === R.cbeak) return out.copy(lin(beakHex));
  const h = y / top;
  let c = reg === R.cwing ? (S.wing || S.down) : (hw > 0.5 && z > 0.035 && S.face ? S.face : h > 0.6 && S.top ? S.top : S.down);
  out.copy(lin(c));
  if (S.pattern === 'chipmunk' && reg !== R.cwing) {           // dark stripes down the back and through the eye
    const back = smooth(0.45, 0.7, h) * smooth(0.02, -0.03, z);
    const st = Math.max(smooth(0.006, 0.0, Math.abs(x)), smooth(0.005, 0.0, Math.abs(Math.abs(x) - 0.022)));
    out.lerp(lin(S.stripe), back * st * 0.9);
    if (hw > 0.5) out.lerp(lin(S.stripe), smooth(0.006, 0.0, Math.abs(y - 0.13)) * smooth(0.01, 0.025, Math.abs(x)) * 0.7);
  }
  if (S.pattern === 'splash' || S.pattern === 'paint') { const m = noise(x * 50 + 3, y * 50, z * 50); out.lerp(lin(S.spot), smooth(0.58, 0.66, m) * 0.9); }
  const n = noise(x * 120, y * 120, z * 120);
  return out.multiplyScalar(0.86 + 0.14 * smooth(0.2, 0.7, h) + (n - 0.5) * 0.06);
}

// the geometry of one model in one breed's (or Silkie colour's) paint; shared by every bird that looks the same
export function paintedGeometry(model, breed, colour) {
  const M = MODELS[model];
  const key = breed + '/' + (colour || '');
  if (M.painted[key]) return M.painted[key];
  const src = M.geo, n = src.attributes.position.count;
  const pos = src.attributes.position.array, base = src.attributes.color, paint = src.attributes._paint;
  const si = src.attributes.skinIndex, sw = src.attributes.skinWeight;
  const col = new Float32Array(n * 3), c = new THREE.Color();
  const base_ = model.replace(/_lo$/, ''), rooster = base_.endsWith('_r'), chick = base_ === 'chick';
  let S;
  if (chick) S = breed === 'sil' ? Object.assign({}, SIL_CHICK[colour] || SIL_CHICK.white) : CHICK[breed];
  else if (breed === 'sil') { const s = SIL[colour] || SIL.white; S = rooster && s.rooster ? Object.assign({}, s, s.rooster) : s; }
  else S = ADULT[base_];
  const legHex = (chick && S.leg) || (breed === 'sil' ? '#55505c' : chick ? '#f0be42' : LEG[breed]);
  const beakHex = (chick && S.beak) || (breed === 'sil' ? '#757688' : '#e9b24c');
  const k = base.normalized ? 1 / 255 : 1;
  for (let i = 0; i < n; i++) {
    const reg = paint ? paint.array[i] : 0;
    if (!reg) { c.setRGB(base.array[i * 4] * k, base.array[i * 4 + 1] * k, base.array[i * 4 + 2] * k); }
    else {
      let hw = 0;
      for (let j = 0; j < 4; j++) if (si.array[i * 4 + j] === 2) hw += sw.array[i * 4 + j] / (sw.normalized ? 255 : 1);
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (chick) chickColour(S, legHex, beakHex, reg, x, y, z, hw, M.top, c);
      else adultColour(S, rooster, reg, x, y, z, hw, M.top, c, M.piv.head, M.piv.headc || M.piv.head);
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  for (const a of ['position', 'normal', 'skinIndex', 'skinWeight']) g.setAttribute(a, src.attributes[a]);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(src.index);
  g.boundingBox = src.boundingBox; g.computeBoundingSphere();
  return (M.painted[key] = g);
}

// ------------------------------------------------------------------ a bird's body: a skinned mesh with eight bones
const BIRD_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
export function modelFor(breed, kind) { return kind === 'chick' ? 'chick' : breed + (kind === 'rooster' ? '_r' : '_h'); }

const RIGS = [];
let far = false;
// zoomed far out, every bird wears its light version (a third of the triangles)
export function setFar(on) {
  if (on === far) return;
  far = on;
  for (const r of RIGS) if (r.lo) { r.mesh.visible = !far; r.lo.visible = far; }
}

export class Rig {
  constructor(breed, kind, colour) {
    this.model = modelFor(breed, kind);
    const M = MODELS[this.model], P = M.piv;
    this.mesh = new THREE.SkinnedMesh(paintedGeometry(this.model, breed, colour), BIRD_MAT);
    this.mesh.receiveShadow = true;
    this.lo = MODELS[this.model + '_lo'] ? new THREE.SkinnedMesh(paintedGeometry(this.model + '_lo', breed, colour), BIRD_MAT) : null;
    this.bones = {}; this.rest = {};
    const list = JOINTS.map(name => {
      const b = new THREE.Bone(); b.name = name;
      const p = P[name] || P.root, q = PARENT[name] ? (P[PARENT[name]] || P.root) : [0, 0, 0];
      b.position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      this.bones[name] = b; this.rest[name] = b.position.clone();
      return b;
    });
    for (const name of JOINTS) if (PARENT[name]) this.bones[PARENT[name]].add(this.bones[name]);
    this.mesh.add(this.bones.root);
    this.mesh.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(list);
    this.mesh.bind(skeleton);
    if (this.lo) {                         // the light version moves with the same bones
      this.lo.updateMatrixWorld(true); this.lo.bind(skeleton, this.lo.matrixWorld);
      this.lo.receiveShadow = true; this.lo.userData.moves = true;
      this.mesh.visible = !far; this.lo.visible = far;
    }
    RIGS.push(this);
    this.shank = (P.legL ? P.legL[1] : 0.1);
    this.scale = M.top;
    for (const b of list) b.userData.moves = true;
    this.mesh.userData.moves = true;
  }
  // pose: walk (phase, amount), peck 0..1, look (yaw, tilt), flap 0..1 (+ beat), crow 0..1, sit 0..1, kick 0..1 (scratching, one leg), hop
  pose(s) {
    const B = this.bones, Rr = this.rest, w = s.walk, ph = s.phase;
    const body = B.body, head = B.head;
    body.position.copy(Rr.body); head.position.copy(Rr.head);
    const bob = w * Math.abs(Math.sin(ph)) * 0.01;
    body.position.y += bob - s.sit * this.shank * 0.85;
    body.rotation.set(0.38 * s.peck - 0.28 * s.crow + 0.12 * s.kick + 0.05 * s.sit, 0, w * Math.sin(ph) * 0.07);
    head.rotation.set(0.95 * s.peck - 0.55 * s.crow + 0.1 * s.sit, s.lookYaw * (1 - s.peck), s.lookTilt * (1 - s.peck) + s.crow * 0.06 * Math.sin(s.t * 40));
    head.position.z += w * Math.sin(ph * 2) * 0.012 * this.scale / 0.5;
    const f = s.flap * (0.55 + 0.45 * Math.sin(s.t * 28)) * 1.25 + s.crow * 0.15;
    B.wingL.rotation.set(0, 0, f + s.sit * 0.05); B.wingR.rotation.set(0, 0, -f - s.sit * 0.05);
    B.tail.rotation.set(0.25 * s.crow + 0.08 * Math.sin(s.t * 1.3) * (1 - w), 0.12 * Math.sin(s.t * 9) * s.wag, 0);
    const A = 0.5 * w, lift = 0.014 * this.scale / 0.5;
    const kick = s.kick > 0 ? Math.max(0, Math.sin(s.kickT * 14)) : 0;
    B.legL.rotation.set(A * Math.sin(ph) + (s.kickLeg === 0 ? 1.0 * kick * s.kick : 0) - 1.25 * s.sit, 0, 0);
    B.legR.rotation.set(-A * Math.sin(ph) + (s.kickLeg === 1 ? 1.0 * kick * s.kick : 0) - 1.25 * s.sit, 0, 0);
    B.legL.position.copy(Rr.legL); B.legR.position.copy(Rr.legR);
    B.legL.position.y += w * lift * Math.max(0, -Math.cos(ph)) + (s.kickLeg === 0 ? kick * s.kick * lift : 0) - s.sit * this.shank * 0.35;
    B.legR.position.y += w * lift * Math.max(0, Math.cos(ph)) + (s.kickLeg === 1 ? kick * s.kick * lift : 0) - s.sit * this.shank * 0.35;
  }
}

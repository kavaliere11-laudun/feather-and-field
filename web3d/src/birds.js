// Feather & Field: the flock in 3D. Every breed as hens, roosters and chicks, the 11 Silkie colours, and bones that move.
// The models (flock.glb, from stylized/export_birds.py) carry a paint region per vertex: plumage is painted here, so one
// Silkie model wears any colour, and one chick model is every breed's chick. Each bird is one draw (a skinned mesh).
import * as THREE from 'three';

export const BREEDS = ['rir', 'orp', 'leg', 'bra', 'sil'];
export const SILKIE = ['white', 'black', 'blue', 'buff', 'partridge', 'grey', 'splash', 'cuckoo', 'red', 'paint', 'lavender'];
export const BREED_NAMES = { rir: 'Rhode Island Red', orp: 'Buff Orpington', leg: 'Cream Legbar', bra: 'Light Brahma', sil: 'Silkie' };
const R = { keep: 0, body: 1, wing: 2, prim: 3, tail: 4, crest: 5, legfeather: 6, down: 7, cwing: 8, cleg: 9, cbeak: 10, saddle: 11 };
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

// a pattern drawn on each feather (by the shader), chosen per vertex: 0 none, 1 bars across the feather, 2 a dark centre with light
// edges (a Brahma's cape), 4 darker towards the feather's base, where the next feather overlaps it
const FEAT = { c: new THREE.Color(), mode: 0, amt: 0 };
// the colour of one vertex of a grown bird
function adultColour(S, rooster, reg, x, y, z, hw, top, out, nb, hc) {
  const key = reg === R.wing ? 'wing' : reg === R.prim ? 'prim' : reg === R.tail ? 'tail' : reg === R.crest ? 'crest' : reg === R.legfeather ? 'legfeather' : reg === R.saddle ? 'saddle' : 'body';
  let c = key === 'saddle' ? S.saddle || S.hackle || S.body : S[key] || S.body;
  const h = y / top;                                                      // 0 at the feet, 1 at the top of the head or tail
  if (key === 'body') {
    if (hw > 0.97) c = S.head || S.hackle || S.body;
    else if (hw > 0.04) c = S.hackle || S.body;
    else if (rooster && S.saddle && z < -0.06 * top / 0.5 && h > 0.5) c = S.saddle;
    else if (S.breast && z > 0.03 && h < 0.62 && h > 0.2) c = S.breast;
    else if (S.top && h > 0.55) c = S.top;
  }
  out.copy(lin(c));
  const lum = 0.2126 * out.r + 0.7152 * out.g + 0.0722 * out.b;
  FEAT.mode = 4; FEAT.amt = lum > 0.5 ? 0.14 : 0.3; FEAT.c.copy(out).multiplyScalar(0.55);      // light plumage: only a hint
  const n = noise(x * 60, y * 60, z * 60);
  if (key === 'tail' || key === 'saddle' || key === 'prim') {      // long glossy feathers: a sheen (green-black on dark tails, as in life)
    FEAT.mode = 5; FEAT.c.copy(lum < 0.06 ? lin('#2f7d58') : lum < 0.35 ? lin('#ffcf7a') : lin('#ffffff')); FEAT.amt = lum < 0.06 ? 0.3 : lum < 0.35 ? 0.16 : 0.1;
    if (S.pattern === 'stripes' && key === 'saddle') out.lerp(lin(S.stripe), smooth(0.3, 0.8, Math.sin(Math.atan2(x, -z) * 22)) * 0.75);
  }
  switch (S.pattern) {
    case 'bars': if (key !== 'crest' && !(key === 'body' && c === S.breast)) {          // barred feathers (a light trace on the vertices for far views)
      const hackle = key === 'body' && hw > 0.04;
      FEAT.mode = 1; FEAT.c.copy(lin(S.bars)); FEAT.amt = hackle ? 0.35 : 0.85;
      if (!hackle) { const b = Math.sin((y + 0.012 * Math.sin(x * 40 + z * 30)) * 2 * Math.PI / 0.03); out.lerp(lin(S.bars), smooth(0.2, 0.7, b) * 0.2); }
    } break;
    case 'cuckoo': { const b = Math.sin((y + 0.01 * Math.sin(x * 35 + z * 25)) * 2 * Math.PI / 0.034); out.lerp(lin(S.bars), smooth(0.0, 0.8, b) * 0.75); } break;
    case 'stripes': if (key === 'body' && hw < 0.97) {                           // a Brahma's cape: black feathers edged in white, round the neck
      const k = top / 0.55, mx = (nb[0] + hc[0]) / 2, my = (nb[1] + hc[1]) / 2 - 0.01, mz = (nb[2] + hc[2]) / 2;
      const d = Math.hypot(x - mx, (y - my) * 0.75, z - mz) / k, cape = 1 - smooth(0.075, 0.12, d);
      if (cape > 0) { out.lerp(lin(S.stripe), 0.3 * cape); FEAT.mode = 2; FEAT.c.copy(lin(S.stripe)); FEAT.amt = Math.min(1, cape * 1.3); }
      else if (rooster && c === S.saddle) { FEAT.mode = 2; FEAT.c.copy(lin(S.stripe)); FEAT.amt = 0.4; }
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

// the eyes, for shutting them in sleep: each vertex of an eyeball, pupil or catch-light (unpainted, on the head, amber, black or
// white) gets its eye's centre (x, y, z) and 1 (an amber eye in a ring of lid) or 2 (a bead eye); the rest 0. Asleep, an amber
// eye becomes a small dome of red lid inside the ring, and a bead eye sinks into the head: shut eyes
function eyeSpots(src, base, k, paint, si, sw) {
  const n = src.attributes.position.count, pos = src.attributes.position.array, out = new Float32Array(n * 4);
  const kind = new Int8Array(n), sum = { 1: [0, 0, 0, 0], [-1]: [0, 0, 0, 0] }, dark = { 1: [0, 0, 0, 0], [-1]: [0, 0, 0, 0] };
  const cs = base.itemSize;
  for (let i = 0; i < n; i++) {
    if (paint && paint.array[i]) continue;
    let hw = 0;
    for (let j = 0; j < 4; j++) if (si.array[i * 4 + j] === 2) hw += sw.array[i * 4 + j] / (sw.normalized ? 255 : 1);
    if (hw < 0.8) continue;
    const r = base.array[i * cs] * k, gg = base.array[i * cs + 1] * k, b = base.array[i * cs + 2] * k;
    const hi = Math.max(r, gg, b), lo = Math.min(r, gg, b);
    const t = hi < 0.02 ? 2 : lo > 0.75 ? 3 : (r > 0.3 && gg / r > 0.2 && gg / r < 0.45 && b / r < 0.12) ? 1 : 0;     // pupil, glint, iris
    if (!t) continue;
    kind[i] = t;
    const sd = pos[i * 3] >= 0 ? 1 : -1, acc = t === 1 ? sum[sd] : dark[sd];
    acc[0] += pos[i * 3]; acc[1] += pos[i * 3 + 1]; acc[2] += pos[i * 3 + 2]; acc[3]++;
  }
  for (let i = 0; i < n; i++) {
    if (!kind[i]) continue;
    const sd = pos[i * 3] >= 0 ? 1 : -1, c = sum[sd][3] ? sum[sd] : dark[sd];        // the eyeball's middle (bead eyes: the bead's)
    if (!c[3]) continue;
    out[i * 4] = c[0] / c[3]; out[i * 4 + 1] = c[1] / c[3]; out[i * 4 + 2] = c[2] / c[3]; out[i * 4 + 3] = sum[sd][3] ? 1 : 2;
  }
  return out;
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
  const fpat = new Float32Array(n * 4), fmode = new Float32Array(n), feathered = !chick && breed !== 'sil';
  for (let i = 0; i < n; i++) {
    const reg = paint ? paint.array[i] : 0;
    FEAT.mode = 0;
    if (!reg) { c.setRGB(base.array[i * 4] * k, base.array[i * 4 + 1] * k, base.array[i * 4 + 2] * k); }
    else {
      let hw = 0;
      for (let j = 0; j < 4; j++) if (si.array[i * 4 + j] === 2) hw += sw.array[i * 4 + j] / (sw.normalized ? 255 : 1);
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      if (chick) chickColour(S, legHex, beakHex, reg, x, y, z, hw, M.top, c);
      else adultColour(S, rooster, reg, x, y, z, hw, M.top, c, M.piv.head, M.piv.headc || M.piv.head);
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    if (feathered && FEAT.mode) { fpat[i * 4] = FEAT.c.r; fpat[i * 4 + 1] = FEAT.c.g; fpat[i * 4 + 2] = FEAT.c.b; fpat[i * 4 + 3] = FEAT.amt; fmode[i] = FEAT.mode; }
  }
  let g = new THREE.BufferGeometry();
  for (const a of ['position', 'normal', 'skinIndex', 'skinWeight']) g.setAttribute(a, src.attributes[a]);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // feather size (cm) per vertex for the scalloped feather texture (0: comb, beak, eyes, legs), and how much it belongs to the head
  const fs = new Float32Array(n), fh = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const reg = paint ? paint.array[i] : 0;
    let hw = 0;
    for (let j = 0; j < 4; j++) if (si.array[i * 4 + j] === 2) hw += sw.array[i * 4 + j] / (sw.normalized ? 255 : 1);
    fs[i] = chick || breed === 'sil' ? 0 : FEATHER[reg] || 0; fh[i] = hw;      // Silkies and chicks are all fluff
  }
  g.setAttribute('featherSize', new THREE.BufferAttribute(fs, 1)); g.setAttribute('featherHead', new THREE.BufferAttribute(fh, 1));
  g.setAttribute('featherPattern', new THREE.BufferAttribute(fpat, 4)); g.setAttribute('featherMode', new THREE.BufferAttribute(fmode, 1));
  // featherUV: across and along each modelled feather (tail, sickles, flight feathers, crest; 0 elsewhere), and for the folded
  // wing how far back along it (0.02 at the shoulder .. 1 at the back, 0 off the wing), for its rows of feathers
  const fuv = new Float32Array(n * 3), F = src.attributes._feat;
  if (F) for (let i = 0; i < n; i++) { fuv[i * 3] = F.getX(i); fuv[i * 3 + 1] = F.getY(i); }
  if (!chick && breed !== 'sil' && paint) {
    let z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < n; i++) if (paint.array[i] === R.wing) { z0 = Math.min(z0, pos[i * 3 + 2]); z1 = Math.max(z1, pos[i * 3 + 2]); }
    for (let i = 0; i < n; i++) if (paint.array[i] === R.wing) fuv[i * 3 + 2] = 0.02 + 0.98 * (z1 - pos[i * 3 + 2]) / Math.max(1e-4, z1 - z0);
  }
  g.setAttribute('featherUV', new THREE.BufferAttribute(fuv, 3));
  g.setAttribute('eyeAt', new THREE.BufferAttribute(eyeSpots(src, base, k, paint, si, sw), 4));
  g.setIndex(src.index);
  g.boundingBox = src.boundingBox; g.computeBoundingSphere();
  const fur = furOf(model, breed);
  if (fur) g = addFur(g, src, fur, M.piv.headc);
  return (M.painted[key] = g);
}

// ------------------------------------------------------------------ fur and fluff: the bird drawn again as stacked shells that grow outwards,
// each keeping only tiny dots, so together they make fine strands (Silkies get long hair-like fluff, chicks soft down)
// hair length (metres) per paint region, and how many shells
const FUR = {
  // clump: strands gather into tufts towards their tips; fine: thinner, denser strands; wave: a gentle curl
  // Silkies: long hair standing out (shorter round the face, so it stays clear)
  sil: { len: { [R.body]: 0.062, [R.crest]: 0.06, [R.tail]: 0.066, [R.wing]: 0.05, [R.prim]: 0.05, [R.legfeather]: 0.032 }, shells: 26, droop: 0.35,
         clump: 0.6, fine: 1.0, wave: 1.2, comb: 0.5, locks: 0.12, face: 0.7, under: 0.35 },
  chick: { len: { [R.down]: 0.009, [R.cwing]: 0.006 }, shells: 8, droop: 0.1, clump: 0.25, fine: 1.1, wave: 0.4, locks: 0.035 },
  // the other breeds: a short soft layer combed back over the feathers, so they look feathery rather than smooth
  // (thinner than before, and less extra fluff underneath, so the feathers show clearly and the birds look less bulky)
  // (a slight fluff over the feathers, from the same painted hair as the Silkies but short and fine (fluff: the tile's size,
  // 6 cm): short over the body, longer underneath and round the thighs, wispy at the outline; Orpingtons fluffiest)
  hen: { len: { [R.body]: 0.016, [R.wing]: 0.009, [R.crest]: 0.008, [R.legfeather]: 0.016 }, shells: 5, comb: 0.9, fine: 1.25, under: 1.5, fluff: 0.06 },
  orp: { len: { [R.body]: 0.022, [R.wing]: 0.011, [R.legfeather]: 0.016 }, shells: 6, comb: 0.75, fine: 1.15, under: 1.8, fluff: 0.06 },
};
const FEATHER = { [R.body]: 3.1, [R.wing]: 2.4, [R.crest]: 1.3, [R.legfeather]: 1.3 };     // feather widths, cm (flight and tail feathers are modelled)
const furOf = (model, breed) => model.startsWith('chick') ? FUR.chick : breed === 'sil' ? FUR.sil : breed === 'orp' ? FUR.orp : FUR.hen;

function addFur(g, src, spec, headc) {
  const n = src.attributes.position.count, paint = src.attributes._paint.array, idx = src.index.array;
  const len = new Float32Array(n);
  const top = g.boundingBox.max.y, Pp = src.attributes.position.array;
  for (let i = 0; i < n; i++) {
    len[i] = spec.len[paint[i]] || 0;
    if (spec.comb && paint[i] === R.body) len[i] *= 1 + (spec.under ?? 0.9) * (1 - smooth(0.2, 0.42, Pp[i * 3 + 1] / top));    // soft fluff underneath and round the thighs
    if (spec.face && headc && (paint[i] === R.body || paint[i] === R.crest)) {        // short hair round the face, so it stays clear
      const d = Math.hypot(Pp[i * 3] - headc[0], Pp[i * 3 + 1] - headc[1] + 0.004, Pp[i * 3 + 2] - headc[2] - 0.022);
      len[i] *= 1 - spec.face * (1 - smooth(0.03, 0.075, d));
    }
  }
  const furTris = [];
  for (let t = 0; t < idx.length; t += 3) if (len[idx[t]] > 0 && len[idx[t + 1]] > 0 && len[idx[t + 2]] > 0) furTris.push(idx[t], idx[t + 1], idx[t + 2]);
  const map = new Int32Array(n).fill(-1), furVerts = [];
  for (const v of furTris) if (map[v] < 0) { map[v] = furVerts.length; furVerts.push(v); }
  const K = spec.shells, m = furVerts.length, total = n + K * m;
  const A = name => g.attributes[name];
  const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), col = new Float32Array(total * 3);
  const si = new Uint8Array(total * 4), sw = new Uint8Array(total * 4), furT = new Float32Array(total), furLen = new Float32Array(total);
  const fs = new Float32Array(total), fh = new Float32Array(total), comb = new Float32Array(total).fill(spec.comb || 0);
  const style = new Float32Array(total * 4);
  for (let i = 0; i < total; i++) { style[i * 4] = spec.clump || 0; style[i * 4 + 1] = spec.fine || 1; style[i * 4 + 2] = spec.fluff ? -spec.fluff : spec.wave || 0; style[i * 4 + 3] = len[i % n] > 0 ? spec.tex || 0 : 0; }
  const P = A('position').array, N = A('normal').array, Cc = A('color').array, SI = A('skinIndex').array, SW = A('skinWeight').array;
  const FS = A('featherSize').array, FH = A('featherHead').array, FP = A('featherPattern').array, FM = A('featherMode').array, FU = A('featherUV').array;
  const fp = new Float32Array(total * 4), fm = new Float32Array(total), fu = new Float32Array(total * 3);
  const EA = A('eyeAt').array, ea = new Float32Array(total * 4);
  const copy = (dst, from) => {
    pos.set(P.subarray(from * 3, from * 3 + 3), dst * 3); nrm.set(N.subarray(from * 3, from * 3 + 3), dst * 3); col.set(Cc.subarray(from * 3, from * 3 + 3), dst * 3);
    si.set(SI.subarray(from * 4, from * 4 + 4), dst * 4); sw.set(SW.subarray(from * 4, from * 4 + 4), dst * 4); furLen[dst] = len[from];
    fs[dst] = FS[from]; fh[dst] = FH[from]; fp.set(FP.subarray(from * 4, from * 4 + 4), dst * 4); fm[dst] = FM[from];
    fu.set(FU.subarray(from * 3, from * 3 + 3), dst * 3); ea.set(EA.subarray(from * 4, from * 4 + 4), dst * 4);
  };
  for (let i = 0; i < n; i++) copy(i, i);
  for (let k = 1; k <= K; k++) for (let j = 0; j < m; j++) { const d = n + (k - 1) * m + j; copy(d, furVerts[j]); furT[d] = k / K; }
  // painted hair: tex (chicks) only shades the down; locks (Silkies) also shapes the fluff layers (a negative size marks it)
  for (let i = 0; i < total; i++) style[i * 4 + 3] = furLen[i] > 0 ? (spec.locks ? -spec.locks : spec.tex || 0) : 0;
  const index = new (total > 65535 ? Uint32Array : Uint16Array)(idx.length + K * furTris.length);
  index.set(idx, 0);
  for (let k = 1; k <= K; k++) for (let t = 0; t < furTris.length; t++) index[idx.length + (k - 1) * furTris.length + t] = n + (k - 1) * m + map[furTris[t]];
  const f = new THREE.BufferGeometry();
  f.setAttribute('position', new THREE.BufferAttribute(pos, 3)); f.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  f.setAttribute('color', new THREE.BufferAttribute(col, 3));
  f.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); f.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4, true));
  f.setAttribute('furT', new THREE.BufferAttribute(furT, 1)); f.setAttribute('furLen', new THREE.BufferAttribute(furLen, 1));
  f.setAttribute('featherSize', new THREE.BufferAttribute(fs, 1)); f.setAttribute('featherHead', new THREE.BufferAttribute(fh, 1));
  f.setAttribute('furComb', new THREE.BufferAttribute(comb, 1)); f.setAttribute('furStyle', new THREE.BufferAttribute(style, 4));
  f.setAttribute('featherPattern', new THREE.BufferAttribute(fp, 4)); f.setAttribute('featherMode', new THREE.BufferAttribute(fm, 1));
  f.setAttribute('featherUV', new THREE.BufferAttribute(fu, 3)); f.setAttribute('eyeAt', new THREE.BufferAttribute(ea, 4));
  f.setIndex(new THREE.BufferAttribute(index, 1));
  f.boundingBox = g.boundingBox; f.computeBoundingSphere(); f.boundingSphere.radius += 0.04;
  f.userData.fur = { base: idx.length, shell: furTris.length, shells: K, droop: spec.droop };
  FURRY.push(f); showShells(f);
  return f;
}

// how fine the strands are and how many shells are drawn, from how big a bird is on screen (fewer when zoomed out)
const FURRY = [];
// soft strand edges: blended by the graphics chip's antialiasing (alpha to coverage) instead of cut hard. Only with antialiasing
// on (the best two quality levels); ?hard turns it off to compare
let soft = false;
export function setSoftFur(on) {
  soft = !!on && !(typeof location !== 'undefined' && /[?&]hard\b/.test(location.search));
  BIRD_MAT.alphaToCoverage = soft; BIRD_MAT.defines = soft ? { SOFT_FUR: '' } : {}; furLook.cut.value = soft ? 0.04 : 0.45;
  BIRD_MAT.needsUpdate = true;
  for (const m of INDOOR) syncIndoor(m);
  syncSleep();
}
// a bird inside a house (a hen going in to lay) wears her own copy of the material, which shades whatever part of her is
// inside the house's box darker the deeper in it is: she goes into the shadow of the pop door, sits in the half light of the
// nest with her face at the window
const INDOOR = new Set();
// the page's own change to every material (the night colours): applied to the birds' material and to any made later
let materialHook = null;
export function setMaterialHook(f) { materialHook = f; f(BIRD_MAT); for (const m of INDOOR) f(m); if (SLEEP_MAT) f(SLEEP_MAT); }
// asleep (inside a coop at night): the same, with the eyes shut
let SLEEP_MAT = null;
function syncSleep() {
  if (!SLEEP_MAT) return;
  SLEEP_MAT.alphaToCoverage = BIRD_MAT.alphaToCoverage; SLEEP_MAT.defines = Object.assign({}, BIRD_MAT.defines, { EYES_SHUT: '' }); SLEEP_MAT.needsUpdate = true;
}
function syncIndoor(m) {
  m.alphaToCoverage = BIRD_MAT.alphaToCoverage; m.defines = Object.assign({}, BIRD_MAT.defines, { INDOOR: '' }); m.needsUpdate = true;
}
export const furLook = { density: { value: 150 }, cut: { value: 0.45 }, shown: 1, tex: { value: null }, span: { value: 1 } };
// real hair detail painted for Silkies and chicks (silkie_hair.jpg, a seamless tile from stylized/hair_paint.py)
export function setHairTexture(t) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; t.needsUpdate = true;
  furLook.tex.value = t;
}     // cut: how much of a strand's soft edge is kept
function showShells(f) { const u = f.userData.fur; f.setDrawRange(0, u.base + Math.max(Math.min(2, u.shells), Math.round(u.shells * furLook.shown)) * u.shell); }
export function setFurDetail(pixelsPerMetre, most = 1) {          // most: the quality level's limit (a struggling phone draws fewer)
  // strands at least a few screen pixels wide (thinner ones break into dots and shimmer), in a few fixed sizes so they don't
  // change while zooming
  const d = pixelsPerMetre > 600 ? 210 : pixelsPerMetre > 330 ? 150 : pixelsPerMetre > 180 ? 105 : 70;
  if (d !== furLook.density.value) furLook.density.value = d;
  // zoomed far out: fewer layers (at least 2), spread over the hair's length; fewest when the light models are worn
  const shown = Math.min(most, pixelsPerMetre > 330 ? 1 : pixelsPerMetre > 180 ? 0.5 : far ? 0.2 : 0.27);
  if (shown !== furLook.shown) { furLook.shown = shown; furLook.span.value = 1 / shown; for (const f of FURRY) showShells(f); }
}

// the birds' material: lit as before, with the shells' strands cut out of each layer and shaded darker towards the roots
function birdMaterial(indoor) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const inU = indoor ? { inMat: { value: new THREE.Matrix4() }, inLo: { value: new THREE.Vector3() }, inHi: { value: new THREE.Vector3() } } : null;
  m.userData.inU = inU;
  m.onBeforeCompile = sh => {
    sh.uniforms.furDensity = furLook.density; sh.uniforms.furCut = furLook.cut; sh.uniforms.hairTex = furLook.tex; sh.uniforms.furSpan = furLook.span;
    if (inU) Object.assign(sh.uniforms, inU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef EYES_SHUT\nif (eyeAt.w > 0.5 && dot(eyeAt.xyz, eyeAt.xyz) > 1e-8) transformed = mix(transformed, eyeAt.xyz, eyeAt.w > 1.5 ? 0.94 : 0.2);\n#endif')
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef EYES_SHUT\nif (eyeAt.w > 0.5 && eyeAt.w < 1.5 && dot(eyeAt.xyz, eyeAt.xyz) > 1e-8) vColor.rgb = vec3(0.42, 0.075, 0.055);\n#endif')
      .replace('#include <common>', '#include <common>\n#ifdef EYES_SHUT\nattribute vec4 eyeAt;\n#endif\nuniform float furSpan;\nattribute float furT;\nattribute float furLen;\nattribute float featherSize;\nattribute float featherHead;\nattribute float furComb;\nattribute vec4 furStyle;\nvarying vec4 vStyle;\nvarying vec3 vRestN;\nattribute vec4 featherPattern;\nattribute float featherMode;\nvarying vec4 vPat;\nvarying float vMode;\nvarying float vFur;\nvarying float vFurLen;\nvarying vec3 vRest;\nvarying float vFeather;\nvarying float vHead;\nvarying float vComb;\nattribute vec3 featherUV;\nvarying vec3 vFUV;\n#ifdef INDOOR\nvarying vec3 vWorldIn;\n#endif')
      .replace('#include <project_vertex>', '#include <project_vertex>\n#ifdef INDOOR\nvWorldIn = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#endif')
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>
        // painted hair (Silkies, chicks): when zoomed out and fewer layers are drawn, they are spread over the hair's full
        // length, so the far birds keep their fluffy outline
        float fT = (furStyle.w < 0.0 || furStyle.z < 0.0) ? min(1.0, furT * furSpan) : furT;
        vFUV = featherUV; vFur = fT; vFurLen = furLen; vRest = position; vFeather = featherSize; vHead = featherHead; vComb = furComb; vStyle = furStyle; vRestN = normal; vPat = featherPattern; vMode = featherMode;
        if (fT > 0.0) {
          vec3 nn = normalize(objectNormal), back = mix(vec3(0.0, -0.45, -1.0), vec3(0.0, -1.0, -0.2), smoothstep(0.1, 0.6, featherHead));
          transformed += nn * fT * furLen * (1.0 - 0.55 * furComb) + normalize(back) * fT * fT * furLen * 1.4 * furComb;
          transformed.y -= fT * fT * furLen * 0.35 * (1.0 - furComb);
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float furDensity; uniform float furCut; varying float vFur; varying float vFurLen; varying vec3 vRest; varying float vFeather; varying float vHead; varying float vComb; varying vec4 vStyle; varying vec3 vRestN; uniform sampler2D hairTex; varying vec4 vPat; varying float vMode;
        float fh13(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
        vec3 fh33(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
        varying vec3 vFUV;
        #ifdef INDOOR
        uniform mat4 inMat; uniform vec3 inLo; uniform vec3 inHi; varying vec3 vWorldIn;
        #endif
        // a feather's local coordinates from its centre in the lattice: x across, y along (its tip, the part that shows, at +y);
        // stretch < 1 makes it long for its width, point narrows it towards the tip
        vec2 featherLocal(vec2 pp, vec2 ce, float stretch, float point) {
          vec2 l = (pp - ce) * vec2(1.0, 1.2 * stretch) / 0.64;
          return vec2(l.x * (1.0 + point * max(l.y, 0.0)), l.y);
        }
        // a feather's barbs: the very thin hairs lying side by side that make up its vane. u runs across the barbs (one unit is
        // the whole feather); count is how many a real feather has over that. Each barb is a fine bright strand with a thin dark
        // gap to the next, a little lighter or darker than its neighbours. Barbs finer than about three screen pixels can't be
        // drawn, so the count drops by halves as the feather gets smaller on screen, blended like a picture's smaller copies:
        // the vane still reads as fine strands at the line-up zoom, and shows every barb close up. Returns -1 .. 1 (0 = none)
        float barbLine(float x, float seed) {
          float v = fract(x), n = floor(x);
          float strand = smoothstep(0.0, 0.3, v) * smoothstep(1.0, 0.62, v);
          return (strand - 0.5) * 2.0 * (0.75 + 0.5 * fract(sin(n * 12.9898 + seed * 78.233) * 43758.5453));
        }
        float barbs(float u, float count, float seed) {
          float px = 1.0 / max(fwidth(u), 1e-5);                  // screen pixels across one unit of u
          float want = clamp(px / 3.2, 1.0, count), lv = log2(want);
          float L = floor(lv), n1 = exp2(L), f = fract(lv);
          float b = mix(barbLine(u * n1, seed + L), barbLine(u * n1 * 2.0, seed + L + 1.0), smoothstep(0.2, 0.9, f));
          return b * smoothstep(3.0, 7.0, want);                   // too few to read as strands: none
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float furShade = 1.0;
        if (vStyle.w != 0.0) {
          // painted hair: the tile wrapped round the body from three sides (strands falling down the sides, back over the top);
          // red: how light the hair is, green: how far it stands out, blue: green squared
          vec3 pt = vRest / abs(vStyle.w), nw = pow(abs(normalize(vRestN)), vec3(4.0)); nw /= (nw.x + nw.y + nw.z);
          vec3 hair = texture2D(hairTex, vec2(pt.z, -pt.y), -1.0).rgb * nw.x + texture2D(hairTex, vec2(pt.x, -pt.z), -1.0).rgb * nw.y + texture2D(hairTex, vec2(pt.x, -pt.y), -1.0).rgb * nw.z;
          // how many of the tile's pixels fall in one screen pixel (the further away, the more the strands blur together)
          float tpp = max(length(fwidth(pt)) * 512.0, 1.0);
          if (vStyle.w < 0.0) {
            // Silkie hair: each fluff layer keeps the hair that reaches out that far, darker deeper in
            if (vFur > 0.0) {
              // close up: keep the hair that reaches this far out, with a soft edge. Further away the strands blur together,
              // so use the share of strands reaching this far out, from the average length (green) and how much it varies
              // (from blue, the average of length squared): the longest strands still show, thinly, instead of the fluff
              // shrinking to its average length (smooth blobs, a fleece)
              float lt = log2(tpp), spread = sqrt(max(hair.b - hair.g * hair.g, 0.0)) * 3.46;
              float near = clamp((hair.g - vFur) / (0.05 + 0.05 * min(lt, 5.0)) + 0.5, 0.0, 1.0);
              float far = clamp((hair.g - vFur) / max(spread, 0.07) + 0.5, 0.0, 1.0);
              float cov = mix(near, far, smoothstep(2.5, 4.0, lt));
              if (cov < furCut) discard;
              #ifdef SOFT_FUR
              diffuseColor.a = cov;
              #endif
            }
            // zoomed out, the locks' light and dark would only make blotches (a fleece): even them out with distance
            furShade = mix(mix(0.42, 1.28, hair.r), 0.93, 0.35 * smoothstep(3.0, 5.5, log2(tpp))) * mix(0.78, 1.06, vFur);
          } else {
            furShade *= mix(0.42, 1.38, hair.r);
            // the down's own strands stand out only round the outline (and short near the body): no speckle across the middle
            float facing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
            if (vFur > 0.28 && facing > 0.42 + 0.25 * (1.0 - vFur)) discard;
          }
        }
        if (vFurLen > 0.0 && vStyle.w >= 0.0 && vFeather <= 0.0) {
          // tufts: strands lean in towards their tuft's middle as they grow, with a gentle wave
          float td = furDensity * 0.16, tt = vFur;
          vec3 tq = vRest * td, tcell = floor(tq), tmid = (tcell + 0.25 + 0.5 * fh33(tcell + 11.0)) / td;
          float tid = fh13(tcell + 5.0);
          vec3 rp = mix(vRest, tmid, vStyle.x * tt * tt);
          rp += vec3(sin(tt * 7.0 + tid * 6.28), 0.0, cos(tt * 6.0 + tid * 4.0)) * 0.0025 * vStyle.z * tt;
          vec3 q = rp * furDensity * vStyle.y, cell = floor(q), fr = q - cell;
          float h = fh13(cell + 7.0), strand = mix(0.5 + 0.5 * h, 0.4 + 0.6 * h, step(0.001, vStyle.x));
          if (tt > 0.0) {
            if (tt > strand) discard;
            vec3 c = 0.3 + 0.4 * fh33(cell);
            float rad = mix(0.52, 0.58, step(0.001, vStyle.x)) * (1.0 - mix(0.82, 0.55, step(0.001, vStyle.x)) * tt / strand), d = length(fr - c), fw = max(fwidth(d), 0.02) * step(0.001, vStyle.x);
            float cov = 1.0 - smoothstep(rad - fw, rad + fw, d);
            if (cov < furCut) discard;
            #ifdef SOFT_FUR
            diffuseColor.a = cov;
            #endif
          }
          float sleek = 1.0 - step(0.001, vStyle.x);
          furShade = mix(mix(0.68, 0.86, sleek), mix(1.13, 1.04, sleek), tt / strand) * (0.9 + 0.2 * h) * (0.94 + 0.12 * tid * vStyle.x);
          // locks: each tuft lighter in its middle and darker where it parts from the next one
          float lock = length((vRest - tmid) * td) ;
          furShade *= mix(1.0, mix(1.06, 0.84, smoothstep(0.18, 0.62, lock)), vStyle.x);
        }
        if (vFeather > 0.0) {
          // overlapping feathers like roof tiles, in rows running back along the body: the front feather lies on top, so each
          // shows its tip. Body feathers are rounded with a slight point; down the neck the hackles are long, narrow and
          // pointed; the folded wing has small coverts over the shoulder and a band of long flight feathers behind
          float wingT = vFUV.z, neck = wingT > 0.0 ? 0.0 : smoothstep(0.15, 0.45, vHead);
          float flight = wingT > 0.0 ? smoothstep(0.52, 0.56, wingT) : 0.0;
          float size = vFeather * mix(1.0, 0.42, vHead) * 0.017 * mix(1.0, 0.72, step(0.001, wingT) * (1.0 - flight));
          // smaller feathers on the breast and underneath, larger over the back and sides
          if (wingT <= 0.0) size *= mix(1.0, mix(0.82, 1.22, smoothstep(0.08, -0.12, vRest.z)), 1.0 - neck);
          float stretch = mix(mix(1.0, 0.5, neck), 1.0, flight), point = mix(mix(0.15, 1.2, neck), 0.3, flight);
          vec2 pb = vec2(atan(vRest.x, vRest.y - 0.2) * 0.11, -vRest.z);
          vec2 pn = vec2(atan(vRest.x, vRest.z - 0.1) * 0.05, -vRest.y * 0.55);
          vec2 pp = mix(pb, pn, neck) / size;
          pp *= mix(vec2(1.0), vec2(0.62, 0.3), flight);          // flight feathers: wider apart and three times as long
          float best = 1e9, id = 0.0, row0 = floor(pp.y / 0.5); vec2 lp = vec2(0.0, 1.0);
          for (int k = -1; k <= 1; k++) {
            float row = row0 + float(k), off = mod(row, 2.0) * 0.5, col0 = floor(pp.x - off);
            for (int c = 0; c <= 1; c++) {
              vec2 ce = vec2(col0 + float(c) + off + 0.5, row * 0.5);
              vec2 l = featherLocal(pp, ce, stretch, point);
              if (length(l) < 1.0 && row < best) { best = row; id = fh13(vec3(ce, 3.0)); lp = l; }
            }
          }
          // the feathers lying over this one (rows further forward) each cast a soft shadow just past their edge
          float over = 9.0;
          for (int k = -1; k <= 1; k++) {
            float row = row0 + float(k), off = mod(row, 2.0) * 0.5, col0 = floor(pp.x - off);
            if (row >= best) continue;
            for (int c = 0; c <= 1; c++) over = min(over, length(featherLocal(pp, vec2(col0 + float(c) + off + 0.5, row * 0.5), stretch, point)));
          }
          float across = lp.x, along = lp.y;
          // a softly ragged edge, where the barbs end
          float t = length(lp) + 0.025 * sin(atan(lp.y, lp.x) * 19.0 + id * 40.0) * smoothstep(0.6, 0.95, length(lp));
          float aa = max(fwidth(t), 0.02);
          // a slight fluff over the feathers (the outer layers): fine soft strands from the painted hair, short across the body
          // and wispier at the outline, so the feathers below still show (green: how far each strand reaches out, blue: that
          // squared, for its spread when the strands blur together further away)
          float fluff = 1.0;
          if (vFur > 0.0 && vStyle.z < 0.0) {
            vec3 hp = vRest / (-vStyle.z), hw = pow(abs(normalize(vRestN)), vec3(4.0)); hw /= (hw.x + hw.y + hw.z);
            vec3 hair = texture2D(hairTex, vec2(hp.z, -hp.y), -0.5).rgb * hw.x + texture2D(hairTex, vec2(hp.x, -hp.z), -0.5).rgb * hw.y + texture2D(hairTex, vec2(hp.x, -hp.y), -0.5).rgb * hw.z;
            float facing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
            float reach = mix(1.0, 0.75, smoothstep(0.3, 0.8, facing));         // seen face-on, a shorter soft fuzz
            float lt = log2(max(length(fwidth(hp)) * 512.0, 1.0)), spread = sqrt(max(hair.b - hair.g * hair.g, 0.0)) * 3.46;
            float near = clamp((hair.g * reach - vFur) / (0.06 + 0.05 * min(lt, 5.0)) + 0.5, 0.0, 1.0);
            float far = clamp((hair.g * reach - vFur) / max(spread * reach, 0.07) + 0.5, 0.0, 1.0);
            float cov = mix(near, far, smoothstep(2.5, 4.0, lt));
            if (cov < furCut) discard;
            #ifdef SOFT_FUR
            diffuseColor.a = cov;
            #endif
            fluff = mix(0.76, 1.14, hair.r) * mix(0.92, 1.08, vFur);
          }
          // how big a feather is on screen: when small (the line-up and further), its light and shade are drawn stronger so
          // the feathers still show instead of blending into a flat colour
          float fpx = 1.0 / max(length(fwidth(pp)), 1e-4), boost = 1.0 - smoothstep(12.0, 40.0, fpx);
          float onTop = 1.0 + 0.8 * boost;
          if (vMode > 0.5 && vMode < 1.5) diffuseColor.rgb = mix(diffuseColor.rgb, vPat.rgb, onTop * vPat.a * smoothstep(-0.35, 0.35, sin(along * 11.0 + abs(across) * 2.0)));
          else if (vMode > 1.5 && vMode < 2.5) diffuseColor.rgb = mix(diffuseColor.rgb, vPat.rgb, onTop * vPat.a * smoothstep(0.5, 0.26, abs(across)) * smoothstep(-0.95, -0.4, along));
          else if (vMode > 3.5) diffuseColor.rgb = mix(diffuseColor.rgb, vPat.rgb, min(1.0, onTop * vPat.a) * smoothstep(0.2, -0.7, along));
          // the vane's barbs: thin strands slanting from the quill towards the tip, lying side by side (the two halves of the
          // vane meet at the quill in a V); their ends make the feather's edge finely ragged
          float ph = (along * 0.85 - abs(across)) * 30.0;
          float barb = barbs(along * 0.42 - abs(across) * 0.5, 120.0, id * 17.0 + step(0.0, across));
          t += 0.035 * barb * smoothstep(0.7, 1.0, t);
          // the quill: a thin pale shaft down the middle, fading before the tip
          float qa = max(fwidth(across), 0.004);
          float qw = max(0.05, 0.8 * qa);
          float quill = (1.0 - smoothstep(qw, qw + 1.5 * qa, abs(across))) * smoothstep(0.85, 0.2, along) * smoothstep(-1.0, -0.6, along) * (0.05 / qw);
          // here and there the vane parts: a thin dark gap between barbs on one side
          float side = step(0.5, fract(id * 7.13)) * 2.0 - 1.0, sp = fract(ph / 6.2832 / 7.0 + id * 3.7);
          float split = step(0.55, fract(id * 13.7)) * step(0.0, across * side) * smoothstep(0.3, 0.6, abs(across))
                      * (1.0 - smoothstep(0.0, 0.06 + fwidth(sp), abs(sp - 0.5))) * (1.0 - smoothstep(0.6, 1.7, fwidth(ph)));
          // each feather: lit across its rounded middle and lighter towards its tip, a light rim just inside its edge, a crisp
          // dark edge line, and the shadow of the feathers lying over it, so every feather stands out from the next
          float edge = smoothstep(1.0 - 2.5 * aa - 0.05, 1.0 - 0.5 * aa, t);
          float rim = smoothstep(0.62, 0.86, t) * (1.0 - edge);
          float shadow = 1.0 - smoothstep(1.0, 1.5, over);
          // (soft, not outlined: the shadow and the light tip make the overlap, the edge line is only a hint, else they read as scales)
          furShade *= (0.86 + 0.2 * (1.0 - t * t)) * (0.9 + 0.16 * smoothstep(-0.3, 0.95, along)) * (1.0 + 0.1 * rim) * mix(1.0, 0.8 - 0.12 * boost, edge)
                    * mix(1.0, 0.6 - 0.2 * boost, shadow * shadow) * (0.88 - 0.06 * boost + (0.24 + 0.12 * boost) * id)
                    * (1.0 + 0.17 * barb * smoothstep(-0.6, 0.2, along)) * (1.0 + 0.2 * quill) * (1.0 - 0.3 * split);
          // where the coverts end, a soft shadow over the flight feathers
          if (wingT > 0.0) furShade *= mix(0.72, 1.0, smoothstep(0.54, 0.62, wingT) + (1.0 - flight));
          furShade *= fluff;
        }
        if (vFUV.x > 0.01 && vFeather <= 0.0) {
          // a modelled feather (tail, sickles, saddle hackles, flight feathers, crest): a pale quill down the middle, barbs
          // slanting to the tip, darker towards its edges, a lighter edge line that parts it from the feather behind, and
          // a gap in the vane here and there
          float ac = (vFUV.x - 0.5) / 0.45, al = vFUV.y, qa = max(fwidth(ac), 0.01);
          float quill = (1.0 - smoothstep(0.06, 0.06 + 1.5 * qa, abs(ac))) * smoothstep(0.97, 0.55, al);
          float ph = (al * 48.0 - abs(ac) * 2.2) * 6.2832;
          float bamp = 1.0 - smoothstep(0.7, 1.7, fwidth(ph));
          float sp = abs(fract(al * 5.0 + floor(vRest.x * 400.0 + vRest.z * 300.0) * 0.37) - 0.5);
          float split = step(0.0, ac) * smoothstep(0.35, 0.7, abs(ac)) * (1.0 - smoothstep(0.0, 0.02 + fwidth(al) * 5.0, sp)) * bamp;
          float rimL = smoothstep(0.82, 0.95, abs(ac));
          // the barbs: hundreds of thin strands slanting from the quill towards the tip, side by side
          float barb = barbs(al - abs(ac) * 0.06, 260.0, step(0.0, ac) + floor(vRest.y * 300.0));
          furShade *= (1.0 + 0.2 * barb) * mix(1.0, 0.82, smoothstep(0.4, 0.9, abs(ac))) * (0.92 + 0.12 * al) * (1.0 - 0.35 * split);
          diffuseColor.rgb = mix(diffuseColor.rgb, min(diffuseColor.rgb * 1.5 + 0.07, vec3(1.0)), 0.6 * quill + 0.35 * rimL);
        }
        diffuseColor.rgb *= furShade;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        if (vMode > 4.5) roughnessFactor = 0.34;`)
      .replace('#include <opaque_fragment>', `if (vMode > 4.5) {        // glossy tail feathers: a coloured sheen at glancing angles
          float fr = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
          outgoingLight += vPat.rgb * vPat.a * (0.04 + fr * fr * 0.6);
        }
        if (vFurLen > 0.0) {
          float rim = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
          outgoingLight += diffuseColor.rgb * rim * rim * (0.08 + 0.16 * vFur) * step(0.001, vStyle.x);
        }
        #ifdef INDOOR
        {   // inside the house: darker the deeper in (the shadow of the pop door's passage, the half light of the nest)
          vec3 lp = (inMat * vec4(vWorldIn, 1.0)).xyz, dd = min(lp - inLo, inHi - lp);
          float depth = min(min(dd.x, dd.y), dd.z);
          outgoingLight *= mix(1.0, 0.38, smoothstep(0.0, 0.24, depth));
        }
        #endif
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'bird-fur';
  return m;
}
const BIRD_MAT = birdMaterial(false);
// for the farm's other furry animals (the foxes): the same fur material and drawing, and the fur builder
export { addFur, R };
export function furMaterial() { return BIRD_MAT; }
export function furHooks(mesh) { mesh.onBeforeRender = keepAlpha; mesh.onAfterRender = writeAlpha; }
export function modelFor(breed, kind) { return kind === 'chick' ? 'chick' : breed + (kind === 'rooster' ? '_r' : '_h'); }

const RIGS = [];
let far = false;
// zoomed far out, every bird wears its light version (a third of the triangles)
export function setFar(on) {
  if (on === far) return;
  far = on;
  for (const r of RIGS) if (r.lo) { r.mesh.visible = !far; r.lo.visible = far; }
}

// a hop, by its progress h (0..1; -1 not hopping): height y (0..1 of the jump), crouch before the push off, rise (taking
// off), legs tucked up in the air, reaching down before landing, and the squash as she lands
function hopCurve(h) {
  const H = { y: 0, crouch: 0, rise: 0, tuck: 0, reach: 0, squash: 0 };
  if (!(h >= 0)) return H;
  H.crouch = h < 0.2 ? Math.sin(h / 0.2 * Math.PI / 2) : h < 0.28 ? 1 - (h - 0.2) / 0.08 : 0;
  if (h > 0.24 && h < 0.86) {
    const a = (h - 0.24) / 0.62;
    H.y = Math.sin(a * Math.PI);
    H.rise = a < 0.4 ? Math.sin(a / 0.4 * Math.PI) : 0;
    H.tuck = a > 0.1 && a < 0.72 ? Math.sin((a - 0.1) / 0.62 * Math.PI) : 0;
    H.reach = a > 0.62 ? Math.sin((a - 0.62) / 0.38 * Math.PI / 2) : 0;
  }
  if (h >= 0.86) { const l = (h - 0.86) / 0.14; H.squash = Math.sin(l * Math.PI) * (1 - 0.3 * l); H.reach = Math.max(0, 1 - l * 2.5); }
  return H;
}

// with soft strand edges the fluff's see-through amount must only steer the antialiasing: it is kept out of the picture's own
// see-through channel, or the page behind would show through the birds
const keepAlpha = r => { if (soft) r.getContext().colorMask(true, true, true, false); }, writeAlpha = r => { if (soft) r.getContext().colorMask(true, true, true, true); };

export class Rig {
  constructor(breed, kind, colour) {
    this.model = modelFor(breed, kind);
    const M = MODELS[this.model], P = M.piv;
    this.mesh = new THREE.SkinnedMesh(paintedGeometry(this.model, breed, colour), BIRD_MAT);
    this.mesh.receiveShadow = true;
    this.lo = MODELS[this.model + '_lo'] ? new THREE.SkinnedMesh(paintedGeometry(this.model + '_lo', breed, colour), BIRD_MAT) : null;
    for (const m of [this.mesh, this.lo]) if (m) { m.onBeforeRender = keepAlpha; m.onAfterRender = writeAlpha; }
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
    this.scale = M.top; this.chick = kind === 'chick';
    for (const b of list) b.userData.moves = true;
    this.mesh.userData.moves = true;
  }
  // inside a house: box = { inv (world to the house's frame), lo, hi } shades her darker the deeper in she is; null: outside again
  indoor(box) {
    if (box) {
      if (!this.inMat) { this.inMat = birdMaterial(true); if (materialHook) materialHook(this.inMat); syncIndoor(this.inMat); INDOOR.add(this.inMat); }
      const u = this.inMat.userData.inU; u.inMat.value.copy(box.inv); u.inLo.value.copy(box.lo); u.inHi.value.copy(box.hi);
    }
    const m = box ? this.inMat : BIRD_MAT;
    for (const me of [this.mesh, this.lo]) if (me) me.material = m;
    this.shut = false;
  }
  // eyes shut (asleep) or open again
  sleepy(on) {
    if (!!on === !!this.shut) return;
    if (on && !SLEEP_MAT) { SLEEP_MAT = birdMaterial(false); if (materialHook) materialHook(SLEEP_MAT); syncSleep(); }
    this.shut = !!on;
    for (const me of [this.mesh, this.lo]) if (me) me.material = on ? SLEEP_MAT : BIRD_MAT;
  }
  // pose: walk (phase, amount), peck 0..1, look (yaw, tilt), flap 0..1 (+ beat), crow 0..1, sit 0..1, kick 0..1 (scratching, one
  // leg), hopT (0..1 through a hop, -1 when not hopping), turn (rad/s), ruffle 0..1 (a feather shake), dt
  pose(s) {
    const B = this.bones, Rr = this.rest, w = s.walk, ph = s.phase, sz = this.scale / 0.5, dt = Math.min(0.05, s.dt || 1 / 30);
    const body = B.body, head = B.head;
    body.position.copy(Rr.body); head.position.copy(Rr.head); B.root.position.copy(Rr.root);
    // the hop: a crouch, the push off, legs tucked up in the air, reaching down to land, a little squash and settle
    const H = hopCurve(s.hopT ?? -1), lift = 0.014 * sz;
    B.root.position.y += H.y * (this.chick ? 0.07 : 0.12) * Math.min(1.2, sz);
    const bob = w * Math.abs(Math.sin(ph)) * 0.01;
    const rf = s.ruffle || 0, shake = rf * Math.sin(s.t * 46);
    // the egg song: standing tall, the head darting forward on each "buk" and thrown up for the "ba-KAWK"; on parade: chest out,
    // head high, tail up, high steps
    const sg = s.sing || 0, ck = s.cluck || 0, kw = s.kawk || 0, pr = s.proud || 0, bd = s.brood || 0;     // brood: settled low on a nest, neck drawn in
    const dk = s.duck || 0;                  // ducking through a little door: crouched and level, neck stretched forward, head low, tail down
    const st = s.stretch || 0;               // leaping through the nest window: long and flat, head out in front and low, tail pressed down
    const sl = s.sleep || 0;                 // asleep on the perch: fluffed up, breathing slowly, head turned back and tucked into her back feathers
    body.position.y += bob - s.sit * this.shank * 0.85 - (H.crouch * 0.32 + H.squash * 0.22) * this.shank - 0.025 * sz * bd - 0.3 * this.shank * dk - 0.02 * sz * st + 0.004 * sz * sl * Math.sin(s.t * 1.7);
    body.rotation.set(0.38 * s.peck - 0.28 * s.crow + 0.12 * s.kick + 0.05 * s.sit + 0.22 * H.crouch - 0.14 * H.rise * (1 - st) + 0.12 * H.squash
                      - 0.2 * sg - 0.06 * kw + 0.04 * ck - 0.13 * pr + 0.12 * dk,
                      0, w * Math.sin(ph) * 0.07 + 0.13 * shake);
    head.rotation.set(0.95 * s.peck - 0.55 * s.crow + 0.1 * s.sit - 0.1 * H.crouch + 0.42 * ck - 0.62 * kw - 0.16 * pr - 0.1 * dk + 0.45 * sl,
                      s.lookYaw * (1 - s.peck) + 0.35 * rf * Math.sin(s.t * 38 + 1) + 2.5 * sl,
                      s.lookTilt * (1 - s.peck) + s.crow * 0.06 * Math.sin(s.t * 40));
    // walking, the head holds still in the air while the body passes under it, then darts forward: the chicken head-bob
    const u = ((ph / Math.PI) % 1 + 1) % 1, hold = 0.68, amp = 0.03 * sz;
    const hb = u < hold ? 0.5 - u / hold : -0.5 + smooth(0, 1, (u - hold) / (1 - hold));
    head.position.z += w * hb * amp + 0.016 * sz * ck + 0.075 * sz * dk + 0.08 * sz * st - 0.07 * sz * sl;
    head.position.y += 0.014 * sz * kw + 0.008 * sz * pr - 0.08 * sz * bd - 0.1 * sz * dk - 0.15 * sz * st - 0.03 * sz * sl;
    head.position.y -= w * (u < hold ? 0 : Math.sin((u - hold) / (1 - hold) * Math.PI)) * 0.006 * sz;
    const f = s.flap * (0.55 + 0.45 * Math.sin(s.t * 28)) * 1.25 + s.crow * 0.15 + 0.3 * rf + 0.25 * H.rise + 0.16 * kw + 0.07 * pr;
    B.wingL.rotation.set(0, 0, f + s.sit * 0.05); B.wingR.rotation.set(0, 0, -f - s.sit * 0.05);
    // the tail on a spring: it sways with each step, swings out on turns, lifts to balance a peck, dips as she takes off and
    // flicks up on landing, then settles with a little wobble
    const T = this.tailSpring || (this.tailSpring = { p: 0, pv: 0, y: 0, yv: 0, lastY: 0 });
    const vy = (H.y - T.lastY) / dt; T.lastY = H.y;
    const goalP = 0.3 * s.peck + 0.12 * s.kick + w * 0.05 * Math.abs(Math.sin(ph)) - 0.05 * vy + 0.25 * H.squash + 0.15 * sg + 0.22 * pr - 0.7 * dk - 1.0 * st;
    const goalY = -0.09 * Math.max(-3, Math.min(3, s.turn || 0)) + w * 0.09 * Math.sin(ph) + 0.25 * shake;
    T.pv += ((goalP - T.p) * 160 - T.pv * 11) * dt; T.p += T.pv * dt;
    T.yv += ((goalY - T.y) * 160 - T.yv * 11) * dt; T.y += T.yv * dt;
    B.tail.rotation.set(0.25 * s.crow + 0.08 * Math.sin(s.t * 1.3) * (1 - w) + T.p, 0.12 * Math.sin(s.t * 9) * s.wag + T.y, 0);
    const A = 0.5 * w * (1 + 0.5 * pr);
    const kick = s.kick > 0 ? Math.max(0, Math.sin(s.kickT * 14)) : 0;
    const legX = -1.25 * s.sit - 0.55 * H.crouch + 0.85 * H.tuck - 0.4 * H.reach - 0.3 * H.squash - 0.35 * dk;
    B.legL.rotation.set(A * Math.sin(ph) + (s.kickLeg === 0 ? 1.0 * kick * s.kick : 0) + legX, 0, 0);
    B.legR.rotation.set(-A * Math.sin(ph) + (s.kickLeg === 1 ? 1.0 * kick * s.kick : 0) + legX * 0.92, 0, 0);
    B.legL.position.copy(Rr.legL); B.legR.position.copy(Rr.legR);
    // resting: the legs fold right up under her, out of sight (they go down with the body and fold away into it)
    const legY = -s.sit * this.shank * 0.78 - (H.crouch * 0.25 + H.squash * 0.15) * this.shank + H.tuck * 0.3 * this.shank - 0.22 * this.shank * dk;
    B.legL.position.y += w * lift * (1 + 1.2 * pr) * Math.max(0, -Math.cos(ph)) + (s.kickLeg === 0 ? kick * s.kick * lift : 0) + legY;
    B.legR.position.y += w * lift * (1 + 1.2 * pr) * Math.max(0, Math.cos(ph)) + (s.kickLeg === 1 ? kick * s.kick * lift : 0) + legY;
    const fold = 1 - 0.88 * smooth(0.15, 0.9, s.sit);
    B.legL.scale.setScalar(fold); B.legR.scale.setScalar(fold);
  }
}

// The pond's frogs (Audrey, 23 Oct: "Perfect next": ducks, frogs and moving water on the pond; the game's art plan: "Frogs
// sit at the water's edge, hop along it, dive in and pop up elsewhere (tap one to make it jump)").
//
// A frog is built here from simple rounded shapes (no model file): a plump pear-shaped body, a broad head with big golden
// eyes on top (a black pupil lying across, a lid that blinks), a pale throat that puffs out into a balloon when it croaks,
// little front legs and long folded hind legs with webbed feet; green with darker blotches, a golden line down each side,
// a cream belly, barred legs, a brown ear disc behind each eye and a dark mouth line. Drawn larger than life (about 17 cm
// long), as the 2D game's frog was, so it reads on a phone. The parts hang on bones (each part rigid on its bone), so a
// frog is one draw; its pose comes from a few numbers: the hind legs stretched (0 folded, 1 out behind), the front legs
// reaching, the body's pitch, the throat, the lids, the head turned.
import * as THREE from 'three';
import { register, tr, urlLang } from './lang.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Fish } from './fish.js';

const LANG = urlLang();
export const FROG_S = 1.15;                   // larger than life
const BONES = ['root', 'body', 'head', 'lidL', 'lidR', 'throat', 'armL1', 'armL2', 'handL', 'armR1', 'armR2', 'handR', 'legL1', 'legL2', 'footL', 'legR1', 'legR2', 'footR'];
const PARENT = { body: 'root', head: 'body', lidL: 'head', lidR: 'head', throat: 'head', armL1: 'body', armL2: 'armL1', handL: 'armL2', armR1: 'body', armR2: 'armR1', handR: 'armR2',
  legL1: 'body', legL2: 'legL1', footL: 'legL2', legR1: 'body', legR2: 'legR1', footR: 'legR2' };
// where the joints are, sitting (the bind pose), in the frog's own frame (x to its left, y up, z forward), before FROG_S
const J0 = {
  root: [0, 0, 0], body: [0, 0.036, -0.012], head: [0, 0.047, 0.03], lidL: [0.027, 0.074, 0.056], throat: [0, 0.03, 0.058],
  armL1: [0.031, 0.034, 0.034], armL2: [0.044, 0.018, 0.046], handL: [0.041, 0.005, 0.06], handTipL: [0.044, 0.002, 0.075],
  legL1: [0.029, 0.032, -0.046], legL2: [0.068, 0.027, -0.004], footL: [0.06, 0.012, -0.064], toesL: [0.078, 0.003, 0.004],
};
const J = {};
for (const k in J0) {
  J[k] = J0[k].map(v => v * FROG_S);
  if (/L\d?$/.test(k)) { const m = k.replace(/L(\d?)$/, 'R$1'); J[m] = [-J[k][0], J[k][1], J[k][2]]; }        // (and the right side)
}
// stretched out (a leap): the hind legs straight out behind, the front legs reaching forward (offsets from the joint above)
const STRETCH = {
  legL2: [0.014, -0.006, -0.05], footL: [0.008, -0.002, -0.048], toesL: [0.006, 0.0, -0.042],
  armL2: [0.004, -0.004, 0.022], handL: [0.0, -0.006, 0.02], handTipL: [0.0, -0.004, 0.018],
};
const COL = {
  back: '#5b8431', spot: '#2c4718', stripe: '#a0a649', belly: '#e8dc9e', throat: '#f1e6b2', iris: '#e0a722', pupil: '#121008',
  rim: '#2c4413', ear: '#6e5b2a', mouth: '#24360f', toe: '#93b04e', bar: '#3c5c1c', inner: '#c9be6b', lid: '#557f2a',
};
const C = {}; for (const k in COL) C[k] = new THREE.Color(COL[k]);
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const V3 = a => new THREE.Vector3(a[0], a[1], a[2]);

// ---- the shapes
function prep(g, bone, paint, eye = null) {    // a part: its colours, all of it on one bone; an eye: where on it each point is
  g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv');
  const p = g.attributes.position, n = g.attributes.normal, cnt = p.count;
  const col = new Float32Array(cnt * 3), si = new Uint16Array(cnt * 4), sw = new Float32Array(cnt * 4), ey = new Float32Array(cnt * 3).fill(-3), c = new THREE.Color();
  const bi = BONES.indexOf(bone);
  for (let i = 0; i < cnt; i++) {
    paint(c, p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i));
    col.set([c.r, c.g, c.b], i * 3); si[i * 4] = bi; sw[i * 4] = 1;
    if (eye) ey.set(eye(n.getX(i), n.getY(i), n.getZ(i)), i * 3);
  }
  g.setAttribute('eye', new THREE.BufferAttribute(ey, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  return g;
}
function blob(c, r, w = 16, h = 12, warp = null) {
  const g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (warp) [x, y, z] = warp(x, y, z);
    p.setXYZ(i, c[0] + x * r[0], c[1] + y * r[1], c[2] + z * r[2]);
  }
  g.computeVertexNormals();
  return g;
}
function limb(a, b, ra, rb) {                 // a rounded tapering limb from point a to point b
  const A = V3(a), B = V3(b), d = B.clone().sub(A), L = d.length();
  const parts = [new THREE.CylinderGeometry(rb, ra, L, 10, 1, true).translate(0, L / 2, 0),
    new THREE.SphereGeometry(ra, 10, 8).translate(0, 0, 0), new THREE.SphereGeometry(rb, 10, 8).translate(0, L, 0)];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return parts.map(g => g.applyQuaternion(q).translate(A.x, A.y, A.z));
}
const noise = (x, y, z) => Math.sin(x * 93.1 + 1.3) * Math.sin(z * 71.7 + 2.1) * Math.sin(y * 57.3 + x * 31.0) + 0.5 * Math.sin(x * 151 - z * 133 + 0.4);

let FROG_GEO = null;
export function frogGeometry() {
  if (FROG_GEO) return FROG_GEO;
  const S = FROG_S, G = [];
  // the skin's pattern: blotches on the back, a golden line down each side, a cream belly
  const skin = (c, x, y, z, nx, ny, nz) => {
    c.copy(C.back);
    const up = ny, side = Math.abs(nx);
    if (up < -0.25) { c.lerp(C.belly, ss(-0.25, -0.6, up)); return; }
    c.lerp(C.stripe, ss(0.2, -0.1, up) * side * 0.25);
  };
  // the body: pear-shaped, wider and rounder behind, flat underneath
  G.push(prep(blob([0, 0.038 * S, -0.012 * S], [0.05 * S, 0.033 * S, 0.064 * S], 34, 24, (x, y, z) => {
    const back = ss(0.3, -0.8, z); x *= 1 + 0.16 * back; y *= 1 + 0.1 * back - 0.12 * ss(0.2, 0.9, z);
    if (y < -0.35) y = -0.35 - (y + 0.35) * 0.35;
    return [x, y, z];
  }), 'body', skin, () => [-3, 1, 0]));
  // the head: broad and flat, the snout rounded; a mouth line round it, an ear disc behind each eye, nostrils
  const hc = [0, 0.05 * S, 0.052 * S];
  G.push(prep(blob(hc, [0.044 * S, 0.026 * S, 0.042 * S], 32, 22, (x, y, z) => { y *= 1 - 0.2 * ss(0.2, 1, z); x *= 1 - 0.12 * ss(0.4, 1, z); if (y < -0.4) y = -0.4 - (y + 0.4) * 0.5; return [x, y, z]; }), 'head', (c, x, y, z, nx, ny, nz) => {
    skin(c, x, y, z, nx, ny, nz);
    const ly = (y - hc[1]) / S, lz = (z - hc[2]) / S, lx = x / S;
    if (Math.abs(ly + 0.005 + 0.01 * ss(0.0, 0.04, lz)) < 0.0018 && lz > -0.02 && ny > -0.6) c.copy(C.mouth);                  // the mouth line
    for (const s of [1, -1]) {
      if (Math.hypot(lx - s * 0.04, ly - 0.004, lz + 0.008) < 0.0085) c.lerp(C.ear, 0.85);                                       // the ear disc
      if (Math.hypot(lx - s * 0.009, ly - 0.012, lz - 0.037) < 0.0022) c.copy(C.mouth);                                          // a nostril
    }
  }, () => [-3, 1, 0]));
  // the eyes, big and golden, high on the head, looking out to the sides: the pupil a black bar across, a dark rim
  for (const s of [1, -1]) {
    // (they bulge up out of the head and look up and out, so from the game's camera you see the golden eye and its pupil)
    const e = [s * 0.027 * S, 0.073 * S, 0.055 * S], r = 0.0175 * S, out = new THREE.Vector3(s * 0.55, 0.62, 0.56).normalize();
    const across = new THREE.Vector3(0, 1, 0).cross(out).normalize(), upE = out.clone().cross(across).normalize();
    G.push(prep(blob(e, [r, r, r], 28, 20), 'head', (c) => c.setRGB(1, 1, 1),
      (nx, ny, nz) => [nx * out.x + ny * out.y + nz * out.z, nx * across.x + ny * across.y + nz * across.z, nx * upE.x + ny * upE.y + nz * upE.z]));
    // the lid: a cap of skin tucked behind the top of the eye, that rolls forward over it to blink
    const k = Math.sqrt(1 - 0.5 * 0.5);
    G.push(prep(blob(e, [r * 1.07, r * 1.07, r * 1.07], 16, 12, (x, y, z) => {
      if (y >= 0.5) return [x, y, z];
      const h = Math.hypot(x, z) || 1; return [x / h * k * 0.97, 0.5, z / h * k * 0.97];
    }), s > 0 ? 'lidL' : 'lidR', (c) => c.copy(C.lid)));
  }
  // the throat: tucked under the chin, puffed out when it croaks
  G.push(prep(blob(J.throat, [0.02 * S, 0.016 * S, 0.02 * S], 14, 10), 'throat', (c, x, y, z, nx, ny) => { c.copy(C.throat); if (ny > 0.5) c.lerp(C.belly, 0.4); }));
  // the legs: barred, paler inside; webbed feet with long toes
  const legPaint = (a, b) => (c, x, y, z, nx, ny, nz) => {
    const A = V3(J[a]), B = V3(J[b]), d = B.clone().sub(A), u = new THREE.Vector3(x, y, z).sub(A).dot(d) / d.lengthSq();
    c.copy(C.back); if (Math.sin(u * 13.0) > 0.45 && ny > -0.3) c.lerp(C.bar, 0.8); if (ny < -0.4) c.lerp(C.inner, 0.6);
  };
  for (const s of ['L', 'R']) {
    // front: upper arm, forearm, a hand of four splayed fingers
    for (const g of limb(J['arm' + s + '1'], J['arm' + s + '2'], 0.0085 * S, 0.0068 * S)) G.push(prep(g, 'arm' + s + '1', legPaint('arm' + s + '1', 'arm' + s + '2')));
    for (const g of limb(J['arm' + s + '2'], J['hand' + s], 0.0068 * S, 0.0052 * S)) G.push(prep(g, 'arm' + s + '2', legPaint('arm' + s + '2', 'hand' + s)));
    const w = V3(J['hand' + s]), tip = V3(J['handTip' + s]), sd = s === 'L' ? 1 : -1;
    for (let k = 0; k < 4; k++) {
      const a = (k - 1.5) * 0.42, d = tip.clone().sub(w), L = d.length(), dir = d.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), a + sd * 0.15);
      const t = w.clone().addScaledVector(dir, L * (k === 1 || k === 2 ? 1.0 : 0.82));
      for (const g of limb(w.toArray(), t.toArray(), 0.0032 * S, 0.0024 * S)) G.push(prep(g, 'hand' + s, (c) => c.copy(C.toe)));
    }
    // hind: a thick thigh, the shin, a long foot with five webbed toes
    for (const g of limb(J['leg' + s + '1'], J['leg' + s + '2'], 0.0145 * S, 0.0095 * S)) G.push(prep(g, 'leg' + s + '1', legPaint('leg' + s + '1', 'leg' + s + '2')));
    for (const g of limb(J['leg' + s + '2'], J['foot' + s], 0.0092 * S, 0.0062 * S)) G.push(prep(g, 'leg' + s + '2', legPaint('leg' + s + '2', 'foot' + s)));
    const an = V3(J['foot' + s]), toe = V3(J['toes' + s]);
    for (const g of limb(an.toArray(), an.clone().lerp(toe, 0.45).toArray(), 0.0058 * S, 0.0045 * S)) G.push(prep(g, 'foot' + s, (c) => c.copy(C.back).lerp(C.toe, 0.4)));
    const base = an.clone().lerp(toe, 0.4), fd = toe.clone().sub(base), FL = fd.length(); fd.normalize();
    const tips = [];
    for (let k = 0; k < 5; k++) {
      const a = (k - 2) * 0.26, dir = fd.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a), t = base.clone().addScaledVector(dir, FL * (1 - Math.abs(k - 2.6) * 0.12));
      tips.push(t);
      for (const g of limb(base.toArray(), t.toArray(), 0.0028 * S, 0.0021 * S)) G.push(prep(g, 'foot' + s, (c) => c.copy(C.toe)));
    }
    // the web between the toes: a thin fan
    const pos = []; for (let k = 0; k < 4; k++) { pos.push(base.x, base.y + 0.0012, base.z, tips[k].x, tips[k].y + 0.0012, tips[k].z, tips[k + 1].x, tips[k + 1].y + 0.0012, tips[k + 1].z); }
    const web = new THREE.BufferGeometry(); web.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); web.computeVertexNormals();
    web.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    G.push(prep(web, 'foot' + s, (c) => c.copy(C.toe).lerp(C.back, 0.3)));
  }
  FROG_GEO = mergeGeometries(G, false);
  FROG_GEO.computeBoundingSphere(); FROG_GEO.boundingSphere.radius += 0.12;            // (it leaps and stretches)
  return FROG_GEO;
}
let FROG_MAT = null;
export function frogMaterial(grade) {
  if (!FROG_MAT) {
    FROG_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, side: THREE.DoubleSide });
    // the eyes: golden, lighter towards the front, a dark rim where they meet the head, the pupil a black bar lying across
    // (rounded at its ends), a catch-light; worked out per pixel from where on the eye it is, so the edges are smooth
    const U = { irisA: { value: C.iris.clone() }, irisB: { value: new THREE.Color('#f7d670') }, rimC: { value: C.rim.clone() }, pupilC: { value: C.pupil.clone() }, spotC: { value: C.spot.clone() }, lineC: { value: C.stripe.clone() } };
    FROG_MAT.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 eye;\nvarying vec3 vEye, vBind, vBindN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEye = eye; vBind = position / ' + FROG_S.toFixed(3) + '; vBindN = normal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEye, vBind, vBindN;\nuniform vec3 irisA, irisB, rimC, pupilC, spotC, lineC;')
        .replace('#include <color_fragment>', `#include <color_fragment>
if (vEye.x < -2.0 && vEye.y > 0.5) {
  // the back: dark blotches, and a golden line down each side
  vec3 q = vBind; float up = normalize(vBindN).y;
  float bl = sin(q.x * 160.0 + 0.7) * sin(q.z * 140.0 + 2.3) + 0.6 * sin((q.x + q.z) * 230.0 + 1.1) * sin(q.y * 190.0 - 0.4);
  diffuseColor.rgb = mix(diffuseColor.rgb, spotC, smoothstep(0.52, 0.62, bl) * smoothstep(0.05, 0.25, up) * 0.85);
  float line = (1.0 - smoothstep(0.0025, 0.0045, abs(abs(q.x) - 0.034))) * smoothstep(0.2, 0.35, up) * (1.0 - smoothstep(0.035, 0.05, q.z));
  diffuseColor.rgb = mix(diffuseColor.rgb, lineC, line * 0.8);
}
if (vEye.x > -2.0) {
  float f = vEye.x, a = vEye.y, v = vEye.z;
  vec3 col = mix(rimC, mix(irisA, irisB, smoothstep(0.3, 0.95, f) * 0.45), smoothstep(-0.28, -0.12, f));
  float w = max(0.06, 1.0 - pow(abs(a) / 0.72, 4.0));
  float pupil = (1.0 - smoothstep(0.24, 0.3, abs(v) / w)) * (1.0 - smoothstep(0.66, 0.73, abs(a))) * smoothstep(0.08, 0.18, f);
  col = mix(col, pupilC, pupil);
  float glint = (1.0 - smoothstep(0.06, 0.1, length(vec2(a + 0.22, v - 0.44)))) * smoothstep(0.35, 0.45, f);
  diffuseColor.rgb = mix(col, vec3(1.0, 0.98, 0.92), glint);
}`);
    };
    FROG_MAT.customProgramCacheKey = () => 'frog';
    if (grade) grade(FROG_MAT);
  }
  return FROG_MAT;
}

// ---- one frog: its bones and its pose
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
export class Frog {
  constructor(parent, grade, r = Math.random) {
    this.r = r;
    this.root = new THREE.Group(); parent.add(this.root);
    const bones = {}, list = [];
    for (const n of BONES) {
      const b = new THREE.Bone(); b.name = n; bones[n] = b; list.push(b);
      const p = J[n], q = PARENT[n] ? J[PARENT[n]] : [0, 0, 0];
      b.position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (PARENT[n]) bones[PARENT[n]].add(b);
    }
    this.mesh = new THREE.SkinnedMesh(frogGeometry(), frogMaterial(grade));
    this.mesh.add(bones.root); this.mesh.bind(new THREE.Skeleton(list));
    this.mesh.frustumCulled = true; this.mesh.castShadow = false;
    this.root.add(this.mesh);
    this.B = bones;
    this.P = { ext: 0, reach: 0, pitch: 0, pouch: 0, blink: 0, yaw: 0, nod: 0, lift: 0, breath: 0 };
    this.t = r() * 10; this.blinkIn = 1 + r() * 4;
    this.hitR = 0.09; this.hitY = 0.05; this.tagY = 0.22;
    this.label = tr(LANG, 'pond.frog');
  }
  get pos() { return this.root.position; }
  // a chain of bones aimed so its joints lie where the pose wants them (each bone turned the least way to point at the next)
  aim(chain, ends, k) {
    // chain: bone names; ends: the joint names below each (the last is the tip); k: 0..1 from sitting to stretched out
    let prev = null; const rest = [], want = [];
    for (let i = 0; i < chain.length; i++) {
      const from = V3(J[i ? ends[i - 1] : chain[0]]), to = V3(J[ends[i]]), right = /R\d?$/.test(ends[i]);
      const d0 = to.clone().sub(from), dS = V3(STRETCH[ends[i].replace(/R(\d?)$/, 'L$1')] || [0, 0, 0]);
      if (right) dS.x = -dS.x;
      const d = d0.clone().lerp(dS.lengthSq() ? dS : d0, k);
      rest.push(d0.normalize()); want.push(d.normalize());
    }
    for (let i = 0; i < chain.length; i++) {
      const world = new THREE.Quaternion().setFromUnitVectors(rest[i], want[i]);
      const b = this.B[chain[i]];
      if (prev) b.quaternion.copy(prev.clone().invert().multiply(world)); else b.quaternion.copy(world);
      prev = world;
    }
  }
  pose(dt) {
    const P = this.P, B = this.B; this.t += dt;
    // blinking now and then
    if ((this.blinkIn -= dt) <= 0) { this.blinkT = 0.18; this.blinkIn = 1.5 + this.r() * 5; }
    let blink = P.blink; if (this.blinkT > 0) { this.blinkT -= dt; blink = Math.max(blink, Math.sin(Math.max(0, this.blinkT) / 0.18 * Math.PI)); }
    B.lidL.rotation.x = B.lidR.rotation.x = -0.95 + blink * 2.0;          // (tucked back behind the eye; forward over it to blink)
    // breathing: the throat fluttering, and the croak's balloon
    const flutter = 0.06 * Math.sin(this.t * 9) * (1 - P.pouch);
    const pf = 1 + P.pouch * 1.45 + flutter;
    B.throat.scale.set(pf, 1 + P.pouch * 1.35 + flutter, 1 + P.pouch * 1.2);
    B.throat.position.set(0, (J.throat[1] - J.head[1]) - P.pouch * 0.009 * FROG_S, (J.throat[2] - J.head[2]) + P.pouch * 0.008 * FROG_S);
    B.body.rotation.x = -P.pitch; B.body.position.y = J.body[1] + 0.0008 * Math.sin(this.t * 2.2);
    B.head.rotation.set(-P.nod, P.yaw, 0);
    this.aim(['legL1', 'legL2', 'footL'], ['legL2', 'footL', 'toesL'], P.ext);
    this.aim(['legR1', 'legR2', 'footR'], ['legR2', 'footR', 'toesR'], P.ext);
    this.aim(['armL1', 'armL2', 'handL'], ['armL2', 'handL', 'handTipL'], P.reach);
    this.aim(['armR1', 'armR2', 'handR'], ['armR2', 'handR', 'handTipR'], P.reach);
    this.mesh.position.y = P.lift;
  }
}

// ---- the line-up (?lineup=frogs): a few frogs in their poses, for a close look
export class FrogLineup {
  constructor(scene, centre, yaw, grade, r) {
    this.group = new THREE.Group(); this.group.position.copy(centre); this.group.rotation.y = yaw; scene.add(this.group);
    this.r = r;
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4a9cc0', roughness: 0.15 }));
    water.position.set(0.12, 0.007, 0.42); this.group.add(water); if (grade) grade(water.material);
    const spots = [[-0.12, 0, -0.42, 'sit'], [0.12, 0, -0.42, 'croak'], [-0.12, 0, 0, 'look'], [0.12, 0, 0, 'leap'], [-0.12, 0, 0.42, 'blink'], [0.12, 0, 0.42, 'swim']];
    this.frogs = spots.map(([x, y, z, k], i) => { const f = new Frog(this.group, grade, r); f.pos.set(x, y, z); f.root.rotation.y = 0.35; f.kind = k; return f; });
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    for (const f of this.frogs) {
      const P = f.P, t = this.t;
      P.pouch = 0; P.ext = 0; P.reach = 0; P.pitch = 0; P.blink = 0; P.yaw = 0; P.lift = 0; P.nod = 0;
      if (f.kind === 'croak') { const c = t % 2.4; P.pouch = c < 1.2 ? Math.sin(Math.min(1, c / 1.2) * Math.PI) : 0; }
      if (f.kind === 'look') P.yaw = 0.45 * Math.sin(t * 0.8);
      if (f.kind === 'leap') { P.ext = 1; P.reach = 1; P.pitch = -0.12; P.lift = 0.06; }
      if (f.kind === 'blink') P.blink = Math.max(0, Math.sin(t * 1.6)) ** 3;
      if (f.kind === 'swim') { P.ext = 0.7; P.pitch = 0.3; P.lift = -0.086 * FROG_S; }
      f.pose(dt);
    }
  }
}

// ---------------------------------------------------------------- the frogs' life at the pond
// Five frogs live round the pond. On the bank at the water's edge they sit facing the water, breathing (the throat
// fluttering), blinking, looking about, now and then croaking (the throat puffed out into a balloon: "Ribbit!", French
// "Croâ !"), more by night, when they sit and sing together; they hop along the bank; they dive in with a splash, and a
// while later pop up somewhere else with a little plop, float with only their eyes and the top of the head out, paddle
// about and climb out onto the bank again. A goose, Biscuit or Rusty coming near: in they go. Tap one and it jumps (into
// the water, with a "Ribbit!"; one in the water dives and pops up elsewhere).
const WATER_Y = 0.007, BANK_K = 1.045;
const TXT = register('pond', { ribbit: ['Ribbit!', 'Croâ !'], frog: ['Frog', 'Grenouille'] });
export function bubbleTexture(text, ink = '#2e5a1c') {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 112; const c = cv.getContext('2d');
  c.font = '800 46px Nunito, system-ui, sans-serif'; const w = Math.min(236, c.measureText(text).width + 44);
  const x0 = (256 - w) / 2;
  c.fillStyle = 'rgba(255,253,247,0.96)'; c.beginPath(); c.roundRect(x0, 8, w, 72, 34); c.fill();
  c.beginPath(); c.moveTo(118, 78); c.lineTo(138, 78); c.lineTo(124, 102); c.fill();
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 128, 46);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function ringTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 40, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv);
}
function dropTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const c = cv.getContext('2d');
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 15); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(225,245,255,0.8)'); g.addColorStop(1, 'rgba(225,245,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv);
}
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const sstep = (u) => u * u * (3 - 2 * u);
const clamp01 = u => Math.min(1, Math.max(0, u));
const lcg = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ---- the lily pads (the pond's secret, Audrey 28 Oct: "the froglet will be on her lily pad"): four round leaves floating out
// on the pond, each with its notch, darker veins running out from the middle and a paler rim; the biggest is hers; a
// pink water lily open on one
const PAD_Y = WATER_Y + 0.0025;
function padGeometry(r, flower) {
  const parts = [], c = new THREE.Color(), deep = new THREE.Color('#3f6f26'), pale = new THREE.Color('#77a843'), vein = new THREE.Color('#2f5a1c'), rim = new THREE.Color('#5e8f34');
  const g = new THREE.RingGeometry(0.004, r, 30, 4, 0.3, Math.PI * 2 - 0.6).rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z) / r, a = Math.atan2(z, x);
    c.copy(deep).lerp(pale, 0.55 * (1 - d) + 0.15 * Math.sin(a * 3 + 1.2));
    if (Math.abs(Math.sin(a * 5.5)) < 0.16 && d > 0.15) c.lerp(vein, 0.55);
    if (d > 0.93) c.lerp(rim, 0.6);
    col.set([c.r, c.g, c.b], i * 3);
    p.setY(i, 0.0015 * (1 - d * d));                            // (a little domed)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); g.computeVertexNormals(); parts.push(g.toNonIndexed());
  if (flower) {                                                  // the water lily: two rings of petals cupped round a gold heart
    const ox = r * 0.25, oz = -r * 0.2;
    const petal = (a, tilt, len, colour) => {
      const q = new THREE.SphereGeometry(1, 8, 6).scale(len * 0.36, len * 0.12, len * 0.5).translate(0, 0, len * 0.42).rotateX(-tilt).rotateY(a).translate(ox, 0.012, oz);
      const qc = new Float32Array(q.attributes.position.count * 3), cc = new THREE.Color(colour);
      for (let i = 0; i < q.attributes.position.count; i++) { const k = q.attributes.position.getY(i) > 0.014 ? 1 : 0.86; qc.set([cc.r * k, cc.g * k, cc.b * k], i * 3); }
      q.setAttribute('color', new THREE.BufferAttribute(qc, 3)); q.deleteAttribute('uv'); parts.push(q.index ? q.toNonIndexed() : q);
    };
    for (let k = 0; k < 8; k++) petal(k / 8 * Math.PI * 2, 0.35, 0.05, '#f7d3df');
    for (let k = 0; k < 6; k++) petal((k + 0.5) / 6 * Math.PI * 2, 0.85, 0.038, '#f2a9c0');
    const h = new THREE.SphereGeometry(0.011, 8, 6).scale(1, 0.6, 1).translate(ox, 0.02, oz), hc = new Float32Array(h.attributes.position.count * 3), gold = new THREE.Color('#f2c230');
    for (let i = 0; i < h.attributes.position.count; i++) hc.set([gold.r, gold.g, gold.b], i * 3);
    h.setAttribute('color', new THREE.BufferAttribute(hc, 3)); h.deleteAttribute('uv'); parts.push(h.toNonIndexed());
  }
  return mergeGeometries(parts);
}
// little hearts (theirs: drawn here, so nobody else's are counted)
function heartTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 10, 0, 56); gr.addColorStop(0, '#ff8aa8'); gr.addColorStop(1, '#e83a62');
  c.fillStyle = gr; c.beginPath(); c.moveTo(32, 56); c.bezierCurveTo(2, 34, 8, 6, 32, 21); c.bezierCurveTo(56, 6, 62, 34, 32, 56); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(21, 22, 6, 4, -0.6, 0, Math.PI * 2); c.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class FrogPond {
  // o: { pond: V.pond, avoid: [[x, z, r]] (the dock), mouths: [[x, z]] (where the streams meet it), spots: [[x, y, z]],
  //      near(): [[x, z], ...] (geese, Biscuit, Rusty: anyone who'd make a frog jump in), grade, lang, toCamera(x, z) }
  constructor(scene, o, r) {
    this.o = o; this.r = r; this.lang = o.lang || 'en';
    const P = o.pond; this.c = [P.center[0], P.center[2]]; this.U = [P.axisU[0], P.axisU[2]]; this.V = [P.axisV[0], P.axisV[2]];
    this.u2 = this.U[0] ** 2 + this.U[1] ** 2; this.v2 = this.V[0] ** 2 + this.V[1] ** 2;
    this.group = new THREE.Group(); scene.add(this.group);
    this.fx = { rings: [], drops: [], bubbles: [] };
    this.ringTex = ringTexture(); this.dropTex = dropTexture(); this.bubbleTex = bubbleTexture(tr(this.lang, 'pond.ribbit'));
    // the frogs: on the bank, spread round the pond
    const angles = [];
    for (let i = 0; i < 5; i++) {
      let a = null;
      for (let k = 0; k < 60 && a === null; k++) {
        const t = (i / 5) * Math.PI * 2 + (r() - 0.5) * (0.9 + k * 0.05), [x, z] = this.at(t, BANK_K);
        if (this.okAt(t) && angles.every(b => { const [bx, bz] = this.at(b, BANK_K); return Math.hypot(bx - x, bz - z) > 0.6; })) a = t;
      }
      angles.push(a === null ? (i / 5) * Math.PI * 2 : a);
    }
    this.frogs = angles.map(a => {
      const f = new Frog(this.group, o.grade, r); f.pond = this;
      const [x, z] = this.at(a, BANK_K); f.pos.set(x, 0.003, z); f.heading = this.inward(a) + (r() - 0.5) * 0.8; f.root.rotation.y = f.heading;
      f.state = 'bank'; f.todo = []; f.task = null; f.wait = r() * 3; f.night = false;
      f.shadow = shadowBlob(0.06); this.group.add(f.shadow);
      return f;
    });
    this.time = 0; this.chorus = 0;
    // ---- the secret (Audrey, 28 Oct): the lily pads, the froglet (a little smaller than the others) and her pad, and now and
    // then a salmon in love with her (love(): never mentioned, he can't be fished, nothing is won when it happens)
    this.pads = []; const rp = lcg(4242), P3 = o.pond;
    const ends = [[P3.center[0] + P3.axisU[0] * 0.42, P3.center[2] + P3.axisU[2] * 0.42], [P3.center[0] - P3.axisU[0] * 0.42, P3.center[2] - P3.axisU[2] * 0.42]];      // (where a duck house would float)
    for (const [r, flower] of [[0.14, false], [0.1, true], [0.085, false], [0.07, false]]) {
      let spot = null;
      for (let k = 0; k < 120 && !spot; k++) {
        const a = rp() * Math.PI * 2, kk = (this.pads.length ? 0.42 : 0.55) + rp() * 0.3, [x, z] = this.at(a, kk);
        if (!this.wetOk(x, z) || this.where(x, z)[0] > 0.82) continue;
        if ((o.avoid || []).some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar + 0.5)) continue;
        if ((o.mouths || []).some(([mx, mz]) => Math.hypot(x - mx, z - mz) < 1.1) || ends.some(([ex, ez]) => Math.hypot(x - ex, z - ez) < 1.0)) continue;
        if (this.pads.some(q => Math.hypot(x - q.x, z - q.z) < 0.6)) continue;
        spot = [x, z];
      }
      if (!spot) continue;
      const mesh = new THREE.Mesh(padGeometry(r, flower), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }));
      if (o.grade) o.grade(mesh.material);
      mesh.position.set(spot[0], PAD_Y - 0.0015, spot[1]); mesh.rotation.y = rp() * Math.PI * 2; mesh.receiveShadow = true; this.group.add(mesh);
      this.pads.push({ x: spot[0], z: spot[1], r, mesh, yaw0: mesh.rotation.y, ph: rp() * 6 });
    }
    this.her = this.frogs[0]; this.herPad = this.pads[0] || null;
    if (this.her) { this.her.root.scale.setScalar(0.86); this.her.small = 0.86; }
    this.hearts = []; this.heartTex = null;
    this.loveR = lcg(777); this.loveIn = 150 + this.loveR() * 210; this.loveCheck = 0; this.salmon = null;
  }
  // ---- the pond's shape: the ellipse with its wobble (as drawn), where a point is against it
  wob(t) { return 1 + 0.035 * Math.sin(t * 5 + 1) + 0.02 * Math.sin(t * 9); }
  at(t, k) { const w = this.wob(t) * k; return [this.c[0] + (this.U[0] * Math.cos(t) + this.V[0] * Math.sin(t)) * w, this.c[1] + (this.U[1] * Math.cos(t) + this.V[1] * Math.sin(t)) * w]; }
  where(x, z) { const dx = x - this.c[0], dz = z - this.c[1], a = (dx * this.U[0] + dz * this.U[1]) / this.u2, b = (dx * this.V[0] + dz * this.V[1]) / this.v2, t = Math.atan2(b, a); return [Math.hypot(a, b) / this.wob(t), t]; }
  inward(t) { const [x, z] = this.at(t, 1), [x2, z2] = this.at(t, 0.8); return Math.atan2(x2 - x, z2 - z); }
  okAt(t) {                     // a spot on the bank away from the dock and where the streams come in
    const [x, z] = this.at(t, BANK_K);
    for (const [ax, az, ar] of this.o.avoid || []) if (Math.hypot(x - ax, z - az) < ar + 0.45) return false;
    for (const [mx, mz] of this.o.mouths || []) if (Math.hypot(x - mx, z - mz) < 0.9) return false;
    return true;
  }
  wetOk(x, z) {                 // somewhere in the water a frog can be (not under the dock)
    for (const [ax, az, ar] of this.o.avoid || []) if (Math.hypot(x - ax, z - az) < ar + 0.25) return false;
    return this.where(x, z)[0] < 0.9;
  }
  // ---- what a frog does next
  next(f) {
    const R = this.r, night = f.night;
    // (while the froglet has her moment, the others nearby keep still, on the bank or afloat: nobody hops past them, nobody
    // climbs out beside them)
    if (this.loveOn && f !== this.her && Math.hypot(f.pos.x - this.her.pos.x, f.pos.z - this.her.pos.z) < 1.6) return f.state === 'water' ? this.float(f, 2 + R() * 2) : this.sit(f, 2 + R() * 2);
    if (f.state === 'pad') {
      // the froglet on her lily pad: sitting a good while, looking about, a croak; then back into the water
      const p = R();
      if (p < 0.1) return this.offPad(f, false);
      if (p < (night ? 0.45 : 0.25)) return this.croak(f);
      if (p < 0.45) return this.look(f);
      return this.sit(f, 4 + R() * 8);
    }
    if (f.state === 'water') {
      // floating a while, paddling about a little, then out onto the bank at a spot with room (the froglet: often up onto
      // her lily pad instead)
      if (!f.floated) { f.floated = true; return this.float(f, 3 + R() * 4); }
      if (f === this.her && this.herPad && R() < 0.5) { f.paddled = false; f.floated = false; const t = this.toPad(f); if (t) return t; }
      if (R() < 0.6 && !f.paddled) { f.paddled = true; const [, t] = this.where(f.pos.x, f.pos.z), a = t + (R() - 0.5) * 1.2, k = 0.55 + R() * 0.3, [x, z] = this.at(a, k); if (this.wetOk(x, z) && this.clearSwim(f.pos.x, f.pos.z, x, z)) return this.swimTo(f, x, z); }
      f.paddled = false; f.floated = false;
      for (let i = 0; i < 16; i++) {
        const [, t] = this.where(f.pos.x, f.pos.z), a = t + (R() - 0.5) * 1.6, [wx, wz] = this.at(a, 0.93);
        if (this.okAt(a) && this.roomAt(f, a) && this.clearSwim(f.pos.x, f.pos.z, wx, wz)) return this.climbOut(f, a);
      }
      return this.float(f, 2 + R() * 2);
    }
    const p = R();
    if (p < (night ? 0.4 : 0.17)) return this.croak(f);
    if (p < (night ? 0.52 : 0.38)) return this.look(f);
    if (p < (night ? 0.58 : 0.52)) return this.hopAlong(f);
    if (p < (night ? 0.61 : 0.6)) return this.dive(f, false);
    return this.sit(f, 3 + R() * (night ? 3 : 6));
  }
  // room on the bank at t: no other frog sitting there or on its way there
  roomAt(f, t) {
    const [x, z] = this.at(t, BANK_K);
    return this.frogs.every(g => g === f || ((g.state !== 'bank' || Math.hypot(g.pos.x - x, g.pos.z - z) > 0.3) && (!g.goal || Math.hypot(g.goal[0] - x, g.goal[1] - z) > 0.3)));
  }
  clearSwim(ax, az, bx, bz) {   // a way across the water clear of the dock
    for (let i = 0; i <= 10; i++) { const x = ax + (bx - ax) * i / 10, z = az + (bz - az) * i / 10; for (const [cx, cz, cr] of this.o.avoid || []) if (Math.hypot(x - cx, z - cz) < cr + 0.15) return false; }
    return true;
  }

  // ---- the moves (each a task: run(f, dt) returns true when done)
  sit(f, secs) { let t = 0; return { name: 'sit', run: (f, dt) => { t += dt; f.P.yaw *= 1 - Math.min(1, dt * 3); return t >= secs; } }; }
  look(f) {
    let t = 0; const R = this.r, a = (R() < 0.5 ? -1 : 1) * (0.35 + R() * 0.3), dur = 2.2 + R() * 1.5;
    return { name: 'look', run: (f, dt) => { t += dt; const k = Math.sin(Math.min(1, t / dur) * Math.PI); f.P.yaw += (a * Math.min(1, k * 1.6) - f.P.yaw) * Math.min(1, dt * 6); return t >= dur; } };
  }
  croak(f) {
    // a croak or two (three at night): the throat swelling into a balloon, "Ribbit!" over its head
    let t = 0; const n = f.night ? 2 + Math.floor(this.r() * 2) : 1 + Math.floor(this.r() * 2), each = 0.85;
    return { name: 'croak', run: (f, dt) => {
      const before = t; t += dt;
      const k = t % each, i = Math.floor(t / each);
      f.P.pouch = i < n ? Math.sin(Math.min(1, k / (each * 0.7)) * Math.PI) : 0;
      f.P.nod = -0.06 * f.P.pouch; f.P.pitch = 0.05 * f.P.pouch;
      if (i < n && (before === 0 || Math.floor(before / each) !== i)) this.say(f);              // ("Ribbit!" with each croak)
      return t >= n * each + 0.2;
    } };
  }
  hopAlong(f) {
    // along the bank a little way, in a few hops, to a spot with room, then facing the water
    const [, t0] = this.where(f.pos.x, f.pos.z), R = this.r, dir = R() < 0.5 ? -1 : 1;
    let target = null;
    for (const dd of [dir, -dir]) for (const d of [0.35, 0.25, 0.5, 0.18]) {
      if (target !== null) break;
      const a = t0 + dd * d; let clear = this.okAt(a) && this.roomAt(f, a);
      for (let k = 1; clear && k < 6; k++) clear = this.okAt(t0 + dd * d * k / 6);
      if (clear) target = a;
    }
    if (target === null) return this.sit(f, 1.5);
    f.goal = this.at(target, BANK_K);
    const steps = [], n = Math.max(1, Math.ceil(Math.abs(target - t0) * 2.6 / 0.3));
    for (let i = 1; i <= n; i++) { const a = t0 + (target - t0) * i / n; steps.push(this.at(a, BANK_K)); }
    let i = 0, cur = null;
    return { name: 'hopAlong', run: (f, dt) => {
      if (!cur) { if (i >= steps.length) { const done = this.turnTo(f, this.inward(target), dt); if (done) f.goal = null; return done; } cur = this.hop(f, steps[i][0], steps[i][1], 0.065); i++; }
      if (cur.run(f, dt)) cur = null;
      return false;
    } };
  }
  turnTo(f, h, dt) { const d = wrapA(h - f.heading); const s = Math.sign(d) * Math.min(Math.abs(d), dt * 3.5); f.heading += s; f.P.reach = Math.min(1, Math.abs(d) * 0.4) * 0.25; return Math.abs(d) < 0.04; }
  // one hop to (x, z): crouch, spring (the hind legs straight out behind), fly, land on the front feet, fold up
  hop(f, x, z, h = 0.07, into = null) {
    let t = -1, from = null; const dur = 0.24 + Math.hypot(x - f.pos.x, z - f.pos.z) * 0.6;
    return { name: 'hop', run: (f, dt) => {
      if (t < 0) {                                      // facing the way first
        const want = Math.atan2(x - f.pos.x, z - f.pos.z);
        if (Math.hypot(x - f.pos.x, z - f.pos.z) > 0.02 && !this.turnTo(f, want, dt)) return false;
        t = 0; from = [f.pos.x, f.pos.y, f.pos.z];
      }
      t += dt; const u = Math.min(1, t / dur);
      const pre = 0.12;                                // a crouch before the spring
      if (t < pre) { f.P.ext = 0; f.P.pitch = -0.08 * (t / pre); f.P.reach = 0; return false; }
      const k = Math.min(1, (t - pre) / (dur - pre)), e = sstep(k);
      const y0 = from[1], y1 = into ? into.y : 0.003;
      f.pos.x = from[0] + (x - from[0]) * e; f.pos.z = from[2] + (z - from[2]) * e;
      f.pos.y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * h;
      f.P.ext = k < 0.12 ? k / 0.12 : k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);      // legs out at the spring, folding for the landing
      f.P.reach = Math.sin(Math.min(1, k * 1.3) * Math.PI * 0.5) * (k < 0.9 ? 1 : (1 - k) * 10);
      f.P.pitch = -0.28 * Math.sin(k * Math.PI) + 0.1 * Math.max(0, k - 0.75) * 4;
      if (k >= 1) { f.P.ext = 0; f.P.reach = 0; f.P.pitch = 0; return true; }
      return false;
    } };
  }
  dive(f, startled) {
    // into the water: a hop out over it (bigger if startled), a splash, under, and up again somewhere else a while later
    const [, t] = this.where(f.pos.x, f.pos.z), R = this.r;
    let spot = null;
    for (let i = 0; i < 10 && !spot; i++) { const a = t + (R() - 0.5) * 0.5, [x, z] = this.at(a, 0.82 - R() * 0.08); if (this.wetOk(x, z)) spot = [x, z]; }
    if (!spot) return this.sit(f, 1);
    let stage = 0, jump = null, w = 0;
    return { name: 'dive', run: (f, dt) => {
      if (stage === 0) { jump = jump || this.hop(f, spot[0], spot[1], startled ? 0.14 : 0.09, { y: WATER_Y - 0.03 }); if (jump.run(f, dt)) { stage = 1; this.splash(f.pos.x, f.pos.z, 1); w = 0; } return false; }
      if (stage === 1) {                                 // under it goes
        w += dt; f.P.ext = 0.8; f.P.pitch = 0.2; f.pos.y = WATER_Y - 0.03 - w * 0.35;
        if (w > 0.4) { f.root.visible = false; f.shadow.visible = false; stage = 2; w = 0; f.under = 1.5 + R() * 3.5; }
        return false;
      }
      if (stage === 2) {                                 // swimming underwater: up again elsewhere
        w += dt; if (w < f.under) return false;
        for (let i = 0; i < 12; i++) { const a = t + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 1.2), [x, z] = this.at(a, 0.55 + R() * 0.3); if (this.wetOk(x, z)) { f.pos.set(x, WATER_Y, z); break; } }
        f.heading = R() * Math.PI * 2; f.state = 'water'; f.root.visible = true; this.ring(f.pos.x, f.pos.z, 0.5); stage = 3; w = 0;
        return false;
      }
      w += dt; f.pos.y = WATER_Y; return w > 0.3;      // (bobbing up: the float takes over)
    } };
  }
  float(f, secs) { let t = 0; return { name: 'float', run: (f, dt) => { t += dt; return t >= secs; } }; }
  swimTo(f, x, z) {
    let t = 0;
    return { name: 'swim', run: (f, dt) => {
      t += dt; const d = Math.hypot(x - f.pos.x, z - f.pos.z), want = Math.atan2(x - f.pos.x, z - f.pos.z);
      f.heading += wrapA(want - f.heading) * Math.min(1, dt * 2.5);
      const kick = 0.5 + 0.5 * Math.sin(t * 6), sp = 0.07 + 0.08 * kick;
      f.pos.x += Math.sin(f.heading) * sp * dt; f.pos.z += Math.cos(f.heading) * sp * dt;
      f.kick = kick; if ((f.wakeIn = (f.wakeIn || 0) - dt) <= 0) { f.wakeIn = 0.55; this.ring(f.pos.x - Math.sin(f.heading) * 0.05, f.pos.z - Math.cos(f.heading) * 0.05, 0.22); }
      return d < 0.06 || t > 14;
    } };
  }
  climbOut(f, a) {
    const [wx, wz] = this.at(a, 0.93), [bx, bz] = this.at(a, BANK_K); let sw = null, hp = null;
    f.goal = [bx, bz];
    return { name: 'climbOut', run: (f, dt) => {
      if (!sw) sw = this.swimTo(f, wx, wz);
      if (!hp) { if (sw.run(f, dt)) { hp = this.hop(f, bx, bz, 0.07); f.state = 'bank'; f.pos.y = WATER_Y - 0.01; this.ring(f.pos.x, f.pos.z, 0.35); } return false; }
      if (hp.run(f, dt)) { this.drip(f); f.goal = null; return true; }
      return false;
    } };
  }
  // ---- her lily pad: swimming to its edge and up onto it; off it into the water
  onAnyPad(x, z, m = 0.05) { return this.pads.some(q => Math.hypot(x - q.x, z - q.z) < q.r + m); }
  toPad(f) {
    const P = this.herPad, dx = f.pos.x - P.x, dz = f.pos.z - P.z, d = Math.hypot(dx, dz) || 1, ex = P.x + dx / d * (P.r + 0.07), ez = P.z + dz / d * (P.r + 0.07);
    if (!this.wetOk(ex, ez) || !this.clearSwim(f.pos.x, f.pos.z, ex, ez)) return null;
    let sw = null, hp = null;
    return { name: 'toPad', run: (f, dt) => {
      if (!sw) sw = this.swimTo(f, ex, ez);
      if (!hp) { if (sw.run(f, dt)) { hp = this.hop(f, P.x, P.z, 0.05, { y: PAD_Y }); f.state = 'pad'; f.pos.y = WATER_Y - 0.01; this.ring(f.pos.x, f.pos.z, 0.3); } return false; }
      if (hp.run(f, dt)) { this.drip(f); return true; }
      return false;
    } };
  }
  offPad(f, startled) {
    const P = this.herPad, R = this.r; let spot = null;
    for (let i = 0; i < 16 && !spot; i++) { const a = R() * Math.PI * 2, x = P.x + Math.sin(a) * (P.r + 0.17), z = P.z + Math.cos(a) * (P.r + 0.17); if (this.wetOk(x, z) && !this.onAnyPad(x, z)) spot = [x, z]; }
    if (!spot) spot = [P.x + P.r + 0.17, P.z];
    let jump = null;
    return { name: 'dive', run: (f, dt) => {                 // (a dive, to everyone watching: off the pad with a splash)
      jump = jump || this.hop(f, spot[0], spot[1], startled ? 0.11 : 0.06, { y: WATER_Y - 0.03 });
      if (!jump.run(f, dt)) return false;
      this.splash(f.pos.x, f.pos.z, startled ? 0.8 : 0.45); f.state = 'water'; f.pos.y = WATER_Y; f.floated = false; f.paddled = false;
      return true;
    } };
  }
  // ---- a frog in the water or on the bank: its pose each moment
  pose(f, dt) {
    const P = f.P;
    if (f.state === 'water' && f.root.visible && !(f.task && f.task.name === 'dive' && f.pos.y < WATER_Y - 0.001)) {
      // floating: only the eyes and the top of the head out, the body tipped back, the legs trailing (kicking when paddling)
      const swim = f.task && (f.task.name === 'swim' || f.task.name === 'climbOut');
      P.lift = -0.086 * FROG_S + 0.004 * Math.sin(f.t * 2.1); P.pitch += (0.3 - P.pitch) * Math.min(1, dt * 4);
      P.ext += ((swim ? 0.45 + 0.45 * (f.kick || 0) : 0.7) - P.ext) * Math.min(1, dt * 8); P.reach = 0.3;
    } else { P.lift += (0 - P.lift) * Math.min(1, dt * 8); }
    P.pouch *= f.task && f.task.name === 'croak' ? 1 : Math.max(0, 1 - dt * 6);
    f.root.rotation.y = f.heading;
    f.pose(dt);
    f.shadow.visible = f.root.visible && f.state !== 'water' && f.pos.y < 0.4;
    if (f.shadow.visible) { f.shadow.position.set(f.pos.x, f.state === 'pad' ? PAD_Y + 0.0012 : 0.004, f.pos.z); f.shadow.rotation.y = f.heading; const k = 1 - Math.min(0.5, f.pos.y * 3); f.shadow.scale.setScalar(k); }
  }
  // ---- each moment
  update(dt, hour) {
    this.time += dt;
    const night = hour >= 21.5 || hour < 6, near = this.o.near ? this.o.near() : [];
    for (const f of this.frogs) {
      f.night = night;
      // someone big coming close: in it jumps (or, in the water, under it goes)
      if (!f.task || !/^(dive|hop|hopAlong|climbOut)$/.test(f.task.name)) {
        for (const [x, z] of near) if (Math.hypot(x - f.pos.x, z - f.pos.z) < (f.state === 'water' ? 0.45 : 0.75)) { this.startle(f, false); break; }
      }
      if (!f.task) { if ((f.wait -= dt) > 0) { this.pose(f, dt); continue; } f.task = this.next(f); }
      if (f.task.run(f, dt)) { f.task = null; f.wait = 0.4 + this.r() * (night ? 1.5 : 2.5); }
      this.pose(f, dt);
    }
    this.tickLove(dt, hour, near);
    for (const q of this.pads) { q.mesh.position.y = PAD_Y - 0.0015 + 0.0007 * Math.sin(this.time * 1.3 + q.ph); q.mesh.rotation.y = q.yaw0 + 0.04 * Math.sin(this.time * 0.21 + q.ph); }
    this.tickFx(dt); this.tickHearts(dt);
  }
  startle(f, tapped) {
    f.goal = null;
    if (f.task && f.task.name === 'love') { f.task = null; this.loveStop(f); }
    if (f.state === 'water') {                           // a plop: under, and up elsewhere
      if (!f.root.visible) return;
      this.ring(f.pos.x, f.pos.z, 0.5); f.root.visible = false;
      let w = 0; const R = this.r, under = 1.2 + R() * 2;
      f.task = { name: 'dive', run: (ff, dt) => {
        w += dt; if (w < under) return false;
        const [, a0] = this.where(f.pos.x, f.pos.z);
        for (let i = 0; i < 12; i++) { const a = a0 + (R() < 0.5 ? -1 : 1) * (0.6 + R()), [x, z] = this.at(a, 0.55 + R() * 0.3); if (this.wetOk(x, z)) { f.pos.set(x, WATER_Y, z); break; } }
        f.root.visible = true; this.ring(f.pos.x, f.pos.z, 0.5); return true;
      } };
      return;
    }
    if (tapped) this.say(f);
    if (f.state === 'pad') { f.task = this.offPad(f, true); return; }
    f.task = this.dive(f, true);
  }
  tapped(f) { if (f.task && /^(hop|dive|love)$/.test(f.task.name)) return; this.startle(f, true); }
  // ---- the secret: the salmon and the froglet (Audrey, 28 Oct: "A salmon and a frog are in love ... sometimes, in the
  // pond, the froglet will be on her lily pad and the salmon will take his head out of the water. Both of them will look at
  // each other in love, you can add little hearts, and kiss. After that they both separate. This can happen from a lily
  // pad, or from the side of the lake"). Now and then (a few minutes apart, by day and evening), when she sits on her pad
  // or on the bank, nobody near, nobody fishing the pond and the pond on the screen: his shadow comes gliding in under the
  // water; she turns to him (at the water's very edge, from the bank); up comes his head; they gaze at each other, little
  // hearts rising between them, her eyes gone dreamy, her throat fluttering, his cheeks blushing; they lean in and kiss (a
  // little burst of hearts, her eyes shut); he sinks back and glides away, and she watches him go. Never mentioned, nothing
  // won; tapping her doesn't spoil it; someone coming near does (he's gone, she jumps in).
  tickLove(dt, hour, near) {
    const L = this.loveOn;
    if (L) {
      if (L.stage !== 'on' && !L.aborting) return;          // (she's still on her way to the water's edge)
      if (L.aborting) this.salmonAway(L, dt); else { L.t += dt; this.salmonStep(L, dt); }
      return;
    }
    if (!this.her || (this.loveIn -= dt) > 0 || (this.loveCheck -= dt) > 0) return;
    this.loveCheck = 1;
    const plan = this.canLove(hour, near, false);
    if (plan) this.startLove(plan);
  }
  // (tests and the film: now, if she's sitting on the bank or her pad)
  loveNow() { const plan = this.canLove(12, [], true); if (!plan) return false; this.startLove(plan); return true; }
  startLove(plan) { const f = this.her; if (!this.salmon) this.salmon = this.makeSalmon(); this.loveOn = { plan, stage: 'go', t: 0, hop: null, once: {}, beat: 0 }; f.task = { name: 'love', run: (ff, dt) => this.loveRun(ff, dt) }; f.wait = 0; f.goal = null; }
  canLove(hour, near, force) {
    const f = this.her;
    if (!f || !f.root.visible || !(f.state === 'bank' || f.state === 'pad') || this.loveOn) return null;
    if (f.task && !/^(sit|look)$/.test(f.task.name)) return null;
    if (!force) {
      if (hour < 6.5 || hour >= 21.5) return null;
      if (near.some(([x, z]) => Math.hypot(x - f.pos.x, z - f.pos.z) < 1.6)) return null;
      if (this.frogs.some(g => g !== f && g.root.visible && (g.task && /^(hop|hopAlong|dive|climbOut)$/.test(g.task.name)) && Math.hypot(g.pos.x - f.pos.x, g.pos.z - f.pos.z) < 1.4)) return null;
      if (this.o.busy && this.o.busy()) return null;
      if (this.o.onScreen && !this.o.onScreen(f.pos.x, f.pos.z)) return null;
    }
    return this.lovePlan(f);
  }
  // where: the way she faces (side on to you if it can), where she sits for it, where he comes up, his way in and out
  lovePlan(f) {
    const ac = this.o.across ? this.o.across() : [1, 0], onPad = f.state === 'pad';
    const hs = [];
    if (onPad) for (let k = 0; k < 16; k++) hs.push(k / 16 * Math.PI * 2);
    else { const [, t] = this.where(f.pos.x, f.pos.z), h0 = this.inward(t); for (const d of [0, 0.15, -0.15, 0.3, -0.3, 0.45, -0.45]) hs.push(h0 + d); }
    let best = null;
    for (const h of hs) {
      const fx = Math.sin(h), fz = Math.cos(h); let stand = [f.pos.x, f.pos.z];
      if (!onPad) {                                            // (up to the water's very edge)
        stand = null;
        for (let k = 0; k <= 30; k++) { const q = [f.pos.x + fx * k * 0.01, f.pos.z + fz * k * 0.01]; if (this.where(q[0], q[1])[0] <= 1.006) { stand = q; break; } }
        if (!stand) continue;
      }
      const X = [stand[0] + fx * 0.21, stand[1] + fz * 0.21], deep = [stand[0] + fx * 0.42, stand[1] + fz * 0.42];
      const clear = (x, z) => !(this.o.avoid || []).some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar + 0.25);
      if (!clear(X[0], X[1]) || !clear(deep[0], deep[1]) || this.where(X[0], X[1])[0] > 0.975 || this.where(deep[0], deep[1])[0] > 0.95) continue;
      if (this.pads.some(q => q !== (onPad ? this.herPad : null) && Math.hypot(X[0] - q.x, X[1] - q.z) < q.r + 0.12)) continue;
      // his way in: from out in the pond, curving in; and out again the other way
      const side = [fz, -fx]; let start = null, end = null;
      for (const L of [1.5, 1.2, 0.9]) {
        const a = [X[0] + fx * L + side[0] * 0.5, X[1] + fz * L + side[1] * 0.5], b = [X[0] + fx * L - side[0] * 0.6, X[1] + fz * L - side[1] * 0.6];
        if (!start && this.wetOk(a[0], a[1]) && this.clearSwim(a[0], a[1], X[0], X[1])) start = a;
        if (!end && this.wetOk(b[0], b[1]) && this.clearSwim(X[0], X[1], b[0], b[1])) end = b;
      }
      if (!start || !end) continue;
      const score = Math.abs(fx * ac[0] + fz * ac[1]) - 0.2 * Math.abs(wrapA(h - f.heading));
      if (!best || score > best.score) best = { score, face: h, stand, hop: !onPad && Math.hypot(stand[0] - f.pos.x, stand[1] - f.pos.z) > 0.01, X, start, end, onPad };
    }
    return best;
  }
  makeSalmon() {
    const S = new Fish('salmon', this.o.grade); S.root.visible = false; S.mesh.castShadow = false; S.rate = 4; S.amp = 0.025; this.group.add(S.root);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#203747', transparent: true, opacity: 0, depthWrite: false }));
    sh.material.userData.noGrade = true; sh.renderOrder = 2; sh.visible = false; sh.scale.set(0.075, 1, 0.24); this.group.add(sh); this.sShadow = sh;
    return S;
  }
  loveLean(t) { return t < 6 ? 0 : t < 6.6 ? sstep((t - 6) / 0.6) : t < 7.4 ? 1 : t < 8 ? 1 - sstep((t - 7.4) / 0.6) : 0; }
  loveRise(t) { return t < 2.6 ? 0 : t < 3.4 ? sstep((t - 2.6) / 0.8) : t < 8 ? 1 : t < 8.9 ? 1 - sstep((t - 8) / 0.9) : 0; }
  // where her mouth is (sitting, as she sits for this: on her pad or the bank)
  mouthOf(f, fx, fz) { const sc = f.small || 1; return new THREE.Vector3(f.pos.x + fx * 0.078 * FROG_S * sc, f.pos.y + 0.052 * FROG_S * sc, f.pos.z + fz * 0.078 * FROG_S * sc); }
  // him: his head up out of the water in front of her (rise 0 under, 1 up), leaning in to kiss (lean 0..1)
  placeSalmon(pl, rise, lean, t) {
    const S = this.salmon, f = this.her, fx = Math.sin(pl.face), fz = Math.cos(pl.face);
    const mouth = this.mouthOf(f, fx, fz), gap = 0.06 + (0.004 - 0.06) * lean, up = 0.032 + (0.006 - 0.032) * lean, pitch = (52 - 10 * lean) * Math.PI / 180;
    const target = mouth.add(new THREE.Vector3(fx * gap, up, fz * gap));
    const d = new THREE.Vector3(-fx * Math.cos(pitch), Math.sin(pitch), -fz * Math.cos(pitch));
    const nose = target.clone().addScaledVector(d, -0.36 * (1 - rise));
    const c = nose.clone().addScaledVector(d, -S.spec.L / 2);
    const Y = new THREE.Vector3(0, 1, 0).addScaledVector(d, -d.y).normalize(), roll = 0.07 * Math.sin(t * 1.6);
    Y.applyAxisAngle(d, roll); const X = new THREE.Vector3().crossVectors(Y, d);
    S.root.position.copy(c); S.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, d));
    S.root.visible = rise > 0.003;
    return target;
  }
  salmonStep(L, dt) {
    const t = L.t, pl = L.plan, S = this.salmon, sh = this.sShadow, f = this.her, once = k => (L.once[k] ? false : (L.once[k] = true));
    const rise = this.loveRise(t), lean = this.loveLean(t); L.rise = rise;
    const nose = this.placeSalmon(pl, rise, lean, t);
    S.amp = rise > 0.5 ? 0.018 : 0.04; S.update(dt);
    S.U.blush.value = t < 3.4 ? 0 : t < 4.4 ? t - 3.4 : t < 8.4 ? 1 : Math.max(0, 1 - (t - 8.4) / 0.8);
    // his shadow: gliding in, under him while he's up, gliding away
    const bez = (a, c, b, u) => [a[0] * (1 - u) * (1 - u) + 2 * c[0] * u * (1 - u) + b[0] * u * u, a[1] * (1 - u) * (1 - u) + 2 * c[1] * u * (1 - u) + b[1] * u * u];
    const fx = Math.sin(pl.face), fz = Math.cos(pl.face), deep = [pl.X[0] + fx * 0.16, pl.X[1] + fz * 0.16];
    let at = null, prev = null, op = 0;
    if (t < 2.7) { const c = [(pl.start[0] + deep[0]) / 2 + fz * 0.3, (pl.start[1] + deep[1]) / 2 - fx * 0.3], u = sstep(clamp01(t / 2.6)), u0 = sstep(clamp01((t - 0.05) / 2.6)); at = bez(pl.start, c, deep, u); prev = bez(pl.start, c, deep, u0); op = Math.min(0.3, t * 0.35); }
    else if (t < 8.9) { at = deep; op = 0.16; }
    else { const c = [(deep[0] + pl.end[0]) / 2 - fz * 0.3, (deep[1] + pl.end[1]) / 2 + fx * 0.3], u = sstep(clamp01((t - 8.9) / 2.1)), u0 = sstep(clamp01((t - 8.95) / 2.1)); at = bez(deep, c, pl.end, u); prev = bez(deep, c, pl.end, u0); op = 0.3 * (1 - u); }
    sh.visible = op > 0.005; sh.material.opacity = op; sh.position.set(at[0], WATER_Y + 0.0015, at[1]);
    if (prev && Math.hypot(at[0] - prev[0], at[1] - prev[1]) > 1e-5) sh.rotation.y = Math.atan2(at[0] - prev[0], at[1] - prev[1]); else if (!prev) sh.rotation.y = pl.face;
    // the water: rings as he comes up and goes down, a little one now and then while he's up
    if (t >= 2.65 && once('up')) this.ring(pl.X[0], pl.X[1], 0.45);
    if (t >= 8.35 && once('down')) this.ring(pl.X[0], pl.X[1], 0.42);
    if (rise > 0.9 && (L.beat -= dt) <= 0) { L.beat = 1.4; this.ring(pl.X[0] + fx * 0.02, pl.X[1] + fz * 0.02, 0.16); }
    // hearts: rising between them as they gaze; a little burst as they kiss; one more from her as he goes
    const eyes = this.mouthOf(f, fx, fz).lerp(nose, 0.5); eyes.y += 0.03;
    if (t > 3.5 && t < 6.0 && (L.hb = (L.hb || 0) - dt) <= 0) { L.hb = 0.42; this.heart(eyes.x, eyes.y, eyes.z, 0.048 + Math.random() * 0.018, (Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.04, 0.14); }
    if (t >= 6.62 && once('kiss')) {
      this.heart(eyes.x, eyes.y + 0.025, eyes.z, 0.11, 0, 0, 0.11);
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.3; this.heart(eyes.x, eyes.y, eyes.z, 0.04 + Math.random() * 0.014, Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0.17); }
    }
    if (t >= 9.4 && once('last')) this.heart(f.pos.x, f.pos.y + 0.13 * (f.small || 1), f.pos.z, 0.05, 0, 0, 0.11);
    if (t >= 11.2) this.loveEnd(true);
  }
  // someone came near (or she was startled): he's gone back under at once, and away
  salmonAway(L, dt) {
    L.at = (L.at || 0) + dt; const k = clamp01(L.at / 0.35), S = this.salmon, pl = L.plan;
    if (S) { this.placeSalmon(pl, (L.rise || 0) * (1 - sstep(k)), 0, L.t); S.update(dt); S.U.blush.value *= 1 - Math.min(1, dt * 4); }
    if ((L.rise || 0) > 0.05 && !L.once.gone) { L.once.gone = true; this.ring(pl.X[0], pl.X[1], 0.5); }
    if (this.sShadow) { this.sShadow.material.opacity = Math.max(0, 0.3 * (1 - L.at / 0.9)); this.sShadow.position.x += Math.sin(pl.face) * dt * 0.9; this.sShadow.position.z += Math.cos(pl.face) * dt * 0.9; this.sShadow.visible = L.at < 0.9; }
    if (L.at > 1.0) this.loveEnd(false);
  }
  loveStop(f) { const L = this.loveOn; if (L && !L.aborting) { L.aborting = true; L.at = 0; if (L.stage !== 'on') this.loveEnd(false); } this.calm(f); }
  calm(f) { const P = f.P; P.blink = 0; P.nod = 0; P.pitch = 0; P.reach = 0; }
  loveEnd(done) {
    if (this.salmon) { this.salmon.root.visible = false; this.salmon.U.blush.value = 0; }
    if (this.sShadow) this.sShadow.visible = false;
    this.loveOn = null; this.loveIn = done ? 300 + this.loveR() * 420 : 90 + this.loveR() * 120; this.loveCheck = 0;
    if (done) this.loves = (this.loves || 0) + 1;
    if (this.her && (!this.her.task || this.her.task.name !== 'love')) this.calm(this.her);
  }
  // her side of it: to the water's edge (from the bank), turned to him; looking, dreamy, leaning in, eyes shut for the kiss
  loveRun(f, dt) {
    const L = this.loveOn; if (!L || L.aborting) { this.calm(f); return true; }
    const P = f.P, pl = L.plan;
    if (L.stage === 'go') { if (pl.hop) { L.hop = L.hop || this.hop(f, pl.stand[0], pl.stand[1], 0.035); if (!L.hop.run(f, dt)) return false; } L.stage = 'turn'; }
    if (L.stage === 'turn') { if (!this.turnTo(f, pl.face, dt)) return false; L.stage = 'on'; L.t = 0; return false; }
    const t = L.t, lean = this.loveLean(t), ease = (k, v, r = 5) => k + (v - k) * Math.min(1, dt * r);
    let yaw = 0;
    if (this.sShadow && this.sShadow.visible && (t < 2.6 || t > 8.9)) { const a = Math.atan2(this.sShadow.position.x - f.pos.x, this.sShadow.position.z - f.pos.z); yaw = Math.max(-0.55, Math.min(0.55, wrapA(a - f.heading))); }
    else if (t >= 3.4 && t < 8) yaw = 0.06 * Math.sin(t * 1.3);
    P.yaw = ease(P.yaw, yaw, 4);
    P.nod = ease(P.nod, t > 2.6 && t < 8.6 ? -0.14 - 0.06 * lean : 0, 4);
    P.pitch = ease(P.pitch, -0.1 * lean, 6); P.reach = ease(P.reach, 0.3 * lean, 6);
    P.blink = ease(P.blink, t > 6.45 && t < 7.45 ? 1 : t > 3.4 && t < 8.6 ? 0.42 : 0, 8);
    if (t > 3.4 && t < 8) P.pouch = Math.max(P.pouch, 0.16 * Math.pow(Math.max(0, Math.sin(t * 6.5)), 6));      // (a fluttering heart)
    if (t >= 11.2) { this.calm(f); return true; }
    return false;
  }
  heart(x, y, z, size, vx = 0, vz = 0, vy = 0.12) {
    if (!this.heartTex) this.heartTex = heartTexture();
    let h = this.hearts.find(q => q.life <= 0);
    if (!h) { if (this.hearts.length > 24) return; h = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heartTex, transparent: true, depthWrite: false })), life: 0 }; h.sp.material.userData.noGrade = true; h.sp.renderOrder = 12; this.group.add(h.sp); this.hearts.push(h); }
    h.p = new THREE.Vector3(x, y, z); h.v = new THREE.Vector3(vx, vy, vz); h.size = size; h.life = h.full = 1.7; h.ph = Math.random() * 6; h.sp.visible = true;
  }
  tickHearts(dt) {
    for (const h of this.hearts) {
      if (h.life <= 0) continue; h.life -= dt; if (h.life <= 0) { h.sp.visible = false; continue; }
      const u = 1 - h.life / h.full; h.p.addScaledVector(h.v, dt); h.v.x *= 1 - Math.min(1, dt * 2); h.v.z *= 1 - Math.min(1, dt * 2); h.v.y = Math.max(0.06, h.v.y * (1 - dt * 0.6));
      h.sp.position.set(h.p.x + 0.01 * Math.sin(h.ph + u * 8), h.p.y, h.p.z);
      const sc = h.size * Math.min(1, u * 6) * (1 + 0.12 * Math.sin(u * 22)); h.sp.scale.set(sc, sc, sc); h.sp.material.opacity = Math.min(1, (1 - u) * 2.5);
    }
  }
  // ---- the water's answers: rings, a splash, drips; and the croak's "Ribbit!"
  ring(x, z, size) {
    let s = this.fx.rings.find(q => q.life <= 0);
    if (!s) { s = { mesh: new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.ringTex, transparent: true, depthWrite: false, opacity: 0 })), life: 0 }; s.mesh.renderOrder = 2; s.mesh.material.userData.noGrade = true; this.group.add(s.mesh); this.fx.rings.push(s); }
    s.mesh.position.set(x, WATER_Y + 0.002, z); s.life = s.full = 1.6; s.size = size; s.mesh.visible = true;
  }
  splash(x, z, k, quiet) {
    if (!quiet && this.o.heard) this.o.heard(x, z);          // (the ducks hear it: a curious one paddles over to look)
    this.ring(x, z, 0.6 * k); setTimeout(() => this.ring(x, z, 0.35 * k), 180);
    for (let i = 0; i < 9; i++) {
      let d = this.fx.drops.find(q => q.life <= 0);
      if (!d) { d = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dropTex, transparent: true, depthWrite: false })), life: 0 }; d.sp.material.userData.noGrade = true; d.sp.renderOrder = 3; this.group.add(d.sp); this.fx.drops.push(d); }
      const a = this.r() * Math.PI * 2, v = 0.25 + this.r() * 0.35;
      d.p = new THREE.Vector3(x, WATER_Y + 0.02, z); d.v = new THREE.Vector3(Math.cos(a) * v * 0.5, 0.7 + this.r() * 0.6, Math.sin(a) * v * 0.5); d.life = 1; d.sp.visible = true;
      d.sp.scale.setScalar(0.022 + this.r() * 0.016);
    }
  }
  drip(f) { this.ring(f.pos.x, f.pos.z, 0.18); }
  say(f) {
    if (this.o.heard) this.o.heard(f.pos.x, f.pos.z);
    let b = this.fx.bubbles.find(q => q.life <= 0);
    if (!b) { b = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: this.bubbleTex, transparent: true, depthWrite: false, depthTest: false })), life: 0 }; b.sp.material.userData.noGrade = true; b.sp.renderOrder = 12; this.group.add(b.sp); this.fx.bubbles.push(b); }
    b.f = f; b.life = b.full = 1.3; b.sp.visible = true;
  }
  tickFx(dt) {
    for (const s of this.fx.rings) {
      if (s.life <= 0) continue; s.life -= dt; if (s.life <= 0) { s.mesh.visible = false; continue; }
      const u = 1 - s.life / s.full; s.mesh.scale.setScalar(s.size * (0.25 + 0.75 * u)); s.mesh.material.opacity = 0.55 * (1 - u) * (1 - u);
    }
    for (const d of this.fx.drops) {
      if (d.life <= 0) continue; d.life -= dt;
      d.v.y -= 3.2 * dt; d.p.addScaledVector(d.v, dt); if (d.p.y < WATER_Y || d.life <= 0) { d.life = 0; d.sp.visible = false; continue; }
      d.sp.position.copy(d.p);
    }
    for (const b of this.fx.bubbles) {
      if (b.life <= 0) continue; b.life -= dt; if (b.life <= 0 || !b.f.root.visible) { b.life = 0; b.sp.visible = false; continue; }
      const u = 1 - b.life / b.full, s = 0.17 * Math.min(1, u * 6);
      b.sp.scale.set(s, s * 112 / 256, 1); b.sp.position.set(b.f.pos.x, b.f.pos.y + 0.2 + u * 0.03, b.f.pos.z); b.sp.material.opacity = Math.min(1, b.life * 3);
    }
  }
  visible() { return true; }
}
let blobTex2 = null;
function shadowBlob(r) {
  if (!blobTex2) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.4)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64); blobTex2 = new THREE.CanvasTexture(cv);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex2, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  m.renderOrder = 1; m.material.userData.noGrade = true;
  return m;
}

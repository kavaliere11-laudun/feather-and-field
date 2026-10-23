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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const FR = new URLSearchParams(location.search).get('lang') === 'fr';
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
    this.label = FR ? 'Grenouille' : 'Frog';
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
const TXT = { ribbit: ['Ribbit!', 'Croâ !'] };
function bubbleTexture(text) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 112; const c = cv.getContext('2d');
  c.font = '800 46px Nunito, system-ui, sans-serif'; const w = Math.min(236, c.measureText(text).width + 44);
  const x0 = (256 - w) / 2;
  c.fillStyle = 'rgba(255,253,247,0.96)'; c.beginPath(); c.roundRect(x0, 8, w, 72, 34); c.fill();
  c.beginPath(); c.moveTo(118, 78); c.lineTo(138, 78); c.lineTo(124, 102); c.fill();
  c.fillStyle = '#2e5a1c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 128, 46);
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

export class FrogPond {
  // o: { pond: V.pond, avoid: [[x, z, r]] (the dock), mouths: [[x, z]] (where the streams meet it), spots: [[x, y, z]],
  //      near(): [[x, z], ...] (geese, Biscuit, Rusty: anyone who'd make a frog jump in), grade, lang, toCamera(x, z) }
  constructor(scene, o, r) {
    this.o = o; this.r = r; this.lang = o.lang === 'fr' ? 1 : 0;
    const P = o.pond; this.c = [P.center[0], P.center[2]]; this.U = [P.axisU[0], P.axisU[2]]; this.V = [P.axisV[0], P.axisV[2]];
    this.u2 = this.U[0] ** 2 + this.U[1] ** 2; this.v2 = this.V[0] ** 2 + this.V[1] ** 2;
    this.group = new THREE.Group(); scene.add(this.group);
    this.fx = { rings: [], drops: [], bubbles: [] };
    this.ringTex = ringTexture(); this.dropTex = dropTexture(); this.bubbleTex = bubbleTexture(TXT.ribbit[this.lang]);
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
    if (f.state === 'water') {
      // floating a while, paddling about a little, then out onto the bank at a spot with room
      if (!f.floated) { f.floated = true; return this.float(f, 3 + R() * 4); }
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
    if (f.shadow.visible) { f.shadow.position.set(f.pos.x, 0.004, f.pos.z); f.shadow.rotation.y = f.heading; const k = 1 - Math.min(0.5, f.pos.y * 3); f.shadow.scale.setScalar(k); }
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
    this.tickFx(dt);
  }
  startle(f, tapped) {
    f.goal = null;
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
    f.task = this.dive(f, true);
  }
  tapped(f) { if (f.task && /^(hop|dive)$/.test(f.task.name)) return; this.startle(f, true); }
  // ---- the water's answers: rings, a splash, drips; and the croak's "Ribbit!"
  ring(x, z, size) {
    let s = this.fx.rings.find(q => q.life <= 0);
    if (!s) { s = { mesh: new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.ringTex, transparent: true, depthWrite: false, opacity: 0 })), life: 0 }; s.mesh.renderOrder = 2; s.mesh.material.userData.noGrade = true; this.group.add(s.mesh); this.fx.rings.push(s); }
    s.mesh.position.set(x, WATER_Y + 0.002, z); s.life = s.full = 1.6; s.size = size; s.mesh.visible = true;
  }
  splash(x, z, k) {
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

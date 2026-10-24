// The farm's animals that aren't chickens. First the fox family: Rusty (dad), Fennel (mum) and their three cubs, who live in
// a den at the edge of the woods and come out now and then to play in the meadow: the cubs chase and wrestle and chase their
// own tails and the butterflies, dad listens for mice and pounces nose-first into the grass, mum keeps an eye on everyone.
// Models (beasts.glb / beasts.json, stylized/beasts.py, export_beasts.py): one skinned mesh each with vertex colours, fur
// regions and bones (root, hips, chest, neck, head, three in the tail, two in each leg); furred here with the birds' fur.
import * as THREE from 'three';
import { addFur, R, furMaterial, furHooks, indoorMaterial } from './birds.js';

let MODELS = {};
const FR = typeof location !== 'undefined' && /[?&]lang=fr\b/.test(location.search);
export function initBeasts(gltf, json) {
  MODELS = {};
  for (const child of gltf.scene.children) {
    let mesh = null; child.traverse(c => { if (c.isMesh && !mesh) mesh = c; });
    if (!mesh) continue;
    mesh.geometry.computeBoundingBox();
    MODELS[child.name] = { geo: mesh.geometry, piv: json.models[child.name], built: null };
  }
}

// fur: a red fox's coat (longer on the brush, short on the legs and face), a cub's softer and fluffier
const FUR = {
  fox: { len: { [R.body]: 0.034, [R.crest]: 0.008, [R.tail]: 0.068, [R.legfeather]: 0.008, [R.down]: 0.018 }, shells: 12, droop: 0.18, clump: 0.55, fine: 1.0, wave: 0.45,
         comb: 0.7, under: 0.7, face: 0.5, locks: 0.11 },
  cub: { len: { [R.body]: 0.027, [R.crest]: 0.008, [R.tail]: 0.042, [R.legfeather]: 0.012, [R.down]: 0.016 }, shells: 12, droop: 0.15, clump: 0.35, fine: 1.05, wave: 0.7,
         comb: 0.45, under: 1.0, face: 0.45, locks: 0.075 },
  // Biscuit the Border Collie: a long silky coat, a thick ruff round the neck and chest, feathering down the backs of the
  // legs, a plumed tail; short and smooth on the face and the fronts of the legs
  // (crisp: his strands drawn sharp, bigger locks, more layers, so the coat reads as hair close up, not a haze; the face
  // short-haired and the eyes clear of hair)
  collie: { len: { [R.body]: 0.05, [R.crest]: 0.007, [R.tail]: 0.075, [R.legfeather]: 0.016, [R.down]: 0.014 }, shells: 16, droop: 0.32, clump: 0.62, fine: 1.0, wave: 0.55,
         comb: 0.78, under: 0.9, face: 0.75, faceR: 1.3, eyeClear: 0.9, locks: 0.32, crisp: 0.8 },
};
const SIZE = { cub: 0.56, collie: 1.08 };
// (tests: ?dogfur=locks:0.3,crisp:0.9 tries other numbers on the dog's coat; numbers only, known keys only)
if (typeof location !== 'undefined') for (const kv of (new URLSearchParams(location.search).get('dogfur') || '').split(',')) {
  const [k, v] = kv.split(':'), x = parseFloat(v);
  if (['locks', 'crisp', 'droop', 'comb', 'shells', 'face', 'faceR', 'eyeClear', 'under', 'wave'].includes(k) && isFinite(x)) FUR.collie[k] = k === 'shells' ? Math.max(2, Math.min(24, Math.round(x))) : x;
}
function beastGeometry(name) {
  const M = MODELS[name];
  if (M.built) return M.built;
  const src = M.geo, n = src.attributes.position.count, base = src.attributes.color, k = base.normalized ? 1 / 255 : 1;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) col[i * 3 + j] = base.array[i * base.itemSize + j] * k;
  let g = new THREE.BufferGeometry();
  for (const a of ['position', 'normal', 'skinIndex', 'skinWeight']) g.setAttribute(a, src.attributes[a]);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('featherSize', new THREE.BufferAttribute(new Float32Array(n), 1)); g.setAttribute('featherHead', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('featherPattern', new THREE.BufferAttribute(new Float32Array(n * 4), 4)); g.setAttribute('featherMode', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('featherUV', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('eyeAt', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  g.setIndex(src.index);
  g.boundingBox = src.boundingBox.clone(); g.computeBoundingSphere();
  g = addFur(g, src, FUR[name], M.piv.headc, M.piv.eyeL ? [M.piv.eyeL, M.piv.eyeR] : null);
  return (M.built = g);
}

const PARENT = { hips: 'root', chest: 'hips', neck: 'chest', head: 'neck', tail1: 'hips', tail2: 'tail1', tail3: 'tail2', tail4: 'tail3',
  FLu: 'chest', FLl: 'FLu', FLw: 'FLl', FRu: 'chest', FRl: 'FRu', FRw: 'FRl',
  HLu: 'hips', HLk: 'HLu', HLl: 'HLk', HRu: 'hips', HRk: 'HRu', HRl: 'HRk',
  jaw: 'head', earL: 'head', earR: 'head', blinkL: 'head', blinkR: 'head', lidL: 'head', lidR: 'head' };
// the dog's upper eyelids (stylized/beasts.py LID_OPEN, LID_SHUT): how far each turns from open to shut, radians
const LID_SWEEP = (70 + 75) * Math.PI / 180;
const LEGS = ['FL', 'FR', 'HL', 'HR'];
// each leg's three bones, top down: front shoulder (upper arm), elbow (forearm), wrist (the paw); hind hip (thigh), knee
// (shin), hock (the long foot); and the toe pivot where it meets the ground
const LEG_BONES = { FL: ['FLu', 'FLl', 'FLw'], FR: ['FRu', 'FRl', 'FRw'], HL: ['HLu', 'HLk', 'HLl'], HR: ['HRu', 'HRk', 'HRl'] };
const TAIL = ['tail1', 'tail2', 'tail3', 'tail4'];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = x => Math.min(1, Math.max(0, x));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const arg = (y, z) => Math.atan2(z, y);           // a direction in a bone's side view (y up, z forward); rotation.x adds to it
const _m = new THREE.Matrix4(), _mi = new THREE.Matrix4(), _v = new THREE.Vector3(), _d = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _j = new THREE.Vector3(), _e = new THREE.Vector3(), _w = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qr = new THREE.Quaternion();

// A four-legged animal's body and bones, posed from a few numbers (as the birds' Rig): the actor sets the gait and what it's
// doing (sitting, lying, a play bow, rearing up to box, rolling over, the leap, nose-down in the grass...). The feet are
// placed and the legs bend to reach them (shoulder, elbow and wrist; hip, knee and hock), so every step, crouch, sit and
// landing folds them naturally; a leg in the air (rearing, leaping, kicking on its back) is posed joint by joint instead.
export class Quad {
  constructor(name, joints) {
    const M = MODELS[name], P = M.piv;
    this.name = name; this.S = SIZE[name] || 1.0; this.hy = P.hips[1]; this.piv = P;
    this.mesh = new THREE.SkinnedMesh(beastGeometry(name), furMaterial()); furHooks(this.mesh);
    this.mesh.receiveShadow = true;
    this.bones = {}; this.rest = {};
    const list = joints.map(nm => {
      const b = new THREE.Bone(); b.name = nm;
      const p = P[nm] || [0, 0, 0], q = PARENT[nm] ? (P[PARENT[nm]] || [0, 0, 0]) : [0, 0, 0];
      b.position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      this.bones[nm] = b; this.rest[nm] = b.position.clone();
      return b;
    });
    for (const nm of joints) if (PARENT[nm]) this.bones[PARENT[nm]].add(this.bones[nm]);
    this.mesh.add(this.bones.root);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(list));
    this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, this.hy, 0), 0.95 * this.S);      // room for any pose
    // the body turns, rolls and pitches round its middle (tilt), not round its feet
    this.tilt = new THREE.Group(); this.tilt.position.y = this.hy; this.tilt.add(this.mesh); this.mesh.position.y = -this.hy;
    // the legs at rest, in their parent's frame (side view: y up, z forward)
    const yz = a => [a[1], a[2]];
    this.legs = {};
    for (const L of LEGS) {
      const [b0, b1, b2] = LEG_BONES[L], par = P[PARENT[b0]], j0 = P[b0], j1 = P[b1], j2 = P[b2], toe = P[L + 'p'];
      const rel = a => [a[1] - par[1], a[2] - par[2]];
      const S0 = rel(j0), S1 = rel(j1), S2 = rel(j2), T = rel(toe);
      this.legs[L] = { front: L[0] === 'F', S0, a1: arg(S1[0] - S0[0], S1[1] - S0[1]), a2: arg(S2[0] - S1[0], S2[1] - S1[1]),
        L1: Math.hypot(S1[0] - S0[0], S1[1] - S0[1]), L2: Math.hypot(S2[0] - S1[0], S2[1] - S1[1]),
        d3: [T[0] - S2[0], T[1] - S2[1]], toe: new THREE.Vector3(toe[0], toe[1], toe[2]), x: toe[0] };
    }
    this.tY = [0, 0, 0, 0]; this.tYv = [0, 0, 0, 0];
    for (const L of LEGS) this.bones[LEG_BONES[L][0]].rotation.order = 'ZYX';      // (a leg swings out sideways after its bend: see pose)
    // eyelids (the dog's): each turns about its eye's across axis to close, and about its forward axis to tilt; inner: which
    // way along the across axis is towards the nose
    if (P.lidaxL && this.bones.lidL) {
      this.lids = {};
      for (const sd of ['L', 'R']) {
        const c = new THREE.Vector3().fromArray(P['lid' + sd]), ax = new THREE.Vector3().fromArray(P['lidax' + sd]).sub(c).normalize();
        const fw = new THREE.Vector3().fromArray(P['lidfw' + sd]).sub(c).normalize();
        this.lids[sd] = { ax, fw, inner: ax.x * c.x < 0 ? 1 : -1 };
      }
    }
  }
  // in the den's tunnel: darker the deeper in (box = { inv, lo, hi } in the den's frame), or out in the open (null)
  shade(box) {
    if (box) {
      if (!this.inMat) this.inMat = indoorMaterial();
      const u = this.inMat.userData.inU; u.inMat.value.copy(box.inv); u.inLo.value.copy(box.lo); u.inHi.value.copy(box.hi);
    }
    const m = box ? this.inMat : furMaterial();
    if (this.mesh.material !== m) this.mesh.material = m;
  }
  // a leg's bones from where its toe should be (mesh frame) and which way its last part (paw, long foot) points (side view)
  reach(L, target, paw, flexW) {
    const G = this.legs[L], B = this.bones, [b0, b1, b2] = LEG_BONES[L];
    // into the frame of the bone the leg hangs from (chest or hips, as posed so far)
    _m.identity(); for (const nm of G.front ? ['root', 'hips', 'chest'] : ['root', 'hips']) { B[nm].updateMatrix(); _m.multiply(B[nm].matrix); }
    _mi.copy(_m).invert();
    _v.copy(target).applyMatrix4(_mi);
    _d.set(0, paw[0], paw[1]).transformDirection(_mi);
    const len3 = Math.hypot(G.d3[0], G.d3[1]), dy = _d.y * len3, dz = _d.z * len3;
    // the joint above the paw goes where the paw's own length leaves it; the upper two bones reach it (elbow back, knee forward)
    const wy = _v.y - dy, wz = _v.z - dz, vy = wy - G.S0[0], vz = wz - G.S0[1];
    const dist = Math.min((G.L1 + G.L2) * (G.front ? 0.999 : 0.95), Math.max(Math.abs(G.L1 - G.L2) + 1e-4, Math.hypot(vy, vz)));     // (a hind knee never quite straight)
    const dir = arg(vy, vz), a = Math.acos(Math.min(1, Math.max(-1, (G.L1 * G.L1 + dist * dist - G.L2 * G.L2) / (2 * G.L1 * dist))));
    const e = dir + (G.front ? a : -a), ey = G.S0[0] + G.L1 * Math.cos(e), ez = G.S0[1] + G.L1 * Math.sin(e);
    const qy = G.S0[0] + dist * Math.cos(dir), qz = G.S0[1] + dist * Math.sin(dir);
    const t0 = wrap(e - G.a1), t1 = wrap(arg(qy - ey, qz - ez) - G.a2 - t0), t2 = wrap(arg(dy, dz) - arg(G.d3[0], G.d3[1]) - t0 - t1);
    B[b0].rotation.x += t0 * flexW; B[b1].rotation.x += t1 * flexW; B[b2].rotation.x += t2 * flexW;
  }
  pose(s) {
    const B = this.bones, S = this.S, t = s.t, hy = this.hy;
    for (const nm in B) { B[nm].rotation.set(0, 0, 0); B[nm].position.copy(this.rest[nm]); B[nm].scale.set(1, 1, 1); }
    const g = s.walk || 0, run = s.run || 0, ph = s.phase || 0;
    const sit = s.sit || 0, lie = s.lie || 0, bow = s.bow || 0, rear = s.rear || 0, crouch = s.crouch || 0, air = s.air || 0, dive = s.dive || 0;
    const shake = s.shake || 0, scratch = s.scratch || 0, kick = s.kick || 0;
    const turn = Math.max(-3, Math.min(3, s.turn || 0));
    const bank = s.groundF !== undefined ? 0 : 0.1 * turn * smooth(0.6, 1.5, s.speed || 0);       // (leaning into a turn at a trot or a run, on flat ground)
    let roll = (s.roll || 0) - bank, pitch = s.pitch || 0;     // (leaning into a turn when on the move)
    const rolled = Math.min(1, Math.abs(s.roll || 0) / 1.5);
    if (shake > 0) roll += 0.22 * shake * Math.sin(t * 36);          // the shake: the body rocks side to side (the feet stay put, below)
    // ---- the body over its legs: how far the middle comes down, the spine
    let lower = crouch * 0.11 * S + 0.025 * S * shake * (1 - sit);            // (knees a little bent to shake: room for the legs to reach out sideways)
    if (sit > 0) {          // sitting: the hips go down and the body pitches up round them
      B.hips.rotation.x -= 0.72 * sit; lower += 0.15 * S * sit;
      B.neck.rotation.x += 0.3 * sit; B.head.rotation.x += 0.25 * sit;
    }
    if (lie > 0) { lower += (hy - 0.115 * S) * lie; B.neck.rotation.x += (s.chin || 0) * 0.5 * (1 - rolled); }
    // rolled onto his back: the head and neck stretched out in line with the spine (not held up as standing, which upside
    // down bends them into the ground)
    if (rolled > 0) { B.neck.rotation.x += 0.85 * rolled; B.head.rotation.x -= 0.75 * rolled; }      // (the neck down level with the back, the head turned back up so the nose points straight on)
    if (bow > 0) { B.chest.rotation.x += 0.42 * bow; lower += 0.02 * S * bow; B.hips.rotation.x -= 0.12 * bow; B.neck.rotation.x -= 0.5 * bow; B.head.rotation.x -= 0.2 * bow; }
    if (rear > 0) { B.hips.rotation.x -= 1.05 * rear; B.neck.rotation.x += 0.55 * rear; B.head.rotation.x += 0.45 * rear; }
    if (dive > 0) B.neck.rotation.x += 0.35 * dive;
    // reaching down with his mouth (s.reach, below): the shoulders go down and forward, elbows bending, so his head can get
    // right down to the ground; the neck and head do the rest
    const reachK = Math.min(1, Math.max(s.reach || 0, 0.7 * (s.duck || 0)));          // (ducking under something: the same, a little less)
    if (reachK > 0) { B.chest.rotation.x += 0.85 * reachK; B.chest.position.y -= 0.16 * S * reachK; B.hips.rotation.x -= 0.1 * reachK; lower += 0.03 * S * reachK; }
    B.neck.rotation.x += 0.35 * crouch; B.head.rotation.x -= 0.25 * crouch;
    // a dog carries his head up, alert, where a fox holds his lower (less when bowing, lying with his chin down, on his back)
    if (this.name === 'collie') { const k = (1 - rolled) * (1 - bow) * (1 - 0.7 * (s.chin || 0) * lie); B.neck.rotation.x -= 0.3 * k; B.head.rotation.x += 0.2 * k; }
    // breathing, and the step's bob (the feet stay down: the legs take it)
    lower -= 0.004 * S * Math.sin(t * 2.2) * (1 - g);
    lower += (0.006 * g * (1 - run) * Math.cos(2 * ph) + 0.022 * run * Math.max(0, Math.sin(ph))) * S * -1;
    // the spine: flexing with the gallop, bending into a turn; the head held steady
    B.hips.rotation.x += 0.1 * run * Math.sin(ph); B.chest.rotation.x -= 0.16 * run * Math.sin(ph); B.head.rotation.x += 0.12 * run * Math.sin(ph);
    B.chest.rotation.y += 0.07 * turn * (1 - rolled); B.hips.rotation.y -= 0.04 * turn * (1 - rolled); B.neck.rotation.y += 0.06 * turn * (1 - rolled);
    // ---- the legs
    // where each foot goes: on the ground under the body, stepping (a trot in diagonal pairs blending into the gallop): on
    // the ground moving back as long as the body moves forward, then lifted, folded and swung forward; under the body when
    // sitting, out in front when lying down or bowing
    const offs = { FL: 0, HR: 0, FR: Math.PI, HL: Math.PI }, goffs = { FL: 0, FR: 0.55, HL: Math.PI, HR: Math.PI + 0.55 };
    const duty = 0.6 - 0.22 * run, stride = s.stride || 0.5 * S, amp = duty * stride / 2 * g;
    const lift = (0.045 + 0.04 * run) * S * g;
    for (const L of LEGS) {
      const G = this.legs[L], [b0, b1, b2] = LEG_BONES[L], front = G.front;
      const u = (((ph + offs[L] * (1 - run) + goffs[L] * run) / (Math.PI * 2)) % 1 + 1) % 1;
      let dz, dy = 0, flex = 0, push = 0;
      // (a hind foot lifts less and folds less as it swings forward than a front one: the hock flexes, the paw stays low;
      // at the end of each step the heel comes up off the ground first, the toes last)
      if (u < duty) { dz = amp * (1 - 2 * u / duty); push = smooth(0.55 * duty, duty, u) * g; }
      else { const v = (u - duty) / (1 - duty), w = smooth(0, 1, v); dz = amp * (2 * w - 1); dy = lift * (front ? 1 : 0.75) * Math.pow(Math.sin(Math.PI * v), 0.8); flex = Math.sin(Math.PI * Math.min(1, v * 1.15)); push = (1 - smooth(0, 0.35, v)) * g; }
      // a hind foot comes down about under the hip and pushes off well behind it (so the hock always points back); a front
      // foot reaches forward and leaves under the shoulder
      dz += amp * (front ? 0.3 : -0.5);
      // the leg's own posing (not on the ground): rearing up, in the air, nose-down after a dive, kicking on its back, a scratch
      const free = front ? Math.max(rear, air, dive, kick, rolled) : Math.max(air, dive, kick, rolled, L === 'HR' ? scratch : 0);
      const onGround = 1 - free;
      if (onGround > 0.001) {
        const flat = front ? Math.max(lie, bow) : Math.max(sit, lie) * 0.95;          // the paw / long foot laid along the ground
        dz += front ? 0.17 * S * lie + 0.13 * S * bow - 0.03 * S * sit : 0.09 * S * sit + 0.06 * S * lie;
        // which way the last part points: as at rest, or laid flat forward; curled back while it swings forward
        let aim = arg(G.d3[0], G.d3[1]); aim += wrap(arg(-0.14, 1) - aim) * flat + flex * (front ? 1.15 : 0.38) - push * (front ? 0.3 : 0.45) * (1 - flat);
        _v.copy(G.toe); _v.y += lower + dy; _v.z += dz;
        // on a slope (a ramp, a bridge's deck): the ground's height under these feet (s.groundF / s.groundH, world, above
        // the root), so with the body lifted and tipped the feet stand on it exactly
        if (s.groundF !== undefined) {
          const p = (s.pitch || 0) + 1.1 * dive, yt = hy - lower + (s.lift || 0);
          // (each foot's own ground where it is, forward or back in its stride, when the task can say: a ramp's edge under one
          // front foot and not the other)
          const fwd = (G.toe.y + lower - hy) * Math.sin(p) + (G.toe.z + dz) * Math.cos(p);
          const R = s.groundAt ? s.groundAt(fwd) : front ? s.groundF : s.groundH;
          _v.y = G.toe.y + dy + hy + (R - yt + (G.toe.z + dz) * Math.sin(p)) / Math.cos(p);
          aim -= (s.slopeAt ? s.slopeAt(fwd) : (front ? s.slopeF : s.slopeH) || 0) + p;            // the paw along the slope it stands on
        }
        // the body rocked or leaning (a shake, a turn): the foot stays where it stands on the ground, the leg swung out
        // sideways at the shoulder or hip to reach it (Audrey: "When he shakes, the legs need to stay on the floor")
        let swing = 0;
        if (Math.abs(roll) > 1e-3 && rolled < 0.05) {
          const dx = _v.x, dy = _v.y - hy, c = Math.cos(roll), sn = Math.sin(roll);
          const x2 = dx * c + dy * sn, y2 = -dx * sn + dy * c + hy;                 // (where the ground spot is in the rocked body)
          // (worked out in the frame the leg hangs from, the chest's or the hips', as they're turned: its swing is about
          // that frame's forward axis, at the shoulder or hip)
          _m.identity(); for (const nm of front ? ['root', 'hips', 'chest'] : ['root', 'hips']) { B[nm].updateMatrix(); _m.multiply(B[nm].matrix); }
          _mi.copy(_m).invert();
          const jp = B[b0].position, tp = _e.set(x2, y2, _v.z).applyMatrix4(_mi), tq = _w.copy(_v).applyMatrix4(_mi);
          swing = Math.atan2(tp.x - jp.x, jp.y - tp.y) - Math.atan2(tq.x - jp.x, jp.y - tq.y);
          const rx = tp.x - jp.x, ry = tp.y - jp.y, cs = Math.cos(-swing), ss = Math.sin(-swing);
          _v.set(jp.x + rx * cs - ry * ss, jp.y + rx * ss + ry * cs, tp.z).applyMatrix4(_m);     // (the leg's own plane: reached, then swung out)
        }
        this.reach(L, _v, [Math.cos(aim), Math.sin(aim)], onGround);
        if (swing) B[b0].rotation.z += swing * onGround;
      }
      if (free > 0.001) {
        const U = B[b0].rotation, M = B[b1].rotation, W = B[b2].rotation;
        if (front) {
          if (rear > 0) { const bat = s.paw || 0; U.x += (-0.55 * rear + 0.5 * bat * Math.sin(t * 9 + (L === 'FR' ? 2.2 : 0))); M.x += 0.95 * rear; W.x += 0.55 * rear; }
          if (air > 0) {                 // the leap: folded up under the chest clearing the fence, then reaching to land
            const k = s.airPh === undefined ? 1 : smooth(0.4, 0.75, s.airPh);
            U.x += air * (-0.25 * (1 - k) - 0.95 * k); M.x += air * (1.5 * (1 - k) - 0.1 * k); W.x += air * (0.9 * (1 - k) + 0.3 * k);
          }
          if (dive > 0) { U.x -= 0.35 * dive; M.x += 0.2 * dive; }
        } else {
          if (air > 0) {                 // pushing off, stretched out behind, then tucked up for the landing
            const k = s.airPh === undefined ? 0 : smooth(0.35, 0.8, s.airPh);
            U.x += air * (0.95 * (1 - k) - 0.55 * k); M.x += air * (0.25 * (1 - k) + 1.2 * k); W.x += air * (0.35 * (1 - k) - 1.0 * k);
          }
          if (dive > 0) { const w = 0.25 * Math.sin(t * 7 + (L === 'HR' ? 1.6 : 0)); U.x += -0.45 * dive + w * dive; M.x += 0.4 * dive; W.x -= 0.3 * dive; }
          if (scratch > 0 && L === 'HR') { U.x -= 1.05 * scratch; U.z += 0.25 * scratch; M.x += 0.9 * scratch; W.x += (-0.9 + 0.35 * Math.sin(t * 30)) * scratch; }
        }
        if (kick > 0) { const i = LEGS.indexOf(L); U.x += kick * (0.45 * Math.sin(t * 11 + i * 1.9) - 0.3); M.x += kick * (0.5 + 0.4 * Math.sin(t * 13 + i)) * (front ? 1 : -1); W.x += kick * 0.4 * (front ? 1 : -1); }
      }
    }
    if (scratch > 0) { B.head.rotation.z += -0.4 * scratch; B.neck.rotation.y += -0.3 * scratch; }
    // ---- head, look and listen (a tilt of the head, as foxes do hearing a mouse)
    const lk = 1 - 0.8 * rolled;                       // (on his back, only a little turn of the head)
    B.neck.rotation.y += 0.55 * (s.lookYaw || 0) * lk; B.head.rotation.y += 0.45 * (s.lookYaw || 0) * lk;
    B.neck.rotation.x += 0.45 * (s.lookPitch || 0) * lk; B.head.rotation.x += 0.35 * (s.lookPitch || 0) * lk;
    B.head.rotation.z += (s.headTilt || 0) * lk;
    // ---- the face: ears pricked forward (alert, curious), flattened back (frightened, squeezing through, running flat out)
    // or each its own way (puzzled), swivelling to a sound and towards where he looks; the eyes blink, squint, screw shut
    // or open wide; the jaw opens (panting, a yawn, a yelp, the sneeze), the tongue on it
    if (B.earL) for (const [nm, sd] of [['earL', 1], ['earR', -1]]) {
      const e = Math.max(-1, Math.min(1, (s.ears || 0) + (s[nm] || 0))), back = Math.max(0, -e), fwd = Math.max(0, e), tw = s[nm + 'Tw'] || 0;
      B[nm].rotation.x += -1.05 * back + 0.38 * fwd - 0.25 * Math.abs(tw);
      B[nm].rotation.z += -sd * (0.5 * back + 0.06 * Math.sin(t * 0.7 + sd));
      B[nm].rotation.y += sd * 0.5 * tw + 0.35 * (s.lookYaw || 0);
    }
    if (B.jaw) B.jaw.rotation.x += 0.72 * Math.min(1.2, Math.max(0, s.mouth || 0));
    if (B.blinkL && !this.lids) for (const [nm, k] of [['blinkL', s.shutL || 0], ['blinkR', s.shutR || 0]]) {
      const w = clamp01(s.wide || 0), shut = clamp01(k);
      B[nm].scale.set(1 + 0.12 * w, (1 - 0.9 * shut) * (1 + 0.28 * w), 1 + 0.12 * w);
    }
    // the dog's eyes: real eyelids, so they say how he feels. Blinks, squints and winks close them; a little lowered when
    // he's relaxed, more when he's happy (with his grin) or intent (crouched, watching); the inner corners raised when he's
    // interested (ears forward), pleading (lying with his chin down, looking up), worried (ears back), one up and one down
    // when puzzled (his head tilted); lowered at the inner corners for the intent stare. (s.lidSoft / s.lidTilt: a task's own)
    if (this.lids) {
      const w = clamp01(s.wide || 0), mouth = smooth(0.3, 0.8, s.mouth || 0), cr = clamp01(s.crouch || 0), ears = s.ears || 0;
      const chin = (s.chin || 0) * lie, tiltH = s.headTilt || 0;
      const soft = clamp01(0.16 + 0.3 * mouth + 0.28 * cr + 0.12 * chin + (s.lidSoft || 0) - 0.3 * w);
      const tilt = Math.max(-1, Math.min(1, -0.35 * Math.max(0, ears - 0.35) * (1 - mouth) - 0.5 * chin - 0.5 * Math.max(0, -ears - 0.2) + 0.55 * cr + (s.lidTilt || 0)));
      for (const [sd, shut] of [['L', s.shutL || 0], ['R', s.shutR || 0]]) {
        const side = (sd === 'L' ? 1 : -1) * Math.max(-1, Math.min(1, tiltH / 0.38)), puzzled = side * 0.3;      // (one lid up, the other down)
        const L = this.lids[sd], close = Math.max(clamp01(shut), clamp01(soft + 0.16 * side));
        _q1.setFromAxisAngle(L.ax, close * LID_SWEEP);
        _q2.setFromAxisAngle(L.fw, (-tilt * 0.42 + puzzled) * L.inner * (1 - clamp01(shut)));
        B['lid' + sd].quaternion.copy(_q2.multiply(_q1));
        B['blink' + sd].scale.set(1 + 0.06 * w, 1 + 0.1 * w, 1 + 0.06 * w);
      }
    }
    // ---- the brush: each part follows the one before it a moment later (a wave down the tail): it sways with the steps,
    // swings out on turns, wags when playing; hangs a little lower at a trot, up when excited, curled round when sitting or lying
    const dt = Math.min(0.05, s.dt || 1 / 30);
    const goal = -turn * 0.24 + (s.wag || 0) * 0.32 * Math.sin(t * 13) + 0.05 * g * Math.sin(ph) + 0.06 * Math.sin(t * 0.9) * (1 - g) * (1 - sit) * (1 - lie);
    for (let i = 0; i < 4; i++) {
      const to = i === 0 ? goal : this.tY[i - 1] * 0.92;
      this.tYv[i] += ((to - this.tY[i]) * (70 - 12 * i) - this.tYv[i] * (8 - 1.2 * i)) * dt; this.tY[i] += this.tYv[i] * dt;
      B[TAIL[i]].rotation.y += this.tY[i];
      B[TAIL[i]].rotation.x += g * (0.05 + 0.05 * run) * Math.sin(2 * ph - 0.9 * i) * (0.5 + 0.25 * i);      // the bounce, travelling down it
    }
    const up = s.tailUp || 0;
    B.tail1.rotation.x += up * 0.7 + 0.04 * Math.sin(t * 1.3) - 0.14 * g * (1 - run) * (1 - up) - 0.08 * crouch; B.tail2.rotation.x -= 0.12 * up; B.tail3.rotation.x += 0.1 * crouch;
    const curl = s.curl || 1;
    if (sit > 0) { B.tail1.rotation.x -= 0.25 * sit; const c = [0.5, 0.5, 0.45, 0.35]; for (let i = 0; i < 4; i++) B[TAIL[i]].rotation.y += c[i] * sit * curl; }
    if (lie > 0) { B.tail1.rotation.x -= 0.15 * lie; const c = [0.8, 0.65, 0.5, 0.4]; for (let i = 0; i < 4; i++) B[TAIL[i]].rotation.y += c[i] * lie * curl; }
    if (bow > 0) B.tail1.rotation.x += 0.75 * bow;
    if (rear > 0) B.tail1.rotation.x += 0.75 * rear;
    if (air > 0) B.tail1.rotation.x += 0.1 * air;
    if (dive > 0) B.tail1.rotation.x += 0.15 * dive;
    // ---- the shake (nose to tail, as after a dive in wet grass)
    if (shake > 0) { B.head.rotation.z += 0.45 * shake * Math.sin(t * 36 + 1.2); B.tail1.rotation.y += 0.6 * shake * Math.sin(t * 36 + 2.4); }
    // ---- the whole body: rolled onto its side or back, pitched (nose-dive, leaping), lifted (in the air)
    let cy = hy - lower;
    cy = cy * (1 - rolled) + (0.12 * S + 0.02 * S * Math.min(1, Math.max(0, Math.abs(roll) - 1.6))) * rolled;
    cy = cy * (1 - dive) + 0.26 * S * dive;
    this.tilt.position.y = cy + (s.lift || 0);
    this.tilt.rotation.set(pitch + 1.1 * dive, 0, roll);
    // ---- the brush kept off the ground (crouching low, slinking, sitting or lying on it): lifted at its root just enough
    if (rolled < 0.5 && dive < 0.5 && sit < 0.4 && lie < 0.4) {
      const gy = (s.groundH !== undefined ? s.groundH : 0) + 0.045 * S, tip = this.tipOff || (this.tipOff = new THREE.Vector3().fromArray(MODELS[this.name].piv.tailtip).sub(new THREE.Vector3().fromArray(MODELS[this.name].piv.tail4)));
      for (let it = 0; it < 2; it++) {
        this.tilt.updateMatrix(); this.mesh.updateMatrix(); _tm.multiplyMatrices(this.tilt.matrix, this.mesh.matrix);
        for (const nm of ['root', 'hips', 'tail1']) { B[nm].updateMatrix(); _tm.multiply(B[nm].matrix); }
        _tb.setFromMatrixPosition(_tm); let need = 0;
        for (const nm of ['tail2', 'tail3', 'tail4', 'tip']) {
          if (nm === 'tip') _tp.copy(tip).applyMatrix4(_tm); else { B[nm].updateMatrix(); _tm.multiply(B[nm].matrix); _tp.setFromMatrixPosition(_tm); }
          if (_tp.y < gy) need = Math.max(need, (gy - _tp.y) / Math.max(0.08 * S, Math.hypot(_tp.z - _tb.z, _tp.x - _tb.x)));
        }
        if (need <= 0) break;
        B.tail1.rotation.x += Math.min(0.8, need * 1.05);
      }
    }
    // ---- reaching with the mouth to something (s.reachAt, world; s.reach how far): the neck and head bend down to it, the
    // mouth (between the jaws) right on it: picking up his ball, eating from his bowl (Audrey: "he needs to literally grab it
    // with his mouth")
    if ((s.reach || 0) > 0.002 && s.reachAt) this.mouthTo(s.reachAt, Math.min(1, s.reach));
  }
  // where his mouth holds something, between the jaws (in the jaw bone's frame), and that point in the world
  mouthSpot() {
    const P = this.piv;
    return this.mouthOff || (this.mouthOff = new THREE.Vector3((P.nose[0] - P.jaw[0]) * 0.72, (P.nose[1] - P.jaw[1]) * 0.72 - 0.026 * this.S, (P.nose[2] - P.jaw[2]) * 0.72));
  }
  mouthWorld(v) { this.tilt.updateWorldMatrix(true, true); return v.copy(this.mouthSpot()).applyMatrix4(this.bones.jaw.matrixWorld); }
  mouthTo(target, w) {
    const B = this.bones, chain = [['head', 1.4], ['neck', 1.8]];
    const start = chain.map(([nm]) => B[nm].quaternion.clone()), off = this.mouthSpot();
    this.tilt.updateWorldMatrix(true, true);
    for (let it = 0; it < 8; it++) for (let k = 0; k < chain.length; k++) {
      const [nm, lim] = chain[k], b = B[nm];
      b.updateWorldMatrix(true, true);
      b.getWorldPosition(_j); _e.copy(off).applyMatrix4(B.jaw.matrixWorld);
      const v1 = _e.sub(_j), v2 = _w.copy(target).sub(_j);
      if (v1.lengthSq() < 1e-8 || v2.lengthSq() < 1e-8) continue;
      _qa.setFromUnitVectors(v1.normalize(), v2.normalize()); _qi.identity(); _qa.slerp(_qi, 0.4);
      b.parent.getWorldQuaternion(_qp);
      _qr.copy(_qp).invert().multiply(_qa).multiply(_qp);
      b.quaternion.premultiply(_qr);
      const a = b.quaternion.angleTo(start[k]);
      if (a > lim) { _qr.copy(b.quaternion); b.quaternion.copy(start[k]).slerp(_qr, lim / a); }       // (each joint only so far)
    }
    if (w < 1) chain.forEach(([nm], k) => { const got = B[nm].quaternion.clone(); B[nm].quaternion.copy(start[k]).slerp(got, w); });
  }
}
const _tm = new THREE.Matrix4(), _tb = new THREE.Vector3(), _tp = new THREE.Vector3();

// ---------------------------------------------------------------- the fox family
const NAMES = { dad: 'Rusty', mum: 'Fennel', cubs: ['Sorrel', 'Nutkin', 'Tumble'] };
const DEN_MOUTH = 0.64;              // how far the den's tunnel mouth is from its middle (stylized/beasts.py DEN_TUNNEL)
let blobTex = null;
export function shadowDisc(r) {
  if (!blobTex) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64); blobTex = new THREE.CanvasTexture(cv);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  m.renderOrder = 1; m.material.userData.noGrade = true;
  return m;
}

// one fox: where it is and which way it faces, what it's doing (a small to-do list), and its pose
class Fox {
  constructor(fam, kind, name, role, scale, r) {
    this.fam = fam; this.kind = kind; this.name = name; this.role = role; this.r = r;
    this.q = new Quad(kind, fam.joints);
    this.root = new THREE.Group(); this.root.add(this.q.tilt); this.root.scale.setScalar(scale); this.scale = scale;
    this.shadow = shadowDisc(0.24 * this.q.S * scale);
    fam.group.add(this.root); fam.group.add(this.shadow);
    this.A = { t: r() * 10, phase: 0 }; this.heading = 0; this.turn = 0; this.av = 0; this.spd = 0;
    this.blinkIn = r() * 3; this.blinkT = 0; this.twIn = 1 + r() * 4; this.twT = 0;
    this.todo = []; this.task = null; this.pace = 0; this.home = true;
    this.hitR = 0.3 * this.q.S * scale; this.hitY = 0.32 * this.q.S * scale;
    this.rename(name);
  }
  rename(name) {               // (the dog's name is the player's to choose: main.js checks it before it gets here)
    const k = this.kind, role = this.role; this.name = name;
    this.label = name + (role === 'dog' ? ' · ' + (FR ? 'border collie' : 'Border Collie') : k === 'cub' ? ' · fox cub' : role === 'dad' ? ' · red fox, the dad' : ' · red fox, the mum');
  }
  get pos() { return this.root.position; }
  // turn towards a heading: the turn eases in and settles as he lines up (no snapping into a turn, or out of it)
  turnTo(h, dt, rate = 4.5) {
    const d = wrap(h - this.heading), want = Math.max(-rate, Math.min(rate, d * 7));
    this.av += Math.max(-20 * dt, Math.min(20 * dt, want - this.av));
    let step = this.av * dt; if (Math.abs(step) > Math.abs(d)) { step = d; this.av = 0; }
    this.heading += step; this.turn = step / Math.max(1e-3, dt); this.turned = true;
    return Math.abs(d);
  }
  // a step towards (x, z) at a pace: 'walk' 0.35 m/s, 'trot' 0.75, 'run' 1.8 (cubs a little slower); he speeds up and slows
  // down smoothly, slowing to arrive unless more of the way follows (through); true when there
  moveTo(x, z, dt, pace = 'trot', through = false) {
    const p = this.pos, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    const sp = { walk: 0.35, trot: 0.75, run: 1.8 }[pace] * (this.kind === 'cub' ? 0.82 : 1) * this.scale;
    if (d < 0.06) { this.pace = 0; return true; }
    // another fox in the way (not one he's playing with): he bends his path round it in good time, and slows or waits if
    // it's right in front; strolling to a spot where a fox already stands: near enough is there
    let ax = dx / d, az = dz / d, slow = 1;
    const cur = this.task && this.task.cur ? this.task.cur() : this.task, mate = cur && cur.with, mine = this.q.S * this.scale;
    if (!(cur && cur.den)) for (const o of this.fam.foxes || []) {
      if (o === this || !o.root.visible || o.home || o === mate) continue;
      const oc = o.task && o.task.cur ? o.task.cur() : o.task; if (oc && (oc.with === this || oc.den)) continue;
      const lively = oc && /^(wrestle|roll|trip|tailchase|bounce|lead|follow|leap|pounce|stalk|bow)$/.test(oc.name);       // (playing: give it more room)
      const rx = o.pos.x - p.x, rz = o.pos.z - p.z, rd = Math.hypot(rx, rz), R = 0.4 * (mine + o.q.S * o.scale) + (lively ? 0.14 * o.q.S * o.scale : 0);
      if (cur && cur.name === 'go' && Math.hypot(o.pos.x - x, o.pos.z - z) < R * 0.9 && d < R * 1.6) { this.pace = 0; return true; }     // (only for a stroll somewhere: never at the den's doorway)
      const range = R + 0.6 * mine + 0.6 * Math.max(0, this.spd);
      if (rd > range || rd > d + R) continue;
      const ahead = (rx * ax + rz * az) / Math.max(1e-3, rd); if (ahead < 0.15) continue;
      const k = Math.min(1, (range - rd) / Math.max(0.05, range - R * 0.8)) * ahead, cross = ax * rz - az * rx, th = -(cross >= 0 ? 1 : -1) * 1.3 * k;
      const c = Math.cos(th), sn = Math.sin(th); [ax, az] = [ax * c - az * sn, ax * sn + az * c];
      if (rd < R * 1.2 && ahead > 0.6) slow = Math.min(slow, 0.25 + 0.75 * Math.max(0, (rd - R) / (R * 0.2)));
    }
    const off = this.turnTo(Math.atan2(ax, az), dt, pace === 'run' ? 6 : 4.5);
    let want = sp * (off > 1.2 ? 0.25 : off > 0.6 ? 0.6 : 1) * slow;
    if (!through) want = Math.min(want, Math.sqrt(2 * 2.2 * Math.max(0, d - 0.04)) + 0.06);
    this.spd += Math.max(-4.5 * dt, Math.min(2.8 * dt, want - this.spd)); this.moved = true;
    const s = Math.min(d, Math.max(0, this.spd) * dt);
    p.x += Math.sin(this.heading) * s; p.z += Math.cos(this.heading) * s;
    this.pace = pace === 'run' ? 2 : pace === 'trot' ? 1 : 0.5;
    return false;
  }
  update(dt) {
    const A = this.A; A.t += dt; A.dt = dt;
    for (const k of ['sit', 'lie', 'bow', 'rear', 'crouch', 'air', 'dive', 'shake', 'scratch', 'kick', 'paw', 'wag', 'tailUp', 'chin',
      'ears', 'earL', 'earR', 'earLTw', 'earRTw', 'mouth', 'squint', 'wide', 'winkL', 'winkR', 'lidSoft', 'lidTilt', 'reach', 'duck']) A[k + 'Goal'] = 0;
    A.airPh = undefined; A.groundF = A.groundH = A.slopeF = A.slopeH = A.groundAt = A.slopeAt = undefined;  // (a leap sets where in the air it is, a slope the ground under the feet, each frame)
    A.lookYawGoal = 0; A.lookPitchGoal = 0; A.headTiltGoal = 0; A.roll = A.roll || 0; A.rollGoal = 0; A.pitch = 0; A.lift = 0;
    this.pace = 0; this.turn = 0; this.turned = false; this.moved = false;
    const was = this.lastPos || (this.lastPos = this.pos.clone()); const fx0 = was.x, fz0 = was.z;
    if (!this.task) this.task = this.todo.shift() || this.fam.nextTask(this);
    if (this.task && this.task.run(this, dt) !== false) { this.task = null; }
    if (!this.turned) this.av *= Math.max(0, 1 - dt * 10);
    if (!this.moved) this.spd = Math.max(0, this.spd - 4.5 * dt);
    if (this.tailLift && !(A.sitGoal > 0.3) && !(A.lieGoal > 0.3)) A.tailUpGoal = Math.max(A.tailUpGoal || 0, this.tailLift);   // lifting his brush clear of something (nightvisit.js)
    A.curl = this.curlSide || 1;                            // which side the brush curls round when sitting or lying
    // ease the pose numbers towards their goals
    const ease = (k, rate, g = k) => { A[k] = (A[k] || 0) + ((A[g + 'Goal'] || 0) - (A[k] || 0)) * Math.min(1, dt * rate); };
    // ---- the face's own life: a blink every few seconds, an ear flicking round at a sound, panting after a run
    if ((this.blinkIn -= dt) <= 0) { this.blinkT = 0.17; this.blinkIn = 1.8 + this.r() * 4.2; }
    const blink = this.blinkT > 0 ? Math.sin(Math.PI * (1 - (this.blinkT -= dt) / 0.17)) : 0;
    if ((this.twIn -= dt) <= 0) { this.twT = 0.35; this.twSide = this.r() < 0.5 ? 'earLTw' : 'earRTw'; this.twIn = 2.5 + this.r() * 5; }
    ease('earLTwE', 8, 'earLTw'); ease('earRTwE', 8, 'earRTw'); A.earLTw = A.earLTwE; A.earRTw = A.earRTwE;     // turned to a sound by what he's doing
    if (this.twT > 0) { this.twT -= dt; A[this.twSide] = Math.max(A[this.twSide], Math.sin(Math.PI * Math.max(0, this.twT) / 0.35)); }
    this.puff = Math.max(0, Math.min(1, (this.puff || 0) + dt * ((A.run || 0) > 0.5 ? 0.3 : -0.04)));
    if (this.puff > 0.05 && (A.run || 0) < 0.5) A.mouthGoal = Math.max(A.mouthGoal, (0.25 + 0.07 * Math.sin(A.t * 15)) * Math.min(1, this.puff * 2));
    for (const k of ['sit', 'lie', 'bow', 'rear', 'crouch', 'shake', 'scratch', 'kick', 'paw', 'wag', 'tailUp', 'chin']) ease(k, 5.5);
    ease('air', 14); ease('dive', 10); ease('lookYaw', 4); ease('lookPitch', 4); ease('headTilt', 6);
    ease('ears', 9); ease('earL', 9); ease('earR', 9); ease('mouth', 12); ease('squint', 10); ease('wide', 10); ease('winkL', 10); ease('winkR', 10);
    ease('lidSoft', 6); ease('lidTilt', 6); ease('reach', 5.5); ease('duck', 6);
    A.shutL = clamp01(Math.max(blink, A.squint || 0) + A.winkL); A.shutR = clamp01(Math.max(blink, A.squint || 0) + A.winkR);
    A.roll += (A.rollGoal - A.roll) * Math.min(1, dt * (A.rollFast ? 9 : 4));
    // ---- the gait from how fast he really moves (however a task moves him): legs walking, trotting or galloping, the feet
    // stepping exactly as far as the body goes (so they never slide); turning on the spot, the feet step round
    const k = (this.kind === 'cub' ? 0.82 : 1) * this.scale;
    let moved = Math.hypot(this.pos.x - fx0, this.pos.z - fz0); if (moved > 4 * dt + 0.05) moved = 0;     // (a jump in place: being put somewhere)
    this.vs = (this.vs || 0) + (moved / Math.max(1e-3, dt) - (this.vs || 0)) * Math.min(1, dt * 12);
    const ns = this.vs / k, spin = Math.min(1, Math.abs(this.turn) / 2.5) * (1 - clamp01(ns / 0.2));
    A.walk = (A.walk || 0) + (Math.max(clamp01(ns / 0.28), 0.5 * spin) - (A.walk || 0)) * Math.min(1, dt * 8);
    A.run = (A.run || 0) + (smooth(1.0, 1.45, ns) - (A.run || 0)) * Math.min(1, dt * 5);
    const stride = (0.5 * (1 - A.run) + 1.0 * A.run) * (1 - 0.35 * clamp01(A.crouch || 0)) * this.q.S * this.scale;     // (shorter steps creeping low)
    A.phase += ((moved + 0.3 * spin * k * dt) / Math.max(0.05, stride)) * Math.PI * 2;
    A.stride = stride / this.scale;                       // in the body's own size, for placing the feet
    A.speed = ns; A.turn = this.turn;
    (this.lastPos || (this.lastPos = new THREE.Vector3())).copy(this.pos);
    this.root.rotation.y = this.heading;
    if (this.root.visible) this.q.pose(A);
    // the shadow: under the body, smaller while in the air
    this.shadow.position.set(this.pos.x, 0.013, this.pos.z); this.shadow.rotation.y = this.heading;
    const sh = 1 - 0.4 * clamp01((A.lift || 0) / 0.4); this.shadow.scale.set(sh, 1, sh); this.shadow.visible = this.root.visible;
  }
}

// a task: run(fox, dt) returns false while it goes on; tasks keep their own time
const T = {
  // tol: close enough (others in the way can keep a fox from the exact spot); it gives up after tmax seconds
  go: (x, z, pace = 'trot', end, tol = 0.06, tmax = 12) => ({ name: 'go', t: 0, run(f, dt) {
    this.t += dt; const done = f.moveTo(x, z, dt, pace) || Math.hypot(x - f.pos.x, z - f.pos.z) < tol || this.t > tmax;
    f.A.wagGoal = pace === 'run' ? 0.3 : 0; f.A.tailUpGoal = pace === 'run' ? 0.3 : 0;
    if (done && end !== undefined) return f.turnTo(end, dt) < 0.05 ? true : false; return done ? true : false; } }),
  wait: (secs, set) => ({ name: 'wait', t: 0, run(f, dt) { this.t += dt; if (set) set(f, this.t, dt); return this.t >= secs ? true : false; } }),
};
function look(f, t) { const y = Math.sin(t * 0.7 + f.A.t * 0.13); f.A.lookYawGoal = 0.7 * y; f.A.lookPitchGoal = 0.15 * Math.sin(t * 0.5); f.A.earsGoal = 0.35 + 0.3 * Math.abs(y); }

export class FoxFamily {
  // opts: { den: [x, z, heading of its entrance], field: [x, z, radius], joints }
  constructor(scene, opts, r) {
    this.scene = scene; this.r = r; this.joints = opts.joints;
    this.den = opts.den; this.field = opts.field;
    // what they walk round: the den's bank (its middle a little behind the entrance), bushes, tree trunks: [x, z, radius]
    const [dx, dz, dh] = opts.den;
    this.obstacles = [[dx - Math.sin(dh) * 0.05, dz - Math.cos(dh) * 0.05, 0.74], [dx - Math.sin(dh) * 0.62, dz - Math.cos(dh) * 0.62, 0.66], ...(opts.obstacles || [])];     // the den's bank (front, back)
    this.group = new THREE.Group(); scene.add(this.group);
    this.foxes = opts.only === 'dad' ? [new Fox(this, 'fox', NAMES.dad, 'dad', 1.0, r)] : [        // (only Rusty: the morning replay's cast)
      new Fox(this, 'fox', NAMES.dad, 'dad', 1.0, r),
      new Fox(this, 'fox', NAMES.mum, 'mum', 0.92, r),
      ...NAMES.cubs.map((n, i) => new Fox(this, 'cub', n, 'cub', 1 - i * 0.05, r)),
    ];
    this.out = false; this.leaving = false; this.next = opts.firstIn ?? 12; this.left = 0;
    this.butterfly = makeButterfly(); this.group.add(this.butterfly.mesh);
    for (const f of this.foxes) this.hide(f);
  }
  hide(f) { f.root.visible = false; f.shadow.visible = false; f.home = true; f.todo = []; f.task = null; f.q.shade(null); if (this.doorFox === f) this.doorFox = null; }
  doorway(f) { const [x, z, h] = this.den; return [x + Math.sin(h) * 1.05, z + Math.cos(h) * 1.05, h]; }
  // the den's tunnel (stylized/beasts.py DEN_TUNNEL): its mouth MOUTH m out from the den's middle along the entrance's
  // heading; the box (in the den's own frame) where a fox is shaded darker, the deeper in the darker
  denBox() {
    if (!this._denBox) {
      const [x, z, h] = this.den, m = new THREE.Matrix4().makeRotationY(h - Math.PI / 2).setPosition(x, 0, z);
      this._denBox = { inv: m.invert(), lo: new THREE.Vector3(-0.95, -0.2, -0.36), hi: new THREE.Vector3(DEN_MOUTH, 0.8, 0.36) };
    }
    return this._denBox;
  }
  along(f) { const [x, z, h] = this.den; return (f.pos.x - x) * Math.sin(h) + (f.pos.z - z) * Math.cos(h); }
  across(f) { const [x, z, h] = this.den; return Math.abs((f.pos.x - x) * Math.cos(h) - (f.pos.z - z) * Math.sin(h)); }
  // is any other fox's body or brush in the tunnel's line, between lo and hi along it? (single file: no fox walks into another)
  occupied(f, lo, hi) {
    const [x, z, h] = this.den, sh = Math.sin(h), ch = Math.cos(h);
    for (const o of this.foxes) {
      if (o === f || !o.root.visible) continue;
      const So = o.q.S * o.scale, sx = Math.sin(o.heading), cz = Math.cos(o.heading);
      for (const k of [0.5, 0.2, -0.15, -0.45, -0.75]) {                  // points along its body and brush, nose to tip
        const px = o.pos.x + sx * k * So - x, pz = o.pos.z + cz * k * So - z, al = px * sh + pz * ch, ac = Math.abs(px * ch - pz * sh);
        if (ac < 0.42 && al > lo && al < hi) return true;
      }
    }
    return false;
  }
  // out of the den: from deep in the tunnel, low and crouched with his ears back and head down to fit, walking out along it
  // and rising as he clears the mouth, onto the dug earth; in single file (out of sight until there's room behind the one before)
  emergeTask() {
    const fam = this, [x, z, h] = this.den, start = -0.12;
    return { name: 'emerge', t: 0, wait: 0, run(f, dt) {
      const S = f.q.S * f.scale;
      if (!this.going) {
        this.wait += dt; if (fam.occupied(f, start - 0.8 * S, start + 0.6 * S) && this.wait < 15) return false;
        this.going = this.den = true;
        f.pos.set(x + Math.sin(h) * start, 0, z + Math.cos(h) * start); f.lastPos = null; f.heading = h; f.av = 0; f.spd = 0; f.root.visible = true; f.shadow.visible = true; f.q.shade(fam.denBox());
      }
      this.t += dt;
      const a = fam.along(f), low = 1 - smooth(DEN_MOUTH + 0.12 * S, DEN_MOUTH + 0.38 * S, a);
      f.A.crouchGoal = low; f.A.crouch = Math.max(f.A.crouch || 0, low); f.A.earsGoal = -0.9 * (1 - smooth(0.2, 0.5, a)) + 0.6 * smooth(0.6, 0.9, a); f.A.lookPitchGoal = 0.3 * low;
      if (a > 0.7) f.A.wideGoal = 0.4;                       // out into the light, looking about
      if (fam.occupied(f, a + 0.3 * S, a + 0.62 * S) && this.t < 12) return false;      // close behind the one in front: wait a moment
      const done = f.moveTo(x + Math.sin(h) * 1.05, z + Math.cos(h) * 1.05, dt, a > DEN_MOUTH - 0.1 ? 'trot' : 'walk', true);
      if (done || this.t > 12) { f.q.shade(null); this.going = this.den = false; return true; }
      return false;
    } };
  }
  // a place to wait for his turn at the tunnel: of a few spots round the front of the den, the nearest no one else is waiting in
  waitSpot(f) {
    const [x, z, h] = this.den;
    // (beside the bank, off the way in: [angle from the entrance's heading, distance from the den's middle])
    if (!this.spots) this.spots = [[-0.62, 2.0], [0.62, 2.0], [-1.0, 1.6], [1.0, 1.6], [-1.4, 1.5], [1.4, 1.5]].map(([a, r]) => [x + Math.sin(h + a) * r, z + Math.cos(h + a) * r]);
    const taken = new Set(this.foxes.filter(o => o !== f && o.task && o.task.spot !== undefined && !o.task.going).map(o => o.task.spot));
    let best = 0, bd = 1e9;
    this.spots.forEach(([sx, sz], i) => { const d = Math.hypot(sx - f.pos.x, sz - f.pos.z) + (taken.has(i) ? 100 : 0); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  // into the den: to the doorway when it's his turn (one fox heads for it at a time; the rest wait in their spots nearby,
  // watching), then nose down as he reaches the mouth, crouched and ears back, along the tunnel close behind the one before
  // (never into it) and out of sight
  inTask(onDone) {
    const fam = this, [x, z, h] = this.den, door = [x + Math.sin(h) * 1.05, z + Math.cos(h) * 1.05];
    return { name: 'in', t: 0, wait: 0, run(f, dt) {
      const S = f.q.S * f.scale;
      if (!this.going) {
        this.wait += dt;
        const mine = fam.doorFox === f, free = !fam.doorFox || !fam.doorFox.root.visible || fam.doorFox.home;
        if (!mine && !free && this.wait < 25) {   // not his turn yet: waiting in his spot by the den
          if (this.spot === undefined) this.spot = fam.waitSpot(f);
          const [sx, sz] = fam.spots[this.spot], far = Math.hypot(sx - f.pos.x, sz - f.pos.z);
          if (!this.atSpot) { if (far < 0.08 || f.moveTo(sx, sz, dt, far > 0.6 ? 'trot' : 'walk') || this.wait > 6) this.atSpot = this.wait; return false; }
          f.turnTo(Math.atan2(x + Math.sin(h) * 0.6 - f.pos.x, z + Math.cos(h) * 0.6 - f.pos.z), dt, 3); f.A.earsGoal = 0.6;
          if (this.wait - this.atSpot > 0.8) f.A.sitGoal = 1;
          return false;
        }
        fam.doorFox = f; this.spot = undefined;
        if (!this.lined) {                                    // round to the front first (not across the bank's side)
          const ax = x + Math.sin(h) * 1.6, az = z + Math.cos(h) * 1.6;
          if ((fam.along(f) > 1.15 && fam.across(f) < 0.45) || f.moveTo(ax, az, dt, Math.hypot(ax - f.pos.x, az - f.pos.z) > 1.2 ? 'run' : 'trot', true) || Math.hypot(ax - f.pos.x, az - f.pos.z) < 0.15) this.lined = true;
          else return false;
        }
        const far = Math.hypot(door[0] - f.pos.x, door[1] - f.pos.z), al = fam.along(f);
        if (far > 0.08 && fam.occupied(f, al - 0.62 * S, al - 0.3 * S) && this.wait < 30) { f.turnTo(h + Math.PI, dt); return false; }   // the one before still in the mouth
        if (far > 0.08 && !f.moveTo(door[0], door[1], dt, 'trot', true)) return false;
        this.going = this.den = true; f.q.shade(fam.denBox());
      }
      this.t += dt;
      const a = fam.along(f), low = 1 - smooth(DEN_MOUTH + 0.42 * S, DEN_MOUTH + 0.7 * S, a);
      if (fam.doorFox === f && a < 0.85) fam.doorFox = null;          // into the mouth: the next one may line up behind him
      f.A.crouchGoal = low; f.A.earsGoal = -0.9 * (1 - smooth(DEN_MOUTH + 0.3 * S, DEN_MOUTH + 0.5 * S, a)); f.A.lookPitchGoal = 0.3 * low;
      let there = false;
      if (!fam.occupied(f, a - 0.62 * S, a - 0.3 * S) || this.t > 12) there = f.moveTo(x - Math.sin(h) * 0.32, z - Math.cos(h) * 0.32, dt, 'trot', true);
      else f.turnTo(h + Math.PI, dt);
      if (there || a < -0.26 || this.t > 12) { this.going = false; if (fam.doorFox === f) fam.doorFox = null; if (onDone) onDone(f); f.fam.hide(f); return true; }
      return false;
    } };
  }
  // out of the den one by one, then off to the meadow
  comeOut() {
    this.out = true; this.leaving = false; this.left = 300 + this.r() * 120;
    this.foxes.forEach((f, i) => {
      f.home = false; f.todo = []; f.task = null; f.root.visible = false;
      f.todo.push(T.wait(i * 1.6 + (f.role === 'dad' ? 0 : 0.6)), this.emergeTask());
      const [fx, fz, fr] = this.field, a = this.r() * Math.PI * 2, rr = fr * (0.3 + 0.4 * this.r());
      f.todo.push(T.go(fx + Math.cos(a) * rr, fz + Math.sin(a) * rr, f.kind === 'cub' ? 'run' : 'trot'));
    });
  }
  goHome() {
    this.leaving = true;
    this.foxes.forEach((f, i) => {
      f.todo = []; f.task = null;
      const [dx, dz] = this.doorway(f);
      // one at a time (the tunnel takes one fox), to in front of the mouth, then in
      f.todo.push(T.wait(f.role === 'mum' ? 0 : 0.6 + i * 0.7), this.inTask());
    });
  }
  // what a fox does next, by who it is
  nextTask(f) {
    if (this.visit && this.visit.fox === f && this.visit.active()) return this.visit.nextTask(f);      // his night visit (nightvisit.js)
    if (f.home || this.leaving) return T.wait(1);
    const r = this.r(), [fx, fz, fr] = this.field;
    const spot = (k = 0.8) => {
      for (let n = 0; n < 12; n++) {
        const a = this.r() * Math.PI * 2, d = fr * k * Math.sqrt(this.r()), x = fx + Math.cos(a) * d, z = fz + Math.sin(a) * d;
        if (this.obstacles.every(o => Math.hypot(x - o[0], z - o[1]) > o[2] + 0.5)) return [x, z];
      }
      return [fx, fz];
    };
    const others = this.foxes.filter(o => o !== f && !o.home && o.root.visible);
    const cubs = others.filter(o => o.kind === 'cub' && (!o.task || !o.task.pair));
    if (f.role === 'dad') {
      if (r < 0.42) { const [x, z] = spot(0.7); return seq(T.go(x, z, 'trot'), mousePounce()); }
      if (r < 0.6) return sitWatch(4 + this.r() * 4);
      if (r < 0.72 && cubs.length) return playDead(this, f, cubs);
      if (r < 0.85) { const [x, z] = spot(); return T.go(x, z, 'trot'); }
      return lieDown(6 + this.r() * 6);
    }
    if (f.role === 'mum') {
      if (r < 0.35) return sitWatch(5 + this.r() * 5, true);
      if (r < 0.55) return lieDown(8 + this.r() * 6);
      if (r < 0.72) { const [x, z] = spot(0.6); return seq(T.go(x, z, 'trot'), mousePounce()); }
      const [x, z] = spot(); return T.go(x, z, 'walk');
    }
    // a cub
    if (r < 0.22 && cubs.length) return chase(this, f, cubs[Math.floor(this.r() * cubs.length)]);
    if (r < 0.4 && cubs.length) return wrestle(this, f, cubs[Math.floor(this.r() * cubs.length)]);
    if (r < 0.5 && others.every(o => Math.hypot(o.pos.x - f.pos.x, o.pos.z - f.pos.z) > 0.9)) return tailChase(2.2 + this.r() * 1.5);     // with room to spin
    if (r < 0.62 && !this.butterfly.chaser) return butterflyHunt(this);            // (one cub after it at a time)
    if (r < 0.72) { const m = others.find(o => o.role === 'mum'); if (m && !this.foxes.some(o => { const t = o.task && o.task.cur ? o.task.cur() : o.task; return t && t.with === m; })) return pounceOn(m); }     // (one cub at mum's brush at a time)
    if (r < 0.8) return tumble(this, spot(0.7));
    if (r < 0.88) return seq(bowAt(others[Math.floor(this.r() * others.length)]), T.wait(0.2));
    const [x, z] = spot(); return seq(T.go(x, z, this.r() < 0.5 ? 'run' : 'trot'), sitWatch(1.5 + this.r() * 2));
  }
  update(dt, hour, force) {
    const day = hour >= 6 && hour < 21.5;
    if (!this.out) { this.next -= dt; if ((day || force) && this.next <= 0) this.comeOut(); }
    else if (!this.leaving) { this.left -= dt; if ((this.left <= 0 && !force) || (!day && !force)) this.goHome(); }
    else if (this.foxes.every(f => f.home)) { this.out = false; this.leaving = false; this.next = 600 + this.r() * 600; }
    for (const f of this.foxes) if (!f.home || f.todo.length || f.task) f.update(dt);
    this.butterfly.update(dt, this);
    this.bumps = (this.bumps || 0) + collide(this.foxes, this.obstacles);
  }
  visible() { return this.out && this.foxes.some(f => f.root.visible); }
  // how much they overlap right now: the deepest overlap of two bodies (a share of the two radii), and how far into an obstacle
  overlaps() {
    const live = this.foxes.filter(f => f.root.visible && !f.home && !(f.task && f.task.den)); let bodies = 0, close = 0, obs = 0, tails = 0;
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const mt = f => { const t = f.task && f.task.cur ? f.task.cur() : f.task; return t && t.with; };
      const near = mt(live[i]) === live[j] || mt(live[j]) === live[i];
      for (const ca of circles(live[i])) for (const cb of circles(live[j])) {
        const m = ca[2] + cb[2], o = (m - Math.hypot(cb[0] - ca[0], cb[1] - ca[1])) / m;
        if (ca[3] && cb[3]) continue;
        if (ca[3] || cb[3]) { if (!near && o > tails) { tails = o; const ti = x => { const t = x.task && x.task.cur ? x.task.cur() : x.task; return t ? t.name : '-'; }; this.worstTail = [live[i].name + ':' + ti(live[i]) + (ca[3] ? '(brush)' : ''), live[j].name + ':' + ti(live[j]) + (cb[3] ? '(brush)' : ''), +o.toFixed(2), +(live[i].A.sit || 0).toFixed(1), +(live[i].A.lie || 0).toFixed(1), +(live[j].A.sit || 0).toFixed(1), +(live[j].A.lie || 0).toFixed(1)]; } } else if (near) close = Math.max(close, o); else if (o > bodies) { bodies = o; const ti = x => { const t = x.task && x.task.cur ? x.task.cur() : x.task; return t ? t.name : '-'; }; this.worst = [live[i].name + ':' + ti(live[i]), live[j].name + ':' + ti(live[j]), circles(live[i]).findIndex(c => c[0] === ca[0]), circles(live[j]).findIndex(c => c[0] === cb[0]), +o.toFixed(2)]; }
      }
    }
    for (const f of live) for (const c of circles(f)) for (const o of this.obstacles) obs = Math.max(obs, c[2] + o[2] - Math.hypot(c[0] - o[0], c[1] - o[1]));
    return { bodies, close, obs, tails };
  }
  pounceTask() { return mousePounce(); }        // (for pictures and checks)
  bumpLog(on) { if (on) collide.log = {}; return collide.log; }
  centre(v) { let n = 0; v.set(0, 0, 0); for (const f of this.foxes) if (f.root.visible) { v.add(f.pos); n++; } if (n) v.multiplyScalar(1 / n); else v.set(this.field[0], 0, this.field[1]); return v; }
  // a tap on a fox: its name, and a little reaction (a hop of surprise and a play bow)
  tapped(f) { if (this.visit && this.visit.fox === f && this.visit.active()) return; f.todo.unshift(seq(hop(), bowAt(null, 1.2))); if (f.task && !f.task.pair) f.task = null; }
}

// their bodies never pass through each other, nor through the den's bank, a bush or a trunk. Each body is three circles on the
// ground (chest, hips, head) along its heading; overlaps are pushed apart (both ways for two foxes), six times a frame. Playing up
// close (wrestling, chasing) they may touch a little more; going in or out of the den they pass through its entrance
function circles(f) {
  const S = f.q.S * f.scale, sx = Math.sin(f.heading), cz = Math.cos(f.heading), up = Math.max(f.A.sit || 0, f.A.rear || 0);
  const r = (0.13 + 0.035 * Math.max(f.A.lie || 0, Math.min(1, Math.abs(f.A.roll || 0) / 1.5))) * S;     // (with its fur; wider lying or rolled over, legs out)
  const head = 0.36 * S * (1 - 0.35 * up) + 0.08 * S * (f.A.lie || 0) + 0.06 * S * (f.A.bow || 0);
  const c = [[f.pos.x + sx * 0.14 * S, f.pos.z + cz * 0.14 * S, r], [f.pos.x - sx * 0.13 * S * (1 - 0.5 * up), f.pos.z - cz * 0.13 * S * (1 - 0.5 * up), r], [f.pos.x + sx * head, f.pos.z + cz * head, 0.07 * S]];
  // and the brush: out behind, or curled round to one side sitting or lying
  const curl = Math.max(f.A.sit || 0, f.A.lie || 0), side = f.curlSide || 1, rx = -cz * side, rz = sx * side;
  if (curl > 0.5) c.push([f.pos.x - sx * 0.2 * S + rx * 0.2 * S, f.pos.z - cz * 0.2 * S + rz * 0.2 * S, 0.1 * S, 1]);
  else if (!(f.A.rear > 0.3)) c.push([f.pos.x - sx * 0.5 * S, f.pos.z - cz * 0.5 * S, 0.075 * S, 1]);
  return c;
}
export function collide(foxes, obstacles) {
  const live = foxes.filter(f => f.root.visible && !f.home); let bumps = 0;
  const inDen = f => f.task && (f.task.den || (f.task.cur && f.task.cur() && f.task.cur().den));
  // who a fox is playing with up close (wrestling, chasing, pouncing on): only those two may touch a little
  const mate = f => { const t = f.task && f.task.cur ? f.task.cur() : f.task; return t && t.with; };
  const blocked = new Set();
  const out = () => {                              // out of the den's bank, bushes and trunks (noting who is up against one)
    for (const f of live) {
      if (inDen(f)) continue;
      for (const c of circles(f)) for (const o of obstacles) {
        let dx = c[0] - o[0], dz = c[1] - o[1]; const d = Math.hypot(dx, dz), m = c[2] + o[2];
        if (d >= m - 0.002) { if (d < m + 0.01) blocked.add(f); continue; }
        if (d < 1e-4) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        f.pos.x += dx * (m - d); f.pos.z += dz * (m - d); blocked.add(f);
      }
    }
  };
  for (let it = 0; it < 6; it++) {
    blocked.clear(); out();
    for (const pass of [1, 0]) for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {     // brushes, then bodies
      const a = live[i], b = live[j];
      if (inDen(a) || inDen(b)) continue;
      const close = mate(a) === b || mate(b) === a ? 0.72 : 1;
      // one up against a bush or the den is not pushed into it: the other one gives way
      const wa = blocked.has(a) && !blocked.has(b) ? 0 : blocked.has(b) && !blocked.has(a) ? 1 : 0.5;
      for (const ca of circles(a)) for (const cb of circles(b)) {
        // a brush: the other one steps off it (brush against brush, or a playmate's, is let be: fur brushing fur)
        if (ca[3] && cb[3]) continue;
        if (!!(ca[3] || cb[3]) !== !!pass) continue;
        if ((ca[3] || cb[3]) && close < 1) continue;
        let dx = cb[0] - ca[0], dz = cb[1] - ca[1]; const d = Math.hypot(dx, dz), m = (ca[2] + cb[2]) * close;
        if (d >= m) continue;
        if (d < 1e-4) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        const push = (m - d) * (ca[3] || cb[3] ? 0.5 : 1), w = ca[3] ? (blocked.has(b) ? 0.5 : 0) : cb[3] ? (blocked.has(a) ? 0.5 : 1) : wa;
        if (it === 0 && close === 1 && push > 0.004) {             // (two foxes not playing together, walked into each other)
          bumps++;
          if (collide.log) { const tn = x => { const t = x.task && x.task.cur ? x.task.cur() : x.task; return t ? t.name : '-'; }; const k = [tn(a), tn(b)].sort().join('+'); collide.log[k] = (collide.log[k] || 0) + 1; }
        }
        a.pos.x -= dx * push * w; a.pos.z -= dz * push * w; b.pos.x += dx * push * (1 - w); b.pos.z += dz * push * (1 - w);
      }
    }
  }
  out();
  return bumps;
}

// ---------------------------------------------------------------- what they do
function seq(...tasks) { return { name: 'seq', i: 0, pair: tasks.some(t => t.pair), cur() { return tasks[this.i]; }, run(f, dt) { while (this.i < tasks.length) { if (tasks[this.i].run(f, dt) === false) return false; this.i++; } return true; } }; }
function sitWatch(secs, groom) {
  return T.wait(secs, (f, t) => { f.A.sitGoal = 1; look(f, t); if (groom && t > secs * 0.6) { f.A.lookPitchGoal = 0.6; f.A.lookYawGoal = 0.9; f.A.squintGoal = 0.55; f.A.earsGoal = -0.15; } if (!groom && t > 1.5 && t < 2.6 && f.r && (f.A.t % 7) < 3) f.A.scratchGoal = 1; });
}
function lieDown(secs) {
  return T.wait(secs, (f, t) => {
    const A = f.A; A.lieGoal = 1; A.chinGoal = t > 2 ? 1 : 0; if (t < 2) look(f, t);
    if (t > 1.2 && t < 2.6) yawn(f, (t - 1.2) / 1.4);               // a big yawn before settling
    else if (t > 2.6) { A.squintGoal = Math.min(0.85, (t - 2.6) * 0.4); A.earsGoal = -0.3; }   // dozing off, ears relaxed
  });
}
// a yawn, u from 0 to 1: the jaw opening wide, eyes screwed shut, ears back, head up
function yawn(f, u) { const k = Math.sin(Math.PI * clamp01(u)); f.A.mouthGoal = 1.15 * k; f.A.squintGoal = 0.95 * k; f.A.earsGoal = -0.6 * k; f.A.lookPitchGoal = -0.35 * k; }
// the mouse pounce: listen (head tilted one way, then the other), crouch, spring up high in an arc and come down on the
// front paws, pinning the grass, nose down between them sniffing, the brush waving; then up, a shake, a puzzled look.
// Usually nothing caught
function mousePounce() {
  return { name: 'pounce', t: 0, run(f, dt) {
    const A = f.A, S = f.q.S * f.scale; this.t += dt; const t = this.t;
    if (t < 1.6) { A.headTiltGoal = t < 0.8 ? 0.38 : -0.38; A.lookPitchGoal = 0.45; A.crouchGoal = 0.25; A.tailUpGoal = 0.1; A.earsGoal = 1; A[t < 0.8 ? 'earLTwGoal' : 'earRTwGoal'] = 0.6; return false; }
    if (t < 2.1) { A.crouchGoal = 1; A.lookPitchGoal = 0.3; A.headTiltGoal = 0; A.earsGoal = 1; A.wideGoal = 1; return false; }
    if (this.t0 === undefined) {                      // (not onto another fox: if one is where he'd land, he waits, crouched, then gives up)
      const lx = f.pos.x + Math.sin(f.heading) * 0.55 * S, lz = f.pos.z + Math.cos(f.heading) * 0.55 * S;
      const busy = f.fam.foxes.some(o => o !== f && o.root.visible && !o.home && Math.hypot(o.pos.x - lx, o.pos.z - lz) < 0.45 * (S + o.q.S * o.scale));
      if (busy) { this.wait = (this.wait || 0) + dt; this.t = 2.09; A.crouchGoal = 1; A.earsGoal = 1; if (this.wait > 2) return true; return false; }
      this.t0 = 0;
    }
    if (t < 2.85) {                                   // up and over: a high arc, nose up off the ground, front paws reaching down to land
      const u = (t - 2.1) / 0.75;
      A.lift = Math.sin(u * Math.PI) * 0.5 * S; A.air = A.airGoal = Math.min(1, Math.min(u, 1 - u) * 6); A.airPh = u; A.crouch = A.crouchGoal = 0;
      A.pitch = -0.45 + 0.85 * smooth(0.1, 0.95, u); A.lookPitchGoal = 0.5 * u; A.tailUpGoal = 0.6;
      A.earsGoal = 1; A.wideGoal = 1 - 0.5 * u; A.mouthGoal = 0.25 * smooth(0.5, 0.9, u);
      f.pos.x += Math.sin(f.heading) * dt * 0.9 * S; f.pos.z += Math.cos(f.heading) * dt * 0.9 * S;
      return false;
    }
    if (t < 4.3) {                                    // landed on his front paws, pinning: nose down between them, sniffing, the brush waving
      const v = smooth(2.85, 3.15, t);
      A.pitch = 0.4 * (1 - v); A.bowGoal = 1; A.bow = Math.max(A.bow || 0, 0.6 + 0.4 * v); A.lookPitchGoal = 1.6; A.lookYawGoal = 0.12 * Math.sin(t * 9);
      A.tailUpGoal = 0.7; A.wagGoal = 0.5; A.earsGoal = 0.9; A.squintGoal = 0.45; A.mouthGoal = 0.1 * Math.max(0, Math.sin(t * 20));
      return false;
    }
    if (t < 4.6) { A.lookPitchGoal = -0.1; A.earsGoal = 0.3; return false; }
    if (t < 5.4) { A.shakeGoal = 1; A.squintGoal = 1; A.mouthGoal = 0.2; return false; }
    if (t < 6.2) { A.sitGoal = 0.6; A.headTiltGoal = 0.25; A.earLGoal = 0.5; A.earRGoal = -0.7; return false; }                    // "hm. Nothing."
    return true;
  } };
}
function hop() { return { name: 'hop', t: 0, run(f, dt) { this.t += dt; f.A.lift = Math.sin(clamp01(this.t / 0.45) * Math.PI) * 0.16 * f.q.S; f.A.airGoal = 0.4; f.A.earsGoal = 0.8; return this.t > 0.5; } }; }
function bowAt(o, secs = 1.4) { return { name: 'bow', t: 0, run(f, dt) { this.t += dt; if (o) f.turnTo(Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z), dt); f.A.bowGoal = 1; f.A.wagGoal = 1; f.A.tailUpGoal = 0.6; playFace(f, 0.6); return this.t > secs; } }; }
// the play face: mouth open in a grin, ears up, eyes bright
function playFace(f, k = 1) { f.A.mouthGoal = Math.max(f.A.mouthGoal || 0, 0.75 * k); f.A.earsGoal = 0.7 * k; f.A.wideGoal = 0.4 * k; }
// chasing its own tail, round and round, then a wobbly sit
function tailChase(secs) {
  return { name: 'tailchase', t: 0, run(f, dt) {
    this.t += dt; const A = f.A;
    if (this.t < secs) { f.heading += dt * 7.5; f.turn = 7.5; f.pace = 1; A.lookYawGoal = 1.2; A.tailUpGoal = 0.2; A.wagGoal = 0.4; playFace(f, 0.8); A.earsGoal = -0.3; return false; }
    if (this.t < secs + 1.6) { A.sitGoal = 1; A.headTiltGoal = 0.35 * Math.sin(this.t * 9); A.lookYawGoal = 0.4 * Math.sin(this.t * 5); dizzy(f, this.t); return false; }
    return true;
  } };
}
// dizzy: the ears every which way, eyes half shut and blinking, mouth a little open
function dizzy(f, t) { f.A.earLGoal = 0.7 * Math.sin(t * 4); f.A.earRGoal = -0.7 * Math.sin(t * 4 + 1); f.A.squintGoal = 0.4 + 0.4 * Math.sin(t * 6); f.A.mouthGoal = 0.25; }
// a chase: one cub runs off in a loop round the meadow, the other after it; at the end they bump and roll
function chase(fam, a, b) {
  const [fx, fz, fr] = fam.field, a0 = fam.r() * Math.PI * 2, dir = fam.r() < 0.5 ? 1 : -1, len = 5 + fam.r() * 3;
  const shared = { t: 0, cancel: false };
  const lead = { name: 'lead', pair: true, close: true, with: b, run(f, dt) {
    shared.t += dt; if (shared.t > len || shared.cancel) return true;
    const ang = a0 + dir * shared.t * 0.75, rr = fr * (0.55 + 0.2 * Math.sin(shared.t * 1.3));
    f.moveTo(fx + Math.cos(ang) * rr, fz + Math.sin(ang) * rr, dt, 'run'); f.A.tailUpGoal = 0.5; playFace(f, 0.7); f.A.earsGoal = -0.6; return false;
  } };
  const follow = { name: 'follow', pair: true, close: true, with: a, t: 0, run(f, dt) {
    this.t += dt; if (this.t > len + 0.3 || shared.cancel) return true;
    const behind = 0.88 * f.q.S * f.scale;
    f.moveTo(a.pos.x - Math.sin(a.heading) * behind, a.pos.z - Math.cos(a.heading) * behind, dt, 'run'); f.A.tailUpGoal = 0.6; playFace(f, 0.8); return false;
  } };
  b.todo = [follow, roll(1.6, 0.9)]; b.task = null;
  return seq(lead, roll(1.2, 0.6));
}
// a quick tumble: running, then head over heels sideways, then sitting up a bit dazed
function roll(secs, delay = 0) {
  return { name: 'roll', t: 0, close: true, run(f, dt) {
    this.t += dt; const A = f.A, t = this.t - delay;
    if (t < 0) return false;
    if (t < 0.7) { A.rollFast = true; A.rollGoal = 2.9; A.kickGoal = 1; playFace(f); A.squintGoal = 0.4; return false; }
    if (t < secs) { A.rollGoal = 2.9; A.kickGoal = 1; playFace(f); A.squintGoal = 0.4; A.earsGoal = -0.5; return false; }
    if (t < secs + 0.6) { A.rollFast = true; A.rollGoal = 0; return false; }
    A.rollFast = false; return true;
  } };
}
function tumble(fam, spot) {
  return seq(T.go(spot[0], spot[1], 'run'), { name: 'trip', t: 0, close: true, run(f, dt) {
    this.t += dt; const A = f.A;
    if (this.t < 0.55) { A.rollFast = true; A.rollGoal = 6.28 * smooth(0, 0.55, this.t); A.roll = A.rollGoal; f.pos.x += Math.sin(f.heading) * dt * 0.8; f.pos.z += Math.cos(f.heading) * dt * 0.8; A.lift = 0.06 * f.q.S * Math.sin(this.t / 0.55 * Math.PI); return false; }
    A.roll = 0; A.rollGoal = 0; A.rollFast = false;
    if (this.t < 2.0) { A.sitGoal = 1; A.headTiltGoal = 0.3 * Math.sin(this.t * 8); dizzy(f, this.t); return false; }          // dizzy
    return true;
  } });
}
// wrestling: two cubs face each other, rear up and box, then one rolls onto its back kicking while the other pounces
function wrestle(fam, a, b) {
  const shared = { cancel: false, ready: 0 };
  const mid = () => [(a.pos.x + b.pos.x) / 2, (a.pos.z + b.pos.z) / 2];
  const make = (me, other, under) => ({ name: 'wrestle', pair: true, close: true, with: other, t: 0, stage: 0, waited: 0, run(f, dt) {
    if (shared.cancel) { f.A.rollGoal = 0; return true; }
    this.waited += dt; if (this.waited > 6 && shared.ready < 2) return true;           // the other one went off to do something else
    const A = f.A, dx = other.pos.x - f.pos.x, dz = other.pos.z - f.pos.z, d = Math.hypot(dx, dz), want = 0.3 * f.q.S * 2;
    if (this.stage === 0) { if (d > want + 0.05) { f.moveTo(other.pos.x, other.pos.z, dt, 'trot'); return false; } this.stage = 1; shared.ready++; }
    f.turnTo(Math.atan2(dx, dz), dt, 6);
    if (shared.ready < 2) { A.bowGoal = 1; A.wagGoal = 1; playFace(f, 0.6); return false; }
    this.t += dt; const t = this.t;
    if (t < 2.2) { A.rearGoal = 1; A.pawGoal = 1; A.lift = 0.02 * f.q.S * Math.abs(Math.sin(t * 6)); A.mouthGoal = 0.45 + 0.45 * Math.max(0, Math.sin(t * 7)); A.earsGoal = -0.5; A.squintGoal = 0.3; return false; }
    if (t < 4.6) {
      if (under) { A.rollFast = true; A.rollGoal = 2.85; A.kickGoal = 1; A.lookYawGoal = 0.6 * Math.sin(t * 3); A.mouthGoal = 0.5 + 0.4 * Math.max(0, Math.sin(t * 6)); A.earsGoal = -0.7; }
      else { A.bowGoal = 0.7; A.pawGoal = 1; A.lookPitchGoal = 0.6; A.wagGoal = 1; A.mouthGoal = 0.35 + 0.5 * Math.max(0, Math.sin(t * 5 + 1)); A.earsGoal = 0.5; if (d > want * 0.8) f.moveTo(other.pos.x, other.pos.z, dt, 'walk'); }
      return false;
    }
    if (t < 5.2) { A.rollGoal = 0; return false; }
    A.rollFast = false; return true;
  } });
  const underB = fam.r() < 0.5;
  b.todo = [make(b, a, underB)]; b.task = null;
  return make(a, b, !underB);
}
// pouncing on mum's tail as it twitches; mum swishes it away
function pounceOn(m) {
  return seq({ name: 'stalk', with: m, run(f, dt) {
    const tx = m.pos.x - Math.sin(m.heading) * 0.85 * m.q.S, tz = m.pos.z - Math.cos(m.heading) * 0.85 * m.q.S;
    f.A.crouchGoal = 0.7; f.A.earsGoal = 1; f.A.wideGoal = 0.6; return f.moveTo(tx - Math.sin(f.heading) * 0.25 * f.q.S, tz - Math.cos(f.heading) * 0.25 * f.q.S, dt, 'walk');
  } }, T.wait(0.8, f => { f.A.crouchGoal = 1; f.A.wagGoal = 0.6; f.A.earsGoal = 1; f.A.wideGoal = 1; }), {
    name: 'leap', with: m, t: 0, run(f, dt) { this.t += dt; const u = this.t / 0.45; f.A.lift = Math.sin(clamp01(u) * Math.PI) * 0.14 * f.q.S; f.A.airGoal = 1; f.pos.x += Math.sin(f.heading) * dt * 0.7; f.pos.z += Math.cos(f.heading) * dt * 0.7; m.A.wagGoal = 1; f.A.mouthGoal = 0.9 * smooth(0.3, 0.8, u); f.A.earsGoal = 0.6; return u >= 1; } },
  T.wait(1.2, (f, t) => { f.A.bowGoal = 1; f.A.lookPitchGoal = 1.3; f.A.wagGoal = 1; f.A.mouthGoal = t < 0.25 ? 0.1 : 0.4; f.A.squintGoal = 0.5; }),     // landed on mum's brush, paws on it
  T.wait(0.6, f => { f.A.shakeGoal = 1; f.A.squintGoal = 1; }));
}
// dad lies down and rolls over, playing dead with his legs in the air, while the cubs bounce round him
function playDead(fam, dad, cubs) {
  for (const c of cubs.slice(0, 2)) {
    c.todo = [seq(T.wait(1.5 + fam.r()), { name: 'bounce', with: dad, t: 0, run(f, dt) {
      this.t += dt; const a = this.t * 2.2 + c.r() * 6, tx = dad.pos.x + Math.cos(a) * 0.85, tz = dad.pos.z + Math.sin(a) * 0.85;
      f.moveTo(tx, tz, dt, 'trot'); f.A.lift = Math.abs(Math.sin(this.t * 7)) * 0.07 * f.q.S; f.A.wagGoal = 1; f.A.tailUpGoal = 0.6; playFace(f, 0.8); return this.t > 4.5;
    } }, bowAt(dad))];
    c.task = null;
  }
  return seq(lieDown(1.5), T.wait(5, (f, t) => { f.A.lieGoal = 1; f.A.rollGoal = 2.75; f.A.kickGoal = t < 0.8 ? 1 : 0.15; f.A.lookYawGoal = 0.7;
      f.A.mouthGoal = 0.7; f.A.earsGoal = -0.5; f.A.squintGoal = 1; if (t > 3.3 && t < 4) f.A.winkLGoal = -1; }),     // eyes shut, tongue out... and a peek

    T.wait(1, f => { f.A.rollGoal = 0; f.A.lieGoal = 1; playFace(f, 0.6); }), T.wait(0.8, f => { f.A.shakeGoal = 1; f.A.squintGoal = 1; }));
}
// a butterfly over the meadow, and a cub after it: hops and snaps, a miss, nose in the grass
function butterflyHunt(fam) {
  const B = fam.butterfly;
  return { name: 'butterfly', t: 0, run(f, dt) {
    this.t += dt; B.chaser = f; const A = f.A, bx = B.mesh.position.x, bz = B.mesh.position.z;
    if (this.t < 5) { f.moveTo(bx, bz, dt, 'trot'); A.lookPitchGoal = -0.6; A.tailUpGoal = 0.4; A.wagGoal = 0.5; A.earsGoal = 1; A.wideGoal = 0.7; if (Math.hypot(bx - f.pos.x, bz - f.pos.z) < 0.25) this.t = Math.max(this.t, 5); return false; }
    if (this.t < 5.6) { const u = (this.t - 5) / 0.6; A.lift = Math.sin(u * Math.PI) * 0.22 * f.q.S; A.air = A.airGoal = Math.min(1, Math.min(u, 1 - u) * 6); A.airPh = u; A.pitch = -0.45 + 0.75 * u; A.lookPitchGoal = -0.5 + 0.9 * u; A.mouthGoal = u < 0.75 ? 1 : 0; A.earsGoal = 0.6; return false; }
    if (this.t < 6.8) { A.bowGoal = 1; A.lookPitchGoal = 1.5; B.flee = 2; A.squintGoal = 0.8; return false; }      // paws down where it was: missed
    if (this.t < 7.6) { A.sitGoal = 1; A.lookPitchGoal = -0.7; A.headTiltGoal = 0.3; A.earLGoal = -0.6; A.earRGoal = 0.4; return false; }
    B.chaser = null; return true;
  } };
}
function makeButterfly() {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: '#f3d24a', side: THREE.DoubleSide });
  const wing = new THREE.CircleGeometry(0.035, 10); wing.scale(1, 0.75, 1);
  const L = new THREE.Mesh(wing, m), Rr = new THREE.Mesh(wing, m); L.position.x = 0.03; Rr.position.x = -0.03;
  const pl = new THREE.Group(), pr = new THREE.Group(); pl.add(L); pr.add(Rr); g.add(pl, pr);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 5).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3a2a1a' })); g.add(body);
  g.visible = false;
  let t = 3.7;                             // (the same flight every time: the checks see the same play)
  return { mesh: g, chaser: null, flee: 0, update(dt, fam) {
    t += dt; g.visible = fam.out; if (!g.visible) return;
    const [fx, fz, fr] = fam.field, k = this.flee > 0 ? 1.8 : 1; this.flee = Math.max(0, this.flee - dt);
    const x = fx + Math.cos(t * 0.31 * k) * fr * 0.6 + Math.sin(t * 0.83) * 0.3, z = fz + Math.sin(t * 0.27 * k) * fr * 0.55 + Math.cos(t * 0.71) * 0.3;
    const y = 0.35 + 0.15 * Math.sin(t * 1.9) + (this.flee > 0 ? 0.4 * this.flee : 0);
    const dx = x - g.position.x, dz = z - g.position.z; g.position.set(x, y, z);
    if (Math.hypot(dx, dz) > 1e-4) g.rotation.y = Math.atan2(dx, dz);
    const f = Math.sin(t * 28) * 0.9; pl.rotation.z = f; pr.rotation.z = -f;
  } };
}

// ---------------------------------------------------------------- the line-up (?lineup=foxes): the family standing in a row for a close
// look, and behind them the same five in their poses (sitting, lying, a play bow, on its back kicking, up on its hind legs)
export class FoxLineup {
  constructor(scene, centre, yaw, joints, r) {
    this.r = r; this.joints = joints; this.out = true;
    this.group = new THREE.Group(); this.group.position.copy(centre); this.group.rotation.y = yaw; scene.add(this.group);
    // four short rows for a phone held upright: the grown-ups, the cubs, then the grown-ups and the cubs in their poses
    const L = [['fox', NAMES.dad, 'dad', 1, -0.5, -1.45, 'stand'], ['fox', NAMES.mum, 'mum', 0.92, 0.45, -1.45, 'stand'],
      ['cub', NAMES.cubs[0], 'cub', 1, -0.55, -0.6, 'stand'], ['cub', NAMES.cubs[1], 'cub', 0.95, 0.0, -0.6, 'stand'], ['cub', NAMES.cubs[2], 'cub', 0.9, 0.55, -0.6, 'stand'],
      ['fox', NAMES.dad, 'dad', 1, -0.5, 0.45, 'sit'], ['fox', NAMES.mum, 'mum', 0.92, 0.5, 0.5, 'lie'],
      ['cub', NAMES.cubs[0], 'cub', 1, -0.55, 1.35, 'bow'], ['cub', NAMES.cubs[1], 'cub', 0.95, 0.0, 1.35, 'back'], ['cub', NAMES.cubs[2], 'cub', 0.9, 0.55, 1.35, 'rear']];
    this.foxes = L.map(([k, n, role, sc, x, z, pose]) => {
      const f = new Fox(this, k, n, role, sc, r);
      f.home = false; f.root.visible = true; f.pos.set(x, 0, z); f.heading = -0.75; f.linePose = pose; return f;
    });
  }
  nextTask(f) {
    const p = f.linePose;
    if (p === 'sit') return sitWatch(8);
    if (p === 'lie') return lieDown(10);
    if (p === 'bow') return T.wait(4, (f, t) => { f.A.bowGoal = 1; f.A.wagGoal = 1; f.A.tailUpGoal = 0.6; });
    if (p === 'back') return T.wait(6, (f, t) => { f.A.rollGoal = 2.85; f.A.kickGoal = Math.sin(t * 1.3) > 0.4 ? 1 : 0.15; f.A.lookYawGoal = 0.5; });
    if (p === 'rear') return T.wait(6, (f, t) => { f.A.rearGoal = 1; f.A.pawGoal = Math.sin(t * 0.9) > 0 ? 1 : 0.2; });
    return T.wait(6, (f, t) => look(f, t));
  }
  update(dt) { for (const f of this.foxes) f.update(dt); }
  visible() { return true; }
  centre(v) { return v.copy(this.group.position); }
  tapped(f) { f.todo.unshift(seq(hop(), bowAt(null, 1.2))); f.task = null; }
}

// ------------------------------------------------------------------ ?lineup=dog: Biscuit the Border Collie in a few poses, for a close look
export class DogLineup {
  constructor(scene, centre, yaw, joints, r, name = 'Biscuit') {
    this.r = r; this.joints = joints; this.out = true; this.isDogs = true;
    this.group = new THREE.Group(); this.group.position.copy(centre); this.group.rotation.y = yaw; scene.add(this.group);
    const L = [[-0.5, -1.45, 'stand'], [0.5, -1.45, 'sit'], [-0.5, -0.35, 'bow'], [0.5, -0.35, 'lie'], [-0.5, 0.75, 'happy'], [0, 1.75, 'trot']];
    this.foxes = L.map(([x, z, pose]) => {
      const f = new Fox(this, 'collie', name, 'dog', 1, r);
      f.home = false; f.root.visible = true; f.pos.set(x, 0, z); f.heading = -0.75; f.linePose = pose; f.spot = [x, z]; return f;
    });
  }
  nextTask(f) {
    const p = f.linePose;
    if (p === 'sit') return sitWatch(8);
    if (p === 'lie') return lieDown(10);
    if (p === 'bow') return T.wait(4, (f, t) => { f.A.bowGoal = 1; f.A.wagGoal = 1; f.A.tailUpGoal = 0.6; playFace(f, 0.7); });
    if (p === 'happy') return T.wait(6, (f, t) => {             // pleased to see you: tail going, grinning, a tilt of the head
      f.A.wagGoal = 1; f.A.tailUpGoal = 0.45; playFace(f, 0.9); f.A.squintGoal = 0.3; f.A.headTiltGoal = t % 3 < 1.4 ? 0.3 : 0; f.A.lookPitchGoal = -0.15; });
    if (p === 'trot') return T.wait(6, (f, t, dt) => {             // round and round a long oval across the bottom row, happily
      const RX = 0.75, RZ = 0.2, a = Math.atan2((f.pos.x - f.spot[0]) / RX, (f.pos.z - f.spot[1]) / RZ) - 0.5;
      f.moveTo(f.spot[0] + Math.sin(a) * RX, f.spot[1] + Math.cos(a) * RZ, dt, 'trot', true); f.A.wagGoal = 0.5; f.A.tailUpGoal = 0.25; playFace(f, 0.5); });
    return T.wait(15, (f, t) => moods(f, t));
  }
  update(dt) { for (const f of this.foxes) f.update(dt); }
  visible() { return true; }
  centre(v) { return v.copy(this.group.position); }
  tapped(f) { f.todo.unshift(seq(hop(), bowAt(null, 1.2))); f.task = null; }
}
// the game's welcome picture (main.js ?poster): Biscuit alone, in a play bow (tail up and going, grinning), or as asked
export class PosterDog {
  constructor(scene, x, z, heading, joints, r, name = 'Biscuit') {
    this.r = r; this.joints = joints; this.out = true; this.isDogs = true; this.pose = 'bow';
    this.group = new THREE.Group(); scene.add(this.group);
    const f = new Fox(this, 'collie', name, 'dog', 1, r);
    f.home = false; f.root.visible = true; f.pos.set(x, 0, z); f.heading = heading; this.foxes = [f];
  }
  nextTask(f) {
    return T.wait(1e6, (f, t) => {
      const A = f.A;
      if (this.pose === 'bow') { A.bowGoal = 1; A.pitch = this.pitch ?? 0.3; A.wagGoal = 1; A.tailUpGoal = 0.85; playFace(f, 1); A.lookPitchGoal = this.look ?? -0.25; A.headTiltGoal = 0.2; }
      else if (this.pose === 'sit') { A.sitGoal = 1; A.wagGoal = 0.6; playFace(f, 0.8); }
    });
  }
  update(dt) { for (const f of this.foxes) f.update(dt); }
  visible() { return true; }
  centre(v) { return v.copy(this.foxes[0].pos); }
  tapped() {}
}
// the standing dog of the line-up shows his faces, 2.5 s each: looking about, puzzled (head tilted, one lid up), happy
// (grinning, wagging), pleading (looking up, inner corners raised), intent (crouched, the stare) and sleepy
export const MOODS = ['look', 'puzzled', 'happy', 'pleading', 'intent', 'sleepy'];
function moods(f, t) {
  const A = f.A, m = MOODS[Math.floor(t / 2.5) % MOODS.length];
  if (m === 'look') { look(f, t); A.wagGoal = 0.2; }
  if (m === 'puzzled') { A.earsGoal = 0.9; A.earLGoal = 0.3; A.earRGoal = -0.4; A.headTiltGoal = 0.36; A.lookPitchGoal = -0.05; }
  if (m === 'happy') { playFace(f, 1); A.wagGoal = 1; A.tailUpGoal = 0.4; }
  if (m === 'pleading') { A.lidTiltGoal = -0.9; A.lidSoftGoal = 0.12; A.earsGoal = -0.25; A.lookPitchGoal = -0.35; A.wagGoal = 0.25; }
  if (m === 'intent') { A.crouchGoal = 0.45; A.earsGoal = 1; A.lookPitchGoal = 0.25; A.lidTiltGoal = 0.2; A.wideGoal = 0.2; }
  if (m === 'sleepy') { A.lidSoftGoal = 0.42; A.earsGoal = -0.35; A.lookPitchGoal = 0.15; }
  f.mood = m;
}

// (for the farm dog's day, dog.js: the same animal and moves)
export { Fox, T, seq, look, playFace, sitWatch, lieDown, yawn, hop, bowAt, tailChase, roll, dizzy };

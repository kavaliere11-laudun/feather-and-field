// The farm's geese: Gertrude, a big white Embden goose (the boss), and Hector, a grey Toulouse gander who follows her
// everywhere and copies whatever she does, a beat late. Models (geese.glb / geese.json, stylized/geese.py,
// export_geese.py): one skinned mesh each, with vertex colours, the feathers' patterns and lattices worked out by the
// exporter, and bones: the body; the neck in four and the head; the lower bill; the eyes; each wing folded and open; the
// tail; each leg's thigh, heel and webbed foot. Feathered here with the birds' feather drawing and a little fluff.
import * as THREE from 'three';
import { addFur, R, gooseMaterial, furHooks } from './birds.js';

let MODELS = {}, NAMES = {};
export function initGeese(gltf, json) {
  MODELS = {}; NAMES = json.names || {};
  if (json.joints && json.joints.join() !== JOINTS.join()) console.warn('geese: the model\'s bones do not match this code');
  for (const child of gltf.scene.children) {
    let mesh = null; child.traverse(c => { if (c.isMesh && !mesh) mesh = c; });
    if (!mesh) continue;
    mesh.geometry.computeBoundingBox();
    MODELS[child.name] = { geo: mesh.geometry, piv: json.models[child.name], built: null };
  }
}
export const gooseName = kind => NAMES[kind] || kind;

// feather sizes (cm) per region: broad on the body and wings, small on the head (the neck's are made smaller by the drawing);
// the modelled flight and tail feathers draw their own
const FEATHER = { [R.body]: 2.7, [R.wing]: 2.5, [R.crest]: 2.7, [R.legfeather]: 1.6 };      // (the neck's and head's drawn much smaller: velvety)
// a slight soft fluff over the feathers (the birds' painted hair, short and fine), a little longer underneath
const FUR = { len: { [R.body]: 0.012, [R.wing]: 0.006, [R.crest]: 0.003, [R.legfeather]: 0.012 }, shells: 4, comb: 0.9, fine: 1.3, under: 1.0, fluff: 0.06 };

function gooseGeometry(name) {
  const M = MODELS[name];
  if (M.built) return M.built;
  const src = M.geo, A = src.attributes, n = A.position.count, base = A.color, k = base.normalized ? 1 / 255 : 1;
  const col = new Float32Array(n * 3), fs = new Float32Array(n), fh = new Float32Array(n), fp = new Float32Array(n * 4), fm = new Float32Array(n);
  const fuv = new Float32Array(n * 3), paint = A._paint.array, pos = A.position.array, si = A.skinIndex.array;
  const P = A._fpat, PM = A._fmode, HW = A._headw, F = A._feat;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 3; j++) col[i * 3 + j] = base.array[i * base.itemSize + j] * k;
    fs[i] = FEATHER[paint[i]] || 0; fh[i] = HW.getX(i);
    if (paint[i] === R.body && fh[i] < 0.5) {            // small and fine on the breast and belly, broad on the flanks and back
      const ny = A.normal.getY(i), nz = A.normal.getZ(i), z = pos[i * 3 + 2];
      const breast = smooth(0.0, 0.1, z) * smooth(0.1, 0.55, nz), belly = smooth(-0.15, -0.6, ny);
      fs[i] *= 1.15 - 0.55 * Math.max(breast, belly);
    }
    for (let j = 0; j < 4; j++) fp[i * 4 + j] = P.getComponent(i, j);
    fm[i] = PM.getX(i);
    fuv[i * 3] = F.getX(i); fuv[i * 3 + 1] = F.getY(i);
  }
  // the wings' rows: how far back along each wing a point is (0.02 at the front .. 1 at the back, where the flight feathers
  // show), worked out for each wing separately (folded and open)
  const J = M.piv && MODELS[name].joints, bones = {};
  for (let i = 0; i < n; i++) if (paint[i] === R.wing) { const b = si[i * 4]; (bones[b] || (bones[b] = [])).push(i); }
  for (const b in bones) {
    let z0 = Infinity, z1 = -Infinity;
    for (const i of bones[b]) { z0 = Math.min(z0, pos[i * 3 + 2]); z1 = Math.max(z1, pos[i * 3 + 2]); }
    for (const i of bones[b]) fuv[i * 3 + 2] = 0.02 + 0.98 * (z1 - pos[i * 3 + 2]) / Math.max(1e-4, z1 - z0);
  }
  let g = new THREE.BufferGeometry();
  for (const a of ['position', 'normal', 'skinIndex', 'skinWeight']) g.setAttribute(a, A[a]);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('featherSize', new THREE.BufferAttribute(fs, 1)); g.setAttribute('featherHead', new THREE.BufferAttribute(fh, 1));
  g.setAttribute('featherPattern', new THREE.BufferAttribute(fp, 4)); g.setAttribute('featherMode', new THREE.BufferAttribute(fm, 1));
  g.setAttribute('featherUV', new THREE.BufferAttribute(fuv, 3)); g.setAttribute('eyeAt', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  g.setAttribute('gooseN', A._gn);
  g.setIndex(src.index);
  g.boundingBox = src.boundingBox.clone(); g.computeBoundingSphere();
  g = addFur(g, src, FUR, M.piv.headc);
  return (M.built = g);
}

const JOINTS = ['root', 'body', 'neck1', 'neck2', 'neck3', 'neck4', 'head', 'jaw', 'blinkL', 'blinkR',
  'wingL', 'wingLo', 'wingLh', 'wingR', 'wingRo', 'wingRh', 'tail', 'legL', 'legLk', 'legLf', 'legR', 'legRk', 'legRf'];
const PARENT = { body: 'root', neck1: 'body', neck2: 'neck1', neck3: 'neck2', neck4: 'neck3', head: 'neck4', jaw: 'head', blinkL: 'head', blinkR: 'head',
  wingL: 'body', wingLo: 'body', wingLh: 'wingLo', wingR: 'body', wingRo: 'body', wingRh: 'wingRo', tail: 'body', legL: 'body', legLk: 'legL', legLf: 'legLk', legR: 'body', legRk: 'legR', legRf: 'legRk' };
const NECK = ['neck1', 'neck2', 'neck3', 'neck4', 'head'];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = x => Math.min(1, Math.max(0, x));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const arg = (y, z) => Math.atan2(z, y);             // a direction in a bone's side view (y up, z forward); rotation.x adds to it
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _q = new THREE.Vector3();
const _j = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _qr = new THREE.Quaternion();

// the neck's shapes, as each joint's turn (pitch: + leans forward and down; yaw: + to the goose's left; roll), from the
// gentle S she holds at rest: up (stretched tall, alert), honk (tall, bill raised), low (stretched out forward close to the
// ground: hissing, charging), graze (bill down in the grass), preen (round to one side, bill in the back feathers), tuck
// (asleep: head laid back on the back, bill under the wing)
const NECK_POSE = {
  up: { neck1: [-0.38, 0, 0], neck2: [0.02, 0, 0], neck3: [0.1, 0, 0], neck4: [0.12, 0, 0], head: [0.12, 0, 0] },
  honk: { neck1: [-0.42, 0, 0], neck2: [-0.05, 0, 0], neck3: [0.0, 0, 0], neck4: [-0.15, 0, 0], head: [-0.65, 0, 0] },
  low: { neck1: [1.12, 0, 0], neck2: [0.22, 0, 0], neck3: [-0.05, 0, 0], neck4: [-0.3, 0, 0], head: [-0.75, 0, 0] },
  graze: { neck1: [1.05, 0, 0], neck2: [0.55, 0, 0], neck3: [0.35, 0, 0], neck4: [0.2, 0, 0], head: [0.35, 0, 0] },
  preen: { neck1: [0.15, 0.55, 0], neck2: [0.25, 0.75, 0.1], neck3: [0.3, 0.7, 0.1], neck4: [0.25, 0.4, 0], head: [0.5, 0.35, 0.3] },
  tuck: { neck1: [-0.45, 0.85, 0], neck2: [0.45, 0.95, 0.25], neck3: [0.75, 0.85, 0.25], neck4: [0.6, 0.5, 0.1], head: [0.95, 0.7, 0.5] },
};

if (typeof window !== 'undefined') window.__NECK_POSE = NECK_POSE;        // (for tuning the shapes from a test page)

// A goose's body and bones, posed from a few numbers (as the foxes' Quad): the actor sets the gait and what she's doing.
// The feet are placed on the ground and the legs bend to reach them (hip, heel, foot), so the waddle, a sit and a run fold
// them naturally; the neck takes its shapes above; the wings fold away or open and flap; the tail wags.
export class GooseRig {
  constructor(name) {
    const M = MODELS[name], P = M.piv;
    this.name = name;
    this.mesh = new THREE.SkinnedMesh(gooseGeometry(name), gooseMaterial()); furHooks(this.mesh);
    this.mesh.receiveShadow = true;
    this.bones = {}; this.rest = {};
    const list = JOINTS.map(nm => {
      const b = new THREE.Bone(); b.name = nm;
      const p = P[nm] || [0, 0, 0], q = PARENT[nm] ? (P[PARENT[nm]] || [0, 0, 0]) : [0, 0, 0];
      b.position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      this.bones[nm] = b; this.rest[nm] = b.position.clone();
      return b;
    });
    for (const nm of JOINTS) if (PARENT[nm]) this.bones[PARENT[nm]].add(this.bones[nm]);
    this.mesh.add(this.bones.root);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(list));
    this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.35, 0), 0.75);
    this.by = P.body[1];                                  // the body's middle, its height
    // each leg at rest, in the body's frame: hip, heel, foot (side view y, z), the bones' lengths and directions
    this.legs = {};
    for (const L of ['legL', 'legR']) {
      const b = P.body, h = P[L], k = P[L + 'k'], f = P[L + 'f'];
      const H = [h[1] - b[1], h[2] - b[2]], K = [k[1] - b[1], k[2] - b[2]], Fo = [f[1] - b[1], f[2] - b[2]];
      this.legs[L] = { H, a1: arg(K[0] - H[0], K[1] - H[1]), a2: arg(Fo[0] - K[0], Fo[1] - K[1]),
        L1: Math.hypot(K[0] - H[0], K[1] - H[1]), L2: Math.hypot(Fo[0] - K[0], Fo[1] - K[1]), foot: f, side: h[0] };
    }
    this.tail = { y: 0, yv: 0, p: 0, pv: 0 };
    this.bill = new THREE.Vector3(P.bill[0] - P.head[0], P.bill[1] - P.head[1], P.bill[2] - P.head[2]);     // the bill's tip, from the head's joint
  }
  // the neck reaching: turn its joints (head first, then down the neck) so the bill's tip comes to a point (the rig's own
  // frame), a little at a time and each joint only so far from its shape, so the neck bends smoothly along its length
  neckTo(target, weight = 1, iters = 12) {
    const B = this.bones, chain = ['head', 'neck4', 'neck3', 'neck2', 'neck1'], lim = { head: 1.7, neck4: 1.5, neck3: 1.5, neck2: 1.5, neck1: 1.6 };
    const start = chain.map(nm => B[nm].quaternion.clone());
    this.mesh.updateMatrixWorld(true);
    _t.copy(target); this.mesh.localToWorld(_t);
    for (let it = 0; it < iters; it++) {
      for (let k = 0; k < chain.length; k++) {
        const b = B[chain[k]];
        b.updateWorldMatrix(true, true);
        b.getWorldPosition(_j); _e.copy(this.bill); B.head.localToWorld(_e);
        const v1 = _e.sub(_j), v2 = _q.copy(_t).sub(_j);
        if (v1.lengthSq() < 1e-8 || v2.lengthSq() < 1e-8) continue;
        _qa.setFromUnitVectors(v1.normalize(), v2.normalize());
        _qi.identity(); _qa.slerp(_qi, 0.5);                                   // half way each time: smoother
        b.parent.getWorldQuaternion(_qp);
        _qr.copy(_qp).invert().multiply(_qa).multiply(_qp);                    // the world turn, in the parent's frame
        b.quaternion.premultiply(_qr);
        const a = b.quaternion.angleTo(start[k]);                              // (each joint only so far from its shape)
        if (a > lim[chain[k]]) b.quaternion.copy(start[k]).slerp(b.quaternion, lim[chain[k]] / a);
      }
    }
    if (weight < 1) chain.forEach((nm, k) => { const got = B[nm].quaternion.clone(); B[nm].quaternion.copy(start[k]).slerp(got, weight); });
  }
  // a leg's bones from where its foot should be (body frame, side view y, z) and how far the foot curls (lifted)
  reach(L, ty, tz, curl, pitch) {
    const G = this.legs[L], B = this.bones;
    const vy = ty - G.H[0], vz = tz - G.H[1];
    const dist = Math.min(G.L1 + G.L2 - 1e-4, Math.max(Math.abs(G.L1 - G.L2) + 1e-4, Math.hypot(vy, vz)));
    const dir = arg(vy, vz), a = Math.acos(Math.min(1, Math.max(-1, (G.L1 * G.L1 + dist * dist - G.L2 * G.L2) / (2 * G.L1 * dist))));
    // the heel goes behind the line from the hip to the foot (the bend points back)
    const e1 = dir + a, e2 = dir - a, z1 = G.H[1] + G.L1 * Math.sin(e1), z2 = G.H[1] + G.L1 * Math.sin(e2);
    const e = z1 < z2 ? e1 : e2, ey = G.H[0] + G.L1 * Math.cos(e), ez = G.H[1] + G.L1 * Math.sin(e);
    const t0 = wrap(e - G.a1), t1 = wrap(arg(ty - ey, tz - ez) - G.a2 - t0);
    B[L].rotation.x = t0; B[L + 'k'].rotation.x = t1;
    B[L + 'f'].rotation.x = -(t0 + t1) - pitch + curl;           // the foot level on the ground (curled when lifted)
  }
  // pose: walk 0..1, phase, stride (m), run 0..1, turn (rad/s), the neck's shapes (up, honk, low, graze, preen, tuck: 0..1;
  // side: which way to preen or tuck), lookYaw, lookPitch, jaw 0..1, wings 0..1 (open), flap 0..1, wingLift 0..1 (the folded
  // wings lifted, as when shaking out), wag 0..1, tailUp, sit 0..1, shake 0..1, shut 0..1 (eyes), lift (m), t, dt
  pose(s) {
    const B = this.bones, Rr = this.rest, t = s.t || 0, dt = Math.min(0.05, s.dt || 1 / 30);
    for (const nm in B) { B[nm].rotation.set(0, 0, 0); B[nm].position.copy(Rr[nm]); B[nm].scale.set(1, 1, 1); }
    const g = s.walk || 0, run = s.run || 0, ph = s.phase || 0, sit = s.sit || 0, turn = Math.max(-3, Math.min(3, s.turn || 0));
    // ---- the body: the waddle (rolling onto each foot as it takes the weight, a little rise over each step), a lean
    // forward running, lowered to the ground sitting
    const roll = -0.11 * g * (1 - 0.4 * run) * Math.sin(ph) - 0.06 * turn * g + (s.roll || 0) + 0.22 * (s.shake || 0) * Math.sin(t * 34);
    const stance = this.name === 'embden' ? -0.17 : -0.04;
    const pitch = (s.pitch || 0) + stance * (1 - sit) * (1 - 0.6 * (s.low || 0)) + 0.18 * run + 0.06 * (s.low || 0) - 0.05 * (s.up || 0) - 0.08 * (s.honk || 0) + 0.05 * sit;
    const drop = sit * (this.by - 0.115) + 0.012 * g * (1 - Math.abs(Math.cos(ph))) - 0.02 * (s.low || 0);
    B.body.position.y -= drop - (s.lift || 0);
    B.body.rotation.set(pitch, 0.05 * g * Math.sin(ph) * (1 - run), roll, 'YXZ');
    // ---- the neck: the shapes blended, turned to look, swaying against the waddle so the head stays steady
    const side = s.side || 1;
    for (const nm of NECK) { const b = B[nm].rotation; b.x = 0; b.y = 0; b.z = 0; }
    for (const k in NECK_POSE) {
      const w = s[k] || 0; if (w <= 0) continue;
      for (const nm in NECK_POSE[k]) { const r = NECK_POSE[k][nm]; B[nm].rotation.x += r[0] * w; B[nm].rotation.y += r[1] * w * side; B[nm].rotation.z += r[2] * w * side; }
    }
    const ly = s.lookYaw || 0, lp = s.lookPitch || 0;
    B.neck2.rotation.y += 0.25 * ly; B.neck3.rotation.y += 0.25 * ly; B.neck4.rotation.y += 0.2 * ly; B.head.rotation.y += 0.3 * ly;
    B.neck4.rotation.x += 0.3 * lp; B.head.rotation.x += 0.5 * lp;
    B.neck1.rotation.z -= roll * 0.55; B.neck2.rotation.z -= roll * 0.3;
    B.neck1.rotation.x -= (pitch - (s.pitch || 0)) * 0.75;                  // (the neck stays up when the body leans into a run or stands tall)
    B.neck2.rotation.x += 0.04 * g * Math.sin(2 * ph);                     // a little nod with each step
    if (s.billAt && (s.billW || 0) > 0.01) { B.root.updateMatrixWorld(true); this.neckTo(s.billAt, Math.min(1, s.billW)); }
    // ---- the bill: open for a honk or a hiss; the eyes blink
    B.jaw.rotation.x = 0.55 * clamp01(s.jaw || 0);
    const shut = clamp01(s.shut || 0); B.blinkL.scale.set(1, 1 - 0.85 * shut, 1); B.blinkR.scale.set(1, 1 - 0.85 * shut, 1);
    // ---- the wings: folded (lifted a little shaking out), or open: the folded wing tucks away as the open one grows from
    // the shoulder, swept back while half open; flapping beats them up and down
    const o = clamp01(s.wings || 0), fl = s.flap || 0, beat = Math.sin(t * 15);
    for (const [nm, sd] of [['wingL', 1], ['wingR', -1]]) {
      const k = 1 - 0.9 * smooth(0.0, 0.55, o);
      B[nm].scale.setScalar(Math.max(0.05, k));
      B[nm].rotation.z = sd * 0.12 * (s.wingLift || 0) * (1 + 0.5 * Math.sin(t * 30));
      B[nm].rotation.x = -0.05 * (s.wingLift || 0);
      const op = B[nm + 'o'], u = smooth(0.15, 1.0, o);
      op.scale.setScalar(Math.max(0.001, u));
      op.rotation.y = sd * (1 - o) * 1.1;                                       // swept back while opening
      op.rotation.z = sd * (0.25 * (1 - o) + fl * (0.15 + 0.75 * beat) - 0.15 * (s.low || 0) * o);
      op.rotation.x = -0.2 * (s.low || 0) * o;
      // the hand: folded back along the arm while the wing opens, then out; flapping, it follows the arm a moment later
      const hd = B[nm + 'h'], beat2 = Math.sin(t * 15 - 0.9);
      hd.rotation.y = sd * (1 - o) * 1.5;
      hd.rotation.z = sd * fl * 0.45 * beat2 - sd * 0.1 * (s.low || 0) * o;
    }
    // ---- the tail: on a spring, wagging side to side (a goose's happy shake), up when alert
    const T = this.tail, gy = (s.wag || 0) * 0.38 * Math.sin(t * 11) + 0.08 * g * Math.sin(ph) - 0.06 * turn;
    T.yv += ((gy - T.y) * 140 - T.yv * 10) * dt; T.y += T.yv * dt;
    B.tail.rotation.set(-(s.tailUp || 0) * 0.35 + 0.05 * Math.sin(t * 1.3), T.y, 0);
    // ---- the legs: each foot on the ground under the hip, stepping (duty: the share of the step on the ground), lifted a
    // little and curled as it swings; under the body when sitting
    const duty = 0.62 - 0.17 * run, stride = s.stride || 0.16, amp = duty * stride / 2 * g;
    for (const [L, off] of [['legL', 0], ['legR', Math.PI]]) {
      const G = this.legs[L], u = (((ph + off) / (Math.PI * 2)) % 1 + 1) % 1;
      let dz, dy = 0, curl = 0;
      if (u < duty) dz = amp * (1 - 2 * u / duty);
      else { const v = (u - duty) / (1 - duty), w = smooth(0, 1, v); dz = amp * (2 * w - 1); dy = (0.03 + 0.02 * run) * g * Math.sin(Math.PI * v); curl = 0.9 * Math.sin(Math.PI * Math.min(1, v * 1.2)) * g; }
      // the foot's target in the body's frame (the body lowered and tipped)
      const fx = G.side, fy = G.foot[1] + dy, fz = G.foot[2] + dz - 0.03 * sit;
      B.root.updateMatrix(); B.body.updateMatrix(); _m.multiplyMatrices(B.root.matrix, B.body.matrix).invert();
      _v.set(fx, fy + (sit > 0 ? 0.035 * sit : 0), fz).applyMatrix4(_m);
      this.reach(L, _v.y, _v.z, curl + 0.6 * sit, pitch);
    }
  }
}

// ------------------------------------------------------------------ one goose: where she is, which way she faces, what she's doing
class Goose {
  constructor(group, kind, r) {
    this.kind = kind; this.name = gooseName(kind); this.r = r;
    this.rig = new GooseRig(kind);
    this.root = new THREE.Group(); this.root.add(this.rig.mesh); group.add(this.root);
    this.A = { t: r() * 10, phase: 0 }; this.heading = 0; this.task = null;
    this.blinkIn = 1 + r() * 3; this.blinkT = 0;
    this.hitR = 0.3; this.hitY = 0.4;
    this.label = this.name + (kind === 'embden' ? ' · Embden goose' : ' · Toulouse gander');
  }
  get pos() { return this.root.position; }
  update(dt) {
    const A = this.A; A.t += dt; A.dt = dt;
    for (const k of ['walk', 'run', 'up', 'honk', 'low', 'graze', 'preen', 'tuck', 'jaw', 'wings', 'flap', 'wingLift', 'wag', 'tailUp', 'sit', 'shake', 'squint', 'billW']) A[k + 'Goal'] = 0;
    A.lookYawGoal = 0; A.lookPitchGoal = 0;
    if (this.task && this.task(this, dt) === true) this.task = null;
    if ((this.blinkIn -= dt) <= 0) { this.blinkT = 0.16; this.blinkIn = 2 + this.r() * 4; }
    const blink = this.blinkT > 0 ? Math.sin(Math.PI * (1 - (this.blinkT -= dt) / 0.16)) : 0;
    const ease = (k, rate) => { A[k] = (A[k] || 0) + ((A[k + 'Goal'] || 0) - (A[k] || 0)) * Math.min(1, dt * rate); };
    for (const k of ['up', 'honk', 'low', 'graze', 'preen', 'tuck', 'sit', 'wingLift', 'tailUp', 'lookYaw', 'lookPitch']) ease(k, 5);
    for (const k of ['jaw', 'wag', 'shake', 'squint']) ease(k, 12);
    ease('wings', 6); ease('flap', 6); ease('walk', 6); ease('run', 4); ease('billW', 4);
    A.shut = Math.max(blink, A.squint || 0);
    A.phase += dt * (A.walk || 0) * (6 + 6 * (A.run || 0));
    A.stride = 0.15 + 0.1 * (A.run || 0);
    this.root.rotation.y = this.heading;
    this.rig.pose(A);
  }
}

// ------------------------------------------------------------------ ?lineup=geese: both geese in a row of poses, for a close look
export class GeeseLineup {
  constructor(scene, centre, yaw, r) {
    this.group = new THREE.Group(); this.group.position.copy(centre); this.group.rotation.y = yaw; scene.add(this.group);
    const poses = ['stand', 'walk', 'honk', 'graze', 'preen', 'wings', 'hiss', 'sleep'];
    this.geese = [];
    poses.forEach((p, i) => {
      for (const [k, x] of [['embden', -0.45], ['toulouse', 0.45]]) {
        const gz = new Goose(this.group, k, r);
        gz.pos.set(x, 0, -2.4 + i * 0.85); gz.heading = -0.95; gz.linePose = p;
        gz.task = LINE[p]; this.geese.push(gz);
      }
    });
  }
  update(dt) { for (const g of this.geese) g.update(dt); }
}
const LINE = {
  stand: (g, dt) => { g.A.lookYawGoal = 0.5 * Math.sin(g.A.t * 0.6); g.A.wagGoal = Math.sin(g.A.t * 0.5) > 0.8 ? 1 : 0; },
  walk: (g, dt) => { g.A.walkGoal = 1; },
  honk: (g, dt) => { const u = (g.A.t % 2.4) / 2.4; g.A.honkGoal = 1; g.A.jawGoal = u < 0.5 ? (Math.sin(u * 40) > 0 ? 1 : 0.2) : 0; g.A.tailUpGoal = 0.6; },
  graze: (g, dt) => { g.A.grazeGoal = 1; g.A.jawGoal = Math.sin(g.A.t * 9) > 0.5 ? 0.4 : 0; g.A.billAt = (g.at1 || (g.at1 = new THREE.Vector3())).set(0.03 * Math.sin(g.A.t * 1.3), 0.025, 0.28 + 0.03 * Math.sin(g.A.t * 0.9)); g.A.billWGoal = 1; },
  preen: (g, dt) => { g.A.preenGoal = 1; g.A.side = 1; g.A.wingLiftGoal = 0.4; g.A.billAt = (g.at1 || (g.at1 = new THREE.Vector3())).set(0.115, g.rig.by + 0.055 + 0.015 * Math.sin(g.A.t * 7), -0.04 - 0.05 * Math.sin(g.A.t * 0.8)); g.A.billWGoal = 1; },
  wings: (g, dt) => { g.A.wingsGoal = 1; g.A.flapGoal = 1; g.A.upGoal = 0.7; },
  hiss: (g, dt) => { g.A.lowGoal = 1; g.A.wingsGoal = 0.75; g.A.jawGoal = 0.8; g.A.tailUpGoal = 0.4; },
  sleep: (g, dt) => { g.A.sitGoal = 1; g.A.tuckGoal = 1; g.A.side = -1; g.A.squintGoal = 1; g.A.billAt = g.tuckAt || (g.tuckAt = new THREE.Vector3(-0.07, 0.2, -0.06)); g.A.billWGoal = 1; },
};

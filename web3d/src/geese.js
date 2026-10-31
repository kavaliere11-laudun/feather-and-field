// The farm's geese: Gertrude, a big white Embden goose (the boss), and Hector, a grey Toulouse gander who follows her
// everywhere and copies whatever she does, a beat late. Models (geese.glb / geese.json, stylized/geese.py,
// export_geese.py): one skinned mesh each, with vertex colours, the feathers' patterns and lattices worked out by the
// exporter, and bones: the body; the neck in four and the head; the lower bill; the eyes; each wing folded and open; the
// tail; each leg's thigh, heel and webbed foot. Feathered here with the birds' feather drawing and a little fluff.
import * as THREE from 'three';
import { register, tr, urlLang } from './lang.js';
import { addFur, R, gooseMaterial, furHooks } from './birds.js';
import { shadowDisc } from './beasts.js';

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
let LANG = urlLang();
export const setGooseLang = lang => { LANG = lang || 'en'; };          // (the game: the player's language, before they're made)
const BREED = register('goose', { embden: ['Embden goose', "oie d'Embden"], toulouse: ['Toulouse gander', 'jars de Toulouse'],
  mallard_m: ['mallard drake', 'canard colvert'], mallard_f: ['mallard duck', 'cane colvert'], call_m: ['call drake', 'canard Call'], call_f: ['call duck', 'cane Call'], call_d: ['call duckling', 'caneton Call'] });
const isDuck = kind => /^(mallard|call)/.test(kind);      // (the call ducks, 30 Oct 2026: little white ducks, the call ducks' coop's)

// feather sizes (cm) per region: broad on the body and wings, small on the head (the neck's are made smaller by the drawing);
// the modelled flight and tail feathers draw their own
const FEATHER = { [R.body]: 2.7, [R.wing]: 2.5, [R.crest]: 2.7, [R.legfeather]: 1.6 };      // (the neck's and head's drawn much smaller: velvety)
// a slight soft fluff over the feathers (the birds' painted hair, short and fine), a little longer underneath
const FUR = { len: { [R.body]: 0.012, [R.wing]: 0.006, [R.crest]: 0.003, [R.legfeather]: 0.012 }, shells: 4, comb: 0.9, fine: 1.3, under: 1.0, fluff: 0.06 };
// the mallards: smaller birds, smaller feathers and shorter fluff
const DUCK_FUR = { len: { [R.body]: 0.007, [R.wing]: 0.004, [R.crest]: 0.002, [R.legfeather]: 0.007 }, shells: 4, comb: 0.9, fine: 1.3, under: 1.0, fluff: 0.05 };
// the call ducks: smooth white, a shorter softer fluff (Audrey's photos)
const CALL_FUR = { len: { [R.body]: 0.004, [R.wing]: 0.003, [R.crest]: 0.0015, [R.legfeather]: 0.004 }, shells: 4, comb: 0.9, fine: 1.0, under: 1.0, fluff: 0.03 };
// a call duckling: all soft down, fluffy and uncombed
const DUCKLING_FUR = { len: { [R.body]: 0.0045, [R.wing]: 0.004, [R.crest]: 0.003, [R.legfeather]: 0.004 }, shells: 5, comb: 0.35, fine: 1.4, under: 1.0, fluff: 0.12 };

function gooseGeometry(name) {
  const M = MODELS[name];
  if (M.built) return M.built;
  const src = M.geo, A = src.attributes, n = A.position.count, base = A.color, k = base.normalized ? 1 / 255 : 1;
  const col = new Float32Array(n * 3), fs = new Float32Array(n), fh = new Float32Array(n), fp = new Float32Array(n * 4), fm = new Float32Array(n);
  const fuv = new Float32Array(n * 3), paint = A._paint.array, pos = A.position.array, si = A.skinIndex.array;
  const P = A._fpat, PM = A._fmode, HW = A._headw, F = A._feat;
  const call = /^call/.test(name), down = name === 'call_d';      // (the call ducks: smooth white, as in Audrey's photos; a duckling all down)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 3; j++) col[i * 3 + j] = base.array[i * base.itemSize + j] * k;
    fs[i] = (FEATHER[paint[i]] || 0) * (down ? 0.5 : call ? 0.8 : isDuck(name) ? 0.62 : 1); fh[i] = HW.getX(i);
    if (paint[i] === R.body && fh[i] < 0.5) {            // small and fine on the breast and belly, broad on the flanks and back
      const ny = A.normal.getY(i), nz = A.normal.getZ(i), z = pos[i * 3 + 2];
      const breast = smooth(0.0, 0.1, z) * smooth(0.1, 0.55, nz), belly = smooth(-0.15, -0.6, ny);
      fs[i] *= 1.15 - 0.55 * Math.max(breast, belly);
    }
    for (let j = 0; j < 4; j++) fp[i * 4 + j] = P.getComponent(i, j);
    fm[i] = PM.getX(i);
    if (call && fm[i] === 4) { fm[i] = 7; fp[i * 4 + 3] *= down ? 0.08 : 0.4; }      // (7: smooth white plumage, the feathers' rows only faint; a duckling's down: none)
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
  g = addFur(g, src, down ? DUCKLING_FUR : /^call/.test(name) ? CALL_FUR : isDuck(name) ? DUCK_FUR : FUR, M.piv.headc);
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
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _q = new THREE.Vector3(), _fq = new THREE.Quaternion(), _cq = new THREE.Quaternion(), _X = new THREE.Vector3(1, 0, 0);
const _hp = new THREE.Vector3(), _ft = new THREE.Vector3(), _mb = new THREE.Matrix4();
const _j = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _qr = new THREE.Quaternion();

// the neck's shapes, as each joint's turn (pitch: + leans forward and down; yaw: + to the goose's left; roll), from the
// gentle S she holds at rest: up (stretched tall, alert), honk (tall, bill raised), low (stretched out forward close to the
// ground: hissing, charging), graze (bill down in the grass), preen (round to one side, bill in the back feathers), tuck
// (asleep: head laid back on the back, bill under the wing)
const NECK_POSE = {
  up: { neck1: [-0.38, 0, 0], neck2: [0.02, 0, 0], neck3: [0.1, 0, 0], neck4: [0.12, 0, 0], head: [0.12, 0, 0] },
  honk: { neck1: [-0.42, 0, 0], neck2: [-0.05, 0, 0], neck3: [0.0, 0, 0], neck4: [-0.05, 0, 0], head: [-0.38, 0, 0] },
  low: { neck1: [1.12, 0, 0], neck2: [0.22, 0, 0], neck3: [-0.05, 0, 0], neck4: [-0.3, 0, 0], head: [-0.75, 0, 0] },
  graze: { neck1: [1.05, 0, 0], neck2: [0.55, 0, 0], neck3: [0.35, 0, 0], neck4: [0.2, 0, 0], head: [0.35, 0, 0] },
  preen: { neck1: [0.15, 0.55, 0], neck2: [0.25, 0.75, 0.1], neck3: [0.3, 0.7, 0.1], neck4: [0.25, 0.4, 0], head: [0.5, 0.35, 0.3] },
  tuck: { neck1: [-1.0, 0.6, 0], neck2: [0.5, 0.7, 0.25], neck3: [0.9, 0.6, 0.25], neck4: [0.6, 0.4, 0.1], head: [0.9, 0.6, 0.5] },
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
    for (const L of ['legL', 'legR']) this.bones[L].rotation.order = 'ZYX';     // (the hip's swing out to the side comes last)
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
  // wings lifted, as when shaking out), wag 0..1, tailUp, sit 0..1, shake 0..1, shut 0..1 (eyes), lift (m), bob 0..1 (a happy
  // head bob), t, dt
  pose(s) {
    const B = this.bones, Rr = this.rest, t = s.t || 0, dt = Math.min(0.05, s.dt || 1 / 30);
    for (const nm in B) { B[nm].rotation.set(0, 0, 0); B[nm].position.copy(Rr[nm]); B[nm].scale.set(1, 1, 1); }
    const g = s.walk || 0, run = s.run || 0, ph = s.phase || 0, sit = s.sit || 0, turn = Math.max(-3, Math.min(3, s.turn || 0));
    // ---- the body: the waddle (rolling onto each foot as it takes the weight, a little rise over each step), a lean
    // forward running, lowered to the ground sitting
    // swimming (swim 0..1): no waddle, gliding level and bobbing a little on the water, the tail up
    const sw = s.swim || 0, dry = 1 - sw, call = this.name.startsWith('call');
    const roll = (-0.11 * g * (1 - 0.4 * run) * (1 + 0.9 * (s.proud || 0)) * Math.sin(ph) - 0.06 * turn * g) * dry + 0.03 * sw * Math.sin(t * 1.3) + (s.roll || 0) + 0.22 * (s.shake || 0) * Math.sin(t * 34) + (call ? 0.07 * (s.wag || 0) * Math.sin(t * 15) : 0);      // (a call duck wiggles her rump with her tail)
    const stance = (this.name === 'embden' ? -0.17 : -0.04) * (1 - 0.6 * sw);
    // proud (0..1): chest puffed out and up, head high, high steps, swaying (the victory parade)
    const pr = s.proud || 0;
    const pitch = (s.pitch || 0) + stance * (1 - sit) * (1 - 0.6 * (s.low || 0)) + 0.18 * run * dry + 0.06 * (s.low || 0) - 0.05 * (s.up || 0) - 0.08 * (s.honk || 0) + 0.05 * sit + 0.02 * sw * Math.sin(t * 1.7) - 0.22 * pr;
    const drop = sit * (this.by - 0.115) + 0.012 * g * dry * (1 - Math.abs(Math.cos(ph))) - 0.02 * (s.low || 0) - 0.004 * sw * Math.sin(t * 1.7);
    B.body.position.y -= drop - (s.lift || 0);
    // a duck up-ending: tipped forward, head and front under the water, only the back end showing (tail cocked up, the
    // feet kicking at the surface either side); it bobs a little as she paddles to stay down
    const ue = clamp01(s.upend || 0), ues = smooth(0, 1, ue), UP = (typeof window !== 'undefined' && window.__UP) || {};
    B.body.position.y -= ues * this.by * ((UP.sink ?? 0.75) + 0.04 * Math.sin(t * 9));
    B.body.rotation.set(pitch + (UP.tip ?? 1.2) * ues, 0.05 * g * dry * Math.sin(ph) * (1 - run), roll + 0.05 * ues * Math.sin(t * 4.5), 'YXZ');
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
    B.head.rotation.z += s.tilt || 0;                                       // the head tilted (to look up with one eye)
    B.neck1.rotation.z -= roll * 0.55; B.neck2.rotation.z -= roll * 0.3;
    B.neck1.rotation.x -= (pitch - (s.pitch || 0)) * 0.75;                  // (the neck stays up when the body leans into a run or stands tall)
    B.neck2.rotation.x += 0.04 * g * Math.sin(2 * ph);                     // a little nod with each step
    B.neck4.rotation.x += 0.09 * pr * g * Math.sin(2 * ph); B.head.rotation.x -= 0.06 * pr * g * Math.sin(2 * ph);       // (proud: a jaunty bob)
    const bb = s.bob || 0;           // a happy head bob (the call ducks, 30 Oct: Audrey's "Cute moves"): quick nods, pumping the head up and down
    if (bb > 0.001) { const w = Math.sin(t * 12.5); B.neck2.rotation.x += 0.18 * bb * w; B.neck3.rotation.x += 0.1 * bb * w; B.neck4.rotation.x -= 0.3 * bb * w; B.head.rotation.x += 0.2 * bb * Math.sin(t * 12.5 - 0.8); }
    if (s.billAt && (s.billW || 0) > 0.01) { B.root.updateMatrixWorld(true); this.neckTo(s.billAt, Math.min(1, s.billW)); }
    // ---- the bill: open for a honk or a hiss; the eyes blink
    B.jaw.rotation.x = 0.55 * clamp01(s.jaw || 0);
    const shut = clamp01(s.shut || 0); B.blinkL.scale.set(1, 1 - 0.85 * shut, 1); B.blinkR.scale.set(1, 1 - 0.85 * shut, 1);
    // ---- the wings: folded (lifted a little shaking out), or open: the folded wing tucks away as the open one grows from
    // the shoulder, swept back while opening; held open they arch a little (the hand angled down); flapping beats them up
    // and down from the shoulder (most of the beat above level, as a goose stretching), the hand following a moment later
    // and folding back a little on each upstroke; cloak: held half open, out from the body and raised at the wrist, the hand
    // folded back down along it (a goose hissing, or puffing herself up big)
    const o = clamp01(s.wings || 0), fl = clamp01(s.flap || 0), ps = s.flapPhase !== undefined ? s.flapPhase : t * 13.5;
    const beat = Math.sin(ps), lag = Math.sin(ps - 0.9), ck = clamp01(s.cloak || 0) * o;
    for (const [nm, sd] of [['wingL', 1], ['wingR', -1]]) {
      B[nm].scale.setScalar(Math.max(0.001, 1 - smooth(0.0, 0.6, o)));
      B[nm].rotation.z = sd * (0.12 * (s.wingLift || 0) * (1 + 0.5 * Math.sin(t * 30)) + 0.2 * (s.proud || 0));      // (proud: held out a little, puffed up)
      B[nm].rotation.x = -0.05 * (s.wingLift || 0);
      const op = B[nm + 'o'], u = smooth(0.15, 1.0, o);
      op.scale.setScalar(Math.max(0.001, u));
      op.rotation.y = sd * ((1 - o) * 1.1 + 0.62 * ck);
      op.rotation.z = sd * (0.25 * (1 - o) + 0.12 * o * (1 - ck) + fl * (0.32 + 0.52 * beat) + 0.42 * ck);
      op.rotation.x = -0.12 * fl * Math.cos(ps) + 0.1 * ck;
      const hd = B[nm + 'h'];
      hd.rotation.y = sd * ((1 - o) * 1.5 + fl * 0.3 * Math.max(0, Math.cos(ps)) + 1.05 * ck);
      hd.rotation.z = sd * (-0.12 * o * (1 - ck) + fl * 0.22 * lag - 0.45 * ck);
    }
    // ---- the tail: on a spring, wagging side to side (a goose's happy shake), up when alert
    const T = this.tail, gy = (s.wag || 0) * (call ? 0.6 : 0.38) * Math.sin(t * (call ? 15 : 11)) + 0.08 * g * (1 - (s.swim || 0)) * Math.sin(ph) - 0.06 * turn;
    T.yv += ((gy - T.y) * 140 - T.yv * 10) * dt; T.y += T.yv * dt;
    B.tail.rotation.set(((s.tailUp || 0) + 0.35 * (s.swim || 0)) * 0.3 + 0.05 * Math.sin(t * 1.3) + (UP.tail ?? 0.9) * ues, T.y, 0);       // (+ x lifts it)
    // ---- the legs: each foot on the ground under the hip, stepping (duty: the share of the step on the ground), lifted a
    // little and curled as it swings; under the body when sitting
    const duty = 0.62 - 0.17 * run, stride = s.stride || 0.16, amp = duty * stride / 2 * g;
    for (const [L, off] of [['legL', 0], ['legR', Math.PI]]) {
      const G = this.legs[L], u = (((ph + off) / (Math.PI * 2)) % 1 + 1) % 1;
      let dz, dy = 0, curl = 0;
      if (u < duty) dz = amp * (1 - 2 * u / duty);
      else { const v = (u - duty) / (1 - duty), w = smooth(0, 1, v); dz = amp * (2 * w - 1); dy = (0.03 + 0.02 * run) * (1 + 1.4 * pr) * g * Math.sin(Math.PI * v); curl = 0.9 * (1 + 0.4 * pr) * Math.sin(Math.PI * Math.min(1, v * 1.2)) * g; }
      // the foot's target in the body's frame (the body lowered and tipped)
      const fx = G.side, fy = G.foot[1] + dy, fz = G.foot[2] + dz - 0.03 * sit;
      B.root.updateMatrix(); B.body.updateMatrix(); _m.multiplyMatrices(B.root.matrix, B.body.matrix).invert();
      _v.set(fx, fy + (sit > 0 ? 0.035 * sit : 0), fz).applyMatrix4(_m);
      if (ue > 0.01) {                                  // up-ended: the feet kicking at the surface, out either side of the tail
        const LL = G.L1 + G.L2, kick = Math.sin(t * 9 + off);
        _hp.set(G.side, G.H[0], G.H[1]).applyMatrix4(_mb.multiplyMatrices(B.root.matrix, B.body.matrix));      // (the hip, upright)
        _ft.set(G.side * (UP.out ?? 2.3), this.by - (UP.fy ?? 0.03) + 0.18 * LL * Math.max(0, kick), _hp.z - (UP.back ?? 0.3) * LL + 0.22 * LL * kick).applyMatrix4(_m);
        _v.set(_v.x + (_ft.x - _v.x) * ue, _v.y + (_ft.y - _v.y) * ue, _v.z + (_ft.z - _v.z) * ue);
      }
      // the hip swings the leg out to the side as far as the foot is from under it, so a planted foot stays put while the
      // body rolls over it (the waddle, a shake), and the foot is kept flat on the ground, facing the way she does
      const drop = G.H[0] - _v.y, dx = _v.x - G.side;
      this.reach(L, G.H[0] - Math.hypot(drop, dx), _v.z, curl + 0.6 * sit, pitch);
      B[L].rotation.z = Math.atan2(dx, Math.max(0.02, drop));
      _fq.copy(B.body.quaternion).multiply(B[L].quaternion).multiply(B[L + 'k'].quaternion).invert();
      B[L + 'f'].quaternion.copy(_fq).multiply(_cq.setFromAxisAngle(_X, curl + 0.6 * sit));
    }
  }
}

// ------------------------------------------------------------------ one goose: where she is, which way she faces, what she's doing
export class Goose {
  constructor(group, kind, r, name) {
    this.kind = kind; this.name = name || gooseName(kind); this.r = r; this.isDuck = isDuck(kind);
    this.rig = new GooseRig(kind);
    this.root = new THREE.Group(); this.root.add(this.rig.mesh); group.add(this.root);
    this.A = { t: r() * 10, phase: 0, walk: 0, run: 0, swim: 0 }; this.heading = 0; this.task = null; this.clock = 0;
    this.blinkIn = 1 + r() * 3; this.blinkT = 0;
    this.hitR = 0.3; this.hitY = 0.4; this.tagY = 0.88; this.isGoose = true; this.react = 0; this.reactYaw = 0;
    if (this.isDuck) { this.hitR = 0.2; this.hitY = 0.2; this.tagY = 0.5; }
    if (kind === 'call_d') { this.hitR = 0.12; this.hitY = 0.1; this.tagY = 0.3; this.isDuckling = true; }
    this.label = this.name + ' · ' + tr(LANG, 'goose.' + kind);
    this.av = 0; this.spd = 0; this.vs = 0; this.turn = 0; this.wet = 0; this.flock = null; this.act = ''; this.actT = 0; this.seed = r() * 10;
  }
  get pos() { return this.root.position; }
  // tapped: she turns to look at you and honks twice (cross at being disturbed, or just saying hello), then waggles her tail;
  // asleep, she lifts her head for it and settles again. toCam: the way to the camera (the world's frame)
  tapped(toCam) {
    const q = this.root.getWorldQuaternion(new THREE.Quaternion()).invert(), d = toCam.clone().setY(0).applyQuaternion(q);
    this.reactYaw = Math.max(-1.3, Math.min(1.3, Math.atan2(d.x, d.z))); this.react = 1.9;
    if (this.flock && this.flock.onTap) this.flock.onTap(this);
  }
  // turn towards a heading: the turn eases in and settles as she lines up (no snapping into a turn, or out of it)
  turnTo(h, dt, rate = 3.2) {
    const d = wrap(h - this.heading), want = Math.max(-rate, Math.min(rate, d * 6));
    this.av += Math.max(-14 * dt, Math.min(14 * dt, want - this.av));
    let step = this.av * dt; if (Math.abs(step) > Math.abs(d)) { step = d; this.av = 0; }
    this.heading += step; this.turn = step / Math.max(1e-3, dt); this.turned = true;
    return Math.abs(d);
  }
  // a step towards (x, z) at a pace: 'walk' 0.24 m/s (a waddle), 'hurry' 0.45, 'run' 0.8 (slower swimming); she speeds up and
  // slows down smoothly, slowing to arrive unless more of the way follows (through), and steps round the other goose in
  // good time (waiting if he's right in front); true when there
  moveTo(x, z, dt, pace = 'walk', through = false) {
    const p = this.pos, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    let sp = { walk: 0.24, hurry: 0.45, run: 0.8, charge: 1.25, strut: 0.2, slow: 0.09 }[pace] || 0.24;
    if (this.isDuck && this.wet <= 0.5) sp *= 0.78;                         // (a duck's shorter legs)
    if (this.wet > 0.5) sp = Math.min(sp, pace === 'walk' ? 0.16 : 0.3);
    let ax = dx / d, az = dz / d, slow = 1;
    for (const o of this.flock && !this.lone ? this.flock.near : []) {      // (lone: a young call duck off to a new farm, minding only the one ahead: callpen.js goOut)
      if (o === this || (!o.isGoose && pace === 'charge')) continue;        // (charging at the fox: straight at him)
      if (this.isDuck && o.isDuck && o.idx > this.idx && !o.isDuckling) continue;      // (a duck never waits for those behind her in the line; round a duckling, always)
      if (o.inHouse || (o.root && !o.root.visible) || o.mum === this) continue;      // (her own ducklings: they make way for her, apart)
      const rx = o.pos.x - p.x, rz = o.pos.z - p.z, rd = Math.hypot(rx, rz), R = o.isDuckling ? 0.22 : o.isGoose ? (this.isDuck ? (o.isDuck ? 0.36 : 0.5) : o.isDuck ? 0.4 : 0.46) : o.isFarmer && this.flock && this.flock.calmBy ? 0.74 : 0.85;      // (the fox: well clear; the farmer they trust, up to him; a duckling: round it)
      if (rd > R + 0.45 || rd > d + R) continue;
      const ahead = (rx * ax + rz * az) / Math.max(1e-3, rd); if (ahead < 0.2) continue;
      const k = Math.min(1, (R + 0.45 - rd) / 0.55) * ahead, cross = ax * rz - az * rx, th = -(cross >= 0 ? 1 : -1) * 1.2 * k;
      const c = Math.cos(th), sn = Math.sin(th); [ax, az] = [ax * c - az * sn, ax * sn + az * c];
      // (waiting for the one in front: a goose for the other, a duck only for the one ahead of her in the line; round anyone else)
      if (rd < R * 1.15 && ahead > 0.6 && (this.isDuck ? o.isDuck && this.following : !o.isDuck)) slow = Math.min(slow, Math.max(0, (rd - R * 0.85) / (R * 0.3)));
    }
    // (bending round the others never into anything: if the bent way is blocked just ahead and the straight way isn't,
    // straight on)
    const nav = this.flock && this.flock.nav;
    if (nav && (ax !== dx / d || az !== dz / d) && !nav.freeAt(p.x + ax * 0.3, p.z + az * 0.3) && nav.freeAt(p.x + dx / d * 0.3, p.z + dz / d * 0.3)) { ax = dx / d; az = dz / d; }
    const off = this.turnTo(Math.atan2(ax, az), dt, pace === 'run' || pace === 'charge' ? 4.5 : 3.2);
    let want = sp * (off > 1.2 ? 0.12 : off > 0.6 ? 0.5 : 1) * slow;
    if (!through) want = Math.min(want, Math.sqrt(2 * 1.2 * Math.max(0, d - 0.03)) + 0.04);
    this.spd += Math.max(-2.5 * dt, Math.min(1.6 * dt, want - this.spd)); this.moved = true;
    const st = Math.min(d, Math.max(0, this.spd) * dt);
    let nx = p.x + Math.sin(this.heading) * st, nz = p.z + Math.cos(this.heading) * st;
    // (on the grass, going somewhere on the grass: never a step from free ground into anything; straight on instead, or
    // sliding along it, or a moment's wait. Into the water by the ways, as ever)
    if (nav && this.wet < 0.3 && nav.freeAt(x, z) && nav.freeAt(p.x, p.z) && !nav.freeAt(nx, nz)) {
      nx = p.x + dx / d * st; nz = p.z + dz / d * st;
      if (!nav.freeAt(nx, nz)) { if (nav.freeAt(nx, p.z)) nz = p.z; else if (nav.freeAt(p.x, nz)) nx = p.x; else { nx = p.x; nz = p.z; } }
    }
    p.x = nx; p.z = nz;
    return false;
  }
  update(dt) {
    const A = this.A; A.t += dt; A.dt = dt; this.clock += dt;
    for (const k of ['walk', 'run', 'up', 'honk', 'low', 'graze', 'preen', 'tuck', 'jaw', 'wings', 'flap', 'wingLift', 'wag', 'tailUp', 'sit', 'shake', 'squint', 'billW', 'tilt', 'lift', 'cloak', 'proud', 'upend', 'bob']) A[k + 'Goal'] = 0;
    A.lookYawGoal = 0; A.lookPitchGoal = 0;
    this.turned = false; this.moved = false; this.turn = 0;
    const was = this.lastPos || (this.lastPos = this.pos.clone()), fx0 = was.x, fz0 = was.z;
    if (this.task) {
      const done = typeof this.task === 'function' ? this.task(this, dt) === true : this.task.run(this, dt) !== false;
      if (done) this.task = null;
    }
    if (this.react > 0) {
      const u = 1.9 - (this.react -= dt), honk = u > 0.3 && u < 1.35;
      A.lookYawGoal = this.reactYaw; A.lookPitchGoal = -0.1; A.tiltGoal = 0; A.grazeGoal = 0; A.preenGoal = 0; A.lowGoal = 0; A.billWGoal = 0;
      A.tuckGoal *= 0.3; A.squintGoal = 0; A.upGoal = 0.7; A.upendGoal = 0; A.sitGoal *= 0.5; A.honkGoal = honk ? 0.8 : 0; A.wingLiftGoal = honk ? 0.5 : 0;
      A.jawGoal = honk && Math.sin((u - 0.3) * Math.PI * 4) > 0 ? 1 : 0; A.wagGoal = u > 1.35 ? 1 : 0; A.tailUpGoal = honk ? 0.6 : 0;
      if (this.kind.startsWith('call')) A.bobGoal = u > 1.35 ? 1 : 0;       // (a call duck: a happy head bob with it)
    }
    // a honk (the game's sound, a goose's, not a duck's: theirs is a quack): as the bill opens on one, not more than one in 2.5 s
    const honking = !this.isDuck && (A.honkGoal || 0) >= 0.6 && (A.jawGoal || 0) > 0.5;
    if (honking && !this.honking && this.flock && this.flock.soundOf && this.clock - (this.honkAt ?? -9) > 2.5) { this.honkAt = this.clock; this.flock.soundOf('honk', this.pos.x, this.pos.z); }
    this.honking = honking;
    if (!this.turned) this.av *= Math.max(0, 1 - dt * 10);
    if (!this.moved) this.spd = Math.max(0, this.spd - 2.5 * dt);
    if ((this.blinkIn -= dt) <= 0) { this.blinkT = 0.16; this.blinkIn = 2 + this.r() * 4; }
    const blink = this.blinkT > 0 ? Math.sin(Math.PI * (1 - (this.blinkT -= dt) / 0.16)) : 0;
    const ease = (k, rate) => { A[k] = (A[k] || 0) + ((A[k + 'Goal'] || 0) - (A[k] || 0)) * Math.min(1, dt * rate); };
    for (const k of ['up', 'honk', 'low', 'graze', 'preen', 'tuck', 'sit', 'wingLift', 'tailUp', 'lookYaw', 'lookPitch', 'tilt', 'lift']) ease(k, 5);
    for (const k of ['jaw', 'wag', 'shake', 'squint']) ease(k, 12);
    ease('bob', 8);
    ease('wings', 6); ease('flap', 6); ease('cloak', 6); ease('billW', 4); ease('proud', 3); ease('upend', 4);
    A.shut = Math.max(blink, A.squint || 0);
    if (this.flock) {
      // the gait from how far she really moves (whatever moves her): the feet step exactly as far as the body goes, so they
      // never slide; turning on the spot she steps round
      let moved = Math.hypot(this.pos.x - fx0, this.pos.z - fz0); if (moved > 3 * dt + 0.05) moved = 0;       // (put somewhere)
      this.vs += (moved / Math.max(1e-3, dt) - this.vs) * Math.min(1, dt * 12);
      const spin = Math.min(1, Math.abs(this.turn) / 2) * (1 - clamp01(this.vs / 0.12));
      A.walk += (Math.max(clamp01(this.vs / 0.05), 0.6 * spin) - A.walk) * Math.min(1, dt * 8);
      A.run += (smooth(0.4, 0.7, this.vs) - A.run) * Math.min(1, dt * 5);
      const stride = (0.22 + 0.12 * A.run) * (1 - 0.25 * (A.proud || 0)) * (this.isDuck ? this.rig.by / 0.29 : 1) * (this.size || 1);      // (strutting: short proud steps; a duck's short ones; a youngster's as big as it is)
      A.phase += (moved + 0.1 * spin * dt) / stride * Math.PI * 2;
      A.stride = stride; A.turn = this.turn;
      // in the pond: lower and lower as she wades in, floating once it's deep (the water hides her feet, paddling)
      this.wet = this.flock.wetAt(this.pos.x, this.pos.z);
      A.swim += (smooth(0.35, 0.85, this.wet) - A.swim) * Math.min(1, dt * 4);
      this.pos.y = (this.flock.groundY ? this.flock.groundY(this.pos.x, this.pos.z) : 0) - this.wet * (this.rig.by - 0.037) * (this.size || 1);      // (up over a footbridge; a growing youngster's as big as it is)
    } else {
      ease('walk', 6); ease('run', 4);
      A.phase += dt * (A.walk || 0) * (6 + 6 * (A.run || 0));
      A.stride = 0.15 + 0.1 * (A.run || 0);
    }
    this.lastPos.copy(this.pos);
    A.flapPhase = (A.flapPhase || 0) + dt * 13.5 * Math.min(1, (A.flap || 0) * 4 + 0.2);
    this.root.rotation.y = this.heading;
    const sz = (this.size || 1) * (this.appear ?? 1); if (Math.abs(this.root.scale.x - sz) > 1e-3) this.root.scale.setScalar(sz);      // (a youngster growing; one leaving, fading away)
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
// ------------------------------------------------------------------ ?lineup=ducks: the pond's mallards (Rocco the drake and Daisy the
// duck) in a row of poses, for a close look: looking about, the waddle, a quack, preening, a wing-flap, swimming, up-ending
// (tail and paddling feet in the air) and asleep; ?lineup=ducks&call: the call ducks (a drake and a duck) the same, and two
// more rows: a happy head bob (and the tail wiggle), and the two walking round in a little line, one behind the other
export class DuckLineup {
  constructor(scene, centre, yaw, grade, r) {
    this.group = new THREE.Group(); this.group.position.copy(centre); this.group.rotation.y = yaw; scene.add(this.group);
    const call = /[?&]call\b/.test(typeof location !== 'undefined' ? location.search : ''), kids = /[?&]ducklings\b/.test(typeof location !== 'undefined' ? location.search : '');      // (&ducklings: a duck and two ducklings in each row)
    const poses = ['look', 'walk', 'quack', 'preen', 'wings', 'swim', 'upend', 'sleep', ...(call ? ['bob', 'parade'] : [])];
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.3).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4a9cc0', roughness: 0.15 }));
    water.position.set(0, 0.007, -1.4 + 5.5 * 0.56); this.group.add(water); if (grade) grade(water.material);
    this.ducks = [];
    poses.forEach((p, i) => {
      for (const [k, x] of (kids ? [['call_f', 0.3], ['call_d', -0.02], ['call_d', -0.28]] : call ? [['call_m', -0.3], ['call_f', 0.3]] : [['mallard_m', -0.3], ['mallard_f', 0.3]])) {
        const d = new Goose(this.group, k, r);
        d.pos.set(x, 0, -1.4 + i * 0.56); d.heading = -0.95; d.linePose = p;
        if (p === 'parade') { d.flock = { wetAt: () => 0 }; d.lag = kids ? (k === 'call_f' ? 0 : x > -0.1 ? 1.35 : 2.15) : x > 0 ? 1.05 : 0; d.loopZ = -1.4 + (i + 0.3) * 0.56; }      // (its feet stepping as far as it goes; the ducklings well behind her: never a bill in her tail, nor in each other's)
        this.ducks.push(d);
      }
    });
    this.geese = this.ducks;
  }
  update(dt) {
    for (const d of this.ducks) {
      const A = d.A, c = d.clock - (d.kind === 'mallard_f' || d.kind === 'call_f' ? 0.4 : 0), sk = d.rig.by - 0.037, k = d.rig.by / 0.29;
      d.task = DUCK_LINE[d.linePose];
      if (d.linePose === 'swim' || d.linePose === 'upend') { A.swim = 1; d.pos.y = -sk; }
      if (d.linePose === 'parade') {        // round a little oval, the duck following the drake
        const a = (d.parT = (d.parT ?? 0) + dt) * 0.55 - d.lag, x = 0.34 * Math.sin(a), z = d.loopZ + 0.2 * Math.cos(a);
        d.heading = Math.atan2(0.34 * Math.cos(a), -0.2 * Math.sin(a)); d.pos.set(x, 0, z);
      }
      d.update(dt);
    }
  }
}
const DUCK_LINE = {
  // (the call ducks' cute moves, 30 Oct, Audrey's "Cute moves": a happy head bob, then the tail wiggle, then a look about;
  // walking round in a little line)
  bob: (g) => { const u = ((g.clock % 4.5) + 4.5) % 4.5, A = g.A; if (u < 1.5) { A.bobGoal = 1; A.upGoal = 0.3; } else if (u < 2.4) { A.wagGoal = 1; A.tailUpGoal = 0.4; } else { A.lookYawGoal = 0.7 * Math.sin(u * 1.4); A.tiltGoal = 0.25; } },
  parade: (g) => { const A = g.A; A.wagGoal = 0.35; A.lookYawGoal = 0.25 * Math.sin(g.clock * 1.3); A.upGoal = 0.2; },
  book: (g) => { const s = g.bookPose || {}, A = g.A; A.lookYawGoal = s.look || 0; A.tiltGoal = s.tilt || 0; A.upGoal = s.up ?? 0.25; A.proudGoal = s.proud || 0; },      // (still, for the Breed Book's picture: bookpics.mjs)
  look: (g) => { const u = ((g.clock % 6) + 6) % 6, A = g.A; A.lookYawGoal = u < 2.5 ? 1.1 : 0.5 * Math.sin(u * 1.2); A.tiltGoal = u < 2.5 ? 0.35 : 0; A.wagGoal = u > 2.5 && u < 3.2 ? 1 : 0; },
  walk: (g) => { const A = g.A; A.walkGoal = 1; A.wagGoal = 0.3; A.lookYawGoal = 0.3 * Math.sin(g.clock * 1.1); },
  quack: (g) => { const u = ((g.clock % 2.6) + 2.6) % 2.6, A = g.A; if (u < 1.2) { A.honkGoal = 0.6; A.upGoal = 0.4; A.jawGoal = Math.sin(u / 1.2 * 3 * Math.PI) > 0.1 ? 1 : 0; A.wagGoal = 0.6; } else { A.lookYawGoal = 0.6; A.tiltGoal = 0.2; } },
  preen: (g) => { const A = g.A, k = g.rig.by / 0.29; A.preenGoal = 1; A.side = 1; A.wingLiftGoal = 0.4; A.billAt = at1(g).set(0.115 * k, g.rig.by + 0.055 * k + 0.015 * k * Math.sin(g.clock * 7), -0.04 * k - 0.05 * k * Math.sin(g.clock * 0.8)); A.billWGoal = 1; },
  wings: (g) => { const u = ((g.clock % 5) + 5) % 5, A = g.A; if (u < 2.4) { A.upGoal = 0.8; A.wingsGoal = 1; A.flapGoal = 1; A.tailUpGoal = 0.6; A.liftGoal = 0.015; } else if (u < 3.4) { A.shakeGoal = 0.6; A.wagGoal = 1; } else { A.lookYawGoal = 0.8; } },
  swim: (g) => { const A = g.A; A.lookYawGoal = 0.4 * Math.sin(g.clock * 0.7); A.wagGoal = 0.15; },
  upend: (g) => { const u = ((g.clock % 5.5) + 5.5) % 5.5, A = g.A, on = u > 0.8 && u < 4.2; A.upendGoal = on ? 1 : 0; A.grazeGoal = on ? 1 : 0; A.tailUpGoal = on ? 1 : 0; A.wagGoal = !on && u > 4.4 ? 1 : 0; },
  sleep: (g) => { const A = g.A, k = g.rig.by / 0.29; A.sitGoal = 1; A.tuckGoal = 1; A.side = -1; A.billAt = g.tuckAt || (g.tuckAt = new THREE.Vector3(-0.07 * k, 0.2 * k, -0.06 * k)); A.squintGoal = 1; A.billWGoal = 1; },
};
// each goose's own clock in the line-up, round a cycle of n seconds: Hector does what Gertrude does, a beat later (he copies
// her in everything)
const cyc = (g, n) => { const c = g.clock - (g.kind === 'toulouse' ? 0.55 : 0); return ((c % n) + n) % n; };
const at1 = g => g.at1 || (g.at1 = new THREE.Vector3());
export const LINE = {
  // curious: she turns her head to give you a good look with one eye, head tilted; a double take; a nod and a waggle of the
  // tail, then a look round
  stand: (g) => { const u = cyc(g, 7), A = g.A;
    if (u < 1.7) { A.lookYawGoal = 1.25; A.tiltGoal = 0.4; A.lookPitchGoal = -0.15; }
    else if (u < 2.15) { A.lookYawGoal = -0.4; A.tiltGoal = -0.15; A.upGoal = 0.4; }
    else if (u < 3.8) { A.lookYawGoal = 1.0; A.tiltGoal = 0.25 * Math.sin(u * 7); A.lookPitchGoal = 0.3 * Math.max(0, Math.sin((u - 2.15) * 7)); A.wagGoal = 1; }
    else { A.lookYawGoal = 0.45 * Math.sin(u * 1.1); A.upGoal = 0.3; } },
  // the waddle, the tail swinging, looking about as she goes
  walk: (g) => { const A = g.A; A.walkGoal = 1; A.wagGoal = 0.3; A.lookYawGoal = 0.3 * Math.sin(g.clock * 1.1); A.tiltGoal = 0.1 * Math.sin(g.clock * 2.2); },
  // a proud honk: a breath in, then chest out, bill up and three honks with the wings lifted, then a pleased waggle
  honk: (g) => { const u = cyc(g, 3.6), A = g.A;
    if (u < 0.4) { A.upGoal = 0.7; A.lookPitchGoal = 0.35; }
    else if (u < 1.7) { A.honkGoal = 1; A.jawGoal = Math.sin((u - 0.4) / 1.3 * 3 * Math.PI) > 0.15 ? 1 : 0.1; A.wingLiftGoal = 0.7; A.tailUpGoal = 0.8; A.liftGoal = 0.012; }
    else if (u < 2.5) { A.upGoal = 0.5; A.wagGoal = 1; A.tailUpGoal = 0.4; }
    else { A.upGoal = 0.3; A.lookYawGoal = 0.7; A.tiltGoal = 0.2; } },
  // grazing, nibbling, then up with a start to check round (a quick look each way) and back down
  graze: (g) => { const u = cyc(g, 5.5), A = g.A;
    if (u < 3.4 || u > 4.9) { A.grazeGoal = 1; A.jawGoal = Math.sin(g.clock * 9) > 0.5 ? 0.4 : 0; A.billAt = at1(g).set(0.03 * Math.sin(g.clock * 1.3), 0.025, 0.28 + 0.03 * Math.sin(g.clock * 0.9)); A.billWGoal = 1; A.wagGoal = 0.2; }
    else { A.upGoal = 0.8; A.lookYawGoal = u < 4.1 ? 0.75 : -0.6; A.tiltGoal = u < 4.1 ? 0.3 : -0.25; } },
  // preening a wing, then a big shake of every feather (the tail waggling) and a look as if to say "what?"
  preen: (g) => { const u = cyc(g, 6.5), A = g.A;
    if (u < 3.8) { A.preenGoal = 1; A.side = 1; A.wingLiftGoal = 0.4; A.billAt = at1(g).set(0.115, g.rig.by + 0.055 + 0.015 * Math.sin(g.clock * 7), -0.04 - 0.05 * Math.sin(g.clock * 0.8)); A.billWGoal = 1; }
    else if (u < 5.0) { A.shakeGoal = 1; A.wagGoal = 1; A.wingLiftGoal = 0.8; A.upGoal = 0.4; }
    else { A.lookYawGoal = 1.1; A.tiltGoal = 0.35; A.wagGoal = 0.5; } },
  // a wing-flap stretch: up on her toes, the wings open and beat, folded again, a shake and a waggle
  wings: (g) => { const u = cyc(g, 6.5), A = g.A;
    if (u < 0.5) { A.upGoal = 1; A.liftGoal = 0.02; A.tailUpGoal = 0.5; }
    else if (u < 3.0) { A.upGoal = 0.8; A.liftGoal = 0.03; A.wingsGoal = 1; A.flapGoal = 1; A.tailUpGoal = 0.6; A.lookPitchGoal = -0.2; }
    else if (u < 3.8) { A.upGoal = 0.6; }
    else if (u < 4.8) { A.shakeGoal = 0.6; A.wagGoal = 1; A.wingLiftGoal = 0.6; }
    else { A.lookYawGoal = 0.8; A.tiltGoal = 0.25; } },
  // hissing: neck stretched out low, the head swaying like a snake, wings held out, the bill open
  hiss: (g) => { const A = g.A, c = g.clock; A.lowGoal = 1; A.wingsGoal = 1; A.cloakGoal = 1; A.jawGoal = 0.7 + 0.3 * Math.sin(c * 5); A.tailUpGoal = 0.5;
    A.lookYawGoal = 0.38 * Math.sin(c * 2.3); A.tiltGoal = 0.15 * Math.sin(c * 2.3 + 1); A.wagGoal = 0.25; },
  // asleep, head tucked in; now and then she half wakes, lifts her head a little and peeks, then settles again
  sleep: (g) => { const u = cyc(g, 8), A = g.A; A.sitGoal = 1; A.tuckGoal = 1; A.side = -1; A.billAt = g.tuckAt || (g.tuckAt = new THREE.Vector3(-0.07, 0.2, -0.06));
    const peek = u > 5.2 && u < 6.6; A.squintGoal = peek ? 0.1 : 1; A.billWGoal = peek ? 0.55 : 1; A.lookYawGoal = peek ? 0.3 : 0; },
};

// ------------------------------------------------------------------ what a goose does, pose by pose (u: seconds into it)
const v3 = (g, k) => g[k] || (g[k] = new THREE.Vector3());
const sinkOf = g => g.wet * (g.rig.by - 0.037);                 // how far she's down in the water (the surface, in her own frame)
export const ACT = {
  // standing about looking round, now and then her head tilted to look at something with one eye
  look(g, u) { const A = g.A, y = Math.sin(u * 0.8 + g.seed); A.lookYawGoal = 0.6 * y; A.tiltGoal = 0.28 * Math.max(0, Math.sin(u * 0.55 + g.seed * 2)) * Math.sign(y); A.upGoal = 0.25; },
  // grazing: the bill in the grass ahead, nibbling; every few seconds up with a start to check round, then back down
  graze(g, u) { const A = g.A, c = u % 5.2;
    if (c < 4.1) { A.grazeGoal = 1; A.jawGoal = Math.sin(u * 9 + g.seed) > 0.5 ? 0.4 : 0; A.billAt = v3(g, 'bat').set(0.035 * Math.sin(u * 1.3 + g.seed), 0.025, 0.27 + 0.03 * Math.sin(u * 0.9)); A.billWGoal = 1; A.wagGoal = 0.15; }
    else { A.upGoal = 0.6; A.lookYawGoal = c < 4.6 ? 0.6 : -0.5; A.tiltGoal = c < 4.6 ? 0.25 : -0.2; } },
  // preening one wing (the side she picked), the bill working through the feathers
  preen(g, u) { const A = g.A, sd = g.preenSide || 1; A.preenGoal = 1; A.side = sd; A.wingLiftGoal = 0.4;
    A.billAt = v3(g, 'bat').set(0.115 * sd, g.rig.by + 0.055 + 0.015 * Math.sin(u * 7) - sinkOf(g) * 0, -0.04 - 0.05 * Math.sin(u * 0.8)); A.billWGoal = 1; },
  // a big shake of every feather, the tail waggling
  shake(g, u) { const A = g.A; A.shakeGoal = 1; A.wagGoal = 1; A.wingLiftGoal = 0.8; A.upGoal = 0.4; },
  // a proud honk: a breath in, chest out, bill up and three honks with the wings lifted, then a pleased waggle
  honk(g, u) { const A = g.A;
    if (u < 0.4) { A.upGoal = 0.7; A.lookPitchGoal = 0.35; }
    else if (u < 1.7) { A.honkGoal = 1; A.jawGoal = Math.sin((u - 0.4) / 1.3 * 3 * Math.PI) > 0.15 ? 1 : 0.1; A.wingLiftGoal = 0.7; A.tailUpGoal = 0.8; A.liftGoal = 0.012; }
    else { A.upGoal = 0.5; A.wagGoal = 1; A.tailUpGoal = 0.4; } },
  // a wing-flap stretch: up on her toes, the wings open and beat, folded again, a shake
  stretch(g, u) { const A = g.A;
    if (u < 0.5) { A.upGoal = 1; A.liftGoal = 0.02; A.tailUpGoal = 0.5; }
    else if (u < 2.8) { A.upGoal = 0.8; A.liftGoal = 0.03; A.wingsGoal = 1; A.flapGoal = 1; A.tailUpGoal = 0.6; A.lookPitchGoal = -0.2; }
    else if (u < 3.5) { A.upGoal = 0.6; }
    else { A.shakeGoal = 0.6; A.wagGoal = 1; A.wingLiftGoal = 0.6; } },
  // sitting down for a rest; a sleepy goose tucks her head in after a while (and peeks now and then)
  rest(g, u) { const A = g.A; A.sitGoal = 1; if (g.sleepy && u > 4) ACT.sleep(g, u - 4); else ACT.look(g, u * 0.6); },
  // asleep, head tucked in; now and then she half wakes, lifts her head a little and peeks, then settles again
  sleep(g, u) { const A = g.A, c = (u + g.seed * 3) % 11; A.sitGoal = 1; A.tuckGoal = 1; A.side = -1; A.billAt = v3(g, 'tuck').set(-0.07, 0.2, -0.06);
    const peek = c > 8 && c < 9.4; A.squintGoal = peek ? 0.1 : 1; A.billWGoal = peek ? 0.55 : 1; A.lookYawGoal = peek ? 0.3 : 0; },
  // dabbling: swimming, the bill dipped into the water ahead, now and then up with a shake of the head
  dabble(g, u) { const A = g.A, c = u % 3.4;
    if (c < 2.6) { A.grazeGoal = 0.7; A.billAt = v3(g, 'bat').set(0.03 * Math.sin(u * 2), sinkOf(g) - 0.012, 0.3); A.billWGoal = 1; A.jawGoal = Math.sin(u * 8) > 0.4 ? 0.3 : 0; }
    else { A.upGoal = 0.4; A.tiltGoal = 0.25 * Math.sin(u * 25); A.lookYawGoal = 0.2 * Math.sin(u * 20); } },
  // drinking at the edge: the bill dipped, then the head raised to swallow
  drink(g, u) { const A = g.A, c = u % 1.9;
    if (c < 1.0) { A.grazeGoal = 0.8; A.billAt = v3(g, 'bat').set(0, sinkOf(g) - 0.008, 0.29); A.billWGoal = 1; }
    else { A.upGoal = 0.7; A.lookPitchGoal = -0.45; A.jawGoal = c < 1.3 ? 0.3 : 0; } },
  // calling the other one: honking after him, neck stretched up
  call(g, u) { const A = g.A; A.upGoal = 0.9; A.honkGoal = 0.8; A.jawGoal = Math.sin(u * 7) > 0.2 ? 1 : 0.1; A.tailUpGoal = 0.6; A.wagGoal = 0.4; },
  // scolding him for crowding her: neck out low, wings half raised, bill open, hissing
  scold(g, u) { const A = g.A; A.lowGoal = 0.85; A.wingsGoal = 0.8; A.cloakGoal = 1; A.jawGoal = 0.85 + 0.15 * Math.sin(u * 9); A.tailUpGoal = 0.5; A.lookYawGoal = 0.15 * Math.sin(u * 6); },
  // told off: head low and tilted, a little waggle, not looking at her
  sheepish(g, u) { const A = g.A; A.grazeGoal = 0.25; A.tiltGoal = 0.38; A.lookYawGoal = -0.5; A.wagGoal = 0.35; },
  // woken by the fox: up on her feet, neck stretched tall, honking the alarm over and over, wings lifted
  alarm(g, u) { const A = g.A; A.upGoal = 1; A.honkGoal = u > 0.4 ? 1 : 0.3; A.jawGoal = u > 0.4 && Math.sin(u * 13) > 0 ? 1 : 0.1; A.wingLiftGoal = 0.9; A.tailUpGoal = 0.8; A.wagGoal = 0.3; },
  // charging: neck stretched out low, wings out and beating, bill open, hissing
  charge(g, u) { const A = g.A; A.lowGoal = 0.85; A.wingsGoal = 1; A.cloakGoal = 0.45; A.flapGoal = 0.4; A.jawGoal = 0.8 + 0.2 * Math.sin(u * 9); A.tailUpGoal = 0.6; },
  // super proud (after seeing the fox off): chest out, head held high, bill in the air, wings a little puffed out, the tail
  // up and wagging, a honk now and then
  parade(g, u) { const A = g.A, c = u % 3.2; A.proudGoal = 1; A.upGoal = 1; A.lookPitchGoal = -0.38; A.tailUpGoal = 1; A.wagGoal = 0.6; A.tiltGoal = 0.12 * Math.sin(u * 1.4);
    if (c > 2.2 && c < 2.9) { A.honkGoal = 0.5; A.jawGoal = Math.sin((c - 2.2) * Math.PI * 3) > 0 ? 0.9 : 0.1; } },
  // ta-da: wings flung wide and beating, a great honk, then held out a moment, the tail waggling
  tada(g, u) { const A = g.A; A.proudGoal = 1; A.upGoal = 1; A.tailUpGoal = 0.9; A.wagGoal = 1; A.liftGoal = 0.02;
    if (u < 2.6) { A.wingsGoal = 1; A.flapGoal = u < 1.6 ? 1 : 0; A.honkGoal = 1; A.jawGoal = Math.sin(u * 9) > 0 ? 1 : 0.15; }
    else { A.lookPitchGoal = -0.25; A.wingLiftGoal = 0.6; } },
  // something has caught his eye: he stares at it, head tilted, then honks at it
  distracted(g, u) { const A = g.A; A.tiltGoal = 0.42 * Math.sin(u * 0.9 + 0.6); A.upGoal = 0.7; A.lookPitchGoal = -0.1;
    if (u > 1.6 && u < 2.6) { A.honkGoal = 0.7; A.jawGoal = Math.sin((u - 1.6) * Math.PI * 4) > 0 ? 1 : 0; A.tailUpGoal = 0.6; } },
};

ACT.hiss = ACT.scold;           // (hissing at the fox: the same as at Hector)

// tasks: run(goose, dt) is false while it goes on, true when done; each keeps its own time
export const TK = {
  // walk the village grid's way to (x, z) (round bushes, benches, lamps; never into the pond)
  path: (x, z, pace = 'walk', tmax = 45) => ({ name: 'path', act: 'walk', t: 0, pts: null, i: 0, run(g, dt) {
    this.t += dt;
    if (!this.pts) {
      const nav = g.flock.nav, f = nav && nav.find(g.pos.x, g.pos.z, x, z);
      this.pts = f ? f.slice(1) : []; this.pts.push([x, z]);
    }
    const p = this.pts[this.i], last = this.i >= this.pts.length - 1;
    if (g.moveTo(p[0], p[1], dt, pace, !last) || (!last && Math.hypot(p[0] - g.pos.x, p[1] - g.pos.z) < 0.12)) { if (last) return true; this.i++; }
    if (pace === 'walk') { g.A.lookYawGoal = 0.25 * Math.sin(this.t * 1.1 + g.seed); g.A.wagGoal = 0.15; }
    return this.t > tmax;
  } }),
  // straight to (x, z): wading in or out, swimming
  straight: (x, z, pace = 'walk', through = false, tol = 0.06) => ({ name: 'straight', act: 'walk', t: 0, run(g, dt) {
    this.t += dt; this.act = g.wet > 0.5 ? 'swim' : 'walk';
    return g.moveTo(x, z, dt, pace, through) || Math.hypot(x - g.pos.x, z - g.pos.z) < tol || this.t > 30;
  } }),
  // turning to face a heading
  face: (h) => ({ name: 'face', act: 'look', t: 0, run(g, dt) { this.t += dt; return g.turnTo(h, dt, 2) < 0.06 || this.t > 4; } }),
  // doing something for a while: fn(g, u, dt) sets her pose (ACT) u seconds into it
  act: (name, secs, fn = ACT[name]) => ({ name, act: name, t: 0, run(g, dt) { this.t += dt; fn(g, this.t, dt); return this.t >= secs; } }),
  // one after another (an item can be a function making the task when it's reached: places decided then)
  seq: (name, list) => ({ name, list, i: 0, run(g, dt) {
    while (this.i < this.list.length) {
      let c = this.list[this.i];
      if (typeof c === 'function') { c = this.list[this.i] = c(g); if (!c) { this.i++; continue; } }
      if (c.t === 0 || c.act !== g.act) { if (g.act !== c.act) { g.act = c.act; g.actT = 0; } }
      if (c.run(g, dt) === false) return false;
      this.i++; return this.i >= this.list.length;
    }
    return true;
  } }),
};

// the pond and its banks, for the birds that live on it (the geese, the ducks): its shape, how deep in a point is, the grass
// round it in parts the streams cut it into, the ways into the water, swimming clear of the dock
export class PondBirds {
  // opts: { pond: V.pond, nav: the village grid, avoid: [[x, z, r], ...] in the pond (the dock), mouths: [[x, z], ...]
  // where streams meet it }
  setPond(opts, r) {
    this.r = r; this.nav = opts.nav; this.time = 0;
    const P = opts.pond; this.pc = [P.center[0], P.center[2]]; this.pu = [P.axisU[0], P.axisU[2]]; this.pv = [P.axisV[0], P.axisV[2]];
    this.lu2 = this.pu[0] ** 2 + this.pu[1] ** 2; this.lv2 = this.pv[0] ** 2 + this.pv[1] ** 2;
    this.avoid = opts.avoid || []; this.mouths = opts.mouths || []; this.groundY = opts.groundY;
  }
  // the ways into the water: from the bank (on the grass, s 1.24) over the edge (0.97) to where she floats (0.74), clear
  // of the dock and the streams' mouths, each knowing which part of the grass it's on
  waysIn() {
    const nav = this.nav; this.ways = [];
    for (let k = 0; k < 72; k++) {
      const t = k / 72 * Math.PI * 2, out = this.at(t, 1.24), edge = this.at(t, 0.97), inn = this.at(t, 0.74);
      if (nav && !nav.freeAt(out[0], out[1])) continue;
      if (nav && !this.clearBank(edge, out)) continue;
      if (!this.clearWater(inn[0], inn[1], 0.5) || !this.clearWater(edge[0], edge[1], 0.6) || this.mouths.some(m => Math.hypot(m[0] - edge[0], m[1] - edge[1]) < 1.5)) continue;
      this.ways.push({ t, out, edge, inn, reg: this.regionAt(out[0], out[1]) });
    }
  }
  // the walk up the bank from the water's edge clear of anything on the grass (a reed clump, a stone: the grid's blocked cells
  // other than the pond's own margin, its ellipse grown 0.35 m and a little: a rock by the edge is a cell or two beyond it)
  clearBank(edge, out) {
    const L = Math.sqrt(this.lu2), V = Math.sqrt(this.lv2);
    for (let j = 1; j <= 32; j++) {
      const x = edge[0] + (out[0] - edge[0]) * j / 32, z = edge[1] + (out[1] - edge[1]) * j / 32, dx = x - this.pc[0], dz = z - this.pc[1];
      const margin = ((dx * this.pu[0] + dz * this.pu[1]) / L / (L + 0.42)) ** 2 + ((dx * this.pv[0] + dz * this.pv[1]) / V / (V + 0.42)) ** 2 <= 1;
      if (!margin && !this.nav.freeAt(x, z)) return false;
    }
    return true;
  }
  // where a point is against the pond: its ellipse's scale there (1 at the water's edge, with its wobble), and the angle
  pondAt(x, z) {
    const dx = x - this.pc[0], dz = z - this.pc[1], a = (dx * this.pu[0] + dz * this.pu[1]) / this.lu2, b = (dx * this.pv[0] + dz * this.pv[1]) / this.lv2;
    const t = Math.atan2(b, a), w = 1 + 0.035 * Math.sin(t * 5 + 1) + 0.02 * Math.sin(t * 9);
    return [Math.hypot(a, b) / w, t];
  }
  at(t, s) { const w = 1 + 0.035 * Math.sin(t * 5 + 1) + 0.02 * Math.sin(t * 9); return [this.pc[0] + (this.pu[0] * Math.cos(t) + this.pv[0] * Math.sin(t)) * s * w, this.pc[1] + (this.pu[1] * Math.cos(t) + this.pv[1] * Math.sin(t)) * s * w]; }
  // how deep in: 0 on the bank, 1 out where she floats
  wetAt(x, z) { return smooth(1.0, 0.8, this.pondAt(x, z)[0]); }
  // a short walk on land with nothing in the way (the village grid's cells, a little either side)
  clearWalk(ax, az, bx, bz) { return !this.nav || (this.nav.freeAt(bx, bz) && this.nav.clearLine(ax, az, bx, bz, 0.1)); }
  clearWater(x, z, pad = 0) { return this.avoid.every(([ax, az, r]) => Math.hypot(x - ax, z - az) > r + pad); }
  clearSwim(ax, az, bx, bz) { for (let k = 0; k <= 12; k++) { const u = k / 12; if (!this.clearWater(ax + (bx - ax) * u, az + (bz - az) * u, 0.15)) return false; } return true; }
  // the grass round the pond in parts the streams cut it into (cells reached from each other without a footbridge): a
  // goose walks only within her own part; to the other she swims across
  regions() {
    const nav = this.nav; if (!nav) return;
    const N = nav.nx * nav.nz, lab = this.lab = new Int16Array(N).fill(-1), [cx, cz] = this.pc, reach = 12;
    const i0 = Math.max(0, nav.ix(cx - reach)), i1 = Math.min(nav.nx - 1, nav.ix(cx + reach)), k0 = Math.max(0, nav.iz(cz - reach)), k1 = Math.min(nav.nz - 1, nav.iz(cz + reach));
    let id = 0;
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
      const c = k * nav.nx + i; if (nav.block[c] || lab[c] >= 0) continue;
      const q = [c]; lab[c] = id;
      while (q.length) {
        const a = q.pop(), x = a % nav.nx, z = (a / nav.nx) | 0;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Z = z + dz; if (X < i0 || X > i1 || Z < k0 || Z > k1) continue;
          const b = Z * nav.nx + X; if (nav.block[b] || lab[b] >= 0) continue; lab[b] = id; q.push(b);
        }
      }
      id++;
    }
  }
  regionAt(x, z) {
    if (!this.lab) return 0;
    const f = this.nav.nearestFree(x, z, 1.5); if (!f) return -1;
    return this.lab[this.nav.iz(f[1]) * this.nav.nx + this.nav.ix(f[0])];
  }
  // the nearest way into the water (on land: on her side of the streams; reg: on that side; not: any but that one)
  nearestWay(x, z, not, reg) {
    if (!this.ways.length) { const t = this.pondAt(x, z)[1]; return { t, out: this.at(t, 1.24), edge: this.at(t, 0.97), inn: this.at(t, 0.74) }; }
    if (reg === undefined && this.pondAt(x, z)[0] > 1.0) reg = this.regionAt(x, z);
    let best = null, bd = Infinity;
    for (const w of this.ways) { if (w === not || (reg !== undefined && reg !== null && w.reg !== reg)) continue; const d = Math.hypot(w.out[0] - x, w.out[1] - z); if (d < bd) { bd = d; best = w; } }
    return best || (reg !== undefined ? this.nearestWay(x, z, not, null) : null);
  }
  // swimming from one way in to another, round the dock if it's in the way (by the pond's middle)
  swimTo(L, from, to) {
    if (!this.clearSwim(from[0], from[1], to[0], to[1])) { const m = this.at(0, 0); if (this.clearSwim(from[0], from[1], m[0], m[1])) L.push(TK.straight(m[0], m[1], 'walk', true, 0.35)); }
    L.push(TK.straight(to[0], to[1], 'walk', true, 0.3));
  }
  // a few places to swim to in turn, each clear of the dock on the way
  swimRoute(from, n) {
    const pts = []; let [x, z] = from;
    for (let k = 0, tries = 0; k < n && tries < 80; tries++) {
      const t = this.r() * Math.PI * 2, s = 0.2 + this.r() * 0.5, p = this.at(t, s);
      if (!this.clearWater(p[0], p[1], 0.35) || !this.clearSwim(x, z, p[0], p[1]) || Math.hypot(p[0] - x, p[1] - z) < 0.9) continue;
      pts.push(p); [x, z] = p; k++;
    }
    return pts;
  }
}

// ------------------------------------------------------------------ Gertrude and Hector on the farm: they live round the pond
// Gertrude decides what they do; Hector follows in her footsteps a little way behind and copies whatever she does, a beat
// late: strolling about, grazing, a swim (wading in, gliding round, dabbling, out again with a shake), drinking at the edge,
// preening, a rest, a wing-flap stretch, a honk. He hurries after her when she gets ahead, running with his wings out if
// he's left far behind; she calls him with a honk if he's lost; if he crowds her she turns and hisses, and he backs off
// looking sheepish; now and then something catches his eye. At night they sleep side by side by the water, heads tucked in;
// in the morning a stretch and a honk.
export class GeeseFlock extends PondBirds {
  constructor(scene, opts, r) {
    super(); this.setPond(opts, r);
    this.watch = opts.watch; this.others = opts.others || (() => []); this.inView = opts.inView || (() => true); this.guarding = false; this.heard = 0; this.dogOf = opts.dog || (() => null);
    this.soundOf = opts.sound || null;                 // (the game's sound: their honks, sound.js)
    this.wakeOn = opts.wakeOn || null;                 // (the morning replay: they wake when the film says, replay.js)
    this.across = opts.across || null;                 // (the way across the screen: a squabble side-on to you, () => [x, z])
    this.group = new THREE.Group(); scene.add(this.group);
    this.geese = ['embden', 'toulouse'].map(k => {
      const g = new Goose(this.group, k, r); g.flock = this;
      g.shadow = shadowDisc(0.17); this.group.add(g.shadow); return g;
    });
    [this.lead, this.mate] = this.geese;
    this.mate.distractIn = 60 + r() * 90; this.scoldOk = 20;
    this.loveIn = 120 + r() * 120; this.duet = null; this.heart = opts.heart || null; this.props = {};      // (their squabbles: below)
    this.places();
    this.near = this.geese;
    this.ripples = []; this.rippleGeo = new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2);
  }
  // their places: the grass round the pond they wander over (reached without crossing a stream), the ways into the water,
  // and where they sleep
  places() {
    const nav = this.nav, R = this.r;
    this.regions(); this.waysIn();
    this.spots = [];
    for (let k = 0; k < 400 && this.spots.length < 60; k++) {
      const t = R() * Math.PI * 2, s = 1.3 + R() * 0.65, p = this.at(t, s);
      if (nav && (!nav.freeAt(p[0], p[1]) || !nav.clearLine(p[0], p[1], ...this.at(t, 1.2)))) continue;      // (on this side of any stream)
      if (this.mouths.some(m => Math.hypot(m[0] - p[0], m[1] - p[1]) < 1.6)) continue;
      p.reg = this.regionAt(p[0], p[1]); this.spots.push(p);
    }
    // the bed: the way in farthest from the dock and the streams, a little back from the edge, facing the water
    // (with room all round: nothing within half a metre of either of them, a bench, a bush)
    // (the two places 0.68 m apart along the bank; the pond itself, as the grid marks it, its ellipse grown 0.35 m, doesn't
    // count: it's the water they face)
    const pair = t => { const a = this.at(t, 1.3), e = this.at(t + 0.02, 1.3), L = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1; return [a, [a[0] + (e[0] - a[0]) / L * 0.68, a[1] + (e[1] - a[1]) / L * 0.68]]; };
    const roomy = (t) => pair(t).every(p => { for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; for (const r of [0, 0.3, 0.6]) { const x = p[0] + Math.cos(a) * r, z = p[1] + Math.sin(a) * r; if (nav && !nav.freeAt(x, z) && this.pondAt(x, z)[0] > 1.2) return false; } } return true; });
    let best = null, bd = -1;
    for (const w of this.ways) {
      const d = Math.min(...this.avoid.map(a => Math.hypot(a[0] - w.edge[0], a[1] - w.edge[1])), ...this.mouths.map(m => Math.hypot(m[0] - w.edge[0], m[1] - w.edge[1])));
      if (d > bd && roomy(w.t)) { bd = d; best = w; }
    }
    const w = best || { t: 0 }, [a, b] = pair(w.t), face = this.at(w.t, 1.0), h = Math.atan2(face[0] - a[0], face[1] - a[1]);
    this.bed = [[a[0], a[1], h], [b[0], b[1], h + 0.15]]; this.bedReg = this.regionAt(a[0], a[1]); this.bedWay = w;
    if (nav && !this.noMark) for (const p of this.bed) nav.circle(p[0], p[1], 0.32);      // (the fox finds his way round them)
  }
  // the walking grid changed (the game: a field bought, something placed): their places again where one can walk, the
  // bed kept unless something's on it now (then a new one, in the same array: the ducks keep clear of it), marked again
  renav() {
    const nav = this.nav, ref = this.bed, old = ref.map(b => b.slice()), oldWay = this.bedWay, R = this.r;
    let n = 0; this.r = () => ((n = (n * 1103515245 + 12345) >>> 0) / 4294967296);       // (the same spots each time for the same grid)
    this.noMark = true; this.places(); this.noMark = false;
    this.r = R;
    if (old.every(b => !nav || nav.freeAt(b[0], b[1])) && oldWay) { ref.splice(0, 2, ...old); this.bedWay = oldWay; }
    else ref.splice(0, 2, ...this.bed);
    this.bed = ref; this.bedReg = this.regionAt(ref[0][0], ref[0][1]); if (this.bedWay && this.bedWay.out) this.bedWay.reg = this.regionAt(this.bedWay.out[0], this.bedWay.out[1]);
    if (nav) for (const p of ref) nav.circle(p[0], p[1], 0.32);
  }
  // newly come (the game: just bought): out on the water a little way off their bed's side of the pond, they swim in, come
  // out with a shake, a honk and a wing-flap stretch, and have a look round their new home; at night, then to bed
  arrive(hour) {
    const [G, H] = this.geese, w = this.bedWay && this.bedWay.inn ? this.bedWay : this.nearestWay(this.bed[0][0], this.bed[0][1]);
    const out = this.at(w.t, 0.42), dx = w.inn[0] - out[0], dz = w.inn[1] - out[1], d = Math.hypot(dx, dz) || 1, h = Math.atan2(dx, dz);
    G.pos.set(out[0], 0, out[1]); G.heading = h;
    H.pos.set(out[0] - dx / d * 0.75, 0, out[1] - dz / d * 0.75); H.heading = h;
    for (const g of this.geese) { g.asleep = false; g.spd = 0; g.wet = 1; g.lastPos = g.pos.clone(); }
    G.task = TK.seq('arrive', [TK.straight(w.inn[0], w.inn[1], 'walk', true, 0.3), TK.straight(w.edge[0], w.edge[1], 'walk', true, 0.2), TK.straight(w.out[0], w.out[1]),
      TK.act('shake', 1.4), TK.act('honk', 2.4), TK.act('stretch', 4.6), TK.act('look', 2.5)]);
    H.task = null; this.trail = [[H.pos.x, H.pos.z], [G.pos.x, G.pos.z]]; this.hk = 1;
    return [w.out[0], w.out[1]];
  }
  night(h) { return h >= 21.5 || h < 6.25; }
  // somewhere to stroll to: on her own side of the streams, a few metres off
  spot(g) {
    const reg = g ? this.regionAt(g.pos.x, g.pos.z) : null, mine = this.spots.filter(p => reg === null || p.reg === reg);
    let best = null;
    for (let k = 0; k < 8; k++) {
      const p = mine[Math.floor(this.r() * mine.length)]; if (!p) break;
      const d = g ? Math.hypot(p[0] - g.pos.x, p[1] - g.pos.z) : 2;
      if (d > 1.2 && d < 4.5) return p; if (!best) best = p;
    }
    return best || this.at(0, 1.4);
  }
  // put them out for the time of day: by day grazing on the grass, at night asleep in their bed
  place(hour) {
    const [G, H] = this.geese;
    if (this.night(hour)) {
      for (const [g, b] of [[G, this.bed[0]], [H, this.bed[1]]]) { g.pos.set(b[0], 0, b[1]); g.heading = b[2]; g.task = TK.seq('bed', [TK.act('sleep', 1e9)]); g.asleep = true; }
    } else {
      const p = this.spot(); G.pos.set(p[0], 0, p[1]); G.heading = this.r() * 6.28;
      // Hector a step behind her, on clear grass on her side of anything (a fence, a stream: else he'd start beyond it)
      for (let k = 0; k < 12; k++) {
        const h = G.heading + k * 0.53, x = p[0] - Math.sin(h) * 0.8, z = p[1] - Math.cos(h) * 0.8;
        if (this.clearWalk(p[0], p[1], x, z) && this.pondAt(x, z)[0] > 1.2) { G.heading = h; break; }
      }
      H.pos.set(p[0] - Math.sin(G.heading) * 0.8, 0, p[1] - Math.cos(G.heading) * 0.8); H.heading = G.heading;
      G.task = TK.seq('graze', [TK.act('graze', 6 + this.r() * 6)]);
    }
    this.trail = [[H.pos.x, H.pos.z], [G.pos.x, G.pos.z]]; this.hk = 1;
    for (const g of this.geese) g.lastPos = g.pos.clone();
  }
  // what Gertrude does next
  nextLead(g, hour) {
    const R = this.r, H = this.mate, [s] = this.pondAt(g.pos.x, g.pos.z);
    if (this.night(hour)) {
      const b = this.bed[0], L = [];
      if (this.lab && this.regionAt(g.pos.x, g.pos.z) !== this.bedReg && this.bedWay && this.bedWay.inn) {          // (their bed's across a stream: swim over)
        const a = this.nearestWay(g.pos.x, g.pos.z), w = this.bedWay;
        if (!a) return TK.seq('bed', [TK.path(b[0], b[1]), TK.face(b[2]), () => { g.asleep = true; return TK.act('sleep', 1e9); }]);
        L.push(TK.path(a.out[0], a.out[1]), TK.straight(a.edge[0], a.edge[1], 'walk', true, 0.25), TK.straight(a.inn[0], a.inn[1], 'walk', true, 0.3));
        this.swimTo(L, a.inn, w.inn); L.push(TK.straight(w.edge[0], w.edge[1], 'walk', true, 0.2), TK.straight(w.out[0], w.out[1]), TK.act('shake', 1.4));
      }
      L.push(TK.path(b[0], b[1]), TK.face(b[2]), () => { g.asleep = true; return TK.act('sleep', 1e9); });
      return TK.seq('bed', L);
    }
    if (g.asleep) { g.asleep = false; return TK.seq('morning', [TK.act('stretch', 4.6), TK.act('honk', 2.4), TK.act('look', 2)]); }
    if (Math.hypot(H.pos.x - g.pos.x, H.pos.z - g.pos.z) > 4.5 && s > 1.05) return TK.seq('call', [TK.face(Math.atan2(H.pos.x - g.pos.x, H.pos.z - g.pos.z)), TK.act('call', 2.6)]);
    const pick = R(), wet = s < 1.0;
    if (wet) {                                            // (in the water already: out again)
      const w = this.nearestWay(g.pos.x, g.pos.z, null, null);
      return TK.seq('out', [TK.straight(w.inn[0], w.inn[1], 'walk', true, 0.3), TK.straight(w.edge[0], w.edge[1], 'walk', true, 0.2), TK.straight(w.out[0], w.out[1]), TK.act('shake', 1.4)]);
    }
    if (pick < 0.2) { const p = this.spot(g); return TK.seq('stroll', [TK.path(p[0], p[1]), TK.act('look', 1.5 + R() * 2.5)]); }
    if (pick < 0.5) return TK.seq('graze', [TK.act('graze', 9 + R() * 10), () => R() < 0.7 ? this.nibbleOn(g) : null, () => TK.act('graze', 6 + R() * 8), () => R() < 0.5 ? this.nibbleOn(g) : null, () => TK.act('graze', 4 + R() * 6)]);
    if (pick < 0.61) {                                    // a swim
      const a = this.nearestWay(g.pos.x, g.pos.z), route = this.swimRoute(a.inn, 2 + Math.floor(R() * 2)), last = route[route.length - 1] || a.inn;
      const b = this.nearestWay(...this.at(this.pondAt(last[0], last[1])[1], 1.2), R() < 0.5 ? a : null, null) || a;
      const L = [TK.path(a.out[0], a.out[1]), TK.straight(a.edge[0], a.edge[1], 'walk', true, 0.25), TK.straight(a.inn[0], a.inn[1], 'walk', true, 0.3)];
      let at = a.inn;
      for (const p of route) { this.swimTo(L, at, p); at = p; if (R() < 0.55) L.push(TK.act('dabble', 3 + R() * 4)); }
      this.swimTo(L, at, b.inn);
      L.push(TK.straight(b.edge[0], b.edge[1], 'walk', true, 0.2), TK.straight(b.out[0], b.out[1]));
      L.push(TK.act('shake', 1.4), TK.act('preen', 3 + R() * 3));
      return TK.seq('swim', L);
    }
    if (pick < 0.68) {                                    // a drink at the edge
      const w = this.nearestWay(g.pos.x, g.pos.z);
      return TK.seq('drink', [TK.path(w.out[0], w.out[1]), TK.straight(w.edge[0], w.edge[1]), TK.act('drink', 3.8 + R() * 2), TK.straight(w.out[0], w.out[1])]);
    }
    if (pick < 0.78) { g.preenSide = R() < 0.5 ? 1 : -1; return TK.seq('preen', [TK.act('preen', 5 + R() * 5), TK.act('shake', 1.4), TK.act('look', 1.2)]); }
    if (pick < 0.86) { g.sleepy = R() < 0.5; return TK.seq('rest', [TK.act('rest', 14 + R() * 20), TK.act('stretch', 4.6)]); }
    if (pick < 0.93) return TK.seq('stretch', [TK.act('stretch', 4.6), TK.act('look', 1.5)]);
    return TK.seq('honk', [TK.act('honk', 2.4), TK.act('look', 2)]);
  }
  // a couple of steps on to fresh grass while grazing
  nibbleOn(g) {
    const x = g.pos.x + Math.sin(g.heading + (this.r() - 0.5)) * 0.3, z = g.pos.z + Math.cos(g.heading + (this.r() - 0.5)) * 0.3;
    if (this.nav && !this.nav.clearLine(g.pos.x, g.pos.z, x, z, 0.2)) return null;
    if (this.pondAt(x, z)[0] < 1.15) return null;
    return TK.straight(x, z);
  }
  // Hector, each moment: in Gertrude's footsteps a little behind, or copying what she does
  follow(h, dt, hour) {
    const G = this.lead, A = h.A, T = this.trail, dG = Math.hypot(G.pos.x - h.pos.x, G.pos.z - h.pos.z);
    if (G.asleep || (G.task && G.task.name === 'bed' && G.act === 'sleep')) {          // bedtime: beside her
      const b = this.bed[1];
      if (!h.asleep) { h.task = TK.seq('bed', [TK.path(b[0], b[1]), TK.face(b[2]), () => { h.asleep = true; return TK.act('sleep', 1e9); }]); }
      return;
    }
    if (h.asleep) { h.asleep = false; h.task = TK.seq('morning', [TK.act('look', 0.8), TK.act('stretch', 4.6), TK.act('honk', 2.4)]); return; }
    while (this.hk < T.length - 1 && Math.hypot(T[this.hk][0] - h.pos.x, T[this.hk][1] - h.pos.z) < 0.14) this.hk++;
    let along = Math.hypot(T[this.hk][0] - h.pos.x, T[this.hk][1] - h.pos.z);
    for (let i = this.hk; i < T.length - 1; i++) along += Math.hypot(T[i + 1][0] - T[i][0], T[i + 1][1] - T[i][1]);
    along += Math.hypot(G.pos.x - T[T.length - 1][0], G.pos.z - T[T.length - 1][1]);
    const keep = (G.wet > 0.5 ? 0.85 : 0.72) + (G.vs > 0.05 ? 0.1 : 0);
    if ((G.vs > 0.05 && along > keep + 0.08 && dG > 0.6) || dG > 1.4 || (h.wet > 0.04 && G.wet < 0.1 && along > 0.5)) {      // (and out of the water after her: never left standing in the shallows)
      const charging = G.act === 'charge' || G.act === 'hiss' || G.act === 'alarm';
      const pace = charging && along > 1.0 ? 'charge' : along > 3.4 ? 'run' : along > 1.7 ? 'hurry' : G.act === 'parade' ? 'strut' : 'walk', p = this.hk < T.length ? T[this.hk] : [G.pos.x, G.pos.z];
      h.moveTo(p[0], p[1], dt, pace, true);
      if (h.act !== 'walk') { h.act = 'walk'; h.actT = 0; }
      if (charging) ACT.charge(h, this.time);                                          // (after the fox with her)
      else if (G.act === 'parade' || G.act === 'tada') { ACT.parade(h, this.time); h.act = 'parade'; }      // (marching behind her, just as proud)
      else if (pace === 'run' && h.wet < 0.3) { A.wingsGoal = 0.6; A.flapGoal = 0.3; A.tailUpGoal = 0.5; A.upGoal = 0.4; }       // flapping along to catch up
      else if (pace === 'hurry') { A.wagGoal = 0.3; A.upGoal = 0.2; }
      this.copying = null;
      return;
    }
    // close behind her and she's stopped: up beside her (on his side of her, a little back), facing her way, then do what
    // she does, a beat late
    if (G.vs < 0.05) {
      const fx = Math.sin(G.heading), fz = Math.cos(G.heading), rx = fz, rz = -fx;            // her forward and her right
      const side = ((h.pos.x - G.pos.x) * rx + (h.pos.z - G.pos.z) * rz) >= 0 ? 1 : -1;
      let sx = G.pos.x + rx * side * 0.62 - fx * 0.18, sz = G.pos.z + rz * side * 0.62 - fz * 0.18;
      const ok = (x, z) => (G.wet > 0.5 ? this.clearWater(x, z, 0.3) : this.clearWalk(h.pos.x, h.pos.z, x, z) && (G.wet > 0.1 || this.wetAt(x, z) < 0.1)) && (G.wet > 0.5) === (this.wetAt(x, z) > 0.5);      // (she's on the grass: so is he)
      if (!ok(sx, sz)) { sx = G.pos.x - rx * side * 0.62 - fx * 0.18; sz = G.pos.z - rz * side * 0.62 - fz * 0.18; }
      const ds = Math.hypot(sx - h.pos.x, sz - h.pos.z);
      if (ok(sx, sz) && (ds > 0.18 || (this.adjusting && ds > 0.06))) { this.adjusting = true; h.moveTo(sx, sz, dt, 'walk'); if (h.act !== 'walk') { h.act = 'walk'; h.actT = 0; } ACT.look(h, this.time); return; }
      this.adjusting = false;
      h.turnTo(G.heading + side * 0.12, dt, 1.6);
    }
    if (this.copying !== G.act) { this.copying = G.act; this.copyStart = this.time; h.preenSide = -(G.preenSide || 1); h.sleepy = G.sleepy; }
    const u = G.actT - 0.6;
    let doing = 'look';
    if (this.time - this.copyStart > 0.6 && u > 0 && ACT[G.act] && G.act !== 'call' && G.act !== 'scold') doing = G.act === 'drink' && h.wet < 0.05 ? 'look' : G.act;
    ACT[doing](h, doing === 'look' ? this.time : u, dt);
    if (h.act !== doing) { h.act = doing; h.actT = 0; }
  }
  // ---- guarding the farm at night: Rusty out on a visit (watch(): the night visit). A goose sleeps lightly: she hears him
  // near (14 m), or the hens squawking anywhere, or wakes a while after he's slipped out; then they're up honking the
  // alarm and off after him
  watchFor(dt, hour) {
    const V = this.watch && this.watch();
    // (Biscuit barking: they wake to that too, even once Rusty's running, and go out after him with Biscuit)
    if (this.wakeOn) { if (!this.guarding && V && this.night(hour) && V.active() && this.wakeOn()) this.raise(V); return; }
    const D = this.farmDog(), barking = D && D.guard && !D.guard.done && /^(charge|pursue|stand)$/.test(D.guard.stage);
    if (!this.guarding && V && this.night(hour) && barking && V.fox.root.visible && (V.state === 'out' || V.state === 'fleeing')) { this.raise(V); return; }
    if (this.guarding || !V || !this.night(hour) || V.state !== 'out' || !V.fox.root.visible) { if (!V || V.state !== 'out') this.heard = 0; return; }
    const [G] = this.geese, f = V.fox, d = Math.hypot(f.pos.x - G.pos.x, f.pos.z - G.pos.z);
    this.heard += dt;
    if (d < (this.brave ? 18 : 14) || V.pecks > 0 || this.heard > (this.brave ? 22 : 35)) this.raise(V);      // (friends with the farmer: braver guards, up sooner)
  }
  raise(V) {
    const [G, H] = this.geese;
    this.endDuet();
    this.guarding = true; this.heard = 0; G.asleep = false; H.asleep = false;
    G.task = this.guardTask(V); G.act = 'alarm'; G.actT = 0;
    H.task = TK.seq('wake', [TK.act('look', 0.5), TK.act('alarm', 2.2)]);
    // (Biscuit up already and barking: they've heard him; up this very moment too, before his first woof: they both heard Rusty)
    const D = this.farmDog(); V.hint(V.T(!D || !D.guard ? 'geeseHeard' : (D.guard.t || 0) < 0.3 ? 'bothHeard' : 'geeseToo')); (V.helpers || (V.helpers = {})).geese = true; this.raisedAt = this.time;
    for (const g of this.geese) V.fx.pop('bang', g.pos.clone().add(new THREE.Vector3(0, 0.95, 0)), 0.2, 1.5);
  }
  // Biscuit out after Rusty too (dog.js): they wait for him to come back before their victory parade, and parade together
  farmDog() { const d = this.dogOf(); return d && d.fam && d.fam.guard !== undefined ? d.fam : null; }
  dogOut() { const D = this.farmDog(); return !!(D && D.guard && !D.guard.done && D.guard.stage !== 'parade'); }
  // Gertrude on guard: up and honking, then charging at him (her way round everything replanned as he moves), stopping
  // to hiss when she's on him (he bolts), after him a little way, a triumphant honk and a wing-flap, and back to bed
  guardTask(V) {
    const self = this, f = V.fox, bed = this.bed[0];
    return { name: 'guard', act: 'alarm', t: 0, st: 0, stage: 'wake', path: null, re: 0, home: null, run(g, dt) {
      this.t += dt; this.st += dt;
      const fx = f.pos.x, fz = f.pos.z, d = Math.hypot(fx - g.pos.x, fz - g.pos.z), toF = Math.atan2(fx - g.pos.x, fz - g.pos.z);
      const to = (stage, act) => { this.stage = stage; this.st = 0; if (g.act !== act) { g.act = act; g.actT = 0; } };
      // Rusty seen off: waiting for Biscuit, or the victory parade; first, if here's hidden from view, somewhere open nearby
      const proud = (there) => {
        const s = there ? null : self.paradeSpot(g);
        if (s) { this.gath = TK.path(s[0], s[1], 'hurry', 25); to('gather', 'parade'); return; }
        to(self.dogOut() ? 'await' : 'victory', self.dogOut() ? 'parade' : 'honk');
      };
      switch (this.stage) {
        case 'wake': g.turnTo(toF, dt, 2.5); ACT.alarm(g, this.st); if (this.st > 2.6) to('charge', 'charge'); return false;
        case 'charge': {
          if (!f.root.visible) { proud(); return false; }        // (gone already)
          if (V.state === 'fleeing') { to('pursue', 'charge'); return false; }                   // (Biscuit got there first: after Rusty with him)
          if ((this.re -= dt) <= 0 || !this.path || !this.path.length) {
            // her way to him round everything; while he's somewhere she can't get to (in a pen), the nearest place round him
            // she can; failing that she keeps to the way she had (never a straight line through things)
            this.re = 0.8;
            const nav = self.nav; let p = nav ? nav.find(g.pos.x, g.pos.z, fx, fz) : [[g.pos.x, g.pos.z], [fx, fz]];
            for (const r of [1.8, 2.6, 3.4]) for (let k = 0; k < 8 && !p; k++) {
              const tx = fx + Math.cos(k * 0.785) * r, tz = fz + Math.sin(k * 0.785) * r;
              if (nav.freeAt(tx, tz)) p = nav.find(g.pos.x, g.pos.z, tx, tz);
            }
            if (p) this.path = p.slice(1);
            if (!this.path || !this.path.length) this.path = [[g.pos.x, g.pos.z]];
          }
          while (this.path.length > 1 && Math.hypot(this.path[0][0] - g.pos.x, this.path[0][1] - g.pos.z) < 0.14) this.path.shift();
          const p = this.path[0], end = this.path.length === 1 && Math.hypot(p[0] - g.pos.x, p[1] - g.pos.z) < 0.35;
          const sees = !self.nav || self.nav.clearLine(g.pos.x, g.pos.z, fx, fz);
          if ((d < 1.7 && sees) || (d < 3.6 && end) || this.st > 75) { V.chasedBy(g.pos.x, g.pos.z); to('hiss', 'hiss'); return false; }
          if (!end) g.moveTo(p[0], p[1], dt, 'charge', this.path.length > 1); else g.turnTo(toF, dt, 3);
          ACT.charge(g, this.st);
          return false;
        }
        case 'hiss': g.turnTo(toF, dt, 3); ACT.hiss(g, this.st); if (this.st > 1.4) to('pursue', 'charge'); return false;
        case 'pursue': {                                  // after him a few steps while he runs, if the way's clear
          const ax = g.pos.x + Math.sin(toF) * 0.8, az = g.pos.z + Math.cos(toF) * 0.8;
          if (this.st < 2.2 && f.root.visible && d > 1.2 && self.clearWalk(g.pos.x, g.pos.z, ax, az)) { g.moveTo(ax, az, dt, 'run', true); ACT.charge(g, this.st); return false; }
          proud(); return false;
        }
        // to somewhere open for the parade, in full view (not behind a tree), hurrying with their chests out
        case 'gather': {
          if (this.gath.run(g, dt) !== false || this.st > 25) { this.gath = null; proud(true); return false; }
          ACT.parade(g, 1.2); g.A.honkGoal = this.st % 2.6 < 0.6 ? 1 : 0;
          return false;
        }
        // waiting for Biscuit to come back from seeing Rusty home: chest out, honking now and then, looking his way
        case 'await': {
          const D = self.farmDog(), dog = D && D.dog;
          if (dog) g.turnTo(Math.atan2(dog.pos.x - g.pos.x, dog.pos.z - g.pos.z), dt, 2);
          ACT.parade(g, 1.2); g.A.honkGoal = this.st % 3 < 0.8 ? 1 : 0; g.A.jawGoal = this.st % 3 < 0.8 && Math.sin(this.st * 8) > 0 ? 1 : 0.1;
          if (!self.dogOut() || this.st > 50) to('victory', 'honk');
          return false;
        }
        // super proud: a victory honk with her chest puffed out, a lap of honour strutting with Hector marching behind,
        // a ta-da with her wings flung wide, then strutting off home
        case 'victory':
          ACT.parade(g, this.st + 2.2); g.A.honkGoal = 1; g.A.jawGoal = Math.sin(this.st * 8) > 0 ? 1 : 0.1;
          if (this.st < 0.1 && V.hint) V.hint(V.T(self.farmDog() && self.farmDog().guard ? 'teamProud' : 'geeseProud'));
          if (this.st > 1.8) { this.lap = self.lapOfHonour(g); to(this.lap ? 'lap' : 'tada', this.lap ? 'parade' : 'tada'); }
          return false;
        case 'lap': {
          const p = this.lap[0], last = this.lap.length === 1;
          if (g.moveTo(p[0], p[1], dt, 'strut', !last) || (!last && Math.hypot(p[0] - g.pos.x, p[1] - g.pos.z) < 0.12)) this.lap.shift();
          ACT.parade(g, this.st);
          if (!this.lap.length || this.st > 30) to('tada', 'tada');
          return false;
        }
        case 'tada':
          if (this.st < 0.8 && self.mate.vs > 0.05) { ACT.parade(g, this.st); this.st -= dt * 0.5; return false; }       // (a moment for him to come up beside her)
          ACT.tada(g, this.st); if (this.st > 4.2) to('home', 'parade');
          return false;
        case 'home':
          if (!this.home) this.home = TK.path(bed[0], bed[1], this.st < 6 ? 'strut' : 'walk', 150);
          if (this.home.run(g, dt) !== false) to('face', 'look');
          if (this.st < 6) ACT.parade(g, this.st); else if (g.act === 'parade') { g.act = 'walk'; g.actT = 0; }
          return false;
        case 'face':
          if (g.turnTo(bed[2], dt, 2) < 0.06 || this.st > 3) { self.guarding = false; return true; }
          return false;
      }
      return true;
    } };
  }
  // back to how they'd be at this hour, as when the page opens (the morning replay's cast, before each showing)
  reset() {
    this.endDuet();
    this.guarding = false; this.heard = 0; this.trail = null; this.raisedAt = 0;
    for (const g of this.geese) { g.task = null; g.asleep = false; g.act = null; g.actT = 0; }
  }
  // where to parade: here if it's in full view with room round it (for the lap and for Biscuit going round them), else
  // the nearest such spot within 10 m she can walk to; null for here (or nowhere better)
  paradeSpot(g) {
    const nav = this.nav, x0 = g.pos.x, z0 = g.pos.z;
    const roomy = (x, z) => {
      if (this.pondAt(x, z)[0] < 1.8 || (nav && !nav.freeAt(x, z))) return false;
      for (const r of [0.9, 1.5]) for (let k = 0; nav && k < 16; k++) if (!nav.freeAt(x + Math.cos(k * 0.393) * r, z + Math.sin(k * 0.393) * r)) return false;
      return true;
    };
    if (this.inView(x0, z0) && roomy(x0, z0) && this.lapOfHonour(g)) return null;
    for (const r of [1.5, 2.5, 3.5, 4.5, 5.5, 7, 8.5, 10]) for (let k = 0; k < 12; k++) {          // (somewhere well in view, so a step short of it still is)
      const a = k * Math.PI / 6, x = x0 + Math.sin(a) * r, z = z0 + Math.cos(a) * r;
      if (!this.inView(x, z, 2.4) || !roomy(x, z)) continue;
      const p = nav ? nav.find(x0, z0, x, z) : [[x0, z0], [x, z]];
      if (p && p.length) return [x, z];
    }
    return null;
  }
  // a lap of honour: a little circle from where she stands, all of it clear of everything (the first that fits of a few
  // sizes and ways round), three quarters of the way round
  lapOfHonour(g) {
    const nav = this.nav;
    for (const r of [0.85, 0.65, 0.5]) for (let k = 0; k < 8; k++) {
      const a0 = g.heading + k * Math.PI / 4, cx = g.pos.x + Math.sin(a0) * r, cz = g.pos.z + Math.cos(a0) * r, pts = [];
      const start = Math.atan2(g.pos.x - cx, g.pos.z - cz), dir = k % 2 ? 1 : -1;
      for (let i = 1; i <= 9; i++) { const a = start + dir * i * Math.PI * 1.5 / 9; pts.push([cx + Math.sin(a) * r, cz + Math.cos(a) * r]); }
      let ok = !nav || nav.freeAt(cx, cz);
      for (let i = 0; ok && i < pts.length; i++) { const q = i ? pts[i - 1] : [g.pos.x, g.pos.z]; ok = !nav || (nav.freeAt(pts[i][0], pts[i][1]) && nav.clearLine(q[0], q[1], pts[i][0], pts[i][1], 0.18)); }
      if (ok && this.pondAt(cx, cz)[0] > 1.6) return pts;
    }
    return null;
  }
  update(dt, hour) {
    this.time += dt; this.scoldOk -= dt; this.hour = hour;
    this.watchFor(dt, hour);
    const V = this.watch && this.watch(), fox = V && V.fox && V.fox.root.visible ? V.fox : null, dog = this.dogOf();
    this.near = [...this.geese, ...(fox ? [fox] : []), ...(dog ? [dog] : []), ...this.others()];          // (steering well clear of the fox, of Biscuit, round the ducks)
    const [G, H] = this.geese;
    if (!this.trail) this.place(hour);
    if (!this.night(hour) && G.asleep && G.task && G.task.name === 'bed') G.task = null;               // morning: up she gets
    if (!this.night(hour) && H.asleep && !G.asleep && G.actT > 1.2 && H.task && H.task.name === 'bed') { H.asleep = false; H.task = TK.seq('morning', [TK.act('look', 0.6), TK.act('stretch', 4.6), TK.act('honk', 2.4)]); }
    if (!G.task) G.task = this.nextLead(G, hour);
    else if (this.night(hour) && !/^(bed|scold|guard|arrive)/.test(G.task.name) && !G.asleep && G.wet < 0.1) G.task = this.nextLead(G, hour);      // (bedtime: off to bed)
    // Hector: his own little moments, or following her
    const free = !H.task || H.task.name === 'follow', calm = G.vs < 0.05 && G.wet < 0.1 && H.wet < 0.1 && !this.night(hour) && !G.asleep;
    if ((H.distractIn -= dt) <= 0 && free && calm) {
      H.distractIn = 70 + this.r() * 120; const look = this.r() * 6.28;
      H.task = TK.seq('distracted', [TK.face(look), TK.act('distracted', 3.2 + this.r() * 1.5)]);
    }
    // cheeky: while she grazes he edges over to nibble right under her bill (and gets hissed at)
    if (free && calm && G.act === 'graze' && G.actT > 3 && this.scoldOk <= 0 && this.r() < dt / 25) {
      const fx = Math.sin(G.heading), fz = Math.cos(G.heading), side = ((H.pos.x - G.pos.x) * fz - (H.pos.z - G.pos.z) * fx) >= 0 ? 1 : -1;
      const tx = G.pos.x + fx * 0.2 + fz * side * 0.45, tz = G.pos.z + fz * 0.2 - fx * side * 0.45;
      if (this.clearWalk(H.pos.x, H.pos.z, tx, tz)) H.task = TK.seq('cheeky', [TK.straight(tx, tz, 'walk', false, 0.08), TK.act('graze', 30)]);
    }
    // now and then a squabble (over a snail, a puddle, the best spot), and they make up
    if ((this.loveIn -= dt) <= 0 && free && calm && !this.guarding && G.task && /^(graze|stroll|preen|honk|stretch)$/.test(G.task.name) && Math.hypot(H.pos.x - G.pos.x, H.pos.z - G.pos.z) < 2.2) {
      this.loveIn = this.squabble(this.force || null) ? 200 + this.r() * 220 : 15; this.force = null;
    }
    if (this.duet && (this.night(hour) || G.task !== this.duet.gt)) this.endDuet();      // (bedtime, or something else came up)
    if (!H.task) H.task = { name: 'follow', act: 'walk', run: (h, d) => { this.follow(h, d, hour); return false; } };
    // her footsteps for him to follow
    const T = this.trail, last = T[T.length - 1];
    if (Math.hypot(G.pos.x - last[0], G.pos.z - last[1]) > 0.08) T.push([G.pos.x, G.pos.z]);
    if (T.length > 400) { const cut = T.length - 400; T.splice(0, cut); this.hk = Math.max(0, this.hk - cut); }
    for (const g of this.geese) { g.actT += dt; g.update(dt); }
    // crowding her while she's busy (cheeky, or just too close): she turns and hisses, he backs off looking sheepish
    const dG = Math.hypot(H.pos.x - G.pos.x, H.pos.z - G.pos.z);
    if (dG < 0.5 && G.vs < 0.03 && H.wet < 0.3 && G.wet < 0.3 && this.scoldOk <= 0 && !G.asleep && !this.duet && !/^(bed|scold|call|morning|guard|squabble|visit|greet)/.test(G.task ? G.task.name : '') && (!H.task || /^(follow|cheeky)$/.test(H.task.name))) {
      this.scoldOk = 50 + this.r() * 50;
      const away = Math.atan2(H.pos.x - G.pos.x, H.pos.z - G.pos.z);
      let to = null;
      for (const turn of [0, 0.7, -0.7, 1.4, -1.4]) for (const far of [1.05, 0.7]) {
        const x = G.pos.x + Math.sin(away + turn) * far, z = G.pos.z + Math.cos(away + turn) * far;
        if (!to && this.clearWalk(H.pos.x, H.pos.z, x, z)) to = [x, z];
      }
      G.task = TK.seq('scold', [TK.face(away), TK.act('scold', 1.5), TK.act('look', 1)]);
      H.task = TK.seq('backoff', [TK.act('look', 0.45), ...(to ? [TK.straight(to[0], to[1], 'hurry')] : []), TK.act('sheepish', 2.4)]);
    }
    if (H.task && H.task.name !== 'follow' && H.task.name !== 'bed' && H.task.name !== 'morning') {        // (off the trail: back on it where he's closest)
      let bi = this.hk, bd = Infinity; for (let i = this.hk; i < T.length; i++) { const d = Math.hypot(T[i][0] - H.pos.x, T[i][1] - H.pos.z); if (d < bd) { bd = d; bi = i; } } this.hk = bi;
    }
    // never through each other: each body is two round parts (breast and rump) along the way she faces; where any two
    // overlap they're eased apart
    for (let pass = 0; pass < 2; pass++) {
      let bx = 0, bz = 0, worst = 0;
      for (const a of [0.14, -0.13]) for (const c of [0.14, -0.13]) {
        const ax = G.pos.x + Math.sin(G.heading) * a, az = G.pos.z + Math.cos(G.heading) * a, cx = H.pos.x + Math.sin(H.heading) * c, cz = H.pos.z + Math.cos(H.heading) * c;
        const dx = cx - ax, dz = cz - az, d = Math.hypot(dx, dz), over = 0.31 - d;
        if (over > worst && d > 1e-4) { worst = over; bx = dx / d; bz = dz / d; }
      }
      if (worst <= 0) break;
      const hm = G.vs < 0.03 && H.vs >= 0.03 ? 0.85 : 0.5;              // (the one moving gives way most)
      const can = (g, x, z) => !this.nav || g.wet > 0.2 || this.nav.freeAt(x, z) || !this.nav.freeAt(g.pos.x, g.pos.z);     // (never pushed into anything)
      if (can(H, H.pos.x + bx * worst * hm, H.pos.z + bz * worst * hm)) { H.pos.x += bx * worst * hm; H.pos.z += bz * worst * hm; }
      if (can(G, G.pos.x - bx * worst * (1 - hm), G.pos.z - bz * worst * (1 - hm))) { G.pos.x -= bx * worst * (1 - hm); G.pos.z -= bz * worst * (1 - hm); }
    }
    // and never into the fox (he doesn't look where he's running) or the dog: a goose in his way steps aside
    for (const o of [fox, dog]) if (o) for (const g of this.geese) {
      const dx = g.pos.x - o.pos.x, dz = g.pos.z - o.pos.z, d = Math.hypot(dx, dz), min = o === dog ? 0.56 : 0.62;
      if (d < min && d > 1e-4 && g.wet < 0.3) {
        const nx = o.pos.x + dx / d * min, nz = o.pos.z + dz / d * min;
        if (!this.nav || this.nav.freeAt(nx, nz)) { g.pos.x = nx; g.pos.z = nz; }
      }
    }
    this.tickProps(dt);
    // shadows on the grass, ripples round them on the water
    for (const g of this.geese) {
      g.shadow.position.set(g.pos.x, 0.013, g.pos.z); g.shadow.rotation.y = g.heading; g.shadow.visible = g.wet < 0.3;
      if (g.wet > 0.4 && (g.rippleIn = (g.rippleIn || 0) - dt) <= 0) { g.rippleIn = g.vs > 0.05 ? 0.45 : 0.9; this.ripple(g.pos.x, g.pos.z); }
    }
    for (const rp of this.ripples) {
      if (!rp.visible) continue;
      rp.userData.t += dt; const u = rp.userData.t / 1.8;
      if (u >= 1) { rp.visible = false; continue; }
      rp.scale.setScalar(0.2 + 0.45 * u); rp.material.opacity = 0.42 * (1 - u) * (1 - u);
    }
  }
  // ---- love and squabbles (release 3; the game's plan, as Audrey has it: "Gertrude and Hector are in love, but they squabble
  // now and then (over a snail, a puddle, the best spot), then make up"). Something on the grass a little ahead of her: a
  // snail, a puddle (rainwater), or just the best spot. They face each other over it, a stare, a tussle (necks low, wings
  // up, bills jabbing, hissing), one of them wins (eats the snail, drinks the puddle, sits down in the spot) while the other
  // sulks; then the other comes back beside the winner, they turn to each other, necks curved, a soft honk, and hearts float
  // up between them. kind: 'snail', 'puddle' or 'spot' (else the luck's)
  squabble(kind) {
    const [G, H] = this.geese, R = this.r, nav = this.nav;
    kind = kind || ['snail', 'puddle', 'spot'][Math.floor(R() * 3)];
    const roomy = (x, z) => !nav || [[0, 0], [0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45], [0.32, 0.32], [-0.32, 0.32], [0.32, -0.32], [-0.32, -0.32]].every(([dx, dz]) => nav.freeAt(x + dx, z + dz));
    let at = null;
    for (const a of [0, 0.6, -0.6, 1.2, -1.2, 2.2, -2.2]) {
      const x = G.pos.x + Math.sin(G.heading + a) * 0.75, z = G.pos.z + Math.cos(G.heading + a) * 0.75;
      if (this.pondAt(x, z)[0] > 1.3 && this.clearWalk(G.pos.x, G.pos.z, x, z) && roomy(x, z)) { at = [x, z]; break; }
    }
    if (!at) return false;
    // their places: either side of it, across the way she came (he takes the side he's on), or else along the way from her
    // to him; never walking over it on the way (the snail)
    const wl = Math.hypot(at[0] - G.pos.x, at[1] - G.pos.z) || 1, px = -(at[1] - G.pos.z) / wl, pz = (at[0] - G.pos.x) / wl;
    const s = ((H.pos.x - at[0]) * px + (H.pos.z - at[1]) * pz) > 0 ? 1 : -1;
    let ux = H.pos.x - at[0], uz = H.pos.z - at[1]; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
    const segD = (x0, z0, x1, z1, q) => { const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz || 1, k = Math.max(0, Math.min(1, ((q[0] - x0) * dx + (q[1] - z0) * dz) / l2)); return Math.hypot(x0 + dx * k - q[0], z0 + dz * k - q[1]); };
    const past = (x0, z0, x1, z1) => segD(x0, z0, x1, z1, at) > 0.36;
    // (side-on to you if it can be, so you see them face to face over it)
    const ac = this.across ? this.across() : null, cands = [[px * s, pz * s], [-px * s, -pz * s], [ux, uz], [-uz, ux], [uz, -ux]];
    if (ac) cands.push([ac[0], ac[1]], [-ac[0], -ac[1]]);
    // the way there: straight, or round it by a point to one side (never over it, nor through where the other one is)
    const leg = (x0, z0, x1, z1, by) => this.clearWalk(x0, z0, x1, z1) && past(x0, z0, x1, z1) && (!by || segD(x0, z0, x1, z1, by) > 0.5);
    const route = (g, to, by) => {
      if (leg(g.pos.x, g.pos.z, to[0], to[1], by)) return [];
      const dx = to[0] - g.pos.x, dz = to[1] - g.pos.z, l = Math.hypot(dx, dz) || 1;
      for (const sd of [1, -1]) {
        const w = [at[0] - dz / l * sd * 0.5, at[1] + dx / l * sd * 0.5];
        if (this.pondAt(w[0], w[1])[0] > 1.25 && leg(g.pos.x, g.pos.z, w[0], w[1], by) && leg(w[0], w[1], to[0], to[1], by)) return [w];
      }
      return null;
    };
    let gp = null, hp = null, gway = null, hway = null, best = -9;
    cands.forEach(([cx, cz], i) => {
      const a = [at[0] - cx * 0.6, at[1] - cz * 0.6], b = [at[0] + cx * 0.6, at[1] + cz * 0.6];      // (far enough apart that their necks never cross, stretched out at each other)
      const score = (ac ? Math.abs(cx * ac[0] + cz * ac[1]) : 0) - i * 0.04;
      if (score <= best || this.pondAt(a[0], a[1])[0] <= 1.25 || this.pondAt(b[0], b[1])[0] <= 1.25) return;
      const gw = route(G, a, [H.pos.x, H.pos.z]), hw = gw && route(H, b, a);      // (she goes first, round him; then he comes, round her)
      if (gw && hw) { gp = a; hp = b; gway = gw; hway = hw; best = score; }
    });
    if (!gp) return false;
    const S = this.duet = { kind, at, gp, hp, gway, hway, stage: 'go', t: 0, win: R() < 0.55 ? G : H, hearts: 0 };
    this.prop(kind, at, true);
    S.gt = G.task = this.duetTask(G, S, true); S.ht = H.task = this.duetTask(H, S, false);
    this.squabbles = (this.squabbles || 0) + 1;
    return true;
  }
  endDuet() {
    const S = this.duet; if (!S) return;
    this.duet = null; this.prop(S.kind, S.at, false);
    for (const g of this.geese) if (g.task === S.gt || g.task === S.ht) g.task = null;
  }
  duetTask(g, S, lead) {
    const self = this;
    return { name: 'squabble', act: 'squabble', run(g, dt) {
      if (self.duet !== S) return true;
      const [G, H] = self.geese, other = g === G ? H : G, mine = g === G ? S.gp : S.hp, win = S.win === g;
      if (lead) S.t += dt;
      const toAt = Math.atan2(S.at[0] - g.pos.x, S.at[1] - g.pos.z), toOther = Math.atan2(other.pos.x - g.pos.x, other.pos.z - g.pos.z);
      g.act = 'squabble';
      switch (S.stage) {
        case 'go': {                                       // over to it, each on their side (round it if need be)
          const way = g === G ? S.gway : S.hway;
          if (g === H && S.t < 8 && Math.hypot(S.gp[0] - G.pos.x, S.gp[1] - G.pos.z) > 0.1) { g.turnTo(toAt, dt, 2); ACT.look(g, S.t); return false; }      // (he waits for her to get there)
          if (way.length) { if (Math.hypot(way[0][0] - g.pos.x, way[0][1] - g.pos.z) < 0.12 || g.moveTo(way[0][0], way[0][1], dt, 'walk')) way.shift(); ACT.look(g, S.t); if (lead && S.t > 25) self.endDuet(); return false; }
          const there = Math.hypot(mine[0] - g.pos.x, mine[1] - g.pos.z) < 0.06 || g.moveTo(mine[0], mine[1], dt, 'walk');
          if (there) g.turnTo(toAt, dt, 2.4);
          ACT.look(g, S.t);
          if (lead && Math.hypot(S.gp[0] - G.pos.x, S.gp[1] - G.pos.z) < 0.08 && Math.hypot(S.hp[0] - H.pos.x, S.hp[1] - H.pos.z) < 0.08 && S.t > 1) { S.stage = 'eye'; S.t = 0; }
          if (lead && S.t > 25) self.endDuet();
          return false;
        }
        case 'eye': {                                      // a long look at it, then at each other
          g.turnTo(S.t < 0.9 ? toAt : toOther, dt, 2.6);
          const A = g.A; A.lowGoal = 0.25; A.lookPitchGoal = S.t < 0.9 ? 0.35 : 0; A.tiltGoal = S.t < 0.9 ? 0.25 : 0; A.tailUpGoal = 0.3;
          if (lead && S.t > 1.6) { S.stage = 'tussle'; S.t = 0; }
          return false;
        }
        case 'tussle': {                                   // necks low, wings up, bills jabbing, hissing
          g.turnTo(toOther, dt, 3);
          ACT.scold(g, S.t * (g === G ? 1 : 1.13));
          const jab = Math.max(0, Math.sin(S.t * 6.5 + (g === G ? 0 : Math.PI))) * 0.05;
          g.pos.x = mine[0] + Math.sin(toOther) * jab; g.pos.z = mine[1] + Math.cos(toOther) * jab;
          if (lead && S.t > 2.6) { S.stage = 'win'; S.t = 0; }
          return false;
        }
        case 'win': {                                      // one has it (up to it first); the other sulks, a step back
          if (win) {
            if (!S.wat) { const d = Math.hypot(S.at[0] - mine[0], S.at[1] - mine[1]) || 1, k = S.kind === 'spot' ? 1 : (d - 0.3) / d; S.wat = [mine[0] + (S.at[0] - mine[0]) * k, mine[1] + (S.at[1] - mine[1]) * k]; }
            if (!S.wthere && !(Math.hypot(S.wat[0] - g.pos.x, S.wat[1] - g.pos.z) < 0.04 || g.moveTo(S.wat[0], S.wat[1], dt, 'walk'))) { ACT.look(g, S.t); return false; }
            S.wthere = true; S.wt = (S.wt || 0) + dt;
            if (S.kind !== 'spot') g.turnTo(Math.atan2(S.at[0] - g.pos.x, S.at[1] - g.pos.z), dt, 2.6);
            else if (self.across) { const ac = self.across(); g.turnTo(Math.atan2(-ac[1], ac[0]) + 0.35, dt, 2.2); }      // (settling in it half facing you)
            if (S.kind === 'snail') { ACT.graze(g, S.wt); if (S.wt > 1.3 && !S.eaten) { S.eaten = true; self.prop('snail', S.at, false); } }
            else if (S.kind === 'puddle') ACT.drink(g, S.wt);
            else { ACT.rest(g, S.wt); }
          } else {
            const away = Math.atan2(g.pos.x - other.pos.x, g.pos.z - other.pos.z), back = [mine[0] + Math.sin(away) * 0.22, mine[1] + Math.cos(away) * 0.22];
            if (S.t < 1.4 && self.clearWalk(g.pos.x, g.pos.z, back[0], back[1])) g.moveTo(back[0], back[1], dt, 'walk');
            g.turnTo(away, dt, 2.2);
            if (S.t > 0.8) ACT.sheepish(g, S.t); else ACT.look(g, S.t);
          }
          if (lead && S.t > 2.4 && (S.wt || 0) > 2.2) { S.stage = 'makeup'; S.t = 0; S.side = null; }
          return false;
        }
        case 'makeup': {                                   // back beside each other: a neck rub, a soft honk, hearts
          if (!win) {
            if (!S.side) {
              // (beside her across the screen if there's room, on the side he's on; else beside her the way she faces; else her other side)
              const w = S.win, fx = Math.sin(w.heading), fz = Math.cos(w.heading), ac = self.across ? self.across() : null, opts = [];
              if (ac) { const sg = (g.pos.x - w.pos.x) * ac[0] + (g.pos.z - w.pos.z) * ac[1] >= 0 ? 1 : -1; opts.push([ac[0] * sg, ac[1] * sg]); }
              opts.push([fz, -fx], [-fz, fx]); if (ac) opts.push([-opts[0][0], -opts[0][1]]);
              for (const [ox, oz] of opts) { const x = w.pos.x + ox * 0.52, z = w.pos.z + oz * 0.52; if (!S.side && self.clearWalk(g.pos.x, g.pos.z, x, z) && self.pondAt(x, z)[0] > 1.2) S.side = [x, z]; }
              if (!S.side) S.side = [g.pos.x, g.pos.z];
            }
            if (Math.hypot(S.side[0] - g.pos.x, S.side[1] - g.pos.z) > 0.06) { g.moveTo(S.side[0], S.side[1], dt, 'walk'); ACT.look(g, S.t); return false; }
          }
          const near = Math.hypot(other.pos.x - g.pos.x, other.pos.z - g.pos.z) < 0.75;
          if (S.kind === 'spot' && win) { ACT.rest(g, 1); g.A.lookYawGoal = 0.6 * Math.sign(Math.sin(toOther - g.heading)); g.A.tiltGoal = 0.3; }
          else {
            g.turnTo(toOther, dt, 2);
            const A = g.A; A.upGoal = 0.55; A.tiltGoal = 0.35 * (g === G ? 1 : -1); A.lookPitchGoal = 0.12; A.wagGoal = 0.6; A.squintGoal = 0.5;
            if (near && S.t % 2.4 > 1.2 && S.t % 2.4 < 1.6) { A.honkGoal = 0.4; A.jawGoal = 0.6; }       // (a soft honk)
          }
          if (lead && near && S.nearAt === undefined) S.nearAt = S.t;      // (beside each other: the hearts from then)
          if (lead && near && S.hearts < 3 && S.t > S.nearAt + 0.5 + S.hearts * 0.55) {
            S.hearts++;
            if (self.heart) self.heart((G.pos.x + H.pos.x) / 2, 0.78 + S.hearts * 0.04, (G.pos.z + H.pos.z) / 2);
          }
          if (lead && ((S.hearts >= 3 && S.t > S.nearAt + 3.0) || S.t > 10)) {
            const spot = S.kind === 'spot'; self.endDuet();
            if (spot) { g.sleepy = false; g.task = TK.seq('rest', [TK.act('rest', 10 + self.r() * 10), TK.act('stretch', 4.6)]); }      // (side by side in the spot)
          }
          return false;
        }
      }
      return true;
    } };
  }
  // ---- a visit from the farmer (release 3: the geese's trust; farmlife.js visitGeese, main.js geeseVisit). V: { stage 0..3,
  // phase (what the farmer's up to: 'chase' (they square up to him), 'charge', 'wary', 'back', 'curious', 'friends', 'stroke'), farmer() {x, z}, inside (in
  // their field), corn() [x, z] where the corn lies (or null), gin [x, z] just inside the gate, front [x, z] where to meet
  // him (friends); set here: eaten (they've had the corn a while), settled (friends: up to him for the cuddle) }. Cross:
  // they come at him hissing and chase him out, then a victory parade by the gate. Wary: a hiss from afar, a long hard look,
  // and once he's stepped back, over for the corn. Curious: over for the corn at his feet, a look up at him, a soft honk.
  // Friends: over to meet him, up to him for a cuddle, necks stretched up, eyes shut happily. Hector with her all the way
  visit(V) {
    const [G, H] = this.geese;
    this.endDuet(); this.visitV = V; V.eaten = false; V.settled = false;
    this.calmBy = V.stage >= 2;                        // (curious, friends: they walk right up to the farmer)
    G.task = this.visitTask(V, true); H.task = this.visitTask(V, false);
  }
  endVisit() {
    if (!this.visitV) return;
    this.visitV = null; this.calmBy = false;
    for (const g of this.geese) if (g.task && g.task.name === 'visit') g.task = null;
  }
  // friends: over to (x, z) (inside their gate, the farmer outside it) to say hello: a honk, a wag, a look at him (face)
  greetAt(x, z, face) {
    const [G] = this.geese;
    if (this.guarding || this.visitV || this.duet || G.asleep || this.night(this.hour) || (G.task && /^(bed|guard|scold|morning|arrive|greet)/.test(G.task.name))) return false;
    G.task = TK.seq('greet', [this.wayTo(G, x, z, 'hurry', 20), TK.face(face), TK.act('honk', 2.4), TK.act('look', 3.5)]);
    return true;
  }
  // a way for g to (x, z) on the grass: a walk on her side of the streams, else into the water, across and up the bank
  wayTo(g, x, z, pace = 'walk', tmax = 60) {
    const reg = this.regionAt(x, z), wet = g.wet > 0.3 || this.pondAt(g.pos.x, g.pos.z)[0] < 1.0;
    if (!wet && this.regionAt(g.pos.x, g.pos.z) === reg) return TK.path(x, z, pace, tmax);
    const L = []; let at = [g.pos.x, g.pos.z];
    if (!wet) { const a = this.nearestWay(g.pos.x, g.pos.z); L.push(TK.path(a.out[0], a.out[1], pace), TK.straight(a.edge[0], a.edge[1], 'walk', true, 0.25), TK.straight(a.inn[0], a.inn[1], 'walk', true, 0.3)); at = a.inn; }
    const b = this.nearestWay(x, z, null, reg);
    this.swimTo(L, at, b.inn);
    L.push(TK.straight(b.edge[0], b.edge[1], 'walk', true, 0.2), TK.straight(b.out[0], b.out[1]), TK.act('shake', 1.2), TK.path(x, z, pace, tmax));
    return TK.seq('way', L);
  }
  visitTask(V, lead) {
    const self = this;
    return { name: 'visit', act: 'look', st: 0, stage: '', phase: null, way: null, eat: 0, run(g, dt) {
      if (self.visitV !== V) return true;
      const [G, H] = self.geese, F = V.farmer(), fx = F.x, fz = F.z, d = Math.hypot(fx - g.pos.x, fz - g.pos.z), toF = Math.atan2(fx - g.pos.x, fz - g.pos.z);
      const act = a => { if (g.act !== a) { g.act = a; g.actT = 0; } };
      const to = s => { this.stage = s; this.st = 0; this.way = null; };
      const go = (x, z, pace = 'walk', tol = 0.15) => {        // (there yet? on the way round by the water if need be)
        if (Math.hypot(x - g.pos.x, z - g.pos.z) < tol) return true;
        if (!this.way) this.way = self.wayTo(g, x, z, pace);
        if (!this.way.list) act(g.wet > 0.5 ? 'swim' : 'walk');
        if (this.way.run(g, dt) !== false) { this.way = null; return true; }
        return false;
      };
      const near = (x, z, r) => { const l = Math.hypot(g.pos.x - x, g.pos.z - z) || 1; return [x + (g.pos.x - x) / l * r, z + (g.pos.z - z) / l * r]; };      // (r from (x, z) on her side)
      const free = q => !self.nav || self.nav.freeAt(q[0], q[1]);
      if (V.phase !== this.phase) { this.phase = V.phase; to('go'); this.spot = null; }
      this.st += dt;
      if (!lead) return self.visitMate(g, G, V, dt, this, d, toF, act);
      switch (V.phase) {
        case 'chase':                                      // (over, a few steps off him: a hiss, wings up, and they stand their ground)
          if (this.stage === 'go') { if ((d < 3.0 && d > 1.6) || go(...near(fx, fz, d <= 1.6 ? 2.0 : 2.6), 'hurry', 0.3) || this.st > 10) to('hiss'); return false; }      // (a step back if he's right on them)
          if (d < 1.4 && this.st > 0.5) { to('go'); return false; }
          g.turnTo(toF, dt, 3); act('hiss'); ACT.hiss(g, this.st); if (this.st > 2.4) g.A.wingsGoal = 0.5 + 0.3 * Math.sin(this.st * 3);
          return false;
        case 'charge':                                     // (at him! he runs for the gate)
          if (this.stage === 'go') to('charge');
          if (this.stage === 'charge') {
            if (!V.inside) { to('gate'); return false; }
            let t = near(fx, fz, 1.05); if (!free(t)) t = near(V.gin[0], V.gin[1], 0.9);      // (never through the gate after him; never quite on him)
            if (Math.hypot(t[0] - g.pos.x, t[1] - g.pos.z) > 0.12 && d > 1.0) g.moveTo(t[0], t[1], dt, 'charge', true); else g.turnTo(toF, dt, 3);
            act('charge'); ACT.charge(g, this.st);
            return false;
          }
          if (this.stage === 'gate') {                       // (up to the gate, chests out, and a victory honk)
            if (Math.hypot(V.gin[0] - g.pos.x, V.gin[1] - g.pos.z) > 0.9 && this.st < 6) { g.moveTo(V.gin[0], V.gin[1], dt, 'strut'); act('parade'); ACT.parade(g, this.st); return false; }
            to('victory'); return false;
          }
          if (this.stage === 'victory') {
            g.turnTo(toF, dt, 2); act(this.st < 2 ? 'honk' : 'tada');
            if (this.st < 2) { ACT.parade(g, this.st + 2.2); g.A.honkGoal = 1; g.A.jawGoal = Math.sin(this.st * 8) > 0 ? 1 : 0.1; } else ACT.tada(g, this.st - 2);
            if (this.st > 5.5) { V.chased = true; return true; }
            return false;
          }
          return false;
        case 'wary':                                       // (well back from him: over if far off, a few steps away if too close)
          if (this.stage === 'go') { if ((d < 5 && d > 2.8) || go(...near(fx, fz, d < 2.8 ? 3.3 : 4), d < 2.8 ? 'hurry' : 'walk', 0.4) || this.st > 12) to('hiss'); return false; }
          if (this.stage === 'hiss') { g.turnTo(toF, dt, 3); act('hiss'); ACT.hiss(g, this.st); if (this.st > 1.6) to('watch'); return false; }
          g.turnTo(toF, dt, 2); act('look'); g.A.upGoal = 0.85; g.A.lookYawGoal = 0.12 * Math.sin(this.st * 0.7); g.A.tiltGoal = 0.15;      // (a long hard look)
          return false;
        case 'back': case 'curious': {
          const c = V.corn(); if (!c) { g.turnTo(toF, dt, 2); act('look'); ACT.look(g, this.st); return false; }
          const toC = Math.atan2(c[0] - g.pos.x, c[1] - g.pos.z);
          if (this.stage === 'go') {                         // (to the corn's far side from him)
            if (!this.spot) {
              const l = Math.hypot(c[0] - fx, c[1] - fz) || 1, q = [c[0] + (c[0] - fx) / l * 0.32, c[1] + (c[1] - fz) / l * 0.32]; this.spot = free(q) ? q : near(c[0], c[1], 0.32);
              // (wary: round him, well clear, if the way there passes close by him)
              const ax = g.pos.x, az = g.pos.z, bx = this.spot[0], bz = this.spot[1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((fx - ax) * dx + (fz - az) * dz) / L2));
              this.wp = null;
              if (V.phase === 'back' && Math.hypot(ax + dx * u - fx, az + dz * u - fz) < 1.4) { const mx = (ax + bx) / 2 - fx, mz = (az + bz) / 2 - fz, ml = Math.hypot(mx, mz) || 1, w = [fx + mx / ml * 1.9, fz + mz / ml * 1.9]; if (free(w)) this.wp = w; }
            }
            if (this.wp) { if (go(this.wp[0], this.wp[1], 'walk', 0.3)) { this.wp = null; this.way = null; } return false; }
            if (go(this.spot[0], this.spot[1], 'walk', 0.1)) to('eat'); return false;
          }
          g.turnTo(this.stage === 'look' ? toF : toC, dt, 2.2);
          if (this.stage === 'look') {                       // (curious: a look up at him, head on one side, a soft honk)
            act('look'); const A = g.A; A.upGoal = 0.7; A.tiltGoal = 0.38; A.lookPitchGoal = 0.1; A.wagGoal = 0.5;
            if (this.st > 0.7 && this.st < 1.2) { A.honkGoal = 0.45; A.jawGoal = 0.6; }
            if (this.st > 2.4) to('eat');
            return false;
          }
          act('graze'); ACT.graze(g, this.st); this.eat += dt;
          if (this.eat > 7) V.eaten = true;
          if (V.phase === 'curious' && !this.looked && this.eat > 3.5) { this.looked = true; to('look'); }
          return false;
        }
        case 'friends': case 'stroke': {
          const f = V.front;
          if (this.stage === 'go') { if (go(f[0], f[1], 'hurry', 0.12)) to('wait'); else { g.A.wagGoal = 0.6; } return false; }
          g.turnTo(toF, dt, 2.4);
          const A = g.A;
          if (V.phase === 'stroke') { act('look'); A.upGoal = 1; A.squintGoal = 0.85; A.lookPitchGoal = -0.25; A.tiltGoal = 0.22 * Math.sin(this.st * 0.9); A.wagGoal = 0.7; return false; }      // (eyes shut happily, necks up to his hand)
          act('look'); A.upGoal = 0.8; A.wagGoal = 1; A.tailUpGoal = 0.4;
          if (this.st > 0.3 && this.st < 0.9) { A.honkGoal = 0.6; A.jawGoal = Math.sin(this.st * 14) > 0 ? 0.8 : 0.1; }      // (a happy hello)
          V.settled = d < 1.05;
          return false;
        }
      }
      return false;
    } };
  }
  // Hector on a visit: after her while she's on her way; once she's there, beside her (his side of her), doing as she does
  visitMate(h, G, V, dt, T, d, toF, act) {
    const Gt = G.task && G.task.name === 'visit' ? G.task : null;
    if (!Gt) return true;
    if (V.phase === 'charge' && Gt.stage === 'charge') {     // (charging at him too, beside her)
      const fx = V.farmer().x, fz = V.farmer().z, l = d || 1, side = ((h.pos.x - G.pos.x) * Math.cos(toF) - (h.pos.z - G.pos.z) * Math.sin(toF)) >= 0 ? 1 : -1;
      let t = [fx - (fx - h.pos.x) / l * 0.8 + Math.cos(toF) * side * 0.5, fz - (fz - h.pos.z) / l * 0.8 - Math.sin(toF) * side * 0.5];
      if (this.nav && !this.nav.freeAt(t[0], t[1])) t = [h.pos.x, h.pos.z];
      if (Math.hypot(t[0] - h.pos.x, t[1] - h.pos.z) > 0.12 && d > 1.0) h.moveTo(t[0], t[1], dt, 'charge', true); else h.turnTo(toF, dt, 3);
      act('charge'); ACT.charge(h, T.st); return false;
    }
    if ((V.phase === 'wary' || V.phase === 'back') && d < 1.3 && h.wet < 0.3) {      // (wary: never close to him; a few steps off if he is)
      const F = V.farmer(), l = d || 1, t = [F.x + (h.pos.x - F.x) / l * 1.7, F.z + (h.pos.z - F.z) / l * 1.7];
      if (this.clearWalk(h.pos.x, h.pos.z, t[0], t[1])) { h.moveTo(t[0], t[1], dt, 'hurry'); act('walk'); return false; }
    }
    const moving = G.vs > 0.06 || /^(go|gate)$/.test(Gt.stage) || G.wet > 0.3;
    if (moving || Math.hypot(h.pos.x - G.pos.x, h.pos.z - G.pos.z) > 1.4) { T.side = null; this.follow(h, dt, this.hour); return false; }
    // beside her: on his side of her, a little back
    if (!T.side) {                                         // (never right on the farmer: a step clear of him)
      const fx = Math.sin(G.heading), fz = Math.cos(G.heading), sd = ((h.pos.x - G.pos.x) * fz - (h.pos.z - G.pos.z) * fx) >= 0 ? 1 : -1, F = V.farmer();
      for (const s of [sd, -sd]) { const x = G.pos.x + fz * s * 0.55 - fx * 0.12, z = G.pos.z - fx * s * 0.55 - fz * 0.12; if (!T.side && this.clearWalk(h.pos.x, h.pos.z, x, z) && this.pondAt(x, z)[0] > 1.2 && Math.hypot(x - F.x, z - F.z) > 0.8) T.side = [x, z]; }
      if (!T.side) T.side = [h.pos.x, h.pos.z];
      T.sideT = 0;
    }
    if (Math.hypot(T.side[0] - h.pos.x, T.side[1] - h.pos.z) > 0.08 && (T.sideT += dt) < 5) { h.moveTo(T.side[0], T.side[1], dt, 'walk'); act('walk'); return false; }
    // as she does: hissing, a hard look, grazing the corn, looking up at him, a hello, a stroke
    const a = G.act, u = h.actT;
    if (Gt.stage === 'eat' || a === 'graze') { act('graze'); h.turnTo(G.heading, dt, 2); ACT.graze(h, u + 1.3); return false; }
    h.turnTo(toF, dt, 2.2);
    if (a === 'hiss') { act('hiss'); ACT.hiss(h, u); return false; }
    if (a === 'honk' || a === 'tada') { act(a); ACT[a](h, u); return false; }
    act('look'); const A = h.A, B = G.A; A.upGoal = B.upGoal; A.squintGoal = B.squintGoal; A.lookPitchGoal = B.lookPitchGoal; A.tiltGoal = -B.tiltGoal; A.wagGoal = B.wagGoal; A.tailUpGoal = B.tailUpGoal;
    return false;
  }
  // the little things they squabble over: a snail on the grass (a slow crawl), a puddle (it soaks away after)
  prop(kind, at, on) {
    if (kind === 'spot') return;
    let m = this.props[kind];
    if (!m && on) {
      if (kind === 'puddle') {
        m = new THREE.Mesh(new THREE.CircleGeometry(0.21, 28), new THREE.MeshStandardMaterial({ color: '#86b7d4', roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.85, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.scale.set(1.25, 0.85, 1); m.renderOrder = 1;
      } else {
        m = new THREE.Group();
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: '#a2703f', roughness: 0.6 }));
        shell.scale.set(0.8, 1, 1); shell.position.set(0, 0.032, -0.006);
        const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0045, 8, 20), new THREE.MeshStandardMaterial({ color: '#d9b27a', roughness: 0.6 }));
        swirl.rotation.y = Math.PI / 2; swirl.position.set(0.025, 0.034, -0.006); const swirl2 = swirl.clone(); swirl2.position.x = -0.025;
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.07, 4, 10), new THREE.MeshStandardMaterial({ color: '#cdbf8e', roughness: 0.4 }));
        body.rotation.x = Math.PI / 2; body.position.set(0, 0.011, 0.012);
        m.add(shell, swirl, swirl2, body);
        for (const sd of [-1, 1]) {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0028, 0.03, 6), body.material); st.position.set(sd * 0.007, 0.03, 0.052); st.rotation.x = 0.5;
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshStandardMaterial({ color: '#2a241c' })); eye.position.set(sd * 0.007, 0.044, 0.06);
          m.add(st, eye);
        }
      }
      this.props[kind] = m; this.group.add(m);
    }
    if (!m) return;
    m.visible = on; m.userData.t = 0; m.userData.fade = !on && kind === 'puddle';
    if (on) { m.position.set(at[0], kind === 'puddle' ? 0.012 : 0, at[1]); if (kind === 'snail') m.rotation.y = this.r() * 6.28; else m.material.opacity = 0.85; }
    if (!on && kind === 'puddle') m.visible = true;                // (it soaks away)
  }
  tickProps(dt) {
    const sn = this.props.snail, pd = this.props.puddle;
    if (sn && sn.visible) { sn.position.x += Math.sin(sn.rotation.y) * 0.008 * dt; sn.position.z += Math.cos(sn.rotation.y) * 0.008 * dt; }
    if (pd && pd.visible && pd.userData.fade) { pd.material.opacity -= dt * 0.25; if (pd.material.opacity <= 0) { pd.visible = false; pd.userData.fade = false; } }
  }
  // Biscuit creeping up on them with his herding stare (dog.js): Gertrude turns on him, hisses with her wings up and honks,
  // Hector honks along; he bounces off
  teasedBy(d) {
    const [G, H] = this.geese;
    if (this.guarding || G.asleep || G.wet > 0.1 || this.visitV) return;          // (not while the farmer's visiting)
    const toD = g => Math.atan2(d.pos.x - g.pos.x, d.pos.z - g.pos.z);
    G.task = TK.seq('scold', [TK.face(toD(G)), TK.act('scold', 1.9), TK.act('honk', 1.6), TK.act('look', 1)]);
    if (!H.asleep && H.wet < 0.1) H.task = TK.seq('backoff', [TK.act('look', 0.5), TK.face(toD(H)), TK.act('honk', 2.2), TK.act('look', 1)]);
    this.scoldOk = Math.max(this.scoldOk, 25); this.teased = (this.teased || 0) + 1;
  }
  ripple(x, z) {
    let rp = this.ripples.find(o => !o.visible);
    if (!rp) {
      if (this.ripples.length >= 14) return;
      rp = new THREE.Mesh(this.rippleGeo, new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, depthWrite: false, opacity: 0 }));
      rp.renderOrder = 2; rp.material.userData.noGrade = true; this.group.add(rp); this.ripples.push(rp);
    }
    rp.position.set(x, 0.011, z); rp.userData.t = 0; rp.visible = true; rp.scale.setScalar(0.2);
  }
  centre(v) { return v.set((this.geese[0].pos.x + this.geese[1].pos.x) / 2, 0, (this.geese[0].pos.z + this.geese[1].pos.z) / 2); }
}

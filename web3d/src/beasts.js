// The farm's animals that aren't chickens. First the fox family: Rusty (dad), Fennel (mum) and their three cubs, who live in
// a den at the edge of the woods and come out now and then to play in the meadow: the cubs chase and wrestle and chase their
// own tails and the butterflies, dad listens for mice and pounces nose-first into the grass, mum keeps an eye on everyone.
// Models (beasts.glb / beasts.json, stylized/beasts.py, export_beasts.py): one skinned mesh each with vertex colours, fur
// regions and bones (root, hips, chest, neck, head, three in the tail, two in each leg); furred here with the birds' fur.
import * as THREE from 'three';
import { addFur, R, furMaterial, furHooks } from './birds.js';

let MODELS = {};
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
  fox: { len: { [R.body]: 0.024, [R.crest]: 0.007, [R.tail]: 0.05, [R.legfeather]: 0.008 }, shells: 10, droop: 0.15, clump: 0.45, fine: 1.0, wave: 0.35,
         comb: 0.8, under: 0.5, face: 0.7, locks: 0.07 },
  cub: { len: { [R.body]: 0.019, [R.crest]: 0.007, [R.tail]: 0.03, [R.legfeather]: 0.009 }, shells: 10, droop: 0.15, clump: 0.3, fine: 1.05, wave: 0.6,
         comb: 0.55, under: 0.9, face: 0.6, locks: 0.045 },
};
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
  g = addFur(g, src, FUR[name], M.piv.headc);
  return (M.built = g);
}

const PARENT = { hips: 'root', chest: 'hips', neck: 'chest', head: 'neck', tail1: 'hips', tail2: 'tail1', tail3: 'tail2',
  FLu: 'chest', FLl: 'FLu', FRu: 'chest', FRl: 'FRu', HLu: 'hips', HLl: 'HLu', HRu: 'hips', HRl: 'HRu' };
const LEGS = ['FL', 'FR', 'HL', 'HR'];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = x => Math.min(1, Math.max(0, x));

// A four-legged animal's body and bones, posed from a few numbers (as the birds' Rig): the actor sets the gait and what it's
// doing (sitting, lying, a play bow, rearing up to box, rolling over, the pounce in the air, nose-down in the grass...)
export class Quad {
  constructor(name, joints) {
    const M = MODELS[name], P = M.piv;
    this.name = name; this.S = name === 'cub' ? 0.56 : 1.0; this.hy = P.hips[1];
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
    this.tailV = 0; this.tailA = 0;
  }
  pose(s) {
    const B = this.bones, S = this.S, t = s.t, hy = this.hy;
    for (const nm in B) { B[nm].rotation.set(0, 0, 0); B[nm].position.copy(this.rest[nm]); }
    const g = s.walk || 0, run = s.run || 0, ph = s.phase || 0;
    const sit = s.sit || 0, lie = s.lie || 0, bow = s.bow || 0, rear = s.rear || 0, crouch = s.crouch || 0, air = s.air || 0, dive = s.dive || 0;
    const shake = s.shake || 0, scratch = s.scratch || 0, kick = s.kick || 0;
    // ---- legs: a trot (diagonal pairs) blending into a bounding gallop
    const offs = { FL: 0, HR: 0, FR: Math.PI, HL: Math.PI }, goffs = { FL: 0, FR: 0.55, HL: Math.PI, HR: Math.PI + 0.55 };
    const amp = (0.4 * g) * (1 - run) + 0.8 * run;
    for (const L of LEGS) {
      const front = L[0] === 'F', a = ph + offs[L] * (1 - run) + goffs[L] * run, sw = Math.sin(a), lift = Math.max(0, Math.cos(a));
      const U = B[L + 'u'], Lo = B[L + 'l'];
      U.rotation.x = -amp * sw;
      Lo.rotation.x = front ? (0.75 * g * (1 - run) + 1.2 * run) * lift : -(0.5 * g * (1 - run) + 0.9 * run) * lift;
    }
    // ---- the body over its legs
    let lower = 0;                                                    // how far the middle comes down
    lower += crouch * 0.11 * S;
    // crouched: legs folded like a spring, head low and forward, tail low
    for (const L of LEGS) {
      const front = L[0] === 'F';
      B[L + 'u'].rotation.x += crouch * (front ? -0.55 : 0.45); B[L + 'l'].rotation.x += crouch * (front ? 1.05 : -0.95);
    }
    B.neck.rotation.x += 0.35 * crouch; B.head.rotation.x -= 0.25 * crouch; B.tail1.rotation.x += 0.25 * crouch;
    // sitting: the hips go down and the body pitches up round them; the hind legs fold under, the front legs stay upright
    if (sit > 0) {
      B.hips.rotation.x -= 0.72 * sit; lower += 0.15 * S * sit;
      B.HLu.rotation.x += -0.75 * sit; B.HRu.rotation.x += -0.75 * sit; B.HLl.rotation.x += 1.7 * sit; B.HRl.rotation.x += 1.7 * sit;
      B.FLu.rotation.x += 0.72 * sit; B.FRu.rotation.x += 0.72 * sit;
      B.neck.rotation.x += 0.3 * sit; B.head.rotation.x += 0.25 * sit;
      B.tail1.rotation.x += 1.05 * sit; B.tail2.rotation.y += 0.5 * sit; B.tail3.rotation.y += 0.5 * sit;
    }
    // lying down: the body on the ground, front legs stretched out in front, hind legs folded, the brush curled round
    if (lie > 0) {
      lower += (hy - 0.115 * S) * lie;
      B.FLu.rotation.x += -1.42 * lie; B.FRu.rotation.x += -1.42 * lie; B.FLl.rotation.x += 0.12 * lie; B.FRl.rotation.x += 0.12 * lie;
      B.HLu.rotation.x += -1.15 * lie; B.HRu.rotation.x += -1.15 * lie; B.HLl.rotation.x += 2.0 * lie; B.HRl.rotation.x += 2.0 * lie;
      B.tail1.rotation.x += 0.45 * lie; B.tail1.rotation.y += 1.0 * lie; B.tail2.rotation.y += 0.8 * lie; B.tail3.rotation.y += 0.6 * lie;
      B.neck.rotation.x += (s.chin || 0) * 0.5;
    }
    // a play bow: front down on the elbows, rump up, tail up and wagging
    if (bow > 0) {
      B.chest.rotation.x += 0.42 * bow; lower += 0.02 * S * bow; B.hips.rotation.x -= 0.12 * bow;
      B.FLu.rotation.x += -1.15 * bow; B.FRu.rotation.x += -1.15 * bow; B.FLl.rotation.x += 0.2 * bow; B.FRl.rotation.x += 0.2 * bow;
      B.neck.rotation.x -= 0.5 * bow; B.head.rotation.x -= 0.2 * bow; B.tail1.rotation.x -= 0.75 * bow;
    }
    // rearing up on the hind legs to box: upright, front paws batting
    if (rear > 0) {
      B.hips.rotation.x -= 1.05 * rear; B.HLu.rotation.x += 0.85 * rear; B.HRu.rotation.x += 0.85 * rear; B.HLl.rotation.x -= 0.2 * rear; B.HRl.rotation.x -= 0.2 * rear;
      const bat = s.paw || 0;
      B.FLu.rotation.x += -0.65 * rear + 0.55 * bat * Math.sin(t * 9); B.FRu.rotation.x += -0.65 * rear + 0.55 * bat * Math.sin(t * 9 + 2.2);
      B.FLl.rotation.x += 0.7 * rear; B.FRl.rotation.x += 0.7 * rear;
      B.neck.rotation.x += 0.55 * rear; B.head.rotation.x += 0.45 * rear; B.tail1.rotation.x += 0.4 * rear;
    }
    // in the air (the pounce): front legs reaching forward and down, hind legs stretched back, brush streaming out behind
    if (air > 0) {
      B.FLu.rotation.x += -0.95 * air; B.FRu.rotation.x += -0.95 * air; B.FLl.rotation.x += -0.15 * air; B.FRl.rotation.x += -0.15 * air;
      B.HLu.rotation.x += 0.95 * air; B.HRu.rotation.x += 0.95 * air; B.HLl.rotation.x += 0.35 * air; B.HRl.rotation.x += 0.35 * air;
      B.tail1.rotation.x -= 0.3 * air;
    }
    // nose-down in the grass after a pounce: hind end up, legs dangling, the brush waving in the air
    if (dive > 0) {
      B.FLu.rotation.x += -0.35 * dive; B.FRu.rotation.x += -0.35 * dive;
      B.HLu.rotation.x += -0.45 * dive + 0.25 * dive * Math.sin(t * 7); B.HRu.rotation.x += -0.45 * dive + 0.25 * dive * Math.sin(t * 7 + 1.6);
      B.neck.rotation.x += 0.35 * dive; B.tail1.rotation.x -= 0.95 * dive;
    }
    // a scratch behind the ear with a hind foot (sitting)
    if (scratch > 0) {
      B.HRu.rotation.x += -1.0 * scratch; B.HRl.rotation.x += -0.35 * scratch + 0.35 * scratch * Math.sin(t * 30); B.HRu.rotation.z += 0.25 * scratch;
      B.head.rotation.z += -0.4 * scratch; B.neck.rotation.y += -0.3 * scratch;
    }
    // on its back, kicking (wrestling, playing dead)
    if (kick > 0) for (const [i, L] of LEGS.entries()) { B[L + 'u'].rotation.x += kick * (0.4 * Math.sin(t * 11 + i * 1.9) - 0.3); B[L + 'l'].rotation.x += kick * 0.5 * Math.sin(t * 13 + i); }
    // ---- head, look and listen (a tilt of the head, as foxes do hearing a mouse)
    B.neck.rotation.y += 0.55 * (s.lookYaw || 0); B.head.rotation.y += 0.45 * (s.lookYaw || 0);
    B.neck.rotation.x += 0.45 * (s.lookPitch || 0); B.head.rotation.x += 0.35 * (s.lookPitch || 0);
    B.head.rotation.z += s.headTilt || 0;
    // ---- the brush: on a spring, swinging out on turns and with each step, a wag when playing, up when excited
    const goal = -(s.turn || 0) * 0.22 + (s.wag || 0) * 0.55 * Math.sin(t * 13) + 0.08 * g * Math.sin(ph);
    const dt = Math.min(0.05, s.dt || 1 / 30);
    this.tailV += ((goal - this.tailA) * 55 - this.tailV * 6) * dt; this.tailA += this.tailV * dt;
    B.tail1.rotation.y += this.tailA; B.tail2.rotation.y += this.tailA * 0.7; B.tail3.rotation.y += this.tailA * 0.5;
    B.tail1.rotation.x += -(s.tailUp || 0) * 0.7 + 0.04 * Math.sin(t * 1.3);
    // ---- the shake (nose to tail, as after a dive in wet grass)
    let roll = s.roll || 0, pitch = s.pitch || 0;
    if (shake > 0) { roll += 0.22 * shake * Math.sin(t * 36); B.head.rotation.z += 0.45 * shake * Math.sin(t * 36 + 1.2); B.tail1.rotation.y += 0.6 * shake * Math.sin(t * 36 + 2.4); }
    // breathing, and the step's bob
    lower -= 0.004 * S * Math.sin(t * 2.2) * (1 - g);
    lower += (0.006 * g * (1 - run) * Math.cos(2 * ph) + 0.022 * run * Math.max(0, Math.sin(ph))) * S * -1;
    B.hips.rotation.x += 0.1 * run * Math.sin(ph); B.chest.rotation.x -= 0.16 * run * Math.sin(ph);
    // ---- the whole body: rolled onto its side or back, pitched (nose-dive, leaping), lifted (in the air)
    const rolled = Math.min(1, Math.abs(roll) / 1.5);
    let cy = hy - lower;
    cy = cy * (1 - rolled) + (0.12 * S + 0.02 * S * Math.min(1, Math.max(0, Math.abs(roll) - 1.6))) * rolled;
    cy = cy * (1 - dive) + 0.26 * S * dive;
    this.tilt.position.y = cy + (s.lift || 0);
    this.tilt.rotation.set(pitch + 1.1 * dive, 0, roll);
  }
}

// ---------------------------------------------------------------- the fox family
const NAMES = { dad: 'Rusty', mum: 'Fennel', cubs: ['Sorrel', 'Nutkin', 'Tumble'] };
let blobTex = null;
function shadowDisc(r) {
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
    this.A = { t: r() * 10, phase: 0 }; this.heading = 0; this.turn = 0;
    this.todo = []; this.task = null; this.pace = 0; this.home = true;
    this.hitR = 0.3 * this.q.S * scale; this.hitY = 0.32 * this.q.S * scale;
    this.label = name + (kind === 'cub' ? ' · fox cub' : role === 'dad' ? ' · red fox, the dad' : ' · red fox, the mum');
  }
  get pos() { return this.root.position; }
  // turn towards a heading at the fox's own turning speed
  turnTo(h, dt, rate = 4.5) {
    let d = h - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    const step = Math.max(-rate * dt, Math.min(rate * dt, d)); this.heading += step; this.turn = step / Math.max(1e-3, dt);
    return Math.abs(d);
  }
  // a step towards (x, z) at a pace: 'walk' 0.35 m/s, 'trot' 0.7, 'run' 1.7 (cubs a little slower); true when there
  moveTo(x, z, dt, pace = 'trot') {
    const p = this.pos, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    const sp = { walk: 0.35, trot: 0.75, run: 1.8 }[pace] * (this.kind === 'cub' ? 0.82 : 1) * this.scale;
    if (d < 0.06) { this.pace = 0; return true; }
    const off = this.turnTo(Math.atan2(dx, dz), dt, pace === 'run' ? 6 : 4.5);
    const s = Math.min(d, sp * dt * (off > 1.2 ? 0.25 : 1));
    p.x += Math.sin(this.heading) * s; p.z += Math.cos(this.heading) * s;
    this.pace = pace === 'run' ? 2 : pace === 'trot' ? 1 : 0.5;
    return false;
  }
  update(dt) {
    const A = this.A; A.t += dt; A.dt = dt;
    for (const k of ['sit', 'lie', 'bow', 'rear', 'crouch', 'air', 'dive', 'shake', 'scratch', 'kick', 'paw', 'wag', 'tailUp', 'chin']) A[k + 'Goal'] = 0;
    A.lookYawGoal = 0; A.lookPitchGoal = 0; A.headTiltGoal = 0; A.roll = A.roll || 0; A.rollGoal = 0; A.pitch = 0; A.lift = 0;
    this.pace = 0; this.turn = 0;
    if (!this.task) this.task = this.todo.shift() || this.fam.nextTask(this);
    if (this.task && this.task.run(this, dt) !== false) { this.task = null; }
    // ease the pose numbers towards their goals (the gait from the pace)
    const ease = (k, rate) => { A[k] = (A[k] || 0) + ((A[k + 'Goal'] || 0) - (A[k] || 0)) * Math.min(1, dt * rate); };
    for (const k of ['sit', 'lie', 'bow', 'rear', 'crouch', 'shake', 'scratch', 'kick', 'paw', 'wag', 'tailUp', 'chin']) ease(k, 6);
    ease('air', 14); ease('dive', 10); ease('lookYaw', 4); ease('lookPitch', 4); ease('headTilt', 6);
    A.roll += (A.rollGoal - A.roll) * Math.min(1, dt * (A.rollFast ? 9 : 4));
    const walkGoal = this.pace > 0 ? Math.min(1, this.pace) : 0, runGoal = this.pace >= 2 ? 1 : 0;
    A.walk = (A.walk || 0) + (walkGoal - (A.walk || 0)) * Math.min(1, dt * 8);
    A.run = (A.run || 0) + (runGoal - (A.run || 0)) * Math.min(1, dt * 5);
    const stride = (0.5 * (1 - A.run) + 1.0 * A.run) * this.q.S * this.scale;
    const speed = this.pace >= 2 ? 1.8 : this.pace >= 1 ? 0.75 : this.pace > 0 ? 0.35 : 0;
    A.phase += dt * (speed * (this.kind === 'cub' ? 0.82 : 1) * this.scale / Math.max(0.05, stride)) * Math.PI * 2;
    A.turn = this.turn;
    this.root.rotation.y = this.heading;
    if (this.root.visible) this.q.pose(A);
    // the shadow: under the body, smaller while in the air
    this.shadow.position.set(this.pos.x, 0.013, this.pos.z); this.shadow.rotation.y = this.heading;
    const k = 1 - 0.4 * clamp01((A.lift || 0) / 0.4); this.shadow.scale.set(k, 1, k); this.shadow.visible = this.root.visible;
  }
}

// a task: run(fox, dt) returns false while it goes on; tasks keep their own time
const T = {
  go: (x, z, pace = 'trot', end) => ({ name: 'go', run(f, dt) { const done = f.moveTo(x, z, dt, pace); f.A.wagGoal = pace === 'run' ? 0.3 : 0; f.A.tailUpGoal = pace === 'run' ? 0.3 : 0; if (done && end !== undefined) return f.turnTo(end, dt) < 0.05 ? true : false; return done ? true : false; } }),
  wait: (secs, set) => ({ name: 'wait', t: 0, run(f, dt) { this.t += dt; if (set) set(f, this.t, dt); return this.t >= secs ? true : false; } }),
};
function look(f, t) { f.A.lookYawGoal = 0.7 * Math.sin(t * 0.7 + f.A.t * 0.13); f.A.lookPitchGoal = 0.15 * Math.sin(t * 0.5); }

export class FoxFamily {
  // opts: { den: [x, z, heading of its entrance], field: [x, z, radius], joints }
  constructor(scene, opts, r) {
    this.scene = scene; this.r = r; this.joints = opts.joints;
    this.den = opts.den; this.field = opts.field;
    this.group = new THREE.Group(); scene.add(this.group);
    this.foxes = [
      new Fox(this, 'fox', NAMES.dad, 'dad', 1.0, r),
      new Fox(this, 'fox', NAMES.mum, 'mum', 0.92, r),
      ...NAMES.cubs.map((n, i) => new Fox(this, 'cub', n, 'cub', 1 - i * 0.05, r)),
    ];
    this.out = false; this.leaving = false; this.next = opts.firstIn ?? 12; this.left = 0;
    this.butterfly = makeButterfly(); this.group.add(this.butterfly.mesh);
    for (const f of this.foxes) this.hide(f);
  }
  hide(f) { f.root.visible = false; f.shadow.visible = false; f.home = true; f.todo = []; f.task = null; }
  doorway(f) { const [x, z, h] = this.den; return [x + Math.sin(h) * 0.35, z + Math.cos(h) * 0.35, h]; }
  // out of the den: rising out of the hole one by one, then off to the meadow
  comeOut() {
    this.out = true; this.leaving = false; this.left = 300 + this.r() * 120;
    const [x, z, h] = this.den;
    this.foxes.forEach((f, i) => {
      f.home = false; f.todo = []; f.task = null;
      f.pos.set(x - Math.sin(h) * 0.05, 0, z - Math.cos(h) * 0.05); f.heading = h; f.root.visible = false;
      f.todo.push(T.wait(i * 1.4 + (f.role === 'dad' ? 0 : 0.6)), {
        name: 'emerge', t: 0, run(f, dt) {
          this.t += dt; f.root.visible = true; f.A.liftGoal = 0;
          f.A.lift = -0.5 * f.q.S * (1 - smooth(0, 0.9, this.t)); f.moveTo(x + Math.sin(h) * 0.6, z + Math.cos(h) * 0.6, dt, 'walk');
          return this.t > 1.0 ? true : false;
        } });
      const [fx, fz, fr] = this.field, a = this.r() * Math.PI * 2, rr = fr * (0.3 + 0.4 * this.r());
      f.todo.push(T.go(fx + Math.cos(a) * rr, fz + Math.sin(a) * rr, f.kind === 'cub' ? 'run' : 'trot'));
    });
  }
  goHome() {
    this.leaving = true;
    const [x, z, h] = this.den;
    this.foxes.forEach((f, i) => {
      f.todo = []; f.task = null;
      const [dx, dz] = this.doorway(f);
      f.todo.push(T.wait(f.role === 'mum' ? 0 : 0.8 + i * 0.4), T.go(dx, dz, f.kind === 'cub' ? 'run' : 'trot'), {
        name: 'in', t: 0, run(f, dt) { this.t += dt; f.turnTo(h + Math.PI, dt); f.moveTo(x, z, dt, 'walk'); f.A.lift = -0.5 * f.q.S * smooth(0.2, 1.1, this.t); if (this.t > 1.2) { f.fam.hide(f); return true; } return false; } });
    });
  }
  // what a fox does next, by who it is
  nextTask(f) {
    if (f.home || this.leaving) return T.wait(1);
    const r = this.r(), [fx, fz, fr] = this.field;
    const spot = (k = 0.8) => { const a = this.r() * Math.PI * 2, d = fr * k * Math.sqrt(this.r()); return [fx + Math.cos(a) * d, fz + Math.sin(a) * d]; };
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
    if (r < 0.5) return tailChase(2.2 + this.r() * 1.5);
    if (r < 0.62) return butterflyHunt(this);
    if (r < 0.72) { const m = others.find(o => o.role === 'mum'); if (m) return pounceOn(m); }
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
    // keep a little room between them (not while wrestling or chasing up close)
    for (const a of this.foxes) for (const b of this.foxes) {
      if (a === b || a.home || b.home || (a.task && a.task.close) || (b.task && b.task.close)) continue;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), m = 0.28 * (a.q.S + b.q.S);
      if (d > 1e-3 && d < m) { const k = (m - d) * 0.5 * Math.min(1, dt * 6) / d; a.pos.x -= dx * k; a.pos.z -= dz * k; b.pos.x += dx * k; b.pos.z += dz * k; }
    }
  }
  visible() { return this.out && this.foxes.some(f => f.root.visible); }
  centre(v) { let n = 0; v.set(0, 0, 0); for (const f of this.foxes) if (f.root.visible) { v.add(f.pos); n++; } if (n) v.multiplyScalar(1 / n); else v.set(this.field[0], 0, this.field[1]); return v; }
  // a tap on a fox: its name, and a little reaction (a hop of surprise and a play bow)
  tapped(f) { f.todo.unshift(seq(hop(), bowAt(null, 1.2))); if (f.task && !f.task.pair) f.task = null; }
}

// ---------------------------------------------------------------- what they do
function seq(...tasks) { return { name: 'seq', i: 0, pair: tasks.some(t => t.pair), run(f, dt) { while (this.i < tasks.length) { if (tasks[this.i].run(f, dt) === false) return false; this.i++; } return true; } }; }
function sitWatch(secs, groom) {
  return T.wait(secs, (f, t) => { f.A.sitGoal = 1; look(f, t); if (groom && t > secs * 0.6) { f.A.lookPitchGoal = 0.6; f.A.lookYawGoal = 0.9; } if (!groom && t > 1.5 && t < 2.6 && f.r && (f.A.t % 7) < 3) f.A.scratchGoal = 1; });
}
function lieDown(secs) { return T.wait(secs, (f, t) => { f.A.lieGoal = 1; f.A.chinGoal = t > 2 ? 1 : 0; if (t < 2) look(f, t); }); }
// the mouse pounce: listen (head tilted one way, then the other), crouch, spring up high and dive nose-first into the grass,
// stay stuck a moment with the brush waving, pop out and shake. Usually nothing caught
function mousePounce() {
  return { name: 'pounce', t: 0, run(f, dt) {
    const A = f.A, S = f.q.S * f.scale; this.t += dt; const t = this.t;
    if (t < 1.6) { A.headTiltGoal = t < 0.8 ? 0.38 : -0.38; A.lookPitchGoal = 0.45; A.crouchGoal = 0.25; A.tailUpGoal = 0.1; return false; }
    if (t < 2.1) { A.crouchGoal = 1; A.lookPitchGoal = 0.3; A.headTiltGoal = 0; return false; }
    if (t < 2.85) {                                   // up and over: a high arc, landing nose-first
      const u = (t - 2.1) / 0.75;
      A.lift = Math.sin(u * Math.PI) * 0.62 * S; A.airGoal = 1; A.air = Math.max(A.air || 0, 0.6);
      A.pitch = -0.7 + 2.0 * smooth(0.15, 0.9, u);
      f.pos.x += Math.sin(f.heading) * dt * 0.9 * S; f.pos.z += Math.cos(f.heading) * dt * 0.9 * S;
      return false;
    }
    if (t < 4.3) { A.diveGoal = 1; A.dive = Math.max(A.dive || 0, 0.7); return false; }      // stuck nose-down in the grass
    if (t < 4.6) { A.lift = 0.05 * S * Math.sin((t - 4.3) / 0.3 * Math.PI); return false; }
    if (t < 5.4) { A.shakeGoal = 1; return false; }
    if (t < 6.2) { A.sitGoal = 0.6; A.headTiltGoal = 0.25; return false; }                    // "hm. Nothing."
    return true;
  } };
}
function hop() { return { name: 'hop', t: 0, run(f, dt) { this.t += dt; f.A.lift = Math.sin(clamp01(this.t / 0.45) * Math.PI) * 0.16 * f.q.S; f.A.airGoal = 0.4; return this.t > 0.5; } }; }
function bowAt(o, secs = 1.4) { return { name: 'bow', t: 0, run(f, dt) { this.t += dt; if (o) f.turnTo(Math.atan2(o.pos.x - f.pos.x, o.pos.z - f.pos.z), dt); f.A.bowGoal = 1; f.A.wagGoal = 1; f.A.tailUpGoal = 0.6; return this.t > secs; } }; }
// chasing its own tail, round and round, then a wobbly sit
function tailChase(secs) {
  return { name: 'tailchase', t: 0, run(f, dt) {
    this.t += dt; const A = f.A;
    if (this.t < secs) { f.heading += dt * 7.5; f.turn = 7.5; f.pace = 1; A.lookYawGoal = 1.2; A.tailUpGoal = 0.2; A.wagGoal = 0.4; return false; }
    if (this.t < secs + 1.6) { A.sitGoal = 1; A.headTiltGoal = 0.35 * Math.sin(this.t * 9); A.lookYawGoal = 0.4 * Math.sin(this.t * 5); return false; }
    return true;
  } };
}
// a chase: one cub runs off in a loop round the meadow, the other after it; at the end they bump and roll
function chase(fam, a, b) {
  const [fx, fz, fr] = fam.field, a0 = fam.r() * Math.PI * 2, dir = fam.r() < 0.5 ? 1 : -1, len = 5 + fam.r() * 3;
  const shared = { t: 0, cancel: false };
  const lead = { name: 'lead', pair: true, close: true, run(f, dt) {
    shared.t += dt; if (shared.t > len || shared.cancel) return true;
    const ang = a0 + dir * shared.t * 0.75, rr = fr * (0.55 + 0.2 * Math.sin(shared.t * 1.3));
    f.moveTo(fx + Math.cos(ang) * rr, fz + Math.sin(ang) * rr, dt, 'run'); f.A.tailUpGoal = 0.5; return false;
  } };
  const follow = { name: 'follow', pair: true, close: true, t: 0, run(f, dt) {
    this.t += dt; if (this.t > len + 0.3 || shared.cancel) return true;
    const behind = 0.34 * f.q.S * 2;
    f.moveTo(a.pos.x - Math.sin(a.heading) * behind, a.pos.z - Math.cos(a.heading) * behind, dt, 'run'); f.A.tailUpGoal = 0.6; return false;
  } };
  b.todo = [follow, roll(1.6, 0.9)]; b.task = null;
  return seq(lead, roll(1.2, 0.6));
}
// a quick tumble: running, then head over heels sideways, then sitting up a bit dazed
function roll(secs, delay = 0) {
  return { name: 'roll', t: 0, close: true, run(f, dt) {
    this.t += dt; const A = f.A, t = this.t - delay;
    if (t < 0) return false;
    if (t < 0.7) { A.rollFast = true; A.rollGoal = 2.9; A.kickGoal = 1; return false; }
    if (t < secs) { A.rollGoal = 2.9; A.kickGoal = 1; return false; }
    if (t < secs + 0.6) { A.rollFast = true; A.rollGoal = 0; return false; }
    A.rollFast = false; return true;
  } };
}
function tumble(fam, spot) {
  return seq(T.go(spot[0], spot[1], 'run'), { name: 'trip', t: 0, close: true, run(f, dt) {
    this.t += dt; const A = f.A;
    if (this.t < 0.55) { A.rollFast = true; A.rollGoal = 6.28 * smooth(0, 0.55, this.t); A.roll = A.rollGoal; f.pos.x += Math.sin(f.heading) * dt * 0.8; f.pos.z += Math.cos(f.heading) * dt * 0.8; A.lift = 0.06 * f.q.S * Math.sin(this.t / 0.55 * Math.PI); return false; }
    A.roll = 0; A.rollGoal = 0; A.rollFast = false;
    if (this.t < 2.0) { A.sitGoal = 1; A.headTiltGoal = 0.3 * Math.sin(this.t * 8); return false; }          // dizzy
    return true;
  } });
}
// wrestling: two cubs face each other, rear up and box, then one rolls onto its back kicking while the other pounces
function wrestle(fam, a, b) {
  const shared = { cancel: false, ready: 0 };
  const mid = () => [(a.pos.x + b.pos.x) / 2, (a.pos.z + b.pos.z) / 2];
  const make = (me, other, under) => ({ name: 'wrestle', pair: true, close: true, t: 0, stage: 0, waited: 0, run(f, dt) {
    if (shared.cancel) { f.A.rollGoal = 0; return true; }
    this.waited += dt; if (this.waited > 6 && shared.ready < 2) return true;           // the other one went off to do something else
    const A = f.A, dx = other.pos.x - f.pos.x, dz = other.pos.z - f.pos.z, d = Math.hypot(dx, dz), want = 0.3 * f.q.S * 2;
    if (this.stage === 0) { if (d > want + 0.05) { f.moveTo(other.pos.x, other.pos.z, dt, 'trot'); return false; } this.stage = 1; shared.ready++; }
    f.turnTo(Math.atan2(dx, dz), dt, 6);
    if (shared.ready < 2) { A.bowGoal = 1; A.wagGoal = 1; return false; }
    this.t += dt; const t = this.t;
    if (t < 2.2) { A.rearGoal = 1; A.pawGoal = 1; A.lift = 0.02 * f.q.S * Math.abs(Math.sin(t * 6)); return false; }
    if (t < 4.6) {
      if (under) { A.rollFast = true; A.rollGoal = 2.85; A.kickGoal = 1; A.lookYawGoal = 0.6 * Math.sin(t * 3); }
      else { A.bowGoal = 0.7; A.pawGoal = 1; A.lookPitchGoal = 0.6; A.wagGoal = 1; if (d > want * 0.8) f.moveTo(other.pos.x, other.pos.z, dt, 'walk'); }
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
  return seq({ name: 'stalk', run(f, dt) {
    const tx = m.pos.x - Math.sin(m.heading) * 0.85 * m.q.S, tz = m.pos.z - Math.cos(m.heading) * 0.85 * m.q.S;
    f.A.crouchGoal = 0.7; return f.moveTo(tx - Math.sin(f.heading) * 0.25 * f.q.S, tz - Math.cos(f.heading) * 0.25 * f.q.S, dt, 'walk');
  } }, T.wait(0.8, f => { f.A.crouchGoal = 1; f.A.wagGoal = 0.6; }), {
    name: 'leap', t: 0, run(f, dt) { this.t += dt; const u = this.t / 0.45; f.A.lift = Math.sin(clamp01(u) * Math.PI) * 0.14 * f.q.S; f.A.airGoal = 1; f.pos.x += Math.sin(f.heading) * dt * 0.7; f.pos.z += Math.cos(f.heading) * dt * 0.7; m.A.wagGoal = 1; return u >= 1; } },
  T.wait(1.2, f => { f.A.diveGoal = 0.6; f.A.wagGoal = 1; }), T.wait(0.6, f => { f.A.shakeGoal = 1; }));
}
// dad lies down and rolls over, playing dead with his legs in the air, while the cubs bounce round him
function playDead(fam, dad, cubs) {
  for (const c of cubs.slice(0, 2)) {
    c.todo = [seq(T.wait(1.5 + fam.r()), { name: 'bounce', t: 0, run(f, dt) {
      this.t += dt; const a = this.t * 2.2 + c.r() * 6, tx = dad.pos.x + Math.cos(a) * 0.55, tz = dad.pos.z + Math.sin(a) * 0.55;
      f.moveTo(tx, tz, dt, 'trot'); f.A.lift = Math.abs(Math.sin(this.t * 7)) * 0.07 * f.q.S; f.A.wagGoal = 1; f.A.tailUpGoal = 0.6; return this.t > 4.5;
    } }, bowAt(dad))];
    c.task = null;
  }
  return seq(lieDown(1.5), T.wait(5, (f, t) => { f.A.lieGoal = 1; f.A.rollGoal = 2.75; f.A.kickGoal = t < 0.8 ? 1 : 0.15; f.A.lookYawGoal = 0.7; }),
    T.wait(1, f => { f.A.rollGoal = 0; f.A.lieGoal = 1; }), T.wait(0.8, f => { f.A.shakeGoal = 1; }));
}
// a butterfly over the meadow, and a cub after it: hops and snaps, a miss, nose in the grass
function butterflyHunt(fam) {
  const B = fam.butterfly;
  return { name: 'butterfly', t: 0, run(f, dt) {
    this.t += dt; B.chaser = f; const A = f.A, bx = B.mesh.position.x, bz = B.mesh.position.z;
    if (this.t < 5) { f.moveTo(bx, bz, dt, 'trot'); A.lookPitchGoal = -0.6; A.tailUpGoal = 0.4; A.wagGoal = 0.5; if (Math.hypot(bx - f.pos.x, bz - f.pos.z) < 0.25) this.t = Math.max(this.t, 5); return false; }
    if (this.t < 5.6) { const u = (this.t - 5) / 0.6; A.lift = Math.sin(u * Math.PI) * 0.22 * f.q.S; A.airGoal = 1; A.pitch = -0.5 + 1.2 * u; return false; }
    if (this.t < 6.8) { A.diveGoal = 0.8; B.flee = 2; return false; }
    if (this.t < 7.6) { A.sitGoal = 1; A.lookPitchGoal = -0.7; A.headTiltGoal = 0.3; return false; }
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
  let t = Math.random() * 10;
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

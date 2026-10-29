// The pond's mallards: Rocco the drake, and Daisy and Dot the ducks, drawn and posed as the geese are (geese.js: the same
// rig, feathers and fluff, their own models). By day they live on the water: Rocco leads, Daisy follows in his wake and
// Dot in hers, in a little line, a wake spreading out behind each; where he stops they feed, each on her own: dabbling
// (the bill sieving at the surface) and up-ending (tail in the air, feet kicking), then off again when he moves on. They
// preen on the water, rise up and flap, take a splashy bath, and now and then all climb out onto the bank for a rest side by
// side (a preen, a nap with heads tucked in), hurrying back into the water if a goose, Biscuit or Rusty comes close. Daisy
// is the chatterbox ("Quack!", French "Coin coin !"), Rocco the leader, Dot the curious one: a frog's splash or croak
// nearby and she paddles over for a look, then hurries to catch up, pattering over the water. At dusk they gather out in
// the middle of the pond and sleep there afloat, heads tucked in, drifting a little; in the morning a stretch, a flap and
// a quack. Tap one: it turns to you and quacks.
import * as THREE from 'three';
import { register, tr } from './lang.js';
import { Goose, ACT, TK, PondBirds } from './geese.js';
import { shadowDisc } from './beasts.js';
import { bubbleTexture } from './pond.js';

register('duck', { quack: ['Quack!', 'Coin coin !'] });
const WATER_Y = 0.007;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const kOf = g => g.rig.by / 0.29;                                    // a duck's size against a goose's
const sinkOf = g => g.wet * (g.rig.by - 0.037);                      // how far down in the water (the surface, in her own frame)
const v3 = (g, k) => g[k] || (g[k] = new THREE.Vector3());

// ------------------------------------------------------------------ what a duck does, pose by pose (u: seconds into it)
export const DACT = {
  look: ACT.look,
  // afloat, looking about, now and then a waggle of the tail
  float(g, u) { const A = g.A, y = Math.sin(u * 0.7 + g.seed); A.lookYawGoal = 0.5 * y; A.tiltGoal = 0.22 * Math.max(0, Math.sin(u * 0.5 + g.seed * 2)) * Math.sign(y); A.upGoal = 0.2; A.wagGoal = (u + g.seed) % 4.5 < 0.5 ? 1 : 0.05; },
  // swimming along, looking about as she goes
  swim(g, u) { const A = g.A; A.lookYawGoal = 0.3 * Math.sin(u * 0.9 + g.seed); A.tiltGoal = 0.08 * Math.sin(u * 1.7 + g.seed); A.wagGoal = 0.1; A.upGoal = 0.1; },
  // pattering over the water to catch up: wings half open, beating
  patter(g, u) { const A = g.A; A.wingsGoal = 0.55; A.flapGoal = 0.45; A.upGoal = 0.5; A.tailUpGoal = 0.5; A.liftGoal = 0.012 * kOf(g); },
  // dabbling: the bill dipped at the surface ahead, sieving; up now and then with a shake of the head
  dabble(g, u) { const A = g.A, k = kOf(g), c = (u + g.seed) % 3.1;
    if (c < 2.3) { A.grazeGoal = 0.75; A.billAt = v3(g, 'bat').set(0.025 * k * Math.sin(u * 2 + g.seed), sinkOf(g) - 0.01 * k, 0.3 * k); A.billWGoal = 1; A.jawGoal = Math.sin(u * 15) > 0.3 ? 0.35 : 0; A.wagGoal = 0.15; }
    else { A.upGoal = 0.35; A.tiltGoal = 0.22 * Math.sin(u * 24); A.lookYawGoal = 0.18 * Math.sin(u * 19); A.wagGoal = 0.6; } },
  // up-ending: tipped right forward, head under, tail up and the feet kicking; up again with a waggle (secs: how long)
  upend(g, u, secs) { const A = g.A;
    if (u < 0.3) { A.grazeGoal = 0.7; A.upGoal = 0.2; }
    else if (u < secs - 0.6) { A.upendGoal = 1; A.grazeGoal = 1; A.tailUpGoal = 1; A.wagGoal = 0.2 * Math.max(0, Math.sin(u * 3)); }
    else { A.wagGoal = 1; A.upGoal = 0.35; A.tiltGoal = 0.2 * Math.sin(u * 20); } },
  // preening one wing (the side she picked), the bill working through the feathers
  preen(g, u) { const A = g.A, k = kOf(g), sd = g.preenSide || 1; A.preenGoal = 1; A.side = sd; A.wingLiftGoal = 0.4;
    A.billAt = v3(g, 'bat').set(0.115 * k * sd, g.rig.by + 0.055 * k + 0.015 * k * Math.sin(u * 7), -0.04 * k - 0.05 * k * Math.sin(u * 0.8)); A.billWGoal = 1; },
  // quacking: n quacks, the bill opening wide on each, head up, then a pleased waggle
  quack(g, u, n = 2) { const A = g.A, q = 0.42 * n;
    if (u < q) { A.honkGoal = 0.6; A.upGoal = 0.45; A.jawGoal = Math.sin(u / 0.42 * Math.PI) > 0.1 ? 1 : 0; A.wagGoal = 0.6; A.tailUpGoal = 0.4; }
    else { A.lookYawGoal = 0.5 * Math.sin(g.seed * 3); A.tiltGoal = 0.2; A.wagGoal = 0.5; } },
  // a stretch: up on the water (or on her toes), the wings open and beat, folded again, a shake
  stretch(g, u) { const A = g.A, k = kOf(g);
    if (u < 0.4) { A.upGoal = 1; A.tailUpGoal = 0.5; }
    else if (u < 2.2) { A.upGoal = 0.9; A.liftGoal = (g.wet > 0.5 ? 0.06 : 0.025) * k; A.wingsGoal = 1; A.flapGoal = 1; A.tailUpGoal = 0.6; A.lookPitchGoal = -0.2; }
    else if (u < 2.7) { A.upGoal = 0.5; }
    else { A.shakeGoal = 0.6; A.wagGoal = 1; A.wingLiftGoal = 0.6; } },
  shake: ACT.shake,
  // a bath: ducking the head and chest under and flinging the water over her back with the wings, again and again
  bathe(g, u) { const A = g.A, c = u % 1.3, k = kOf(g);
    if (c < 0.5) { A.upendGoal = 0.32; A.grazeGoal = 0.8; A.wingLiftGoal = 0.9; A.wagGoal = 0.6; }
    else { A.wingsGoal = 0.75; A.flapGoal = 1; A.upGoal = 0.6; A.liftGoal = 0.02 * k; A.tailUpGoal = 0.6; A.wagGoal = 1; A.shakeGoal = 0.3; } },
  // asleep, head tucked in over her back (sitting, on the bank); now and then she half wakes and peeks
  sleep(g, u) { const A = g.A, k = kOf(g), c = (u + g.seed * 3) % 11; A.sitGoal = g.wet < 0.5 ? 1 : 0; A.tuckGoal = 1; A.side = -1;
    A.billAt = v3(g, 'tuck').set(-0.07 * k, 0.2 * k, -0.06 * k);
    const peek = c > 8 && c < 9.4; A.squintGoal = peek ? 0.1 : 1; A.billWGoal = peek ? 0.55 : 1; A.lookYawGoal = peek ? 0.3 : 0; },
  // sitting down for a rest on the bank; sleepy ones tuck their heads in after a while
  rest(g, u) { const A = g.A; A.sitGoal = 1; if (g.sleepy && u > 3) DACT.sleep(g, u - 3); else ACT.look(g, u * 0.6); },
  // a curious look at something (a frog): head stretched towards it, tilted to see it with one eye
  peer(g, u) { const A = g.A, p = g.peerAt; if (!p) return ACT.look(g, u);
    const rel = wrap(Math.atan2(p[0] - g.pos.x, p[1] - g.pos.z) - g.heading);
    A.lookYawGoal = Math.max(-1.2, Math.min(1.2, rel)); A.tiltGoal = 0.35 * Math.sign(rel || 1); A.upGoal = 0.55; A.lookPitchGoal = 0.15;
    A.wagGoal = u % 2.4 < 0.4 ? 0.8 : 0; },
};

// tasks of their own (as geese.js's TK): run(duck, dt) false while it goes on, true when done
const DK = {
  // swimming (or walking) straight to (x, z), looking about as she goes
  swim: (x, z, pace = 'walk', tol = 0.3, through = true) => ({ name: 'swim', act: 'swim', t: 0, run(g, dt) {
    if (this.max === undefined) this.max = 12 + Math.hypot(x - g.pos.x, z - g.pos.z) / 0.1;          // (time enough to get there)
    this.t += dt; DACT.swim(g, this.t);
    return g.moveTo(x, z, dt, pace, through) || Math.hypot(x - g.pos.x, z - g.pos.z) < tol || this.t > this.max;
  } }),
  // drifting slowly along to (x, z), dabbling as she goes
  dabbleTo: (x, z) => ({ name: 'swim', act: 'dabble', t: 0, run(g, dt) {
    this.t += dt; DACT.dabble(g, this.t);
    return g.moveTo(x, z, dt, 'slow', false) || Math.hypot(x - g.pos.x, z - g.pos.z) < 0.1 || this.t > 40;
  } }),
  act: (name, secs, fn) => TK.act(name, secs, fn || DACT[name]),
  // n quacks, with "Quack!" over her head
  quack: (n = 2) => ({ name: 'quack', act: 'quack', t: 0, run(g, dt) {
    if (this.t === 0) { g.flock.say(g); if (g.flock.o && g.flock.o.sound) g.flock.o.sound('quack', g.pos.x, g.pos.z); }      // (sound.js: a real quack or two)
    this.t += dt; DACT.quack(g, this.t, n); return this.t >= 0.42 * n + 0.7;
  } }),
  // up-ending for secs: a ring as she goes under and another as she comes up
  upend: (secs) => ({ name: 'upend', act: 'upend', t: 0, run(g, dt) {
    const was = this.t; this.t += dt;
    if (was < 0.35 && this.t >= 0.35) g.flock.ring(g.pos.x, g.pos.z, 0.26);
    if (was < secs - 0.55 && this.t >= secs - 0.55) g.flock.ring(g.pos.x, g.pos.z, 0.3);
    DACT.upend(g, this.t, secs); return this.t >= secs;
  } }),
  // a splashy bath for secs: a splash each time the wings fling the water
  bathe: (secs) => ({ name: 'bathe', act: 'bathe', t: 0, run(g, dt) {
    const was = this.t; this.t += dt;
    if (Math.floor((was + 0.8) / 1.3) !== Math.floor((this.t + 0.8) / 1.3)) g.flock.splash(g.pos.x, g.pos.z, 0.55);
    DACT.bathe(g, this.t); return this.t >= secs;
  } }),
  // waiting until a test passes (or for at most secs), doing fn meanwhile
  until: (name, test, secs, fn = DACT.float) => ({ name, act: name, t: 0, run(g, dt) { this.t += dt; fn(g, this.t, dt); return test(g) || this.t >= secs; } }),
  seq: TK.seq, path: TK.path, straight: TK.straight, face: TK.face,
};

// following: along the trail of the one ahead (follow() below picks the point and the pace each moment)
const TRAIL = () => ({ name: 'trail', act: 'swim', t: 0, run(g, dt) {
  const T = g.after.trail, p = T[Math.min(g.tk, T.length - 1)];
  // (waiting behind the one she follows; if that goes on, round her instead)
  this.wait = g.vs < 0.02 ? (this.wait || 0) + dt : 0; if (this.wait > 2.5) this.round = 2;
  g.following = !((this.round = (this.round || 0) - dt) > 0); g.moveTo(p[0], p[1], dt, g.pace, true); g.following = false;
  if (g.act !== 'swim') { g.act = 'swim'; g.actT = 0; }
  if (g.pace === 'run') DACT.patter(g, g.actT); else if (g.after.act === 'dabble' && g.pace === 'walk') DACT.dabble(g, g.actT); else DACT.swim(g, g.actT);      // (drifting along dabbling behind him, as he does)
  return false;
} });

// ------------------------------------------------------------------ the wakes and rings on the water: one draw each, every ring an
// instance, its brightness added onto the water (fading to nothing), dimmer at night
class Ripples {
  constructor(group, geo, cap) {
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), cap);
    this.mesh.material.userData.noGrade = true; this.mesh.renderOrder = 2; this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color(0, 0, 0));
    group.add(this.mesh); this.cap = cap; this.live = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color(); this._y = new THREE.Vector3(0, 1, 0);
  }
  add(x, z, yaw, s0, s1, life, bright) { if (this.live.length >= this.cap) this.live.shift(); this.live.push({ x, z, yaw, s0, s1, life, t: 0, bright }); }
  update(dt, light) {
    let n = 0;
    for (const w of this.live) {
      w.t += dt; const u = w.t / w.life; if (u >= 1) continue;
      const s = w.s0 + (w.s1 - w.s0) * (1 - (1 - u) * (1 - u)), b = w.bright * light * (1 - u) * (1 - u);
      this._m.compose(this._p.set(w.x, WATER_Y + 0.003, w.z), this._q.setFromAxisAngle(this._y, w.yaw), this._s.set(s, 1, s));
      this.mesh.setMatrixAt(n, this._m); this.mesh.setColorAt(n, this._c.setRGB(b * 0.92, b, b)); n++;
    }
    this.live = this.live.filter(w => w.t < w.life);
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the wakes: behind each swimming duck a V of two thin lines spreading
// out from her breast, drawn from where she's been in the last second and a half (so a wake curves round after her when
// she turns), fading as they spread; all in one draw, added onto the water's colour
const WAKE_N = 18, WAKE_DT = 0.085;
class Wakes {
  constructor(group, n) {
    this.n = n; const V = n * 2 * WAKE_N * 2;
    const g = new THREE.BufferGeometry(), idx = [];
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(V * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(V * 3), 3).setUsage(THREE.DynamicDrawUsage));
    for (let a = 0; a < n * 2; a++) for (let i = 0; i < WAKE_N - 1; i++) { const b = (a * WAKE_N + i) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.mesh.material.userData.noGrade = true; this.mesh.renderOrder = 2; this.mesh.frustumCulled = false; group.add(this.mesh);
    this.hist = Array.from({ length: n }, () => []);
  }
  // each duck: where she is, the way she faces, how fast she's swimming (0 when she isn't), her breast's distance ahead
  update(dt, ducks, light) {
    const P = this.mesh.geometry.attributes.position, C = this.mesh.geometry.attributes.color;
    ducks.forEach((d, j) => {
      const H = this.hist[j], sp = d.wet > 0.6 && !d.asleep ? Math.min(1, Math.max(0, (d.vs - 0.02) / 0.1)) : 0, f = 0.1 * d.rig.by / 0.29 * 1.6;
      const bx = d.pos.x + Math.sin(d.heading) * f, bz = d.pos.z + Math.cos(d.heading) * f;
      for (const h of H) h.a += dt;
      if (!H.length || H[0].a >= WAKE_DT) H.unshift({ x: bx, z: bz, h: d.heading, s: sp, a: 0 }); else { H[0].x = bx; H[0].z = bz; H[0].h = d.heading; H[0].s = sp; }
      if (H.length > WAKE_N) H.length = WAKE_N;
      for (let side = 0; side < 2; side++) for (let i = 0; i < WAKE_N; i++) {
        const h = H[Math.min(i, H.length - 1)], a = h.a + (i >= H.length ? 9 : 0), u = Math.min(1, a / (WAKE_N * WAKE_DT));
        const sg = side ? 1 : -1, rx = Math.cos(h.h) * sg, rz = -Math.sin(h.h) * sg;           // (her right, or left)
        const out = 0.025 + 0.09 * a, wdt = 0.006 + 0.012 * u, b = h.s * light * 0.42 * (1 - u) * (1 - u) * Math.min(1, a / 0.12);
        const v = ((j * 2 + side) * WAKE_N + i) * 2;
        P.setXYZ(v, h.x + rx * out, WATER_Y + 0.004, h.z + rz * out); P.setXYZ(v + 1, h.x + rx * (out + wdt), WATER_Y + 0.004, h.z + rz * (out + wdt));
        C.setXYZ(v, b, b, b); C.setXYZ(v + 1, b * 0.4, b * 0.4, b * 0.4);
      }
    });
    P.needsUpdate = true; C.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the three mallards on the pond
export class DuckFlock extends PondBirds {
  // opts: { pond: V.pond, nav: the village grid, avoid: [[x, z, r]] in the pond (the dock), mouths: [[x, z]] (where the
  // streams meet it), groundY(x, z), lang, others(): the geese, Biscuit and Rusty (to keep clear of: each with pos, and
  // isGoose for a goose), fx(): the frogs' pond (its splashes), light(): 0..1 how bright the wakes show }
  constructor(scene, opts, r) {
    super(); this.setPond(opts, r); this.o = opts; this.lang = opts.lang || 'en';
    this.group = new THREE.Group(); scene.add(this.group);
    this.ducks = [['mallard_m', null], ['mallard_f', null], ['mallard_f', 'Dot']].map(([k, nm], i) => {
      const d = new Goose(this.group, k, r, nm); d.flock = this; d.idx = i; d.trail = []; d.tk = 0; d.peekOk = 0;
      d.shadow = shadowDisc(0.11); this.group.add(d.shadow); return d;
    });
    const [Ro, Da, Do] = this.ducks;
    Da.after = Ro; Do.after = Da;
    Ro.chat = 0.5; Da.chat = 1.6; Do.chat = 0.9;                       // (Daisy the chatterbox)
    Ro.curious = 0.15; Da.curious = 0.3; Do.curious = 1;               // (Dot the curious one)
    if (opts.house) this.setHouse(opts.house);
    this.regions(); this.waysIn(); this.places();
    this.near = this.ducks; this.plan = null; this.placed = false; this.restedAt = -60;
    this.wakes = new Wakes(this.group, this.ducks.length);
    this.rings = new Ripples(this.group, new THREE.RingGeometry(0.93, 1, 40).rotateX(-Math.PI / 2), 24);
    this.bubbleTex = bubbleTexture(tr(this.lang, 'duck.quack'), '#24508f'); this.bubbles = [];
  }
  night(h) { return h >= 21.25 || h < 6.35; }
  // ---- their house (the duck house on the pond, bought in the game; main.js says where): house.local(x, z) gives a
  // point in its own frame (its door towards +z, the raft round it, the ramp down into the water at the front),
  // house.world(lx, lz) back. On its raft and up its ramp they walk, dry; at dusk they go in one by one (Dot, Daisy, then
  // Rocco) and sleep inside; in the morning out again (Rocco first) and down into the water
  setHouse(H) {
    this.house = H;
    const w0 = this.wetAt.bind(this), g0 = this.groundY;
    this.onHouse = (x, z) => {
      const [lx, lz] = H.local(x, z);
      if (Math.abs(lx) <= 0.47 && lz >= -0.43 && lz <= 0.425) return { y: 0.075, wet: 0 };          // (the raft's deck)
      if (Math.abs(lx) <= 0.14 && lz > 0.425 && lz <= 0.92) return { y: 0.075 - (lz - 0.425) / 0.44 * 0.12, wet: smooth(0.66, 0.88, lz) };      // (the ramp)
      return null;
    };
    this.wetAt = (x, z) => { const q = this.onHouse(x, z); return q ? q.wet : w0(x, z); };
    this.groundY = (x, z) => { const q = this.onHouse(x, z); return q ? q.y * (1 - q.wet) : (g0 ? g0(x, z) : 0); };
    const W = (lx, lz) => H.world(lx, lz);
    H.foot = W(0, 1.16); H.bottom = W(0, 0.86); H.top = W(0, 0.4); H.door = W(0, 0.2); H.inside = W(0, 0.05);
    H.into = Math.atan2(H.door[0] - H.top[0], H.door[1] - H.top[1]);      // (facing the door)
    H.waits = [[0, 1.2], [-0.5, 1.45], [0.5, 1.45]].map(([lx, lz]) => W(lx, lz));
  }
  // in at the door: out of sight, asleep
  inHouse(d) { d.root.visible = false; d.shadow.visible = false; d.asleep = true; d.inside = true; d.pos.set(this.house.inside[0], 0, this.house.inside[1]); d.heading = this.house.into; }
  outHouse(d) { d.root.visible = true; d.shadow.visible = true; d.inside = false; d.pos.set(this.house.inside[0], 0, this.house.inside[1]); d.heading = this.house.into + Math.PI; d.lastPos = d.pos.clone(); }
  goHouse() {
    this.plan = 'night'; this.houseNext = 2;
    this.ducks.forEach(d => { d.task = this.homeTask(d); });
  }
  // one duck's way home: (into the water if she's on the bank) over to her place by the foot of the ramp (round the dock if
  // need be), facing it, waiting her turn; then to the foot, up the ramp, across to the door and in
  homeTask(d) {
    const H = this.house, order = [2, 1, 0], i = d.idx, k = order.indexOf(i), w = H.waits[k], L = [];
    if (this.dry(d) && !this.onHouse(d.pos.x, d.pos.z)) { const way = this.intoWater(d, L); this.swimVia(L, way.inn, w, 'walk', 0.1); }
    else this.swimVia(L, [d.pos.x, d.pos.z], w, 'walk', 0.1);
    L.push(DK.face(Math.atan2(H.foot[0] - w[0], H.foot[1] - w[1])), DK.until('float', () => this.houseNext === i, 240));
    const climb = L.length;
    if (k > 0) L.push(DK.swim(H.foot[0], H.foot[1], 'walk', 0.08, false));
    L.push(DK.straight(H.bottom[0], H.bottom[1], 'walk', true, 0.08), DK.straight(H.top[0], H.top[1], 'walk', true, 0.08), DK.face(H.into), DK.straight(H.door[0], H.door[1], 'walk', false, 0.05),
      () => { this.inHouse(d); this.houseNext = order[k + 1] ?? -1; return DK.act('sleep', 1e9); });
    const T = DK.seq('home', L); T.climb = climb; return T;
  }
  // the morning: out one after another, down the ramp, a stretch on the water and a quack
  outOfHouse() {
    const H = this.house, order = [0, 1, 2];
    this.plan = 'morning'; this.restedAt = this.time;            // (a night's sleep: no nap on the bank straight after)
    this.ducks.forEach((d, i) => {
      const k = order.indexOf(i);
      let away = H.world((this.r() - 0.5) * 0.8, 1.8 + this.r() * 0.5);          // (out in front of the ramp, clear of the house)
      if (this.wetAt(away[0], away[1]) < 0.95 || !this.clearWater(away[0], away[1], 0.2)) away = H.world(0, 1.6);
      if (!d.inside) {                                   // (not in yet, still on her way: a stretch and a quack where she is)
        d.asleep = false; d.task = DK.seq('morning', [DK.act('stretch', 3.4), DK.quack(2), DK.act('float', 1 + this.r() * 2)]);
        return;
      }
      d.task = DK.seq('morning', [DK.act('sleep', 0.3 + k * 2.2 + this.r() * 0.5), () => { this.outHouse(d); d.asleep = false; return null; },
        DK.straight(H.top[0], H.top[1], 'walk', true, 0.08), DK.straight(H.bottom[0], H.bottom[1], 'walk', true, 0.08), DK.swim(H.foot[0], H.foot[1], 'walk', 0.1),
        DK.swim(away[0], away[1], 'walk', 0.2), DK.act('stretch', 3.4), DK.quack(2 + (i === 1 ? 1 : 0)), DK.act('float', 1.5 + this.r() * 2)]);
    });
  }
  dry(d) { return this.wetAt(d.pos.x, d.pos.z) < 0.5; }
  // their places: where they rest on the bank (three spots side by side, each with its own way in), and the raft out in
  // the middle where they sleep at night
  places() {
    const nav = this.nav, R = this.r;
    const room = (x, z, r) => { if (!nav) return true; if (!nav.freeAt(x, z)) return false; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; if (!nav.freeAt(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false; } return true; };
    this.rests = [];
    const geeseBed = this.o.geeseBed || [];
    for (const w of this.ways) {
      const spots = [], ways = [];
      let dtt = 0.02; while (dtt < 0.3 && Math.hypot(...[0, 1].map(i => this.at(w.t + dtt, 1.2)[i] - this.at(w.t, 1.2)[i])) < 0.36) dtt += 0.005;      // (0.36 m apart)
      for (const j of [-1, 0, 1]) {
        const t = w.t + j * dtt, p = this.at(t, 1.2), f = this.at(t, 1.0);
        if (!room(p[0], p[1], 0.22)) break;
        const wy = this.nearestWay(p[0], p[1], null, w.reg);
        if (!wy || Math.hypot(wy.out[0] - p[0], wy.out[1] - p[1]) > 0.7) break;
        spots.push([p[0], p[1], Math.atan2(f[0] - p[0], f[1] - p[1])]); ways.push(wy);
      }
      if (spots.length < 3) continue;
      if (geeseBed.some(b => spots.some(s => Math.hypot(b[0] - s[0], b[1] - s[1]) < 2.2))) continue;
      if (this.mouths.some(m => spots.some(s => Math.hypot(m[0] - s[0], m[1] - s[1]) < 1.6))) continue;
      if (this.avoid.some(a => spots.some(s => Math.hypot(a[0] - s[0], a[1] - s[1]) < a[2] + 0.9))) continue;
      if (this.rests.some(q => Math.hypot(q.spots[1][0] - spots[1][0], q.spots[1][1] - spots[1][1]) < 1.5)) continue;
      this.rests.push({ spots, ways, reg: w.reg });
    }
    // the raft: out on the water, as far from the dock and the streams as can be
    let best = null, bd = -1;
    for (let k = 0; k < 48; k++) {
      const t = k / 48 * Math.PI * 2, p = this.at(t, 0.36);
      const d = Math.min(...this.avoid.map(a => Math.hypot(a[0] - p[0], a[1] - p[1]) - a[2]), ...this.mouths.map(m => Math.hypot(m[0] - p[0], m[1] - p[1])), 9);
      if (d > bd) { bd = d; best = p; }
    }
    const c = best || this.at(0, 0), a0 = R() * 6.28;
    this.raft = [0, 1, 2].map(i => { const a = a0 + i * 2.09; return [c[0] + Math.cos(a) * 0.27, c[1] + Math.sin(a) * 0.27, Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI / 2]; });      // (side by side, heads round the same way)
  }
  // somewhere out on the water from a few metres off (r0..r1), the way there clear of the dock
  hop(from, r0, r1) {
    for (let k = 0; k < 40; k++) {
      const a = this.r() * Math.PI * 2, r = r0 + this.r() * (r1 - r0), x = from[0] + Math.sin(a) * r, z = from[1] + Math.cos(a) * r;
      if (this.pondAt(x, z)[0] < 0.72 && this.clearWater(x, z, 0.4) && this.clearSwim(from[0], from[1], x, z)) return [x, z];
    }
    return this.waterSpot(0.2, 0.6);
  }
  // somewhere out on the water
  waterSpot(s0 = 0.2, s1 = 0.7) {
    for (let k = 0; k < 60; k++) { const p = this.at(this.r() * Math.PI * 2, s0 + this.r() * (s1 - s0)); if (this.clearWater(p[0], p[1], 0.4)) return p; }
    return this.at(0, 0.3);
  }
  // swimming from one place to another, round the dock if it's in the way (by the pond's middle, or if that won't do, by
  // the shortest way round the pond)
  swimVia(L, from, to, pace = 'walk', tol = 0.3) {
    if (!this.clearSwim(from[0], from[1], to[0], to[1])) {
      const m = this.at(0, 0);
      if (this.clearSwim(from[0], from[1], m[0], m[1]) && this.clearSwim(m[0], m[1], to[0], to[1])) L.push(DK.swim(m[0], m[1], pace, 0.35));
      else { const R = this.route(from, to); R.pop(); for (const q of R) L.push(DK.swim(q[0], q[1], pace, 0.35)); }
    }
    L.push(DK.swim(to[0], to[1], pace, tol, tol > 0.2));          // (slowing to arrive where she must be just so)
  }
  // a way across the water round the dock and the duck house: straight if that's clear, else through points round the
  // pond (two rings and its middle), the shortest way; its points after from, to last. (Near either end a little closer
  // to the dock or the house is all right: that's where she is, or where she must be.)
  route(from, to) {
    const clear = (a, b) => {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 0.15));
      for (let k = 0; k <= n; k++) {
        const u = k / n, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
        if (Math.min(u, 1 - u) * L < 0.35) continue;
        if (!this.clearWater(x, z, 0.12) || this.pondAt(x, z)[0] > 0.86) return false;
      }
      return true;
    };
    if (clear(from, to)) return [to];
    if (!this.nodes) {
      this.nodes = [this.at(0, 0)];
      for (const sr of [0.32, 0.62]) for (let i = 0; i < 16; i++) { const q = this.at(i / 16 * Math.PI * 2, sr); if (this.clearWater(q[0], q[1], 0.3)) this.nodes.push(q); }
    }
    const N = [from, to, ...this.nodes], n = N.length, dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
    dist[0] = 0;
    for (;;) {
      let u = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === 1) break;
      done[u] = true;
      for (let v = 1; v < n; v++) {
        if (done[v]) continue;
        const w = dist[u] + Math.hypot(N[v][0] - N[u][0], N[v][1] - N[u][1]);
        if (w < dist[v] && clear(N[u], N[v])) { dist[v] = w; prev[v] = u; }
      }
    }
    if (prev[1] < 0) return [to];
    const out = []; for (let v = 1; v > 0; v = prev[v]) out.unshift(N[v]);
    return out;
  }
  // into the water from wherever she is on the bank (by the nearest way in)
  intoWater(d, L, pace = 'walk') {
    const w = this.nearestWay(d.pos.x, d.pos.z);
    L.push(DK.path(w.out[0], w.out[1], pace, 30), DK.straight(w.edge[0], w.edge[1], pace, true, 0.2), DK.straight(w.inn[0], w.inn[1], pace, true, 0.3));
    return w;
  }
  // put them out for the time of day: by day afloat together somewhere on the pond, at night asleep on their raft
  place(hour) {
    this.placed = true;
    if (this.night(hour) && this.house) {
      this.ducks.forEach(d => { this.inHouse(d); d.task = DK.seq('home', [DK.act('sleep', 1e9)]); });
      this.plan = 'night'; this.houseNext = -1;
    } else if (this.night(hour)) {
      this.ducks.forEach((d, i) => { const p = this.raft[i]; d.pos.set(p[0], 0, p[1]); d.heading = p[2]; d.asleep = true; d.task = DK.seq('night', [DK.act('sleep', 1e9)]); });
      this.plan = 'night';
    } else {
      const p = this.waterSpot(0.3, 0.55), h = this.r() * 6.28;
      this.ducks.forEach((d, i) => {
        let x = p[0] - Math.sin(h) * 0.55 * i, z = p[1] - Math.cos(h) * 0.55 * i;
        if (!this.clearWater(x, z, 0.3) || this.wetAt(x, z) < 0.9) { x = p[0] + 0.3 * (i - 1); z = p[1]; }
        d.pos.set(x, 0, z); d.heading = h; d.task = null;
      });
      this.plan = 'paddle';
    }
    for (const d of this.ducks) { d.lastPos = d.pos.clone(); d.trail = [[d.pos.x, d.pos.z]]; d.tk = 0; }
  }
  // ---- what Rocco does next: he leads, and decides when they rest on the bank
  // (force: 'rest', 'bath', 'preen', 'stretch', 'lead' or 'far', for a film)
  nextLead(g, hour, force) {
    const R = this.r;
    if (this.plan === 'morning' || this.plan === 'rest' || this.plan === 'scramble') this.plan = 'paddle';
    if (this.dry(g)) { const L = []; this.intoWater(g, L); L.push(DK.act('shake', 1.2)); return DK.seq('toWater', L); }
    const pick = { rest: 0, bath: 0.15, preen: 0.25, stretch: 0.3, lead: 0.9, far: 0.9 }[force] ?? R();
    if (pick < 0.13 && (this.time - this.restedAt > 140 || force) && this.rests.length) { const t = this.goRest(); if (t) return t; }
    if (pick < 0.21) return DK.seq('bath', [DK.bathe(3.9 + R() * 2.6), DK.act('stretch', 3.4), DK.act('preen', 4 + R() * 3), DK.act('shake', 1.2)]);
    if (pick < 0.29) { g.preenSide = R() < 0.5 ? 1 : -1; return DK.seq('preen', [DK.act('preen', 5 + R() * 4), DK.act('shake', 1.2), DK.act('float', 2 + R() * 3)]); }
    if (pick < 0.34) return DK.seq('stretch', [DK.act('stretch', 3.4), DK.quack(2), DK.act('float', 2)]);
    // off a little way over the pond (a quack to say so first, sometimes), feeding a good while where he stops: dabbling,
    // drifting along dabbling, up-ending; now and then right across to the other side
    const L = [], far = force === 'far' || (!force && R() < 0.2), p = this.hop([g.pos.x, g.pos.z], far ? 2.4 : 0.9, far ? 5 : 2.2);
    if (R() < 0.45) L.push(DK.quack(R() < 0.5 ? 1 : 2));
    this.swimVia(L, [g.pos.x, g.pos.z], p);
    let at = p;
    for (let n = 0; n < 2 + Math.floor(R() * 3); n++) {
      const q = R();
      if (q < 0.35) L.push(DK.act('dabble', 3 + R() * 4));
      else if (q < 0.6) L.push(DK.upend(2.8 + R() * 2.4));
      else if (q < 0.85) { const d = this.hop(at, 0.35, 0.8); L.push(DK.dabbleTo(d[0], d[1])); at = d; }
      else L.push(DK.act('float', 1.5 + R() * 2));
    }
    return DK.seq('lead', L);
  }
  // a rest on the bank: the nearest resting place clear of the geese; each to her own spot by her own way in, a shake, a
  // preen, a nap, a stretch, and back into the water
  goRest() {
    const R = this.r, Ro = this.ducks[0], others = this.o.others ? this.o.others() : [];
    const ok = this.rests.filter(q => others.every(o => q.spots.every(s => Math.hypot(o.pos.x - s[0], o.pos.z - s[1]) > 2.5)));
    if (!ok.length) return null;
    ok.sort((a, b) => Math.hypot(a.spots[1][0] - Ro.pos.x, a.spots[1][1] - Ro.pos.z) - Math.hypot(b.spots[1][0] - Ro.pos.x, b.spots[1][1] - Ro.pos.z));
    const q = ok[0], order = [1, 0, 2];          // (Rocco in the middle)
    this.plan = 'rest'; this.restedAt = this.time; this.restAt = q; this.restOver = false;
    let mine = null;
    this.ducks.forEach((d, i) => {
      const j = order[i], s = q.spots[j], w = q.ways[j], L = [];
      if (i > 0) L.push(DK.act('float', 0.4 + i * 0.7));
      this.swimVia(L, [d.pos.x, d.pos.z], w.inn, 'walk', 0.25);
      L.push(DK.straight(w.edge[0], w.edge[1], 'walk', true, 0.2), DK.straight(w.out[0], w.out[1], 'walk', true, 0.12), DK.straight(s[0], s[1], 'walk', false, 0.06), DK.face(s[2]), DK.act('shake', 1.2));
      d.preenSide = R() < 0.5 ? 1 : -1; d.sleepy = i !== 0 || R() < 0.5;
      if (i === 0) L.push(DK.act('preen', 3 + R() * 4), DK.act('rest', 24 + R() * 18), () => { this.restOver = true; return DK.act('stretch', 3.4); }, DK.act('look', 0.6));
      else L.push(DK.until('preen', () => this.restOver, 3 + R() * 4, DACT.preen), DK.until('rest', () => this.restOver, 90, DACT.rest), DK.act('look', 0.3 + i * 0.5), DK.act('stretch', 3.4), DK.act('look', 0.2 + i * 0.6));
      L.push(DK.straight(w.out[0], w.out[1], 'walk', true, 0.12), DK.straight(w.edge[0], w.edge[1], 'walk', true, 0.2), DK.straight(w.inn[0], w.inn[1], 'walk', true, 0.3), DK.act('shake', 1.2));
      const t = DK.seq('rest', L);
      if (i === 0) mine = t; else d.task = t;
    });
    return mine;
  }
  // something's come too close while they're on the bank: up they get and hurry into the water, quacking
  scramble() {
    this.plan = 'scramble';
    for (const d of this.ducks) {
      if (!this.dry(d) && !(d.task && d.task.name === 'rest')) continue;
      const L = [DK.quack(d.idx === 1 ? 3 : 2)];
      if (this.dry(d)) this.intoWater(d, L, 'hurry'); else L.push(DK.swim(...this.waterSpot(0.3, 0.6), 'hurry'));
      L.push(DK.act('shake', 1.2), DK.act('float', 1 + this.r() * 2));
      d.task = DK.seq('scramble', L); d.asleep = false;
    }
  }
  // dusk: all out to their raft in the middle of the pond, and to sleep there, afloat
  goNight() {
    if (this.house) return this.goHouse();
    this.plan = 'night';
    this.ducks.forEach((d, i) => {
      const p = this.raft[i], L = [];
      if (this.dry(d)) { const w = this.intoWater(d, L); this.swimVia(L, w.inn, [p[0], p[1]], 'walk', 0.08); }
      else this.swimVia(L, [d.pos.x, d.pos.z], [p[0], p[1]], 'walk', 0.08);
      L.push(DK.face(p[2]), () => { d.asleep = true; return DK.act('sleep', 1e9); });
      d.task = DK.seq('night', L);
    });
  }
  // morning: awake one after another, a stretch on the water and a quack, then off they go
  wakeUp() {
    if (this.house) return this.outOfHouse();
    this.plan = 'morning'; this.restedAt = this.time;
    this.ducks.forEach((d, i) => {
      d.task = DK.seq('morning', [DK.act('sleep', 0.4 + i * 1.5 + this.r()), () => { d.asleep = false; return DK.act('stretch', 3.4); }, DK.quack(2 + (i === 1 ? 1 : 0)), DK.act('float', 1.5 + this.r() * 2)]);
    });
  }
  // her own little things while the one she follows has stopped: a few bites, an up-end, a preen (moving to a little room
  // first if she's too close to one of the others)
  feedBout(d) {
    const R = this.r, L = [];
    const crowded = this.ducks.some(o => o !== d && Math.hypot(o.pos.x - d.pos.x, o.pos.z - d.pos.z) < 0.42);
    if (crowded) {
      for (let k = 0; k < 12; k++) {
        const a = R() * 6.28, r = 0.35 + R() * 0.25, x = d.pos.x + Math.sin(a) * r, z = d.pos.z + Math.cos(a) * r;
        if (this.wetAt(x, z) > 0.95 && this.clearWater(x, z, 0.3) && this.ducks.every(o => o === d || Math.hypot(o.pos.x - x, o.pos.z - z) > 0.5)) { L.push(DK.swim(x, z, 'walk', 0.08, false)); break; }
      }
    }
    for (let n = 0; n < 2 + Math.floor(R() * 2); n++) {
      const p = R();
      if (p < 0.42) L.push(DK.act('dabble', 2.5 + R() * 4));
      else if (p < 0.7) L.push(DK.upend(2.6 + R() * 2.4));
      else if (p < 0.82) { d.preenSide = R() < 0.5 ? 1 : -1; L.push(DK.act('preen', 3 + R() * 3)); }
      else L.push(DK.act('float', 1.5 + R() * 2.5));
      if (R() < 0.12 * d.chat) L.push(DK.quack(d.idx === 1 && R() < 0.5 ? 3 : 2));
    }
    return DK.seq('feed', L);
  }
  // a follower (Daisy after Rocco, Dot after Daisy), each moment: in the wake of the one ahead, a little way behind; or,
  // when that one's stopped, doing her own things nearby
  follow(d, dt) {
    if (this.plan === 'night' || this.plan === 'rest' || this.plan === 'scramble' || this.plan === 'morning') {
      if (!d.task && this.plan !== 'night') d.task = this.dry(d) ? DK.seq('toWater', (() => { const L = []; this.intoWater(d, L); return L; })()) : this.feedBout(d);
      return;
    }
    if (d.task && !/^(feed|peek|trail)$/.test(d.task.name)) return;           // (a quack, a scramble, back into the water...)
    if (this.dry(d)) { const L = []; this.intoWater(d, L); d.task = DK.seq('toWater', L); return; }
    const G = d.after, T = G.trail;
    if (d.tk >= T.length) d.tk = T.length - 1;
    if (this.time - (d.followT || -9) > 0.5) {          // (back to following: from the nearest point of the trail out on the water)
      let bi = T.length - 1, bd = Infinity;
      for (let i = Math.max(0, T.length - 150); i < T.length; i++) { if (this.wetAt(T[i][0], T[i][1]) < 0.95) continue; const dd = Math.hypot(T[i][0] - d.pos.x, T[i][1] - d.pos.z); if (dd < bd) { bd = dd; bi = i; } }
      d.tk = bi;
    }
    d.followT = this.time;
    while (d.tk < T.length - 1 && (Math.hypot(T[d.tk][0] - d.pos.x, T[d.tk][1] - d.pos.z) < 0.14 || this.wetAt(T[d.tk][0], T[d.tk][1]) < 0.95)) d.tk++;
    let along = Math.hypot(T[d.tk][0] - d.pos.x, T[d.tk][1] - d.pos.z);
    for (let i = d.tk; i < T.length - 1; i++) along += Math.hypot(T[i + 1][0] - T[i][0], T[i + 1][1] - T[i][1]);
    along += Math.hypot(G.pos.x - T[T.length - 1][0], G.pos.z - T[T.length - 1][1]);
    const keep = 0.52, moving = G.spd > 0.04 && G.vs > 0.03 && G.wet > 0.5, far = Math.hypot(G.pos.x - d.pos.x, G.pos.z - d.pos.z);
    if (along > far * 1.8 + 0.6 && far < 1.4 && this.clearSwim(d.pos.x, d.pos.z, G.pos.x, G.pos.z)) {          // (the trail loops: skip the loop)
      d.tk = T.length - 1; along = far;
    }
    if (d.task && d.task.name === 'peek' && along < 3.2) return;               // (Dot: having a good look first)
    if ((moving && along > keep + 0.12) || (along > 1.6 && far > 0.8)) {
      if (!d.task || d.task.name !== 'trail') d.task = TRAIL();
      d.pace = along > 2.4 ? 'run' : along > 0.8 ? 'hurry' : 'walk';
      return;
    }
    if (!d.task || d.task.name === 'trail') d.task = this.feedBout(d);
  }
  // a frog's splash or croak (pond.js): a curious duck nearby paddles over for a look
  heard(x, z) {
    if (this.plan !== 'paddle') return;
    for (const d of this.ducks) {
      const dist = Math.hypot(x - d.pos.x, z - d.pos.z);
      if (d.idx === 0 || dist > 3.2 || d.wet < 0.5 || this.time < d.peekOk || this.r() > d.curious) continue;
      if (d.task && !/^(feed|trail)$/.test(d.task.name)) continue;
      d.peekOk = this.time + 25 + this.r() * 20; d.peerAt = [x, z];
      const L = [];
      if (dist > 1.1) {
        const k = (dist - 0.8) / dist, tx = d.pos.x + (x - d.pos.x) * k, tz = d.pos.z + (z - d.pos.z) * k;
        if (this.wetAt(tx, tz) > 0.95 && this.clearWater(tx, tz, 0.3) && this.clearSwim(d.pos.x, d.pos.z, tx, tz)) L.push(DK.swim(tx, tz, 'hurry', 0.12));
      }
      L.push(DK.act('peer', 2.2 + this.r() * 1.5));
      if (this.r() < 0.4) L.push(DK.quack(1));
      d.task = DK.seq('peek', L);
    }
  }
  unstick(d) {
    if (this.plan === 'rest' && !this.dry(d) && !this.restOver) {            // (on the way to the bank: never mind the rest)
      this.plan = 'paddle';
      for (const o of this.ducks) if (o.task && o.task.name === 'rest') o.task = this.dry(o) ? DK.seq('toWater', (() => { const L = []; this.intoWater(o, L); return L; })()) : null;
      return;
    }
    if (d.task && d.task.name === 'home' && this.house && d.task.climb !== undefined && d.task.i < d.task.climb && !d.inside) { d.task = this.homeTask(d); return; }      // (on her way to the house: a new way there)
    if (d.task && /^(home|morning)$/.test(d.task.name)) { if (d.task.list && d.task.i < d.task.list.length - 1) d.task.i++; return; }      // (going in or out of their house: on with it)
    if (d.task && d.task.list && d.task.i < d.task.list.length - 1 && !this.dry(d)) { d.task.i++; return; }      // (on to the next part of what she's doing)
    if (d.task && d.task.name !== 'night') d.task = null;
  }
  onTap(d) { this.say(d); if (d.task && /^(upend|bath)/.test(d.task.name)) d.task = null; }
  // ---- the water's answers: rings, splashes (the frogs' pond draws them), wakes; and the "Quack!"
  ring(x, z, size, bright = 0.16) { this.rings.add(x, z, 0, size * 0.25, size, 1.6, bright); }
  splash(x, z, k) { const F = this.o.fx && this.o.fx(); if (F && F.splash) F.splash(x, z, k, true); else this.ring(x, z, 0.5 * k); }
  say(d) {
    let b = this.bubbles.find(q => q.life <= 0);
    if (!b) { b = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: this.bubbleTex, transparent: true, depthWrite: false, depthTest: false })), life: 0 }; b.sp.material.userData.noGrade = true; b.sp.renderOrder = 12; this.group.add(b.sp); this.bubbles.push(b); }
    b.d = d; b.life = b.full = 1.3; b.sp.visible = true;
  }
  // never through each other, nor into a goose, Biscuit or Rusty: each body is two round parts (breast and back) along
  // the way she faces; a duck that overlaps is eased away (only on the water when she's in it, never into anything on the
  // bank, never onto the dock)
  keepApart(others) {
    const parts = (o) => o.isDuck ? [[0.085, 0.085], [-0.075, 0.085]] : o.isGoose ? [[0.14, 0.155], [-0.13, 0.155]] : [[0, 0.3]];
    const can = (d, x, z) => d.wet > 0.5 ? (this.wetAt(x, z) > 0.5 && this.clearWater(x, z, 0.05)) : (!this.nav || this.nav.freeAt(x, z) || !this.nav.freeAt(d.pos.x, d.pos.z) || this.wetAt(x, z) > 0.2);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < this.ducks.length; i++) {
      const d = this.ducks[i], list = [...this.ducks.slice(i + 1), ...others].filter(o => !o.inside);
      if (d.inside) continue;
      for (const o of list) {
        let bx = 0, bz = 0, worst = 0;
        for (const [a, ra] of parts(d)) for (const [c, rc] of parts(o)) {
          const ax = d.pos.x + Math.sin(d.heading) * a, az = d.pos.z + Math.cos(d.heading) * a, cx = o.pos.x + Math.sin(o.heading || 0) * c, cz = o.pos.z + Math.cos(o.heading || 0) * c;
          const dx = ax - cx, dz = az - cz, dd = Math.hypot(dx, dz), over = ra + rc - dd;
          if (over > worst && dd > 1e-4) { worst = over; bx = dx / dd; bz = dz / dd; }
        }
        if (worst <= 0) continue;
        // (between two ducks the one behind in the line gives way most; one asleep stays put, the other goes round)
        const share = !o.isDuck ? 1 : d.asleep !== o.asleep ? (d.asleep ? 0 : 1) : d.idx < o.idx ? 0.2 : 0.8;
        if (can(d, d.pos.x + bx * worst * share, d.pos.z + bz * worst * share)) { d.pos.x += bx * worst * share; d.pos.z += bz * worst * share; }
        if (o.isDuck && can(o, o.pos.x - bx * worst * (1 - share), o.pos.z - bz * worst * (1 - share))) { o.pos.x -= bx * worst * (1 - share); o.pos.z -= bz * worst * (1 - share); }
      }
    }
  }
  // swimming ducks stay in the water and off the dock (those crossing the bank on a way in or out are on their way)
  keepIn(d) {
    if (d.wet < 0.5 || (d.task && /^(rest|toWater|scramble|night)$/.test(d.task.name) && d.task.list && this.crossing(d))) return;
    if (this.house && d.task && /^(home|morning)$/.test(d.task.name) && Math.hypot(d.pos.x - this.house.foot[0], d.pos.z - this.house.foot[1]) < 1.3) return;     // (to and from their house's ramp)
    const [s, t] = this.pondAt(d.pos.x, d.pos.z);
    if (s > 0.86) { const p = this.at(t, 0.86); d.pos.x = p[0]; d.pos.z = p[1]; }
    for (const [ax, az, r] of this.avoid) {
      const dx = d.pos.x - ax, dz = d.pos.z - az, dd = Math.hypot(dx, dz), m = r + 0.1;
      if (dd < m && dd > 1e-4) { d.pos.x = ax + dx / dd * m; d.pos.z = az + dz / dd * m; }
    }
  }
  crossing(d) { const c = d.task.list[d.task.i]; return c && (c.name === 'straight' || c.name === 'path'); }
  update(dt, hour) {
    this.time += dt;
    const others = this.o.others ? this.o.others().filter(Boolean) : [];
    this.near = [...this.ducks, ...others];
    if (!this.placed) this.place(hour);
    const [Ro, Da, Do] = this.ducks, night = this.night(hour);
    if (night && this.plan !== 'night') this.goNight();
    if (!night && this.plan === 'night') this.wakeUp();
    // on the bank: anyone coming close and they're off into the water
    if (this.plan === 'rest' && others.some(o => this.ducks.some(d => d.wet < 0.5 && Math.hypot(o.pos.x - d.pos.x, o.pos.z - d.pos.z) < 1.3))) this.scramble();
    if (!Ro.task) Ro.task = this.plan === 'night' ? DK.seq(this.house ? 'home' : 'night', [DK.act('sleep', 1e9)]) : this.nextLead(Ro, hour);
    for (const d of [Da, Do]) this.follow(d, dt);
    if (this.plan === 'morning' && this.ducks.every(d => !d.task || d.task.name !== 'morning')) this.plan = 'paddle';
    for (const d of this.ducks) { d.actT += dt; d.update(dt); }
    this.keepApart(others);
    // blocked (a goose sitting right where she's heading, say): she gives up on it and does something else
    for (const d of this.ducks) {
      d.blockedT = /^(swim|walk)$/.test(d.act) && d.vs < 0.02 && d.react <= 0 ? (d.blockedT || 0) + dt : 0;
      if (d.blockedT > 4) { d.blockedT = 0; this.unstick(d); }
    }
    for (const d of this.ducks) this.keepIn(d);
    // the trails the followers follow
    for (const d of this.ducks) {
      const T = d.trail, last = T[T.length - 1];
      if (Math.hypot(d.pos.x - last[0], d.pos.z - last[1]) > 0.06) T.push([d.pos.x, d.pos.z]);
      if (T.length > 300) { const cut = T.length - 300; T.splice(0, cut); for (const f of this.ducks) if (f.after === d) f.tk = Math.max(0, f.tk - cut); }
    }
    // asleep on the raft: drifting about a little round their places
    if (this.plan === 'night') for (const d of this.ducks) if (d.asleep && d.task && d.task.name === 'night') {
      const p = this.raft[d.idx], tx = p[0] + 0.05 * Math.sin(this.time * 0.07 + d.idx * 2), tz = p[1] + 0.05 * Math.cos(this.time * 0.06 + d.idx);
      d.heading += dt * 0.03 * Math.sin(this.time * 0.05 + d.idx * 2); d.pos.x += (tx - d.pos.x) * Math.min(1, dt * 0.25); d.pos.z += (tz - d.pos.z) * Math.min(1, dt * 0.25);
    }
    // shadows on the grass; wakes behind them as they swim; a faint ring now and then round one afloat
    const light = this.o.light ? this.o.light() : 1;
    for (const d of this.ducks) {
      d.shadow.position.set(d.pos.x, d.pos.y + 0.013, d.pos.z); d.shadow.rotation.y = d.heading; d.shadow.visible = d.wet < 0.3 && this.group.visible;
      if (d.wet > 0.6 && d.vs < 0.03 && (d.ringIn = (d.ringIn === undefined ? 1 + this.r() * 3 : d.ringIn) - dt) <= 0) { d.ringIn = 3 + this.r() * 3; if ((!d.asleep || this.r() < 0.3) && (d.A.upend || 0) < 0.2) this.ring(d.pos.x, d.pos.z, 0.24, 0.07); }
    }
    this.wakes.update(dt, this.ducks, light); this.rings.update(dt, light);
    for (const b of this.bubbles) {
      if (b.life <= 0) continue; b.life -= dt; if (b.life <= 0 || !this.group.visible) { b.life = 0; b.sp.visible = false; continue; }
      const u = 1 - b.life / b.full, s = 0.36 * Math.min(1, u * 6);
      b.sp.scale.set(s, s * 112 / 256, 1); b.sp.position.set(b.d.pos.x, b.d.pos.y + b.d.rig.by + 0.27 + u * 0.03, b.d.pos.z); b.sp.material.opacity = Math.min(1, b.life * 3);
    }
  }
  centre(v) { const n = this.ducks.length; return v.set(this.ducks.reduce((a, d) => a + d.pos.x, 0) / n, 0, this.ducks.reduce((a, d) => a + d.pos.z, 0) / n); }
}

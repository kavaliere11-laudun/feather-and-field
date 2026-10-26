// Biscuit, the farm dog (Audrey, 23 Oct: a Border Collie whose name the player chooses, Biscuit by default; then "Go on all
// good"): his day on the farm. He lives in a kennel by the farmhouse with his bowls and his ball. By day he does his rounds
// (trotting from coop to coop to sit and watch the hens, nose down along the way, past the farm's corners), naps in the sun
// in front of his kennel, has his breakfast and a drink, plays with his ball (tosses it, chases it, pounces on it, carries it
// home), chases his tail or rolls in the grass, sits and watches the farm, and creeps up on the geese with the herding stare
// until Gertrude hisses at him and he bounces off happily. At night he goes into his kennel, turns round, lies down with his
// chin on his paws at the door and sleeps ("z"); in the morning he comes out with a stretch, a yawn and a shake.
// He's the foxes' animal (beasts.js Fox: the same bones, gait, face and moves); the way round the village is the shared
// grid (nightvisit.js NavGrid), over the footbridges' decks as Rusty goes. Tap him: he looks at you, hops and bows, wagging
// (asleep: one eye opens and his tail thumps).
import * as THREE from 'three';
import { Fox, T, seq, look, playFace, sitWatch, lieDown, yawn, hop, bowAt, tailChase, roll } from './beasts.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = x => Math.min(1, Math.max(0, x));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
// bedtime 21:30 (before the hens, who go in from 22:00), up at 6:15 (after the rooster's crow)
export const DOG_NIGHT = h => h >= 21.5 || h < 6.25;
// the kennel (stylized/beasts.py KENNEL, in the browser's axes: x out of the door, z to its side, the bowls' side +z)
export const KENNEL = { x0: -0.62, x1: 0.62, half: 0.56, floor: 0.065, board: [0.648, 0.86, 0], boardSize: [0.32, 0.1], food: [0.9, 0.8], water: [0.92, 0.52], r: 0.127 };
const BALL_R = 0.042, _mw = new THREE.Vector3();

export class FarmDog {
  // opts: { joints, name, kennel: [x, z, heading out of its door], nav, groundY(x, z), spots(): { coops: [[x, z, heading to
  // the pen], ...], farm: [[x, z], ...] }, geese(): the geese, foxes(): the fox family, toCamera(x, z): the heading that faces
  // the player }
  constructor(scene, opts, r) {
    this.r = r; this.nav = opts.nav; this.groundY = opts.groundY; this.spotsOf = opts.spots; this.geeseOf = opts.geese || (() => null);
    this.foxesOf = opts.foxes || (() => null); this.toCamera = opts.toCamera || (() => 0); this.joints = opts.joints; this.out = true;
    this.visitOf = opts.visit || (() => null); this.guard = null; this.heard = 0; this.barkT = 0;
    this.wakeOn = opts.wakeOn || null;                       // (the morning replay: he wakes when the film says, replay.js)
    this.den = opts.den || null;                             // (where the foxes' den is: he sees Rusty that far and no further)
    this.group = new THREE.Group(); scene.add(this.group);
    const [kx, kz, kh] = opts.kennel, th = kh - Math.PI / 2;
    this.k = { x: kx, z: kz, h: kh, c: Math.cos(th), s: Math.sin(th) };
    const d = this.dog = new Fox(this, 'collie', opts.name || 'Biscuit', 'dog', 1, r);
    d.home = false; d.root.visible = true; d.tagY = 0.86;
    this.foxes = [d];
    this.hour = 12; this.time = 0; this.asleep = false; this.last = ''; this.mealIn = 0; this.geeseIn = 30; this.peek = 0;
    this.ball = makeBall(); this.group.add(this.ball.mesh);
    const b = this.K(1.3, -0.68); this.ball.mesh.position.set(b[0], BALL_R, b[1]);
    this.zs = [0, 1].map(() => zSprite()); for (const z of this.zs) this.group.add(z.sp);
    this.zIn = 0;
  }
  // a point in the kennel's frame (x out of its door, z along its side) in the village
  K(lx, lz) { const { x, z, c, s } = this.k; return [x + lx * c + lz * s, z - lx * s + lz * c]; }
  // and back: a village point in the kennel's frame
  local(x, z) { const { c, s } = this.k, dx = x - this.k.x, dz = z - this.k.z; return [dx * c - dz * s, dx * s + dz * c]; }
  setName(n) { this.dog.rename(n); }
  visible() { return true; }
  centre(v) { return v.set(this.dog.pos.x, 0, this.dog.pos.z); }

  // ---- where he is when the page opens: asleep in his kennel at night, by his door by day
  place(hour) {
    const d = this.dog;
    if (DOG_NIGHT(hour)) { const p = this.K(0.08, 0); d.pos.set(p[0], 0, p[1]); d.heading = this.k.h; d.A.lie = 1; d.A.chin = 1; d.task = this.wrap(this.sleepTask()); this.bedtime = true; this.asleep = true; }
    else { const p = this.K(1.5, -0.2); d.pos.set(p[0], 0, p[1]); d.heading = this.toCamera(p[0], p[1]); }
    d.lastPos = d.pos.clone(); this.placed = true;
  }

  // back to how he'd be at this hour, as when the page opens (the morning replay's cast, before each showing)
  // the game: his kennel moved (the player's), and him back at it
  setKennel(kennel) {
    const [kx, kz, kh] = kennel, th = kh - Math.PI / 2;
    this.k = { x: kx, z: kz, h: kh, c: Math.cos(th), s: Math.sin(th) };
    this.reset();
  }
  reset() {
    const d = this.dog;
    this.guard = null; this.heard = 0; this.barkT = 0; this.placed = false; this.bedtime = false; this.asleep = false;
    d.todo = []; d.task = null;
    if (this.ball.state !== 'ground') { this.group.add(this.ball.mesh); this.ball.state = 'ground'; this.ball.vel.set(0, 0, 0); }
    const b = this.K(1.3, -0.68); this.ball.mesh.position.set(b[0], BALL_R, b[1]);
  }

  // ---- what he does next
  nextTask(f) {
    const h = this.hour, R = this.r;
    if (this.guard) { this.guard.done = true; this.guard = null; }
    if (this.ball.state === 'mouth') return this.wrap(this.dropBall());                 // (interrupted while carrying it)
    if (DOG_NIGHT(h)) return this.wrap(this.bedTask());
    if (this.asleep) return this.wrap(this.wakeTask());
    // the day: what he fancies, by the time of day (more rounds morning and evening, a nap after lunch), never the same
    // thing twice running; breakfast first thing
    const geese = this.geeseOk(), w = {
      rounds: h < 10 || h > 17 ? 3 : 2, nap: h > 12 && h < 16 ? 3 : 1, meal: this.mealIn <= 0 ? (h < 9 ? 6 : 1.2) : 0, ball: 1.6,
      play: 1.0, watch: 1.0, geese: geese && this.geeseIn <= 0 ? 1.6 : 0,
    };
    w[this.last] = 0;
    let sum = 0; for (const k in w) sum += w[k];
    let x = R() * sum, pick = 'watch';
    for (const k in w) { x -= w[k]; if (x <= 0) { pick = k; break; } }
    if (this.force) { pick = this.force; this.force = null; }            // (tests: what he does next)
    this.last = pick; this.doing = pick;
    if (pick === 'meal') this.mealIn = 600;
    if (pick === 'geese') this.geeseIn = 240;
    return this.wrap(this[pick + 'Task']() || this.watchTask());
  }
  // every task he does: carrying his ball (mouth round it), up on the kennel's floor inside it
  wrap(task) {
    const self = this;
    return { name: task.name, inner: task, cur() { return task.cur ? task.cur() : task; }, run(f, dt) {
      const done = task.run(f, dt);
      if (self.barkT > 0) { const k = Math.sin(Math.PI * Math.min(1, (0.28 - self.barkT) / 0.28)); f.A.mouthGoal = Math.max(f.A.mouthGoal || 0, 0.95 * k); f.A.mouth = Math.max(f.A.mouth || 0, 0.8 * k); f.A.earsGoal = 0.8; f.A.wideGoal = 0.5; }      // woof!
      if (self.ball.state === 'mouth') { f.A.mouthGoal = Math.max(f.A.mouthGoal || 0, 0.42); f.A.mouth = Math.max(f.A.mouth || 0, 0.38); }
      const [lx, lz] = self.local(f.pos.x, f.pos.z);
      if (Math.abs(lz) < KENNEL.half + 0.05) f.A.lift = Math.max(f.A.lift || 0, KENNEL.floor * smooth(KENNEL.x1 + 0.28, KENNEL.x1 - 0.12, lx) * (lx > KENNEL.x0 - 0.2 ? 1 : 0));
      return done;
    } };
  }
  tapped(f) {
    if (this.asleep) { this.peek = 2.2; return; }          // one eye opens, a thump of the tail
    if (this.guard) { this.bark(this.visitOf()); return; }   // (busy seeing Rusty off: just a woof)
    const h = this.toCamera(f.pos.x, f.pos.z), self = this;
    f.todo.unshift(this.wrap(seq({ name: 'hello', t: 0, run(f, dt) { this.t += dt; f.turnTo(h, dt, 5); f.A.earsGoal = 1; f.A.wideGoal = 0.5; f.A.wagGoal = 1; f.A.lidTiltGoal = -0.5; return this.t > 0.5; } },
      hop(), bowAt(null, 1.3), T.wait(1.2, (f, t) => { f.A.sitGoal = 1; playFace(f, 0.9); f.A.wagGoal = 1; f.A.headTiltGoal = t < 0.6 ? 0.3 : 0; }))));
    f.task = null; self.last = '';
  }
  // the farmer coming over to give him a pat (farmlife.js): he drops what he's doing, trots to the spot in front of where
  // the farmer will stop (to (x, z)), sits there, ears up and tail going, watching the farmer come; `ready` once he's sat
  // facing the farmer there. The pat itself is a tap (tapped): his hello. farmer: { pos }
  awaitPat(farmer, x, z) {
    if (this.asleep || this.guard || this.bedtime) return null;
    const self = this, d = this.dog, go = this.go(x, z, 'trot');
    const task = { name: 'awaitpat', t: 0, ready: false, run(f, dt) {
      this.t += dt; if (this.t > 30) return true;              // (the farmer never came: something else)
      const p = farmer.pos, toF = Math.atan2(p.x - f.pos.x, p.z - f.pos.z);
      if (!this.there) { this.there = go.run(f, dt) || Math.hypot(x - f.pos.x, z - f.pos.z) < 0.08; return false; }
      f.turnTo(toF, dt, 4); f.A.sitGoal = 1; f.A.earsGoal = 1; f.A.wagGoal = 1; f.A.wideGoal = 0.3; f.A.lookPitchGoal = -0.25;
      this.ready = this.t > 0.5 && f.spd < 0.1 && Math.abs(wrap(toF - f.heading)) < 0.35;
      return false;
    } };
    d.todo = [this.wrap(task)]; d.task = null; this.last = 'pat'; this.doing = 'pat';
    return task;
  }

  // ---- getting about
  // along the village grid to (x, z): trotting, walking or running; sniff: nose down along the ground, stopping now and then
  go(x, z, pace = 'trot', sniff = false) {
    const self = this;
    return { name: 'go', t: 0, run(f, dt) {
      if (!this.pts) {
        const p = self.nav ? self.nav.find(f.pos.x, f.pos.z, x, z) : [[f.pos.x, f.pos.z], [x, z]];
        if (!p) return true;                                  // (no way there: something else)
        this.pts = p.slice(1); if (this.pts.length) this.pts[this.pts.length - 1] = [x, z]; this.i = 0; this.stopIn = 2 + self.r() * 3;
      }
      this.t += dt;
      if (this.i >= this.pts.length || this.t > 150) return true;
      if (sniff && (this.stopIn -= dt) < 0) {                 // a good smell: stop, nose down, tail going
        if (this.stopIn > -1.6) { f.A.lookPitchGoal = 1.1; f.A.crouchGoal = 0.2; f.A.earsGoal = 0.6; f.A.wagGoal = 0.5; f.A.lookYawGoal = 0.25 * Math.sin(this.t * 3); return false; }
        this.stopIn = 2.5 + self.r() * 4;
      }
      const [px, pz] = this.pts[this.i], last = this.i === this.pts.length - 1;
      if (f.spd < 0.15 && Math.abs(wrap(Math.atan2(px - f.pos.x, pz - f.pos.z) - f.heading)) > 1.1) { f.turnTo(Math.atan2(px - f.pos.x, pz - f.pos.z), dt, 5); return false; }      // (from a standstill: round first, then off)
      let gait = pace;
      if (gait !== 'walk' && !last && Math.hypot(px - f.pos.x, pz - f.pos.z) < (gait === 'run' ? 0.7 : 0.45)) {     // (easing off round a sharp bend, so he doesn't swing wide into what he's going round)
        const [nx, nz] = this.pts[this.i + 1], a1 = Math.atan2(px - f.pos.x, pz - f.pos.z), a2 = Math.atan2(nx - px, nz - pz);
        if (Math.abs(wrap(a2 - a1)) > 0.45) gait = gait === 'run' ? 'trot' : 'walk';
      }
      if (f.moveTo(px, pz, dt, gait, !last) || Math.hypot(px - f.pos.x, pz - f.pos.z) < (last ? 0.06 : 0.12)) this.i++;
      if (sniff && gait !== 'run') { f.A.lookPitchGoal = 0.55; f.A.earsGoal = 0.4; f.A.wagGoal = 0.2; }
      else { f.A.earsGoal = gait === 'run' ? -0.3 : 0.55; f.A.tailUpGoal = gait === 'run' ? 0.2 : 0.05; }
      self.onDeck(f);
      return this.i >= this.pts.length;
    } };
  }
  // up and over a footbridge's arched deck (as Rusty does)
  onDeck(f) {
    if (!this.groundY) return;
    const S = f.q.S * f.scale, sx = Math.sin(f.heading), cz = Math.cos(f.heading), G = this.groundY;
    const fy = G(f.pos.x + sx * 0.14 * S, f.pos.z + cz * 0.14 * S), hy = G(f.pos.x - sx * 0.13 * S, f.pos.z - cz * 0.13 * S);
    if (fy || hy) {
      f.A.lift = (fy + hy) / 2; f.A.pitch = -Math.atan2(fy - hy, 0.27 * S);
      f.A.groundF = fy; f.A.groundH = G(f.pos.x - sx * 0.185 * S, f.pos.z - cz * 0.185 * S);
      f.A.groundAt = d => G(f.pos.x + sx * d, f.pos.z + cz * d);
    }
  }
  // straight to a point (in and out of his kennel, a step to his bowl)
  straight(x, z, pace = 'walk', set) {
    return { name: 'step', t: 0, run(f, dt) { this.t += dt; if (set) set(f, this.t); return f.moveTo(x, z, dt, pace) || this.t > 12; } };
  }
  face(h, rate = 4) { return { name: 'face', t: 0, run(f, dt) { this.t += dt; return f.turnTo(h, dt, rate) < 0.05 || this.t > 3; } }; }
  // round on the spot a couple of times before lying down, as dogs do
  circle(n = 2) {
    return { name: 'circle', a: 0, run(f, dt) { const s = 3.2 * dt; f.heading += s; f.turn = 3.2; f.turned = true; this.a += s; f.A.lookPitchGoal = 0.4; f.A.earsGoal = 0.2; return this.a > n * Math.PI * 2; } };
  }
  shake(secs = 0.9) { return T.wait(secs, f => { f.A.shakeGoal = 1; f.A.squintGoal = 1; f.A.earsGoal = -0.5; }); }
  stretch() {
    return seq(T.wait(2.2, (f, t) => { f.A.bowGoal = 1; f.A.tailUpGoal = 0.5; if (t > 0.4) yawn(f, (t - 0.4) / 1.6); }),        // the long stretch, a yawn
      T.wait(0.5, f => { f.A.earsGoal = 0.5; }));
  }

  // ---- night and morning
  bedTask() {
    const k = this.k, door = this.K(1.2, 0), inn = this.K(-0.02, 0), self = this;
    const L = [];
    if (this.ball.state === 'mouth') L.push(this.dropBall());
    L.push(this.go(door[0], door[1], 'trot'), this.face(k.h + Math.PI),
      this.straight(inn[0], inn[1], 'walk', f => { self.ducking(f); f.A.tailUpGoal = -0.1; }),      // in, head down under the doorway
      { name: 'turn', t: 0, run(f, dt) {                       // round to face out: low, curled round the way he turns, head down
        this.t += dt; const off = wrap(k.h - f.heading);
        if (this.dir === undefined) this.dir = off >= 0 ? 1 : -1;
        f.A.crouchGoal = 0.9; f.A.duckGoal = 1; f.A.lookPitchGoal = 0.75; f.A.lookYawGoal = 1.5 * this.dir * smooth(0.05, 0.4, Math.abs(off)); f.A.earsGoal = -1; f.A.tailUpGoal = -0.3;
        if (Math.abs(off) < 0.05 || this.t > 5) return true;
        const s = Math.min(Math.abs(off), 2.0 * dt) * this.dir; f.heading += s; f.turn = s / dt; f.turned = true;
        const to = self.K(-0.02, -0.035 * this.dir * Math.sin(Math.min(Math.PI, Math.abs(wrap(f.heading - k.h - Math.PI)))));       // (a little to the far side as his head comes round)
        f.pos.x += (to[0] - f.pos.x) * Math.min(1, dt * 6); f.pos.z += (to[1] - f.pos.z) * Math.min(1, dt * 6);
        return false;
      } },
      this.straight(...this.K(0.08, 0), 'walk'),
      lieDown(3.6), this.sleepTask());
    return seq(...L);
  }
  // under his kennel's roof and through its doorway: low, head down, ears back (until he's out in front of it)
  ducking(f) {
    const [lx] = this.local(f.pos.x, f.pos.z), k = smooth(KENNEL.x1 + 0.75, KENNEL.x1 + 0.45, lx);
    f.A.crouchGoal = Math.max(f.A.crouchGoal || 0, 0.8 * k); f.A.duckGoal = k; f.A.duck = Math.max(f.A.duck || 0, 0.8 * k); f.A.lookPitchGoal = 0.6 * k; f.A.earsGoal = -0.9 * k;
  }
  sleepTask() {
    const self = this;
    return { name: 'sleep', t: 0, run(f, dt) {
      this.t += dt; self.asleep = true;
      const A = f.A; A.lieGoal = 1; A.chinGoal = 1; A.squintGoal = 1; A.earsGoal = -0.1; A.lidSoftGoal = 0.2;      // (ears relaxed, but clear of the doorway)
      if (self.peek > 0) { self.peek -= dt; A.winkLGoal = -1; A.wagGoal = 0.45; A.earLGoal = 0.4; }              // tapped: one eye opens, the tail thumps
      return !DOG_NIGHT(self.hour);
    } };
  }
  wakeTask() {
    const self = this, out = this.K(1.32, 0);
    return seq(T.wait(2.4, (f, t) => {
      const A = f.A; A.lieGoal = 1; A.chinGoal = t < 0.7 ? 1 : 0; A.squintGoal = 1 - smooth(0.2, 1.0, t);
      if (t > 1.0) yawn(f, (t - 1.0) / 1.3);
    }), T.wait(0.7, f => { self.asleep = false; f.A.earsGoal = 0.6; }),
      { name: 'duck', t: 0, run(f, dt) { this.t += dt; self.ducking(f); return this.t > 0.6; } },          // (head down first)
      this.straight(out[0], out[1], 'walk', f => self.ducking(f)),
      this.face(this.toCamera(out[0], out[1])), this.stretch(), this.shake(), T.wait(0.8, (f, t) => look(f, t)));
  }

  // ---- by day
  roundsTask() {
    const S = this.spotsOf ? this.spotsOf() : { coops: [], farm: [] }, R = this.r, L = [];
    const coops = S.coops.slice().sort(() => R() - 0.5).slice(0, 2), farm = S.farm.slice().sort(() => R() - 0.5).slice(0, 1);
    const stops = [...coops.map(c => ['coop', c]), ...farm.map(c => ['farm', c])].sort(() => R() - 0.5);
    for (const [kind, s] of stops) {
      L.push(this.go(s[0], s[1], 'trot', R() < 0.6));
      if (kind === 'coop') L.push(this.face(s[2]), T.wait(5 + R() * 4, (f, t) => {               // sitting by the fence, watching the hens
        f.A.sitGoal = 1; f.A.earsGoal = 0.8; f.A.lookYawGoal = 0.35 * Math.sin(t * 0.8); f.A.lookPitchGoal = 0.1; f.A.wagGoal = t % 4 < 1.5 ? 0.6 : 0.15; f.A.lidTiltGoal = -0.25;
      }));
      else L.push(T.wait(2.5 + R() * 2, (f, t) => { f.A.lookPitchGoal = 1.0; f.A.crouchGoal = 0.15; f.A.wagGoal = 0.4; f.A.lookYawGoal = 0.3 * Math.sin(t * 2.5); }),       // a long sniff
        T.wait(2, (f, t) => look(f, t)));
    }
    return L.length ? seq(...L) : null;
  }
  napTask() {
    const R = this.r, at = this.K(1.5 + R() * 0.25, -0.12 - R() * 0.3), self = this;
    return seq(this.go(at[0], at[1], 'trot'), this.circle(1 + (R() < 0.5 ? 1 : 0)), this.face(this.toCamera(at[0], at[1]) + (R() - 0.5) * 1.6, 3),
      lieDown(4), T.wait(16 + R() * 20, (f, t) => {
        const A = f.A; A.lieGoal = 1; A.chinGoal = 1; A.squintGoal = 1; A.earsGoal = -0.3; A.lidSoftGoal = 0.2;
        if (t % 9 > 8.3) A.earLGoal = 0.7;                                                     // an ear twitches at a sound
        if (self.peek > 0) { self.peek -= f.A.dt; A.winkLGoal = -1; A.wagGoal = 0.45; }
      }), T.wait(1.5, (f, t) => { f.A.lieGoal = 1; yawn(f, t / 1.4); }), this.stretch(), this.shake());
  }
  mealTask() {
    const fb = this.K(KENNEL.food[0] + 0.44, KENNEL.food[1]), wb = this.K(KENNEL.water[0] + 0.44, KENNEL.water[1]), h = this.k.h + Math.PI, R = this.r;
    return seq(this.go(fb[0], fb[1], 'trot'), this.face(h),
      T.wait(4.5 + R() * 2, (f, t) => { this.inBowl(f, KENNEL.food, 0.075); f.A.mouthGoal = 0.35 * Math.max(0, Math.sin(t * 9)); f.A.wagGoal = 0.7; f.A.earsGoal = 0.3; f.A.lidSoftGoal = 0.2; }),     // crunch crunch
      T.wait(0.8, (f, t) => { f.A.mouthGoal = 0.3; f.A.lookPitchGoal = -0.1; }),             // a lick of the lips
      this.straight(wb[0], wb[1], 'walk'), this.face(h),
      T.wait(3 + R() * 1.5, (f, t) => { this.inBowl(f, KENNEL.water, 0.06); f.A.mouthGoal = 0.12 + 0.12 * Math.max(0, Math.sin(t * 16)); f.A.earsGoal = 0.2; }),     // lap lap
      T.wait(1.2, (f, t) => { f.A.sitGoal = 1; f.A.mouthGoal = 0.2; look(f, t); }));
  }
  // his head down in a bowl (its middle, h up from the ground), mouth right in it
  inBowl(f, b, h) {
    const w = this.K(b[0], b[1]); f.A.reachGoal = 1; f.A.reachAt = (f.A.reachAt || new THREE.Vector3()).set(w[0], h, w[1]);
    f.A.crouchGoal = 0.1;
  }
  watchTask() {
    const S = this.spotsOf ? this.spotsOf() : { farm: [] }, R = this.r;
    const s = S.farm.length && R() < 0.6 ? S.farm[Math.floor(R() * S.farm.length)] : this.K(1.6, 0.2);
    return seq(this.go(s[0], s[1], 'trot'), this.face(this.toCamera(s[0], s[1]) + (R() - 0.5) * 2, 3), sitWatch(7 + R() * 6));
  }
  playTask() {
    const R = this.r, x = R();
    // somewhere with room round him (a tail chase spins, a roll throws his legs about)
    const room = (px, pz) => !this.nav || [0, 1, 2, 3, 4, 5].every(k => this.nav.freeAt(px + Math.cos(k * 1.05) * 0.7, pz + Math.sin(k * 1.05) * 0.7));
    let spot = [this.dog.pos.x, this.dog.pos.z];
    if (!room(...spot)) { const s = this.K(1.9, -0.5); spot = s; }
    const L = [this.go(spot[0], spot[1], 'trot')];
    if (x < 0.4) L.push(T.wait(0.8, f => { f.A.lookYawGoal = 1.1; f.A.earsGoal = 1; f.A.wideGoal = 0.6; }), tailChase(2.4 + R()), this.shake());   // what's that behind me?
    else if (x < 0.75) L.push(T.wait(0.6, f => { f.A.crouchGoal = 0.4; }), roll(1.8), T.wait(0.6, f => { f.A.lieGoal = 0.6; playFace(f, 0.8); }), this.shake());     // a good roll in the grass
    else L.push(this.zoomies(spot));
    return seq(...L);
  }
  // round and round in a big loop flat out, ears back, grinning, then a play bow and panting
  zoomies(c) {
    const self = this, dir = this.r() < 0.5 ? 1 : -1, a0 = Math.atan2(this.dog.pos.z - c[1], this.dog.pos.x - c[0]);
    let rr = 1.3; while (rr > 0.6 && this.nav && ![0, 1, 2, 3, 4, 5, 6, 7].every(k => this.nav.freeAt(c[0] + Math.cos(k * 0.785) * (rr + 0.3), c[1] + Math.sin(k * 0.785) * (rr + 0.3)))) rr -= 0.2;
    return seq({ name: 'zoomies', t: 0, run(f, dt) {
      this.t += dt; const a = a0 + dir * this.t * 1.4, x = c[0] + Math.cos(a + dir * 0.6) * rr, z = c[1] + Math.sin(a + dir * 0.6) * rr;
      f.moveTo(x, z, dt, 'run', true); playFace(f, 1); f.A.earsGoal = -0.7; f.A.tailUpGoal = 0.3;
      return this.t > 7;
    } }, bowAt(null, 1.2));
  }
  // ---- his ball: picks it up, tosses it, chases it, pounces, again; then takes it home and lies down with it
  ballTask() {
    const B = this.ball; if (B.state !== 'ground') return null;
    const L = [this.fetch()], n = 2 + Math.floor(this.r() * 2);
    for (let i = 0; i < n; i++) L.push(this.toss(), this.chaseBall(), this.fetch(true));
    const home = this.K(1.3 + 0.42, -0.68);                  // (standing so it drops at its place by the kennel)
    L.push(this.go(home[0], home[1], 'trot'), this.face(this.k.h + Math.PI), this.dropBall(), T.wait(0.6, f => { f.A.lookPitchGoal = 0.6; f.A.wagGoal = 0.6; }),
      this.circle(1), lieDown(3), T.wait(5, (f, t) => { f.A.lieGoal = 1; f.A.chinGoal = 1; f.A.lidSoftGoal = 0.35; f.A.wagGoal = t % 3 < 1 ? 0.4 : 0; }));
    return seq(...L);
  }
  // to the ball and pick it up (pounce: a play bow on it first)
  fetch(pounce) {
    const self = this, B = this.ball;
    return { name: 'fetch', t: 0, stage: 0, run(f, dt) {
      this.t += dt; const bp = B.mesh.position, d = Math.hypot(bp.x - f.pos.x, bp.z - f.pos.z), reach = 0.34 * f.q.S;
      if (B.state !== 'ground' && B.state !== 'roll') return this.t > 8;
      if (this.stage === 0) {                                // up to it, nose to it
        const h = Math.atan2(bp.x - f.pos.x, bp.z - f.pos.z);
        if (d > reach + 0.03) {                              // (near enough: the rest is a turn to it and a reach of the neck)
          if (!this.path || this.t - this.at > 1) { this.at = this.t; this.path = self.nav && !self.nav.clearLine(f.pos.x, f.pos.z, bp.x, bp.z) ? self.nav.find(f.pos.x, f.pos.z, bp.x, bp.z) : null; this.pi = 1; }
          let tx = bp.x - Math.sin(h) * (reach - 0.07), tz = bp.z - Math.cos(h) * (reach - 0.07);
          if (this.path && this.pi < this.path.length - 1) { [tx, tz] = this.path[this.pi]; if (Math.hypot(tx - f.pos.x, tz - f.pos.z) < 0.15) this.pi++; }
          f.moveTo(tx, tz, dt, d > 1.5 ? 'trot' : 'walk', true); f.A.lookPitchGoal = 0.5; f.A.earsGoal = 0.8; f.A.wagGoal = 0.6;
          return this.t > 25;
        }
        if (f.turnTo(h, dt, 5) > 0.15) return false;
        this.stage = 1; this.t0 = this.t;
      }
      const u = this.t - this.t0;
      if (pounce && u < 0.7) { f.A.bowGoal = 1; f.A.wagGoal = 1; f.A.lookPitchGoal = 1.3; playFace(f, 0.7); return false; }      // paws on it!
      const v = u - (pounce ? 0.7 : 0);
      // down to it, mouth open wide, and right round it: the jaws close on it, head up with it (Audrey: "he needs to
      // literally grab it with his mouth")
      f.A.wagGoal = 0.8; f.A.earsGoal = 0.7; f.A.crouchGoal = 0.15;
      if (B.state !== 'mouth') {
        f.A.reachGoal = 1; f.A.reachAt = (f.A.reachAt || new THREE.Vector3()).copy(bp); f.A.mouthGoal = 0.85; f.A.lidSoftGoal = 0.15;
        const m = f.q.mouthWorld(_mw), gap = m.distanceTo(bp);
        if ((gap < 0.03 && v > 0.35) || v > 1.4) { self.grab(); this.got = v; }
        return false;
      }
      f.A.mouthGoal = 0.42; f.A.reachGoal = v - this.got < 0.25 ? 1 : 0;      // (a moment with it, then up)
      return v - this.got > 0.75;
    } };
  }
  // a flick of the head: the ball flies off in front of him, somewhere with room
  toss() {
    const self = this, B = this.ball;
    return { name: 'toss', t: 0, run(f, dt) {
      this.t += dt;
      if (this.h === undefined) {                             // which way: a clear landing 1.5-2.4 m off
        for (let k = 0; k < 12 && this.h === undefined; k++) {
          const h = f.heading + (k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.55), far = 2.2;
          const x = f.pos.x + Math.sin(h) * far, z = f.pos.z + Math.cos(h) * far;
          if (!self.nav || (self.nav.clearLine(f.pos.x, f.pos.z, x, z, 0.25) && self.nav.freeAt(x, z))) this.h = h;
        }
        if (this.h === undefined) this.h = null;
      }
      if (this.h === null) { self.release(0, 0); return true; }                              // (no room: just drop it)
      if (f.turnTo(this.h, dt, 4) > 0.1 && this.t < 2) { f.A.wagGoal = 0.8; return false; }
      if (this.t1 === undefined) this.t1 = this.t;
      const u = this.t - this.t1;
      f.A.lookPitchGoal = u < 0.3 ? 0.6 : -0.7; f.A.crouchGoal = u < 0.3 ? 0.3 : 0; f.A.earsGoal = 0.8;      // head down... and up and away
      if (u > 0.36 && B.state === 'mouth') self.release(1.9 + self.r() * 0.5, 2.1);
      if (u > 0.36) { f.A.crouchGoal = 0.5; f.A.wagGoal = 1; f.A.wideGoal = 0.6; f.A.lidTiltGoal = 0.25; }        // watching it go, ready to spring
      return u > 0.9;
    } };
  }
  chaseBall() {
    const self = this, B = this.ball;
    return { name: 'chase', t: 0, run(f, dt) {
      this.t += dt; const bp = B.mesh.position, d = Math.hypot(bp.x - f.pos.x, bp.z - f.pos.z);
      if (d < 0.75 && B.state !== 'air') return true;
      const ok = !self.nav || self.nav.clearLine(f.pos.x, f.pos.z, bp.x, bp.z, 0.15);
      if (ok) f.moveTo(bp.x, bp.z, dt, d > 1.0 ? 'run' : 'trot', true);
      playFace(f, 0.8); f.A.earsGoal = 0.2; f.A.tailUpGoal = 0.35;
      return this.t > 10 || !ok;
    } };
  }
  dropBall() {
    const self = this;
    return T.wait(0.6, (f, t) => { f.A.lookPitchGoal = 0.9; f.A.crouchGoal = 0.2; f.A.mouthGoal = 0.7; if (t > 0.3 && self.ball.state === 'mouth') self.release(0, 0); });
  }
  // the ball into his mouth (on his jaw), and out again flying (speed forward, speed up)
  grab() {
    const B = this.ball, jaw = this.dog.q.bones.jaw;
    jaw.add(B.mesh); B.state = 'mouth';
    B.mesh.position.copy(this.dog.q.mouthSpot()); B.mesh.rotation.set(0, 0, 0);
  }
  release(fwd, up) {
    const B = this.ball, f = this.dog, w = B.mesh.getWorldPosition(new THREE.Vector3());
    this.group.add(B.mesh); B.mesh.position.copy(w);
    B.vel.set(Math.sin(f.heading) * fwd + (this.r() - 0.5) * 0.3 * fwd, up, Math.cos(f.heading) * fwd + (this.r() - 0.5) * 0.3 * fwd);
    B.state = 'air';
  }
  // ---- the geese: up on them low and slow with the stare, until Gertrude has had enough
  geeseOk() {
    const F = this.geeseOf(); if (!F || F.guarding || !F.geese.length) return false;              // (the game: none bought)
    const [G] = F.geese; return !G.asleep && G.wet < 0.1 && !/^(bed|scold|guard|swim|out)/.test(G.task ? G.task.name : '');
  }
  geeseTask() {
    const F = this.geeseOf(); if (!F) return null;
    const self = this, G = F.geese[0];
    // a spot 3 m from her on our side, then the creep
    const a = Math.atan2(this.dog.pos.x - G.pos.x, this.dog.pos.z - G.pos.z);
    let from = null;
    for (const t of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4, 3.1]) { const x = G.pos.x + Math.sin(a + t) * 3, z = G.pos.z + Math.cos(a + t) * 3; if (!from && (!this.nav || this.nav.freeAt(x, z))) from = [x, z]; }
    if (!from) return null;
    // (the game: the pond's fields fenced off until they're yours, so only if he can get to her, and up to her from there)
    if (this.nav && (!this.nav.find(this.dog.pos.x, this.dog.pos.z, from[0], from[1]) || !this.nav.clearLine(from[0], from[1], G.pos.x, G.pos.z, 0.1))) return null;
    const st = { teased: false };
    return seq(this.go(from[0], from[1], 'trot'), {
      name: 'stalk', t: 0, run(f, dt) {                      // the herding crouch, the eye, a slow creep
        this.t += dt; const d = Math.hypot(G.pos.x - f.pos.x, G.pos.z - f.pos.z), h = Math.atan2(G.pos.x - f.pos.x, G.pos.z - f.pos.z);
        f.A.crouchGoal = 0.85; f.A.earsGoal = 1; f.A.lidTiltGoal = 0.45; f.A.lidSoftGoal = 0.1; f.A.tailUpGoal = -0.35; f.A.lookPitchGoal = 0.15;
        if (G.wet > 0.2 || d > 6 || this.t > 30) return true;                   // (she's gone off: never mind)
        if (d > 1.75 && !this.froze) {
          const x = G.pos.x - Math.sin(h) * 1.5, z = G.pos.z - Math.cos(h) * 1.5;
          if (!self.nav || self.nav.clearLine(f.pos.x, f.pos.z, x, z, 0.1)) { f.moveTo(x, z, dt, 'walk', true); f.spd = Math.min(f.spd, 0.22); }
          else return true;
          return false;
        }
        f.turnTo(h, dt, 3);
        if (!this.froze) this.froze = this.t;
        if (this.t - this.froze < 1.4) return false;          // frozen, staring
        if (F.teasedBy) { F.teasedBy(f); st.teased = true; }   // that's enough for Gertrude
        return true;
      } }, {
      name: 'then', run(f, dt) {                              // she hissed: oh! a bounce back, a play bow at her, off happily
        if (!this.L) this.L = st.teased ? seq(T.wait(0.5, f => { f.A.crouchGoal = 0.6; f.A.wideGoal = 1; f.A.earsGoal = -0.5; f.A.lidTiltGoal = -0.4; }),
          { name: 'boing', t: 0, run(f, dt) {
            this.t += dt; const u = this.t / 0.45, back = 0.9 * dt / 0.45, bx = f.pos.x - Math.sin(f.heading) * back, bz = f.pos.z - Math.cos(f.heading) * back;
            if (!self.nav || self.nav.freeAt(bx, bz)) { f.pos.x = bx; f.pos.z = bz; }
            f.A.lift = Math.sin(clamp01(u) * Math.PI) * 0.16; f.A.airGoal = 0.5; f.A.earsGoal = -0.6; f.A.wideGoal = 0.8;
            return u >= 1;
          } }, bowAt(G, 1.4), self.zoomAway(G))
          : seq(T.wait(1.5, (f, t) => { f.A.sitGoal = 1; look(f, t); }));            // (she wandered off: he sits and watches)
        return this.L.run(f, dt);
      } });
  }
  // off happily (it was only a game)
  zoomAway(G) {
    const self = this;
    return { name: 'away', t: 0, run(f, dt) {
      this.t += dt;
      if (!this.to) {
        const a = Math.atan2(f.pos.x - G.pos.x, f.pos.z - G.pos.z);
        for (const t of [0, 0.6, -0.6, 1.2, -1.2, 2, -2]) { const x = f.pos.x + Math.sin(a + t) * 3.5, z = f.pos.z + Math.cos(a + t) * 3.5; if (!this.to && (!self.nav || self.nav.clearLine(f.pos.x, f.pos.z, x, z, 0.2))) this.to = [x, z]; }
        if (!this.to) return true;
      }
      playFace(f, 1); f.A.tailUpGoal = 0.4; f.A.earsGoal = -0.5;
      return f.moveTo(this.to[0], this.to[1], dt, 'run') || this.t > 6;
    } };
  }

  // ---- guarding the farm at night (Audrey, 23 Oct: a team effort): the geese hear Rusty first and honk; Biscuit wakes at
  // their alarm (or Rusty close to his kennel, or the hens squawking, or a while after Rusty's out), barks and races out,
  // the fastest of them, and chases Rusty home (never catching him) while the geese charge along behind; at the edge of
  // the wood he stands barking after him, then runs back to the geese, who've waited for him, and they parade together:
  // he prances round them while they strut their lap of honour, and play-bows and barks at their ta-da. Then to bed.
  watchFor(dt) {
    const V = this.visitOf();
    if (this.guard || !V || !DOG_NIGHT(this.hour)) return;
    if (this.wakeOn) { if (V.active() && V.fox.root.visible && this.wakeOn()) this.raise(V, this.geeseOf() && this.geeseOf().guarding); return; }
    if (V.state !== 'out' || !V.fox.root.visible) { if (V.state !== 'out') this.heard = 0; return; }
    const F = this.geeseOf(), f = V.fox, d = Math.hypot(f.pos.x - this.dog.pos.x, f.pos.z - this.dog.pos.z);
    this.heard += dt;
    const geese = F && F.guarding && F.time - (F.raisedAt || 0) > 1.4;
    if (geese || d < 9 || V.pecks > 0 || this.heard > 45) this.raise(V, geese);
  }
  raise(V, geese) {
    const d = this.dog;
    this.guard = { stage: 'wake', done: false }; (V.helpers || (V.helpers = {})).dog = true;
    d.todo = []; d.task = this.wrap(this.guardTask(V));
    V.hint(V.T(geese ? 'dogToo' : 'dogHeard'));
  }
  bark(V) {
    if (!V || !V.fx) return;
    this.barkT = 0.28; const h = this.dog.q.bones.head.getWorldPosition(new THREE.Vector3());
    V.fx.pop(V.lang === 'fr' ? 'ouaf' : 'woof', h.add(new THREE.Vector3(0, 0.34, 0)), 0.32, 1.1);
  }
  guardTask(V) {
    const self = this, f = V.fox, G = this.guard, door = this.K(1.2, 0);
    // along the village grid to (tx, tz), the way replanned as it moves (round everything, over the footbridges)
    const steer = (st, d, dt, tx, tz, pace, near = 0.1) => {
      st.re = (st.re || 0) - dt;
      if (st.re <= 0 || !st.path || !st.path.length || Math.hypot(tx - st.tx, tz - st.tz) > 0.8) {
        st.re = 0.6; st.tx = tx; st.tz = tz;
        let p = self.nav ? self.nav.find(d.pos.x, d.pos.z, tx, tz) : [[d.pos.x, d.pos.z], [tx, tz]];
        for (const r of [1.6, 2.4, 3.2]) for (let k = 0; k < 8 && !p; k++) {          // (somewhere he can't get to: the nearest place round it he can)
          const x = tx + Math.cos(k * 0.785) * r, z = tz + Math.sin(k * 0.785) * r;
          if (self.nav.freeAt(x, z)) p = self.nav.find(d.pos.x, d.pos.z, x, z);
        }
        if (p) st.path = p.slice(1);
        if (!st.path || !st.path.length) st.path = [[d.pos.x, d.pos.z]];
      }
      while (st.path.length > 1 && Math.hypot(st.path[0][0] - d.pos.x, st.path[0][1] - d.pos.z) < 0.15) st.path.shift();
      const p = st.path[0], end = st.path.length === 1 && Math.hypot(p[0] - d.pos.x, p[1] - d.pos.z) < near;
      if (!end) d.moveTo(p[0], p[1], dt, pace, st.path.length > 1);
      self.onDeck(d);
      return end;
    };
    return { name: 'guard', stage: 'wake', st: 0, t: 0, run(d, dt) {
      this.t += dt; this.st += dt; G.stage = this.stage; G.t = this.t;
      const A = d.A, fx = f.pos.x, fz = f.pos.z, dist = Math.hypot(fx - d.pos.x, fz - d.pos.z), toF = Math.atan2(fx - d.pos.x, fz - d.pos.z);
      const to = s => { this.stage = s; this.st = 0; this.path = null; this.barkIn = 0.3; G.stage = s; };
      const barking = (every) => { if ((this.barkIn = (this.barkIn ?? 0.3) - dt) <= 0) { self.bark(V); this.barkIn = every * (0.8 + 0.4 * self.r()); } };
      switch (this.stage) {
        case 'wake': {                          // eyes open, head up, ears up: woof!
          self.asleep = false; A.earsGoal = 1; A.wideGoal = 0.8; A.lidSoftGoal = 0; A.lookPitchGoal = -0.2;
          const [lx] = self.local(d.pos.x, d.pos.z);
          if (lx < KENNEL.x1) { A.lieGoal = this.st < 0.6 ? 1 : 0; self.ducking(d); }
          if (this.st > 0.35 && !this.woke) { this.woke = true; self.bark(V); }
          if (this.st > 1.0) to(lx < KENNEL.x1 + 0.3 ? 'out' : 'charge');
          return false;
        }
        case 'out':                             // out of his kennel, head down under the doorway
          self.ducking(d);
          if (d.moveTo(door[0], door[1], dt, 'trot') || this.st > 4) { to('charge'); self.bark(V); }
          return false;
        case 'charge': {                        // flat out to him, barking
          if (!f.root.visible) { to('back'); return false; }
          if (V.state === 'fleeing') { to('pursue'); return false; }                  // (the geese got there first)
          const end = steer(this, d, dt, fx, fz, 'run', 0.35);
          const sees = !self.nav || self.nav.clearLine(d.pos.x, d.pos.z, fx, fz);
          if ((dist < 2.4 && sees) || (dist < 3.8 && end) || this.st > 80) { V.chasedBy(d.pos.x, d.pos.z, 'dog'); self.bark(V); to('pursue'); return false; }
          if (end) d.turnTo(toF, dt, 4);
          barking(1.5); A.earsGoal = 0.4; A.tailUpGoal = 0.45; A.lidTiltGoal = 0.3; A.mouthGoal = Math.max(A.mouthGoal || 0, 0.35);
          return false;
        }
        case 'pursue': {                        // after him all the way home, never catching him
          const den = self.den, toDen = den ? Math.hypot(fx - den[0], fz - den[1]) : 99;
          if (!f.root.visible || toDen < 3.2 || this.st > 40) { to('stand'); return false; }
          if (dist > 1.9) steer(this, d, dt, fx, fz, 'run', 0.1);
          else { d.turnTo(toF, dt, 4); }
          barking(1.3); A.earsGoal = 0.5; A.tailUpGoal = 0.5; A.mouthGoal = Math.max(A.mouthGoal || 0, 0.35);
          return false;
        }
        case 'stand': {                         // at the edge of the wood: planted, barking after him, tail high and wagging
          if (this.h === undefined) this.h = f.root.visible ? toF : self.den ? Math.atan2(self.den[0] - d.pos.x, self.den[1] - d.pos.z) : d.heading;
          d.turnTo(this.h, dt, 4); A.earsGoal = 1; A.tailUpGoal = 0.8; A.wagGoal = 0.7; A.lookPitchGoal = -0.15;
          if (this.st > 0.2 && this.st < 2.6) barking(0.75);
          if (this.st > 3) { this.h = undefined; to('back'); }
          return false;
        }
        case 'back': {                          // back to the geese (they wait for him); if they're not out, home
          const F = self.geeseOf(), g = F && F.guarding ? F.geese[0] : null, stg = g && g.task ? g.task.stage : '';
          if (!g || !/^(gather|await|victory|lap|tada|pursue|hiss|charge)$/.test(stg)) { G.done = true; self.guard = null; return true; }
          const a = Math.atan2(d.pos.x - g.pos.x, d.pos.z - g.pos.z), tx = g.pos.x + Math.sin(a) * 1.5, tz = g.pos.z + Math.cos(a) * 1.5;
          const end = steer(this, d, dt, tx, tz, Math.hypot(tx - d.pos.x, tz - d.pos.z) > 3 ? 'run' : 'trot', 0.25);
          A.tailUpGoal = 0.6; A.wagGoal = 0.8; playFace(d, 0.8);
          if (end || Math.hypot(g.pos.x - d.pos.x, g.pos.z - d.pos.z) < 1.8 || this.st > 60) to('parade');
          return false;
        }
        case 'parade': {                        // with the geese: proud, prancing round them on their lap, a bow and a bark at the ta-da
          const F = self.geeseOf(), g = F && F.guarding ? F.geese[0] : null, stg = g && g.task ? g.task.stage : '';
          if (!g || !/^(gather|await|victory|lap|tada)$/.test(stg) || this.st > 60) { G.done = true; self.guard = null; return true; }
          const toG = Math.atan2(g.pos.x - d.pos.x, g.pos.z - d.pos.z), dg = Math.hypot(g.pos.x - d.pos.x, g.pos.z - d.pos.z);
          A.tailUpGoal = 0.75; A.wagGoal = 1; playFace(d, 0.9); A.earsGoal = 0.8;
          if (stg === 'lap') {                   // round them, a jaunty trot, head high
            if (this.ang === undefined) { this.ang = Math.atan2(d.pos.x - g.pos.x, d.pos.z - g.pos.z); this.dir = self.r() < 0.5 ? 1 : -1; }
            this.ang += this.dir * dt * 0.9;
            let tx = g.pos.x + Math.sin(this.ang) * 1.5, tz = g.pos.z + Math.cos(this.ang) * 1.5;
            if (self.nav && !self.nav.clearLine(d.pos.x, d.pos.z, tx, tz, 0.15)) { tx = d.pos.x; tz = d.pos.z; d.turnTo(toG, dt, 3); }
            else d.moveTo(tx, tz, dt, 'trot', true);
            A.lift = Math.abs(Math.sin(this.t * 7)) * 0.05; A.lookPitchGoal = -0.25;
          } else if (stg === 'tada') {           // a play bow at them and a bark
            d.turnTo(toG, dt, 4);
            if (!this.bowT) this.bowT = this.t;
            const u = this.t - this.bowT;
            if (u < 1.6) { A.bowGoal = 1; if (!this.tadaBark && u > 0.4) { this.tadaBark = true; self.bark(V); } }
            else if (u < 2.1) { A.lift = Math.sin(Math.min(1, (u - 1.6) / 0.45) * Math.PI) * 0.15; A.airGoal = 0.4; }
            else if (!this.tada2 && u > 2.3) { this.tada2 = true; self.bark(V); }
          } else {                               // waiting for the lap: sitting up proud beside them
            if (dg > 2.2) steer(this, d, dt, g.pos.x - Math.sin(toG) * 1.5, g.pos.z - Math.cos(toG) * 1.5, 'trot', 0.25);       // (along with them, round everything)
            else { d.turnTo(toG, dt, 3); A.sitGoal = 1; A.lookPitchGoal = -0.2; }
          }
          return false;
        }
      }
      return true;
    } };
  }

  // ---- each moment
  update(dt, hour) {
    this.hour = hour; this.time += dt; this.mealIn -= dt; this.geeseIn -= dt;
    if (!this.placed) this.place(hour);
    const d = this.dog;
    this.barkT = Math.max(0, this.barkT - dt);
    this.watchFor(dt);
    // (to bed at bedtime, whatever he was doing; up in the morning)
    if (DOG_NIGHT(hour) && !this.bedtime) { this.bedtime = true; d.todo = []; d.task = null; }
    if (!DOG_NIGHT(hour)) this.bedtime = false;
    d.update(dt);
    // never into the geese: if one's right by him, he's eased off her (they steer round him too)
    const F = this.geeseOf();
    if (F) for (const g of F.geese) {
      const dx = d.pos.x - g.pos.x, dz = d.pos.z - g.pos.z, dd = Math.hypot(dx, dz), min = 0.55;
      if (dd < min && dd > 1e-4 && (!this.nav || this.nav.freeAt(g.pos.x + dx / dd * min, g.pos.z + dz / dd * min))) { d.pos.x = g.pos.x + dx / dd * min; d.pos.z = g.pos.z + dz / dd * min; }
    }
    this.updateBall(dt);
    // asleep in his kennel: a "z" now and then, up from the doorway
    if (this.asleep && (this.zIn -= dt) <= 0) {
      this.zIn = 2.6; const z = this.zs.find(s => s.life <= 0);
      if (z) { const p = this.K(0.8, 0); z.at = new THREE.Vector3(p[0], 0.62, p[1]); z.life = z.full = 2.4; }
    }
    for (const z of this.zs) {
      if (z.life <= 0) { z.sp.visible = false; continue; }
      z.life -= dt; const t = 1 - z.life / z.full;
      z.sp.visible = true; z.sp.position.copy(z.at); z.sp.position.y += t * 0.35; z.sp.position.x += Math.sin(t * 5) * 0.04;
      z.sp.scale.setScalar(0.09 + 0.06 * t); z.sp.material.opacity = Math.min(1, z.life * 2, t * 6);
    }
  }
  // after everyone has moved (main.js calls it last): never into Rusty, who may come running his way (he's seeing him off,
  // not catching him): out of his way, straight back from him or, if that's not free ground, to one side
  separate() {
    const d = this.dog, V = this.visitOf(), fox = V && V.fox && V.fox.root.visible ? V.fox : null;
    if (!fox) return;
    const dx = d.pos.x - fox.pos.x, dz = d.pos.z - fox.pos.z, dd = Math.hypot(dx, dz), min = 0.95;
    if (dd >= min) return;
    const a = dd > 1e-4 ? Math.atan2(dx, dz) : d.heading + Math.PI;
    for (const t of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
      const x = fox.pos.x + Math.sin(a + t) * min, z = fox.pos.z + Math.cos(a + t) * min;
      if (!this.nav || this.nav.freeAt(x, z)) { d.pos.x = x; d.pos.z = z; return; }
    }
  }
  updateBall(dt) {
    const B = this.ball, p = B.mesh.position;
    if (B.state !== 'air' && B.state !== 'roll') return;
    B.vel.y -= 9.8 * dt;
    let nx = p.x + B.vel.x * dt, nz = p.z + B.vel.z * dt;
    if (this.nav && !this.nav.freeAt(nx, nz) && this.nav.freeAt(p.x, p.z)) { B.vel.x *= -0.4; B.vel.z *= -0.4; nx = p.x; nz = p.z; }      // off whatever it hits
    const ds = Math.hypot(nx - p.x, nz - p.z);
    if (ds > 1e-5) { B.axis.set(nz - p.z, 0, -(nx - p.x)).normalize(); B.mesh.rotateOnWorldAxis(B.axis, ds / BALL_R); }
    p.x = nx; p.z = nz; p.y += B.vel.y * dt;
    if (p.y <= BALL_R) {
      p.y = BALL_R;
      if (B.vel.y < -0.7) { B.vel.y = -B.vel.y * 0.42; B.vel.x *= 0.8; B.vel.z *= 0.8; }
      else { B.vel.y = 0; B.state = 'roll'; }
    }
    if (B.state === 'roll') {
      const k = Math.exp(-2.4 * dt); B.vel.x *= k; B.vel.z *= k;
      if (Math.hypot(B.vel.x, B.vel.z) < 0.04) { B.vel.set(0, 0, 0); B.state = 'ground'; }
    }
  }
}

// his ball: red rubber with a white band
function makeBall() {
  const geo = new THREE.SphereGeometry(BALL_R, 18, 12), n = geo.attributes.position.count, col = new Float32Array(n * 3);
  const red = new THREE.Color('#d8432f'), white = new THREE.Color('#f6f1e6');
  for (let i = 0; i < n; i++) { const y = geo.attributes.position.getY(i), c = Math.abs(y) < BALL_R * 0.2 ? white : red; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
  mesh.castShadow = true; mesh.rotation.z = 0.4;
  return { mesh, vel: new THREE.Vector3(), axis: new THREE.Vector3(), state: 'ground' };
}
// a "z" floating up from the kennel while he sleeps
let zTex = null;
function zSprite() {
  if (!zTex) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    c.font = 'bold 50px Fredoka, Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = 'rgba(30,40,70,0.9)'; c.strokeText('z', 32, 34); c.fillStyle = '#e8eeff'; c.fillText('z', 32, 34);
    zTex = new THREE.CanvasTexture(cv); zTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false }); m.userData.noGrade = true;
  const sp = new THREE.Sprite(m); sp.visible = false; sp.renderOrder = 11;
  return { sp, life: 0, full: 1, at: new THREE.Vector3() };
}
// his name on the board over his kennel's door (drawn as text on a little picture: whatever the name, it's only ever text)
export function nameBoard() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 80;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, alphaTest: 0.05 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(KENNEL.boardSize[0] * 0.94, KENNEL.boardSize[1] * 0.9), mat);
  const draw = name => {
    const c = cv.getContext('2d'); c.clearRect(0, 0, 256, 80);
    let px = 56; c.textAlign = 'center'; c.textBaseline = 'middle';
    do { c.font = `600 ${px}px Fredoka, Nunito, sans-serif`; px -= 2; } while (c.measureText(name).width > 236 && px > 14);
    c.fillStyle = '#5a3a22'; c.fillText(name, 128, 44);
    tex.needsUpdate = true; mesh.userData.name = name;
  };
  return { mesh, draw };
}

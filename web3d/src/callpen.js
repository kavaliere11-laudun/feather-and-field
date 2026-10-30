// The call ducks in their pen (30 Oct 2026; Audrey's call ducks: "make the ducks cuter", "Cute moves", their Floating
// House: "a little wooden house on a raft in the middle of their pond, with a ramp up to it"; "add a balloon toy so the ducks
// play"). Pip the drake and his two ducks, drawn and posed as the pond's mallards (geese.js: the same rig; their own models),
// living in their coop's pen, in its frame (x across, z out to the front: the house's front faces +z, the yard in front):
// by day they waddle about the yard and graze, preen, rest, and swim on their pond round the raft (dabbling, up-ending, a
// splashy bath now and then); in the Cosy and the Deluxe they play with the beach ball, nudging it across the water with a
// happy bob of the head; now and then Pip leads them round the yard in a little line; once a day each goes up the gangplank
// (the Deluxe's: over Monet's bridge) and in to lay, sitting in the nest at the window a while. At dusk they go up into the
// house one by one and sleep there; in the morning, once the door's open, out again with a stretch and a quack.
// Its own little world: where the water is (coops.json ponds: the pond's middle, its half-widths and the water's height),
// the gangplank or the bridge (the nest's pop and foot; coops.json paths), the raft round the house (kept clear), the yard
// (the pen's box, what's in it).
import * as THREE from 'three';
import { Goose, ACT, TK } from './geese.js';
import { DACT } from './ducks.js';
import { shadowDisc } from './beasts.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const RAFT = { x: 0.63, z0: -0.45, z1: 0.5 };       // the raft and the house on it (k as big: stylized/coops.py FLOAT raft), kept clear
const HOUSE = { x: 0.44, z: 0.31 }, DECK = 0.072;    // the house on it (its walls), the deck's height
const BED = [20.75, 6.6];                            // to bed from, up from
const BALL_R = 0.085;
// a duck's body seen from above (measured off the call ducks' models: tail to bill tip -0.136 to 0.161 along her heading,
// 0.062 to each side): a capsule from just in front of the tail to the breast, as wide as she is. Nobody goes through
// anybody: ducks kept apart by these, and off the ball (Audrey: "clipping with the ball")
const CAP = { back: -0.075, front: 0.085, r: 0.062 };
const NUDGE = CAP.front + CAP.r + BALL_R + 0.005;       // (from her middle to the ball's: her breast just touching it)
const capOf = d => { const s = Math.sin(d.heading), c = Math.cos(d.heading), x = d.pos.x, z = d.pos.z; return [x + s * CAP.back, z + c * CAP.back, x + s * CAP.front, z + c * CAP.front]; };
const near = (px, pz, S) => { const dx = S[2] - S[0], dz = S[3] - S[1], L = dx * dx + dz * dz, u = L ? Math.max(0, Math.min(1, ((px - S[0]) * dx + (pz - S[1]) * dz) / L)) : 0; return [S[0] + dx * u, S[1] + dz * u]; };
// (the closest points of two capsules' middles: each end of one against the other, and back)
function closest(A, B) {
  let best = null;
  const tryP = (p, q) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (!best || d < best.d) best = { d, p, q }; };
  tryP([A[0], A[1]], near(A[0], A[1], B)); tryP([A[2], A[3]], near(A[2], A[3], B));
  tryP(near(B[0], B[1], A), [B[0], B[1]]); tryP(near(B[2], B[3], A), [B[2], B[3]]);
  return best;
}
const S = (x, z, pace, through, tol) => Object.assign(TK.straight(x, z, pace, through, tol), { to: [x, z] });      // (a straight walk or swim, knowing where to)

// a beach ball: six panels in turn red, yellow and blue, white caps (stylized/coops.py beach_ball's look)
function beachBall() {
  const g = new THREE.SphereGeometry(BALL_R, 24, 14), P = g.attributes.position, col = new Float32Array(P.count * 3);
  const cols = ['#e2453c', '#f4c430', '#3d8fd1'].map(h => new THREE.Color(h)), white = new THREE.Color('#fbf6ee');
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), lon = Math.atan2(z, x) + Math.PI;
    const c = Math.abs(y) > BALL_R * 0.86 ? white : cols[Math.floor(lon / (Math.PI / 3)) % 3];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }));
  m.castShadow = true; m.receiveShadow = true; return m;
}

export class CallPen {
  // plot: its coop (frame, nest); o: { pond: [cx, cz, a, b, waterY], path: the Deluxe's way over its bridge ([x, y, z]...)
  // or null, yard: { min, max } (frame), obstacles: [[x, 0, z, r]], block: [[x, z, r]], ball: [x, z] or null (the Cosy's,
  // the Deluxe's), hour(), doorOpen(), laid(duck): a duck has laid, sound(kind, x, z), birds: [{ kind, name, gid }] (the
  // drake first: he leads; the test page's Pip, Puddle and Pebble if none), game: the game says when each lays (layNow),
  // toCam(): the way to the camera (her card's open: she faces you), heart(duck): a heart over her (a hello) }
  constructor(plot, o, r) {
    this.plot = plot; this.o = o; this.r = r; this.time = 0;
    const [cx, cz, a, b, wy] = o.pond; this.P = { cx, cz, a, b, wy };
    const G = plot.nestG; this.G = G;
    this.pop = [G.pop[0], G.pop[1]]; this.foot = [G.foot[0], G.foot[1]];
    this.group = new THREE.Group(); this.group.userData.moves = true; plot.frame.add(this.group);
    const B = o.birds || [{ kind: 'call_m', name: 'Pip' }, { kind: 'call_f', name: 'Puddle' }, { kind: 'call_f', name: 'Pebble' }];
    this.ducks = B.map((q, i) => {
      const d = new Goose(this.group, q.kind, r, q.name); d.flock = this; d.idx = i; d.pen = this; d.laidOn = -1; d.trail = [];
      d.gid = q.gid; d.plot = plot; d.held = false;
      Object.defineProperty(d, 'laying', { get: () => !!(d.task && d.task.name === 'lay') });      // (off to lay, or in the nest)
      d.shadow = shadowDisc(0.085); this.group.add(d.shadow);
      return d;
    });
    this.near = this.ducks;
    this.nav = { freeAt: (x, z) => !this.inRaft(x, z, 0.02) || this.onRamp(x, z) !== null };      // (moveTo's: the raft's no way to go)
    this.ring = this.makeRing();
    if (o.ball) {
      this.ball = { mesh: beachBall(), x: o.ball[0], z: o.ball[1], vx: 0, vz: 0, spin: new THREE.Quaternion() };
      this.group.add(this.ball.mesh); this.placeBall(0);
    }
    this.group.traverse(c => { c.userData.moves = true; c.matrixAutoUpdate = true; });
    // where they start: by day about the yard, by night in bed
    const h = o.hour();
    this.ducks.forEach((d, i) => {
      if (this.bedtime(h)) { this.inside(d, true); d.task = this.sleepTask(); }
      else { const s = this.yardSpot(); d.pos.set(s[0], 0, s[1]); d.heading = this.r() * 6.28; d.task = null; }
    });
    this.wasBed = this.bedtime(h);
  }
  bedtime(h) { return h >= BED[0] || h < BED[1]; }
  onTap(d) { if (this.o.sound) this.o.sound('quack', d.pos.x, d.pos.z); }      // (a tap: she quacks, bobs her head and wiggles: geese.js tapped)
  // ---- where things are
  pondS(x, z) { const P = this.P; return Math.hypot((x - P.cx) / P.a, (z - P.cz) / P.b); }
  onRamp(x, z) {
    const [px, pz] = this.pop, [fx, fz] = this.foot;
    if (Math.abs(x - px) > 0.09 || z < pz - 0.04 || z > fz + 0.02) return null;
    const u = Math.min(1, Math.max(0, (z - pz) / (fz - pz)));
    if (this.o.path) {                                  // (the Deluxe's bridge: up over its arch)
      const Q = this.o.path; for (let i = 0; i < Q.length - 1; i++) if (z >= Q[i][2] - 1e-4 && z <= Q[i + 1][2] + 1e-4) { const v = (z - Q[i][2]) / Math.max(1e-4, Q[i + 1][2] - Q[i][2]); return Q[i][1] + (Q[i + 1][1] - Q[i][1]) * v + 0.006; }
      return 0;
    }
    return this.G.house * (1 - u) + 0.012;
  }
  inHouseAt(x, z) { return Math.abs(x) < HOUSE.x && Math.abs(z) < HOUSE.z; }
  wetAt(x, z) { if (this.onRamp(x, z) !== null || this.inRaft(x, z)) return 0; return smooth(0.98, 0.84, this.pondS(x, z)); }
  // the ground under her: the gangplank (the bridge), the nest's straw in the house, the raft's deck, the water, the yard
  groundY(x, z) {
    const rp = this.onRamp(x, z); if (rp !== null) return rp;
    if (this.inHouseAt(x, z)) return (this.G.bed ?? this.G.floor) - 0.012;
    if (this.inRaft(x, z)) return DECK;
    return this.pondS(x, z) < 1.0 ? this.P.wy : 0;
  }
  inRaft(x, z, m = 0) { return Math.abs(x) < RAFT.x + m && z > RAFT.z0 - m && z < RAFT.z1 + m; }
  underPlank(x, z, m = 0) { return Math.abs(x - this.pop[0]) < this.plankW() + m && z > this.pop[1] - 0.05 && z < this.foot[1] + 0.04 + m; }
  plankW() { return this.o.path ? 0.135 : 0.1; }      // (half its width: the gangplank's; the Deluxe's bridge with its railings, stylized/coops.py monet_bridge)
  // the swimming ring: points round the raft, out in the water, the raft and the gangplank kept clear; split by the
  // gangplank into arcs (a duck swims along one)
  makeRing() {
    const P = this.P, out = [];
    for (let k = 0; k < 48; k++) {
      const t = k / 48 * Math.PI * 2;
      for (const s of [0.66, 0.76, 0.84]) {
        const x = P.cx + P.a * s * Math.cos(t), z = P.cz + P.b * s * Math.sin(t);
        if (this.inRaft(x, z, 0.12) || this.underPlank(x, z, 0.08)) continue;
        out.push({ x, z, t, s });
      }
    }
    return out;
  }
  side(x) { return x < this.pop[0] ? -1 : 1; }          // (which side of the gangplank)
  swimSpot(sd) { const L = this.ring.filter(p => this.side(p.x) === sd); return L.length ? L[Math.floor(this.r() * L.length)] : null; }
  // a free spot in the yard: inside its box, out of the pond, clear of the feeder, the water, the hay and the rest
  free(x, z, r = 0.14) {
    const Y = this.o.yard; if (!Y || x < Y.min[0] || x > Y.max[0] || z < Y.min[2] || z > Y.max[2]) return false;
    if (this.pondS(x, z) < 1.18 || this.underPlank(x, z, 0.05)) return false;
    if ((this.o.obstacles || []).some(q => Math.hypot(x - q[0], z - q[2]) < q[3] + r)) return false;
    if ((this.o.block || []).some(q => Math.hypot(x - q[0], z - q[1]) < q[2] + r * 0.5 && this.pondS(q[0], q[1]) > 1.05)) return false;
    return true;
  }
  yardSpot() {
    const Y = this.o.yard;
    for (let k = 0; k < 200; k++) { const x = Y.min[0] + this.r() * (Y.max[0] - Y.min[0]), z = Y.min[2] + this.r() * (Y.max[2] - Y.min[2]); if (this.free(x, z)) return [x, z]; }
    return [this.foot[0] + 0.3, this.foot[1] + 0.3];
  }
  // a walk on land: straight if nothing's in the way, else round the pond (by the points round it on the bank, the shorter
  // way that stays in the yard)
  clearLand(a, b) {          // (from the bank's very edge: no deeper in than she is)
    const lim = Math.min(1.1, this.pondS(a[0], a[1]) - 0.03, this.pondS(b[0], b[1]) - 0.03);
    for (let k = 1; k < 16; k++) { const u = k / 16, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u; if (this.pondS(x, z) < lim || this.underPlank(x, z, 0.04)) return false; }
    return true;
  }
  bankRing() {
    if (this._bank) return this._bank;
    const P = this.P; return (this._bank = Array.from({ length: 28 }, (_, k) => { const t = k / 28 * Math.PI * 2, x = P.cx + P.a * 1.32 * Math.cos(t), z = P.cz + P.b * 1.32 * Math.sin(t); return { x, z, ok: this.free(x, z, 0) }; }));
  }
  landWay(a, b) {
    if (this.clearLand(a, b)) return [b];
    const R = this.bankRing(), n = R.length, near = q => R.reduce((bi, p, i) => (p.ok && this.clearLand(q, [p.x, p.z]) && (bi < 0 || Math.hypot(p.x - q[0], p.z - q[1]) < Math.hypot(R[bi].x - q[0], R[bi].z - q[1]))) ? i : bi, -1);
    const i0 = near(a), i1 = near(b); if (i0 < 0 || i1 < 0) return null;
    let best = null;
    for (const dir of [1, -1]) {
      const way = []; let i = i0, ok = true;
      for (let s = 0; s <= n; s++) { if (!R[i].ok) { ok = false; break; } way.push([R[i].x, R[i].z]); if (i === i1) break; i = (i + dir + n) % n; }
      if (ok && (!best || way.length < best.length)) best = way;
    }
    return best ? [...best, b] : null;
  }
  walkTo(L, x, z, pace = 'walk', d0) {
    const from = d0 ? [d0.pos.x, d0.pos.z] : null, way = from ? this.landWay(from, [x, z]) : [[x, z]];
    if (!way) return false;
    way.forEach((q, i) => L.push(S(q[0], q[1], pace, i < way.length - 1, i < way.length - 1 ? 0.12 : 0.08)));
    return true;
  }
  onLand(d) { return d.wet < 0.3 && this.pondS(d.pos.x, d.pos.z) > 1.08 && this.onRamp(d.pos.x, d.pos.z) === null && !d.inHouse; }
  // round the raft's corner (on her side of the gangplank) if the straight swim from a to b would clip it: the corner's spot
  viaCorner(a, b) {
    let clip = false; for (let k = 1; k < 14; k++) { const u = k / 14; if (this.inRaft(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 0.08)) { clip = true; break; } }
    if (!clip) return null;
    const C = [[RAFT.x + 0.09, RAFT.z1 + 0.09], [-RAFT.x - 0.09, RAFT.z1 + 0.09], [RAFT.x + 0.09, RAFT.z0 - 0.09], [-RAFT.x - 0.09, RAFT.z0 - 0.09]].filter(c => this.pondS(c[0], c[1]) < 1.02 && this.side(c[0]) === this.side(b[0]));
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return C.reduce((best, q) => (!best || Math.hypot(q[0] - m[0], q[1] - m[1]) < Math.hypot(best[0] - m[0], best[1] - m[1])) ? q : best, null);
  }
  // a swim from where she is to (x, z), round the raft's corner if the straight way would clip it
  swimTo(L, x, z) {
    L.push(g => {
      const c = this.viaCorner([g.pos.x, g.pos.z], [x, z]);
      return c ? TK.seq('round', [S(c[0], c[1], 'walk', true, 0.08), S(x, z, 'walk', true, 0.1)]) : S(x, z, 'walk', true, 0.1);
    });
  }
  // ---- what they do
  dayTask(d) {
    const L = [], h = this.o.hour(), dry = d.wet < 0.5, r = this.r();
    if (!dry) return this.swimTask(d, true);
    if (!this.o.game && d.kind === 'call_f' && d.laidOn !== this.day && h >= 8 && h < 17 && r < 0.18) return this.layTask(d);      // (the ducks lay; Pip doesn't. The game's: when it says, layNow)
    if (d.idx === 0 && r < 0.12 && this.ducks.every(o => this.onLand(o) && (!o.task || !/^(lay|parade)/.test(o.task.name))) && this.parade()) return d.task;
    if (r < 0.45) return this.swimTask(d, false);
    if (this.ball && r < 0.6) return this.swimTask(d, false, true);
    const s = this.yardSpot(); if (!this.walkTo(L, s[0], s[1], 'walk', d)) return TK.act('look', 2 + this.r() * 2);
    const k = this.r();
    L.push(k < 0.45 ? TK.act('graze', 5 + this.r() * 7) : k < 0.65 ? TK.act('preen', 4 + this.r() * 4, (g, u) => { g.preenSide = g.preenSide || 1; DACT.preen(g, u); })
      : k < 0.8 ? TK.act('rest', 6 + this.r() * 8, DACT.rest) : k < 0.9 ? TK.act('bob', 3.4, BOB) : TK.act('look', 3 + this.r() * 3));
    return TK.seq('yard', L);
  }
  // into the water (from the bank nearest a spot on the ring), swimming about (dabbling, up-ending, a bath, a preen afloat),
  // or playing with the ball; out again onto the yard
  swimTask(d, already, ball) {
    const L = [], P = this.P;
    let sd = already ? this.side(d.pos.x) : this.r() < 0.5 ? -1 : 1;
    if (ball) sd = this.side(this.ball.x);
    if (!already) {
      const s = this.swimSpot(sd); if (!s) return TK.act('look', 2);
      const t = Math.atan2((s.z - P.cz) / P.b, (s.x - P.cx) / P.a), bank = [P.cx + P.a * 1.22 * Math.cos(t), P.cz + P.b * 1.22 * Math.sin(t)];
      if (!this.free(bank[0], bank[1], 0.05)) {             // (where the bank's in the yard: in from its front)
        const fr = this.ring.filter(p => this.side(p.x) === sd && p.s > 0.8 && Math.sin(p.t) > 0.5);
        if (!fr.length) return TK.act('look', 2);
        const p = fr[Math.floor(this.r() * fr.length)], tt = p.t; bank[0] = P.cx + P.a * 1.22 * Math.cos(tt); bank[1] = P.cz + P.b * 1.22 * Math.sin(tt);
        if (!this.free(bank[0], bank[1], 0.05) || !this.walkTo(L, bank[0], bank[1], 'walk', d)) return TK.act('look', 2);
        L.push(S(p.x, p.z, 'walk', true, 0.1));
      } else { if (!this.walkTo(L, bank[0], bank[1], 'walk', d)) return TK.act('look', 2); L.push(S(s.x, s.z, 'walk', true, 0.1)); }
    }
    if (ball) { for (let k = 0; k < 2 + Math.floor(this.r() * 3); k++) L.push(() => this.nudgeTask(d)); L.push(TK.act('bob', 3.4, BOB)); }
    else {
      const n = 2 + Math.floor(this.r() * 3);
      for (let k = 0; k < n; k++) {
        L.push(() => { const s = this.nextOnArc(d, sd); if (!s) return null; const Q = []; this.swimTo(Q, s.x, s.z); return Q[0](d); });
        const q = this.r();
        L.push(q < 0.35 ? TK.act('dabble', 4 + this.r() * 4, DACT.dabble) : q < 0.55 ? TK.act('upend', 3.5, (g, u) => DACT.upend(g, u, 3.5)) : q < 0.68 ? TK.act('bathe', 3.9, DACT.bathe)
          : q < 0.82 ? TK.act('preen', 4, (g, u) => { g.preenSide = g.preenSide || -1; DACT.preen(g, u); }) : TK.act('float', 3 + this.r() * 3, DACT.float));
      }
    }
    // out again: to the front of its arc, then up onto the bank
    L.push(() => {
      const fr = this.ring.filter(p => this.side(p.x) === this.side(d.pos.x) && p.s > 0.8 && Math.sin(p.t) > 0.45);
      const p = fr.length ? fr.reduce((a, q) => Math.hypot(q.x - d.pos.x, q.z - d.pos.z) < Math.hypot(a.x - d.pos.x, a.z - d.pos.z) ? q : a) : null;
      if (!p) return null;
      const t = p.t, bank = [P.cx + P.a * 1.24 * Math.cos(t), P.cz + P.b * 1.24 * Math.sin(t)];
      const c = this.viaCorner([d.pos.x, d.pos.z], [p.x, p.z]);
      return TK.seq('out', [...(c ? [S(c[0], c[1], 'walk', true, 0.08)] : []), S(p.x, p.z, 'walk', true, 0.1), S(bank[0], bank[1], 'walk', false, 0.08), TK.act('shake', 1.4)]);
    });
    return TK.seq('swim', L);
  }
  // the next spot along her arc of the ring (not far: round the raft step by step)
  nextOnArc(d, sd) {
    const L = this.ring.filter(p => this.side(p.x) === sd && Math.hypot(p.x - d.pos.x, p.z - d.pos.z) > 0.12 && Math.hypot(p.x - d.pos.x, p.z - d.pos.z) < 0.55);
    if (!L.length) return null;
    return L[Math.floor(this.r() * L.length)];
  }
  // playing with the ball: round behind it (away from the raft), then a nudge with the breast and bill sends it off
  nudgeTask(d) {
    const B = this.ball, P = this.P; if (!B) return null;
    return { name: 'nudge', act: 'swim', t: 0, run(g, dt) {
      this.t += dt; DACT.swim(g, this.t);
      const pen = g.pen;
      if (!this.dir) {                                   // (the way she'll send it: one with room for her behind the ball, and water ahead of it)
        const ok = [];
        for (let k = 0; k < 16; k++) {
          const a = k / 16 * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a), hx = B.x - dx * NUDGE, hz = B.z - dz * NUDGE, ax = B.x + dx * 0.25, az = B.z + dz * 0.25;
          if (pen.pondS(hx, hz) < 0.95 && !pen.inRaft(hx, hz, 0.06) && !pen.underPlank(hx, hz, 0.06) && pen.side(hx) === pen.side(B.x) && pen.pondS(ax, az) < 0.9 && !pen.inRaft(ax, az, 0.03)) ok.push([dx, dz]);
        }
        if (!ok.length) return true;                     // (nowhere to come at it from: another time)
        this.dir = ok[Math.floor(pen.r() * ok.length)];
      }
      const bx = B.x - this.dir[0] * NUDGE, bz = B.z - this.dir[1] * NUDGE;
      if (this.t > 12) return true;
      if (this.via === undefined || (this.via && Math.hypot(this.via[0] - g.pos.x, this.via[1] - g.pos.z) < 0.08)) { const v = pen.viaCorner([g.pos.x, g.pos.z], [bx, bz]); this.via = v && this.via && Math.hypot(v[0] - this.via[0], v[1] - this.via[1]) < 0.05 ? null : v; }      // (round the corner once, then on)
      if (this.via && !this.go) { g.moveTo(this.via[0], this.via[1], dt, 'walk', true); return false; }
      if (pen.side(bx) !== pen.side(g.pos.x) && !this.go) return true;          // (the ball's gone the other side of the gangplank: leave it)
      if (Math.hypot(bx - g.pos.x, bz - g.pos.z) > 0.06 && !this.go) { g.moveTo(bx, bz, dt, 'walk', true); return false; }
      if (!this.go) { this.go = 0; }
      this.go += dt; const A = g.A;
      if (g.turnTo(Math.atan2(B.x - g.pos.x, B.z - g.pos.z), dt, 3) < 0.4 && !this.hit) { this.hit = true; B.vx += this.dir[0] * 0.42; B.vz += this.dir[1] * 0.42; pen.splash = (pen.splash || 0) + 1; }
      if (this.hit && this.go < 0.45) g.moveTo(B.x, B.z, dt, 'walk', true);      // (a little push on with her breast: the ball's bumped on, pen.bump)
      A.grazeGoal = 0.35; A.wagGoal = 0.8; A.bobGoal = this.go > 0.3 ? 1 : 0;
      return this.go > 1.6;
    } };
  }
  // the parade: Pip leads them round the yard in a little line, his ducks one behind the other on his trail
  parade() {
    const [Pip, ...rest] = this.ducks, L = [];
    if (!rest.length) return false;
    const join = rest.map(d => this.landWay([d.pos.x, d.pos.z], [Pip.pos.x, Pip.pos.z]));      // (each to his side by the bank's way first)
    if (join.some(w => !w)) return false;
    let at = [Pip.pos.x, Pip.pos.z];
    for (let k = 0; k < 4; k++) { const s = this.yardSpot(); if (Math.hypot(s[0] - at[0], s[1] - at[1]) < 0.5) continue; const w = this.landWay(at, s); if (!w) continue; for (const q of w) L.push(S(q[0], q[1], 'walk', true, 0.12)); at = s; }
    L.push(TK.act('bob', 3.4, BOB));
    for (const d of this.ducks) d.trail = [[d.pos.x, d.pos.z]];      // (each one's trail, from here)
    Pip.task = TK.seq('parade', L);
    rest.forEach((d, i) => { d.task = TK.seq('parade-follow', [...join[i].slice(0, -1).map(q => S(q[0], q[1], 'hurry', true, 0.12)), this.followTask(d, i === 0 ? Pip : rest[i - 1], 0.32)]); });
    return true;
  }
  followTask(d, lead, gap) {
    return { name: 'parade-follow', act: 'walk', t: 0, run(g, dt) {
      this.t += dt; const T = lead.trail;
      if (!lead.task || !/^parade/.test(lead.task.name) || this.t > 60) return true;
      // along the leader's trail point by point (from the nearest to her at first), keeping `gap` behind him
      if (this.k === undefined) { this.k = 0; let bd = Infinity; T.forEach((q, i) => { const dd = Math.hypot(q[0] - g.pos.x, q[1] - g.pos.z); if (dd < bd) { bd = dd; this.k = i; } }); }
      const rest = i => { let a = Math.hypot(lead.pos.x - T[T.length - 1][0], lead.pos.z - T[T.length - 1][1]); for (let j = i; j < T.length - 1; j++) a += Math.hypot(T[j + 1][0] - T[j][0], T[j + 1][1] - T[j][1]); return a; };
      while (this.k < T.length - 1 && Math.hypot(T[this.k][0] - g.pos.x, T[this.k][1] - g.pos.z) < 0.07 && rest(this.k + 1) > gap) this.k++;
      const p = T[Math.min(this.k, T.length - 1)];
      if (rest(this.k) > gap * 0.8 && Math.hypot(p[0] - g.pos.x, p[1] - g.pos.z) > 0.03) g.moveTo(p[0], p[1], dt, rest(this.k) > gap * 2 ? 'hurry' : 'walk', true);
      g.A.wagGoal = 0.35; g.A.upGoal = 0.2;
      if (!g.trail) g.trail = []; const q = g.trail[g.trail.length - 1];
      if (!q || Math.hypot(q[0] - g.pos.x, q[1] - g.pos.z) > 0.03) { g.trail.push([g.pos.x, g.pos.z]); }
      return false;
    } };
  }
  // up the gangplank (the bridge) and in at the little door
  upTask(d, then) {
    const L = [];
    if (!this.walkTo(L, this.foot[0], this.foot[1] + 0.12, 'walk', d)) L.push(S(this.foot[0], this.foot[1] + 0.12, 'walk', true, 0.08));
    L.push(S(this.foot[0], this.foot[1], 'walk', true, 0.05), this.rampTask(true));
    L.push(() => { this.inside(d, true); return then ? then() : null; });
    return L;
  }
  // along the gangplank (the bridge), up to the door or down to the bank: on its line, one behind the other (waiting for
  // the one ahead), never round each other into the water
  rampTask(up) {
    const pen = this, [px, pz] = this.pop, [, fz] = this.foot;
    return { name: up ? 'up' : 'down', act: 'walk', t: 0, run(g, dt) {
      this.t += dt; const dir = up ? -1 : 1, goal = up ? pz : fz;
      const ahead = pen.ducks.some(o => o !== g && !o.inHouse && o.root.visible && pen.onRamp(o.pos.x, o.pos.z) !== null && (o.pos.z - g.pos.z) * dir > 0 && Math.abs(o.pos.z - g.pos.z) < 0.24);
      g.heading += (Math.atan2(0, dir) - g.heading) * Math.min(1, dt * 8); g.heading = up ? Math.PI : 0;
      if (!ahead) { g.pos.x += (px - g.pos.x) * Math.min(1, dt * 6); g.pos.z = Math.abs(goal - g.pos.z) < 0.12 * dt ? goal : g.pos.z + dir * 0.12 * dt; }
      g.A.wagGoal = 0.2; g.A.upGoal = up ? 0.2 : 0.35;
      return Math.abs(goal - g.pos.z) < 0.005 || this.t > 40;
    } };
  }
  inside(d, yes) {
    d.inHouse = yes; d.root.visible = !yes; d.shadow.visible = !yes;
    if (yes) { d.pos.set(this.pop[0], this.G.house, this.pop[1] - 0.25); d.heading = Math.PI; }
    else { d.pos.set(this.pop[0], this.G.house, this.pop[1]); d.heading = 0; d.lastPos = d.pos.clone(); }
  }
  // laying: up and in, a while sitting in the nest at the window (her face in it), the egg, then out and down again
  layTask(d) {
    const G = this.G, pen = this;
    const L = this.upTask(d);
    L.push(TK.act('wait', 1.5 + this.r() * 2, () => {}));
    L.push({ name: 'lay', act: 'rest', t: 0, run(g, dt) {
      if (this.t === 0) { g.root.visible = true; g.pos.set(G.seat[0], (G.bed ?? G.floor) - 0.012, G.seat[1] + 0.06); g.heading = 0; g.lastPos = g.pos.clone(); g.A.sit = 1; }      // (well forward: her face at the window, over the eggs)
      this.t += dt; const A = g.A; A.sitGoal = 1; ACT.look(g, this.t * 0.5);
      if (this.t > 7 && !this.done) { this.done = true; g.laidOn = pen.day; if (pen.o.laid) pen.o.laid(g); }
      if (this.t > 7 && this.t < 9.5) { A.honkGoal = 0.5; A.upGoal = 0.4; A.jawGoal = Math.sin(this.t * 7.5) > 0.2 ? 1 : 0; A.wagGoal = 0.6; }      // (a proud quack or two)
      return this.t > 10;
    } });
    L.push(() => { g_hide(d); return null; }, TK.act('wait', 1 + this.r(), () => {}), () => { this.inside(d, false); return null; });
    L.push(this.rampTask(false), S(this.foot[0], this.foot[1] + 0.25, 'walk', false, 0.08), TK.act('stretch', 2.4, ACT.shake));
    return TK.seq('lay', L);
  }
  sleepTask() { return TK.act('sleep', 1e9, () => {}); }
  // to bed: one after another (the ducks first, Pip last), up the gangplank and in
  goBed() {
    const order = this.ducks.map((_, i) => i).reverse();
    order.forEach((i, k) => {
      const d = this.ducks[i]; if (d.inHouse) { d.task = this.sleepTask(); return; }
      const L = [TK.act('wait', k * 2.5, ACT.look)];
      if (d.wet > 0.3) {                                  // (out of the water first)
        const fr = this.ring.filter(p => this.side(p.x) === this.side(d.pos.x) && p.s > 0.8 && Math.sin(p.t) > 0.45);
        const p = fr.length ? fr.reduce((a, q) => Math.hypot(q.x - d.pos.x, q.z - d.pos.z) < Math.hypot(a.x - d.pos.x, a.z - d.pos.z) ? q : a) : null;
        if (p) { const t = p.t, c = this.viaCorner([d.pos.x, d.pos.z], [p.x, p.z]); if (c) L.push(S(c[0], c[1], 'walk', true, 0.08)); L.push(S(p.x, p.z, 'walk', true, 0.1), S(this.P.cx + this.P.a * 1.24 * Math.cos(t), this.P.cz + this.P.b * 1.24 * Math.sin(t), 'walk', false, 0.08)); }
      }
      L.push(...this.upTask(d, () => this.sleepTask()));
      d.task = TK.seq('bed', L);
    });
  }
  // the morning: out one after another (Pip first), down to the yard, a stretch and a quack
  getUp() {
    this.ducks.forEach((d, k) => {
      if (!d.inHouse) return;
      d.task = TK.seq('morning', [TK.act('wait', 0.5 + k * 2.2, () => {}), () => { this.inside(d, false); return null; },
        this.rampTask(false), S(this.foot[0] + (k - 1) * 0.25, this.foot[1] + 0.35, 'walk', false, 0.08),
        TK.act('stretch', 3.6, ACT.stretch), TK.act('quack', 1.6, (g, u) => DACT.quack(g, u, 2))]);
    });
  }
  // ---- the game's: her lay when it's due (main.js gameTick), her card open, a cuddle, a hello to the farmer
  busy(d, parade = true) { return d.inHouse || !d.root.visible || (d.task && (parade ? /^(lay|bed|morning|parade|held|cuddle|greet)/ : /^(lay|bed|morning|held|cuddle|greet)/).test(d.task.name)); }
  canLay(d) {        // (by day, up and about on the yard, nobody else in the nest)
    return d.kind === 'call_f' && !this.bedtime(this.o.hour()) && !d.held && !this.busy(d) && this.onLand(d) && !this.ducks.some(o => o.laying);
  }
  layNow(d) { d.task = this.layTask(d); }
  hold(d, yes) {     // her card's open: she stays where she is (on the yard or afloat), facing you
    d.held = yes; if (!yes || this.busy(d)) return;
    d.task = TK.seq('held', [{ name: 'hold', act: 'look', t: 0, run(g, dt) { this.t += dt; if (g.pen.o.toCam) g.turnTo(g.pen.o.toCam(), dt, 2); g.A.upGoal = 0.25; return g.held ? false : true; } }]);
  }
  cuddled(d) {       // a cuddle: she turns to you, a happy bob and a wiggle, a quack
    if (d.inHouse || !d.root.visible || d.laying) return false;
    const L = [];
    if (this.o.toCam) L.push(TK.face(this.o.toCam()));
    L.push(TK.act('bob', 3.4, BOB), TK.act('quack', 1.6, (g, u) => DACT.quack(g, u, 2)));
    d.task = TK.seq('cuddle', L);
    if (this.o.sound) this.o.sound('quack', d.pos.x, d.pos.z);
    return true;
  }
  greet(d, x, z, yaw) {      // a trusting duck to the front of the yard to say hello to the farmer: a heart, a bob, a quack
    if (d.held || this.busy(d, false) || !this.onLand(d) || !this.free(x, z, 0.08)) return false;      // (a parade's dropped for it)
    const L = []; if (!this.walkTo(L, x, z, 'hurry', d)) return false;
    L.push(TK.face(yaw), () => { if (this.o.heart) this.o.heart(d); if (this.o.sound) this.o.sound('quack', d.pos.x, d.pos.z); return null; }, TK.act('bob', 3.4, BOB), TK.act('quack', 1.6, (g, u) => DACT.quack(g, u, 2)));
    d.task = TK.seq('greet', L);
    return true;
  }
  // ---- the ball: floating, bobbing, drifting where it's sent, slowing, off the pond's edge, the raft and the gangplank
  placeBall(dt) {
    const B = this.ball, P = this.P;
    B.x += B.vx * dt; B.z += B.vz * dt;
    const f = Math.exp(-0.7 * dt); B.vx *= f; B.vz *= f;
    const s = this.pondS(B.x, B.z), lim = 0.8;
    if (s > lim) { const nx = (B.x - P.cx) / (P.a * P.a), nz = (B.z - P.cz) / (P.b * P.b), l = Math.hypot(nx, nz), ux = nx / l, uz = nz / l, dot = B.vx * ux + B.vz * uz;
      if (dot > 0) { B.vx -= 1.6 * dot * ux; B.vz -= 1.6 * dot * uz; } B.x = P.cx + (B.x - P.cx) * lim / s; B.z = P.cz + (B.z - P.cz) * lim / s; }
    if (this.inRaft(B.x, B.z, BALL_R + 0.02)) {           // (off the raft: pushed out the nearest way)
      const m = BALL_R + 0.02, dx = RAFT.x + m - Math.abs(B.x), dz0 = B.z - (RAFT.z0 - m), dz1 = RAFT.z1 + m - B.z;
      if (dx < Math.min(dz0, dz1)) { B.x = Math.sign(B.x || 1) * (RAFT.x + m); B.vx = Math.abs(B.vx) * Math.sign(B.x) * 0.6; }
      else if (dz1 < dz0) { B.z = RAFT.z1 + m; B.vz = Math.abs(B.vz) * 0.6; } else { B.z = RAFT.z0 - m; B.vz = -Math.abs(B.vz) * 0.6; }
    }
    const bm = BALL_R + (this.o.path ? 0.16 : 0);       // (well clear of the bridge: its tall railings never seem to cut into it)
    if (this.underPlank(B.x, B.z, bm)) { const sd = B.x < this.pop[0] ? -1 : 1; B.x = this.pop[0] + sd * (this.plankW() + bm + 0.01); B.vx = Math.abs(B.vx) * sd * 0.6; }
    const v = Math.hypot(B.vx, B.vz);
    if (v > 1e-4) { const ax = new THREE.Vector3(B.vz, 0, -B.vx).normalize(); B.spin.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, v * dt / BALL_R)); }
    B.mesh.position.set(B.x, P.wy + BALL_R * 0.78 + 0.005 * Math.sin(this.time * 1.7), B.z); B.mesh.quaternion.copy(B.spin);
  }
  // ---- each moment
  update(dt, hour) {
    this.time += dt; this.day = Math.floor((Date.now() - 6 * 3600e3) / 86400e3);
    const bed = this.bedtime(hour);
    if (bed && !this.wasBed) this.goBed();
    if (!bed && this.wasBed && this.o.doorOpen()) { this.getUp(); this.wasBed = false; }
    if (bed) this.wasBed = true;
    for (const d of this.ducks) {
      if (!d.task && !bed && !d.inHouse && d.held) this.hold(d, true);
      if (!d.task && !bed && !d.inHouse) d.task = this.dayTask(d);
      if (d.inHouse && !d.task) d.task = this.sleepTask();
      d.update(dt);
      if (d === this.ducks[0] && d.task && /^parade/.test(d.task.name)) { const q = d.trail[d.trail.length - 1]; if (!q || Math.hypot(q[0] - d.pos.x, q[1] - d.pos.z) > 0.03) { d.trail.push([d.pos.x, d.pos.z]); } }
      d.shadow.visible = d.root.visible && !d.inHouse;
      if (d.shadow.visible) { d.shadow.position.set(d.pos.x, (d.wet > 0.5 ? this.P.wy : this.groundY(d.pos.x, d.pos.z)) + 0.004, d.pos.z); d.shadow.rotation.y = d.heading; }
    }
    for (const d of this.ducks) this.keepOff(d);
    this.apart();
    if (this.ball) { this.bump(false, dt); this.placeBall(Math.min(dt, 0.05)); this.bump(true, dt); }
  }
  // ---- nobody through anybody
  solid(d) { return d.root.visible && !d.inHouse && !this.inHouseAt(d.pos.x, d.pos.z) && this.onRamp(d.pos.x, d.pos.z) === null; }
  // where she may be put: afloat, in the water clear of the raft and the gangplank; on land, off the raft, in the yard
  okAt(d, x, z) {
    if (this.inRaft(x, z, 0.02) || this.underPlank(x, z, -0.02)) return false;
    if (d.wet > 0.5) {          // (afloat: her whole body, tail to breast, clear of the raft and the gangplank too)
      const S = capOf(d), dx = x - d.pos.x, dz = z - d.pos.z, r = CAP.r - 0.008, hw = this.plankW();
      for (const [px, pz] of [[S[0] + dx, S[1] + dz], [(S[0] + S[2]) / 2 + dx, (S[1] + S[3]) / 2 + dz], [S[2] + dx, S[3] + dz]]) {
        if (this.inRaft(px, pz, r)) return false;
        if (Math.abs(px - this.pop[0]) < hw + r && pz > this.pop[1] - 0.05 && pz < this.foot[1] + 0.04) return false;
      }
      return this.pondS(x, z) < 0.97;
    }
    const Y = this.o.yard; return !Y || (x > Y.min[0] - 0.12 && x < Y.max[0] + 0.12 && z > Y.min[2] - 0.12 && z < Y.max[2] + 0.12);
  }
  shove(d, dx, dz) { const x = d.pos.x + dx, z = d.pos.z + dz; if (!this.okAt(d, x, z)) return false; d.pos.x = x; d.pos.z = z; return true; }
  // (straight away if she can, else a little to one side or the other: out of a corner)
  shoveOut(d, nx, nz, ov) {
    for (const [a, b] of [[1, 0], [0.7, 0.7], [0.7, -0.7], [0, 1.2], [0, -1.2]]) if (this.shove(d, (nx * a - nz * b) * ov, (nz * a + nx * b) * ov)) return true;
    return false;
  }
  // afloat, her whole body clear of the raft and the gangplank (the bridge): its tail, middle and breast
  keepOff(d) {
    if (!(d.wet > 0.5) || !this.solid(d)) return;
    const S = capOf(d), r = CAP.r, hw = this.plankW(), sd = this.side(d.pos.x);
    for (const [px, pz] of [[S[0], S[1]], [(S[0] + S[2]) / 2, (S[1] + S[3]) / 2], [S[2], S[3]]]) {
      if (this.inRaft(px, pz, r)) {
        const dx = RAFT.x + r - Math.abs(px), dz0 = pz - (RAFT.z0 - r), dz1 = RAFT.z1 + r - pz, m = Math.min(dx, dz0, dz1);
        if (m === dx) d.pos.x += Math.sign(px || 1) * dx; else if (m === dz1) d.pos.z += dz1; else d.pos.z -= dz0;
      }
      if (Math.abs(px - this.pop[0]) < hw + r && pz > this.pop[1] - 0.05 && pz < this.foot[1] + 0.04) {
        const want = this.pop[0] + sd * (hw + r); if ((want - px) * sd > 0) d.pos.x += want - px;
      }
    }
  }
  // two ducks never in each other: each moved half the overlap apart (all of it the other, if one can't go)
  apart() {
    const D = this.ducks.filter(d => this.solid(d));
    for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) {
      const a = D[i], b = D[j], c = closest(capOf(a), capOf(b)), need = 2 * CAP.r + 0.004;
      if (c.d >= need) continue;
      let nx = c.p[0] - c.q[0], nz = c.p[1] - c.q[1], l = Math.hypot(nx, nz);
      if (l < 1e-5) { nx = Math.cos(a.heading); nz = -Math.sin(a.heading); l = 1; }      // (right on top: sideways)
      nx /= l; nz /= l; const ov = need - c.d;
      const ka = this.shove(a, nx * ov / 2, nz * ov / 2), kb = this.shove(b, -nx * ov / 2, -nz * ov / 2);
      if (!ka && kb) this.shove(b, -nx * ov / 2, -nz * ov / 2);
      else if (ka && !kb) this.shove(a, nx * ov / 2, nz * ov / 2);
      else if (!ka && !kb && !this.shoveOut(a, nx, nz, ov)) this.shoveOut(b, -nx, -nz, ov);
    }
  }
  // the ball and a duck touching: the ball's bumped on (it drifts off), or, where it can't go (the raft, the edge), she
  // gives way (yield: after the ball has been kept on its pond)
  bump(yield_, dt) {
    const B = this.ball;
    for (const d of this.ducks) {
      if (!this.solid(d)) continue;
      const q = near(B.x, B.z, capOf(d)), dist = Math.hypot(B.x - q[0], B.z - q[1]), need = CAP.r + BALL_R + 0.003;
      if (dist >= need) continue;
      let nx = B.x - q[0], nz = B.z - q[1], l = Math.hypot(nx, nz);
      if (l < 1e-5) { nx = Math.sin(d.heading); nz = Math.cos(d.heading); l = 1; }
      nx /= l; nz /= l; const ov = need - dist;
      if (!yield_) { B.x += nx * ov; B.z += nz * ov; const v = Math.min(0.3, ov / Math.max(dt, 1e-3) * 0.5); B.vx += nx * v * 0.2; B.vz += nz * v * 0.2; }
      else this.shoveOut(d, -nx, -nz, ov);
    }
  }
}
function g_hide(d) { d.root.visible = false; d.shadow.visible = false; }
// a happy bob of the head, then the tail wiggle (geese.js's bob and the call ducks' wag)
const BOB = (g, u) => { const A = g.A; if (u < 1.6) { A.bobGoal = 1; A.upGoal = 0.3; } else { A.wagGoal = 1; A.tailUpGoal = 0.4; } };

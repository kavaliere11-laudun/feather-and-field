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
// what stands in the water besides the raft (stylized/coops.py floating: the Cosy's rowing boat moored by the raft, the
// Deluxe's fountain), as [x0, z0, x1, z1, r]: a capsule from above (the coop's frame; Blender's y is -z here)
const IN_WATER = { cosy_call: [[-0.8, 0.13, -0.8, 0.39, 0.095]], deluxe_call: [[1.22, -0.28, 1.22, -0.28, 0.14]] };
const BALL_R = 0.085;
// a duck's body seen from above (measured off the call ducks' models: tail to bill tip -0.136 to 0.161 along her heading,
// 0.062 to each side): a capsule from just in front of the tail to the breast, as wide as she is. Nobody goes through
// anybody: ducks kept apart by these, and off the ball (Audrey: "clipping with the ball")
const CAP = { back: -0.075, front: 0.085, r: 0.062 };
const NUDGE = CAP.front + CAP.r + BALL_R + 0.005;       // (from her middle to the ball's: her breast just touching it)
// (Audrey, 30 Oct: "sometimes the ducks will 'argue' to play with the ball. Sometimes they will send the ball out of the
// pond and will need to get out to roll it back in")
const BIG_KICK = 0.2, KICK = 1.2;                         // a nudge's chance of being a big kick (out onto the yard, if it can land there well), its speed
const ARGUE = 0.55, ARGUE_GAP = 25;                       // the chance two at the ball squabble over it, and not again for a while (s)
// the ball where it is: afloat (pondS under 0.86), on the bank's stones (to 1.12: it rolls back down into the water unless
// it's going well), or out on the yard
const zoneAt = s => s < 0.86 ? 'water' : s < 1.12 ? 'bank' : 'land';
const capK = d => d.isDuckling ? 0.475 : 1;              // (a duckling's body: a call duck's at about half the size)
const capOf = d => { const s = Math.sin(d.heading), c = Math.cos(d.heading), x = d.pos.x, z = d.pos.z, k = capK(d); return [x + s * CAP.back * k, z + c * CAP.back * k, x + s * CAP.front * k, z + c * CAP.front * k]; };
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
    this.chance = { big: BIG_KICK, argue: ARGUE, gap: ARGUE_GAP };      // (the test page's films can make them sure)
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
    this.kids = []; this.brood = null;      // (a duck's ducklings, once they've hatched: CallPen.hatch)
    this.near = this.ducks;
    this.nav = { freeAt: (x, z) => !this.inRaft(x, z, 0.02) || this.onRamp(x, z) !== null };      // (moveTo's: the raft's no way to go)
    this.wetThings = IN_WATER[o.house] || [];
    this.ring = this.makeRing();
    if (o.ball) {
      this.ball = { mesh: beachBall(), x: o.ball[0], z: o.ball[1], vx: 0, vz: 0, spin: new THREE.Quaternion(), zone: 'water', out: false };
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
  onTap(d) { if (this.o.sound) this.o.sound(d.isDuckling ? 'chicks' : 'quack', d.pos.x, d.pos.z); }      // (a tap: she quacks, bobs her head and wiggles: geese.js tapped)
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
  // in the boat or the fountain (m: more room round it): the way out of it, [nx, nz, how far], or null
  inThing(x, z, m = 0) {
    for (const T of this.wetThings) { const q = near(x, z, T), dx = x - q[0], dz = z - q[1], d = Math.hypot(dx, dz); if (d < T[4] + m) return d > 1e-5 ? [dx / d, dz / d, T[4] + m - d] : [1, 0, T[4] + m]; }
    return null;
  }
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
        if (this.inRaft(x, z, 0.12) || this.underPlank(x, z, 0.08) || this.inThing(x, z, 0.12)) continue;
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
    let clip = false, thing = null;
    for (let k = 1; k < 14; k++) { const u = k / 14, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u; if (this.inRaft(x, z, 0.08)) { clip = true; break; } if (!thing && this.inThing(x, z, 0.1)) thing = [x, z]; }
    if (!clip && thing) {                              // (round the boat or the fountain: out to the side of it, the nearer way, in the water)
      for (const T of this.wetThings) {
        const q = near(thing[0], thing[1], T); if (Math.hypot(thing[0] - q[0], thing[1] - q[1]) > T[4] + 0.12) continue;
        const ex = b[0] - a[0], ez = b[1] - a[1], el = Math.hypot(ex, ez) || 1, px = -ez / el, pz = ex / el;
        for (const sg of [1, -1]) { const w = [q[0] + px * sg * (T[4] + 0.16), q[1] + pz * sg * (T[4] + 0.16)]; if (this.pondS(w[0], w[1]) < 0.92 && !this.inRaft(w[0], w[1], 0.08) && !this.underPlank(w[0], w[1], 0.06)) return w; }
      }
    }
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
    if (this.brood && this.brood.mum === d) return this.mumTask(d);      // (with her ducklings: gentle walks, swims and long rests, never the ball)
    if (!this.o.game && d.kind === 'call_f' && d.laidOn !== this.day && h >= 8 && h < 17 && r < 0.18) return this.layTask(d);      // (the ducks lay; Pip doesn't. The game's: when it says, layNow)
    if (d.idx === 0 && !this.brood && r < 0.12 && this.ducks.every(o => this.onLand(o) && (!o.task || !/^(lay|parade)/.test(o.task.name))) && this.parade()) return d.task;
    if (r < 0.45) return this.swimTask(d, false);
    if (this.ball && this.ball.zone === 'water' && r < 0.6) return this.swimTask(d, false, true);      // (not while it's out on the yard: that's fetching)
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
    if (ball) { for (let k = 0; k < 2 + Math.floor(this.r() * 3); k++) L.push(() => this.argueOrNudge(d)); L.push(() => d.sulk > this.time ? null : TK.act('bob', 3.4, BOB)); }
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
    return TK.seq(ball ? 'ball' : 'swim', L);
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
        if (B.zone !== 'water') return true;            // (it's out: fetching it's another job)
        const ok = [], big = [], tryBig = pen.r() < pen.chance.big && pen.o.hour() < 19;      // (now and then a big kick: out over the bank, onto the yard)
        for (let k = 0; k < 16; k++) {
          const a = k / 16 * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a), hx = B.x - dx * NUDGE, hz = B.z - dz * NUDGE, ax = B.x + dx * 0.25, az = B.z + dz * 0.25;
          if (!(pen.pondS(hx, hz) < 0.95 && !pen.inRaft(hx, hz, 0.06) && !pen.underPlank(hx, hz, 0.06) && pen.side(hx) === pen.side(B.x))) continue;
          const far = Math.hypot(hx - g.pos.x, hz - g.pos.z);      // (how far she'd have to go round to it)
          if (pen.pondS(ax, az) < 0.9 && !pen.inRaft(ax, az, 0.03)) ok.push([dx, dz, far]);
          if (tryBig && pen.landsWell(B.x, B.z, dx * KICK, dz * KICK)) big.push([dx, dz, far]);
        }
        // (one of the ways she's nearly behind already: sent on away from her, not round the ball in a narrow bit of water)
        const pick = L => { L.sort((a, b) => a[2] - b[2]); return L[Math.floor(pen.r() * Math.min(3, L.length))]; };
        if (big.length) { this.dir = pick(big); this.big = true; }
        else if (!ok.length) return true;                // (nowhere to come at it from: another time)
        else this.dir = pick(ok);
      }
      const bx = B.x - this.dir[0] * NUDGE, bz = B.z - this.dir[1] * NUDGE;
      if (this.t > 12) return true;
      if (this.via === undefined || (this.via && Math.hypot(this.via[0] - g.pos.x, this.via[1] - g.pos.z) < 0.08)) { const v = pen.viaCorner([g.pos.x, g.pos.z], [bx, bz]); this.via = v && this.via && Math.hypot(v[0] - this.via[0], v[1] - this.via[1]) < 0.05 ? null : v; }      // (round the corner once, then on)
      if (this.via && !this.go) { g.moveTo(this.via[0], this.via[1], dt, 'walk', true); return false; }
      if (pen.side(bx) !== pen.side(g.pos.x) && !this.go) return true;          // (the ball's gone the other side of the gangplank: leave it)
      if (Math.hypot(bx - g.pos.x, bz - g.pos.z) > 0.06 && !this.go) { g.moveTo(bx, bz, dt, 'walk', true); return false; }
      if (!this.go) { this.go = 0; }
      this.go += dt; const A = g.A;
      if (g.turnTo(Math.atan2(B.x - g.pos.x, B.z - g.pos.z), dt, 3) < 0.4 && !this.hit) {
        this.hit = true;
        if (this.big && !pen.landsWell(B.x, B.z, this.dir[0] * KICK, this.dir[1] * KICK)) this.big = false;      // (not from here after all: an ordinary nudge)
        if (this.big) { B.vx = this.dir[0] * KICK; B.vz = this.dir[1] * KICK; } else { B.vx += this.dir[0] * 0.42; B.vz += this.dir[1] * 0.42; }
        if (this.big) { B.out = true; B.by = g; if (pen.o.sound) pen.o.sound('quack', g.pos.x, g.pos.z); }
      }
      if (this.big) {                                    // (a big one: up on her tail, a flap of the wings, a whack; then she watches it go, "oops")
        if (this.go < 0.9) { A.upGoal = 0.7; A.wingsGoal = 1; A.flapGoal = 1; A.tailUpGoal = 0.7; A.grazeGoal = this.go > 0.25 ? 0.5 : 0; }
        else { const yaw = Math.atan2(B.x - g.pos.x, B.z - g.pos.z) - g.heading; A.lookYawGoal = Math.max(-1.2, Math.min(1.2, Math.atan2(Math.sin(yaw), Math.cos(yaw)))); A.tiltGoal = 0.35; A.upGoal = 0.6; }
        return this.go > 3.2;
      }
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
      const d = this.ducks[i]; if (d.broody) return;      // (a duck sitting on her eggs stays on them)
      if (d.inHouse) { d.task = this.sleepTask(); return; }
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
      if (!d.inHouse || d.broody) return;
      d.task = TK.seq('morning', [TK.act('wait', 0.5 + k * 2.2, () => {}), () => { this.inside(d, false); return null; },
        this.rampTask(false), S(this.foot[0] + (k - 1) * 0.25, this.foot[1] + 0.35, 'walk', false, 0.08),
        TK.act('stretch', 3.6, ACT.stretch), TK.act('quack', 1.6, (g, u) => DACT.quack(g, u, 2))]);
    });
  }
  // ---- the game's: her lay when it's due (main.js gameTick), her card open, a cuddle, a hello to the farmer
  busy(d, parade = true) { return d.inHouse || d.broody || !d.root.visible || (d.task && (parade ? /^(lay|bed|morning|parade|held|cuddle|greet|argue|fetch|sit|lead)/ : /^(lay|bed|morning|held|cuddle|greet|argue|fetch|sit|lead)/).test(d.task.name)); }
  canLay(d) {        // (by day, up and about on the yard, nobody else in the nest)
    return d.kind === 'call_f' && !d.broody && !(this.brood && this.brood.mum === d) && !this.bedtime(this.o.hour()) && !d.held && !this.busy(d) && this.onLand(d) && !this.ducks.some(o => o.laying || o.broody);
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
  // ---- a brood (30 Oct; Audrey: the call ducks' ducklings): a duck sitting on her eggs in the nest at the window, day and
  // night; then her ducklings: out of the house after her one by one, down the gangplank, following her in a line on the
  // yard and across the pond (each on the trail of the one ahead, a little gap between), gathering round her and snuggling
  // in when she rests, peeping; in bed with her at night and out after her in the morning
  all() { return this.kids.length ? [...this.ducks, ...this.kids] : this.ducks; }
  // a mother whose ducklings have fallen behind (out and about, not going in or out of the house): she waits for them
  waitFor() {
    const B = this.brood; if (!B || !this.kids.length) return null;
    const m = B.mum; if (m.inHouse || !m.root.visible || this.onRamp(m.pos.x, m.pos.z) !== null || !m.task || !/^(yard|swim)$/.test(m.task.name)) { B.waiting = false; return null; }
    const out = this.kids.filter(k => !k.inHouse); if (!out.length) return null;
    const far = Math.max(...out.map(k => Math.hypot(k.pos.x - m.pos.x, k.pos.z - m.pos.z)));
    B.waiting = B.waiting ? far > 0.55 : far > 0.95;      // (stops once they're well behind; on again once they're close)
    return B.waiting ? m : null;
  }
  startSit(d) {
    d.broody = true;
    const G = this.G, L = d.inHouse ? [] : this.upTask(d);
    if (d.inHouse) this.inside(d, true);
    L.push({ name: 'sit', act: 'rest', t: 0, run(g, dt) {
      if (this.t === 0) { g.root.visible = true; g.pos.set(G.seat[0], (G.bed ?? G.floor) - 0.012, G.seat[1] + 0.06); g.heading = 0; g.lastPos = g.pos.clone(); g.A.sit = 1; }
      this.t += dt; const A = g.A; A.sitGoal = 1; A.upGoal = 0.15; ACT.look(g, this.t * 0.3); A.squintGoal = (this.t % 14) > 9 ? 0.85 : 0;      // (snug on her eggs, now and then dozing)
      return !g.broody;
    } });
    d.task = TK.seq('sit', L);
  }
  // her eggs hatch: n ducklings (names: theirs, the game's), in the nest with her; she gets up and leads them out
  hatch(d, n, names = []) {
    for (const k of this.kids) { k.root.removeFromParent(); k.shadow.removeFromParent(); }
    this.kids = [];
    d.broody = false; this.brood = { mum: d };
    if (!d.inHouse) this.inside(d, true);              // (she's on the nest with them when they hatch)
    for (let i = 0; i < n; i++) {
      const k = new Goose(this.group, 'call_d', this.r, names[i] || ['Pipkin', 'Dot', 'Bean', 'Sunny', 'Button'][i % 5]);
      k.flock = this; k.pen = this; k.plot = this.plot; k.idx = 10 + i; k.mum = d; k.trail = []; k.trailBase = 0; k.isDuckling = true;
      k.shadow = shadowDisc(0.042); this.group.add(k.shadow);
      k.root.traverse(c => { c.userData.moves = true; c.matrixAutoUpdate = true; }); k.shadow.userData.moves = true;
      this.inside(k, true); k.task = this.kidTask();
      this.kids.push(k);
    }
    this.near = this.all();
    d.trail = []; d.trailBase = 0;
    if (d.inHouse) d.task = TK.seq('lead', [TK.act('wait', 1.2, () => {}), () => { g_hide(d); return null; }, TK.act('wait', 0.6, () => {}), () => { this.inside(d, false); return null; },
      this.rampTask(false), S(this.foot[0], this.foot[1] + 0.35, 'slow', false, 0.06), TK.act('look', 4, (g, u) => { const yaw = Math.PI; g.A.lookYawGoal = 0.9 * Math.sin(u * 1.2); g.A.upGoal = 0.4; })]);
  }
  // her day with them: a walk about the yard (slowly), a swim, a long rest with them round her
  mumTask(d) {
    const r = this.r();
    if (r < 0.4) return this.swimTask(d, false);
    if (r < 0.65) return TK.seq('yard', [TK.act('rest', 10 + this.r() * 10, DACT.rest)]);
    const L = [], sp = this.yardSpot(); if (!this.walkTo(L, sp[0], sp[1], 'walk', d)) return TK.act('look', 2);
    L.push(this.r() < 0.6 ? TK.act('graze', 5 + this.r() * 5) : TK.act('look', 3));
    return TK.seq('yard', L);
  }
  // a duckling: following the one ahead of it (its mother for the first) along its trail, gap behind; round her when she's
  // still; in and out of the house after her
  kidTask() {
    const pen = this;
    return { name: 'kid', act: 'walk', t: 0, run(g, dt) {
      this.t += dt; const B = pen.brood, A = g.A; if (!B) return true;
      const mum = B.mum, i = pen.kids.indexOf(g), lead = i <= 0 ? mum : pen.kids[i - 1], gap = i <= 0 ? 0.25 : 0.165;
      const pathTo = (T, from) => { let a = 0; for (let j = from; j < T.length - 1; j++) a += Math.hypot(T[j + 1][0] - T[j][0], T[j + 1][1] - T[j][1]); return a + (T.length ? Math.hypot(lead.pos.x - T[T.length - 1][0], lead.pos.z - T[T.length - 1][1]) : 0); };
      if (g.inHouse) {                                   // (inside: out after the one ahead, once it's a gap down the plank)
        if (lead.inHouse || !lead.root.visible || pen.bedtime(pen.o.hour())) return false;
        const T = lead.trail; let j = T.length - 1; while (j > 0 && Math.hypot(T[j][0] - pen.pop[0], T[j][1] - pen.pop[1]) > 0.04) j--;
        if (pathTo(T, Math.max(0, j)) < gap) return false;
        pen.inside(g, false); g.trail = [[g.pos.x, g.pos.z]]; g.trailBase = 0; this.k = (lead.trailBase || 0) + Math.max(0, j); this.still = 0;
        return false;
      }
      if (mum.inHouse && lead.inHouse && Math.hypot(g.pos.x - pen.pop[0], g.pos.z - pen.pop[1]) < 0.09) { pen.inside(g, true); return false; }      // (in at the door after the one ahead)
      // round her when she's been still a while (snuggled up beside her on the yard, or bobbing about near her afloat)
      const still = mum.vs < 0.02 && !mum.inHouse && pen.onRamp(mum.pos.x, mum.pos.z) === null && !pen.inHouseAt(mum.pos.x, mum.pos.z);
      this.still = still ? (this.still || 0) + dt : 0;
      const ashore = mum.wet < 0.3 && g.wet > 0.3;          // (she's resting on the bank, they're still afloat: up her trail to her first)
      if (this.still > 2.5 && !ashore) {
        const SL = [[0.13, -0.02], [-0.13, -0.03], [0.07, -0.19], [-0.08, -0.2], [0.17, -0.14]][i % 5], s = Math.sin(mum.heading), c = Math.cos(mum.heading);
        const tx = mum.pos.x + c * SL[0] + s * SL[1], tz = mum.pos.z - s * SL[0] + c * SL[1];
        const dx = tx - g.pos.x, dz = tz - g.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.02 && pen.okAt(g, g.pos.x + dx / d * 0.01, g.pos.z + dz / d * 0.01)) { const st = Math.min(d, 0.12 * dt); g.pos.x += dx / d * st; g.pos.z += dz / d * st; g.turnTo(Math.atan2(dx, dz), dt, 3); }
        else { g.turnTo(mum.heading, dt, 1.5); if (mum.act === 'rest' && g.wet < 0.3) { A.sitGoal = 1; A.squintGoal = mum.A.shut > 0.5 ? 0.9 : 0; } else DACT.float(g, this.t); }
        this.k = undefined; return false;
      }
      // along the trail of the one ahead, from the point nearest it, a gap behind
      const T = lead.trail, base = lead.trailBase || 0; if (!T.length) return false;
      if (this.k === undefined || this.k < base || this.k - base >= T.length) {
        let bj = 0, bd = Infinity; for (let j = Math.max(0, T.length - 400); j < T.length; j++) { const dd = Math.hypot(T[j][0] - g.pos.x, T[j][1] - g.pos.z); if (dd < bd) { bd = dd; bj = j; } }
        this.k = base + bj;
      }
      let j = this.k - base; const want = this.still > 2.5 ? gap * 0.5 : gap;
      while (j < T.length - 1 && Math.hypot(T[j][0] - g.pos.x, T[j][1] - g.pos.z) < 0.035 && pathTo(T, j + 1) > want) j++;
      // (a short cut where the trail loops about: on to the furthest point a little way along it that's close by in a
      // straight line, clear of the raft and the gangplank, not in and out of the water; never closer than the gap)
      if (!this.cut || this.t - this.cut > 0.3) {
        this.cut = this.t;
        for (let q = Math.min(T.length - 1, j + 80); q > j + 3; q--) {
          if (Math.hypot(T[q][0] - g.pos.x, T[q][1] - g.pos.z) > 0.3 || pathTo(T, q) < want) continue;
          let ok = true; const wet0 = pen.wetAt(g.pos.x, g.pos.z) > 0.3;
          for (let u = 0.2; u <= 1 && ok; u += 0.2) { const x = g.pos.x + (T[q][0] - g.pos.x) * u, z = g.pos.z + (T[q][1] - g.pos.z) * u; if (pen.inRaft(x, z, 0.05) || pen.underPlank(x, z, 0.04) || (pen.wetAt(x, z) > 0.3) !== wet0) ok = false; }
          if (ok) { j = q; break; }
        }
      }
      this.k = base + j;
      const rest = pathTo(T, j), p = T[j], dx = p[0] - g.pos.x, dz = p[1] - g.pos.z, d = Math.hypot(dx, dz);
      if (lead.inHouse && mum.inHouse && j >= T.length - 1 && d < 0.04 && Math.hypot(g.pos.x - pen.pop[0], g.pos.z - pen.pop[1]) < 0.2) { pen.inside(g, true); return false; }      // (at the end of its trail, by the door: in)
      if (rest > want * 0.85 && d > 0.004) {
        const sp = (rest > gap * 1.8 ? 0.34 : rest > gap * 1.2 ? 0.24 : 0.17) * (g.wet > 0.5 ? 0.85 : 1), st = Math.min(d, sp * dt);
        g.pos.x += dx / d * st; g.pos.z += dz / d * st; g.turnTo(Math.atan2(dx, dz), dt, 5);
      } else g.turnTo(lead.heading, dt, 1.5);
      A.wagGoal = 0.25; A.upGoal = 0.25; A.lookYawGoal = 0.25 * Math.sin(this.t * 1.7 + g.seed);
      return false;
    } };
  }
  // (each moment: the trails they follow, from where each is; kept to the last few metres)
  trails() {
    if (!this.brood) return;
    for (const d of [this.brood.mum, ...this.kids]) {
      if (!d.trail || d.inHouse || !d.root.visible || this.inHouseAt(d.pos.x, d.pos.z)) continue;
      const q = d.trail[d.trail.length - 1];
      if (!q || Math.hypot(q[0] - d.pos.x, q[1] - d.pos.z) > 0.02) d.trail.push([d.pos.x, d.pos.z]);
      if (d.trail.length > 600) { d.trail.splice(0, 200); d.trailBase = (d.trailBase || 0) + 200; }
    }
  }
  // ---- the ball: floating, bobbing, drifting where it's sent, slowing, off the pond's edge, the raft and the gangplank;
  // a big kick sends it over the bank onto the yard, where it rolls and stops (off the fence and what's in the yard)
  // one moment of the ball (B: x, z, vx, vz, out: a big kick's, over the edge): also used to see where a kick would end
  ballStep(B, dt) {
    const P = this.P;
    B.x += B.vx * dt; B.z += B.vz * dt;
    let s = this.pondS(B.x, B.z); const zone = zoneAt(s);
    const f = Math.exp(-(zone === 'water' ? 0.7 : zone === 'bank' ? 1.3 : 1.9) * dt); B.vx *= f; B.vz *= f;
    const gx = (B.x - P.cx) / (P.a * P.a), gz = (B.z - P.cz) / (P.b * P.b), gl = Math.hypot(gx, gz) || 1, ux = gx / gl, uz = gz / gl;      // (outwards)
    if (zone === 'water' && !B.out && s > 0.8) {          // (kept on the water: off the edge, gently)
      const dot = B.vx * ux + B.vz * uz; if (dot > 0) { B.vx -= 1.6 * dot * ux; B.vz -= 1.6 * dot * uz; }
      const k = (s - (s - 0.8) * Math.min(1, dt * 10)) / s; B.x = P.cx + (B.x - P.cx) * k; B.z = P.cz + (B.z - P.cz) * k;
    }
    if (zone === 'bank') { B.vx -= ux * 0.4 * dt; B.vz -= uz * 0.4 * dt; }      // (the bank slopes down into the water)
    if (zone === 'land' && B.roll) { B.vx -= ux * 0.25 * dt; B.vz -= uz * 0.25 * dt; }      // (nobody could fetch it: it rolls back by itself)
    if (B.out && zone === 'water' && Math.hypot(B.vx, B.vz) < 0.06) B.out = false;
    if (zone !== 'water') {                                // (on the yard: inside the fence, off what's in it)
      const Y = this.o.yard;
      if (Y) for (const [i, lo, hi] of [[0, Y.min[0] + BALL_R, Y.max[0] - BALL_R], [2, Y.min[2] + BALL_R, Y.max[2] - BALL_R]]) {
        const key = i ? 'z' : 'x', vk = i ? 'vz' : 'vx';
        if (B[key] < lo) { B[key] = lo; B[vk] = Math.abs(B[vk]) * 0.5; B.hit = true; } else if (B[key] > hi) { B[key] = hi; B[vk] = -Math.abs(B[vk]) * 0.5; B.hit = true; }
      }
      for (const q of this.things()) {
        const dx = B.x - q[0], dz = B.z - q[1], d = Math.hypot(dx, dz), m = q[2] + BALL_R;
        if (d < m && d > 1e-5) { const nx = dx / d, nz = dz / d, dot = B.vx * nx + B.vz * nz; B.x = q[0] + nx * m; B.z = q[1] + nz * m; if (dot < 0) { B.vx -= 1.5 * dot * nx; B.vz -= 1.5 * dot * nz; } B.hit = true; }
      }
    }
    if (this.inRaft(B.x, B.z, BALL_R + 0.02)) {           // (off the raft: pushed out the nearest way)
      const m = BALL_R + 0.02, dx = RAFT.x + m - Math.abs(B.x), dz0 = B.z - (RAFT.z0 - m), dz1 = RAFT.z1 + m - B.z;
      if (dx < Math.min(dz0, dz1)) { B.x = Math.sign(B.x || 1) * (RAFT.x + m); B.vx = Math.abs(B.vx) * Math.sign(B.x) * 0.6; }
      else if (dz1 < dz0) { B.z = RAFT.z1 + m; B.vz = Math.abs(B.vz) * 0.6; } else { B.z = RAFT.z0 - m; B.vz = -Math.abs(B.vz) * 0.6; }
    }
    const th = this.inThing(B.x, B.z, BALL_R + 0.01);
    if (th) { B.x += th[0] * th[2]; B.z += th[1] * th[2]; const dot = B.vx * th[0] + B.vz * th[1]; if (dot < 0) { B.vx -= 1.6 * dot * th[0]; B.vz -= 1.6 * dot * th[1]; } B.hit = true; }      // (off the boat, the fountain)
    const bm = BALL_R + (this.o.path ? 0.16 : 0);       // (well clear of the bridge: its tall railings never seem to cut into it)
    if (this.underPlank(B.x, B.z, bm)) { const sd = B.x < this.pop[0] ? -1 : 1; B.x = this.pop[0] + sd * (this.plankW() + bm + 0.01); B.vx = Math.abs(B.vx) * sd * 0.6; B.hit = true; }
    return zoneAt(this.pondS(B.x, B.z));
  }
  // what's in the yard for the ball to roll into: the feeder, the dish, the hay..., what's in front of the house: [x, z, r]
  things() { return this._things || (this._things = [...(this.o.obstacles || []).map(q => [q[0], q[2], q[3]]), ...(this.o.block || []).filter(q => this.pondS(q[0], q[1]) > 1.05).map(q => [q[0], q[1], q[2]])]); }
  // the shortest way from (x, z) into the water (the pond's edge's normal, inwards)
  inward(x, z) { const P = this.P, gx = (x - P.cx) / (P.a * P.a), gz = (z - P.cz) / (P.b * P.b), l = Math.hypot(gx, gz) || 1; return [-gx / l, -gz / l]; }
  clearOfThings(x, z, r) { return !this.things().some(q => Math.hypot(x - q[0], z - q[1]) < q[2] + r); }
  // where a kick from (x, z) at (vx, vz) would end: out on the yard, somewhere a duck can get behind it and roll it straight
  // back down into the water (nothing in the way, not by the gangplank), without it hitting anything on its way
  landsWell(x, z, vx, vz) { return this.landsAt(x, z, vx, vz) && this.landsAt(x, z, vx * 0.9, vz * 0.9); }      // (and a little softer too: sure to get over)
  landsAt(x, z, vx, vz) {
    const B = { x, z, vx, vz, out: true, hit: false };
    for (let t = 0; t < 10 && Math.hypot(B.vx, B.vz) > 0.02; t += 0.05) { this.ballStep(B, 0.05); if (B.hit) return false; }
    const s = this.pondS(B.x, B.z); if (zoneAt(s) !== 'land' || s > 1.75 || !this.free(B.x, B.z, BALL_R + 0.04) || this.underPlank(B.x, B.z, 0.3)) return false;
    if (B.z < -0.15) return false;                        // (not behind the house: out where you see it, at its front or sides)
    const [nx, nz] = this.inward(B.x, B.z);
    if (!this.free(B.x - nx * 0.27, B.z - nz * 0.27, 0.07)) return false;      // (room for her behind it)
    for (let u = 0; u < 1.2; u += 0.05) { const px = B.x + nx * u, pz = B.z + nz * u; if (this.pondS(px, pz) < 0.9) break; if (!this.clearOfThings(px, pz, BALL_R) || this.underPlank(px, pz, BALL_R + 0.05)) return false; }
    return true;
  }
  placeBall(dt) {
    const B = this.ball, P = this.P;
    B.hit = false; const zone = B.zone = this.ballStep(B, dt), v = Math.hypot(B.vx, B.vz);
    B.still = zone === 'land' && v < 0.03 ? (B.still || 0) + dt : 0;
    if (v > 1e-4) { const ax = new THREE.Vector3(B.vz, 0, -B.vx).normalize(); B.spin.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, v * dt / BALL_R)); }
    const s = this.pondS(B.x, B.z), u = smooth(0.86, 1.12, s), afloat = P.wy + BALL_R * 0.78 + 0.005 * Math.sin(this.time * 1.7) * (1 - u);
    B.mesh.position.set(B.x, afloat + (BALL_R + 0.002 - afloat) * u + 0.035 * Math.sin(Math.PI * u), B.z); B.mesh.quaternion.copy(B.spin);      // (afloat, up over the bank's stones, rolling on the ground)
  }
  // ---- the ball out on the yard: a duck climbs out and rolls it back down into the water with her breast (the one who
  // kicked it, if she's free, else whoever's nearest); then a happy bob. Not at night: it waits for the morning
  fetchTask(d) {
    const pen = this, B = this.ball, L = [];
    if (d.wet > 0.3) {                                   // (out of the water first: onto the bank nearest the ball)
      const P = this.P, sd = this.side(d.pos.x);
      let best = null;
      for (const p of this.ring) {
        if (this.side(p.x) !== sd || p.s < 0.8) continue;
        const bank = [P.cx + P.a * 1.24 * Math.cos(p.t), P.cz + P.b * 1.24 * Math.sin(p.t)];
        if (!this.free(bank[0], bank[1], 0.05) || Math.hypot(bank[0] - B.x, bank[1] - B.z) < 0.38) continue;      // (near it, not into it)
        const c = Math.hypot(bank[0] - B.x, bank[1] - B.z) + 0.5 * Math.hypot(p.x - d.pos.x, p.z - d.pos.z);
        if (!best || c < best.c) best = { p, bank, c };
      }
      if (!best) return null;
      const via = this.viaCorner([d.pos.x, d.pos.z], [best.p.x, best.p.z]);
      L.push(...(via ? [S(via[0], via[1], 'walk', true, 0.08)] : []), S(best.p.x, best.p.z, 'walk', true, 0.1), S(best.bank[0], best.bank[1], 'walk', false, 0.08), TK.act('shake', 1.2));
    }
    L.push(() => {                                       // (over to it by the bank's ways: to its side, not through it)
      const [nx, nz] = this.inward(B.x, B.z), sd = (d.pos.x - B.x) * nz - (d.pos.z - B.z) * nx >= 0 ? 1 : -1, Q = [];
      let tx = B.x + nz * sd * 0.34, tz = B.z - nx * sd * 0.34;
      if (!this.free(tx, tz, 0.05)) { tx = B.x - nx * 0.3; tz = B.z - nz * 0.3; }
      if (!this.walkTo(Q, tx, tz, 'hurry', d)) return null;
      return TK.seq('round', Q);
    });
    L.push({ name: 'push', act: 'walk', t: 0, run(g, dt) {       // (rolling it: behind it, facing the water, a slow shove with her breast, head bobbing)
      this.t += dt; const A = g.A, P = pen.P;
      if (B.zone === 'water') { B.vx += this.dir ? this.dir[0] * 0.25 : 0; B.vz += this.dir ? this.dir[1] * 0.25 : 0; return true; }
      if (this.t > 45) { B.fails = (B.fails || 0) + 1; if (B.fails >= 2) B.roll = true; return true; }
      const [nx, nz] = pen.inward(B.x, B.z); this.dir = [nx, nz];
      const rx = g.pos.x - B.x, rz = g.pos.z - B.z, along = rx * nx + rz * nz;
      if (along > -0.15) {                               // (she's beside it or on its far side: round it, out to its side first)
        const sd = rx * nz - rz * nx >= 0 ? 1 : -1, back = along > 0.05 ? 0 : 0.25, px = B.x + nz * sd * 0.34 - nx * back, pz = B.z - nx * sd * 0.34 - nz * back;
        g.moveTo(px, pz, dt, 'walk', true); A.wagGoal = 0.3; return false;
      }
      const bx = B.x - nx * (NUDGE - 0.01), bz = B.z - nz * (NUDGE - 0.01);
      if (Math.hypot(bx - g.pos.x, bz - g.pos.z) > 0.07 && !this.on) { g.moveTo(bx, bz, dt, 'walk', true); return false; }
      this.on = true;
      if (g.turnTo(Math.atan2(nx, nz), dt, 3) < 0.35) {      // (the shove: pen.bump rolls it on ahead of her, a little roll on each push)
        g.moveTo(B.x + nx * 0.3, B.z + nz * 0.3, dt, 'walk', true);
        if (Math.hypot(B.x - g.pos.x, B.z - g.pos.z) < NUDGE + 0.02 && Math.hypot(B.vx, B.vz) < 0.22) { B.vx += nx * 0.7 * dt; B.vz += nz * 0.7 * dt; }
      }
      if (Math.hypot(bx - g.pos.x, bz - g.pos.z) > 0.2) this.on = false;
      A.grazeGoal = 0.4; A.wagGoal = 0.6; A.bobGoal = (this.t % 1.2) < 0.5 ? 1 : 0;
      return false;
    } });
    L.push(() => { if (B.zone !== 'water') return null; if (this.o.sound) this.o.sound('quack', d.pos.x, d.pos.z); return TK.act('bob', 3.4, BOB); });
    return TK.seq('fetch', L);
  }
  // ---- two at the ball: a squabble over it now and then. They turn to each other and quack in turn, heads stretched out
  // at each other, wings a little up (the other sitting up, indignant), a little nearer each time; then one gives in: a
  // huff, nose in the air and a tail wiggle, and she swims off; the other bobs happily and plays on. All talk: nobody's hurt
  argueOrNudge(d) {
    if (d.sulk > this.time) return null;               // (she's lost one: not playing now)
    const B = this.ball;
    const o = this.ducks.find(x => x !== d && x.wet > 0.5 && !x.held && x.task && (x.task.name === 'ball' || (x.task.name === 'swim' && Math.hypot(x.pos.x - B.x, x.pos.z - B.z) < 0.5))
      && Math.hypot(x.pos.x - B.x, x.pos.z - B.z) < 0.8 && Math.hypot(x.pos.x - d.pos.x, x.pos.z - d.pos.z) < 1.2 && this.side(x.pos.x) === this.side(d.pos.x));
    if (!o || B.zone !== 'water' || this.time < (this.argueAt ?? -1e9) + this.chance.gap || this.r() > this.chance.argue) return this.nudgeTask(d);
    this.argueAt = this.time;
    const F = { a: d, b: o, win: this.r() < 0.5 ? d : o };
    const lose = g => [{ name: 'huff', act: 'swim', t: 0, run(q, dt) {      // (turned away from the winner, nose up, a tail wiggle)
        this.t += dt; const w = F.win, A = q.A; q.turnTo(Math.atan2(q.pos.x - w.pos.x, q.pos.z - w.pos.z), dt, 3);
        A.upGoal = 0.85; A.lookPitchGoal = -0.3; A.tailUpGoal = 0.6; A.wagGoal = this.t > 0.7 ? 1 : 0; return this.t > 1.9;
      } }, () => {                                       // (off to the far side of her arc)
        const L = this.ring.filter(p => this.side(p.x) === this.side(g.pos.x) && Math.hypot(p.x - g.pos.x, p.z - g.pos.z) < 1.0);
        if (!L.length) return null;
        const p = L.reduce((a, q) => Math.hypot(q.x - B.x, q.z - B.z) > Math.hypot(a.x - B.x, a.z - B.z) ? q : a); const Q = []; this.swimTo(Q, p.x, p.z); return Q[0](g);
      }, TK.act('float', 2.5, DACT.float)];
    if (F.win !== d) d.sulk = this.time + 40; else o.sulk = this.time + 40;
    o.task = TK.seq('argue', [this.argueTask(o, d, F), ...(F.win === o ? [TK.act('bob', 2.4, BOB), () => this.nudgeTask(o), () => this.nudgeTask(o), TK.act('bob', 3.4, BOB)] : lose(o))]);
    return TK.seq('argue', [this.argueTask(d, o, F), ...(F.win === d ? [TK.act('bob', 2.4, BOB)] : lose(d))]);
  }
  argueTask(g, other, F) {
    const pen = this;
    return { name: 'argue', act: 'swim', t: 0, run(d, dt) {
      this.t += dt; const t = this.t, A = d.A, o = other;
      const dx = o.pos.x - d.pos.x, dz = o.pos.z - d.pos.z, dist = Math.hypot(dx, dz) || 1;
      d.turnTo(Math.atan2(dx, dz), dt, 4);
      const u = t - 0.8, k = Math.floor(u / 0.7), turn = u > 0 && u < 4.2 ? k % 2 : -1, mine = turn === (d === F.a ? 0 : 1);
      const near = mine && (u % 0.7) < 0.25 ? 0.3 : 0.36;      // (a little nearer on each word)
      if (dist > near) { const sp = 0.1 * dt, x = d.pos.x + dx / dist * sp, z = d.pos.z + dz / dist * sp; if (pen.okAt(d, x, z)) { d.pos.x = x; d.pos.z = z; } }
      if (mine) {
        A.lowGoal = 0.55; A.upGoal = 0.05; A.honkGoal = 0.8; A.jawGoal = Math.sin(u * 15) > 0 ? 1 : 0.1; A.wingLiftGoal = 0.5; A.wagGoal = 0.7; A.bobGoal = (u % 0.7) < 0.3 ? 1 : 0;
        if (this.said !== k) { this.said = k; if (pen.o.sound) pen.o.sound('quack', d.pos.x, d.pos.z); }
      } else if (turn >= 0) { A.upGoal = 0.8; A.tiltGoal = 0.3 * Math.sin(u * 3); A.tailUpGoal = 0.4; A.wagGoal = 0.2; }
      else DACT.swim(d, t);
      return t > 5.2;
    } };
  }
  // ---- each moment
  update(dt, hour) {
    this.time += dt; this.day = Math.floor((Date.now() - 6 * 3600e3) / 86400e3);
    const bed = this.bedtime(hour);
    if (bed && !this.wasBed) this.goBed();
    if (!bed && this.wasBed && this.o.doorOpen()) { this.getUp(); this.wasBed = false; }
    if (bed) this.wasBed = true;
    const wait = this.waitFor();
    for (const d of this.ducks) {
      if (d === wait) {                                    // (a mother waiting for her ducklings to catch up: turned to them, calling)
        const t = d.task; d.task = null; d.update(dt); d.task = t;
        const k = this.kids.find(q => !q.inHouse) || this.kids[0]; d.turnTo(Math.atan2(k.pos.x - d.pos.x, k.pos.z - d.pos.z), dt, 1.5);
        d.A.upGoal = 0.45; d.A.lookYawGoal = 0.3 * Math.sin(this.time * 2); d.shadow.visible = d.root.visible && !d.inHouse;
        if (d.shadow.visible) d.shadow.position.set(d.pos.x, (d.wet > 0.5 ? this.P.wy : this.groundY(d.pos.x, d.pos.z)) + 0.004, d.pos.z);
        continue;
      }
      if (!d.task && !bed && !d.inHouse && d.held) this.hold(d, true);
      if (!d.task && !bed && !d.inHouse) d.task = this.dayTask(d);
      if (d.inHouse && !d.task) d.task = this.sleepTask();
      d.update(dt);
      if (d === this.ducks[0] && d.task && /^parade/.test(d.task.name)) { const q = d.trail[d.trail.length - 1]; if (!q || Math.hypot(q[0] - d.pos.x, q[1] - d.pos.z) > 0.03) { d.trail.push([d.pos.x, d.pos.z]); } }
      d.shadow.visible = d.root.visible && !d.inHouse;
      if (d.shadow.visible) { d.shadow.position.set(d.pos.x, (d.wet > 0.5 ? this.P.wy : this.groundY(d.pos.x, d.pos.z)) + 0.004, d.pos.z); d.shadow.rotation.y = d.heading; }
    }
    for (const k of this.kids) {
      k.update(dt);
      k.shadow.visible = k.root.visible && !k.inHouse;
      if (k.shadow.visible) { k.shadow.position.set(k.pos.x, (k.wet > 0.5 ? this.P.wy : this.groundY(k.pos.x, k.pos.z)) + 0.004, k.pos.z); k.shadow.rotation.y = k.heading; }
    }
    this.trails();
    for (const d of this.all()) this.keepOff(d);
    this.apart();
    if (this.ball) {
      this.bump(false, dt); this.placeBall(Math.min(dt, 0.05)); this.bump(true, dt);
      const B = this.ball;
      if (B.zone === 'land' && B.still > 1.2 && !bed && this.time > (B.nextTry || 0) && !this.ducks.some(d => d.task && d.task.name === 'fetch')) {
        const free = this.ducks.filter(d => !d.held && !this.busy(d) && !(d.task && /^(argue|fetch)/.test(d.task.name)));
        const pick = free.includes(B.by) ? B.by : free.reduce((a, d) => !a || Math.hypot(d.pos.x - B.x, d.pos.z - B.z) < Math.hypot(a.pos.x - B.x, a.pos.z - B.z) ? d : a, null);
        if (pick) { const t = this.fetchTask(pick); if (t) pick.task = t; }
        B.nextTry = this.time + 6;
      }
    }
  }
  // ---- nobody through anybody
  solid(d) { return d.root.visible && !d.inHouse && !this.inHouseAt(d.pos.x, d.pos.z) && this.onRamp(d.pos.x, d.pos.z) === null; }
  // where she may be put: afloat, in the water clear of the raft and the gangplank; on land, off the raft, in the yard
  okAt(d, x, z) {
    if (this.inRaft(x, z, 0.02) || this.underPlank(x, z, -0.02)) return false;
    if (d.wet > 0.5) {          // (afloat: her whole body, tail to breast, clear of the raft and the gangplank too)
      const S = capOf(d), dx = x - d.pos.x, dz = z - d.pos.z, r = CAP.r * capK(d) - 0.008, hw = this.plankW();
      for (const [px, pz] of [[S[0] + dx, S[1] + dz], [(S[0] + S[2]) / 2 + dx, (S[1] + S[3]) / 2 + dz], [S[2] + dx, S[3] + dz]]) {
        if (this.inRaft(px, pz, r) || this.inThing(px, pz, r)) return false;
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
    const S = capOf(d), r = CAP.r * capK(d), hw = this.plankW(), sd = this.side(d.pos.x);
    for (const [px, pz] of [[S[0], S[1]], [(S[0] + S[2]) / 2, (S[1] + S[3]) / 2], [S[2], S[3]]]) {
      const th = this.inThing(px, pz, r); if (th) { d.pos.x += th[0] * th[2]; d.pos.z += th[1] * th[2]; }      // (round the boat, the fountain)
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
    const D = this.all().filter(d => this.solid(d));
    for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) {
      const a = D[i], b = D[j], c = closest(capOf(a), capOf(b)), need = CAP.r * (capK(a) + capK(b)) + 0.004;
      if (c.d >= need) continue;
      let nx = c.p[0] - c.q[0], nz = c.p[1] - c.q[1], l = Math.hypot(nx, nz);
      if (l < 1e-5) { nx = Math.cos(a.heading); nz = -Math.sin(a.heading); l = 1; }      // (right on top: sideways)
      nx /= l; nz /= l; const ov = Math.min(need - c.d, 0.04);      // (a big overlap, someone stepping off the gangplank into another: eased apart over a few moments, no jump)
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
    for (const d of this.all()) {
      if (!this.solid(d)) continue;
      const q = near(B.x, B.z, capOf(d)), dist = Math.hypot(B.x - q[0], B.z - q[1]), need = CAP.r * capK(d) + BALL_R + 0.003;
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

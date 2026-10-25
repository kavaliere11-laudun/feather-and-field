// The show day (release 1 step 9b; Audrey chose a "Show day on the farm", the judging "Hours later"): when a show's results
// come and the player taps "Watch the judging", the white show tent stands on the green (showground.js), the other entries
// already in their pens. The farmer walks up with the player's bird in his arms and puts her in her pen; the judge takes
// his clipboard and goes along the pens, peering in at each bird and writing; at the player's bird she hops and flaps.
// Then he fetches the rosettes from his table and pins them, third, second and first (a champion's rosette for a County or
// National winner); if hers is one, the farmer cheers, hearts float up over her and the judge claps. Then main.js shows the
// results card, and the tent goes once it's closed. "Skip" (main.js) jumps to the end. Nothing here is saved: the result
// is the game's (game.js showTick), this only shows it.
import * as THREE from 'three';
import { SHOW, ShowGround } from './showground.js';
import { Farmer } from './farmer.js';

const RIVALS = [['rir', 'hen'], ['orp', 'hen'], ['leg', 'hen'], ['bra', 'hen'], ['rir', 'rooster'], ['orp', 'rooster'], ['leg', 'rooster'], ['bra', 'rooster'],
  ['sil', 'hen', 'white'], ['sil', 'hen', 'black'], ['sil', 'hen', 'buff'], ['sil', 'hen', 'blue'], ['sil', 'rooster', 'partridge'], ['sil', 'hen', 'grey']];
const KINDS = ['first', 'second', 'third'];
const sm = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

export class ShowDay {
  // ctx: { scene, grade, newBird(plot, breed, kind, colour, pos, yaw, r), plots, allBirds, r, at: { x, z }, look ('m'/'f'),
  //   bird: { breed, kind, colour }, place (1..), champ (a County or National 1st), title, sub, say(key), hearts(world), onEnd() }
  constructor(ctx) {
    this.ctx = ctx; const r = this.r = ctx.r || Math.random;
    const G = this.G = new ShowGround(ctx.scene, { x: ctx.at.x, z: ctx.at.z, deg: 45, grade: ctx.grade });
    G.sign(ctx.title, ctx.sub);
    const I = SHOW, n = I.pens.length;
    // her pen, and where the rosettes go: hers if she placed, the others' to the other pens
    this.mine = Math.floor(r() * n);
    const others = [...Array(n).keys()].filter(i => i !== this.mine).sort(() => r() - 0.5);
    this.ros = KINDS.map((k, i) => ({ kind: i === 0 && ctx.champTier ? 'champion' : k, pen: ctx.place === i + 1 ? this.mine : others.shift() }));      // (a County or National winner: the champion's rosette)
    // the birds: the other entries in their pens, hers in the farmer's arms
    const plot = this.plot = { kind: 'lineup', frame: G.group, birds: [], centre: G.world(0, 0, I.pens[0].front - 0.4) };
    const pool = RIVALS.slice().sort(() => r() - 0.5);
    I.pens.forEach((p, i) => {
      if (i === this.mine) return;
      const [breed, kind, colour] = pool[i % pool.length];
      const b = ctx.newBird(plot, breed, kind, colour || null, [p.bird[0], 0, p.bird[2]], p.birdYaw, r);
      b.stay = true; b.root.position.y = p.bird[1]; plot.birds.push(b);
    });
    const B = ctx.bird, P = I.pens[this.mine];
    this.hen = ctx.newBird(plot, B.breed, B.kind, B.colour || null, [0, 0, 3], 0, r);
    this.hen.stay = true; this.hen.shadowY = 0.015; plot.birds.push(this.hen);
    ctx.plots.push(plot); ctx.allBirds.push(...plot.birds);
    G.clipboard(true);
    // the judge behind his table, the farmer coming up from the player's side with her
    const J = I.judgeTable;
    this.judge = new Farmer(G.group, 'j', ctx.grade, r);
    this.judge.pos.set(J.stand[0], 0, J.stand[1]); this.judge.root.rotation.y = J.standYaw;
    this.farmer = new Farmer(G.group, ctx.look, ctx.grade, r);
    this.from = [P.farmer[0] - 2.2, P.farmer[1] + 1.4]; this.farmer.pos.set(this.from[0], 0, this.from[1]);
    this.watch = [-2.2, 2.08];                         // (where he watches from: by the sign, clear of the judge's way)
    this.plan(); this.t = 0; this.k = 0; this.done = false; this.said = {};
    this.update(0);
  }
  // the timeline: each step's start and length (seconds), filled in as the walks' lengths come out
  plan() {
    const I = SHOW, n = I.pens.length, P = I.pens[this.mine], S = [];
    let t = 0;
    const add = (name, len, o = {}) => { S.push({ name, t0: t, t1: t + len, ...o }); t += len; return S[S.length - 1]; };
    const walkLen = (a, b, v = 1.0) => Math.max(0.4, Math.hypot(b[0] - a[0], b[1] - a[1]) / v);
    // the farmer brings her (the judge meanwhile goes to the first pen with his clipboard)
    add('arrive', walkLen(this.from, P.farmer, 0.85), { say: 'arrive' });
    add('handover', 1.6);
    add('back', walkLen(P.farmer, this.watch, 1.0));
    // the judge along the pens, left to right
    const J0 = [I.judgeTable.stand[0], I.judgeTable.stand[1]];
    let at = J0;
    S.judgeStart = 0;
    let jt = 0; const J = [];                          // (the judge's own steps, from the start: he sets off while the farmer comes)
    const jadd = (name, len, o = {}) => { J.push({ name, t0: jt, t1: jt + len, ...o }); jt += len; };
    jadd('take', 0.7);
    for (let i = 0; i < n; i++) {
      const to = I.pens[i].judge;
      jadd('walk', walkLen(at, to, 1.15), { from: at, to, yaw: I.pens[i].judgeYaw });
      if (i === 0 && jt < t) jadd('wait', t - jt, { pen: 0 });        // (he waits by the first pen till she's in)
      jadd('look', i === this.mine ? 2.0 : 1.05, { pen: i, say: i === 0 ? 'judge' : null });
      jadd('write', 0.75, { pen: i });
      at = to;
    }
    jadd('walk', walkLen(at, J0, 1.15), { from: at, to: J0, yaw: I.judgeTable.standYaw });
    jadd('fetch', 0.9, { say: 'rosettes' });
    at = J0;
    for (let k = 2; k >= 0; k--) {                    // third, second, first
      const R = this.ros[k], pa = I.pens[R.pen].pinAt;
      jadd('carry', walkLen(at, pa, 1.15), { from: at, to: pa, yaw: I.pens[R.pen].pinYaw, k });
      jadd('pin', 1.1, { k, pen: R.pen });
      at = pa;
    }
    const away = [at[0], at[1] + 0.45];
    jadd('stepback', 0.6, { from: at, to: away, yaw: 0.2 });
    jadd('clap', 3.2, { cheer: true });
    this.J = J; this.S = S; this.len = jt;
  }
  get over() { return this.t >= this.len; }
  skip() { this.t = this.len; this.update(0.01); }
  // where someone is along a walk (from, to), eased, with a walking phase
  walkFig(F, s, u, dt) {
    const e = sm(u), x = s.from[0] + (s.to[0] - s.from[0]) * e, z = s.from[1] + (s.to[1] - s.from[1]) * e;
    const moved = Math.hypot(x - F.pos.x, z - F.pos.z);
    F.walkPh = (F.walkPh || 0) + moved / 0.85 * Math.PI * 2;
    if (Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]) > 0.05) F.root.rotation.y = u < 0.92 ? Math.atan2(s.to[0] - s.from[0], s.to[1] - s.from[1]) : F.root.rotation.y + (s.yaw - F.root.rotation.y) * Math.min(1, dt * 8);
    F.pos.set(x, 0, z);
    return dt > 0 ? Math.min(1, moved / dt / 0.9) : 0;
  }
  update(dt) {
    if (this.done) return;
    this.t = Math.min(this.len, this.t + dt);
    const t = this.t, I = SHOW, P = I.pens[this.mine], F = this.farmer, Jd = this.judge, G = this.G, hen = this.hen, ctx = this.ctx;
    const say = k => { if (k && !this.said[k]) { this.said[k] = true; if (ctx.say) ctx.say(k); } };
    // ---- the farmer and her
    const fs = this.S.find(s => t < s.t1) || this.S[this.S.length - 1], fu = (t - fs.t0) / (fs.t1 - fs.t0);
    let fw = { pose: 'hips', face: 'happy', props: {} }, carry = null;
    const holdAt = () => { const h = F.root.rotation.y; return [F.pos.x + Math.sin(h) * 0.22, 0.69, F.pos.z + Math.cos(h) * 0.22, h + Math.PI / 2]; };
    if (t < fs.t1 && fs.name === 'arrive') {
      say(fs.say);
      const walk = this.walkFig(F, { from: this.from, to: P.farmer, yaw: P.farmerYaw }, fu, dt);
      fw = { pose: 'hold', face: 'happy', walk, phase: F.walkPh, keepArms: true, props: {}, anim: (Q, Fa, tt) => { Q.wrR[0] += 6 * Math.sin(tt * 2.4); } };
      carry = holdAt();
    } else if (t < fs.t1 && fs.name === 'handover') {
      F.pos.set(P.farmer[0], 0, P.farmer[1]); F.root.rotation.y += (P.farmerYaw - F.root.rotation.y) * Math.min(1, dt * 10);
      const u = sm(fu), h = holdAt(), lean = Math.sin(Math.min(1, fu * 1.15) * Math.PI);
      fw = { pose: u < 0.75 ? 'hold' : 'hips', face: 'happy', props: {}, anim: Q => { Q.chest[0] += 14 * lean; Q.shL[1] -= 30 * lean; Q.shR[1] -= 30 * lean; } };
      // her way: from his arms up to the pen's door and in onto the straw, turning to face out
      const door = [P.door[0], P.door[1] - 0.2, P.door[2]], bird = P.bird;
      const a = u < 0.5 ? u * 2 : 1, b = u < 0.5 ? 0 : (u - 0.5) * 2;
      const x1 = h[0] + (door[0] - h[0]) * a, y1 = h[1] + (door[1] - h[1]) * a + Math.sin(a * Math.PI) * 0.08, z1 = h[2] + (door[2] - h[2]) * a;
      carry = [x1 + (bird[0] - x1) * b, y1 + (bird[1] - y1) * b, z1 + (bird[2] - z1) * b, h[3] + (P.birdYaw - h[3]) * u];
    } else if (t < fs.t1 && fs.name === 'back') {
      const walk = this.walkFig(F, { from: P.farmer, to: this.watch, yaw: 2.55 }, fu, dt);
      fw = { pose: 'hips', face: 'happy', walk, phase: F.walkPh, props: {} };
    } else {
      F.pos.set(this.watch[0], 0, this.watch[1]); F.root.rotation.y += (2.55 - F.root.rotation.y) * Math.min(1, dt * 6);
      fw = { pose: 'hips', face: 'happy', props: {}, anim: (Q, Fa) => { Fa.look = [0.5, 0.05]; } };
    }
    if (carry) { hen.root.position.set(carry[0], carry[1], carry[2]); hen.root.rotation.y = carry[3]; hen.shadowY = 0.015; }
    else if (!this.inPen) { this.inPen = true; hen.root.position.set(P.bird[0], P.bird[1], P.bird[2]); hen.root.rotation.y = P.birdYaw; hen.shadowY = undefined; }
    hen.target.copy(hen.root.position);                // (she stays where she's put: in his arms, then in her pen)
    // ---- the judge
    const js = this.J.find(s => t < s.t1) || this.J[this.J.length - 1], ju = Math.min(1, (t - js.t0) / (js.t1 - js.t0));
    say(js.say);
    let jw = { pose: 'judge_carry', face: 'neutral', props: { clipboard: true } };
    if (js.name === 'take') { G.clipboard(ju < 0.5); jw = { pose: ju < 0.5 ? 'judge_write' : 'judge_carry', face: 'neutral', props: { clipboard: ju >= 0.5 } }; }
    else if (js.name === 'walk' || js.name === 'carry' || js.name === 'stepback') {
      const walk = this.walkFig(Jd, js, ju, dt);
      jw = { pose: js.name === 'carry' ? 'stand' : 'judge_carry', face: js.name === 'carry' ? 'happy' : 'neutral', walk, phase: Jd.walkPh, keepArms: 'R', props: { clipboard: js.name === 'walk' && this.J.indexOf(js) < this.J.findIndex(s => s.name === 'fetch') } };
      if (js.name === 'carry' && !this.held) this.held = G.hold(Jd, this.ros[js.k].kind);
    } else if (js.name === 'wait' || js.name === 'look' || js.name === 'write') {
      const Pi = I.pens[js.pen]; Jd.pos.set(Pi.judge[0], 0, Pi.judge[1]); Jd.root.rotation.y = Pi.judgeYaw;
      if (js.name === 'write') jw = { pose: 'judge_write', face: 'peer', props: { clipboard: true, pencil: true }, anim: (Q, Fa, tt) => { Q.wrR[0] += 7 * Math.sin(tt * 14); Q.wrR[2] += 6 * Math.sin(tt * 5); Fa.look = [0.1, -0.5]; } };
      else if (js.name === 'look') {
        jw = { pose: 'judge_look', face: 'peer', props: { clipboard: true }, anim: (Q, Fa, tt) => { Q.head[2] += 6 * Math.sin(tt * 0.9); Q.chest[2] += 3 * Math.sin(tt * 0.9); } };
        if (js.pen === this.mine && ju > 0.35 && !this.hopped) { this.hopped = true; hen.tapped(); }       // (she shows herself off)
      }
    } else if (js.name === 'fetch') {
      Jd.pos.set(I.judgeTable.stand[0], 0, I.judgeTable.stand[1]); Jd.root.rotation.y = I.judgeTable.standYaw;
      G.clipboard(ju > 0.4);
      jw = { pose: ju < 0.6 ? 'judge_write' : 'stand', face: 'happy', props: { clipboard: ju <= 0.4 } };
    } else if (js.name === 'pin') {
      const R = this.ros[js.k], Pi = I.pens[R.pen];
      if (!this.posedAt || this.posedAt !== js) { this.posedAt = js; Jd.pos.set(Pi.pinAt[0], 0, Pi.pinAt[1]); Jd.root.rotation.y = Pi.pinYaw; this.reached = false; }
      jw = { pose: 'judge_pin', face: 'happy', props: {} };
      if (!this.held && !R.pinned) this.held = G.hold(Jd, R.kind);
      if (ju > 0.45 && !this.reached) { this.reached = true; Jd.update(1); Jd.root.updateMatrixWorld(true); G.reachPin(Jd, R.pen); }
      if (ju > 0.7 && !R.pinned) {
        R.pinned = true; G.pin(R.pen, this.held || R.kind); this.held = null;
        if (R.pen === this.mine) { hen.tapped(); this.cheerAt = t; this.heartAt = t; }
      }
    } else if (js.name === 'clap') {
      if (ju > 0.25) this.announce();                  // (the results card while everyone claps)
      jw = { pose: 'clap', face: 'happy', props: {}, anim: (Q) => { const s = Math.sin(this.t * 13); Q.shL[0] -= 7 * s; Q.shR[0] += 7 * s; Q.shL[2] += 8 * s; Q.shR[2] -= 8 * s; } };
    }
    // the farmer: hooray when her rosette's pinned (a wave after), otherwise clapping along at the end
    if (this.cheerAt !== undefined && t > this.cheerAt) { const k = (t - this.cheerAt) % 3; fw = { pose: k < 1.2 ? 'stretch' : 'wave', face: 'happy', props: {}, anim: (Q, Fa, tt) => { if (k >= 1.2) { Q.shR[0] += 10 * Math.sin(tt * 7); } } }; }
    else if (js.name === 'clap') fw = { pose: 'clap', face: 'happy', props: {}, anim: (Q) => { const s = Math.sin(this.t * 12); Q.shL[0] -= 7 * s; Q.shR[0] += 7 * s; } };
    if (this.heartAt !== undefined && t >= this.heartAt && t < this.cheerAt + 1.6) { this.heartAt = t + 0.3; if (ctx.hearts) ctx.hearts(G.world(P.bird[0], P.bird[1] + 0.42, P.bird[2] + 0.1)); }      // (hearts over her)
    F.want = fw; Jd.want = jw;
    if (dt > 0) { F.update(dt); Jd.update(dt); } else { F.update(1); Jd.update(1); }
    // the end: everything placed as it ends (also after a skip)
    if (this.over && !this.ended) {
      this.ended = true;
      for (const R of this.ros) if (!R.pinned) { R.pinned = true; G.pin(R.pen, R.kind); }
      if (this.held) { this.held.removeFromParent(); this.held = null; }
      if (!this.inPen) { this.inPen = true; hen.root.position.set(P.bird[0], P.bird[1], P.bird[2]); hen.root.rotation.y = P.birdYaw; hen.shadowY = undefined; }
      G.clipboard(true);
      this.announce();
    }
  }
  announce() { if (!this.announced) { this.announced = true; if (this.ctx.onEnd) this.ctx.onEnd(); } }
  // the view on it: the pens in the middle
  centre() { return this.G.world(0.15, 0, -0.95); }        // (behind the pens on the ground: from the camera's height, the pens and the people round them in the middle)
  dispose() {
    this.done = true;
    const { plots, allBirds } = this.ctx, i = plots.indexOf(this.plot);
    if (i >= 0) plots.splice(i, 1);
    for (const b of this.plot.birds) { const k = allBirds.indexOf(b); if (k >= 0) allBirds.splice(k, 1); b.root.removeFromParent(); }
    this.G.group.removeFromParent();
  }
}

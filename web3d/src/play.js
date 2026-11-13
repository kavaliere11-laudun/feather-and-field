// The hens' play things (release 4; Audrey, 27 Oct: "Starting at the cosy one, add a swing in their garden that they can
// perch on. Come with ideas like this cute fun that they interact with"; she chose all four ideas: a dust bath, a hanging
// treat ball (a cabbage), a climbing perch ladder, a pecking xylophone). Cosy and Deluxe pens: the swing, the dust bath, the
// cabbage; Deluxe also: the ladder and the xylophone (stylized/coops.py PLAY; coops.json pens[t].play, in the pen's frame).
// Now and then a grown bird goes to a free one:
//   swing: up onto the perch, a turn to face out, a ride (it swings, she keeps it going), a hop down; it swings on a little.
//   dust bath: into the sand, down low, wriggling and kicking it up in puffs, a rest, more; out, and a big shake.
//   cabbage: a few pecks at it, each sends it swinging and spinning on its string.
//   ladder: perch by perch to the top, a look round from up there (the rooster crows), a flutter down.
//   xylophone: pecks at its bars, a note floating up from each in the bar's colour.
// And the Glutton's apple tree (6 Nov 2026; main.js appleTree: plot.apple), just outside her coop's pen (Audrey: "I'd like
// the tree outside the coop as the gluton escape to eat"): a Glutton hen goes to the side fence, flutters up and over it,
// goes round under an apple, looks up at it, crouches and leaps straight up, head up and wings out, and knocks it down; it
// falls in front of her and she eats it, three bites; after her second, she goes to the nook under the tree, settles there
// a moment with the egg song's clucks, and gets up: an apple egg (the game: game.eatApple). Then back to the fence and over
// it, home. Once she's over, she finishes her outing (the farmer coming into the pen doesn't stop her); at bedtime she's
// back inside at once.
// Nothing else is saved: it's just their day. A bird at play is busy (nobody calls her away; the farmer coming into the pen,
// or bedtime, ends it).
import * as THREE from 'three';

const smooth01 = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
let SCENE = null, fxTex = null;
const FX = [];
export function initPlay(o) { SCENE = o.scene; fxTex = o.fxTexture64; }

// the moving parts (the swing's perch, the cabbage) hung in the plot's frame; the toys' state on plot.toys
export function addToys(plot, P, part, treat = 'cabbage') {
  const T = plot.toys = { P, clock: 0, dust: { by: null, next: 0 }, ladder: P.ladder ? { by: null, next: 0 } : null, xylo: P.xylo ? { by: null, next: 0 } : null };
  const hang = (name, x, y, z) => {
    const m = part(name); m.position.set(x, y, z);
    m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } c.userData.moves = true; });
    plot.frame.add(m); return m;
  };
  const S = P.swing, C = P.cabbage;
  T.swing = { mesh: hang('swing_seat', S.at[0], S.top, S.at[1]), a: 0, v: 0, by: null, next: 0, L: S.top - S.perch };
  T.cabbage = { model: treat, mesh: hang(treat, C.at[0], C.top, C.at[1]), ax: 0, vx: 0, az: 0, vz: 0, spin: 0, vs: 0, by: null, next: 0 };
  T.cabbage.mesh.rotation.order = 'XZY';
  return T;
}

// the swing and the cabbage on their own: swinging on, slowing down (a bird on the swing keeps it going)
export function tickToys(plot, dt) {
  const T = plot.toys; T.clock += dt;
  const S = T.swing, K = 9, rider = S.by && S.by.play && S.by.play.phase === 'ride';
  S.v += (-K * Math.sin(S.a) - (rider ? 0.25 : 0.7) * S.v) * dt;
  if (rider) {                                       // she leans with it: a little push each way to keep it going
    const E = 0.5 * S.v * S.v + K * (1 - Math.cos(S.a)), want = K * (1 - Math.cos(S.by.play.amp));
    if (E < want) S.v += Math.sign(S.v || 1) * 1.1 * dt;
  }
  S.a += S.v * dt; S.mesh.rotation.x = -S.a;
  const C = T.cabbage, K2 = 12;
  C.vx += (-K2 * Math.sin(C.ax) - 0.9 * C.vx) * dt; C.vz += (-K2 * Math.sin(C.az) - 0.9 * C.vz) * dt;
  C.ax += C.vx * dt; C.az += C.vz * dt; C.vs *= Math.exp(-1.1 * dt); C.spin += C.vs * dt;
  C.mesh.rotation.set(C.ax, C.spin, C.az);
  if (T.spin) { const R = T.spin, rider = R.by && R.by.play && R.by.play.phase === 'ride'; R.w += ((rider ? 3.4 : 0) - R.w) * Math.min(1, dt * (rider ? 0.9 : 0.7)); R.a = (R.a + R.w * dt) % (Math.PI * 2); R.mesh.rotation.y = R.a; }
  if (T.bounce) { const B = T.bounce; B.sq += (B.want - B.sq) * Math.min(1, dt * 22); B.mesh.scale.set(1 + (1 - B.sq) * 0.35, B.sq, 1 + (1 - B.sq) * 0.35); B.want = 1; }
  if (T.prints) tickPrints(plot, dt);
}

// a free play thing for her now and then (none for chicks, nor by night, nor while the farmer's in the pen)
export function wantPlay(b) {
  const T = b.plot.toys, AP = b.plot.apple;
  if ((!T && !AP) || b.kind === 'chick' || b.train || b.mum || b.plot.farmer || b.cuddle || b.called || b.laying || b.stay || b.nightNow(0.6)) return null;      // (not the peacock: his train)
  if (AP && b.kind === 'hen' && b.pers === 'glutton' && AP.want(b) && b.r() < 0.4) return 'apple';      // (the Glutton: an apple on her tree)
  if (!T) return null;
  if (b.r() > (b.kind === 'rooster' ? 0.035 : 0.06)) return null;
  const free = ['swing', 'dust', 'cabbage', 'ladder', 'xylo', 'ice', 'ice', 'igloo', 'igloo', 'spin', 'spin', 'bounce', 'bounce'].filter(k => T[k] && !T[k].by && T[k].next <= T.clock && !((k === 'xylo' || k === 'igloo' || k === 'spin' || k === 'bounce') && b.kind === 'rooster'));
  return free.length ? free[Math.floor(b.r() * free.length)] : null;
}

// off to play: where she goes first (the pen's frame), and which way she'll face there
export function startPlay(b, kind) {
  const T = b.plot.toys, P = T && T.P, j = b.r() - 0.5, AP = b.plot.apple;
  let C;                                             // where she might go first ({ spot, face, bath }), in order
  if (kind === 'apple') { const S = AP && AP.pick(b); if (!S) return false; C = [{ spot: AP.S.inAt, face: AP.S.outA, slot: S }]; }      // (to the side fence, facing out: the apple she's after)
  else if (kind === 'swing') C = [{ spot: [P.swing.at[0] + j * 0.08, P.swing.at[1] + 0.46], face: Math.PI }];
  else if (kind === 'dust' && !P.dust.w) {          // the Cosy's tub (a round sand pit): from the side she's on, just outside it, then a hop into its middle
    const D = P.dust.at, p = b.root.position, a = Math.atan2(p.x - D[0], p.z - D[1]), R = (P.dust.r || 0.235) + 0.185;
    C = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6, Math.PI].map(da => {
      const spot = [D[0] + Math.sin(a + da) * R, D[1] + Math.cos(a + da) * R];
      return { spot, face: Math.atan2(D[0] - spot[0], D[1] - spot[1]), bath: [D[0], D[1]] };
    });
  } else if (kind === 'dust') {                      // the Deluxe's sandbox: beside it (its front if she can), then a hop in to a spot of her own
    const D = P.dust, hw = D.w / 2, hd = D.d / 2;
    C = [[0, 1], [-1, 0], [1, 0], [0, -1]].map(([sx, sz]) => ({
      spot: [D.at[0] + (sx ? sx * (hw + 0.2) : j * hw * 0.8), D.at[1] + (sz ? sz * (hd + 0.2) : j * hd * 0.6)], face: Math.atan2(-sx, -sz),
      bath: [D.at[0] + (sx ? sx * hw * 0.35 : j * hw * 0.7), D.at[1] + (sz ? sz * hd * 0.3 : j * hd * 0.4)] }));
  } else if (kind === 'cabbage') C = [{ spot: [P.cabbage.at[0], P.cabbage.at[1] + 0.2], face: Math.PI }];
  else if (kind === 'ladder') C = [{ spot: [P.ladder.at[0] + j * 0.12, P.ladder.at[1] + 0.44], face: Math.PI }];
  else if (kind === 'igloo') C = [{ spot: T.igloo.spot, face: T.igloo.face }];
  else if (kind === 'spin') C = [[1, 0], [0, -1], [-1, 0]].map(([sx, sz]) => ({ spot: [T.spin.at[0] + sx * (T.spin.r + 0.22), T.spin.at[1] + sz * (T.spin.r + 0.22)], face: Math.atan2(-sx, -sz), slot: Math.atan2(sx, sz) }));      // (the roundabout: beside it, her seat the one nearest)
  else if (kind === 'bounce') C = [{ spot: [T.bounce.at[0] - 0.56, T.bounce.at[1]], face: Math.PI / 2 }, { spot: [T.bounce.at[0], T.bounce.at[1] + 0.56], face: Math.PI }];      // (the gumdrop: beside it)      // (the igloo: to its door, facing in)
  else if (kind === 'ice') {                         // the frozen puddle: to one end of it (the nearer one first), facing along it
    const I = T.ice, z = I.at[1] + j * 0.2, ends = [-1, 1].map(sx => ({ spot: [I.at[0] + sx * (I.hw + 0.2), z], face: -sx * Math.PI / 2, to: [I.at[0] - sx * (I.hw + 0.2), z] }));
    if (Math.abs(b.root.position.x - ends[1].spot[0]) < Math.abs(b.root.position.x - ends[0].spot[0])) ends.reverse();
    C = ends.filter(e => b.free(e.to[0], e.to[1]));
  }
  else C = [{ spot: [P.xylo.at[0] + 0.25, P.xylo.at[1] + j * 0.08], face: -Math.PI / 2 }];
  const Y = b.plot.pen && b.plot.pen.yard, mid = Y && [(Y.min[0] + Y.max[0]) / 2, (Y.min[2] + Y.max[2]) / 2];
  const reach = spot => {                            // a way there: straight, or by a step out in front of it, or by the middle of the yard
    let r = b.plan([spot]);
    if (r.length && r[r.length - 1] === spot) return r;
    const vias = [[spot[0], spot[1] + 0.4], [spot[0] + 0.45, spot[1] + 0.15], [spot[0] - 0.45, spot[1] + 0.15], ...(mid ? [mid, [mid[0], mid[1] + 0.4], [mid[0] - 0.5, mid[1]], [mid[0] + 0.5, mid[1]]] : [])];
    for (const m of vias) {
      if (!b.free(m[0], m[1])) continue;
      r = b.plan([m, spot]); if (r.length && r[r.length - 1] === spot) return r;
    }
    return null;
  };
  for (const c of C) {
    if (!b.free(c.spot[0], c.spot[1])) continue;
    const route = reach(c.spot);
    if (!route) continue;
    (kind === 'apple' ? AP : T[kind]).by = b;
    b.play = { kind, phase: 'walk', t: 0, all: 0, route, spot: c.spot, face: c.face, stuck: 0, bath: c.bath, slot: c.slot, to: c.to };
    b.act = null; b.route = null; b.then = null; b.wait = 0; b.eatAt = null;
    return true;
  }
  return false;
}

// done (or called away): back on the ground, the play thing free again after a little while
export function endPlay(b, early = false) {
  const P = b.play; if (!P) return;
  const T = b.plot.toys, toy = P.kind !== 'apple' && T && T[P.kind];
  if (P.kind === 'igloo') b.root.visible = true;
  if (toy && toy.by === b) { toy.by = null; toy.next = T.clock + 6 + b.r() * 10; }
  if (P.kind === 'apple' && b.plot.apple) b.plot.apple.done(b, early);      // (a while before she goes again)
  if (early && P.phase !== 'walk') { const p = b.root.position; p.set(P.spot[0], 0.015, P.spot[1]); }
  b.root.position.y = 0.015; b.shadowY = undefined; b.hopT = -1; b.visual.rotation.z = 0;
  b.play = null; b.wait = 0.4 + b.r() * 0.8; b.acted = true;
}

// a hop from `from` to `to` (Vector3s) over dur seconds, `high` above the hop's own lift; true when she's landed
function hop(b, P, from, to, dur, high, dt) {
  const p = b.root.position, u = Math.min(1, P.t / dur), a = smooth01((u - 0.24) / 0.62);
  p.x = from.x + (to.x - from.x) * a; p.z = from.z + (to.z - from.z) * a;
  p.y = from.y + (to.y - from.y) * a + high * Math.sin(a * Math.PI);
  b.hopT = u < 1 ? u : -1;
  b.shadowY = u > 0.2 && u < 0.95 ? 0.0 : undefined;
  return u >= 1;
}

// one frame of play: returns her pose (walking, sit, flap, peck, ruffle, kick, crow)
export function playStep(b, dt) {
  const P = b.play, T = b.plot.toys, Q = T && T.P, p = b.root.position, o = { walking: false };
  P.t += dt; P.all += dt;
  const next = (ph, extra) => { P.phase = ph; P.t = 0; P.from = p.clone(); Object.assign(P, extra || {}); };
  if (P.phase !== 'walk' && b.plot.farmer && !P.leaving) {          // the farmer's here: down and off (the next step ends it)
    P.leaving = true;
    if (P.kind === 'swing' && (P.phase === 'turn' || P.phase === 'ride')) next('down');
    else if (P.kind === 'ladder' && P.phase !== 'down' && P.phase !== 'walk' && P.phase !== 'face') next('down');
    else if (P.kind === 'dust' && P.phase === 'bathe') next('out');
    else if (P.kind === 'ice') { if (P.phase !== 'slide') { endPlay(b); return o; } }
    else if (P.kind === 'igloo') { if (P.phase !== 'out' && P.phase !== 'shake') next('out'); }
    else if (P.kind === 'spin') { if (P.phase === 'ride') next('slow'); }
    else if (P.kind === 'bounce') { if (P.phase === 'bounce') P.left = 0; }
    else if (P.kind === 'cabbage' || P.kind === 'xylo' || (P.kind === 'apple' && P.phase === 'face')) { endPlay(b); return o; }      // (the Glutton: unless she's over the fence already)
  }
  if (P.phase === 'walk') {                          // there, round what's in the way
    if (b.plot.farmer || b.nightNow(0.3) || P.all > 25) { endPlay(b); return o; }
    const tgt = P.route[0];
    const r = b.stepToward(tgt[0], tgt[1], dt, 1.1, P.stuck < 0.6);      // (held up a moment by the edge of something: past it)
    o.walking = r.walking;
    P.stuck = r.blocked ? P.stuck + dt : Math.max(0, P.stuck - dt * 0.25);
    if (r.arrived || Math.hypot(tgt[0] - p.x, tgt[1] - p.z) < 0.05) { P.route.shift(); if (!P.route.length) next('face'); }
    return o;
  }
  if (P.phase === 'face') {
    const r = b.turnTo(P.face, dt); o.walking = r.walking;
    if (r.done || P.t > 1.5) {
      if (P.kind === 'swing') next('up');
      else if (P.kind === 'dust') next('in');
      else if (P.kind === 'cabbage') next('peck', { left: 4.5 + b.r() * 4, pk: 0 });
      else if (P.kind === 'ladder') next('climb', { step: 0, rest: 0 });
      else if (P.kind === 'apple') next('out');
      else if (P.kind === 'igloo') next('in');
      else if (P.kind === 'spin') next('on', { off: P.slot - T.spin.a });
      else if (P.kind === 'bounce') next('up');
      else if (P.kind === 'ice') next('slide', { goes: P.goes || 0, spin: b.r() < 0.4 ? (b.r() < 0.5 ? -1 : 1) : 0 });
      else next('tap', { left: 3.5 + b.r() * 3, pk: 0 });
    }
    return o;
  }
  if (P.kind === 'apple') return appleStep(b, P, o, next, dt);
  if (P.kind === 'swing') return swingStep(b, P, T, Q.swing, o, next, dt);
  if (P.kind === 'dust') return dustStep(b, P, T, Q.dust, o, next, dt);
  if (P.kind === 'cabbage') return cabbageStep(b, P, T, Q.cabbage, o, next, dt);
  if (P.kind === 'ladder') return ladderStep(b, P, T, Q.ladder, o, next, dt);
  if (P.kind === 'ice') return iceStep(b, P, T, o, next, dt);
  if (P.kind === 'igloo') return iglooStep(b, P, T, o, next, dt);
  if (P.kind === 'spin') return spinStep(b, P, T, o, next, dt);
  if (P.kind === 'bounce') return bounceStep(b, P, T, o, next, dt);
  return xyloStep(b, P, T, Q.xylo, o, next, dt);
}

// the Glutton's apple: over the fence, round to it, look up, the leap, the apple eaten; after two, the egg; back over the
// fence (plot.apple: main.js appleTree)
function flutter(b, P, to, dur, o) {                 // a crouch, up and over, wings going, legs folded up under her, reaching down to land
  const u = Math.min(1, P.t / dur);
  o.flap = u > 0.2 && u < 0.88 ? 1 : 0;
  return hop(b, P, P.from, tmpTo.set(to[0], 0.015, to[1]), dur, 0.62, 0);
}
const tmpTo = new THREE.Vector3();
function walkOut(b, P, AP, o, dt) {                  // along her way outside (P.way), round the tub; true when there
  const q = P.way[0], p = b.root.position;
  if (!q) return true;
  const r = b.stepToward(q[0], q[1], dt, 1.1, false); o.walking = r.walking;
  if (r.arrived || Math.hypot(q[0] - p.x, q[1] - p.z) < 0.04) P.way.shift();
  return !P.way.length || P.t > 8;
}
function appleStep(b, P, o, next, dt) {
  const AP = b.plot.apple, p = b.root.position;
  if (!AP) { if (P.phase !== 'walk') p.set(P.spot[0], 0.015, P.spot[1]); endPlay(b); return o; }      // (its tree gone: back in)
  const S = AP.S, here = () => [p.x, p.z];
  if (P.phase === 'out') { if (flutter(b, P, S.outAt, 0.95, o)) { const st = AP.standFor(b, P.slot); next('go', { way: AP.way(S.outAt, st) }); } return o; }
  if (P.phase === 'go') { if (walkOut(b, P, AP, o, dt)) next('aim'); return o; }
  if (P.phase === 'aim') { const r = b.turnTo(P.slot.face, dt); o.walking = r.walking; if (r.done || P.t > 1.2) next('look'); return o; }
  if (P.phase === 'look') {                          // head back, eyes on it
    o.up = smooth01(P.t / 0.4);
    if (P.t > 0.85) next('hop');
    return o;
  }
  if (P.phase === 'hop') {                           // a crouch, and straight up, stretched tall, head up, wings out: her beak knocks it off
    const u = Math.min(1, P.t / 0.85), a = smooth01((u - 0.24) / 0.62);
    if (P.lift === undefined) P.lift = AP.lift(b, P.slot);      // (just as high as her beak needs, so her head stays clear of the crown)
    b.hopT = u < 1 ? u : -1;
    p.y = P.from.y + P.lift * Math.sin(a * Math.PI);
    b.shadowY = u > 0.2 && u < 0.95 ? 0.0 : undefined;
    o.up = 1; o.flap = u > 0.22 && u < 0.72 ? 0.9 : 0;
    if (u > 0.5 && !P.hit) { P.hit = true; P.got = AP.knock(b, P.slot); }
    if (u >= 1) { p.y = P.from.y; b.shadowY = undefined; b.hopT = -1; if (P.got) next('eat', { bites: 0, got: P.got }); else next('shake'); }
    return o;
  }
  if (P.phase === 'eat') {                           // she turns to where it landed beside her, then bends right down and eats it, a bite at a time
    const r = b.turnTo(P.got.face ?? b.root.rotation.y, dt); o.walking = r.walking && !r.done;
    if (!AP.down() || (!r.done && P.t < 1.5 && !P.turned)) { o.up = 0.6 * (1 - smooth01(P.t / 0.3)); if (AP.down()) return o; P.t = 0; return o; }
    if (!P.turned) { P.turned = true; P.t = 0; }
    o.peck = (P.t % 0.62) > 0.3 ? 1.45 : 0.5;
    const k = Math.min(3, Math.floor(P.t / 0.62));
    if (k > P.bites) { P.bites = k; AP.bite(k); }
    if (P.t > 0.62 * 3 + 0.15) { AP.eaten(); if (P.got.egg) { AP.laying = true; next('nook', { way: AP.way(here(), S.nook) }); } else next('shake'); }
    return o;
  }
  if (P.phase === 'nook') { if (walkOut(b, P, AP, o, dt)) next('settle'); return o; }      // (two apples: to the nook under the tree)
  if (P.phase === 'settle') {                        // (facing out from the tree)
    const r = b.turnTo(S.nookA, dt); o.walking = r.walking;
    if (r.done || P.t > 1.2) next('lay');
    return o;
  }
  if (P.phase === 'lay') {                           // down low a moment, the egg song's clucks; up, and there's the egg
    o.sit = P.t < 2.2 ? 1 : 0;
    if (P.t > 0.5 && !P.sang) { P.sang = true; AP.song(b); }
    if (P.t > 2.6) {
      AP.laid(b);
      let to = null;                                 // (off it, to one side: not between it and the camera, so it's seen)
      for (const da of [1.6, -1.6, 2.2, -2.2, 1.1, -1.1, 0]) { const a = S.nookA + da, q = [p.x + Math.sin(a) * 0.3, p.z + Math.cos(a) * 0.3]; if (AP.free(q[0], q[1])) { to = q; break; } }
      next('off', { to: to || here() });
    }
    return o;
  }
  if (P.phase === 'off') {                           // a step off it
    const r = b.stepToward(P.to[0], P.to[1], dt, 0.8, false); o.walking = r.walking;
    if (r.arrived || P.t > 2) next('shake');
    return o;
  }
  if (P.phase === 'shake') {                         // a happy shake
    o.ruffle = Math.sin(Math.min(1, P.t / 0.75) * Math.PI);
    if (P.t > 0.75) next('home', { way: AP.way(here(), S.outAt) });
    return o;
  }
  if (P.phase === 'home') { if (walkOut(b, P, AP, o, dt)) next('turnin'); return o; }      // (back to the fence)
  if (P.phase === 'turnin') { const r = b.turnTo(S.outA + Math.PI, dt); o.walking = r.walking; if (r.done || P.t > 1.2) next('in'); return o; }
  if (P.phase === 'in') { if (flutter(b, P, S.inAt, 0.95, o)) endPlay(b); return o; }      // (over, and home)
  return o;
}

// where her feet are on the swing's perch (it moves)
function onPerch(S, Q, v) { const L = S.L; return v.set(Q.at[0], Q.top - L * Math.cos(S.a) + 0.02, Q.at[1] + L * Math.sin(S.a)); }
const tmpV = new THREE.Vector3();
function swingStep(b, P, T, Q, o, next, dt) {
  const S = T.swing, p = b.root.position;
  if (P.phase === 'up') {
    const to = onPerch(S, Q, tmpV).clone(); to.x += (P.spot[0] - Q.at[0]) * 0.5;
    o.flap = P.t > 0.25 && P.t < 0.75 ? 1 : 0;
    if (hop(b, P, P.from, to, 0.95, 0.06, dt)) { S.v += 0.9; next('turn', { amp: 0.26 + b.r() * 0.12, ride: 7 + b.r() * 8, dx: to.x - Q.at[0] }); }
    return o;
  }
  if (P.phase === 'turn' || P.phase === 'ride') {
    onPerch(S, Q, tmpV); p.set(Q.at[0] + P.dx, tmpV.y, tmpV.z); b.shadowY = 0.0;
    o.sit = 0.55;
    if (P.phase === 'turn') { const r = b.turnTo(0, dt * 0.7); o.walking = r.walking; if (r.done || P.t > 2) next('ride'); return o; }
    if (P.t > 2.5 && P.t < 3.3 && b.r() < dt * 0.4) o.ruffle = 1;
    if (P.t > P.ride) next('down');
    return o;
  }
  if (P.phase === 'down') {
    if (!P.land) P.land = new THREE.Vector3(P.spot[0], 0.015, P.spot[1] + 0.06);
    o.flap = P.t > 0.2 && P.t < 0.7 ? 0.8 : 0;
    if (hop(b, P, P.from, P.land, 0.9, 0.05, dt)) endPlay(b);
    return o;
  }
  return o;
}

function dustStep(b, P, T, Q, o, next, dt) {
  const p = b.root.position, c = new THREE.Vector3(P.bath[0], Q.y, P.bath[1]);
  if (P.phase === 'in') {
    o.flap = P.t > 0.25 && P.t < 0.6 ? 0.6 : 0;
    if (hop(b, P, P.from, c, 0.8, 0.07, dt)) next('bathe', { left: 8 + b.r() * 5, wr: 0, rest: 0.6 });
    return o;
  }
  if (P.phase === 'bathe') {                         // down low in the sand: bursts of wriggling and kicking, rests between
    p.set(c.x, c.y, c.z); b.shadowY = Q.y - 0.005; o.sit = 1;
    if (P.wr > 0) {
      P.wr -= dt; const w = Math.sin(P.t * 11);
      b.visual.rotation.z = 0.28 * w; o.ruffle = 0.7; o.kick = (P.t % 0.9) < 0.35 ? 1 : 0;
      P.puff = (P.puff || 0) - dt;
      if (P.puff <= 0) { P.puff = 0.12; dustPuff(b, 0.06, 0.05); }
      if (P.wr <= 0) P.rest = 0.8 + b.r() * 1.4;
    } else {
      b.visual.rotation.z *= Math.exp(-dt * 10);
      P.rest -= dt; if (P.rest <= 0) P.wr = 1.0 + b.r() * 1.2;
    }
    P.left -= dt;
    if (P.left <= 0 && P.wr <= 0) { b.visual.rotation.z = 0; next('out'); }
    return o;
  }
  if (P.phase === 'out') {
    b.visual.rotation.z = 0;
    if (!P.land) P.land = new THREE.Vector3(P.spot[0], 0.015, P.spot[1]);
    if (hop(b, P, P.from, P.land, 0.8, 0.06, dt)) next('shake');
    return o;
  }
  if (P.phase === 'shake') {                         // a big shake: the dust flies off her
    o.ruffle = Math.sin(Math.min(1, P.t / 0.9) * Math.PI);
    if (P.t > 0.15 && !P.shook) { P.shook = true; for (let k = 0; k < 6; k++) dustPuff(b, 0.16, 0.12); }
    if (P.t > 1.0) endPlay(b);
  }
  return o;
}

function cabbageStep(b, P, T, Q, o, next, dt) {
  const C = T.cabbage;
  b.turnTo(Math.PI, dt);
  P.pk += dt; const u = P.pk % 0.7;
  o.peck = u > 0.3 && u < 0.55 ? 0.62 : 0.15;
  if (u > 0.42 && !P.hit) {                          // her beak meets it: away it swings, round it spins
    P.hit = true; C.vx += 1.3 + b.r() * 0.6; C.vz += (b.r() - 0.5) * 0.8; C.vs += (b.r() < 0.5 ? -1 : 1) * (2.5 + b.r() * 2.5);
  }
  if (u < 0.3) P.hit = false;
  P.left -= dt;
  if (P.left <= 0 && u < 0.3) endPlay(b);
  return o;
}

function ladderStep(b, P, T, Q, o, next, dt) {
  const p = b.root.position, per = Q.perches;
  if (P.phase === 'climb') {                         // perch by perch: a hop, a look round, the next
    if (P.rest > 0) {
      P.rest -= dt; P.t = 0; P.from = p.clone(); o.sit = 0.3;
      if (P.step >= per.length) { if (P.rest <= 0) next('top', { left: 5 + b.r() * 5, crowed: false }); }
      return o;
    }
    if (P.step >= per.length) { P.rest = 0.5; return o; }
    const q = per[P.step], to = new THREE.Vector3(Q.at[0] + (P.spot[0] - Q.at[0]) * 0.5, q[1] + 0.02, Q.at[1] + q[0]);
    o.flap = P.step === per.length - 1 && P.t > 0.25 && P.t < 0.7 ? 0.7 : 0;
    b.shadowY = 0.0;
    if (hop(b, P, P.from, to, 0.85, 0.05, dt)) { P.step++; P.rest = 0.6 + b.r() * 0.9; b.shadowY = 0.0; }
    return o;
  }
  if (P.phase === 'top') {                           // up top: a look round (the rooster crows from up there)
    b.shadowY = 0.0; o.sit = 0.25;
    if (P.t < 1.2) { const r = b.turnTo(0, dt * 0.6); o.walking = r.walking; }
    if (b.kind === 'rooster' && P.t > 1.5 && P.t < 3.5) { const t = P.t - 1.5; o.flap = t < 0.45 ? Math.sin(t / 0.45 * Math.PI) : 0; o.crow = t < 0.45 ? 0 : Math.min(1, (t - 0.45) / 0.25) * Math.min(1, (3.5 - P.t) / 0.3); }
    P.left -= dt;
    if (P.left <= 0) next('down');
    return o;
  }
  if (P.phase === 'down') {                          // a flutter down to the front
    if (!P.land) { const s = b.r() < 0.5 ? -1 : 1; P.land = new THREE.Vector3(Q.at[0] + s * 0.18, 0.015, Q.at[1] + 0.5); if (!b.free(P.land.x, P.land.z)) P.land.set(P.spot[0], 0.015, P.spot[1]); }
    if (P.t < 0.4) b.turnTo(Math.atan2(P.land.x - p.x, P.land.z - p.z), dt * 1.5);
    o.flap = P.t > 0.2 && P.t < 0.85 ? 1 : 0;
    if (hop(b, P, P.from, P.land, 1.0, 0.04, dt)) endPlay(b);
  }
  return o;
}

// the frozen puddle (the winter theme; Audrey, 13 Nov 2026: "I also want these coops to have new toys and the chickens need to
// interact with the toys that's funny"): a few quick steps onto it and away she slides to the other end, low, wings out for
// balance, wobbling (now and then she turns right round on the way); a spray of snow where she stops, a shake; often back
// again the other way
function iceStep(b, P, T, o, next, dt) {
  const p = b.root.position;
  if (P.phase === 'slide') {
    const D = 1.55, u = Math.min(1, P.t / D), a = 1 - (1 - u) * (1 - u);
    p.x = P.from.x + (P.to[0] - P.from.x) * a; p.z = P.from.z + (P.to[1] - P.from.z) * a; p.y = 0.015;
    o.walking = u < 0.16; o.sit = 0.35 * smooth01(u / 0.25); o.flap = u > 0.12 && u < 0.8 ? 0.55 : 0;
    b.visual.rotation.z = 0.2 * Math.sin(P.t * 13) * (1 - u);
    if (P.spin) b.root.rotation.y = P.face + P.spin * 2 * Math.PI * smooth01((u - 0.15) / 0.75);
    if (u >= 1) { b.visual.rotation.z = 0; b.root.rotation.y = P.face; for (let k = 0; k < 5; k++) dustPuff(b, 0.1, 0.07);
      const back = P.spot; P.spot = P.to; P.to = back; next('shake', { goes: P.goes + 1 }); }
    return o;
  }
  if (P.phase === 'shake') {                         // a happy shake; then again, the other way (three goes at most)
    o.ruffle = Math.sin(Math.min(1, P.t / 0.7) * Math.PI);
    if (P.t > 0.9) { if (P.leaving || P.goes >= 3 || b.r() < 0.35 || !b.free(P.to[0], P.to[1])) endPlay(b); else { P.face += Math.PI; next('face'); } }
  }
  return o;
}

// the Gingerbread garden's own (Audrey, 13 Nov 2026: "Can you try to find some uniqueness in the toys for the breeds?"; her
// choices for the Buff Orpingtons: "Peppermint roundabout", "Gumdrop trampoline", "Hot chocolate mug"):
// the roundabout: a hop onto the peppermint, down low; round it goes, faster, she leans out; it slows, she hops off, dizzy
// (swaying, stars round her head), a shake
const SEAT = 0.17, SPIN_Y = 0.065;
function spinStep(b, P, T, o, next, dt) {
  const p = b.root.position, R = T.spin, th = R.a + P.off, seat = () => tmpV.set(R.at[0] + Math.sin(th) * SEAT, SPIN_Y, R.at[1] + Math.cos(th) * SEAT);
  if (P.phase === 'on') { o.flap = P.t > 0.25 && P.t < 0.6 ? 0.6 : 0; if (hop(b, P, P.from, seat().clone(), 0.75, 0.08, dt)) next('ride', { ride: 6 + b.r() * 3 }); return o; }
  if (P.phase === 'ride' || P.phase === 'slow') {
    seat(); p.copy(tmpV); b.shadowY = SPIN_Y - 0.005; o.sit = 0.6; b.root.rotation.y = th + Math.PI / 2; b.visual.rotation.z = -0.07 * R.w;
    if (P.phase === 'ride' && P.t > P.ride) next('slow');
    if (P.phase === 'slow' && (R.w < 0.5 || P.t > 4)) { b.visual.rotation.z = 0; next('off'); }
    return o;
  }
  if (P.phase === 'off') {
    if (!P.land) P.land = new THREE.Vector3(P.spot[0], 0.015, P.spot[1]);
    o.flap = P.t > 0.2 && P.t < 0.6 ? 0.6 : 0;
    if (hop(b, P, P.from, P.land, 0.8, 0.06, dt)) next('dizzy', { yaw: b.root.rotation.y });
    return o;
  }
  if (P.phase === 'dizzy') {                         // the world's still turning: she sways, stars round her head
    const k = Math.max(0, 1 - P.t / 2.2); b.visual.rotation.z = 0.24 * Math.sin(P.t * 6.5) * k; b.root.rotation.y = P.yaw + 0.5 * Math.sin(P.t * 3.1) * k;
    P.star = (P.star || 0) - dt; if (P.star <= 0 && k > 0.2) { P.star = 0.28; note(b, new THREE.Vector3(p.x + Math.sin(P.t * 5) * 0.09, 0.42, p.z + Math.cos(P.t * 5) * 0.09), '#ffc93c', '✦'); }
    if (P.t > 2.2) { b.visual.rotation.z = 0; next('shake'); }
    return o;
  }
  if (P.phase === 'shake') { o.ruffle = Math.sin(Math.min(1, P.t / 0.7) * Math.PI); if (P.t > 0.85) endPlay(b); }
  return o;
}
// the gumdrop: a flutter up onto it, and she bounces, higher each time, wings going, the gumdrop squashing under her, a
// little turn in the air; a last big one, and down beside it
const GUM_TOP = 0.27, BOUNCE_T = 0.66;
function bounceStep(b, P, T, o, next, dt) {
  const p = b.root.position, B = T.bounce;
  if (P.phase === 'up') { o.flap = P.t > 0.2 && P.t < 0.7 ? 1 : 0; if (hop(b, P, P.from, tmpV.set(B.at[0], GUM_TOP, B.at[1]).clone(), 0.85, 0.12, dt)) next('bounce', { left: 5 + Math.floor(b.r() * 4), n: 0, yaw: b.root.rotation.y }); return o; }
  if (P.phase === 'bounce') {
    const u = (P.t % BOUNCE_T) / BOUNCE_T, n = Math.floor(P.t / BOUNCE_T), high = Math.min(0.34, 0.14 + n * 0.05), touch = u < 0.14 || u > 0.86;
    if (touch) B.want = 0.72;
    p.set(B.at[0], GUM_TOP * B.sq + high * 4 * u * (1 - u), B.at[1]); b.shadowY = 0.0;
    o.flap = touch ? 0 : 0.9; o.sit = touch ? 0.5 : 0; b.root.rotation.y = P.yaw + (n + smooth01((u - 0.15) / 0.7)) * 0.9;
    if (n >= P.left && u < 0.1) next('down');
    return o;
  }
  if (P.phase === 'down') {
    if (!P.land) P.land = new THREE.Vector3(P.spot[0], 0.015, P.spot[1]);
    o.flap = P.t > 0.15 && P.t < 0.75 ? 1 : 0;
    if (hop(b, P, P.from, P.land, 0.9, 0.22, dt)) next('shake');
    return o;
  }
  if (P.phase === 'shake') { o.ruffle = Math.sin(Math.min(1, P.t / 0.7) * Math.PI); if (P.t > 0.85) endPlay(b); }
  return o;
}

// the igloo (the winter garden; Audrey's choice for the parasol's place, 13 Nov 2026: "An igloo": "a little igloo the hens walk
// into and peek out of"): in at its door, a moment out of sight inside while she turns round, then her head out of the
// door, a look left and right; out she comes, a shake, snow flying
function iglooStep(b, P, T, o, next, dt) {
  const p = b.root.position, I = T.igloo, lerp = (A, B, u) => { p.x = A[0] + (B[0] - A[0]) * u; p.z = A[1] + (B[1] - A[1]) * u; p.y = 0.015; };
  if (P.phase === 'in') { const u = Math.min(1, P.t / 1.1); lerp(I.spot, I.at, smooth01(u)); if (u > 0.5) b.root.visible = false;      /* (through its door: out of sight) */ o.walking = true; o.sit = 0.5 * u; if (u >= 1) next('inside', { stay: 1.0 + b.r() * 1.2 }); return o; }
  if (P.phase === 'inside') {                        // (out of sight: she turns round)
    p.set(I.at[0], 0.015, I.at[1]); o.sit = 0.5; b.root.rotation.y = I.face + Math.PI * smooth01(P.t / 0.8); b.root.visible = false;      // (right inside: not drawn, so nothing of her shows through its wall)
    if (P.t > P.stay) { b.root.rotation.y = I.face + Math.PI; b.root.visible = true; next('peek', { look: 2.2 + b.r() * 1.8 }); }
    return o;
  }
  if (P.phase === 'peek') {                          // her head out of the door, a look one way, the other
    const u = smooth01(P.t / 0.5); lerp(I.at, I.door, u); o.sit = 0.5; o.up = 0.25 * u;
    b.root.rotation.y = I.face + Math.PI + 0.45 * Math.sin(Math.max(0, P.t - 0.6) * 2.6) * Math.min(1, (P.look - P.t) / 0.3);
    if (P.t > P.look) { b.root.rotation.y = I.face + Math.PI; next('out'); }
    return o;
  }
  if (P.phase === 'out') {
    const from = [P.from.x, P.from.z], u = Math.min(1, P.t / 0.8); lerp(from, I.spot, smooth01(u)); o.walking = true; o.sit = 0.5 * (1 - u);
    b.root.rotation.y = I.face + Math.PI;
    if (u >= 1) next('shake');
    return o;
  }
  if (P.phase === 'shake') {
    o.ruffle = Math.sin(Math.min(1, P.t / 0.8) * Math.PI);
    if (P.t > 0.15 && !P.shook) { P.shook = true; for (let k = 0; k < 5; k++) dustPuff(b, 0.14, 0.1); }
    if (P.t > 0.95) endPlay(b);
  }
  return o;
}

// ---- winter in a pen (the winter theme; Audrey: "the snow ones can have snow on the floor and they leave foot print in"):
// the frozen puddle in the middle of the yard, and the birds' footprints in the snow: one for each step where a bird walks
// on the ground (not on the ice, the ramp, nor in the air), left foot, right foot, small ones for the chicks; they stay
// most of a minute, then the snow closes over them
const SNOW = new THREE.Color('#dde8f4'), PRINT = new THREE.Color('#7f95b8'), PRINTS = 240, P_STAY = 40, P_FADE = 14;
let iceTex = null, printTex = null;
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpC = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
// each breed's winter garden: what's walked round ([x, z, r]), the treat hung in the cabbage's place, where the snow doesn't
// settle (the warm things), and which play things it has
const GARDENS = {
  rir: { blocks: [[1.9, 2.65, 0.52]], treat: 'seedball', warm: null, igloo: true, ice: true },
  orp: { blocks: [[-0.3, 2.3, 0.35], [1.9, 1.3, 0.3]], treat: 'doughnut', warm: [[1.6, 0.25, 0.62], [-1.35, 2.45, 0.5]], spin: [-0.3, 2.3], bounce: [1.9, 1.3], mallows: true },
};
const NO_GARDEN = { blocks: [], treat: null, warm: null, ice: true };
export function winterGarden(k) { return GARDENS[k] || NO_GARDEN; }
export function addWinter(plot, garden = null, part = null) {
  const T = plot.toys; if (!T || T.prints) return;
  const G = winterGarden(garden); T.garden = G;
  const hang = (name, at) => { const m = part(name); m.position.set(at[0], 0, at[1]); m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } c.userData.moves = true; }); plot.frame.add(m); return m; };
  if (G.spin && part) { T.spin = { at: G.spin, r: 0.33, a: 0, w: 0, by: null, next: 0, mesh: hang('roundabout', G.spin) }; T.spin.mesh.scale.setScalar(0.83); }      // (a little smaller than modelled: clear of the gate, the feeder and the trough)
  if (G.bounce && part) T.bounce = { at: G.bounce, sq: 1, want: 1, by: null, next: 0, mesh: hang('gumdrop', G.bounce) };
  if (G.igloo) {                                      // (the winter garden's igloo: stylized/coops.py IGLOO; its door looks to the yard's middle)
    const at = [1.9, 2.65], R = 0.5, d = [-Math.SQRT1_2, -Math.SQRT1_2];
    T.igloo = { at, r: R, by: null, next: 0, spot: [at[0] + d[0] * (R + 0.3), at[1] + d[1] * (R + 0.3)], door: [at[0] + d[0] * (R - 0.1), at[1] + d[1] * (R - 0.1)], face: Math.atan2(-d[0], -d[1]) };
  }
  if (!iceTex) iceTex = fxTex(128, c => {
    const g = c.createRadialGradient(64, 64, 6, 64, 64, 62); g.addColorStop(0, '#c9e9f6'); g.addColorStop(0.6, '#a5d6ee'); g.addColorStop(0.9, '#83c1e2'); g.addColorStop(0.97, '#d8eef8'); g.addColorStop(1, '#f4f8fd');
    c.fillStyle = g; c.beginPath(); c.arc(64, 64, 63, 0, 6.3); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.8; c.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[28, 50, 78, 44], [40, 78, 96, 70], [52, 30, 70, 34], [30, 66, 50, 62], [74, 56, 100, 52], [58, 92, 82, 88]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  });
  if (G.ice) {
  const I = T.ice = { at: [0.1, 2.0], hw: 0.58, hd: 0.34, by: null, next: 0 };
  const ig = new THREE.CircleGeometry(1, 40); ig.rotateX(-Math.PI / 2);
  I.mesh = new THREE.Mesh(ig, new THREE.MeshStandardMaterial({ map: iceTex, transparent: true, roughness: 0.18, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  I.mesh.scale.set(I.hw, 1, I.hd); I.mesh.position.set(I.at[0], 0.012, I.at[1]); I.mesh.receiveShadow = true; I.mesh.renderOrder = 1; I.mesh.userData.moves = true; plot.frame.add(I.mesh);
  }
  if (!printTex) printTex = fxTex(64, c => {         // a hen's foot: three toes forward, a short one back
    c.strokeStyle = '#fff'; c.lineWidth = 7; c.lineCap = 'round';
    for (const [x, y] of [[32, 6], [12, 16], [52, 16], [32, 58]]) { c.beginPath(); c.moveTo(32, 40); c.lineTo(x, y); c.stroke(); }
  });
  const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
  const pm = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ map: printTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), PRINTS);
  tmpM.makeScale(0, 0, 0); for (let i = 0; i < PRINTS; i++) { pm.setMatrixAt(i, tmpM); pm.setColorAt(i, PRINT); }
  pm.frustumCulled = false; pm.receiveShadow = true; pm.renderOrder = 1; pm.userData.moves = true; plot.frame.add(pm);
  T.prints = { mesh: pm, n: 0, age: new Float32Array(PRINTS).fill(-1), at: new Map(), live: 0 };
}
export function removeWinter(plot) {
  const T = plot.toys; if (!T) return;
  if (T.ice) { T.ice.mesh.removeFromParent(); T.ice.mesh.geometry.dispose(); T.ice.mesh.material.dispose(); T.ice = null; }
  T.igloo = null;
  for (const k of ['spin', 'bounce']) if (T[k]) { T[k].mesh.removeFromParent(); T[k] = null; }
  if (T.prints) { T.prints.mesh.removeFromParent(); T.prints.mesh.geometry.dispose(); T.prints.mesh.material.dispose(); T.prints = null; }
}
export function printsLive(plot) { return plot.toys && plot.toys.prints ? plot.toys.prints.live : 0; }
function tickPrints(plot, dt) {
  const T = plot.toys, R = T.prints, I = T.ice, Y = plot.pen && plot.pen.yard;
  let moved = false, tinted = false;
  for (const b of plot.birds) {
    const p = b.root.position; let s = R.at.get(b);
    if (!s) { s = { x: p.x, z: p.z, side: 1 }; R.at.set(b, s); }
    const onIce = I && ((p.x - I.at[0]) / I.hw) ** 2 + ((p.z - I.at[1]) / I.hd) ** 2 < 1;
    const G = T.igloo, inIgloo = (G && Math.hypot(p.x - G.at[0], p.z - G.at[1]) < G.r + 0.05) || (T.spin && Math.hypot(p.x - T.spin.at[0], p.z - T.spin.at[1]) < T.spin.r) || !!(b.play && (b.play.kind === 'spin' || b.play.kind === 'bounce') && b.play.phase !== 'walk' && b.play.phase !== 'face');
    const out = b.asleep || !b.root.visible || p.y > 0.05 || onIce || inIgloo || (b.play && b.play.phase === 'slide') || (Y && (p.z < Y.min[2] - 0.05 || p.x < Y.min[0] - 0.1 || p.x > Y.max[0] + 0.1));
    if (out) { s.x = p.x; s.z = p.z; continue; }
    const k = b.kind === 'chick' ? 0.5 : b.kind === 'rooster' ? 1.12 : 1, dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz);
    if (d < 0.085 * k) continue;
    if (d < 0.5) {                                   // (a step, not a jump from somewhere else)
      const a = Math.atan2(dx, dz), i = R.n; R.n = (R.n + 1) % PRINTS;
      tmpP.set(p.x + Math.cos(a) * 0.028 * k * s.side, 0.014, p.z - Math.sin(a) * 0.028 * k * s.side);
      tmpQ.setFromAxisAngle(UP, a + Math.PI + s.side * 0.12); tmpS.setScalar(0.085 * k);
      R.mesh.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS)); R.mesh.setColorAt(i, PRINT); R.age[i] = 0; moved = tinted = true; s.side = -s.side;
    }
    s.x = p.x; s.z = p.z;
  }
  let live = 0;
  for (let i = 0; i < PRINTS; i++) {
    if (R.age[i] < 0) continue;
    R.age[i] += dt; live++;
    if (R.age[i] > P_STAY + P_FADE) { R.age[i] = -1; live--; R.mesh.setMatrixAt(i, tmpM.makeScale(0, 0, 0)); moved = true; }
    else if (R.age[i] > P_STAY) { R.mesh.setColorAt(i, tmpC.copy(PRINT).lerp(SNOW, (R.age[i] - P_STAY) / P_FADE)); tinted = true; }
  }
  R.live = live;
  if (moved) R.mesh.instanceMatrix.needsUpdate = true;
  if (tinted && R.mesh.instanceColor) R.mesh.instanceColor.needsUpdate = true;
  if (R.at.size > plot.birds.length + 4) for (const b of R.at.keys()) if (!plot.birds.includes(b)) R.at.delete(b);
}

const XYLO = ['#e2453c', '#ff8c42', '#f4c430', '#5bb04a', '#3d7fd1', '#9b6bd1'];
function xyloStep(b, P, T, Q, o, next, dt) {
  b.turnTo(-Math.PI / 2, dt);
  P.pk += dt; const u = P.pk % 0.55;
  o.peck = u > 0.22 && u < 0.42 ? 0.9 : 0.2;
  if (u > 0.34 && !P.hit) {                          // a note from the bar under her beak
    P.hit = true;
    const p = b.root.position, k = Math.max(0, Math.min(5, Q.bars.reduce((bi, z, i) => Math.abs(Q.at[1] + z - p.z) < Math.abs(Q.at[1] + Q.bars[bi] - p.z) ? i : bi, 0) + Math.round((b.r() - 0.5) * 2.2)));
    note(b, new THREE.Vector3(Q.at[0] + 0.02, 0.16, Q.at[1] + Q.bars[k]), XYLO[k]);
  }
  if (u < 0.22) P.hit = false;
  P.left -= dt;
  if (P.left <= 0 && u < 0.22) endPlay(b);
  return o;
}

// ---- the effects: little puffs of sand, notes floating up
let dustMat = null, snowMat = null, mallowMat = null; const noteMats = {};
function fx(mat, at, life, size, grow, drift) {
  if (!SCENE) return;
  let n = FX.find(x => x.life <= 0 && x.mat === mat);
  if (!n) { if (FX.length > 60) return; n = { sprite: new THREE.Sprite(mat.clone()), mat, life: 0 }; n.sprite.renderOrder = 3; SCENE.add(n.sprite); FX.push(n); }
  n.sprite.position.copy(at); n.size = size; n.grow = grow; n.life = n.full = life; n.drift = drift; n.sprite.visible = true; n.sprite.scale.setScalar(size);
}
function dustPuff(b, spread, size) {
  if (!dustMat) {
    dustMat = new THREE.SpriteMaterial({ map: fxTex(64, c => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(232,212,165,0.85)'); g.addColorStop(1, 'rgba(232,212,165,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false });
    dustMat.userData.noGrade = true;
  }
  let mat = dustMat, mallow = false;
  if (b.plot.theme === 'winter') {                   // (in the snow: it's snow that flies)
    if (!snowMat) { snowMat = new THREE.SpriteMaterial({ map: fxTex(64, c => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(240,247,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false }); snowMat.userData.noGrade = true; }
    mat = snowMat;
    if (b.plot.toys && b.plot.toys.garden && b.plot.toys.garden.mallows && b.play && b.play.kind === 'dust') {      // (in the mug of hot chocolate: marshmallows fly)
      if (!mallowMat) { mallowMat = new THREE.SpriteMaterial({ map: fxTex(64, c => { c.fillStyle = '#fffaf4'; c.strokeStyle = '#f3b6cb'; c.lineWidth = 4; c.beginPath(); c.roundRect ? c.roundRect(14, 16, 36, 32, 11) : c.rect(14, 16, 36, 32); c.fill(); c.stroke(); }), transparent: true, depthWrite: false }); mallowMat.userData.noGrade = true; }
      mat = mallowMat; mallow = true;
    }
  }
  const w = b.root.getWorldPosition(new THREE.Vector3()), a = Math.random() * 6.28, d = Math.random() * spread;
  w.x += Math.cos(a) * d; w.z += Math.sin(a) * d; w.y += 0.05 + Math.random() * 0.05;
  if (mallow) { fx(mat, w, 0.9 + Math.random() * 0.4, 0.07, 0.15, [Math.cos(a) * 0.35, 0.55 + Math.random() * 0.3, Math.sin(a) * 0.35]); return; }
  fx(mat, w, 1.0 + Math.random() * 0.5, size + Math.random() * 0.04, 2.2, [Math.cos(a) * 0.08, 0.1 + Math.random() * 0.08, Math.sin(a) * 0.08]);
}
function note(b, local, col, glyph = '♪') {       // (a note floating up from a bar; a star round a dizzy head)
  const key = col + glyph;
  if (!noteMats[key]) {
    noteMats[key] = new THREE.SpriteMaterial({ map: fxTex(64, c => { c.font = 'bold 56px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#fffaf0'; c.strokeText(glyph, 32, 34); c.fillStyle = col; c.fillText(glyph, 32, 34); }), transparent: true, depthWrite: false });
    noteMats[key].userData.noGrade = true;
  }
  const w = local.clone(); b.plot.frame.localToWorld(w);
  if (glyph === '♪') fx(noteMats[key], w, 1.6, 0.15, 0.25, [(Math.random() - 0.5) * 0.1, 0.32, (Math.random() - 0.5) * 0.1]);
  else fx(noteMats[key], w, 0.8, 0.09, 0.2, [0, 0.1, 0]);
}
export function tickPlayFx(dt) {
  for (const n of FX) {
    if (n.life <= 0) continue;
    n.life -= dt; if (n.life <= 0) { n.sprite.visible = false; continue; }
    const t = 1 - n.life / n.full;
    n.sprite.position.x += n.drift[0] * dt; n.sprite.position.y += n.drift[1] * dt; n.sprite.position.z += n.drift[2] * dt;
    const s = n.size * (1 + n.grow * t) * Math.min(1, t * 8); n.sprite.scale.set(s, s, s); n.sprite.material.opacity = Math.min(1, (1 - t) * 2);
  }
}
export function playFxLive() { return FX.filter(n => n.life > 0).length; }

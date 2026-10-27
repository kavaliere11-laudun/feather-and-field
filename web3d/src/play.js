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
// Nothing is saved: it's just their day. A bird at play is busy (nobody calls her away; the farmer coming into the pen, or
// bedtime, ends it).
import * as THREE from 'three';

const smooth01 = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
let SCENE = null, fxTex = null;
const FX = [];
export function initPlay(o) { SCENE = o.scene; fxTex = o.fxTexture64; }

// the moving parts (the swing's perch, the cabbage) hung in the plot's frame; the toys' state on plot.toys
export function addToys(plot, P, part) {
  const T = plot.toys = { P, clock: 0, dust: { by: null, next: 0 }, ladder: P.ladder ? { by: null, next: 0 } : null, xylo: P.xylo ? { by: null, next: 0 } : null };
  const hang = (name, x, y, z) => {
    const m = part(name); m.position.set(x, y, z);
    m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } c.userData.moves = true; });
    plot.frame.add(m); return m;
  };
  const S = P.swing, C = P.cabbage;
  T.swing = { mesh: hang('swing_seat', S.at[0], S.top, S.at[1]), a: 0, v: 0, by: null, next: 0, L: S.top - S.perch };
  T.cabbage = { mesh: hang('cabbage', C.at[0], C.top, C.at[1]), ax: 0, vx: 0, az: 0, vz: 0, spin: 0, vs: 0, by: null, next: 0 };
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
}

// a free play thing for her now and then (none for chicks, nor by night, nor while the farmer's in the pen)
export function wantPlay(b) {
  const T = b.plot.toys;
  if (!T || b.kind === 'chick' || b.mum || b.plot.farmer || b.cuddle || b.called || b.laying || b.stay || b.nightNow(0.6)) return null;
  if (b.r() > (b.kind === 'rooster' ? 0.035 : 0.06)) return null;
  const free = ['swing', 'dust', 'cabbage', 'ladder', 'xylo'].filter(k => T[k] && !T[k].by && T[k].next <= T.clock && !(k === 'xylo' && b.kind === 'rooster'));
  return free.length ? free[Math.floor(b.r() * free.length)] : null;
}

// off to play: where she goes first (the pen's frame), and which way she'll face there
export function startPlay(b, kind) {
  const T = b.plot.toys, P = T.P, p = b.root.position;
  let spot, face;
  if (kind === 'swing') { spot = [P.swing.at[0] + (b.r() - 0.5) * 0.08, P.swing.at[1] + 0.46]; face = Math.PI; }
  else if (kind === 'dust') {                         // from the side she's on, just outside the tub
    const D = P.dust.at, a = Math.atan2(p.x - D[0], p.z - D[1]);
    let best = null;
    for (const da of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6, Math.PI]) { const q = [D[0] + Math.sin(a + da) * 0.42, D[1] + Math.cos(a + da) * 0.42]; if (b.free(q[0], q[1])) { best = q; break; } }
    if (!best) return false;
    spot = best; face = Math.atan2(D[0] - spot[0], D[1] - spot[1]);
  } else if (kind === 'cabbage') { spot = [P.cabbage.at[0], P.cabbage.at[1] + 0.2]; face = Math.PI; }
  else if (kind === 'ladder') { spot = [P.ladder.at[0] + (b.r() - 0.5) * 0.12, P.ladder.at[1] + 0.44]; face = Math.PI; }
  else { spot = [P.xylo.at[0] + 0.25, P.xylo.at[1] + (b.r() - 0.5) * 0.08]; face = -Math.PI / 2; }
  if (!b.free(spot[0], spot[1])) return false;
  let route = b.plan([spot]);
  if (!route.length || route[route.length - 1] !== spot) {         // no straight way: by the middle of the yard
    const Y = b.plot.pen && b.plot.pen.yard, mid = Y && [(Y.min[0] + Y.max[0]) / 2, (Y.min[2] + Y.max[2]) / 2];
    for (const m of mid ? [mid, [mid[0], mid[1] + 0.4], [mid[0] - 0.5, mid[1]], [mid[0] + 0.5, mid[1]]] : []) {
      if (!b.free(m[0], m[1])) continue;
      route = b.plan([m, spot]); if (route.length && route[route.length - 1] === spot) break;
    }
    if (!route.length || route[route.length - 1] !== spot) return false;
  }
  T[kind].by = b;
  b.play = { kind, phase: 'walk', t: 0, all: 0, route, spot, face, stuck: 0 };
  b.act = null; b.route = null; b.then = null; b.wait = 0; b.eatAt = null;
  return true;
}

// done (or called away): back on the ground, the play thing free again after a little while
export function endPlay(b, early = false) {
  const P = b.play; if (!P) return;
  const T = b.plot.toys, toy = T && T[P.kind];
  if (toy && toy.by === b) { toy.by = null; toy.next = T.clock + 6 + b.r() * 10; }
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
  const P = b.play, T = b.plot.toys, Q = T.P, p = b.root.position, o = { walking: false };
  P.t += dt; P.all += dt;
  const next = (ph, extra) => { P.phase = ph; P.t = 0; P.from = p.clone(); Object.assign(P, extra || {}); };
  if (P.phase !== 'walk' && b.plot.farmer && !P.leaving) {          // the farmer's here: down and off (the next step ends it)
    P.leaving = true;
    if (P.kind === 'swing' && (P.phase === 'turn' || P.phase === 'ride')) next('down');
    else if (P.kind === 'ladder' && P.phase !== 'down' && P.phase !== 'walk' && P.phase !== 'face') next('down');
    else if (P.kind === 'dust' && P.phase === 'bathe') next('out');
    else if (P.kind === 'cabbage' || P.kind === 'xylo') { endPlay(b); return o; }
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
      else next('tap', { left: 3.5 + b.r() * 3, pk: 0 });
    }
    return o;
  }
  if (P.kind === 'swing') return swingStep(b, P, T, Q.swing, o, next, dt);
  if (P.kind === 'dust') return dustStep(b, P, T, Q.dust, o, next, dt);
  if (P.kind === 'cabbage') return cabbageStep(b, P, T, Q.cabbage, o, next, dt);
  if (P.kind === 'ladder') return ladderStep(b, P, T, Q.ladder, o, next, dt);
  return xyloStep(b, P, T, Q.xylo, o, next, dt);
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
  const p = b.root.position, c = new THREE.Vector3(Q.at[0], 0.075, Q.at[1]);
  if (P.phase === 'in') {
    if (hop(b, P, P.from, c, 0.75, 0.04, dt)) next('bathe', { left: 8 + b.r() * 5, wr: 0, rest: 0.6 });
    return o;
  }
  if (P.phase === 'bathe') {                         // down low in the sand: bursts of wriggling and kicking, rests between
    p.set(c.x, c.y, c.z); b.shadowY = 0.07; o.sit = 1;
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
    if (hop(b, P, P.from, P.land, 0.75, 0.04, dt)) next('shake');
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
let dustMat = null; const noteMats = {};
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
  const w = b.root.getWorldPosition(new THREE.Vector3()), a = Math.random() * 6.28, d = Math.random() * spread;
  w.x += Math.cos(a) * d; w.z += Math.sin(a) * d; w.y += 0.05 + Math.random() * 0.05;
  fx(dustMat, w, 1.0 + Math.random() * 0.5, size + Math.random() * 0.04, 2.2, [Math.cos(a) * 0.08, 0.1 + Math.random() * 0.08, Math.sin(a) * 0.08]);
}
function note(b, local, col) {
  if (!noteMats[col]) {
    noteMats[col] = new THREE.SpriteMaterial({ map: fxTex(64, c => { c.font = 'bold 56px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#fffaf0'; c.strokeText('♪', 32, 34); c.fillStyle = col; c.fillText('♪', 32, 34); }), transparent: true, depthWrite: false });
    noteMats[col].userData.noGrade = true;
  }
  const w = local.clone(); b.plot.frame.localToWorld(w);
  fx(noteMats[col], w, 1.6, 0.15, 0.25, [(Math.random() - 0.5) * 0.1, 0.32, (Math.random() - 0.5) * 0.1]);
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

/* =====================================================================
   8. ART: pre-rendered map, plot overlays, trees, birds, frogs and grass (made in Blender)
   ===================================================================== */
const DATA = /*DATA*/null;
const GEOM = DATA.geom, SPR = DATA.spr, TREES = DATA.trees, PROPS = DATA.props, OV = DATA.ov, CARDS = new Set(DATA.cards);
const BIRD_UNIT = 50;                 // map pixels per Blender unit: a hen stands about 0.6 m tall, a touch larger than life
const IMG = new Map();
function img(src) {
  let im = IMG.get(src);
  if (!im) { im = new Image(); im.decoding = 'async'; im.src = src; im.onload = () => { dirty = true; }; IMG.set(src, im); }
  return im;
}
const ready = im => im.complete && im.naturalWidth > 0;
function rrect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); }
const kindKey = b => b.breed === 'sil' ? 'sil_' + (SIL[b.colour] ? b.colour : 'white') : b.breed;
function spriteFor(b, pose) {
  const k = kindKey(b);
  if (stage(b) === 'chick') { const n = 'chick_' + k + (pose === 'walk1' || pose === 'walk2' ? '_' + pose : ''); return SPR[n] ? n : SPR['chick_' + k] ? 'chick_' + k : null; }
  const n = pose + '_' + k + '_' + b.sex;
  return SPR[n] ? n : SPR['farm_' + k + '_' + b.sex] ? 'farm_' + k + '_' + b.sex : null;
}
function cardSrc(b) {
  const k = kindKey(b), n = stage(b) === 'chick' ? 'card_chick_' + k : 'card_' + k + '_' + b.sex;
  return CARDS.has(n) ? 'img/b/' + n + '.webp' : '';
}
const kindCard = (k, sex) => CARDS.has('card_' + k + '_' + sex) ? `img/b/card_${k}_${sex}.webp` : '';
const ovSrc = (kind, deg) => `img/ov/ov_${kind}_${deg}.webp`;
const atlas = k => img(`img/atlas/${k}.webp`);
/* draw an atlas sprite with its foot point at (x, y); sx may be negative to face left */
function drawSprite(name, x, y, sx, sy) {
  const s = SPR[name]; if (!s) return false;
  const im = atlas(s.a); if (!ready(im)) return false;
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
  ctx.drawImage(im, s.x, s.y, s.w, s.h, -s.ax, -s.ay, s.w, s.h);
  ctx.restore(); return true;
}

/* map pixels <-> local ground metres of a plot (an affine map, since the camera is orthographic) */
function toMap(f, lx, ly, z = 0) { return [f.c[0] + lx * f.ex[0] + ly * f.ey[0] + z * GEOM.ez[0], f.c[1] + lx * f.ex[1] + ly * f.ey[1] + z * GEOM.ez[1]]; }
function toLocal(f, x, y) {
  const dx = x - f.c[0], dy = y - f.c[1], det = f.ex[0] * f.ey[1] - f.ey[0] * f.ex[1];
  return [(dx * f.ey[1] - dy * f.ey[0]) / det, (f.ex[0] * dy - f.ex[1] * dx) / det];
}
const YARD = { x0: -1.35, x1: 1.35, y0: -1.22, y1: -0.42 };      // trodden earth in front of each coop, in metres
const PASTURE_YARD = { x0: -2.5, x1: 2.4, y0: -1.9, y1: 0.3 };

/* =====================================================================
   9. SCENE: LAYOUT, BEHAVIOUR, DRAWING, TOUCH
   ===================================================================== */
const cv = $('#farm'), ctx = cv.getContext('2d');
const plotCache = new Map(), spriteCache = new Map();
const view = { vw: 0, vh: 0, dpr: 1, s: 1, x: 0, y: 0, minS: .3, maxS: 1.6, init: false };
const agents = new Map();
const ui = { grades: false };
let plots = [], clock = 0, dirty = false, uiDirty = false;

function buildPlots() {
  plots = [];
  const allowed = plotsAllowed(state.level);
  for (let i = 0; i < MAX_PLOTS; i++) {
    const f = GEOM.slots[i], coop = state.coops.find(c => c.plot === i);
    let p;
    if (coop) p = { kind: 'coop', breed: coop.breed, coop };
    else if (i < state.plots) p = { kind: 'empty' };
    else p = { kind: 'sale', next: i === state.plots, locked: i >= allowed, price: plotPrice() };
    p.f = f; p.idx = i; plots.push(p);
  }
  plots.push({ kind: 'pasture', f: GEOM.pasture, idx: -1 });
}
function layout() {
  const r = cv.getBoundingClientRect();
  view.vw = Math.max(1, r.width); view.vh = Math.max(1, r.height); view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(view.vw * view.dpr); cv.height = Math.round(view.vh * view.dpr);
  const [W, H] = GEOM.size;
  view.minS = Math.max(view.vw / W, view.vh / H, .3);
  view.maxS = Math.max(view.minS, 1.6);
  if (!view.init) {             // first look: the farmhouse and the first coops
    view.s = clamp(view.vw / 800, view.minS, 1.1);
    view.x = W / 2 - view.vw / view.s / 2; view.y = 10;
    view.init = true;
  }
  view.s = clamp(view.s, view.minS, view.maxS);
  buildPlots(); clampCam();
}
function clampCam() {
  const [W, H] = GEOM.size;
  view.x = clamp(view.x, 0, Math.max(0, W - view.vw / view.s));
  view.y = clamp(view.y, 0, Math.max(0, H - view.vh / view.s));
}
function zoomAt(sx, sy, ns) {
  ns = clamp(ns, view.minS, view.maxS);
  const wx = view.x + sx / view.s, wy = view.y + sy / view.s;
  view.s = ns; view.x = wx - sx / ns; view.y = wy - sy / ns; clampCam();
}
function plotOfBird(b) { if (b.home === 'pasture') return plots[plots.length - 1]; return plots.find(p => p.kind === 'coop' && p.coop.id === b.home); }
const yardOf = p => p.kind === 'pasture' ? PASTURE_YARD : YARD;

/* ---------- chickens: short stop-and-go walks, pecking bouts, chatting, dust baths ---------- */
function resetAgent(b) { agents.delete(b.id); }
function agentFor(b) {
  let a = agents.get(b.id); const p = plotOfBird(b); if (!p) return null;
  const key = p.kind === 'pasture' ? 'pasture' : 'coop' + p.coop.id;
  if (a && a.key === key) { a.plot = p; return a; }
  const y = yardOf(p), face = Math.random() < .5 ? 1 : -1;
  a = { key, plot: p, x: lerp(y.x0, y.x1, Math.random()), y: lerp(y.y0, y.y1, Math.random()), tx: 0, ty: 0, st: 'idle', t: Math.random() * 2,
        face, fx: face, dist: 0, go: 0, head: 0, headT: 0, pose: 'farm', prev: null, fade: 0, say: 0, sayText: '', sx: null, sy: null };
  agents.set(b.id, a);
  return a;
}
function decide(b, a, others) {
  const y = yardOf(a.plot), st = stage(b), r = Math.random(), old = st === 'retired';
  a.st = 'idle'; a.t = .8 + Math.random() * 2.2; a.chatWith = null;
  if (st === 'chick') {
    const mom = others.find(o => o.b.sex === 'h' && isGrown(o.b) && (b.dam && o.b.name === b.dam.name)) || others.find(o => o.b.sex === 'h' && isGrown(o.b));
    if (mom && r < .6) { a.st = 'follow'; a.leader = mom.a; a.t = 2 + Math.random() * 3; a.off = [(Math.random() - .5) * .3, -.1 - Math.random() * .15]; return; }
  }
  if (r < .34) {           // a short walk: chickens potter a step or two, then stop
    const ang = Math.random() * Math.PI * 2, d = .2 + Math.random() * (old ? .4 : .7);
    a.st = 'walk'; a.tx = clamp(a.x + Math.cos(ang) * d, y.x0, y.x1); a.ty = clamp(a.y + Math.sin(ang) * d * .6, y.y0, y.y1); a.go = 0; a.t = 8;
  }
  else if (r < .64) { a.st = 'peck'; a.t = 2 + Math.random() * 3.5; a.head = 0; a.headT = .2 + Math.random() * .5; }
  else if (r < .74 && others.length) {
    const o = pick(others); if (o.a.st === 'idle' || o.a.st === 'peck') { a.st = 'walk'; a.tx = clamp(o.a.x - .3 * Math.sign(o.a.x - a.x || 1), y.x0, y.x1); a.ty = clamp(o.a.y + (Math.random() - .5) * .08, y.y0, y.y1); a.chatWith = o.a; a.go = 0; a.t = 10; }
  }
  else if (r < .8 && b.sex === 'h' && st !== 'chick' && !old) { a.st = 'dust'; a.t = 4 + Math.random() * 4; }
  else if (r < .84 && b.sex === 'r' && st !== 'chick') { a.st = 'crow'; a.t = 2; a.say = 2; a.sayText = t('crow'); }
  else if (r < .92) { a.face = -a.face; a.t = .6 + Math.random() * 1.4; }    // looks the other way
}
function screenDx(p, dx, dy) { return dx * p.f.ex[0] + dy * p.f.ey[0]; }
function updateAgents(dt) {
  const byPlot = new Map();
  for (const b of state.birds) { const a = agentFor(b); if (!a) continue; a.b = b; if (!byPlot.has(a.plot)) byPlot.set(a.plot, []); byPlot.get(a.plot).push({ b, a }); }
  for (const [p, list] of byPlot) {
    const y = yardOf(p);
    for (const { b, a } of list) {
      const st = stage(b), chick = st === 'chick', slow = st === 'retired' ? .7 : 1;
      const spd = (chick ? .3 : b.breed === 'sil' ? .17 : .22) * slow;   // metres per second
      a.t -= dt; if (a.say > 0) a.say -= dt; if (a.fade > 0) a.fade -= dt;
      let pose = 'farm';
      if (a.st === 'walk' || a.st === 'follow') {
        if (a.st === 'follow' && a.leader) { a.tx = clamp(a.leader.x + a.off[0], y.x0, y.x1); a.ty = clamp(a.leader.y + a.off[1], y.y0, y.y1); }
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d > .015) {
          const ease = clamp(Math.min(a.go + .05, d) / .12, .35, 1);            // speed up and slow down gently
          const s = Math.min(d, spd * ease * dt); a.x += dx / d * s; a.y += dy / d * s; a.go += s; a.dist += s;
          const sdx = screenDx(p, dx, dy); if (Math.abs(sdx) > 2) a.face = sdx > 0 ? 1 : -1;
          const step = chick ? .028 : .045, ph = Math.floor(a.dist / step) % 4;
          pose = ph === 0 ? 'walk1' : ph === 2 ? 'walk2' : 'farm';
        } else if (a.st === 'walk') {
          if (a.chatWith) {
            const sdx = screenDx(p, a.chatWith.x - a.x, a.chatWith.y - a.y);
            a.face = Math.sign(sdx) || 1; a.chatWith.face = -a.face; a.st = 'chat'; a.t = 1.2 + Math.random() * 1.5;
            if (Math.random() < .45) { a.say = 1.2; a.sayText = t('cluck'); }
          } else { a.st = 'idle'; a.t = .4 + Math.random() * 1.2; }
        }
        if (a.st === 'follow' && a.t <= 0) a.st = 'idle';
      } else if (a.st === 'peck') {
        a.headT -= dt;
        if (a.headT <= 0) { a.head = 1 - a.head; a.headT = a.head ? .25 + Math.random() * .35 : .35 + Math.random() * .9; if (!a.head && Math.random() < .3) { a.tx = clamp(a.x + (Math.random() - .5) * .12, y.x0, y.x1); a.ty = a.y; } }
        if (a.head) pose = 'peck';
        else if (Math.abs(a.tx - a.x) > .01) { const s = Math.min(Math.abs(a.tx - a.x), spd * .5 * dt) * Math.sign(a.tx - a.x); a.x += s; a.dist += Math.abs(s); const ph = Math.floor(a.dist / .045) % 4; pose = ph === 0 ? 'walk1' : ph === 2 ? 'walk2' : 'farm'; }
      }
      if (pose !== a.pose) { a.prev = a.pose; a.pose = pose; a.fade = .09; }
      a.fx += (a.face - a.fx) * Math.min(1, dt * 12);          // turning round takes a moment
      a.x = clamp(a.x, y.x0, y.x1); a.y = clamp(a.y, y.y0, y.y1);
      if (a.t <= 0 && a.st !== 'walk') decide(b, a, list.filter(o => o.b !== b));
      if (a.st === 'walk' && a.t <= 0) a.st = 'idle';
    }
  }
}

/* ---------- the living farm: wind, trees, grass, pond, frogs, butterflies, clouds ---------- */
const wind = tt => .55 + .3 * Math.sin(tt * .23) + .15 * Math.sin(tt * .71 + 1.3);
function sway(x, amp) { return amp * wind(clock) * Math.sin(clock * 1.35 + x * .006) + amp * .25 * Math.sin(clock * 3.1 + x * .02); }
let shimmer = null, cloudCv = null;
function makeShimmer() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); const r = rngFrom(9);
  for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 256, w = 18 + r() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, w); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, .18); g.translate(-x, -y); g.beginPath(); g.arc(x, y, w, 0, 7); g.fill(); g.restore(); }
  return c;
}
function makeCloud() {
  const c = document.createElement('canvas'); c.width = 900; c.height = 520; const g = c.getContext('2d'); const r = rngFrom(4);
  for (let i = 0; i < 9; i++) { const x = 180 + r() * 540, y = 140 + r() * 240, w = 110 + r() * 150; const gr = g.createRadialGradient(x, y, 0, x, y, w); gr.addColorStop(0, 'rgba(18,28,40,.12)'); gr.addColorStop(1, 'rgba(18,28,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 900, 520); }
  return c;
}
const clouds = [{ x: 200, y: 400, v: 7 }, { x: 1300, y: 1700, v: 5.5 }, { x: 600, y: 3000, v: 6.3 }];
const ripples = [];
function pondPoint(a, r) { const P = GEOM.pond; return [P.c[0] + Math.cos(a) * P.eu[0] * r, P.c[1] + Math.sin(a) * P.ev[1] * r]; }
const frogs = Array.from({ length: 4 }, (_, i) => ({ spot: (i * 4) % GEOM.frogSpots.length, st: 'sit', t: 2 + Math.random() * 6, face: Math.random() < .5 ? 1 : -1, x: 0, y: 0, z: 0, from: null, to: null, dur: 0, puff: 0 }));
for (const f of frogs) [f.x, f.y] = GEOM.frogSpots[f.spot];
function frogHop(f, toWater) {
  const S = GEOM.frogSpots;
  f.from = [f.x, f.y];
  if (toWater) { const P = GEOM.pond; f.to = [lerp(f.x, P.c[0], .25), lerp(f.y, P.c[1], .25)]; f.st = 'dive'; }
  else { f.spot = (f.spot + (Math.random() < .5 ? 1 : S.length - 1)) % S.length; f.to = S[f.spot]; f.st = 'hop'; }
  f.dur = .42; f.t = 0; f.face = f.to[0] >= f.x ? 1 : -1;
}
function updateLife(dt) {
  for (const f of frogs) {
    if (f.st === 'sit') { f.t -= dt; if (f.puff > 0) f.puff -= dt; else if (Math.random() < dt * .08) f.puff = .5; if (f.t <= 0) frogHop(f, Math.random() < .18); }
    else if (f.st === 'hop' || f.st === 'dive') {
      f.t += dt; const k = Math.min(1, f.t / f.dur);
      f.x = lerp(f.from[0], f.to[0], k); f.y = lerp(f.from[1], f.to[1], k); f.z = Math.sin(k * Math.PI) * 16;
      if (k >= 1) { f.z = 0; if (f.st === 'dive') { ripples.push({ x: f.x, y: f.y, t: 0, big: 1 }); f.st = 'water'; f.t = 6 + Math.random() * 10; } else { f.st = 'sit'; f.t = 2 + Math.random() * 7; } }
    } else if (f.st === 'water') { f.t -= dt; if (f.t <= 0) { f.spot = Math.floor(Math.random() * GEOM.frogSpots.length); [f.x, f.y] = GEOM.frogSpots[f.spot]; ripples.push({ x: f.x, y: f.y - 4, t: 0, big: 1 }); f.st = 'sit'; f.t = 3 + Math.random() * 5; } }
  }
  if (Math.random() < dt * .7) { const a = Math.random() * 7, r = Math.sqrt(Math.random()) * .8; const [x, y] = pondPoint(a, r); ripples.push({ x, y, t: 0, big: 0 }); }
  for (const r of ripples) r.t += dt;
  while (ripples.length && ripples[0].t > 2) ripples.shift();
  for (const c of clouds) { c.x += c.v * dt; c.y += c.v * .35 * dt; if (c.x > GEOM.size[0] + 200) { c.x = -900; c.y = Math.random() * GEOM.size[1]; } if (c.y > GEOM.size[1] + 100) c.y = -500; }
  for (const b of butterflies) {
    b.t -= dt; if (b.t <= 0) { const tf = pick(GEOM.tufts); b.tx = tf[0] + (Math.random() - .5) * 40; b.ty = tf[1] - 10; b.t = 3 + Math.random() * 5; }
    const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(d, 38 * dt);
    b.x += dx / d * sp + Math.sin(clock * 3 + b.ph) * 18 * dt; b.y += dy / d * sp + Math.cos(clock * 4.2 + b.ph) * 14 * dt; b.face = dx >= 0 ? 1 : -1;
  }
}
const butterflies = [['#f5f1e6', 1], ['#f3c94a', 2], ['#e9873a', 3], ['#f5f1e6', 4]].map(([col, ph]) => { const tf = GEOM.tufts[(ph * 37) % GEOM.tufts.length]; return { col, ph, x: tf[0], y: tf[1] - 12, tx: tf[0], ty: tf[1], t: 0, face: 1 }; });

function drawPond() {
  const P = GEOM.pond, rx = P.eu[0], ry = -P.ev[1];
  ctx.save(); ctx.beginPath(); ctx.ellipse(P.c[0], P.c[1], rx * .97, ry * .95, 0, 0, Math.PI * 2); ctx.clip();
  if (!shimmer) shimmer = makeShimmer();
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .22;
  for (const [sp, off] of [[9, 0], [-6, 130]]) {
    const ox = ((clock * sp) % 512 + 512) % 512;
    for (let x = P.c[0] - rx - 512 + ox; x < P.c[0] + rx; x += 512) for (let y = P.c[1] - ry - off % 256; y < P.c[1] + ry; y += 256) ctx.drawImage(shimmer, x, y);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  for (const r of ripples) {
    const k = r.t / 2, R = (r.big ? 34 : 18) * (.2 + k);
    ctx.strokeStyle = `rgba(230,245,250,${(r.big ? .55 : .35) * (1 - k)})`; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, R, R * .62, 0, 0, Math.PI * 2); ctx.stroke();
    if (r.big && k < .6) { ctx.beginPath(); ctx.ellipse(r.x, r.y, R * .55, R * .34, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}
function drawWind(vx0, vy0, vx1, vy1) {
  if (!shimmer) shimmer = makeShimmer();
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .28 * wind(clock);
  const ox = (clock * 34) % 512, oy = (clock * 9) % 256;
  ctx.scale(2, 2);
  for (let x = Math.floor((vx0 / 2 - ox) / 512) * 512 + ox; x < vx1 / 2; x += 512) for (let y = Math.floor((vy0 / 2 - oy) / 256) * 256 + oy; y < vy1 / 2; y += 256) ctx.drawImage(shimmer, x, y);
  ctx.restore();
}
function drawTree(tr) {
  const im = atlas('trees'); if (!ready(im)) return;
  const k = tr.k, sk = sway(tr.base[0], .016);
  ctx.save(); ctx.translate(tr.base[0], tr.base[1]); ctx.transform(1, 0, -sk, 1, 0, 0);
  ctx.drawImage(im, tr.x, tr.y, tr.w, tr.h, -tr.ax * k, -tr.ay * k, tr.w * k, tr.h * k);
  ctx.restore();
}
function drawProp(name, x, y, sx, sy, skew) {
  const p = PROPS[name]; if (!p) return; const im = atlas('props'); if (!ready(im)) return;
  ctx.save(); ctx.translate(x, y); if (skew) ctx.transform(1, 0, -skew, 1, 0, 0); ctx.scale(sx * p.k, sy * p.k);
  ctx.drawImage(im, p.x, p.y, p.w, p.h, -p.ax, -p.ay, p.w, p.h); ctx.restore();
}
function drawFrog(f) {
  if (f.st === 'water') return;
  const leap = f.st !== 'sit', pulse = f.puff > 0 ? 1 + .07 * Math.sin(f.puff * Math.PI * 4) : 1;
  ctx.save(); ctx.globalAlpha = .25; ell(ctx, f.x, f.y, 6, 2.5); ctx.fillStyle = '#122008'; ctx.fill(); ctx.restore();
  drawProp(leap ? 'frog_leap' : 'frog_sit', f.x, f.y - f.z, f.face, pulse, 0);
}
function drawButterfly(b) {
  const flap = Math.abs(Math.sin(clock * 16 + b.ph)) * .9 + .1;
  ctx.save(); ctx.translate(b.x, b.y); ctx.fillStyle = b.col; ctx.globalAlpha = .95;
  ell(ctx, -3.2 * flap, 0, 3.4 * flap, 2.6); ctx.fill(); ell(ctx, 3.2 * flap, 0, 3.4 * flap, 2.6); ctx.fill();
  ctx.fillStyle = '#2b2416'; ell(ctx, 0, 0, .7, 2.2); ctx.fill(); ctx.restore();
}

function drawOverlay(p) {
  let src;
  if (p.kind === 'coop') src = ovSrc(p.breed, p.f.deg);
  else if (p.kind === 'empty') src = ovSrc('empty', p.f.deg);
  else if (p.kind === 'sale') src = ovSrc('sale', p.f.deg);
  else return;
  const im = img(src); if (!ready(im)) return;
  ctx.drawImage(im, p.f.c[0] - OV[0], p.f.c[1] - OV[1], 600, 600);
}
const uiK = () => clamp(.8 / view.s, 1, 2.4);     // signs and bubbles keep a readable size when zoomed out
function label(x, y, text, sub, style) {
  ctx.save(); const K = uiK(); ctx.translate(x, y); ctx.scale(K, K);
  ctx.font = '900 15px Coustard, Georgia, serif';
  const w1 = ctx.measureText(text).width;
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const w = Math.max(w1, w2) + 22, h = sub ? 44 : 28;
  const hot = style === 'hot', lock = style === 'lock';
  ctx.fillStyle = 'rgba(0,0,0,.22)'; rrect(ctx, -w / 2, -h / 2 + 3, w, h, 9); ctx.fill();
  ctx.fillStyle = hot ? '#fff4d3' : lock ? '#e9e6dc' : '#fbf6e6'; rrect(ctx, -w / 2, -h / 2, w, h, 9); ctx.fill();
  ctx.strokeStyle = hot ? '#c08a14' : 'rgba(80,55,20,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = lock ? '#5f5a4c' : '#3a2a12'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 15px Coustard, Georgia, serif'; ctx.fillText(text, 0, sub ? -9 : 1);
  if (sub) { ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillStyle = '#6b4b12'; ctx.fillText(sub, 0, 11); }
  ctx.restore();
}
const GRADE_COL = { '★': ['#e1b525', '#3a2a00'], 'A+': ['#2f7a3a', '#fff'], A: ['#3d8a45', '#fff'], B: ['#2a6f80', '#fff'], C: ['#7b7f74', '#fff'], D: ['#c9c3b0', '#3a3a30'] };
function gradeTag(a) {
  const b = a.b, g = grade(quality(b)), [bg, fg] = GRADE_COL[g];
  const v = fmtN(value(b)), chick = stage(b) === 'chick';
  ctx.save(); const K = uiK() * .9; ctx.translate(a.sx, a.sy - (chick ? 26 : 62)); ctx.scale(K, K);
  ctx.font = '900 13px "Atkinson Hyperlegible", system-ui, sans-serif'; const wg = ctx.measureText(g).width + 12;
  ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; const wv = ctx.measureText(v).width + 22;
  const w = wg + wv, x0 = -w / 2;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; rrect(ctx, x0, -10 + 2, w, 20, 10); ctx.fill();
  ctx.fillStyle = '#fffdf6'; rrect(ctx, x0, -10, w, 20, 10); ctx.fill();
  ctx.fillStyle = bg; rrect(ctx, x0, -10, wg, 20, 10); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillText(g, x0 + wg / 2, 1);
  ctx.fillStyle = '#e3a723'; ell(ctx, x0 + wg + 9, 0, 5, 5); ctx.fill();
  ctx.fillStyle = '#2b2416'; ctx.font = '700 12px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(v, x0 + wg + 16, 1);
  if (b.sex === 'r' && plotOfBird(b) && plotOfBird(b).coop && plotOfBird(b).coop.sire === b.id) { ctx.fillStyle = '#2a5ea8'; ell(ctx, x0 + w + 4, -8, 5, 5); ctx.fill(); }
  ctx.restore();
}
function bubble(x, y, r, fill, stroke, drawIcon) {
  ctx.save(); const K = uiK(); ctx.translate(x, y); ctx.scale(K, K);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; rrect(ctx, -r.w / 2, -18 + 3, r.w, 36, 18); ctx.fill();
  ctx.fillStyle = fill; rrect(ctx, -r.w / 2, -18, r.w, 36, 18); ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
  drawIcon(); ctx.restore();
}
function sackIcon(x, y, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 7, y - 6); ctx.quadraticCurveTo(x, y - 10, x + 7, y - 6); ctx.lineTo(x + 9, y + 8); ctx.quadraticCurveTo(x, y + 12, x - 9, y + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - 5, y - 1, 10, 3);
}
function draw() {
  const k = view.dpr * view.s;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#4f7a35'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(k, 0, 0, k, -view.x * k, -view.y * k);
  ctx.imageSmoothingQuality = 'high';
  const map = img('img/farm_map.webp');
  const vx0 = view.x, vy0 = view.y, vx1 = view.x + view.vw / view.s, vy1 = view.y + view.vh / view.s;
  if (ready(map)) {
    const sx = Math.max(0, Math.floor(vx0) - 2), sy = Math.max(0, Math.floor(vy0) - 2);
    const sw = Math.min(map.naturalWidth - sx, Math.ceil(vx1 - sx) + 4), sh = Math.min(map.naturalHeight - sy, Math.ceil(vy1 - sy) + 4);
    if (sw > 0 && sh > 0) ctx.drawImage(map, sx, sy, sw, sh, sx, sy, sw, sh);
  }
  const vis = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  drawWind(vx0, vy0, vx1, vy1);
  if (vis(GEOM.pond.c[0], GEOM.pond.c[1], 300)) drawPond();
  // everything that stands up, back to front
  const items = [];
  for (const p of plots) if (p.kind !== 'pasture' && vis(p.f.c[0], p.f.c[1], 360)) items.push([p.f.c[1], 0, p]);
  for (const tr of TREES) if (vis(tr.base[0], tr.base[1] - 120, 320)) items.push([tr.base[1], 1, tr]);
  for (const tf of GEOM.tufts) if (vis(tf[0], tf[1], 40)) items.push([tf[1], 2, tf]);
  for (const f of frogs) if (vis(f.x, f.y, 40)) items.push([f.y, 3, f]);
  const birds = [];
  for (const b of state.birds) {
    const a = agents.get(b.id); if (!a || !a.plot) continue;
    const m = toMap(a.plot.f, a.x, a.y); a.sx = m[0]; a.sy = m[1];
    if (vis(a.sx, a.sy, 80)) { items.push([a.sy, 4, a]); birds.push(a); }
  }
  items.sort((p, q) => p[0] - q[0]);
  for (const [, kind, it] of items) {
    if (kind === 0) drawOverlay(it);
    else if (kind === 1) drawTree(it);
    else if (kind === 2) drawProp('tuft_' + it[2], it[0], it[1], (it[0] | 0) % 2 ? 1 : -1, 1, sway(it[0], .09));
    else if (kind === 3) drawFrog(it);
    else drawBird(it);
  }
  for (const b of butterflies) if (vis(b.x, b.y, 20)) drawButterfly(b);
  if (!cloudCv) cloudCv = makeCloud();
  for (const c of clouds) if (vis(c.x + 450, c.y + 260, 600)) ctx.drawImage(cloudCv, c.x, c.y, 1800, 1040);
  // signs, bubbles and tags sit on top of everything
  for (const p of plots) {
    if (p.kind === 'pasture' || !vis(p.f.c[0], p.f.c[1], 300)) continue;
    const sp = toMap(p.f, 0, -1.75, 0.3);
    if (p.kind === 'coop') label(sp[0], sp[1], coopLabel(p.coop));
    else if (p.kind === 'empty') label(sp[0], sp[1], t('sign_build'), '+');
    else if (p.kind === 'sale' && p.next) label(sp[0], sp[1], p.locked ? t('locked_lvl', { n: levelForPlots(p.idx + 1) }) : t('sign_sale'), p.locked ? null : fmtN(p.price) + ' ' + t('coins'), p.locked ? 'lock' : 'hot');
  }
  for (const p of plots) {
    if (p.kind !== 'coop') continue;
    const c = p.coop, n = nestCount(c), food = feederTotal(c);
    p.bubble = null; p.feedBubble = null;
    const m = toMap(p.f, 0.2, 0.75, 2.2);
    const bob = Math.sin(clock * 3 + p.idx) * 3;
    if (!vis(m[0], m[1], 80)) continue;
    if (n) {
      const bx = m[0] + 14 * uiK(), by = m[1] + bob;
      p.bubble = { x: bx, y: by, r: 34 * uiK() };
      bubble(bx, by, { w: 60 }, n >= NEST_CAP ? '#fff2cc' : '#fffdf6', n >= NEST_CAP ? '#c8302a' : 'rgba(0,0,0,.12)', () => {
        ell(ctx, -11, 0, 8.5, 11); const g = ctx.createRadialGradient(-14, -4, 1, -11, 0, 13);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, BREEDS[c.breed].eggCol); ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = '#2b2416'; ctx.font = '700 18px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 12, 1);
      });
    }
    if (food <= FEEDER_CAP * .15) {
      const empty = food <= 0, fx = m[0] - (n ? 46 : 0) * uiK(), fy = m[1] - bob;
      p.feedBubble = { x: fx, y: fy, r: 30 * uiK() };
      bubble(fx, fy, { w: 40 }, empty ? '#ffe3dc' : '#fff4d3', empty ? '#c8302a' : '#c08a14', () => {
        sackIcon(-1, 0, '#a7743a');
        if (empty) { ctx.fillStyle = '#c8302a'; ctx.font = '900 16px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 12, -8); }
      });
    }
  }
  const pp = toMap(GEOM.pasture, 0, -2.75, .2);
  if (vis(pp[0], pp[1], 100)) label(pp[0], pp[1], t('pasture'));
  if (ui.grades) { birds.sort((a, b) => a.sy - b.sy); for (const a of birds) gradeTag(a); }
  for (const a of birds) if (a.say > 0) speech(a);
}
function drawBird(a) {
  const b = a.b, st = stage(b);
  const grow = st === 'young' ? .82 : 1;
  const name = spriteFor(b, a.pose); if (!name) return;
  const k = BIRD_UNIT / SPR[name].ppu * grow;
  let sy = k, sx = k * a.fx;
  if (a.st === 'dust') { sy *= .8 + .04 * Math.sin(clock * 9 + b.id); sx *= 1.07; }
  if (a.st === 'crow') sy *= 1.04;
  if (st === 'retired') ctx.filter = 'saturate(.8)';
  drawSprite(name, a.sx, a.sy, sx, sy);
  if (a.fade > 0 && a.prev) { const pn = spriteFor(b, a.prev); if (pn && pn !== name) { ctx.globalAlpha = clamp(a.fade / .09, 0, 1) * .8; drawSprite(pn, a.sx, a.sy, BIRD_UNIT / SPR[pn].ppu * grow * a.fx, BIRD_UNIT / SPR[pn].ppu * grow); ctx.globalAlpha = 1; } }
  ctx.filter = 'none';
  if (a.st === 'dust') {
    ctx.save(); ctx.globalAlpha = .35;
    for (let i = 0; i < 4; i++) { ell(ctx, a.sx - 18 + i * 12 + Math.sin(clock * 5 + i) * 3, a.sy - 3 - Math.abs(Math.sin(clock * 4 + i)) * 7, 6, 3.5); ctx.fillStyle = '#b39066'; ctx.fill(); }
    ctx.restore();
  }
}
function speech(a) {
  const chick = stage(a.b) === 'chick';
  ctx.save(); const K = uiK(); ctx.translate(a.sx + 4, a.sy - (chick ? 34 : 70) - (ui.grades ? 24 : 0)); ctx.scale(K, K);
  ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w = ctx.measureText(a.sayText).width + 16, hx = 0, hy = -12;
  ctx.globalAlpha = Math.min(1, a.say * 3);
  ctx.fillStyle = '#fffdf6'; rrect(ctx, hx - w / 2, hy - 13, w, 26, 13); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx - 5, hy + 12); ctx.lineTo(hx - 10, hy + 20); ctx.lineTo(hx + 4, hy + 12); ctx.fill();
  ctx.fillStyle = '#2b2416'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.sayText, hx, hy + 1); ctx.restore();
}
function scrollToPlot(idx) {
  buildPlots(); const p = plots[idx]; if (!p) return;
  view.x = p.f.c[0] - view.vw / view.s / 2; view.y = p.f.c[1] - view.vh / view.s / 2; clampCam();
}

/* touch: drag to move around the farm, pinch or wheel to zoom, tap to open */
const ptr = { list: new Map(), moved: 0, x0: 0, y0: 0, vx: 0, vy: 0, lastT: 0, pinch: null };
let inertia = null;
function local(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
cv.addEventListener('pointerdown', e => {
  const [x, y] = local(e); ptr.list.set(e.pointerId, { x, y });
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  inertia = null;
  if (ptr.list.size === 1) { ptr.moved = 0; ptr.x0 = x; ptr.y0 = y; ptr.vx = ptr.vy = 0; ptr.lastT = performance.now(); ptr.pinch = null; }
  else if (ptr.list.size === 2) { const [p, q] = [...ptr.list.values()]; ptr.pinch = { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, s: view.s }; ptr.moved = 99; }
});
cv.addEventListener('pointermove', e => {
  const old = ptr.list.get(e.pointerId); if (!old) return;
  const [x, y] = local(e);
  if (ptr.list.size >= 2 && ptr.pinch) {
    const [p, q] = [...ptr.list.values()];
    const mx0 = (p.x + q.x) / 2, my0 = (p.y + q.y) / 2;
    old.x = x; old.y = y;
    const [p2, q2] = [...ptr.list.values()];
    const mx = (p2.x + q2.x) / 2, my = (p2.y + q2.y) / 2, d = Math.hypot(p2.x - q2.x, p2.y - q2.y) || 1;
    view.x -= (mx - mx0) / view.s; view.y -= (my - my0) / view.s;
    zoomAt(mx, my, ptr.pinch.s * d / ptr.pinch.d);
    return;
  }
  const dx = x - old.x, dy = y - old.y; old.x = x; old.y = y;
  ptr.moved = Math.max(ptr.moved, Math.hypot(x - ptr.x0, y - ptr.y0));
  if (ptr.moved < 6) return;
  view.x -= dx / view.s; view.y -= dy / view.s; clampCam();
  const now = performance.now(), dtm = Math.max(1, now - ptr.lastT); ptr.vx = dx / dtm; ptr.vy = dy / dtm; ptr.lastT = now;
});
function up(e) {
  if (!ptr.list.has(e.pointerId)) return;
  ptr.list.delete(e.pointerId);
  if (ptr.list.size === 1) { const [p] = [...ptr.list.values()]; ptr.pinch = null; ptr.x0 = p.x; ptr.y0 = p.y; return; }
  if (ptr.list.size) return;
  if (e.type === 'pointerup' && ptr.moved < 9) { const [x, y] = local(e); tapAt(view.x + x / view.s, view.y + y / view.s); }
  else if (ptr.moved >= 9 && ptr.moved < 99 && performance.now() - ptr.lastT < 80) inertia = { vx: ptr.vx, vy: ptr.vy };
}
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', up);
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const [x, y] = local(e);
  if (e.ctrlKey || e.metaKey) zoomAt(x, y, view.s * Math.exp(-e.deltaY * .01));
  else { view.x += e.deltaX / view.s; view.y += e.deltaY / view.s; clampCam(); }
}, { passive: false });
function inBox(f, x, y, box) { const [lx, ly] = toLocal(f, x, y); return lx >= box.x0 && lx <= box.x1 && ly >= box.y0 && ly <= box.y1; }
function tapAt(x, y) {
  for (const p of plots) if (p.bubble && Math.hypot(x - p.bubble.x, y - p.bubble.y) < p.bubble.r) { actCollect(p.coop); return; }
  for (const p of plots) if (p.feedBubble && Math.hypot(x - p.feedBubble.x, y - p.feedBubble.y) < p.feedBubble.r) { openSheet('coop', { id: p.coop.id }); return; }
  let best = null, bd = 1e9;
  for (const b of state.birds) {
    const a = agents.get(b.id); if (!a || a.sx == null) continue;
    const r = stage(b) === 'chick' ? 22 : 34;
    const d = Math.hypot(x - a.sx, y - (a.sy - r * .8));
    if (d < r && d < bd) { bd = d; best = b; }
  }
  if (best) { openSheet('bird', { id: best.id }); return; }
  for (const f of frogs) if (f.st === 'sit' && Math.hypot(x - f.x, y - f.y + 6) < 22) { f.puff = .6; frogHop(f, false); return; }
  for (const p of plots) {
    if (!inBox(p.f, x, y, p.kind === 'pasture' ? { x0: -3.1, x1: 3.1, y0: -2.4, y1: 2.4 } : { x0: -1.85, x1: 1.85, y0: -1.75, y1: 1.6 })) continue;
    if (p.kind === 'coop') openSheet('coop', { id: p.coop.id });
    else if (p.kind === 'empty') openSheet('market', { tab: 'build' });
    else if (p.kind === 'sale') openSheet('market', { tab: 'build' });
    else openSheet('pasture');
    return;
  }
  if (Math.hypot(x - GEOM.stall[0], y - GEOM.stall[1]) < 90) openSheet('market', { tab: 'birds' });
  else if (Math.hypot(x - GEOM.house[0], y - GEOM.house[1]) < 110) openSheet('awards');
}
function stepInertia(dt) {
  if (!inertia || ptr.list.size) return;
  view.x -= inertia.vx * dt * 1000 / view.s; view.y -= inertia.vy * dt * 1000 / view.s; clampCam();
  const f = Math.pow(.05, dt); inertia.vx *= f; inertia.vy *= f;
  if (Math.hypot(inertia.vx, inertia.vy) < .01) inertia = null;
}

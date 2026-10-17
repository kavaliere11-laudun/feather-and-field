/* =====================================================================
   8. ART: pre-rendered map, plot overlays and bird sprites (made in Blender)
   ===================================================================== */
const GEOM = /*GEOM*/null;
const SPR = /*SPRITES*/null;
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
function spriteName(b, pose) {
  const st = stage(b), k = kindKey(b);
  if (st === 'chick') return 'chick_' + k;
  const name = (pose === 'peck' ? 'peck_' : 'farm_') + k + '_' + b.sex;
  return SPR[name] ? name : 'farm_' + k + '_' + b.sex;
}
const cardName = b => stage(b) === 'chick' ? 'chick_' + kindKey(b) : 'card_' + kindKey(b) + '_' + b.sex;
const sprSrc = n => 'img/b/' + n + '.webp';
const ovSrc = (kind, deg) => `img/ov/ov_${kind}_${deg}.webp`;

/* map pixels <-> local ground metres of a plot (an affine map, since the camera is orthographic) */
function toMap(f, lx, ly, z = 0) { return [f.c[0] + lx * f.ex[0] + ly * f.ey[0] + z * GEOM.ez[0], f.c[1] + lx * f.ex[1] + ly * f.ey[1] + z * GEOM.ez[1]]; }
function toLocal(f, x, y) {
  const dx = x - f.c[0], dy = y - f.c[1], det = f.ex[0] * f.ey[1] - f.ey[0] * f.ex[1];
  return [(dx * f.ey[1] - dy * f.ey[0]) / det, (f.ex[0] * dy - f.ex[1] * dx) / det];
}
const YARD = { x0: -1.4, x1: 1.4, y0: -1.25, y1: -0.45 };      // trodden earth in front of each coop, in metres
const PASTURE_YARD = { x0: -1.8, x1: 1.8, y0: -1.6, y1: 0.2 };

/* =====================================================================
   9. SCENE: LAYOUT, CHICKEN BEHAVIOUR, DRAWING, TOUCH
   ===================================================================== */
const cv = $('#farm'), ctx = cv.getContext('2d');
const view = { vw: 0, vh: 0, dpr: 1, s: 1, x: 0, y: 0, minS: .3, maxS: 1.6, init: false };
const agents = new Map();
let plots = [], clock = 0, dirty = false, uiDirty = false;

function buildPlots() {
  plots = [];
  for (let i = 0; i < MAX_PLOTS; i++) {
    const f = GEOM.slots[i], coop = state.coops.find(c => c.plot === i);
    let p;
    if (coop) p = { kind: 'coop', breed: coop.breed, coop };
    else if (i < state.plots) p = { kind: 'empty', idx: i };
    else p = { kind: 'sale', next: i === state.plots, price: plotPrice() };
    p.f = f; p.idx = i; plots.push(p);
  }
  plots.push({ kind: 'pasture', f: GEOM.pasture });
}
function layout() {
  const r = cv.getBoundingClientRect();
  view.vw = Math.max(1, r.width); view.vh = Math.max(1, r.height); view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(view.vw * view.dpr); cv.height = Math.round(view.vh * view.dpr);
  const [W, H] = GEOM.size;
  view.minS = Math.max(view.vw / W, view.vh / H);
  view.maxS = Math.max(view.minS, 1.6);
  if (!view.init) {             // first look: the farmhouse and the first coops, zoomed so a phone shows the two columns
    view.s = clamp(view.vw / 800, view.minS, 1.1);
    view.x = W / 2 - view.vw / view.s / 2; view.y = 40;
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
function resetAgent(b) { agents.delete(b.id); }
function agentFor(b) {
  let a = agents.get(b.id); const p = plotOfBird(b); if (!p) return null;
  const key = p.kind === 'pasture' ? 'pasture' : 'coop' + p.coop.id;
  if (a && a.key === key) { a.plot = p; return a; }
  const y = yardOf(p);
  a = { key, plot: p, x: lerp(y.x0, y.x1, Math.random()), y: lerp(y.y0, y.y1, Math.random()), tx: 0, ty: 0, st: 'idle', t: Math.random() * 2, face: Math.random() < .5 ? 1 : -1, ph: 0, peck: 0, say: 0, sayText: '' };
  agents.set(b.id, a);
  return a;
}
function decide(b, a, others) {
  const y = yardOf(a.plot), st = stage(b), r = Math.random(), old = st === 'retired';
  a.st = 'idle'; a.t = .6 + Math.random() * 1.8;
  if (st === 'chick') {
    const mom = others.find(o => o.b.sex === 'h' && isGrown(o.b) && (b.dam && o.b.name === b.dam.name)) || others.find(o => o.b.sex === 'h' && isGrown(o.b));
    if (mom && r < .7) { a.st = 'follow'; a.leader = mom.a; a.t = 2 + Math.random() * 3; a.off = [(Math.random() - .5) * .3, -.12 - Math.random() * .15]; return; }
  }
  if (r < .38) { a.st = 'walk'; a.tx = lerp(y.x0, y.x1, Math.random()); a.ty = lerp(y.y0, y.y1, Math.random()); }
  else if (r < .64) { a.st = 'peck'; a.t = 1 + Math.random() * 2.5; }
  else if (r < .76 && others.length) {
    const o = pick(others); if (o.a.st === 'idle' || o.a.st === 'peck') { a.st = 'walk'; a.tx = o.a.x - .32 * Math.sign(o.a.x - a.x || 1); a.ty = o.a.y + (Math.random() - .5) * .08; a.chatWith = o.a; }
  }
  else if (r < .81 && b.sex === 'h' && st !== 'chick' && !old) { a.st = 'dust'; a.t = 4 + Math.random() * 4; }
  else if (r < .86 && b.sex === 'r' && st !== 'chick') { a.st = 'crow'; a.t = 2; a.say = 2; a.sayText = t('crow'); }
}
function updateAgents(dt) {
  const byPlot = new Map();
  for (const b of state.birds) { const a = agentFor(b); if (!a) continue; a.b = b; if (!byPlot.has(a.plot)) byPlot.set(a.plot, []); byPlot.get(a.plot).push({ b, a }); }
  for (const [p, list] of byPlot) {
    const y = yardOf(p);
    for (const { b, a } of list) {
      const st = stage(b), slow = st === 'retired' ? .7 : 1;
      const spd = (st === 'chick' ? .28 : b.breed === 'sil' ? .17 : .22) * slow;      // metres per second
      a.t -= dt; if (a.say > 0) a.say -= dt;
      let moving = false;
      if (a.st === 'walk' || a.st === 'follow') {
        if (a.st === 'follow' && a.leader) { a.tx = a.leader.x + a.off[0]; a.ty = a.leader.y + a.off[1]; }
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d > .02) {
          const s = Math.min(d, spd * dt); a.x += dx / d * s; a.y += dy / d * s; moving = true; a.ph += dt * (st === 'chick' ? 16 : 10);
          const sdx = dx * p.f.ex[0] + dy * p.f.ey[0];                 // direction on screen decides which way the bird faces
          if (Math.abs(sdx) > .01) a.face = sdx > 0 ? 1 : -1;
        } else if (a.st === 'walk') {
          if (a.chatWith) {
            const sdx = (a.chatWith.x - a.x) * p.f.ex[0] + (a.chatWith.y - a.y) * p.f.ey[0];
            a.face = Math.sign(sdx) || 1; a.chatWith.face = -a.face; a.st = 'chat'; a.t = 1.2 + Math.random() * 1.5;
            if (Math.random() < .4) { a.say = 1.2; a.sayText = t('cluck'); } a.chatWith = null;
          } else { a.st = 'idle'; a.t = .3 + Math.random(); }
        }
        if (a.st === 'follow' && a.t <= 0) a.st = 'idle';
      }
      a.peck = a.st === 'peck' ? (Math.sin(clock * 5 + b.id) > -.2 ? 1 : 0) : 0;
      a.x = clamp(a.x, y.x0, y.x1); a.y = clamp(a.y, y.y0, y.y1);
      a.moving = moving;
      if (a.t <= 0 && a.st !== 'walk') decide(b, a, list.filter(o => o.b !== b));
      if (a.st === 'walk' && a.t < -12) a.st = 'idle';
    }
  }
}

function drawOverlay(p) {
  let src;
  if (p.kind === 'coop') src = ovSrc(p.breed, p.f.deg);
  else if (p.kind === 'empty') src = ovSrc('empty', p.f.deg);
  else if (p.kind === 'sale') src = ovSrc('sale', p.f.deg);
  else return;
  const im = img(src); if (!ready(im)) return;
  ctx.drawImage(im, p.f.c[0] - GEOM.ov[0], p.f.c[1] - GEOM.ov[1], 600, 600);
}
const uiK = () => clamp(.8 / view.s, 1, 2.4);     // signs and bubbles keep a readable size when zoomed out
function label(x, y, text, sub, hot) {
  ctx.save(); const K = uiK(); ctx.translate(x, y); ctx.scale(K, K); x = 0; y = 0;
  ctx.font = '900 15px Coustard, Georgia, serif';
  const w1 = ctx.measureText(text).width;
  ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const w = Math.max(w1, w2) + 22, h = sub ? 44 : 28;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; rrect(ctx, x - w / 2, y - h / 2 + 3, w, h, 9); ctx.fill();
  ctx.fillStyle = hot ? '#fff4d3' : '#fbf6e6'; rrect(ctx, x - w / 2, y - h / 2, w, h, 9); ctx.fill();
  ctx.strokeStyle = hot ? '#c08a14' : 'rgba(80,55,20,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#3a2a12'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 15px Coustard, Georgia, serif'; ctx.fillText(text, x, sub ? y - 9 : y + 1);
  if (sub) { ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillStyle = '#6b4b12'; ctx.fillText(sub, x, y + 11); }
  ctx.restore();
}
function draw() {
  const k = view.dpr * view.s;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#4f7a35'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(k, 0, 0, k, -view.x * k, -view.y * k);
  ctx.imageSmoothingQuality = 'high';
  const map = img('img/farm_map.webp');
  const vx0 = view.x, vy0 = view.y, vx1 = view.x + view.vw / view.s, vy1 = view.y + view.vh / view.s;
  if (ready(map)) ctx.drawImage(map, 0, 0);
  const vis = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  for (const p of plots) if (vis(p.f.c[0], p.f.c[1], 360)) drawOverlay(p);
  // chickens, back to front
  const list = [];
  for (const b of state.birds) {
    const a = agents.get(b.id); if (!a || !a.plot) continue;
    const m = toMap(a.plot.f, a.x, a.y); a.sx = m[0]; a.sy = m[1];
    if (vis(a.sx, a.sy, 80)) list.push(a);
  }
  list.sort((a, b) => a.sy - b.sy);
  for (const a of list) drawBird(a);
  // signs and egg bubbles sit on top of everything
  for (const p of plots) {
    if (!vis(p.f.c[0], p.f.c[1], 300)) continue;
    const sp = toMap(p.f, 0, -2.05, 0.3);
    if (p.kind === 'coop') label(sp[0], sp[1], t('coop_' + p.breed));
    else if (p.kind === 'empty') label(sp[0], sp[1], t('sign_build'), '+');
    else if (p.kind === 'sale' && p.next) label(sp[0], sp[1], t('sign_sale'), fmtN(p.price) + ' ' + t('coins'), true);
  }
  for (const p of plots) {
    if (p.kind !== 'coop') continue;
    const n = nestCount(p.coop); p.bubble = null; if (!n) continue;
    const m = toMap(p.f, 0.2, 0.5, 2.3);
    const bx = m[0], by = m[1] + Math.sin(clock * 3) * 3;
    if (!vis(bx, by, 60)) continue;
    p.bubble = { x: bx, y: by, r: 40 * uiK() };
    ctx.save(); ctx.translate(bx, by); const K = uiK(); ctx.scale(K, K);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; rrect(ctx, -30, -18 + 3, 60, 36, 18); ctx.fill();
    ctx.fillStyle = n >= NEST_CAP ? '#fff2cc' : '#fffdf6'; rrect(ctx, -30, -18, 60, 36, 18); ctx.fill();
    ctx.strokeStyle = n >= NEST_CAP ? '#c8302a' : 'rgba(0,0,0,.12)'; ctx.lineWidth = 2; ctx.stroke();
    ell(ctx, -11, 0, 8.5, 11); const g = ctx.createRadialGradient(-14, -4, 1, -11, 0, 13);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, BREEDS[p.coop.breed].eggCol); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#2b2416'; ctx.font = '700 18px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 12, 1);
    ctx.restore();
  }
  // pasture name
  const pp = toMap(GEOM.pasture, 0, -2.3, .2);
  if (vis(pp[0], pp[1], 100)) label(pp[0], pp[1], t('pasture'));
}
function drawBird(a) {
  const b = a.b, st = stage(b), chick = st === 'chick';
  const name = spriteName(b, a.peck ? 'peck' : 'farm'), info = SPR[name]; if (!info) return;
  const im = img(sprSrc(name)); if (!ready(im)) return;
  const grow = st === 'young' ? .82 : 1;
  const k = BIRD_UNIT / info.ppu * grow;
  ctx.save(); ctx.translate(a.sx, a.sy);
  if (a.moving) ctx.translate(0, -Math.abs(Math.sin(a.ph)) * 2.2);
  ctx.scale(a.face * k, k);
  if (a.st === 'dust') { ctx.translate(0, 6 / k); ctx.scale(1.06, .82); }
  if (a.st === 'crow') ctx.rotate(-.08 * a.face);
  if (a.moving) ctx.rotate(Math.sin(a.ph) * .05);
  if (st === 'retired') ctx.filter = 'saturate(.75) brightness(1.03)';
  ctx.drawImage(im, -info.ax, -info.ay, info.w, info.h);
  ctx.restore();
  if (a.st === 'dust') {
    ctx.save(); ctx.globalAlpha = .35;
    for (let i = 0; i < 4; i++) { ell(ctx, a.sx - 18 + i * 12 + Math.sin(clock * 5 + i) * 3, a.sy - 3 - Math.abs(Math.sin(clock * 4 + i)) * 7, 6, 3.5); ctx.fillStyle = '#b39066'; ctx.fill(); }
    ctx.restore();
  }
  if (a.say > 0) {
    ctx.save(); const K = uiK(); ctx.translate(a.sx + 4, a.sy - (chick ? 34 : 70 * grow)); ctx.scale(K, K);
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    const w = ctx.measureText(a.sayText).width + 16, hx = 0, hy = -12;
    ctx.globalAlpha = Math.min(1, a.say * 3);
    ctx.fillStyle = '#fffdf6'; rrect(ctx, hx - w / 2, hy - 13, w, 26, 13); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 5, hy + 12); ctx.lineTo(hx - 10, hy + 20); ctx.lineTo(hx + 4, hy + 12); ctx.fill();
    ctx.fillStyle = '#2b2416'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a.sayText, hx, hy + 1); ctx.restore();
  }
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
function inPoly(f, x, y, box) { const [lx, ly] = toLocal(f, x, y); return lx >= box.x0 && lx <= box.x1 && ly >= box.y0 && ly <= box.y1; }
function tapAt(x, y) {
  for (const p of plots) if (p.bubble && Math.hypot(x - p.bubble.x, y - p.bubble.y) < p.bubble.r) { actCollect(p.coop); return; }
  let best = null, bd = 1e9;
  for (const b of state.birds) {
    const a = agents.get(b.id); if (!a || a.sx == null) continue;
    const r = stage(b) === 'chick' ? 22 : 34;
    const d = Math.hypot(x - a.sx, y - (a.sy - r * .8));
    if (d < r && d < bd) { bd = d; best = b; }
  }
  if (best) { openSheet('bird', { id: best.id }); return; }
  for (const p of plots) {
    if (!inPoly(p.f, x, y, p.kind === 'pasture' ? { x0: -2.3, x1: 2.3, y0: -2.2, y1: 2.2 } : { x0: -1.9, x1: 1.9, y0: -1.7, y1: 1.7 })) continue;
    if (p.kind === 'coop') openSheet('coop', { id: p.coop.id });
    else if (p.kind === 'empty') openSheet('market', { tab: 'build' });
    else if (p.kind === 'sale') openSheet('market', { tab: 'build' });
    else openSheet('pasture');
    return;
  }
  if (Math.hypot(x - GEOM.stall[0], y - GEOM.stall[1]) < 90) openSheet('market', { tab: 'birds' });
}
function stepInertia(dt) {
  if (!inertia || ptr.list.size) return;
  view.x -= inertia.vx * dt * 1000 / view.s; view.y -= inertia.vy * dt * 1000 / view.s; clampCam();
  const f = Math.pow(.05, dt); inertia.vx *= f; inertia.vy *= f;
  if (Math.hypot(inertia.vx, inertia.vy) < .01) inertia = null;
}

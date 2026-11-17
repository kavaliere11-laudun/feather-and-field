// Getting a bird ready for a show (17 Nov 2026; Audrey, of a game "a bit flat with not enough to do": "Grooming game
// first please"; "The bird on the show should be 1 at the time"). A little game over the farm, one bird alone, her own
// picture (main.js birdPortrait): three parts, each a few seconds from the first touch: wash (rub her feathers: soap
// bubbles), brush (swipe from head to tail: against the feathers ruffles them and doesn't count), shine (tap the sparkles
// before they fade). How well it went, 0 to 100, raises her chance of a rosette a little (game.js GROOM, showChance). No
// way to lose: a bird can always be entered as she is. Names and words are set as text, never as HTML.
//   openGroom({ img (a canvas: her alone, see-through round her), name, show, fee, secs, t(key, vars), chance(g) -> 0..100,
//               onGo(score), onSkip(), onClose() })  ->  { el, finish(scores), state() }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const STEPS = ['wash', 'brush', 'shine'], ICON = { wash: '🫧', brush: '🪮', shine: '✨' };

export function openGroom(o) {
  const root = el('section', 'groom'), stage = el('div', 'groom-stage'), tip = el('p', 'groom-tip'), time = el('div', 'groom-time'), timeFill = el('i');
  const pic = el('div', 'groom-pic'), fx = el('div', 'groom-fx'), card = el('div', 'groom-card');
  time.append(timeFill); pic.append(o.img, fx); stage.append(tip, time, pic);
  o.img.classList.add('groom-img');
  // the card: her name and the show, the three parts, how ready she is, her chance, Go and "as she is"
  const x = el('button', 'gicon gx groom-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Close');
  const head = el('div', 'groom-h'), hw = el('div'); hw.append(el('h2', null, o.t('groom_title', { name: o.name })), el('p', 'gsub', o.show)); head.append(hw, x);
  const steps = el('div', 'groom-steps'), tiles = {};
  for (const k of STEPS) { const s = el('div', 'groom-st'); s.dataset.step = k; s.append(el('span', 'groom-i', ICON[k]), el('span', null, o.t('groom_' + k)), el('small')); tiles[k] = s; steps.append(s); }
  const rl = el('div', 'groom-row'), rv = el('span', null, '0%'); rl.append(el('span', null, o.t('groom_ready')), rv);
  const bar = el('div', 'groom-bar'), fill = el('i'); bar.append(fill);
  const cl = el('div', 'groom-row'), cv = el('span', 'groom-gain'); cl.append(el('span', null, o.t('groom_chance')), cv);
  const go = el('button', 'gbtn', o.t('groom_go', { fee: o.fee })); go.type = 'button'; go.dataset.groom = 'go';
  const skip = el('button', 'glink groom-skip', o.t('groom_skip')); skip.type = 'button'; skip.dataset.groom = 'skip';
  card.append(head, steps, rl, bar, cl, go, skip); root.append(stage, card); document.body.append(root);

  // where the bird is in her picture: a grid of cells, those with enough of her in them
  const N = 10, cells = []; let on = 0;
  try {
    const c = document.createElement('canvas'); c.width = c.height = N * 4; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(o.img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let a = 0; for (let y = 0; y < 4; y++) for (let q = 0; q < 4; q++) a += d[((j * 4 + y) * c.width + i * 4 + q) * 4 + 3]; const is = a / 16 > 70; cells.push({ on: is, rub: 0 }); if (is) on++; }
  } catch (e) { /* (a picture that can't be read: every cell counts) */ }
  if (!on) { cells.length = 0; for (let k = 0; k < N * N; k++) cells.push({ on: true, rub: 0 }); on = N * N; }
  const at = e => { const r = pic.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height; return { u, v, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, cell: u >= 0 && u < 1 && v >= 0 && v < 1 ? cells[Math.floor(v * N) * N + Math.floor(u * N)] : null }; };
  const dot = (cls, x, y, size, life) => { const d = el('i', cls); d.style.left = x + 'px'; d.style.top = y + 'px'; if (size) { d.style.width = d.style.height = size + 'px'; } fx.append(d); if (life) setTimeout(() => d.remove(), life); return d; };

  const S = { step: 0, scores: [0, 0, 0], t: -1, done: false, brushed: 0, hits: 0, shown: 0, last: null, closed: false };
  const SECS = o.secs || 8, SPARKS = 8;
  const score = () => Math.round(100 * (S.scores[0] + S.scores[1] + S.scores[2]) / 3);
  const show = () => {
    const g = score(); rv.textContent = g + '%'; fill.style.width = g + '%';
    const a = o.chance(0), b = o.chance(g); cv.textContent = b > a ? a + '% → ' + b + '%' : a + '%';
    STEPS.forEach((k, i) => { const T = tiles[k]; T.classList.toggle('on', !S.done && i === S.step); T.classList.toggle('done', S.done || i < S.step); T.querySelector('small').textContent = S.done || i < S.step ? Math.round(S.scores[i] * 100) + '%' : ''; });
    tip.textContent = S.done ? '✨ ' + o.t('groom_done') : o.t('groom_tip_' + STEPS[S.step]);
    time.hidden = S.done; root.dataset.step = S.done ? 'done' : STEPS[S.step];
  };
  const next = () => {
    if (S.done) return;
    S.t = -1; S.last = null; timeFill.style.width = '100%';
    if (S.step === 0) for (const b of fx.querySelectorAll('.groom-bub')) { b.classList.add('pop'); setTimeout(() => b.remove(), 400); }      // (rinsed)
    if (S.step >= 2) { S.done = true; pic.classList.add('groom-proud'); } else S.step++;
    show();
  };
  // the clock of a part: from the first touch; a sparkle now and then while shining
  let raf = 0, prev = performance.now();
  const tick = now => {
    if (S.closed) return; raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    if (S.done || S.t < 0) return;
    S.t += dt; timeFill.style.width = Math.max(0, 100 * (1 - S.t / SECS)) + '%';
    if (S.step === 2 && S.shown < SPARKS && S.t >= S.shown * (SECS - 1) / SPARKS) {
      S.shown++; const live = cells.map((c, k) => c.on ? k : -1).filter(k => k >= 0), k = live[Math.floor(Math.random() * live.length)], r = pic.getBoundingClientRect();
      const sp = dot('groom-spark', ((k % N) + 0.5) / N * r.width, (Math.floor(k / N) + 0.5) / N * r.height, 0, 1150); sp.textContent = '✦';
      const hit = e => { e.preventDefault(); e.stopPropagation(); if (sp.dataset.hit) return; sp.dataset.hit = '1'; S.hits++; S.scores[2] = S.hits / SPARKS; sp.classList.add('hit'); const gl = dot('groom-glint', parseFloat(sp.style.left), parseFloat(sp.style.top)); gl.textContent = '✨'; show(); };
      sp.addEventListener('pointerdown', hit);
    }
    if (S.t >= SECS || S.scores[S.step] >= 1) next();
  };
  raf = requestAnimationFrame(tick);
  // a finger on her
  let down = false;
  const move = e => {
    if (S.done || !down) return; const P = at(e); if (S.t < 0 && P.cell && P.cell.on) S.t = 0;
    const L = S.last; S.last = P; if (!L || S.t < 0) return;
    const dx = P.x - L.x, dy = P.y - L.y, d = Math.hypot(dx, dy); if (d < 1) return;
    if (S.step === 0) {                                  // wash: every part of her rubbed
      if (P.cell && P.cell.on) { P.cell.rub += d; S.bubT = (S.bubT || 0) + d; if (S.bubT > 16) { S.bubT = 0; dot('groom-bub', P.x + (Math.random() - 0.5) * 26, P.y + (Math.random() - 0.5) * 26, 14 + Math.random() * 22); } }
      S.scores[0] = Math.min(1, cells.filter(c => c.on && c.rub >= P.w * 0.05).length / (on * 0.85));
    } else if (S.step === 1) {                           // brush: with the feathers (her head is on the left)
      if (P.cell && P.cell.on) {
        if (dx > Math.abs(dy) * 0.6) { S.brushed += dx; if (Math.random() < 0.3) dot('groom-stroke', P.x, P.y, 0, 500); }
        else if (dx < -6) { pic.classList.remove('groom-ruffle'); void pic.offsetWidth; pic.classList.add('groom-ruffle'); }
      }
      S.scores[1] = Math.min(1, S.brushed / (P.w * 3.2));
    }
    show();
  };
  pic.addEventListener('pointerdown', e => { e.preventDefault(); down = true; S.last = null; try { pic.setPointerCapture(e.pointerId); } catch (x) { /* */ } const P = at(e); if (!S.done && S.t < 0 && P.cell && P.cell.on) S.t = 0; S.last = P; });
  pic.addEventListener('pointermove', move);
  const up = () => { down = false; S.last = null; };
  pic.addEventListener('pointerup', up); pic.addEventListener('pointercancel', up);
  const close = () => { if (S.closed) return; S.closed = true; cancelAnimationFrame(raf); root.remove(); };
  go.addEventListener('click', () => { const g = score(); close(); o.onGo(g); });
  skip.addEventListener('click', () => { close(); o.onSkip(); });
  x.addEventListener('click', () => { close(); if (o.onClose) o.onClose(); });
  show();
  return { el: root, close, state: () => ({ step: S.done ? 'done' : STEPS[S.step], scores: S.scores.slice(), score: score(), on, started: S.t >= 0 }),
    finish: (scores) => { S.scores = scores.slice(0, 3); S.step = 2; S.done = true; show(); } };      // (the tests: every part done, this well)
}

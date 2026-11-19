// Getting a bird ready for a show (17 Nov 2026; Audrey, of a game "a bit flat with not enough to do": "Grooming game
// first please"; "The bird on the show should be 1 at the time"). A little game over the farm, one bird alone, her own
// picture (main.js birdPortrait): three parts, each a few seconds from the first touch, each with its own tool in hand and
// its own places on her to see to (19 Nov 2026, Audrey: "the brushing should give you a little brush and the shining a
// cloth. Also would be good to have 'dirty' zones on the chicken to focus on instead of just doing it anywhere. With a
// completion bar"): wash (a sponge: rub the muddy patches away), brush (a little brush: the ruffled feathers smoothed
// from head to tail; against the feathers ruffles them and doesn't count), shine (a cloth: the dull spots polished till
// they gleam). A bar fills as the places are done. How well it went, 0 to 100, raises her chance of a rosette a little
// (game.js GROOM, showChance). No way to lose: a bird can always be entered as she is. Names and words are set as text,
// never as HTML (the tools' and the marks' drawings are this file's own).
//   openGroom({ img (a canvas: her alone, see-through round her), name, show, fee, secs, t(key, vars), chance(g) -> 0..100,
//               onGo(score), onSkip(), onClose() })  ->  { el, finish(scores), state() }
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const STEPS = ['wash', 'brush', 'shine'];
const SVG = {
  wash: '<svg viewBox="0 0 48 48"><rect x="6" y="14" width="36" height="24" rx="8" fill="#f6c84c" stroke="#b9861a" stroke-width="2.5"/><circle cx="16" cy="23" r="2.6" fill="#d9a528"/><circle cx="27" cy="29" r="3.2" fill="#d9a528"/><circle cx="34" cy="21" r="2.2" fill="#d9a528"/><circle cx="12" cy="10" r="4" fill="#fff" stroke="#9fd0f2" stroke-width="1.5"/><circle cx="22" cy="6" r="2.6" fill="#fff" stroke="#9fd0f2" stroke-width="1.5"/></svg>',
  brush: '<svg viewBox="0 0 48 48"><g transform="rotate(-40 24 24)"><rect x="20" y="24" width="8" height="22" rx="4" fill="#b9793f" stroke="#7a4a22" stroke-width="2"/><g stroke="#4a3320" stroke-width="2.6" stroke-linecap="round"><path d="M11 10v-9M15.5 9v-9M20 9v-9M24.5 9v-9M29 9v-9M33.5 9v-9M38 10v-9"/></g><rect x="7" y="8" width="34" height="17" rx="7" fill="#d9a066" stroke="#7a4a22" stroke-width="2.5"/></g></svg>',
  shine: '<svg viewBox="0 0 48 48"><path d="M7 14c6-5 11 3 17-2s11 2 17-2v24c-6 4-11-3-17 2s-11-2-17 2z" fill="#8fd0e8" stroke="#3f8fb0" stroke-width="2.5" stroke-linejoin="round"/><path d="M13 20c4-2 7 2 11 0M13 28c4-2 7 2 11 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/></svg>',
  tuft: '<svg viewBox="0 0 40 40"><g fill="none" stroke-linecap="round"><g stroke="rgba(40,25,15,.75)" stroke-width="3"><path d="M8 30l9-20M16 33l4-23M25 32l-2-21M33 28l-9-17"/></g><g stroke="rgba(255,255,255,.8)" stroke-width="1.6"><path d="M10 30l8-18M26 31l-2-18"/></g></g></svg>',
};
const icon = k => { const s = el('span', 'groom-ic'); s.innerHTML = SVG[k]; return s; };      // (this file's own drawings: no outside text)

export function openGroom(o) {
  const root = el('section', 'groom'), stage = el('div', 'groom-stage'), tip = el('p', 'groom-tip'), prog = el('div', 'groom-time'), progFill = el('i'), clock = el('span', 'groom-clock');
  const pic = el('div', 'groom-pic'), fx = el('div', 'groom-fx'), tool = el('div', 'groom-tool'), card = el('div', 'groom-card'), top = el('div', 'groom-top');
  prog.append(progFill); top.append(prog, clock); pic.append(o.img, fx, tool); stage.append(tip, top, pic);
  o.img.classList.add('groom-img');
  // the card: her name and the show, the three parts, how ready she is, her chance, Go and "as she is"
  const x = el('button', 'gicon gx groom-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Close');
  const head = el('div', 'groom-h'), hw = el('div'); hw.append(el('h2', null, o.t('groom_title', { name: o.name })), el('p', 'gsub', o.show)); head.append(hw, x);
  const steps = el('div', 'groom-steps'), tiles = {};
  for (const k of STEPS) { const s = el('div', 'groom-st'); s.dataset.step = k; s.append(icon(k), el('span', null, o.t('groom_' + k)), el('small')); tiles[k] = s; steps.append(s); }
  const rl = el('div', 'groom-row'), rv = el('span', null, '0%'); rl.append(el('span', null, o.t('groom_ready')), rv);
  const bar = el('div', 'groom-bar'), fill = el('i'); bar.append(fill);
  const cl = el('div', 'groom-row'), cv = el('span', 'groom-gain'); cl.append(el('span', null, o.t('groom_chance')), cv);
  const go = el('button', 'gbtn', o.t('groom_go', { fee: o.fee })); go.type = 'button'; go.dataset.groom = 'go';
  const skip = el('button', 'glink groom-skip', o.t('groom_skip')); skip.type = 'button'; skip.dataset.groom = 'skip';
  card.append(head, steps, rl, bar, cl, go, skip); root.append(stage, card); document.body.append(root);

  // where the bird is in her picture: a grid of cells, those well inside her
  const N = 10, cells = [];
  try {
    const c = document.createElement('canvas'); c.width = c.height = N * 4; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(o.img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let a = 0; for (let y = 0; y < 4; y++) for (let q = 0; q < 4; q++) a += d[((j * 4 + y) * c.width + i * 4 + q) * 4 + 3]; cells.push(a / 16); }
  } catch (e) { /* (a picture that can't be read: the middle of it) */ }
  let body = cells.map((a, k) => a > 200 ? k : -1).filter(k => k >= 0);                    // (cells full of her)
  if (body.length < 8) body = cells.map((a, k) => a > 70 ? k : -1).filter(k => k >= 0);
  if (body.length < 5) { body = []; for (let j = 3; j < 7; j++) for (let i = 3; i < 7; i++) body.push(j * N + i); }
  // each part's places on her: five, well apart (the same bird and show: the same places)
  let seed = 0; for (const ch of String(o.name) + String(o.show)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const SPOTS = 5, pickSpots = () => {
    const pool = body.slice(), out = [];
    while (out.length < SPOTS && pool.length) {
      let best = -1, bd = -1;
      for (let t = 0; t < 12; t++) { const k = pool[Math.floor(rnd() * pool.length)], u = (k % N + 0.5) / N, v = (Math.floor(k / N) + 0.5) / N, d = out.length ? Math.min(...out.map(s => Math.hypot(s.u - u, s.v - v))) : 1; if (d > bd) { bd = d; best = k; } }
      pool.splice(pool.indexOf(best), 1); out.push({ u: (best % N + 0.5) / N + (rnd() - 0.5) * 0.04, v: (Math.floor(best / N) + 0.5) / N + (rnd() - 0.5) * 0.04, p: 0, e: null });
    }
    return out;
  };
  const S = { step: 0, scores: [0, 0, 0], t: -1, done: false, last: null, closed: false, spots: [] };
  const SECS = o.secs || 10, R = 0.085;                    // (a place's reach, of the picture's width)
  const dot = (cls, x, y, size, life) => { const d = el('i', cls); d.style.left = x + 'px'; d.style.top = y + 'px'; if (size) { d.style.width = d.style.height = size + 'px'; } fx.append(d); if (life) setTimeout(() => d.remove(), life); return d; };
  const lay = () => {                                    // the part's marks drawn on her
    for (const e of fx.querySelectorAll('.groom-spot')) e.remove();
    S.spots = pickSpots(); const k = STEPS[S.step];
    for (const sp of S.spots) { const e = el('i', 'groom-spot groom-' + (k === 'wash' ? 'mud' : k === 'brush' ? 'tuft' : 'dull')); e.style.left = sp.u * 100 + '%'; e.style.top = sp.v * 100 + '%'; e.style.setProperty('--r', (rnd() * 60 - 30).toFixed(0) + 'deg'); if (k === 'brush') e.innerHTML = SVG.tuft; sp.e = e; fx.append(e); }
    tool.innerHTML = SVG[k]; tool.dataset.tool = k; tool.classList.remove('held'); tool.style.left = '12%'; tool.style.top = '88%';
  };
  const score = () => Math.round(100 * (S.scores[0] + S.scores[1] + S.scores[2]) / 3);
  const show = () => {
    const g = score(); rv.textContent = g + '%'; fill.style.width = g + '%';
    const a = o.chance(0), b = o.chance(g); cv.textContent = b > a ? a + '% → ' + b + '%' : a + '%';
    STEPS.forEach((k, i) => { const T = tiles[k]; T.classList.toggle('on', !S.done && i === S.step); T.classList.toggle('done', S.done || i < S.step); T.querySelector('small').textContent = S.done || i < S.step ? Math.round(S.scores[i] * 100) + '%' : ''; });
    tip.textContent = S.done ? '✨ ' + o.t('groom_done') : o.t('groom_tip_' + STEPS[S.step]);
    top.hidden = S.done; tool.hidden = S.done; root.dataset.step = S.done ? 'done' : STEPS[S.step];
    if (!S.done) progFill.style.width = Math.round(S.scores[S.step] * 100) + '%';
  };
  const next = () => {
    if (S.done) return;
    S.t = -1; S.last = null; clock.textContent = '';
    for (const b of fx.querySelectorAll('.groom-bub')) { b.classList.add('pop'); setTimeout(() => b.remove(), 400); }      // (rinsed)
    if (S.step >= 2) { S.done = true; pic.classList.add('groom-proud'); for (const e of fx.querySelectorAll('.groom-spot')) e.remove(); } else { S.step++; lay(); }
    show();
  };
  // the clock of a part: from the first touch
  let raf = 0, prev = performance.now();
  const tick = now => {
    if (S.closed) return; raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    if (S.done || S.t < 0) return;
    S.t += dt; clock.textContent = '⏱ ' + Math.max(0, Math.ceil(SECS - S.t));
    if (S.t >= SECS || S.scores[S.step] >= 1) next();
  };
  raf = requestAnimationFrame(tick);
  // the tool in hand, over her places
  const at = e => { const r = pic.getBoundingClientRect(); return { u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width }; };
  let down = false;
  const move = e => {
    if (S.done || !down) return; const P = at(e);
    tool.style.left = P.u * 100 + '%'; tool.style.top = P.v * 100 + '%';
    const L = S.last; S.last = P; if (!L) return;
    const dx = P.x - L.x, dy = P.y - L.y, d = Math.hypot(dx, dy); if (d < 1) return;
    const k = STEPS[S.step]; let near = null, nd = 9;
    for (const sp of S.spots) { if (sp.p >= 1) continue; const q = Math.hypot(sp.u - P.u, sp.v - P.v); if (q < nd) { nd = q; near = sp; } }
    if (near && nd < R * 1.5) {
      if (S.t < 0) S.t = 0;
      let add = d;
      if (k === 'brush') { if (dx > Math.abs(dy) * 0.6) add = dx; else { add = 0; if (dx < -6) { pic.classList.remove('groom-ruffle'); void pic.offsetWidth; pic.classList.add('groom-ruffle'); } } }      // (with the feathers: her head is on the left)
      if (add > 0) {
        near.p = Math.min(1, near.p + add / (P.w * (k === 'brush' ? 0.42 : 0.55)));
        near.e.style.opacity = String(1 - near.p * 0.95); near.e.style.transform = 'translate(-50%, -50%) rotate(var(--r)) scale(' + (1 - near.p * 0.35) + ')';
        S.fxT = (S.fxT || 0) + add;
        if (S.fxT > 18) { S.fxT = 0; if (k === 'wash') dot('groom-bub', P.x + (Math.random() - 0.5) * 26, P.y + (Math.random() - 0.5) * 26, 12 + Math.random() * 20, 1400); else if (k === 'brush') dot('groom-stroke', P.x, P.y, 0, 500); }
        if (near.p >= 1) { near.e.classList.add('gone'); const gl = dot('groom-glint', near.u * P.w, near.v * P.w, 0, k === 'shine' ? 0 : 900); gl.textContent = k === 'shine' ? '✨' : '✓'; if (k !== 'shine') gl.classList.add('ok'); }
        S.scores[S.step] = S.spots.reduce((a, s) => a + s.p, 0) / S.spots.length; show();
      }
    }
  };
  pic.addEventListener('pointerdown', e => { e.preventDefault(); down = true; try { pic.setPointerCapture(e.pointerId); } catch (x) { /* */ } const P = at(e); S.last = P; tool.classList.add('held'); tool.style.left = P.u * 100 + '%'; tool.style.top = P.v * 100 + '%'; });
  pic.addEventListener('pointermove', move);
  const up = () => { down = false; S.last = null; tool.classList.remove('held'); };
  pic.addEventListener('pointerup', up); pic.addEventListener('pointercancel', up);
  const close = () => { if (S.closed) return; S.closed = true; cancelAnimationFrame(raf); root.remove(); };
  go.addEventListener('click', () => { const g = score(); close(); o.onGo(g); });
  skip.addEventListener('click', () => { close(); o.onSkip(); });
  x.addEventListener('click', () => { close(); if (o.onClose) o.onClose(); });
  lay(); show();
  return { el: root, close, state: () => ({ step: S.done ? 'done' : STEPS[S.step], scores: S.scores.slice(), score: score(), on: body.length, started: S.t >= 0, spots: S.spots.map(s => [s.u, s.v, s.p]), tool: tool.dataset.tool }),
    finish: (scores) => { S.scores = scores.slice(0, 3); S.step = 2; S.done = true; for (const e of fx.querySelectorAll('.groom-spot')) e.remove(); show(); } };      // (the tests: every part done, this well)
}

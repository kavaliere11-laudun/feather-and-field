"""First-day guide, daily farm jobs, and the wheat field you sow and harvest for feed (Audrey's idea), 19 Oct 2026."""
p = 'ff.html'; s = open(p).read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, ('count', s.count(old), old[:100]); s = s.replace(old, new)

# ================================================================ rules
rep("const XP = {", """// The wheat field by the farmhouse: sow it, and a few hours later harvest it; the wheat is milled into Layers' pellets.
const FIELD = { grow: 4 * HOUR, seed: 20, yield: 60, xp: 12 };
const FIELD_GEO = { x: 2654, y: 212, w: 405, h: 219, label: [2856, 286], stand: [2856, 424], box: [2679, 236, 3034, 404] };     // the field's patch on the map (from wheat_stages.py)
// Daily farm jobs: three a day on the player's own calendar; each pays coins and XP, and all three a bonus bag of feed.
const JOB_KINDS = {
  collect: { lvl: 1, n: L => 10 + 5 * Math.min(L, 8), icon: '🥚' }, harvest: { lvl: 1, n: () => 1, icon: '🌾' }, feed: { lvl: 1, n: () => 2, icon: '🥣' },
  cuddle: { lvl: 1, n: () => 3, icon: '💗' }, hatch: { lvl: 2, n: L => 2 + Math.floor(L / 6), icon: '🐣' }, show: { lvl: 2, n: () => 1, icon: '🏅' },
  sell: { lvl: 2, n: L => 1 + Math.floor(L / 10), icon: '🪙' }, fertile: { lvl: 3, n: () => 4, icon: '🧺' }, buy: { lvl: 3, n: () => 1, icon: '🛒' },
};
const jobCoins = L => 25 + 10 * Math.min(L, MAX_LEVEL), jobXp = L => 20 + 5 * Math.min(L, MAX_LEVEL);
// The first-day guide: six small steps, each pays a few coins; old farms skip it.
const GUIDE = [{ id: 'collect', tgt: 'egg' }, { id: 'hatch', tgt: 'tab:hatch' }, { id: 'coop', tgt: 'coop' }, { id: 'wheat', tgt: 'field' }, { id: 'jobs', tgt: '#jobsBtn' }, { id: 'shows', tgt: 'tab:shows' }];
const GUIDE_COINS = 10, GUIDE_END = 50;
const XP = {""")

# ================================================================ state, saves
rep("    flags: { welcome: false, edited: false, grades: false }, farmer:",
    "    field: { sown: 0, ready: 0 }, jobs: { day: 0, list: [], bonus: false }, guide: { step: 0, done: false, did: [] },\n    flags: { welcome: false, edited: false, grades: false }, farmer:")
rep("  const fs = s.feed && typeof s.feed === 'object' ? s.feed : null;", """  // the wheat field, jobs and guide (older saves: an empty field, no jobs yet, and no guide)
  const sf = s.field && typeof s.field === 'object' ? s.field : {};
  const ready = num(sf.ready, 0, o.gt + FIELD.grow, 0); o.field = ready > 0 ? { sown: ready - FIELD.grow, ready } : { sown: 0, ready: 0 };
  const sj = s.jobs && typeof s.jobs === 'object' ? s.jobs : {};
  o.jobs = { day: int(sj.day, 0, 99991231, 0), bonus: sj.bonus === true, list: (Array.isArray(sj.list) ? sj.list : []).slice(0, 3).map(j => {
    if (!j || !Object.hasOwn(JOB_KINDS, j.k)) return null; const n = int(j.n, 1, 999, 1);
    return { k: j.k, n, p: int(j.p, 0, n, 0), got: j.got === true, c: int(j.c, 0, jobCoins(MAX_LEVEL), 0), x: int(j.x, 0, jobXp(MAX_LEVEL), 0) }; }).filter(Boolean) };
  const sg = s.guide && typeof s.guide === 'object' ? s.guide : null;
  o.guide = sg ? { step: int(sg.step, 0, GUIDE.length, 0), done: sg.done === true || int(sg.step, 0, GUIDE.length, 0) >= GUIDE.length,
    did: (Array.isArray(sg.did) ? sg.did : []).filter(x => GUIDE.some(g => g.id === x)).filter((x, i, a) => a.indexOf(x) === i) } : { step: GUIDE.length, done: true, did: [] };
  o.stats.harvests = int(s.stats && s.stats.harvests, 0, 1e7, 0);
  const fs = s.feed && typeof s.feed === 'object' ? s.feed : null;""")

# ================================================================ field, jobs and guide logic
rep("function layEgg(hen, coop) {", """/* ---------- the wheat field ---------- */
function fieldStage(gt = state.gt) {
  const f = state.field; if (!f || !f.ready) return 'soil';
  if (gt >= f.ready) return 'ripe';
  return (gt - f.sown) / FIELD.grow < .4 ? 'sprouts' : 'growing';
}
function actSow() {
  const f = state.field; if (f.ready) return false;
  if (!spend(FIELD.seed)) return false;
  f.sown = state.gt; f.ready = state.gt + FIELD.grow;
  if (!sink) { toast(t('field_sown', { t: fmtDur(realLeft(FIELD.grow)) })); farmerSendField('sow'); }
  guideDone('wheat'); changed(); return true;
}
function actHarvest() {
  const f = state.field; if (!f.ready || state.gt < f.ready) return false;
  f.sown = 0; f.ready = 0; state.feed.basic += FIELD.yield; state.stats.harvests++; gainXP(FIELD.xp);
  if (!sink) { SND.feed(); toast(t('field_harvested', { n: FIELD.yield, feed: t('feed_basic') })); farmerSendField('reap'); }
  job('harvest'); guideDone('wheat'); changed(); return true;
}
/* ---------- daily farm jobs ---------- */
function dayKey(gt) { const d = clockAt(gt); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function nextMidnight(gt) { const d = clockAt(gt), m = new Date(d); m.setHours(24, 0, 0, 0); return gt + (m - d); }
function newJobs() {
  const L = state.level, ok = Object.keys(JOB_KINDS).filter(k => JOB_KINDS[k].lvl <= L);
  const easy = ['collect', 'harvest', 'feed'], first = pick(easy), rest = ok.filter(k => k !== first);
  const kinds = [first]; while (kinds.length < 3 && rest.length) kinds.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  state.jobs = { day: dayKey(state.gt), bonus: false, list: kinds.map(k => ({ k, n: JOB_KINDS[k].n(L), p: 0, got: false, c: jobCoins(L), x: jobXp(L) })) };
  dirty = true;
}
function job(kind, n = 1) {
  const J = state.jobs; if (!J || !J.list) return;
  for (const j of J.list) if (j.k === kind && j.p < j.n) { j.p = Math.min(j.n, j.p + n); if (j.p >= j.n) emit('job', t('job_ready', { job: jobText(j) }), true, () => openSheet('jobs')); dirty = true; }
}
const jobText = j => t('job_' + j.k, { n: fmtN(j.n) });
const bestFeed = () => [...FEED_IDS].reverse().find(k => FEEDS[k].lvl <= state.level);
function actClaimJob(i) {
  const j = state.jobs.list[i]; if (!j || j.got || j.p < j.n) return false;
  j.got = true; addCoins(j.c); gainXP(j.x); if (!sink) { SND.coin(); toast(t('job_claimed', { c: fmtN(j.c), x: j.x }), true); }
  changed(); return true;
}
function actClaimBonus() {
  const J = state.jobs; if (J.bonus || J.list.length < 3 || !J.list.every(j => j.got)) return false;
  J.bonus = true; const f = bestFeed(); state.feed[f] += FEEDS[f].bag; addCoins(jobCoins(state.level)); gainXP(jobXp(state.level));
  if (!sink) { SND.coin(); toast(t('job_bonus_got', { feed: t('feed_' + f), c: fmtN(jobCoins(state.level)) }), true); }
  changed(); return true;
}
const jobsToClaim = () => state.jobs ? state.jobs.list.filter(j => !j.got && j.p >= j.n).length + (!state.jobs.bonus && state.jobs.list.length === 3 && state.jobs.list.every(j => j.got) ? 1 : 0) : 0;
/* ---------- the first-day guide ---------- */
function guideNow() { const g = state.guide; return g && !g.done && state.flags.welcome && state.farmer.look ? GUIDE[g.step] || null : null; }
function guideDone(id) {
  const g = state.guide; if (!g || g.done) return;
  if (!g.did.includes(id)) g.did.push(id);
  let moved = false;
  while (!g.done && GUIDE[g.step] && g.did.includes(GUIDE[g.step].id)) { g.step++; moved = true; addCoins(GUIDE_COINS); if (g.step >= GUIDE.length) g.done = true; }
  if (!moved) return;
  if (g.done) { addCoins(GUIDE_END); if (!sink) toast(t('guide_end', { n: GUIDE_END }), true); }
  else if (!sink) toast(t('guide_ok', { n: GUIDE_COINS }));
  dirty = true; hudCache = '';
}
function actSkipGuide() { state.guide.done = true; hudCache = ''; changed(true); }
function layEgg(hen, coop) {""")
rep("  if (gt >= state.shows.next) { createShow(); state.shows.next = gt + SHOW_EVERY; }",
    "  if (gt >= state.shows.next) { createShow(); state.shows.next = gt + SHOW_EVERY; }\n  if (state.jobs.day !== dayKey(gt)) newJobs();")

# ================================================================ hooks: actions count for jobs and the guide
rep("  if (total) { SND.eggs(total); gainXP(total * XP.egg); }", "  if (total) { SND.eggs(total); gainXP(total * XP.egg); job('collect', total); guideDone('collect'); }")
rep("  state.inc.items.push({ egg: state.basket.fertile.splice(i, 1)[0], start: state.gt }); changed();",
    "  state.inc.items.push({ egg: state.basket.fertile.splice(i, 1)[0], start: state.gt }); guideDone('hatch'); changed();")
rep("  state.stats.hatched++; state.stats.best = Math.max(state.stats.best, quality(b));", "  state.stats.hatched++; state.stats.best = Math.max(state.stats.best, quality(b)); job('hatch');")
rep("  addCoins(p); state.stats.sold++; SND.coin(); gainXP(XP.sell + p / 20);\n  state.birds = state.birds.filter(x => x.id !== b.id);",
    "  addCoins(p); state.stats.sold++; SND.coin(); gainXP(XP.sell + p / 20); job('sell');\n  state.birds = state.birds.filter(x => x.id !== b.id);", 2)
rep("  s.entry = b.id; b.entered = s.id; toast(t('entered_bird', { name: b.name })); changed();", "  s.entry = b.id; b.entered = s.id; job('show'); toast(t('entered_bird', { name: b.name })); changed();")
rep("  const lv0 = trustLvl(b); b.trust = Math.min(PR.trustAt[2], (b.trust || 0) + 1); const lv = trustLvl(b);", "  job('cuddle');\n  const lv0 = trustLvl(b); b.trust = Math.min(PR.trustAt[2], (b.trust || 0) + 1); const lv = trustLvl(b);")
rep("""function fillCoop(c, kind) {
  const room = FEEDER_CAP - feederTotal(c), n = Math.min(room, state.feed[kind]);
  if (n <= 0) return 0;""", """function fillCoop(c, kind) {
  const room = FEEDER_CAP - feederTotal(c), n = Math.min(room, state.feed[kind]);
  if (n <= 0) return 0;
  job('feed');""")
rep("  state.birds.push(b); state.shop.offers.splice(i, 1); see(b); settleIn(coop, b);", "  state.birds.push(b); state.shop.offers.splice(i, 1); see(b); settleIn(coop, b); job('buy');")
rep("function actSellFertile(id) { const i = state.basket.fertile.findIndex(e => e.id === id); if (i < 0) return;",
    "function actSellFertile(id) { const i = state.basket.fertile.findIndex(e => e.id === id); if (i < 0) return; job('fertile');")
rep("  let coins = 0; for (const e of sold) coins += fertileEggPrice(e);", "  let coins = 0; for (const e of sold) coins += fertileEggPrice(e); job('fertile', sold.length);")
rep("function openSheet(name, args) { sheetOpenedAt = performance.now();", "function openSheet(name, args) { if (state && ['coop', 'jobs', 'shows'].includes(name)) guideDone(name); sheetOpenedAt = performance.now();")

# ================================================================ the farmer goes to the field
rep("// a cuddle: in through the pen's gate, kneel by the gate;", """function farmerSendField(act) {                 // sow: scatter the seed; reap: crouch and cut
  if (!farmerReady() || (FARM.task && !['feed', 'field'].includes(FARM.task.kind)) || FARM.exitGate) return;
  FARM.task = { kind: 'field', act }; farmerRoute(FIELD_GEO.stand[0] + (Math.random() - .5) * 120, FIELD_GEO.stand[1], 'walk');
}
// a cuddle: in through the pen's gate, kneel by the gate;""")
rep("    } else if (F.task && F.task.kind === 'feed') { F.st = 'act'; F.act = 'feed'; F.actT = 2.6; F.fr = 0; F.face = -1; farmerSay('farmer_say_feed', 1.6); }",
    """    } else if (F.task && F.task.kind === 'feed') { F.st = 'act'; F.act = 'feed'; F.actT = 2.6; F.fr = 0; F.face = -1; farmerSay('farmer_say_feed', 1.6); }
    else if (F.task && F.task.kind === 'field') { F.st = 'act'; F.act = F.task.act; F.actT = 3.2; F.fr = 0; farmerSay('farmer_say_' + F.task.act, 1.8); }""")
rep("""    else if (F.act === 'feed') {
      const ph = Math.floor(F.fr * 3) % 3; F.pose = 'feed' + ph;""", """    else if (F.act === 'reap') {                              // crouched, cutting: golden bits fly
      F.pose = farmerSpr('pet0') ? 'pet' + [0, 1, 2, 1][Math.floor(F.fr * 4) % 4] : 'idle';
      if (Math.random() < dt * 12) F.grains.push({ x: F.x + F.face * 14, y: F.y - 18, vx: F.face * (20 + Math.random() * 40), vy: -70 - Math.random() * 50, t: 0, life: .6 + Math.random() * .3 });
    }
    else if (F.act === 'feed' || F.act === 'sow') {
      const ph = Math.floor(F.fr * 3) % 3; F.pose = 'feed' + ph;""")

# ================================================================ drawing: the field, its sign, the guide's arrow
rep("  const vis = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;\n  drawWind(",
    """  const vis = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  if (vis(FIELD_GEO.x + FIELD_GEO.w / 2, FIELD_GEO.y + FIELD_GEO.h / 2, 260)) { const fim = img(`img/field/wheat_${fieldStage()}.webp`); if (ready(fim)) ctx.drawImage(fim, FIELD_GEO.x, FIELD_GEO.y, FIELD_GEO.w, FIELD_GEO.h); }
  drawWind(""")
rep("""  if (vis(pp[0], pp[1], 100)) { const no = state.birds.filter(b => b.home === 'pasture' && b.offer).length;""",
    """  fieldHit = null;
  const fl = FIELD_GEO.label;
  if (vis(fl[0], fl[1], 120)) {
    const st = fieldStage(); fieldHit = fl;
    if (st === 'ripe') label(fl[0], fl[1], '🌾 ' + t('field_ripe'), t('field_tap_harvest'), 'hot');
    else if (!state.field.ready) label(fl[0], fl[1], t('field_t'), t('field_tap_sow'), 'hot');
    else label(fl[0], fl[1], t('field_t'), t('field_ready_in', { t: fmtDur(realLeft(state.field.ready - state.gt)) }), 'small');
  }
  if (vis(pp[0], pp[1], 100)) { const no = state.birds.filter(b => b.home === 'pasture' && b.offer).length;""")
rep("  drawHearts();\n  for (const a of birds) if (a.say > 0) speech(a);\n  if (farmerReady()) farmerSpeech();\n}",
    """  drawHearts();
  for (const a of birds) if (a.say > 0) speech(a);
  if (farmerReady()) farmerSpeech();
  const gs = guideNow(), gp = gs && guideTarget(gs); if (gp) guideArrow(gp[0], gp[1]);
}
let fieldHit = null;
function guideTarget(g) {                        // where on the map the guide points, if it points at the map
  const p0 = plots.find(p => p.kind === 'coop');
  if (g.tgt === 'egg') return p0 ? (p0.bubble ? [p0.bubble.x, p0.bubble.y - p0.bubble.r] : toMap(p0.f, 0, 0.3, 2.6)) : null;
  if (g.tgt === 'coop') return p0 ? toMap(p0.f, 0, 0.3, 2.6) : null;
  if (g.tgt === 'field') return [FIELD_GEO.label[0], FIELD_GEO.label[1] - 26 * uiK()];
  return null;
}
function guideArrow(x, y) {                     // a bouncing yellow arrow pointing down at the target
  ctx.save(); const K = uiK() * 1.1; ctx.translate(x, y - 16 * K - Math.abs(Math.sin(clock * 4)) * 10 * K); ctx.scale(K, K);
  ctx.beginPath(); ctx.moveTo(-9, -26); ctx.lineTo(9, -26); ctx.lineTo(9, -10); ctx.lineTo(18, -10); ctx.lineTo(0, 8); ctx.lineTo(-18, -10); ctx.lineTo(-9, -10); ctx.closePath();
  ctx.fillStyle = '#f5b92e'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0; ctx.fill();
  ctx.strokeStyle = '#a8740a'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
}
let guideSeen = -1;
function guideFocus() {                          // when a step begins, bring its target into view
  const g = guideNow(); if (!g || current || guideSeen === state.guide.step) return; guideSeen = state.guide.step;
  const p0 = plots.find(p => p.kind === 'coop');
  const tgt = g.tgt === 'field' ? FIELD_GEO.label : (g.tgt === 'egg' || g.tgt === 'coop') && p0 ? toMap(p0.f, 0, 0, 1) : null;
  if (!tgt) return;
  view.x = tgt[0] - view.vw / view.s / 2; view.y = tgt[1] - view.vh / view.s / 2; clampCam(); inertia = null;
}""")
rep("  for (const p of plots) if (p.bubble && Math.hypot(x - p.bubble.x, y - p.bubble.y) < p.bubble.r) { actCollect(p.coop); return; }",
    """  if (fieldHit && Math.abs(x - fieldHit[0]) < 90 * K && Math.abs(y - fieldHit[1]) < 30 * K) { if (fieldStage() === 'ripe') actHarvest(); else openSheet('field'); return; }
  for (const p of plots) if (p.bubble && Math.hypot(x - p.bubble.x, y - p.bubble.y) < p.bubble.r) { actCollect(p.coop); return; }""")
rep("  if (Math.hypot(x - GEOM.stall[0], y - GEOM.stall[1]) < 90) openSheet('market', { tab: 'birds' });",
    """  const fb = FIELD_GEO.box; if (x > fb[0] && x < fb[2] && y > fb[1] && y < fb[3]) { openSheet('field'); return; }
  if (Math.hypot(x - GEOM.stall[0], y - GEOM.stall[1]) < 90) openSheet('market', { tab: 'birds' });""")

# ================================================================ sheets: the field, the jobs
rep("  awards() {", """  field() {
    const f = state.field, st = fieldStage();
    const pic = h('div', { class: 'fieldpic' }, h('img', { src: `img/field/wheat_${st}.webp`, alt: '' }));
    let body;
    if (st === 'ripe') body = [h('p', { class: 'small', style: 'font-weight:700', text: t('field_is_ripe') }),
      h('button', { class: 'btn good', onclick: () => actHarvest() }, t('field_harvest'), ' · +' + FIELD.yield + ' ', t('portions'))];
    else if (f.ready) body = [h('p', { class: 'small' }, timer(f.ready, 'field_ready_in_t')), progress(f.sown, f.ready),
      h('p', { class: 'small muted', text: t(st === 'sprouts' ? 'field_st_sprouts' : 'field_st_growing') })];
    else body = [h('button', { class: 'btn', disabled: state.coins < FIELD.seed, onclick: () => actSow() }, t('field_sow'), ' · ', coinPrice(FIELD.seed))];
    return { title: t('field_t'), node: [pic, h('p', { class: 'small', text: t('field_how', { h: fmtDur(realLeft(FIELD.grow)), n: FIELD.yield, feed: t('feed_basic'), c: fmtN(Math.round(FIELD.yield / FEEDS.basic.bag * FEEDS.basic.price)) }) }),
      h('div', { class: 'card' }, body), h('p', { class: 'small muted', text: t('field_store', { n: fmtN(state.feed.basic), feed: t('feed_basic') }) })] };
  },
  jobs() {
    const J = state.jobs, all = J.list.length === 3 && J.list.every(j => j.got), f = bestFeed();
    return { title: t('jobs_t'), node: [
      h('p', { class: 'small muted' }, t('jobs_note'), ' ', timer(nextMidnight(state.gt), 'jobs_new_in')),
      h('div', { class: 'list' }, J.list.map((j, i) => h('div', { class: 'card job' + (j.got ? ' done' : '') },
        h('div', { class: 'row' }, h('span', { class: 'jobicon', text: JOB_KINDS[j.k].icon }), h('div', { class: 'grow' }, h('div', { style: 'font-weight:700', text: jobText(j) }),
          h('div', { class: 'small muted' }, coinPrice(j.c), ` · ${j.x} XP`)),
          j.got ? h('span', { class: 'tag good', text: '✓ ' + t('job_got') }) : j.p >= j.n ? h('button', { class: 'btn sm good', onclick: () => actClaimJob(i) }, t('job_claim')) : h('span', { class: 'small num', text: `${fmtN(j.p)} / ${fmtN(j.n)}` })),
        j.got ? null : h('div', { class: 'jobbar' }, h('i', { style: `width:${Math.round(j.p / j.n * 100)}%` }))))),
      h('div', { class: 'card bonus' + (J.bonus ? ' done' : '') }, h('div', { class: 'row' }, h('span', { class: 'jobicon', text: '🎁' }), h('div', { class: 'grow' },
        h('div', { style: 'font-weight:700', text: t('job_bonus') }), h('div', { class: 'small muted' }, t('job_bonus_what', { feed: t('feed_' + f) }), ' + ', coinPrice(jobCoins(state.level)))),
        J.bonus ? h('span', { class: 'tag good', text: '✓ ' + t('job_got') }) : h('button', { class: 'btn sm good', disabled: !all, onclick: () => actClaimBonus() }, t('job_claim')))),
    ] };
  },
  awards() {""")

# ================================================================ the jobs button, the guide card
rep("""      <button class="fbtn" id="flockBtn">""", """      <button class="fbtn" id="jobsBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 10l1.5 1.5L13 8.5M8.5 16l1.5 1.5L13 14.5"/></svg><span data-t="jobs_btn"></span><span class="badge" id="bJobs" hidden></span></button>
      <button class="fbtn" id="flockBtn">""")
rep("""    <div id="moveBar" hidden>""", """    <div id="guide" hidden><div class="gtop"><span id="guideStep"></span><button id="guideSkip" class="gskip"></button></div><p id="guideText"></p></div>
    <div id="moveBar" hidden>""")
rep("$('#flockBtn').addEventListener('click',", "$('#jobsBtn').addEventListener('click', () => openSheet('jobs'));\n$('#guideSkip').addEventListener('click', () => actSkipGuide());\n$('#flockBtn').addEventListener('click',")
rep("  const key = [state.coins, basketCount(), state.basketCap, fertileReady, openNoEntry, lang(), state.xp, hungry].join('|');",
    "  const gs = guideNow(), jc = jobsToClaim();\n  const key = [state.coins, basketCount(), state.basketCap, fertileReady, openNoEntry, lang(), state.xp, hungry, gs ? state.guide.step : -1, jc].join('|');")
rep("  setB('#bHatch', fertileReady); setB('#bShows', openNoEntry); setB('#bMarket', hungry);",
    """  setB('#bHatch', fertileReady); setB('#bShows', openNoEntry); setB('#bMarket', hungry); setB('#bJobs', jc);
  const gd = $('#guide'); gd.hidden = !gs;
  for (const el of document.querySelectorAll('.gpulse')) el.classList.remove('gpulse');
  if (gs) {
    $('#guideStep').textContent = t('guide_step', { i: state.guide.step + 1, n: GUIDE.length }); $('#guideSkip').textContent = t('guide_skip');
    $('#guideText').textContent = t('guide_' + gs.id);
    const el = gs.tgt.startsWith('tab:') ? document.querySelector(`#tabbar [data-tab="${gs.tgt.slice(4)}"]`) : gs.tgt.startsWith('#') ? $(gs.tgt) : null; if (el) el.classList.add('gpulse');
  }""")
# the guide brings each step's target into view, once
rep("function frame(now) {", "function frame(now) {\n  if (state && !current) guideFocus();")

# ================================================================ styles
rep("#farmBtns{position:absolute;", """#guide{position:absolute;top:calc(58px + env(safe-area-inset-top,0px));left:12px;right:12px;z-index:6;background:var(--glass-top);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid var(--glass-line);border-radius:18px;padding:9px 14px 11px;box-shadow:var(--shadow);max-width:520px;margin:0 auto}
#guide .gtop{display:flex;justify-content:space-between;align-items:center;font:600 12.5px var(--display);color:var(--meadow-deep)}
#guide p{margin:3px 0 0;font:600 15px/1.35 var(--body);color:var(--ink)}
.gskip{border:0;background:none;color:var(--ink-2);font:600 13px var(--display);text-decoration:underline;text-underline-offset:3px;padding:4px;cursor:pointer}
body:has(#guide:not([hidden])) #toasts{top:calc(150px + env(safe-area-inset-top,0px))}
.gpulse{position:relative}.gpulse::after{content:'';position:absolute;inset:-3px;border-radius:999px;border:3px solid var(--yolk);animation:gp 1.2s ease-out infinite;pointer-events:none}
#tabbar .gpulse::after{border-radius:16px}
@keyframes gp{0%{opacity:1;transform:scale(.92)}100%{opacity:0;transform:scale(1.15)}}
.fbtn{position:relative}.fbtn .badge{position:absolute;top:-6px;right:-6px}
.job .row{align-items:center}.jobicon{font-size:26px;width:40px;text-align:center;flex:none}
.job.done,.bonus.done{opacity:.72}.jobbar{height:8px;border-radius:99px;background:var(--meringue);overflow:hidden}.jobbar i{display:block;height:100%;background:var(--meadow);border-radius:99px}
.bonus{background:#fff4d3;box-shadow:inset 0 0 0 2px #f1d58a}
.fieldpic{border-radius:18px;overflow:hidden;background:var(--sage);aspect-ratio:405/219}.fieldpic img{width:100%;height:100%;object-fit:cover;display:block}
#farmBtns{position:absolute;""")

# ================================================================ words
EN = """  jobs_btn:'Jobs', jobs_t:'Today’s farm jobs', jobs_note:'Three new jobs every day.', jobs_new_in:'New jobs in {t}', job_claim:'Collect', job_got:'Done',
  job_collect:'Collect {n} eggs', job_harvest:'Harvest the wheat field', job_feed:'Fill feeders {n} times', job_cuddle:'Cuddle {n} birds', job_hatch:'Hatch {n} chicks',
  job_show:'Enter a show', job_sell:'Sell {n} birds', job_fertile:'Sell {n} fertile eggs', job_buy:'Buy a bird at the market',
  job_ready:'Job done: {job}. Collect your reward', job_claimed:'+{c} coins and {x} XP', job_bonus:'Do all three jobs', job_bonus_what:'A bag of {feed}',
  job_bonus_got:'Bonus: a bag of {feed} and {c} coins',
  field_t:'Wheat field', field_ripe:'Wheat ready', field_tap_harvest:'Tap to harvest', field_tap_sow:'Tap to sow', field_ready_in:'Ready in {t}', field_ready_in_t:'Ready in {t}',
  field_how:'Sow wheat, and {h} later it’s ready to harvest. It’s milled into {feed} for your hens: {n} portions, worth {c} coins at the market.',
  field_sow:'Sow wheat', field_sown:'Wheat sown! Ready to harvest in {t}.', field_harvest:'Harvest', field_harvested:'Harvested: +{n} portions of {feed}', portions:'portions',
  field_is_ripe:'The wheat is golden and ready.', field_st_sprouts:'The first green shoots are up.', field_st_growing:'Growing tall and green.', field_store:'In your feed store: {n} portions of {feed}.',
  farmer_say_sow:'Grow, little seeds!', farmer_say_reap:'What a harvest!',
  guide_step:'First day · {i} of {n}', guide_skip:'Skip', guide_ok:'Nice! +{n} coins', guide_end:'That’s the basics. Have fun on your farm! +{n} coins',
  guide_collect:'Your hens have laid. Tap the egg bubble above the Red Barn to collect the eggs.',
  guide_hatch:'Fertile eggs go to the Hatchery. Open it and put your best egg in the incubator.',
  guide_coop:'Tap your Red Barn to look inside: the feeder (hens only lay when fed), the nest and the breeding plan.',
  guide_wheat:'Sow the wheat field by the farmhouse. It grows into free feed for your hens.',
  guide_jobs:'Open Jobs: three small jobs a day earn extra coins and XP.',
  guide_shows:'Open Shows: enter your best bird to win rosettes and prizes.',
"""
FR = """  jobs_btn:'Tâches', jobs_t:'Les tâches du jour', jobs_note:'Trois nouvelles tâches chaque jour.', jobs_new_in:'Nouvelles tâches dans {t}', job_claim:'Récupérer', job_got:'Fait',
  job_collect:'Ramasser {n} œufs', job_harvest:'Moissonner le champ de blé', job_feed:'Remplir les mangeoires {n} fois', job_cuddle:'Câliner {n} volailles', job_hatch:'Faire éclore {n} poussins',
  job_show:'Inscrire une volaille à un concours', job_sell:'Vendre {n} volailles', job_fertile:'Vendre {n} œufs fécondés', job_buy:'Acheter une volaille au marché',
  job_ready:'Tâche terminée : {job}. Récupérez votre récompense', job_claimed:'+{c} pièces et {x} XP', job_bonus:'Faire les trois tâches', job_bonus_what:'Un sac de {feed}',
  job_bonus_got:'Bonus : un sac de {feed} et {c} pièces',
  field_t:'Champ de blé', field_ripe:'Blé mûr', field_tap_harvest:'Touchez pour moissonner', field_tap_sow:'Touchez pour semer', field_ready_in:'Prêt dans {t}', field_ready_in_t:'Prêt dans {t}',
  field_how:'Semez du blé : {h} plus tard, il est prêt à moissonner. Il est moulu en {feed} pour vos poules : {n} portions, qui valent {c} pièces au marché.',
  field_sow:'Semer du blé', field_sown:'Blé semé ! Prêt à moissonner dans {t}.', field_harvest:'Moissonner', field_harvested:'Moisson : +{n} portions de {feed}', portions:'portions',
  field_is_ripe:'Le blé est doré et prêt.', field_st_sprouts:'Les premières pousses vertes sont sorties.', field_st_growing:'Il pousse, haut et vert.', field_store:'Dans votre réserve : {n} portions de {feed}.',
  farmer_say_sow:'Poussez, petites graines !', farmer_say_reap:'Quelle moisson !',
  guide_step:'Premier jour · {i} sur {n}', guide_skip:'Passer', guide_ok:'Bravo ! +{n} pièces', guide_end:'Vous connaissez l’essentiel. Amusez-vous bien à la ferme ! +{n} pièces',
  guide_collect:'Vos poules ont pondu. Touchez la bulle d’œuf au-dessus de la grange rouge pour ramasser.',
  guide_hatch:'Les œufs fécondés vont au couvoir. Ouvrez-le et mettez votre meilleur œuf dans l’incubateur.',
  guide_coop:'Touchez la grange rouge pour regarder dedans : la mangeoire (les poules ne pondent que nourries), le nid et le plan de reproduction.',
  guide_wheat:'Semez le champ de blé près de la ferme. Il donne de la nourriture gratuite pour vos poules.',
  guide_jobs:'Ouvrez Tâches : trois petites tâches par jour rapportent pièces et XP.',
  guide_shows:'Ouvrez Concours : inscrivez votre meilleure volaille pour gagner cocardes et prix.',
"""
rep("  enter_show:'Enter a show',", EN + "  enter_show:'Enter a show',")
rep("  enter_show:'Inscrire à un concours',", FR + "  enter_show:'Inscrire à un concours',")
open(p, 'w').write(s); print('patched')

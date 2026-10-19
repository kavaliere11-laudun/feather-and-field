window.__ffDebug = {
  rich() {
    state.coins = 99999; state.xp = xpFor(12) + 100; state.level = levelOf(state.xp); state.plots = 22;
    state.feed = { basic: 400, premium: 120, show: 40 };
    const breeds = ['rir', 'sil', 'orp', 'leg', 'bra', 'sil', 'rir', 'orp', 'sil', 'leg', 'bra', 'sil', 'rir', 'sil', 'orp', 'leg', 'bra', 'sil'];
    state.coops = state.coops.slice(0, 1);
    for (let i = 1; i < breeds.length; i++) { const c = newCoop(breeds[i], i); c.nest.plain = i % 3 ? 3 : 0; if (i % 5 === 0) c.feeder.basic = 0; if (i % 7 === 0) c.feeder.basic = 8; state.coops.push(c); }
    const cols = Object.keys(SIL); let ci = 0;
    for (const c of state.coops.slice(1)) {
      for (let k = 0; k < 5; k++) {
        const sex = k === 0 ? 'r' : 'h';
        const born = k === 4 ? state.gt - 60e3 : k === 3 ? state.gt - T.young - 3600e3 : state.gt - T.adult - DAY;
        const o = { breed: c.breed, sex, traits: shopTraits(), born, home: c.id };
        if (c.breed === 'sil') o.geno = silTemplate(cols[(ci++) % cols.length]);
        const b = makeBird(o); state.birds.push(b); see(b);
      }
    }
    for (let k = 0; k < 4; k++) { const b = makeBird({ breed: breeds[k + 1], sex: k % 2 ? 'r' : 'h', traits: shopTraits(), born: state.gt - T.retire - DAY, home: 'pasture', geno: silTemplate('lavender') }); state.birds.push(b); }
    pendingLevel = 0; changed();
  },
  points() {
    const top = document.querySelector('#farm').getBoundingClientRect().top;
    const sc = (x, y) => [(x - view.x) * view.s, (y - view.y) * view.s + top];
    const m = toMap(GEOM.slots[0], 0.9, 0.6);
    const a = [...agents.values()].find(a => a.plot && a.plot.kind === 'coop' && a.sx != null && a.sy > view.y + 60 && a.sy < view.y + view.vh / view.s - 60);
    return { coop0: sc(m[0], m[1]), bird: a ? sc(a.sx, a.sy - 20) : [0, 0] };
  },
  feedBubble() { const p = plots.find(p => p.feedBubble); return p ? [(p.feedBubble.x - view.x) * view.s, (p.feedBubble.y - view.y) * view.s] : null; },
  openPasture() { openSheet('pasture'); },
  // personalities (QA): make the first rebel run off now, send the fox, start a protest, open a bird
  escapeNow() { const b = state.birds.find(b => b.pers === 'rebel' && b.home !== 'pasture' && isGrown(b)); if (!b) return null; b.out = 0; b.hide = 0; b.nextOut = state.gt - 1; rebelStep(b, state.gt); changed(); return b.name; },
  runawayAt() { const b = state.birds.find(b => b.out); const a = b && agents.get(b.id); if (!a || a.sx == null) return null; const top = document.querySelector('#farm').getBoundingClientRect().top; return [(a.sx - view.x) * view.s, (a.sy - 30 - view.y) * view.s + top, b.name]; },
  foxNow() { const e = state.epoch; state.epoch = e + (23 - clockAt(state.gt).getHours()) * 3600e3; state.fox.next = state.gt; foxVisit(state.gt); state.epoch = e; changed(); },
  protestNow() { const c = state.coops.find(c => birdsIn(c).some(b => b.pers === 'rebel')); if (!c) return null; for (const k in c.feeder) c.feeder[k] = 0; c.hungry = true; c.hungryAt = state.gt - 3 * 3600e3; changed(); return c.id; },
  protestAt() { const top = document.querySelector('#farm').getBoundingClientRect().top; return protestHits.map(([x, y, c, k]) => [(x - view.x) * view.s, (y - view.y) * view.s + top, k]); },
  openBird(pers) { const b = state.birds.find(b => b.pers === pers && b.home !== 'pasture'); if (b) openSheet('bird', { id: b.id }); return b && b.name; },
  focus(id) { focusBird(id); },
  // the farmer (QA)
  farmer() { return { x: Math.round(FARM.x), y: Math.round(FARM.y), st: FARM.st, act: FARM.act, pose: FARM.pose, task: FARM.task && FARM.task.kind, look: state.farmer.look, name: state.farmer.name, ready: farmerReady() }; },
  farmerAt() { const top = document.querySelector('#farm').getBoundingClientRect().top; return [(FARM.x - view.x) * view.s, (FARM.y - 40 - view.y) * view.s + top]; },
  setHour(h) { state.speed = 60; const d = clockAt(state.gt), n = new Date(d); n.setHours(h, 0, 0, 0); state.epoch += n - d; },
  lookAt(x, y, sc) { view.s = sc; view.x = x - view.vw / sc / 2; view.y = y - view.vh / sc / 2; clampCam(); },
  lookAtFarmer(sc) { view.s = sc; view.x = FARM.x - view.vw / sc / 2; view.y = FARM.y - 40 - view.vh / sc / 2; clampCam(); },
  // the cuddle (QA): a bird by personality, where it is on screen, the hearts
  cuddleBird(pers) { const b = state.birds.find(b => (!pers || b.pers === pers) && b.home !== 'pasture' && !b.out && !b.hide && isGrown(b)); return b ? { id: b.id, name: b.name, happy: b.happy || 0, ok: cuddleOk(b) } : null; },
  openCoop(id) { openSheet('coop', { id }); },
  cuddle(id) { const b = birdById(id); return b ? actCuddle(b) : false; },
  cuddleDbg() { const T = FARM.task; return JSON.stringify({ hearts: HEARTS.length, heartT: FARM.heartT, face: FARM.face, task: T && { face: T.face, zone: T.zone, spot: T.spot, kind: T.kind }, st: FARM.st, act: FARM.act, actT: FARM.actT, bird: T && agents.get(T.id) && (({x, y, st, t, cuddle}) => ({x, y, st, t, cuddle}))(agents.get(T.id)), fx: FARM.x, fy: FARM.y, ex: plots.find(p => p.kind === 'coop').f.ex, ey: plots.find(p => p.kind === 'coop').f.ey }); },
  greetTest(ci) { const c = state.coops[ci || 0]; FARM.task = null; FARM.path = []; FARM.exitGate = null; const [x, y] = coopFront(c); farmerGo(x, y, 'walk'); FARM.visit = c.id; return c.id; },
  decorAt(id) { const D = DECOR[id]; const top = document.querySelector('#farm').getBoundingClientRect().top; return [(D.at[0] - view.x) * view.s, (D.at[1] - 40 - view.y) * view.s + top]; },
  openMarket(tab) { openSheet('market', { tab }); },
  farmerSheet() { openSheet('farmer'); },
  farmerXY() { return [FARM.x, FARM.y, FARM.st, FARM.act, FARM.task && FARM.task.kind, FARM.path.length]; },
  penLocal(x, y) { return plots.filter(p => p.kind === 'coop' || p.kind === 'build').map(p => { const { ex, ey, c } = p.f, det = ex[0] * ey[1] - ex[1] * ey[0], dx = x - c[0], dy = y - c[1]; return [p.coop.id, (dx * ey[1] - dy * ey[0]) / det, (ex[0] * dy - ex[1] * dx) / det]; }); },
  sendFeed(ci) { const c = state.coops[ci]; FARM.task = null; FARM.exitGate = null; farmerSendFeed(c); return c.id; },
  mapToScreen(x, y) { const top = document.querySelector('#farm').getBoundingClientRect().top; return [(x - view.x) * view.s, (y - view.y) * view.s + top]; },
  hearts() { return HEARTS.length; },
  farmerTo(x, y) { FARM.x = x; FARM.y = y; FARM.tx = x; FARM.ty = y; FARM.path = []; FARM.task = null; FARM.exitGate = null; FARM.st = 'idle'; FARM.t = 30; },
  birdAt(id) { const a = agents.get(id); return a ? { x: a.x, y: a.y, sx: a.sx, sy: a.sy, st: a.st, lift: a.lift, cuddle: !!a.cuddle } : null; },
  pers() { return state.birds.map(b => [b.name, b.sex, b.pers, b.out ? 'out' : '']); },
  view() { return { s: view.s, x: view.x, y: view.y, level: state.level, xp: state.xp }; },
  scroll(f) { view.y = (GEOM.size[1] - view.vh / view.s) * f; clampCam(); },
  levelUp() { gainXP(xpFor(state.level + 1) - state.xp); },
  grades(on) { setGrades(on); },
  speed(n) { state.speed = n; },
  zoomTo(x, y, sc) { view.s = sc; view.x = x - view.vw / sc / 2; view.y = y - view.vh / sc / 2; clampCam(); },
  slot(i) { return GEOM.slots[i].c; },
  pond() { return GEOM.pond.c; },
  hatch() {
    const c = state.coops[0], bs = birdsIn(c), sire = bs.find(b => b.sex === 'r'), dam = bs.find(b => b.sex === 'h');
    state.inc.items.push({ egg: { id: state.nextId++, child: childSpec(sire, dam), sire: { name: sire.name, q: quality(sire) }, dam: { name: dam.name, q: quality(dam) }, laid: state.gt }, start: state.gt - T.incubate + 2000 });
  },
  snd: SND,
  cloud: () => ({ status: cloud.status, sent: cloud.sent.length }),
  saveNow() { save(true); },
  xp: () => state.xp,
  quiet() { for (const b of state.birds) b.nextLay = state.gt + 3600e3; },
  lay(ci) { const c = state.coops[ci]; const h = birdsIn(c).find(b => b.sex === "h" && stage(b) !== "chick"); layEgg(h, c); return [h.name, nestCount(c), shownEggs(c)]; },
  eggs(ci) { const c = state.coops[ci]; return [nestCount(c), shownEggs(c)]; },
  local(i, lx, ly) { const m = toMap(GEOM.slots[i], lx, ly); return [(m[0] - view.x) * view.s, (m[1] - view.y) * view.s]; },
  away(hours) { state.lastReal -= hours * 3600e3; },
  // QA: run a function against the game's internals (test builds only)
  inside(fn) { return fn({ get state() { return state; }, advance, actCollect, actSellPlain, actSellFertileAll, actSellFertile, actIncubate, actBuyOffer, actBuildCoop, actBuyPlot,
    actSell, actEnter, actFill, actFillAll, actBuyFeed, actSire, actRetire, actMove, actIncSlot, actBasket, coopWithSpace, basketCount, levelOf, xpFor, birdsIn, stage, quality, value, sellPrice,
    plotPrice, coopPrice, incPrice, unlocked, freePlot, plotsAllowed, incAllowed, checkTrophies, canEnter, showScoreBase, offerPrice, fertileEggPrice, feederTotal, nestCount, isGrown,
    BREEDS, FEEDS, TIERS, COOP_CAP, NEST_CAP, FEEDER_CAP, T, closeSheet, refreshShop, get current() { return current; }, tickTime, sanitize, sig,
    actCatch, actCuddle, cuddleOk, actBuyDecor, actDeluxe, dxPrice, startMove, moveTo, endMove, placeOk, decorPos, decorAtPoint, get moving() { return moving; }, navBlock, actBuyOutfit, actWearOutfit, lookAtDecor, DECOR, DECOR_IDS, OUTFITS, OUTFIT_IDS, shopXp, trustLvl, outGap, rebelHome, okSpec, protestOf, dayPart, layMult, foxVisit, rebelStep, braveIn, PERS_IDS, PR, youngAt, eff, okPers, childSpec, layEgg, makeBird, shopTraits,
    showScore, rosetteChance, whyNot, createShow, judge, SIL, silTemplate, openSheet, renderSheet,
    outsideBy, standKey, toLocal, runawayReg, rebelHome, readFarmCode, farmCode,
    actSow, actHarvest, fieldStage, actClaimJob, actClaimBonus, job, newJobs, guideNow, guideDone, actSkipGuide, FIELD, FIELD_GEO, JOB_KINDS, GUIDE, dayKey, jobsToClaim, bestFeed, plots, toMap,
    mateOf, chickOdds, outlook, actMate, actBringRooster, actKeep, pInfo, childSpec, tryHatch, adultRoosters, coopById, birdById, colourOdds, grade, actSell,
    setSink(v) { sink = v; }, get sink() { return sink; } }); },
  tapWorld(i) { const [x, y] = signHits[i]; tapAt(x, y); return [x, y, signHits.length, current && current.name]; },
  signs() { const top = document.querySelector('#farm').getBoundingClientRect().top; return signHits.map(([x, y, p]) => [p.kind, (x - view.x) * view.s, (y - view.y) * view.s + top]); },
  turnInfo() { return [...agents.values()].slice(0, 6).map(a => [a.turnT, a.face, a.faceShown, a.b && hasTurn(a.b), a.b && spriteFor(a.b, 'turn3'), a.st, a.pose]); },
  turnAt(p) { TURN_D = 1000; for (const a of agents.values()) { if (!a.b || !hasTurn(a.b)) continue; a.st = 'idle'; a.t = 5; a.hold = null; a.pose = 'farm'; a.faceShown = 1; a.face = -1; a.turnT = p * TURN_D; } },
};

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
    BREEDS, FEEDS, TIERS, COOP_CAP, NEST_CAP, FEEDER_CAP, T, closeSheet, refreshShop, get current() { return current; }, tickTime, sanitize, sig }); },
  tapWorld(i) { const [x, y] = signHits[i]; tapAt(x, y); return [x, y, signHits.length, current && current.name]; },
  signs() { const top = document.querySelector('#farm').getBoundingClientRect().top; return signHits.map(([x, y, p]) => [p.kind, (x - view.x) * view.s, (y - view.y) * view.s + top]); },
  turnInfo() { return [...agents.values()].slice(0, 6).map(a => [a.turnT, a.face, a.faceShown, a.b && hasTurn(a.b), a.b && spriteFor(a.b, 'turn3'), a.st, a.pose]); },
  turnAt(p) { TURN_D = 1000; for (const a of agents.values()) { if (!a.b || !hasTurn(a.b)) continue; a.st = 'idle'; a.t = 5; a.hold = null; a.pose = 'farm'; a.faceShown = 1; a.face = -1; a.turnT = p * TURN_D; } },
};

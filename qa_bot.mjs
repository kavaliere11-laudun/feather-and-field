// QA: a simulated player runs a fresh farm for many game days through the game's own actions, checking rules every step.
// Usage: URL=... DAYS=14 EVERY=15 node qa_bot.mjs [label]     (EVERY = minutes of game time between the player's visits)
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 } })).newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(200);
const DAYS = +(process.env.DAYS || 14), EVERY = +(process.env.EVERY || 15);
const out = await page.evaluate(([DAYS, EVERY]) => window.__ffDebug.inside(g => {
  const s = () => g.state, MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const log = [], bad = [], seen = new Set(), counts = {}, trustSeen = new Map();
  const note = (k) => { counts[k] = (counts[k] || 0) + 1; };
  const flag = (msg) => { if (!seen.has(msg)) { seen.add(msg); bad.push(`day ${(s().gt / DAY).toFixed(2)}: ${msg}`); } };
  function check() {
    const st = s();
    if (!(st.coins >= 0) || !isFinite(st.coins)) flag('coins invalid ' + st.coins);
    if (g.basketCount() > st.basketCap) flag('basket over cap ' + g.basketCount() + '/' + st.basketCap);
    if (st.inc.items.length > st.inc.slots) flag('incubator over slots');
    for (const k of ['escape', 'finds', 'fox', 'foxBrave', 'tree']) { const v = g.sink && g.sink[k]; }
    for (const c of st.coops) {
      const n = g.birdsIn(c).length; if (n > g.COOP_CAP) flag(`coop ${c.id} over cap ${n}`);
      if (g.nestCount(c) > g.NEST_CAP) flag(`nest over cap ${g.nestCount(c)}`);
      for (const k in c.feeder) if (c.feeder[k] < 0) flag('negative feeder');
      if (c.sire && !st.birds.some(b => b.id === c.sire && b.home === c.id)) flag('sire not in coop');
    }
    for (const b of st.birds) {
      for (const k in b.traits) if (!(b.traits[k] >= 1 && b.traits[k] <= 100)) flag('trait out of range ' + k + ' ' + b.traits[k]);
      if (b.home !== 'pasture' && !g.state.coops.some(c => c.id === b.home)) flag('bird in missing coop');
      if (!isFinite(g.value(b))) flag('value NaN');
      if (!g.PERS_IDS.includes(b.pers)) flag('bad personality ' + b.pers);
      if (b.sex === 'r' && b.pers === 'mum') flag('rooster good mum');
      if (b.out && b.hide) flag('out and hiding at once');
      if (b.out && b.pers !== 'rebel') flag('non-rebel out');
      if (b.out > st.gt + 3 * HOUR + 1) flag('out too long');
      if ((b.happy || 0) > st.gt + g.PR.happy + 1) flag('happy too long');
      if (!Number.isInteger(b.trust) || b.trust < 0 || b.trust > 15) flag('bad trust ' + b.trust);
      if (trustSeen.has(b.id) && b.trust < trustSeen.get(b.id)) flag('trust went down'); trustSeen.set(b.id, b.trust || 0);
      if (b.pers === 'rebel' && !b.out && !b.hide && b.happy > st.gt && b.nextOut && b.nextOut < b.happy) flag('rebel may escape while happy');
      if (b.out && b.happy > st.gt && b.pers === 'rebel' && b.happy - g.PR.happy > b.out - 3 * HOUR) flag('rebel escaped after a cuddle');
    }
    for (const k in st.feed) if (st.feed[k] < 0) flag('negative feed store');
    if (st.level !== g.levelOf(st.xp)) flag('level mismatch');
    if (st.decor.some((x, i, arr) => !g.DECOR[x] || arr.indexOf(x) !== i)) flag('bad decorations');
    if (!st.farmer.outfits.includes(st.farmer.outfit)) flag('wearing an outfit not bought');
  }
  function play() {
    const st = s();
    for (const c of st.coops) if (g.nestCount(c)) { if (g.actCollect(c) === 0 && g.basketCount() >= st.basketCap) note('collect blocked: basket full'); }
    if (g.current) g.closeSheet();
    g.actSellPlain();
    const byQ = (a, b) => (b.sire.q + b.dam.q) - (a.sire.q + a.dam.q);
    for (const e of [...st.basket.fertile].sort(byQ)) { if (st.inc.items.length >= st.inc.slots) break; g.actIncubate(e.id); note('incubated'); }
    if (st.basket.fertile.length > 8) g.actSellFertileAll(3);
    // feed
    for (const c of st.coops) if (g.feederTotal(c) < 30) {
      if (st.feed.basic < 40 && st.coins >= g.FEEDS.basic.price) { g.actBuyFeed('basic'); note('bought feed'); }
      if (st.feed.basic > 0) g.actFill(c, 'basic'); else note('could not feed (no coins)');
    }
    // cuddles, about half the time: calm a frightened coop, settle a brave bird, cheer a sulking diva, keep a rebel in
    if (Math.random() < .5) for (const c of st.coops) {
      const bs = () => g.birdsIn(c).filter(b => g.isGrown(b) && g.cuddleOk(b));
      if (c.fright > st.gt && bs().length) { const x0 = st.xp; g.actCuddle(bs()[0]); note('cuddle: calmed the fox fright'); if (c.fright > st.gt || st.xp - x0 < 5) flag('fright not calmed'); }
      const brave = bs().find(b => b.pers === 'brave');
      if (c.settle > st.gt && brave) { g.actCuddle(brave); note('cuddle: brave welcomed a newcomer'); if (c.settle > st.gt) flag('settle not ended'); }
      for (const b of bs()) if (b.pers === 'diva' && b.sex === 'h' && c.last === 'basic') { g.actCuddle(b); note('cuddle: diva'); if (g.cuddleOk(b)) flag('cuddled twice'); }
      for (const b of bs()) if (b.pers === 'rebel') { g.actCuddle(b); note('cuddle: rebel'); }
      for (const b of g.birdsIn(c)) if (b.happy > st.gt && g.actCuddle(b)) flag('cuddle allowed while happy');
    }
    // flock: one breeding rooster per coop, best one; sell the rest once grown; sell retired birds
    for (const c of st.coops) {
      const roos = g.birdsIn(c).filter(b => b.sex === 'r' && g.isGrown(b)).sort((a, b) => g.quality(b) - g.quality(a));
      if (roos.length && c.sire !== roos[0].id) g.actSire(roos[0]);
      for (const r of roos.slice(1)) { g.actSell(r); note('sold spare rooster'); }
      const hens = g.birdsIn(c).filter(b => b.sex === 'h' && g.isGrown(b)).sort((a, b) => g.quality(a) - g.quality(b));
      if (g.birdsIn(c).length >= g.COOP_CAP && hens.length >= 4 && st.inc.items.some(it => it.waiting && it.egg.child.breed === c.breed)) { g.actSell(hens[0]); note('sold weakest hen for a hatchling'); }
    }
    for (const b of st.birds.filter(b => b.home === 'pasture')) { g.actSell(b); note('rehomed retired bird'); }
    // grow: build coops for new breeds, buy land, buy hens for coops with space
    const reserve = 80;
    for (const id of Object.keys(g.BREEDS)) {
      if (!g.unlocked(id)) continue;
      const have = st.coops.filter(c => c.breed === id).length;
      if (have === 0 || (have < 2 && st.coops.length < 6)) {
        if (g.freePlot() < 0 && st.plots < g.plotsAllowed(st.level) && st.coins >= g.plotPrice() + reserve) { g.actBuyPlot(); note('bought land'); }
        if (g.freePlot() >= 0 && st.coins >= g.coopPrice(id) + reserve + 2 * g.BREEDS[id].price) { g.actBuildCoop(id); note('built ' + id + ' coop'); if (g.current) g.closeSheet(); }
      }
    }
    for (let i = st.shop.offers.length - 1; i >= 0; i--) {
      const o = st.shop.offers[i], c = g.coopWithSpace(o.breed); if (!c) continue;
      const birds = g.birdsIn(c), hasRoo = birds.some(b => b.sex === 'r');
      if (o.sex === 'r' && hasRoo) continue;
      if (st.coins >= g.offerPrice(o) + reserve) { g.actBuyOffer(i); note('bought ' + o.breed + ' ' + o.sex); }
    }
    // things to buy: once the farm is growing, spend spare coins on decorations and outfits (cheapest first), keeping a buffer
    if (st.coops.length >= 6) {
      for (const id of g.DECOR_IDS) { const D = g.DECOR[id]; if (!st.decor.includes(id) && st.level >= D.lvl && st.coins >= D.price * 2 + 500) { const x0 = st.xp; g.actBuyDecor(id); note('bought decoration ' + id); if (st.xp - x0 < g.shopXp(D.price)) flag('decoration XP missing'); } }
      for (const c of st.coops) if (!c.dx && st.coins >= g.dxPrice(c.breed) * 3 + 500) { if (g.actDeluxe(c)) note('made a coop deluxe'); }
      for (const id of g.OUTFIT_IDS) { const O = g.OUTFITS[id]; if (!st.farmer.outfits.includes(id) && st.level >= O.lvl && st.coins >= O.price * 2 + 500) { g.actBuyOutfit(id); note('bought outfit ' + id); } }
    }
    // shows
    for (const sh of st.shows.list) {
      if (sh.entry) continue;
      const el = st.birds.filter(b => g.canEnter(b, sh)).sort((a, b) => g.showScoreBase(b) - g.showScoreBase(a));
      if (el.length && st.coins >= g.TIERS[sh.tier].fee + 20) { g.actEnter(el[0], sh); note('entered ' + sh.tier); }
    }
    if (g.current) g.closeSheet();
  }
  const steps = Math.round(DAYS * DAY / (EVERY * MIN));
  let lastXp = 0, lastXpT = 0, lastDay = -1;
  for (let i = 0; i < steps; i++) {
    try { const sk = { any: false }; g.setSink(sk); g.advance(EVERY * MIN); g.setSink(null); for (const k of ['escape', 'finds', 'fox', 'foxBrave', 'tree', 'hide']) if (sk[k]) counts['ev_' + k] = (counts['ev_' + k] || 0) + sk[k]; g.checkTrophies(); check(); play(); check(); } catch (e) { flag('ERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
    const st = s();
    if (st.xp > lastXp) { lastXp = st.xp; lastXpT = st.gt; } else if (st.gt - lastXpT > 12 * HOUR) flag('no progress for 12h at level ' + st.level);
    const d = Math.floor(st.gt / DAY);
    if (d !== lastDay) { lastDay = d; log.push({ day: d, lvl: st.level, xp: st.xp, coins: Math.round(st.coins), coops: st.coops.map(c => c.breed).join(','), birds: st.birds.length, plots: st.plots, eggs: st.stats.eggs, hatched: st.stats.hatched, wins: st.stats.wins.join('/'), trophies: st.trophies.length }); }
  }
  counts.deluxe = s().coops.filter(c => c.dx).length; counts.decor = s().decor.length; counts.outfits = s().farmer.outfits.length - 1;
  counts.friends = s().birds.filter(b => g.trustLvl(b) === 3).length; counts.trusting = s().birds.filter(b => g.trustLvl(b) === 2).length; counts.trophyFriend = s().trophies.includes('m_friend');
  return { log, bad, counts };
}), [DAYS, EVERY]);
console.log(JSON.stringify(out, null, 1));
await browser.close(); console.log(errors.length ? errors.slice(0, 20).join('\n') : 'no page errors');

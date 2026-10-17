// QA: a simulated player runs a fresh farm for many game days through the game's own actions, checking rules every step.
// Usage: URL=... DAYS=14 EVERY=15 node qa_bot.mjs [label]     (EVERY = minutes of game time between the player's visits)
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, locale: process.env.LANG === 'fr' ? 'fr-FR' : 'en-GB' })).newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(200);
const DAYS = +(process.env.DAYS || 14), EVERY = +(process.env.EVERY || 15);
const out = await page.evaluate(([DAYS, EVERY]) => window.__ffDebug.inside(g => {
  const s = () => g.state, MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const log = [], bad = [], seen = new Set(), counts = {};
  const note = (k) => { counts[k] = (counts[k] || 0) + 1; };
  const flag = (msg) => { if (!seen.has(msg)) { seen.add(msg); bad.push(`day ${(s().gt / DAY).toFixed(2)}: ${msg}`); } };
  function check() {
    const st = s();
    if (!(st.coins >= 0) || !isFinite(st.coins)) flag('coins invalid ' + st.coins);
    if (g.basketCount() > st.basketCap) flag('basket over cap ' + g.basketCount() + '/' + st.basketCap);
    if (st.inc.items.length > st.inc.slots) flag('incubator over slots');
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
    }
    for (const k in st.feed) if (st.feed[k] < 0) flag('negative feed store');
    if (st.level !== g.levelOf(st.xp)) flag('level mismatch');
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
    try { g.advance(EVERY * MIN); g.checkTrophies(); check(); play(); check(); } catch (e) { flag('ERROR ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
    const st = s();
    if (st.xp > lastXp) { lastXp = st.xp; lastXpT = st.gt; } else if (st.gt - lastXpT > 12 * HOUR) flag('no progress for 12h at level ' + st.level);
    const d = Math.floor(st.gt / DAY);
    if (d !== lastDay) { lastDay = d; log.push({ day: d, lvl: st.level, xp: st.xp, coins: Math.round(st.coins), coops: st.coops.map(c => c.breed).join(','), birds: st.birds.length, plots: st.plots, eggs: st.stats.eggs, hatched: st.stats.hatched, wins: st.stats.wins.join('/'), trophies: st.trophies.length }); }
  }
  return { log, bad, counts };
}), [DAYS, EVERY]);
console.log(JSON.stringify(out, null, 1));

const O = process.env.OUT || 'r/qa2/mid';
let n = 0; const shot = async name => { await page.waitForTimeout(900); await page.screenshot({ path: `${O}_${String(++n).padStart(2, '0')}_${name}.png` }); };
const close = async () => { for (let k = 0; k < 3; k++) if (await page.locator('#sheet').isVisible()) { await page.locator('#sheetClose').click(); await page.waitForTimeout(300); } };
await page.evaluate(() => window.__ffDebug.inside(g => { if (g.current) g.closeSheet(); }));
await close(); await shot('farm');
for (const f of [0.35, 0.7, 1]) { await page.evaluate(f => window.__ffDebug.scroll(f), f); await shot('scroll' + f); }
const c0 = await page.evaluate(() => window.__ffDebug.slot(0));
for (const sc of [1.6, 3]) { await page.evaluate(([x, y, s]) => window.__ffDebug.zoomTo(x, y, s), [c0[0], c0[1], sc]); await shot('zoom' + sc); }
const pd = await page.evaluate(() => window.__ffDebug.pond()); await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y, 1.6), pd); await shot('pond');
await page.evaluate(() => window.__ffDebug.scroll(0)); await page.evaluate(() => window.__ffDebug.grades(true)); await shot('grades'); await page.evaluate(() => window.__ffDebug.grades(false));
await page.locator('#flockBtn').click(); await shot('flock'); await page.locator('#sheetBody .item').first().click(); await shot('bird'); await page.locator('#sheetBody').evaluate(el => el.scrollTop = 900); await shot('bird2'); await close();
for (const tab of ['hatch', 'shows', 'awards']) { await page.locator(`#tabbar button[data-tab="${tab}"]`).click(); await shot(tab); await close(); }
await page.evaluate(() => window.__ffDebug.away(20)); await page.waitForTimeout(1500); await shot('away'); await close();

await browser.close(); console.log(errors.length ? errors.slice(0, 20).join('\n') : 'no page errors');

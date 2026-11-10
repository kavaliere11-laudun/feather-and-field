// A message said while a card is open is seen (10 Nov 2026, Audrey, the garden's card: "I click on pick but it doesn't
// work"): ./withserver.sh node hinttest.mjs [OUT]   (LANG=fr; PORT)
// A level-5 farm, sideways, the garden open, a bed of carrots ripe, the basket full of carrots. Its card, Pick: nothing
// picked, and the message ("Your basket is full of carrots…") is on the screen, over the card, clear of the bar's buttons.
// Some carrots used: Pick picks. The farmer busy there: Pick on another bed, the wheat sown, a feeder filled: each simply
// accepted ("Instead of this message it should just accept the action"), nothing on his list. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr', OUT = process.argv[2];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: OUT ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(180000); ctx.setDefaultNavigationTimeout(180000);
await ctx.addInitScript(() => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || new Date('2026-11-10T09:00:00Z').getTime()); Date.now = () => window.__T; });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 600))); if (!c) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}&time=09:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(5) + 5; g.data.lvSeen = 5; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(1);
const set = await p.evaluate(() => { const f = window.__farm, g = f.game(); if (f.gameUI().isOpen) f.gameUI().close(); const G = g.garden(), max = 30; G.beds[0] = { crop: 'carrot', ripe: window.__T - 1000 }; G.beds[1] = { crop: 'carrot', ripe: window.__T - 1000 }; g.vegBasket().carrot = max; g.save(); return { open: g.gardenOpen(), stage: g.bedStage(0), max, placed: !!g.data.garden }; });
ok('the garden open, two beds of carrots ripe, the basket full of carrots', set.open && set.stage === 'ripe', set);
await p.evaluate(() => window.__farm.garden.tap(false)); await run(0.2);
await p.evaluate(() => document.querySelector('.gsheet button[data-pick="0"]').click()); await p.waitForTimeout(500);
const seen = () => p.evaluate(() => { const h = document.getElementById('hint'), r = h.getBoundingClientRect(), cs = getComputedStyle(h), top = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
  const over = [...document.querySelectorAll('.gbar button, .gbar > *')].map(q => q.getBoundingClientRect()).filter(q => q.width > 0 && r.right > q.left && r.left < q.right && r.bottom > q.top && r.top < q.bottom).length;
  return { text: h.textContent, op: +cs.opacity, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), onTop: top === h || h.contains(top), over, card: window.__farm.gameUI().isOpen, veg: window.__farm.game().vegBasket().carrot }; });
let h = await seen();
const pn = await p.evaluate(() => { const u = window.__farm.gameUI(); return { kind: u.isOpen && u.kind, note: (document.querySelector('.gpan-note') || {}).textContent || '' }; });
ok('Pick with the carrots\' shelf full: nothing picked, the pantry opens with "No room left for carrots…" (to sell some, or keep them)', pn.kind === 'pantry' && h.veg === set.max && (fr ? /carottes/ : /carrots/).test(pn.note), { pn, h });
await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.garden.tap(false); }); await run(0.2);
if (OUT) await p.screenshot({ path: `${OUT}/hint_full_${L}.jpg`, type: 'jpeg', quality: 90 });
await p.evaluate(() => { const g = window.__farm.game(); g.vegBasket().carrot = 0; g.save(); });
await p.evaluate(() => document.querySelector('.gsheet button[data-pick="0"]').click()); await run(0.3);
const picked = await p.evaluate(() => ({ veg: window.__farm.game().vegBasket().carrot, job: window.__farm.farmerJob(), open: window.__farm.gameUI().isOpen }));
ok('room in the basket: Pick picks, the farmer on his way, the card closed', picked.veg > 0 && picked.job && picked.job.kind === 'garden' && !picked.open, picked);
await p.evaluate(() => window.__farm.garden.tap(false)); await run(0.2);
const note = await p.evaluate(() => !!document.querySelector('.gsheet:not([hidden]) .gbusy'));
await p.evaluate(() => document.querySelector('.gsheet button[data-pick="1"]').click()); await run(0.3);
const two = await p.evaluate(() => ({ veg: window.__farm.game().vegBasket().carrot, open: window.__farm.gameUI().isOpen, list: window.__farm.jobList().length, stage: window.__farm.game().bedStage(1) }));
ok('he\'s busy at the first bed: Pick on the next is simply accepted (picked at once, the card closed, nothing on a list, no "busy" note)', two.veg > picked.veg && !two.open && two.list === 0 && two.stage !== 'ripe' && !note, { two, note });
const chores = await p.evaluate(() => { const f = window.__farm, g = f.game(), c0 = g.data.coins; const sown = f.deco.wheat.sow(); const co = g.data.coops[0]; co.feed = 0; co.fedAt = 0; g.save(); f.gameTick(window.__T); const fed = f.fillFeeder(0); return { sown, stage: g.wheatStage(), fed: !!fed, feed: g.data.coops[0].feed, list: f.jobList().length }; });
ok('and the wheat sown and a feeder filled meanwhile: both accepted at once, nothing on a list', chores.sown && chores.stage !== 'soil' && chores.fed && chores.feed > 0 && chores.list === 0, chores);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

// The keep net, the fish box, one tin a day, who bites when (9 Nov 2026, Audrey: "It needs to take time to fish all the
// different species", "Introduce more fish species"; her choices "Keep net, sell at the end", "Time of day + one tin a
// day"): ./withserver.sh node nettest.mjs   (LANG=fr; PORT)
// A level-8 farm. Twenty fish, ten a water. Three fish landed: in the keep net, no coins yet; a legendary one: its photo
// paid at once, not in the net. The net's card: three rows, Keep on one, Sell: the other two paid, the kept one in the
// fish box, the net empty. An order for a fish: ready from the box; delivered: the box empty. A tin a day: the second
// refused, the dock's button says tomorrow; the next day: one more. Who bites: at midday never the morning's or the
// evening's rare fish nor the legendary one, the midday one yes; in the morning the morning's; the legendary one once all
// the others are in. The save's check: a net and a box tampered with come back clean. The Book: 20 pages, a rare one not
// caught says when it bites. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(180000); ctx.setDefaultNavigationTimeout(180000);
await ctx.addInitScript(() => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || new Date('2026-11-09T12:00:00Z').getTime()); Date.now = () => window.__T; });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 600))); if (!c) fails++; };
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}&time=12:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(8) + 5; g.data.lvSeen = 8; g.data.coins = 500; g.fishBag().gift = true; g.fishBag().worms = 5; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const kinds = await p.evaluate(() => { const f = window.__farm, g = f.game(), R = f.fishRules(); const by = w => Object.keys(R).filter(k => R[k].water === w); return { n: Object.keys(R).length, pond: by('pond').length, river: by('river').length, rare: Object.keys(R).filter(k => R[k].rare === 1).length, legend: Object.keys(R).filter(k => R[k].rare === 2).length, names: Object.keys(R).every(k => g.fishName(k) && !/^fish_/.test(g.fishName(k))) }; });
ok('twenty fish, ten a water, six rare, two legendary, each with its name', kinds.n === 20 && kinds.pond === 10 && kinds.river === 10 && kinds.rare === 6 && kinds.legend === 2 && kinds.names, kinds);
// ---- landed: into the net
const land = await p.evaluate(() => { const g = window.__farm.game(), c0 = g.data.coins, out = [];
  for (const [id, cm] of [['roach', 20], ['bream', 40], ['sunfish', 12]]) { g.bite = { id, cm, water: 'pond', rare: 0 }; out.push(g.landFish()); }
  const c1 = g.data.coins; g.bite = { id: 'big_bertha', cm: 90, water: 'pond', rare: 2 }; const leg = g.landFish();
  return { paid: c1 - c0, net: g.fishNet(), worth: out.map(r => r.worth), coins: out.map(r => r.coins), leg: { coins: leg.coins, net: leg.net }, photo: g.data.coins - c1 }; });
ok('three fish landed: in the keep net, no coins yet, each with what it\'s worth', land.paid === 0 && land.net.length === 3 && land.coins.every(c => c === 0) && land.worth.every(w => w > 0), land);
ok('a legendary one: its photo paid at once (300), not in the net', land.photo === 300 && land.net.length === 3, land);
// ---- the net's card
await p.evaluate(() => window.__farm.catchCard());
const sheet = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); return s ? { kind: window.__farm.gameUI().kind, rows: s.querySelectorAll('.gcatch-r').length, sell: (s.querySelector('button[data-catch=sell]') || {}).textContent, text: s.innerText.slice(0, 400) } : null; });
let sh = await sheet();
ok('the keep net\'s card: three fish, each with Keep, and Sell with the total', sh && sh.kind === 'catch' && sh.rows === 3 && sh.sell.includes(String(land.worth.reduce((a, c) => a + c, 0))), sh);
await p.evaluate(() => document.querySelector('.gsheet button[data-keep="2"]').click());
sh = await sheet();
ok('Keep on the pumpkinseed: the total without it', sh.sell.includes(String(land.worth[0] + land.worth[1])) && (fr ? /Gardé/ : /Kept/).test(sh.text), sh);
const c0 = await p.evaluate(() => window.__farm.game().data.coins);
await p.evaluate(() => document.querySelector('.gsheet button[data-catch=sell]').click());
const sold = await p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, net: g.fishNet().length, box: g.fishBox(), open: window.__farm.gameUI().isOpen, hint: document.getElementById('hint').textContent }; });
ok('Sell: the other two paid, the kept one in the fish box, the net empty, "2 fish sold"', sold.coins === c0 + land.worth[0] + land.worth[1] && sold.net === 0 && sold.box.length === 1 && sold.box[0][0] === 'sunfish' && /2/.test(sold.hint), sold);
// ---- an order for a fish: from the box
const ord = await p.evaluate(() => { const g = window.__farm.game(); g.orderBook().list = [{ id: 'oT', who: 'finch', t: window.__T, items: { fish: 1 }, got: {} }]; g.save(); const o = g.data.orders.list[0], ready = g.orderReady(o), r = g.deliverOrder('oT'); return { ready, r: !!r, box: g.fishBox().length }; });
ok('an order for a fish: ready from the box; delivered: the box empty', ord.ready && ord.r && ord.box === 0, ord);
// ---- a tin a day
const tin = await p.evaluate(() => { const f = window.__farm, g = f.game(), a = g.buyWorms(), b2 = g.buyWorms(); f.dockCard(); const q = document.querySelector('.gsheet button[data-fish=tin]'), d = { a: !!a, b: b2, dis: q && q.disabled, text: q && q.textContent }; f.gameUI().close();
  window.__T += 24 * 3600e3; const c = g.buyWorms(); return { ...d, next: !!c, worms: g.worms() }; });
ok('a tin a day: the second refused, the dock\'s button "another tomorrow"; the next day one more', tin.a && tin.b === null && tin.dis && (fr ? /demain/ : /tomorrow/).test(tin.text) && tin.next, tin);
// ---- who bites when
const bites = await p.evaluate(() => { const g = window.__farm.game(), f = g.fishBag(); const cast = (w, hour, n) => { const s = new Set(); for (let i = 0; i < n; i++) { f.worms = 5; const r = g.castWorm(w, window.__T, Math.random, hour); s.add(r.id); g.loseFish(); } return [...s]; };
  const noon = cast('pond', 12, 500), am = cast('pond', 7, 500), eve = cast('river', 19, 500);
  for (const k of Object.keys(window.__farm.fishRules())) if (k !== 'big_bertha' && window.__farm.fishRules()[k].water === 'pond') f.got[k] = f.got[k] || [1, window.__farm.fishRules()[k].cm[0]];
  const all = cast('pond', 12, 900); f.worms = 5; g.save(); return { noon, am, eve, all }; });
ok('at midday in the pond: the pumpkinseed, never the golden tench, the koi or Big Bertha', bites.noon.includes('sunfish') && !bites.noon.some(k => ['golden_tench', 'koi', 'big_bertha'].includes(k)) && bites.noon.length === 7, bites.noon);
ok('early morning: the golden tench; an evening on the river: the grayling, not the trouts', bites.am.includes('golden_tench') && !bites.am.includes('sunfish') && bites.eve.includes('grayling') && !bites.eve.some(k => ['brown_trout', 'rainbow_trout', 'old_snapjaw'].includes(k)), { am: bites.am, eve: bites.eve });
ok('every other pond fish caught: Big Bertha bites', bites.all.includes('big_bertha'), bites.all);
// ---- the Book
const book = await p.evaluate(() => { const f = window.__farm, u = f.gameUI(); f.bookOpen('fish'); const s = document.querySelector('.gsheet:not([hidden])'), pg = id => (s.querySelector(`.gfishpage[data-fish="${id}"]`) || {}).innerText || ''; const r = { n: s.querySelectorAll('.gfishpage').length, trout: pg('brown_trout'), snap: pg('old_snapjaw'), roach: pg('roach') }; u.close(); return r; });
ok('the Book: 20 fish pages; a rare one not caught says when it bites, the legendary one "once every other fish here is caught", a caught one neither', book.n === 20 && (fr ? /matin/ : /morning/).test(book.trout) && (fr ? /tous les autres/ : /every other fish/).test(book.snap) && !/🕒/.test(book.roach), book);
// ---- the save's check
await p.evaluate(() => { const g = window.__farm.game(), f = g.fishBag(); f.net = [['big_bertha', 90], ['rudd', 999], ['nope', 10], ['rudd', 20], 'x', ['rudd', 20.5]]; f.box = Array.from({ length: 30 }, () => ['roach', 15]); f.tin = '99991231'; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const chk = await p.evaluate(() => { const g = window.__farm.game(); return { net: g.fishNet(), box: g.fishBox().length, tin: g.fishBag().tin || null, edited: g.edited, max: g.shelf('fish') }; });
ok('the save\'s check: only real fish of real sizes in the net (never a legendary one), the box no more than 12, no tin from the future', JSON.stringify(chk.net) === '[["rudd",20]]' && chk.box === chk.max && chk.tin === null, chk);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

// The pantry (10 Nov 2026, Audrey: "I should be offered to keep it sell I need a storage"; "If the eggs are sold instantly,
// how do I collect them for orders ? They should go to the storage too until u decide to sell or not"; "One pantry",
// "Limited ... bigger as levels are going up", eggs "Straight to storage"): ./withserver.sh node pantrytest.mjs  (LANG=fr; PORT)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(180000); ctx.setDefaultNavigationTimeout(180000);
await ctx.addInitScript(() => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || new Date('2026-11-09T10:00:00Z').getTime()); Date.now = () => window.__T; });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 700))); if (!c) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); };
const shut = () => p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); });
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}&time=10:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(4) + 5; g.data.lvSeen = 4; g.orders(); g.data.orders.list = []; g.data.orders.next = Date.now() + 9e8; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(1); await shut();
// ---- eggs collected: to the pantry, no coins yet, XP at once; the Pantry button has a dot
const c0 = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; c.eggs = 5; c.bonus = 4; c.lt = []; g.save(); return { coins: g.data.coins, xp: g.data.xp, price: g.eggPrice(c) }; });
const r1 = await p.evaluate(() => { const f = window.__farm, g = f.game(); const r = g.collect(g.data.coops[0].id); g.save(); f.gameUI().refresh(); const P = g.pantryBag(); return { r: { n: r.n, kept: r.kept, sold: r.sold, coins: r.coins, xp: r.xp }, coins: g.data.coins, xp: g.data.xp, eggs: P.eggs, val: P.val, text: g.soldText(r), dot: !f.gameUI().pdot.hidden, btn: document.querySelector('.gpanbtn').getAttribute('aria-label') }; });
ok('5 eggs collected: all 5 in the pantry with what they\'re worth, no coins yet, the XP at once', r1.r.kept === 5 && r1.r.sold === 0 && r1.coins === c0.coins && r1.xp > c0.xp && r1.eggs === 5 && r1.val === 5 * c0.price + 4, { c0, r1 });
ok(fr ? 'said: "5 œufs dans votre garde-manger"; the Garde-manger button, with a dot' : 'said: "5 eggs to your pantry"; the Pantry button, with a dot', (fr ? /5 œufs dans votre garde-manger/ : /5 eggs to your pantry/).test(r1.text) && r1.dot && (fr ? /garde-manger/ : /pantry/).test(r1.btn), r1);
// ---- the pantry's card: the eggs' shelf, Sell; sold: the coins, the shelf empty
await p.tap('.gpanbtn'); await run(0.2);
let S = await p.evaluate(() => { const u = window.__farm.gameUI(); return { kind: u.isOpen && u.kind, rows: [...document.querySelectorAll('.gpan-r')].map(r => ({ k: r.dataset.shelf, t: r.textContent, sell: !!r.querySelector('[data-sell]') })), dot: u.pdot.hidden, first: document.querySelector('.gsheet:not([hidden]) .gnote').textContent }; });
ok('the Pantry button: its card, the eggs\' shelf "5 / 24" with a Sell button, the dot gone, a first word on what to do', S.kind === 'pantry' && S.rows[0].k === 'eggs' && /5 \/ 24/.test(S.rows[0].t) && S.rows[0].sell && S.dot && (fr ? /Vendre/ : /Sell/).test(S.first), S);
await p.evaluate(() => document.querySelector('.gpan-r[data-shelf=eggs] [data-sell]').click()); await run(0.2);
let S2 = await p.evaluate(() => { const g = window.__farm.game(), P = g.pantryBag(); return { coins: g.data.coins, eggs: P.eggs, val: P.val, hint: document.getElementById('hint').textContent, open: window.__farm.gameUI().kind, sell: !!document.querySelector('.gpan-r[data-shelf=eggs] [data-sell]') }; });
ok('Sell: the coins they were worth (price and stars), the shelf empty, said, the card still there', S2.coins === c0.coins + r1.val && S2.eggs === 0 && S2.val === 0 && /\d/.test(S2.hint) && S2.open === 'pantry' && !S2.sell, S2);
await shut();
// ---- an order that wants eggs: they're kept back; the order goes from the pantry
const O = await p.evaluate(() => { const f = window.__farm, g = f.game(); const o = { id: 'ot', who: 'potts', items: { eggs: 4 }, got: {}, t: Date.now() }; g.data.orders.list = [o]; const c = g.data.coops[0]; c.eggs = 6; c.bonus = 0; c.lt = []; g.collect(c.id); g.save(); return { id: o.id, ready: g.orderReady(o), rows: g.pantry().find(r => r.k === 'eggs'), coins: g.data.coins }; });
ok('an order for 4 eggs, 6 collected: the order ready; the pantry keeps 4 for it and offers the other 2', O.ready && O.rows.n === 6 && O.rows.kept === 4 && O.rows.coins > 0, O);
await p.evaluate(() => window.__farm.pantrySheet()); await run(0.1);
let K = await p.evaluate(() => { const r = document.querySelector('.gpan-r[data-shelf=eggs]'); return { t: r.textContent, btn: r.querySelector('[data-sell]').textContent }; });
ok(fr ? 'its shelf says "4 gardés pour les commandes", the button "Vendre 2"' : 'its shelf says "4 kept for orders", the button "Sell 2"', (fr ? /4 gardés pour les commandes/ : /4 kept for orders/).test(K.t) && (fr ? /Vendre 2/ : /Sell 2/).test(K.btn), K);
await p.evaluate(() => document.querySelector('.gpan-r[data-shelf=eggs] [data-sell]').click()); await run(0.1);
let K2 = await p.evaluate(() => { const g = window.__farm.game(), r = document.querySelector('.gpan-r[data-shelf=eggs]'), b2 = r.querySelector('[data-sell]'); return { eggs: g.pantryBag().eggs, all: b2 && b2.dataset.all, btn: b2 && b2.textContent }; });
ok('sold: 4 left, and only "Sell anyway" for those', K2.eggs === 4 && K2.all === '1', K2);
const D = await p.evaluate(id => { const f = window.__farm, g = f.game(); f.gameUI().close(); const c0 = g.data.coins, r = g.deliverOrder(id); return { r: !!r, eggs: g.pantryBag().eggs, val: g.pantryBag().val, paid: g.data.coins - c0 }; }, O.id);
ok('the order delivered: its 4 eggs gone from the pantry, the order\'s coins paid', D.r && D.eggs === 0 && D.val === 0 && D.paid > 0, D);
// ---- a full shelf: eggs that don't fit are sold at once, said
const F = await p.evaluate(() => { const f = window.__farm, g = f.game(), P = g.pantryBag(), c = g.data.coops[0]; P.eggs = g.shelf('eggs') - 2; P.val = P.eggs * 6; c.eggs = 5; c.bonus = 0; c.lt = []; const c0 = g.data.coins, r = g.collect(c.id); g.save(); f.gameUI().refresh(); return { kept: r.kept, sold: r.sold, got: g.data.coins - c0, price: g.eggPrice(c), eggs: P.eggs, max: g.shelf('eggs'), text: g.soldText(r), dot: !f.gameUI().pdot.hidden, full: g.pantryFull() }; });
ok('the eggs\' shelf 2 short of full, 5 collected: 2 kept, 3 sold at once, said ("Pantry full"), a dot on the button', F.kept === 2 && F.sold === 3 && F.got === 3 * F.price && F.eggs === F.max && (fr ? /plein/ : /full/).test(F.text) && F.dot && F.full === 1, F);
// ---- the garden: the carrots' shelf full: Pick opens the pantry with a word, nothing picked; sold: room again
const G = await p.evaluate(() => { const f = window.__farm, g = f.game(); f.gameUI().close(); g.garden().veg.carrot = g.shelf('carrot'); const bd = g.garden().beds[0]; bd.crop = 'carrot'; bd.ripe = 1; g.save(); f.garden.pick(0); const u = f.gameUI(); return { kind: u.isOpen && u.kind, note: (document.querySelector('.gpan-note') || {}).textContent, veg: g.vegBasket().carrot, max: g.shelf('carrot'), bed: g.garden().beds[0].crop }; });
ok('carrots ripe, their shelf full: Pick opens the pantry with "No room left for carrots…", the bed untouched', G.kind === 'pantry' && (fr ? /carottes/ : /carrots/).test(G.note || '') && G.veg === G.max && G.bed === 'carrot', G);
await p.evaluate(() => document.querySelector('.gpan-r[data-shelf=carrot] [data-sell]').click()); await run(0.1);
const G2 = await p.evaluate(() => { const f = window.__farm, g = f.game(); const c = g.vegBasket().carrot; f.gameUI().close(); const r = f.garden.pick(0); return { c, r, after: g.vegBasket().carrot }; });
ok('the carrots sold from there (3 coins each): room again, and Pick picks', G2.c === 0 && G2.after > 0, G2);
// ---- shelves grow with the level; the save's checks
const Z = await p.evaluate(() => { const f = window.__farm, g = f.game(), at = lv => { g.data.xp = f.xpFor(lv) + 1; return g.shelf('eggs'); }; const a = at(5), b2 = at(10), c = at(30); g.data.shelves = true; const d = g.shelf('eggs'); delete g.data.shelves; at(4); return { a, b2, c, d }; });
ok('the eggs\' shelf: 24 up to level 5, 30 at level 10, 54 at level 30; half as much again with the bigger shelves', Z.a === 24 && Z.b2 === 30 && Z.c === 54 && Z.d === 81, Z);
await p.evaluate(() => { const g = window.__farm.game(); g.data.pantry = { eggs: 1e6, val: 1e9, honey: -4, seen: 'yes', x: 1 }; g.data.shelves = 'yes'; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const V = await p.evaluate(() => { const d = window.__farm.game().data; return { p: d.pantry, sh: d.shelves }; });
ok('a save with silly pantry numbers: put right (eggs no more than a shelf can ever hold, their worth no more than eggs fetch, no negative honey, no shelves unbought)', V.p.eggs <= 200 && V.p.val <= V.p.eggs * 40 && V.p.honey === 0 && !('x' in V.p) && V.sh === undefined, V);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

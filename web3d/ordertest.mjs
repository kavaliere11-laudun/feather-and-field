// Village orders (7 Nov 2026, Audrey: "Just feeding the chickens is not enough"; her choice: "Village orders"): ./withserver.sh
// node ordertest.mjs [OUT]   (LANG=fr; W, H: the screen, e.g. W=874 H=402; PORT)
// A new farm on a fake clock. Level 2: no orders, no basket button. Level 3: its card says the village orders have come;
// two orders arrive ("2 new village orders"), the basket button with them; their card: each villager's name, what they
// do and say, what they want, what it pays (coins and XP), "Not this one", no Deliver yet. Eggs collected: the first
// order's eggs set aside for it ("🧺 5 for …", not sold), the rest sold; ready: the basket's number, "Ready!" over the
// farm stall. Deliver: the farmer off to the stall with the basket, then paid (its coins and XP, a surprise if it has
// one), the order gone, the next one a while later. Not this one: what was set aside for it sold, gone. A fish for an
// order that wants one: no coins for it, set aside. Three hours on: new orders, never more than three. A reload keeps
// them, unflagged; a save changed outside the game (an unknown villager, too many eggs, more set aside than asked, a
// fourth order) is checked and flagged. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/ordertest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
const T0 = new Date('2026-11-07T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/order_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const settle = () => p.evaluate(() => document.getAnimations().forEach(a => a.finish()));
const kind = () => p.evaluate(() => window.__farm.gameUI().isOpen ? window.__farm.gameUI().kind : null);
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheetT = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); return s ? s.innerText : ''; });
const G = () => p.evaluate(() => { const g = window.__farm.game(), d = g.data; return { level: g.level, coins: d.coins, xp: d.xp, grain: d.grain || 0, orders: d.orders ? JSON.parse(JSON.stringify(d.orders)) : null, open: g.ordersOpen(), ready: g.ordersReady(), btn: !document.querySelector('.gordbtn').hidden, dot: document.querySelector('.gordbtn .gdot').hidden ? '' : document.querySelector('.gordbtn .gdot').textContent, edited: g.edited }; });
const T = fr ? { lvl: /commandes du village/i, two: /2 nouvelles commandes du village/, deliver: /Livrer le panier/, decline: /Pas celle-ci/, pay: /pièces · \d+ XP/, set: /🧺 \d+ pour/, way: /porte le panier/, done: /Panier livré pour .* : \+\d+ pièces, \+\d+ XP/, ready: /Prêt/, fish: /Mis de côté pour/, declined: /Refusée/ }
  : { lvl: /village orders/i, two: /2 new village orders/, deliver: /Deliver the basket/, decline: /Not this one/, pay: /coins · \d+ XP/, set: /🧺 \d+ for/, way: /taking the basket/, done: /Delivered to .*: \+\d+ coins, \+\d+ XP/, ready: /Ready/, fish: /For .*’s order/, declined: /Turned down/ };

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 20; g.data.lvSeen = 2; g.fishBag().gift = true; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(1.5);
let s = await G();
ok('level 2: no village orders yet, no basket button', s.level === 2 && !s.open && !s.btn && !(s.orders && s.orders.list.length), s);
// level 3
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 60; g.save(); }); await run(2.5);
await p.waitForTimeout(1600); await p.evaluate(() => window.__farm.showNews()); await run(0.3);
const lv = await sheetT();
ok('level 3: its card says the village orders have come', (await kind()) === 'levelup' && T.lvl.test(lv), lv.slice(0, 400));
await p.evaluate(() => window.__farm.gameUI().close()); await run(1.5);
s = await G();
const h1 = await hintT();
ok('two orders arrive, "2 new village orders"; the basket button with them', s.open && s.orders && s.orders.list.length === 2 && T.two.test(h1) && s.btn && !s.dot, { s, h1 });
await p.evaluate(() => { for (const id of ['o1', 'o2']) { const g = window.__farm.game(), o = g.data.orders.list.find(x => x.id === id); o.items = id === 'o1' ? { eggs: 5 } : { eggs: 4 }; o.got = {}; } window.__farm.game().save(); });      // (the same each run)
await p.evaluate(() => document.querySelector('.gordbtn').click()); await run(0.2); await settle();
let t = await sheetT();
const cards = await p.evaluate(() => [...document.querySelectorAll('.gsheet .gorder')].map(c => ({ id: c.dataset.order, deliver: !!c.querySelector('[data-ord=deliver]'), decline: !!c.querySelector('[data-ord=decline]') })));
const who = s.orders.list.map(o => o.who), names = await p.evaluate(w => w.map(v => window.__farm.game().villagerName(v)), who);
ok('their card: each villager\'s name and what they say, what they want, what it pays; "Not this one", no Deliver yet', cards.length === 2 && cards.every(c => !c.deliver && c.decline) && names.every(n => t.includes(n)) && T.pay.test(t) && T.decline.test(t) && /[“«„].+[”»“]/.test(t), { cards, t: t.slice(0, 500) });
await shoot('1_orders');
await p.evaluate(() => window.__farm.gameUI().close());
// eggs: the first order's set aside
const c0 = (await G()).coins;
const col = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; c.eggs = 7; c.lt = []; c.bonus = 0; const r = g.collect(c.id); return { r, text: g.soldText(r), price: g.eggPrice(c) }; });
s = await G();
ok('7 eggs collected: 5 set aside for the first order ("🧺 5 for …"), 2 for the second... none sold', col.r.toOrder === 7 && T.set.test(col.text) && s.coins === c0 && s.orders.list[0].got.eggs === 5 && s.orders.list[1].got.eggs === 2, { col, s });
await p.evaluate(() => { window.__farm.gameUI().refresh(); }); await run(0.3);
s = await G();
ok('ready: the basket\'s number 1', s.ready === 1 && s.dot === '1', s);
const st = await p.evaluate(() => window.__farm.orders.stall());
await p.evaluate(S => { const f = window.__farm; f.lookAt(S.mid[0], S.mid[1], 2.6); f.draw(); }, st); await run(0.3);
const bub = await p.evaluate(() => window.__farm.orders.bubble());
ok('"Ready!" over the farm stall', bub && T.ready.test(bub), bub);
await shoot('2_ready');
// deliver
await p.evaluate(() => document.querySelector('.gordbtn').click()); await run(0.2); await settle();
const c1 = (await G()).coins, x1 = (await G()).xp, pay = await p.evaluate(() => { const g = window.__farm.game(); return g.orderPayOf(g.data.orders.list[0]); });
await p.evaluate(() => document.querySelector('.gsheet [data-ord=deliver]').click()); await run(0.3);
const way = await hintT(), run1 = await p.evaluate(() => !!window.__farm.orders.run());
ok('Deliver: the farmer off to the stall with the basket', run1 && T.way.test(way) && !(await kind()), way);
let near = 99;
for (let i = 0; i < 90; i++) { await run(0.5); const q = await p.evaluate(S => { const L = window.__farm.farmer(); return { d: Math.hypot(L.pos.x - S.front[0], L.pos.z - S.front[1]), pail: !!L.f.want.props.pail, run: !!window.__farm.orders.run() }; }, st); near = Math.min(near, q.d); if (!q.run) break; }
s = await G();
const done = await hintT();
ok('he got to the stall; paid: its coins (a surprise\'s too) and XP, the order gone, the next one a while later', near < 1.2 && s.coins >= c1 + pay.coins && s.xp === x1 + pay.xp && s.orders.list.length === 1 && s.orders.done === 1 && T.done.test(done) && s.orders.next >= (await p.evaluate(() => window.__T)) + 25 * 60e3, { near, s, pay, done });
await shoot('3_paid');
// not this one: its eggs sold
const c2 = (await G()).coins;
await p.evaluate(() => document.querySelector('.gordbtn').click()); await run(0.2); await settle();
await p.evaluate(() => document.querySelector('.gsheet [data-ord=decline]').click()); await run(0.3);
s = await G();
ok('Not this one: the 2 eggs set aside for it sold, the order gone', s.coins === c2 + 12 && s.orders.list.length === 0 && T.declined.test(await hintT()), { s, h: await hintT() });
await p.evaluate(() => window.__farm.gameUI().close());
// time: new orders, never more than three
await p.evaluate(() => { window.__T += 12 * 3600e3; sessionStorage.setItem('__T', window.__T); }); await run(1.5);
s = await G();
ok('hours later: new orders, three at most', s.orders.list.length === 3, s.orders.list.map(o => o.who));
// a fish for an order that wants one
const fishR = await p.evaluate(() => { const g = window.__farm.game(), o = g.data.orders.list[0]; o.items = { fish: 1 }; o.got = {}; g.save(); g.bite = { id: 'roach', cm: 20, water: 'pond', rare: 0 }; const c = g.data.coins, r = g.landFish(); return { coins: g.data.coins - c, r, got: o.got.fish }; });
ok('a fish caught while an order wants one: set aside for it, no coins', fishR.coins === 0 && fishR.got === 1 && fishR.r.order && fishR.r.coins === 0, fishR);
const fc = await p.evaluate(r => { window.__farm.gameUI().fishCard(r, () => {}); const t = document.querySelector('.gsheet').innerText; window.__farm.gameUI().close(); return t; }, fishR.r);
ok('its card says it\'s for the order', T.fish.test(fc), fc.slice(0, 300));
// a reload: kept, unflagged
const before = JSON.stringify((await G()).orders);
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
s = await G();
ok('a reload: the orders as they were, unflagged', JSON.stringify(s.orders) === before && !s.edited, { s, before });
// a save changed outside
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); const L = raw.d.orders.list; L[0].who = 'evil'; L[1].items = { eggs: 999 }; L[2].got = { eggs: 50 }; L[2].items = { eggs: 6 }; L.push({ id: 'o99', who: 'tom', t: 1, items: { grain: 10 }, got: {} }); raw.d.orders.next = window.__T + 3 * 3600e3; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
s = await G();
ok('a save changed outside the game: checked (the unknown villager and the impossible order gone, no more set aside than asked, three at most) and flagged', s.edited && s.orders.list.length <= 3 && s.orders.list.some(o => o.id === 'o5' && o.got.eggs === 6) && !s.orders.list.some(o => ['o3', 'o4', 'o99'].includes(o.id) || o.who === 'evil'), s);      // (and a new order may come along as it opens)
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

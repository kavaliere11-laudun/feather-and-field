// More varied village orders (15 Nov 2026, Audrey: "a bigger diversity in the village orders"): ./withserver.sh node ordmixtest.mjs [OUT]
// (below: vegtest's own start) The five new vegetables and the beds up to ten (15 Nov 2026, Audrey: "extend the fields to grow vegetables. Introduce new
// ones and it becomes a real part of the game"): ./withserver.sh node vegtest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A farm on a fake clock. Level 5: the sow card offers the first three and says lettuce comes at level 6; a sunflower can't
// be sown. Level 30 with coins: beds bought up to ten (the seventh starts a third row), each vegetable sown, grown and
// picked into the pantry (its shelf, its price, sold), a treat of each; a save with a vegetable before its level is checked.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/ordmixtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-09T09:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const jump = async ms => { await p.evaluate(ms => { window.__T = Math.round(window.__T + ms); sessionStorage.setItem('__T', window.__T); }, ms); await run(1.5); };
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/ordmix_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped)')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
};
const waitWork = async (max = 90) => { for (let i = 0; i < max && await p.evaluate(() => !!window.__farm.garden.work()); i++) await run(1); };
const look = async (i = 4, z = 2.2) => { await p.evaluate(([i, z]) => { const f = window.__farm, m = f.garden.mid(i); if (m) { f.lookAt(m[0], m[2], z); f.draw(); } }, [i, z]); await run(0.2); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=09:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
const setLevel = (L, coins) => p.evaluate(([L, coins]) => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(L) + 5; g.data.lvSeen = L; g.fishBag().gift = true; g.data.coins = coins; g.data.orders = null; g.save(); f.gameUI().close(); }, [L, coins]);
// many orders made at a level (a seeded dice): what they ask for
const sample = n => p.evaluate(n => { const g = window.__farm.game(); let s = 12345; const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; const seen = {}, sizes = {}, bad = []; let most = 0;
  for (let i = 0; i < n; i++) { g.data.orders = { list: [], next: 0, seq: 1, done: 0 }; g.orderTick(Date.now(), r); most = Math.max(most, g.orderBook().list.length);
    while (g.orderBook().list.length < g.ordersMost() && g.newOrder(Date.now(), r));
    most = Math.max(most, g.orderBook().list.length);
    for (const o of g.orderBook().list) { const ks = Object.keys(o.items); sizes[ks.length] = (sizes[ks.length] || 0) + 1; for (const k of ks) { seen[k] = (seen[k] || 0) + 1; if (!g.orderCan(k)) bad.push(k); } } }
  g.data.orders = null; return { seen, sizes, bad, most }; }, n);
await setLevel(5, 500); await run(2);
let s = await sample(120);
ok('level 5: three orders at most, one or two things each, none of the new vegetables', s.most === 3 && !s.sizes[3] && !['lettuce', 'peas', 'corn', 'beet', 'sunf'].some(k => s.seen[k]) && !s.bad.length, s);
await setLevel(9, 500); await run(1);
s = await sample(120);
ok('level 9: lettuce and peas asked for, a mixed basket now and then; still three orders', s.most === 3 && s.seen.lettuce > 0 && s.seen.peas > 0 && s.sizes[3] > 0 && !s.seen.corn && !s.seen.sunf && !s.bad.length, s);
await setLevel(30, 500); await run(1);
s = await sample(160);
ok('level 30: four orders at a time; every one of the five new vegetables asked for; mixed baskets about one in five', s.most === 4 && ['lettuce', 'peas', 'corn', 'beet', 'sunf'].every(k => s.seen[k] > 0) && s.sizes[3] / (s.sizes[1] + s.sizes[2] + s.sizes[3]) > 0.08 && s.sizes[3] / (s.sizes[1] + s.sizes[2] + s.sizes[3]) < 0.35 && !s.bad.length, s);
// a mixed basket: its pay, its card, delivered from the pantry
const mix = await p.evaluate(() => { const f = window.__farm, g = f.game(); g.vegBasket(); g.data.orders = { list: [{ id: 'o1', who: 'amara', t: Date.now(), items: { carrot: 4, lettuce: 5, beet: 2 }, got: {} }, { id: 'o2', who: 'clara', t: Date.now(), items: { carrot: 4, peas: 5 }, got: {} }], next: Date.now() + 3600e3, seq: 3, done: 0 };
  Object.assign(g.data.garden.veg, { carrot: 10, lettuce: 9, beet: 3 }); g.save();
  const o = g.orderBook().list[0], P = g.orderPayOf(o), plain = Math.round(1.4 * (4 * 3 + 5 * 2 + 2 * 10)) + 10; return { P, plain, ready: g.orderReady(o) }; });
ok('a mixed basket (4 carrots, 5 lettuces, 2 beetroot): pays half as much again', mix.ready && mix.P.coins >= Math.round(1.4 * 42 * 1.5) + 10 && mix.P.coins > mix.plain, mix);
await p.evaluate(() => window.__farm.gameUI().ordersSheet({})); await run(0.3);
const card = await p.evaluate(() => [...document.querySelectorAll('.gorder')].map(c => ({ id: c.dataset.order, mix: c.dataset.mix || null, label: (c.querySelector('.gorder-mix') || {}).textContent || null, rows: c.querySelectorAll('.gorder-i').length })));
ok('its card says so; a two-thing order’s doesn’t', card[0] && card[0].mix === '1' && (fr ? /Panier garni/ : /Mixed basket/).test(card[0].label) && card[0].rows === 3 && card[1] && !card[1].mix, card);
await shoot('1_mixed'); await p.evaluate(() => window.__farm.gameUI().close());
const del = await p.evaluate(() => { const g = window.__farm.game(), c0 = g.data.coins; const r = g.deliverOrder ? g.deliverOrder('o1') : null; return { r: !!r, coins: g.data.coins - c0, veg: { ...g.data.garden.veg }, left: g.orderBook().list.map(o => o.id) }; });
ok('delivered from the pantry: its vegetables gone, its coins paid', del.r && del.coins >= 98 && del.veg.carrot === 6 && del.veg.lettuce === 4 && del.veg.beet === 1 && !del.left.includes('o1'), del);
// ---- the save's checks
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.save(); const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = f.xpFor(5) + 1; raw.d.lvSeen = 5;
  raw.d.orders = { list: [{ id: 'o7', who: 'amara', t: Date.now() - 1000, items: { eggs: 4, carrot: 4, fish: 1 }, got: {} }, { id: 'o8', who: 'potts', t: Date.now() - 1000, items: { sunf: 2 }, got: {} }, { id: 'o9', who: 'tom', t: Date.now() - 1000, items: { grain: 20 }, got: {} }, { id: 'o10', who: 'clara', t: Date.now() - 1000, items: { eggs: 5 }, got: {} }, { id: 'o11', who: 'lily', t: Date.now() - 1000, items: { eggs: 5 }, got: {} }], next: Date.now() + 3600e3, seq: 12, done: 0 }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await p.evaluate(() => window.__farm.gameUI().close());
const kept = await p.evaluate(() => window.__farm.game().data.orders.list.map(o => o.id));
ok('a save at level 5 with a mixed basket, a sunflower order and a fourth order: only what its level allows is kept', !kept.includes('o7') && !kept.includes('o8') && kept.includes('o9') && kept.length <= 3, kept);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? `FAILED: ${fails}` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);

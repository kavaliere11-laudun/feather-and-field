// The East Meadow (16 Nov 2026, Audrey: "we need to extend the map"; "East Meadow, 10 new fields"): ./withserver.sh node meadowtest.mjs [OUT]
// Forty fields: the land a level allows, the meadow's prices, bought to the last, the view reaching it, the save's check.
// (below: vegtest's own start) The five new vegetables and the beds up to ten (15 Nov 2026, Audrey: "extend the fields to grow vegetables. Introduce new
// ones and it becomes a real part of the game"): ./withserver.sh node vegtest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A farm on a fake clock. Level 5: the sow card offers the first three and says lettuce comes at level 6; a sunflower can't
// be sown. Level 30 with coins: beds bought up to ten (the seventh starts a third row), each vegetable sown, grown and
// picked into the pantry (its shelf, its price, sold), a treat of each; a save with a vegetable before its level is checked.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/meadowtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
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
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/meadow_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped)')); };
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
const setLevel = (L, coins) => p.evaluate(([L, coins]) => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(L) + 5; g.data.lvSeen = L; g.fishBag().gift = true; g.data.coins = coins; g.save(); f.gameUI().close(); }, [L, coins]);
const buyAll = () => p.evaluate(() => { const f = window.__farm, g = f.game(); const prices = []; for (let i = 0; i < 45; i++) { const n = g.landForSale(); if (!n) break; prices.push(n.price); if (!f.buyLand()) break; } return { land: g.data.land.length, prices, next: g.landNext() }; });
await setLevel(11, 1e7); await run(1);
let r = await buyAll();
ok('level 11: eleven fields, the twelfth at level 12', r.land === 11 && r.next && r.next.field === 11 && r.next.level === 12, r);
await setLevel(20, 1e7); await run(1); r = await buyAll();
ok('level 20: twenty fields, the next at 21 (the road of 50 levels: one field a level up to 40)', r.land === 20 && r.next.level === 21, { land: r.land, next: r.next });
await setLevel(40, 1e7); await run(1); r = await buyAll();
ok('level 40: all forty; the meadow’s ten cost 11,000 to 20,000 coins', r.land === 40 && r.next === null && r.prices.slice(-10).join() === '11000,12000,13000,14000,15000,16000,17000,18000,19000,20000', r);
await run(3);
const v = await p.evaluate(() => { const f = window.__farm; f.lookAt(30, 28, 4.4); f.step(1 / 30, 5); f.draw(); return f.viewAt(); });
ok('the view reaches the meadow', Math.abs(v[0] - 30) < 2 && Math.abs(v[1] - 28) < 2, v);
await shoot('1_meadow_owned');
await p.evaluate(() => { const f = window.__farm; f.lookAt(24, 24, 9); f.step(1 / 30, 5); f.draw(); }); await shoot('2_meadow_wide');
// ---- the save's check
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.save(); const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = f.xpFor(12) + 1; raw.d.lvSeen = 12; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await p.evaluate(() => window.__farm.gameUI().close());
const chk = await p.evaluate(() => { const g = window.__farm.game(); return { level: g.level, land: g.data.land.length }; });
ok('a save at level 12 with forty fields: twelve kept', chk.level === 12 && chk.land === 12, chk);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? `FAILED: ${fails}` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);

// The five new vegetables and the beds up to ten (15 Nov 2026, Audrey: "extend the fields to grow vegetables. Introduce new
// ones and it becomes a real part of the game"): ./withserver.sh node vegtest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A farm on a fake clock. Level 5: the sow card offers the first three and says lettuce comes at level 6; a sunflower can't
// be sown. Level 30 with coins: beds bought up to ten (the seventh starts a third row), each vegetable sown, grown and
// picked into the pantry (its shelf, its price, sold), a treat of each; a save with a vegetable before its level is checked.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/vegtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
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
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/veg_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped)')); };
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
await setLevel(6, 500); await run(3);
for (let i = 0; i < 40 && !(await p.evaluate(() => !!window.__farm.garden.mid(0))); i++) await run(1);
await p.evaluate(() => window.__farm.garden.tap()); await run(0.5);
let card = await p.evaluate(() => ({ sow: [...document.querySelectorAll('.gbed [data-sow]')].map(e => e.dataset.sow), next: [...document.querySelectorAll('.gcropnext')].map(e => e.dataset.next + '|' + e.textContent) }));
ok('level 6: a bed offers the first three, and says lettuce comes at level 7 (the road of 50 levels)', card.sow.slice(0, 3).join() === 'carrot,straw,pump' && !card.sow.includes('lettuce') && card.next[0] && card.next[0].startsWith('lettuce|') && /7/.test(card.next[0]), card);
ok('level 6: a sunflower can’t be sown', await p.evaluate(() => window.__farm.game().sowBed(0, 'sunf') === null));
await shoot('1_level5'); await p.evaluate(() => window.__farm.gameUI().close());
// ---- level 30: the beds up to ten
await setLevel(50, 60000); await run(2);
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.coins = 1e7; for (let i = 0; i < 6; i++) f.buyLand(); g.data.coins = 60000; g.save(); }); await run(2);      // (land for the garden's rows)
const bought = [];
for (let k = 0; k < 8; k++) { const r = await p.evaluate(() => { const f = window.__farm, g = f.game(), nx = g.bedNext(); if (!nx) return null; const okb = f.garden.buyBed(); return { n: g.garden().beds.length, price: nx.price, ok: okb !== false }; }); if (!r) break; bought.push(r); await run(1.5); }
const nb = await p.evaluate(() => window.__farm.game().garden().beds.length);
ok('level 50: beds bought up to ten, the last four 3,000 to 6,000 coins', nb === 10 && bought.slice(-4).map(b => b.price).join() === '3000,4000,5000,6000' && !(await p.evaluate(() => window.__farm.game().bedNext())), { nb, bought });
await p.evaluate(() => window.__farm.gameUI().close());
// ---- every vegetable sown, grown, picked
const IDS = ['lettuce', 'peas', 'corn', 'beet', 'sunf', 'carrot', 'straw', 'pump', 'lettuce', 'corn'];
const sown = await p.evaluate(ids => { const g = window.__farm.game(); return ids.map((k, i) => !!g.sowBed(i, k)); }, IDS);
ok('each of the eight vegetables sown, one to a bed', sown.every(Boolean), sown);
await run(2); await look(4, 1.9); await shoot('2_sown');
await jump(2.2 * 3600e3); await look(4, 1.9); await shoot('3_growing');
await jump(8 * 3600e3); await look(4, 1.9); await shoot('4_ripe');
await look(7, 3.2); await shoot('4b_ripe_back');
const vis = await p.evaluate(() => window.__farm.garden.state().visible);
ok('ripe: each bed shows its own vegetable and sign', vis && IDS.every((k, i) => vis[i].includes('sign_' + k) && vis[i].includes(k + '_3')), vis);
const picked = await p.evaluate(ids => { const g = window.__farm.game(); return ids.map((k, i) => { const r = g.pickBed(i); return r ? r.n : 0; }); }, IDS);
const basket = await p.evaluate(() => ({ ...window.__farm.game().vegBasket() }));
ok('picked into the basket: 12 lettuces, 8 peas, 8 sweetcorn, 4 beetroot, 3 sunflower seeds', basket.lettuce === 12 && basket.peas === 8 && basket.corn === 8 && basket.beet === 4 && basket.sunf === 3, { picked, basket });
await run(1); await p.evaluate(() => window.__farm.gameUI().close());
// ---- the pantry: a shelf each, its price; sold
const pan = await p.evaluate(() => { const g = window.__farm.game(); return g.pantry().map(r => [r.k, r.n, r.max, r.all]); });
const row = k => pan.find(r => r[0] === k);
ok('the pantry has a shelf for each (lettuce 2, peas 3, sweetcorn 8, beetroot 10, sunflower seeds 14 coins each)', row('lettuce') && row('lettuce')[3] === 24 && row('peas')[3] === 24 && row('corn')[3] === 64 && row('beet')[3] === 40 && row('sunf')[3] === 42, pan);
await p.evaluate(() => window.__farm.gameUI().pantrySheet({})); await run(0.5);
const names = await p.evaluate(() => [...document.querySelectorAll('.gpan-r')].map(r => r.dataset.shelf + '|' + r.querySelector('b').textContent));
ok('each shelf has its name', ['lettuce', 'peas', 'corn', 'beet', 'sunf'].every(k => names.some(n => n.startsWith(k + '|') && n.length > k.length + 3 && !/ord_/.test(n))), names);
await shoot('5_pantry'); await p.evaluate(() => window.__farm.gameUI().close());
// ---- a treat of a new vegetable
const tr = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return { can: g.treatCan(c, 'peas'), r: !!g.giveTreat(c.id, 'peas'), left: g.vegBasket().peas }; });
ok('peas as a treat for a coop (three of them)', tr.can && tr.r && tr.left === 5, tr);
// ---- the save's checks: a vegetable before its level is taken out
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.save(); const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = f.xpFor(6) + 1; raw.d.lvSeen = 6; raw.d.garden.beds = raw.d.garden.beds.slice(0, 3); raw.d.garden.beds[0] = { crop: 'sunf', ripe: Date.now() + 1000 }; raw.d.garden.veg.sunf = 9; raw.d.garden.veg.carrot = 5; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await p.evaluate(() => window.__farm.gameUI().close());
const chk = await p.evaluate(() => { const g = window.__farm.game(), G = g.data.garden; return { level: g.level, crop: G.beds[0].crop, sunf: G.veg.sunf, carrot: G.veg.carrot, beds: G.beds.length }; });
ok('a save at level 6 with a sunflower bed and sunflower seeds: taken out; its carrots kept', chk.level === 6 && chk.crop === null && chk.sunf === 0 && chk.carrot === 5 && chk.beds === 3, chk);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? `FAILED: ${fails}` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);

// A bed tapped on the farm itself (16 Nov 2026, Audrey: "sometimes you've got notifications from many beds by just clicking
// one. Same when you harvest you click one and the others become unavailable for few seconds even if they are ready"; "This is
// what opens when I click on a locked bed. I should have the details of that bed only"): ./withserver.sh node bedtaptest.mjs [OUT]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/bedtaptest', fr = process.env.LANG === 'fr'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: fr ? 'fr-FR' : 'en-GB' }); ctx.setDefaultTimeout(120000);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (n, c, i) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' · ' + JSON.stringify(i) : '')); if (!c) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { f.step(1 / 30, 1); f.gameTick(Date.now(), false); } f.draw(); }, s);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(9) + 5; g.data.lvSeen = 9; g.data.coins = 5000; g.garden(); for (const [i, k] of [[0, 'carrot'], [1, 'lettuce'], [2, 'straw']]) { g.sowBed(i, k); g.data.garden.beds[i].ripe = Date.now() - 1; } g.save(); f.gameUI().close(); });
await run(4); for (let i = 0; i < 30 && !(await p.evaluate(() => !!window.__farm.garden.mid(0))); i++) await run(1);
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.lookAt(-32.5, -23.5, 2.6); }); await run(1);
const tapBed = async i => { const at = await p.evaluate(i => { const f = window.__farm, m = f.garden.mid(i); return f.toScreen(m[0], 0.2, m[2]); }, i); await p.touchscreen.tap(at[0], at[1]); await run(0.3); };
const card = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); return s ? { title: s.querySelector('h2, .gsheet-t, .gtitle') ? s.querySelector('h2, .gsheet-t, .gtitle').textContent : s.innerText.split('\n')[0], beds: s.querySelectorAll('.gbed').length, buy: !!s.querySelector('[data-buybed]'), text: s.innerText.slice(0, 200) } : null; });
await p.screenshot({ path: OUT + '/bedtap_1.png' });
// three ripe beds tapped one after the other, half a second apart: all three picked
await tapBed(0); await tapBed(1); await tapBed(2);
let v = await p.evaluate(() => ({ ...window.__farm.game().data.garden.veg }));
ok('three ripe beds tapped one after the other: all three picked at once', v.carrot === 6 && v.lettuce === 6 && v.straw === 6, v);
for (let i = 0; i < 60 && await p.evaluate(() => !!window.__farm.garden.work()); i++) await run(1);
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5);
await tapBed(1); let c = await card();
ok('an empty bed tapped: its own card only', c && c.beds === 1 && /2/.test(c.title), c);
{ const have = await p.evaluate(() => { const g = window.__farm.game(); return { badges: [...document.querySelectorAll('.gsheet:not([hidden]) .gbed-sow .gbtn')].map(x => [x.dataset.sow, +x.querySelector('.gbed-have').dataset.have]), veg: g.data.garden.veg }; });
  ok('each vegetable to sow says how many the pantry holds already', have.badges.length >= 3 && have.badges.every(([k, n]) => n === (have.veg[k] || 0)) && have.badges.some(([, n]) => n > 0), have); await p.screenshot({ path: OUT + '/bedtap_1b_stock.png' }); }
await p.evaluate(() => window.__farm.gameUI().close());
await tapBed(3); c = await card(); await p.screenshot({ path: OUT + '/bedtap_2_next.png' });
ok('the next bed to unlock tapped: its own card, with its price to buy', c && c.beds === 0 && c.buy && /4/.test(c.title) && /400/.test(c.text), c);
await p.evaluate(() => window.__farm.gameUI().close());
await tapBed(8); c = await card(); await p.screenshot({ path: OUT + '/bedtap_3_locked.png' });
ok('a bed further on tapped: its own card: its level and price, nothing to tap', c && c.beds === 0 && !c.buy && /9/.test(c.title) && /27/.test(c.text) && /5[,.\s  ]?000/.test(c.text), c);
await p.evaluate(() => window.__farm.gameUI().close());
// the next bed bought from its card: the new bed's own card (to sow it), not the whole garden's (17 Nov 2026, Audrey: "Too busy")
await tapBed(3); await p.tap('.gsheet:not([hidden]) [data-buybed]'); await run(0.5); c = await card(); await p.screenshot({ path: OUT + '/bedtap_5_bought.png' });
ok('the next bed bought: its own card only, to sow it', c && c.beds === 1 && /4/.test(c.title), c);
await p.evaluate(() => window.__farm.gameUI().close());
// the second wheat field, wild
const w = await p.evaluate(() => { const f = window.__farm; f.lookAt(-21, -31, 3.2); return null; }); await run(1);
const at = await p.evaluate(() => window.__farm.toScreen(-19.9, 0.1, -32)); await p.touchscreen.tap(at[0], at[1]); await run(0.3);
c = await card(); await p.screenshot({ path: OUT + '/bedtap_4_wheat2.png' });
ok('the wild second wheat field tapped: its own card (level 12, 1,200 coins)', c && /12/.test(c.text) && /1[,.\s  ]?200/.test(c.text) && !/Sow|Semer/.test(c.text), c);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? `FAILED: ${fails}` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);

// More beds for the vegetable garden (12 Nov 2026, Audrey: "we might want to think about extending them and the [wheat]
// field with levels or money. Needs to be relevant as the game cannot become too easy either"; her choice: "Buy more, by
// level"): ./withserver.sh node bedstest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A farm at level 8 on a fake clock: the garden's card says a fourth bed comes at level 9 (no button). Level 9 with too few
// coins: its button is there, not to be tapped. With the coins: bought, 400 coins less, four beds, the garden a second row
// deep (its footprint, the new bed's frame drawn), still on your land and clear of everything; the new bed sown (the farmer
// walks to it), ripe, picked. A reload: all kept, not flagged. Level 14 and 20: the fifth and sixth; then no more is
// offered. A save changed outside the game (six beds at level 9) is cut back to what the level allows and flagged. No page
// errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/bedstest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
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
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/beds_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), G = g.data.garden; return { level: g.level, coins: g.data.coins, beds: G ? G.beds.length : 0, at: G ? [G.x, G.z, G.deg] : null, st: f.garden.state(), foot: f.garden.foot(), frames: f.garden.frames(), next: g.bedNext(), edited: g.edited, stages: G ? G.beds.map((_, i) => g.bedStage(i)) : null, veg: G ? G.veg : null }; });
const waitWork = async (max = 90) => { for (let i = 0; i < max && await p.evaluate(() => !!window.__farm.garden.work()); i++) await run(1); };
const look = async (z = 3.4) => { await p.evaluate(z => { const f = window.__farm, m = f.garden.mid(1), n = f.garden.mid(4); if (m) { f.lookAt((m[0] + n[0]) / 2, (m[2] + n[2]) / 2, z); f.draw(); } }, z); await run(0.2); };
const level = async n => { await p.evaluate(n => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(n) + 5; g.data.lvSeen = n; g.save(); f.gameUI().close(); }, n); await run(1.5); await close(); await run(0.5); };
const card = async () => { await close(); await p.evaluate(() => window.__farm.garden.tap()); await run(0.3); return sheet(); };
const buyBtn = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden]) [data-buybed]'); return e ? { text: e.textContent, off: e.disabled } : null; });
const T = fr ? { lv9: /partir du niveau 9/, lv14: /partir du niveau 14/, lv20: /partir du niveau 20/, add: /Ajouter ce carré/, got: /Le carré 4 est à vous/ } : { lv9: /From level 9/, lv14: /From level 14/, lv20: /From level 20/, add: /Add this bed/, got: /Bed 4 is yours/ };

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=09:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(8) + 5; g.data.lvSeen = 8; g.fishBag().gift = true; g.data.coins = 300; g.save(); f.gameUI().close(); });
await run(2); await close();
for (let i = 0; i < 30 && !(await S()).st.at; i++) await run(1);
let s = await S();
ok('level 8: the garden with its three beds, the fourth to come at level 9', s.level === 8 && s.beds === 3 && s.next && s.next.n === 4 && s.next.locked && s.next.price === 400, s.next);
let c = await card();
ok('its card says when the fourth bed comes (no button yet)', T.lv9.test(c) && /400/.test(c) && !(await buyBtn()), c.split('\n').slice(-6));
await level(9);
c = await card(); let bt = await buyBtn();
ok('level 9, 300 coins: the button is there, not to be tapped', bt && bt.off && /400/.test(bt.text), bt);
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 1000; g.save(); });
c = await card(); bt = await buyBtn();
ok('with the coins: "Add this bed · 400 coins"', bt && !bt.off && T.add.test(bt.text), bt);
// (a farm with one field of land only: no room for a second row: nothing bought, and said; with more land: bought)
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-buybed]').click()); await run(1);
s = await S(); const noroom = await hintT();
ok('no room for a second row on this small farm: nothing bought, said, the garden as it was', s.beds === 3 && s.coins === 1000 && (fr ? /Pas la place/ : /No room here/).test(noroom) && s.st.at && s.foot[1] > -1, { beds: s.beds, coins: s.coins, noroom, foot: s.foot });
const land = await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.coins = 1e6; const r = [f.buyLand(), f.buyLand(), f.buyLand()]; g.data.coins = 1000; g.save(); return { r: r.map(Boolean), land: g.data.land.length }; }); await run(2);
c = await card();
const was = await S();
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-buybed]').click()); await run(1);
s = await S(); const said = await hintT();
ok('bought: 400 coins less, four beds, said', s.coins === was.coins - 400 && s.beds === 4 && T.got.test(said), { coins: s.coins, beds: s.beds, said });
ok('the garden a second row deep, the new bed drawn (the fifth and sixth not)', s.foot[1] < -2.5 && s.frames.join() === 'true,true,true,true,false,false', { foot: s.foot, frames: s.frames });
ok('still on your land, where it fits', s.st.at && s.st.owned, s.st.at);
c = await sheet();
ok('its card shows bed 4, and the fifth to come at level 14', (fr ? /Carré 4/ : /Bed 4/).test(c) && T.lv14.test(c), c.split('\n').slice(-8));
await close(); await look(); await shoot('1_four');
// the new bed sown, grown, picked
await p.evaluate(() => window.__farm.garden.sow(3, 'carrot')); await run(1);
const working = await p.evaluate(() => window.__farm.garden.work());
await waitWork(); s = await S();
ok('carrots sown in bed 4 (the farmer walks to it)', working === 'sow' && s.stages[3] !== 'empty' && s.coins === was.coins - 405, { working, stages: s.stages, coins: s.coins });
await jump(61 * 60e3); s = await S();
ok('ripe an hour later, its carrots drawn in the second row', s.stages[3] === 'ripe' && s.st.visible[3].includes('carrot_3'), { stages: s.stages, v: s.st.visible[3] });
await look(); await shoot('2_ripe');
await p.evaluate(() => window.__farm.garden.pick(3)); await run(1); await waitWork(); s = await S();
ok('picked: six carrots, the bed empty again', s.veg.carrot === 6 && s.stages[3] === 'empty', { veg: s.veg, stages: s.stages });
// a reload
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close();
for (let i = 0; i < 30 && !(await S()).st.at; i++) await run(1);
const r = await S();
ok('a reload: four beds kept where they were, not flagged', r.beds === 4 && !r.edited && r.at.join() === s.at.join() && r.foot[1] < -2.5 && r.frames[3] === true, { beds: r.beds, edited: r.edited, at: r.at, was: s.at });
// the fifth and sixth
await level(14); await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 5000; g.save(); });
c = await card(); await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-buybed]').click()); await run(1);
s = await S(); c = await sheet();
ok('level 14: the fifth bed for 900 coins; the sixth to come at level 20', s.beds === 5 && s.coins === 4100 && T.lv20.test(c) && s.at.join() === r.at.join(), { beds: s.beds, coins: s.coins, at: s.at });
await level(20);
c = await card(); await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-buybed]').click()); await run(1);
s = await S(); c = await sheet();
ok('level 20: the sixth for 2,000 coins; then no more is offered', s.beds === 6 && s.coins === 2100 && s.next === null && !(await buyBtn()) && s.frames.every(Boolean), { beds: s.beds, coins: s.coins, next: s.next });
await close(); await look(3.8); await run(1); s = await S();
ok('a bubble for each of the six empty beds', s.st.bubs.filter(Boolean).length === 6, s.st.bubs);
await shoot('3_six');
// a save changed outside the game
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(9) + 5; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
s = await S();
ok('six beds at level 9: cut back to four, and flagged', s.level === 9 && s.beds === 4 && s.edited === true, { level: s.level, beds: s.beds, edited: s.edited });
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

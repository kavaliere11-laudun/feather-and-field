// A second wheat field (12 Nov 2026, Audrey's choice "Buy more, by level"): ./withserver.sh node wheat2test.mjs [OUT]   (LANG=fr; PORT)
// A farm at level 11: the field's card says a second one comes at level 12 for 1,200 coins (no button). Level 12 without the
// coins: the button's there, not to be tapped. With them: bought, 1,200 less, a second field on your land clear of the
// first, "Sow" over it. Its own card: sown on its own (the first stays bare), ripe four hours later, harvested: grain in
// store. Each has its bubble only when there's something to do. A reload: kept, not flagged. Moved like the first. A save
// changed outside the game (a second field at level 5) loses it and is flagged. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/wheat2test', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
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
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/wheat2_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(); return { level: g.level, coins: g.data.coins, grain: g.data.grain, two: !!g.data.wheat2, next: g.wheatNext(), a: f.deco.wheat.state(0), b: f.deco.wheat.state(1), edited: g.edited, w2: g.data.wheat2 ? { ...g.data.wheat2 } : null, w1: { ...g.data.wheat } }; });
const waitWork = async (max = 90) => { for (let i = 0; i < max && (await S()).a.work; i++) await run(1); };
const level = async n => { await p.evaluate(n => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(n) + 5; g.data.lvSeen = n; g.save(); f.gameUI().close(); }, n); await run(1.5); await close(); await run(0.5); };
const card = async (k = 0) => { await close(); await p.evaluate(k => { const f = window.__farm; if (f.game().wheatStage(undefined, k) === 'ripe') throw new Error('ripe'); f.deco.wheat.tap(k); }, k); await run(0.3); return sheet(); };
const buyBtn = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden]) [data-buywheat]'); return e ? { text: e.textContent, off: e.disabled } : null; });
const T = fr ? { lv: /partir du niveau 12/, add: /Ajouter ce champ/, got: /deuxième champ de blé est prêt/, t2: /deuxième champ de blé/, sow: /Semer/, cut: /Moissonner|Récolter/ } : { lv: /From level 12/, add: /Add this field/, got: /second wheat field is ready/, t2: /second wheat field/, sow: /Sow/, cut: /Harvest/ };

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=09:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(11) + 5; g.data.lvSeen = 11; g.fishBag().gift = true; g.data.coins = 300; g.save(); f.gameUI().close(); });
await run(2); await close();
let s = await S();
ok('level 11: one field; a second to come at level 12 for 1,200 coins', s.level === 11 && !s.two && s.next && s.next.locked && s.next.price === 1200 && !s.b.at, s.next);
let c = await card();
ok('its card says when (no button yet)', T.lv.test(c) && /1[,.\s  ]?200/.test(c) && !(await buyBtn()), c.split('\n').slice(-5));
await level(12);
c = await card(); let bt = await buyBtn();
ok('level 12, 300 coins: the button is there, not to be tapped', bt && bt.off, bt);
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.coins = 1e6; f.buyLand(); f.buyLand(); f.buyLand(); g.data.coins = 2000; g.save(); }); await run(2);      // (more land: room for it)
c = await card(); bt = await buyBtn();
ok('with the coins: "Add this field · 1,200 coins"', bt && !bt.off && T.add.test(bt.text), bt);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-buywheat]').click()); await run(2);
s = await S(); let said = await hintT();
const apart = s.b.at ? Math.hypot(s.b.at[0] - s.a.at[0], s.b.at[1] - s.a.at[1]) : 0;
ok('bought: 1,200 coins less, a second field on your land, clear of the first, said', s.coins === 800 && s.two && s.b.at && s.b.owned && apart > 2.4 && T.got.test(said) && s.next === null, { coins: s.coins, at: s.b.at, first: s.a.at, apart: +apart.toFixed(2), said });
await run(3); await p.evaluate(() => { const f = window.__farm, a = f.deco.wheat.state(0).at, b = f.deco.wheat.state(1).at; f.lookAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 6); f.draw(); }); await run(1); s = await S();
ok('"Sow" over each bare field', T.sow.test(s.a.bub || '') && T.sow.test(s.b.bub || ''), { a: s.a.bub, b: s.b.bub });
await p.evaluate(() => { const f = window.__farm, a = f.deco.wheat.state(0).at, b = f.deco.wheat.state(1).at; f.lookAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 5); f.draw(); }); await run(0.3); await shoot('1_bought');
c = await card(1);
ok('its own card: "Your second wheat field", no second one to buy there', T.t2.test(c) && !(await buyBtn()), c.split('\n').slice(0, 3));
// sown on its own
await p.evaluate(() => window.__farm.deco.wheat.sow(1)); await run(1); await waitWork(); await run(1); s = await S();
ok('the second sown on its own: 20 coins, the first still bare; no bubble over it while it grows', s.coins === 780 && s.b.stage !== 'soil' && s.a.stage === 'soil' && !s.b.bub && T.sow.test(s.a.bub || ''), { coins: s.coins, a: s.a.stage, b: s.b.stage, bubA: s.a.bub, bubB: s.b.bub });
await jump(4 * 3600e3 + 60e3); await run(2); s = await S();
ok('four hours on: the second ripe (drawn so), "Harvest" over it', s.b.stage === 'ripe' && s.b.shown === 'ripe' && T.cut.test(s.b.bub || '') && s.a.shown === 'soil', { b: s.b, a: s.a.shown });
await p.evaluate(() => { const f = window.__farm, b = f.deco.wheat.state(1).at; f.lookAt(b[0], b[1], 4); f.draw(); }); await run(0.3); await shoot('2_ripe');
const g0 = s.grain;
await p.evaluate(() => window.__farm.deco.wheat.tap(1)); await run(1); await waitWork(); await run(1); s = await S();
ok('tapped: harvested, 20 grain in store, bare again', s.grain === g0 + 20 && s.b.stage === 'soil' && s.b.shown === 'soil', { grain: s.grain, was: g0, b: s.b.stage });
// a reload
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
const r = await S();
ok('a reload: both fields where they were, not flagged', r.two && !r.edited && r.b.at && r.b.at.join() === s.b.at.join() && r.a.at.join() === s.a.at.join(), { edited: r.edited, b: r.b.at, was: s.b.at });
// moved like the first
const mv = await p.evaluate(() => { const f = window.__farm; const ok = f.deco.wheat.move(1); return { ok, bar: !!document.querySelector('.gmovebar:not([hidden])') || ok }; }); await run(0.5);
const moving = await p.evaluate(() => window.__farm.deco.moving ? window.__farm.deco.moving() : null); await p.evaluate(() => window.__farm.deco.cancel()); await run(0.5);
s = await S();
ok('"Move the field" from its card starts its move; cancelled: back where it was', mv.ok !== false && s.b.at && s.b.at.join() === r.b.at.join(), { mv, at: s.b.at });
// a save changed outside the game
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(5) + 5; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
s = await S();
ok('a second field at level 5: gone, and flagged', s.level === 5 && !s.two && !s.b.at && s.edited === true, { level: s.level, two: s.two, edited: s.edited });
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

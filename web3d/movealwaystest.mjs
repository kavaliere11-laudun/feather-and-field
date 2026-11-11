// A coop can always be moved (11 Nov 2026, Audrey: "I should always be able to move a coop please"):
// ./withserver.sh node movealwaystest.mjs   (LANG=fr; PORT)
// Two coops by day. The farmer cuddling a hen of the first: the SECOND coop's Move starts at once. The first coop's Move
// meanwhile: a word, and the move starts by itself once he's out of its pen. The goodnight round under way at dusk: Move
// starts at once.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(180000); ctx.setDefaultNavigationTimeout(180000);
await ctx.addInitScript(() => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || new Date('2026-11-09T10:00:00Z').getTime()); Date.now = () => window.__T; });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 600))); if (!c) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); };
const go = t => p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}&time=${t}`, { waitUntil: 'domcontentloaded' });
await go('10:00'); await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(4) + 5; g.data.lvSeen = 4; g.data.land = [0, 1, 2, 3]; g.data.coins = 5000; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(1);
// a second coop: the Orpingtons', placed where it's offered
const placed = await p.evaluate(() => { const f = window.__farm, g = f.game(); if (f.gameUI().isOpen) f.gameUI().close(); const w = g.waitingCoops()[0]; if (!w) return { w: null }; f.place(w); for (let i = 0; i < 8 && !f.move.state().ok; i++) f.move.settle(); const ok2 = f.move.state().ok; if (ok2) f.move.place(); return { w, ok: ok2, n: g.data.coops.length }; });
await run(2); await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); });
ok('a second coop on the farm', placed.n === 2, placed);
// the farmer cuddling a hen of the first coop
const hen = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[0], x = P.birds.find(y => y.gid && f.game().bird(y.gid).sex === 'h'); f.gameUI().o.cuddle(x.gid); return x.gid; });
let inPen = false; for (let i = 0; i < 60 && !inPen; i++) { await run(1); inPen = await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); return !!f.gamePlots()[0].farmer; }); }
ok('the farmer in the first coop\'s pen, cuddling', inPen);
const A = await p.evaluate(() => { const f = window.__farm; const busy = [f.move.busy(0), f.move.busy(1)]; f.move.start(1); const on = f.move.state().on; f.move.cancel(); return { busy, on }; });
ok('meanwhile the OTHER coop: Move starts at once', A.busy[0] === true && A.busy[1] === false && A.on === true, A);
const B = await p.evaluate(() => { const f = window.__farm; f.move.start(0); return { on: f.move.state().on, waiting: f.move.waiting(), hint: document.getElementById('hint').textContent }; });
ok('this coop, the farmer in its pen: a word that it will start by itself, not a refusal', !B.on && B.waiting && (fr ? /commencera tout seul/ : /start by itself/).test(B.hint), B);
let started = false; for (let i = 0; i < 90 && !started; i++) { await run(1); started = await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); return f.move.state().on; }); }
const C = await p.evaluate(() => { const f = window.__farm; const r = { on: f.move.state().on, farmer: !!f.gamePlots()[0].farmer, waiting: f.move.waiting() }; f.move.cancel(); return r; });
ok('…and once he\'s out of the pen the move starts by itself', started && C.on && !C.farmer && !C.waiting, C);
// dusk: the goodnight round under way: Move at once
await p.evaluate(() => { window.__T = new Date('2026-11-09T18:30:00Z').getTime(); sessionStorage.setItem('__T', window.__T); });
await go('18:30'); await load(); await run(1);
const N = await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); const r = f.goodnight(); const run2 = f.nightRun(), job = (f.farmerJob() || {}).kind; f.move.start(1); const on = f.move.state().on; f.move.cancel(); return { r: !!r, run: run2, job, on, home: f.farmer().home }; });
ok('the goodnight round under way: a coop\'s Move starts at once', N.r && N.on && (N.home || N.run), N);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

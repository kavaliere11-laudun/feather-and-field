// The farmer's list of next jobs, his dash to a job and the skip ahead (9 Nov 2026, Audrey: "it's frustrating that the
// farmer can only do 1 thing at the time and you cannot schedule the next action", her choice "Line up to 3 jobs"; "The
// farmer is too slow to move around", her choice "Run, and skip ahead if far"): ./withserver.sh node busytest.mjs   (LANG=fr; PORT)
// A level-3 farm by day. In sight and far from a hen's pen, a cuddle asked: he dashes all the way (3 m/s), never skipping.
// Out of sight and far, another cuddle asked: he's put on his way just off the screen and runs in. While he's at it: another
// hen's card has its Cuddle button live and a note ("Arthur is giving X a cuddle. Ask for anything else..."); asked: on his
// list (1 of 3), the note now "Next: a cuddle for Y"; the same again: "Already on his list"; a feeder filled meanwhile:
// simply accepted; worms and fishing: 3 of 3; a fourth: "list is full". He does them in order: the cuddle, the worms, fishing. Fishing and waiting to cast, a
// cuddle asked: he puts his rod down and goes. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
await ctx.addInitScript(() => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || new Date('2026-11-09T10:00:00Z').getTime()); Date.now = () => window.__T; });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 500))); if (!c) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } f.tickBusy(); sessionStorage.setItem('__T', window.__T); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 240000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}&time=10:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(3) + 5; g.data.lvSeen = 3; g.fishBag().gift = true; g.fishBag().worms = 6; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(2);
await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
const T = fr ? { ask: /Demandez autre chose/, added: n => new RegExp('\\(' + n + ' sur 3\\)'), next: /Ensuite/, full: /pleine/, already: /Déjà/ } : { ask: /Ask for anything else/, added: n => new RegExp('\\(' + n + ' of 3\\)'), next: /Next:/, full: /full/, already: /Already/ };
const card = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return null; const q = sel => s.querySelector(sel);
  return { kind: window.__farm.gameUI().kind, note: (q('.gbusy') || {}).textContent || '', cuddle: q('.gcuddle') ? q('.gcuddle').disabled : null }; });
const hintNow = () => p.evaluate(() => document.getElementById('hint').textContent);
const H = await p.evaluate(() => { const f = window.__farm, P = f.coopPlots()[0], hens = P.birds.filter(x => x.gid && f.game().bird(x.gid).sex === 'h'); return hens.slice(0, 2).map(x => ({ id: x.gid, name: f.game().bird(x.gid).name })); });
ok('two hens to ask for', H.length === 2, H);
const free = async (n = 90) => { let fr2 = false; for (let i = 0; i < n && !fr2; i++) { await run(1); fr2 = !(await p.evaluate(() => window.__farm.farmerJob() || window.__farm.jobList().length)); } return fr2; };
// the farmer put `R` m from the coop, the view over the coop at `size`
const putFar = (size) => p.evaluate(size => { const f = window.__farm, Lf = f.farmer(), P = f.coopPlots()[0], c = P.centre;
  for (let i = 0; i < 300 && (Lf.task && Lf.task.name === 'pen' || Lf.home); i++) f.step(1 / 30, 1);
  let best = null;
  for (let R = 14; R > 8 && !best; R -= 1) for (let a = 0; a < 6.28 && !best; a += 0.35) { const x = c.x + Math.cos(a) * R, z = c.z + Math.sin(a) * R; if (Lf.o.nav.freeAt(x, z) && Lf.o.nav.find(x, z, c.x, c.z, true)) best = [x, z]; }
  Lf.pos.x = best[0]; Lf.pos.z = best[1]; Lf.task = null; Lf.pending = null; Lf.speed = 0; f.lookAt(c.x, c.z, size); f.draw();
  return { d: Math.hypot(best[0] - c.x, best[1] - c.z), seen: Lf.o.onScreen(best[0], best[1], 1.5), skipped: Lf.skipped || 0 }; }, size);
const cuddle = async id => { await p.evaluate(id => window.__farm.openBirdCard(window.__farm.coopPlots()[0].birds.find(x => x.gid === id)), id); await run(0.2); await p.evaluate(() => document.querySelector('.gsheet .gcuddle').click()); await run(0.1); };
const watch = () => p.evaluate(() => { const f = window.__farm, Lf = f.farmer(), P = f.coopPlots()[0], out = []; let firstSeen = null;
  for (let i = 0; i < 30 * 40 && Lf.task && Lf.task.name === 'pen' && !Lf.pen; i++) { f.step(1 / 30, 1); const d = Math.hypot(Lf.pos.x - P.centre.x, Lf.pos.z - P.centre.z); out.push([Lf.speed, d]); if (firstSeen === null && Lf.o.onScreen(Lf.pos.x, Lf.pos.z, 0)) firstSeen = +d.toFixed(1); }
  return { top: +Math.max(...out.map(q => q[0])).toFixed(2), secs: +(out.length / 30).toFixed(1), d0: +out[0][1].toFixed(1), skipped: Lf.skipped || 0, firstSeen, inPen: !!Lf.pen }; });
// ---- in sight: he dashes all the way
let far = await putFar(26);
await p.evaluate(id => window.__farm.gameUI().o.cuddle(id), H[0].id); await run(0.1);      // (asked without her card: opening it brings the view in close to her)
let w = await watch();
ok(`in sight, ${far.d.toFixed(0)} m off: he dashes to the job (3 m/s), all the way (no skip)`, far.seen && w.top > 2.8 && w.top < 3.2 && w.skipped === far.skipped && w.inPen, { far, w });
ok('free again', await free());
// ---- out of sight: put on his way just off the screen
await p.evaluate(id => { const g = window.__farm.game(), b = g.bird(id); b.happy = 0; g.save(); }, H[0].id);
far = await putFar(3.2);
await cuddle(H[0].id);
w = await watch();
ok(`out of sight, ${far.d.toFixed(0)} m off: put on his way just off the screen, running in, there in a few seconds`, !far.seen && w.skipped === far.skipped + 1 && w.d0 < far.d - 3 && w.secs < 6 && w.inPen, { far, w });
// ---- meanwhile: another hen's card, live, with the note; asked: on his list
await p.evaluate(id => window.__farm.openBirdCard(window.__farm.coopPlots()[0].birds.find(x => x.gid === id)), H[1].id); await run(0.1);
let c = await card();
ok(`meanwhile ${H[1].name}'s card: Cuddle live, the note saying what he's doing and to ask for anything else`, c && c.kind === 'bird' && c.cuddle === false && c.note.includes(H[0].name) && T.ask.test(c.note), c);
await p.evaluate(() => document.querySelector('.gsheet .gcuddle').click()); await run(0.1);
let JL = await p.evaluate(() => window.__farm.jobList()), h = await hintNow();
await p.evaluate(id => window.__farm.openBirdCard(window.__farm.coopPlots()[0].birds.find(x => x.gid === id)), H[1].id); await run(0.1);
c = await card();
ok('asked: on his list (1 of 3), nothing done yet; her card\'s note: "Next: a cuddle for her"', JL.length === 1 && JL[0].kind === 'cuddle' && T.added(1).test(h) && h.includes(H[1].name) && c && T.next.test(c.note) && c.note.includes(H[1].name), { JL, h, c });
await p.evaluate(() => document.querySelector('.gsheet .gcuddle').click()); await run(0.1);
h = await hintNow(); JL = await p.evaluate(() => window.__farm.jobList());
ok('asked again: "Already on his list", still one', JL.length === 1 && T.already.test(h), { JL, h });
// a chore meanwhile: simply accepted, not on his list (10 Nov 2026: "Instead of this message it should just accept the action")
const chore = await p.evaluate(() => { const f = window.__farm, g = f.game(); f.gameUI().close(); const co = g.data.coops[0]; co.feed = 0; co.fedAt = 0; g.save(); f.gameTick(window.__T); const r = f.fillFeeder(0); return { r: !!r, feed: g.data.coops[0].feed, n: f.jobList().length }; });
ok('a feeder filled meanwhile: accepted at once, not on his list', chore.r && chore.feed > 0 && chore.n === 1, chore);
// her worms and fishing asked: 3 of 3; a fourth: full
const roo = await p.evaluate(id => { const f = window.__farm, g = f.game(), b = g.bird(id); b.trust = 60; b.worm = ''; g.save(); const r = f.coopPlots()[0].birds.find(x => x.gid && g.bird(x.gid).sex !== 'h'); f.gameUI().o.askWorms(id); return r.gid; }, H[0].id);
await p.evaluate(() => { const f = window.__farm; f.dockCard(); const q = document.querySelector('.gsheet button[data-fish=go]'); if (q) q.click(); });
h = await hintNow(); JL = await p.evaluate(() => window.__farm.jobList());
ok('her friend\'s worms and fishing asked: 3 of 3 on his list', JL.length === 3 && JL.map(q => q.kind).join() === 'cuddle,worms,fish' && T.added(3).test(h), { JL, h });
const full = await p.evaluate(id => { const f = window.__farm; f.gameUI().o.cuddle(id); return { n: f.jobList().length, hint: document.getElementById('hint').textContent }; }, roo);
ok('a fourth (the rooster\'s cuddle): "his list is full", still three', full.n === 3 && T.full.test(full.hint), full);
// ---- he does them in order
const seen = []; let fishing = false;
for (let i = 0; i < 240 && !fishing; i++) { await run(1); const q = await p.evaluate(() => { const f = window.__farm, j = f.farmerJob(); if (f.gameUI().isOpen) f.gameUI().close(); return { k: j && j.kind, n: f.jobList().length, st: f.fishing() && f.fishing().state }; }); if (q.k && seen[seen.length - 1] !== q.k) seen.push(q.k); fishing = q.st === 'ready'; }
const after = await p.evaluate(id => { const f = window.__farm, g = f.game(); return { happy: g.happyLeft(g.bird(id)) > 0, n: f.jobList().length }; }, H[1].id);
ok('he does them in order: her cuddle, the worms, then out on the dock ready to cast; the list empty', fishing && /cuddle.*worms.*fish/.test(seen.join()) && after.happy && after.n === 0, { seen, after });
// ---- fishing, waiting to cast: a job asked, the rod down for it
await p.evaluate(id => { const f = window.__farm, g = f.game(), b = g.bird(id); b.happy = 0; g.save(); f.gameUI().o.cuddle(id); }, H[0].id);
JL = await p.evaluate(() => window.__farm.jobList());
let went = false; for (let i = 0; i < 120 && !went; i++) { await run(1); went = await p.evaluate(id => { const f = window.__farm, g = f.game(); if (f.gameUI().isOpen) f.gameUI().close(); return g.happyLeft(g.bird(id)) > 0 && f.fishing().state === 'off'; }, H[0].id); }
ok('fishing and waiting to cast, a cuddle asked: on his list, his rod put down, the cuddle given', JL.length === 1 && went, { JL, went });
ok('free at the end, the list empty', await free());
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

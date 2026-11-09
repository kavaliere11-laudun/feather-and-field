// One job at a time, and the farmer running to a far job (9 Nov 2026; Audrey: "the farmer takes too long to come. It was
// busy with a previous task so perhaps we can only allow one task at the time", her choice "One job at a time"; "the farmer
// should run especially if he is far"): ./withserver.sh node busytest.mjs   (LANG=fr; PORT)
// A level-3 farm by day. The farmer sent from the far side of the farm to cuddle a hen: he runs while it's far, hurries the
// last few metres. Meanwhile another hen's card: her Cuddle and worms buttons waiting, a note over them ("Arthur is giving
// Juniper a cuddle. One job at a time: free again in a moment."); the dock's card: Go fishing waiting, the same note; a
// cuddle asked all the same (the hook): nothing done, the note said. Once he's done, the open card again with its buttons
// back and no note. Fishing: another hen's card says he's fishing, "tap Stop fishing first"; Stop: free again. No page errors.
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
const card = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return null; const q = sel => s.querySelector(sel);
  return { kind: window.__farm.gameUI().kind, note: (q('.gbusy') || {}).textContent || '', cuddle: q('.gcuddle') ? q('.gcuddle').disabled : null, worms: q('.gworms') ? q('.gworms').disabled : null, go: q('button[data-fish=go]') ? q('button[data-fish=go]').disabled : null }; });
// the hens: two of them; the farmer put on the far side of the farm
const H = await p.evaluate(() => { const f = window.__farm, P = f.coopPlots()[0], hens = P.birds.filter(x => x.gid && f.game().bird(x.gid).sex === 'h'); return hens.slice(0, 2).map(x => ({ id: x.gid, name: f.game().bird(x.gid).name })); });
ok('two hens to ask for', H.length === 2, H);
const far = await p.evaluate(() => { const f = window.__farm, Lf = f.farmer(), P = f.coopPlots()[0], c = P.centre;
  for (let i = 0; i < 300 && (Lf.task && Lf.task.name === 'pen' || Lf.home); i++) f.step(1 / 30, 1);
  let best = null;      // (a spot about 11 m off that he can walk from)
  for (let R = 12; R > 7 && !best; R -= 1) for (let a = 0; a < 6.28 && !best; a += 0.35) { const x = c.x + Math.cos(a) * R, z = c.z + Math.sin(a) * R; if (Lf.o.nav.freeAt(x, z) && Lf.o.nav.find(x, z, c.x, c.z, true)) best = [x, z]; }
  Lf.pos.x = best[0]; Lf.pos.z = best[1]; Lf.task = null; Lf.pending = null; return Math.hypot(best[0] - c.x, best[1] - c.z); });
// the cuddle asked: off he goes, running while it's far
await p.evaluate(id => window.__farm.openBirdCard(window.__farm.coopPlots()[0].birds.find(x => x.gid === id)), H[0].id); await run(0.2);
await p.evaluate(() => document.querySelector('.gsheet .gcuddle').click()); await run(0.1);
const job = await p.evaluate(() => window.__farm.farmerJob());
ok(`the cuddle asked (him ${far.toFixed(1)} m off): his job now`, job && job.kind === 'cuddle', job);
const sp = await p.evaluate(() => { const f = window.__farm, Lf = f.farmer(), P = f.coopPlots()[0], out = [];
  for (let i = 0; i < 30 * 40 && Lf.task && Lf.task.name === 'pen' && !Lf.pen; i++) { f.step(1 / 30, 1); out.push([+Lf.speed.toFixed(2), +Math.hypot(Lf.pos.x - P.centre.x, Lf.pos.z - P.centre.z).toFixed(1)]); }
  return { top: Math.max(...out.map(q => q[0])), farTop: Math.max(...out.filter(q => q[1] > 7).map(q => q[0])), nearTop: Math.max(0, ...out.filter(q => q[1] < 3).map(q => q[0])), n: out.length }; });
ok('a long way off he runs (over 1.9 m/s); the last metres a hurry (under 1.6)', sp.farTop > 1.9 && sp.nearTop < 1.6, sp);
// meanwhile (he's in the pen with her now)
await p.evaluate(id => window.__farm.openBirdCard(window.__farm.coopPlots()[0].birds.find(x => x.gid === id)), H[1].id); await run(0.1);
let c = await card();
const T = fr ? { name: new RegExp('câlin à ' + H[0].name), wait: /Une chose à la fois/, fish: /pêche/, stop: /Arrêter de pêcher/ } : { name: new RegExp('cuddle'), wait: /One job at a time/, fish: /fishing/, stop: /Stop fishing/ };
ok(`meanwhile ${H[1].name}'s card: Cuddle (and worms, if she has any) waiting, the note over them saying what he's doing`, c && c.kind === 'bird' && c.cuddle === true && c.worms !== false && T.name.test(c.note) && c.note.includes(H[0].name) && T.wait.test(c.note), c);
await p.evaluate(() => window.__farm.dockCard()); await run(0.1);
c = await card();
ok('the dock\'s card: Go fishing waiting, the same note', c && c.kind === 'dock' && c.go === true && T.wait.test(c.note), c);
await p.evaluate(() => window.__farm.gameUI().close());
const asked = await p.evaluate(id => { const f = window.__farm, g = f.game(), b0 = JSON.stringify(g.bird(id)); const r = f.gameUI().o.cuddle(id); f.step(1 / 30, 3); return { r, same: JSON.stringify(g.bird(id)) === b0, hint: document.getElementById('hint').textContent }; }, H[1].id);
ok('a cuddle asked all the same: nothing done, the note said', asked.r === null && asked.same && T.wait.test(asked.hint), asked);
// he's done: the open card again, its buttons back
await p.evaluate(id => window.__farm.openBirdCard(window.__farm.coopPlots()[0].birds.find(x => x.gid === id)), H[1].id); await run(0.1);
let free = false; for (let i = 0; i < 80 && !free; i++) { await run(1); free = !(await p.evaluate(() => window.__farm.farmerJob())); }
c = await card();
ok('he\'s done: the card open again with Cuddle back, no note', free && c && c.kind === 'bird' && c.cuddle === false && !c.note, { free, c });
// fishing: busy with that
await p.evaluate(() => window.__farm.gameUI().close());
const go = await p.evaluate(() => { const f = window.__farm; f.dockCard(); const b = document.querySelector('.gsheet button[data-fish=go]'); if (b && !b.disabled) b.click(); return !!b && !b.disabled; }); await run(0.3);
await p.evaluate(id => window.__farm.openBirdCard(window.__farm.coopPlots()[0].birds.find(x => x.gid === id)), H[1].id); await run(0.1);
c = await card();
ok('fishing: a hen\'s card says he\'s fishing, "tap Stop fishing first"', go && c && c.cuddle === true && T.fish.test(c.note) && T.stop.test(c.note), { go, c });
await p.evaluate(() => window.__farm.gameUI().close());
for (let i = 0; i < 60 && (await p.evaluate(() => window.__farm.fishing() && window.__farm.fishing().state)) !== 'ready'; i++) { await run(1); await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); }); }
await p.evaluate(() => window.__farm.fishing().stop());
free = false; for (let i = 0; i < 60 && !free; i++) { await run(1); free = !(await p.evaluate(() => window.__farm.farmerJob())); }
ok('Stop: back off the dock, free again', free);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

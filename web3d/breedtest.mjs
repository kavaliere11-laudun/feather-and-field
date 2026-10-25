// The game, release 1 step 6 (new breeds by level): node breedtest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402)
// A fresh farm on a fake clock: nothing waiting, no red dot, Your coops lists the Red Barn and what level 5 brings. Level 5
// (four fields): its card says a new breed has come (the Buff Orpingtons), "Place their coop now" and "Later" in sight;
// Later: the red dot, Your coops offers it; placing it: a new rustic coop with its trio appears where it can stand; Cancel:
// gone, still waiting; placed: on the farm with its trio for good (the dot gone, "Welcome, ...!", its rustic house, a full
// feeder, each bird's card); a reload keeps it; level 6 straight from its card: the white Silkies; a save changed outside
// (a breed's coop before its level, a breed twice) is checked and flagged.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-24T11:00:00+01:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`;
// (the clock in whole milliseconds, as a phone's, carried over a reload)
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(); return { level: g.level, waiting: g.waitingCoops().join(), dot: !document.querySelector('.gdot').hidden, coops: g.data.coops.map(c => c.breed).join(), birds: g.data.birds.length,
  plots: f.coopPlots().length, card: f.gameUI().kind, edited: g.edited, move: f.move.state().on }; });
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const T = { orp: fr ? /Nouvelle race : Orpington fauve/ : /New breed: Buff Orpington/, sil: fr ? /Nouvelle race : Poule soie/ : /New breed: Silkie/, place: fr ? /Installer leur poulailler/ : /Place their coop now/,
  later: fr ? /Plus tard/ : /Later/, next5: fr ? /Au niveau 5 : Orpington fauve/ : /At level 5: Buff Orpington/, red: fr ? /Grange rouge/ : /Red Barn/, welcome: fr ? /Bienvenue, .+ et .+ !/ : /Welcome, .+ and .+!/,
  thatched: fr ? /Chaumière/ : /Thatched Cottage/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
let s = await st();
ok('a new farm: nothing waiting, no red dot', s.level === 1 && s.waiting === '' && !s.dot && s.coops === 'rir', s);
await p.tap('.gcoops'); await run(0.3);
let t = await sheet();
ok('Your coops (the little barn up top): the Red Barn to move, and what level 5 brings', T.red.test(t) && T.next5.test(t) && (await p.evaluate(() => window.__farm.gameUI().kind)) === 'coops', t);
await p.evaluate(() => window.__farm.gameUI().close());
// level 5, four fields
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 700; g.data.lvSeen = 4; g.data.coins = 3000; g.data.land = [0, 1, 2, 3]; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 1110; g.save(); }); await run(1.6);
s = await st(); t = await sheet();
const btns = await p.evaluate(() => [...document.querySelectorAll('.gsheet .gstick .gbtn')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent, top: Math.round(r.top), bottom: Math.round(r.bottom) }; }));
ok('level 5: its card says a new breed has come, "Place their coop now" and "Later" in sight', s.level === 5 && s.card === 'levelup' && T.orp.test(t) && btns.length === 2 && T.place.test(btns[0].t) && T.later.test(btns[1].t) && btns.every(x => x.bottom <= H && x.top >= 0) && s.dot, { s, btns });
await p.tap('.gsheet .gstick .gbtn:nth-child(2)'); await run(0.4);
s = await st();
ok('Later: the card gone (seen), the red dot on the little barn, the Orpingtons waiting', !s.card && s.dot && s.waiting === 'orp' && (await p.evaluate(() => window.__farm.game().data.lvSeen)) === 5, s);
await p.tap('.gcoops'); await run(0.3);
t = await sheet();
ok('Your coops: the new breed with "New!" and Place it, the Red Barn', T.orp.test(t) && T.red.test(t) && (await p.evaluate(() => !!document.querySelector('.gnewcoop .gbadge'))), t);
// placing it, then Cancel
await p.tap('.gnewcoop .gbtn'); await run(0.6);
s = await st(); let m = await p.evaluate(() => window.__farm.move.state());
const draft = await p.evaluate(() => { const f = window.__farm, P = f.coopPlots(), d = P[P.length - 1]; return { breed: d.breed, birds: d.birds.map(b => b.kind).sort().join(), at: [d.group.position.x, d.group.position.z] }; });
ok('placing it: a new coop with its trio where it can stand, the bar', s.move && s.plots === 2 && draft.breed === 'orp' && draft.birds === 'hen,hen,rooster' && m.ok && s.coops === 'rir', { s, m, draft });
await p.tap('.gmove-row .gbtn:nth-child(2)'); await run(0.3);
s = await st();
ok('Cancel: the new coop gone again, still waiting with its red dot', !s.move && s.plots === 1 && s.coops === 'rir' && s.waiting === 'orp' && s.dot && s.birds === 3, s);
// placing it for good
await p.evaluate(() => window.__farm.coopsSheet()); await run(0.3);
await p.tap('.gnewcoop .gbtn'); await run(0.6);
await p.tap('.gmove-go'); await run(1.5);
s = await st();
const after = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'orp'); return { hint: document.getElementById('hint').textContent, models: f.coopModels(), feed: +g.feedLeft(c).toFixed(2), trio: g.birdsIn(c.id).map(b => b.sex).sort().join(), tier: c.tier }; });
ok('put down: on the farm for good with its trio, the red dot gone, "Welcome, ...!", its rustic house, a full feeder',
  !s.move && s.coops === 'rir,orp' && s.birds === 6 && s.plots === 2 && !s.dot && s.waiting === '' && T.welcome.test(after.hint) && after.models.includes('rustic_orp') && after.feed === 1 && after.trio === 'h,h,r' && after.tier === 0, { s, after });
await p.evaluate(() => { const f = window.__farm, i = f.coopPlots().findIndex(q => q.breed === 'orp'); f.coopCard(i); }); await run(0.3);
t = await sheet();
ok('its coop card: the Thatched Cottage, rustic, who lives there', T.thatched.test(t) && (fr ? /rustique/ : /rustic/).test(t), t);
await p.evaluate(() => window.__farm.gameUI().close());
// a reload keeps it
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
const kept = await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.breed === 'orp'); return P && P.birds.filter(b => b.gid).length; });
ok('a reload: both coops and their birds, not flagged', s.coops === 'rir,orp' && s.birds === 6 && s.plots === 2 && kept === 3 && !s.edited && !s.dot, { s, kept });
// level 6 straight from its card: the white Silkies
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 1800; g.save(); }); await run(1.6);
t = await sheet();
ok('level 6: the Silkies come', T.sil.test(t), t);
await p.tap('.gsheet .gstick .gbtn:first-child'); await run(0.6);
m = await p.evaluate(() => window.__farm.move.state());
if (!m.ok) { await p.evaluate(() => window.__farm.move.to(-33, -23, 90)); await run(0.1); m = await p.evaluate(() => window.__farm.move.state()); }
await p.tap('.gmove-go'); await run(1.5);
const sil = await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.breed === 'sil'); return P && { n: P.birds.length, white: P.birds.every(b => b.colour === 'white'), models: f.coopModels() }; });
s = await st();
ok('"Place their coop now": the white Silkies on the farm in their rustic Pagoda', s.coops === 'rir,orp,sil' && sil && sil.n === 3 && sil.white && sil.models.includes('rustic_sil') && !s.dot, { s, sil });
// a save changed outside: a breed's coop before its level, a breed twice
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d;
  const add = (id, breed, x) => { d.coops.push({ ...d.coops[0], id, breed, x, eggs: 0, brood: null }); for (const [k, sex] of [['r', 'r'], ['h', 'h'], ['i', 'h']]) d.birds.push({ id: 'b9' + id.slice(1) + (k === 'r' ? 1 : k === 'h' ? 2 : 3), name: 'Zed', sex, breed, pers: 'diva', coop: id, since: 1, exp: 0, trust: 0, laid: 1 }); };
  add('c901', 'leg', -10); add('c902', 'orp', -14);
  localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a save changed outside (a Legbar coop at level 6, the Orpingtons twice): checked and flagged', s.edited && s.coops === 'rir,orp,sil' && s.birds === 9 && s.plots === 3, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

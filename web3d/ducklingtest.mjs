// The call ducklings in the game (30 Oct 2026, Audrey: "all good carry on"): node ducklingtest.mjs   (LANG=fr; W, H: the
// screen; SHOTS: a folder for pictures)
// A farm at level 10 with its call ducks placed. A duck goes broody: she walks up into the nest and sits (her card: sitting
// on 3 eggs). They hatch: "3 ducklings have hatched!", out she comes and her ducklings after her, following her (a
// duckling's card: a duckling, hers; her card: raising 3 ducklings). A reload while she's raising them: they're out with
// her. A day on: young ducks and drakes ("turning into young ducks and drakes"; a young one's card). Grown: the coins in,
// their send-off at the gate as the hens' (lined up inside it out of the water, the farmer outside cheering, a hop of
// joy each, then out one by one and off the farm past its edge, the farmer watching, the view never moved), then the
// congratulations card (young ducks and drakes, "her next ducklings"); she's up and about again. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/kids_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const xpAt = L => Math.round(60 * Math.pow(L - 1, 2.1)) + 5;
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(); return { level: g.level, waiting: g.waitingCoops().join(), coops: g.data.coops.map(c => c.breed).join(), birds: g.data.birds.length, card: f.gameUI().kind, edited: g.edited, move: f.move.state().on }; });
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const pen = () => p.evaluate(() => { const f = window.__farm, g = f.game(), P = f.coopPlots().find(q => q.breed === 'call'); if (!P || !P.callPen) return null;
  const c = g.data.coops.find(x => x.breed === 'call');
  return { ducks: P.callPen.ducks.map(d => ({ kind: d.kind, name: d.name, gid: d.gid, game: (g.bird(d.gid) || {}).name, task: d.task && d.task.name, seen: d.root.visible, x: +d.pos.x.toFixed(2), z: +d.pos.z.toFixed(2) })), eggs: c && c.eggs, nest: P.nest.count, shown: P.nest.eggs.count, tier: c && c.tier, house: f.coopLook(f.coopPlots().filter(q => q.gc).indexOf(P)).house, group: !!P.callPen.group.parent }; });
const T = { next: fr ? /Au niveau 10 : Canard Call/ : /At level 10: Call duck/, breed: fr ? /Nouvelle race : Canard Call/ : /New breed: Call duck/, place: fr ? /Installer leur poulailler/ : /Place their coop now/,
  welcome: fr ? /Bienvenue, .+ et .+ !/ : /Welcome, .+ and .+!/, card: fr ? /Canard Call · Cane/ : /Call duck · Duck/, ducklings: fr ? /ses canetons/ : /her ducklings/, feed: fr ? /Vos canes pondent/ : /Your ducks lay/,
  coop: fr ? /Maison flottante/ : /Floating House/, egg: fr ? /Œufs de cane vert pâle/ : /Pale green duck eggs/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 9, nine fields
await p.evaluate(L9 => { const g = window.__farm.game(); g.data.xp = L9; g.data.lvSeen = 9; g.data.coins = 5000; g.data.land = [0, 1, 2, 3, 4, 5, 6, 7, 8]; g.data.guide = { step: 5, done: true }; g.save(); }, xpAt(9));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
await p.tap('.gcoops'); await run(0.3);
let t = await sheet();
ok('level 9, Your coops: what level 10 brings, the call ducks', T.next.test(t), t.slice(-300));
await p.evaluate(() => window.__farm.gameUI().close());
// level 10: its card, then "Place their coop now"
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.land.push(9); g.save(); }, xpAt(10)); await run(1.6);
let s = await st(); t = await sheet();
await shot('1_level10');
ok('level 10: its card says a new breed has come (the call ducks), "Place their coop now"', s.level === 10 && s.card === 'levelup' && T.breed.test(t) && T.place.test(t), { s, t: t.slice(0, 300) });
await p.tap('.gsheet .gstick .gbtn:first-child'); await run(0.6);
let m = await p.evaluate(() => window.__farm.move.state());
if (!m.ok) { await p.evaluate(() => window.__farm.move.to(-33, -23, 90)); await run(0.1); m = await p.evaluate(() => window.__farm.move.state()); }
await p.tap('.gmove-go'); await run(1.5);
s = await st();
let P = await pen();
const hint = await p.evaluate(() => document.getElementById('hint').textContent);
ok('placed: the rustic Floating House with its trio in their pen, the drake first, their game names', !s.move && /call/.test(s.coops) && P && P.ducks.length === 3 && P.ducks.map(d => d.kind).join() === 'call_m,call_f,call_f' && P.ducks.every(d => d.gid && d.name === d.game) && P.house === 'box_call' && P.tier === 0 && T.welcome.test(hint), { s, P, hint });
// ---- a duck goes broody
const SIT = 24 * 3600e3, YOUNG = 24 * 3600e3, GROW = 52 * 3600e3;
const K = () => p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), C = Q.callPen, g = f.game(), c = g.data.coops.find(x => x.breed === 'call');
  return { brood: c.brood && { n: c.brood.n, hatched: c.brood.hatched, hen: c.brood.hen }, mum: C.ducks.filter(d => d.broody || (C.brood && C.brood.mum === d)).map(d => ({ gid: d.gid, broody: !!d.broody, task: d.task && d.task.name, seen: d.root.visible, inHouse: !!d.inHouse })),
    kids: C.kids.map(k => ({ kind: k.kind, young: k.young || null, out: !k.inHouse && k.root.visible, size: +(k.size || 1).toFixed(2), card: !!k.gameChick, task: k.task && k.task.name, leaving: !!k.leaving })), coins: g.data.coins, hint: document.getElementById('hint').textContent, card: f.gameUI().kind }; });
const setStart = off => p.evaluate(off => { const g = window.__farm.game(), c = g.data.coops.find(x => x.breed === 'call'); c.brood.start = window.__T + off; g.save(); }, off);
const hen = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'call'), Q = f.coopPlots().find(q => q.breed === 'call'), d = Q.callPen.ducks.find(x => x.kind === 'call_f');
  c.brood = { hen: d.gid, start: window.__T - 1000, n: 3, hatched: false }; c.lastBrood = 0; g.save(); return d.gid; });
let k = await K();
for (let i = 0; i < 30 && !(k.mum.length && k.mum[0].broody); i++) { await run(1); k = await K(); }      // (once she's free to: off the water, not busy)
ok('a duck goes broody: she goes up to the nest', k.mum.length === 1 && k.mum[0].gid === hen && k.mum[0].broody, k);
await run(40);
k = await K();
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); f.lookAt(Q.centre.x, Q.centre.z, 1.6); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await shot('1_sitting');
ok('...and sits on her eggs in the nest at the window', k.mum[0].task === 'sit' && k.mum[0].seen, k);
await p.evaluate(gid => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); f.openBirdCard(Q.callPen.ducks.find(d => d.gid === gid)); }, hen); await run(0.3);
t = await sheet();
ok('her card: sitting on 3 eggs', (fr ? /Couve 3 œufs/ : /Sitting on 3 eggs/).test(t), t.slice(0, 600));
await p.evaluate(() => window.__farm.gameUI().close());
// ---- they hatch: out she comes, her ducklings after her
await setStart(-SIT + 1500); await run(3);
k = await K();
ok('they hatch: "3 ducklings have hatched!", the brood hatched', k.brood && k.brood.hatched && (fr ? /3 canetons sont nés/ : /3 ducklings have hatched/).test(k.hint) && k.kids.length === 3, k);
await run(40);
k = await K();
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), C = Q.callPen; const w = C.brood.mum.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 1.2); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await shot('2_hatched');
ok('out she comes, her three ducklings after her, following her', k.kids.filter(x => x.out).length === 3 && k.kids.every(x => x.task === 'kid' && x.kind === 'call_d' && x.card), k);
await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); f.chickCard(Q.callPen.kids[0]); }); await run(0.3);
t = await sheet();
await shot('3_duckling');
ok('a duckling\'s card: a duckling, hers', (fr ? /Caneton/i : /Duckling/i).test(t) && (fr ? /caneton de/ : /’s duckling/).test(t), t.slice(0, 400));
await p.evaluate(() => window.__farm.gameUI().close());
await p.evaluate(gid => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); f.openBirdCard(Q.callPen.ducks.find(d => d.gid === gid)); }, hen); await run(0.3);
t = await sheet();
ok('her card: raising 3 ducklings, no eggs for sale meanwhile', (fr ? /Élève 3 canetons/ : /Raising 3 ducklings/).test(t) && (fr ? /ses canetons/ : /her ducklings/).test(t), t.slice(0, 700));
await p.evaluate(() => window.__farm.gameUI().close());
// ---- a reload while she's raising them: they're out with her
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(3);
k = await K();
ok('a reload: her ducklings out with her', k.kids.length === 3 && k.kids.filter(x => x.out).length === 3 && k.mum.length === 1 && !k.mum[0].broody, k);
// ---- a day on: young ducks and drakes
await setStart(-SIT - YOUNG + 1500); await run(3);
k = await K();
ok('a day on: young ducks and drakes, "turning into young ducks and drakes"', k.kids.length === 3 && k.kids.every(x => x.young && /^call_[mf]$/.test(x.kind) && x.size >= 0.6) && (fr ? /deviennent de jeunes canes et canards/ : /turning into young ducks and drakes/).test(k.hint), k);
await run(20);
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), C = Q.callPen; const w = C.kids[0].root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z + 0.25, 1.2); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); f.chickCard(Q.callPen.kids[0]); }); await run(0.3);
t = await sheet();
await shot('4_young');
ok('a young one\'s card: a young duck or drake', (fr ? /Jeune cane|Jeune canard/ : /Young duck|Young drake/).test(t), t.slice(0, 400));
await p.evaluate(() => window.__farm.gameUI().close());
// ---- grown: off to a new farm (Audrey, 30 Oct: "Finish the ducks properly"): their send-off at the gate, as the hens'
const coins0 = (await K()).coins;
const gi = await p.evaluate(() => window.__farm.coopPlots().filter(q => q.gc).findIndex(q => q.breed === 'call'));
const view0 = await p.evaluate(() => window.__farm.view.target.toArray().join());
await setStart(-SIT - GROW + 1500);
let fw = null;
for (let i = 0; i < 12 && !fw; i++) { await run(0.5); fw = await p.evaluate(i => window.__farm.farewell(i), gi); }
k = await K();
ok('grown: their coins in, the brood over, a send-off begins ("off to a new farm"), each heading for the gate', !k.brood && k.coins > coins0 && fw && fw.duck && fw.left === 3 && k.kids.every(x => x.leaving) && (fr ? /partent pour une nouvelle ferme/ : /off to a new farm/).test(k.hint), { k, fw, coins0 });
let ready = false, party = false, lined = null;
for (let i = 0; i < 40 && !(fw && fw.phase === 'exit'); i++) {
  await run(1); fw = await p.evaluate(i => window.__farm.farewell(i), gi); ready = ready || !!(fw && fw.ready);
  if (fw && fw.phase === 'party' && !party) {
    party = true;
    lined = await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), C = Q.callPen; return C.kids.map(k => ({ x: +k.pos.x.toFixed(2), z: +k.pos.z.toFixed(2), there: !!k.leaving.there, dry: k.wet < 0.1, onLand: C.onLand(k) })); });
    if (SHOTS) { await run(1.5); await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), C = Q.callPen, w = C.kids[1].root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z + 0.3, 1.5); f.step(1 / 30, 3); }); await p.waitForTimeout(300); await shot('5_sendoff'); await p.evaluate(v => { const f = window.__farm, a = v.split(',').map(Number); f.lookAt(a[0], a[2], 1.6); }, view0); }
  }
}
ok('the farmer comes to the gate and cheers; lined up inside it, out of the water, for a hop of joy each; then out they go', ready && party && fw && fw.phase === 'exit' && lined && lined.length === 3 && lined.every(q => q.there && q.dry && q.onLand), { fw, lined });
if (SHOTS) { await run(4); await p.evaluate(() => { const f = window.__farm, L = f.farmer(); f.lookAt(L.pos.x, L.pos.z + 0.6, 1.8); f.step(1 / 30, 3); }); await p.waitForTimeout(300); await shot('6_off'); }
let gone = false, s2 = null;
for (let i = 0; i < 90 && !gone; i++) { await run(1); s2 = await p.evaluate(i => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); return { kids: Q.callPen.kids.length, fw: f.farewell(i) }; }, gi); gone = s2.kids === 0 && !s2.fw; }
const ex = await p.evaluate(i => window.__farm.lastExit(i), gi);
ok('one by one out of the gate and all the way off the farm (past its edge), the farmer watching them go, then gone', gone && ex && ex.past >= 1.0 && ex.look <= 45, { ex, s2 });
if (SHOTS) await p.evaluate(v => { const f = window.__farm, a = v.split(',').map(Number); f.lookAt(a[0], a[2], 1.6); f.step(1 / 30, 3); }, view0);
ok('the view never moved by itself', SHOTS || view0 === await p.evaluate(() => window.__farm.view.target.toArray().join()), view0);
await run(2);
k = await K();
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); f.lookAt(Q.centre.x, Q.centre.z, 1.6); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
const card = await p.evaluate(() => ({ kind: window.__farm.gameUI().kind, t: document.querySelector('.gsheet') ? document.querySelector('.gsheet').innerText : '' }));
await shot('7_congrats');
ok('the congratulations card: young ducks and drakes, her next ducklings', card.kind === 'congrats' && (fr ? /Jeune cane|Jeune canard/ : /Young duck|Young drake/).test(card.t) && (fr ? /prochains canetons/ : /next ducklings/).test(card.t), card);
await p.evaluate(() => window.__farm.gameUI().close()); await run(5);
k = await K();
const up = await p.evaluate(gid => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), d = Q.callPen.ducks.find(x => x.gid === gid); return { broody: !!d.broody, inHouse: !!d.inHouse, task: d.task && d.task.name }; }, hen);
ok('she\'s up and about again', !up.broody && !up.inHouse, up);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

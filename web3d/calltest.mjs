// The call ducks in the game (30 Oct 2026, Audrey: "Yes, put them in"; at level 10): node calltest.mjs   (LANG=fr; W, H:
// the screen, e.g. W=874 H=402; SHOTS: a folder for pictures)
// A farm at level 9: Your coops says what level 10 brings (the call ducks). Level 10: its card says a new breed has come,
// "Place their coop now": the rustic Floating House with its trio (Pip-style drake first) living in their pen, their game
// names over them; a tap on a duck: her card ("Call duck · Duck", "her ducklings"), she stops and faces you; Cuddle:
// hearts and a happy bob, the cuddle counted; her lay when it's due: up the gangplank into the nest, the egg in the save
// and in the straw; the feeder's card speaks of ducks; the Breed Book: the call ducks' page found with its picture; the
// Snug look: the pen made again round the same three; the shows take no ducks; a reload keeps it all unflagged; a call
// coop before level 10, put in from outside: flagged. No page errors.
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
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/call_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
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
// a while on the farm: about their pen, nobody laying on their own (the game says when)
await run(20);
P = await pen();
ok('a while later: about their pen, none gone to lay by herself', P.ducks.every(d => d.task !== 'lay') && P.eggs === 0, P);
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); f.lookAt(Q.centre.x, Q.centre.z, 2.4); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await shot('2_pen');
// a tap on a duck: her card; she stays and faces you
const tapAt = await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), d = Q.callPen.ducks[1];
  d.task = null; const w = d.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 1.6); f.step(1 / 30, 30); f.draw(); const v = d.root.getWorldPosition(new f.THREE.Vector3()); const q = f.screenOf(v.x, v.z, v.y + 0.14); return { x: q.x, y: q.y, gid: d.gid }; });
await p.touchscreen.tap(tapAt.x, tapAt.y); await run(0.6);
t = await sheet();
const held = await p.evaluate(gid => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), d = Q.callPen.ducks.find(x => x.gid === gid); return { held: d.held, task: d.task && d.task.name, card: f.gameUI().kind }; }, tapAt.gid);
await shot('3_card');
ok('a tap on a duck: her card ("Call duck · Duck", her ducklings), she stays and faces you', held.card === 'bird' && T.card.test(t) && T.ducklings.test(t) && held.held && held.task === 'held', { held, t: t.slice(0, 400) });
// Cuddle: hearts, a happy bob, the cuddle counted
await p.tap('.gsheet .gcuddle'); await run(0.4);
const cud = await p.evaluate(gid => { const f = window.__farm, g = f.game(), Q = f.coopPlots().find(q => q.breed === 'call'), d = Q.callPen.ducks.find(x => x.gid === gid); return { held: d.held, task: d.task && d.task.name, happy: g.happyLeft(g.bird(gid)) > 0, card: f.gameUI().kind }; }, tapAt.gid);
await shot('4_cuddle');
ok('Cuddle: the card closes, she turns to you for a happy bob and a quack, the cuddle counted', !cud.held && cud.task === 'cuddle' && cud.happy && cud.card !== 'bird', cud);
await run(8);
// her lay when it's due: up the gangplank and into the nest, the egg in the save and in the straw
const hen = await p.evaluate(() => { const f = window.__farm, g = f.game(), Q = f.coopPlots().find(q => q.breed === 'call'), d = Q.callPen.ducks.find(x => x.kind === 'call_f'); g.data.first = { hen: d.gid, t: window.__T - 500 }; g.save(); return d.gid; });
let went = false;
for (let k = 0; k < 40; k++) {
  await run(2);
  const q = await p.evaluate(gid => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), d = Q.callPen.ducks.find(x => x.gid === gid); return { laying: d.laying, eggs: f.game().data.coops.find(c => c.breed === 'call').eggs }; }, hen);
  if (q.laying) went = true;
  if (q.eggs > 0 && went) break;
}
P = await pen();
const hintLay = await p.evaluate(() => document.getElementById('hint').textContent);
ok('her lay when it\'s due: she goes up into the nest and lays, the egg in the save and in the straw', went && P.eggs === 1 && P.nest === 1 && P.shown === 1, { went, P, hintLay });
await run(15);
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); f.lookAt(Q.centre.x, Q.centre.z, 2.0); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await shot('5_egg');
// the feeder's card
await p.evaluate(() => { const f = window.__farm; f.feederCard(f.coopPlots().filter(q => q.gc).findIndex(q => q.breed === 'call')); }); await run(0.3);
t = await sheet();
ok('the feeder\'s card: "Your ducks lay while there\'s food in it"', T.feed.test(t), t.slice(0, 300));
await p.evaluate(() => window.__farm.gameUI().close());
// the Breed Book
await p.evaluate(() => window.__farm.book()); await run(0.3);
await p.waitForFunction(() => { const i = document.querySelector('.gpage[data-breed="call"] img'); return i && i.complete; }, null, { timeout: 20000 }).catch(() => {});
const book = await p.evaluate(() => { const pg = [...document.querySelectorAll('.gpage')], c = document.querySelector('.gpage[data-breed="call"]'); return { n: pg.length, order: pg.map(x => x.dataset.breed).join(), found: c && !c.classList.contains('gpage-no'), text: c && c.innerText, img: c && c.querySelector('img').naturalWidth }; });
if (SHOTS) { await p.evaluate(() => document.querySelector('.gpage[data-breed="call"]').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); }
await shot('6_book');
ok('the Breed Book: the call ducks\' page after the Ayam Cemani, found, with their eggs, their Floating House and their picture', book.n === 15 && /^rir,orp,sil,aya,call,sil_buff/.test(book.order) && book.found && T.egg.test(book.text) && T.coop.test(book.text) && book.img > 0, book);
await p.evaluate(() => window.__farm.gameUI().close());
// the Snug look: the pen made again round the same three
const before = P.ducks.map(d => d.gid).join();
await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'call'); c.tier = 2; g.save(); f.retier(f.coopPlots().filter(q => q.gc).findIndex(q => q.breed === 'call')); }); await run(3);
P = await pen();
ok('the Snug look: the Floating House on its raft, the pen made again round the same three', P.house === 'house_call' && P.ducks.map(d => d.gid).join() === before && P.group && P.ducks.every(d => d.seen || d.task === 'lay'), P);
// trusting ducks: the farmer stops by their fence, they come to the front of their yard to say hello
await run(20);
const greet = await p.evaluate(() => { const f = window.__farm, g = f.game(), Q = f.coopPlots().find(q => q.breed === 'call');
  for (const d of Q.callPen.ducks) { g.bird(d.gid).trust = 8; if (d.inHouse || d.laying) continue; const y = Q.callPen.yardSpot(); d.pos.set(y[0], 0, y[1]); d.wet = 0; d.task = null; }      // (out on the yard: not afloat)
  f.step(1 / 30, 2);
  const v = Q.frame.localToWorld(new f.THREE.Vector3(0.3, 0, Q.pen.pen.max[2] + 0.8)); f.greetAt(v.x, v.z); return Q.callPen.ducks.map(d => d.task && d.task.name); });
await run(12);
const greeted = await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); return Q.callPen.ducks.map(d => ({ task: d.task && d.task.name, z: +d.pos.z.toFixed(2) })); });
const front = await p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); return Q.pen.yard.max[2]; });
ok('trusting ducks: the farmer at their fence, they come to the front of the yard to say hello', greet.filter(x => x === 'greet').length >= 2 && greeted.filter(d => d.z > front - 0.6).length >= 2, { greet, greeted, front });
// the shows take no ducks
const shows = await p.evaluate(() => { const g = window.__farm.game(), s = { id: 'c20261026', tier: 'c', breed: null, locked: false }; return g.showBirds(s).some(x => g.isDuck(x.b.breed)); });
ok('the shows take no ducks', !shows);
// a reload keeps it all, unflagged
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st(); P = await pen();
ok('a reload: the call ducks\' coop, its three and its egg, not flagged', /call/.test(s.coops) && P && P.ducks.length === 3 && P.ducks.map(d => d.gid).join() === before && P.eggs === 1 && !s.edited, { s, P });
// a call coop at level 9, put in from outside: flagged
await p.evaluate(L9 => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = L9; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); }, xpAt(9));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a call coop at level 9, put in from outside: checked and flagged', s.edited, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

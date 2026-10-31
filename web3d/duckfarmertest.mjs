// The farmer in the call ducks' pen (30 Oct 2026, Audrey: "Finish the ducks properly"): node duckfarmertest.mjs   (LANG=fr;
// W, H: the screen; SHOTS: a folder for pictures; LOOKS: which of the five looks, e.g. 0,2,4)
// A farm at level 10 with its call ducks placed; in each look of their pen: the feeder filled, the farmer brings the feed:
// he walks in by the gate and about on dry land only (never into their pond, never through the feeder), pours it, throws
// the corn, which lands on the dry yard; the ducks hurry over and peck it all up; nobody in his boots. A cuddle: he
// crouches, she comes over (out of the water if she was in it) and settles in front of him; he picks her up and holds her
// (in his arms), sets her down on dry land; she's off about her day. Her worms (a trusting duck): she comes to his side,
// dabbles them up and drops them in his hand. Their personalities: each one's line a duck's on her card (her ducklings,
// the pond...), and after laying each pleased with herself her own way (the Diva's strut, the Brave's watch and flap, the
// Glutton's snack at the feeder, the Rebel's hop and splashy bath, the Good mum's rest). No page errors.
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
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/farmer_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
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

const LOOKS = (process.env.LOOKS || '0,1,2,3,4').split(',').map(Number);
const gi = await p.evaluate(() => window.__farm.coopPlots().filter(q => q.gc).findIndex(q => q.breed === 'call'));
// one moment of the visit: where he is (the pen's frame), how far into the pond (pondS), the ducks' nearest to him, the grains
const probe = () => p.evaluate(() => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), C = Q.callPen, F = Q.farmer, Lf = f.farmer();
  const fr = Lf && Lf.pos ? Q.frame.worldToLocal(Lf.pos.clone()) : null;
  const inPen = fr && fr.x > C.o.yard.min[0] - 0.25 && fr.x < C.o.yard.max[0] + 0.25 && fr.z > C.o.yard.min[2] - 0.25 && fr.z < C.o.yard.max[2] + 0.12;
  const near = F ? Math.min(9, ...C.all().filter(d => C.solid(d)).map(d => Math.hypot(d.pos.x - F.x, d.pos.z - F.z))) : 9;
  const corn = Q.corn ? Q.corn.g.filter(q => q.landed && !q.eaten) : [];
  return { inPen, s: fr ? +C.pondS(fr.x, fr.z).toFixed(3) : 9, x: fr && +fr.x.toFixed(2), z: fr && +fr.z.toFixed(2), visit: !!F, near: +near.toFixed(3), left: corn.length, wet: corn.filter(q => !C.free(q.to[0], q.to[1], 0)).length, eating: C.ducks.filter(d => d.task && d.task.name === 'eat').length,
    task: Lf && Lf.task && Lf.task.name, m: Math.min(C.P.a, C.P.b) }; });
const watch = async (secs, each) => { const out = []; for (let i = 0; i < secs * 5; i++) { await run(0.2); const q = await probe(); out.push(q); if (each && each(q, out)) break; } return out; };
const duckAt = (sel) => p.evaluate(sel => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), C = Q.callPen, d = C.ducks.find(x => x.gid === sel);
  return { task: d.task && d.task.name, carry: !!(d.cuddle && d.cuddle.carry), k: d.cuddle && d.cuddle.carry ? d.cuddle.carry.k : 0, y: +d.pos.y.toFixed(3), onLand: C.onLand(d), s: +C.pondS(d.pos.x, d.pos.z).toFixed(2), wet: +d.wet.toFixed(2), worms: (window.__farm.lastPen && window.__farm.lastPen()) || null }; }, sel);
for (const t of LOOKS) {
  await p.evaluate(([t, gi]) => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'call'); c.tier = t; g.save(); f.retier(gi); }, [t, gi]); await run(3);
  const house = await p.evaluate(gi => window.__farm.coopLook(gi).house, gi);
  // ---- the feed
  await p.evaluate(gi => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'call'); c.feed = 0; c.fedAt = 0; g.save(); f.gameTick(window.__T); f.fillFeeder(gi); }, gi);
  let seen = false, thrown = false;
  const w = await watch(90, (q, all) => { seen = seen || q.visit; thrown = thrown || q.left > 0; return seen && !q.visit && thrown && q.left === 0; });
  const inPen = w.filter(q => q.inPen && q.visit), minS = Math.min(...inPen.map(q => q.s)), m = w[0].m;
  ok(`${house}: the farmer brings the feed, about the yard on dry land only (never in their pond)`, seen && inPen.length > 5 && minS > 1 + 0.22 / m, { minS, need: +(1 + 0.22 / m).toFixed(3), at: inPen.reduce((a, q) => q.s < a.s ? q : a, inPen[0]) });
  ok(`${house}: the corn lands on the dry yard, the ducks hurry over and peck it all up`, thrown && w.every(q => q.wet === 0) && Math.max(...w.map(q => q.eating)) >= 2 && w[w.length - 1].left === 0, { thrown, wet: Math.max(...w.map(q => q.wet)), eating: Math.max(...w.map(q => q.eating)), left: w[w.length - 1].left });
  ok(`${house}: nobody in his boots`, Math.min(...w.filter(q => q.visit).map(q => q.near)) > 0.27, { near: Math.min(...w.filter(q => q.visit).map(q => q.near)) });
  if (SHOTS && t === LOOKS[0]) await shot(`${t}_fed`);
  await run(4);
  // ---- a cuddle
  const sel = await p.evaluate(() => { const f = window.__farm, g = f.game(), Q = f.coopPlots().find(q => q.breed === 'call'), C = Q.callPen, d = C.ducks.find(x => x.kind === 'call_f' && !C.busy(x)) || C.ducks.find(x => x.kind === 'call_f'); const b = g.bird(d.gid); b.happy = 0; b.trust = 8; b.worm = ''; g.save(); f.openBirdCard(d); return d.gid; });
  await run(0.4);
  await p.evaluate(() => document.querySelector('.gsheet .gcuddle').click()); await run(0.3);
  let carried = 0, came = false, wentIn = false;
  for (let i = 0; i < 300; i++) { await run(0.2); const d = await duckAt(sel), q = await probe(); came = came || d.task === 'cuddle'; if (d.carry && d.k > 0.9) carried++; if (q.inPen && q.visit && q.s < 1 + 0.22 / q.m) wentIn = true; if (came && !q.visit && i > 20 && d.task !== 'cuddle') break; }
  let d = await duckAt(sel);
  ok(`${house}: a cuddle: she comes over, he picks her up and holds her, sets her down on dry land, she's off about her day`, came && carried > 10 && !d.carry && d.task !== 'cuddle' && (d.onLand || d.wet > 0.5) && !wentIn, { came, carried, d, wentIn });
  // ---- her worms
  await p.evaluate(sel => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'); f.openBirdCard(Q.callPen.ducks.find(x => x.gid === sel)); }, sel); await run(0.4);
  const hasW = await p.evaluate(() => !!document.querySelector('.gsheet .gworms'));
  if (hasW) {
    await p.evaluate(() => document.querySelector('.gsheet .gworms').click()); await run(0.3);
    let dug = 0, inHand = 0, side = null; came = false;
    for (let i = 0; i < 300; i++) { await run(0.2); const q = await p.evaluate(sel => { const f = window.__farm, Q = f.coopPlots().find(q => q.breed === 'call'), d = Q.callPen.ducks.find(x => x.gid === sel); const P = f.penWorms ? f.penWorms() : null; return { task: d.task && d.task.name, dig: !!(d.cuddle && d.cuddle.dig), visit: !!Q.farmer, side: P }; }, sel); came = came || q.task === 'cuddle'; if (q.dig) dug++; if (q.side) side = q.side; if (came && !q.visit && i > 20 && q.task !== 'cuddle') break; }
    d = await duckAt(sel);
    ok(`${house}: her worms: she comes to his side, dabbles them up and drops them in his hand`, came && dug > 10 && d.task !== 'cuddle', { came, dug, side, d });
    if (SHOTS && t === LOOKS[0]) await shot(`${t}_worms`);
  } else ok(`${house}: her card offers worms (a trusting duck)`, false, await p.evaluate(() => document.querySelector('.gsheet').innerText.slice(0, 500)));
  await p.evaluate(() => window.__farm.gameUI().close());
  await run(3);
}
// ---- their personalities (the card's words, a duck's; after laying, each her own way of being pleased with herself)
const PERS = { mum: { acts: ['rest'], line: fr ? /ses canetons/ : /her ducklings/ }, diva: { acts: ['proud'], line: fr ? /projecteurs/ : /limelight/ }, brave: { acts: ['watch', 'flap'], line: fr ? /veille sur la mare/ : /watch over the pond/ },
  glutton: { acts: ['snack'], line: fr ? /mangeoire/ : /feeder/ }, rebel: { acts: ['hop', 'bathe'], line: fr ? /première à l’eau/ : /first into the pond/ } };
for (const [pers, want] of Object.entries(PERS)) {
  const gid = await p.evaluate(pers => { const f = window.__farm, g = f.game(), C = f.coopPlots().find(q => q.breed === 'call').callPen, d = C.ducks.find(x => x.kind === 'call_f'); d.pers = pers; g.bird(d.gid).pers = pers; g.save(); f.openBirdCard(d); return d.gid; }, pers);
  await run(0.4); const t = await sheet(); await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5);
  let laid = false; const acts = new Set();
  for (let i = 0; i < 480; i++) {
    const q = await p.evaluate(gid => { const C = window.__farm.coopPlots().find(q => q.breed === 'call').callPen, d = C.ducks.find(x => x.gid === gid); if (d.laidOn !== C.day && (!d.task || d.task.name !== 'lay') && C.canLay(d)) C.layNow(d); return { task: d.task && d.task.name, act: d.act, laid: d.laidOn === C.day }; }, gid);
    if (q.laid) laid = true; if (laid && (q.task === 'lay' || q.task === 'pleased')) acts.add(q.act); if (laid && q.task !== 'lay' && q.task !== 'pleased') break;
    await run(0.25);
  }
  await p.evaluate(gid => { const C = window.__farm.coopPlots().find(q => q.breed === 'call').callPen; C.ducks.find(x => x.gid === gid).laidOn = -1; }, gid);
  ok(`a ${pers} duck: her card's words a duck's; after laying, pleased with herself her own way`, want.line.test(t) && laid && want.acts.every(a => acts.has(a)), { acts: [...acts], laid, line: t.match(/(PERSONALITY|PERSONNALITÉ)[^]*?\n\n[^\n]+\n\n([^\n]+)/i)?.[2] });
}
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

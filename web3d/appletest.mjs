// The Glutton's apples (6 Nov 2026, Audrey: "Do we still have the apple trees for the gloutons chickens?"; "Yes, with the
// apple egg"): node appletest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402; SHOTS: a folder for pictures)
// (Then "I'd like the tree outside the coop as the gluton escape to eat".) A new farm, one of its hens a Glutton: her card
// says she'd love a tree; within seconds one's planted just outside the Rustic coop's pen, on the side the camera sees
// (two apples on it; the hint says so): outside the pen's fence, the coop's footprint taking in its corner (the coop still
// stands where it is, nothing else there); her card speaks of her escapes. Her outing: to the side fence, a flutter up
// over it (well above the fence), round under an apple, a look up, a leap (off the ground), it falls in front of her and
// she eats it (the save: one apple fewer, one eaten), back over the fence and in the yard again; the second: an apple
// egg, laid at the nook under the tree outside (the hint says so); no outing while it waits. Mended: the tree still
// outside the bigger pen. A tap on it: sold for three of her breed's eggs and 3 XP. A tap on the
// tree: none left, the next in 3 hours; 7 hours on, two; at most four. The welcome-back summary speaks of a waiting egg. A
// reload keeps it all unflagged; apples put up from outside: four at most, never ahead of now, flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-11-06T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', String(window.__T)); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1200); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/apple_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const T = {
  line0: fr ? /Elle rêve d’un pommier juste à côté de son poulailler/ : /She’d love an apple tree just outside her coop/,
  line: fr ? /elle s’échappe par-dessus la clôture jusqu’à son pommier/ : /she slips out over the fence to her apple tree/,
  planted: fr ? /Un pommier pour \S+ la Gourmande, juste à côté de son poulailler/ : /An apple tree for \S+ the Glutton, just outside her coop/,
  laid: fr ? /Deux pommes, et \S+ a pondu un œuf doré/ : /Two apples, and \S+ laid an apple egg/,
  sold: fr ? /Un œuf doré vendu · \+18 pièces · \+3 XP/ : /An apple egg sold · \+18 coins · \+3 XP/,
  none: fr ? /Pas encore de pomme sur l’arbre de \S+ : la prochaine dans (3 h|2 h 5\d min)/ : /No apples on \S+’s tree yet: the next one in (3 h|2 h 5\d min)/,
  two: fr ? /2 pommes sur l’arbre de/ : /2 apples on \S+’s tree/,
  away: fr ? /Un œuf doré sous le pommier/ : /An apple egg under the apple tree/,
};
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
// one of the hens a Glutton (the rebel), in the save and in the yard
const HEN = await p.evaluate(() => { const f = window.__farm, g = f.game(), h = g.data.birds.find(b => b.sex === 'h' && b.pers === 'rebel'); h.pers = 'glutton'; g.save();
  for (const x of f.gamePlots()[0].birds) if (x.gid === h.id) x.pers = 'glutton'; return h.id; });
const st = () => p.evaluate(id => { const f = window.__farm, g = f.game(), c = g.data.coops[0], P = f.gamePlots()[0], A = P.apple, b = P.birds.find(x => x.gid === id);
  return { tier: c.tier, ap: c.ap ? { ...c.ap } : null, n: c.ap ? g.applesAt(c) : 0, tree: !!A, shown: A ? A.apples.filter(m => m.visible).length : 0, egg: !!(A && A.egg.visible),
    coins: g.data.coins, xp: g.data.xp, edited: !!g.edited, play: b && b.play ? b.play.kind + ':' + b.play.phase : null, hint: document.getElementById('hint').textContent }; }, HEN);
const card = () => p.evaluate(id => { const f = window.__farm, g = f.game(); f.gameUI().birdCard(g.bird(id)); const t = document.querySelector('.gsheet').innerText; f.gameUI().close(); return t; }, HEN);
const c0 = await card();
ok('her card: her escapes, and that she\'d love a tree (none yet)', T.line.test(c0) && T.line0.test(c0), c0);
await run(4);
let s = await st();
ok('within seconds a tree planted just outside her coop, on a side of its own (saved), two apples on it, the hint says so', s.tree && s.ap && (s.ap.side === 'l' || s.ap.side === 'r') && s.ap.n === 2 && s.ap.ate === 0 && s.ap.egg === false && s.shown === 2 && T.planted.test(s.hint), s);
const spotOut = () => p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[0], A = P.apple, PP = P.pen.pen, [x, z] = A.S.at, c = f.game().data.coops[0], F = f.apples.foot(0), base = f.apples.foot(0);
  return { side: A.S.side, at: A.S.at, slots: A.S.slots.length, outside: A.S.side === 'l' ? x + 0.2 < PP.min[0] : x - 0.2 > PP.max[0], inYardFrom: P.birds[0].free(A.S.inAt[0], A.S.inAt[1]),
    landsOutside: A.S.side === 'l' ? A.S.outAt[0] < PP.min[0] : A.S.outAt[0] > PP.max[0], standsOut: A.S.slots.every(sl => A.free(sl.stand[0], sl.stand[1])), coopOk: f.apples.why(0, A.S.side) === null,
    footWide: F.x1 - F.x0, notInPen: !P.pen.obstacles.some(o => o[0] === x && o[2] === z) }; });
const spot = await spotOut();
ok('…outside the pen\'s fence, a way over from the yard, room to stand under each apple; the coop still stands where it is with its corner', spot.outside && spot.inYardFrom && spot.landsOutside && spot.standsOut && spot.coopOk && spot.notInPen && spot.slots >= 3, spot);
const c1 = await card();
ok('…her card speaks of her escapes (and no more of waiting for a tree)', T.line.test(c1) && !T.line0.test(c1));
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, A = f.gamePlots()[0].apple, w = A.group.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 2.0); f.step(1 / 30, 10); }); await shot('1_tree'); }
// her outing (no waiting for it): she goes, looks up, leaps, it falls in front of her, she eats it
const outing = async () => p.evaluate(id => { const f = window.__farm, g = f.game(), P = f.gamePlots()[0], A = P.apple, b = P.birds.find(x => x.gid === id), v = new f.THREE.Vector3();
  const PP = P.pen.pen, outside = x => x < PP.min[0] || x > PP.max[0], up = () => b.rig.bones.root.getWorldPosition(v).y;      // (her body: the hop's own lift and hers)
  let seen = null;
  for (let tries = 0; tries < 4; tries++) {      // (an outing called off before she's over the fence, the farmer coming into the pen say: another)
    A.next = 0; seen = { phases: [], top: 0, fell: null, n0: g.applesAt(g.data.coops[0]), over: 0, out: false, tries };
    let base = null, y0 = up();
    for (let i = 0; i < 30 * 60; i++) {
      window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false);
      const Q = b.play; if (Q && Q.kind === 'apple') { if (seen.phases[seen.phases.length - 1] !== Q.phase) { seen.phases.push(Q.phase); if (Q.phase === 'out' || Q.phase === 'hop') base = up(); }
        if (Q.phase === 'hop') seen.top = Math.max(seen.top, up() - base);
        if (Q.phase === 'out' || Q.phase === 'in') seen.over = Math.max(seen.over, up() - y0);
        if (Q.phase === 'eat' && outside(b.root.position.x)) seen.out = true;
        if (A.drop && Q.phase === 'eat' && Q.turned && !seen.fell) { const p = b.root.position, fy = b.root.rotation.y, d = [A.drop.to[0] - p.x, A.drop.to[1] - p.z];      // (once she's turned to it to eat)
          seen.fell = { d: +Math.hypot(d[0], d[1]).toFixed(3), ahead: +(d[0] * Math.sin(fy) + d[1] * Math.cos(fy)).toFixed(3), reach: +(0.37 * b.rig.scale).toFixed(3), tub: +Math.hypot(A.drop.to[0] - A.S.at[0], A.drop.to[1] - A.S.at[1]).toFixed(3), herTub: +Math.hypot(p.x - A.S.at[0], p.z - A.S.at[1]).toFixed(3) }; } }
      if (seen.phases.length && !b.play) break;
    }
    if (seen.phases.includes('out')) break;
  }
  sessionStorage.setItem('__T', String(window.__T)); seen.ap = { ...g.data.coops[0].ap }; seen.top = +seen.top.toFixed(3); seen.over = +seen.over.toFixed(3); seen.home = b.free(b.root.position.x, b.root.position.z) && !outside(b.root.position.x); return seen; }, HEN);
let O = await outing();
s = await st();
ok('her escape: to the fence, over it (well above it), under an apple outside, a look up, a leap off the ground, it pops out beside her, away from the tub; she turns to it and bends down to eat it, her beak right over it, she and it clear of the tub; back over, in the yard again', O.phases.join() === 'walk,face,out,go,aim,look,hop,eat,shake,home,turnin,in' && O.over > 0.55 && O.out && O.top > 0.1 && O.fell && Math.abs(O.fell.ahead - O.fell.reach) < 0.04 && O.fell.d < O.fell.reach + 0.04 && O.fell.tub > 0.25 && O.fell.herTub > 0.33 && O.home, O);
ok('…the save: one apple fewer on the tree, one eaten', s.ap.n === 1 && s.ap.ate === 1 && !s.ap.egg && s.shown === 1, s);
O = await outing();
s = await st();
ok('the second: an apple egg, laid at the nook under the tree outside; back in after; the hint says so', O.phases.join() === 'walk,face,out,go,aim,look,hop,eat,nook,settle,lay,off,shake,home,turnin,in' && O.home && s.ap.n === 0 && s.ap.egg === true && s.ap.ate === 0 && s.egg && T.laid.test(s.hint), { O, s });
const wantNow = await p.evaluate(id => { const f = window.__farm, P = f.gamePlots()[0], b = P.birds.find(x => x.gid === id); P.apple.next = 0; return P.apple.want(b); }, HEN);
ok('…no outing while it waits', wantNow === false);
// the welcome-back summary with it waiting
const away = await p.evaluate(() => { const g = window.__farm.game(); return g.awaySummary(window.__T - 3600e3).items.filter(i => i.k === 'apple_egg'); });
ok('the welcome-back summary: an apple egg waiting', away.length === 1 && away[0].n === 1, away);
const awayText = await p.evaluate(() => { const ui = window.__farm.gameUI(), g = window.__farm.game(); return ui.t(g.dk('away_apple_egg1')); });
ok('…in words', T.away.test(awayText), awayText);
// a tap on the egg: sold
const eAt = await p.evaluate(() => { const f = window.__farm, A = f.gamePlots()[0].apple, w = A.egg.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 1.4); f.step(1 / 30, 10); f.draw(); return f.screenOf(w.x, w.z, w.y); });
await shot('2_egg');
const s0 = s;
await p.touchscreen.tap(eAt.x, eAt.y); await run(1.2);
s = await st();
ok('a tap on the apple egg: sold for three of her breed\'s eggs (18 coins) and 3 XP; gone', s.coins === s0.coins + 18 && s.xp === s0.xp + 3 && s.ap.egg === false && !s.egg && T.sold.test(s.hint), { s, s0 });
// the tree tapped: none left; 7 hours on, two; then four at most
const treeTap = () => p.evaluate(() => { const f = window.__farm; f.apples.treeTap(0); return document.getElementById('tag').textContent; });
let tg = await treeTap();
ok('a tap on the tree: no apples yet, the next in about 3 hours', T.none.test(tg), tg);
await p.evaluate(() => { window.__T += 7 * 3600e3; sessionStorage.setItem('__T', String(window.__T)); }); await run(0.5);
s = await st(); tg = await treeTap();
ok('7 hours on: two apples on it, shown, and said so', s.n === 2 && s.shown === 2 && T.two.test(tg), { s, tg });
await p.evaluate(() => { window.__T += 13 * 3600e3; sessionStorage.setItem('__T', String(window.__T)); }); await run(0.5);
s = await st();
ok('13 hours more: four at most', s.n === 4 && s.shown === Math.min(4, await p.evaluate(() => window.__farm.gamePlots()[0].apple.slots.length)), s);
// mended: the tree still outside the bigger pen
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.coops[0].tier = 1; g.save(); f.retier(0); });
const spot1 = await spotOut();
ok('mended: the tree still just outside its bigger pen', spot1.outside && spot1.coopOk && spot1.slots >= 3, spot1);
// a reload keeps it all, unflagged
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
s = await st();
ok('a reload: the tree and its four apples, not flagged', s.tree && s.n === 4 && s.shown >= 3 && !s.edited, s);
// apples put up from outside: checked, flagged
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.coops[0].ap = { n: 50, at: window.__T + 9e8, ate: 7, egg: 'yes' }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
s = await st();
const now = await p.evaluate(() => window.__T);
ok('apples put up from outside: four at most, never ahead of now, no egg, flagged', s.ap && s.ap.n === 4 && s.ap.at <= now && s.ap.ate <= 1 && s.ap.egg === false && s.edited, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

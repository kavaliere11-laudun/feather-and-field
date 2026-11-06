// The Glutton's apples (6 Nov 2026, Audrey: "Do we still have the apple trees for the gloutons chickens?"; "Yes, with the
// apple egg"): node appletest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402; SHOTS: a folder for pictures)
// A new farm, one of its hens a Glutton: in the Rustic coop no tree yet (her card says one comes once it's mended); mended,
// a tree's planted within seconds (two apples on it; the hint says so): in its yard, clear of what's in it, the birds walking
// round its tub; her card speaks of her apples. Her outing: under an apple, a look up, a leap (off the ground), it falls in
// front of her and she eats it (the save: one apple fewer, one eaten); the second: an apple egg, laid at the nook under the
// tree (the hint says so); no outing while it waits. A tap on it: sold for three of her breed's eggs and 3 XP. A tap on the
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
  line0: fr ? /Une fois son poulailler rafistolé, elle aura son propre pommier/ : /Once her coop is mended, she’ll have an apple tree of her own/,
  line: fr ? /Elle saute pour attraper les pommes de son arbre : après deux, elle pond un œuf doré/ : /She hops up for the apples on her tree: after two, she lays an apple egg/,
  planted: fr ? /Un pommier pour \S+ la Gourmande/ : /An apple tree for \S+ the Glutton/,
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
await run(4);
let s = await st();
ok('the Rustic coop: no apple tree for her yet, nor apples in the save', s.tier === 0 && !s.tree && !s.ap, s);
ok('…her card says she\'ll have one once it\'s mended', T.line0.test(await card()));
// mended: a tree planted for her
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.coops[0].tier = 1; g.save(); f.retier(0); });
await run(4);
s = await st();
ok('mended: within seconds a tree planted for her, two apples on it (saved), the hint says so', s.tree && s.ap && s.ap.n === 2 && s.ap.ate === 0 && s.ap.egg === false && s.shown === 2 && T.planted.test(s.hint), s);
const spot = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[0], A = P.apple, Y = P.pen.yard, [x, z] = A.S.at, r = 0.19 * A.S.s;
  const others = P.pen.obstacles.filter(o => !(o[0] === x && o[2] === z));
  return { at: A.S.at, s: A.S.s, slots: A.S.slots.length, inYard: x - r > Y.min[0] - 0.12 && x + r < Y.max[0] + 0.12 && z > Y.min[2] && z < Y.max[2],
    clear: others.every(o => Math.hypot(x - o[0], z - o[2]) >= o[3] + r) && (P.block0 || []).every(o => Math.hypot(x - o[0], z - o[1]) >= o[2] + r),
    inPen: P.pen.obstacles.some(o => o[0] === x && o[2] === z), standsFree: A.S.slots.every(sl => P.birds[0].free(sl.stand[0], sl.stand[1])) }; });
ok('…in its yard, clear of what\'s in it, the birds walking round its tub, room to stand under each apple', spot.inYard && spot.clear && spot.inPen && spot.standsFree && spot.slots >= 3, spot);
ok('…her card speaks of her apples', T.line.test(await card()));
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, A = f.gamePlots()[0].apple, w = A.group.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 2.0); f.step(1 / 30, 10); }); await shot('1_tree'); }
// her outing (no waiting for it): she goes, looks up, leaps, it falls in front of her, she eats it
const outing = async () => p.evaluate(id => { const f = window.__farm, g = f.game(), P = f.gamePlots()[0], A = P.apple, b = P.birds.find(x => x.gid === id); A.next = 0;
  const seen = { phases: [], top: 0, fell: null, n0: g.applesAt(g.data.coops[0]) };
  for (let i = 0; i < 30 * 60; i++) {
    window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false);
    const Q = b.play; if (Q && Q.kind === 'apple') { if (seen.phases[seen.phases.length - 1] !== Q.phase) seen.phases.push(Q.phase); if (Q.phase === 'hop') seen.top = Math.max(seen.top, b.root.position.y);
      if (A.drop && !seen.fell) { const p = b.root.position, fy = b.root.rotation.y, d = [A.drop.to[0] - p.x, A.drop.to[1] - p.z]; seen.fell = { d: +Math.hypot(d[0], d[1]).toFixed(3), ahead: +(d[0] * Math.sin(fy) + d[1] * Math.cos(fy)).toFixed(3) }; } }
    if (seen.phases.length && !b.play) break;
  }
  sessionStorage.setItem('__T', String(window.__T)); seen.ap = { ...g.data.coops[0].ap }; seen.top = +seen.top.toFixed(3); return seen; }, HEN);
let O = await outing();
s = await st();
ok('her outing: under an apple, a look up, a leap off the ground, it falls just in front of her and she eats it', O.phases.join() === 'walk,face,look,hop,eat,ruffle' && O.top > 0.1 && O.fell && O.fell.d < 0.16 && O.fell.ahead > 0.05, O);
ok('…the save: one apple fewer on the tree, one eaten', s.ap.n === 1 && s.ap.ate === 1 && !s.ap.egg && s.shown === 1, s);
O = await outing();
s = await st();
ok('the second: an apple egg, laid at the nook under the tree; the hint says so', O.phases.join() === 'walk,face,look,hop,eat,nook,settle,lay,off,ruffle' && s.ap.n === 0 && s.ap.egg === true && s.ap.ate === 0 && s.egg && T.laid.test(s.hint), { O, s });
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

// The game, release 1 step 7 (experience stars, cuddles and trust): node cuddletest.mjs   (LANG=fr; W, H: the screen)
// A fresh farm on a fake clock: a hen's card has "♥ Cuddle"; a cuddle counts at once (trust, a little experience, happy
// for 6 hours, the farmer comes into the pen), her card then says how long she's happy; no second cuddle meanwhile; 6
// hours on, another; the trust levels' words (Friendly, Trusting: she greets the farmer at the fence; Best friend: +20 XP)
// and trust stopping at 15; a new star from a cuddle; stars from time on the farm; her eggs a coin dearer for each star;
// at night cuddles wait for the morning; trusting birds come to the front fence when the farmer stops by; a reload keeps
// it; a save changed outside (happy for days, trust past 15) is checked and flagged.
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
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const T = { cuddle: fr ? /Faire un câlin/ : /♥ Cuddle/, done: fr ? /fait un câlin à/ : /gives .+ a cuddle/, happy: fr ? /Heureuse après un câlin : encore/ : /Happy after a cuddle: .+ left/,
  friend: fr ? /devient sociable avec/ : /is getting friendly with/, trusts: fr ? /a confiance en .+ et vient lui dire bonjour/ : /trusts .+ now, and comes to the fence/,
  best: fr ? /sont inséparables ! \+21 XP/ : /are best friends! \+21 XP/, star: fr ? /gagne une nouvelle étoile/ : /has earned a new star/, night: fr ? /Les câlins, ce sera demain matin/ : /Cuddles in the morning/,
  next2: fr ? /Encore 2 câlins avant « Sociable »/ : /2 more cuddles to “Friendly”/, next3: fr ? /Encore 3 câlins avant « Sociable »/ : /3 more cuddles to “Friendly”/, greets: fr ? /Vient saluer .+ à la clôture/ : /Comes to the fence to greet/, eggs8: fr ? /à 8 pièces l’œuf/ : /8 coins each/ };
const card = id => p.evaluate(id => { const f = window.__farm; f.gameUI().close(); f.openBirdCard(f.allBirds.find(x => x.gid === id)); return document.querySelector('.gsheet').innerText; }, id);
const hen = () => p.evaluate(id => { const g = window.__farm.game(), h = g.bird(id); return { trust: h.trust, exp: h.exp, happy: Math.round((h.happy - window.__T) / 60e3), stars: g.stars(h), level: g.trustLevel(h) }; }, HEN);
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const later = h => p.evaluate(h => { window.__T += h * 3600e3; sessionStorage.setItem('__T', window.__T); }, h);
const cuddleTap = async () => { await p.evaluate(() => document.querySelector('.gsheet .gcuddle').click()); await run(0.2); };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const g = window.__farm.game(); if (g.data.first) { g.data.first.t = window.__T + 3600e3; g.save(); } });      // (the first egg after the visit: no hen off to lay in the middle of it)
const HEN = await p.evaluate(() => window.__farm.game().data.birds.find(b => b.sex === 'h').id);
let t = await card(HEN);
ok('a hen\'s card: "♥ Cuddle", cuddles to the next trust level', T.cuddle.test(t) && T.next3.test(t) && (await p.evaluate(() => !!document.querySelector('.gsheet .gcuddle'))), t);
await cuddleTap();
let h = await hen(); let ht = await hintT();
const visit = await p.evaluate(() => { const L = window.__farm.farmer(); return !!(L && ((L.task && L.task.name === 'pen') || (L.pending && L.pending.name === 'pen'))); });
ok('a cuddle: counted at once (trust 1, a little experience, happy for 6 hours), the card closed, the farmer on his way into the pen', h.trust === 1 && h.exp === 8 && h.happy === 360 && T.done.test(ht) && visit && !(await p.evaluate(() => window.__farm.gameUI().kind)), { h, ht, visit });
// the farmer's visit, watched: she comes round to the front of him, he picks her up and holds her (her eyes shut), puts her
// back down; no bird goes into him (where he is in the pen, against each bird's feet)
const watch = await p.evaluate(id => { const f = window.__farm, B = f.allBirds.find(x => x.gid === id), P = B.plot; const w = { k: 0, shut: false, front: null, near: 9, own: 9, down: false };
  for (let i = 0; i < 40 * 30; i++) {
    window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false);
    const F = P.farmer; if (!F) continue; const C = B.cuddle, k = C && C.carry ? C.carry.k : 0;
    if (k > 0 && w.front === null) { B.root.updateWorldMatrix(true, false); const L = f.farmer(), e = B.root.matrixWorld.elements, v = { x: e[12], z: e[14] }, a = Math.atan2(v.x - L.pos.x, v.z - L.pos.z); w.front = Math.round(Math.abs(Math.atan2(Math.sin(a - L.heading), Math.cos(a - L.heading))) * 57.3); }
    w.k = Math.max(w.k, k); if (k > 0.99 && B.rig.shut) w.shut = true; if (w.k > 0.99 && C && C.done) w.down = B.root.position.y < 0.05;
    for (const b of P.birds) { if (!b.root.visible || (b.laying && b.laying.inside)) continue; const d = Math.hypot(b.root.position.x - F.x, b.root.position.z - F.z); if (b === B) { if (!k) w.own = Math.min(w.own, d); } else if (d < w.near) { w.near = d; let t = f.farmer().task, nm = []; while (t && t.list) { const c = t.list[t.i]; if (!c || typeof c === 'function') break; nm.push(c.name); t = c; } w.at = [i, nm.join('/'), b.kind, b.act && b.act.type, !!b.route, b.called]; } }
  }
  sessionStorage.setItem('__T', window.__T); f.draw(); w.near = +w.near.toFixed(2); w.own = +w.own.toFixed(2); return w; }, HEN);
ok('the farmer\'s visit: she comes round to his front, he picks her up and holds her (her eyes shut) and puts her down; no bird walks into him', watch.k === 1 && watch.shut && watch.front !== null && watch.front < 25 && watch.down && watch.near >= 0.27 && watch.own >= 0.27, watch);      // (his bodies' middles: 0.33 kept, a frame's lag as he walks)
t = await card(HEN);
ok('her card after it: happy for 6 hours, no button, 2 cuddles to Friendly', T.happy.test(t) && T.next2.test(t) && !(await p.evaluate(() => !!document.querySelector('.gsheet .gcuddle'))), t);
const again = await p.evaluate(id => window.__farm.game().cuddle(id), HEN);
ok('no second cuddle while she\'s happy', again && again.happy && (await hen()).trust === 1, again);
// 6 hours on, two more: Friendly
for (let k = 0; k < 2; k++) { await later(6.1); await run(0.2); await card(HEN); await cuddleTap(); }
h = await hen(); ht = await hintT();
ok('6 hours on, a cuddle again; the third: Friendly', h.trust === 3 && h.level === 1 && T.friend.test(ht), { h, ht });
// Trusting: she greets the farmer at the fence
await p.evaluate(id => { const g = window.__farm.game(), b = g.bird(id); b.trust = 7; b.happy = 0; g.save(); }, HEN);
await card(HEN); await cuddleTap();
h = await hen(); ht = await hintT(); t = await card(HEN);
ok('the eighth cuddle: Trusting, she comes to the fence to say hello (her card says so)', h.trust === 8 && h.level === 2 && T.trusts.test(ht) && T.greets.test(t), { h, ht });
// Best friend: +20 XP, and trust stops at 15
const xp0 = await p.evaluate(() => window.__farm.game().data.xp);
await p.evaluate(id => { const g = window.__farm.game(), b = g.bird(id); b.trust = 14; b.happy = 0; g.save(); }, HEN);
await card(HEN); await cuddleTap();
h = await hen(); ht = await hintT();
const xp1 = await p.evaluate(() => window.__farm.game().data.xp);
await p.evaluate(id => { const g = window.__farm.game(), b = g.bird(id); b.happy = 0; }, HEN);
const e0 = (await hen()).exp; await card(HEN); await cuddleTap(); const h2 = await hen();
ok('the fifteenth: best friends, +20 XP (and the cuddle\'s own 1); trust stops at 15 (and cuddles add no more experience)', h.trust === 15 && h.level === 3 && T.best.test(ht) && xp1 - xp0 === 21 && h2.trust === 15 && h2.exp === e0, { h, ht, xp: xp1 - xp0, h2 });
// a star from a cuddle
const rooster = await p.evaluate(() => { const g = window.__farm.game(), r = g.data.birds.find(b => b.sex === 'r'); r.exp = 95; r.happy = 0; g.save(); return r.id; });
await run(1.2);
await card(rooster); await cuddleTap();
ht = await hintT(); const rs = await p.evaluate(id => window.__farm.game().stars(window.__farm.game().bird(id)), rooster);
ok('a star from a cuddle: a word', rs === 1 && T.star.test(ht), { rs, ht });
// stars from time on the farm; eggs a coin dearer for each of her stars
const timeStars = await p.evaluate(id => { const g = window.__farm.game(), b = g.bird(id), since = b.since, exp = b.exp; b.exp = 0; b.since = window.__T - 30 * 86400e3; const s = g.stars(b); const s2 = (b.since = window.__T - 90 * 86400e3, g.stars(b)); b.since = since; b.exp = exp; return [s, s2]; }, HEN);
ok('stars from time on the farm: one and a half a month, at most two and a half', timeStars[0] === 1 && timeStars[1] === 2, timeStars);
const egg = await p.evaluate(id => { const g = window.__farm.game(), b = g.bird(id), c = g.coop(b.coop); b.exp = 200; b.laid = window.__T - 1000; c.eggs = 0; c.bonus = 0; c.feed = 6; c.fedAt = window.__T; const coins = g.data.coins; const r = g.layEgg(id, window.__T - 10); const got = g.collect(c.id); return { r, got, dc: g.data.coins - coins, base: g.eggPrice(c), card: 0 }; }, HEN);
t = await card(HEN);
ok('her eggs a coin dearer for each of her stars (2 stars: 8 coins), her card says so', egg.r === 'laid' && egg.dc === egg.base + 2 && T.eggs8.test(t), { egg, t: t.slice(0, 300) });
// at night: in the morning
await p.evaluate(() => { window.__farm.setHour(23); }); await run(0.3);
await p.evaluate(id => { const g = window.__farm.game(); g.bird(id).happy = 0; }, HEN);
t = await card(HEN);
ok('at night: no button, cuddles in the morning', T.night.test(t) && !(await p.evaluate(() => !!document.querySelector('.gsheet .gcuddle'))), t.slice(0, 260));
await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.setHour(undefined); });
// trusting birds greet the farmer at the fence
await p.evaluate(() => { const g = window.__farm.game(); for (const b of g.data.birds) { b.trust = 8; b.happy = 0; } g.save(); });
await run(20);
await p.evaluate(() => { const L = window.__farm.farmer(); L.task = L.next(11, 'coop'); L.pending = null; });
let greet = null;
for (let k = 0; k < 40 && !greet; k++) {
  await run(1);
  greet = await p.evaluate(() => { const f = window.__farm, P = f.coopPlots()[0], g = P.birds.filter(b => b.cuddle && b.cuddle.greet && b.cuddle.ready); return g.length ? g.map(b => +(b.root.position.z - (P.pen || {}).yard.max[2]).toFixed(2)) : null; });      // (how far from the front of its yard: the pen's own, by its look)
}
ok('trusting birds trot to the front fence to greet the farmer when he stops by', greet && greet.every(z => z > -0.6), greet);
// a reload keeps it all
await run(5);
const keep = await p.evaluate(() => JSON.stringify(window.__farm.game().data.birds.map(b => [b.trust, b.exp, b.happy])));
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const kept = await p.evaluate(() => ({ b: JSON.stringify(window.__farm.game().data.birds.map(b => [b.trust, b.exp, b.happy])), edited: window.__farm.game().edited }));
ok('a reload: trust, experience and happy times kept, not flagged', kept.b === keep && !kept.edited, { keep, kept });
// a save changed outside: happy for days, trust past 15
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.birds[0].happy = window.__T + 5 * 86400e3; raw.d.birds[1].trust = 40; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const tm = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, happy: Math.round((g.data.birds[0].happy - window.__T) / 3600e3), trust: g.data.birds[1].trust }; });
ok('a save changed outside (happy for days, trust 40): at most 6 hours and 15, flagged', tm.edited && tm.happy <= 6 && tm.trust === 15, tm);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

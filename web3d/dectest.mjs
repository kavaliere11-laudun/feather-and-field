// The game, release 1 step 9d (decorations): node dectest.mjs   (LANG=fr; W, H: the screen; SHOTS=folder for pictures)
// A farm at level 10 with coins: the coins at the top open the shop, "Decorate your farm": the eight, each with its
// picture; the ones its level has come for with their price and Buy and place, the others greyed with the level they come
// at. Buy the flower bed: it appears near the view with its outline (green), the move bar without Turn; off your land, red
// and why; then "Put it here": paid for then (coins and XP), on the farm, in everyone's way (the walking grid), no grass
// through it, its butterflies. Cancel a purchase: nothing paid, nothing there. Tap it: its card, Move; moved, saved where
// it went. The duck house: straight onto the pond, the ducks' house. A reload: all where they were. A save changed outside
// (a decoration twice, one not known, one before its level, a spot off the map) is checked and flagged. No page errors.
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
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/decor_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const kind = () => p.evaluate(() => window.__farm.gameUI().kind);
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const money = () => p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, xp: g.data.xp, decor: JSON.parse(JSON.stringify(g.data.decor || [])) }; });
const S = () => p.evaluate(() => window.__farm.deco.state());
const items = () => p.evaluate(() => window.__farm.deco.items());
const T = { title: fr ? /Décorez votre ferme/ : /Decorate your farm/, buy: fr ? /Acheter et placer · 400/ : /Buy and place · 400/, lvl13: fr ? /Arrive au niveau 13/ : /Comes at level 13/,
  pond: fr ? /Acheter · 3[\s  ]000/ : /Buy · 3,000/, placed: fr ? /Nouveau dans la ferme : Massif de fleurs ! \+8 XP/ : /New on the farm: Cottage flower bed! \+8 XP/,
  moved: fr ? /Massif de fleurs : c’est déplacé !/ : /Cottage flower bed: moved!/, owned: fr ? /Dans votre ferme/ : /On your farm/, move: fr ? /Déplacer/ : /Move/,
  hint: fr ? /Faites-le glisser/ : /Drag it, or tap/, land: fr ? /Seulement sur votre terrain/ : /Only on your own land/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 10, coins to spend (as the game would have them: saved, sealed)
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 60 * Math.pow(9, 2.1) + 5; g.data.coins = 20000; g.data.lvSeen = g.level; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
// the shop
await p.tap('.gbar .gpill:not(.glvl)'); await run(0.3);
await p.waitForFunction(() => [...document.querySelectorAll('.gdec img')].every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
let t = await sheet();
const cards = await p.evaluate(() => [...document.querySelectorAll('.gdec')].map(c => [c.dataset.decor, c.classList.contains('gpage-no'), !!c.querySelector('.gbtn:not([disabled])'), c.querySelector('img').complete && c.querySelector('img').naturalWidth > 0]));
ok('the coins open the shop: the eight with their pictures; the five its level has come for to buy, the others greyed with their level',
  (await kind()) === 'shop' && T.title.test(t) && cards.length === 8 && cards.filter(c => !c[1] && c[2]).length === 5 && cards.filter(c => c[1]).length === 3 && cards.every(c => c[3]) && T.buy.test(t) && T.lvl13.test(t) && T.pond.test(t), { cards, t: t.slice(0, 400) });
await shot('1_shop');
// buy the flower bed: placing it
const m0 = await money();
await p.evaluate(() => document.querySelector('.gdec[data-decor="flowers"] .gbtn').click()); await run(0.5);
let s = await S();
const turnHidden = await p.evaluate(() => document.querySelector('.gmove .gmove-b').hidden);
ok('Buy and place: the flower bed near the view, its outline green, the bar without Turn, nothing paid yet',
  s.on === 'flowers' && s.ok && T.hint.test(s.text) && turnHidden && (await money()).coins === m0.coins && (await kind()) === null, { s, turnHidden });
await run(1.5); await shot('2_placing');
const start = s.at;
// off your land: red, why
const far = await p.evaluate(() => { const f = window.__farm; for (let r = 4; r < 60; r += 1) for (let a = 0; a < 6.28; a += 0.4) { const x = f.view.target.x + Math.cos(a) * r, z = f.view.target.z + Math.sin(a) * r; if (f.fieldAt(x, z) > 0) return [x, z]; } return null; });
await p.evaluate(([x, z]) => window.__farm.deco.to(x, z), far); await run(0.3);
s = await S();
ok('dragged off your land: red, "Only on your own land", Put it here off', !s.ok && s.why === 'dec_bad_land' && T.land.test(s.text) && (await p.evaluate(() => document.querySelector('.gmove-go').disabled)), s);
// cancel: nothing paid, nothing there
await p.evaluate(() => window.__farm.deco.cancel()); await run(0.3);
ok('Cancel: nothing paid, nothing on the farm', (await money()).coins === m0.coins && (await items()).length === 0 && !(await S()).on, { m: await money(), it: await items() });
// again, and put it down
await p.evaluate(() => window.__farm.deco.shop()); await run(0.3);
await p.evaluate(() => document.querySelector('.gdec[data-decor="flowers"] .gbtn').click()); await run(0.3);
s = await S();
await p.evaluate(() => document.querySelector('.gmove-go').click()); await run(1.5);
let m = await money(), it = await items();
if (!m.decor.length) console.log('not placed:', JSON.stringify(await S()));
const at = m.decor[0];
const blocked = await p.evaluate(([x, z]) => window.__farm.deco.blocked(x, z), [at.x, at.z]);
const grass = await p.evaluate(([x, z]) => window.__farm.underCoop(x, z, 0), [at.x, at.z]);
const word = await p.evaluate(() => document.getElementById('hint').textContent);
ok('Put it here: paid for (400 coins, +8 XP), on the farm where it was put, in the walking grid\'s way, no grass through it, the word',
  m.coins === m0.coins - 400 && m.xp === m0.xp + 8 && at.id === 'flowers' && at.x === s.at.x && at.z === s.at.z && it.length === 1 && it[0].shown && it[0].prop && it[0].tap && blocked && grass && T.placed.test(word) && !(await S()).on, { m, it, blocked, grass, word });
await run(3);
const life = await p.evaluate(() => window.__farm.deco.life());
ok('its butterflies', life && life.butterflies > 0, life);
await shot('3_placed');
// tap it: its card, Move
const sc = await p.evaluate(([x, z]) => window.__farm.screenOf(x, z, 0.3), [at.x, at.z]);
await p.touchscreen.tap(sc.x, sc.y); await run(0.3);
t = await sheet();
ok('tapped: its card, Move', (await kind()) === 'decor' && T.move.test(t), t.slice(0, 200));
await shot('4_card');
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await run(0.3);
s = await S();
const to = await p.evaluate(([x, z]) => window.__farm.deco.free('flowers', x - 3, z + 2), [at.x, at.z]);
await p.evaluate(([x, z]) => window.__farm.deco.to(x, z), [to.x, to.z]); await run(0.3);
await p.evaluate(() => window.__farm.deco.place()); await run(1);
m = await money();
const word2 = await p.evaluate(() => document.getElementById('hint').textContent);
ok('Move: put somewhere else, saved there, nothing paid', s.on === 'flowers' && m.decor[0].x === to.x && m.decor[0].z === to.z && m.coins === m0.coins - 400 && T.moved.test(word2), { s, to, m, word2 });
// more: the bird bath and the beehives near it; the duck house on the pond
for (const id of ['birdbath', 'beehives']) { await p.evaluate(id => window.__farm.deco.start(id), id); await run(0.2); await p.evaluate(() => window.__farm.deco.place()); await run(0.5); }
await p.evaluate(() => window.__farm.deco.shop()); await run(0.3);
await p.evaluate(() => document.querySelector('.gdec[data-decor="duckhouse"] .gbtn').click()); await run(1.5);
m = await money(); it = await items();
const duck = await p.evaluate(() => window.__farm.deco.duckHouse());
ok('the bird bath, the beehives; the duck house straight onto the pond, the ducks\' house', m.decor.length === 4 && it.length === 4 && it.every(x => x.shown && x.tap) && duck && m.coins === 20000 - 400 - 800 - 1800 - 3000, { m, it, duck });
await run(2); await shot('5_duckhouse');
// a reload: all where they were
const before = JSON.stringify(m.decor);
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
m = await money(); it = await items();
ok('a reload: all where they were, not flagged', JSON.stringify(m.decor) === before && it.length === 4 && it.every(x => x.shown && x.tap) && !(await p.evaluate(() => window.__farm.game().edited)) && (await p.evaluate(() => window.__farm.deco.duckHouse())), { m, it });
// a save changed outside
for (const [what, edit, check] of [
  ['a decoration twice', 'd.decor.push({ id: "flowers", x: 1, z: 1 })', r => r.filter(x => x.id === 'flowers').length === 1],
  ['one not known', 'd.decor.push({ id: "castle", x: 1, z: 1 })', r => !r.some(x => x.id === 'castle')],
  ['one before its level', 'd.decor.push({ id: "statue", x: 1, z: 1 })', r => !r.some(x => x.id === 'statue')],
  ['a spot off the map', 'd.decor.find(x => x.id === "birdbath").x = 9999', r => { const o = r.find(x => x.id === 'birdbath'); return o && Math.abs(o.x) < 200; }]]) {
  await p.evaluate(e => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d; eval(e); localStorage.setItem('ff3d.farm', JSON.stringify(raw)); }, edit);
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
  const r = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, decor: g.data.decor, items: window.__farm.deco.items().length }; });
  ok('a save changed outside (' + what + '): checked and flagged', r.edited && check(r.decor) && r.items === r.decor.length, r);
  await p.evaluate(() => { const g = window.__farm.game(); g.edited = false; g.save(); });
}
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

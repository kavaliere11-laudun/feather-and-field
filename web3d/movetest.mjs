// The game, release 1 step 5b (coops where you like): node movetest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402)
// A fresh farm on a fake clock: the first coop on its home spot; a tap on it: its card (who lives there, "Move this
// coop"); moving it: the bar, a finger on the coop carries it, spots that are no good say why (the wild meadow, a lane,
// the farmhouse) and can't be chosen; Cancel: back where it was. Not while the farmer's busy in a pen. Level 2 and the next
// field bought: moved there, turned, put down: saved, the bushes in its way cleared for good, no grass through its pen,
// the farmer can get to its gate, its old spot open; a reload keeps it all; a save changed outside the game (a coop on
// the wild meadow) is checked and put right; a farm from before coops could be moved keeps its coop where it was.
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
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, secs);      // (the clock carries on over a reload)
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1700); await run(0.5);
};
const st = () => p.evaluate(() => window.__farm.move.state());
const at = () => p.evaluate(() => window.__farm.coopAt(0));
const saved = () => p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return { x: c.x, z: c.z, deg: c.deg, plot: c.plot, cleared: g.data.cleared.join(), edited: g.edited }; });
const T = { bad: fr ? /Seulement sur votre terrain/ : /Only on your own land/, lane: fr ? /Pas sur un chemin/ : /Not on a lane/, room: fr ? /Pas assez de place/ : /Not enough room/,
  good: fr ? /Bel emplacement/ : /A good spot/, hint: fr ? /Faites glisser le poulailler/ : /Drag the coop/, moved: fr ? /nouvelle place/ : /new place/, busy: fr ? /Pas tout de suite/ : /Not just now/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
let s = await saved(), a = await at();
ok('a new farm: the first coop on its home spot, nothing cleared, not flagged', s.x === -28 && s.z === -13.75 && s.deg === 90 && a.join() === '-28,-13.75,90' && s.cleared === '' && !s.edited, { s, a });
// a tap on the coop's house: its card
const house = await p.evaluate(() => { const f = window.__farm, [x, z] = f.coopAt(0); f.lookAt(x, z); f.draw(); return f.screenOf(x - 0.6, z + 0.3, 1.0); });
await p.touchscreen.tap(house.x, house.y); await run(0.3);
const card = await p.evaluate(() => ({ kind: window.__farm.gameUI().kind, text: document.querySelector('.gsheet').innerText }));
ok('a tap on the coop: its card (who lives there, move it)', card.kind === 'coop' && (fr ? /vivent ici/ : /live here/).test(card.text) && (fr ? /Déplacer ce poulailler/ : /Move this coop/).test(card.text), card);
await p.tap('.gsheet .gbtn:not(.gup .gbtn)'); await run(1);          // ("Move this coop": not the upgrade's button above it, release 4)
let m = await st();
const bar = await p.evaluate(() => { const B = document.querySelector('.gmove'); return B && !B.hidden && B.getBoundingClientRect().top; });
ok('moving: the bar (Turn, Cancel, Put it here), what to do, the coop out of its batch', m.on && bar > H * 0.5 && T.hint.test(m.text) && m.ok && m.batch === 0, { m, bar });
// a finger on the coop carries it
const from = await p.evaluate(() => { const f = window.__farm, [x, z] = f.coopAt(0); return f.screenOf(x, z); });
const to = await p.evaluate(() => { const f = window.__farm, [x, z] = f.coopAt(0); return f.screenOf(x + 2, z - 2); });
await p.mouse.move(from.x, from.y); await p.mouse.down();
for (let i = 1; i <= 10; i++) { await p.mouse.move(from.x + (to.x - from.x) * i / 10, from.y + (to.y - from.y) * i / 10); await run(0.03); }
await p.mouse.up(); await run(0.2);
a = await at(); m = await st();
ok('a finger on the coop carries it along (on the quarter-metre)', Math.abs(a[0] - -26) < 0.6 && Math.abs(a[1] - -15.75) < 0.6 && a[0] * 4 === Math.round(a[0] * 4) && m.at.x === a[0], { a, m });
const wild = await p.evaluate(() => window.__farm.fields().fields[5].mid);
for (const [what, x, z, re] of [['the wild meadow', wild[0], wild[1], T.bad], ['a lane', -27.5, -16.5, T.lane], ['the farmhouse', -26, -26, T.room]]) {
  await p.evaluate(([x, z]) => window.__farm.move.to(x, z), [x, z]); await run(0.1);
  m = await st(); const dis = await p.evaluate(() => document.querySelector('.gmove-go').disabled);
  ok('no good on ' + what + ': it says why, and it can\'t be put there', !m.ok && re.test(m.text) && dis, m);
}
// cancel: back where it was
await p.tap('.gmove-row .gbtn:nth-child(2)'); await run(0.3);
a = await at(); m = await st(); s = await saved();
const reach0 = await p.evaluate(() => { const o = window.__farm.penOut(0); return o && window.__farm.farmerCanReach(o[0], o[1]); });
ok('Cancel: back where it was, in its batch again, its gate open', !m.on && a.join() === '-28,-13.75,90' && m.batch > 0 && s.x === -28 && reach0, { a, m, s });
// not while the farmer's busy in its pen
await p.evaluate(() => { window.__T = Math.round(window.__T); const g = window.__farm.game(); g.data.coins = 500; g.data.coops[0].feed = 0; g.data.coops[0].fedAt = window.__T; g.save(); window.__farm.fillFeeder(0); });
await run(0.1);
const visiting = await p.evaluate(() => { const L = window.__farm.farmer(); return !!(L && ((L.task && L.task.name === 'pen') || (L.pending && L.pending.name === 'pen'))); });
await p.evaluate(() => window.__farm.move.start(0)); await run(0.1);
m = await st(); const hintT = await p.evaluate(() => document.getElementById('hint').textContent);
ok('not while the farmer\'s busy in a pen: a word, no moving', visiting && !m.on && T.busy.test(hintT), { visiting, m, hintT });
await run(40);
// level 2, the next field bought: moved there, turned, put down
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 70; g.data.coins = 300; g.save(); }); await run(1.5);
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.2);
await p.evaluate(() => window.__farm.buyLand()); await run(1.5);
await p.evaluate(() => window.__farm.move.start(0)); await run(0.5);
await p.evaluate(() => window.__farm.move.to(-33, -23)); await run(0.1);
m = await st();
ok('in the new field: a good spot, the bush in its way to clear', m.ok && T.good.test(m.text) && m.clear.join() === 'b84', m);          // (a new farm's barn is Rustic, its pen small: release 4)
await p.tap('.gmove-row .gbtn:first-child'); await run(0.1);
m = await st();
ok('Turn: a quarter turn, still good', m.ok && m.at.deg === 180, m);
await p.tap('.gmove-go'); await run(1.6);
a = await at(); m = await st(); s = await saved();
const after = await p.evaluate(() => { const f = window.__farm, o = f.penOut(0); return { gone: !f.nature().has('b84') && f.nature().has('b91'), reach: !!o && f.farmerCanReach(o[0], o[1]), old: f.navFree(-28, -13.75), grass: f.grassIn(0), hint: document.getElementById('hint').textContent, birds: f.coopPlots()[0].birds.length }; });
ok('put down: saved where it is, the bush cleared for good (the one beside it kept), no grass through its pen, the farmer can get to its gate, its old spot open',
  !m.on && a.join() === '-33,-23,180' && s.x === -33 && s.z === -23 && s.deg === 180 && s.plot === undefined && s.cleared === 'b84' && after.gone && after.reach && after.old && after.grass === 0 && T.moved.test(after.hint) && after.birds === 3, { a, s, after });
// a reload keeps it all
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
a = await at(); s = await saved();
const back = await p.evaluate(() => { const f = window.__farm; return { gone: !f.nature().has('b84'), grass: f.grassIn(0), birds: f.coopPlots()[0].birds.length }; });
ok('a reload: the coop where it was put, the bush still gone, not flagged', a.join() === '-33,-23,180' && s.cleared === 'b84' && !s.edited && back.gone && back.grass === 0 && back.birds === 3, { a, s, back });
// a save changed outside the game: the coop out on the wild meadow
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.coops[0].x = -20; raw.d.coops[0].z = -20; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await saved(); a = await at();
const good = await p.evaluate(([x, z, d]) => window.__farm.coopSpot(x, z, d).ok, [s.x, s.z, s.deg]);
ok('a save changed outside (a coop on the wild meadow): flagged, and the coop put back on the farm\'s own land', s.edited && good && !(s.x === -20 && s.z === -20) && a[0] === s.x && a[1] === s.z, { s, a, good });
// a farm from before coops could be moved (its coop on the village's first plot)
await p.evaluate(() => { const g = window.__farm.game(), d = JSON.parse(JSON.stringify(g.data)); const c = d.coops[0]; delete c.x; delete c.z; delete c.deg; c.plot = 0; delete d.cleared; d.land = [0]; d.xp = 0; d.lvSeen = 1;
  const body = JSON.stringify(d); let h = 0x811c9dc5; for (let i = 0; i < body.length; i++) { h ^= body.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  localStorage.setItem('ff3d.farm', JSON.stringify({ d, s: ('0000000' + h.toString(16)).slice(-8) })); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await saved(); a = await at();
ok('a farm from before coops could be moved: its coop where it was, not flagged', s.x === -28 && s.z === -13.75 && s.deg === 90 && a.join() === '-28,-13.75,90' && !s.edited, { s, a });
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

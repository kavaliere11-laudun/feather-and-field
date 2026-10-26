// The game, release 1 step 9e (the wheat field and the honey): node wheattest.mjs   (LANG=fr; W, H; SHOTS=folder)
// A fresh farm: the wheat field on your own land by the farmhouse, ploughed, its sign "Sow", no grass through it. Tap it:
// its card, Sow · 20 coins; sown: the coins, the farmer hurries over with the pail and scatters the seed (the field as it
// was till he's done); an hour on the first shoots, then tall and green, four hours on golden, the sign "Harvest". Tap
// it: harvested (he crouches and cuts it), then ploughed again, the grain in store and the XP. An empty feeder: filled
// with the grain, free. The field moved and turned. The beehives: a jar every 8 hours, the honey pot with the number; tap
// it: the farmer lifts out a frame of honey, the jars sold. A reload keeps it all; a save changed outside (a field ripe
// later than it can grow, grain past the store, honey past the hives, honey without hives) is checked and flagged.
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
const ahead = (h) => p.evaluate(h => { window.__T += h * 3600e3; sessionStorage.setItem('__T', window.__T); window.__farm.gameTick(window.__T, true); }, h);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/wheat_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const kind = () => p.evaluate(() => window.__farm.gameUI().kind);
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const S = () => p.evaluate(() => window.__farm.deco.wheat.state());
const HS = () => p.evaluate(() => window.__farm.deco.honey.state());
const money = () => p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, xp: g.data.xp, grain: g.data.grain }; });
const word = () => p.evaluate(() => document.getElementById('hint').textContent);
const look = (x, z, size = 3.4) => p.evaluate(([x, z, size]) => window.__farm.lookAt(x + 0.4, z + 0.4, size), [x, z, size]);
const untilDone = async (max = 60) => { for (let i = 0; i < max; i++) { await run(1); if (!(await S()).work) return i; } return -1; };
const T = { sow: fr ? /Semer · 20 pièces/ : /Sow · 20 coins/, bubSow: fr ? /Semer/ : /Sow/, bubHarvest: fr ? /Récolter/ : /Harvest/, store: fr ? /Grain en réserve : 0 sur 120/ : /Grain in store: 0 of 120/,
  sowing: fr ? /va semer le blé/ : /is on the way to sow the wheat/, done: fr ? /Blé récolté : \+20 de grain/ : /Wheat harvested: \+20 grain/, grainFill: fr ? /avec votre grain \(gratuit\)/ : /with your grain \(free\)/,
  honey: fr ? /2 pots de miel vendus · \+30 pièces/ : /2 jars of honey sold · \+30 coins/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
let s = await S();
const saved = await p.evaluate(() => window.__farm.game().data.wheat);
ok('a fresh farm: the wheat field on your own land, ploughed, the sign "Sow", no grass through it, saved where it is',
  s.at && s.owned && s.stage === 'soil' && s.shown === 'soil' && s.under === true && saved.x === s.at[0] && saved.z === s.at[1] && [45, 135].includes(saved.deg), { s, saved });
await look(s.at[0], s.at[1]); await run(0.5);
s = await S();
ok('in view: its sign says Sow', T.bubSow.test(s.bub || ''), s.bub);
await shot('1_field');
// tap it: its card
const c = await p.evaluate(([x, z]) => window.__farm.screenOf(x, z, 0), s.at);
await p.touchscreen.tap(c.x, c.y); await run(0.3);
let t = await sheet();
ok('tapped: its card, Sow · 20 coins, the grain in store', (await kind()) === 'wheat' && T.sow.test(t) && T.store.test(t), t.slice(0, 300));
await shot('2_card');
const m0 = await money();
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await run(0.5);
s = await S();
const w1 = await word();
ok('Sow: 20 coins, the farmer on his way with the pail, the field as it was', (await money()).coins === m0.coins - 20 && s.work === 'sow' && s.hold === 'soil' && s.stage === 'sown' && T.sowing.test(w1), { s, w1 });
let took = -1;
for (let i = 0; i < 60; i++) { await run(1); const q = await S(); if (q.work === 'sow' && (await p.evaluate(() => { const L = window.__farm.farmer(); return L && L.want && L.want.scatter !== undefined; }))) { await shot('3_sowing'); took = i; break; } }
const left = await untilDone();
s = await S();
ok('he scatters the seed there, then the field is sown', took >= 0 && left >= 0 && !s.work && !s.hold && s.stage === 'sown', { took, left, s });
await ahead(1); await run(0.3); s = await S();
ok('an hour on: the first green shoots', s.stage === 'sprouts' && s.shown === 'sprouts', s);
await ahead(1.2); await run(0.3); s = await S();
ok('two hours on: tall and green, the sign the time left', s.stage === 'growing' && s.shown === 'growing' && /🌱/.test(s.bub || ''), s);
await shot('4_growing');
await ahead(1.9); await run(0.3); s = await S();
ok('four hours on: golden, the sign "Harvest"', s.stage === 'ripe' && s.shown === 'ripe' && T.bubHarvest.test(s.bub || ''), s);
await shot('5_ripe');
// harvest it
const m1 = await money();
await p.evaluate(() => window.__farm.deco.wheat.tap()); await run(0.5);
s = await S();
ok('tapped ripe: harvested at once (the save), the farmer on his way, the field golden till he\'s done', s.work === 'harvest' && s.hold === 'ripe' && s.stage === 'soil' && (await money()).grain === 20 && (await money()).xp === m1.xp + 12, { s, m: await money() });
let cut = -1;
for (let i = 0; i < 60; i++) { await run(1); if ((await p.evaluate(() => { const L = window.__farm.farmer(); return L && L.want && L.want.patting; }))) { await run(1); await shot('6_cutting'); cut = i; break; } }
await untilDone();
s = await S();
const w2 = await word();
ok('he cuts it, then it\'s ploughed again, "+20 grain", the sign Sow', cut >= 0 && !s.work && s.shown === 'soil' && T.done.test(w2) && T.bubSow.test(s.bub || ''), { cut, s, w2 });
await run(1.5); await shot('7_harvested');
// an empty feeder: filled with the grain
await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; c.feed = 0; c.fedAt = window.__T; g.save(); });
await p.evaluate(() => window.__farm.feederCard ? window.__farm.feederCard(0) : null);
const fc = await p.evaluate(() => { const f = window.__farm; f.gameUI().feederSheet(f.game().data.coops[0], () => {}); return document.querySelector('.gsheet').innerText; });
const m2 = await money();
const q = await p.evaluate(() => { const g = window.__farm.game(); return g.fillFeeder(g.data.coops[0].id); });
const m3 = await money();
ok('an empty feeder: "Fill it with your grain (free)"; filled from the grain, no coins', T.grainFill.test(fc) && m3.coins === m2.coins && Math.abs(m3.grain - (m2.grain - 6)) < 0.01 && q.grain === 6 && q.cost === 0, { fc: fc.slice(0, 300), m2, m3, q });
await p.evaluate(() => window.__farm.gameUI().close());
// move it and turn it
s = await S();
const mv = await p.evaluate(([x, z, deg]) => { const f = window.__farm; f.deco.wheat.move(); const turn = document.querySelector('.gmove .gmove-b'); const shown = !turn.hidden; turn.click(); const st = f.deco.state(); const fr2 = f.deco.free('wheat', x + 4, z - 3); return { shown, st, fr2 }; }, [s.at[0], s.at[1], s.deg]);
await p.evaluate(() => { const f = window.__farm, st = f.deco.state(); let best = null; for (let r = 2; r < 12 && !best; r += 1) for (let a = 0; a < 6.28 && !best; a += 0.5) { const x = Math.round((st.at.x + Math.cos(a) * r) * 4) / 4, z = Math.round((st.at.z + Math.sin(a) * r) * 4) / 4; f.deco.to(x, z); if (f.deco.state().ok) best = [x, z]; } });
const st2 = await p.evaluate(() => window.__farm.deco.state());
await p.evaluate(() => window.__farm.deco.place()); await run(0.5);
const saved2 = await p.evaluate(() => window.__farm.game().data.wheat);
ok('Move the field: Turn there, turned and put somewhere else, saved so', mv.shown && st2.ok && saved2.deg !== s.deg && saved2.x === st2.at.x && saved2.z === st2.at.z && (await S()).deg === saved2.deg, { mv, st2, saved2 });
// the beehives and the honey
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = Math.round(60 * Math.pow(5, 2.1) + 5); g.data.coins = 5000; g.data.lvSeen = g.level; g.save(); window.__farm.gameUI().refresh(); });
await p.evaluate(() => { const f = window.__farm; f.deco.start('beehives'); f.deco.place(); }); await run(1);
let hs = await HS();
ok('the beehives bought: no honey yet', hs.n === 0 && !hs.bub, hs);
await ahead(16.2); await run(0.5);
const hv = await p.evaluate(() => { const f = window.__farm, it = f.deco.items().find(x => x.id === 'beehives'); f.lookAt(it.at[0] + 0.5, it.at[1] + 0.5, 3.2); return it.at; }); await run(0.5);
hs = await HS();
ok('16 hours on: two jars, the honey pot "🍯 2" over the hives', hs.n === 2 && hs.bub === '🍯 2', hs);
await shot('8_honeypot');
const m4 = await money();
await p.evaluate(() => document.querySelector('.gbub.ghoney').click()); await run(0.5);
hs = await HS();
ok('tapped: the farmer on his way to the hives, the pot gone', hs.going && hs.work === 'honey' && !hs.bub && hs.n === 0, hs);
let framed = -1;
for (let i = 0; i < 60; i++) { await run(0.5); if ((await HS()).frame) { await run(2.2); await shot('9_frame'); framed = i; break; } }
for (let i = 0; i < 30 && (await HS()).going; i++) await run(1);
await p.waitForTimeout(1200); await run(0.3);
const m5 = await money(), w3 = await word();
ok('he lifts out a frame of honey; then the jars sold (2 × 15 coins, +6 XP)', framed >= 0 && !(await HS()).going && m5.coins === m4.coins + 30 && m5.xp === m4.xp + 6 && T.honey.test(w3), { framed, m4, m5, w3 });
// a reload
const before = await p.evaluate(() => { const d = window.__farm.game().data; return JSON.stringify({ w: d.wheat, g: d.grain, h: d.honey }); });
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(await p.evaluate(() => ({ raw: JSON.parse(localStorage.getItem('ff3d.farm')), now: window.__T }))));
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const after = await p.evaluate(() => { const d = window.__farm.game().data; return JSON.stringify({ w: d.wheat, g: d.grain, h: d.honey }); });
s = await S();
ok('a reload: the field, the grain and the honey as they were, not flagged', before === after && !(await p.evaluate(() => window.__farm.game().edited)) && s.at && s.deg === saved2.deg, { before, after });
// a save changed outside
for (const [what, edit, check] of [
  ['a field ripe later than it can grow', 'd.wheat.ripe = Date.now() + 99 * 3600e3', r => r.wheat.ripe <= r.now + 4 * 3600e3 + 1000],
  ['grain past the store', 'd.grain = 999', r => r.grain === 120],
  ['honey past the hives', 'd.honey.n = 99', r => r.honey.n === 6],
  ['honey without hives', 'd.decor = d.decor.filter(x => x.id !== "beehives"); d.honey = { n: 5, at: 0 }', r => !r.honey]]) {
  await p.evaluate(e => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d; eval(e); localStorage.setItem('ff3d.farm', JSON.stringify(raw)); }, edit);
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
  const r = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, wheat: g.data.wheat, grain: g.data.grain, honey: g.data.honey, now: window.__T }; });
  ok('a save changed outside (' + what + '): checked and flagged', r.edited && check(r), r);
  await p.evaluate(() => { const g = window.__farm.game(); g.edited = false; g.save(); });
}
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

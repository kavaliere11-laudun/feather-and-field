// Room kept for a coop to grow (8 Nov 2026, Audrey, after the second play-through found the Thatched Cottage boxed in:
// "from the start when you add a coop to the game you need to anticipate how big it will become and block the zone
// around"): ./withserver.sh node growtest.mjs   (LANG=fr; PORT)
// On a farm of a few fields, room for a coop's Deluxe look (and room for the looks the land allows on a farm too small for
// it yet). A new breed's coop is offered a spot with room for its Deluxe look, its outline showing that room dotted;
// moved, it won't go where its Deluxe look wouldn't fit ("Not enough room here for its bigger pen later"); a decoration
// won't go into that room ("This ground is kept for a coop to grow into"); a new vegetable garden keeps clear of it; and
// the coop then grows through every look to Deluxe where it stands. Nothing new in the save.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB' });
await p.addInitScript(() => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || new Date('2026-11-09T11:00:00Z').getTime()); Date.now = () => window.__T; });
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 400))); if (!c) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}`;
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 }); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); }, s);
await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(3) + 5; g.data.lvSeen = 3; g.fishBag().gift = true; g.data.coins = 30000; g.save(); f.gameUI().refresh(); });
await run(2); await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
// a farm of its first fields only: room for a smaller look, kept
const small = await p.evaluate(() => { const f = window.__farm, t0 = performance.now(); f.place('orp'); const s = f.move.state(); f.move.cancel(); s.ms = Math.round(performance.now() - t0); return s; });
ok('a farm with no fields restored yet: the coop can still be put down, keeping what room the land allows (look ' + small.grow + ', no Deluxe yet)', small.on && small.ok && small.grow < 4, small);
// four fields restored (level 6): room for Deluxe pens
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(6) + 5; g.data.lvSeen = 6; for (let i = 0; i < 4; i++) { g.data.coins = 30000; f.buyLand(); for (let k = 0; k < 120; k++) { window.__T += 33; f.step(1 / 30, 1); f.gameTick(window.__T, false); } } g.data.coins = 30000; g.save(); if (f.gameUI().isOpen) f.gameUI().close(); });
await run(2); await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
// the Buff Orpingtons' coop: offered where its Deluxe look will fit, its outline with that room dotted
const placed = await p.evaluate(() => { const f = window.__farm, t0 = performance.now(); const r = f.place('orp'); const s = f.move.state(); return { r, s, ms: Math.round(performance.now() - t0) }; });
console.log('     (offered in ' + placed.ms + ' ms on the test machine)');
ok('the new coop offered a spot with room for its Deluxe look: "Put it here" there', placed.r && placed.s.on && placed.s.ok && placed.s.grow === 4, placed);
const at = placed.s.at;
ok('put down', await p.evaluate(() => window.__farm.move.place()));
await run(1);
ok('there, room for its Deluxe look', (await p.evaluate(sp => window.__farm.move.room(1, sp), at)).grow);
// a spot near it where it would stand today but not grow: moved there, refused, and why
const tight = await p.evaluate(() => { const f = window.__farm, c = f.game().data.coops[1]; for (let r = 1; r < 14; r += 0.5) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; for (const deg of [0, 90]) { const sp = { x: Math.round((c.x + Math.cos(a) * r) * 4) / 4, z: Math.round((c.z + Math.sin(a) * r) * 4) / 4, deg }; const q = f.move.room(1, sp); if (q.now && !q.grow) return sp; } } return null; });
if (tight) {
  const m = await p.evaluate(sp => { const f = window.__farm; f.move.start(1); f.move.to(sp.x, sp.z, sp.deg); const s = f.move.state(); f.move.cancel(); return s; }, tight);
  ok(fr ? 'déplacé là : refusé, « Pas assez de place ici pour son futur enclos plus grand… »' : 'moved there: refused, "Not enough room here for its bigger pen later…"', !m.ok && m.why === 'move_grow' && (fr ? /futur enclos plus grand/ : /bigger pen later/).test(m.text), m);
} else ok('a tight spot near it to try (where it fits today, not grown)', false, 'none found');
// a decoration into the room it'll grow into: refused
const corner = await p.evaluate(() => { const f = window.__farm, c = f.game().data.coops[1], G = f.move.grown(1); if (!G) return null; const a = c.deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), F = G.foot, out = [];
  for (const [lx, lz] of [[F.x0 + 0.4, F.z0 + 0.4], [F.x1 - 0.4, F.z0 + 0.4], [F.x0 + 0.4, F.z1 - 0.4], [F.x1 - 0.4, F.z1 - 0.4]]) out.push([c.x + lx * cs + lz * sn, c.z - lx * sn + lz * cs]); return out; });
let dec = null;
for (const [x, z] of corner || []) { const s = await p.evaluate(([x, z]) => { const f = window.__farm; f.deco.start('flowers'); f.deco.to(x + 0.01, z); f.deco.to(x, z); const s = f.deco.state(); f.deco.cancel(); return s; }, [x, z]); if (s.why === 'dec_bad_grow') { dec = s; break; } if (!dec) dec = s; }
ok('a flower bed put where the coop will grow: refused ("kept for a coop to grow into")', dec && !dec.ok && dec.why === 'dec_bad_grow', dec);
// a new vegetable garden (as at level 4): clear of where the coops will grow
await p.evaluate(() => { const g = window.__farm.game(); g.data.garden.x = g.data.garden.z = null; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); await run(3); await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
const gd = await p.evaluate(() => { const g = window.__farm.game().data.garden; return g && { x: g.x, z: g.z, clear: g.x !== null && window.__farm.move.clearOfGrowth('garden', g.x, g.z) }; });
ok('a new vegetable garden: clear of where the coops will grow', gd && gd.x !== null && gd.clear, gd);
// the coop grows through every look where it stands
const looks = [];
for (let t = 1; t <= 4; t++) { for (let k = 0; k < 30 && await p.evaluate(() => { const L = window.__farm.farmer(); return !!(L && (L.pen || L.pending)); }); k++) await run(1); looks.push(await p.evaluate(() => window.__farm.upgrade(1))); await run(1); }
ok('then upgraded four times where it stands, to Deluxe: no "move it first"', looks.every(r => r === 'ok') && await p.evaluate(() => window.__farm.game().data.coops[1].tier) === 4, looks);
// a reload: the farm as it was, nothing flagged
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
ok('a reload: the save not flagged', !(await p.evaluate(() => window.__farm.game().edited)));
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

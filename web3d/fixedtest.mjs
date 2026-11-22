// The kitchen garden's and the wheat fields' fixed places (16 Nov 2026, Audrey: "I would like the fields and beds to be part of
// the initial map and the player just need to unlock them"; "Fixed for good"): ./withserver.sh node fixedtest.mjs [OUT]
// A new farm: the garden there at level 1, every bed wild, nothing saved for it; the second wheat field's place wild. An old
// farm with its garden and fields elsewhere and a coop standing where the garden goes: all put right on loading.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/fixedtest'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); ctx.setDefaultTimeout(120000);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (n, c, i) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? ' · ' + JSON.stringify(i) : '')); if (!c) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { f.step(1 / 30, 1); f.gameTick(Date.now(), false); } f.draw(); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.gameUI().close(); }); await run(4); for (let i = 0; i < 30 && !(await p.evaluate(() => !!window.__farm.garden.mid(0))); i++) await run(1); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await load();
await p.evaluate(() => { const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); });
let s = await p.evaluate(() => { const f = window.__farm, g = f.game(), st = f.garden.state(); return { at: st.at, vis: st.visible, garden: g.data.garden || null, wheat: g.data.wheat, w2: g.data.wheat2 || null, quiet: [...document.querySelectorAll('.gbub.gwheat')].every(e => e.classList.contains('gquiet')) }; });
ok('a new farm: the garden in its fixed place at level 1, every bed wild, nothing saved for it', s.at && s.at.join() === '-33,-23' && s.vis.every(v => v.length === 0) && !s.garden, s);
ok('the wheat field in its fixed place; no bubbles shown on the beds or the fields', s.wheat.x === -25.25 && s.wheat.z === -30.75 && s.quiet && !s.w2, s.wheat);
await p.evaluate(() => window.__farm.lookAt(-27.5, -27, 6.6)); await run(0.5); await p.screenshot({ path: OUT + '/fixed_1_new.png' });
// an old farm
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(16) + 5; g.data.lvSeen = 13; g.data.coins = 1e6; for (let i = 0; i < 12; i++) f.buyLand(); g.garden(); g.sowBed(0, 'carrot'); g.save();
  const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.garden.x = -20; raw.d.garden.z = -15; raw.d.garden.deg = 0; raw.d.wheat.x = -15; raw.d.wheat.z = -20; raw.d.wheat2 = { x: -10, z: -20, deg: 90, ripe: 0 }; raw.d.coops[0].x = -33; raw.d.coops[0].z = -23; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
s = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return { garden: [g.data.garden.x, g.data.garden.z, g.data.garden.deg], bed0: g.data.garden.beds[0].crop, wheat: [g.data.wheat.x, g.data.wheat.z, g.data.wheat.deg], w2: [g.data.wheat2.x, g.data.wheat2.z, g.data.wheat2.deg], coop: [c.x, c.z], birds: g.birdsIn(c.id).length }; });
ok('an old farm: the garden, its crops and both wheat fields back in their fixed places', s.garden.join() === '-33,-23,90' && s.bed0 === 'carrot' && s.wheat.join() === '-25.25,-30.75,0' && s.w2.join() === '-19.9,-32,0', s);
ok('a coop that stood where the garden goes: moved clear of it, its birds with it', !(s.coop[0] > -37.2 && s.coop[0] < -30.8 && s.coop[1] > -28.3 && s.coop[1] < -19.1) && s.birds === 3, s);
ok('the garden and the fields can’t be moved', await p.evaluate(() => { const g = window.__farm.game(); g.placeGarden({ x: 0, z: 0, deg: 0 }); g.placeWheat({ x: 0, z: 0, deg: 0 }); return g.data.garden.x === -33 && g.data.wheat.x === -25.25; }));
await run(3); await p.evaluate(() => window.__farm.lookAt(-27.5, -27, 6.6)); await run(0.5); await p.screenshot({ path: OUT + '/fixed_2_old.png' });
ok('no page errors', errs.length === 0, errs);
console.log(fails ? `FAILED: ${fails}` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);

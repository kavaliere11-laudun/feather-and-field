// How many coops the whole farm holds at their Deluxe size (15 Nov 2026, Audrey: "we will need to reconsider the size of
// the map too as all the breeds will need to fit in. I know they are already some places where the deluxe coop doesn't fit
// right, for you to check"): ./withserver.sh node captest.mjs OUT
// A farm at level 30 with every field: each breed's coop put down where the game first offers it (does its Deluxe pen
// fit there? each look's), then all twelve packed at Deluxe size, then how many more Deluxe coops still fit. A picture.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(900000);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(Date.now()); if (f.gameUI().isOpen) f.gameUI().close(); }); };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { f.step(1 / 30, 1); f.gameTick(Date.now(), false); } }, s);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(50) + 5; g.data.lvSeen = g.level; g.data.land = [...Array(30).keys()]; g.data.coins = 9e6; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(1);
const info = await p.evaluate(() => { const f = window.__farm, g = f.game(); return { level: g.level, land: g.data.land.length, wait: g.waitingCoops() }; });
console.log(JSON.stringify(info));
// each breed's coop where the game first offers it
const first = [];
for (const breed of ['rir', ...info.wait]) {
  if (breed !== 'rir') { await p.evaluate(b => window.__farm.place(b), breed); await run(1);
    for (let k = 0; k < 10 && !(await p.evaluate(() => window.__farm.move.state().ok)); k++) await p.evaluate(k => { const f = window.__farm, M = f.move.state(); f.move.to(M.at.x + [3, -3, 0, 0, 5, -5, 5, -5, 8, -8][k], M.at.z + [0, 0, 3, -3, 5, 5, -5, -5, 0, 0][k]); }, k);
    const ok = await p.evaluate(() => { const f = window.__farm; if (!f.move.state().ok) { f.move.cancel(); return false; } return !!f.move.place(); }); await run(1.5);
    if (!ok) { first.push({ breed, placed: false }); continue; } }
  first.push(await p.evaluate(breed => { const f = window.__farm, g = f.game(), i = g.data.coops.findIndex(c => c.breed === breed), c = g.data.coops[i]; const fit = [1, 2, 3, 4].map(t => { const S = f.coopSpotAt({ x: c.x, z: c.z, deg: c.deg }, t, i); return !!(S && S.ok); }); return { breed, placed: true, at: [c.x, c.z, c.deg], fit }; }, breed));
  console.log(JSON.stringify(first[first.length - 1]));
}
// the points of the fields, then every coop packed at its Deluxe size
const pack = await p.evaluate(async () => {
  const f = window.__farm, g = f.game(); f.gameUI().close();
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; const pts = [];
  for (let z = -120; z <= 120; z += 1) for (let x = -120; x <= 120; x += 1) if (f.fieldAt(x, z) >= 0) { pts.push([x, z]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const res = { pts: pts.length, box: [x0, x1, z0, z1], moved: [], extra: 0, spots: [] };
  const find = i => { for (const [x, z] of pts) for (const deg of [0, 90, 180, 270]) { const S = f.coopSpotAt({ x, z, deg }, 4, i); if (S && S.ok) return { x, z, deg }; } return null; };
  // lift every coop off the farm first (far away), then set each down at Deluxe size, row by row
  const cs = g.data.coops; const keep = cs.map(c => ({ x: c.x, z: c.z, deg: c.deg }));
  for (const c of cs) { c.x = 9000 + Math.random(); c.z = 9000; }
  for (let i = 0; i < cs.length; i++) { const o = find(i); if (!o) { res.moved.push([cs[i].breed, null]); continue; } cs[i].x = o.x; cs[i].z = o.z; cs[i].deg = o.deg; cs[i].tier = 4; res.moved.push([cs[i].breed, o]); res.spots.push([o.x, o.z, cs[i].breed]); }
  // how many more Deluxe coops (a Pagoda's size) still fit
  const si = cs.findIndex(c => c.breed === 'sil'), base = cs[si];
  for (let n = 0; n < 40; n++) { cs.push({ ...base, id: 'x' + n, x: 9000, z: 9000 + n * 50 }); const o = find(cs.length - 1); if (!o) { cs.pop(); break; } const c = cs[cs.length - 1]; c.x = o.x; c.z = o.z; c.deg = o.deg; res.extra++; res.spots.push([o.x, o.z, 'extra']); }
  res.fieldOf = res.spots.map(s => f.fieldAt(s[0], s[1]));
  return res;
});
console.log(JSON.stringify(pack));
fs.writeFileSync(OUT + '/cap.json', JSON.stringify({ info, first, pack, errs }, null, 1));
console.log('errors', JSON.stringify(errs.slice(0, 3)));
await b.close();

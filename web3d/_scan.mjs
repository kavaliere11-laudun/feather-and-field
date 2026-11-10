import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
ctx.setDefaultTimeout(180000);
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`http://localhost:${process.env.PORT}/play.html?q=0&lang=en&time=10:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(5) + 5; g.data.lvSeen = 5; g.data.land = [0, 1, 2, 3, 4]; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
const R = await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); const c0 = g.data.coops[0]; const rows = []; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let z = -60; z <= 20; z += 1) { let row = ''; for (let x = -60; x <= 20; x += 1) { const fl = f.fieldAt(x, z); if (fl < 0 || fl > 4) { row += ' '; continue; } let now = false, grow = false; for (const k of [0, 1, 2, 3]) { const deg = (c0.deg + k * 90) % 360; const r = f.move.room(0, { x, z, deg }); if (r.now) now = true; if (r.now && r.grow) grow = true; } row += grow ? '#' : now ? 'o' : '.'; } rows.push(row); }
  return { rows, at: [c0.x, c0.z, c0.deg], lv: g.level }; });
console.log(JSON.stringify(R.at), R.lv); console.log(R.rows.filter(r => r.trim()).join('\n'));
await b.close();

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
const R = await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); const c0 = f.gamePlots()[0].gc; c0.tier = 4; const out = {};
  for (const step of [90, 45, 15]) { const o = out[step] = {}; for (let z = -60; z <= 20; z += 0.5) for (let x = -60; x <= 20; x += 0.5) { const fl = f.fieldAt(x, z); if (fl < 0 || fl > 4) continue; let ok = false; for (let d = 0; d < 360 && !ok; d += step) ok = f.coopSpot(x, z, (c0.deg + d) % 360, 0).ok; o[fl] = (o[fl] || 0) + (ok ? 1 : 0); } }
  c0.tier = 0; return out; });
console.log(JSON.stringify(R));
await b.close();

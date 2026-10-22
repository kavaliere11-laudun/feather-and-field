// How often foxes not playing together walk into each other (pushed apart by more than 4 mm), and in what: node bumps.mjs [minutes]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const mins = +(process.argv[2] || 3);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 200, height: 200 } });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=3&coops=5&foxes&time=16');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
console.log(JSON.stringify(await p.evaluate((mins) => {
  const f = window.__farm, F = f.foxes(); f.pause(true); f.step(1 / 30, 600); F.bumps = 0; F.bumpLog(true);
  let frames = 0, events = 0, was = 0;
  for (let k = 0; k < mins * 60 * 30; k++) { f.step(1 / 30, 1); frames++; const nb = F.bumps; if (nb > was) events++; was = nb; }
  return { minutes: mins, framesWithABump: events, perMinute: +(events / mins).toFixed(1), log: Object.entries(F.bumpLog()).sort((a, b) => b[1] - a[1]).slice(0, 12) };
}, mins)));
await b.close();

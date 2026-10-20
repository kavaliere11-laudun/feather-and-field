// Runs the farm for a while (sped up) and reports how close any two birds ever got.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 200, height: 400 }, deviceScaleFactor: 1 });
await p.goto('http://localhost:8770/index.html?q=3');
await p.waitForFunction(() => window.__farm && window.__farm.birds.length > 0, null, { timeout: 120000 });
const r = await p.evaluate(() => {
  const B = window.__farm.birds; let worst = 99, close = 0, samples = 0;
  for (let step = 0; step < 6000; step++) {                 // 10 minutes of farm time at 1/10 s steps
    for (const b of B) b.update(0.1);
    window.__separate(0.1);
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const d = Math.hypot(B[i].root.position.x - B[j].root.position.x, B[i].root.position.z - B[j].root.position.z);
      const min = B[i].kind === 'chick' || B[j].kind === 'chick' ? 0.2 : 0.32;
      if (step > 50) { worst = Math.min(worst, d / min); samples++; if (d < min * 0.8) close++; }
    }
  }
  return { worst: +worst.toFixed(2), closeShare: +(close / samples).toFixed(4) };
});
console.log(JSON.stringify(r));
await b.close();

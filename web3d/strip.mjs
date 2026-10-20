// A strip of frames of one coop's birds, 0.1 s apart (stepped exactly), to check walking and actions. node strip.mjs [plot] [size] [frames] [out]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const plot = parseInt(process.argv[2] || '0'), size = parseFloat(process.argv[3] || '1.4'), n = parseInt(process.argv[4] || '8'), out = process.argv[5] || 'strip';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 500, height: 500 }, deviceScaleFactor: 1 });
await p.goto('http://localhost:8770/index.html?q=0');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(([i, s]) => { const f = window.__farm; f.freeze(true); f.step(1 / 60, 240); const c = f.plots[i].frame.getWorldPosition(new f.THREE.Vector3()); f.lookAt(c.x + 0.2, c.z + 1.0, s); }, [plot, size]);
for (let k = 0; k < n; k++) {
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}_${k}.png` });
  await p.evaluate(() => window.__farm.step(1 / 60, 6));
}
await b.close();

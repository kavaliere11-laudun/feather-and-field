// the quality comes back up after zooming in from a slow view (late frames faked): node stepup.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:8770/index.html?coops=0');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(async () => {
  const f = window.__farm, out = [];
  f.lookAt(f.view.target.x, f.view.target.z, 6.5); f.setQuality(2); out.push(['slow far', f.quality()]);
  f.lookAt(f.view.target.x, f.view.target.z, 2.2);
  // pretend every frame is on time, so only the zoom decides
  for (let i = 0; i < 6; i++) { f.meter.late = 0; f.meter.slow = 0; f.meter.since = performance.now() - 2100; await new Promise(r => setTimeout(r, 400)); f.meter.late = 0; }
  out.push(['zoomed in', f.quality()]);
  return out;
});
console.log(JSON.stringify(r));
await b.close();

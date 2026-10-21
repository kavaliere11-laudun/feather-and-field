// Frames of the wind on the ripe wheat field and round it: node windclip.mjs [frames] [fps] [size] [out] [stage]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [n = '24', fps = '12', size = '2.4', out = 'wind', stage = 'ripe'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 500 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8770/index.html?q=0&coops=0');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(([s, st]) => { const f = window.__farm; f.pause(true); f.freeze(true); const c = f.field().centre; f.lookAt(c.x, c.z, s); f.wheat(st); }, [parseFloat(size), stage]);
for (let k = 0; k < parseInt(n); k++) {
  await p.evaluate((t) => { const f = window.__farm; f.wind(t); f.draw(); }, k / parseFloat(fps));
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}_${String(k).padStart(2, '0')}.png` });
}
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

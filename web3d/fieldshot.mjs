// The wheat field in its four stages (and the wind at two moments): node fieldshot.mjs [size] [out]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [size = '1.8', out = 'field'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 500 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8770/index.html?q=0&coops=0');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate((s) => { const f = window.__farm; f.pause(true); f.freeze(true); const c = f.field().centre; f.lookAt(c.x, c.z, s); }, parseFloat(size));
for (const [stage, t] of [['soil', 0], ['sprouts', 0], ['growing', 0], ['ripe', 0], ['ripe', 2.6]]) {
  await p.evaluate(([st, t]) => { const f = window.__farm; f.wheat(st); f.wind(t); f.draw(); }, [stage, t]);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}_${stage}_${t}.png` });
}
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

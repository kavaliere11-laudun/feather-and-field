// The den and the meadow from the game's camera: node denshot.mjs [out] [size]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'den', size = '2.2'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 500 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&foxes&time=' + (process.env.HOUR || '16'));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #tag { display: none !important; }' });
await p.evaluate((size) => { const f = window.__farm; f.pause(true); f.step(1 / 30, +(window.SKIP || 40)); f.lookAt(-7.49 + 0.4, -35.94 + 0.9, +size); f.step(1 / 30, 1); f.draw(); }, size);
await p.screenshot({ path: `${out}.png`, timeout: 120000 });
await b.close();

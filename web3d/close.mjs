// A close look at plot 0's hens (to check the birds' detail at full zoom). Usage: node close.mjs [url] [out.png]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'http://localhost:8770/index.html?q=0';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
await p.goto(url);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(() => { const f = window.__farm, v = f.birds[0].root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(v.x, v.z, 1.5); });
await p.waitForTimeout(2500);
await p.screenshot({ path: process.argv[3] || 'close.png' });
await b.close();

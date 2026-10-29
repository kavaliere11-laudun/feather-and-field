// The line-up (?lineup) in a wide window, to check every breed and Silkie colour at once. Usage: node lineshot.mjs [out.png] [size] [extra query]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const out = process.argv[2] || 'lineup_wide.png', size = parseFloat(process.argv[3] || '1.6');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8770/index.html?lineup&q=0' + (process.argv[4] || ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate((s) => { const f = window.__farm; f.view.size = s; f.lookAt(f.view.target.x, f.view.target.z, s); }, size);
await p.waitForTimeout(parseInt(process.argv[5] || '2500'));
await p.screenshot({ path: out, timeout: 180000 });
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

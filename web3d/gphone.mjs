// The geese line-up as on Audrey's phone (402x874), the page's own camera: node gphone.mjs OUT [steps] [lang]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'gphone.png', steps = '60', lang = 'en'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?lineup=geese' + (lang === 'fr' ? '&lang=fr' : ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate((n) => { const f = window.__farm; f.pause(true); f.step(1 / 30, n); f.draw(); }, +steps);
await p.screenshot({ path: out, timeout: 120000 });
console.log('errors', errs);
await b.close();

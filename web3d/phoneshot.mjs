// The line-up as on Audrey's iPhone (390x844 at 3x, the page caps it to 2x): node phoneshot.mjs out [size] [dx] [dz]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'phone.png', size = '2.2', dx = '0', dz = '0'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 3 });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&lineup' + (process.env.QS || ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(([s, dx, dz, turn]) => { const f = window.__farm; f.pause(true); f.freeze(true); for (const bd of f.allBirds) bd.root.rotation.y += turn; f.step(1 / 60, 30); const c = f.view.target.clone(); f.lookAt(c.x + dx, c.z + dz, s); f.draw(); }, [parseFloat(size), parseFloat(dx), parseFloat(dz), parseFloat(process.argv[6] || '0')]);
await p.waitForTimeout(3000);
await p.screenshot({ path: out, timeout: 240000 });
await b.close();

// A still from the game's camera looking at a spot of the village: node spotshot.mjs OUT x z [size] [hour]
// (QS: more page options; W, H the view, phone size by default)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'spot.png', x = '0', z = '0', size = '4', hour = '14'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 402), height: +(process.env.H || 874) }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0' + (process.env.QS ? '&' + process.env.QS : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top, #farmerbtn { display: none !important; }' });
await p.evaluate(([x, z, s, h, n]) => { const f = window.__farm; f.pause(true); if (f.setHour) f.setHour(h); f.step(1 / 30, n); f.lookAt(x, z, s); f.draw(); }, [+x, +z, +size, +hour, +(process.env.STEPS || 30)]);
await p.screenshot({ path: out, timeout: 120000 });
console.log('errors', errs);
await b.close();

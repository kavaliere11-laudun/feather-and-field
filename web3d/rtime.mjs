// How long one frame takes to draw in the test browser (software 3D), for a view: node rtime.mjs URLQUERY size [w h]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [qs = 'lineup', size = '2.2', w = '402', h = '874'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
await p.goto('http://localhost:8770/index.html?q=3&' + qs);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
console.log(await p.evaluate((s) => {
  const f = window.__farm; f.freeze(true); f.lookAt(f.view.target.x, f.view.target.z, s);
  const t0 = performance.now(); f.renderer.render(f.scene, f.camera); f.renderer.getContext().finish(); const t1 = performance.now();
  f.renderer.render(f.scene, f.camera); f.renderer.getContext().finish(); const t2 = performance.now();
  const i = f.renderer.info.render; return { first: Math.round(t1 - t0), second: Math.round(t2 - t1), tris: i.triangles, calls: i.calls };
}, parseFloat(size)));
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

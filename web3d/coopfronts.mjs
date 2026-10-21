// The front of each coop style close up, the birds moved aside: node coopfronts.mjs [size] [out] [birds]
// (birds=1 leaves the birds where they are)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [size = '1.5', out = 'fronts', keep = '0'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.VW || 420), height: +(process.env.VH || 420) }, deviceScaleFactor: 1.5 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top { display: none !important; }' });
for (let i = 0; i < 5; i++) {
  await p.evaluate(([i, s, keep, lx, lz, lh]) => {
    const f = window.__farm, pl = f.plots[i]; f.pause(true); f.freeze(true); f.noLaying();
    if (!keep) for (const bd of pl.birds) { bd.root.position.set(1.3, 0, 2.1); bd.root.updateMatrixWorld(true); }
    const w = new f.THREE.Vector3(lx, 0, lz); pl.frame.localToWorld(w);
    const k = lh / Math.tan(42 * Math.PI / 180);
    f.lookAt(w.x - Math.SQRT1_2 * k, w.z - Math.SQRT1_2 * k, s); f.step(1 / 30, 2); f.draw();
  }, [i, parseFloat(size), keep === '1', +(process.env.LX ?? 0.05), +(process.env.LZ ?? 0.5), +(process.env.LH ?? 0.4)]);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}_${i}.png` });
}
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

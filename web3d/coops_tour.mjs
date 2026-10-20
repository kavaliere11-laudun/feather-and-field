// Visit each coop plot (default the first 10: every style, plain and Deluxe), one phone-size screenshot each, and a sheet.
// Usage: node coops_tour.mjs [count] [size] [prefix]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const n = parseInt(process.argv[2] || '10'), size = parseFloat(process.argv[3] || '3.0'), pre = process.argv[4] || 'ct';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8770/index.html?q=0&details&coops=' + n);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
for (let i = 0; i < n; i++) {
  const info = await p.evaluate(([i, size]) => { const f = window.__farm, pl = f.plots[i], c = pl.frame.getWorldPosition(new f.THREE.Vector3()); f.lookAt(c.x, c.z, size);
    return pl.breed + (pl.deluxe ? ' deluxe' : ''); }, [i, size]);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${pre}_${i}.png` });
  console.log(i, info, await p.evaluate(() => { const r = window.__farm.renderer.info.render; return Math.round(r.triangles / 1000) + 'k tris, ' + r.calls + ' draws'; }));
}
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

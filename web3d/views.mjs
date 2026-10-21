// Triangles and draws for the tour views (drawn once each, so it works in the slow test browser): node views.mjs [coops]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const coops = process.argv[2] || '10';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8770/index.html?q=0&coops=' + coops);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const out = await p.evaluate(() => {
  const f = window.__farm, V = f.plan(); f.pause(true);
  const P = V.plots.map(x => x.pos), c4 = P.slice(4, 8).reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[2] / 4], [0, 0]);
  const c0 = P.slice(0, 4).reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[2] / 4], [0, 0]);
  const stops = [['start', P[0][0] + 0.6, P[0][2] - 1.2, 4.4], ['coop close', P[0][0], P[0][2], 1.6], ['cluster', c0[0], c0[1], 6.5], ['cluster far', c0[0], c0[1], 9],
                 ['cluster2', c4[0], c4[1], 6.5], ['silkie coop', P[4][0], P[4][2], 2.6]];
  const res = [];
  for (const [name, x, z, s] of stops) {
    f.lookAt(x, z, s); f.draw(); const i = f.renderer.info.render, t = i.triangles, c = i.calls;
    for (const bd of f.allBirds) bd.visual.visible = false; f.draw(); const nb = f.renderer.info.render.triangles;
    for (const bd of f.allBirds) bd.visual.visible = true;
    res.push(name + ': ' + Math.round(t / 1000) + 'k tris (birds ' + Math.round((t - nb) / 1000) + 'k), ' + c + ' draws');
  }
  return res;
});
console.log(out.join('\n'));
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

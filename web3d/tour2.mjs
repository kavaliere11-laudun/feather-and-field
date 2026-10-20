// More stops: a bridge, the wheat field, the egg stall and sunflowers, and a full cluster of coops (stress: ?coops=40).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'http://localhost:8770/index.html?q=0&details&coops=40';
const pre = process.argv[3] || 'tour2';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(url);
await p.waitForFunction(() => window.__farm && window.__farm.plots.length > 0 && document.getElementById('loading') === null, null, { timeout: 120000 });
const plan = await p.evaluate(() => { const V = window.__farm.plan(); const f = n => V.props.filter(x => x.model === n).map(x => x.pos)[0]; return { bridge: f('bridge'), wheat: f('wheat_field'), stall: f('egg_stall'), sun: f('sunflowers'), plots: V.plots.map(x => x.pos) }; });
const c = plan.plots.slice(4, 8).reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[2] / 4], [0, 0]);
const stops = [['bridge', plan.bridge[0], plan.bridge[2], 3.5], ['wheat', plan.wheat[0], plan.wheat[2], 4.5], ['stall', plan.stall[0], plan.stall[2], 4],
               ['sunflowers', plan.sun[0], plan.sun[2], 4], ['cluster40', c[0], c[1], 6.5], ['cluster40far', c[0], c[1], 9]];
for (const [name, x, z, size] of stops) {
  await p.evaluate(([x, z, size]) => window.__farm.lookAt(x, z, size), [x, z, size]);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${pre}_${name}.png` });
  console.log(name, await p.evaluate(() => { const i = window.__farm.renderer.info.render; return Math.round(i.triangles / 1000) + 'k tris, ' + i.calls + ' draws'; }));
}
if (errs.length) console.log('ERRORS', errs.slice(0, 5).join(' | '));
await b.close();

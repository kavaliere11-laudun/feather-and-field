// A tour of the village at iPhone size: one screenshot per place (pond, farmhouse, pasture, a cluster, zoomed out).
// Usage: node tour.mjs [url] [prefix]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'http://localhost:8770/index.html?q=0&details';
const pre = process.argv[3] || 'tour';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
await p.goto(url);
await p.waitForFunction(() => window.__farm && window.__farm.plots.length > 0 && document.getElementById('loading') === null, null, { timeout: 120000 });
const plan = await p.evaluate(() => { const V = window.__farm.plan(); return { pond: V.pond.center, house: V.house, plots: V.plots.map(x => x.pos), props: V.props.filter(x => x.model === 'pasture').map(x => x.pos) }; });
const stops = [['pond', plan.pond[0], plan.pond[2], 5.5], ['house', plan.house[0], plan.house[2], 4.6], ['pasture', plan.props[0][0], plan.props[0][2], 5],
               ['cluster', plan.plots[9][0], plan.plots[9][2], 6.5], ['far', plan.pond[0], plan.pond[2], 9]];
for (const [name, x, z, size] of stops) {
  await p.evaluate(([x, z, size]) => window.__farm.lookAt(x, z, size), [x, z, size]);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${pre}_${name}.png` });
  const info = await p.evaluate(() => { const i = window.__farm.renderer.info.render; return Math.round(i.triangles / 1000) + 'k tris, ' + i.calls + ' draws'; });
  console.log(name, info);
}
if (errs.length) console.log('ERRORS', errs.slice(0, 5).join(' | '));
await b.close();

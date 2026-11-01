// close looks at a village prop or decoration from around it: node view.mjs OUT model [dist] [el] [azs] [fov]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out, model, dist = '5', el = '28', azs = '0,90,180,270', fov = '30', hour = '10.5'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 700, height: 520 }, deviceScaleFactor: 1.5 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&time=10:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
const at = await p.evaluate(([model, hour]) => { const f = window.__farm; f.pause(true); f.step(1 / 30, 30); f.setHour(+hour);
  const pr = f.props().find(o => o.model === model) || f.decor().find(o => o.model === model || o.id === model); if (!pr) return null; return [pr.pos[0], (pr.h || 1.5) * 0.45, pr.pos[2], pr.deg || 45]; }, [model, hour]);
if (!at) { console.log('no', model); process.exit(1); }
let k = 0;
for (const az of azs.split(',').map(Number)) {
  await p.evaluate(([at, az, dist, el, fov]) => window.__farm.closeShot({ at: [at[0], at[1], at[2]], az: az + (at[3] - 45), el, dist, fov }), [at, az, +dist, +el, +fov]);
  await p.screenshot({ path: `${out}_${k++}.png` });
}
console.log('done', JSON.stringify(at), errs.slice(0, 2));
await b.close();

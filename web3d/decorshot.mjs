// Pictures of the decorations on the farm: node decorshot.mjs OUT [hour]  (one picture each, then the whole village;
// SIZE: how much of the farm each shows; NAMES=windmill,statue: only those)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'dc', hour = '14'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 2) });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' && /no room/.test(m.text())) errs.push(m.text()); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0${process.env.EXTRA || ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #replaybtn, #farmerbtn, #foxbtn { display: none !important; }' });
const list = await p.evaluate(h => { const f = window.__farm; f.pause(true); f.setHour(h); for (let i = 0; i < 60; i++) f.step(1 / 30, 1); return f.decor().map(d => ({ model: d.model, x: d.pos[0], z: d.pos[1], h: d.box.max.y })); }, +hour);
console.log(JSON.stringify(list.map(d => [d.model, +d.x.toFixed(1), +d.z.toFixed(1)])));
const only = (process.env.NAMES || '').split(',').filter(Boolean);
for (const d of list) {
  if (only.length && !only.includes(d.model)) continue;
  const size = +(process.env.SIZE || 0) || Math.max(1.6, d.h * 0.62 + 0.9);
  await p.evaluate(([d, size]) => { const f = window.__farm, k = d.h * 0.45 / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2; f.lookAt(d.x - k, d.z - k, size); for (let i = 0; i < 10; i++) f.step(1 / 30, 1); f.draw(); }, [d, size]);
  await p.screenshot({ path: `${out}_${d.model}.png` });
}
console.log('errors', errs);
await b.close();

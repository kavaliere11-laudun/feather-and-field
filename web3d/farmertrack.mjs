// The farmer's track seen from above (with the paths, the coops, the pond): node farmertrack.mjs OUT.json [hour] [mins]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out = 'ft.json', hour = '14', mins = '6'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&farmer${process.env.EXTRA || ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(([hour, mins]) => {
  const f = window.__farm, L = f.farmer(), nav = f.nav(); f.pause(true); f.setHour(hour);
  const tr = [], acts = {};
  for (let s = 0; s < mins * 60 * 5; s++) { f.step(1 / 30, 6); tr.push([+L.pos.x.toFixed(2), +L.pos.z.toFixed(2), L.task ? L.task.name : '-', nav.costAt(L.pos.x, L.pos.z), nav.freeAt(L.pos.x, L.pos.z) ? 1 : 0]); const k = L.task ? L.task.name : '-'; acts[k] = (acts[k] || 0) + 1; }
  return { tr, acts, said: L.said };
}, [+hour, +mins]);
fs.writeFileSync(out, JSON.stringify(r));
const onPath = r.tr.filter(t => t[3] <= 1).length, moving = r.tr.filter((t, i) => i && Math.hypot(t[0] - r.tr[i - 1][0], t[1] - r.tr[i - 1][1]) > 0.05);
console.log(JSON.stringify(r.acts), 'said', r.said.join(','), 'blocked', r.tr.filter(t => !t[4]).length, 'moving on path', moving.filter(t => t[3] <= 1).length, 'of', moving.length);
console.log('errors', errs);
await b.close();

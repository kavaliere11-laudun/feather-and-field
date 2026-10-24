// The ducks' tracks seen from above, for checking how they move: node ducktrack.mjs OUT.json [hour] [mins]
// (with the pond's outline, the dock's circles, the geese and every few seconds what each is doing)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out = 'tracks.json', hour = '14', mins = '6'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' / ')));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&ducks${process.env.EXTRA || ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(([hour, mins]) => {
  const f = window.__farm; f.pause(true); f.setHour(hour);
  const D = f.ducks(), G = f.geese(), tr = D.ducks.map(() => []), gt = G.geese.map(() => []), notes = [], acts = {}, plans = {};
  const outline = []; for (let k = 0; k <= 72; k++) outline.push(D.at(k / 72 * Math.PI * 2, 1));
  for (let s = 0; s < mins * 60 * 5; s++) {
    f.step(1 / 30, 6);
    D.ducks.forEach((d, i) => { tr[i].push([+d.pos.x.toFixed(3), +d.pos.z.toFixed(3), d.act]); acts[d.name + ':' + d.act] = (acts[d.name + ':' + d.act] || 0) + 1; });
    G.geese.forEach((g, i) => gt[i].push([+g.pos.x.toFixed(3), +g.pos.z.toFixed(3)]));
    plans[D.plan] = (plans[D.plan] || 0) + 1;
    if (s % 50 === 0) notes.push((s / 5).toFixed(0) + 's ' + D.plan + ' ' + D.ducks.map(d => `${d.name} ${d.task ? d.task.name : '-'}/${d.act}`).join(' | '));
  }
  return { tr, gt, notes, acts, plans, outline, avoid: D.avoid, mouths: D.mouths, raft: D.raft, rests: D.rests.map(q => q.spots), bed: G.bed };
}, [+hour, +mins]);
fs.writeFileSync(out, JSON.stringify(r));
console.log(r.notes.join('\n')); console.log(JSON.stringify(r.acts)); console.log(JSON.stringify(r.plans));
console.log('errors', errs);
await b.close();

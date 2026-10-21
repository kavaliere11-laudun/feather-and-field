// Where a laying hen is and what she's doing, second by second: node laytrace.mjs PLOT PERS SIT seconds
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [plot = '3', pers = 'diva', sit = '2', secs = '30'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 300 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=3&coops=5');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const out = await p.evaluate(([i, pers, sit, secs]) => {
  const f = window.__farm, pl = f.plots[i]; f.pause(true); f.freeze(true); f.noLaying(); f.step(1 / 30, 30);
  f.layAs(i, pers, sit);
  const h = pl.birds.find(b => b.laying), lines = [];
  for (let s = 0; s < secs * 2; s++) {
    f.step(1 / 30, 15);
    const q = h.root.position, A = h.A;
    lines.push(`${(s / 2).toFixed(1)}s ${h.laying ? h.laying.phase : '-'} pos ${q.x.toFixed(2)},${q.y.toFixed(2)},${q.z.toFixed(2)} yaw ${(h.root.rotation.y * 57.3 % 360).toFixed(0)} act ${h.act ? h.act.type : '-'} wait ${h.wait.toFixed(1)} route ${h.route ? h.route.length : '-'} tgt ${h.target.x.toFixed(2)},${h.target.z.toFixed(2)} sit ${A.sit.toFixed(2)} sing ${(A.sing||0).toFixed(2)} proud ${(A.proud||0).toFixed(2)} eggs ${pl.nest.count}`);
  }
  return lines.join('\n');
}, [parseInt(plot), pers, parseFloat(sit), parseFloat(secs)]);
console.log(out);
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

// Do the birds poke into the houses or walk through what stands in front of them? Simulates the coop pens for a few minutes
// and counts, every half second, beaks inside a house's front wall and birds standing in a let-down door, pot or post.
// Usage: node clipcheck.mjs [minutes]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const mins = parseFloat(process.argv[2] || '3');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 300 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=3&coops=5');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const out = await p.evaluate((mins) => {
  const f = window.__farm; f.pause(true);
  const plots = f.plots.filter(pl => pl.nest), res = {};
  for (const pl of plots) res[pl.breed] = { samples: 0, beakInWall: 0, inBlock: 0, worst: 0 };
  for (let s = 0; s < mins * 120; s++) {
    f.step(1 / 30, 15);
    for (const pl of plots) {
      const r = res[pl.breed];
      for (const bd of pl.birds) {
        if (bd.laying && bd.laying.inside) continue;
        const q = bd.root.position, y = bd.root.rotation.y, reach = 0.25 * bd.rig.scale / 0.5;
        const bx = q.x + Math.sin(y) * reach, bz = q.z + Math.cos(y) * reach;
        r.samples++;
        if (Math.abs(bx) < 0.62 && bz < 0.44 && bz > -0.44) { r.beakInWall++; r.worst = Math.max(r.worst, 0.44 - bz); }
        if (bd.inBlock(q.x, q.z)) r.inBlock++;
      }
    }
  }
  for (const k in res) res[k].worst = +res[k].worst.toFixed(3);
  return res;
}, mins);
console.log(JSON.stringify(out));
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

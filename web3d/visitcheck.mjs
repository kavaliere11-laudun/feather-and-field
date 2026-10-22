// Rusty against the coop, every frame of a night visit: node visitcheck.mjs [plots, e.g. 0,1,5] [farmerAt seconds]
// His posed body (every third of its own points, skinned) in the pen's frame, checked against: the fence (within 2 cm of
// its line, below its top), the house (inside its walls, except through the open pop door), the ramp's plank (inside it),
// and the feeder, water and hay. Prints per coop how many frames touched each and how deep, and in which of his moves.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const plots = (process.argv[2] || '0,1,2,3,4,5,6,7,8,9').split(',').map(Number), farmerAt = process.argv[3] ? +process.argv[3] : null;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let total = 0;
for (const plot of plots) {
  const p = await b.newPage({ viewport: { width: 200, height: 300 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&coops=10&visit=${plot}`);
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  const r = await p.evaluate(([plot, farmerAt]) => {
    const f = window.__farm, V = f.visit(), fox = V.fox, THREE = f.THREE, mesh = fox.q.mesh, g = mesh.geometry;
    f.pause(true);
    const ft = g.attributes.furT.array; let n = 0; while (n < ft.length && ft[n] === 0) n++;
    const pl = f.plots[plot], G = f.nestOf(pl), pen = f.plan && null, D2 = 0.44, deluxe = pl.deluxe;
    const top = deluxe ? 0.62 : 0.55, X0 = -1.64, X1 = 1.79, Z0 = -0.79, Z1 = 2.5;
    const obs = f.penObstacles().filter(o => Math.abs(o[0] - G.pop[0]) > 0.05);
    const HIGH = { '-1.1,1.85': 0.3, '1.2,1.45': 0.44, '0.2,1.95': 0.075 };     // measured from the pen's model (hay bale, feeder, the low straw)
    const rampY = z => G.house * Math.min(1, Math.max(0, (G.foot[1] - z) / Math.max(0.05, G.foot[1] - G.pop[1])));
    const v = new THREE.Vector3(), out = { fence: 0, house: 0, ramp: 0, yard: 0 }, deep = { fence: 0, house: 0, ramp: 0, yard: 0 }, where = {};
    let t = 0, frames = 0, sent = false, started = false;
    for (let k = 0; k < 30 * 200; k++) {
      f.step(1 / 30, 1); t += 1 / 30;
      if (farmerAt !== null && !sent && t > farmerAt && V.canSend()) { V.sendFarmer(); sent = true; }
      if (V.active()) started = true;
      if (started && !V.active()) break;
      if (k % 2 || !fox.root.visible || V.target !== pl) continue;
      const task = fox.task && fox.task.cur ? fox.task.cur() : fox.task, name = (task ? task.name : '') + (fox.A.air > 0.1 ? '(air)' : '');
      fox.root.updateMatrixWorld(true); mesh.skeleton.update();
      const hit = { fence: 0, house: 0, ramp: 0, yard: 0 }, part = {};
      const bone = i => mesh.skeleton.bones[g.attributes.skinIndex.array[i * 4]].name;
      for (let i = 0; i < n; i += 3) {
        mesh.getVertexPosition(i, v); mesh.localToWorld(v); pl.frame.worldToLocal(v);
        if (v.y < top && v.y > 0.01) {
          const dx = Math.min(Math.abs(v.x - X0), Math.abs(v.x - X1)), dz = Math.min(Math.abs(v.z - Z0), Math.abs(v.z - Z1));
          const onX = dx < 0.02 && v.z > Z0 && v.z < Z1, onZ = dz < 0.02 && v.x > X0 && v.x < X1;
          if (onX || onZ) { hit.fence = Math.max(hit.fence, top - v.y); part.fence = bone(i); }
        }
        if (v.x > -0.64 && v.x < 0.64 && v.z > -0.48 && v.z < D2 - 0.01 && v.y < 1.4 && v.y > (pl.breed === 'rir' ? G.house + 0.02 : 0.02)) {
          const door = Math.abs(v.x - G.pop[0]) < 0.14 && v.y > G.house - 0.01 && v.y < G.house + 0.44;
          if (!door) { hit.house = Math.max(hit.house, Math.min(D2 - v.z, 0.64 - Math.abs(v.x))); part.house = bone(i); }
        }
        if (Math.abs(v.x - G.pop[0]) < 0.1 && v.z > G.pop[1] && v.z < G.foot[1]) { const h = rampY(v.z); if (v.y < h - 0.02 && v.y > h - 0.06) { hit.ramp = Math.max(hit.ramp, h - v.y); part.ramp = bone(i) + '@z' + v.z.toFixed(2); } }
        for (const o of obs) { const d = Math.hypot(v.x - o[0], v.z - o[2]), top = HIGH[o[0] + ',' + o[2]] ?? 0.42; if (d < o[3] * 0.85 && v.y < top) { hit.yard = Math.max(hit.yard, o[3] * 0.85 - d); part.yard = bone(i) + '@' + o[0] + ',' + o[2]; } }
      }
      frames++;
      for (const c in hit) if (hit[c] > 0) { out[c]++; deep[c] = Math.max(deep[c], hit[c]); where[c + ':' + name + '/' + part[c]] = (where[c + ':' + name + '/' + part[c]] || 0) + 1; }
    }
    return { frames, out, deep: Object.fromEntries(Object.entries(deep).map(([k, x]) => [k, +x.toFixed(3)])), where, ended: V.ended, log: V.log.join(',') };
  }, [plot, farmerAt]);
  const bad = Object.values(r.out).reduce((a, b) => a + b, 0); total += bad;
  console.log(`coop ${plot}: ${r.frames} frames at the coop · touching fence ${r.out.fence} (${r.deep.fence} m), house ${r.out.house} (${r.deep.house}), ramp ${r.out.ramp} (${r.deep.ramp}), yard ${r.out.yard} (${r.deep.yard}) · ${JSON.stringify(r.where)} · ${r.ended}${errs.length ? ' ERRORS ' + errs[0] : ''}`);
  await p.close();
}
console.log('frames touching, all coops:', total);
await b.close();

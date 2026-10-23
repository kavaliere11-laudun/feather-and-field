// While a goose shakes (and while she waddles on the spot), how far her planted feet move and tilt: node shakefeet.mjs
// (a foot on the ground should stay put and flat: a few millimetres at most)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 300 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=3&coops=1&lineup=geese');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(() => {
  const f = window.__farm, T = f.THREE, out = {};
  f.pause(true);
  for (const g of f.geeseLineup().geese.filter(o => o.linePose === 'stand')) {
    g.task = (o) => { o.A.shakeGoal = 1; o.A.wagGoal = 1; o.A.wingLiftGoal = 0.8; };
    for (let i = 0; i < 15; i++) f.step(1 / 30, 1);                  // (into the shake)
    const P = { legLf: [], legRf: [] }, tilt = [], rolls = [];
    for (let i = 0; i < 60; i++) {
      f.step(1 / 30, 1); g.root.updateMatrixWorld(true);
      for (const L of ['legLf', 'legRf']) {
        const bn = g.rig.bones[L]; P[L].push(bn.getWorldPosition(new T.Vector3()));
        const up = new T.Vector3(0, 1, 0).applyQuaternion(bn.getWorldQuaternion(new T.Quaternion())); tilt.push(Math.acos(Math.min(1, up.y)) * 180 / Math.PI);
      }
      rolls.push(Math.abs(g.rig.bones.body.rotation.z) * 180 / Math.PI);
    }
    const spread = a => { const b = new T.Box3().setFromPoints(a), s = b.getSize(new T.Vector3()); return +(Math.max(s.x, s.z) * 1000).toFixed(1); };
    out[g.name] = { bodyRollDeg: +Math.max(...rolls).toFixed(1), footMoveMm: [spread(P.legLf), spread(P.legRf)], footTiltDeg: +Math.max(...tilt).toFixed(1) };
  }
  return out;
});
let ok = true;
for (const [k, v] of Object.entries(r)) { const pass = v.bodyRollDeg > 5 && Math.max(...v.footMoveMm) < 4 && v.footTiltDeg < 3; ok = ok && pass; console.log(pass ? 'PASS' : 'FAIL', k, 'shaking:', JSON.stringify(v)); }
console.log(ok ? 'ALL PASS' : 'SOME FAILED', 'errors', errs);
await b.close();

// Biscuit's shake: his body rocks side to side, his feet stay put on the ground (Audrey: "When he shakes, the legs need to
// stay on the floor. Same as the geese"): node dogshake.mjs   (how far each paw moves during a shake, standing and sitting)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&dog&time=10`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(() => {
  const f = window.__farm, D = f.dog(), d = D.dog, T = f.THREE; f.pause(true);
  const [x, z] = D.K(2.6, -0.2); d.pos.set(x, 0, z); d.lastPos = d.pos.clone(); d.heading = 0.5;
  const P = d.q.piv, B = d.q.bones, paws = { FL: ['FLw', P.FLp], FR: ['FRw', P.FRp], HL: ['HLl', P.HLp], HR: ['HRl', P.HRp] };
  const at = () => { d.q.tilt.updateWorldMatrix(true, true); const o = {}; for (const k in paws) { const [bn, pp] = paws[k], pv = P[bn]; o[k] = new T.Vector3(pp[0] - pv[0], pp[1] - pv[1], pp[2] - pv[2]).applyMatrix4(B[bn].matrixWorld); } return o; };
  const out = {};
  for (const [label, sit] of [['standing', 0], ['sitting', 1]]) {
    d.todo = [D.wrap({ name: 'still', t: 0, run(f, dt) { this.t += dt; f.A.sitGoal = sit; return this.t > 2; } })]; d.task = null;
    f.step(1 / 30, 55);
    const base = at(); let worst = {}, roll = 0;
    d.todo = [D.wrap({ name: 'shake', t: 0, run(f, dt) { this.t += dt; f.A.sitGoal = sit; f.A.shakeGoal = 1; f.A.squintGoal = 1; return this.t > 1.2; } })]; d.task = null;
    for (let i = 0; i < 34; i++) { f.step(1 / 30, 1); roll = Math.max(roll, Math.abs(d.q.tilt.rotation.z)); const now = at(); for (const k in now) worst[k] = Math.max(worst[k] || 0, now[k].distanceTo(base[k])); }
    out[label] = { roll: +roll.toFixed(2), moved: Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +(v * 100).toFixed(1)])) };
  }
  return out;
});
console.log(JSON.stringify(r));
// (standing, within a centimetre; sitting, within two: sitting still, breathing, they move half a centimetre)
const ok = r.standing.roll > 0.1 && Object.values(r.standing.moved).every(cm => cm < 1) && Object.values(r.sitting.moved).every(cm => cm < 2) && errs.length === 0;
console.log(ok ? 'PASS' : 'FAIL', 'the body rocks, each paw stays put (standing within 1 cm, sitting within 2)', JSON.stringify(errs));
await b.close();

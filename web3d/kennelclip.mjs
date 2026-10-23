// Biscuit and his kennel: going to bed (in through the door, round inside, lying down), the night, and the morning (up,
// out): his nose, the top of his head, his ear tips, his back and his tail tip never through the kennel's walls or roof
// (anything of him behind the front wall is inside, or in the doorway): node kennelclip.mjs   (OUT: pictures each second)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&dog&time=21`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(() => {
  const f = window.__farm, D = f.dog(), d = D.dog, T = f.THREE, K = { x0: -0.62, x1: 0.62, half: 0.56, wall: 0.68, ridge: 1.12, dw: 0.42, dh: 0.62, floor: 0.065 };
  f.pause(true);
  const P = d.q.piv, B = d.q.bones, S = d.q.S;
  const pts = { nose: ['head', P.nose], headTop: ['head', [P.headc[0], P.headc[1] + 0.075 * S, P.headc[2]]], earL: ['earL', [P.earL[0], P.earL[1] + 0.085 * S, P.earL[2]]],
    earR: ['earR', [P.earR[0], P.earR[1] + 0.085 * S, P.earR[2]]], back: ['chest', [P.chest[0], P.chest[1] + 0.12 * S, P.chest[2]]], rump: ['hips', [P.hips[0], P.hips[1] + 0.11 * S, P.hips[2]]], tail: ['tail4', P.tailtip] };
  const roofIn = z => K.wall + (K.ridge - 0.07 - K.wall) * (1 - Math.abs(z) / K.half) - 0.035;
  // (inside: within the walls' inner faces, a little short of the 4 cm boards so nothing shows through them)
  const inside = q => q.x > K.x0 + 0.025 && q.x < K.x1 - 0.025 && Math.abs(q.z) < K.half - 0.025 && q.y > K.floor - 0.01 && q.y < roofIn(q.z);
  const doorway = q => q.x > K.x1 - 0.07 && Math.abs(q.z) < K.dw / 2 && q.y < K.dh;
  const near = q => q.x > K.x0 - 0.05 && q.x < K.x1 + 0.05 && Math.abs(q.z) < K.half + 0.05;
  const bad = {}, worst = {}, log = []; let frames = 0, inFrames = 0;
  const v = new T.Vector3(), w = new T.Vector3();
  const check = (label) => {
    d.q.tilt.updateWorldMatrix(true, true);
    const [rx, rz] = D.local(d.pos.x, d.pos.z), rootIn = rx < K.x1 && Math.abs(rz) < K.half;
    if (rootIn) inFrames++;
    for (const k in pts) {
      const [bn, pp] = pts[k], pv = P[bn];
      v.set(pp[0] - pv[0], pp[1] - pv[1], pp[2] - pv[2]).applyMatrix4(B[bn].matrixWorld);
      const [lx, lz] = D.local(v.x, v.z), q = { x: lx, y: v.y, z: lz };
      let ok;
      if (q.y < K.floor) ok = true;                          // (under the kennel's floor: hidden in its base, or in the ground)
      else if (rootIn) ok = inside(q) || doorway(q) || (q.x > K.x1 && Math.abs(q.z) < K.dw / 2 + 0.03 && q.y < K.dh + 0.03);
      else ok = !near(q) || q.x > K.x1 + 0.02 || doorway(q) || inside(q) || q.y > roofIn(q.z) + 0.5;
      if (!ok) { bad[k] = (bad[k] || 0) + 1; const key = label + ':' + k; if (!worst[key]) { worst[key] = 1; log.push([label, k, +q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2)]); } }
    }
  };
  // bedtime: from by his door at 21:00 to asleep
  f.setHour(21.6);
  for (let i = 0; i < 30 * 50; i++) { f.step(1 / 30, 1); frames++; check(d.task ? (d.task.cur ? (d.task.cur().cur ? d.task.cur().cur() : d.task.cur()).name : d.task.name) : ''); }
  const asleep = D.asleep;
  // the morning
  f.setHour(6.5);
  for (let i = 0; i < 30 * 20; i++) { f.step(1 / 30, 1); frames++; check('m:' + (d.task ? (d.task.cur ? (d.task.cur().cur ? d.task.cur().cur() : d.task.cur()).name : d.task.name) : '')); }
  return { frames, inFrames, bad, log, asleep, out: !D.asleep };
});
console.log(JSON.stringify(r));
const ok = Object.keys(r.bad).length === 0 && r.asleep && r.out && errs.length === 0;
console.log(ok ? 'PASS' : 'FAIL', 'never through his kennel, asleep in it, out in the morning', JSON.stringify([r.bad, r.asleep, r.out, errs]));
await b.close();

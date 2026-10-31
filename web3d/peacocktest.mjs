// The peacock in his pen (31 Oct): his train never through the fence, the house, what's in the yard or the others, in every
// look of the Garden Pavilion, by day; showing off his fan; at bedtime up onto his perch, his train hanging down, and in the
// morning down again; boxed in, a flutter over now and then (`flights`, counted). ./withserver.sh node peacocktest.mjs
// (SECS=120: how long by day; LOOKS=0,2,4)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
let bad = 0;
const fail = m => { bad++; console.log('FAIL', m); };
const LOOKS = (process.env.LOOKS || '0,1,2,3,4').split(',').map(Number), SECS = +(process.env.SECS || 120);
for (const t of LOOKS) {
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coopbreeds=pea&looks=${t}&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  const r = await p.evaluate(secs => {
    const f = window.__farm; f.pause(true);
    const plots = f.coopPlots().filter(q => q.breed === 'pea'); let frames = 0, unsettled = 0, unclear = 0, flights = 0, worst = [], displays = 0, fanned = 0, onTrainHen = 0, henFrames = 0;
    for (let i = 0; i < secs * 30; i++) {
      f.step(1 / 30, 1);
      for (const P of plots) for (const B of P.birds) {
        if (!B.train) { if (B.root.visible && !B.asleep) henFrames++; for (const C of P.birds) if (C.train && C.onTrain(B.root.position.x, B.root.position.z) && !B.laying && !B.roost && !B.play) onTrainHen++; continue; }
        if (B.roost || B.asleep) continue;
        if (!B.trainSettled) { unsettled++; continue; }      // (a pen out of view isn't brought to life yet: he's put down in his yard once it is)
        frames++;
        const q = B.root.position;
        if (B.flight && !B.wasFlying) flights++; B.wasFlying = !!B.flight;
        if (B.A.fan < 0.3 && !(B.flight && B.root.position.y > 0.1) && !B.trainClear(q.x, q.z, B.trainY, false, B.root.rotation.y)) { unclear++; if (worst.length < 4) worst.push([+q.x.toFixed(2), +q.z.toFixed(2), +B.root.rotation.y.toFixed(2), B.act && B.act.type]); }
        if (B.act && B.act.type === 'display' && !B.act.counted) { B.act.counted = true; displays++; }
        if (B.A.fan > 0.95) fanned++;
      }
    }
    return { frames, unsettled, unclear, flights, worst, displays, fanned, onTrainHen, henFrames, peacocks: plots.map(P => P.birds.filter(B => B.train).length) };
  }, SECS);
  console.log('look', t, JSON.stringify(r));
  if (!r.peacocks.some(n => n > 0)) fail('look ' + t + ': no peacock');
  if (r.unclear > r.frames * 0.005) fail('look ' + t + ': his train through something in ' + r.unclear + ' of ' + r.frames + ' frames');
  if (r.onTrainHen > r.henFrames * 0.02) fail('look ' + t + ': a hen on his train ' + r.onTrainHen + ' of ' + r.henFrames);
  if (!r.displays) fail('look ' + t + ': he never showed off his fan');
}
// bedtime and the morning (the Snug)
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coopbreeds=pea&looks=2&time=22:44`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
const n = await p.evaluate(() => {
  const f = window.__farm; f.pause(true); const P = f.coopPlots().find(q => q.breed === 'pea'), B = P.birds.find(b => b.train), out = [];
  for (let i = 0; i < 30 * 10; i++) f.step(1 / 30, 1);
  f.setHour(22.8);
  for (let i = 0; i < 30 * 150 && !B.perched; i++) f.step(1 / 30, 1);
  out.push({ perched: !!B.perched, pos: B.root.position.toArray().map(v => +v.toFixed(2)), hang: +B.A.hang.toFixed(2), visible: B.root.visible, shut: !!B.rig.shut, yaw: +B.root.rotation.y.toFixed(2) });
  return out;
});
console.log('night', JSON.stringify(n));
if (!n[0].perched || n[0].pos[1] < 1.0 || !n[0].visible || n[0].hang < 0.9) fail('he should be up on his perch, his train hanging down');
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coopbreeds=pea&looks=2&time=5:59`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
const m = await p.evaluate(() => {
  const f = window.__farm; f.pause(true); const P = f.coopPlots().find(q => q.breed === 'pea'), B = P.birds.find(b => b.train);
  const first = { perched: !!B.perched, y: +B.root.position.y.toFixed(2) };
  f.setHour(6.05);
  let fanUp = 0;
  for (let i = 0; i < 30 * 100; i++) { f.step(1 / 30, 1); if (B.A.fan > 0.9) fanUp++; }
  return { first, perched: !!B.perched, roost: !!B.roost, y: +B.root.position.y.toFixed(3), hang: +B.A.hang.toFixed(2), fanUp };
});
console.log('morning', JSON.stringify(m));
if (!m.first.perched) fail('at 5:59 he should be on his perch');
if (m.perched || m.roost || m.y > 0.05 || m.hang > 0.1) fail('in the morning he should be down in the yard');
console.log('errors', errs.slice(0, 5));
if (errs.length) fail('page errors');
console.log(bad ? 'FAILED ' + bad : 'PASSED');
await b.close(); process.exit(bad ? 1 : 0);

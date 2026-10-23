// The geese at bedtime and in the morning: node geesenight.mjs
// Evening (21:00) about the pond; at 21:36 they go to bed (swimming over if their bed's across a stream) and sleep side by
// side, heads tucked; at 6:30 they get up with a stretch and a honk and go about their day.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 300 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&geese&time=21`);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(() => {
  const f = window.__farm, F = f.geese(), [G, H] = F.geese, out = {};
  f.pause(true); f.setHour(21); f.step(1 / 30, 30 * 90);
  f.setHour(21.6);
  let t = 0; while (!(G.asleep && H.asleep) && t < 30 * 300) { f.step(1 / 30, 30); t += 30; }
  out.bedSecs = t / 30; out.asleep = [!!G.asleep, !!H.asleep];
  out.atBed = F.geese.map((g, i) => +Math.hypot(g.pos.x - F.bed[i][0], g.pos.z - F.bed[i][1]).toFixed(2));
  f.step(1 / 30, 30 * 30); out.tucked = F.geese.map(g => +(g.A.tuck || 0).toFixed(2));
  f.setHour(6.5); const acts = new Set();
  for (let k = 0; k < 30 * 25; k++) { f.step(1 / 30, 1); acts.add(G.act); acts.add('H:' + H.act); }
  out.morning = [...acts]; out.awake = [!G.asleep, !H.asleep];
  return out;
});
console.log(JSON.stringify(r));
const checks = [['no page errors', errs.length === 0, errs], ['in bed within 5 minutes of bedtime', r.asleep[0] && r.asleep[1], [r.bedSecs, r.asleep]],
  ['side by side in their bed', r.atBed.every(d => d < 0.2), r.atBed], ['heads tucked in', r.tucked.every(v => v > 0.8), r.tucked],
  ['up in the morning with a stretch and a honk', r.awake[0] && r.awake[1] && r.morning.includes('stretch') && r.morning.includes('honk'), r.morning]];
for (const [n, ok, v] of checks) console.log(ok ? 'PASS' : 'FAIL', n, '·', JSON.stringify(v));
await b.close();

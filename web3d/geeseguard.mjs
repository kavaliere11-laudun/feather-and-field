// The geese guarding the farm at night: Rusty visits coop N (?visit=N); the geese hear him, honk the alarm, charge and
// chase him home, then go back to bed. node geeseguard.mjs [coops, e.g. 8,3,0]
// Checks for each: no page errors; the geese woke; Rusty went home chased by the geese (or had already gone); on their
// way they never go into anything (the village grid; the footbridges' decks allowed) and never into Rusty; asleep again
// in their bed within 2 minutes after.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const list = (process.argv[2] || '8,3,0').split(',').map(Number);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let all = true;
for (const n of list) {
  const p = await b.newPage({ viewport: { width: 300, height: 300 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&visit=${n}&geese`);
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  const r = await p.evaluate(() => {
    const f = window.__farm, F = f.geese(), V = f.visit(), nav = f.nav(), [G, H] = F.geese;
    f.pause(true); V.again = () => 1e9;          // (just the one visit)
    let woke = false, wokeAt = null, blocked = 0, margin = 0, closest = 9, t = 0, ended = null, chaseSecs = 0, bl = [];
    while (t < 30 * 300) {
      f.step(1 / 30, 1); t++;
      if (F.guarding && !woke) { woke = true; wokeAt = +(t / 30).toFixed(1); }
      if (F.guarding) chaseSecs += 1 / 30;
      for (const g of F.geese) {
        const [s] = F.pondAt(g.pos.x, g.pos.z);
        // on a blocked cell (the grid's cells are grown by a fox's half width round everything, more round the pens): just
        // brushing that margin (free ground within 0.2 m) is counted apart; well inside it is a goose in something
        if (s > 1.3 && !nav.freeAt(g.pos.x, g.pos.z) && !f.onBridge(g.pos.x, g.pos.z) && !F.bed.some(q => Math.hypot(q[0] - g.pos.x, q[1] - g.pos.z) < 0.56)) {
          let edge = false; for (let k = 0; k < 8; k++) if (nav.freeAt(g.pos.x + Math.cos(k * 0.785) * 0.2, g.pos.z + Math.sin(k * 0.785) * 0.2)) edge = true;
          if (edge) margin++; else { blocked++; if (bl.length < 5) bl.push([g.name, g.act, +g.pos.x.toFixed(2), +g.pos.z.toFixed(2)]); }
        }
        if (V.fox.root.visible) closest = Math.min(closest, Math.hypot(V.fox.pos.x - g.pos.x, V.fox.pos.z - g.pos.z));
      }
      if (V.ended && !ended) ended = V.ended;
      if (ended && !F.guarding && G.asleep && H.asleep) break;
    }
    return { ended, woke, wokeAt, chaseSecs: +chaseSecs.toFixed(0), blocked, margin, bl, closest: +closest.toFixed(2), backAsleep: G.asleep && H.asleep, secs: +(t / 30).toFixed(0), log: V.log.slice(-6) };
  });
  const checks = [['no page errors', errs.length === 0, errs.slice(0, 2)], ['the geese woke', r.woke, r.wokeAt], ['Rusty went home', !!r.ended, r.ended],
    ['never into anything (and brushing the margin round things under 3 s)', r.blocked === 0 && r.margin < 90, [r.blocked, r.margin, r.bl]], ['never into Rusty', r.closest > 0.55, r.closest], ['asleep in bed again after', r.backAsleep, r.secs]];
  console.log(`coop ${n}:`, JSON.stringify({ ended: r.ended, woke: r.wokeAt, chase: r.chaseSecs, log: r.log }));
  for (const [nm, ok, v] of checks) { all = all && ok; console.log(ok ? 'PASS' : 'FAIL', nm, '·', JSON.stringify(v)); }
  await p.close();
}
console.log(all ? 'ALL PASS' : 'SOME FAILED');
await b.close();

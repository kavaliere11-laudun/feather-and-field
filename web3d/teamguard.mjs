// The team effort at night (Audrey, 23 Oct): Rusty visits coop N (?visit=N); the geese hear him and honk; Biscuit wakes,
// barks and chases Rusty home with the geese charging behind; then back to the geese, the parade together, and everyone
// back to bed. node teamguard.mjs [coops, e.g. 8,3,0]   (NOGEESE=1: Biscuit alone, ?nogeese)
// Checks for each: no page errors; the geese and Biscuit both out; Rusty went home seen off by them ("team"); Biscuit never
// into anything (outside his own kennel and bowls; the footbridges' decks allowed), never into Rusty, never through a
// goose; the parade with Biscuit; everyone asleep again after (the geese in their bed, Biscuit in his kennel).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const list = (process.argv[2] || '8,3,0').split(',').map(Number);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let all = true;
for (const n of list) {
  const p = await b.newPage({ viewport: { width: 300, height: 300 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const solo = !!process.env.NOGEESE;                // (Biscuit alone, as on a farm without geese)
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&visit=${n}` + (process.env.LANG === 'fr' ? '&lang=fr' : '') + (solo ? '&nogeese' : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  const r = await p.evaluate(() => {
    const f = window.__farm, F = f.geese(), V = f.visit(), nav = f.nav(), D = f.dog(), d = D.dog, [G, H] = F.geese;
    f.pause(true); V.again = () => 1e9;
    const hints = [], hintEl = document.getElementById('hint'); let lastHint = '';
    let geeseOut = false, dogOut = null, blocked = 0, bl = [], closest = 9, gooseClose = 9, t = 0, ended = null, stages = new Set(), parade = false, maxBehind = 0, gStages = new Set(), paradeAt = null, paradeSeen = null;
    while (t < 30 * 360) {
      f.step(1 / 30, 1); t++;
      if (F.guarding) geeseOut = true;
      if (F.guarding && G.task && G.task.stage) { gStages.add(G.task.stage); if (G.task.stage === 'victory' && !paradeAt) { paradeAt = [+G.pos.x.toFixed(1), +G.pos.z.toFixed(1)]; paradeSeen = F.inView(G.pos.x, G.pos.z); } }
      if (D.guard && dogOut === null) dogOut = +(t / 30).toFixed(1);
      if (D.guard) { stages.add(D.guard.stage); if (D.guard.stage === 'parade' && G.task && /^(lap|tada)$/.test(G.task.stage)) parade = true; }
      const [lx, lz] = D.local(d.pos.x, d.pos.z), home = lx > -0.85 && lx < 1.55 && Math.abs(lz) < 1.15;
      if (!home && !nav.freeAt(d.pos.x, d.pos.z) && !f.onBridge(d.pos.x, d.pos.z)) {
        let edge = false; for (let k = 0; k < 8; k++) if (nav.freeAt(d.pos.x + Math.cos(k * 0.785) * 0.2, d.pos.z + Math.sin(k * 0.785) * 0.2)) edge = true;
        if (!edge) { blocked++; if (bl.length < 5) bl.push([D.guard && D.guard.stage, +d.pos.x.toFixed(2), +d.pos.z.toFixed(2)]); }
      }
      if (V.fox.root.visible) closest = Math.min(closest, Math.hypot(V.fox.pos.x - d.pos.x, V.fox.pos.z - d.pos.z));
      for (const g of F.geese) gooseClose = Math.min(gooseClose, Math.hypot(g.pos.x - d.pos.x, g.pos.z - d.pos.z));
      if (hintEl.textContent !== lastHint) { lastHint = hintEl.textContent; hints.push(lastHint); }
      if (V.ended && !ended) ended = V.ended;
      if (ended && !F.guarding && !D.guard && G.asleep && H.asleep && D.asleep && t > 30 * 5) break;
    }
    const [lx, lz] = D.local(d.pos.x, d.pos.z);
    return { ended, geeseOut, dogOut, stages: [...stages], gStages: [...gStages], paradeAt, paradeSeen, parade, blocked, bl, closest: +closest.toFixed(2), gooseClose: +gooseClose.toFixed(2),
      geeseAsleep: G.asleep && H.asleep, dogAsleep: D.asleep && lx > -0.62 && lx < 0.62 && Math.abs(lz) < 0.56, secs: +(t / 30).toFixed(0), hints, log: V.log.slice(-6) };
  });
  const checks = solo ? [['no page errors', errs.length === 0, errs.slice(0, 2)], ['Biscuit out (the geese asleep)', !r.geeseOut && r.dogOut !== null, [r.geeseOut, r.dogOut]],
    ['Rusty went home, seen off by Biscuit', r.ended === 'dog', r.ended], ['Biscuit never into anything', r.blocked === 0, [r.blocked, r.bl]],
    ['never into Rusty (0.9 m)', r.closest > 0.9, r.closest], ['everyone asleep again after', r.geeseAsleep && r.dogAsleep, [r.geeseAsleep, r.dogAsleep, r.secs]]]
  : [['no page errors', errs.length === 0, errs.slice(0, 2)], ['the geese and Biscuit both out', r.geeseOut && r.dogOut !== null, [r.geeseOut, r.dogOut]],
    ['Rusty went home, seen off by them all', r.ended === 'team', r.ended], ['Biscuit never into anything', r.blocked === 0, [r.blocked, r.bl]],
    ['never into Rusty (0.9 m)', r.closest > 0.9, r.closest], ['never through a goose (0.45 m)', r.gooseClose > 0.45, r.gooseClose],
    ['the parade together', r.parade, r.stages], ['the parade in full view', r.paradeSeen === true, [r.paradeAt, r.gStages]], ['everyone asleep again after', r.geeseAsleep && r.dogAsleep, [r.geeseAsleep, r.dogAsleep, r.secs]]];
  console.log(`coop ${n}:`, JSON.stringify({ ended: r.ended, dogOut: r.dogOut, stages: r.stages, secs: r.secs, hints: r.hints, log: r.log }));
  for (const [nm, ok, v] of checks) { all = all && ok; console.log(ok ? 'PASS' : 'FAIL', nm, '·', JSON.stringify(v)); }
  await p.close();
}
console.log(all ? 'ALL PASS' : 'SOME FAILED');
await b.close();

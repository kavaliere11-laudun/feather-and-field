// The geese on the farm: run the day at speed and report what they did, where, and anything wrong: node geeseday.mjs
// [minutes] [hour]   Checks: no page errors; never through an obstacle (the village grid's blocked cells, outside the
// pond), never on a footbridge or in a stream; never into the dock; Hector never more than a few metres from Gertrude for
// long and never through her; they swim, graze, preen; asleep side by side at night. (OUT=pic.png: a picture at the end)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [mins = '6', hour = '10'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if ((m.type() === 'warning' || m.type() === 'error') && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&geese&time=${hour}`);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(async (mins) => {
  const f = window.__farm, F = f.geese(), nav = f.nav(), [G, H] = F.geese, acts = {}, hacts = {};
  f.pause(true);
  const moments = {}; let lastG = '', lastH = '';
  let blocked = 0, far = 0, farMax = 0, close = 0, dockHits = 0, frames = 0, wetFrames = 0, closest = 9;
  const N = Math.round(mins * 60 * 30);
  for (let i = 0; i < N; i++) {
    f.step(1 / 30, 1); frames++;
    for (const g of F.geese) {
      const [s] = F.pondAt(g.pos.x, g.pos.z);
      // on a blocked cell of the village grid, other than the pond itself (as the grid marks it: its ellipse grown 0.35 m)
      // or her own bed spot (marked for the fox)
      const dx = g.pos.x - F.pc[0], dz = g.pos.z - F.pc[1], lu = Math.sqrt(F.lu2) + 0.55, lv = Math.sqrt(F.lv2) + 0.55;      // (+0.2: a cell's half)
      const inPond = ((dx * F.pu[0] + dz * F.pu[1]) / Math.sqrt(F.lu2) / lu) ** 2 + ((dx * F.pv[0] + dz * F.pv[1]) / Math.sqrt(F.lv2) / lv) ** 2 <= 1;
      if (!inPond && !nav.freeAt(g.pos.x, g.pos.z) && !F.bed.some(b => Math.hypot(b[0] - g.pos.x, b[1] - g.pos.z) < 0.56)) { blocked++; if (!window.__bl) window.__bl = []; if (window.__bl.length < 8) window.__bl.push([g.name, g.act, +g.pos.x.toFixed(2), +g.pos.z.toFixed(2)]); }
      if (!F.clearWater(g.pos.x, g.pos.z, -0.15)) dockHits++;
      if (g.wet > 0.5) wetFrames++;
    }
    const tg = G.task ? G.task.name : '', th = H.task ? H.task.name : '';
    if (tg !== lastG) { moments[tg] = (moments[tg] || 0) + 1; lastG = tg; } if (th !== lastH) { moments['H:' + th] = (moments['H:' + th] || 0) + 1; lastH = th; }
    acts[G.act] = (acts[G.act] || 0) + 1; hacts[H.act] = (hacts[H.act] || 0) + 1;
    const d = Math.hypot(G.pos.x - H.pos.x, G.pos.z - H.pos.z); farMax = Math.max(farMax, d);
    // the bodies' closest approach (breast and rump circles, as the flock keeps them apart)
    let bd = 9; for (const a of [0.14, -0.13]) for (const c of [0.14, -0.13]) bd = Math.min(bd, Math.hypot(G.pos.x + Math.sin(G.heading) * a - H.pos.x - Math.sin(H.heading) * c, G.pos.z + Math.cos(G.heading) * a - H.pos.z - Math.cos(H.heading) * c));
    closest = Math.min(closest, bd);
    if (d > 5) far++; if (bd < 0.28) close++;
  }
  const pct = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v / frames * 100)]));
  return { frames, blocked, dockHits, wetPct: Math.round(wetFrames / frames / 2 * 100), farFrames: far, farMax: +farMax.toFixed(2), closest: +closest.toFixed(2), close,
    gertrude: pct(acts), hector: pct(hacts), moments, blockedAt: window.__bl || [], bed: F.bed.map(b => b.map(v => +v.toFixed(2))), at: [G.pos.x.toFixed(2), G.pos.z.toFixed(2)], asleep: [!!G.asleep, !!H.asleep], ways: F.ways.length, spots: F.spots.length };
}, +mins);
console.log(JSON.stringify(r));
const night = +hour >= 21.5 || +hour < 6.25;
const checks = [['no page errors', errs.length === 0, errs.slice(0, 3)], ['never into anything', r.blocked === 0, r.blocked], ['never into the dock', r.dockHits === 0, r.dockHits],
  ['Hector stays near (never over 5 m for more than 20 s)', r.farFrames < 600, r.farFrames], ['never through each other (bodies at least 0.28 m apart)', r.close === 0, [r.closest, r.close]]];
if (night) checks.push(['asleep side by side', r.asleep[0] && r.asleep[1], r.asleep]);
else if (+mins >= 6) checks.push(['a varied day (swims and grazes)', r.wetPct > 2 && (r.gertrude.graze || 0) > 3, [r.wetPct, r.gertrude.graze]]);
for (const [n, ok, v] of checks) console.log(ok ? 'PASS' : 'FAIL', n, '·', JSON.stringify(v));
if (process.env.OUT) {
  await p.evaluate(() => { const f = window.__farm, c = f.geese().centre(new f.THREE.Vector3()); f.lookAt(c.x + 0.3, c.z + 0.3, 2.4); f.draw(); });
  await p.screenshot({ path: process.env.OUT, timeout: 120000 });
}
await b.close();

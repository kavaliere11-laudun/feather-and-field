// Biscuit's day on the farm: run it at speed from an hour and report what he did and anything wrong: node dogday.mjs
// [minutes] [hour]   Checks: no page errors; never into anything (the village grid's blocked cells, except his own kennel
// and on the footbridges' decks), never through a goose; his ball never into anything and never far from home; several
// different things done in a day; asleep in his kennel at night, out of it by day. (OUT=pic.png: a picture of him at the end;
// HOUR2=6.5 AT=20: the clock set to 6:30 20 s in, for the morning)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [mins = '6', hour = '10'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if ((m.type() === 'warning' || m.type() === 'error') && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&dog&time=${hour}` + (process.env.QS ? '&' + process.env.QS : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(async ([mins, at, hour2]) => {
  const f = window.__farm, D = f.dog(), d = D.dog, nav = f.nav(), F = f.geese();
  f.pause(true);
  const did = {}, tasks = {}; let blocked = 0, gooseClose = 0, closest = 9, ballBad = 0, ballFar = 0, frames = 0, last = '', lastT = '';
  const bl = [];
  const N = Math.round(mins * 60 * 30);
  for (let i = 0; i < N; i++) {
    if (at >= 0 && i === Math.round(at * 30)) f.setHour(hour2);
    f.step(1 / 30, 1); frames++;
    const [lx, lz] = D.local(d.pos.x, d.pos.z), inKennel = lx > -0.85 && lx < 1.55 && Math.abs(lz) < 1.15;     // (his home: his kennel, its doorstep, his bowls)
    if (!inKennel && !nav.freeAt(d.pos.x, d.pos.z) && !f.onBridge(d.pos.x, d.pos.z)) { blocked++; if (bl.length < 8) bl.push([D.doing, d.task && d.task.name, +d.pos.x.toFixed(2), +d.pos.z.toFixed(2)]); }
    if (F) for (const g of F.geese) { const dd = Math.hypot(g.pos.x - d.pos.x, g.pos.z - d.pos.z); closest = Math.min(closest, dd); if (dd < 0.45) gooseClose++; }
    const B = D.ball, bp = B.mesh.getWorldPosition(new f.THREE.Vector3());
    if (B.state !== 'mouth' && !nav.freeAt(bp.x, bp.z)) { const [bx, bz] = D.local(bp.x, bp.z); if (!(bx > -0.85 && bx < 1.55 && Math.abs(bz) < 1.15)) ballBad++; }
    if (Math.hypot(bp.x - D.k.x, bp.z - D.k.z) > 12) ballFar++;
    const doing = D.asleep ? 'asleep' : D.doing || '';
    if (doing !== last) { did[doing] = (did[doing] || 0) + 1; last = doing; }
    const tn = d.task ? (d.task.cur ? (d.task.cur().cur ? d.task.cur().cur() : d.task.cur()).name : d.task.name) : '';
    if (tn !== lastT) { tasks[tn] = (tasks[tn] || 0) + 1; lastT = tn; }
  }
  const [lx, lz] = D.local(d.pos.x, d.pos.z);
  return { frames, blocked, blockedAt: bl, gooseClose, closest: +closest.toFixed(2), ballBad, ballFar, did, tasks, asleep: D.asleep, inKennel: lx > -0.62 && lx < 0.62 && Math.abs(lz) < 0.5,
    at: [+d.pos.x.toFixed(2), +d.pos.z.toFixed(2)], teased: F ? F.teased || 0 : 0, spots: [D.spotsOf().coops.length, D.spotsOf().farm.length] };
}, [+mins, +(process.env.AT || -1), +(process.env.HOUR2 || 0)]);
console.log(JSON.stringify(r));
const H = process.env.HOUR2 ? +process.env.HOUR2 : +hour + +mins / 60, night = h => h % 24 >= 21.5 || h % 24 < 6.25;
const checks = [['no page errors', errs.length === 0, errs.slice(0, 3)], ['never into anything', r.blocked === 0, [r.blocked, r.blockedAt]],
  ['never through a goose (0.45 m)', r.gooseClose === 0, [r.closest, r.gooseClose]], ['his ball never into anything or far from home', r.ballBad === 0 && r.ballFar === 0, [r.ballBad, r.ballFar]]];
if (night(H)) checks.push(['asleep in his kennel', r.asleep && r.inKennel, [r.asleep, r.inKennel, r.at]]);
else checks.push(['up and about', !r.asleep && !r.inKennel, [r.asleep, r.inKennel]]);
if (!night(+hour) && !night(H) && +mins >= 8) checks.push(['a varied day (3 or more different things)', Object.keys(r.did).filter(k => k).length >= 3, r.did]);
for (const [n, ok, v] of checks) console.log(ok ? 'PASS' : 'FAIL', n, '·', JSON.stringify(v));
if (process.env.OUT) {
  await p.evaluate(() => { const f = window.__farm, c = f.dog().centre(new f.THREE.Vector3()); f.lookAt(c.x + 0.3, c.z + 0.3, 2.4); f.draw(); });
  await p.screenshot({ path: process.env.OUT, timeout: 120000 });
}
await b.close();

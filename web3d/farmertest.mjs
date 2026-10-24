// The farmer on the farm (farmlife.js): node farmertest.mjs [day minutes]   (LANG=fr for French, LOOK=f for Rosie)
// By day (every tenth of a second): never in anything (pens, coops, the farmhouse, bushes, the pond), only on the grid's
// free ground or crossing a footbridge; never through a goose, a duck or Biscuit; keeping to the paths most of the way;
// never stuck; a way to every place the farmer goes; all the farmer does happens (a coop, the pond, a corner, the porch, a wave and "Hello, girls!"). Bedtime:
// "Goodnight, girls!" and in through the farmhouse door; indoors all night; the morning: out with "Good morning, girls!".
// A night visit: sent out after Rusty, out of the door with the torch lit, running to him, "Shoo!", Rusty runs home, the
// farmer walks back and goes in. A tap on the farmer (a real tap on the screen): the label, a wave and "Hello!". No page
// errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const mins = +(process.argv[2] || 10), fr = process.env.LANG === 'fr', look = process.env.LOOK === 'f' ? 'f' : 'm';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function page(extra) {
  const p = await b.newPage({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&farmer${look === 'f' ? '=f' : ''}${fr ? '&lang=fr' : ''}${extra || ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  await p.evaluate(() => {
    const f = window.__farm, L = f.farmer(), nav = f.nav(), G = f.geese(), D = f.ducks(), dog = f.dog();
    const S = window.__S = { n: 0, inside: [], close: 9, closeWho: null, path: 0, moving: 0, stuck: 0, stuckAt: null, tasks: {}, said: [] };
    const say = L.say.bind(L); L.say = (k, s) => { S.said.push(k); say(k, s); };
    let last = null, still = 0;
    window.__check = () => {
      S.n++;
      if (L.home) { last = null; return; }
      const p = L.pos, x = p.x, z = p.z;
      S.tasks[L.task ? L.task.name : L.running ? 'torch' : '-'] = 1;
      if (!nav.freeAt(x, z) && !f.onBridge(x, z) && Math.hypot(x - L.o.door[0], z - L.o.door[1]) > 0.3) S.inside.push([x.toFixed(2), z.toFixed(2), L.task && L.task.name]);
      for (const o of [...G.geese, ...D.ducks.filter(d => d.wet < 0.3), ...(dog && dog.group.visible ? [dog.dog] : [])]) {
        const d = Math.hypot(o.pos.x - x, o.pos.z - z); if (d < S.close) { S.close = d; S.closeWho = [o.name || 'Biscuit', L.task && L.task.name, o.task && o.task.name, +(o.wet || 0).toFixed(2), x.toFixed(1), z.toFixed(1)]; }
      }
      if (last) {
        const mv = Math.hypot(x - last[0], z - last[1]);
        if (mv > 0.03) { S.moving++; if (nav.costAt(x, z) <= 1) S.path++; }
        const going = L.task && L.task.list && L.task.list[L.task.i] && L.task.list[L.task.i].name === 'path';
        still = going && mv < 0.005 ? still + 0.1 : 0;
        if (still > S.stuck) { S.stuck = still; S.stuckAt = [x.toFixed(2), z.toFixed(2)]; }
      }
      last = [x, z];
    };
    window.__run = (secs) => { for (let i = 0; i < secs * 10; i++) { f.step(1 / 30, 3); window.__check(); } };
    // every place the farmer goes (in front of each coop, the farm's corners, the pond's bank, Biscuit's kennel): a way there
    const DR = L.o.door, ox = DR[0] + Math.sin(DR[2]) * 0.9, oz = DR[1] + Math.cos(DR[2]) * 0.9, sp = L.o.spots();
    S.spots = 0; S.noWay = [];
    for (const [kind, list] of [['coop', sp.coops], ['corner', sp.farm], ['pond', L.o.pond()], ['kennel', L.o.kennel ? [L.o.kennel] : []]])
      for (const q of list) { S.spots++; if (!nav.find(ox, oz, q[0], q[1], true)) S.noWay.push([kind, +q[0].toFixed(1), +q[1].toFixed(1)]); }
    S.coops = sp.coops.length;
  });
  return p;
}
// ---- by day, then bedtime, the night, the morning
const p = await page();
const day = await p.evaluate((mins) => {
  const f = window.__farm, L = f.farmer(); f.pause(true); f.setHour(14);
  window.__run(mins * 60);
  const S = window.__S, out = { S: Object.assign({}, S, { inside: S.inside.slice(0, 4) }) };
  f.setHour(22.7); let homeT = null;
  for (let i = 0; i < 1200 && homeT === null; i++) { window.__run(0.1); if (L.home) homeT = i / 10; }
  out.homeT = homeT; out.nightSaid = S.said.slice(-3); out.hidden = !L.f.rig.mesh.visible;
  window.__run(60); out.stillHome = L.home;
  f.setHour(6.6); let outT = null;
  for (let i = 0; i < 600 && outT === null; i++) { window.__run(0.1); if (!L.home && L.f.opacity > 0.99) outT = i / 10; }
  window.__run(8); out.outT = outT; out.morningSaid = S.said.slice(-3);
  return out;
}, mins);
// ---- a tap on the farmer, through the screen
const pick = await p.evaluate(() => {
  const f = window.__farm, L = f.farmer(); f.setHour(14);
  for (let i = 0; i < 300 && (L.home || (L.task && /^(out|home|tapped)$/.test(L.task.name))); i++) window.__run(0.2);
  f.lookAt(L.pos.x + 0.2, L.pos.z + 0.2, 2.2); f.draw(); window.__q0 = window.__S.said.length;
  const v = L.pos.clone(); v.y += L.f.hitY; v.project(f.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
});
await p.touchscreen.tap(pick.x, pick.y);
const tapped = await p.evaluate(() => { const f = window.__farm, L = f.farmer(); window.__run(1.5); return { task: L.task && L.task.name, said: window.__S.said.slice(window.__q0), bubble: L.bubble.visible, tag: document.getElementById('tag').textContent }; });
const errs1 = p.errs.slice(); await p.close();
// ---- a night visit: sent out after Rusty
const q = await page('&visit=3&noguard');
const visit = await q.evaluate(() => {
  const f = window.__farm, L = f.farmer(), V = f.visit(); f.pause(true); f.setHour(23.5);
  const out = { homeAtFirst: L.home };
  for (let i = 0; i < 600 && !V.canSend(); i++) window.__run(0.1);
  const door = L.o.door; out.sent = V.sendFarmer();
  window.__run(0.3); out.outAt = [L.pos.x - door[0], L.pos.z - door[1]].map(v => +v.toFixed(2)); out.torch = L.want.props.torch && V.torch.on > 0.05;
  let shoo = null, closest = 99, gone = null, back = null;
  for (let i = 0; i < 1500; i++) {
    window.__run(0.1);
    if (V.farmer && V.fox.root.visible) closest = Math.min(closest, Math.hypot(V.fox.pos.x - L.pos.x, V.fox.pos.z - L.pos.z));
    if (shoo === null && V.state === 'fleeing') shoo = i / 10;
    if (gone === null && V.state === 'idle' && shoo !== null) gone = i / 10;
    if (back === null && L.home) { back = i / 10; break; }
  }
  Object.assign(out, { shoo, closest: +closest.toFixed(2), foxHome: gone, farmerIn: back, ended: V.ended, said: window.__S.said.slice(-3), inside: window.__S.inside.slice(0, 3), close: +window.__S.close.toFixed(2) });
  return out;
});
const errs = [...errs1, ...q.errs];
const S = day.S, role = { m: fr ? 'fermier' : 'farmer', f: fr ? 'fermière' : 'farmer' }[look], name = { m: 'Arthur', f: fr ? 'Rose' : 'Rosie' }[look];
const checks = [
  ['no page errors', errs.length === 0, errs.slice(0, 3)],
  ['a way to every place the farmer goes (each coop, the corners, the pond, the kennel)', S.noWay.length === 0 && S.coops >= 10, [S.spots, S.coops, S.noWay.slice(0, 4)]],
  ['never in anything (only the free ground, a footbridge, the door)', S.inside.length === 0, S.inside],
  ['never through a goose, a duck or Biscuit (closest)', S.close > 0.3, [S.close.toFixed(2), S.closeWho]],
  ['keeps to the paths most of the way', S.moving > 0 && S.path / S.moving > 0.5, [S.path, S.moving, (S.path / S.moving).toFixed(2)]],
  ['never stuck on the way (longest)', S.stuck < 6, [S.stuck.toFixed(1), S.stuckAt]],
  ['all the farmer does by day', ['coop', 'pond', 'corner', 'porch'].every(k => S.tasks[k]) && S.said.includes('hi'), [Object.keys(S.tasks), [...new Set(S.said)]]],
  ['bedtime: "Goodnight, girls!" and in through the door', day.homeT !== null && day.homeT < 90 && day.nightSaid.includes('night') && day.hidden, [day.homeT, day.nightSaid, day.hidden]],
  ['indoors all night', day.stillHome, day.stillHome],
  ['the morning: out with "Good morning, girls!"', day.outT !== null && day.morningSaid.includes('morning'), [day.outT, day.morningSaid]],
  ['a tap: the label, a wave and "Hello!"', tapped.task === 'tapped' && tapped.said.includes('hello') && tapped.bubble && tapped.tag === name + ' · ' + role, tapped],
  ['the night visit: out of the door with the torch lit', visit.homeAtFirst && visit.sent && Math.hypot(...visit.outAt) < 0.6 && visit.torch, visit],
  ['to Rusty, "Shoo!", and he runs home', visit.shoo !== null && visit.closest < 4 && visit.ended === 'shooed', [visit.shoo, visit.closest, visit.ended]],
  ['then back home and in', visit.farmerIn !== null, [visit.foxHome, visit.farmerIn, visit.said]],
];
let all = true;
for (const [nm, ok, v] of checks) { all = all && ok; console.log(ok ? 'PASS' : 'FAIL', nm, '·', JSON.stringify(v).slice(0, 400)); }
console.log(all ? 'ALL PASS' : 'SOME FAILED', `(${S.n} checks)`);
await b.close();

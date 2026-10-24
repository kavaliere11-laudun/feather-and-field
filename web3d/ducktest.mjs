// The pond's mallards (ducks.js), as they live: node ducktest.mjs [day minutes]   (LANG=fr for French)
// By day (12 minutes, every tenth of a second): each duck on the water, on the bank's grass or crossing between; never on
// or under the dock, never through anything on the bank, never through each other or a goose, never stuck; the followers
// keeping up with Rocco; all they do happens (dabbling, up-ending, preening, quacking with "Quack!", a bath with splashes,
// a stretch, Dot's curious looks at the frogs). A rest on the bank: all three ashore side by side, up and back into the
// water together; a goose coming close while they rest: all back into the water, quacking. Dusk: with the duck house on
// the pond, up its ramp and in at the door one by one, asleep inside and staying there; morning: out again and down into
// the water, awake and off (without it: out to their raft in the middle, asleep afloat). A tap on a duck (a real tap on
// the screen): her label and "Quack!". No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const mins = +(process.argv[2] || 12), fr = process.env.LANG === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&ducks${fr ? '&lang=fr' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(() => {
  // the checks, every tenth of a second
  const f = window.__farm, D = f.ducks(), G = f.geese(), nav = f.nav();
  const S = window.__S = { n: 0, dock: [], land: [], edge: 0, edgeAt: null, minDD: 9, minDG: 9, stuck: 0, stuckAt: null, acts: {}, quacks: 0, splashes: 0, far: [], peeks: 0 };
  const sp = D.splash.bind(D); D.splash = (x, z, k) => { S.splashes++; sp(x, z, k); };
  const say = D.say.bind(D); D.say = (d) => { S.quacks++; say(d); };
  const circles = o => (o.isDuck ? [[0.085, 0.085], [-0.075, 0.085]] : [[0.14, 0.155], [-0.13, 0.155]]).map(([a, r]) => [o.pos.x + Math.sin(o.heading) * a, o.pos.z + Math.cos(o.heading) * a, r]);
  const gap = (a, b) => { let m = 9; for (const p of circles(a)) for (const q of circles(b)) m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1]) - p[2] - q[2]); return m; };
  const crossing = d => d.task && d.task.list && d.task.list[d.task.i] && /^(straight|path)$/.test(d.task.list[d.task.i].name || '');
  window.__check = () => {
    S.n++;
    for (const d of D.ducks) {
      const [s] = D.pondAt(d.pos.x, d.pos.z), w = D.wetAt(d.pos.x, d.pos.z);
      (S.acts[d.name] = S.acts[d.name] || {})[d.act] = 1;
      if (w > 0.3) for (const [ax, az, r] of D.avoid) if (Math.hypot(d.pos.x - ax, d.pos.z - az) < r - 0.25) S.dock.push([d.name, d.pos.x.toFixed(2), d.pos.z.toFixed(2)]);
      if (w < 0.3 && s > 1.12 && nav && !nav.freeAt(d.pos.x, d.pos.z) && !crossing(d)) S.land.push([d.name, d.pos.x.toFixed(2), d.pos.z.toFixed(2), d.task && d.task.name]);
      if (w > 0.5 && s > 0.93 && !crossing(d)) { S.edge++; S.edgeAt = [d.name, s.toFixed(2), d.task && d.task.name, d.act]; }
      d.still = (/^(swim|walk)$/.test(d.act) && d.vs < 0.01) ? (d.still || 0) + 0.1 : 0;
      if (d.still > S.stuck) { S.stuck = d.still; S.stuckAt = [d.name, d.task && d.task.name, d.act, d.pos.x.toFixed(2), d.pos.z.toFixed(2)]; }
      for (const g of G.geese) S.minDG = Math.min(S.minDG, gap(d, g));
      if (d.act === 'peer') S.peekNow = d.name;
    }
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) S.minDD = Math.min(S.minDD, gap(D.ducks[i], D.ducks[j]));
    if (D.plan === 'paddle') S.far.push(Math.hypot(D.ducks[1].pos.x - D.ducks[0].pos.x, D.ducks[1].pos.z - D.ducks[0].pos.z), Math.hypot(D.ducks[2].pos.x - D.ducks[1].pos.x, D.ducks[2].pos.z - D.ducks[1].pos.z));
  };
  window.__run = (secs) => { for (let i = 0; i < secs * 10; i++) { f.step(1 / 30, 3); window.__check(); } };
});
// ---- by day
const day = await p.evaluate((mins) => {
  const f = window.__farm, D = f.ducks(); f.pause(true); f.setHour(14);
  let rested = false;
  for (let m = 0; m < mins * 6; m++) { window.__run(10); if (D.plan === 'rest') rested = true; }
  const S = window.__S, far = S.far.slice().sort((a, b) => a - b);
  return { S: Object.assign({}, S, { far: undefined, dock: S.dock.slice(0, 3), land: S.land.slice(0, 3) }), rested, far50: far[Math.floor(far.length * 0.5)], far95: far[Math.floor(far.length * 0.95)] };
}, mins);
// ---- a rest on the bank, and a goose coming close
const rest = await p.evaluate(() => {
  const f = window.__farm, D = f.ducks(), out = {};
  for (let i = 0; i < 600 && D.plan !== 'paddle'; i++) window.__run(0.5);
  D.restedAt = -999; const t = D.goRest(); if (!t) return { none: true }; D.ducks[0].task = t;
  let ashore = 0;
  for (let i = 0; i < 900; i++) { window.__run(0.1); if (D.ducks.every(d => d.wet < 0.05 && /^(rest|preen)$/.test(d.act))) { ashore++; if (ashore > 30) break; } }
  out.ashore = ashore > 30;
  out.spots = D.ducks.map(d => [d.pos.x.toFixed(2), d.pos.z.toFixed(2), d.act]);
  out.apart = Math.min(...[[0, 1], [0, 2], [1, 2]].map(([i, j]) => Math.hypot(D.ducks[i].pos.x - D.ducks[j].pos.x, D.ducks[i].pos.z - D.ducks[j].pos.z)));
  // a goose comes close: all back into the water, quacking
  const d0 = D.ducks[0], q0 = window.__S.quacks, orig = D.o.others;
  const fake = { pos: new f.THREE.Vector3(d0.pos.x + 0.9, 0, d0.pos.z + 0.6), heading: 0, isGoose: true };
  D.o.others = () => [...orig(), fake];
  let wetT = null;
  for (let i = 0; i < 300; i++) { window.__run(0.1); if (D.ducks.every(d => d.wet > 0.6)) { wetT = i / 10; break; } }
  D.o.others = orig;
  out.scrambled = wetT; out.quacked = window.__S.quacks - q0;
  return out;
});
// ---- a rest that ends: up and back into the water together
const rest2 = await p.evaluate(() => {
  const f = window.__farm, D = f.ducks();
  for (let i = 0; i < 600 && D.plan !== 'paddle'; i++) window.__run(0.5);
  D.restedAt = -999; const t = D.goRest(); if (!t) return { none: true }; D.ducks[0].task = t;
  const back = [];
  for (let i = 0; i < 1500; i++) {
    window.__run(0.1);
    D.ducks.forEach((d, k) => { if (back[k] === undefined && d.wet > 0.6 && D.restOver) back[k] = i / 10; });
    if (back.filter(x => x !== undefined).length === 3) break;
  }
  return { back, spread: Math.max(...back) - Math.min(...back) };
});
// ---- dusk, the night, the morning
const night = await p.evaluate(() => {
  const f = window.__farm, D = f.ducks(), out = {};
  out.house = !!D.house;
  f.setHour(21.4);
  if (D.house) { for (let k = 0; k < 40 && !D.ducks.every(d => d.inside); k++) window.__run(5); out.inTime = window.__S.n; }
  else window.__run(90);
  out.asleep = D.ducks.map(d => !!d.asleep); out.atRaft = D.house ? null : D.ducks.map((d, i) => +Math.hypot(d.pos.x - D.raft[i][0], d.pos.z - D.raft[i][1]).toFixed(2));
  out.inside = D.ducks.map(d => !!d.inside && !d.root.visible);
  const at = D.ducks.map(d => [d.pos.x, d.pos.z]);
  window.__run(120);
  out.stayed = Math.max(...D.ducks.map((d, i) => Math.hypot(d.pos.x - at[i][0], d.pos.z - at[i][1])));
  out.stillAsleep = D.ducks.every(d => d.asleep); out.stillInside = D.ducks.every(d => d.inside);
  f.setHour(6.5); window.__run(25);
  out.morning = D.ducks.map(d => !d.asleep); out.plan = D.plan;
  window.__run(20); out.plan2 = D.plan;
  out.out = D.ducks.map(d => !d.inside && d.root.visible); out.wet = D.ducks.map(d => +d.wet.toFixed(2));
  f.setHour(14);
  return out;
});
// ---- a tap on a duck, through the screen
const pick = await p.evaluate(() => {
  const f = window.__farm, D = f.ducks();
  let d = null;
  for (let i = 0; i < 600 && !d; i++) { window.__run(0.2); d = D.ducks.find(x => x.wet > 0.6 && x.react <= 0 && x.act !== 'upend' && (x.A.upend || 0) < 0.1); }
  if (!d) return null;
  f.lookAt(d.pos.x, d.pos.z, 1.2); f.draw(); window.__tapDuck = d; window.__q0 = window.__S.quacks;
  const v = d.root.getWorldPosition(new f.THREE.Vector3()); v.y += d.hitY; v.project(f.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, name: d.name, kind: d.kind };
});
let tapped = null;
if (pick) {
  await p.touchscreen.tap(pick.x, pick.y);
  tapped = await p.evaluate(() => { const d = window.__tapDuck, D = window.__farm.ducks(); window.__farm.step(1 / 30, 3); return { react: d.react > 0, said: window.__S.quacks > window.__q0 && D.bubbles.some(b => b.life > 0 && b.d === d), tag: document.getElementById('tag').textContent }; });
}
const S = day.S, A = S.acts, has = (k) => Object.values(A).some(a => a[k]);
const breed = pick ? (pick.kind === 'mallard_m' ? (fr ? 'canard colvert' : 'mallard drake') : (fr ? 'cane colvert' : 'mallard duck')) : '';
const checks = [
  ['no page errors', errs.length === 0, errs.slice(0, 3)],
  ['never on or under the dock', S.dock.length === 0, S.dock],
  ['never into anything on the bank', S.land.length === 0, S.land],
  ['afloat only out on the water (crossing the edge only on a way in or out)', S.edge === 0, [S.edge, S.edgeAt]],
  ['never through each other (closest gap)', S.minDD > -0.04, S.minDD.toFixed(3)],
  ['never through a goose (closest gap)', S.minDG > -0.04, S.minDG.toFixed(3)],
  ['never stuck (longest swim or walk without moving)', S.stuck < 8, [S.stuck.toFixed(1), S.stuckAt]],
  ['the followers keep up (half the time within 1.2 m, nearly always within 3.5 m)', day.far50 < 1.2 && day.far95 < 3.5, [day.far50 && day.far50.toFixed(2), day.far95 && day.far95.toFixed(2)]],
  ['all they do happens', ['dabble', 'upend', 'preen', 'quack', 'bathe', 'stretch', 'peer', 'swim', 'float'].every(has), A],
  ['"Quack!" over their heads, splashes in a bath', S.quacks > 3 && S.splashes > 1, [S.quacks, S.splashes]],
  ['a rest: all three ashore side by side', rest.ashore && rest.apart > 0.22, rest],
  ['a goose close while they rest: all back in the water, quacking', rest.scrambled !== null && rest.scrambled < 20 && rest.quacked > 0, [rest.scrambled, rest.quacked]],
  ['the rest over: back into the water together', rest2.back && rest2.back.length === 3 && rest2.spread < 12, rest2],
  night.house ? ['dusk: up the ramp and into their house one by one, asleep inside and staying there', night.inside.every(Boolean) && night.asleep.every(Boolean) && night.stillInside && night.stillAsleep && night.stayed < 0.01, night]
    : ['dusk: asleep on their raft in the middle, and staying there', night.asleep.every(Boolean) && night.atRaft.every(x => x < 0.3) && night.stayed < 0.4 && night.stillAsleep, night],
  ['morning: awake, out and off again' + (night.house ? ' (down into the water)' : ''), night.morning.every(Boolean) && !/^(night|morning)$/.test(night.plan2) && (!night.house || (night.out.every(Boolean) && night.wet.every(w => w > 0.5))), night],
  ['a tap: she quacks, "Quack!", her label', !!tapped && tapped.react && tapped.said && tapped.tag === pick.name + ' · ' + breed, [pick, tapped]],
];
let all = true;
for (const [nm, ok, v] of checks) { all = all && ok; console.log(ok ? 'PASS' : 'FAIL', nm, '·', JSON.stringify(v).slice(0, 500)); }
console.log(all ? 'ALL PASS' : 'SOME FAILED', `(${S.n} checks)`);
await b.close();

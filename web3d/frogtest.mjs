// The pond's frogs (pond.js): node frogtest.mjs
// By day (4 minutes) and by night (3 minutes), every frame: each frog on the bank at the water's edge, in the water, or in
// the middle of a hop or a dive (never left standing in the shallows or out on the grass, never on or under the dock),
// (or the froglet on her lily pad) no two frogs sitting on top of each other; between them they sit, look about, croak, hop along the bank, dive in, float
// and paddle and climb out again; more croaking at night. A goose walking up to a frog on the bank: in it jumps. A tap on a
// frog (a real tap on the screen): it jumps in with a "Ribbit!". No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&frogs` + (process.env.LANG === 'fr' ? '&lang=fr' : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const run = (hour, mins) => p.evaluate(([hour, mins]) => {
  const f = window.__farm, F = f.frogs(); f.pause(true); f.setHour(hour);
  window.__near = window.__near || F.o.near; F.o.near = () => [];      // (nobody startling them: that's checked apart)
  const out = { bad: 0, badAt: [], dock: 0, stacked: 0, did: {}, croaks: 0, secs: mins * 60 };
  const avoid = F.o.avoid || [];
  for (let t = 0; t < 30 * 60 * mins; t++) {
    f.step(1 / 30, 1);
    for (const fr of F.frogs) {
      const n = fr.task ? fr.task.name : '';
      if (n) { if (!out.did[n]) out.did[n] = 0; if (fr._last !== n) { out.did[n]++; if (n === 'croak') out.croaks++; } }
      fr._last = n;
      if (!fr.root.visible) continue;
      const [s] = F.where(fr.pos.x, fr.pos.z), moving = /^(hop|hopAlong|dive|climbOut|toPad)$/.test(n);
      const ok = moving ? s < 1.25 : fr.state === 'water' ? s < 0.95 : fr.state === 'pad' ? fr === F.her && Math.hypot(fr.pos.x - F.herPad.x, fr.pos.z - F.herPad.z) < F.herPad.r : s > 0.98 && s < 1.13;      // (the froglet on her lily pad)
      if (!ok) { out.bad++; if (out.badAt.length < 4) out.badAt.push([n, fr.state, +s.toFixed(2)]); }
      for (const [ax, az, ar] of avoid) if (Math.hypot(fr.pos.x - ax, fr.pos.z - az) < ar) { out.dock++; out.dockAt = out.dockAt || {}; out.dockAt[n + '/' + fr.state] = (out.dockAt[n + '/' + fr.state] || 0) + 1; }
    }
    const bank = F.frogs.filter(fr => fr.root.visible && fr.state === 'bank' && !fr.task?.name?.startsWith('hop'));
    for (let i = 0; i < bank.length; i++) for (let j = i + 1; j < bank.length; j++) if (Math.hypot(bank[i].pos.x - bank[j].pos.x, bank[i].pos.z - bank[j].pos.z) < 0.1) { out.stacked++; out.stackAt = out.stackAt || {}; const k = (bank[i].task ? bank[i].task.name : '-') + '+' + (bank[j].task ? bank[j].task.name : '-'); out.stackAt[k] = (out.stackAt[k] || 0) + 1; }
  }
  return out;
}, [hour, mins]);
const day = await run(14, 4), night = await run(23, 3);
// a goose walks up to a frog sitting on the bank
const goose = await p.evaluate(() => {
  const f = window.__farm, F = f.frogs(), G = f.geese().geese[0];
  f.setHour(14); F.o.near = window.__near;
  let fr = null;
  for (let i = 0; i < 30 * 60 && !fr; i++) { f.step(1 / 30, 1); fr = F.frogs.find(x => x.state === 'bank' && x.root.visible && (!x.task || /^(sit|look|croak)$/.test(x.task.name))); }
  if (!fr) return { found: false };
  for (let i = 0; i < 30; i++) { G.pos.set(fr.pos.x + 0.6, 0, fr.pos.z + 0.3); f.step(1 / 30, 1); }
  return { found: true, task: fr.task && fr.task.name };
});
// a tap on a frog sitting on the bank, through the screen
const pick = await p.evaluate(() => {
  const f = window.__farm, F = f.frogs(); F.o.near = () => [];
  let fr = null;
  for (let i = 0; i < 30 * 90 && !fr; i++) { f.step(1 / 30, 1); fr = F.frogs.find(x => x.state === 'bank' && x.root.visible && (!x.task || /^(sit|look)$/.test(x.task.name))); }
  if (!fr) return null;
  f.lookAt(fr.pos.x, fr.pos.z, 1.2); f.draw(); window.__tapFrog = fr;
  const v = fr.pos.clone(); v.y += fr.hitY; v.project(f.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
});
let tapped = null;
if (pick) {
  await p.touchscreen.tap(pick.x, pick.y);
  tapped = await p.evaluate(() => { const fr = window.__tapFrog, F = window.__farm.frogs(); window.__farm.step(1 / 30, 3); return { task: fr.task && fr.task.name, said: F.fx.bubbles.some(b => b.life > 0 && b.f === fr), tag: document.getElementById('tag').textContent }; });
}
const fr = process.env.LANG === 'fr';
const checks = [
  ['no page errors', errs.length === 0, errs.slice(0, 3)],
  ['by day: always on the bank, in the water or mid-hop', day.bad === 0, [day.bad, day.badAt]],
  ['by night: the same', night.bad === 0, [night.bad, night.badAt]],
  ['never on or under the dock', day.dock + night.dock === 0, [day.dock, night.dock, day.dockAt, night.dockAt]],
  ['never sitting on top of each other', day.stacked + night.stacked === 0, [day.stacked, night.stacked, day.stackAt]],
  ['all they do: croak, look, hop along, dive, float, paddle, climb out', ['croak', 'look', 'hopAlong', 'dive', 'float', 'swim', 'climbOut'].every(k => (day.did[k] || 0) + (night.did[k] || 0) > 0), [day.did, night.did]],
  ['more croaking at night', night.croaks / 3 > day.croaks / 4, [day.croaks / 4, night.croaks / 3]],
  ['a goose coming close: it jumps in', goose.found && goose.task === 'dive', goose],
  ['a tap: it jumps in, "Ribbit!", its label', !!tapped && tapped.task === 'dive' && tapped.said && tapped.tag === (fr ? 'Grenouille' : 'Frog'), tapped],
];
let all = true;
for (const [nm, ok, v] of checks) { all = all && ok; console.log(ok ? 'PASS' : 'FAIL', nm, '·', JSON.stringify(v).slice(0, 400)); }
console.log(all ? 'ALL PASS' : 'SOME FAILED');
await b.close();

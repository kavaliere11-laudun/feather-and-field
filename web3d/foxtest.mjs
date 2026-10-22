// The fox family: node foxtest.mjs  (they come out of the den with ?foxes, all five play in the meadow, a tap shows a fox's
// name, they go home into the den; at night without ?foxes they stay in)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : ''));
async function page(q) {
  const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5' + q);
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  await p.addStyleTag({ content: '#hint, #readout { display: none !important; }' });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 5); });
  return p;
}
let p = await page('&foxes&time=16');
await p.evaluate(() => window.__farm.step(1 / 30, 360));
let st = await p.evaluate(() => { const F = window.__farm.foxes(); return { out: F.out, seen: F.foxes.filter(f => f.root.visible).length, btn: !document.getElementById('foxbtn').hidden,
  inField: F.foxes.every(f => Math.hypot(f.pos.x - F.field[0], f.pos.z - F.field[1]) < F.field[2] + 1.2) }; });
ok('?foxes: all five out of the den and in the meadow after 12 s, the Foxes button showing', st.out && st.seen === 5 && st.btn && st.inField, JSON.stringify(st));
// a minute of play: nobody wanders off, nobody stuck in a pose
await p.evaluate(() => window.__farm.step(1 / 30, 1800));
st = await p.evaluate(() => { const F = window.__farm.foxes(); return { tasks: F.foxes.map(f => f.task ? f.task.name : '-'), far: F.foxes.map(f => +Math.hypot(f.pos.x - F.field[0], f.pos.z - F.field[1]).toFixed(2)) }; });
ok('after a minute of play everyone is still in or near the meadow', st.far.every(d => d < 4.2), JSON.stringify(st));
// three more minutes of play, checked every half second: bodies never through each other (up close when wrestling or chasing,
// a little), nobody through the den's bank, a bush or a trunk
st = await p.evaluate(() => {
  const f = window.__farm, F = f.foxes(); let bodies = 0, close = 0, obs = 0, tails = 0, n = 0, touch = 0; F.bumps = 0;
  for (let k = 0; k < 360; k++) { f.step(1 / 30, 15); const o = F.overlaps(); bodies = Math.max(bodies, o.bodies); close = Math.max(close, o.close); obs = Math.max(obs, o.obs); tails = Math.max(tails, o.tails); if (o.bodies > 0.05 || o.close > 0.3) touch++; n++; }
  return { samples: n, touching: touch, bodies: +bodies.toFixed(3), close: +close.toFixed(3), obs: +obs.toFixed(3), tails: +tails.toFixed(3), bumpsPerMin: +(F.bumps / 3).toFixed(1) };
});
ok('three minutes of play: no fox through another (a brush of fur now and then, more when wrestling; a brush against a brush), they walk round each other (a bump now and then), none in the den, a bush or a trunk', st.touching <= 8 && st.bodies <= 0.15 && st.close <= 0.5 && st.obs <= 0.01 && st.tails <= 0.6 && st.bumpsPerMin <= 100, JSON.stringify(st));
// the Foxes button takes the view there; a tap on a fox shows its name
await p.click('#foxbtn'); await p.evaluate(() => { const f = window.__farm; f.step(1 / 30, 1); f.draw(); });
const pt = await p.evaluate(() => {
  // (a fox the tap can only land on: the ray through its middle meets no other fox's tap sphere; time moves on until one is)
  const f = window.__farm, F = f.foxes(), T = f.THREE;
  for (let tries = 0; tries < 60; tries++) {
    const seen = F.foxes.filter(o => o.root.visible), mid = o => { const v = o.root.getWorldPosition(new T.Vector3()); v.y += o.hitY; return v; };
    for (const x of seen) {
      const v = mid(x).project(f.camera), px = (v.x + 1) / 2 * innerWidth, py = (1 - v.y) / 2 * innerHeight;
      const rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2(v.x, v.y), f.camera);
      const clear = seen.every(o => o === x || !rc.ray.intersectsSphere(new T.Sphere(mid(o), o.hitR)));
      if (clear && px > 30 && px < innerWidth - 30 && py > 120 && py < innerHeight - 120) return { x: px, y: py, name: x.name };
    }
    f.step(1 / 30, 15); f.draw();
  }
  return { x: 0, y: 0, name: 'none clear' };
});
await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(300);
const tg = await p.evaluate(() => document.getElementById('tag').textContent);
ok(`a tap on a fox (${pt.name}) shows the label`, tg.startsWith(pt.name), tg);
await p.evaluate(() => { const F = window.__farm.foxes(); F.goHome(); window.__farm.step(1 / 30, 900); });
st = await p.evaluate(() => { const F = window.__farm.foxes(); return { home: F.foxes.filter(f => f.home).length, seen: F.foxes.filter(f => f.root.visible).length }; });
ok('going home: all five back in the den, one at a time, within 30 s', st.home === 5 && st.seen === 0, JSON.stringify(st));
ok('no page errors (day)', !p.errs.length, p.errs.slice(0, 3).join(' | '));
await p.close();
p = await page('&time=23');
await p.evaluate(() => window.__farm.step(1 / 30, 900));
st = await p.evaluate(() => { const F = window.__farm.foxes(); return { out: F.out, seen: F.foxes.filter(f => f.root.visible).length }; });
ok('at night (for now) they stay in the den', !st.out && st.seen === 0, JSON.stringify(st));
ok('no page errors (night)', !p.errs.length, p.errs.slice(0, 3).join(' | '));
await b.close();

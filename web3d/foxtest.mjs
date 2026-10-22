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
// the Foxes button takes the view there; a tap on a fox shows its name
await p.click('#foxbtn'); await p.evaluate(() => { const f = window.__farm; f.step(1 / 30, 1); f.draw(); });
const pt = await p.evaluate(() => {
  const f = window.__farm, F = f.foxes(), x = F.foxes.find(o => o.kind === 'fox'), v = x.root.getWorldPosition(new f.THREE.Vector3()); v.y += x.hitY; v.project(f.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, name: x.name };
});
await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(300);
const tg = await p.evaluate(() => document.getElementById('tag').textContent);
ok(`a tap on ${pt.name} shows the label`, tg.startsWith(pt.name), tg);
await p.evaluate(() => { const F = window.__farm.foxes(); F.goHome(); window.__farm.step(1 / 30, 600); });
st = await p.evaluate(() => { const F = window.__farm.foxes(); return { home: F.foxes.filter(f => f.home).length, seen: F.foxes.filter(f => f.root.visible).length }; });
ok('going home: all five back in the den within 20 s', st.home === 5 && st.seen === 0, JSON.stringify(st));
ok('no page errors (day)', !p.errs.length, p.errs.slice(0, 3).join(' | '));
await p.close();
p = await page('&time=23');
await p.evaluate(() => window.__farm.step(1 / 30, 900));
st = await p.evaluate(() => { const F = window.__farm.foxes(); return { out: F.out, seen: F.foxes.filter(f => f.root.visible).length }; });
ok('at night (for now) they stay in the den', !st.out && st.seen === 0, JSON.stringify(st));
ok('no page errors (night)', !p.errs.length, p.errs.slice(0, 3).join(' | '));
await b.close();

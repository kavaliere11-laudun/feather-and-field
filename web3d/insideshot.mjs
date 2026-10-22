// Inside each coop at night: node insideshot.mjs [out] [hour]  (opens each coop's inside view, draws it, wakes a hen for a
// cuddle, and checks the eggs can be collected and the way back works)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'in', hour = '23'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.VW || 390), height: +(process.env.VH || 760) }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('TUNNEL')) errs.push(m.text()); });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&time=' + hour);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout { display: none !important; }' });
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : ''));
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 10); });
for (let i = 0; i < 5; i++) {
  const asleep = await p.evaluate((i) => { const f = window.__farm, pl = f.plots[i]; pl.nest.count = 4; f.openInside(pl); return pl.birds.filter(b => b.asleep).length; }, i);
  await p.waitForTimeout(700);
  const st = await p.evaluate(() => { const f = window.__farm; for (let k = 0; k < 2; k++) f.drawInside(); return { open: f.inside.open, birds: f.inside.birds.length, title: document.getElementById('inside-title').textContent }; });
  ok(`coop ${i}: inside open with everyone asleep`, st.open && st.birds === asleep, JSON.stringify(st));
  await p.screenshot({ path: `${out}_${i}.png`, timeout: 240000 });
  // wake the first hen on the lower perch for a cuddle
  const pt = await p.evaluate(() => {
    const f = window.__farm, h = f.inside.birds[0], v = h.root.getWorldPosition(new f.THREE.Vector3()); v.y += h.hitY * 0.8; v.project(f.inside.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, name: h.name };
  });
  await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(500);
  await p.evaluate(() => { const f = window.__farm; f.inside.birds[0].A.t += 0.5; for (let k = 0; k < 2; k++) f.drawInside(); });
  const t = await p.evaluate(() => ({ on: document.getElementById('tag').classList.contains('on'), text: document.getElementById('tag').textContent, woken: window.__farm.inside.birds[0].woken > 0 }));
  ok(`coop ${i}: tapping ${pt.name} wakes her for a cuddle`, t.on && t.woken && t.text.startsWith(pt.name), JSON.stringify(t));
  if (i === 1) await p.screenshot({ path: `${out}_cuddle.png`, timeout: 240000 });
  // drag sideways to the nest boxes, then collect the eggs
  const pan0 = await p.evaluate(() => window.__farm.inside.pan);
  await p.mouse.move(330, 560); await p.mouse.down(); await p.mouse.move(200, 560, { steps: 6 }); await p.mouse.move(40, 560, { steps: 6 }); await p.mouse.up();
  const pan1 = await p.evaluate(() => { const f = window.__farm; for (let k = 0; k < 2; k++) f.drawInside(); return f.inside.pan; });
  ok(`coop ${i}: dragging sideways looks along the room`, pan1 > pan0 + 0.2, JSON.stringify({ pan0, pan1 }));
  if (i === 2) await p.screenshot({ path: `${out}_nests.png`, timeout: 240000 });
  const nb = await p.evaluate((i) => {
    const f = window.__farm, R = f.inside.rooms[f.plots[i].breed], v = new f.THREE.Vector3(...R.nests[0]); v.y += 0.03; v.project(f.inside.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }, i);
  await p.touchscreen.tap(nb.x, nb.y); await p.waitForTimeout(300);
  const e = await p.evaluate((i) => ({ text: document.getElementById('tag').textContent, left: window.__farm.plots[i].nest.count }), i);
  ok(`coop ${i}: tapping a nest box collects the eggs`, e.text === 'Collected 4 eggs' && e.left === 0, JSON.stringify(e));
  await p.click('#inside-back'); await p.waitForTimeout(700);
  const back = await p.evaluate((i) => { const f = window.__farm, pl = f.plots[i]; return { open: f.inside.open, hidden: pl.birds.every(b => !b.root.visible), home: pl.birds.every(b => b.root.parent === pl.frame) }; }, i);
  ok(`coop ${i}: back to the farm, everyone still in bed`, !back.open && back.hidden && back.home, JSON.stringify(back));
}
ok('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
await b.close();

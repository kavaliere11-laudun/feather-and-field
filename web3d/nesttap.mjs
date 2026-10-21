// Tap each coop's nest window: the eggs are collected (and a sitting hen is reported). Usage: node nesttap.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=3&coops=5');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : ''));
const n = await p.evaluate(() => { const f = window.__farm; f.pause(true); f.freeze(true); f.noLaying(); return f.plots.filter(pl => pl.nest).length; });
for (let i = 0; i < n; i++) {
  const spot = await p.evaluate((i) => {
    const f = window.__farm, pl = f.plots[i], G = f.nestOf(pl);
    for (const bd of pl.birds) { bd.root.position.set(-1.6, 0, 2.2); bd.root.updateMatrixWorld(true); }   // out of the way
    pl.nest.count = 2; f.showEggs(pl);
    const c = new f.THREE.Vector3(G.win[0], (G.win[1] + G.win[2]) / 2, 0.44); pl.frame.localToWorld(c);
    f.lookAt(c.x, c.z, 3); f.draw();
    c.project(f.camera);
    return { x: (c.x + 1) / 2 * innerWidth, y: (1 - c.y) / 2 * innerHeight, breed: pl.breed };
  }, i);
  await p.touchscreen.tap(spot.x, spot.y); await p.waitForTimeout(200);
  const t = await p.evaluate((i) => ({ text: document.getElementById('tag').textContent, left: window.__farm.plots[i].nest.count }), i);
  ok('tap the ' + spot.breed + ' nest window collects the eggs', t.text === 'Collected 2 eggs' && t.left === 0, JSON.stringify(t));
}
ok('no page errors', !errs.length, errs.join(' | '));
await b.close();

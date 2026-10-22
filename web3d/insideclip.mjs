// Frames of a night visit inside a coop: the coop at night, inside (everyone asleep, a "z" now and then), a cuddle, a look
// along to the nest boxes, the eggs collected, back out: node insideclip.mjs PLOT FPS OUT
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [plot = '0', fps = '12', out = 'ic'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&time=23:10');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#readout { display: none !important; } #fade { transition: none !important; }' });
const pi = parseInt(plot), per = Math.max(1, Math.round(30 / parseFloat(fps)));
let k = 0;
const shot = async () => p.screenshot({ path: `${out}_${String(k++).padStart(3, '0')}.png`, timeout: 240000 });
await p.evaluate((i) => {
  const f = window.__farm, pl = f.plots[i]; f.pause(true); f.step(1 / 30, 15); pl.nest.count = 4;
  const w = new f.THREE.Vector3(0, 0, 0.4); pl.frame.localToWorld(w);
  const kk = 0.5 / Math.tan(42 * Math.PI / 180); f.lookAt(w.x - Math.SQRT1_2 * kk, w.z - Math.SQRT1_2 * kk, 3.6);
}, pi);
const farm = async (n) => { for (let j = 0; j < n; j++) { await p.evaluate((per) => { const f = window.__farm; f.step(1 / 30, per); f.draw(); }, per); await shot(); } };
const inside = async (n, before) => { for (let j = 0; j < n; j++) { if (before) await before(j); await p.evaluate((per) => window.__farm.stepInside(1 / 30, per), per); await shot(); } };
const sec = (s) => Math.round(s * parseFloat(fps));
await farm(sec(1.2));
await p.evaluate((i) => window.__farm.openInside(window.__farm.plots[i]), pi); await p.waitForTimeout(600);
await inside(sec(3.5));
// a cuddle for the first hen on the lower bar
const pt = await p.evaluate(() => {
  const f = window.__farm, h = f.inside.birds[0], v = h.root.getWorldPosition(new f.THREE.Vector3()); v.y += h.hitY * 0.8; v.project(f.inside.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
});
await p.touchscreen.tap(pt.x, pt.y);
await inside(sec(3.2));
// look along to the nest boxes
await p.mouse.move(330, 560); await p.mouse.down();
await inside(sec(1.5), async (j) => p.mouse.move(330 - (j + 1) * 300 / sec(1.5), 560));
await p.mouse.up();
await inside(sec(1.0));
const nb = await p.evaluate((i) => {
  const f = window.__farm, R = f.inside.rooms[f.plots[i].breed], v = new f.THREE.Vector3(...R.nests[0]); v.y += 0.03; v.project(f.inside.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
}, pi);
await p.touchscreen.tap(nb.x, nb.y);
await inside(sec(2.2));
await p.click('#inside-back'); await p.waitForTimeout(600);
await farm(sec(1.2));
console.log('frames', k);
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

// Frames of a coop's evening and morning: the last birds go in, the moon badge, a tap shuts the pop door; morning, the sun
// badge, a tap opens it and out they come: node doorclip.mjs PLOT FPS OUT
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [plot = '0', fps = '12', out = 'dcl'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&time=22:41');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#readout, #hint { display: none !important; }' });
const pi = parseInt(plot), per = Math.max(1, Math.round(30 / parseFloat(fps))), sec = (s) => Math.round(s * parseFloat(fps));
let k = 0, h = 22 + 41 / 60;
const shot = async () => p.screenshot({ path: `${out}_${String(k++).padStart(3, '0')}.png`, timeout: 240000 });
await p.evaluate(([i, h]) => {
  const f = window.__farm, pl = f.plots[i]; f.pause(true); f.noLaying(); f.setHour(h); f.step(1 / 30, 10);
  const w = new f.THREE.Vector3(-0.15, 0, 0.75); pl.frame.localToWorld(w);
  const kk = 0.45 / Math.tan(42 * Math.PI / 180); f.lookAt(w.x - Math.SQRT1_2 * kk, w.z - Math.SQRT1_2 * kk, 2.3);
}, [pi, h]);
const run = async (n, rate) => {
  for (let j = 0; j < n; j++) {
    h = await p.evaluate(([per, rate, h]) => { const f = window.__farm; for (let q = 0; q < per; q++) { h += rate / 60 / 30; f.setHour(h); f.step(1 / 30, 1); } f.draw(); return h; }, [per, rate, h]);
    await shot();
  }
};
const tapDoor = async () => {
  const pt = await p.evaluate((i) => {
    const f = window.__farm, pl = f.plots[i], G = f.nestOf(pl), v = new f.THREE.Vector3(G.pop[0], G.house + 0.2, 0.46); pl.frame.localToWorld(v); v.project(f.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }, pi);
  await p.touchscreen.tap(pt.x, pt.y);
};
// the evening: the last of them go in (the clock a little fast), the badge
let all = false;
for (let j = 0; j < sec(16) && !all; j++) {
  await run(1, 1.2);
  all = await p.evaluate((i) => window.__farm.plots[i].birds.every(b => b.asleep), pi);
}
await run(sec(1.5), 0.6);
await tapDoor(); await run(sec(2.6), 0.6);
// the morning: waiting inside, the sun badge; a tap and out they come
h = 6.5; await p.evaluate((h) => { const f = window.__farm; f.setHour(h); f.step(1 / 30, 3); }, h);
await run(sec(1.6), 0.6);
await tapDoor(); await run(sec(6), 0.6);
console.log('frames', k, 'all in by', all);
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

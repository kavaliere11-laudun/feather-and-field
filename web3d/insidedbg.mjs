// Close look inside one coop: node insidedbg.mjs coop out [lookX lookY dist yawDeg]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [ci = '0', out = 'indbg', lx = '-0.2', ly = '0.45', dist = '1.1', yaw = '0'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 700, height: 500 }, deviceScaleFactor: 1 });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&time=23');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #inside-top, #inside-back { display: none !important; }' });
await p.evaluate((ci) => { const f = window.__farm; f.pause(true); f.step(1 / 30, 10); const pl = f.plots[+ci]; pl.nest.count = 4; f.openInside(pl); }, ci);
await p.waitForTimeout(800);
await p.evaluate(([lx, ly, dist, yaw]) => {
  const f = window.__farm, c = f.inside.camera, T = f.THREE, a = yaw * Math.PI / 180, el = 10 * Math.PI / 180;
  const look = new T.Vector3(lx, ly, 0); c.position.set(lx + Math.sin(a) * Math.cos(el) * dist, ly + Math.sin(el) * dist, Math.cos(a) * Math.cos(el) * dist); c.aspect = innerWidth / innerHeight; c.lookAt(look); c.updateProjectionMatrix(); c.updateMatrixWorld();
  for (let k = 0; k < 2; k++) { f.inside.birds.forEach(b => b.A.t += 0.4); f.drawInside(); }
}, [+lx, +ly, +dist, +yaw]);
await p.screenshot({ path: out + '.png', timeout: 240000 });
await b.close();

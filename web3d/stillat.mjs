// A still of a coop plot from the game's camera, drawn once: node stillat.mjs plot size out [coops]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [plot = '0', size = '4.4', out = 'at.png', coops = '10'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:8770/index.html?q=0&coops=' + coops);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(([i, s]) => { const f = window.__farm; f.pause(true); f.freeze(true); f.step(1 / 60, 200);
  const c = f.plots[i].frame.getWorldPosition(new f.THREE.Vector3()); f.lookAt(c.x + 0.2, c.z + 0.9, s); f.draw(); }, [parseInt(plot), parseFloat(size)]);
await p.waitForTimeout(2500);
await p.screenshot({ path: out, timeout: 240000 });
await b.close();

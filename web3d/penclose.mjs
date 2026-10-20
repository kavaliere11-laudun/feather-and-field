// A close look at one coop's birds from the game's camera: node penclose.mjs plot size out
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [plot = '3', size = '1.5', out = 'pen.png'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:8770/index.html?q=0');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(([i, s]) => { const f = window.__farm, pl = f.plots[i]; f.freeze(true); f.step(1 / 60, 120);
  const c = new f.THREE.Vector3(); for (const bd of pl.birds) c.add(bd.root.getWorldPosition(new f.THREE.Vector3())); c.divideScalar(pl.birds.length); f.lookAt(c.x, c.z, s); }, [parseInt(plot), parseFloat(size)]);
await p.waitForTimeout(1500);
await p.screenshot({ path: out });
await b.close();

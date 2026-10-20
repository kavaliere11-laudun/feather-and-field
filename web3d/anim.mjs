// Poses of the line-up birds mid-action, for checking the animations: node anim.mjs ACTION seconds-into-it [size] [dx] [dz] [out]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [act, at = '0.5', size = '1.0', dx = '0', dz = '0', out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8770/index.html?lineup&q=0');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(([act, at, size, dx, dz]) => {
  const f = window.__farm; f.freeze(true);
  const c = f.view.target.clone(); f.lookAt(c.x + dx, c.z + dz, size);
  if (!window.noturn) for (const bd of f.allBirds) bd.root.rotation.y += Math.PI / 2;
  if (act !== 'none') f.act(act, act === 'rest' ? 6 : act === 'peck' ? 3 : act === 'flap' ? 0.9 : 2.0);
  f.step(1 / 60, Math.round(at * 60));
}, [act, parseFloat(at), parseFloat(size), parseFloat(dx), parseFloat(dz)]);
await p.waitForTimeout(1200);
await p.screenshot({ path: out || `anim_${act}.png` });
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

// One still picture, drawn once (for heavy views in the slow test browser): node still.mjs QUERY out.png [size] [dx] [dz] [w] [h] [dpr] [sidewaysTurn]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [qs = 'lineup', out = 'still.png', size = '2.2', dx = '0', dz = '0', w = '402', h = '874', dpr = '2', turn = '0'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8770/index.html?q=0&' + qs);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(([s, dx, dz, turn]) => {
  const f = window.__farm; f.pause(true); f.freeze(true);
  if (turn) for (const bd of f.allBirds) bd.root.rotation.y += turn;
  f.step(1 / 60, 30);
  const c = f.view.target.clone(); f.lookAt(c.x + dx, c.z + dz, s); f.draw();
}, [parseFloat(size), parseFloat(dx), parseFloat(dz), parseFloat(turn)]);
await p.waitForTimeout(3000);
await p.screenshot({ path: out, timeout: 240000 });
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

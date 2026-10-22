// The fox line-up (?lineup=foxes): the whole row, then close-ups: node foxline.mjs [out] [hour]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'fl', hour = '15'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&lineup=foxes&time=' + hour);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 90); f.draw(); });
await p.screenshot({ path: `${out}_row.png`, timeout: 240000 });
for (const [i, name, size] of [[0, 'dad', 0.75], [2, 'cub', 0.45], [5, 'sit', 0.75]]) {
  await p.evaluate(([i, size]) => { const f = window.__farm, L = f.foxLineup(), x = L.foxes[i], v = x.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(v.x + 0.08, v.z + 0.08, size); f.step(1 / 30, 1); f.draw(); }, [i, size]);
  await p.screenshot({ path: `${out}_${name}.png`, timeout: 240000 });
}
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

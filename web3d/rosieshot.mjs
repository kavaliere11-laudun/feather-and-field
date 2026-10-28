// close-ups of the line-up's Rosie: OUTFIT=rodeo SHOTS='[{"i":1,"rot":-0.3,"size":0.3}]' OUT=dir node shot.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const shots = JSON.parse(process.env.SHOTS || '[{"i":1,"rot":-0.3,"size":0.3}]');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const o = (process.env.OUTFIT ? `&outfit=${process.env.OUTFIT}` : '') + (process.env.EXTRA || '');
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup=farmer${o}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top { display: none !important; }' });
let n = 0;
for (const v of shots) {
  await p.evaluate(v => { const f = window.__farm; f.pause(true); f.setHour(14); window.__noBlink = true; f.step(1 / 30, Math.round((v.secs || 1) * 30));
    const L = f.farmerLineup(), fm = L.farmers[v.i]; fm.root.rotation.y = v.rot; f.step(1 / 30, 1);
    const w = fm.root.getWorldPosition(new f.THREE.Vector3()), k = 1.12 / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2; f.lookAt(w.x - k, w.z - k, v.size || 0.3); f.draw(); }, v);
  await p.screenshot({ path: `${process.env.OUT}/${String(n++).padStart(2, '0')}.png`, clip: { x: 0, y: +(process.env.Y0 || 200), width: 402, height: +(process.env.H || 420) }, timeout: 120000 });
}
console.log('errors', errs); await b.close();

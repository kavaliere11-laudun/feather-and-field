import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const vars = JSON.parse(process.env.VARS || '[{}]');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup=farmer&set=${process.env.SET || 3}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top { display: none !important; }' });
let n = 0;
for (const v of vars) {
  await p.evaluate(([v, secs]) => { const f = window.__farm; f.pause(true); f.setHour(14); window.__HAT = v.hat; window.__noBlink = true; if (v.gaze !== undefined) { window.__GAZE = v.gaze; for (const fm of f.farmerLineup().farmers) fm.rig.gazeUp = v.gaze; } f.step(1 / 30, Math.round(secs * 30));
    if (v.face !== undefined) { const L = f.farmerLineup(), fm = L.farmers[v.face], w = fm.root.getWorldPosition(new f.THREE.Vector3()), k = 1.12 / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2; f.lookAt(w.x - k, w.z - k, v.size || 0.3); }
    f.draw(); }, [v, v.secs !== undefined ? v.secs : n === 0 && process.env.FIRST ? +process.env.FIRST : +(process.env.SECS || 1)]);
  await p.screenshot({ path: `${process.env.OUT}/${String(n++).padStart(2, '0')}.png`, clip: { x: 0, y: +(process.env.Y0 || 200), width: 402, height: +(process.env.H || 420) }, timeout: 120000 });
}
console.log('errors', errs); await b.close();

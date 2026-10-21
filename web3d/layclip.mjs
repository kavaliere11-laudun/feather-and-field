// A hen laying in her coop's nest box, frame by frame (stepped exactly): node layclip.mjs PLOT PERS SIT frames fps size out [dx dz]
// Frames are taken at `fps` of game time; the sitting part is kept short (SIT seconds) so the whole visit fits.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [plot = '0', pers = 'diva', sit = '2', n = '60', fps = '8', size = '1.3', out = 'lay', dx = '0', dz = '0'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.VW || 420), height: +(process.env.VH || 420) }, deviceScaleFactor: 1.5 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=' + (process.env.COOPS || 5));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top { display: none !important; }' });
console.log(await p.evaluate(([i, pers, sit, s, dx, dz]) => {
  const f = window.__farm, pl = f.plots[i]; f.pause(true); f.freeze(true); f.noLaying();
  f.step(1 / 30, 30);
  const w = new f.THREE.Vector3(0.75 + dx, 0, 0.62 + dz); pl.frame.localToWorld(w);
  f.lookAt(w.x, w.z, s);
  const name = f.layAs(i, pers, sit); window.__henObj = pl.birds.find(b => b.laying);
  return name;
}, [parseInt(plot), pers, parseFloat(sit), parseFloat(size), parseFloat(dx), parseFloat(dz)]));
const per = Math.max(1, Math.round(30 / parseFloat(fps))), phases = [];
for (let k = 0; k < parseInt(n); k++) {
  phases.push(await p.evaluate((per) => { const f = window.__farm; f.step(1 / 30, per); f.draw(); const h = window.__henObj; return h.laying ? h.laying.phase : (h.route ? 'parade' : (h.act ? h.act.type : 'free')); }, per));
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${out}_${String(k).padStart(3, '0')}.png` });
}
(await import('fs')).writeFileSync(out + '_phases.json', JSON.stringify(phases));
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

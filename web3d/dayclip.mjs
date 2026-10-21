// Frames of one coop with the clock running fast (dusk and bedtime, or dawn and getting up):
// node dayclip.mjs PLOT FROM TO RATE FPS SIZE OUT   (RATE: minutes of clock per second of play; env LX LZ LH: the pen point)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [plot = '8', from = '19.75', to = '21', rate = '1.5', fps = '6', size = '1.6', out = 'dc'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.VW || 480), height: +(process.env.VH || 480) }, deviceScaleFactor: 1.5 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=' + (process.env.COOPS || 10));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top { display: none !important; }' });
await p.evaluate(([i, h, s, lx, lz, lh]) => {
  const f = window.__farm, pl = f.plots[i]; f.pause(true); f.noLaying();
  f.setHour(h); f.step(1 / 30, 15);
  const w = new f.THREE.Vector3(lx, 0, lz); pl.frame.localToWorld(w);
  const k = lh / Math.tan(42 * Math.PI / 180);
  f.lookAt(w.x - Math.SQRT1_2 * k, w.z - Math.SQRT1_2 * k, s);
}, [parseInt(plot), parseFloat(from), parseFloat(size), +(process.env.LX ?? 0.1), +(process.env.LZ ?? 1.1), +(process.env.LH ?? 0.1)]);
const per = Math.max(1, Math.round(30 / parseFloat(fps)));
let h = parseFloat(from), k = 0;
while (h < parseFloat(to)) {
  h = await p.evaluate(([per, rate, h]) => {
    const f = window.__farm;
    for (let j = 0; j < per; j++) { h += rate / 60 / 30; f.setHour(h); f.step(1 / 30, 1); }
    f.draw(); return h;
  }, [per, parseFloat(rate), h]);
  await p.screenshot({ path: `${out}_${String(k++).padStart(3, '0')}.png` });
}
console.log('frames', k);
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

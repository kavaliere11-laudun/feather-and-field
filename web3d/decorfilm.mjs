// A tour of the decorations: node decorfilm.mjs OUT [fps] [hour]  (each held HOLD seconds with a slow zoom in, a glide of
// GLIDE seconds to the next; ORDER=greenhouse,birdbath,...; DSF, PORT). Prints each one's first frame.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'tour', fps = '12', hour = '14'] = process.argv.slice(2);
const HOLD = +(process.env.HOLD || 2.6), GLIDE = +(process.env.GLIDE || 1.2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 1.5) });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0${process.env.EXTRA || ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #replaybtn, #farmerbtn, #foxbtn, #tag { display: none !important; }' });
const list = await p.evaluate(h => { const f = window.__farm; f.pause(true); f.setHour(h); for (let i = 0; i < 90; i++) f.step(1 / 30, 1);
  return f.decor().map(d => { const c = new f.THREE.Vector3(); d.box.getCenter(c); c.y = 0; c.applyMatrix4(d.m); return { model: d.model, x: c.x, z: c.z, h: d.box.max.y }; }); }, +hour);
const order = (process.env.ORDER || 'greenhouse,birdbath,flowers,beehives,windmill,statue,duckhouse,bandstand').split(',');
const stops = order.map(n => list.find(d => d.model === n)).filter(Boolean).map(d => {
  const size = Math.max(1.5, d.h * 0.6 + 0.9), k = d.h * 0.42 / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2;
  return { model: d.model, x: d.x - k, z: d.z - k, size };
});
const ease = u => u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
let n = 0; const marks = [];
for (let s = 0; s < stops.length; s++) {
  const A = stops[s], B = stops[s + 1];
  marks.push(A.model + ':' + n);
  for (let i = 0; i < HOLD * +fps; i++) {                         // held, zooming in a little
    const u = i / (HOLD * +fps);
    await p.evaluate(([x, z, size]) => { const f = window.__farm; f.step(1 / 30, 1); f.lookAt(x, z, size); f.draw(); }, [A.x, A.z, A.size * (1.06 - 0.12 * u)]);
    await p.evaluate(dt => { const f = window.__farm; f.step(1 / 30, Math.max(0, Math.round(dt * 30) - 1)); f.water(100 + performance.now() / 1000); f.wind(100 + performance.now() / 1000); }, 1 / +fps);
    await p.screenshot({ path: `${out}_${String(n++).padStart(4, '0')}.png`, timeout: 120000 });
  }
  if (!B) break;
  for (let i = 0; i < GLIDE * +fps; i++) {                        // gliding to the next, a little wider in the middle
    const u = ease((i + 1) / (GLIDE * +fps)), wide = 1 + 0.35 * Math.sin(u * Math.PI);
    const x = A.x + (B.x - A.x) * u, z = A.z + (B.z - A.z) * u, size = (A.size * 0.94 + (B.size * 1.06 - A.size * 0.94) * u) * wide;
    await p.evaluate(([x, z, size, dt]) => { const f = window.__farm; f.step(1 / 30, Math.max(1, Math.round(dt * 30))); f.lookAt(x, z, size); f.draw(); }, [x, z, size, 1 / +fps]);
    await p.screenshot({ path: `${out}_${String(n++).padStart(4, '0')}.png`, timeout: 120000 });
  }
}
console.log('frames', n, 'errors', errs, marks.join(' | '));
await b.close();

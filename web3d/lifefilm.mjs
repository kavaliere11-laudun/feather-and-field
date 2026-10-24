// A film of the life round the decorations: node lifefilm.mjs OUTDIR [fps]  (DSF, PORT; SHOTS=bees,butterflies,... to pick)
// The bees at the hives, the butterflies over the flower bed, a bird's bath, the cockerel's glints, a tap on the bandstand,
// the ducks going into their house at dusk (sped up) and out again in the morning. Prints where each shot starts.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'lf', fps = '12'] = process.argv.slice(2), FPS = +fps;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 1.5) });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0${process.env.EXTRA || ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #replaybtn, #farmerbtn, #foxbtn, #tag, #henbtns, #dogbtn { display: none !important; }' });
await p.evaluate(() => {
  const f = window.__farm; f.pause(true); f.setHour(14); for (let i = 0; i < 60; i++) f.step(1 / 30, 3);
  const D = f.ducks(); window.__night = false; D.night = () => window.__night;
  // where to look for each decoration: its middle at a height, brought down to the ground along the line of sight
  window.__at = (model, up = 0.45) => { const d = f.decor().find(q => q.model === model), c = new f.THREE.Vector3(); d.box.getCenter(c); const h = d.box.max.y * up; c.y = 0; c.applyMatrix4(d.m); const k = h / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2; return [c.x - k, c.z - k]; };
});
let n = 0; const marks = [];
async function shot(name, o) {
  marks.push(name + ':' + n);
  await p.evaluate(o => { const f = window.__farm; if (o.hour !== undefined) f.setHour(o.hour); if (o.night !== undefined) window.__night = o.night; if (o.pre) for (let i = 0; i < o.pre * 10; i++) f.step(1 / 30, 3); }, o);
  if (o.until) await p.evaluate(src => { const f = window.__farm, ok = new Function('f', 'return ' + src); for (let i = 0; i < 3000 && !ok(f); i++) f.step(1 / 30, 1); }, o.until);
  const frames = Math.round(o.secs * FPS);
  for (let i = 0; i < frames; i++) {
    const u = i / frames;
    await p.evaluate(([o, u, dt]) => {
      const f = window.__farm, [x, z] = o.at ? o.at : window.__at(o.look, o.up), size = o.size * (1.04 - 0.08 * u);
      if (o.each) new Function('f', 'u', o.each)(f, u);
      f.step(1 / 30, Math.max(1, Math.round(dt * 30 * (o.speed || 1)))); f.lookAt(x + (o.dx || 0), z + (o.dz || 0), size); f.draw();
    }, [o, u, 1 / FPS]);
    await p.screenshot({ path: `${out}/f_${String(n++).padStart(4, '0')}.png`, timeout: 120000 });
  }
}
const H = await p.evaluate(() => { const D = window.__farm.ducks(); return D.house ? { top: D.house.top, foot: D.house.foot } : null; });
const pick = (process.env.SHOTS || 'bees,butterflies,bath,cockerel,bandstand,dusk,morning').split(',');
if (pick.includes('bees')) await shot('bees', { look: 'beehives', up: 0.35, size: 2.3, secs: 4.5, hour: 14, pre: 2 });
if (pick.includes('butterflies')) await shot('butterflies', { look: 'flowers', up: 0.3, size: 1.5, secs: 4.5 });
if (pick.includes('bath')) await shot('bath', { look: 'birdbath', up: 0.55, size: 1.25, secs: 9, until: `f.decorLife().bath.list.some(b => b.st === 'in' && b.t < 1.2)` });
if (pick.includes('cockerel')) await shot('cockerel', { look: 'statue', up: 0.5, size: 2.4, secs: 4, each: `if (Math.abs(u - 0.12) < 0.01 || Math.abs(u - 0.6) < 0.01) f.decorLife().glintIn = 0;` });
if (pick.includes('bandstand')) await shot('bandstand', { look: 'bandstand', up: 0.5, size: 4.4, secs: 5, each: `if (u === 0) f.decorLife().play();` });
if (H && pick.includes('dusk')) {
  const mid = [(H.top[0] + H.foot[0]) / 2, (H.top[1] + H.foot[1]) / 2];
  await shot('dusk', { at: mid, size: 2.3, secs: 15, hour: 19.9, night: true, speed: 2.4, until: `(d => Math.hypot(d.pos.x - f.ducks().house.foot[0], d.pos.z - f.ducks().house.foot[1]) < 1.4)(f.ducks().ducks[2])` });          // (from when Dot, the first in, is nearly there)
  await shot('morning', { at: mid, size: 2.3, secs: 8, hour: 7.1, night: false, speed: 2.5, pre: 0.2 });
}
console.log('frames', n, 'errors', errs, marks.join(' | '));
await b.close();

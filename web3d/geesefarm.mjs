// Frames of the geese on the farm, the camera gently following them: node geesefarm.mjs OUT [seconds] [fps] [skip] [hour]
// (skip: seconds of their day run first, not filmed; SIZE: the view's size; W, H, DPR: the picture)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'gfm', secs = '10', fpsArg = '10', skip = '0', hour = '10'] = process.argv.slice(2);
const FPS = +fpsArg, PER = Math.round(30 / FPS);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 402), height: +(process.env.H || 874) }, deviceScaleFactor: parseFloat(process.env.DPR || '2'), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&geese&time=${hour}` + (process.env.LANG === 'fr' ? '&lang=fr' : ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top { display: none !important; }' });
await p.evaluate((skip) => { const f = window.__farm; f.pause(true); f.step(1 / 30, Math.round(skip * 30)); }, +skip);
// HOUR=h: the clock set to that hour once loaded; WET=1: on until she's wading in; BED=1: on until she's nearly in bed
if (process.env.HOUR) await p.evaluate((h) => window.__farm.setHour(h), +process.env.HOUR);
if (process.env.BED) await p.evaluate((r) => { window.BEDR = r; const f = window.__farm, F = f.geese(), G = F.geese[0]; for (let i = 0; i < 30 * 400; i++) { f.step(1 / 30, 1); if (Math.hypot(G.pos.x - F.bed[0][0], G.pos.z - F.bed[0][1]) < +(window.BEDR || 1.1)) break; } }, process.env.BED);
// UNTIL=name: then on until Gertrude's doing that (her task's name), less LEAD seconds
if (process.env.UNTIL) console.log('found at', await p.evaluate(([re, lead]) => {
  const f = window.__farm, G = f.geese().geese[0], hist = [];
  for (let i = 0; i < 30 * 60 * 20; i++) { f.step(1 / 30, 1); if (G.task && new RegExp(re).test(G.task.name)) break; }
  return [G.task && G.task.name, +G.pos.x.toFixed(2), +G.pos.z.toFixed(2)];
}, [process.env.UNTIL, 0]));
if (process.env.WET) await p.evaluate(() => { const f = window.__farm, G = f.geese().geese[0]; for (let i = 0; i < 30 * 120; i++) { f.step(1 / 30, 1); if (G.wet > 0.02) break; } f.step(1 / 30, 15); });
let n = 0; const log = [];
for (let i = 0; i < +secs * FPS; i++) {
  const s = await p.evaluate(([per, size]) => {
    const f = window.__farm, F = f.geese(), c = F.centre(new f.THREE.Vector3()); f.step(1 / 30, per);
    window.__cam = window.__cam || [c.x, c.z]; const k = Math.min(1, 0.03 * per); window.__cam[0] += (c.x - window.__cam[0]) * k; window.__cam[1] += (c.z - window.__cam[1]) * k;
    f.lookAt(window.__cam[0] + 0.3, window.__cam[1] + 0.3, size); f.draw();
    return F.geese.map(g => g.act + (g.wet > 0.5 ? '~' : '')).join(' / ');
  }, [PER, +(process.env.SIZE || 1.6)]);
  log.push(s);
  await p.screenshot({ path: `${out}_${String(n++).padStart(4, '0')}.png`, timeout: 120000 });
}
console.log('frames', n, 'errors', errs, [...new Set(log)].join(' | '));
await b.close();

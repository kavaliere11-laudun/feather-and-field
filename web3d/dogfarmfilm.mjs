// Frames of Biscuit on the farm, the view following him: node dogfarmfilm.mjs OUT [secs] [fps] [hour] [what] [skip]
// (what: what he does next: rounds, nap, meal, ball, play, watch, geese; skip: seconds run before filming; SIZE the view;
// GEESE=1 frames the geese too; HOUR=21.45 sets the clock to any time, HOUR2 at AT seconds into the film; LANG=fr; NOHINT hides the messages)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'dff', secs = '10', fpsArg = '10', hour = '10', what = '', skip = '0'] = process.argv.slice(2);
const FPS = +fpsArg, PER = Math.round(30 / FPS);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: parseFloat(process.env.DPR || '2'), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&dog&time=${hour}` + (process.env.LANG === 'fr' ? '&lang=fr' : '') + (process.env.QS ? '&' + process.env.QS : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#readout, .top, #foxbtn, #farmerbtn' + (process.env.NOHINT ? ', #hint, #tag' : '') + ' { display: none !important; }' });
await p.evaluate(([what, skip, hourSet]) => {
  const f = window.__farm, D = f.dog(); f.pause(true); if (hourSet) { f.setHour(hourSet); D.placed = false; D.bedtime = false; D.asleep = false; D.dog.task = null; D.dog.todo = []; }
  if (what) { D.force = what; D.dog.task = null; D.dog.todo = []; D.geeseIn = 0; D.mealIn = 0; }
  f.step(1 / 30, Math.round(skip * 30));
}, [what, +skip, +(process.env.HOUR || 0)]);
const log = [];
for (let n = 0; n < +secs * FPS; n++) {
  const s = await p.evaluate(([per, size, geese, switchTo]) => {
    const f = window.__farm, D = f.dog(), d = D.dog; if (switchTo) f.setHour(switchTo); f.step(1 / 30, per);
    let x = d.pos.x, z = d.pos.z, sz = size;
    if (geese) { const G = f.geese().geese[0], dd = Math.hypot(G.pos.x - x, G.pos.z - z); if (dd < 8) { x = (x + G.pos.x) / 2; z = (z + G.pos.z) / 2; sz = Math.max(size, dd * 0.6 + 0.8); } }
    window.__cam = window.__cam || [x, z, sz]; const k = Math.min(1, 0.06 * per);
    window.__cam[0] += (x - window.__cam[0]) * k; window.__cam[1] += (z - window.__cam[1]) * k; window.__cam[2] += (sz - window.__cam[2]) * k;
    f.lookAt(window.__cam[0] - 0.24, window.__cam[1] - 0.24, window.__cam[2]); f.draw();
    const t = d.task ? (d.task.cur ? (d.task.cur().cur ? d.task.cur().cur() : d.task.cur()).name : d.task.name) : '';
    return (D.doing || '') + ':' + t + (D.asleep ? ' z' : '') + ' ' + D.ball.state;
  }, [PER, +(process.env.SIZE || 1.8), !!process.env.GEESE, n === Math.round(+(process.env.AT || -1) * FPS) ? +process.env.HOUR2 : 0]);
  log.push(s);
  await p.screenshot({ path: `${out}_${String(n).padStart(4, '0')}.png`, timeout: 120000 });
}
console.log('frames', +secs * FPS, 'errors', errs, [...new Set(log)].join(' | '));
await b.close();

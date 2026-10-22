// Phone-size pictures of a night visit: node visitshot.mjs OUT [plot]  (LANG=fr for French, DPR=2)
// OUT_feather.png: Rusty sitting after the peck, a feather on his nose, "Send the farmer" showing;
// OUT_shoo.png: the torch on him, "Shoo! Off you go, Rusty!"; OUT_shut.png: a shut door, "The door is shut!".
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'vshot', plot = '5'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const lang = process.env.LANG === 'fr' ? '&lang=fr' : '';
async function page(extra = '') {
  const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: parseFloat(process.env.DPR || '2'), hasTouch: true, isMobile: true });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coops=10&visit=${plot}${lang}${extra}`);
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  await p.addStyleTag({ content: '#readout, #hint { display: none !important; } #tag { transition: none !important; }' });
  await p.evaluate(() => window.__farm.pause(true));
  return p;
}
// run until a condition on the visit holds (then a few more frames), and frame the camera on Rusty (and the torch)
const until = (p, cond, more, size, withTorch) => p.evaluate(([cond, more, size, withTorch]) => {
  const f = window.__farm, V = f.visit(), test = new Function('V', 'task', 'return ' + cond);
  for (let k = 0; k < 20000; k++) { f.step(1 / 30, 1); const t = V.fox.task && V.fox.task.cur ? V.fox.task.cur() : V.fox.task; if (test(V, t ? t.name : '')) break; }
  for (let k = 0; k < more; k++) f.step(1 / 30, 1);             // a frame at a time, so labels live their own time
  let x = V.fox.pos.x, z = V.fox.pos.z;
  if (withTorch) { x = x * 0.6 + V.torch.pos.x * 0.4; z = z * 0.6 + V.torch.pos.y * 0.4; }
  f.lookAt(x - 0.15, z + 0.25, size); f.draw();
  return V.phase + ' ' + (V.fox.task ? V.fox.task.name : '');
}, [cond, more, size, withTorch]);

let p = await page();
console.log('feather', await until(p, "V.phase === 'again' && task === 'sneeze'", 52, 1.9));
await p.waitForTimeout(600); await p.screenshot({ path: out + '_feather.png' });
console.log('shoo', await p.evaluate(() => { document.getElementById('farmerbtn').click(); return 'sent'; }));
console.log('shine', await until(p, "V.state === 'fleeing'", 8, 3.2, true));
await p.waitForTimeout(600); await p.screenshot({ path: out + '_shoo.png' });
console.log('errors', p.errs); await p.close();

p = await page();
await p.evaluate(() => { const f = window.__farm; for (const pl of f.plots) if (pl.door) f.setDoor(pl, false); f.step(1 / 30, 60); });
console.log('shut', await until(p, "V.phase === 'shutDoor' && task === 'scratch'", 90, 2.2));
await p.waitForTimeout(600); await p.screenshot({ path: out + '_shut.png' });
console.log('errors', p.errs); await p.close();
await b.close();

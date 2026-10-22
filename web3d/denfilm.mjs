// A strip of pictures of the foxes coming out of their den and going back in, from the game's camera, close up:
// node denfilm.mjs OUT [size] [every]  (writes OUT_out_NN.png while they come out, OUT_in_NN.png going in; HOUR=16)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'denfilm', size = '1.25', every = '9'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 260 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&foxes&time=' + (process.env.HOUR || '16'));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); });
const at = (n, size) => p.evaluate(([n, size]) => {
  const f = window.__farm, F = f.foxes(), [x, z, h] = F.den;
  f.step(1 / 30, n); f.lookAt(x + Math.sin(h) * 0.55, z + Math.cos(h) * 0.55, size); f.step(1 / 30, 1); f.draw();
  return F.foxes.map(o => (o.root.visible ? o.name[0] : '-') + (o.task ? o.task.name : '')).join(' ');
}, [n, size]);
for (let i = 0; i < 24; i++) { const s = await at(i ? +every : 1, +size); await p.screenshot({ path: `${out}_out_${String(i).padStart(2, '0')}.png` }); if (process.env.V) console.log(i, s); }
await p.evaluate(() => { const f = window.__farm, F = f.foxes(); f.step(1 / 30, 300); F.goHome(); });
for (let i = 0; i < 24; i++) { const s = await at(i ? +every : 1, +size); await p.screenshot({ path: `${out}_in_${String(i).padStart(2, '0')}.png` }); if (process.env.V) console.log(i, s); }
await b.close();

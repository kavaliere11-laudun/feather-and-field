// Biscuit's faces close up, one picture each (the line-up's first dog cycles through them, beasts.js MOODS): node
// dogmoods.mjs OUT_prefix [size] [heading]   (OUT_0.png ... OUT_5.png: look, puzzled, happy, pleading, intent, sleepy)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'mood', size = '0.42', heading = '-0.5'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&lineup=dog' + (process.env.QS ? '&' + process.env.QS : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); for (const o of f.foxLineup().foxes.slice(1)) { o.root.visible = false; o.shadow.visible = false; } });
let t = 0;
for (let k = 0; k < 6; k++) {
  const want = 2.5 * k + 1.9;
  const mood = await p.evaluate(([n, h, sz]) => {
    const f = window.__farm, T = f.THREE, d = f.foxLineup().foxes[0];
    for (let i = 0; i < n; i++) { d.heading = h; f.step(1 / 30, 1); for (const o of f.foxLineup().foxes.slice(1)) { o.root.visible = false; o.shadow.visible = false; } }
    const v = d.q.bones.head.getWorldPosition(new T.Vector3()), kk = v.y * 0.62 / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2;
    f.lookAt(v.x - kk, v.z - kk, sz); f.draw(); return d.mood;
  }, [Math.round((want - t) * 30), +heading, +size]);
  t = want;
  await p.screenshot({ path: `${out}_${k}.png`, timeout: 120000 });
  console.log(k, mood);
}
console.log('errors', errs);
await b.close();

// Frames of the dog line-up (?lineup=dog) at phone size, the page's own view or closer on one dog: node dogfilm.mjs OUT
// [secs] [fps] [which]   (which: a dog's number 0-5 to follow up close, SIZE the view; LANG=fr)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'df', secs = '6', fpsArg = '15', which = ''] = process.argv.slice(2);
const FPS = +fpsArg, PER = Math.round(30 / FPS);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: parseFloat(process.env.DPR || '2'), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&lineup=dog' + (process.env.LANG === 'fr' ? '&lang=fr' : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); });
for (let n = 0; n < +secs * FPS; n++) {
  await p.evaluate(([per, w, size]) => {
    const f = window.__farm, T = f.THREE; f.step(1 / 30, per);
    if (w !== '') {
      const d = f.foxLineup().foxes[+w], v = d.root.getWorldPosition(new T.Vector3());
      const k = 0.3 / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2;
      window.__c = window.__c || [v.x, v.z]; window.__c[0] += (v.x - window.__c[0]) * 0.15; window.__c[1] += (v.z - window.__c[1]) * 0.15;
      f.lookAt(window.__c[0] - k, window.__c[1] - k, size);
    }
    f.draw();
  }, [PER, which, +(process.env.SIZE || 0.9)]);
  await p.screenshot({ path: `${out}_${String(n).padStart(4, '0')}.png`, timeout: 120000 });
}
console.log('frames', +secs * FPS, 'errors', errs);
await b.close();

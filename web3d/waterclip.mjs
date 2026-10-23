// Frames of the moving water (and the wind) at one spot from the game's camera, the clock stepped exactly:
// node waterclip.mjs OUT x z [size] [secs] [fps] [hour]   (phone size; QS: more page options)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'wc', x = '-6.7', z = '-6.7', size = '4', secs = '6', fps = '24', hour = '14'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0' + (process.env.QS ? '&' + process.env.QS : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top, #farmerbtn, #replaybtn { display: none !important; }' });
await p.evaluate(([x, z, s, h]) => { const f = window.__farm; f.pause(true); f.setHour(h); f.step(1 / 30, 30); f.lookAt(x, z, s); }, [+x, +z, +size, +hour]);
for (let i = 0; i < +secs * +fps; i++) {
  await p.evaluate(([t, dt]) => { const f = window.__farm; f.water(100 + t); f.wind(100 + t); f.step(dt, Math.max(1, Math.round(dt * 30))); f.draw(); }, [i / +fps, 1 / +fps]);
  await p.screenshot({ path: `${out}_${String(i).padStart(4, '0')}.png`, timeout: 120000 });
}
console.log('frames', +secs * +fps, 'errors', errs);
await b.close();

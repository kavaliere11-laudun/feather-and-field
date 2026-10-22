// The inside view at both ends of its sideways look, and the badge close up: node insidepan.mjs [out]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'ipan'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&time=23');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 10); const pl = f.plots[0], w = new f.THREE.Vector3(-0.3, 0, 0.6); pl.frame.localToWorld(w);
  const k = 0.45 / Math.tan(42 * Math.PI / 180); f.lookAt(w.x - Math.SQRT1_2 * k, w.z - Math.SQRT1_2 * k, 4.4); f.step(1 / 30, 1); f.draw(); });
await p.screenshot({ path: `${out}_badge.png`, timeout: 240000 });
for (const [i, side] of [[0, -1], [0, 1], [4, -1]]) {
  await p.evaluate(([i, side]) => { const f = window.__farm; if (f.inside.open) return; f.openInside(f.plots[i]); }, [i, side]);
  await p.waitForTimeout(700);
  await p.evaluate((side) => { const f = window.__farm; f.inside.pan = side * 5; }, side);
  await p.mouse.move(200, 560); await p.mouse.down(); await p.mouse.move(200 - side * 20, 560, { steps: 3 }); await p.mouse.up();
  await p.evaluate(() => { const f = window.__farm; f.drawInside(); f.drawInside(); });
  await p.screenshot({ path: `${out}_${i}_${side > 0 ? 'right' : 'left'}.png`, timeout: 240000 });
  if (i === 0 && side > 0) { await p.evaluate(() => window.__farm.closeInside()); await p.waitForTimeout(700); }
}
await b.close();

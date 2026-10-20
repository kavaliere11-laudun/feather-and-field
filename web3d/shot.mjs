// Open the 3D test farm at iPhone size in headless Chromium (software 3D), wait, screenshot, and print what it drew.
// Usage: node shot.mjs URL out.png [waitMs]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'http://localhost:8770/index.html?details';
const out = process.argv[3] || 'shot.png';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
const t0 = Date.now();
await p.goto(url);
await p.waitForFunction(() => document.getElementById('loading') === null || document.getElementById('loading').classList.contains('done'), null, { timeout: 120000 });
console.log('loaded in', Date.now() - t0, 'ms');
await p.waitForTimeout(parseInt(process.argv[4] || '4000'));
await p.screenshot({ path: out });
const info = await p.evaluate(() => {
  const f = window.__farm; const i = f.renderer.info;
  return { q: f.quality(), fps: Math.round(f.meter.fps), tri: i.render.triangles, calls: i.render.calls, geos: i.memory.geometries, tex: i.memory.textures,
           readout: document.getElementById('readout').textContent };
});
console.log(JSON.stringify(info));
if (errs.length) console.log(errs.slice(0, 10).join('\n'));
await b.close();

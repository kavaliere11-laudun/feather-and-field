// triangles and draws at a few zooms on the line-up (phone size): node tricount.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 3 });
await p.goto('http://localhost:8770/index.html?q=0&lineup' + (process.env.QS || ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
for (const s of [1.2, 2.2, 3.0, 4.5, 6.5, 9]) {
  const r = await p.evaluate((s) => { const f = window.__farm; f.pause(true); const c = f.view.target.clone(); f.lookAt(c.x, c.z, s); f.draw(); const i = f.renderer.info.render; return { size: s, tris: i.triangles, calls: i.calls }; }, s);
  console.log(JSON.stringify(r));
}
await b.close();

// Pictures of the fourteen fish (?lineup=fish, src/fish.js), one each, framed to its length: ./withserver.sh node fishpics.mjs [OUT]
// (PORT; ONLY=rudd,perch: just those; W, H the picture's size in CSS pixels, 2x)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/fishpics', W = +(process.env.W || 420), H = +(process.env.H || 260);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup=fish&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top, #ui, .hud { display: none !important; }' });
const ids = await p.evaluate(() => window.__farm.fishLineup().fish.map(f => f.id));
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (let i = 0; i < ids.length; i++) {
  if (only && !only.includes(ids[i])) continue;
  await p.evaluate(i => { const f = window.__farm, T = f.THREE, L = f.fishLineup(), F = L.fish[i]; f.pause(true); L.update(0.4);
    const d = new T.Vector3(Math.sin(Math.PI / 4) * Math.cos(42 * Math.PI / 180), Math.sin(42 * Math.PI / 180), Math.cos(Math.PI / 4) * Math.cos(42 * Math.PI / 180)).normalize();
    const P = L.at(i), g = P.clone().addScaledVector(d, -P.y / d.y);
    f.lookAt(g.x, g.z, F.spec.L * 0.5); f.step(1 / 30, 2); f.draw(); }, i);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}_${ids[i]}.png`, timeout: 120000 });
}
console.log('errors', errs); await b.close();

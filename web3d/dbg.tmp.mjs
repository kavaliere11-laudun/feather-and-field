import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 } }); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`http://localhost:${process.env.PORT}/index.html?q=3&frogs&time=12:00`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
const r = await p.evaluate(() => { const f = window.__farm, F = f.frogs(); f.pause(true); F.o.near = () => []; F.loveIn = 1e9; const out = [];
  for (let i = 0; i < 30 * 60; i++) { f.step(1 / 30, 1); if (i % 90 === 0) { const h = F.her; const [s] = F.where(h.pos.x, h.pos.z); out.push([h.state, h.task && h.task.name, +s.toFixed(3), h.state === 'bank' ? !!F.lovePlan(h) : null]); } }
  return out; });
console.log(JSON.stringify(r));
await b.close();

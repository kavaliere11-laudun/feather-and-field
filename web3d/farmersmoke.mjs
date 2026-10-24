// A quick look at the farmer's day: node farmersmoke.mjs [hour] [mins]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' / ')));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&farmer${process.env.EXTRA || ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate(([hour, mins]) => {
  const f = window.__farm, L = f.farmer(); f.pause(true); f.setHour(hour);
  const out = [];
  for (let s = 0; s < mins * 60; s++) {
    f.step(1 / 30, 30);
    if (s % 10 === 0) out.push(`${s}s ${L.home ? 'home' : 'out'} ${L.task ? L.task.name : '-'} ${L.pos.x.toFixed(1)},${L.pos.z.toFixed(1)} sp${L.speed.toFixed(2)} said:${L.said.slice(-1)}`);
  }
  return out;
}, [+(process.env.HOUR || 14), +(process.env.MINS || 3)]);
console.log(r.join('\n')); console.log('errors', errs);
await b.close();

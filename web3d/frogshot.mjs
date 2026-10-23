// The frogs' line-up (?lineup=frogs) at phone size: node frogshot.mjs OUT [hour] [secs]   (SIZE: the view's half height)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'frogs.png', hour = '14', secs = '1'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGE ERROR', e.message, (e.stack || '').split('\n').slice(0, 3).join(' / ')); }); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) { errs.push(m.text().slice(0, 300)); console.log('CONSOLE', m.text().slice(0, 300)); } });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup=frogs`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top { display: none !important; }' });
await p.evaluate(([h, s, size]) => { const f = window.__farm; f.pause(true); f.setHour(h); f.step(1 / 30, Math.round(s * 30)); if (size) { f.view.size = size; } f.lookAt(f.view.target.x, f.view.target.z); f.draw(); }, [+hour, +secs, +(process.env.SIZE || 0)]);
await p.screenshot({ path: out, timeout: 120000 });
console.log('errors', errs);
await b.close();

// The river's jetty for Audrey (27 Nov 2026): the farm round it, then the farmer fishing from it, sideways.
// ./withserver.sh node riverpics.mjs FARM.json OUTDIR   (LANG2: the farm's language)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [FARM, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const farm = JSON.parse(fs.readFileSync(FARM, 'utf8'));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-GB' });
await ctx.addInitScript(([save, T]) => { if (!sessionStorage.getItem('w')) { localStorage.setItem('ff3d.farm', save); localStorage.setItem('ff3d.age', '{"b":"adult","by":"asked"}'); sessionStorage.setItem('w', '1'); } window.__T = T; Date.now = () => window.__T; }, [farm.save, farm.T]);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const go = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); window.__farm.pause(true); }); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30${process.env.LANG2 ? '&lang=' + process.env.LANG2 : ''}`, { waitUntil: 'domcontentloaded' }); await go();
await p.evaluate(l => { const g = window.__farm.game(); if (l) g.setLang(l); g.data.acctAsk = 1; if (g.fishBag) g.fishBag().worms = 20; g.save(); }, process.env.LANG2 || '');
await p.reload({ waitUntil: 'domcontentloaded' }); await go();
await p.addStyleTag({ content: '#hint { display: none !important; }' });
const step = n => p.evaluate(n => { const f = window.__farm; for (let i = 0; i < n; i++) { f.step(1 / 30, 1); if (i % 15 === 0) f.gameTick(window.__T += 500, false); } f.draw(); }, n);
const st = () => p.evaluate(() => { const F = window.__farm.fishing(); return F ? F.state : null; });
await p.evaluate(() => { const f = window.__farm, R = f.river(); f.lookAt(R.pos[0] + 2.2, R.pos[1] - 1.2, 5.5); }); await step(10);
await p.screenshot({ path: OUT + '/1-farm.png' });
await p.evaluate(() => { const f = window.__farm, R = f.river(); f.lookAt(R.pos[0], R.pos[1], 2.4); }); await step(5);
await p.screenshot({ path: OUT + '/2-jetty.png' });
await p.evaluate(() => window.__farm.riverCard()); await step(10);
await p.evaluate(() => { const b = document.querySelector('.gsheet button[data-fish=go]'); if (b) b.click(); });
for (let i = 0; i < 160; i++) { await step(30); await p.evaluate(() => { const b = document.querySelector('.gsheet button[data-fhelp=ok]'); if (b) b.click(); }); if (await st() === 'ready') break; }
await p.evaluate(() => { const f = window.__farm, R = f.river(); f.lookAt(R.stand[0] + Math.sin(R.face) * 0.9, R.stand[1] + Math.cos(R.face) * 0.9, 1.8); }); await step(4);
await p.screenshot({ path: OUT + '/3-ready.png' });
await p.evaluate(() => { const f = window.__farm, R = f.river(), F = f.fishing(), q = f.riverCast(R.stand[0] + Math.sin(R.face) * 2.2, R.stand[1] + Math.cos(R.face) * 2.2); return q && F.tapWater(q[0], q[1]); });
for (let i = 0; i < 60; i++) { await step(15); if (await st() === 'bite') break; }
await step(4); await p.screenshot({ path: OUT + '/4-bite.png' });
console.log('state', await st(), 'errors', JSON.stringify(errs));
await b.close();

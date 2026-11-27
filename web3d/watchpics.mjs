// "Watch them play" for Audrey (27 Nov 2026): a coop upgraded to Deluxe, its card, the tap, the view going in close on the
// bird who goes to the xylophone and plays. ./withserver.sh node watchpics.mjs FARM.json OUTDIR   (LANG2: the farm's language)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [FARM, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const farm = JSON.parse(fs.readFileSync(FARM, 'utf8'));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-GB' });
await ctx.addInitScript(([save, T]) => { if (!sessionStorage.getItem('w')) { localStorage.setItem('ff3d.farm', save); localStorage.setItem('ff3d.age', '{"b":"adult","by":"asked"}'); sessionStorage.setItem('w', '1'); } window.__T = T; Date.now = () => window.__T; }, [farm.save, farm.T]);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const go = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); window.__farm.pause(true); }); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:20${process.env.LANG2 ? '&lang=' + process.env.LANG2 : ''}`, { waitUntil: 'domcontentloaded' }); await go();
await p.evaluate(l => { const g = window.__farm.game(); if (l) g.setLang(l); const c = g.data.coops.find(x => x.breed === 'rir'); c.tier = 3; delete c.theme; g.data.coins = 50000; g.data.acctAsk = 1; g.save(); }, process.env.LANG2 || '');
await p.reload({ waitUntil: 'domcontentloaded' }); await go();
await p.addStyleTag({ content: '#hint { display: none !important; }' });
const run = secs => p.evaluate(s => { const f = window.__farm; for (let t = 0; t < s; t += 1 / 30) { f.step(1 / 30, 1); if ((t * 30 | 0) % 15 === 0) f.gameTick(window.__T += 500, false); } f.draw(); }, secs);
const i = await p.evaluate(() => window.__farm.gamePlots().findIndex(q => q.gc && q.gc.breed === 'rir'));
await p.evaluate(i => { const f = window.__farm, P = f.gamePlots()[i], w = P.frame.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 3.6); f.upgrade(i, true); }, i);
for (let k = 0; k < 12; k++) { await run(0.5); if ((await p.evaluate(() => window.__farm.gameUI().kind)) === 'upgraded') break; if ((await p.evaluate(() => window.__farm.gameUI().kind)) === 'levelup') await p.evaluate(() => window.__farm.gameUI().close()); }
await run(0.6); await p.screenshot({ path: OUT + '/1-card.png' });
await p.evaluate(() => document.querySelector('.gsheet .gupd-toys ~ .gbtn').click());
await run(0.8); await p.screenshot({ path: OUT + '/2-tap.png' });
for (let k = 0; k < 20; k++) { await run(0.5); const ph = await p.evaluate(() => { const f = window.__farm, w = f.watched(); const b = w && f.gamePlots().flatMap(q => q.birds).find(x => x.gid === w.gid); return b && b.play ? b.play.phase : null; }); if (ph && ph !== 'walk' && ph !== 'face') break; }
await run(1.2); await p.screenshot({ path: OUT + '/3-play.png' });
console.log('watched', JSON.stringify(await p.evaluate(() => window.__farm.watched())), 'errors', JSON.stringify(errs));
await b.close();

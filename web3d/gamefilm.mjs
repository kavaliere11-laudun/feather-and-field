// A film of the game's first moments: node gamefilm.mjs OUTDIR [fps]  (LANG=fr, DSF, PORT)
// A fresh phone: the welcome, choosing her and typing a name, "Start my farm"; the farm at the rustic Red Barn; a tap on
// the rooster (his card, the view gliding over), on each hen; the card closed and a look round the pen. Prints the marks.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'gf', fps = '12'] = process.argv.slice(2), FPS = +fps, fr = process.env.LANG === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB' });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let n = 0; const marks = [];
const shot = async () => p.screenshot({ path: `${out}/f_${String(n++).padStart(4, '0')}.png`, timeout: 120000 });
const hold = async (secs, each) => { for (let i = 0; i < secs * FPS; i++) { await p.evaluate(dt => { const f = window.__farm; if (f && f.pause) { f.step(1 / 30, Math.round(dt * 30)); f.draw(); } }, 1 / FPS); if (each) await each(i); await shot(); } };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0${process.env.TIME ? '&time=' + process.env.TIME : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.waitForTimeout(500);
marks.push('welcome:' + n);
for (let i = 0; i < 1.6 * FPS; i++) await shot();
await p.tap('.gwho .gchip:nth-child(2)');
for (let i = 0; i < 0.6 * FPS; i++) await shot();
await p.tap('#gname');
for (const ch of (process.env.NAME || 'Audrey')) { await p.keyboard.type(ch); await shot(); await shot(); }
for (let i = 0; i < 0.8 * FPS; i++) await shot();
await p.tap('.gsheet .gbtn');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 30); f.draw(); });
marks.push('farm:' + n);
await hold(3.2);
// a tap on the rooster: his card
const tapBird = async (kind, k = 0) => {
  const at = await p.evaluate(([kind, k]) => {
    const f = window.__farm, b = f.coopPlots()[0].birds.filter(x => x.kind === kind)[k];
    const v = b.root.getWorldPosition(new f.THREE.Vector3()); v.y += b.hitY * 0.8; v.project(f.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, name: b.name };
  }, [kind, k]);
  await p.touchscreen.tap(at.x, at.y);
  return at.name;
};
marks.push('rooster:' + n + ':' + await tapBird('rooster'));
await hold(4.2);
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.lookAt(f.view.target.x - 0.25, f.view.target.z - 0.25, 2.6); });
await hold(0.8);
marks.push('hen1:' + n + ':' + await tapBird('hen', 0));
await hold(3.6);
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.lookAt(f.view.target.x - 0.25, f.view.target.z - 0.25, 2.6); });
await hold(0.8);
marks.push('hen2:' + n + ':' + await tapBird('hen', 1));
await hold(3.6);
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); });
marks.push('end:' + n);
await hold(0.4);
for (let i = 0; i < 2.4 * FPS; i++) {                      // a slow pull back over the farm
  await p.evaluate(u => { const f = window.__farm; f.step(1 / 30, 3); f.lookAt(f.view.target.x, f.view.target.z, 2.6 + 3.2 * u * u * (3 - 2 * u)); f.draw(); }, (i + 1) / (2.4 * FPS));
  await shot();
}
await hold(1.2);
console.log('frames', n, 'errors', errs, marks.join(' | '));
await b.close();

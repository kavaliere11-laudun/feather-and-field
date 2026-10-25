// Pictures of the decorations on the farm (release 1 step 9d): node decshow.mjs OUTDIR   (LANG=fr; W, H)
// A farm at level 20 with eight fields: all eight bought and placed round the first coop, then a wide view and a close
// look at each.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || 'shots', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500); await run(0.5);
};
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = Math.round(60 * Math.pow(19, 2.1) + 5); g.data.coins = 200000; g.data.land = [0, 1, 2, 3, 4, 5, 6, 7]; g.data.lvSeen = g.level; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
const placed = [];
for (const id of ['flowers', 'birdbath', 'beehives', 'greenhouse', 'windmill', 'bandstand', 'statue', 'duckhouse']) {
  const r = await p.evaluate(id => { const f = window.__farm; if (id === 'duckhouse') return f.deco.buy(id); const ok = f.deco.start(id); if (!ok) return 'no start'; const s = f.deco.state(); return f.deco.place() ? s.at : 'no place ' + JSON.stringify(s); }, id);
  placed.push([id, r]); await run(0.3);
}
console.log(JSON.stringify(placed));
await run(3);
await p.evaluate(() => { const f = window.__farm, it = f.deco.items().filter(x => x.id !== 'duckhouse'); const cx = it.reduce((a, x) => a + x.at[0], 0) / it.length, cz = it.reduce((a, x) => a + x.at[1], 0) / it.length; f.lookAt(cx, cz, 9); });
await run(1); await p.screenshot({ path: `${OUT}/all.png` });
for (const x of await p.evaluate(() => window.__farm.deco.items())) {
  await p.evaluate(([x, z, id]) => window.__farm.lookAt(x + 0.3, z + 0.3, id === 'windmill' ? 5 : 3), [x.at[0], x.at[1], x.id]); await run(1.2);
  await p.screenshot({ path: `${OUT}/${x.id}.png` });
}
await b.close();

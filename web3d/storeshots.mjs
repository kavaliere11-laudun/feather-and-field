// The App Store's pictures on the showcase farm (showfarm.mjs's save): ./withserver.sh node storeshots.mjs FARM.json OUTDIR
// (ONLY=overview,coop; W, H: css px of the picture under its caption (874 x 326); DSF (4); HUD=1: the game's own buttons
// shown; PORT). The game itself (play.html), the late-morning light, the view set by hand (never the player's):
//   overview: the farm from above, its Deluxe coops in their gardens;
//   coop: one coop's Deluxe garden close up (COOP: its breed, sil), the birds at play.
// Each saved as OUTDIR/<name>.png at full size; storecompose.py puts its caption above it.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [FARM, OUT = '/tmp/claude-0/storeshots'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const farm = JSON.parse(fs.readFileSync(FARM, 'utf8'));
const W = +(process.env.W || 874), H = +(process.env.H || 326), DSF = +(process.env.DSF || 4), HUD = process.env.HUD === '1';
const ONLY = (process.env.ONLY || 'overview,coop').split(',');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
for (const name of ONLY) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, hasTouch: true, isMobile: true, locale: process.env.LOC || 'en-GB', timezoneId: 'Europe/London' });
  await ctx.addInitScript(([save, T]) => { if (!sessionStorage.getItem('show')) { localStorage.setItem('ff3d.farm', save); sessionStorage.setItem('show', '1'); } window.__T = T; Date.now = () => window.__T; }, [farm.save, farm.T]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=${process.env.TIME || '10:30'}${process.env.LANG2 ? '&lang=' + process.env.LANG2 : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
  await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); });
  if (!HUD) await p.addStyleTag({ content: '#hint, #tag, #foxbtn, #replaybtn, #farmerbtn, #henbtns, #compass, #findfarmer, .gbar, .gacts, .gguide, .gbub, .vignette { display: none !important; }' });
  const info = await p.evaluate(([name, coop, size, at]) => {
    const f = window.__farm, g = f.game(); f.pause(true); f.wind(3);
    const C = g.data.coops;
    if (name === 'overview') {
      const cx = at ? at[0] : C.reduce((a, c) => a + c.x, 0) / C.length, cz = at ? at[1] : C.reduce((a, c) => a + c.z, 0) / C.length;
      f.lookAt(cx, cz, size || 7); return { at: [cx, cz], coops: C.map(c => [c.breed, c.x, c.z]) };
    }
    const i = C.findIndex(c => c.breed === coop), c = C[i];
    f.lookAt(c.x + (at ? at[0] : 0), c.z + (at ? at[1] : 0), size || 1.7); window.__PI = i;
    return { coop: c.breed, at: [c.x, c.z] };
  }, [name, process.env.COOP || 'sil', +(process.env.SIZE || 0), process.env.AT ? process.env.AT.split(',').map(Number) : null]);
  for (let t = 0; t < +(process.env.SECS || 4); t += 1 / 15) await p.evaluate(() => { const f = window.__farm; f.step(1 / 30, 2); f.gameTick(Date.now(), false); });
  await p.evaluate(() => window.__farm.draw());
  await p.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 });
  console.log(name, JSON.stringify(info));
  await ctx.close();
}
console.log('errors', JSON.stringify(errs));
await b.close();

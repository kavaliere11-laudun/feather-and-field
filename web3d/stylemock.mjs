// The art style mocks (8 Nov 2026, Audrey: "I want a stylised art style but still high quality and polished. Smooth frame
// rates while scrolling around"): the same farm (mockfarm.mjs's save) in a look, from the same views, sideways on a phone:
// ./withserver.sh node stylemock.mjs FARM.json OUT [look ...]   (PORT; LOOKS as arguments: today, toon, clay, paint: ?look=NAME)
// Writes OUT/<look>_<view>.png (874 x 402 at 2x) and OUT/<look>_cost.json: triangles, draws, and the time to draw a frame
// while the view pans (the test browser draws in software: only a comparison between looks).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [FARM, OUT, ...LOOKS] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const farm = JSON.parse(fs.readFileSync(FARM, 'utf8'));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const look of LOOKS.length ? LOOKS : ['today']) {
  const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London' });
  await ctx.addInitScript(([save, T]) => { if (!sessionStorage.getItem('mock')) { localStorage.setItem('ff3d.farm', save); sessionStorage.setItem('mock', '1'); } window.__T = T; Date.now = () => window.__T; }, [farm.save, farm.T]);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const L = '&look=' + look;      // (today: the look before Storybook)
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=en${L}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); document.querySelectorAll('.gbar, .gside, #hint, .gbub, #tag, .gguide').forEach(e => e.style.visibility = 'hidden'); });
  const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } }, s);
  await run(2); await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
  const spots = await p.evaluate(() => { const f = window.__farm, g = f.game(), C = g.data.coops, G = g.data.garden, mid = C.reduce((a, c) => [a[0] + c.x / C.length, a[1] + c.z / C.length], [0, 0]); const orp = C.find(c => c.breed === 'orp') || C[0];
    return { farm: [mid[0], mid[1], 4.4], coop: [orp.x, orp.z, 1.9], house: [G.x, G.z, 3.0], wide: [mid[0], mid[1], 8] }; });
  for (const [name, [x, z, size]] of Object.entries(spots)) {
    await p.evaluate(([x, z, size]) => { const f = window.__farm; f.lookAt(x, z, size); }, [x, z, size]);
    await run(0.5);
    await p.evaluate(() => { const f = window.__farm; f.draw(); f.draw(); document.getAnimations().forEach(a => a.finish()); });
    await p.screenshot({ path: `${OUT}/${look}_${name}.png`, timeout: 180000 });
    console.log(look, name);
  }
  // the cost: the usual view, panning 0.4 m a frame (the shadows drawn again as it goes)
  const cost = await p.evaluate(([x, z]) => { const f = window.__farm, R = f.renderer; f.lookAt(x, z, 4.4); f.draw(); const k = f.costCats(), still = { tri: k.all.tri, calls: k.all.calls, grass: k.grass, birds: k.birds };
    const t0 = performance.now(); for (let i = 0; i < 12; i++) { f.lookAt(x + i * 0.4, z - i * 0.2, 4.4); f.draw(); } R.getContext().finish(); const pan = (performance.now() - t0) / 12;
    const t1 = performance.now(); for (let i = 0; i < 12; i++) f.draw(); R.getContext().finish(); const held = (performance.now() - t1) / 12;
    return { ...still, panMs: Math.round(pan), stillMs: Math.round(held) }; }, spots.farm);
  fs.writeFileSync(`${OUT}/${look}_cost.json`, JSON.stringify(cost));
  console.log(look, 'cost', JSON.stringify(cost), errs.length ? 'errors ' + JSON.stringify(errs) : '');
  await ctx.close();
}
await b.close();

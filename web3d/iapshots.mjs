// The review pictures for the in-app purchases (App Store Connect asks for one each): the coop's card with the money
// buttons, one a breed, at an iPhone's size (430x932 at 3x = 1290x2796). The app's shop stood in for (window.__fakeStore).
// ./withserver.sh node iapshots.mjs OUT [breed ...]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2], BREEDS = process.argv.slice(3).length ? process.argv.slice(3) : ['rir', 'orp', 'sil', 'leg', 'bra', 'pol', 'aya', 'pea', 'call'];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const BREED of BREEDS) {
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 3 });
  ctx.setDefaultTimeout(180000); ctx.setDefaultNavigationTimeout(180000);
  const T0 = new Date('2026-12-05T11:30:00+00:00').getTime();
  await ctx.addInitScript(t0 => { window.__T = t0; Date.now = () => window.__T;
    window.__fakeStore = { products: async o => ({ products: o.ids.map(id => ({ id, price: /\.all$/.test(id) ? '£9.99' : '£1.99' })) }), owned: async () => ({ ids: [] }), buy: async () => ({ state: 'cancelled', ids: [] }), restore: async () => ({ ids: [] }) }; }, T0);
  const p = await ctx.newPage();
  const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } f.draw(); }, s);
  const close = () => p.evaluate(() => window.__farm.gameUI().close());
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30${BREED === 'pea' ? '#big' : ''}`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.gsheet:not([hidden])');
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
  await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(30) + 5; g.data.lvSeen = g.level; for (let i = 0; i < (location.hash === '#big' ? 14 : 4); i++) { g.data.coins = 300000; f.buyLand(); for (let k = 0; k < 120; k++) { window.__T += 33; f.step(1 / 30, 1); f.gameTick(window.__T, false); } } g.data.coins = 3000; g.save(); f.gameUI().close(); });
  await run(2); await close();
  let ci = 0;
  if (BREED !== 'rir') { await p.evaluate(b => { const f = window.__farm; f.game().data.coins = 60000; f.place(b); f.move.place(); f.game().data.coins = 3000; f.game().save(); }, BREED); await run(2); await close(); ci = 1; }
  await p.evaluate(ci => window.__farm.coopCard(ci), ci); await run(0.3);
  await p.evaluate(() => { document.getElementById('hint').hidden = true; const t = document.querySelector('.gsheet:not([hidden]) .gtheme'); t.scrollIntoView({ block: 'start' }); });
  await p.waitForTimeout(900);
  const info = await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .gtheme button')].map(b => b.textContent));
  await p.locator('.gsheet:not([hidden])').screenshot({ path: `${OUT}/card_${BREED}.png` });
  console.log(BREED, JSON.stringify(info));
  await ctx.close();
}
await b.close();

// The review pictures for the other in-app purchases (App Store Connect asks for one each): the Coins shelf at each bag,
// the Breed Book at each rare trio and at the four together, the Pantry at its bigger shelves; an iPhone's size
// (430x932 at 3x = 1290x2796). The app's shop stood in for (window.__fakeStore). ./withserver.sh node iapshots2.mjs OUT
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 3 });
ctx.setDefaultTimeout(180000); ctx.setDefaultNavigationTimeout(180000);
await ctx.addInitScript(t0 => { window.__T = t0; Date.now = () => window.__T;
  const price = id => /coins\.purse$/.test(id) ? '£0.99' : /coins\.basket$/.test(id) ? '£2.99' : /coins\.sack$/.test(id) ? '£4.99' : /coins\.cart$|winter\.all$/.test(id) ? '£9.99' : /silkie\.all$/.test(id) ? '£19.99' : /silkie\./.test(id) ? '£6.99' : '£1.99';
  window.__fakeStore = { products: async o => ({ products: o.ids.map(id => ({ id, price: price(id) })) }), owned: async () => ({ ids: [] }), buy: async () => ({ state: 'cancelled', ids: [] }), restore: async () => ({ ids: [] }), pending: async () => ({ list: [] }), finish: async () => ({}) }; }, new Date('2026-12-05T11:30:00+00:00').getTime());
const p = await ctx.newPage();
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } f.draw(); }, s);
const close = () => p.evaluate(() => window.__farm.gameUI().close());
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])');
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
await run(0.5);
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(12) + 5; g.data.lvSeen = g.level; g.data.coins = 1250; g.data.pantry = { eggs: 21, val: 150, honey: 4, seen: true }; g.save(); f.gameUI().close(); document.getElementById('hint').style.display = 'none'; });
await run(2); await close();
const shot = async (name, sel, block = 'center') => { await p.evaluate(([sel, block]) => { const e = document.querySelector('.gsheet:not([hidden]) ' + sel); e.scrollIntoView({ block }); }, [sel, block]); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log(name); };
await p.evaluate(() => window.__farm.deco.shop()); await run(0.3);
await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .gchip')].find(c => c.dataset.tab === 'coins').click()); await run(0.3);
for (const bag of ['purse', 'basket', 'sack', 'cart']) await shot('bag_' + bag, `.giap[data-bag="${bag}"]`);
await close(); await p.evaluate(() => window.__farm.book()); await run(0.3); await p.waitForTimeout(1500);
await shot('trio_all', '.giap-all', 'start');
for (const l of ['paint', 'lavender', 'splash', 'cuckoo']) await shot('trio_' + l, `.gpage[data-breed="sil_${l}"]`, 'start');
await close(); await p.evaluate(() => window.__farm.pantrySheet()); await run(0.3);
await shot('shelves', '[data-shelves]');
await b.close();

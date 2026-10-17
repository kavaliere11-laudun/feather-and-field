import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-FR' })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
const info = await page.evaluate(() => window.__ffDebug.inside(g => { g.state.coins = 5000; g.state.xp = 2000; g.state.level = g.levelOf(2000); g.refreshShop(); return [g.state.level, g.state.shop.offers.map(o => o.breed).join(',')]; }));
console.log(info);
await page.locator('#tabbar button[data-tab="market"]').click(); await page.waitForTimeout(500);
await page.screenshot({ path: 'r/flt_1.png' });
const chips = page.locator('.chips .chip'); console.log('chips', await chips.allTextContents());
if (await chips.count() > 1) { await chips.nth(1).click(); await page.waitForTimeout(400); await page.screenshot({ path: 'r/flt_2.png' });
  console.log('cards shown', await page.locator('#sheetBody .card').count());
  // buy the first shown bird: filter should stay, and the index must be right
  const before = await page.evaluate(() => window.__ffDebug.inside(g => g.state.birds.length));
  const btn = page.locator('#sheetBody .card .btn:not([disabled])').first();
  const name = await page.locator('#sheetBody .card .name').first().textContent();
  if (await btn.count()) { await btn.click(); await page.waitForTimeout(500); }
  const after = await page.evaluate(() => window.__ffDebug.inside(g => g.state.birds.map(b => b.name)));
  console.log('bought', name, after.length - before, after.slice(-1));
  console.log('chips after', await page.locator('.chips .chip').allTextContents()); await page.screenshot({ path: 'r/flt_3.png' }); }
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();

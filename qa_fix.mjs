import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, locale: 'fr-FR' })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
// fill the basket with fertile eggs, like Audrey's farm
await page.evaluate(() => window.__ffDebug.inside(g => { for (let i = 0; i < 12; i++) { g.advance(3600e3); for (const c of g.state.coops) g.actCollect(c); if (g.current) g.closeSheet(); } }));
await page.waitForTimeout(500); if (await page.locator('#sheet').isVisible()) await page.locator('#sheetClose').click();
console.log(JSON.stringify(await page.evaluate(() => window.__ffDebug.inside(g => ({ basket: g.basketCount(), fertile: g.state.basket.fertile.length, plain: g.state.basket.plain.rir, nest: g.nestCount(g.state.coops[0]) })))));
await page.locator('#tabbar button[data-tab="hatch"]').click(); await page.waitForTimeout(600); await page.screenshot({ path: 'r/fix_hatch.png' });
await page.locator('#sheetBody').evaluate(el => el.scrollTop = 700); await page.waitForTimeout(300); await page.screenshot({ path: 'r/fix_hatch2.png' });
await page.getByRole('button', { name: /Tout vendre sauf/ }).click(); await page.waitForTimeout(500);
await page.locator('#sheetBody').evaluate(el => el.scrollTop = 0); await page.waitForTimeout(300); await page.screenshot({ path: 'r/fix_hatch3.png' });
await page.locator('#sheetClose').click();
await page.evaluate(() => window.__ffDebug.away(5)); await page.waitForTimeout(1500); await page.screenshot({ path: 'r/fix_away.png' });
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

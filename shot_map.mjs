import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2];
const browser = await chromium.launch(); const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}_start.png` });
await page.locator('#sheetClose').click(); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}_fresh.png` });
await page.evaluate(() => window.__ffDebug.rich()); await page.waitForTimeout(500);
if (await page.locator('#sheet').isVisible()) await page.locator('#sheetClose').click();
const p = await page.evaluate(() => window.__ffDebug.pond());
await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y, .3), p); await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}_out.png` });
await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y, .75), p); await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}_pond.png` });
for (const i of [0, 8, 20]) {
  const c = await page.evaluate(i => window.__ffDebug.slot(i), i);
  await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y, .7), c); await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}_slot${i}.png` });
}
await page.evaluate(() => window.__ffDebug.scroll(1)); await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}_bottom.png` });
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

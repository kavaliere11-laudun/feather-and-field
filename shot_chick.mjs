import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1000);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
await page.evaluate(() => window.__ffDebug.rich()); await page.waitForTimeout(300);
if (await page.locator('#sheet').isVisible()) await page.locator('#sheetClose').click();
for (const slot of [1, 2, 3]) {
  const c = await page.evaluate(i => window.__ffDebug.slot(i), slot);
  await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y - 40, 1.3), c); await page.waitForTimeout(1500);
  for (let k = 0; k < 3; k++) { await page.screenshot({ path: `r/chk_${slot}_${k}.png` }); await page.waitForTimeout(900); }
}
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
for (const i of [0, 1]) {
  const c = await page.evaluate(i => window.__ffDebug.slot(i), i);
  await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y, 1.1), c);
  for (let k = 0; k < 4; k++) { await page.waitForTimeout(2500); await page.screenshot({ path: `r/pen_${i}_${k}.png` }); }
  if (i === 0) { await page.evaluate(() => window.__ffDebug.rich()); await page.waitForTimeout(300); if (await page.locator('#sheet').isVisible()) await page.locator('#sheetClose').click(); }
}
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

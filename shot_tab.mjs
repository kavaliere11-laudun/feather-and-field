import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2];
const browser = await chromium.launch();
const errors = [];
for (const [nm, vp, scheme] of [['tab', { width: 1180, height: 820 }, 'light'], ['dark', { width: 390, height: 844 }, 'dark'], ['tabp', { width: 820, height: 1180 }, 'light']]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true, colorScheme: scheme });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}_${nm}_welcome.png` });
  await page.locator('#sheetClose').click();
  await page.evaluate(() => window.__ffDebug.rich()); await page.waitForTimeout(500);
  if (await page.locator('#sheet').isVisible()) await page.locator('#sheetClose').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}_${nm}_farm.png` });
  await page.locator('#tabbar button[data-tab="market"]').click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}_${nm}_market.png` });
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no errors');

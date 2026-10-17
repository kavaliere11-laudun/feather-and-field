// A brand new farm: first screen, a little play at test speed, then 30 hours away.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}_welcome.png` });
await page.locator('.btn').last().click(); await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}_start.png` });
await page.evaluate(() => window.__ffDebug.speed(60)); await page.waitForTimeout(25000);
await page.screenshot({ path: `${out}_played.png` });
const pts = await page.evaluate(() => window.__ffDebug.points());
await page.touchscreen.tap(...pts.coop0); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}_coop.png` });
console.log(JSON.stringify(await page.evaluate(() => window.__ffDebug.view())));
// pretend we were away 30 hours
await page.evaluate(() => { window.__ffDebug.speed(1); });
await page.waitForTimeout(6000);
await page.locator('#sheetClose').click(); await page.evaluate(() => window.__ffDebug.away(30)); await page.waitForTimeout(4000);
await page.screenshot({ path: `${out}_away.png` });
console.log(JSON.stringify(await page.evaluate(() => window.__ffDebug.view())));
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no errors');

import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
for (const loc of ['fr-FR', 'en-GB']) {
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
await page.locator('#tabbar button[data-tab="market"]').click(); await page.waitForTimeout(300);
await page.locator('.seg button').nth(1).click(); await page.waitForTimeout(500);
await page.screenshot({ path: `r/feedbtn_${loc.slice(0,2)}.png`, clip: { x: 0, y: 200, width: 402, height: 420 } });
}
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

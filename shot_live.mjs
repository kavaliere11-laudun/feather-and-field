import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
await page.locator('#flockBtn').click(); await page.waitForTimeout(500);
await page.locator('#sheetBody .item').first().click(); await page.waitForTimeout(300);
for (let k = 0; k < 10; k++) { await page.locator('.portrait.live').screenshot({ timeout: 5000, path: `r/live_${k}.png` }); if (0) await page.locator('.portrait.live').screenshot({ path: `r/live_${k}.png` }); await page.waitForTimeout(450); }
console.log('frames', await page.locator('.portrait.live img').count());
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

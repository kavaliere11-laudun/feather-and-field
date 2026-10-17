import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-FR' })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(500);
await page.evaluate(() => window.__ffDebug.inside(g => { g.state.coins = 1000; })); await page.waitForTimeout(300);
const signs = await page.evaluate(() => window.__ffDebug.signs()); console.log(JSON.stringify(signs));
const sg = signs.find(s => s[0] === 'sale' && s[2] > 100 && s[2] < 780);
if (sg) { await page.touchscreen.tap(sg[1], sg[2]); await page.waitForTimeout(500); console.log('errors so far', JSON.stringify(errors), await page.locator('#sheet').isVisible()); await page.screenshot({ path: 'r/ux_3_salesign.png' });
  await page.getByRole('button', { name: /Acheter le terrain/ }).click(); await page.waitForTimeout(600); await page.screenshot({ path: 'r/ux_3b_after.png' }); await page.locator('#sheetClose').click(); }
await page.locator('#coinPill').click(); await page.waitForTimeout(400); await page.screenshot({ path: 'r/ux_4_coinpill.png' }); await page.locator('#sheetClose').click();
await page.locator('#lvlPill').click(); await page.waitForTimeout(400); await page.locator('#sheetBody').evaluate(el => el.scrollTop = 600); await page.waitForTimeout(300); await page.screenshot({ path: 'r/ux_5_awards.png' }); await page.locator('#sheetClose').click();
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();

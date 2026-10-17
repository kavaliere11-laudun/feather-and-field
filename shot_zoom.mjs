import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click();
await page.evaluate(() => window.__ffDebug.rich()); await page.waitForTimeout(400);
if (await page.locator('#sheet').isVisible()) await page.locator('#sheetClose').click();
const c = await page.evaluate(() => window.__ffDebug.slot(0));
await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y - 40, 1.5), c);
await page.waitForTimeout(3000);
for (let i = 0; i < 6; i++) { await page.screenshot({ path: `${out}_z${i}.png`, clip: { x: 0, y: 200, width: 390, height: 420 } }); await page.waitForTimeout(160); }
const p = await page.evaluate(() => window.__ffDebug.pond());
await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y, 1.0), p);
await page.waitForTimeout(2500);
for (let i = 0; i < 3; i++) { await page.screenshot({ path: `${out}_p${i}.png` }); await page.waitForTimeout(900); }
await page.evaluate(() => { window.__ffDebug.grades(true); });
await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y + 300, 0.49), c);
await page.waitForTimeout(800); await page.screenshot({ path: `${out}_gz.png` });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no errors');

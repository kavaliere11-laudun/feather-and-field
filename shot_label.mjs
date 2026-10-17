import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1500);
await page.locator('.btn').last().click(); await page.waitForTimeout(500);
await page.evaluate(() => window.__ffDebug.hatch()); await page.waitForTimeout(1500);
const c = await page.evaluate(() => window.__ffDebug.slot(0));
for (const [i, s] of [[0, 1.4], [1, .49]]) { await page.evaluate(([x, y, s]) => window.__ffDebug.zoomTo(x, y + 20, s), [...c, s]); await page.waitForTimeout(4000); await page.screenshot({ path: `r/lab${i}.png` }); }
await browser.close(); console.log(errors.join('\n') || 'no errors');

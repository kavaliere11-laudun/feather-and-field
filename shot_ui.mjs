// Walk through the main sheets on a phone and check taps on the map land on the right things.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2] || 'r/ui';
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto('' + (process.env.URL || 'http://localhost:8765/index.html') + '');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}_welcome.png` });
await page.locator('#sheetClose').click();
await page.evaluate(() => window.__ffDebug.rich());
await page.waitForTimeout(1500);
// tap the first coop's pen and a bird, using map coordinates turned into screen coordinates
const pts = await page.evaluate(() => window.__ffDebug.points());
const tap = async ([x, y]) => { await page.touchscreen.tap(x, y); await page.waitForTimeout(700); };
await tap(pts.coop0); await page.screenshot({ path: `${out}_coop.png` });
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
const pts2 = await page.evaluate(() => window.__ffDebug.points());
await tap(pts2.bird); await page.screenshot({ path: `${out}_bird.png` });
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
await page.locator('#tabbar button[data-tab="market"]').click(); await page.waitForTimeout(600);
await page.screenshot({ path: `${out}_market.png` });
const build = page.locator('.seg button').nth(1); if (await build.count()) { await build.click(); await page.waitForTimeout(800); }
await page.screenshot({ path: `${out}_build.png` });
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
// drag and pinch
await page.mouse.move(200, 500); await page.mouse.down(); await page.mouse.move(200, 200, { steps: 8 }); await page.mouse.up();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}_dragged.png` });
console.log(JSON.stringify(await page.evaluate(() => ({ s: window.__ffDebug.view() }))));
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no errors');

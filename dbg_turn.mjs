import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => console.log('console', m.text()));
await page.goto(process.env.URL); await page.waitForTimeout(1000);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
console.log(await page.evaluate(() => { const d = window.__ffDebug; d.turnAt(.5); return JSON.stringify(typeof d.turnAt); }));
await page.waitForTimeout(50);
for (let i = 0; i < 4; i++) { console.log(JSON.stringify(await page.evaluate(() => window.__ffDebug.turnInfo()))); await page.waitForTimeout(100); }
await browser.close(); console.log(errors.join('\n'));

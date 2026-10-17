import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1000);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
for (const [slot, ci] of [[0, 0]]) {
  const c = await page.evaluate(i => window.__ffDebug.slot(i), slot);
  await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y - 40, 1.25), c); await page.waitForTimeout(600);
  await page.evaluate(() => window.__ffDebug.quiet());
  console.log('before', JSON.stringify(await page.evaluate(i => window.__ffDebug.eggs(i), ci)));
  console.log('lay', JSON.stringify(await page.evaluate(i => window.__ffDebug.lay(i), ci)));
  for (let k = 0; k < 10; k++) { await page.waitForTimeout(1100); await page.screenshot({ path: `r/lay_${k}.png` }); console.log(k, JSON.stringify(await page.evaluate(i => window.__ffDebug.eggs(i), ci))); }
}
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

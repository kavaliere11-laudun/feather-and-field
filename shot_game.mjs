// Screenshot the game at phone and tablet sizes. Usage: node shot_game.mjs OUTPREFIX [scenario]
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2] || 'g', scen = process.argv[3] || 'start';
const browser = await chromium.launch();
const sizes = [['phone', 390, 844, 3], ['tablet', 820, 1180, 2]];
const errors = [];
for (const [name, w, h, dpr] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: true, isMobile: name === 'phone' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(name + ': ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
  await page.goto('' + (process.env.URL || 'http://localhost:8765/index.html') + '');
  await page.waitForTimeout(1500);
  if (scen !== 'welcome') {
    // dismiss the welcome sheet
    const close = page.locator('#sheetClose'); if (await close.isVisible()) await close.click();
  }
  if (scen === 'rich') {
    await page.evaluate(() => window.__ffDebug && window.__ffDebug.rich());
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}_${name}.png` });
  if (scen === 'rich') {
    await page.evaluate(() => window.__ffDebug && window.__ffDebug.scroll(0.55));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}_${name}_mid.png` });
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no errors');

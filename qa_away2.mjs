import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2);
  const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
  await page.evaluate(() => window.__ffDebug.inside(g => { for (const b of g.state.birds) if (b.pers === 'rebel') b.nextOut = g.state.gt + 3600e3; g.state.fox.next = g.state.gt; }));
  await page.evaluate(() => window.__ffDebug.away(40)); await page.waitForTimeout(1500);
  await page.screenshot({ path: `r/pers_${tag}_away.png` });
}
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

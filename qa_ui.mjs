// QA: a new player's first hours, screen by screen, at phone size. Usage: URL=... LANG=fr node qa_ui.mjs OUTPREFIX
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2] || 'r/qa';
const browser = await chromium.launch(); const errors = [];
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: process.env.LANG === 'fr' ? 'fr-FR' : 'en-GB' });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1500);
let n = 0; const shot = async name => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}_${String(++n).padStart(2, '0')}_${name}.png` }); };
const closeSheet = async () => { if (await page.locator('#sheet').isVisible()) { await page.locator('#sheetClose').click(); await page.waitForTimeout(300); } };
await shot('welcome');
await page.locator('#sheetBody').evaluate(el => el.scrollTop = 2000); await shot('welcome_end');
await closeSheet(); await shot('farm_start');
// three hours later
await page.evaluate(() => window.__ffDebug.inside(g => { g.advance(20 * 3600e3); }));
await page.waitForTimeout(800); await closeSheet(); await shot('farm_3h');
const pts = await page.evaluate(() => window.__ffDebug.points());
await page.touchscreen.tap(...pts.coop0); await shot('coop_sheet');
await page.locator('#sheetBody').evaluate(el => el.scrollTop = 700); await shot('coop_sheet2');
await page.locator('#sheetBody').evaluate(el => el.scrollTop = 3000); await shot('coop_sheet3');
await closeSheet();
for (const tab of ['market', 'hatch', 'shows', 'awards']) {
  await page.locator(`#tabbar button[data-tab="${tab}"]`).click(); await shot(tab);
  await page.locator('#sheetBody').evaluate(el => el.scrollTop = 900); await shot(tab + '2');
  if (tab === 'market') for (const i of [1, 2, 3]) { const b = page.locator('.seg button').nth(i); if (await b.count()) { await b.click(); await shot('market_seg' + i); } }
  await closeSheet();
}
await page.locator('#flockBtn').click(); await shot('flock'); await closeSheet();
await page.locator('#gear').click(); await shot('settings'); await closeSheet();
// away for a day
await page.evaluate(() => window.__ffDebug.away(26)); await page.waitForTimeout(1500); await shot('away');
await closeSheet(); await shot('farm_after_away');
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();

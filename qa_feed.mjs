import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
for (const loc of ['en-GB', 'fr-FR']) {
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
await page.evaluate(() => window.__ffDebug.inside(g => { const c = g.state.coops[0]; c.feeder = { basic: 0, premium: 0, show: 0 }; g.advance(3 * 3600e3); }));
await page.waitForTimeout(800); for (let k = 0; k < 3; k++) if (await page.locator('#sheet').isVisible()) { await page.locator('#sheetClose').click(); await page.waitForTimeout(300); }
const tag = loc.slice(0, 2);
await page.screenshot({ path: `r/feed_${tag}_1.png` });
const fb = await page.evaluate(() => window.__ffDebug.inside(g => null) || null);
// find the bubble from the plot list via a tiny hook: scan for it by tapping its known position
const pos = await page.evaluate(() => { const top = document.querySelector('#farm').getBoundingClientRect().top; const p = window.__ffDebug.feedBubble ? window.__ffDebug.feedBubble() : null; return p && [p[0], p[1] + top]; });
console.log(tag, 'bubble', pos);
if (pos) { await page.touchscreen.tap(pos[0], pos[1]); await page.waitForTimeout(600); await page.screenshot({ path: `r/feed_${tag}_2.png` });
  console.log(tag, 'feeder after tap', await page.evaluate(() => window.__ffDebug.inside(g => g.feederTotal(g.state.coops[0]))), 'sheet', await page.locator('#sheet').isVisible()); }
// low feed state
await page.evaluate(() => window.__ffDebug.inside(g => { g.state.coops[0].feeder = { basic: 8, premium: 0, show: 0 }; }));
await page.waitForTimeout(600); await page.screenshot({ path: `r/feed_${tag}_3.png` });
}
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

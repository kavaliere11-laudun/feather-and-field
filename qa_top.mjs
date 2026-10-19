// the top of the map: no empty green band above the trees, and the guide's wheat step still shows the field below its card
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const G = (page, fn, arg) => page.evaluate(([f, a]) => window.__ffDebug.inside(g => (new Function('g', 'a', 'return (' + f + ')(g, a)'))(g, a)), [fn.toString(), arg]);
const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-GB' });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(800);
await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1200);
// drag the view right up to the top
for (let k = 0; k < 4; k++) { await page.mouse.move(200, 300); await page.mouse.down(); await page.mouse.move(200, 800, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(200); }
await page.waitForTimeout(800);
const v = await page.evaluate(() => window.__ffDebug.view());
console.log('at the top, the view starts at map y', Math.round(v.y), '(0 or just above: no empty band)');
await page.screenshot({ path: 'r/top_1.png' });
// the guide's wheat step
await page.evaluate(() => window.__ffDebug.zoomTo(1700, 1500, .35)); await page.waitForTimeout(300);
await G(page, g => { g.state.guide.step = 3; g.state.guide.did = ['collect', 'hatch', 'coop']; }); await page.waitForTimeout(1500);
const fl = await G(page, g => g.FIELD_GEO.label);
const sp = await page.evaluate(([x, y]) => window.__ffDebug.mapToScreen(x, y), fl);
const card = await page.locator('#guide').boundingBox();
console.log('field sign on screen', sp.map(Math.round), 'guide card bottom', Math.round(card.y + card.height), sp[1] > card.y + card.height + 10 ? 'OK: below the card' : 'BAD: under the card');
await page.screenshot({ path: 'r/top_2.png' });
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

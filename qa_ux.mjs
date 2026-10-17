import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-FR' })).newPage();
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
await page.evaluate(() => window.__ffDebug.inside(g => { g.state.coins = 2000; }));
// tap the "Build" sign on the empty plot
const sign = await page.evaluate(() => window.__ffDebug.inside(g => null));
const p = await page.evaluate(() => window.__ffDebug.local(1, 0, -1.75));
const top = await page.evaluate(() => document.querySelector('#farm').getBoundingClientRect().top);
await page.touchscreen.tap(p[0], p[1] + top); await page.waitForTimeout(500); await page.screenshot({ path: 'r/ux_1_buildsign.png' });
await page.locator('.seg button').nth(2).click().catch(() => {});
await page.getByRole('button', { name: /180/ }).first().click(); await page.waitForTimeout(800);
if (await page.locator('#sheet').isVisible()) await page.locator('#sheetClose').click();
await page.locator('#tabbar button[data-tab="market"]').click(); await page.waitForTimeout(300); await page.locator('.seg button').nth(2).click(); await page.waitForTimeout(400);
await page.screenshot({ path: 'r/ux_2_build_noland.png' }); await page.locator('#sheetClose').click();
// tap the "For sale" sign
const q = await page.evaluate(() => window.__ffDebug.local(2, 0, -1.75));
await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y, .7), await page.evaluate(() => window.__ffDebug.slot(1)));
await page.waitForTimeout(400);
const sg = (await page.evaluate(() => window.__ffDebug.signs())).find(s => s[0] === 'sale'); console.log('sale sign', JSON.stringify(sg));
await page.touchscreen.tap(sg[1], sg[2]); await page.waitForTimeout(500); await page.screenshot({ path: 'r/ux_3_salesign.png' });
await page.locator('#sheetClose').click();
await page.locator('#coinPill').click(); await page.waitForTimeout(400); await page.screenshot({ path: 'r/ux_4_coinpill.png' }); await page.locator('#sheetClose').click();
await page.locator('#lvlPill').click(); await page.waitForTimeout(400); await page.locator('#sheetBody').evaluate(el => el.scrollTop = 600); await page.waitForTimeout(300); await page.screenshot({ path: 'r/ux_5_awards.png' }); await page.locator('#sheetClose').click();
// move a bird: buy a hen into the second coop first
await page.evaluate(() => window.__ffDebug.inside(g => { const s = g.state; const c2 = s.coops.find(c => c !== s.coops[0]); if (!c2) return; }));
await page.locator('#flockBtn').click(); await page.waitForTimeout(400); await page.locator('#sheetBody .item').first().click(); await page.waitForTimeout(500);
await page.locator('#sheetBody').evaluate(el => el.scrollTop = 900); await page.waitForTimeout(300); await page.screenshot({ path: 'r/ux_6_move.png' });
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();

// QA for the farmer: choosing, strolling, running after a runaway, feeding, dusk and night, in English and French.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const shot = (page, n) => page.screenshot({ path: `r/farmer_${n}.png` });
const F = page => page.evaluate(() => window.__ffDebug.farmer());
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2);
  const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc })).newPage();
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(1000);          // welcome closes, the farmer chooser opens
  console.log(tag, 'sheet after welcome:', await page.locator('#sheetTitle').innerText().catch(() => '-'));
  await shot(page, tag + '_1choose');
  await page.locator('.pick-tile').nth(tag === 'en' ? 1 : 0).click(); await page.waitForTimeout(200);
  await page.locator('#fname').fill(tag === 'en' ? 'Mabel' : 'Gaston'); await page.waitForTimeout(100);
  await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1500);
  console.log(tag, 'farmer', JSON.stringify(await F(page)), '| toast:', (await page.locator('#toasts').innerText()).replace(/\n/g, ' / '));
  await page.evaluate(() => window.__ffDebug.lookAtFarmer(1.1)); await page.waitForTimeout(600);
  await shot(page, tag + '_2hello');
  // a runaway: tap her, watch the farmer run over
  await page.evaluate(() => { const D = window.__ffDebug; D.quiet(); D.setHour(11); });
  await page.evaluate(() => window.__ffDebug.escapeNow()); await page.waitForTimeout(600);
  await page.evaluate(() => { const D = window.__ffDebug; const id = D.inside(g => g.state.birds.find(b => b.out).id); D.focus(id); });
  await page.evaluate(() => { const D = window.__ffDebug; const v = D.view(); D.lookAt(v.x + 402 / v.s / 2, v.y + 700 / v.s / 2, 0.75); });
  await page.waitForTimeout(700);
  const at2 = await page.evaluate(() => window.__ffDebug.runawayAt());
  console.log(tag, 'runaway at', JSON.stringify(at2));
  if (at2) await page.touchscreen.tap(at2[0], at2[1]);
  await page.waitForTimeout(900); await shot(page, tag + '_3running');
  console.log(tag, 'running', JSON.stringify(await F(page)));
  for (let i = 0; i < 25; i++) { const f = await F(page); if (f.st === 'act') break; await page.waitForTimeout(400); }
  await page.waitForTimeout(250); await shot(page, tag + '_4telloff');
  console.log(tag, 'arrived', JSON.stringify(await F(page)), 'still out:', JSON.stringify(await page.evaluate(() => window.__ffDebug.pers().filter(p => p[3]))));
  await page.waitForTimeout(2200);
  console.log(tag, 'after', JSON.stringify(await F(page)), 'still out:', JSON.stringify(await page.evaluate(() => window.__ffDebug.pers().filter(p => p[3]))), '| toasts:', (await page.locator('#toasts').innerText()).replace(/\n/g, ' / '));
  // feeding
  await page.evaluate(() => window.__ffDebug.protestNow()); await page.waitForTimeout(500);
  await page.evaluate(() => { const D = window.__ffDebug; const s = D.slot(0); D.lookAt(s[0], s[1] - 40, 0.9); }); await page.waitForTimeout(600);
  const fb = await page.evaluate(() => window.__ffDebug.feedBubble());
  if (fb) { const top = await page.evaluate(() => document.querySelector('#farm').getBoundingClientRect().top); await page.touchscreen.tap(fb[0], fb[1] + top); }
  console.log(tag, 'feed bubble', JSON.stringify(fb));
  for (let i = 0; i < 30; i++) { const f = await F(page); if (f.act === 'feed' && f.st === 'act') break; await page.waitForTimeout(400); }
  await page.waitForTimeout(500); await shot(page, tag + '_5feeding');
  console.log(tag, 'feeding', JSON.stringify(await F(page)));
  // dusk, then night with the torch
  await page.evaluate(() => window.__ffDebug.setHour(19)); await page.waitForTimeout(400);
  await page.evaluate(() => window.__ffDebug.lookAtFarmer(0.95)); await page.waitForTimeout(500); await shot(page, tag + '_6dusk');
  await page.evaluate(() => window.__ffDebug.setHour(23)); await page.waitForTimeout(1500);
  await page.evaluate(() => window.__ffDebug.lookAtFarmer(0.95)); await page.waitForTimeout(500); await shot(page, tag + '_7night');
  await page.evaluate(() => window.__ffDebug.inside(g => null));
}
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

// the solid strip behind the iPhone clock: hidden in a normal browser, shown in the home-screen app, nothing breaks
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
for (const standalone of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-GB' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  if (standalone) await page.addInitScript(() => { const go = () => document.documentElement && document.documentElement.classList.add('standalone'); if (document.documentElement) go(); else document.addEventListener('readystatechange', go, { once: true }); Object.defineProperty(navigator, 'standalone', { get: () => true }); });
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(800);
  await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1200);
  const cap = await page.evaluate(() => { const c = document.getElementById('topcap'); const r = c.getBoundingClientRect(); return { shown: getComputedStyle(c).display, h: r.height, z: getComputedStyle(c).zIndex }; });
  const bar = await page.locator('#tabbar').boundingBox();
  console.log(standalone ? 'home-screen app' : 'browser', JSON.stringify(cap), 'tab bar bottom', Math.round(bar.y + bar.height), 'of', 874, bar.y + bar.height <= 874 ? 'OK' : 'BAD: cut off');
  await page.screenshot({ path: `r/cap_${standalone ? 'app' : 'web'}.png` });
  await ctx.close();
}
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

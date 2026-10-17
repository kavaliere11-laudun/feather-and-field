import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
// iPhone 16 Pro home-screen app as iOS reports it: screen 402x874, page measured 62px short
const ctx = await browser.newContext({ viewport: { width: 402, height: 812 }, screen: { width: 402, height: 874 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:8770/'); await page.waitForTimeout(1500);
console.log(JSON.stringify(await page.evaluate(() => { const r = document.querySelector('#app').getBoundingClientRect(), c = document.querySelector('#farm').getBoundingClientRect(), d = document.querySelector('#tabbar').getBoundingClientRect(); return { app: [r.top, r.height], canvas: c.height, dockBottom: d.bottom, cls: document.documentElement.className }; })));
await page.locator('#sheetClose').click(); await page.locator('#gear').click(); await page.waitForTimeout(500);
console.log(await page.locator('#sheetBody').innerText().then(t => t.split('\n').filter(l => l.startsWith('Version')).join()));
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

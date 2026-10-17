import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const ctx = await browser.newContext(); const page = await ctx.newPage(); let navs = 0;
page.on('framenavigated', f => { if (f === page.mainFrame()) navs++; }); page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:8770/'); await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await page.waitForTimeout(2500);
// publish a "new version": change the props picture
execSync("/usr/bin/python3 -c \"from PIL import Image; im=Image.open('site/img/atlas/props.webp'); im.putpixel((0,0),(1,2,3,4)); im.save('site/img/atlas/props.webp','WEBP',lossless=True)\" && /usr/bin/python3 rehash_site.py");
navs = 0; await page.reload(); await page.waitForTimeout(6000);
const src = await page.evaluate(() => [...performance.getEntriesByType('resource')].map(e => e.name).filter(n => n.includes('props.webp')).pop());
const want = execSync("grep -o 'img/atlas/props.webp\":\"[0-9a-f]*' site/index.html").toString().trim().split('\"').pop();
console.log('navigations after update', navs, '| page uses', src.split('?')[1], '| current file', want);
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

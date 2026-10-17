import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 })).newPage();
await page.goto(process.env.URL); await page.waitForTimeout(1000);
await page.locator('#sheetClose').click(); await page.evaluate(() => window.__ffDebug.rich()); await page.waitForTimeout(300);
if (await page.locator('#sheet').isVisible()) await page.locator('#sheetClose').click();
const out = {};
for (const i of [0, 1, 4, 5, 7]) {
  const c = await page.evaluate(i => window.__ffDebug.slot(i), i);
  await page.evaluate(([x, y]) => window.__ffDebug.zoomTo(x, y, 1.1), c); await page.waitForTimeout(800);
  await page.screenshot({ path: `r/grid_${i}.png` });
  const pts = [];
  for (let lx = -1.6; lx <= 1.61; lx += .4) for (let ly = -1.4; ly <= 1.41; ly += .4) pts.push([lx, ly, ...(await page.evaluate(([i, a, b]) => window.__ffDebug.local(i, a, b), [i, lx, ly]))]);
  out[i] = pts;
}
fs.writeFileSync('r/grid.json', JSON.stringify(out));
await browser.close();

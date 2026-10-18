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
  const r = await page.evaluate(() => window.__ffDebug.inside(g => {
    const st = g.state; const b1 = st.birds[0], b2 = st.birds[1]; b1.champ = 2; g.actRetire(b1); g.actRetire(b2);
    g.advance(7 * 3600e3); if (g.current) g.closeSheet();
    return st.birds.filter(b => b.home === 'pasture').map(b => [b.name, b.offer && b.offer.p, b.offer && b.offer.g, Math.round(g.value(b, true)), Math.round(g.value(b))]);
  }));
  console.log(tag, 'offers', JSON.stringify(r));
  for (let k = 0; k < 3; k++) if (await page.locator('#sheet').isVisible()) { await page.locator('#sheetClose').click(); await page.waitForTimeout(300); }
  await page.screenshot({ path: `r/adopt_${tag}_1.png` });
  await page.evaluate(() => window.__ffDebug.inside(g => { }));
  await page.evaluate(() => { const ev = new Event('x'); });
  // open the pasture sheet via the map hook
  await page.evaluate(() => window.__ffDebug.inside(g => null));
  await page.evaluate(() => document.querySelector('#flockBtn') && null);
  await page.evaluate(() => window.__ffDebug.openPasture ? window.__ffDebug.openPasture() : null);
  await page.waitForTimeout(600); await page.screenshot({ path: `r/adopt_${tag}_2.png` });
  const coins0 = await page.evaluate(() => window.__ffDebug.inside(g => g.state.coins));
  const acc = page.locator('#sheetBody .btn.good').first();
  if (await acc.count()) { await acc.click(); await page.waitForTimeout(600); }
  const coins1 = await page.evaluate(() => window.__ffDebug.inside(g => g.state.coins));
  console.log(tag, 'coins', coins0, '->', coins1);
  await page.screenshot({ path: `r/adopt_${tag}_3.png` });
  const dec = page.locator('#sheetBody .btn.alt').first(); if (await dec.count()) { await dec.click(); await page.waitForTimeout(400); }
  // tampered save: huge offer gets clamped
  const t = await page.evaluate(() => window.__ffDebug.inside(g => { const s = JSON.parse(JSON.stringify(g.state)); const b = s.birds.find(b => b.home === 'pasture'); if (!b) return 'no pasture bird'; b.offer = { p: 9e9, g: 9, w: 99, until: s.gt + 1e7 }; const o = g.sanitize(s); const x = o.birds.find(y => y.id === b.id); return [x.offer, Math.round(g.value(x, true))]; }));
  console.log(tag, 'sanitized', JSON.stringify(t));
}
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

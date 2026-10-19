// QA: each breed's eggs take their own time to hatch (Silkie 45 min, Red 1 h, Legbar 1 h 15, Orpington 1 h 30, Brahma 2 h).
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const D = (page, fn, arg) => page.evaluate(fn, arg);
const check = (tag, ok, what) => { console.log(tag, ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(tag + ' ' + what); };
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2);
  const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc })).newPage();
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(800);
  await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(800);
  // a fertile egg of each breed in the incubator; step the clock and see when each one hatches
  const res = await D(page, () => { try { return window.__ffDebug.inside(g => {
    const st = g.state; st.xp = g.xpFor(12); st.level = 12; st.coins = 1e6; st.inc.slots = 8; st.inc.items = [];
    // no coops for the other breeds: an egg that is ready but has nowhere to go waits, which counts as hatched here
    const out = {}, start = st.gt;
    for (const b of ['rir', 'orp', 'sil', 'leg', 'bra']) {
      const child = { breed: b, sex: 'h', traits: g.shopTraits(), gen: 1, line: 0, pers: 'mum' };
      st.inc.items.push({ egg: { id: st.nextId++, child, sire: { name: 'S', q: 50 }, dam: { name: 'D', q: 50 }, laid: start }, start });
    }
    g.setSink({});
    for (let m = 1; m <= 130; m++) {
      g.advance(60e3);
      for (const b of ['rir', 'orp', 'sil', 'leg', 'bra']) if (out[b] == null && !st.inc.items.some(it => it.egg.child.breed === b && !it.waiting)) out[b] = m;
    }
    g.setSink(null);
    return out;
  }); } catch (e) { return { err: e.stack }; } });
  if (res.err) { console.log(res.err); process.exit(1); }
  console.log(tag, 'hatched after (minutes):', JSON.stringify(res));
  check(tag, res.sil === 45 && res.rir === 60 && res.leg === 75 && res.orp === 90 && res.bra === 120, 'each breed hatches in its own time');
  await D(page, () => window.__ffDebug.openMarket('breeds')); await page.waitForTimeout(500);
  const txt = await page.locator('#sheetBody').innerText();
  check(tag, /Hatching time|Couvaison/.test(txt), 'the breed catalogue shows the hatching time');
  await page.screenshot({ path: `r/hatch_${tag}_catalogue.png` });
}
console.log('BAD', JSON.stringify(bad)); console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

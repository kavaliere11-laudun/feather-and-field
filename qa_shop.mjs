// QA for things to buy: decorations on the farm (placement, windmill sails, tap to name), outfits for the farmer,
// prices, levels, XP, saves, the trophy; English and French.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const shot = (page, n) => page.screenshot({ path: `r/shop_${n}.png` });
const D = (page, fn, arg) => page.evaluate(fn, arg);
const check = (tag, ok, what) => { console.log(tag, ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(tag + ' ' + what); };
const toasts = page => page.locator('#toasts').innerText().then(x => x.replace(/\n/g, ' / '));
const ONLY = process.env.ONLY || '';
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2);
  const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc })).newPage();
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(1000);
  await page.locator('.pick-tile').nth(tag === 'en' ? 1 : 0).click(); await page.waitForTimeout(200);
  await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1200);
  await D(page, () => { const d = window.__ffDebug; d.quiet(); d.setHour(11); });

  // ---- locked and too dear at level 1
  const lv1 = await D(page, () => window.__ffDebug.inside(g => ({ a: g.actBuyDecor('flowers'), b: g.actBuyOutfit('market'), decor: g.state.decor.length })));
  check(tag, !lv1.a && !lv1.b && lv1.decor === 0, 'nothing can be bought before its level: ' + JSON.stringify(lv1));
  // ---- the Build tab at level 6 with some coins
  await D(page, () => window.__ffDebug.inside(g => { g.state.xp = g.xpFor(6); g.state.level = 6; g.state.coins = 2500; }));
  await page.waitForTimeout(400); await D(page, () => window.__ffDebug.inside(g => g.closeSheet()));
  await page.evaluate(() => { window.__ffDebug.openMarket && window.__ffDebug.openMarket('build'); });
  await page.waitForTimeout(500);
  await page.locator('#sheetBody button', { hasText: tag === 'en' ? 'Decorations for your farm' : 'Décorations pour votre ferme' }).click().catch(() => {}); await page.waitForTimeout(900);
  await shot(page, tag + '_1build');
  const cards = await page.locator('#sheetBody .thumb.dc').count();
  check(tag, cards === 8, 'Build tab lists the 8 decorations: ' + cards);
  // buy the flower bed from the screen
  const buyBtn = page.locator('#sheetBody .card', { hasText: tag === 'en' ? 'Cottage flower bed' : 'Massif de fleurs' }).locator('button');
  const xp0 = await D(page, () => window.__ffDebug.xp());
  await buyBtn.click(); await page.waitForTimeout(400);
  const after = await D(page, () => window.__ffDebug.inside(g => ({ decor: g.state.decor, coins: g.state.coins })));
  const xp1 = await D(page, () => window.__ffDebug.xp());
  console.log(tag, 'toast:', await toasts(page));
  check(tag, after.decor.includes('flowers') && after.coins === 2100 && xp1 - xp0 === 8, `bought the flower bed: ${JSON.stringify(after)}, +${xp1 - xp0} XP`);
  check(tag, await D(page, () => window.__ffDebug.inside(g => g.actBuyDecor('flowers'))) === false, 'cannot buy it twice');
  await page.locator('#sheetBody .card', { hasText: tag === 'en' ? 'Cottage flower bed' : 'Massif de fleurs' }).scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
  await shot(page, tag + '_2bought');
  // ---- every decoration on the farm
  await D(page, () => window.__ffDebug.inside(g => { g.state.xp = g.xpFor(22); g.state.level = 22; g.state.coins = 200000; for (const id of g.DECOR_IDS) g.actBuyDecor(id); g.checkTrophies(); g.closeSheet(); }));
  await page.waitForTimeout(600);
  const all = await D(page, () => window.__ffDebug.inside(g => ({ n: g.state.decor.length, coins: g.state.coins, trophy: g.state.trophies.includes('m_decor') })));
  check(tag, all.n === 8 && all.coins <= 200000 - 83600 + 15000 && all.trophy, 'all decorations bought, trophy: ' + JSON.stringify(all));
  if (tag === 'en' || ONLY) {
    for (const id of ['flowers', 'birdbath', 'beehives', 'duckhouse', 'greenhouse', 'windmill', 'bandstand', 'statue']) {
      await D(page, i => { const d = window.__ffDebug; d.inside(g => { g.closeSheet(); g.lookAtDecor(i); }); }, id);
      await page.waitForTimeout(700); await shot(page, tag + '_d_' + id);
    }
    // tap the windmill: its name
    await D(page, () => window.__ffDebug.inside(g => g.lookAtDecor('windmill'))); await page.waitForTimeout(500);
    const wp = await D(page, () => window.__ffDebug.decorAt('windmill'));
    await page.touchscreen.tap(wp[0], wp[1]); await page.waitForTimeout(400);
    const tw = (await page.locator('#sheet').isVisible()) ? await page.locator('#sheetTitle').innerText() : await toasts(page); check(tag, /Windmill|Moulin/.test(tw), 'tapping the windmill opens its card: ' + tw);
    await D(page, () => window.__ffDebug.inside(g => g.closeSheet()));
    await page.waitForTimeout(2000); await shot(page, tag + '_d_windmill2');
  }
  // ---- outfits
  await D(page, () => window.__ffDebug.inside(g => g.closeSheet()));
  await D(page, () => window.__ffDebug.farmerSheet && window.__ffDebug.farmerSheet());
  await page.waitForTimeout(500);
  await page.locator('#sheetBody .outfits').scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(200);
  await shot(page, tag + '_3outfits');
  const ofBuy = page.locator('#sheetBody .outfit', { hasText: tag === 'en' ? 'Rodeo' : 'Rodéo' }).locator('button');
  const xq = await D(page, () => window.__ffDebug.xp());
  await ofBuy.click(); await page.waitForTimeout(400);
  const of1 = await D(page, () => window.__ffDebug.inside(g => ({ outfit: g.state.farmer.outfit, owned: g.state.farmer.outfits })));
  console.log(tag, 'toast:', await toasts(page));
  check(tag, of1.outfit === 'rodeo' && of1.owned.includes('rodeo') && (await D(page, () => window.__ffDebug.xp())) - xq === 200, 'bought and wearing Rodeo: ' + JSON.stringify(of1));
  await page.locator('#sheetBody .outfit.on').scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  await shot(page, tag + '_4wearing');
  const back = page.locator('#sheetBody .outfit', { hasText: tag === 'en' ? 'Classic' : 'Classique' }).locator('button');
  await back.click(); await page.waitForTimeout(300);
  check(tag, (await D(page, () => window.__ffDebug.inside(g => g.state.farmer.outfit))) === 'classic', 'can change back to Classic for free');
  await D(page, () => window.__ffDebug.inside(g => g.actWearOutfit('rodeo')));
  check(tag, (await D(page, () => window.__ffDebug.inside(g => g.actWearOutfit('show')))) === false, 'cannot wear an outfit not bought');
  // the farmer on the farm in the outfit
  await D(page, () => { const d = window.__ffDebug; d.inside(g => g.closeSheet()); d.lookAtFarmer(2.0); }); await page.waitForTimeout(800);
  const pose = await D(page, () => window.__ffDebug.farmer().pose);
  await shot(page, tag + '_5farm_rodeo');
  console.log(tag, 'farmer pose', pose);
  // ---- saves
  const sv = await D(page, () => window.__ffDebug.inside(g => {
    const o = JSON.parse(JSON.stringify(g.state)); o.decor = ['windmill', 'windmill', 'castle', 7]; o.farmer.outfits = ['rodeo', 'crown', 'rodeo']; o.farmer.outfit = 'show';
    const s = g.sanitize(o); return { decor: s.decor, outfits: s.farmer.outfits, outfit: s.farmer.outfit };
  }));
  check(tag, JSON.stringify(sv.decor) === '["windmill"]' && JSON.stringify(sv.outfits) === '["classic","rodeo"]' && sv.outfit === 'classic', 'saves: ' + JSON.stringify(sv));
}
console.log('BAD', JSON.stringify(bad));
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

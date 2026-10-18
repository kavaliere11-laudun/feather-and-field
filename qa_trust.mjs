// QA for trust with the farmer: levels from cuddles, messages, XP and the trophy, value, rebels (escapes and finds),
// a good mum's chicks, saves, birds greeting the farmer at the fence, selling a best friend; English and French.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const shot = (page, n) => page.screenshot({ path: `r/trust_${n}.png` });
const D = (page, fn, arg) => page.evaluate(fn, arg);
const check = (tag, ok, what) => { console.log(tag, ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(tag + ' ' + what); };
const toasts = page => page.locator('#toasts').innerText().then(x => x.replace(/\n/g, ' / '));
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
  await page.waitForTimeout(2500);

  // ---- levels: a rebel two cuddles in becomes Friendly on the third
  const r1 = await D(page, () => window.__ffDebug.inside(g => {
    const b = g.state.birds.find(b => b.pers === 'rebel'); b.trust = 2; b.happy = 0;
    const lv0 = g.trustLvl(b), v0 = g.value(b); g.actCuddle(b); return { id: b.id, lv0, lv: g.trustLvl(b), trust: b.trust, ratio: g.value(b) / v0 };
  }));
  await page.waitForTimeout(300);
  const t1 = await toasts(page); console.log(tag, 'toasts:', t1);
  check(tag, r1.lv0 === 0 && r1.lv === 1 && r1.trust === 3 && /friendly|habitue/i.test(t1), `third cuddle -> Friendly (${JSON.stringify(r1)})`);
  check(tag, Math.abs(r1.ratio - 1.02) < 0.05, `Friendly is worth a little more (x${r1.ratio.toFixed(3)}, small coin values round)`);
  await page.waitForTimeout(4000);
  await D(page, () => window.__ffDebug.inside(g => g.closeSheet()));
  await D(page, () => window.__ffDebug.openBird('rebel')); await page.waitForTimeout(400);
  await page.locator('#sheetBody').evaluate(el => { const b = el.querySelector('.trust'); if (b) b.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(150);
  const row1 = await page.locator('#sheetBody .trust').innerText().catch(() => '-');
  check(tag, /♥♡♡/.test(row1), 'card: ' + row1.replace(/\n/g, ' | '));
  await shot(page, tag + '_1card');
  await page.locator('#sheetClose').click(); await page.waitForTimeout(300);

  // ---- best friend: +20 XP, the trophy, worth 6% more
  const r2 = await D(page, () => window.__ffDebug.inside(g => {
    const b = g.state.birds.find(b => b.pers === 'rebel'); b.trust = 14; b.happy = 0;
    const xp0 = g.state.xp, v0 = g.value(b); b.trust = 0; const vz = g.value(b); b.trust = 14;
    g.actCuddle(b); g.checkTrophies();
    return { lv: g.trustLvl(b), xp: g.state.xp - xp0, trophy: g.state.trophies.includes('m_friend'), ratio: g.value(b) / vz };
  }));
  await page.waitForTimeout(300);
  const t2 = await toasts(page); console.log(tag, 'toasts:', t2);
  check(tag, r2.lv === 3 && r2.xp === 20 + 150 && r2.trophy, `best friend: +${r2.xp} XP (20 + trophy 150), trophy ${r2.trophy}`);
  check(tag, Math.abs(r2.ratio - 1.06) < 0.03, `Best friend worth more (x${r2.ratio.toFixed(3)})`);
  const big = await D(page, () => window.__ffDebug.inside(g => { const b = g.makeBird({ breed: 'bra', sex: 'h', traits: { type: 90, plum: 90, size: 90, lay: 90 }, born: g.state.gt - 5 * 864e5, home: g.state.coops[0].id }); b.champ = 4; const v = []; for (const n of [0, 3, 8, 15]) { b.trust = n; v.push(g.value(b)); } return v; }));
  check(tag, Math.abs(big[1] / big[0] - 1.02) < .003 && Math.abs(big[2] / big[0] - 1.04) < .003 && Math.abs(big[3] / big[0] - 1.06) < .003, 'value by trust on a champion: ' + big.join(' / '));
  const r3 = await D(page, () => window.__ffDebug.inside(g => { const b = g.state.birds.find(b => b.pers === 'rebel'); b.happy = 0; g.actCuddle(b); return b.trust; }));
  check(tag, r3 === 15, 'trust stops at 15 cuddles: ' + r3);
  await page.waitForTimeout(3000);
  await D(page, () => window.__ffDebug.inside(g => g.closeSheet()));
  await D(page, () => window.__ffDebug.openBird('rebel')); await page.waitForTimeout(400);
  await page.locator('#sheetBody').evaluate(el => { const b = el.querySelector('.trust'); if (b) b.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(150);
  console.log(tag, 'card at best friend:', (await page.locator('#sheetBody .trust').innerText()).replace(/\n/g, ' | '));
  await shot(page, tag + '_2bestfriend');
  await page.locator('#sheetClose').click(); await page.waitForTimeout(300);

  // ---- rebels: escapes further apart, more finds, by level
  const rb = await D(page, () => window.__ffDebug.inside(g => {
    const out = {};
    for (const n of [0, 3, 8, 15]) {
      const b = { trust: n }; let gap = 0; for (let i = 0; i < 4000; i++) gap += g.outGap(b);
      const sk = {}; g.setSink(sk);
      const fake = g.makeBird({ breed: 'rir', sex: 'h', traits: g.shopTraits(), born: g.state.gt - 5 * 864e5, home: g.state.coops[0].id, pers: 'rebel', trust: n });
      const c0 = g.state.coins, basket = g.state.basket.fertile.length;
      for (let i = 0; i < 3000; i++) { fake.out = g.state.gt + 1; g.rebelHome(fake, null); }
      g.setSink(null); g.state.basket.fertile.length = basket; g.state.coins = c0; fake.clover = false;
      out[n] = { hours: +(gap / 4000 / 3600e3).toFixed(1), finds: +((sk.finds || 0) / 3000).toFixed(2) };
    }
    return out;
  }));
  console.log(tag, 'rebels by trust', JSON.stringify(rb));
  check(tag, rb[0].hours > 22 && rb[0].hours < 26 && rb[15].hours > 38 && rb[15].hours < 44 && Math.abs(rb[0].finds - .5) < .04 && Math.abs(rb[15].finds - .8) < .04 && rb[8].hours > rb[3].hours,
    'rebel escapes: every ' + rb[0].hours + ' h when shy, ' + rb[15].hours + ' h as best friend; finds ' + rb[0].finds + ' -> ' + rb[15].finds);

  // ---- a good mum: Trusting or more, her chicks hatch Friendly; shy, they don't
  const gm = await D(page, () => window.__ffDebug.inside(g => {
    const c = g.state.coops[0], sire = g.birdsIn(c).find(b => b.sex === 'r') || g.makeBird({ breed: 'rir', sex: 'r', traits: g.shopTraits(), born: 0, home: c.id });
    const mum = g.makeBird({ breed: 'rir', sex: 'h', traits: g.shopTraits(), born: 0, home: c.id, pers: 'mum', trust: 8 });
    const a = g.childSpec(sire, mum).trust; mum.trust = 7; const b = g.childSpec(sire, mum).trust;
    const chick = g.makeBird({ breed: 'rir', sex: 'h', traits: g.shopTraits(), born: g.state.gt, home: c.id, trust: a });
    return { trusting: a, friendly: b === undefined, chick: g.trustLvl(chick) };
  }));
  check(tag, gm.trusting === 3 && gm.friendly && gm.chick === 1, 'good mum chicks: ' + JSON.stringify(gm));

  // ---- saves
  const sv = await D(page, () => window.__ffDebug.inside(g => {
    const o = JSON.parse(JSON.stringify(g.state)); o.birds[0].trust = 999; o.birds[1].trust = 'x'; o.birds[2].trust = 7.6;
    const s = g.sanitize(o);
    return { a: s.birds[0].trust, b: s.birds[1].trust, c: s.birds[2].trust, egg7: g.okSpec({ breed: 'rir', sex: 'h', traits: {}, trust: 7 }).trust, egg3: g.okSpec({ breed: 'rir', sex: 'h', traits: {}, trust: 3 }).trust, trophy: s.trophies.includes('m_friend') };
  }));
  check(tag, sv.a === 15 && sv.b === 0 && Number.isInteger(sv.c) && sv.c <= 15 && sv.egg7 === undefined && sv.egg3 === 3 && sv.trophy, 'saves: ' + JSON.stringify(sv));

  // ---- trusting birds come to the fence when the farmer visits their coop
  await D(page, () => window.__ffDebug.inside(g => { for (const b of g.birdsIn(g.state.coops[0])) { b.trust = 9; } }));
  await D(page, () => { const d = window.__ffDebug; d.greetTest(0); });
  let greet = null;
  for (let i = 0; i < 80; i++) {
    const f = await D(page, () => window.__ffDebug.farmer());
    if (f.st === 'idle') {
      let best = -1;
      for (let k = 0; k < 14; k++) { await page.waitForTimeout(400); const ys = await D(page, () => window.__ffDebug.inside(g => g.birdsIn(g.state.coops[0]).map(b => window.__ffDebug.birdAt(b.id)).map(a => a && +a.y.toFixed(2)))); const n = ys.filter(y => y != null && y < -1.05).length; if (n > best) { best = n; greet = ys; } }
      break;
    }
    await page.waitForTimeout(300);
  }
  await D(page, () => window.__ffDebug.lookAtFarmer(1.5)); await page.waitForTimeout(500);
  await shot(page, tag + '_3greet');
  const atFence = greet ? greet.filter(y => y != null && y < -1.05).length : 0;
  check(tag, atFence >= 2, 'birds at the front fence when the farmer came by: ' + atFence + ' ' + JSON.stringify(greet));

  // ---- selling a best friend
  await page.waitForTimeout(2500);
  await D(page, () => window.__ffDebug.inside(g => { const b = g.state.birds.find(b => b.pers === 'rebel'); b.trust = 15; g.actSell(b); }));
  await page.waitForTimeout(300);
  const t4 = await toasts(page); console.log(tag, 'sold:', t4);
  check(tag, /miss|manquer/.test(t4), 'selling a best friend mentions the farmer will miss her');
}
console.log('BAD', JSON.stringify(bad));
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

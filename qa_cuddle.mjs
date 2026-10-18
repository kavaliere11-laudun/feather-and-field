// QA for the cuddle: the button on a bird's card, the farmer's visit (gate, kneel, hearts, out again),
// each effect (diva, rebel, fox fright, brave newcomer), the 6-hour wait, saves, a runaway during a cuddle; English and French.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const shot = (page, n) => page.screenshot({ path: `r/cuddle_${n}.png` });
const D = (page, fn, arg) => page.evaluate(fn, arg);
const F = page => page.evaluate(() => window.__ffDebug.farmer());
const check = (tag, ok, what) => { console.log(tag, ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(tag + ' ' + what); };
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
  await page.waitForTimeout(3000);                                                    // let the wave finish

  // ---- a diva sulking on pellets: the card offers a cuddle
  const diva = await D(page, () => window.__ffDebug.inside(g => {
    const b = g.state.birds.find(b => b.sex === 'h' && g.isGrown(b) && b.pers !== 'rebel'); b.pers = 'diva'; b.happy = 0;
    const c = g.state.coops.find(c => c.id === b.home); c.last = 'basic'; return { id: b.id, name: b.name, mult: g.layMult(b, c, g.state.gt) };
  }));
  check(tag, Math.abs(diva.mult - 1 / .85) < 1e-6, `diva sulks before the cuddle (x${diva.mult.toFixed(3)})`);
  await D(page, () => window.__ffDebug.openBird('diva')); await page.waitForTimeout(500);
  await page.locator('#sheetBody').evaluate(el => { const b = [...el.querySelectorAll('button')].find(x => x.textContent.includes('♥')); if (b) b.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(200); await shot(page, tag + '_1card');
  const btn = page.locator('#sheetBody button', { hasText: '♥' });
  check(tag, await btn.count() === 1, 'cuddle button on the card: ' + (await btn.count() ? await btn.innerText() : '-'));
  await btn.click(); await page.waitForTimeout(400);
  const toast1 = (await page.locator('#toasts').innerText()).replace(/\n/g, ' / ');
  console.log(tag, 'toast:', toast1);
  const after = await D(page, id => window.__ffDebug.inside(g => { const b = g.state.birds.find(b => b.id === id), c = g.state.coops.find(c => c.id === b.home); return { happyIn: (b.happy - g.state.gt) / 3600e3, mult: g.layMult(b, c, g.state.gt), ok: g.cuddleOk(b) }; }), diva.id);
  check(tag, Math.abs(after.happyIn - 6) < 0.03 && after.mult === 1 && !after.ok, `diva happy for ${after.happyIn.toFixed(2)} h, lays x${after.mult}, can cuddle again: ${after.ok}`);
  // the visit: through the gate, kneel, hearts, out again
  let f = await F(page); console.log(tag, 'farmer sets off', JSON.stringify(f));
  check(tag, f.task === 'cuddle', 'farmer is on the way');
  let sawPet = false, maxHearts = 0;
  for (let i = 0; i < 80; i++) {
    f = await F(page); const h = await D(page, () => window.__ffDebug.hearts()); maxHearts = Math.max(maxHearts, h);
    if (f.st === 'act' && f.act === 'pet') {
      if (!sawPet) { sawPet = true; await page.waitForTimeout(1300); maxHearts = Math.max(maxHearts, await D(page, () => window.__ffDebug.hearts())); await D(page, () => window.__ffDebug.lookAtFarmer(2.2)); await page.waitForTimeout(150); await shot(page, tag + '_2pet');
        await D(page, () => window.__ffDebug.lookAtFarmer(1.1)); await page.waitForTimeout(100); await shot(page, tag + '_3pet_wide'); }
    } else if (sawPet) break;
    await page.waitForTimeout(400);
  }
  const bird = await D(page, id => window.__ffDebug.birdAt(id), diva.id);
  check(tag, sawPet && maxHearts > 0, `farmer knelt and stroked her (hearts up to ${maxHearts})`);
  for (let i = 0; i < 40; i++) { f = await F(page); if (f.st === 'idle' && !f.task) break; await page.waitForTimeout(400); }
  f = await F(page); console.log(tag, 'after the visit', JSON.stringify(f), 'bird', JSON.stringify(await D(page, id => window.__ffDebug.birdAt(id), diva.id)));
  check(tag, !f.task, 'farmer finished and walked out');
  // the card now shows how long she stays happy
  await D(page, () => window.__ffDebug.openBird('diva')); await page.waitForTimeout(400);
  const happyLine = await page.locator('#sheetBody .good-t', { hasText: '♥' }).innerText().catch(() => '-');
  check(tag, await page.locator('#sheetBody button', { hasText: '♥' }).count() === 0 && happyLine !== '-', 'card shows: ' + happyLine);
  await page.locator('#sheetBody').evaluate(el => { const b = el.querySelector('.good-t'); if (b) b.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(150);
  await shot(page, tag + '_4happy');
  await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
  check(tag, await D(page, id => window.__ffDebug.cuddle(id), diva.id) === false, 'a second cuddle within 6 hours does nothing');

  // ---- the fox frightened a coop: the coop sheet hints, a cuddle calms it (+5 XP)
  const fox = await D(page, () => window.__ffDebug.inside(g => {
    const c = g.state.coops[0]; for (const b of g.birdsIn(c)) { if (b.pers === 'brave') b.pers = 'glutton'; b.happy = 0; }
    c.fright = g.state.gt + 4 * 3600e3; return { id: c.id };
  }));
  await D(page, id => window.__ffDebug.openCoop(id), fox.id);
  await page.waitForTimeout(400);
  const hint = await page.locator('#sheetBody p').allInnerTexts().catch(() => []);
  check(tag, hint.some(x => /cuddle|câlin/i.test(x)), 'coop sheet hint: ' + hint.join(' | '));
  await page.locator('#sheetBody').evaluate(el => { const b = el.querySelector('.warn'); if (b) b.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(150);
  await shot(page, tag + '_5fright');
  await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
  const fx = await D(page, () => window.__ffDebug.inside(g => { const c = g.state.coops[0], b = g.birdsIn(c).find(b => g.isGrown(b) && g.cuddleOk(b)); const xp0 = g.state.xp; const r = g.actCuddle(b); return { r, xp: g.state.xp - xp0, fright: c.fright > g.state.gt, name: b.name }; }));
  await page.waitForTimeout(300);
  console.log(tag, 'fox toast:', (await page.locator('#toasts').innerText()).replace(/\n/g, ' / '));
  check(tag, fx.r && fx.xp === 5 && !fx.fright, `fox fright ended by cuddling ${fx.name}, +${fx.xp} XP`);

  // ---- a brave bird getting used to a newcomer: cuddling her ends it (+5 XP); cuddling someone else doesn't
  const br = await D(page, () => window.__ffDebug.inside(g => {
    const c = g.state.coops[0], bs = g.birdsIn(c).filter(b => g.isGrown(b));
    for (const b of bs) b.happy = 0;
    const brave = bs.find(b => b.pers !== 'rebel'); brave.pers = 'brave';
    const other = bs.find(b => b !== brave && b.pers !== 'brave');
    c.settle = g.state.gt + 6 * 3600e3; c.fright = 0;
    const r1 = g.actCuddle(other), still = c.settle > g.state.gt;
    const xp0 = g.state.xp, r2 = g.actCuddle(brave);
    return { r1, still, r2, xp: g.state.xp - xp0, ended: !(c.settle > g.state.gt) };
  }));
  check(tag, br.r1 && br.still && br.r2 && br.xp === 5 && br.ended, 'brave: ' + JSON.stringify(br));
  // ---- a rebel: no escape for 6 hours after a cuddle
  const rb = await D(page, () => window.__ffDebug.inside(g => {
    const b = g.state.birds.find(b => b.pers === 'rebel' && g.isGrown(b) && !b.out); if (!b) return null;
    b.happy = 0; b.nextOut = g.state.gt + 60e3; g.actCuddle(b);
    return { nextIn: (b.nextOut - g.state.gt) / 3600e3, happyIn: (b.happy - g.state.gt) / 3600e3 };
  }));
  check(tag, rb && rb.nextIn >= 5.99, 'rebel next escape pushed back: ' + JSON.stringify(rb));
  // ---- saves: a tampered happy time is clamped; a bird out of the coop or in the pasture can't be cuddled
  const sv = await D(page, () => window.__ffDebug.inside(g => {
    const o = JSON.parse(JSON.stringify(g.state)); o.birds[0].happy = 9e15; o.birds[1].happy = 'x';
    const s = g.sanitize(o); const out = g.state.birds.find(b => b.out);
    const past = g.makeBird({ breed: 'rir', sex: 'h', traits: g.shopTraits(), born: g.state.gt - 31 * 864e5, home: 'pasture' });
    return { h0: (s.birds[0].happy - s.gt) / 3600e3, h1: s.birds[1].happy, pasture: g.cuddleOk(past) };
  }));
  check(tag, sv.h0 <= 6.0001 && sv.h1 === 0 && sv.pasture === false, 'saves and limits: ' + JSON.stringify(sv));

  // ---- a runaway while the farmer is in a pen: out through the gate, then after her
  await D(page, () => window.__ffDebug.inside(g => { for (const b of g.state.birds) b.happy = 0; }));
  await page.waitForTimeout(2500);
  const tgt = await D(page, () => window.__ffDebug.inside(g => { const b = g.state.birds.find(b => g.isGrown(b) && b.pers !== 'rebel' && g.cuddleOk(b) && b.home === g.state.coops[0].id); g.actCuddle(b); return b.id; }));
  for (let i = 0; i < 60; i++) { f = await F(page); if (f.st === 'act' && f.act === 'pet') break; await page.waitForTimeout(400); }
  await D(page, () => window.__ffDebug.escapeNow()); await page.waitForTimeout(700);
  await D(page, () => window.__ffDebug.inside(g => g.actCatch(g.state.birds.find(b => b.out)))); await page.waitForTimeout(100);
  f = await F(page); console.log(tag, 'catch during a cuddle', JSON.stringify(f), 'cuddled bird', JSON.stringify(await D(page, id => window.__ffDebug.birdAt(id), tgt)));
  check(tag, f.task === 'catch', 'farmer drops the cuddle for the runaway');
  let caught = false;
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(400); const n = await D(page, () => window.__ffDebug.pers().filter(p => p[3]).length); if (!n) { caught = true; break; } }
  check(tag, caught, 'the runaway was brought back after the farmer left the pen');
  console.log(tag, 'cuddled bird free again:', JSON.stringify(await D(page, id => window.__ffDebug.birdAt(id), tgt)));

  // ---- a night cuddle, for the picture
  await D(page, () => { const d = window.__ffDebug; d.setHour(22); d.inside(g => { for (const b of g.state.birds) b.happy = 0; }); });
  await page.waitForTimeout(3000);
  await D(page, () => window.__ffDebug.inside(g => { const b = g.state.birds.find(b => g.isGrown(b) && g.cuddleOk(b) && b.home === g.state.coops[0].id); g.actCuddle(b); }));
  for (let i = 0; i < 80; i++) { f = await F(page); if (f.st === 'act' && f.act === 'pet') break; await page.waitForTimeout(400); }
  await page.waitForTimeout(1000); await D(page, () => { const d = window.__ffDebug; d.inside(g => g.closeSheet()); d.lookAtFarmer(1.6); }); await page.waitForTimeout(150); await shot(page, tag + '_6night');
}
console.log('BAD', JSON.stringify(bad));
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

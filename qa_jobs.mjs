// QA for the first-day guide, daily farm jobs and the wheat field (EN and FR, phone size): a brand-new farm played through
// the guide's six steps by tapping, sowing and harvesting the field, jobs and their rewards, a new day, and tampered saves.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const shot = (page, n) => page.screenshot({ path: `r/jb_${n}.png` });
const D = (page, fn, arg) => page.evaluate(fn, arg);
const G = (page, fn, arg) => page.evaluate(([f, a]) => window.__ffDebug.inside(g => (new Function('g', 'a', 'return (' + f + ')(g, a)'))(g, a)), [fn.toString(), arg]);
const check = (tag, ok, what) => { console.log(tag, ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(tag + ' ' + what); };
const guide = page => page.locator('#guide').isVisible().then(v => v ? page.locator('#guide').innerText() : '-');
const closeLevel = async page => { for (let k = 0; k < 3; k++) { if (await page.locator('#sheet').isVisible() && /Level|Niveau/.test(await page.locator('#sheetTitle').innerText())) { await page.locator('#sheetClose').click(); await page.waitForTimeout(500); } } };
const toScreen = (page, x, y) => D(page, ([x, y]) => window.__ffDebug.mapToScreen(x, y), [x, y]);
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2), EN = tag === 'en';
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  check(tag, !(await page.locator('#guide').isVisible()), 'no guide while the welcome is open');
  await page.locator('#sheetClose').click(); await page.waitForTimeout(1000);
  await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1200);
  await D(page, () => { const d = window.__ffDebug; d.quiet(); d.setHour(11); d.speed(1); });
  await page.waitForTimeout(800);
  // ---- step 1: collect
  let gt = await guide(page);
  check(tag, (EN ? /First day · 1 of 6/ : /Premier jour · 1 sur 6/).test(gt) && (EN ? /egg bubble/ : /bulle d’œuf/).test(gt), 'the guide starts: ' + gt.replace(/\n/g, ' / '));
  await G(page, g => { const c = g.state.coops[0]; const hen = g.birdsIn(c).find(b => b.sex === 'h' && g.isGrown(b)); g.setSink(true); for (let i = 0; i < 12; i++) g.layEgg(hen, c); g.setSink(false); });
  await page.waitForTimeout(900);
  await shot(page, tag + '_1collect');
  const coins0 = await G(page, g => g.state.coins);
  const bub = await G(page, g => { const p = g.plots.find(p => p.kind === 'coop'); return p.bubble ? [p.bubble.x, p.bubble.y] : null; });
  check(tag, !!bub, 'the egg bubble is on screen');
  const bs = await toScreen(page, bub[0], bub[1]); await page.touchscreen.tap(bs[0], bs[1]); await page.waitForTimeout(700);
  gt = await guide(page);
  check(tag, (EN ? /2 of 6/ : /2 sur 6/).test(gt) && await G(page, (g, c0) => g.state.coins > c0, coins0), 'tapping the eggs: step 2, and coins: ' + gt.replace(/\n/g, ' / '));
  check(tag, await page.locator('#tabbar [data-tab="hatch"].gpulse').count() === 1, 'the Hatchery tab glows');
  await closeLevel(page);
  await shot(page, tag + '_2hatch');
  // ---- step 2: incubate
  await page.locator('#tabbar [data-tab="hatch"]').click(); await page.waitForTimeout(500);
  await page.locator('#sheetBody .btn', { hasText: EN ? 'Incubate' : 'Couver' }).first().click(); await page.waitForTimeout(500);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(900); await closeLevel(page);
  gt = await guide(page);
  check(tag, (EN ? /3 of 6/ : /3 sur 6/).test(gt), 'incubating: step 3: ' + gt.replace(/\n/g, ' / '));
  await shot(page, tag + '_3coop');
  // ---- step 3: open the coop by tapping it
  const cp = await G(page, g => { const p = g.plots.find(p => p.kind === 'coop'); return g.toMap(p.f, 0.6, 0.6, 0.4); });
  const cs = await toScreen(page, cp[0], cp[1]); await page.touchscreen.tap(cs[0], cs[1]); await page.waitForTimeout(600);
  check(tag, /Red Barn|Grange rouge/.test(await page.locator('#sheetTitle').innerText()), 'the coop opens');
  await page.locator('#sheetClose').click(); await page.waitForTimeout(1200);
  gt = await guide(page);
  check(tag, (EN ? /4 of 6/ : /4 sur 6/).test(gt) && (EN ? /wheat/ : /blé/).test(gt), 'step 4 is the wheat field: ' + gt.replace(/\n/g, ' / '));
  await shot(page, tag + '_4field');
  // ---- step 4: the field (the view moved there); tap its sign, sow
  const fl = await G(page, g => g.FIELD_GEO.label); const fs = await toScreen(page, fl[0], fl[1]);
  check(tag, fs[0] > 20 && fs[0] < 382 && fs[1] > 100 && fs[1] < 780, 'the view moved to the field: sign at ' + fs.map(Math.round));
  await page.touchscreen.tap(fs[0], fs[1]); await page.waitForTimeout(600);
  check(tag, (EN ? /Wheat field/ : /Champ de blé/).test(await page.locator('#sheetTitle').innerText()), 'the field sheet opens');
  await shot(page, tag + '_5fieldsheet');
  const c1 = await G(page, g => g.state.coins);
  await page.locator('#sheetBody .btn', { hasText: EN ? 'Sow wheat' : 'Semer du blé' }).click(); await page.waitForTimeout(500);
  const sown = await G(page, (g, c1) => ({ st: g.fieldStage(), paid: c1 - g.state.coins, task: window.__ffDebug.farmer().task }), c1);
  console.log(tag, 'sown', JSON.stringify(sown), (await page.locator('#toasts').innerText()).replace(/\n/g, ' / '));
  check(tag, sown.st === 'sprouts' && sown.paid === 20 - 10, 'sowing costs 20 (and the guide pays 10): ' + JSON.stringify(sown));
  await page.locator('#sheetClose').click(); await page.waitForTimeout(6000);
  const fpos = await D(page, () => window.__ffDebug.farmer());
  console.log(tag, 'farmer at', JSON.stringify(fpos));
  await D(page, ([x, y]) => window.__ffDebug.lookAt(x, y + 60, 1.4), fl); await page.waitForTimeout(600);
  await shot(page, tag + '_6sown');
  gt = await guide(page);
  check(tag, (EN ? /5 of 6/ : /5 sur 6/).test(gt) && await page.locator('#jobsBtn.gpulse').count() === 1, 'step 5: the Jobs button glows');
  // ---- step 5: jobs
  await page.locator('#jobsBtn').click(); await page.waitForTimeout(600);
  const jt = await page.locator('#sheetBody').innerText();
  check(tag, (EN ? /Three new jobs every day/ : /Trois nouvelles tâches/).test(jt) && await page.locator('#sheetBody .card.job').count() === 3, 'three jobs, and a bonus');
  await shot(page, tag + '_7jobs');
  await page.locator('#sheetClose').click(); await page.waitForTimeout(600);
  // ---- step 6: shows
  check(tag, await page.locator('#tabbar [data-tab="shows"].gpulse').count() === 1, 'step 6: the Shows tab glows');
  const c2 = await G(page, g => g.state.coins);
  await page.locator('#tabbar [data-tab="shows"]').click(); await page.waitForTimeout(500); await page.locator('#sheetClose').click(); await page.waitForTimeout(600);
  check(tag, !(await page.locator('#guide').isVisible()) && await G(page, (g, c2) => g.state.guide.done && g.state.coins - c2 === 60, c2), 'the guide ends (+10 and +50) and goes away');
  console.log(tag, 'toast:', (await page.locator('#toasts').innerText()).replace(/\n/g, ' / '));
  // ---- the field grows, then harvest from the sign
  await G(page, g => { g.state.field.sown -= g.FIELD.grow * .6; g.state.field.ready -= g.FIELD.grow * .6; });
  await page.waitForTimeout(500);
  check(tag, await G(page, g => g.fieldStage()) === 'growing', 'growing');
  await shot(page, tag + '_8growing');
  await G(page, g => { g.state.field.sown -= g.FIELD.grow; g.state.field.ready -= g.FIELD.grow; });
  await page.waitForTimeout(500);
  await shot(page, tag + '_9ripe');
  const f0 = await G(page, g => ({ feed: g.state.feed.basic, job: g.state.jobs.list.find(j => j.k === 'harvest') }));
  const fs2 = await toScreen(page, fl[0], fl[1]); await page.touchscreen.tap(fs2[0], fs2[1]); await page.waitForTimeout(600);
  const f1 = await G(page, g => ({ feed: g.state.feed.basic, st: g.fieldStage(), harvests: g.state.stats.harvests }));
  check(tag, f1.feed - f0.feed === 60 && f1.st === 'soil' && f1.harvests === 1, 'tapping the ripe sign harvests: +60 feed: ' + JSON.stringify([f0.feed, f1]));
  await page.waitForTimeout(4500); await shot(page, tag + '_10reap');
  console.log(tag, 'farmer', JSON.stringify(await D(page, () => window.__ffDebug.farmer())));
  // ---- jobs: progress, claim, bonus
  await G(page, g => { g.state.jobs = { day: g.dayKey(g.state.gt), bonus: false, list: [{ k: 'collect', n: 3, p: 0, got: false, c: 35, x: 25 }, { k: 'harvest', n: 1, p: 0, got: false, c: 35, x: 25 }, { k: 'cuddle', n: 1, p: 0, got: false, c: 35, x: 25 }] }; });
  const jr = await G(page, g => { const c = g.state.coops[0]; const hen = g.birdsIn(c).find(b => b.sex === 'h' && g.isGrown(b)); g.setSink(true); for (let i = 0; i < 6; i++) g.layEgg(hen, c); g.setSink(false); g.actCollect(c);
    g.state.field.sown = g.state.gt - 2 * g.FIELD.grow; g.state.field.ready = g.state.gt - g.FIELD.grow; g.actHarvest(); g.actCuddle(g.birdsIn(c).find(b => g.cuddleOk(b)));
    return { list: g.state.jobs.list.map(j => [j.k, j.p, j.n]), claim: g.jobsToClaim() }; });
  check(tag, jr.list.every(([, p, n]) => p === n) && jr.claim === 3, 'collecting, harvesting and a cuddle complete the jobs: ' + JSON.stringify(jr));
  await page.waitForTimeout(300);
  check(tag, (await page.locator('#bJobs').innerText()) === '3', 'the Jobs button shows 3 to collect');
  await page.locator('#jobsBtn').click(); await page.waitForTimeout(500);
  const cc = await G(page, g => ({ coins: g.state.coins, xp: g.state.xp }));
  for (let i = 0; i < 3; i++) { await page.locator('#sheetBody .card.job .btn').first().click(); await page.waitForTimeout(300); }
  const cc2 = await G(page, g => ({ coins: g.state.coins, xp: g.state.xp, got: g.state.jobs.list.every(j => j.got) }));
  check(tag, cc2.got && cc2.coins - cc.coins >= 105, 'each job pays: ' + JSON.stringify([cc, cc2]));
  const fb = await G(page, g => ({ k: g.bestFeed(), n: g.state.feed[g.bestFeed()] }));
  await page.locator('#sheetBody .card.bonus .btn').click(); await page.waitForTimeout(400);
  const fb2 = await G(page, (g, k) => ({ n: g.state.feed[k], bonus: g.state.jobs.bonus }), fb.k);
  check(tag, fb2.bonus && fb2.n - fb.n === 40, 'the bonus: a bag of feed: ' + JSON.stringify([fb, fb2]));
  await shot(page, tag + '_11claimed');
  await page.locator('#sheetClose').click(); await page.waitForTimeout(300);
  // ---- a new day brings new jobs
  const nd = await G(page, g => { g.state.jobs.day = 1; g.advance(1000); return { day: g.state.jobs.day === g.dayKey(g.state.gt), n: g.state.jobs.list.length, kinds: g.state.jobs.list.map(j => j.k), bonus: g.state.jobs.bonus }; });
  check(tag, nd.day && nd.n === 3 && new Set(nd.kinds).size === 3 && !nd.bonus, 'a new day: three new jobs: ' + nd.kinds);
  // ---- saves
  const sv = await G(page, g => { const o = JSON.parse(JSON.stringify(g.state));
    o.jobs = { day: 'x', bonus: 'yes', list: [{ k: 'hack', n: 1 }, { k: 'collect', n: 5, p: 99, got: 1, c: 1e9, x: -5 }, { k: '__proto__', n: 2 }, { k: 'show', n: 1, p: 1, got: true, c: 50, x: 30 }] };
    o.field = { sown: 5, ready: o.gt + 1e9 }; o.guide = { step: 99, done: false, did: ['collect', 'evil', 'collect'] };
    const s = g.sanitize(o); const old = JSON.parse(JSON.stringify(g.state)); delete old.guide; delete old.jobs; delete old.field; const s2 = g.sanitize(old);
    return { jobs: s.jobs, field: s.field, grow: g.FIELD.grow, gt: o.gt, guide: s.guide, oldGuide: s2.guide, oldField: s2.field, oldJobs: s2.jobs }; });
  console.log(tag, 'saves', JSON.stringify(sv));
  check(tag, sv.jobs.list.length === 1 && sv.jobs.list[0].p === 5 && sv.jobs.list[0].got === false && sv.jobs.list[0].c <= 325 && sv.jobs.list[0].x === 0 && sv.jobs.bonus === false && sv.jobs.day === 0
    && sv.field.ready <= sv.gt + sv.grow && sv.field.ready - sv.field.sown === sv.grow && sv.guide.done && sv.guide.did.length === 1 && sv.oldGuide.done && sv.oldField.ready === 0 && sv.oldJobs.list.length === 0, 'tampered and older saves are cleaned');
  await ctx.close();
}
console.log('BAD', JSON.stringify(bad));
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

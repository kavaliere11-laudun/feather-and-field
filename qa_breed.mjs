// QA for breeding you can plan: the coop's breeding plan (who each hen breeds with, eggs only, change rooster, bring one
// from another coop), the predicted chicks against real breeding, family trees, sell-or-keep for top birds, and saves. EN and FR.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const shot = (page, n) => page.screenshot({ path: `r/br_${n}.png` });
const D = (page, fn, arg) => page.evaluate(fn, arg);
const G = (page, fn, arg) => page.evaluate(([f, a]) => window.__ffDebug.inside(g => (new Function('g', 'a', 'return (' + f + ')(g, a)'))(g, a)), [fn.toString(), arg]);
const check = (tag, ok, what) => { console.log(tag, ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(tag + ' ' + what); };
const scrollTo = async (page, sel) => { await page.locator(sel).first().evaluate(el => el.scrollIntoView({ block: 'start' })); await page.waitForTimeout(250); };
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2), EN = tag === 'en';
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(1000);
  await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1000);
  await D(page, () => { const d = window.__ffDebug; d.quiet(); d.setHour(11); d.speed(1); d.rich(); });
  await page.waitForTimeout(1500);
  // a Silkie coop: 1 adult rooster + adult hens (rich() gives rooster, 2 adult hens, a young one and a chick)
  const cid = await G(page, g => { g.closeSheet(); const c = g.state.coops.find(c => c.breed === 'sil' && g.adultRoosters(c).length); for (const b of g.birdsIn(c)) b.born = Math.min(b.born, g.state.gt - g.T.adult - 3600e3); return c.id; });
  await page.waitForTimeout(4000);
  await G(page, (g, id) => { g.closeSheet(); g.openSheet('coop', { id }); }, cid); await page.waitForTimeout(500);
  await scrollTo(page, '#sheetBody .planrow');
  await page.locator('#sheetBody .planrow').first().evaluate(el => el.closest('.card').scrollIntoView({ block: 'start' })); await page.waitForTimeout(300);
  await shot(page, tag + '_1plan');
  const planTxt = await page.locator('#sheetBody').innerText();
  check(tag, (EN ? /Breeding plan/ : /Plan de reproduction/).test(planTxt) && (EN ? /Chicks: quality about \d+/ : /Poussins : qualité d’environ \d+/).test(planTxt), 'the plan shows each hen with her expected chicks');
  check(tag, (EN ? /beat both parents/ : /meilleurs que les deux parents/).test(planTxt) && /%/.test(planTxt), 'and the chance of a chick better than both parents');
  // eggs only for the first hen
  const hen1 = await G(page, (g, id) => { const c = g.coopById(id); return g.birdsIn(c).filter(b => b.sex === 'h' && g.isGrown(b))[0].id; }, cid);
  await page.locator('#sheetBody .planrow').filter({ hasText: await G(page, (g, id) => g.birdById(id).name, hen1) }).locator('.chip', { hasText: EN ? 'Eggs only' : 'Œufs seulement' }).click(); await page.waitForTimeout(300);
  const nb = await G(page, (g, id) => ({ nobreed: g.birdById(id).nobreed, mate: g.mateOf(g.birdById(id), g.coopById(g.birdById(id).home)) }), hen1);
  check(tag, nb.nobreed === true && nb.mate === null, 'Eggs only: she no longer breeds');
  const laid = await G(page, (g, [hid, cid]) => { const c = g.coopById(cid), hen = g.birdById(hid); c.nest = { plain: 0, fertile: [] }; g.setSink(true); for (let i = 0; i < 40; i++) g.layEgg(hen, c); g.setSink(false); const r = { fertile: c.nest.fertile.length, plain: c.nest.plain }; c.nest = { plain: 0, fertile: [] }; return r; }, [hen1, cid]);
  check(tag, laid.fertile === 0 && laid.plain === 40, 'an eggs-only hen lays no fertile eggs: ' + JSON.stringify(laid));
  // a second adult rooster in the coop: the hen chooses
  const r2 = await G(page, (g, cid) => { const c = g.coopById(cid); const spare = g.birdsIn(c).filter(b => b.sex === 'h'); g.actSell(spare[spare.length - 1]);
    const r = g.makeBird({ breed: 'sil', sex: 'r', traits: { type: 70, plum: 70, size: 70, lay: 50 }, born: g.state.gt - g.T.adult - 3600e3, home: c.id, geno: g.silTemplate('blue'), name: 'Rexy' }); g.state.birds.push(r); g.openSheet('coop', { id: cid }); return r.id; }, cid);
  await page.waitForTimeout(300);
  const hen2 = await G(page, (g, id) => { const c = g.coopById(id); return g.birdsIn(c).filter(b => b.sex === 'h' && g.isGrown(b))[1].id; }, cid);
  await page.locator('#sheetBody .planrow').filter({ hasText: await G(page, (g, id) => g.birdById(id).name, hen2) }).locator('.chip', { hasText: 'Rexy' }).click(); await page.waitForTimeout(300);
  const eggs2 = await G(page, (g, [hid, cid, rid]) => { const c = g.coopById(cid), hen = g.birdById(hid); c.nest = { plain: 0, fertile: [] }; g.setSink(true); for (let i = 0; i < 40; i++) g.layEgg(hen, c); g.setSink(false);
    const f = c.nest.fertile; const r = { n: f.length, allRexy: f.every(e => e.sire.id === rid && e.dam.id === hid), gp: f[0] && f[0].gp }; return r; }, [hen2, cid, r2]);
  check(tag, eggs2.n > 20 && eggs2.allRexy && Array.isArray(eggs2.gp) && eggs2.gp.length === 4, `the chosen rooster fathers her eggs (${eggs2.n} fertile, all Rexy: ${eggs2.allRexy}), and they carry the grandparents`);
  await shot(page, tag + '_2tworoos');
  // change the breeding rooster: bring one from another Silkie coop into this (full) coop: a swap
  await G(page, (g, cid) => { const c = g.coopById(cid); g.coopById(cid).nest = { plain: 0, fertile: [] }; while (g.birdsIn(c).length < 5) { const h = g.makeBird({ breed: 'sil', sex: 'h', traits: g.shopTraits(), born: g.state.gt - g.T.adult - 3600e3, home: c.id, geno: g.silTemplate('black') }); g.state.birds.push(h); } g.renderSheet(); }, cid);
  await page.waitForTimeout(300);
  await page.locator('#sheetBody .btn', { hasText: EN ? 'Change' : 'Changer' }).click(); await page.waitForTimeout(400);
  await scrollTo(page, '#sheetBody h3');
  await shot(page, tag + '_3pick');
  const pickTxt = await page.locator('#sheetBody').innerText();
  check(tag, (EN ? /In other coops/ : /Dans d’autres poulaillers/).test(pickTxt) && (EN ? /goes to/ : /part dans/).test(pickTxt), 'roosters from other coops are offered, with who would swap out');
  const before = await G(page, cid => { const g2 = window; return null; }, cid);
  const sw = await G(page, (g, cid) => { const c = g.coopById(cid); const other = g.state.birds.find(r => r.sex === 'r' && r.breed === 'sil' && g.isGrown(r) && r.home !== cid && g.coopById(r.home)); return { roo: other.id, from: other.home }; }, cid);
  await page.locator('#sheetBody .card', { hasText: await G(page, (g, id) => g.birdById(id).name, sw.roo) }).filter({ has: page.locator('.btn') }).last().locator('.btn').click(); await page.waitForTimeout(400);
  const after = await G(page, (g, [cid, sw]) => { const c = g.coopById(cid), f = g.coopById(sw.from), r = g.birdById(sw.roo); return { home: r.home, sire: c.sire === r.id, n: g.birdsIn(c).length, nFrom: g.birdsIn(f).length, fromRoos: g.birdsIn(f).filter(b => b.sex === 'r').map(b => b.name), fromSire: f.sire }; }, [cid, sw]);
  check(tag, after.home === cid && after.sire && after.n === 5 && after.nFrom === 5 && after.fromSire, 'the rooster swaps in and becomes the breeding rooster; the other one goes back: ' + JSON.stringify(after));
  console.log(tag, 'toast:', (await page.locator('#toasts').innerText()).replace(/\n/g, ' / '));
  // ---- predictions vs real breeding (EN only, same code)
  if (EN) {
    const acc = await G(page, g => {
      const out = [];
      const mk = (sex, tr, pers) => g.makeBird({ breed: 'orp', sex, traits: tr, born: g.state.gt - g.T.adult - 3600e3, home: g.state.coops[0].id, pers });
      const cases = [[{ type: 50, plum: 50, size: 50, lay: 50 }, { type: 50, plum: 50, size: 50, lay: 50 }, 'brave'], [{ type: 80, plum: 75, size: 70, lay: 60 }, { type: 60, plum: 65, size: 55, lay: 70 }, 'mum'], [{ type: 90, plum: 92, size: 88, lay: 85 }, { type: 88, plum: 90, size: 91, lay: 80 }, 'diva']];
      for (const [a, b, pers] of cases) {
        const s = mk('r', a, 'brave'), d = mk('h', b, pers); const o = g.chickOdds(s, d, null); let sq = 0, better = 0; const N = 4000; const best = Math.max(g.quality(s), g.quality(d));
        for (let i = 0; i < N; i++) { const c = g.childSpec(s, d, 0); const q = Math.round(.3 * c.traits.type + .3 * c.traits.plum + .2 * c.traits.size + .2 * c.traits.lay); sq += q; if (q > best) better++; }
        out.push({ pred: o.q, real: +(sq / N).toFixed(1), predBetter: +o.better.toFixed(3), realBetter: +(better / N).toFixed(3) });
      }
      return out;
    });
    console.log('prediction vs breeding:', JSON.stringify(acc));
    check(tag, acc.every(a => Math.abs(a.pred - a.real) <= 1.2 && Math.abs(a.predBetter - a.realBetter) < .06), 'predicted chick quality and "beat both parents" match real breeding');
  }
  // ---- family tree: hatch a chick of two farm-bred parents
  const kid = await G(page, (g, cid) => {
    const c = g.coopById(cid), s = g.adultRoosters(c)[0], d = g.birdsIn(c).find(b => b.sex === 'h' && g.isGrown(b));
    s.sire = { name: 'Old Tom', q: 71, ch: 2 }; s.dam = { name: 'Hattie', q: 64, col: 'buff' }; d.sire = { name: 'Bramble', q: 58 }; d.dam = null; s.champ = 1;
    const e = { id: g.state.nextId++, child: g.childSpec(s, d, 0), sire: g.pInfo(s), dam: g.pInfo(d), gp: [s.sire, s.dam, d.sire, d.dam], laid: g.state.gt };
    const free = g.state.coops.find(x => x.breed === 'sil' && g.birdsIn(x).length < 5) || (() => { const x = g.state.coops.find(x => x.breed === 'sil' && x.id !== cid); for (const b of g.birdsIn(x).filter(b => b.sex === 'h').slice(0, 1)) g.actSell(b); return x; })();
    const it = { egg: e, start: g.state.gt - 3 * 3600e3 }; g.tryHatch(it); const b = g.state.birds[g.state.birds.length - 1];
    return { id: b.id, gp: b.gp, sire: b.sire, dam: b.dam, sireId: s.id };
  }, cid);
  check(tag, kid.gp && kid.gp[0].name === 'Old Tom' && kid.sire.ch === 1 && kid.sire.id === kid.sireId, 'a hatched chick keeps parents and grandparents: ' + JSON.stringify(kid.gp));
  await G(page, (g, id) => { g.closeSheet(); g.openSheet('bird', { id }); }, kid.id); await page.waitForTimeout(500);
  await scrollTo(page, '#sheetBody .tree');
  await page.locator('#sheetBody .tree').evaluate(el => el.closest('.card').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
  await shot(page, tag + '_4tree');
  const nodes = await page.locator('#sheetBody .tnode').count(), names = await page.locator('#sheetBody .tree').innerText();
  check(tag, nodes === 7 && /Old Tom/.test(names) && /🏅/.test(names) && /\?/.test(names), `the family tree: ${nodes} boxes`);
  await page.locator('#sheetBody button.tnode').first().click(); await page.waitForTimeout(400);
  const t2 = await page.locator('#sheetTitle').innerText();
  check(tag, t2 === await G(page, (g, id) => g.birdById(id).name, kid.sireId), 'tapping a parent opens the parent: ' + t2);
  // ---- sell or keep: a top hen
  const top = await G(page, (g, cid) => { const c = g.coopById(cid); const d = g.birdsIn(c).find(b => b.sex === 'h' && g.isGrown(b)); d.traits = { type: 86, plum: 88, size: 80, lay: 78 }; d.nobreed = false; d.mate = null; d.born = g.state.gt - 5 * 864e5; g.closeSheet(); g.openSheet('bird', { id: d.id }); return d.id; }, cid);
  await page.waitForTimeout(500);
  await page.locator('#sheetBody .skgrid').evaluate(el => el.closest('.card').scrollIntoView({ block: 'start' })); await page.waitForTimeout(300);
  await shot(page, tag + '_5sellkeep');
  const sk = await page.locator('#sheetBody .skgrid').locator('..').innerText();
  const o = await G(page, (g, id) => g.outlook(g.birdById(id)), top);
  console.log(tag, 'outlook:', JSON.stringify(o));
  check(tag, (EN ? /Sell or keep/ : /Vendre ou garder/).test(sk) && o.n > 5 && o.total > o.now && (EN ? /gets older in/ : /vieillisse dans/).test(sk), 'the sell-or-keep card: sell now vs her chicks, and when her price drops');
  await page.locator('#sheetBody .skopt .btn.good').click(); await page.waitForTimeout(300);
  check(tag, await G(page, (g, id) => g.birdById(id).keep === true, top) && (await page.locator('#sheetBody .tag.good').count()) > 0, 'Keep her: marked as a keeper');
  await page.locator('#sheetBody .textbtn', { hasText: EN ? 'Change my mind' : 'Changer d’avis' }).click(); await page.waitForTimeout(300);
  check(tag, await G(page, (g, id) => g.birdById(id).keep === false, top), 'Change my mind undoes it');
  // ---- saves
  const sv = await G(page, (g, [cid, top]) => { const o = JSON.parse(JSON.stringify(g.state)); const hb = o.birds.find(b => b.id === top), rb = o.birds.find(b => b.sex === 'r' && b.home === cid);
    hb.nobreed = 'yes'; hb.mate = '<x>'; hb.keep = 1; hb.gp = [{ name: '<img src=x onerror=alert(1)>', q: 500, ch: 'lots', col: 'constructor' }, null, { name: 'Ok', q: 50, col: 'blue' }, 7]; rb.nobreed = true; rb.mate = 5;
    const fe = o.coops.find(c => c.id === cid); fe.nest.fertile = [{ id: 9, child: { breed: 'sil', sex: 'h', traits: { type: 50, plum: 50, size: 50, lay: 50 }, geno: g.silTemplate('white') }, sire: { name: 'A', q: 50 }, dam: { name: 'B', q: 50 }, gp: [1, 2, 3], laid: 0 }];
    const s = g.sanitize(o); const H = s.birds.find(b => b.id === top), R = s.birds.find(b => b.id === rb.id);
    return { nobreed: H.nobreed, mate: H.mate, keep: H.keep, gp: H.gp, rNobreed: R.nobreed, rMate: R.mate, eggGp: s.coops.find(c => c.id === cid).nest.fertile[0].gp }; }, [cid, top]);
  console.log(tag, 'saves:', JSON.stringify(sv));
  check(tag, sv.nobreed === false && sv.mate === null && sv.keep === false && sv.gp[0].q === 100 && !/</.test(sv.gp[0].name) && !sv.gp[0].col && !sv.gp[0].ch && sv.gp[1] === null && sv.gp[2].col === 'blue' && sv.gp[3] === null && sv.rNobreed === false && sv.rMate === null && sv.eggGp === null, 'tampered breeding data is cleaned');
  await ctx.close();
}
console.log('BAD', JSON.stringify(bad));
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

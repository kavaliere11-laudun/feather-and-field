// QA for Audrey's 19 Oct screenshot: runaways hop over the fence to clear grass (and back when caught), the farmer is
// never cut by a fence post, the game loop survives a bad frame, and the farm code moves a farm (EN and FR).
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const D = (page, fn, arg) => page.evaluate(fn, arg);
const G = (page, fn, arg) => page.evaluate(([f, a]) => window.__ffDebug.inside(g => (new Function('g', 'a', 'return (' + f + ')(g, a)'))(g, a)), [fn.toString(), arg]);
const check = (tag, ok, what) => { console.log(tag, ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(tag + ' ' + what); };
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2), EN = tag === 'en';
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(1000);
  await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1200);
  await D(page, () => { const d = window.__ffDebug; d.quiet(); d.setHour(15); d.speed(1); });
  await G(page, g => { g.actSkipGuide(); g.state.coins = 1e6; g.state.xp = g.xpFor(7); g.state.level = 7; g.state.plots = 6;
    for (const breed of ['rir', 'sil', 'orp']) { g.actBuildCoop(breed); g.closeSheet(); }
    for (const c of g.state.coops) c.ready = g.state.gt - 1;
    for (const c of g.state.coops.slice(1)) for (let k = 0; k < 4; k++) { const o = { breed: c.breed, sex: k ? 'h' : 'r', traits: g.shopTraits(), born: g.state.gt - 4 * 864e5, home: c.id, pers: k === 2 ? 'rebel' : 'brave' }; if (c.breed === 'sil') o.geno = g.silTemplate(['buff', 'grey', 'white', 'black'][k]); g.state.birds.push(g.makeBird(o)); }
    for (const b of g.state.birds) if (b.home === g.state.coops[0].id && b.sex === 'h') b.pers = 'rebel';
    for (const b of g.state.birds) { b.out = 0; b.nextOut = g.state.gt + 864e5; }
    g.closeSheet(); });
  await page.waitForTimeout(1500);
  // ---- escape: they hop out
  await D(page, () => window.__ffDebug.lookAt(900, 900, 1.0)); await page.waitForTimeout(800);
  await G(page, g => { for (const b of g.state.birds.filter(b => b.pers === 'rebel' && g.isGrown(b))) { b.out = 0; b.hide = 0; b.nextOut = g.state.gt - 1; } g.advance(1000); });
  let hopMax = 0, liftMax = 0;
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(90); const pr = await G(page, g => g.state.birds.filter(b => b.out).map(b => window.__ffDebug.birdAt(b.id)).filter(Boolean)); hopMax = Math.max(hopMax, pr.filter(a => a.st === 'hop').length); liftMax = Math.max(liftMax, ...pr.map(a => a.lift || 0)); }
  await page.screenshot({ path: `r/fe_${tag}_1hop.png` });
  check(tag, hopMax >= 4 && liftMax > 25, `runaways hop over the fence (${hopMax} hopping, up to ${liftMax.toFixed(0)} px high)`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `r/fe_${tag}_2landed.png` });
  // where they landed: clear of every fence, on open ground
  const land = await G(page, g => g.state.birds.filter(b => b.out).map(b => { const a = window.__ffDebug.birdAt(b.id), p = g.plots.find(p => p.kind === 'coop' && p.coop.id === b.home);
    const m = g.toMap(p.f, a.x, a.y); let worst = 99; for (const q of g.plots) if (q.kind === 'coop' || q.kind === 'build') worst = Math.min(worst, g.outsideBy(...g.toLocal(q.f, m[0], m[1])));
    return { st: a.st, clear: +worst.toFixed(2) }; }));
  check(tag, land.length >= 4 && land.every(l => l.clear >= .4 && l.st !== 'hop'), 'they land on grass at least 0.4 m from any fence: ' + JSON.stringify(land));
  // caught: back over the fence
  const bid = await G(page, g => { const b = g.state.birds.find(b => b.out); g.rebelHome(b, null); return b.id; }); await page.waitForTimeout(250);
  const back = await D(page, id => { const a = window.__ffDebug.birdAt(id); return a && a.st; }, bid);
  check(tag, back === 'hop', 'a caught runaway hops back in: ' + back);
  // ---- the farmer at the Pagoda's gate is drawn in front of its fence
  const gate = await G(page, g => { const p = g.plots.find(p => p.kind === 'coop' && p.coop.breed === 'sil'); const m = g.toMap(p.f, -0.15, -1.9); return { m, key: g.standKey(m[0], m[1]), fence: p.f.c[1] + 200, inside: g.toMap(p.f, -0.15, -1.1) }; });
  check(tag, gate.key > gate.fence, 'the farmer at the gate is drawn after the near fence: ' + JSON.stringify(gate));
  const ins = await G(page, (g, m) => { const p = g.plots.find(p => p.kind === 'coop' && p.coop.breed === 'sil'); return g.standKey(m[0], m[1]) < p.f.c[1] + 200; }, gate.inside);
  check(tag, ins, 'inside the pen she stays behind its near fence');
  await D(page, ([x, y]) => { const d = window.__ffDebug; d.farmerTo(x, y); d.lookAt(x + 40, y - 60, 1.3); }, gate.m); await page.waitForTimeout(700);
  await page.screenshot({ path: `r/fe_${tag}_3gate.png` });
  // ---- a bad frame does not stop the game
  await D(page, () => window.__ffDebug.lookAt(NaN, NaN, NaN)); await page.waitForTimeout(500);
  const v = await D(page, () => window.__ffDebug.view());
  const t0 = await D(page, () => window.__ffDebug.inside(g => g.state.gt)); await page.waitForTimeout(700); const t1 = await D(page, () => window.__ffDebug.inside(g => g.state.gt));
  check(tag, isFinite(v.x) && isFinite(v.y) && isFinite(v.s) && t1 > t0, 'a broken camera value is repaired and the farm keeps running: ' + JSON.stringify(v));
  // ---- farm code: copy, then load it into a fresh farm
  const lvl = await G(page, g => g.state.level);
  await G(page, g => g.openSheet('settings')); await page.waitForTimeout(400);
  await page.locator('#sheetBody .btn', { hasText: EN ? 'Copy my farm code' : 'Copier le code' }).click(); await page.waitForTimeout(800);
  const code = await page.evaluate(() => navigator.clipboard.readText());
  check(tag, /^FF1-[A-Za-z0-9+/=]{100,}$/.test(code), 'a farm code is copied (' + code.length + ' characters)');
  await page.locator('#sheetBody textarea.codebox').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  await page.screenshot({ path: `r/fe_${tag}_4code.png` });
  // a brand-new farm (as on a reinstalled app), then paste
  await G(page, g => { localStorage.clear(); });
  const ctx2 = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc });
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push(tag + ' pageerror(2): ' + e.message));
  await p2.goto(process.env.URL); await p2.waitForTimeout(1200);
  await p2.locator('#sheetClose').click(); await p2.waitForTimeout(800); await p2.locator('#sheetBody .btn').last().click(); await p2.waitForTimeout(800);
  await p2.evaluate(() => window.__ffDebug.inside(g => { g.actSkipGuide(); g.openSheet('settings'); })); await p2.waitForTimeout(400);
  await p2.locator('#codeIn').fill('FF1-nonsense' + 'A'.repeat(40));
  const loadBtn = p2.locator('#codeIn + button');
  await loadBtn.click(); await p2.waitForTimeout(200); await loadBtn.click(); await p2.waitForTimeout(700);
  check(tag, (await p2.evaluate(() => window.__ffDebug.inside(g => g.state.level))) === 1 && /work|fonctionne/.test(await p2.locator('#toasts').innerText()), 'a broken code is refused: ' + (await p2.locator('#toasts').innerText()).replace(/\n/g, ' / '));
  await p2.waitForTimeout(3600);                       // the "tap again" times out
  await p2.locator('#codeIn').fill(code);
  await loadBtn.click(); await p2.waitForTimeout(200); await loadBtn.click(); await p2.waitForTimeout(1200);
  const got = await p2.evaluate(() => window.__ffDebug.inside(g => ({ level: g.state.level, coops: g.state.coops.length, birds: g.state.birds.length, edited: g.state.flags.edited })));
  console.log(tag, 'loaded:', JSON.stringify(got), (await p2.locator('#toasts').innerText()).replace(/\n/g, ' / '));
  check(tag, got.level === lvl && got.coops === 4 && !got.edited, 'the farm comes back from its code');
  // an edited code still loads through the checks, and is flagged
  const tam = await p2.evaluate(async c => window.__ffDebug.inside(async g => { const s = await g.readFarmCode(c); return s && s.coins; }), code);
  check(tag, tam > 0, 'codes are read through the save checks');
  await ctx2.close(); await ctx.close();
}
console.log('BAD', JSON.stringify(bad));
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

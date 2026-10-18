// QA for personalities: rules checked in the game's own code, then screens in English and French at iPhone size.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const closeAll = async page => { for (let k = 0; k < 4; k++) if (await page.locator('#sheet').isVisible()) { await page.locator('#sheetClose').click(); await page.waitForTimeout(250); } };
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2);
  const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc })).newPage();
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await closeAll(page);
  console.log(tag, 'starter flock', JSON.stringify(await page.evaluate(() => window.__ffDebug.pers())));

  if (tag === 'en') {
    const res = await page.evaluate(() => window.__ffDebug.inside(g => {
      const st = g.state, c = st.coops[0], out = {};
      const hens = g.birdsIn(c).filter(b => b.sex === 'h'), roo = g.birdsIn(c).find(b => b.sex === 'r');
      const hen = hens[0], keep = st.birds.map(b => b.pers);
      // 1. inheritance from a good-mum mother and a diva father
      hen.pers = 'mum'; roo.pers = 'diva';
      let N = 4000, mum = 0, diva = 0, rMum = 0, fast = 0, hensN = 0, tr = 0;
      for (let i = 0; i < N; i++) { const k = g.childSpec(roo, hen); if (k.sex === 'h') { hensN++; if (k.pers === 'mum') mum++; } else if (k.pers === 'mum') rMum++; if (k.pers === 'diva') diva++; if (k.fast) fast++; tr += k.traits.type; }
      hen.pers = 'brave'; let tr2 = 0; for (let i = 0; i < N; i++) tr2 += g.childSpec(roo, hen).traits.type;
      out.inherit = { mumAmongHens: +(mum / hensN).toFixed(3), divaAll: +(diva / N).toFixed(3), roosterMum: rMum, fastShare: fast / N, traitBonus: +((tr - tr2) / N).toFixed(2) };
      // 2. fertility: a good mum's eggs vs another hen's
      const fertRate = pers => { hen.pers = pers; let f = 0; for (let i = 0; i < 4000; i++) { c.nest = { plain: 0, fertile: [] }; g.layEgg(hen, c); f += c.nest.fertile.length; } c.nest = { plain: 0, fertile: [] }; return +(f / 4000).toFixed(3); };
      out.fertility = { mum: fertRate('mum'), other: fertRate('glutton') };
      // 3. laying speed factors
      hen.pers = 'diva'; c.last = 'basic'; const dBasic = g.layMult(hen, c, st.gt); c.last = 'premium'; const dPrem = g.layMult(hen, c, st.gt); c.last = 'basic';
      out.layMult = { divaBasic: +dBasic.toFixed(3), divaPremium: dPrem };
      // 4. a glutton eats half as much again: feed used in 2 days, with and without one
      const used = glut => { for (const b of g.birdsIn(c)) b.pers = 'brave'; if (glut) hens[1].pers = 'glutton'; c.feeder = { basic: 80, premium: 0, show: 0 }; c.acc = 0; g.setSink({ any: false }); g.advance(16 * 3600e3); g.setSink(null); return 80 - g.feederTotal(c); };
      out.feed16h = { normal: used(false), withGlutton: used(true) };
      // 5. a rebel over three days (no one catches her)
      for (const b of g.birdsIn(c)) b.pers = 'brave'; hen.pers = 'rebel'; hen.nextOut = 0; hen.out = 0; hen.hide = 0;
      const sk = { any: false }; g.setSink(sk); g.advance(3 * 24 * 3600e3); g.setSink(null);
      out.rebel3days = { escapes: sk.escape || 0, finds: sk.finds || 0, nightsOut: sk.hide || 0, mornings: sk.tree || 0, fox: (sk.fox || 0) + (sk.foxBrave || 0) };
      // 6. tampered saves are cleaned
      const s2 = JSON.parse(JSON.stringify(st)); const r2 = s2.birds.find(b => b.sex === 'r'); r2.pers = 'mum'; const h2 = s2.birds.find(b => b.sex === 'h'); h2.pers = 'rebel'; h2.out = s2.gt + 9e9; h2.hide = 9e15; s2.birds[2].pers = '<script>';
      const o = g.sanitize(s2), R = o.birds.find(b => b.id === r2.id), H = o.birds.find(b => b.id === h2.id);
      out.sanitize = { roosterNotMum: R.pers !== 'mum', outClamped: H.out <= o.gt + g.PR.outFor[1], hide: H.hide, badPers: o.birds[2].pers };
      st.birds.forEach((b, i) => { if (keep[i]) b.pers = keep[i]; });
      return out;
    }));
    console.log('RULES', JSON.stringify(res, null, 1));
    await page.reload(); await page.waitForTimeout(1200); await closeAll(page);
  }
  // ---- farm: a runaway outside the pen
  await page.evaluate(() => { const D = window.__ffDebug; D.quiet(); });
  const runner = await page.evaluate(() => window.__ffDebug.escapeNow());
  await page.waitForTimeout(500);
  const toasts1 = await page.locator('#toasts').innerText();
  console.log(tag, 'escaped:', runner, '| toast:', toasts1.replace(/\n/g, ' / '));
  await page.evaluate(() => window.__ffDebug.inside(g => { const b = g.state.birds.find(b => b.out); return b && b.id; })).then(id => id && page.evaluate(id => window.__ffDebug.focus && window.__ffDebug.focus(id), id));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `r/pers_${tag}_runaway.png` });
  const at = await page.evaluate(() => window.__ffDebug.runawayAt());
  console.log(tag, 'runaway at', JSON.stringify(at));
  if (at) { await page.touchscreen.tap(at[0], at[1]); await page.waitForTimeout(600); }
  const toasts2 = await page.locator('#toasts').innerText();
  console.log(tag, 'after tap:', toasts2.replace(/\n/g, ' / '), '| still out:', JSON.stringify(await page.evaluate(() => window.__ffDebug.pers().filter(p => p[3]))));
  await page.screenshot({ path: `r/pers_${tag}_caught.png` });
  // ---- protest sign
  await page.evaluate(() => window.__ffDebug.protestNow()); await page.waitForTimeout(800);
  await page.screenshot({ path: `r/pers_${tag}_protest.png` });
  const ph = await page.evaluate(() => window.__ffDebug.protestAt());
  console.log(tag, 'protest signs', JSON.stringify(ph));
  if (ph.length) { await page.touchscreen.tap(ph[0][0], ph[0][1]); await page.waitForTimeout(600); console.log(tag, 'after sign tap:', (await page.locator('#toasts').innerText()).replace(/\n/g, ' / ')); }
  // ---- the fox
  await page.evaluate(() => window.__ffDebug.foxNow()); await page.waitForTimeout(500);
  console.log(tag, 'fox:', (await page.locator('#toasts').innerText()).replace(/\n/g, ' / '));
  // ---- screens
  await closeAll(page);
  for (const p of ['rebel', 'mum']) {
    const nm = await page.evaluate(p => window.__ffDebug.openBird(p), p); await page.waitForTimeout(500);
    if (nm) { await page.screenshot({ path: `r/pers_${tag}_bird_${p}.png` }); await page.locator('#sheetBody').evaluate(el => el.scrollTop = 0); }
    await closeAll(page);
  }
  await page.locator('[data-tab="market"]').click(); await page.waitForTimeout(600);
  await page.screenshot({ path: `r/pers_${tag}_market.png` });
  await closeAll(page);
}
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

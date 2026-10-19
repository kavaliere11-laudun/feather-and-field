// QA for the clearer Shows screen: the explainer, who can enter, the best bird with its judges' score and chance,
// one-tap entry, "Choose another", reasons when nobody can enter; and the chance maths against a simulation. EN and FR.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const shot = (page, n) => page.screenshot({ path: `r/sh_${n}.png` });
const D = (page, fn, arg) => page.evaluate(fn, arg);
const G = (page, fn, arg) => page.evaluate(([f, a]) => window.__ffDebug.inside(g => (new Function('g', 'a', 'return (' + f + ')(g, a)'))(g, a)), [fn.toString(), arg]);
const check = (tag, ok, what) => { console.log(tag, ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(tag + ' ' + what); };
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2), EN = tag === 'en';
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(1000);
  await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1000);
  await D(page, () => { const d = window.__ffDebug; d.quiet(); d.setHour(11); d.speed(1); });

  // ---- a new farm: a village show for its own breed
  await G(page, g => { g.state.shows.list = []; g.createShow('village', g.state.birds[0].breed); g.openSheet('shows'); });
  await page.waitForTimeout(600);
  const body1 = await page.locator('#sheetBody').innerText();
  check(tag, (EN ? /How shows work/ : /Comment ça marche/).test(body1), 'the explainer is there (open on a new farm)');
  check(tag, (EN ? /Results in/ : /Résultats dans/).test(body1), 'says when the results come');
  check(tag, (EN ? /Your best bird/ : /Votre meilleure volaille/).test(body1) || (EN ? /too young|no birds/ : /trop jeunes|pas encore/).test(body1), 'shows the best bird or why not: ' + body1.split('\n').filter(l => /best|meilleure|young|jeunes/i.test(l)).join(' | '));
  await shot(page, tag + '_1new');
  await page.locator('#sheetBody').evaluate(el => el.scrollTop = 9999); await page.waitForTimeout(200); await shot(page, tag + '_1new_b');

  // ---- a bigger farm
  await G(page, g => { window.__ffDebug.rich(); }); await page.waitForTimeout(1500);
  await G(page, g => { g.closeSheet(); g.state.shows.list = []; g.state.shows.history = [];
    g.createShow('national', 'any'); g.createShow('county', 'sil'); g.createShow('village', 'bra'); }); await page.waitForTimeout(5000);
  await G(page, g => { g.closeSheet(); g.openSheet('shows'); });
  await page.waitForTimeout(600);
  await shot(page, tag + '_2rich');
  const tags = await page.locator('#sheetBody .tag').allInnerTexts();
  check(tag, tags.filter(x => /%/.test(x)).length >= 3, 'each show gives a chance with a %: ' + tags.filter(x => /%/.test(x)).join(' | '));
  const who = await page.locator('#sheetBody .card .small.muted').allInnerTexts();
  check(tag, who.some(x => EN ? /any breed/.test(x) : /toutes races/.test(x)) && who.some(x => EN ? /Silkies in a show colour/.test(x) : /couleur standard/.test(x)), 'says who can enter: ' + who.slice(0, 3).join(' | '));
  // one tap enters the best bird
  const before = await G(page, g => ({ coins: g.state.coins, best: g.state.birds.filter(b => g.canEnter(b, g.state.shows.list[0])).sort((a, b) => g.showScore(b) - g.showScore(a))[0].id }));
  await page.locator('#sheetBody .card').nth(1).locator('.btn').first().click(); await page.waitForTimeout(400);
  const after = await G(page, g => ({ coins: g.state.coins, entry: g.state.shows.list[0].entry }));
  check(tag, after.entry === before.best && before.coins - after.coins === 150, 'one tap enters the best bird and takes the fee: ' + JSON.stringify([before, after]));
  check(tag, (await page.locator('#sheetBody .card').nth(1).innerText()).match(EN ? /entered/i : /inscrit/i) != null, 'the card now says she is entered');
  // choose another
  const other = page.locator('#sheetBody .textbtn', { hasText: EN ? 'Choose another' : 'Choisir une autre' }).first();
  await other.click(); await page.waitForTimeout(400);
  const rows = await page.locator('#sheetBody .list .card').count();
  check(tag, rows >= 2, 'Choose another lists the birds with their scores: ' + rows);
  await shot(page, tag + '_3choose');
  const r0 = await page.locator('#sheetBody .list .card').first().innerText();
  check(tag, (EN ? /Judges’ score \d+/ : /Note des juges \d+/).test(r0) && /%/.test(r0), 'each row has a score and a chance');
  await page.locator('#sheetBody .list .card').nth(1).locator('.btn').click(); await page.waitForTimeout(400);
  check(tag, await G(page, g => !!g.state.shows.list[1].entry), 'entering from the list works');
  // nobody can enter: a Brahma class with young Brahmas only
  await G(page, g => { for (const b of g.state.birds) if (b.breed === 'bra') b.born = g.state.gt - 1000; g.renderSheet(); });
  await page.waitForTimeout(300);
  const c3 = await page.locator('#sheetBody .card').nth(3).innerText();
  check(tag, (EN ? /too young/ : /trop jeunes/).test(c3), 'explains why nobody can enter: ' + c3.split('\n').pop());
  await page.locator('#sheetBody').evaluate(el => el.scrollTop = 0); await page.waitForTimeout(200);
  await shot(page, tag + '_4why');
  const why = await G(page, g => { const s = { tier: 'village', cls: 'sil' }; const keep = g.state.birds.map(b => [b.colour, b.geno]);
    for (const b of g.state.birds) if (b.breed === 'sil') b.colour = 'lavender'; const a = g.whyNot(s);
    g.state.birds.forEach((b, i) => { b.colour = keep[i][0]; }); return [a, g.whyNot({ tier: 'national', cls: 'any' })]; });
  check(tag, (EN ? /show colour/ : /couleur standard/).test(why[0]), 'Silkie colour reason: ' + why[0]);
  // after 3 results the explainer folds away
  await G(page, g => { g.state.shows.history = [1, 2, 3].map(i => ({ bird: 'X', place: i, tier: 'village', town: 'A', county: 'B', prize: 10 })); g.renderSheet(); });
  await page.waitForTimeout(300);
  check(tag, (await page.locator('#sheetBody details.howto').getAttribute('open')) === null, 'the explainer folds once you have results');
  await shot(page, tag + '_5folded');

  // ---- the chance maths vs a simulation of the judging (English run only; it is the same code)
  if (EN) {
    const sim = await G(page, g => {
      const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
      const out = []; const b = g.state.birds.find(b => g.isGrown(b) && b.home !== 'pasture');
      for (const tier of ['village', 'county', 'national']) for (const sc of [35, 50, 62, 75, 85]) {
        const T_ = g.TIERS[tier]; const fake = { ...b, pers: 'good', clover: false, boost: 0 }; const base = g.showScore(fake);
        const k = sc / base; const f2 = { ...fake, traits: Object.fromEntries(Object.entries(fake.traits).map(([n, v]) => [n, v * k])) };
        const est = g.rosetteChance(f2, tier), score = g.showScore(f2); let hit = 0; const N = 20000;
        for (let i = 0; i < N; i++) { const mine = score + gauss() * 4; let place = 1; for (let r = 0; r < T_.n - 1; r++) if (T_.mean + gauss() * T_.sd > mine) place++; if (place <= 3) hit++; }
        out.push([tier, Math.round(score), +est.toFixed(3), +(hit / N).toFixed(3)]);
      }
      return out;
    });
    const worst = Math.max(...sim.map(r => Math.abs(r[2] - r[3])));
    console.log('chance vs simulation:', JSON.stringify(sim));
    check(tag, worst < .03, 'the chance shown matches a simulation of the judging (worst gap ' + worst.toFixed(3) + ')');
  }
  await ctx.close();
}
console.log('BAD', JSON.stringify(bad));
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

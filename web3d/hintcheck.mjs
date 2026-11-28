// A word said over an open card beside a moment's tag, and a coop's new look card, sideways (28 Nov 2026, the tablet QA:
// "2 new orders from the village" lay over "Mrs Potts is here!"; the new look card a white half-screen):
// ./withserver.sh node hintcheck.mjs [OUT]   (SIZES=1180x820,874x402,667x375; LANGS=fr,en)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/hintcheck'; fs.mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES || '1180x820,874x402,667x375').split(',').map(s => s.split('x').map(Number));
const LANGS = (process.env.LANGS || 'fr,en').split(','), LOC = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-BR', it: 'it-IT' };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
for (const L of LANGS) for (const [W, H] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: LOC[L], hasTouch: true, isMobile: W < 1000 });
  await ctx.addInitScript(() => { try { localStorage.setItem('ff3d.age', '{"b":"adult","by":"asked"}'); } catch (e) { /* */ } });
  const p = await ctx.newPage(); p.on('pageerror', e => { fails++; console.log('ERROR', e.message); });
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00&nbsp`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 }); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.waitForTimeout(500);
  for (let i = 0; i < 6; i++) { const n = await p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return 0; const x = [...s.querySelectorAll('.gbtn')].find(q => !q.classList.contains('galt')); if (x) x.click(); else s.querySelector('.gsheet-x, .gx')?.click(); return 1; }); if (!n) break; await p.waitForTimeout(300); }
  await p.evaluate(() => window.__farm.gameUI().close());
  const tag = `${L} ${W}x${H}`;
  // (French: the space before "!" never breaks, so it's never alone on a line)
  if (L === 'fr') { const w = await p.evaluate(() => window.__farm.game().t('trio_new', { breed: 'Poule soie blanche' })); const good = /blanche\u00a0!$/.test(w); if (!good) fails++; console.log((good ? 'ok   ' : 'FAIL ') + tag + ' French space before "!" ' + JSON.stringify(w)); }
  // the tag beside the coins, a card open, then the words said
  for (const [name, mom, say] of [
    ['potts', { fr: '🧁 Mme Potts est là !', en: '🧁 Mrs Potts is here!' }, { fr: '📜 2 nouvelles commandes du village : touchez le panier', en: '📜 2 new orders from the village: tap the basket' }],
    ['hen', { fr: '🐔 Une poule s’est échappée !', en: '🐔 A hen is out!' }, { fr: 'Ivy s’est échappée de son enclos. Trouvez-la sur la ferme et touchez-la !', en: 'Ivy has slipped out of her pen. Find her on the farm and tap her!' }]]) {
    await p.evaluate(t => window.__farm.gameUI().momentPill(t, () => {}), mom[L] || mom.en);
    await p.evaluate(() => window.__farm.gameUI().jobsSheet ? window.__farm.gameUI().jobsSheet() : window.__farm.dockCard());
    await p.waitForTimeout(250);
    await p.evaluate(t => window.__farm.say(t), say[L] || say.en); await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* (the tag's endless pulse) */ } });
      const h = document.getElementById('hint').getBoundingClientRect(), ui = window.__farm.gameUI(), m = ui.mom, c = ui.coins.getBoundingClientRect(), g = ui.gear.getBoundingClientRect();
      const mr = m.hidden ? null : m.getBoundingClientRect(), mo = m.hidden ? 0 : +getComputedStyle(m).opacity;
      const hit = (a, z) => a && !(a.right <= z.left || a.left >= z.right || a.bottom <= z.top || a.top >= z.bottom);
      return { hint: [h.left, h.top, h.right, h.bottom].map(Math.round), onMom: !!(mr && mo > 0.05 && hit(mr, h)), onCoins: hit(c, h), onGear: hit(g, h), momShown: mo > 0.05 };
    });
    const bad = r.onMom || r.onCoins || r.onGear;
    if (bad) fails++;
    console.log((bad ? 'FAIL ' : 'ok   ') + tag + ' ' + name + ' ' + JSON.stringify(r));
    await p.screenshot({ path: `${OUT}/${L}_${W}x${H}_${name}.png`, clip: { x: 0, y: 0, width: W, height: Math.min(H, 160) } });
    await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().momentPill(null); }); await p.waitForTimeout(200);
  }
  // a coop's new look, sideways: as tall as its words (as the game shows it: Mended with nothing new to play with, Cosy with three)
  for (const [look, tier, toys] of [['mended', 1, []], ['cosy', 3, ['swing', 'dust', 'cabbage']]]) {
    await p.evaluate(([tier, toys]) => { const g = window.__farm.game(), c = g.data.coops[0]; window.__farm.gameUI().upgradedCard({ ...c, tier }, toys); }, [tier, toys]);
    await p.waitForTimeout(600);
    const s = await p.evaluate(() => { document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* (endless) */ } }); const s = document.querySelector('.gsheet:not([hidden])'), r = s.getBoundingClientRect(), b = s.querySelector('.gsheet-body'), bR = b.getBoundingClientRect(), kids = [...b.children], k = bR.height / (b.clientHeight || 1);
      const content = kids.length ? kids[kids.length - 1].getBoundingClientRect().bottom - kids[0].getBoundingClientRect().top : 0;      // (empty room in the card past its words, in the card's own px: a tablet's zoom taken out)
      return { h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(innerHeight - r.bottom), spare: Math.round((bR.height - content) / k), raw: /(^|\s)[a-z]+_[a-z_]+/.test(s.innerText) }; });
    const empty = s.spare > 90 || s.raw;
    if (empty) fails++;
    console.log((empty ? 'FAIL ' : 'ok   ') + tag + ' new look card, ' + look + ' ' + JSON.stringify(s));
    await p.screenshot({ path: `${OUT}/${L}_${W}x${H}_newlook_${look}.png` });
    await p.evaluate(() => window.__farm.gameUI().close()); await p.waitForTimeout(200);
  }
  await ctx.close();
}
await b.close();
console.log(fails ? `PROBLEMS: ${fails}` : 'ALL PASS');
process.exit(fails ? 1 : 0);

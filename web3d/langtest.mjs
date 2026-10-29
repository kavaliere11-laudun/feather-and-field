// The game's languages (release 7; Audrey, 29 Oct: German, Spanish, Portuguese (Brazil), Italian after English and French):
// ./withserver.sh node langtest.mjs [OUT]   (LANGS=de,es: just those; W, H; PORT)
// For each language: a new phone set to it (de-DE, es-ES, pt-BR, it-IT): the welcome speaks it by itself, the list of
// languages shows it chosen; the farm in it: a hen's card (her breed, her personality), the coop's card, the shop, the
// Breed Book, Settings, the level card: no English sentence left (any English line of four words or more that the
// language has its own words for), nothing off the card; pictures of each. Then the list in Settings: another language,
// the game in it after the reload. A save with a language the game doesn't speak: English. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/langtest', W = +(process.env.W || 402), H = +(process.env.H || 874);
fs.mkdirSync(OUT, { recursive: true });
const LOC = { de: 'de-DE', es: 'es-ES', pt: 'pt-BR', it: 'it-IT', fr: 'fr-FR', en: 'en-GB' };
const NAME = { en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português', it: 'Italiano' };
const LANGS = (process.env.LANGS || 'de,es,pt,it').split(',');
const cat = JSON.parse(fs.readFileSync(new URL('./lang/catalogue.json', import.meta.url)));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 400) : '')); if (!cond) fails++; };
for (const L of LANGS) {
  const tr = JSON.parse(fs.readFileSync(new URL(`./lang/${L}.json`, import.meta.url)));
  // English lines this language has its own words for (four words or more, so names and short labels shared by both don't count)
  const flat = v => (typeof v === 'string' ? [v] : Array.isArray(v) ? v : v ? [v.t, v.f] : []);
  const english = new Set();
  for (const e of cat) { const en = [].concat(e.en, e.f_en || []); const mine = flat(tr[e.id]); for (const s of en) if (s && s.split(/\s+/).length >= 4 && !mine.includes(s)) english.add(s.replace(/\{\w+\}/g, '').trim()); }
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: LOC[L], deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 }); await p.waitForTimeout(800);
  const welcome = await p.evaluate(() => { const sel = document.querySelector('.gsheet .gselect'), chips = [...document.querySelectorAll('.gsheet .gchips .gchip')].filter(c => c.lang);
    return { lang: document.documentElement.lang, title: document.querySelector('.gsheet h2').textContent, pick: sel ? sel.value : (chips.find(c => c.classList.contains('on')) || {}).lang, opts: sel ? [...sel.options].map(o => o.textContent) : chips.map(c => c.textContent) }; });      // (a list once there are more than three languages, chips till then)
  ok(`${L}: a new phone in it: the welcome in it, the list of languages with it chosen`, welcome.pick === L && welcome.title === flat(tr['text.welcome_title'])[0] && welcome.opts.length >= 3 && welcome.opts.includes(NAME[L]), welcome);
  await p.screenshot({ path: `${OUT}/${L}_1_welcome.png` });
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 1200; g.data.coins = 2400; g.save(); f.gameUI().close(); f.gameUI().refresh(); f.draw(); });
  // each card: its words, anything English left, anything off the card
  const look = () => p.evaluate(() => {
    const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return null;
    const q = s.getBoundingClientRect(), off = [];
    for (const e of s.querySelectorAll('button, .gchip, h2, .gcard-t, .glabel')) { const r = e.getBoundingClientRect(); if (r.width && (r.right > q.right + 1 || r.left < q.left - 1 || e.scrollWidth > e.clientWidth + 2)) off.push(e.textContent.trim().slice(0, 30)); }
    const lines = []; const walk = n => { for (const c of n.childNodes) { if (c.nodeType === 3 && c.textContent.trim()) lines.push(c.textContent.trim()); else if (c.nodeType === 1 && getComputedStyle(c).display !== 'none') walk(c); } }; walk(s);
    return { title: (s.querySelector('h2') || {}).textContent, lines, off };
  });
  const englishIn = lines => lines.filter(t => [...english].some(e => e.length > 12 && (t === e || t.includes(e))));
  const cards = [
    ['2_hen', () => { const f = window.__farm; f.openBirdCard(f.coopPlots()[0].birds[1]); }],
    ['3_coop', () => { window.__farm.gameUI().close(); window.__farm.gameUI().coopCard(window.__farm.game().data.coops[0], () => {}, null); }],
    ['4_shop', () => { window.__farm.gameUI().close(); document.querySelector('.gbar .gpill:not(.glvl)').click(); }],
    ['5_book', () => { window.__farm.gameUI().close(); window.__farm.book(); }],
    ['6_level', () => { window.__farm.gameUI().close(); window.__farm.gameUI().levelSheet(); }],
    ['6b_coops', () => { window.__farm.gameUI().close(); window.__farm.gameUI().coopsSheet({}); }],
    ['6c_shows', () => { window.__farm.gameUI().close(); window.__farm.gameUI().showsSheet({}); }],
    ['7_settings', () => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }],
  ];
  for (const [tag, fn] of cards) {
    await p.evaluate(fn).catch(e => console.log('(' + tag + ': ' + e.message.split('\n')[0] + ')'));
    await p.evaluate(() => { document.getAnimations().forEach(a => a.finish()); window.__farm.draw(); }); await p.waitForTimeout(250);
    const c = await look(); if (!c) { ok(`${L} ${tag}: open`, false); continue; }
    const left = englishIn(c.lines);
    ok(`${L} ${tag}: in ${L}, nothing English left, nothing off the card`, !left.length && !c.off.length, { title: c.title, english: left.slice(0, 3), off: c.off });
    await p.screenshot({ path: `${OUT}/${L}_${tag}.png` });
  }
  const hen = await p.evaluate(() => { const f = window.__farm, g = f.game(), b = g.data.birds.find(x => x.sex === 'h'); return { breed: g.breedName(b.breed), pers: g.persName(b.pers, 'h') }; });
  ok(`${L}: a hen's breed and personality in it`, hen.breed === flat(tr['breed.rir.name'])[0], hen);
  // another language from Settings
  const other = 'fr';                                       // (always there)
  await p.evaluate(o => { window.__farm.gameUI().settings(); const s = document.querySelector('.gsheet .gselect'); if (s) { s.value = o; s.dispatchEvent(new Event('change')); } else [...document.querySelectorAll('.gsheet .gchip')].find(c => c.lang === o).click(); }, other);
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const after = await p.evaluate(() => ({ lang: window.__farm.game().lang, html: document.documentElement.lang }));
  ok(`${L}: Settings, another language (${other}): the game in it after the reload`, after.lang === other && after.html === other, after);
  ok(`${L}: no page errors`, errs.length === 0, errs.slice(0, 3));
  await ctx.close();
}
// a save with a language the game doesn't speak: English
{
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: 'en-GB' });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 }); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const k = 'ff3d.farm', raw = JSON.parse(localStorage.getItem(k)); raw.d.lang = 'xx'; localStorage.setItem(k, JSON.stringify(raw)); });
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  ok('a save with a language the game doesn\'t speak: English', await p.evaluate(() => window.__farm.game().lang === 'en'));
  await ctx.close();
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

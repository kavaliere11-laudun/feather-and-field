// The translation catalogue (release 7, the languages): every word of the game, English and French side by side, for
// translating into the other languages, and back again into a language pack.
//   ./withserver.sh node lang/catalogue.mjs            writes lang/catalogue.json (from the game itself: __farm.words())
//   node lang/catalogue.mjs pack de                    lang/de.json (the translation) -> src/lang/de.js (the pack)
// catalogue.json: [{ id, en, fr, f_en?, f_fr?, gender?, pair?, note? }]
//   id: 'text.<key>' (game.js TEXT), '<registered id>' (an [English, French] pair: lang.js register), 'pers.<p>.name|line'
//   gender: the words change for a hen / a woman farmer (game.js TEXT_F): give the default (a rooster, a man) as `t` and
//   the feminine as `f`; pair: a personality's [hen, rooster] words
// <lang>.json: { "<id>": "translation", ... } and for gender entries { "<id>": { "t": "...", "f": "..." } }, for pers
// entries { "<id>": ["hen", "rooster"] }
import fs from 'fs';
const DIR = new URL('.', import.meta.url).pathname;
if (process.argv[2] === 'pack') {
  const L = process.argv[3], cat = JSON.parse(fs.readFileSync(DIR + 'catalogue.json', 'utf8')), tr = JSON.parse(fs.readFileSync(DIR + L + '.json', 'utf8'));
  const pack = { text: {}, textF: {}, words: {}, pers: {} }, missing = [], bad = [];
  const holes = s => (String(s).match(/\{\w+\}/g) || []).sort().join();
  for (const e of cat) {
    const v = tr[e.id];
    if (v === undefined || v === null || v === '') { missing.push(e.id); continue; }
    const check = (s, ref) => { if (holes(s) !== holes(ref)) bad.push(e.id + ': ' + holes(ref) + ' vs ' + holes(s)); return s; };
    if (e.id.startsWith('pers.')) { const [, p, f] = e.id.split('.'); (pack.pers[p] = pack.pers[p] || {})[f] = Array.isArray(v) ? v : [v]; continue; }
    if (e.id.startsWith('text.')) {
      const k = e.id.slice(5);
      if (e.gender && typeof v === 'object') { pack.text[k] = check(v.t, e.en); pack.textF[k] = check(v.f ?? v.t, e.f_en ?? e.en); }
      else pack.text[k] = check(typeof v === 'object' ? v.t : v, e.en);
      continue;
    }
    pack.words[e.id] = check(typeof v === 'object' ? v.t : v, e.en);
  }
  const out = `// The game in ${L}: made by lang/catalogue.mjs from lang/${L}.json (don't edit here: edit the json and run it again)\nexport default ${JSON.stringify(pack, null, 0).replace(/,"/g, ',\n"')};\n`;
  fs.writeFileSync(DIR + '../src/lang/' + L + '.js', out);
  console.log(L, 'texts', Object.keys(pack.text).length, 'feminine', Object.keys(pack.textF).length, 'words', Object.keys(pack.words).length, 'pers', Object.keys(pack.pers).length);
  console.log('missing', missing.length, missing.slice(0, 20)); console.log('placeholders differ', bad.length, bad.slice(0, 20));
  process.exit(missing.length || bad.length ? 1 : 0);
}
const { chromium } = await import('/opt/npm-tools/node_modules/playwright/index.mjs');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 402, height: 874 } })).newPage();
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && window.__farm.words, null, { timeout: 180000 });
const W = await p.evaluate(() => window.__farm.words());
await b.close();
const cat = [], fem = new Set([...Object.keys(W.textF.en), ...Object.keys(W.textF.fr)]);
for (const [k, en] of Object.entries(W.text.en)) {
  const e = { id: 'text.' + k, en, fr: W.text.fr[k] ?? null };
  if (fem.has(k)) { e.gender = true; e.f_en = W.textF.en[k] ?? en; e.f_fr = W.textF.fr[k] ?? e.fr; }
  cat.push(e);
}
for (const [id, [en, fr]] of Object.entries(W.reg)) cat.push({ id, en, fr: fr ?? null });
for (const [p, v] of Object.entries(W.pers)) for (const f of ['name', 'line', 'duck', 'pea']) if (v[f]) cat.push({ id: `pers.${p}.${f}`, en: v[f].en, fr: v[f].fr, pair: true, note: f === 'duck' ? '[duck, drake]: a call duck\'s line' : f === 'pea' ? '[peahen, peacock]: a peafowl\'s line' : '[hen, rooster]' });
fs.writeFileSync(DIR + 'catalogue.json', JSON.stringify(cat, null, 1));
const words = cat.reduce((n, e) => n + [].concat(e.en).join(' ').split(/\s+/).length, 0);
console.log('catalogue', cat.length, 'entries,', words, 'English words;', cat.filter(e => e.gender).length, 'with a feminine form');

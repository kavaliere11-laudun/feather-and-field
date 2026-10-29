// The game's languages (release 7; Audrey, 29 Oct: "Go for your recommendation but I will not have any native speaker
// reviewing it": German, Spanish, Portuguese (Brazil) and Italian after English and French; Japanese next, then Korean
// and Chinese). English and French are written in the code itself, beside each other ([English, French] pairs and
// game.js TEXT.en / TEXT.fr); each other language is a pack (lang/<code>.js: text and textF, game.js's words by key;
// words, every [English, French] pair's by its id; pers, the personalities). A word missing from a pack is English.
// Every pair is registered here with an id (register), so tr(lang, id) finds it in any language, and the translation
// catalogue (lang/catalogue.mjs) can list them all.
import de from './lang/de.js';
import es from './lang/es.js';
import pt from './lang/pt.js';
import it from './lang/it.js';

export const LANGS = ['en', 'fr', 'de', 'es', 'pt', 'it'];
export const LANG_NAME = { en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português', it: 'Italiano' };
export const LOCALE = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-BR', it: 'it-IT' };
export const PACKS = { de, es, pt, it };
// the languages there are words for (a pack still empty isn't offered)
export const READY = LANGS.filter(l => l === 'en' || l === 'fr' || (PACKS[l] && PACKS[l].text && Object.keys(PACKS[l].text).length));
export const langOk = l => (READY.includes(l) ? l : 'en');
// the phone's own language, if the game speaks it (else English)
export function phoneLang() {
  const list = typeof navigator !== 'undefined' ? (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) : [];
  for (const l of list) { const c = String(l || '').toLowerCase().slice(0, 2); if (READY.includes(c)) return c; }
  return 'en';
}
// a page's language from its address (the test pages: ?lang=de)
export const urlLang = () => (typeof location !== 'undefined' ? langOk(new URLSearchParams(location.search).get('lang') || 'en') : 'en');

const REG = {};
// a table of [English, French] pairs (or nested tables of them) under a prefix: 'say' + { hi: [...] } -> 'say.hi'
export function register(prefix, table) {
  for (const [k, v] of Object.entries(table)) {
    const id = prefix + '.' + k;
    if (Array.isArray(v) && typeof v[0] === 'string') REG[id] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) register(id, v);
  }
  return table;
}
// a word in a language: the pack's, or the pair's French, or its English
export function tr(lang, id, vars) {
  const a = REG[id];
  let s = !a ? id : lang === 'fr' ? (a[1] ?? a[0]) : lang === 'en' ? a[0] : ((PACKS[lang] && PACKS[lang].words && PACKS[lang].words[id]) ?? a[0]);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, x) => (vars[x] !== undefined ? vars[x] : m));
  return s;
}
export const registered = () => REG;
// an ordinal ("1st", "1er", "1.", "1.º"): in each language, for a hen (sexF) or a rooster
export function ordinal(lang, n, sexF = false) {
  if (lang === 'fr') return n === 1 ? (sexF ? '1re' : '1er') : n + 'e';
  if (lang === 'de') return n + '.';
  if (lang === 'es') return n + (sexF ? '.ª' : '.º');
  if (lang === 'pt' || lang === 'it') return n + (sexF ? 'ª' : 'º');
  return n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
}

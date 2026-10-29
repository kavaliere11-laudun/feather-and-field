// The privacy page (release 7: My account, and both stores ask for one): privacy/<lang>.json (the words, each language)
// and privacy/facts.json (who makes the game, how to write to them, the authority, where the farms are kept, the date)
// made into one page, dist/privacy.html, in every language the game speaks: the game's own when it's opened from Settings
// (?lang=fr), else the phone's, else English, with a list to change it. Fonts from the game's own (no other company).
//   node privacy.mjs            (build.sh runs it; deploy.sh also puts a copy at the usual address: /privacy.html)
import fs from 'fs';
const DIR = new URL('.', import.meta.url).pathname;
const LANGS = ['en', 'fr', 'de', 'es', 'pt', 'it'], NAME = { en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português', it: 'Italiano' };
const facts = JSON.parse(fs.readFileSync(DIR + 'privacy/facts.json', 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// the words may hold only <a href="https://…">…</a>: everything else is shown as text
const safe = s => esc(s).replace(/&lt;a href="(https:\/\/[^"<>]+)"&gt;(.*?)&lt;\/a&gt;/g, (m, u, t) => `<a href="${u}" rel="noopener">${t}</a>`);
const fill = (s, L) => s.replace(/\{(\w+)\}/g, (m, k) => {
  const v = facts[k]; if (v === undefined) throw new Error(`privacy: no ${k} in facts.json`);
  const w = typeof v === 'object' ? (v[L] ?? v.en) : v;
  return k === 'email' ? `<a href="mailto:${esc(w)}">${esc(w)}</a>` : esc(w);
});
const have = LANGS.filter(L => fs.existsSync(DIR + `privacy/${L}.json`));
const sections = have.map(L => {
  const T = JSON.parse(fs.readFileSync(DIR + `privacy/${L}.json`, 'utf8')), f = s => fill(safe(s), L);
  const body = T.sections.map(s => `<h2>${f(s.h)}</h2>\n` + s.p.map(p => `<p${p.startsWith('•') ? ' class="li"' : ''}>${f(p)}</p>`).join('\n')).join('\n');
  return `<section lang="${L}" data-title="${esc(T.title)}" hidden>
<h1>${f(T.title)}</h1>
<p class="date">${f(T.updated)}</p>
<p class="intro">${f(T.intro)}</p>
${body}
<p class="contact">${f(T.contact)}</p>
<p><a class="back" href="../">${f(T.back)}</a></p>
</section>`;
}).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Feather &amp; Field · Privacy</title>
<link rel="stylesheet" href="fonts/fonts.css">
<style>
  :root { --ink: #1f3326; --ink-2: #4d5e50; --meadow: #3f7a2e; --cream: #fbf8ef; --sage: #edf1e4; --line: #dfe3d2; }
  html { background: var(--cream); }
  body { margin: 0; color: var(--ink); font: 600 16.5px/1.5 Nunito, system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
  main { max-width: 680px; margin: 0 auto; padding: calc(env(safe-area-inset-top) + 18px) max(18px, env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 36px) max(18px, env(safe-area-inset-left)); }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .brand { font: 600 20px Fredoka, Nunito, sans-serif; color: var(--meadow); }
  select { font: 700 15px Nunito, sans-serif; color: var(--ink); background: var(--sage); border: 2px solid var(--line); border-radius: 999px; padding: 7px 12px; }
  h1 { font: 600 32px/1.15 Fredoka, Nunito, sans-serif; margin: 18px 0 2px; }
  h2 { font: 600 21px/1.25 Fredoka, Nunito, sans-serif; margin: 26px 0 6px; }
  p { margin: 0 0 10px; }
  p.li { padding-left: 1.1em; text-indent: -1.1em; }
  .date { color: var(--ink-2); font-size: 14.5px; }
  .intro { background: var(--sage); border-radius: 16px; padding: 12px 15px; margin-top: 12px; }
  .contact { margin-top: 26px; }
  a { color: var(--meadow); font-weight: 800; overflow-wrap: anywhere; }
  a.back { display: inline-block; margin-top: 10px; background: #c8452f; color: #fff; text-decoration: none; border-radius: 999px; padding: 11px 20px; font: 600 17px Fredoka, Nunito, sans-serif; }
</style>
</head>
<body>
<main>
<header><span class="brand">Feather &amp; Field</span><select id="lang" aria-label="Language">${have.map(L => `<option value="${L}">${NAME[L]}</option>`).join('')}</select></header>
${sections}
</main>
<script>
(function () {
  var have = ${JSON.stringify(have)}, q = new URLSearchParams(location.search).get('lang'), pick = have.indexOf(q) >= 0 ? q : null;
  if (!pick) { var ls = navigator.languages || [navigator.language || 'en']; for (var i = 0; i < ls.length && !pick; i++) { var c = String(ls[i]).slice(0, 2).toLowerCase(); if (have.indexOf(c) >= 0) pick = c; } }
  var sel = document.getElementById('lang');
  function show(L) { var ss = document.querySelectorAll('section'); for (var i = 0; i < ss.length; i++) { ss[i].hidden = ss[i].lang !== L; if (!ss[i].hidden) document.title = 'Feather & Field · ' + ss[i].getAttribute('data-title'); } document.documentElement.lang = L; sel.value = L; }
  sel.addEventListener('change', function () { show(sel.value); try { history.replaceState(null, '', '?lang=' + sel.value); } catch (e) {} });
  show(pick || 'en');
})();
</script>
</body>
</html>
`;
fs.mkdirSync(DIR + 'dist', { recursive: true });
fs.writeFileSync(DIR + 'dist/privacy.html', html);
console.log('privacy page:', have.join(', '));

// The app's page (www/) in the test browser: node test/wwwcheck.mjs OUT   (www served on PORT, default 8790)
// For each of English and French, upright and sideways: the welcome (in the phone's language), a new farm opened,
// Settings: no account there (it waits for the app's own sign-in), the privacy link the site's, the credits.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/appcheck';
fs.mkdirSync(OUT, { recursive: true });
const PORT = process.env.PORT || 8790;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
for (const [lang, w, h] of [['en', 402, 874], ['fr', 402, 874], ['fr', 874, 402]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: lang === 'fr' ? 'fr-FR' : 'en-GB', hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const asked = []; p.on('request', r => { const u = new URL(r.url()); if (u.hostname !== 'localhost') asked.push(u.hostname); });
  await p.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 180000 });
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.__ffApp === true && document.documentElement.classList.contains('standalone')), `${lang} ${w}x${h}: told it's the app`);
  ok(await p.evaluate(() => !document.querySelector('.gwelcome-signin, .gwelcome-acct')), `${lang} ${w}x${h}: no sign-in on the welcome`);
  const welcome = await p.evaluate(() => document.querySelector('.gsheet').innerText.slice(0, 200));
  ok(lang === 'fr' ? /ferme|Bienvenue|Commencer/i.test(welcome) : /farm|Welcome|Start/i.test(welcome), `${lang} ${w}x${h}: the welcome in its language (${welcome.split('\n')[0]})`);
  await p.screenshot({ path: `${OUT}/${lang}_${w}_welcome.png` });
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await p.waitForFunction(() => window.__farm && window.__farm.game && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${OUT}/${lang}_${w}_farm.png` });
  await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); });
  await p.waitForTimeout(600);
  await p.evaluate(() => document.getAnimations().forEach(a => a.finish()));
  ok(await p.evaluate(() => !document.querySelector('.gacct')), `${lang} ${w}x${h}: no account card in Settings`);
  const priv = await p.evaluate(() => { const a = document.querySelector('.gprivacy'); return a ? a.href : ''; });
  ok(priv.startsWith('https://kavaliere11-laudun.github.io/feather-and-field/privacy.html?lang=' + lang), `${lang} ${w}x${h}: privacy link ${priv}`);
  ok(await p.evaluate(() => !!document.querySelector('.gcredits, .gnote a[href*="freesound"]')), `${lang} ${w}x${h}: the credits there`);
  await p.screenshot({ path: `${OUT}/${lang}_${w}_settings.png` });
  ok(!errs.length, `${lang} ${w}x${h}: no page errors ${errs.slice(0, 3).join(' | ')}`);
  ok(!asked.length, `${lang} ${w}x${h}: nothing asked of the internet (${[...new Set(asked)].join(', ')})`);
  await ctx.close();
}
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);

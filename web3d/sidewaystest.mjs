// Sideways only (6 Nov 2026, Audrey: "let's force the game to be sideway, it should not be player portrait"):
// node sidewaystest.mjs   (LANG=fr)
// A phone held upright (?sideways: automated checks otherwise see the farm upright as before): the game covered by the
// painted picture, the name and "Turn your phone sideways to play" (in French: "Tournez votre téléphone à l'horizontale pour
// jouer"), a tap landing on it, not the farm; turned sideways: gone, the farm there. A computer's tall window: plays as
// before. Without ?sideways (the other checks): upright as before. The web app's manifest asks for landscape; the iPhone
// app turns only sideways (Info.plist). No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const BASE = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`;
const WORDS = fr ? 'Tournez votre téléphone à l’horizontale pour jouer' : 'Turn your phone sideways to play';
const errs = [];
const open = async (opts, q = '&sideways') => {
  const ctx = await b.newContext({ locale: fr ? 'fr-FR' : 'en-GB', ...opts });
  ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);      // (a running farm's frames are slow in the test browser's software drawing, Storybook's the more)
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + q, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => document.querySelector('#sideways .msg') && window.__farm !== undefined || document.querySelector('.gsheet:not([hidden])'), null, { timeout: 180000 });
  await p.waitForTimeout(800);
  return { ctx, p };
};
const state = p => p.evaluate(() => { const e = document.getElementById('sideways'), cs = getComputedStyle(e), r = e.getBoundingClientRect(), hit = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return { shown: cs.display !== 'none' && r.width >= innerWidth - 1 && r.height >= innerHeight - 1, text: e.querySelector('.msg').textContent, onTop: !!(hit && (hit === e || e.contains(hit))) }; });
// a phone held upright
let { ctx, p } = await open({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true });
let s = await state(p);
ok('a phone held upright: the game covered, "' + WORDS + '"', s.shown && s.text === WORDS, s);
ok('…a tap lands on it, not on the farm', s.onTop, s);
await p.setViewportSize({ width: 874, height: 402 }); await p.waitForTimeout(600);
s = await state(p);
ok('turned sideways: gone, the farm there', !s.shown && !s.onTop, s);
await p.setViewportSize({ width: 402, height: 874 }); await p.waitForTimeout(600);
s = await state(p);
ok('upright again: back', s.shown && s.text === WORDS, s);
await ctx.close();
// a computer's tall window
({ ctx, p } = await open({ viewport: { width: 600, height: 900 } }));
s = await state(p);
ok('a computer\'s tall window: plays as before', !s.shown, s);
await ctx.close();
// the other checks (no ?sideways): upright as before
({ ctx, p } = await open({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true }, ''));
s = await state(p);
ok('automated checks without ?sideways: upright as before', !s.shown, s);
await ctx.close();
const man = JSON.parse(fs.readFileSync(new URL('./play.webmanifest', import.meta.url), 'utf8'));
ok('the web app\'s manifest asks for landscape', man.orientation === 'landscape', man.orientation);
const plist = fs.readFileSync(new URL('../app/ios/App/App/Info.plist', import.meta.url), 'utf8'), o = (plist.match(/<key>UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/) || [])[1] || '';
ok('the iPhone app turns only sideways', /LandscapeLeft/.test(o) && /LandscapeRight/.test(o) && !/Portrait/.test(o), o.replace(/\s+/g, ' '));
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

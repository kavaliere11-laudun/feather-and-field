// The story at the start (7 Nov 2026; Audrey: "let's add storytelling that you just inherited the farm"; "Your grandmother";
// her painted pictures): node storytest.mjs (LANG=fr)
// A new phone (?story: automated browsers skip it otherwise): grandma's story first, over everything, each picture with its
// line in the phone's language, the dots; Next, a swipe back and on, a tap on the picture; the last one's "Let's go!" brings
// the welcome; Skip from the first one does too. From Settings, "The farm's story" plays it again and closes back to the farm.
// No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const fr = process.env.LANG === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const BASE = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30`;
const LINES = fr ? [/^Mamie vous a laissé sa ferme/, /^Feather & Field est à vous/, /^Chaque terrain est à vous/, /^Ramassez les œufs/] : [/^Grandma has left you her farm/, /^Feather & Field is yours now/, /^Every field is yours/, /^Collect the eggs/];
const errs = [];
const open = async (q) => {
  const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB' });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + q, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return { ctx, p };
};
const st = p => p.evaluate(() => { const s = document.querySelector('.gstory'); if (!s) return null;
  const on = [...s.querySelectorAll('img')].findIndex(i => i.classList.contains('on')), hit = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return { n: s.querySelectorAll('img').length, on, text: s.querySelector('.gstory-text').textContent, next: s.querySelector('.gstory-next').textContent, dots: [...s.querySelectorAll('.gdots span')].findIndex(d => d.classList.contains('on')),
    top: !!(hit && s.contains(hit)), loaded: [...s.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0), welcome: !!document.querySelector('.gsheet.gwelcome:not([hidden])') }; });
let { ctx, p } = await open('&story');
await p.waitForSelector('.gstory img.on', { timeout: 120000 }); await p.waitForTimeout(1500);
let s = await st(p);
ok('a new phone: grandma\'s story first, over everything, its four pictures there, no welcome yet', s && s.n === 4 && s.on === 0 && s.top && s.loaded && !s.welcome, s);
ok('the first picture\'s line, in the phone\'s language, the first dot', LINES[0].test(s.text) && s.dots === 0, s);
await p.click('.gstory-next'); await p.waitForTimeout(400); s = await st(p);
ok('Next: the second picture and its line', s.on === 1 && LINES[1].test(s.text) && s.dots === 1, s);
await p.touchscreen.tap(437, 200); await p.waitForTimeout(400); s = await st(p);       // (a tap on the picture)
ok('a tap on the picture: the third', s.on === 2 && LINES[2].test(s.text) && !/Let’s go|C’est parti/.test(s.next), s);
const swipe = async (dx) => { await p.mouse.move(437 - dx / 2, 200); await p.mouse.down(); await p.mouse.move(437 + dx / 2, 205, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(400); };
await swipe(160); s = await st(p);
ok('a swipe the other way: back to the second', s.on === 1, s);
await swipe(-160); s = await st(p);
ok('a swipe on: the third again', s.on === 2, s);
await p.click('.gstory-next'); await p.waitForTimeout(400); s = await st(p);
ok('Next: the fourth, the farm restored, and the last button says Let\'s go', s.on === 3 && LINES[3].test(s.text) && s.dots === 3 && /Let’s go|C’est parti/.test(s.next), s);
await p.click('.gstory-next'); await p.waitForTimeout(900); s = await st(p);
const w = await p.evaluate(() => !!document.querySelector('.gsheet.gwelcome:not([hidden])'));
ok('"Let\'s go!": the story gone, the welcome there', !s && w, { s, w });
await ctx.close();
({ ctx, p } = await open('&story'));
await p.waitForSelector('.gstory img.on', { timeout: 120000 }); await p.waitForTimeout(600);
await p.click('.gstory-skip'); await p.waitForTimeout(900);
ok('Skip from the first picture: straight to the welcome', !(await st(p)) && await p.evaluate(() => !!document.querySelector('.gsheet.gwelcome:not([hidden])')));
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); u.settings(); });
await p.waitForTimeout(400);
const btn = await p.evaluate(() => { const e = document.querySelector('.gsheet .gstory-again'); return e && e.textContent; });
ok('Settings: "The farm\'s story"', /The farm’s story|L’histoire de la ferme/.test(btn || ''), btn);
await p.click('.gsheet .gstory-again'); await p.waitForTimeout(800); s = await st(p);
ok('…plays it again from the first picture, the card closed', s && s.on === 0 && await p.evaluate(() => !window.__farm.gameUI().isOpen), s);
await p.click('.gstory-skip'); await p.waitForFunction(() => !document.querySelector('.gstory'), null, { timeout: 8000 }).catch(() => {});      // (gone after its fade, on a busy machine a little later)
ok('…and Skip goes back to the farm (no welcome)', !(await st(p)) && !(await p.evaluate(() => !!document.querySelector('.gsheet.gwelcome:not([hidden])'))));
await ctx.close();
// automated checks without ?story: no story (the welcome first, as before)
({ ctx, p } = await open(''));
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
ok('automated checks without ?story: the welcome first, as before', !(await st(p)));
await ctx.close();
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

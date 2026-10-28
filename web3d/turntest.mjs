// "Best played sideways" (Audrey, 28 Oct: "Sideway for phones and tablets"): ./withserver.sh node turntest.mjs [OUT]   (LANG=fr; PORT)
// A farm opened on a phone held upright: the tip at the top (a little phone turning, "Best played sideways: turn your
// phone"), the hint hidden under it; gone once the phone's turned; not again that visit. On a tablet upright: "turn your
// tablet", gone after a few seconds by itself. Held sideways from the start: no tip. Gone when a card opens. The Home Screen app
// on Android asked to stay sideways. The browser's bars take the farm's own colours. (The tests' own browser never sees it, so it can't get in their way: ?turntip here.)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/turntest', fr = process.env.LANG === 'fr';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const open = async (W, H) => {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); });
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00&turntip`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => window.__farm.gameUI().close());
  return { ctx, p, errs };
};
const tip = p => p.evaluate(() => { const e = document.querySelector('.gturn'); return e ? { text: e.textContent, hintHidden: document.body.classList.contains('gturning') } : null; });
const wait = (p, ms) => p.waitForTimeout(ms);
// a phone, upright
let s = await open(402, 874);
await wait(s.p, 2500);
let t = await tip(s.p);
ok('a phone upright: the tip at the top, the hint hidden under it', t && (fr ? /téléphone/ : /Best played sideways: turn your phone/).test(t.text) && t.hintHidden, t);
await s.p.screenshot({ path: `${OUT}/turn_phone${fr ? '_fr' : ''}.png` });
await s.p.setViewportSize({ width: 874, height: 402 }); await wait(s.p, 2000);
ok('turned sideways: the tip goes', !(await s.p.evaluate(() => !!document.querySelector('.gturn:not(.gout)'))));
await s.p.setViewportSize({ width: 402, height: 874 }); await wait(s.p, 2500);
ok('upright again: not again this visit', !(await tip(s.p)));
// the browser's bars: the farm's own colours, not the welcome's dark green
const tint = await s.p.evaluate(() => ({ meta: document.querySelector('meta[name="theme-color"]').content, page: document.documentElement.style.backgroundColor }));
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const [r, g, bb] = /^#[0-9a-f]{6}$/.test(tint.meta) ? rgb(tint.meta) : [0, 0, 0];
ok('the browser\'s bars in the farm\'s own colours (grass green by day), not the welcome\'s dark green', tint.meta !== '#4a7530' && g > r && g > bb && !!tint.page, tint);
ok('no page errors (phone)', s.errs.length === 0, s.errs);
await s.ctx.close();
// a tablet, upright: its own words; gone after a few seconds
s = await open(820, 1180);
await wait(s.p, 2500); t = await tip(s.p);
ok('a tablet upright: "turn your tablet"', t && (fr ? /tablette/ : /turn your tablet/).test(t.text), t);
await s.p.screenshot({ path: `${OUT}/turn_tablet${fr ? '_fr' : ''}.png` });
await wait(s.p, 7500);
ok('gone by itself after a few seconds', !(await s.p.evaluate(() => !!document.querySelector('.gturn'))));
await s.ctx.close();
// sideways from the start: none; a card open: not over it
s = await open(874, 402); await wait(s.p, 2500);
ok('held sideways from the start: no tip', !(await tip(s.p)));
await s.ctx.close();
s = await open(402, 874); await wait(s.p, 2500);
const before = !!(await tip(s.p));
await s.p.evaluate(() => { const f = window.__farm; f.openBirdCard(f.coopPlots()[0].birds[1]); }); await wait(s.p, 1800);
ok('a card opening: the tip goes', before && !(await s.p.evaluate(() => !!document.querySelector('.gturn:not(.gout)'))), before);
await s.ctx.close();
const man = JSON.parse(fs.readFileSync(new URL('./play.webmanifest', import.meta.url)));
ok('the Home Screen app asked to stay sideways (Android)', man.orientation === 'landscape', man.orientation);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

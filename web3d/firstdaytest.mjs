// The game, release 1 step 10 (the first day): node firstdaytest.mjs   (LANG=fr; W, H; SHOTS=folder)
// A new farm (play.html?q=0&firstday: the tests' pages leave the first day out otherwise): the four pictures (titles, dots,
// Next, Let's go!); then the guide, "First day · 1 of 5": the first egg on its way, then collected (the arrow over its
// bubble), +10 coins; a hen cuddled (the arrow over her, then over ♥ Cuddle in her card); the wheat sown ("Show me" when
// its sign is off screen, then the arrow over it and over Sow); Today's jobs; the shop; "Your first day is done!" and the
// bonus; the guide gone, also after a reload. Another new farm: Skip in the pictures, Skip in the guide: gone for good. A
// save changed outside (the guide past its end) is checked and flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&firstday`;
const errs = [];
async function newPage() {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
  await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
  return p;
}
let p = await newPage();
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* (the arrow's bounce: endless) */ } }); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/firstday_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const kind = () => p.evaluate(() => window.__farm.gameUI().kind);
const G = () => p.evaluate(() => { window.__farm.draw(); return window.__farm.deco.guide.state(); });      // (drawn once more: a card that slid in, where it is now)
const coins = () => p.evaluate(() => window.__farm.game().data.coins);
const title = () => p.evaluate(() => document.querySelector('.gsheet h2').textContent);
const click = sel => p.evaluate(sel => document.querySelector(sel).click(), sel);
const start = async () => {
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
  await p.tap('.gsheet .gbtn');
  await load();
};
const TT = fr ? ['Votre basse-cour pour toujours', 'Œufs et poussins', 'Terres et nouvelles races', 'Concours, miel et plus encore'] : ['Your forever flock', 'Eggs and chicks', 'Land and new breeds', 'Shows, honey and more'];
await start();
// the pictures
const seen = [];
for (let i = 0; i < 4; i++) {
  seen.push([await title(), await p.evaluate(() => document.querySelectorAll('.gdots span').length), await p.evaluate(() => document.querySelector('.gstick .gbtn').textContent)]);
  if (i === 0) await shot('1_picture');
  await click('.gstick .gbtn'); await run(0.2);
}
ok('a new farm: the four pictures, Next, then Let\'s go!', seen.every((x, i) => x[0] === TT[i] && x[1] === 4) && (fr ? /C’est parti/ : /Let’s go/).test(seen[3][2]) && (await kind()) === null, seen);
let g = await G();
ok('then the guide: "First day · 1 of 5", the first egg on its way', g.on && g.step === 'eggs' && (fr ? /Premier jour · 1 sur 5/ : /First day · 1 of 5/).test(g.n) && (fr ? /premier œuf arrive/ : /first egg is on its way/).test(g.card), g);
await shot('2_guide');
// the first egg
for (let i = 0; i < 50 && !(await p.evaluate(() => window.__farm.game().data.coops[0].eggs)); i++) await run(5);
await run(1.5);
g = await G();
ok('the egg laid: the arrow over its bubble', g.step === 'eggs' && (fr ? /Ramassez votre premier œuf/ : /Collect your first egg/).test(g.card) && !!g.arrow, g);
await shot('3_egg');
let c0 = await coins();
await click('.gbub.geggs'); await run(0.5);
await p.waitForTimeout(900); await run(0.2);
g = await G();
const c1 = await coins();
ok('collected: the egg sold and +10 coins, on to a cuddle (the arrow over a hen)', g.step === 'cuddle' && c1 >= c0 + 10 + 6 && !!g.arrow && (fr ? /câlin à une poule/ : /Give a hen a cuddle/).test(g.card), { g, c0, c1 });
// a cuddle: tap the hen the arrow's over, then ♥ Cuddle
const tgt = await p.evaluate(() => { const f = window.__farm, T = f.deco.guide.target(); return T.world ? f.screenOf(T.world[0], T.world[2], T.world[1] - 0.35) : null; });
await p.touchscreen.tap(tgt.x, tgt.y); await run(0.4);
g = await G();
ok('her card: the guide card out of the way, the arrow over ♥ Cuddle', (await kind()) === 'bird' && !g.card && !!g.arrow, { kind: await kind(), g });
await shot('4_cuddle');
c0 = await coins();
await click('.gsheet .gcuddle'); await run(0.5);
g = await G();
ok('cuddled: +10 coins, on to the wheat', g.step === 'sow' && (await coins()) === c0 + 10, { g, c: await coins(), c0 });
// the wheat: Show me if its sign is off screen
await p.evaluate(() => { const f = window.__farm; f.lookAt(f.view.target.x + 6, f.view.target.z + 6, 2.6); }); await run(0.3);
g = await G();
const showMe = g.show;
if (g.show) { await click('.gguide-show'); await run(1.5); }
g = await G();
ok('the wheat\'s sign off screen: "Show me" brings it into view, the arrow over it', showMe && !!g.arrow && !g.show, g);
await shot('5_sow');
await click('.gbub.gwheat'); await run(0.3);
g = await G();
ok('its card: the arrow over Sow', (await kind()) === 'wheat' && !!g.arrow, g);
c0 = await coins();
await click('.gsheet .gbtn'); await run(0.5);
g = await G();
ok('sown: −20 and +10 coins, on to Today\'s jobs (the arrow over the clipboard)', g.step === 'jobs' && (await coins()) === c0 - 20 + 10 && !!g.arrow, { g, c: await coins(), c0 });
await shot('6_jobs');
await click('.gbar .gjobs'); await run(0.3);
g = await G();
ok('Today\'s jobs opened: on to the shop, waiting while the card is open', g.step === 'shop' && !g.card && !g.arrow, g);
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.3);
g = await G();
ok('the card closed: the arrow over the coins', !!g.arrow && (fr ? /Touchez vos pièces/ : /Tap your coins/).test(g.card), g);
await shot('7_shop');
c0 = await coins();
await click('.gbar .gpill:not(.glvl)'); await run(0.3);
await p.evaluate(() => window.__farm.gameUI().close()); await run(1);
for (let i = 0; i < 40 && !(fr ? /premier jour est terminé/ : /first day is done/).test(await p.evaluate(() => document.getElementById('hint').textContent)); i++) await run(1);
g = await G();
const w = await p.evaluate(() => document.getElementById('hint').textContent);
ok('the shop: "Your first day is done!", +10 and the bonus +30, the guide gone', !g.step && !g.card && !g.arrow && (await coins()) === c0 + 40 && (fr ? /premier jour est terminé ! \+40 pièces/ : /first day is done! \+40 coins/).test(w), { g, w, c: await coins(), c0 });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
g = await G();
ok('a reload: no guide', !g.step && !g.card && (await kind()) !== 'intro', g);
// another new farm: Skip, Skip
await p.context().close();
p = await newPage();
await start();
await click('.gstick .gbtn.galt'); await run(0.3);
g = await G();
ok('another new farm: Skip in the pictures: the guide', (await kind()) === null && g.step === 'eggs' && !!g.card, g);
await click('.gguide-skip'); await run(0.3);
g = await G();
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const g2 = await G();
ok('Skip in the guide: gone, also after a reload', !g.step && !g.card && !g2.step && !g2.card, { g, g2 });
// a save changed outside
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.guide = { step: 99, done: false }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const ed = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, guide: g.data.guide }; });
ok('a guide past its end: checked and flagged', ed.edited && ed.guide.step === 5 && ed.guide.done, ed);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

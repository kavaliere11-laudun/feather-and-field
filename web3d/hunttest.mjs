// The daily egg hunt (7 Nov 2026, Audrey's choice: "Daily egg hunt: each day a hen hides a golden egg somewhere on the farm
// for you to find"): ./withserver.sh node hunttest.mjs [OUT]   (LANG=fr; W, H: the screen, e.g. W=874 H=402; PORT)
// A new farm on a fake clock. Level 1: no golden egg. Level 2: one on your land, by a bush, a tree or a rock, and a word
// that one of your hens has hidden it; the same spot after a reload. A tap on it: found ("You found …'s golden egg!",
// +30 coins, +4 XP), it hops off and is gone, counted; no second one that day. The next day: another, two days in a row
// (+40 coins). A day missed: back to one. A save changed outside the game (found tomorrow, more days in a row than found)
// is checked and flagged. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/hunttest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
const T0 = new Date('2026-11-07T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/hunt_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), at = f.hunt.at(); return { level: g.level, coins: g.data.coins, xp: g.data.xp, at, field: at ? f.fieldAt(at[0], at[1]) : null, land: g.data.land.slice(), hunt: g.data.hunt ? { ...g.data.hunt } : null, today: g.huntToday(), edited: g.edited }; });
const nextDay = async (days = 1) => { await p.evaluate(d => { window.__T += d * 86400e3; sessionStorage.setItem('__T', window.__T); }, days); await run(2.5); };
const T = fr ? { hidden: /a caché l’œuf d’or du jour/, found: /Vous avez trouvé l’œuf d’or de .* ! \+30 pièces, \+4 XP/, two: /2 jours de suite/ } : { hidden: /has hidden today’s golden egg/, found: /You found .*’s golden egg! \+30 coins, \+4 XP/, two: /2 days in a row/ };

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 5; g.data.lvSeen = 1; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(1);
let s = await S();
ok('level 1: no golden egg', s.level === 1 && !s.at, s);
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 20; g.data.lvSeen = 2; g.fishBag().gift = true; g.save(); }); await run(4);
s = await S();
ok('level 2: today\'s golden egg on your land', s.level === 2 && s.at && s.land.includes(s.field), s);
ok('a word that one of your hens has hidden it', T.hidden.test(await hintT()) && (await hintT()).includes(s.today.hen), await hintT());
const at0 = s.at;
await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 1.6); f.draw(); }, at0); await run(0.4);
await shoot('1_hidden');
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await p.evaluate(() => window.__farm.gameUI().close()); await run(1);
s = await S();
ok('a reload: the same spot', s.at && Math.hypot(s.at[0] - at0[0], s.at[1] - at0[1]) < 1e-6, { at: s.at, at0 });
// found
await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 2.4); f.draw(); }, at0); await run(0.3);
const c0 = s.coins, x0 = s.xp;
const tapped = await p.evaluate(() => window.__farm.hunt.tap());
await run(0.3); s = await S(); const h1 = await hintT();
ok('a tap on it: found, "You found …\'s golden egg!", +30 coins, +4 XP, counted', tapped && s.coins === c0 + 30 && s.xp === x0 + 4 && T.found.test(h1) && s.hunt && s.hunt.n === 1 && s.hunt.streak === 1, { s, h1 });
await run(0.4); await shoot('2_found');
await run(1.2); s = await S();
ok('it hopped off and is gone; no second one today', !s.at && !(await p.evaluate(() => window.__farm.hunt.tap())), s);
// the next day: two in a row
await nextDay(1); s = await S();
ok('the next day: another one', !!s.at && !s.today.found, s);
const c1 = s.coins;
await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 2.4); f.draw(); }, s.at); await run(0.2);
await p.evaluate(() => window.__farm.hunt.tap()); await run(0.3); s = await S();
ok('found: two days in a row, +40 coins', s.coins === c1 + 40 && s.hunt.streak === 2 && s.hunt.n === 2 && T.two.test(await hintT()), { s, h: await hintT() });
// a day missed
await nextDay(2); s = await S();
const c2 = s.coins;
await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 2.4); f.draw(); }, s.at); await run(0.2);
await p.evaluate(() => window.__farm.hunt.tap()); await run(0.3); s = await S();
ok('a day missed: back to one in a row (+30 coins), three found in all', s.coins === c2 + 30 && s.hunt.streak === 1 && s.hunt.n === 3, s);
// a save changed outside
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.hunt = { last: '20991231', streak: 50, n: 3 }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
s = await S();
ok('a save changed outside the game (found in the future): checked (dropped) and flagged; today\'s egg back', s.edited && !s.hunt && !!s.at, s);
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.hunt = { last: '20261101', streak: 50, n: 3 }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
s = await S();
ok('more days in a row than found: no more than found, flagged', s.edited && s.hunt && s.hunt.streak === 3, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

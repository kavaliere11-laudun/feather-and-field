// Farm moments, the rainy day (20 Nov 2026, "Carry on"; the 17 Nov mock-up "Worms come up in the rain. Tap them"):
// ./withserver.sh node raintest.mjs [OUT]   (LANG=fr; W, H: the screen, e.g. W=874 H=402; PORT)
// A farm at level 3 (fishing open) whose first moment (a hen out) is past, with ?moments: as the farm opens, the first
// rainy day for sure: "🌧️ It's raining!" beside the coins, a word (tap the worms), the rain falling, puddles on your land,
// worms coming up where you're looking. A tap on a worm: into the worm bag (+1), counted in the save. A reload: still
// raining, the worms caught kept. The bag full: 3 coins a worm instead. No more worms once a shower's 12 are caught. The
// shower's time up: it stops, said, the rain fades. The save checks: a shower longer than its time, more worms than a
// shower gives: dropped, flagged. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/raintest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-20T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 600) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.evaluate(() => { const f = window.__farm; f.setHour(f.day.hour); f.draw(); }); await p.waitForTimeout(300);      // (the light as the game sets it every quarter of a second)
 await p.screenshot({ path: `${OUT}/rain_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00&moments`;
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), m = g.moment(), r = f.rain.state(), land = g.data.land;
  return { level: g.level, coins: g.data.coins, worms: g.worms(), moment: m ? { ...m } : null, moments: g.data.moments ? { ...g.data.moments } : null, rain: r, pill: f.moment.pill(), edited: g.edited,
    onLand: r.worms.every(w => { const k = f.rain.fieldOf(w.at[0], w.at[1]); return k < 0 || land.includes(k); }) }; });
const T = fr ? { pill: /Il pleut/, hint: /Les vers sortent avec la pluie/, end: /La pluie s’est arrêtée\. Vers attrapés : \d+/, full: /Sac plein · \+3 pièces/ }
  : { pill: /It’s raining!/, hint: /Worms are coming up in the rain\. Tap them/, end: /The rain has stopped\. Worms caught: \d+/, full: /Bag full · \+3 coins/ };
const close = () => p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(3) + 5; g.data.lvSeen = 3; g.fishBag().gift = true; g.fishBag().worms = 5; g.data.moments = { last: 0, hen: 1, visit: 1 }; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
for (let i = 0; i < 12; i++) { await close(); await run(1); if ((await S()).moment) break; }
let s = await S();
ok('as the farm opens, the first rainy day for sure: it\'s raining, saved', s.moment && s.moment.k === 'rain' && s.moment.got === 0 && s.moments.rain === 1, s);
ok('"🌧️ It\'s raining!" beside the coins', T.pill.test(s.pill || ''), s.pill);
let h0 = await hintT(); for (let i = 0; i < 6 && !T.hint.test(h0); i++) { await run(1.5); h0 = await hintT(); }
ok('a word: worms are coming up, tap them', T.hint.test(h0), h0);
await run(5); s = await S();
ok('the rain falls, the light greyer; puddles on your land', s.rain.on && s.rain.k === 1 && s.rain.lines && s.rain.pud > 3, s.rain);
for (let i = 0; i < 8 && !s.rain.worms.length; i++) { await run(1); s = await S(); }
ok('worms come up where you\'re looking, on your land or a lane by it', s.rain.worms.length > 0 && s.onLand && s.rain.worms.every(w => w.x > 0 && w.x < W && w.y > 0 && w.y < H), s.rain.worms);
await run(1.5); await shoot('1_raining');
// a tap on one
for (let i = 0; i < 8 && !(await S()).rain.worms.some(w => !w.pen && w.t > 1 && w.x > 150 && w.x < W - 150 && w.y > 90 && w.y < H - 90); i++) await run(1);
s = await S(); const w0 = s.rain.worms.find(w => !w.pen && w.t > 1 && w.x > 150 && w.x < W - 150 && w.y > 90 && w.y < H - 90) || s.rain.worms[0], b0 = s.worms;
await p.evaluate(() => window.__farm.pause(false)); await p.touchscreen.tap(w0.x, w0.y); await p.waitForTimeout(250); await p.evaluate(() => window.__farm.pause(true));
await run(0.1); await shoot('2_caught'); s = await S();
ok('a tap on a worm: into the worm bag (+1), counted in the save', s.worms === b0 + 1 && s.moment.got === 1, { worms: s.worms, b0, got: s.moment.got });
// a reload
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await close(); await run(1); s = await S();
ok('a reload: still raining, the worm caught kept', s.moment && s.moment.k === 'rain' && s.moment.got === 1 && s.rain.on && T.pill.test(s.pill || ''), s);
// a worm in a pen: a hen there hurries over and pecks it up (20 Nov 2026, Audrey: "Will the chicken go and try to catch the worms?", "Worms in pens")
const e0 = (await S()).rain.eaten, q = await p.evaluate(() => window.__farm.rain.penWorm());
let pe = null; for (let i = 0; i < 24 && q; i++) { await run(0.5); s = await S(); if (s.rain.eaten > e0) { pe = s; break; } if (i === 5) await shoot('2b_pen'); }
ok('a worm in a pen: a hen there hurries over and pecks it up before you', !!q && !!pe && pe.moment.got === 1, { q, eaten: pe && pe.rain.eaten, e0 });
// the bag full
await p.evaluate(() => { const g = window.__farm.game(); g.fishBag().worms = 30; g.save(); });
const good = w => !w.pen && w.t > 1 && w.x > 150 && w.x < W - 150 && w.y > 90 && w.y < H - 90;      // (out of the ground, clear of the buttons)
for (let i = 0; i < 14 && !(await S()).rain.worms.some(good); i++) await run(1);
s = await S(); const c1 = s.coins, w1 = s.rain.worms.find(good) || s.rain.worms[0];
await p.evaluate(() => window.__farm.pause(false)); await p.touchscreen.tap(w1.x, w1.y); await p.waitForTimeout(250); await p.evaluate(() => window.__farm.pause(true)); await run(0.2);
s = await S(); let h1 = await hintT(); for (let i = 0; i < 6 && !T.full.test(h1); i++) { await run(1); h1 = await hintT(); }
ok('the bag full: 3 coins for the worm instead, the bag still full', s.coins === c1 + 3 && s.worms === 30 && s.moment.got === 2 && T.full.test(h1), { s, h1 });
// no more than a shower's twelve
await p.evaluate(() => { const g = window.__farm.game(); g.moment().got = 12; g.save(); });
await run(4); const sp0 = (await S()).rain.spawned; await run(8); s = await S();
ok('a shower\'s twelve caught: no more worms come up', s.rain.spawned === sp0, { spawned: s.rain.spawned, sp0 });
// its time up
const until = s.moment.until;
await p.evaluate(u => { window.__T = u + 500; sessionStorage.setItem('__T', window.__T); }, until); await run(1.5);
s = await S(); let h2 = await hintT(); for (let i = 0; i < 6 && !T.end.test(h2); i++) { await run(1); h2 = await hintT(); }
ok('its time up: it stops, said, the pill gone', !s.moment && !s.rain.on && !s.pill && T.end.test(h2), { s, h2 });
await run(5); s = await S();
ok('the rain fades away; the puddles dry up after', s.rain.k === 0 && !s.rain.lines && s.rain.wet < 1, s.rain);
// the save checks
const edit = async fn => { await p.evaluate(fn); await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); return S(); };
s = await edit(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.moment = { k: 'rain', t: window.__T - 1000, until: window.__T + 3600e3, got: 0 }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
ok('a save changed outside the game (a shower of an hour): dropped, flagged', !s.moment && s.edited && !s.rain.on, s);
s = await edit(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.moment = { k: 'rain', t: window.__T - 1000, until: window.__T + 60e3, got: 99 }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
ok('…99 worms in one shower: dropped, flagged', !s.moment && s.edited, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

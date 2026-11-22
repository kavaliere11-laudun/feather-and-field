// The road of 50 levels (22 Nov 2026, Audrey: "why shouldn't we have more levels?"; her choice "Yes, as drawn"): farms saved
// on the road of 30 levels moved onto it as they load: ./withserver.sh node roadtest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A farm saved at old level 12 (its experience 4,000; its last level card 12; fourteen fields, its day's jobs): it loads at
// level 15 (the same experience on the new road), unflagged, its fields and jobs kept, one card ("Level 15!") that says the
// road now has 50 levels, with no gift (no new level) and nothing as new; closed, never again (a reload: no card). A farm
// saved at old level 11 with the experience of 3,800: level 15 too, its card the gift of levels 14 and 15 (2,900 coins)
// and the Speckled Sussex as new. A farm saved at old level 29 with forty fields: level 48, all forty kept. A new farm's
// save says `road: 50`. A save with a made-up `roadNew`: checked. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/roadtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-23T10:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/road_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(), d = g.data; return { level: g.level, xp: d.xp, road: d.road, roadNew: d.roadNew || 0, lvSeen: d.lvSeen, land: d.land.length, coins: d.coins, jobs: d.jobs && d.jobs.lv, edited: !!g.edited, card: f.gameUI().kind }; });
// an old road's farm: the game's own farm, its experience then, no `road`, saved (sealed) as the game saves
const oldFarm = (xp, lvSeen, fields, extra) => p.evaluate(([xp, lvSeen, fields, extra]) => { const f = window.__farm, g = f.game(), d = g.data;
  g.jobs();      // (today's jobs as the game sets them; then as the old road set them: at the old level, its targets then)
  const n30 = { eggs: L => Math.min(30, 4 + 2 * L), cuddle: L => Math.min(6, 1 + Math.floor(L / 3)), feed: () => 1, show: () => 1 };
  d.jobs = { day: d.jobs.day, lv: lvSeen, seen: true, list: d.jobs.list.map((j, i) => ({ k: j.k, n: n30[j.k](lvSeen), got: i === 1 ? n30[j.k](lvSeen) : 0, paid: i === 1 })) };
  d.xp = xp; d.lvSeen = lvSeen; d.land = [...Array(fields).keys()]; d.coins = 1000; d.guide = { step: 5, done: true }; d.first = null; delete d.road; delete d.roadNew; Object.assign(d, extra || {}); g.save(); }, [xp, lvSeen, fields, extra]);
const reload = async () => { await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(1.5); };
const T = fr ? { up: /Niveau 15 !/, road: /50 niveaux/, gift: /\+2[\s  ]?900 pièces/, sus: /Sussex tachetée/ } : { up: /Level 15!/, road: /50 levels/, gift: /\+2,900 coins/, sus: /Speckled Sussex/ };

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
let s = await st();
ok('a new farm: its save on the road of 50 levels', s.road === 50 && !s.roadNew, s);
// old level 12, its last card 12, fourteen fields (as many as old level 12 had), today's jobs set at 12
await oldFarm(4000, 12, 14);
await reload(); s = await st(); let t = await sheet();
ok('an old farm at level 12 (4,000 XP): now level 15, its experience kept, on the new road, unflagged', s.level === 15 && s.xp === 4000 && s.road === 50 && !s.edited, s);
ok('…its fourteen fields kept, its last card moved to 15, its day\'s jobs moved too', s.land === 14 && s.lvSeen === 15 && s.jobs === 15, s);
ok('…one card: "Level 15!", the road now has 50 levels; no gift, nothing as new', s.card === 'levelup' && T.up.test(t) && T.road.test(t) && !/🎁/.test(t) && !T.sus.test(t), t.slice(0, 400));
await shoot('1_moved');
const c0 = s.coins;
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5); s = await st();
ok('closed: said once, no coins given', !s.roadNew && s.coins === c0 && !s.card, s);
await reload(); s = await st();
ok('a reload: no card again, still on the new road', !s.card && !s.roadNew && s.road === 50 && s.level === 15 && !s.edited, s);
// old level 11 with 3,800 XP: now 15 too, its last card 11 (13 on the new road): the gift of 14 and 15, the Sussex new
await oldFarm(3800, 11, 12);
await reload(); s = await st(); t = await sheet();
ok('an old farm at level 11 (3,800 XP): level 15, its card the gift of levels 14 and 15 and the Speckled Sussex as new, the road said', s.level === 15 && s.lvSeen === 13 && s.card === 'levelup' && T.gift.test(t) && T.sus.test(t) && T.road.test(t) && !s.edited, { s, t: t.slice(0, 500) });
await shoot('2_gift');
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5); s = await st();
ok('closed: 2,900 coins given', s.coins === 1000 + 2900 && !s.roadNew, s);
// old level 29 with forty fields
await oldFarm(85000, 29, 40);
await reload(); s = await st();
ok('an old farm at level 29 (85,000 XP) with forty fields: level 48, all forty kept, unflagged', s.level === 48 && s.land === 40 && !s.edited, s);
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5);
// a made-up roadNew
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.roadNew = 'lots'; g.save(); });
await reload(); s = await st();
ok('a save with a made-up roadNew: dropped (no card)', !s.roadNew && !s.card, s);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

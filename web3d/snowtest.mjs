// A snowy day (23 Nov 2026, Audrey: "Can we add snow in the game for winter. Please suggest from when to when"; her choices
// "1 Dec – 28 Feb", "Snowy days now and then"): ./withserver.sh node snowtest.mjs [OUT]   (LANG=fr; W, H; PORT)
// On 23 November: no snow (out of its season). On 10 December at 11:00: a snowy day begins: "❄️ It's snowing!" beside the
// coins, the flakes falling, the farm turning white as it settles; the hens leave footprints in their yard; three minutes
// on, the snowfall over (its word), the farm white; a reload: still white, unflagged; three hours on: melted, the footprints
// gone. The light veiled while it falls. A save with snow lying longer than a snowy day allows: none. No page errors.
// Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/snowtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-23T11:00:00+00:00').getTime(), DEC = new Date('2026-12-10T11:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const jump = ms => p.evaluate(ms => { window.__T += ms; sessionStorage.setItem('__T', window.__T); }, ms);
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/snow_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); }); await run(0.5); };
const reload = async () => { await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(1); };
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(); return { ...f.snow.state(), moment: (g.data.moment || {}).k || null, lying: !!g.data.snow, edited: !!g.edited, pill: (document.querySelector('.gmom:not([hidden]), .gmoment:not([hidden])') || {}).textContent || '', hint: (document.getElementById('hint') || {}).textContent || ''}; });
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(6) + 5; g.data.lvSeen = 6; g.data.moments = { last: 0, hen: 1 }; g.save(); });
await reload();
let r = await p.evaluate(() => !!window.__farm.snow.start());
ok('23 November: no snowy day (its season is 1 December to 28 February)', !r, r);
await p.evaluate(dec => { window.__T = dec; sessionStorage.setItem('__T', dec); }, DEC);
await reload();
r = await p.evaluate(() => !!window.__farm.snow.start()); await run(4);
let s = await st();
ok('10 December: a snowy day: "❄️ It\'s snowing!" beside the coins, the flakes falling, the farm starting to turn white', r && s.on && s.moment === 'snow' && s.flakes && s.k > 0.5 && s.cover > 0 && s.cover < 0.3 && (fr ? /Il neige/ : /snowing/).test(s.pill), s);
await shoot('1_falling');
await run(60); s = await st();
ok('…a minute on: whiter as it settles; the hens\' footprints in their yard', s.cover > 0.35 && s.prints >= 1 && s.steps > 0, s);
await shoot('2_settling');
await jump(130 * 1000); await run(2); s = await st();
ok('three minutes on: the snowfall over, its word; the farm white', !s.on && !s.moment && s.cover > 0.95 && s.lying && (fr ? /Il ne neige plus/ : /snow has stopped/).test(s.hint), s);
await run(6); await shoot('3_white');
const rawBefore = await p.evaluate(() => localStorage.getItem('ff3d.farm'));
await reload(); s = await st();
if (s.edited) console.log('DIFF', JSON.stringify(await p.evaluate(raw => { const r = JSON.parse(raw).d, c = window.__farm.game().data, out = []; for (const k of Object.keys(r)) if (JSON.stringify(r[k]) !== JSON.stringify(c[k])) out.push([k, String(JSON.stringify(r[k])).slice(0, 300), String(JSON.stringify(c[k])).slice(0, 300)]); return out; }, rawBefore)));
ok('a reload: still white, unflagged', s.cover > 0.95 && !s.edited && !s.on, s);
await jump(3 * 3600e3); await run(2); s = await st();
ok('three hours on: melted, the footprints gone', s.cover === 0 && s.prints === 0, s);
// a save with the snow lying longer than a snowy day allows
await p.evaluate(() => { const g = window.__farm.game(); g.data.snow = { t: window.__T, until: window.__T + 10 * 3600e3 }; g.save(); });
await reload(); s = await st();
ok('a save with the snow lying ten hours: none', s.cover === 0 && !s.lying, s);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

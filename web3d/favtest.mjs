// Each breed's own feed (15 Nov 2026, Audrey: "The farmer will be able to create food adapted for each breed"; "One more egg a day"): ./withserver.sh node favtest.mjs [OUT]
// (below: vegtest's own start) The five new vegetables and the beds up to ten (15 Nov 2026, Audrey: "extend the fields to grow vegetables. Introduce new
// ones and it becomes a real part of the game"): ./withserver.sh node vegtest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A farm on a fake clock. Level 5: the sow card offers the first three and says lettuce comes at level 6; a sunflower can't
// be sown. Level 30 with coins: beds bought up to ten (the seventh starts a third row), each vegetable sown, grown and
// picked into the pantry (its shelf, its price, sold), a treat of each; a save with a vegetable before its level is checked.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/favtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-09T09:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const jump = async ms => { await p.evaluate(ms => { window.__T = Math.round(window.__T + ms); sessionStorage.setItem('__T', window.__T); }, ms); await run(1.5); };
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/fav_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped)')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
};
const waitWork = async (max = 90) => { for (let i = 0; i < max && await p.evaluate(() => !!window.__farm.garden.work()); i++) await run(1); };
const look = async (i = 4, z = 2.2) => { await p.evaluate(([i, z]) => { const f = window.__farm, m = f.garden.mid(i); if (m) { f.lookAt(m[0], m[2], z); f.draw(); } }, [i, z]); await run(0.2); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=09:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
const setLevel = (L, coins) => p.evaluate(([L, coins]) => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(L) + 5; g.data.lvSeen = L; g.fishBag().gift = true; g.data.coins = coins; g.save(); f.gameUI().close(); }, [L, coins]);
const st = () => p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return { ...g.favState(c), fav: c.fav || null, veg: g.data.garden ? g.data.garden.veg.carrot : null, hens: g.birdsIn(c.id).filter(b => b.sex === 'h').length }; });
const sheet = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; f.gameUI().feederSheet(c, () => {}, () => { g.mixFav(c.id); f.gameUI().close(); }); const k = document.querySelector('.gsheet:not([hidden]) .gfav'); return k ? { state: k.dataset.fav, text: k.innerText, btn: !!k.querySelector('[data-mix]'), off: k.querySelector('[data-mix]') ? k.querySelector('[data-mix]').disabled : null } : null; });
await setLevel(3, 500); await run(2);
ok('level 3 (no garden yet): the feeder card says nothing of it', (await sheet()) === null);
await setLevel(5, 500); await run(2);
let s = await st(), c = await sheet();
ok('level 5: the Rhode Island Reds’ favourite is carrots; mixing comes at level 6, and the card says so', s.crop === 'carrot' && s.state === 'level' && s.level === 6 && c && c.state === 'level' && !c.btn && /6/.test(c.text), { s, c });
await shoot('1_level5');
await setLevel(6, 500); await run(2);
s = await st(); c = await sheet();
ok('level 6, no carrots: the button is there, not to be tapped', s.state === 'short' && c.btn && c.off, { s, c });
await p.evaluate(() => { const g = window.__farm.game(); g.vegBasket().carrot = 7; g.save(); });
c = await sheet(); await shoot('2_can');
ok('with 7 carrots: "Mix it in · 3 carrots"', c.state === 'can' && c.btn && !c.off && (fr ? /Mélanger · 3 carottes/ : /Mix it in · 3 carrots/).test(c.text), c);
const before = await p.evaluate(() => { const g = window.__farm.game(); return g.dueLays(Date.now() + 86400e3).length; });
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-mix]').click()); await run(0.5);
s = await st();
ok('mixed: 3 carrots fewer, on their own feed for three days', s.state === 'on' && s.veg === 4 && s.fav && s.fav.crop === 'carrot' && Math.abs(s.left - 3 * 86400e3) < 60e3, s);
const after = await p.evaluate(() => { const g = window.__farm.game(), all = g.dueLays(Date.now() + 86400e3); return { n: all.length, fav: all.filter(l => l.fav).length, later: g.dueLays(Date.now() + 6 * 86400e3).filter(l => l.fav).length }; });
ok('a day on: one more egg from each hen (two hens: two more); none six days on', after.fav === 2 && after.n === before + 2 && after.later === 0, { before, after });
c = await sheet(); await shoot('3_on');
ok('the card says they’re on it, and for how long; nothing to tap', c.state === 'on' && !c.btn && (fr ? /préféré/ : /favourite feed/).test(c.text), c);
ok('it can’t be mixed twice', await p.evaluate(() => window.__farm.game().mixFav(window.__farm.game().data.coops[0].id) === null));
await p.evaluate(() => window.__farm.gameUI().close());
// the extra eggs really come: two days on, counted in the nest or the pantry
const laid = await p.evaluate(() => { const g = window.__farm.game(), now = Date.now() + 2 * 86400e3, c = g.data.coops[0]; c.feed = g.feedCap(c); c.fedAt = Date.now(); const due = g.dueLays(now); return { fav: due.filter(l => l.fav).length, all: due.length }; });
ok('two days on: four of the eggs due are from their own feed', laid.fav === 4, laid);
await jump(4 * 86400e3);
s = await st();
ok('four days on: back to plain feed, the button back', s.state === 'can' || s.state === 'short', s);
// ---- the save's checks
await p.evaluate(() => { const g = window.__farm.game(); g.save(); const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.coops[0].fav = { t: Date.now() + 9 * 86400e3, crop: 'carrot' }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await p.evaluate(() => window.__farm.gameUI().close());
ok('a save with feed mixed in the future: taken out', await p.evaluate(() => !window.__farm.game().data.coops[0].fav));
await p.evaluate(() => { const g = window.__farm.game(); g.save(); const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.coops[0].fav = { t: Date.now() - 1000, crop: 'sunf' }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await p.evaluate(() => window.__farm.gameUI().close());
ok('a save with another breed’s vegetable as its feed: taken out', await p.evaluate(() => !window.__farm.game().data.coops[0].fav));
ok('every breed has a favourite that is a vegetable', await p.evaluate(() => { const g = window.__farm.game(); return ['rir', 'orp', 'sil', 'sil_black', 'aya', 'call', 'leg', 'pol', 'bra', 'pea'].every(b => { const s = g.favState({ breed: b }); return s && !!g.t('crop_' + s.crop); }); }));
ok('no page errors', errs.length === 0, errs);
console.log(fails ? `FAILED: ${fails}` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);

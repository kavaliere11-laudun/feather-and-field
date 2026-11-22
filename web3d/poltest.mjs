// The Polish's four laced colours on the collector's shelf (22 Nov 2026, Audrey: "Yes, all four", "As proposed", "In their
// colour"): node poltest.mjs (LANG=fr; W, H: the screen, sideways as she plays: W=874 H=402; SHOTS=dir for pictures)
// Level 17: the shelf shows the four, "Level 18", "Level 18", "Level 20", "Level 22", no button; none in the Book's breeds.
// Level 18: its card names the Gold-laced and the White-crested Blue on the shelf; the Gold-laced for 20,000 coins: paid, its
// Little Windmill straight to place, rustic, with a gold-laced trio; its page in the Book. Made Snug: the windmill in gold
// (house_pol@gold). A brood hatched there: gold-laced chicks. Level 22, in the app (Apple stood in for): the Silver-laced for
// £4.99, placed, a silver-laced trio. Saves changed outside (the Silver-laced at level 21): checked and flagged. A reload keeps
// it all. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import { xpFor } from './src/game.js';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-22T11:00:00Z').getTime();
await ctx.addInitScript(t0 => {
  let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T;
  const get = (k, d) => { try { const v = sessionStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set = (k, v) => sessionStorage.setItem(k, JSON.stringify(v));
  if (get('__shop', false)) window.__fakeStore = {      // (Apple's shop stood in for: what's owned kept in the session)
    products: async o => ({ products: o.ids.map(id => ({ id, price: /shelf\.pol_silver/.test(id) ? '£4.99' : /shelf\./.test(id) ? '£3.99' : '£1.99' })) }),
    owned: async () => ({ ids: get('__owned', []) }),
    buy: async o => { const ids = get('__owned', []); ids.push(o.id); set('__owned', ids); return { state: 'bought', ids }; },
    restore: async () => ({ ids: get('__owned', []) }), pending: async () => ({ list: [] }), finish: async () => ({}),
  };
}, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1200); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/pol_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const xpAt = L => xpFor(L) + 5;
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(); return { level: g.level, coins: g.data.coins, shelf: (g.data.shelf || []).join(), waiting: g.waitingCoops().join(), coops: g.data.coops.map(c => c.breed).join(), card: f.gameUI().kind, edited: g.edited, move: f.move.state().on }; });
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const shelfTab = async () => { await close(); await p.evaluate(() => { const f = window.__farm; f.gameUI().bookTab = 'shelf'; f.book(); }); await run(0.3); };
const tile = br => p.evaluate(br => { const t = document.querySelector(`.gsheet .gshelf-t[data-shelf="${br}"]`); if (!t) return null; const bs = [...t.querySelectorAll('button.gbtn')];
  return { text: t.innerText.replace(/\s+/g, ' '), btns: bs.map(x => ({ t: x.textContent, off: x.disabled, go: x.dataset.shelfgo || (x.dataset.place ? 'place' : '') })), img: !!(t.querySelector('img') && t.querySelector('img').getAttribute('src').includes(br)) }; }, br);
const reload = async () => { await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(0.3); };
const lv = n => fr ? new RegExp('Niveau ' + n) : new RegExp('Level ' + n);
const N = fr ? { gold: 'Padoue dorée liserée', blue: 'Padoue bleue huppe blanche', silver: 'Padoue argentée liserée' } : { gold: 'Gold-laced Polish', blue: 'White-crested Blue Polish', silver: 'Silver-laced Polish' };
const plotOf = line => p.evaluate(line => { const f = window.__farm, g = f.game(), P = f.coopPlots().find(q => q.line === line), c = g.data.coops.find(x => x.breed === line);
  return P && c && { n: P.birds.length, colours: P.birds.filter(b => b.kind !== 'chick').map(b => b.colour).join(), chicks: P.birds.filter(b => b.kind === 'chick').map(b => b.colour).join(), breeds: g.birdsIn(c.id).map(b => b.breed).join(), models: f.coopModels().filter(m => /_pol/.test(m)), tier: c.tier, col: P.col }; }, line);

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 17: the four on the shelf, locked
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.lvSeen = 17; g.data.coins = 25000; g.data.land = Array.from({ length: 17 }, (_, i) => i); g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); }, xpAt(17));
await reload();
let pages = await p.evaluate(() => window.__farm.game().bookPages().map(x => x.breed));
ok('level 17: no Polish colour in the Book\'s breeds', !pages.some(x => x.startsWith('pol_')), pages);
await shelfTab();
const tl = {}; for (const c of ['gold', 'blue', 'buff', 'silver']) tl[c] = await tile('pol_' + c);
const into = sel => p.evaluate(sel => { const e = document.querySelector(sel); if (e) e.scrollIntoView({ block: 'center' }); }, sel);
await into('.gsheet .gshelf-t[data-shelf="pol_blue"]'); await shot('1_level17');
ok('level 17: the shelf shows the four with their pictures, "Level 18", "18", "20", "22", no button', ['gold', 'blue', 'buff', 'silver'].every(c => tl[c] && tl[c].img && !tl[c].btns.length) && lv(18).test(tl.gold.text) && lv(18).test(tl.blue.text) && lv(20).test(tl.buff.text) && lv(22).test(tl.silver.text), tl);
const order = await p.evaluate(() => [...document.querySelectorAll('.gsheet .gshelf-t')].map(t => t.dataset.shelf).join());
ok('the shelf in level order', order === 'sil_buff,ara,sil_partridge,coc,pol_gold,pol_blue,pol_buff,pol_silver', order);
// level 18: its card, then the Gold-laced for 20,000 coins
await close();
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.land.push(17); g.save(); }, xpAt(18)); await run(1.6);
let s = await st(), t = await sheet();
await into('.gsheet .gshelfnew'); await shot('2_level18');
const sees = await p.evaluate(() => document.querySelectorAll('.gsheet [data-shelfsee]').length);
ok('level 18: its card names the Gold-laced and the White-crested Blue on the shelf, in one line, one "See the shelf"', s.level === 18 && s.card === 'levelup' && t.includes(N.gold + ', ' + N.blue) && !t.includes(N.silver) && sees === 1, { s, sees, t: t.slice(0, 500) });
await p.evaluate(() => document.querySelector('.gsheet [data-shelfsee]').click()); await run(0.4);
const tg = await tile('pol_gold');
ok('the shelf at 18: the Gold-laced "🪙 20,000", ready; the Silver-laced still locked', tg && tg.btns.length === 1 && tg.btns[0].go === 'coins' && !tg.btns[0].off && /20[\s,.  ]?000/.test(tg.btns[0].t) && !(await tile('pol_silver')).btns.length, tg);
const c0 = (await st()).coins;
await p.evaluate(() => document.querySelector('.gsheet .gshelf-t[data-shelf="pol_gold"] [data-shelfgo="coins"]').click());
await p.waitForFunction(() => window.__farm.move.state().on, null, { timeout: 15000 }).catch(() => {}); await run(0.4);
s = await st();
ok('bought: 20,000 coins paid, theirs, their windmill to place at once', s.coins === c0 - 20000 && s.shelf === 'pol_gold' && s.move, { s, c0 });
await p.tap('.gmove-go'); await run(1.5);
let pc = await plotOf('pol_gold');
ok('placed: a rustic Little Windmill with a gold-laced trio', pc && pc.n === 3 && pc.colours === 'gold,gold,gold' && pc.breeds === 'pol_gold,pol_gold,pol_gold' && pc.models.includes('box_pol') && pc.tier === 0, pc);
pages = await p.evaluate(() => window.__farm.game().bookPages().filter(x => x.breed === 'pol_gold').map(x => ({ found: x.found, n: x.names.length, name: x.name })));
ok('the Book\'s breeds: the Gold-laced\'s page, found, three names', pages.length === 1 && pages[0].found && pages[0].n === 3, pages);
// made Snug: the windmill in gold; a brood hatched: gold-laced chicks
await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'pol_gold'), hen = g.birdsIn(c.id).find(b => b.sex === 'h'); c.tier = 2;
  c.brood = { hen: hen.id, start: Date.now() - 30 * 3600e3, n: 2, hatched: true, kids: [{ sex: 'h', stars: 1 }, { sex: 'r', stars: 1 }] }; g.save(); });
await reload();
pc = await plotOf('pol_gold');
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'pol_gold'); f.lookAt(P.centre.x, P.centre.z, 2.6); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await shot('3_snug');
ok('made Snug: the Little Windmill in gold (its own colours)', pc && pc.models.includes('house_pol@gold') && pc.col === 'gold', pc);
ok('a brood hatched there: gold-laced chicks', pc && pc.chicks && pc.chicks.split(',').length >= 1 && pc.chicks.split(',').every(x => x === 'gold'), pc);
s = await st();
ok('a reload keeps it, unflagged', s.shelf === 'pol_gold' && /pol_gold/.test(s.coops) && !s.edited, s);
// level 22, in the app: the Silver-laced for £4.99
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.lvSeen = 22; g.data.coins = 3000; g.data.land = Array.from({ length: 22 }, (_, i) => i); g.save(); }, xpAt(22));
await p.evaluate(() => sessionStorage.setItem('__shop', 'true')); await reload();
await shelfTab(); const ts = await tile('pol_silver');
await into('.gsheet .gshelf-t[data-shelf="pol_buff"]'); await shot('4_level22');
ok('level 22, 3,000 coins: the Silver-laced "🪙 40,000" greyed, "£4.99" beside it', ts && ts.btns.length === 2 && ts.btns[0].go === 'coins' && ts.btns[0].off && /40[\s,.  ]?000/.test(ts.btns[0].t) && ts.btns[1].go === 'pay' && ts.btns[1].t === '£4.99', ts);
await p.evaluate(() => document.querySelector('.gsheet .gshelf-t[data-shelf="pol_silver"] [data-shelfgo="pay"]').click());
await p.waitForFunction(() => window.__farm.move.state().on, null, { timeout: 15000 }).catch(() => {}); await run(0.6);
s = await st();
ok('bought for money (Apple stood in for): theirs, coins untouched, their windmill to place', s.shelf === 'pol_gold,pol_silver' && s.coins === 3000 && s.move, s);
await p.tap('.gmove-go'); await run(1.5);
pc = await plotOf('pol_silver');
ok('placed: a silver-laced trio', pc && pc.colours === 'silver,silver,silver' && pc.breeds === 'pol_silver,pol_silver,pol_silver', pc);
await reload(); s = await st();
ok('a reload: kept, unflagged', s.shelf === 'pol_gold,pol_silver' && /pol_silver/.test(s.coops) && !s.edited, s);
await p.evaluate(() => sessionStorage.removeItem('__shop'));
// a save changed outside: the Silver-laced at level 21
await p.evaluate(() => { const f = window.__farm, g = f.game(), d = g.data, c = d.coops.find(x => x.breed === 'pol_silver'); d.birds = d.birds.filter(b => b.coop !== c.id); d.coops = d.coops.filter(x => x !== c); d.xp = f.xpFor(21) + 5; d.lvSeen = 21; g.save(); });
await reload(); s = await st();
ok('a save changed outside (the Silver-laced on the shelf at level 21): checked and flagged; the Gold-laced kept', s.edited && s.shelf === 'pol_gold', s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

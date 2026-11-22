// The collector's shelf (21 Nov 2026, Audrey: "The collector's shelf", her prices "As proposed"): node shelftest.mjs
// (LANG=fr; W, H: the screen, sideways as she plays: W=874 H=402; SHOTS=dir for pictures)
// A farm at level 7: no Buff or Partridge Silkie on the level path (the Book's breeds, Your coops' next breed); the shelf's
// tab shows both, each with its level and no button. Level 8: its card says the Buff Silkies are on the shelf, "See the
// shelf" opens it; the Buff Silkies for 5,000 coins: paid, theirs for good, their coop straight to place, a buff trio in a
// rustic buff Pagoda; the tile then "On your farm"; a reload keeps it, unflagged. Level 12: the Partridge Silkies at 9,000,
// greyed with too few coins; in the app (Apple stood in for) £2.99: bought, kept from Apple's record, placed. Saves changed
// outside (a shelf breed before its level, a shelf breed's coop not had): checked and flagged. Farms from before the shelf:
// at 13 the Buff Silkies kept (waiting), at 22 both, at 10 none; unflagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import { xpFor } from './src/game.js';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-21T11:00:00Z').getTime();
await ctx.addInitScript(t0 => {
  let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T;
  const get = (k, d) => { try { const v = sessionStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set = (k, v) => sessionStorage.setItem(k, JSON.stringify(v));
  if (get('__shop', false)) window.__fakeStore = {      // (Apple's shop stood in for: what's owned kept in the session)
    products: async o => ({ products: o.ids.map(id => ({ id, price: /shelf\./.test(id) ? '£2.99' : '£1.99' })) }),
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
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/shelf_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const xpAt = L => xpFor(L) + 5;
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(); return { level: g.level, coins: g.data.coins, shelf: (g.data.shelf || []).join(), waiting: g.waitingCoops().join(), coops: g.data.coops.map(c => c.breed).join(), card: f.gameUI().kind, edited: g.edited, move: f.move.state().on }; });
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const shelfTab = async () => { await close(); await p.evaluate(() => { const f = window.__farm; f.gameUI().bookTab = 'shelf'; f.book(); }); await run(0.3); };
const tile = br => p.evaluate(br => { const t = document.querySelector(`.gsheet .gshelf-t[data-shelf="${br}"]`); if (!t) return null; const bs = [...t.querySelectorAll('button.gbtn')];
  return { text: t.innerText.replace(/\s+/g, ' '), btns: bs.map(x => ({ t: x.textContent, off: x.disabled, go: x.dataset.shelfgo || (x.dataset.place ? 'place' : '') })), img: !!t.querySelector('img') }; }, br);
const reload = async () => { await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(0.3); };
const T = fr ? { buff: 'Poule soie fauve', part: 'Poule soie perdrix', l8: /Niveau 9/, l12: /Niveau 15/, had: /Dans votre ferme/, news: /Dans la vitrine du collectionneur\s*:\s*Poule soie fauve/, see: /Voir la vitrine/, got: /Poule soie fauve\s*: à vous pour toujours · −5\s000 pièces/, paid: /Poule soie perdrix\s*: à vous pour toujours\. Merci/, next: /Au niveau 10 : Canards/ }
  : { buff: 'Buff Silkie', part: 'Partridge Silkie', l8: /Level 9/, l12: /Level 15/, had: /On your farm/, news: /On the collector’s shelf: Buff Silkie/, see: /See the shelf/, got: /Buff Silkie: yours for good · −5,000 coins/, paid: /Partridge Silkie: yours for good\. Thank you/, next: /At level 10: Call/ };

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 7: the shelf locked; no shelf breed on the level path
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.lvSeen = 8; g.data.coins = 6000; g.data.land = [0, 1, 2, 3, 4, 5, 6, 7]; g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); }, xpAt(8));
await reload();
let pages = await p.evaluate(() => window.__farm.game().bookPages().map(x => x.breed));
const nb = await p.evaluate(() => window.__farm.game().nextBreed());
ok('level 8 (the road of 50 levels): no Buff or Partridge Silkie in the Book\'s breeds or as a next breed; the next is the call ducks at 12', !pages.includes('sil_buff') && !pages.includes('sil_partridge') && nb && nb.breed === 'call' && nb.level === 12, { pages, nb });
await shelfTab();
let tb = await tile('sil_buff'), tp = await tile('sil_partridge'), t = await sheet();
await shot('1_level7');
ok('level 8: the shelf\'s tab: both, their pictures, "Level 9" and "Level 15", no button', tb && tp && tb.img && tp.img && T.l8.test(tb.text) && T.l12.test(tp.text) && !tb.btns.length && !tp.btns.length, { tb, tp });
// level 8: its card, then the shelf
await close();
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.land.push(8); g.save(); }, xpAt(9)); await run(1.6);
let s = await st(); t = await sheet();
await shot('2_level8');
ok('level 9: its card says the Buff Silkies are on the shelf, with "See the shelf"', s.level === 9 && s.card === 'levelup' && T.news.test(t) && T.see.test(t), { s, t: t.slice(0, 400) });
await p.evaluate(() => document.querySelector('.gsheet [data-shelfsee]').click()); await run(0.4);
s = await st(); tb = await tile('sil_buff');
ok('"See the shelf": the Book opens on the shelf; the Buff Silkies "🪙 5,000", ready', s.card === 'book' && tb && tb.btns.length === 1 && tb.btns[0].go === 'coins' && !tb.btns[0].off && /5[\s,.  ]?000/.test(tb.btns[0].t), { s, tb });
// bought with coins: their coop straight to place
const c0 = (await st()).coins;
await p.evaluate(() => document.querySelector('.gsheet .gshelf-t[data-shelf="sil_buff"] [data-shelfgo="coins"]').click());
await p.waitForFunction(() => window.__farm.move.state().on, null, { timeout: 15000 }).catch(() => {}); await run(0.4);
s = await st(); const h1 = await p.evaluate(() => document.getElementById('hint').textContent);
ok('bought: 5,000 coins paid, theirs, said; their coop to place at once', s.coins === c0 - 5000 && s.shelf === 'sil_buff' && s.move && T.got.test(h1), { s, c0, h1 });
await p.tap('.gmove-go'); await run(1.5);
s = await st();
const bfc = await p.evaluate(() => { const f = window.__farm, g = f.game(), P = f.coopPlots().find(q => q.line === 'sil_buff'), c = g.data.coops.find(x => x.breed === 'sil_buff');
  return P && c && { n: P.birds.length, colours: P.birds.map(b => b.colour).join(), breeds: g.birdsIn(c.id).map(b => b.breed).join(), models: f.coopModels(), tier: c.tier }; });
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil_buff'); f.lookAt(P.centre.x, P.centre.z, 2.6); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await shot('3_placed');
ok('placed: a rustic Pagoda in buff with a buff trio', !s.move && /sil_buff/.test(s.coops) && bfc && bfc.n === 3 && bfc.colours === 'buff,buff,buff' && bfc.breeds === 'sil_buff,sil_buff,sil_buff' && bfc.models.includes('box_sil@buff') && bfc.tier === 0, { s, bfc });
await shelfTab(); tb = await tile('sil_buff'); tp = await tile('sil_partridge');
ok('the shelf: the Buff Silkies "On your farm", no button; the Partridge still "Level 15"', tb && T.had.test(tb.text) && !tb.btns.length && T.l12.test(tp.text) && !tp.btns.length, { tb, tp });
pages = await p.evaluate(() => window.__farm.game().bookPages().filter(x => x.breed === 'sil_buff').map(x => ({ found: x.found, n: x.names.length })));
ok('the Book\'s breeds: the Buff Silkies\' page, found, three names', pages.length === 1 && pages[0].found && pages[0].n === 3, pages);
await reload(); s = await st();
ok('a reload keeps it all, unflagged', s.shelf === 'sil_buff' && /sil_buff/.test(s.coops) && !s.edited && s.coins === c0 - 5000, s);
// level 10: the Lavender Araucana comes onto the shelf (its card); bought for 8,000 coins, its Mountain Hut placed, a lavender trio
await close();
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.coins = 9000; g.data.land = Array.from({ length: 12 }, (_, i) => i); g.save(); }, xpAt(12)); await run(1.6);
s = await st(); t = await sheet();
ok('level 12: its card says the Lavender Araucana is on the shelf', s.level === 12 && s.card === 'levelup' && (fr ? /Dans la vitrine du collectionneur\s*:\s*Araucana lavande/ : /On the collector’s shelf: Lavender Araucana/).test(t), { s, t: t.slice(0, 300) });
await p.evaluate(() => document.querySelector('.gsheet [data-shelfsee]').click()); await run(0.4);
const ta = await tile('ara');
ok('the shelf at 10: the Araucana "🪙 8,000", ready; the Partridge still locked', ta && ta.btns.length === 1 && ta.btns[0].go === 'coins' && !ta.btns[0].off && /8[\s,.\u202f\u00a0]?000/.test(ta.btns[0].t) && !(await tile('sil_partridge')).btns.length, ta);
const c1 = (await st()).coins;
await p.evaluate(() => document.querySelector('.gsheet .gshelf-t[data-shelf="ara"] [data-shelfgo="coins"]').click());
await p.waitForFunction(() => window.__farm.move.state().on, null, { timeout: 15000 }).catch(() => {}); await run(0.4);
await p.tap('.gmove-go'); await run(1.5);
s = await st();
const arc = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'ara'); return c && { breeds: g.birdsIn(c.id).map(b => b.breed).join(), models: f.coopModels().filter(m => /_ara$/.test(m)), tier: c.tier }; });
ok('bought for 8,000 coins and placed: a rustic Mountain Hut with its lavender trio', s.coins === c1 - 8000 && s.shelf === 'sil_buff,ara' && arc && arc.breeds === 'ara,ara,ara' && arc.models.includes('box_ara') && arc.tier === 0 && !s.move, { s, arc });
pages = await p.evaluate(() => window.__farm.game().bookPages().filter(x => x.breed === 'ara').map(x => ({ found: x.found, n: x.names.length })));
ok('the Book\'s breeds: the Araucana\'s page, found', pages.length === 1 && pages[0].found && pages[0].n === 3, pages);
await reload(); s = await st();
ok('a reload keeps it, unflagged', /ara/.test(s.coops) && s.shelf === 'sil_buff,ara' && !s.edited, s);
// level 12: the Partridge Silkies, 9,000 coins (too few: greyed); in the app, Apple's price
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.lvSeen = 15; g.data.coins = 3000; g.data.land = Array.from({ length: 15 }, (_, i) => i); g.save(); }, xpAt(15));
await p.evaluate(() => sessionStorage.setItem('__shop', 'true')); await reload();
await shelfTab(); tp = await tile('sil_partridge'); t = await sheet();
await shot('4_level12');
const tc = await tile('coc');
ok('level 15: the Partridge Cochin on the shelf, "Level 17", no button', tc && tc.img && (fr ? /Niveau 17/ : /Level 17/).test(tc.text) && !tc.btns.length, tc);
ok('level 15, 3,000 coins: the Partridge Silkies "🪙 9,000" greyed, "£2.99" beside it', tp && tp.btns.length === 2 && tp.btns[0].go === 'coins' && tp.btns[0].off && /9[\s,.  ]?000/.test(tp.btns[0].t) && tp.btns[1].go === 'pay' && tp.btns[1].t === '£2.99', { tp });
await p.evaluate(() => document.querySelector('.gsheet .gshelf-t[data-shelf="sil_partridge"] [data-shelfgo="pay"]').click());
await p.waitForFunction(() => window.__farm.move.state().on, null, { timeout: 15000 }).catch(() => {}); await run(0.6);
s = await st(); const h2 = await p.evaluate(() => document.getElementById('hint').textContent);
ok('bought for money (Apple stood in for): theirs, said, coins untouched, their coop to place', s.shelf === 'sil_buff,ara,sil_partridge' && s.coins === 3000 && s.move && T.paid.test(h2), { s, h2 });
await p.tap('.gmove-go'); await run(1.5); s = await st();
ok('placed: the Partridge Silkies\' Pagoda on the farm', /sil_partridge/.test(s.coops) && !s.move, s);
await reload(); s = await st();
ok('a reload: kept, unflagged', s.shelf === 'sil_buff,ara,sil_partridge' && /sil_partridge/.test(s.coops) && !s.edited, s);
await p.evaluate(() => sessionStorage.removeItem('__shop'));
// saves changed outside: a shelf breed before its level; a shelf breed's coop not had
const edit = async fn => { await p.evaluate(fn); await reload(); return st(); };
s = await edit(L => { const g = window.__farm.game(), d = g.data; d.xp = 0; for (const k of ['sil_buff', 'sil_partridge']) { const c = d.coops.find(x => x.breed === k); d.birds = d.birds.filter(b => b.coop !== c.id); d.coops = d.coops.filter(x => x !== c); }
  d.xp = window.__farm.xpFor(14) + 5; d.lvSeen = 14; d.shelf = ['sil_buff', 'sil_partridge']; g.save(); });
ok('a save changed outside (the Partridge Silkies on the shelf at level 14): checked and flagged; the Buff Silkies kept', s.edited && s.shelf === 'sil_buff', s);
s = await edit(() => { const f = window.__farm, g = f.game(), d = g.data; d.xp = f.xpFor(16) + 5; d.lvSeen = 13; d.shelf = ['sil_buff']; d.coops.push({ id: 'c' + (d.next++), breed: 'sil_partridge', tier: 0, x: 20, z: 20, deg: 0, name: '', eggs: 0, bonus: 0, feed: 6, fedAt: Date.now(), brood: null, lastBrood: 0, checked: Date.now() }); g.save(); });
ok('a save changed outside (a Partridge coop never had): checked and flagged, the coop gone', s.edited && !/sil_partridge/.test(s.coops), s);
// farms from before the shelf (no shelfV): what they had come to on the level path kept, free
const before = async (L, extra) => p.evaluate(([L, extra]) => { const f = window.__farm, g = f.game(), d = g.data;
  for (const k of ['sil_buff', 'sil_partridge']) { const c = d.coops.find(x => x.breed === k); if (c) { d.birds = d.birds.filter(b => b.coop !== c.id); d.coops = d.coops.filter(x => x !== c); } }
  d.xp = [0, 0, 15, 45, 120, 230, 380, 580, 880, 1320, 1950, 2800, 3850, 5100, 6650, 8400, 10550, 13050, 16000, 19350, 23200, 27400, 32100][L] + 5; d.lvSeen = L; delete d.shelf; delete d.shelfV; delete d.road; delete d.roadNew; delete d.jobs; d.land = d.land.slice(0, Math.min(d.land.length, L)); /* (no more fields than it could have had then) */ Object.assign(d, extra || {}); g.save(); }, [L, extra]);      // (a farm from before the shelf was on the road of 30 levels: its experience then, no `road`)
await before(13); await reload(); s = await st();
ok('a farm from before at (old) level 13: the Buff Silkies kept, waiting to be placed; unflagged', s.shelf === 'sil_buff' && /sil_buff/.test(s.waiting) && !/sil_partridge/.test(s.waiting) && !s.edited, s);
await before(22); await reload(); s = await st();
ok('a farm from before at (old) level 22: both kept, waiting; unflagged', s.shelf === 'sil_buff,sil_partridge' && /sil_buff/.test(s.waiting) && /sil_partridge/.test(s.waiting) && !s.edited, s);
await before(10); await reload(); s = await st();
ok('a farm from before at (old) level 10: none (the shelf\'s to buy from); unflagged', s.shelf === '' && !s.waiting.split(',').some(x => x === 'sil_buff' || x === 'sil_partridge') && !s.edited, s);
await close(); await p.evaluate(() => window.__farm.coopsSheet()); await run(0.3); t = await sheet();
ok('Your coops at level 10: the next breed is not a shelf one', !/Buff|fauve|Partridge|perdrix/.test(t.split('\n').slice(-6).join(' ')), t.slice(-200));
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

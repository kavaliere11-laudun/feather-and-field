// The shop's Chickens shelf and things to come in colour (23 Nov 2026, Audrey: "the chickens to buy are not visible in the
// shop. And I don't think we should grey things not available yet in the shop as it needs a certain level. Because it can
// make people excited to progress"): ./withserver.sh node shophenstest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A level-9 farm in the app (Apple stood in for, its prices): the farm shop has a Chickens tab after Coins: the collector's
// shelf (the Buff Silkie for 🪙 3,000 or £2.99, the others in colour with "🔒 Level N", no button) and the rare Silkie trios
// (each £6.99, all four £19.99); the Buff Silkies bought there with coins: their coop to place. The Decorations, Animals and
// Outfits tabs: what's to come in colour (its picture, no dark shape), "🔒" and its level, no button. Below level 3: no
// Chickens tab. The shop rethought (23 Nov 2026, Audrey: "Everything is a bit bulky in this popup can you rethink it for
// better navigation. Also we need to add the coops"): sideways, the shelves down the left (all in sight, the coins at their
// top) and the things beside them as tiles, three a row; a tile's words only when its picture is tapped. A Coops shelf:
// the season's buildings only (all nine, her breed's first; its coins with the game's gold coin and Apple's price side by
// side, quiet when short of coins; the breeds to come locked); a building's picture: its own page, the building in 3D turned
// by a finger (never by itself), its words, its buttons; back; bought there: theirs and moved into, the shop closed. No page
// errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/shophenstest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000);
await ctx.addInitScript(() => {
  const price = id => /silkie\.all$/.test(id) ? '£19.99' : /silkie\./.test(id) ? '£6.99' : /shelf\.(buff|partridge)$/.test(id) ? '£2.99' : /shelf\.pol_silver$/.test(id) ? '£4.99' : /shelf\./.test(id) ? '£3.99' : '£0.99';
  window.__fakeStore = { products: async o => ({ products: o.ids.map(id => ({ id, price: price(id) })), asked: o.ids.length }), owned: async () => ({ ids: [] }), buy: async () => ({ state: 'cancelled', ids: [] }),
    restore: async () => ({ ids: [] }), pending: async () => ({ list: [] }), finish: async () => ({}), hello: async () => ({ v: 1 }), storefront: async () => ({ store: 'GBR' }) };
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.draw(); }); await p.waitForTimeout(1500); };
const shot = async n => { await p.waitForTimeout(400); await p.evaluate(() => window.__farm.draw()).catch(() => {}); await p.screenshot({ path: `${OUT}/hens_${n}${fr ? '_fr' : ''}.png` }).catch(() => {}); };
const tabs = () => p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .gshop-tabs .gchip')].map(c => c.dataset.tab));
const openTab = async k => { await p.evaluate(k => { const f = window.__farm; f.gameUI().close(); f.deco.shop(); const t = document.querySelector(`.gsheet:not([hidden]) .gchip[data-tab="${k}"]`); if (t) t.click(); }, k); await p.waitForTimeout(500); };
const setLevel = L => p.evaluate(L => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(L) + 5; g.data.lvSeen = L; g.data.coins = 6000; g.save(); }, L);

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await setLevel(2); await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await openTab('decor');
ok('level 2: no Chickens tab yet', !(await tabs()).includes('hens'), await tabs());
await setLevel(9); await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await openTab('hens'); let t = await tabs();
ok('level 9: a Chickens tab, right after Coins', t[0] === 'coins' && t[1] === 'hens', t);
const shelf = await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .gshelf-t[data-shelf]')].map(c => { const im = c.querySelector('img'), s = getComputedStyle(im);
  return { b: c.dataset.shelf, btns: [...c.querySelectorAll('button.gbtn')].map(x => x.textContent), lv: (c.querySelector('.gshelf-lv') || {}).textContent || '', opacity: +s.opacity, filter: s.filter }; }));
const buff = shelf.find(x => x.b === 'sil_buff'), rest = shelf.filter(x => x.b !== 'sil_buff');
ok('its collector\'s shelf: the Buff Silkie for 🪙 3,000 or £2.99', buff && buff.btns.length === 2 && /3[,.\s  ]?000/.test(buff.btns[0]) && buff.btns[1] === '£2.99', buff);
ok('…the others in colour (not faded), "🔒" and their level, no button', rest.length === 7 && rest.every(x => !x.btns.length && /🔒/.test(x.lv) && /\d/.test(x.lv) && x.opacity === 1 && (x.filter === 'none' || !x.filter)), rest);
const rare = await p.evaluate(() => ({ tiles: [...document.querySelectorAll('.gsheet:not([hidden]) .grare-tiles .gshelf-t')].map(c => [c.dataset.rare, (c.querySelector('button') || {}).textContent || '']), all: (document.querySelector('.gsheet:not([hidden]) .giap-adopt-all') || {}).textContent || '' }));
ok('the rare Silkie trios: each £6.99, all four £19.99', rare.tiles.length === 4 && rare.tiles.every(x => x[1] === '£6.99') && /19\.99/.test(rare.all), rare);
await shot('1_chickens');
await p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden]) .gcshelf'); if (e) e.scrollIntoView(); }); await shot('1b_shelf');
await p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden]) .grare-tiles'); if (e) e.scrollIntoView(); }); await shot('2_rare');
// (24 Nov 2026, Audrey: "For the chickens create 3 pills at the top for special breeds and rare breeds please and all")
const pills = () => p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'); return { pills: [...S.querySelectorAll('.ghens-pills .gchip')].map(c => [c.dataset.hens, c.textContent, c.classList.contains('on')]), shelf: S.querySelectorAll('.gshop-main [data-shelf]').length, rare: S.querySelectorAll('.gshop-main [data-rare]').length, top: (() => { const r = S.querySelector('.ghens-pills'), m = S.querySelector('.gshop-main'); return r && m ? r.getBoundingClientRect().top - m.getBoundingClientRect().top : 99; })() }; });
const pa = await pills();
ok('three pills at the top: All (picked), Special breeds, Rare breeds; All shows both', pa.pills.length === 3 && pa.pills[0][0] === 'all' && pa.pills[0][2] && (fr ? /Races spéciales/ : /Special breeds/).test(pa.pills[1][1]) && (fr ? /Races rares/ : /Rare breeds/).test(pa.pills[2][1]) && pa.shelf === 8 && pa.rare === 4 && pa.top < 30, pa);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .ghens-pills [data-hens="special"]').click()); await p.waitForTimeout(300);
const ps = await pills();
ok('…Special breeds: the collector\'s shelf only', ps.pills[1][2] && ps.shelf === 8 && ps.rare === 0, ps);
await shot('2b_special');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .ghens-pills [data-hens="rare"]').click()); await p.waitForTimeout(300);
const pr2 = await pills();
ok('…Rare breeds: the rare Silkie trios only', pr2.pills[2][2] && pr2.shelf === 0 && pr2.rare === 4, pr2);
await shot('2c_rare');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .ghens-pills [data-hens="all"]').click()); await p.waitForTimeout(300);
// bought with coins from here: its coop to place
await openTab('hens');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gshelf-t[data-shelf="sil_buff"] button[data-shelfgo="coins"]').click()); await p.waitForTimeout(1500);
const s = await p.evaluate(() => { const g = window.__farm.game(); return { shelf: (g.data.shelf || []).join(), coins: g.data.coins, move: !!window.__farm.move.state().on }; });
ok('the Buff Silkies bought here with coins: 3,000 left (the shelf’s first at 3,000 since 24 Nov 2026), their coop to place', s.shelf === 'sil_buff' && s.coins === 3000 && s.move, s);
await p.evaluate(() => { const f = window.__farm; if (f.move.state().on) f.move.cancel(); });
// things to come, in colour
for (const [k, sel] of [['decor', '.gdec'], ['animals', '.gani'], ['outfits', '.gout']]) {
  await setLevel(9); await openTab(k);
  const cards = await p.evaluate(sel => [...document.querySelectorAll('.gsheet:not([hidden]) ' + sel)].filter(c => c.classList.contains('glock')).map(c => ({ img: !!c.querySelector('.gpic img'), sil: !!c.querySelector('.gsil'), lv: (c.querySelector('.glock-lv') || {}).textContent || '', btn: !!c.querySelector('button.gbtn') })), sel);
  ok(`${k}: what's to come in colour (its picture, no dark shape), "🔒" and its level, no button`, cards.length > 0 && cards.every(c => c.img && !c.sil && /🔒|📅/.test(c.lv) && /\d/.test(c.lv) && !c.btn), cards);
  if (k === 'decor') await shot('3_decor');
}
// the shop rethought: the shelves down the left, the tiles beside them, three a row
await setLevel(9); await openTab('decor');
const lay = await p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'), r = e => e.getBoundingClientRect(), rail = r(S.querySelector('.gshop-rail')), main = r(S.querySelector('.gshop-main')), sh = r(S);
  const tiles = [...S.querySelectorAll('.gshop-main > .gpage')].slice(0, 3).map(t => Math.round(r(t).top)), tabs = [...S.querySelectorAll('.gshop-tabs .gchip')].map(c => r(c));
  const words = [...S.querySelectorAll('.gshop-main > .gpage .gdec-l')].filter(e => e.offsetParent !== null).length;
  return { left: rail.right <= main.left, tabsIn: tabs.every(t => t.bottom <= sh.bottom - 4 && t.left >= sh.left), row3: tiles.length === 3 && tiles.every(t => t === tiles[0]), pill: !!S.querySelector('.gshop-rail .gshop-c'), words }; });
ok('sideways: the shelves down the left, all in sight, the coins at their top; the tiles beside them, three a row; no words yet', lay.left && lay.tabsIn && lay.row3 && lay.pill && lay.words === 0, lay);
// the tiles scroll on their own (23 Nov 2026, Audrey: "I can't scroll down"): as tall as the card leaves them, more below, the
// wheel (or a finger) takes them down, the shelves staying where they are
await setLevel(30); await openTab('decor');
const sc0 = await p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'), m = S.querySelector('.gshop-main'), r = m.getBoundingClientRect(), sh = S.getBoundingClientRect(); return { h: m.clientHeight, sh: m.scrollHeight, inCard: r.bottom <= sh.bottom + 1, x: r.left + r.width / 2, y: r.top + r.height / 2, rail: S.querySelector('.gshop-rail').getBoundingClientRect().top }; });
await p.mouse.move(sc0.x, sc0.y); await p.mouse.wheel(0, 300); await p.waitForTimeout(500);
const sc1 = await p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'); return { top: S.querySelector('.gshop-main').scrollTop, rail: S.querySelector('.gshop-rail').getBoundingClientRect().top }; });
ok('the tiles: within the card, more below, scrolled down by the wheel, the shelves where they were', sc0.inCard && sc0.sh > sc0.h + 20 && sc1.top > 50 && Math.abs(sc1.rail - sc0.rail) < 1, { sc0, sc1 });
await shot('3b_scrolled');
// (23 Nov 2026, Audrey: "I think seasons should go into decorations. And the coops should have a special coops mention somehow
// and make it more obvious that's the seasonal one"): no Seasons shelf, the Christmas dress after the decorations; the
// Seasonal coops shelf with its collection's banner and its season on each building's picture
await setLevel(30); await openTab('decor');
const sd = await p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'), cards = [...S.querySelectorAll('.gshop-main > .gpage')];
  return { tabs: [...S.querySelectorAll('.gshop-tabs .gchip')].map(c => c.dataset.tab), dress: cards.findIndex(c => c.dataset.dress === 'xmas'), lastDecor: cards.map(c => !!c.dataset.decor).lastIndexOf(true), coops: (S.querySelector('.gchip[data-tab="coops"]') || {}).textContent || '' }; });
ok('no Seasons shelf: the Christmas dress on the Decorations shelf, after the decorations; the coops\' shelf "Seasonal coops"', !sd.tabs.includes('seasons') && sd.dress > sd.lastDecor && sd.lastDecor >= 0 && (fr ? /Poulaillers de saison/ : /Seasonal coops/).test(sd.coops), sd);
await openTab('coops');
const ban = await p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'), b = S.querySelector('.gcoops-ban'); return { t: b ? b.innerText : '', ribbons: [...S.querySelectorAll('.gshopcoop .gcoop-ribbon')].map(r => r.textContent) }; });
ok('…its banner: the winter collection, what seasonal coops are, until when; each building\'s picture says "❄️ Winter"', (fr ? /collection d’hiver/ : /winter collection/).test(ban.t) && (fr ? /Poulaillers de saison/ : /Seasonal coops/).test(ban.t) && /📅/.test(ban.t) && ban.ribbons.length === 9 && ban.ribbons.every(r => (fr ? /Hiver/ : /Winter/).test(r)), ban);
await shot('3c_seasonal');
// every thing with its 3D page (23 Nov 2026, Audrey: "Offer it for all items ... For the chickens if you can try to make them
// alive in the 360 preview, moves needs to be subtle and natural please. We should have the same preview in big when you click
// for all items"): a "360° view" pill on each tile of every shelf but the coins; each tile's picture whole (not cut)
const all = {};
for (const k of ['hens', 'decor', 'animals', 'outfits']) {
  await setLevel(30); await openTab(k);
  all[k] = await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .gshop-main .gviewable')].map(c => { const pic = c.querySelector('.gprev-open'), im = pic.querySelector('img'), a = pic.getBoundingClientRect(), b = im ? im.getBoundingClientRect() : a;
    return { badge: /360°/.test((pic.querySelector('.gprev-badge') || {}).textContent || ''), whole: b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1 }; }));
}
ok('every shelf\'s things (the chickens, decorations and the season\'s dresses, animals, outfits): a "360° view" pill, their pictures whole', Object.values(all).every(l => l.length > 0 && l.every(x => x.badge && x.whole)), Object.fromEntries(Object.entries(all).map(([k, l]) => [k, l.length + ' ' + l.filter(x => x.badge && x.whole).length])));
// a decoration's page: the bird bath in 3D, its words, its buy button moved there; back: the shelf as it was
await setLevel(9); await openTab('decor');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gpage[data-decor="birdbath"] .gcard-t').click());
await p.waitForFunction(() => { const v = window.__farm.gameUI().preview; return v && v.state().frames > 0; }, null, { timeout: 60000 }).catch(() => {});
const dp = await p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'), v = window.__farm.gameUI().preview; return { pv: v ? v.state() : null, name: (S.querySelector('.gprev-n') || {}).textContent || '', words: (S.querySelector('.gprev-l') || {}).textContent || '', btn: (S.querySelector('.gprev-b .gbtn') || {}).textContent || '', back: (S.querySelector('.gshop-back') || {}).textContent || '' }; });
ok('a decoration\'s tile tapped: its page, the bird bath in 3D, its words, its buy button there, "‹ Decorations"', dp.pv && dp.pv.frames > 0 && !dp.pv.live && (fr ? /Bain d/ : /Bird bath/).test(dp.name) && dp.words.length > 10 && /800/.test(dp.btn) && (fr ? /Décorations/ : /Decorations/).test(dp.back), dp);
await shot('4_decor_page');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gprev-b .gbtn').click()); await p.waitForTimeout(1200);
const bb = await p.evaluate(() => ({ open: window.__farm.gameUI().kind || null, moving: JSON.stringify(window.__farm.deco.state()), pv: !!window.__farm.gameUI().preview, cv: document.querySelectorAll('canvas.gprev-cv').length }));
ok('…its button there does as on the tile: the shop closed to place it, its 3D let go', !bb.open && /birdbath/.test(bb.moving) && !bb.pv && bb.cv === 0, bb);
await p.evaluate(() => window.__farm.deco.cancel()); await p.waitForTimeout(400);
// the chickens: a breed's trio alive, quietly (the view never moves by itself)
await setLevel(30); await openTab('hens');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gshelf-t[data-shelf="coc"] .gprev-open').click());
await p.waitForFunction(() => { const v = window.__farm.gameUI().preview; return v && v.state().frames > 0; }, null, { timeout: 60000 }).catch(() => {});
const tr0 = await p.evaluate(() => window.__farm.gameUI().preview.state()); await p.waitForTimeout(2500);
const tr1 = await p.evaluate(() => window.__farm.gameUI().preview.state());
ok('a breed\'s tile: its trio alive (drawn on by itself), the view still', tr0.live && tr1.frames > tr0.frames && tr1.yaw === tr0.yaw && tr1.zoom === tr0.zoom && tr1.el === tr0.el, { tr0, tr1 });
await shot('4b_trio');
// the geese, Biscuit, the farmer in an outfit, the Christmas dress: each its page in 3D
for (const [k, sel, live] of [['animals', '[data-animal="geese"]', true], ['animals', '[data-animal="dog"]', true], ['outfits', '[data-outfit="rodeo"]', true], ['decor', '[data-dress="xmas"]', false]]) {
  await setLevel(30); await openTab(k);
  await p.evaluate(sel => document.querySelector('.gsheet:not([hidden]) ' + sel + ' .gprev-open').click(), sel);
  const ok3 = await p.waitForFunction(() => { const v = window.__farm.gameUI().preview; return v && v.state().frames > 0; }, null, { timeout: 60000 }).then(() => true, () => false);
  const st = await p.evaluate(() => window.__farm.gameUI().preview.state());
  ok(`${k} ${sel}: its page drawn in 3D` + (live ? ', alive' : ''), ok3 && st.parts > 0 && st.live === live, st);
}
// the Coops shelf: the season's buildings only (23 Nov 2026, Audrey: "Only the seasonal coops should be in there and when you
// click on it you should have a bigger picture ideally 3D/ 360 and some copy. Review the CTA ... get rid of the progression bar")
await setLevel(9); await openTab('coops');
const cp = await p.evaluate(() => { const g = window.__farm.game(), S = document.querySelector('.gsheet:not([hidden])'), rir = g.data.coops.find(c => g.baseOf(c.breed) === 'rir');
  const tiles = [...S.querySelectorAll('.gshopcoop')].map(c => ({ key: c.dataset.coop, img: !!c.querySelector('.gpic img'), badge: (c.querySelector('.gpic .gprev-badge') || {}).textContent || '', lock: (c.querySelector('.glock-lv') || {}).textContent || '', btns: [...c.querySelectorAll('button.gbtn')].map(b => ({ go: b.dataset.themego, t: b.textContent, coin: !!b.querySelector('.gcoin'), off: b.disabled, quiet: b.classList.contains('gshort') })) }));
  return { tiles, season: g.themesFor(rir)[0].season, ups: S.querySelectorAll('[data-up]').length, tab: (S.querySelector('.gchip[data-tab="coops"]') || {}).textContent || '', bar: [...S.querySelectorAll('.gshop-main .gbtn')].some(b => /\//.test(b.textContent)) }; });
const mine = cp.tiles[0] || {}, others = cp.tiles.slice(1);
ok('a Coops shelf (❄️ in winter): only the season\'s buildings, all nine, her own breed\'s first; no next looks there', /🏠|❄️/.test(cp.tab) && cp.tiles.length === 9 && mine.key === 'winter_rir' && cp.tiles.every(t => t.img && /^winter_/.test(t.key)) && cp.ups === 0, cp.tiles.map(t => t.key));
if (cp.season) ok('…hers: its price with the game\'s gold coin and Apple\'s price side by side; not enough coins: quiet, its price alone (no "have / price")', mine.btns.length === 2 && mine.btns[0].go === 'buy' && mine.btns[0].coin && /^15\D?000$/.test(mine.btns[0].t) && mine.btns[0].off && mine.btns[0].quiet && mine.btns[1].go === 'pay' && mine.btns[1].t === '£0.99' && !cp.bar, mine);
else ok('…out of season: when it\'s back, no button', mine.btns.length === 0 && /📅/.test(mine.lock), mine);
ok('each says its 360° view is there: "360° view" on its picture', cp.tiles.every(t => /360°/.test(t.badge) && (fr ? /Vue/ : /view/).test(t.badge)), cp.tiles.map(t => t.badge));
ok('…the breeds still to come: in colour, "🔒" and why, no button', others.length === 8 && others.every(t => /🔒/.test(t.lock) && !t.btns.length), others.map(t => [t.key, t.lock]));
await shot('5_coops');
// its own page: the building in 3D, turned round by a finger; its words; its buttons
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gshopcoop[data-coop="winter_rir"] .gcard-t').click());      // (the whole tile opens it, its name too)
await p.waitForFunction(() => { const v = window.__farm.gameUI().preview; return v && v.state().frames > 0; }, null, { timeout: 60000 }).catch(() => {});
await p.waitForTimeout(600);
const pg = await p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'), v = window.__farm.gameUI().preview, st = S.querySelector('.gprev-stage');
  return { pv: v ? v.state() : null, live: !!(st && st.classList.contains('gprev-live')), name: (S.querySelector('.gprev-n') || {}).textContent || '', words: ((S.querySelector('.gprev-l') || {}).textContent || '').length, facts: S.querySelectorAll('.gprev-f li').length, btns: [...S.querySelectorAll('.gprev-b button.gbtn')].map(b => b.dataset.themego), back: !!S.querySelector('.gshop-back'), tip: (S.querySelector('.gprev-tip') || {}).textContent || '', hand: +getComputedStyle(S.querySelector('.gprev-hand')).opacity }; });
ok('its tile tapped: its own page, the building drawn in 3D, its name, its words, what comes with it, its buttons, "Drag to turn" and a finger swiping over it', pg.pv && pg.pv.frames > 0 && pg.pv.parts > 5 && pg.live && (fr ? /Chalet des neiges/ : /Snow Chalet/).test(pg.name) && pg.words > 80 && pg.facts >= 2 && pg.back && (fr ? /Glissez/ : /Drag/).test(pg.tip) && pg.hand > 0.9 && (!cp.season || pg.btns.join() === 'buy,pay'), pg);
await shot('6_page');
// a finger dragged across it: it turns all the way round (by a finger only: never by itself)
const box = await p.evaluate(() => { const r = document.querySelector('.gsheet:not([hidden]) .gprev-cv').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
const y0 = (await p.evaluate(() => window.__farm.gameUI().preview.state())).yaw;
await p.waitForTimeout(1200); const still = (await p.evaluate(() => window.__farm.gameUI().preview.state())).yaw;
await p.mouse.move(box[0], box[1]); await p.mouse.down(); for (let k = 1; k <= 10; k++) await p.mouse.move(box[0] - 14 * k, box[1] + 2 * k); await p.mouse.up(); await p.waitForTimeout(400);
await p.waitForTimeout(500); const t1 = await p.evaluate(() => ({ ...window.__farm.gameUI().preview.state(), tip: document.querySelector('.gsheet:not([hidden]) .gprev-tip').classList.contains('gone'), hand: +getComputedStyle(document.querySelector('.gsheet:not([hidden]) .gprev-hand')).opacity }));
ok('dragged: it turns (and the "Drag to turn" and the finger go); left alone, it stays still', still === y0 && Math.abs(t1.yaw - y0) > 1 && t1.frames > pg.pv.frames && t1.tip && t1.hand < 0.05, { y0, still, t1 });
await p.evaluate(() => window.__farm.gameUI().preview.turn(400)); await shot('7_turned');
// back to the shelf: the 3D let go
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gshop-back').click()); await p.waitForTimeout(400);
const bk = await p.evaluate(() => ({ pv: !!window.__farm.gameUI().preview, tiles: document.querySelectorAll('.gsheet:not([hidden]) .gshopcoop').length, cv: document.querySelectorAll('canvas.gprev-cv').length }));
ok('‹ Coops: back to the shelf, its 3D let go', !bk.pv && bk.tiles === 9 && bk.cv === 0, bk);
// bought from its page with coins: theirs, they move in there and then, the shop closed
if (cp.season) {
  await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 20000; g.save(); }); await openTab('coops');
  await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gshopcoop[data-coop="winter_rir"] .gprev-open').click()); await p.waitForTimeout(800);
  await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gprev-b button[data-themego="buy"]').click()); await p.waitForTimeout(1500);
  const after = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops.find(x => g.baseOf(x.breed) === 'rir'); return { coins: g.data.coins, theme: c.theme, owned: g.themeOwned('winter', 'rir'), open: window.__farm.gameUI().kind || null, pv: !!window.__farm.gameUI().preview, cv: document.querySelectorAll('canvas.gprev-cv').length }; });
  ok('bought from its page: 15,000 coins, theirs, the coop in it now, the shop closed, its 3D let go', after.coins === 5000 && after.owned && after.theme === 'winter' && !after.open && !after.pv && after.cv === 0, after);
  await shot('8_bought');
  await openTab('coops');
  const own = await p.evaluate(() => { const c = document.querySelector('.gsheet:not([hidden]) .gshopcoop[data-coop="winter_rir"]'); return { s: (c.querySelector('.gpage-s') || {}).textContent || '', btns: c.querySelectorAll('button.gbtn').length }; });
  ok('…and on the shelf now: "✓ Yours", nothing to buy', /✓/.test(own.s) && own.btns === 0, own);
}
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

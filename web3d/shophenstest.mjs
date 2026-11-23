// The shop's Chickens shelf and things to come in colour (23 Nov 2026, Audrey: "the chickens to buy are not visible in the
// shop. And I don't think we should grey things not available yet in the shop as it needs a certain level. Because it can
// make people excited to progress"): ./withserver.sh node shophenstest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A level-9 farm in the app (Apple stood in for, its prices): the farm shop has a Chickens tab after Coins: the collector's
// shelf (the Buff Silkie for 🪙 5,000 or £2.99, the others in colour with "🔒 Level N", no button) and the rare Silkie trios
// (each £6.99, all four £19.99); the Buff Silkies bought there with coins: their coop to place. The Decorations, Animals and
// Outfits tabs: what's to come in colour (its picture, no dark shape), "🔒" and its level, no button. Below level 3: no
// Chickens tab. No page errors. Pictures in OUT.
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
const shot = async n => { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/hens_${n}${fr ? '_fr' : ''}.png` }).catch(() => {}); };
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
ok('its collector\'s shelf: the Buff Silkie for 🪙 5,000 or £2.99', buff && buff.btns.length === 2 && /5[,.\s  ]?000/.test(buff.btns[0]) && buff.btns[1] === '£2.99', buff);
ok('…the others in colour (not faded), "🔒" and their level, no button', rest.length === 7 && rest.every(x => !x.btns.length && /🔒/.test(x.lv) && /\d/.test(x.lv) && x.opacity === 1 && (x.filter === 'none' || !x.filter)), rest);
const rare = await p.evaluate(() => ({ tiles: [...document.querySelectorAll('.gsheet:not([hidden]) .grare-tiles .gshelf-t')].map(c => [c.dataset.rare, (c.querySelector('button') || {}).textContent || '']), all: (document.querySelector('.gsheet:not([hidden]) .giap-adopt-all') || {}).textContent || '' }));
ok('the rare Silkie trios: each £6.99, all four £19.99', rare.tiles.length === 4 && rare.tiles.every(x => x[1] === '£6.99') && /19\.99/.test(rare.all), rare);
await shot('1_chickens');
await p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden]) .gcshelf'); if (e) e.scrollIntoView(); }); await shot('1b_shelf');
await p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden]) .grare-tiles'); if (e) e.scrollIntoView(); }); await shot('2_rare');
// bought with coins from here: its coop to place
await openTab('hens');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gshelf-t[data-shelf="sil_buff"] button[data-shelfgo="coins"]').click()); await p.waitForTimeout(1500);
const s = await p.evaluate(() => { const g = window.__farm.game(); return { shelf: (g.data.shelf || []).join(), coins: g.data.coins, move: !!window.__farm.move.state().on }; });
ok('the Buff Silkies bought here with coins: 1,000 left, their coop to place', s.shelf === 'sil_buff' && s.coins === 1000 && s.move, s);
await p.evaluate(() => { const f = window.__farm; if (f.move.state().on) f.move.cancel(); });
// things to come, in colour
for (const [k, sel] of [['decor', '.gdec'], ['animals', '.gani'], ['outfits', '.gout']]) {
  await setLevel(9); await openTab(k);
  const cards = await p.evaluate(sel => [...document.querySelectorAll('.gsheet:not([hidden]) ' + sel)].filter(c => c.classList.contains('glock')).map(c => ({ img: !!c.querySelector('.gpic img'), sil: !!c.querySelector('.gsil'), lv: (c.querySelector('.glock-lv') || {}).textContent || '', btn: !!c.querySelector('button.gbtn') })), sel);
  ok(`${k}: what's to come in colour (its picture, no dark shape), "🔒" and its level, no button`, cards.length > 0 && cards.every(c => c.img && !c.sil && /🔒/.test(c.lv) && /\d/.test(c.lv) && !c.btn), cards);
  if (k === 'decor') await shot('3_decor');
}
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

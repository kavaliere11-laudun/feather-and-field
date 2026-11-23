// The app's shop for real money, the rest (14 Nov 2026, her grid; store.js, the app's plugin stood in for by
// window.__fakeStore): ./withserver.sh node store2test.mjs [OUT]
// Outside the app: no Coins shelf, no Adopt, no shelves to buy, no Restore; a save claiming the shelves or a trio gains
// nothing. In the app: the Coins shelf (four bags at Apple's prices, no advert card, no "Most popular"); a Cart bought:
// 50,000 coins once, Apple told it's done, not counted as coins earned; a receipt left open (the app closed before the
// coins came) paid once on the next opening, never twice; the Book: "Adopt this trio" at Apple's price: a rooster and two
// hens of the colour in the basket by the fire, their Pagoda free to put down (no coins taken); the four: a trio of each,
// never more than a trio of a colour; the Pantry's bigger shelves: bought, bigger, kept over a reload, gone if refunded;
// Settings: Restore purchases. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/store2test', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-12-05T11:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const jump = async ms => { await p.evaluate(ms => { window.__T = Math.round(window.__T + ms); sessionStorage.setItem('__T', window.__T); }, ms); await run(1.5); };
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/shop_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheetT = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const g = window.__farm.game(), d = g.data; return { coins: d.coins, tally: (d.tally || {}).coins || 0, txs: d.txs || [], trios: d.trios || [], gift: d.gift || [], shelves: d.shelves === true, basket: (d.basket || []).map(b => b.breed + ':' + b.sex), rare: d.birds.filter(b => /^sil_/.test(b.breed)).map(b => b.breed + ':' + b.sex), coops: d.coops.map(c => c.breed), edited: g.edited, eggsMax: g.pantry().find(r => r.k === 'eggs').max, fin: JSON.parse(sessionStorage.getItem('__fin') || '[]') }; });
const reload = async () => { await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1.2); };
const PRE = 'com.featherandfield.game.';
await ctx.addInitScript(() => {
  const get = (k, d) => { try { const v = sessionStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set = (k, v) => sessionStorage.setItem(k, JSON.stringify(v));
  const price = id => /coins\.purse$/.test(id) ? '£0.99' : /coins\.basket$/.test(id) ? '£2.99' : /coins\.sack$/.test(id) ? '£4.99' : /coins\.cart$|winter\.all$/.test(id) ? '£9.99' : /silkie\.all$/.test(id) ? '£19.99' : /silkie\./.test(id) ? '£6.99' : '£1.99';
  if (get('__shop', false)) window.__fakeStore = {
    products: async o => ({ products: o.ids.map(id => ({ id, price: price(id) })) }),
    owned: async () => ({ ids: get('__owned', []) }),
    buy: async o => { const how = get('__how', 'bought'), ids = get('__owned', []); if (how !== 'bought') return { state: how, ids };
      if (/\.coins\./.test(o.id)) { const n = get('__n', 1000) + 1; set('__n', n); const tx = { id: String(n), productId: o.id }; set('__open', [...get('__open', []), tx]); return { state: 'bought', ids, tx }; }
      ids.push(o.id); set('__owned', ids); return { state: 'bought', ids }; },
    restore: async () => ({ ids: get('__owned', []) }),
    pending: async () => ({ list: get('__open', []) }),
    finish: async o => { set('__open', get('__open', []).filter(t => t.id !== o.id)); set('__fin', [...get('__fin', []), o.id]); return {}; },
  };
});
const shop = v => p.evaluate(v => { for (const k of Object.keys(v)) sessionStorage.setItem(k, JSON.stringify(v[k])); }, v);
const btns = sel => p.evaluate(sel => [...document.querySelectorAll('.gsheet:not([hidden]) ' + sel)].map(b => b.textContent), sel);
const tapSel = sel => p.evaluate(sel => { const b = document.querySelector('.gsheet:not([hidden]) ' + sel); if (b) b.click(); return !!b; }, sel);

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(15) + 5; g.data.lvSeen = g.level; for (let i = 0; i < 4; i++) { g.data.coins = 300000; f.buyLand(); for (let k = 0; k < 120; k++) { window.__T += 33; f.step(1 / 30, 1); f.gameTick(window.__T, false); } } g.data.coins = 500; g.save(); f.gameUI().close(); });
await run(2); await close();
let s = await S(); const eggs0 = s.eggsMax;
// outside the app
await p.evaluate(() => window.__farm.deco.shop()); await run(0.3);
let tabs = await btns('.gchip');
await close(); await p.evaluate(() => window.__farm.book()); await run(0.3);
let adopt = await btns('.giap-adopt, .giap-adopt-all');
await close(); await p.evaluate(() => window.__farm.pantrySheet()); await run(0.2);
let sh = await btns('[data-shelves]');
await close(); await p.evaluate(() => window.__farm.gameUI().settings()); await run(0.2);
let rs = await btns('.giap-restore button');
ok('outside the app: no Coins shelf, no Adopt, no shelves to buy, no Restore', !tabs.some(t => /^\s*(Coins|Pièces)$/.test(t)) && adopt.length === 0 && sh.length === 0 && rs.length === 0, { tabs, adopt, sh, rs });
await p.evaluate(() => { const g = window.__farm.game(); g.data.shelves = true; g.data.trios = ['sil_paint']; g.data.gift = ['sil_paint']; g.save(); });
await reload(); s = await S();
ok('…a save claiming the shelves and a trio: no bigger shelves, no birds, no free Pagoda', !s.shelves && s.eggsMax === eggs0 && s.basket.length === 0 && s.gift.length === 0 && s.trios.length === 0, s);
// in the app: the Coins shelf
await shop({ __shop: true, __owned: [], __how: 'bought' }); await reload();
await p.evaluate(() => window.__farm.deco.shop()); await run(0.3);
tabs = await btns('.gchip'); await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .gchip')].find(c => c.dataset.tab === 'coins').click()); await run(0.3);
let bags = await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .giap[data-bag]')].map(c => c.dataset.bag + '|' + c.querySelector('.gdec-p').textContent + '|' + c.querySelector('.giap-buy').textContent));
let txt = await sheetT();
ok('in the app: the Coins shelf, four bags at Apple\'s prices (3,000 / 10,000 / 20,000 / 50,000), no advert card, no "Most popular"', tabs.some(t => /^\s*(Coins|Pièces)$/.test(t)) && bags.length === 4 && /purse\|3[,.\s  ]?000.*£0\.99/.test(bags[0]) && /basket\|10[,.\s  ]?000.*£2\.99/.test(bags[1]) && /sack\|20[,.\s  ]?000.*£4\.99/.test(bags[2]) && /cart\|50[,.\s  ]?000.*£9\.99/.test(bags[3]) && !/🎬|Most popular|Le plus choisi|Best value/.test(txt), bags);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden])').scrollTo(0, 0)); await p.waitForTimeout(400); await shoot('1_coins');
s = await S(); const c0 = s.coins, t0 = s.tally;
await tapSel('.giap[data-bag="cart"] .giap-buy'); await run(1.2); s = await S(); txt = await sheetT();
ok('a Cart bought: 50,000 coins, thanked, Apple told it\'s done, not counted as coins earned', s.coins === c0 + 50000 && s.txs.length === 1 && s.fin.length === 1 && s.tally === t0 && (fr ? /Merci/ : /Thank you/).test(txt) && !/Preview|Aperçu/.test(txt), { s, txt });
await shoot('2_thanks'); await close();
// a receipt left open (the app closed before the coins were handed over), and the same one seen again
await p.evaluate(() => { sessionStorage.setItem('__open', JSON.stringify([{ id: '7001', productId: 'com.featherandfield.game.coins.purse' }, { id: String((window.__farm.game().data.txs || [])[0]), productId: 'com.featherandfield.game.coins.cart' }, { id: 'abc', productId: 'com.featherandfield.game.coins.cart' }, { id: '7002', productId: 'com.other.coins' }])); });
await reload(); await p.waitForTimeout(4500); await run(0.5); s = await S();
ok('receipts left open: the purse paid once on the next opening (3,000), the one already paid not paid again, odd ones ignored', s.coins === c0 + 53000 && s.txs.length === 2 && s.fin.includes('7001'), s);
await reload(); await p.waitForTimeout(4500); await run(0.5); s = await S();
ok('…and not again after another opening', s.coins === c0 + 53000, s.coins);
// a trio
await p.evaluate(() => window.__farm.book()); await run(0.3);
adopt = await btns('.giap-adopt, .giap-adopt-all');
ok('the Book: "Adopt all four · £19.99" and "Adopt this trio · £6.99" on each of the four rare pages (no Red)', adopt.length === 5 && /£19\.99/.test(adopt[0]) && adopt.slice(1).every(t => /£6\.99/.test(t)), adopt);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .giap-adopt-all').scrollIntoView({ block: 'start' })); await p.waitForTimeout(500); await shoot('3_book');
const c1 = (await S()).coins;
await tapSel('.giap-adopt[data-adopt="sil_paint"]'); await run(1.5); s = await S(); txt = await sheetT();
ok('a Paint trio adopted: a rooster and two hens in the basket by the fire, their Pagoda free, thanked, no coins taken', s.trios.join() === 'sil_paint' && s.basket.sort().join() === 'sil_paint:h,sil_paint:h,sil_paint:r' && s.gift.join() === 'sil_paint' && s.coins === c1 && (fr ? /pie/ : /Paint/).test(txt), { s, txt });
await close(); await p.evaluate(() => window.__farm.coopsSheet()); await run(0.3);
let build = await btns('.grare-build');
ok('Your coops: "Put down their Pagoda (yours already)"', build.length === 1 && (fr ? /déjà à vous/ : /yours already/).test(build[0]), build);
await shoot('4_basket');
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 100; g.save(); });      // (too few for a rare coop's 2,500: free all the same)
await close(); const put = await p.evaluate(() => { const f = window.__farm; const r = f.place('sil_paint'); const st = f.move.state(); return { r, ok: st.ok, put: f.move.place() }; });
await run(2); await close(); s = await S();
ok('…put down for nothing: the Paint Pagoda on the farm with its three birds, the basket empty', put.put && s.coops.includes('sil_paint') && s.rare.filter(x => /paint/.test(x)).length === 3 && s.basket.length === 0 && s.gift.length === 0 && s.coins === 100, { put, s });
await p.evaluate(() => window.__farm.book()); await run(0.3);
await tapSel('.giap-adopt-all'); await run(1.5); s = await S();
ok('the four: a trio of each of the other three in the basket, the Paint still one trio', s.trios.length === 4 && s.basket.length === 9 && s.gift.length === 3 && s.rare.filter(x => /paint/.test(x)).length === 3, s);
await close(); await reload(); s = await S();
ok('a reload: kept, nothing given twice, not flagged', s.trios.length === 4 && s.basket.length === 9 && s.rare.filter(x => /paint/.test(x)).length === 3 && !s.edited, s);
// the Pantry's bigger shelves
await p.evaluate(() => window.__farm.pantrySheet()); await run(0.2);
sh = await btns('[data-shelves]');
ok('the Pantry: "Bigger shelves · £1.99"', sh.length === 1 && /£1\.99/.test(sh[0]), sh);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-shelves]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(500); await shoot('5_pantry');
await tapSel('[data-shelves]'); await run(1.2); s = await S();
ok('bought: the shelves half as big again', s.shelves && Math.abs(s.eggsMax - eggs0 * 1.5) <= 1, { eggs0, now: s.eggsMax });
await close(); await reload(); s = await S();
ok('a reload: kept, not flagged', s.shelves && !s.edited, s);
await p.evaluate(() => { const o = JSON.parse(sessionStorage.getItem('__owned')); sessionStorage.setItem('__owned', JSON.stringify(o.filter(x => !/pantry/.test(x)))); });
await reload(); s = await S();
ok('refunded: the shelves their own size again; the trios\' birds stay', !s.shelves && s.eggsMax === eggs0 && s.basket.length === 9, s);
await p.evaluate(() => window.__farm.gameUI().settings()); await run(0.2);
rs = await btns('.giap-restore button');
ok('Settings: "Restore purchases"', rs.length === 1 && (fr ? /Restaurer/ : /Restore purchases/).test(rs[0]), rs);
await tapSel('.giap-restore button'); await run(1); const said = await hintT();
ok('…restored: said', (fr ? /Achats restaurés/ : /Purchases restored/).test(said), said);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

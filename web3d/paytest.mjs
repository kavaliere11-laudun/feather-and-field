// The shop for real money, what the test players found (15 Nov 2026; Audrey: "All five"): ./withserver.sh node paytest.mjs [OUT]
// In the app, before level 3 (the first day's guide): no Coins shelf, no Adopt, no shelves to buy, no money button on a
// coop's card; "Restore purchases" in Settings all the same. From level 3: all there, and every money button blue. A
// winter building where its Deluxe garden doesn't fit: nothing paid, said on the card with "Move this coop", which starts
// the move. The Cart's pile of coins inside its picture. The four trios arriving: a short word, not twelve names.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/paytest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
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
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/pay_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
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
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.coins = 500; g.save(); f.gameUI().close(); });
await shop({ __shop: true, __owned: [], __how: 'bought' }); await reload();
const look = async () => {
  const o = {};
  await close(); await p.evaluate(() => window.__farm.deco.shop()); await run(0.3); o.tabs = await btns('.gchip');
  await close(); await p.evaluate(() => window.__farm.book()); await run(0.3); o.adopt = await btns('.giap-adopt, .giap-adopt-all');
  await close(); await p.evaluate(() => window.__farm.pantrySheet()); await run(0.2); o.shelves = await btns('[data-shelves]');
  await close(); await p.evaluate(() => window.__farm.coopCard(0)); await run(0.3); o.coop = await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) button[data-themego]')].map(b => b.dataset.themego));
  await close(); await p.evaluate(() => window.__farm.gameUI().settings()); await run(0.2); o.restore = await btns('.giap-restore button');
  await close(); return o;
};
let L = await p.evaluate(() => window.__farm.game().level), o = await look();
ok('level 1, in the app: no Coins shelf, no Adopt, no shelves, no money button on the coop\'s card; Restore in Settings', L === 1 && !o.tabs.some(t => /🪙/.test(t)) && o.adopt.length === 0 && o.shelves.length === 0 && !o.coop.some(g => g === 'pay' || g === 'all' || g === 'restore') && o.restore.length === 1, { L, o });
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(3) + 1; g.data.lvSeen = g.level; g.save(); });
await reload(); L = await p.evaluate(() => window.__farm.game().level); o = await look();
ok('level 3: the Coins shelf, Adopt (the four and each), the shelves, "Or have it now" and the nine', L === 3 && o.tabs.some(t => /🪙/.test(t)) && o.adopt.length === 5 && o.shelves.length === 1 && o.coop.includes('pay') && o.coop.includes('all'), { L, o });
// every money button blue
const blue = async sel => p.evaluate(sel => [...document.querySelectorAll('.gsheet:not([hidden]) ' + sel)].map(b => getComputedStyle(b).backgroundColor), sel);
await p.evaluate(() => window.__farm.deco.shop()); await run(0.3); await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .gchip')].find(c => c.dataset.tab === 'coins').click()); await run(0.3);
const cb = await blue('.giap-buy');
const pile = await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .giap[data-bag]')].map(c => { const v = c.querySelector('.giap-bag svg'); if (!v) return false; const r = v.getBoundingClientRect(); return r.width > 50 && Math.abs(r.width - r.height) < 2 && v.querySelectorAll('circle, ellipse').length > 3; }));
ok('each bag its own picture (a purse, a basket, a sack, a cart: 15 Nov 2026), square and whole', pile.length === 4 && pile.every(Boolean), pile);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .giap[data-bag="basket"]').scrollIntoView({ block: 'end' })); await shoot('1a_coins');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .giap[data-bag="cart"]').scrollIntoView({ block: 'center' })); await shoot('1_coins');
await close(); await p.evaluate(() => window.__farm.book()); await run(0.3); const ab = await blue('.giap-adopt, .giap-adopt-all');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .giap-adopt-all').scrollIntoView({ block: 'start' })); await shoot('2_book');
await close(); await p.evaluate(() => window.__farm.pantrySheet()); await run(0.2); const sb = await blue('[data-shelves]');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-shelves]').scrollIntoView({ block: 'center' })); await shoot('3_pantry');
const isBlue = c => c === 'rgb(47, 111, 181)';
ok('every money button blue: the four bags, the five Adopt, the shelves', cb.length === 4 && ab.length === 5 && sb.length === 1 && [...cb, ...ab, ...sb].every(isBlue), { cb, ab, sb });
// a winter building where its Deluxe garden doesn't fit
await close();
const fits = await p.evaluate(() => {      // (the coop moved where it fits as it is, but its Deluxe garden wouldn't)
  const f = window.__farm, g = f.game(), c = g.data.coops[0]; let tries = 0; const t0 = c.tier;
  for (let r = 0; r < 30; r += 0.5) for (let k = 0; k < Math.max(1, r * 6); k++) { const a = k / Math.max(1, r * 6) * 6.28, x = Math.round((c.x + Math.cos(a) * r) * 4) / 4, z = Math.round((c.z + Math.sin(a) * r) * 4) / 4;
    for (const deg of [90, 0, 180, 270]) { const o = { x, z, deg }, A = f.coopSpotAt(o, t0), B = f.coopSpotAt(o, 4); if (!(A && A.ok) || (B && B.ok)) continue;
      if (f.moveCoopTo(0, o)) return false; f.move.cancel(); if (++tries > 40) return true; } }
  return true;
});
await run(1); await close();
await p.evaluate(() => window.__farm.coopCard(0)); await run(0.3);
await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) button[data-themego]')].find(b => b.dataset.themego === 'pay').click()); await run(1);
let w = await p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden]) .gtheme-why'); return e ? { hidden: e.hidden, text: e.innerText, btn: !!e.querySelector('button[data-thememove]') } : null; });
let s2 = await p.evaluate(() => ({ paid: window.__farm.game().data.paid || [], owned: JSON.parse(sessionStorage.getItem('__owned') || '[]') }));
if (fits) console.log('(the first coop\'s spot fits a Deluxe garden here: the no-room card not seen)');
else {
  ok('no room for its Deluxe garden: nothing paid, said on the card with "Move this coop"', w && !w.hidden && w.btn && (fr ? /Déplacer ce poulailler/ : /Move this coop/).test(w.text) && s2.paid.length === 0 && s2.owned.length === 0, { w, s2 });
  await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gtheme-why').scrollIntoView({ block: 'center' })); await shoot('4_noroom');
  await tapSel('.gtheme-why button[data-thememove]'); await run(0.8);
  const mv = await p.evaluate(() => { const M = window.__farm.move.state(); return !!M; });
  ok('…"Move this coop": the move begins', mv, mv);
  await p.evaluate(() => window.__farm.move.cancel()); await run(0.5);
}
// the four trios: a short word
await close(); await p.evaluate(() => window.__farm.book()); await run(0.3);
await tapSel('.giap-adopt-all'); await run(1.5); const said = await hintT(); const s3 = await S();
ok('the four trios arrive: a short word (no names), twelve birds in the basket', s3.basket.length === 12 && (fr ? /Vos 4 nouveaux trios/ : /Your 4 new trios/).test(said) && said.length < 90, { said, n: s3.basket.length });
await shoot('5_trios');
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

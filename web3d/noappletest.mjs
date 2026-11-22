// The shop when Apple gives no prices (22 Nov 2026, Audrey's TestFlight shop: "The shop can't reach Apple just now"): what
// Apple answered is shown small under it, to find why: ./withserver.sh node noappletest.mjs [OUT]   (LANG=fr; W, H; PORT)
// Apple (stood in for) answers with none of the products from a French App Store: the Coins tab says the shop can't reach
// Apple, "Try again", and "Apple: 0 / N · FRA". Apple failing: "Apple: products: …". Apple silent: "waiting for an answer…",
// then after 20 seconds "no answer in 20 s". No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/noappletest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000);
await ctx.addInitScript(() => {
  const how = sessionStorage.getItem('__how') || 'none';
  window.__fakeStore = {
    products: async o => { if (how === 'fail') throw new Error('products: StoreKitError.networkError · FRA'); if (how === 'hang') return new Promise(() => {}); return { products: [], store: 'FRA', asked: o.ids.length }; },
    owned: async () => ({ ids: [] }), buy: async () => ({ state: 'failed', ids: [] }), restore: async () => ({ ids: [] }), pending: async () => ({ list: [] }), finish: async () => ({}),
  };
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.draw(); }); await p.waitForTimeout(1500); };
const card = () => p.evaluate(() => { const c = document.querySelector('.gsheet:not([hidden]) .giap-off'); return c ? { text: c.innerText, diag: (c.querySelector('.giap-diag') || {}).textContent || null } : null; });
const openShop = async () => { await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.deco.shop(); }); await p.waitForTimeout(400);
  await p.evaluate(() => { const t = [...document.querySelectorAll('.gsheet:not([hidden]) .gchip')].find(x => /Coins|Pièces/.test(x.textContent)); if (t) t.click(); }); await p.waitForTimeout(400); };

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(5) + 5; g.data.lvSeen = 5; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await openShop(); let c = await card();
ok('Apple gives none of the products: the shop says it can\'t reach Apple, and "Apple: 0 / N · FRA" under it', c && (fr ? /joindre Apple/ : /reach Apple/).test(c.text) && /^Apple: 0 \/ \d+ · FRA$/.test(c.diag || ''), c);
await p.screenshot({ path: `${OUT}/noapple${fr ? '_fr' : ''}.png` }).catch(() => {});
await p.evaluate(() => sessionStorage.setItem('__how', 'fail')); await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await openShop(); c = await card();
ok('Apple doesn\'t answer: what it said, under it', c && /^Apple: products: StoreKitError\.networkError · FRA$/.test(c.diag || ''), c);
await p.evaluate(() => sessionStorage.setItem('__how', 'hang')); await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await openShop(); c = await card();
ok('Apple not answering: "waiting for an answer…" at first', c && /^Apple: waiting for an answer…$/.test(c.diag || ''), c);
await p.waitForTimeout(21000); await openShop(); c = await card();
ok('…then, after 20 seconds, "no answer in 20 s"', c && /^Apple: no answer in 20 s$/.test(c.diag || ''), c);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

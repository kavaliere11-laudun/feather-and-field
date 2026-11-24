// Every button in the game side by side (24 Nov 2026, Audrey: "Can you check the consistency of the CTa design and colours
// please"): ./withserver.sh node ctaaudit.mjs OUT   (LANG=fr; W, H: the screen (sideways 874 x 402); PORT)
// A farm at level 30, sideways, the app's shop stood in for (so the money buttons show), opened card by card: the farm's own
// buttons, then each card the game has, once with plenty of coins and once short of coins. For each visible button: its
// words, the card it's on, its look (fill, words' colour, outline, corners, size of its words, weight, height) and a
// picture of it (OUT/b/NNN.png). Writes OUT/buttons.json, then OUT/sheet.html and OUT/sheet.png: the buttons grouped by
// look, each look with how many there are, where, and a few of them as they are drawn.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/ctaaudit', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT + '/b', { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000);
await ctx.addInitScript(() => {
  const price = id => /coins\.purse$/.test(id) ? '£0.99' : /coins\.basket$/.test(id) ? '£2.99' : /coins\.sack$/.test(id) ? '£4.99' : /coins\.cart$|winter\.all$/.test(id) ? '£9.99' : /silkie\.all$/.test(id) ? '£19.99' : /silkie\./.test(id) ? '£6.99' : /shelf\.(buff|partridge)$/.test(id) ? '£2.99' : /shelf\.pol_silver$/.test(id) ? '£4.99' : /shelf\./.test(id) ? '£3.99' : '£1.99';
  window.__fakeStore = { products: async o => ({ products: o.ids.map(id => ({ id, price: price(id) })), asked: o.ids.length }), owned: async () => ({ ids: [] }), buy: async () => ({ state: 'cancelled', ids: [] }),
    restore: async () => ({ ids: [] }), pending: async () => ({ list: [] }), finish: async () => ({}), hello: async () => ({ v: 1 }), storefront: async () => ({ store: 'GBR' }) };
});
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.draw(); }); await p.waitForTimeout(1200); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
const all = [];
// the buttons in view now: inside the open card, or the farm's own when none is open
const grab = async (where, scope) => {
  const list = await p.evaluate(([scope]) => {
    document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* (an endless one: left as it is) */ } });
    const root = scope === 'farm' ? document.body : document.querySelector('.gsheet:not([hidden])');
    if (!root) return [];
    const vis = e => { if (!e.getClientRects().length) return false; for (let x = e; x && x !== document.body; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; } return true; };
    const els = [...root.querySelectorAll('button, [role="button"], a.gbtn')].filter(e => vis(e) && (scope !== 'farm' || !e.closest('.gsheet')));
    let i = 0; const out = [];
    for (const e of els) {
      const c = getComputedStyle(e), r = e.getBoundingClientRect(); if (r.width < 6 || r.height < 6) continue;
      e.dataset.cta = String(i);
      const words = (e.innerText || e.getAttribute('aria-label') || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      out.push({ i: i++, words, cls: e.className && typeof e.className === 'string' ? e.className : '', dis: !!e.disabled, bg: c.backgroundColor, img: c.backgroundImage !== 'none' ? c.backgroundImage.slice(0, 80) : '', color: c.color,
        border: c.borderTopWidth !== '0px' && c.borderTopStyle !== 'none' ? c.borderTopWidth + ' ' + c.borderTopColor : '', shadow: c.boxShadow === 'none' ? '' : c.boxShadow, rad: parseFloat(c.borderTopLeftRadius) || 0,
        fs: parseFloat(c.fontSize), fw: c.fontWeight, ff: c.fontFamily.split(',')[0].replace(/"/g, ''), h: Math.round(r.height), w: Math.round(r.width), op: +c.opacity, pad: c.paddingTop + ' ' + c.paddingLeft });
    }
    return out;
  }, [scope]);
  for (const x of list) {
    const n = all.length, file = `b/${String(n).padStart(3, '0')}.png`;
    try { await p.locator(`[data-cta="${x.i}"]`).first().screenshot({ path: `${OUT}/${file}`, timeout: 4000, animations: 'disabled' }); x.pic = file; } catch (e) { x.pic = ''; }
    all.push({ ...x, where });
  }
  await p.evaluate(() => document.querySelectorAll('[data-cta]').forEach(e => delete e.dataset.cta));
  console.log(`${where}: ${list.length} buttons`);
};
// the welcome's own button first, then into the farm
await grab('welcome', 'card');
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
const setup = coins => p.evaluate(([coins]) => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(30) + 5; g.data.lvSeen = 30; g.data.coins = coins; g.save(); }, [coins]);
await setup(999999); await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen || u.kind) u.close(); });
await p.waitForTimeout(500);
await grab('the farm (side buttons)', 'farm');
const G = 'window.__farm.game()', U = 'window.__farm.gameUI()', F = 'window.__farm';
const cards = [
  ['hen', `${U}.birdCard(${G}.data.birds.find(x => x.sex === 'h'))`],
  ['coop', `${U}.coopCard(${G}.data.coops[0], () => {}, () => {})`],
  ['feeder', `${U}.feederSheet(${G}.data.coops[0], () => {}, () => {})`],
  ['land', `${U}.landCard(3, () => {})`],
  ['level', `${U}.levelSheet()`],
  ['level up', `${U}.levelUpCard(12, null, () => {}, [], null)`],
  ['your coops', `${U}.coopsSheet({})`],
  ['book', `${U}.bookSheet({})`],
  ['shows', `${U}.showsSheet({})`],
  ['show day', `${U}.showDayCard('Harvest Fair', () => {}, () => {})`],
  ['jobs', `${U}.jobsSheet({})`],
  ['orders', `${U}.ordersSheet({})`],
  ['pantry', `${U}.pantrySheet({})`],
  ['shop: coins', `(() => { ${F}.deco.shop(); const t = document.querySelector('.gsheet:not([hidden]) .gchip[data-tab="coins"]'); if (t) t.click(); })()`],
  ['shop: chickens', `(() => { ${F}.deco.shop(); const t = document.querySelector('.gsheet:not([hidden]) .gchip[data-tab="hens"]'); if (t) t.click(); })()`],
  ['shop: seasonal coops', `(() => { ${F}.deco.shop(); const t = document.querySelector('.gsheet:not([hidden]) .gchip[data-tab="coops"]'); if (t) t.click(); })()`],
  ['shop: decorations', `(() => { ${F}.deco.shop(); const t = document.querySelector('.gsheet:not([hidden]) .gchip[data-tab="decor"]'); if (t) t.click(); })()`],
  ['shop: animals', `(() => { ${F}.deco.shop(); const t = document.querySelector('.gsheet:not([hidden]) .gchip[data-tab="animals"]'); if (t) t.click(); })()`],
  ['shop: outfits', `(() => { ${F}.deco.shop(); const t = document.querySelector('.gsheet:not([hidden]) .gchip[data-tab="outfits"]'); if (t) t.click(); })()`],
  ['shop: a 360 page', `(() => { ${F}.deco.shop(); const t = document.querySelector('.gsheet:not([hidden]) .gchip[data-tab="decor"]'); if (t) t.click(); const v = document.querySelector('.gsheet:not([hidden]) .gviewable .gpic'); if (v) v.click(); })()`],
  ['wheat', `${U}.wheatSheet({})`],
  ['garden', `(() => { const g = ${G}, G2 = g.garden(), now = window.__T || Date.now(); G2.beds[0] = { crop: 'carrot', ripe: now - 1000 }; G2.beds[1] = { crop: 'straw', ripe: now + 2 * 3600e3 }; G2.beds[2] = { crop: null, ripe: 0 }; ${U}.gardenSheet({}); })()`],
  ['a bed', `${U}.gardenSheet({}, { only: 2 })`],
  ['treat', `${U}.treatSheet(${G}.data.coops[0].id, {})`],
  ['decoration', `${U}.decorCard('beehives', () => {})`],
  ['dock', `${U}.dockCard({ water: 'pond' }, {})`],
  ['fish', `${U}.fishCard({ id: 'big_bertha', cm: 84, water: 'river', rare: 1, legend: false, first: true, best: false, coins: 160, xp: 40, n: 1 }, () => {})`],
  ['fox', `(() => { const g = ${G}; ${U}.foxCard({ key: '20261105', coop: g.data.coops[0].id, t: Date.now() - 6e6, by: 'brave', open: true, eggs: 0 }, { watch() {} }); })()`],
  ['rare chick', `(() => { const g = ${G}; ${U}.rareCard({ id: 'r1', coop: g.data.coops[0].id, line: 'sil_blue', sex: 'h', stars: 4 }); })()`],
  ['congrats', `(() => { const g = ${G}, h = g.data.birds.find(x => x.sex === 'h'), r = g.data.birds.find(x => x.sex === 'r'); ${U}.congratsCard({ hen: h.id, dad: r.id, coop: g.data.coops[0].id, coins: 240, xp: 46, kids: [{ sex: 'h', stars: 3, coins: 80 }, { sex: 'r', stars: 2, coins: 70 }] }, true); })()`],
  ['away', `(() => { const g = ${G}; ${U}.awayCard({ away: 2 * 86400e3, paused: true, eggs: 14, items: [{ k: 'eggs', n: 14 }, { k: 'honey', n: 4 }] }, { collectAll() {} }); })()`],
  ['geese', `${U}.geeseCard({ trust: 3, day: 2 }, {})`],
  ['upgraded coop', `${U}.upgradedCard(${G}.data.coops[0], ['swing'], () => {})`],
  ['visitor', `(() => { ${F}.visitor && ${F}.visitor.come ? ${F}.visitor.come() : null; })()`],
  ['account', `${U}.accountCard()`],
  ['two farms', `${U}.twoFarms({ name: 'Rosie', look: 'f', lv: 12, coins: 12345, seen: Date.now() - 3600e3 }, { name: 'Arthur', look: 'm', lv: 9, coins: 4321, at: Date.now() - 86400e3, seen: Date.now() - 86400e3 })`],
  ['account ask', `${U}.accountNudge()`],
  ['reminders ask', `${U}.notesAsk()`],
  ['settings', `${U}.settings()`],
];
const run = async (tag) => {
  for (const [name, js] of cards) {
    await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen || u.kind) u.close(); });
    const err = await p.evaluate(`void (${js})`).then(() => null).catch(e => e.message.split('\n')[0]);
    if (err) { console.log(`${name}: error opening it: ${err}`); continue; }
    await p.waitForTimeout(400); await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* (an endless one: left as it is) */ } })); await p.waitForTimeout(150);
    await grab(tag + name, 'card');
  }
};
await run('');
// short of coins: the same cards' buy buttons as they are then
await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen || u.kind) u.close(); });
await setup(40); await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen || u.kind) u.close(); });
cards.splice(0, cards.length, ...cards.filter(([n]) => /coop|land|shop|bed|treat|dock|feeder|garden/.test(n) && !/upgraded|your coops/.test(n)));
await run('short of coins · ');
// the grooming game (its own screen, not a card)
await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen || u.kind) u.close(); });
fs.writeFileSync(`${OUT}/buttons.json`, JSON.stringify(all, null, 1));
// grouped by look
const hex = c => { const m = c.match(/[\d.]+/g); if (!m) return c; const [r, g, bb, a] = m.map(Number); if (a === 0) return 'none'; return '#' + [r, g, bb].map(v => Math.round(v).toString(16).padStart(2, '0')).join('') + (a !== undefined && a < 1 ? ` @${a}` : ''); };
const outline = x => { const s = x.shadow.match(/inset[^,]*/); const sh = x.shadow && /inset/.test(x.shadow) ? 'inset ' + hex((x.shadow.match(/rgba?\([^)]*\)/) || [''])[0]) : ''; return [x.border && x.border.replace(/rgba?\([^)]*\)/, m => hex(m)), sh].filter(Boolean).join(' ') || '—'; };
const look = x => `${x.img ? 'gradient' : hex(x.bg)} | words ${hex(x.color)} | outline ${outline(x)}${x.op < 1 ? ' | faded ' + x.op : ''}`;
const groups = new Map();
for (const x of all) { const k = look(x); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
const sorted = [...groups.entries()].sort((a, c) => c[1].length - a[1].length);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
let html = `<!doctype html><meta charset="utf-8"><style>body{font:14px/1.35 system-ui,sans-serif;margin:16px;background:#f4f1e8;color:#1e3426;width:1100px}h2{font-size:15px;margin:18px 0 6px}.g{background:#fff;border-radius:12px;padding:10px 12px;margin:0 0 10px}.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.row img{height:44px;border-radius:4px;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/10px 10px}.m{color:#5f6f5c;font-size:12.5px;margin:4px 0}.sw{display:inline-block;width:14px;height:14px;border-radius:3px;vertical-align:-2px;border:1px solid #0002;margin-right:4px}</style><h1 style="font-size:18px">Every button: ${all.length} seen, ${sorted.length} looks</h1>`;
for (const [k, list] of sorted) {
  const sizes = [...new Set(list.map(x => `${x.fs}px/${x.fw}${x.rad >= x.h / 2 - 1 ? ' pill' : ' r' + x.rad} h${x.h}`))];
  const where = [...new Set(list.map(x => x.where))];
  const pics = []; const seenW = new Set(); for (const x of list) { const key = x.words + x.h; if (seenW.has(key) || !x.pic) continue; seenW.add(key); pics.push(x); if (pics.length >= 10) break; }
  const bgc = list[0].img ? '#ccc' : list[0].bg;
  html += `<div class="g"><h2><span class="sw" style="background:${bgc}"></span>${esc(k)} · ${list.length}</h2><div class="m">sizes: ${esc(sizes.slice(0, 8).join(' · '))}${sizes.length > 8 ? ' …' : ''}</div><div class="m">on: ${esc(where.slice(0, 14).join(', '))}${where.length > 14 ? ' …' : ''}</div><div class="row">${pics.map(x => `<img src="${x.pic}" title="${esc(x.words)}">`).join('')}</div></div>`;
}
fs.writeFileSync(`${OUT}/sheet.html`, html);
const q = await ctx.newPage(); await q.setViewportSize({ width: 1140, height: 800 });
await q.goto('file://' + OUT + '/sheet.html'); await q.waitForTimeout(400);
await q.screenshot({ path: `${OUT}/sheet.png`, fullPage: true });
console.log(`buttons ${all.length}, looks ${sorted.length}; page errors: ${JSON.stringify(errs.slice(0, 5))}`);
for (const [k, list] of sorted) console.log(`${list.length}\t${k}\t${[...new Set(list.map(x => x.where.replace(/^short of coins · /, '¢ ')))].slice(0, 8).join(', ')}`);
await b.close();

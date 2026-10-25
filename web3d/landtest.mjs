// The game, release 1 step 5 (levels and land): node landtest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402)
// A fresh farm on a fake clock: level 1, the home field yours, the rest wild meadow fenced off (its long grass), nothing
// for sale, the level card says what level 2 brings, a tap on the meadow says when it's for sale; XP to level 2: its card
// (once), the next field for sale (its sign and bubble); not enough coins: can't buy; bought: the coins paid, the field
// yours (its long grass cut, the fence moved out, the farmer can walk there), nothing more for sale till the next level;
// level 4 at once: one card, the next field for sale at its price; a reload keeps it all; a save changed outside the game
// is checked (fields only in order, at most one a level; the level card's mark); a farm from before this step owes no card.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-24T11:00:00+01:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } f.draw(); }, secs);
const state = () => p.evaluate(() => {
  const f = window.__farm, g = f.game(), B = document.querySelector('.gbub.gsale');
  const L = f.land();
  return { level: g.level, coins: g.data.coins, land: g.data.land.join(), owned: L.owned, sale: L.sale, fence: L.fence, grass: L.grass, card: f.gameUI().kind, lvSeen: g.data.lvSeen,
    bub: B && !B.hidden ? B.textContent : null, bar: document.querySelector('.glvl .gnum').textContent, edited: g.edited };
});
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1700); await run(0.5);
};
const cardText = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
let s = await state();
ok('a new farm: level 1, the home field yours, the wild meadow fenced off with its long grass, nothing for sale, no level card', s.level === 1 && s.land === '0' && s.owned === 1 && s.sale === -1 && s.fence > 100 && s.grass > 1000 && !s.card, s);
const wildTap = await p.evaluate(() => { const f = window.__farm, F = f.fields().fields[5], c = F.mid; f.lookAt(c[0], c[1]); f.draw(); const v = new f.THREE.Vector3(c[0], 0, c[1]).project(f.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, at: f.fieldAt(c[0], c[1]) }; });
await p.touchscreen.tap(wildTap.x, wildTap.y); await run(0.2);
const tagT = await p.evaluate(() => document.getElementById('tag').textContent);
ok('a tap on the wild meadow: when it comes up for sale', /(Wild meadow|Pré sauvage) · (for sale at level|à vendre au niveau) 6/.test(tagT), { wildTap, tagT });
await p.evaluate(() => window.__farm.gameUI().levelSheet()); await run(0.2);
let t = await cardText();
ok('the level card: what level 2 brings (a new field)', /level 2: a new field|niveau 2 : un nouveau terrain/i.test(t) && /1 field|terrain : 1/.test(t), t);
await p.evaluate(() => window.__farm.gameUI().close());
// level 2
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 70; g.save(); });
await run(1.5);
s = await state(); t = await cardText();
ok('level 2: its card (the level, the patch for sale at 100 coins), the top bar says 2', s.card === 'levelup' && s.bar === '2' && /Level 2!|Niveau 2 !/.test(t) && /100/.test(t), { s, t });
const look = () => p.evaluate(() => { const f = window.__farm, a = f.land().at; f.lookAt(a[0], a[1]); f.draw(); });
await look(); await run(0.1); s = await state();
const sign = await p.evaluate(() => window.__farm.saleSign().length);
ok('the next field in order for sale: its sign (and stakes), and its bubble over it in view', s.sale === 1 && sign >= 3 && /(For sale|À vendre) · 100/.test(s.bub || ''), { s, sign });
await p.tap('.gsheet .gx');
await run(0.5);
s = await state();
ok('the card closed: seen, not shown again', !s.card && s.lvSeen === 2, s);
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await state();
ok('a reload: no level card again, the sign still up', !s.card && s.sale === 1 && !s.edited, s);
// not enough coins
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 50; g.save(); window.__farm.gameUI().refresh(); window.__farm.landCard(); });
await run(0.2);
const broke = await p.evaluate(() => ({ text: document.querySelector('.gsheet').innerText, disabled: document.querySelector('.gsheet .gbtn').disabled, r: window.__farm.buyLand() }));
s = await state();
ok('not enough coins: its card says so, the button off, nothing bought', broke.disabled && /Not enough coins|Pas encore assez/.test(broke.text) && broke.r && broke.r.broke && s.coins === 50 && s.land === '0', { broke, s });
await p.evaluate(() => window.__farm.gameUI().close());
// bought
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 150; g.save(); window.__farm.gameUI().refresh(); });
await p.evaluate(() => document.querySelector('.gbub.gsale').click()); await run(0.2);
t = await cardText();
ok('its bubble opens its card: buy for 100 coins', /Buy for 100|Acheter pour 100/.test(t), t);
const before = s, inside1 = await p.evaluate(() => { const f = window.__farm, F = f.fields().fields[1]; return F.mid; });
const reach0 = await p.evaluate(m => window.__farm.farmerCanReach(m[0], m[1]), inside1), wild0 = await p.evaluate(() => window.__farm.wildIn(1));
await p.tap('.gsheet .gbtn'); await run(1.2);
s = await state();
const reach1 = await p.evaluate(m => window.__farm.farmerCanReach(m[0], m[1]), inside1), wild1 = await p.evaluate(() => window.__farm.wildIn(1));
ok('bought: 100 coins paid, the field yours (its long grass cut, the fence moved out, the farmer can walk there), nothing more for sale at level 2', s.coins === 50 && s.land === '0,1' && s.owned === 2 && s.sale === -1 && s.bub === null && !s.card && wild0 > 50 && wild1 === 0 && s.fence !== before.fence && !reach0 && reach1, { s, wild0, wild1, reach0, reach1 });
// level 4 at once: one card, the next patch for sale
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 620; g.save(); });
await run(1.5);
s = await state(); t = await cardText();
await look(); await run(0.1); s = await state();
ok('level 4 at once: one card (level 4), the next field in order for sale at 120', s.card === 'levelup' && /Level 4!|Niveau 4 !/.test(t) && /120/.test(t) && s.sale === 2 && /120/.test(s.bub || ''), { s, t });
await p.evaluate(() => window.__farm.gameUI().close()); await run(1.5);
s = await state();
ok('closed: no card for level 3 after it', !s.card && s.lvSeen === 4, s);
// a reload keeps it all
const keep = () => p.evaluate(() => { const g = window.__farm.game(); return JSON.stringify({ c: g.data.coins, x: g.data.xp, l: g.data.land, s: g.data.lvSeen }); });
const saved = await keep();
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await state();
ok('a reload: the same land and level, the sign where it was, not flagged', (await keep()) === saved && s.sale === 2 && s.owned === 2 && !s.edited && !s.card, s);
// a save changed outside the game
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = 70; raw.d.land = [0, 7, 9, 12]; raw.d.lvSeen = 9; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const tm = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, land: g.data.land.join(), lvSeen: g.data.lvSeen, owned: window.__farm.land().owned }; });
ok('a save changed outside: fields only in order and one a level (0,1 at level 2), the card mark at most the level, flagged', tm.edited && tm.land === '0,1' && tm.lvSeen === 2 && tm.owned === 2, tm);
// a farm from before this step (no card mark): no card owed
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = 300; raw.d.land = [0]; delete raw.d.lvSeen; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await state();
ok('a farm from before levels and land (level 3): no card owed, the next field for sale', !s.card && s.level === 3 && s.lvSeen === 3 && s.sale === 1, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

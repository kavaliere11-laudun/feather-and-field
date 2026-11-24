// The Golden Egg Fountain (24 Nov 2026, Audrey: "Grand decorations (Recommended)", then "Yes, put it in (Recommended)"):
// node fountaintest.mjs   (LANG=fr; W, H: the screen, sideways 874x402 by default; SHOTS=folder for pictures)
// At level 40 its tile is in the shop greyed, "Comes at level 41"; at level 41 with 50,000 coins: its picture, 40,000 and
// its button; its page in 3D (the water moving: drawn on by itself, the view still). Bought and put down: 40,000 coins and
// +800 XP, on the farm with its water (the still water and the falling water, moving), in everyone's way; by day little
// birds come to drink at its rim, and drops jump where the water falls in. A reload: still there. A save that has it
// before its level is flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/fountain_${fr ? 'fr' : 'en'}_${name}.png`, timeout: 180000 }); } };
const money = () => p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, xp: g.data.xp, decor: JSON.parse(JSON.stringify(g.data.decor || [])) }; });
const setLevel = (L, coins) => p.evaluate(([L, coins]) => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(L) + 5; g.data.lvSeen = L; g.data.coins = coins; g.save(); }, [L, coins]);
const openTab = async k => { await p.evaluate(k => { const f = window.__farm; f.gameUI().close(); f.deco.shop(); const t = document.querySelector(`.gsheet:not([hidden]) .gchip[data-tab="${k}"]`); if (t) t.click(); }, k); await p.waitForTimeout(500); };
const tile = () => p.evaluate(() => { const c = document.querySelector('.gsheet:not([hidden]) .gpage[data-decor="fountain"]'); if (!c) return null; const im = c.querySelector('img');
  return { text: c.innerText.replace(/\s+/g, ' '), btn: !!c.querySelector('.gbtn:not([disabled])'), pic: !!(im && im.complete && im.naturalWidth > 0) }; });

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => window.__farm.gameUI().close());
// level 40: greyed, its level
await setLevel(40, 50000); await openTab('decor');
await p.waitForFunction(() => { const i = document.querySelector('.gpage[data-decor="fountain"] img'); return i && i.complete; }, null, { timeout: 30000 }).catch(() => {});
let t = await tile();
ok('level 40: the Golden Egg Fountain on the decorations shelf, its picture, "level 41", no button', t && (fr ? /Fontaine à l’œuf d’or/ : /Golden Egg Fountain/).test(t.text) && /41/.test(t.text) && !t.btn && t.pic, t);
// level 41: its price and button; its page in 3D
await setLevel(41, 50000); await openTab('decor');
await p.waitForFunction(() => { const i = document.querySelector('.gpage[data-decor="fountain"] img'); return i && i.complete; }, null, { timeout: 30000 }).catch(() => {});
t = await tile();
ok('level 41: its price, 40,000, and its button', t && /40\D?000/.test(t.text) && t.btn && t.pic, t);
await shot('1_shelf');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gpage[data-decor="fountain"] .gcard-t').click());
await p.waitForFunction(() => { const v = window.__farm.gameUI().preview; return v && v.state().frames > 2; }, null, { timeout: 90000 }).catch(() => {});
const pv0 = await p.evaluate(() => { const v = window.__farm.gameUI().preview; return v ? v.state() : null; });
await p.waitForTimeout(2500);
const pg = await p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'), v = window.__farm.gameUI().preview; return { pv: v ? v.state() : null, name: (S.querySelector('.gprev-n') || {}).textContent || '', words: (S.querySelector('.gprev-l') || {}).textContent || '', btn: (S.querySelector('.gprev-b .gbtn') || {}).textContent || '' }; });
ok('its page: in 3D with its water (drawn on by itself, the view still), its name, its words, its button', pv0 && pg.pv && pg.pv.live && pg.pv.frames > pv0.frames && pg.pv.yaw === pv0.yaw && pg.pv.zoom === pv0.zoom
  && (fr ? /Fontaine/ : /Fountain/).test(pg.name) && (fr ? /boire/ : /drink/).test(pg.words) && /40\D?000/.test(pg.btn), { pv0, pg });
await shot('2_page');
// bought and put down
const m0 = await money();
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gprev-b .gbtn').click()); await run(0.5);
let s = await p.evaluate(() => window.__farm.deco.state());
ok('Buy and place: the fountain near the view to put down, nothing paid yet', s.on === 'fountain' && (await money()).coins === m0.coins, s);
if (!s.ok) { const f = await p.evaluate(() => { const f = window.__farm, v = f.view.target; return f.deco.free('fountain', v.x, v.z); }); if (f) await p.evaluate(([x, z]) => window.__farm.deco.to(x, z), [f.x, f.z]); await run(0.3); }
await p.evaluate(() => document.querySelector('.gmove-go').click()); await run(1.5);
const m = await money(), at = m.decor.find(d => d.id === 'fountain');
const water = await p.evaluate(() => window.__farm.deco.fountainWater());
const blocked = at && await p.evaluate(([x, z]) => window.__farm.deco.blocked(x, z), [at.x, at.z]);
ok('Put it here: 40,000 coins and +800 XP, on the farm with its water (still and falling), in everyone\'s way',
  m.coins === m0.coins - 40000 && m.xp === m0.xp + 800 && at && water.includes('fountain_pool') && water.includes('fountain_fall') && blocked, { m: { coins: m.coins, xp: m.xp, c0: m0.coins, x0: m0.xp }, at, water, blocked });
// the water moving, the birds coming to drink, drops where it falls in (11 in the morning)
await p.evaluate(([x, z]) => window.__farm.focus(x, z, 2.4), [at.x, at.z]);
const ft0 = await p.evaluate(() => window.__farm.deco.fountainT()); await p.waitForTimeout(300); await run(0.2);
const ft1 = await p.evaluate(() => window.__farm.deco.fountainT());
let seen = { birds: 0, drops: 0 };
for (let k = 0; k < 16 && !(seen.birds && seen.drops); k++) {
  await run(3);
  const L = await p.evaluate(() => window.__farm.deco.life());
  if (L && L.fountain && L.fountain.some(x => x === 'rim')) seen.birds++;
  if (L && L.drops > 0) seen.drops++;
  if (k === 6) await shot('3_farm');
}
ok('its water moving; by day little birds come to drink at its rim; drops jump where the water falls in', ft1 > ft0 && seen.birds > 0 && seen.drops > 0, { ft0, ft1, seen });
await shot('4_birds');
// a reload: still there
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const after = await p.evaluate(() => ({ items: window.__farm.deco.items().filter(i => i.id === 'fountain'), water: window.__farm.deco.fountainWater(), flag: window.__farm.game().edited }));
ok('a reload: the fountain where it was, with its water, nothing flagged', after.items.length === 1 && after.items[0].at[0] === at.x && after.items[0].at[1] === at.z && after.water.length === 2 && !after.flag, after);
// a save that has it before its level: checked
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d; d.xp = window.__farm.xpFor(30) + 5; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const chk = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, has: g.data.decor.some(x => x.id === 'fountain'), items: window.__farm.deco.items().filter(i => i.id === 'fountain').length }; });
ok('a save changed outside to have it before its level: checked and flagged, not kept', chk.edited && !chk.has && !chk.items, chk);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);

// A decoration in a coop's way hops aside (24 Nov 2026, the test players: a decoration put down where a coop's next look
// would grow kept it from growing, "move the coop first"; Audrey: "Decoration hops aside (Recommended)"):
// ./withserver.sh node dechoptest.mjs [SHOTS]   (LANG=fr; W, H: the screen (sideways 874 x 402); PORT)
// A farm at level 12, its Red Barn at its Cosy look; the bird bath put down (the game's own way: bought, moved there, put
// down) where the Deluxe garden will go. Its next look from its card: it grows there and then; the bird bath hops, in
// sight, to the nearest free spot (clear of the coop's Deluxe garden), the word says so, the save has it there; a reload
// keeps it all, unflagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const SHOTS = process.argv[2] || '', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: SHOTS ? 2 : 1 });
ctx.setDefaultTimeout(120000);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.draw(); }); await p.waitForTimeout(800); };
const run = secs => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) f.step(1 / 30, 1); f.draw(); }, secs);
const shot = async n => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/dechop_${n}${fr ? '_fr' : ''}.png` }); } };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])'); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(12) + 5; g.data.lvSeen = 12; g.data.coins = 99999; g.data.land = Array.from({ length: 12 }, (_, i) => i); g.data.coops[0].tier = 3; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); });
// the bird bath put down where the Red Barn's Deluxe garden will go: the first spot round it that's allowed and in its way
const put = await p.evaluate(() => {
  const f = window.__farm, c = f.game().data.coops[0];
  for (const r of [3.2, 3.8, 4.4]) for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
    if (!f.game().decorOwned('birdbath')) f.deco.buy('birdbath'); else f.deco.start('birdbath');
    f.deco.to(x, z); const st = f.deco.state();
    if (!st.ok) { f.deco.cancel(); continue; }
    f.deco.place(); const up = f.upSpot(0);
    if (up && !up.ok) { const d = f.game().decorOwned('birdbath'); return { at: [d.x, d.z], why: up.why }; }
  }
  return null;
});
ok('the bird bath put down where the Red Barn\'s Deluxe garden will go (allowed, and in its way)', !!put && put.why === 'move_room', put);
await run(0.5); await shot('1_before');
const c0 = await p.evaluate(() => window.__farm.game().data.coins);
await p.evaluate(() => window.__farm.coopCard(0)); await run(0.4);
const clicked = await p.evaluate(() => { const b = document.querySelector('.gsheet .gup .gbtn:not(.galt)'); if (!b) return false; b.click(); return true; });
await run(0.6); await shot('2_hop');
const mid = await p.evaluate(() => { const f = window.__farm, g = f.game(), d = g.decorOwned('birdbath'), c = g.data.coops[0]; return { tier: c.tier, at: [d.x, d.z], hint: f.deco.said().join(' | ') }; });      // (the word showing and those waiting their turn)
await run(2.5); await shot('3_after');
const s = await p.evaluate(() => { const f = window.__farm, g = f.game(), d = g.decorOwned('birdbath'), c = g.data.coops[0];
  return { tier: c.tier, coins: g.data.coins, at: [d.x, d.z], spot: f.deco.spotOf ? null : null, ok: f.upSpot(0) === null }; });
const T = fr ? /Bain d’oiseaux : un peu plus loin, pour faire de la place/ : /Bird bath: hopped aside to make room/;
ok('its Deluxe look from its card: grown there and then, paid', clicked && s.tier === 4 && s.coins < c0, { clicked, s, c0 });
ok('the bird bath hopped to another spot, the word says so', put && (s.at[0] !== put.at[0] || s.at[1] !== put.at[1]) && T.test(mid.hint), { put, s, hint: mid.hint });
// its new spot: clear of the coop's Deluxe garden (nothing of it in the coop's way at the top look)
const clear = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0], d = g.decorOwned('birdbath'); return f.deco.inWay ? f.deco.inWay(0) : null; });
ok('its new spot clear of the coop\'s Deluxe garden', clear === null || (Array.isArray(clear) && !clear.length), clear);
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const r = await p.evaluate(() => { const g = window.__farm.game(), d = g.decorOwned('birdbath'); return { tier: g.data.coops[0].tier, at: [d.x, d.z], edited: g.edited }; });
ok('a reload keeps it all, unflagged', r.tier === 4 && r.at[0] === s.at[0] && r.at[1] === s.at[1] && !r.edited, r);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

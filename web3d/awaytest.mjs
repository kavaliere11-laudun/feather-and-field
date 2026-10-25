// The game, release 1 step 9f (the welcome-back summary): node awaytest.mjs   (LANG=fr; W, H; SHOTS=folder)
// A fresh farm: no summary. Back after 9 hours (eggs in the nest, honey in the hives, the wheat ripe, a feeder empty):
// "While you were away", how long, a line for each with its picture; "Collect all eggs (n)": the eggs fly to the coins,
// sold. The page shown again after two hours: the summary again. Back after 20 minutes: none. A last-seen time ahead of
// now (a save changed outside) is checked and flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); f.showNews(); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/away_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const kind = () => p.evaluate(() => window.__farm.gameUI().kind);
const rows = () => p.evaluate(() => [...document.querySelectorAll('.gaway-r')].map(r => r.dataset.k));
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load(); await run(2.5);
ok('a fresh farm: no summary', (await kind()) !== 'away', await kind());
await p.evaluate(() => window.__farm.gameUI().close());
// set the farm up: level 6, the beehives, the wheat sown; then away 9 hours, a feeder empty and eggs in the nest
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = Math.round(60 * Math.pow(5, 2.1) + 5); g.data.coins = 3000; g.data.lvSeen = g.level; g.save(); f.deco.start('beehives'); f.deco.place(); f.deco.wheat.sow(); });
await run(1);
// (the page put away now, as when the phone's locked: when it was last seen; it opens again 9 hours on)
await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; c.eggs = 8; c.feed = 0; c.fedAt = window.__T; g.data.wheat.ripe = window.__T - 600e3; g.save(); sessionStorage.setItem('__T', window.__T + 9 * 3600e3); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await run(2.5);
let r = await rows(), t = await sheet();
ok('back after 9 hours: "While you were away", 9 h, the eggs, the honey, the wheat ripe, the feeder empty, a line each',
  (await kind()) === 'away' && (fr ? /Pendant votre absence/ : /While you were away/).test(t) && (fr ? /pendant 9 h/ : /away 9 h/).test(t) && ['eggs', 'honey', 'wheat', 'feed'].every(k => r.includes(k)), { r, t: t.slice(0, 500) });
await shot('1_summary');
const before = await p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, eggs: g.data.coops[0].eggs }; });
const btn = await p.evaluate(() => document.querySelector('.gsheet .gbtn').textContent);
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await run(0.5);
await p.waitForTimeout(1200); await run(0.3);
const after = await p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, eggs: g.data.coops[0].eggs }; });
const w = await p.evaluate(() => document.getElementById('hint').textContent);
ok('"Collect all eggs (n)": the card closes, the eggs sold, the word', (fr ? /Ramasser tous les œufs \(\d+\)/ : /Collect all eggs \(\d+\)/).test(btn) && (await kind()) !== 'away' && after.eggs === 0 && after.coins > before.coins && (fr ? /œufs vendus/ : /eggs sold/).test(w), { btn, before, after, w });
await shot('2_collected');
// the page shown again after two hours
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); window.__T += 2 * 3600e3; f.deco.away.at(window.__T - 2 * 3600e3); });
await run(2);
r = await rows();
ok('the page back after two hours: the summary again', (await kind()) === 'away' && r.length > 0, r);
await p.evaluate(() => window.__farm.gameUI().close());
// back after 20 minutes: none
await p.evaluate(() => { sessionStorage.setItem('__T', window.__T + 20 * 60e3); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load(); await run(2.5);
ok('back after 20 minutes: no summary', (await kind()) !== 'away', await kind());
// a save changed outside
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.lastSeen = window.__T + 99 * 3600e3; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const ed = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, seen: g.data.lastSeen, now: window.__T }; });
ok('a last-seen time ahead of now: checked and flagged', ed.edited && ed.seen <= ed.now, ed);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

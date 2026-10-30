// Release 2 step 2 (rare babies): node raretest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402; SHOTS: a folder)
// A farm at level 7 with the White Silkies (level 7 since 30 Oct): a brood whose luck gives a rare chick (a Paint Silkie, the White ones' rare
// colour) hatches: "... one is a rare Paint Silkie! ✨", the chick in its own colour; her card says so. Grown: the
// congratulations card with the rare one ("✨ Paint Silkie") and Keep / Sell; she stays in the pen meanwhile (the others
// gone), the little barn's red dot. Keep: into the basket by the farmhouse fire (a name, her stars), "snug in the basket",
// Your coops lists her. Another rare one: Sell (from Your coops): its coins. With a Paint trio already kept, one more is sold
// for the player ("Your Paint Silkie trio is complete"). A reload keeps it all, unflagged; a save changed outside (a rare
// one from the wrong colour, a basket bird that isn't rare, a rare one too many) is checked and flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T11:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/rare_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const xpAt = L => Math.round(60 * Math.pow(L - 1, 2.1)) + 5;
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const word = () => p.evaluate(() => document.getElementById('hint').textContent);
const T = { line: fr ? /Poule soie pie/ : /Paint Silkie/, hatched: fr ? /dont un rare : Poule soie pie/ : /one is a rare Paint Silkie/, keep: fr ? /La garder|Le garder/ : /Keep her|Keep him/, sell: fr ? /Vendre · / : /Sell · /,
  kept: fr ? /panier près du feu/ : /basket by the farmhouse fire/, basket: fr ? /Le panier près du feu/ : /The basket by the fire/, full: fr ? /Votre trio Poule soie pie est complet/ : /Your Paint Silkie trio is complete/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 7, the White Silkies placed
await p.evaluate(L7 => { const g = window.__farm.game(); g.data.xp = L7; g.data.lvSeen = 7; g.data.coins = 5000; g.data.land = [0, 1, 2, 3, 4, 5, 6]; g.data.guide = { step: 5, done: true }; g.save(); }, xpAt(7));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.place('sil'); f.step(1 / 30, 3); }); await run(0.3);
let m = await p.evaluate(() => window.__farm.move.state());
if (!m.ok) { await p.evaluate(() => window.__farm.move.to(-33, -23, 90)); await run(0.1); }
await p.evaluate(() => window.__farm.move.place()); await run(1.5);
// a brood the luck gives a rare one: among starts a second apart (each start its own luck, the game's own)
const br = await p.evaluate(() => {
  const g = window.__farm.game(), c = g.data.coops.find(x => x.breed === 'sil'), hen = g.birdsIn(c.id).find(b => b.sex === 'h');
  for (let k = 0; k < 40000; k++) {
    const start = window.__T - 24 * 3600e3 - 2000 - k * 1000, kids = g.kidsOf(c, { hen: hen.id, start, n: 3 });
    if (kids[0].rare && !kids.slice(1).some(x => x.rare)) { c.brood = { hen: hen.id, start, n: 3, hatched: false }; c.lastBrood = 0; g.save(); return { start, k, kids }; }
  }
  return null;
});
ok('a start whose luck gives one rare chick', !!br && br.kids[0].rare === 'sil_paint', br);
await run(1);
const hatched = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'sil'), P = f.coopPlots().find(q => q.line === 'sil');
  return { brood: c.brood && { hatched: c.brood.hatched, kids: c.brood.kids }, chicks: P.birds.filter(b => b.gameChick).map(b => (b.rare || '') + ':' + b.colour), hint: document.getElementById('hint').textContent }; });
ok('hatched: one rare chick in her own colour, "... one is a rare Paint Silkie! ✨"', hatched.brood && hatched.brood.hatched && hatched.brood.kids[0].rare === 'sil_paint' && hatched.chicks.includes('sil_paint:paint') && hatched.chicks.filter(x => x === ':white').length === 2, hatched);
// her card
await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil'); f.chickCard(P.birds.find(b => b.rare)); }); await run(0.3);
let t = await sheet();
ok('her card: "✨ A rare Paint Silkie chick"', T.line.test(t) && /✨/.test(t), t.slice(0, 200));
await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil'); f.gameUI().close(); const c = P.birds.find(b => b.rare); f.lookAt(c.root.getWorldPosition(new f.THREE.Vector3()).x, c.root.getWorldPosition(new f.THREE.Vector3()).z, 1.6); });
await run(1.5); await shot('1_chick');
// grown (the farm opened after: no farewell), the card
await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops.find(x => x.breed === 'sil'); window.__T = g.grownAt(c) + 600e3; sessionStorage.setItem('__T', window.__T); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
for (let i = 0; i < 10 && (await p.evaluate(() => window.__farm.gameUI().kind)) !== 'congrats'; i++) { await p.evaluate(() => { const f = window.__farm; if (f.gameUI().kind === 'away') f.gameUI().close(); f.showNews(); }); await run(1); }      // (the welcome-back summary first)
t = await sheet();
const grown = await p.evaluate(() => { const f = window.__farm, g = f.game(), P = f.coopPlots().find(q => q.line === 'sil');
  return { kind: f.gameUI().kind, waiting: g.rareWaiting().map(w => w.line + ':' + w.sex), inPen: P.birds.filter(b => b.pendingId).map(b => b.colour), others: P.birds.filter(b => b.gameChick && !b.pendingId && !b.leaving).length, dot: !document.querySelector('.gcoops .gdot').hidden, keep: !!document.querySelector('.gsheet .grare-keep') }; });
ok('grown: the congratulations card with "✨ Paint Silkie", Keep and Sell; she stays in the pen, the others gone; the red dot', grown.kind === 'congrats' && T.line.test(t) && /✨/.test(t) && grown.keep && T.sell.test(t) && grown.waiting.length === 1 && grown.inPen.join() === 'paint' && grown.others === 0 && grown.dot, { grown, t: t.slice(0, 400) });
await shot('2_congrats');
// Keep
const coins0 = await p.evaluate(() => window.__farm.game().data.coins);
await p.evaluate(() => document.querySelector('.gsheet .grare-keep').click()); await run(0.5);
const kept = await p.evaluate(() => { const f = window.__farm, g = f.game(), P = f.coopPlots().find(q => q.line === 'sil');
  return { basket: g.basket().map(b => [b.breed, b.sex, b.name, g.stars(b)]), waiting: g.rareWaiting().length, inPen: P.birds.filter(b => b.pendingId).length, hint: document.getElementById('hint').textContent, coins: g.data.coins }; });
ok('Keep: into the basket by the farmhouse fire (her name, her stars), gone from the pen, "snug in the basket"', kept.basket.length === 1 && kept.basket[0][0] === 'sil_paint' && kept.basket[0][2].length > 1 && kept.basket[0][3] >= 0 && kept.waiting === 0 && kept.inPen === 0 && T.kept.test(kept.hint) && kept.coins === coins0, kept);
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.coopsSheet(); }); await run(0.3);
t = await sheet();
ok('Your coops: the basket by the fire, with her', T.basket.test(t) && t.includes(kept.basket[0][2]), t.slice(0, 300));
await shot('3_basket');
await p.evaluate(() => window.__farm.gameUI().close());
// another rare one: Sell (from Your coops)
const sell = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops.find(x => x.breed === 'sil'); g.data.rare.push({ id: g.id('b'), line: 'sil_paint', sex: 'h', stars: 3, coop: c.id, i: 1, mum: g.birdsIn(c.id).find(b => b.sex === 'h').id, t: window.__T }); g.save(); return g.data.coins; });
await run(0.5);
await p.evaluate(() => window.__farm.coopsSheet()); await run(0.3);
await p.evaluate(() => document.querySelector('.gsheet .grare-sell').click()); await run(0.5);
const sold = await p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, waiting: g.rareWaiting().length, hint: document.getElementById('hint').textContent }; });
ok('Sell (from Your coops): 400 + 50 a star (3 stars: 550 coins)', sold.coins === sell + 550 && sold.waiting === 0 && /550/.test(sold.hint), { sold, before: sell });
await p.evaluate(() => window.__farm.gameUI().close());
// a Paint trio already kept: one more is sold for the player
const full = await p.evaluate(() => {
  const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'sil'), hen = g.birdsIn(c.id).find(b => b.sex === 'h'), now = window.__T;
  for (const [sex, most, name] of [['h', 2, 'Pip'], ['r', 1, 'Paddy']]) while (g.basket().filter(b => b.breed === 'sil_paint' && b.sex === sex).length < most)      // (the trio made up)
    g.data.basket.push({ id: g.id('b'), name: name + g.basket().length, sex, breed: 'sil_paint', pers: 'brave', since: now, exp: 0, trust: 0, happy: 0, ros: [0, 0, 0, 0, 0, 0, 0, 0, 0] });
  for (let k = 0; k < 4000; k++) { const start = now - 77 * 3600e3 - k * 3600e3, kids = g.kidsOf(c, { hen: hen.id, start, n: 3 }); if (kids.some(x => x.rare)) { c.brood = { hen: hen.id, start, n: 3, hatched: true, kids }; c.lastBrood = 0; break; } }
  const coins = g.data.coins; g.broodTick(now); const n = g.data.news[g.data.news.length - 1];
  return { full: n.kids.filter(k => k.rare).map(k => !!k.full), waiting: g.rareWaiting().length, coins: g.data.coins - coins, rareCoins: n.kids.filter(k => k.rare).map(k => k.coins) };
});
ok('a Paint trio already kept: one more sold for the player (its coins with the others\')', full.full.length >= 1 && full.full.every(Boolean) && full.waiting === 0 && full.rareCoins.every(c => c >= 450), full);
await p.evaluate(() => window.__farm.game().save());
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
for (let i = 0; i < 6 && (await p.evaluate(() => window.__farm.gameUI().kind)) !== 'congrats'; i++) { await p.evaluate(() => { const f = window.__farm; if (f.gameUI().kind === 'away') f.gameUI().close(); f.showNews(); }); await run(1); }
t = await sheet();
ok('its congratulations card says so', T.full.test(t), t.slice(0, 400));
await p.evaluate(() => window.__farm.gameUI().close());
// a reload keeps it all
const keep = () => p.evaluate(() => { const g = window.__farm.game(); return JSON.stringify({ basket: g.basket(), rare: g.rareWaiting() }); });
const k0 = await keep();
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const again = await p.evaluate(() => window.__farm.game().edited);
ok('a reload: the basket as it was, not flagged', (await keep()) === k0 && !again, { again });
// a save changed outside
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d, c = d.coops.find(x => x.breed === 'sil');
  d.rare = [...(d.rare || []), { id: 'b990', line: 'sil_red', sex: 'h', stars: 5, coop: c.id, i: 0, mum: 'b1', t: 1 }];
  d.basket.push({ id: 'b991', name: 'Fake', sex: 'h', breed: 'rir', pers: 'diva', since: 1, exp: 0, trust: 0, happy: 0, ros: [0, 0, 0, 0, 0, 0, 0, 0, 0] });
  d.basket.push({ id: 'b992', name: 'Extra', sex: 'r', breed: 'sil_paint', pers: 'brave', since: 1, exp: 0, trust: 0, happy: 0, ros: [0, 0, 0, 0, 0, 0, 0, 0, 0] });
  localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const ed = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, basket: g.basket().map(b => b.name).join(), rare: g.rareWaiting().length }; });
ok('a save changed outside (a rare one from the wrong colour, a basket bird that isn\'t rare, a rare one too many): checked and flagged', ed.edited && !/Fake|Extra/.test(ed.basket) && ed.rare === 0, ed);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

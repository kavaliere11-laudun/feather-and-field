// The game, release 1 step 3 (eggs and feed): node eggtest.mjs   (LANG=fr: a French phone; W, H: the screen, e.g. W=874 H=402)
// A fresh farm at 10:00 on a fake clock: the first egg (the good mum walks in and lays it, the bubble shows 1); collected
// (the eggs fly to the coins: +6 coins; fresh, collected within 3 hours of being laid: 1 XP and 2 more); two days away: the eggs laid meanwhile are there, the feeder low; three
// days: empty, no eggs after it ran out; the feeder's card and filling it (the farmer brings the feed, the grain rises,
// coins down); a full nest stops the laying; a reload keeps it all; eggs laid long ago: 1 XP each, none fresh; a save changed
// outside the game is checked and flagged (when its eggs were laid too);
// a clock put back gives nothing.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-24T10:00:00+01:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30`;
const setT = t => p.evaluate(t => { window.__T = t; sessionStorage.setItem('__T', t); }, t);
const sim = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 10; i++) { window.__T += 100; f.step(0.1, 1); if (i % 10 === 0) f.gameTick(window.__T); } f.gameTick(window.__T); f.draw(); }, secs);
const state = () => p.evaluate(() => {
  const f = window.__farm, g = f.game(), c = g.data.coops[0], P = f.gamePlots()[0], B = P.bub || {};
  return { coins: g.data.coins, xp: g.data.xp, eggs: c.eggs, nest: P.nest.count, feed: +g.feedLeft(c).toFixed(3), mesh: +P.feedMesh.position.y.toFixed(4), meshOn: P.feedMesh.visible,
    eggBub: B.eggs ? (B.eggs.hidden ? null : B.eggs.childNodes[1].textContent) : null, fresh: B.eggs ? B.eggs.classList.contains('fresh') : null, feedBub: B.feed ? (B.feed.hidden ? null : B.feed.textContent) : null,
    laying: P.birds.filter(x => x.laying).map(x => x.name), hint: document.getElementById('hint').textContent, first: g.data.first, edited: g.edited };
});

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 30); f.gameTick(window.__T); f.draw(); });
let s = await state();
ok('a new farm: no eggs yet, the feeder full, a first egg on its way', s.eggs === 0 && s.feed === 1 && s.meshOn && !!s.first && s.eggBub === null, s);
// the first egg, 75 s in: the good mum walks in and lays it
await sim(80);
s = await state();
ok('the first egg: the good mum goes in to lay', s.laying.length === 1, s.laying);
await sim(70);
s = await state();
ok('the first egg laid: in the nest and its bubble (fresh: a sparkle)', s.eggs === 1 && s.nest === 1 && s.eggBub === '1' && s.fresh && s.first === null && /first egg|premier œuf/.test(s.hint), s);
// collected: the eggs fly to the coins
await p.evaluate(() => window.__farm.collectAt(0));
const flying = await p.evaluate(() => document.querySelectorAll('.gegg').length);
await p.waitForTimeout(1200);
s = await state();
ok('collected: sold for 6 coins; fresh: 1 + 2 XP ("fresh"), the nest empty, the bubble gone, an egg flew', flying >= 1 && s.coins === 106 && s.xp === 3 && s.eggs === 0 && s.nest === 0 && s.eggBub === null && /\+6/.test(s.hint) && (fr ? /tout frais/ : /fresh/).test(s.hint) && /\+3 XP/.test(s.hint), { flying, ...s });
// away for two days: the eggs laid meanwhile are there (no walking in), the feeder low
const day = 86400e3;
await setT(T0 + 2 * day - 3600e3);
await p.evaluate(() => { const f = window.__farm; f.gameTick(window.__T); f.draw(); });
s = await state();
const expect2 = await p.evaluate(() => { const g = window.__farm.game(); return g.data.birds.filter(b => b.sex === 'h').map(b => b.laid); });
ok('two days away: the eggs laid meanwhile are in the nest (a hen whose time has just come walks in), the feeder low (its bubble)', s.eggs + s.laying.length >= 6 && s.eggs <= 8 && s.nest === s.eggs && s.laying.length <= 1 && s.feed > 0 && s.feed < 0.25 && /Feed low|Presque vide/.test(s.feedBub || ''), s);
const before = s.eggs;
// three days: the feeder ran out; nothing laid after it did
await setT(T0 + 3 * day + 6 * 3600e3);
await p.evaluate(() => { const f = window.__farm; f.gameTick(window.__T); f.draw(); });
s = await state();
ok('three days: the feeder empty (no grain, its bubble), no eggs after it ran out', s.feed === 0 && !s.meshOn && /empty|vide/i.test(s.feedBub || '') && s.eggs <= before + 2, { before, ...s });
// the feeder's card: fill it
await p.evaluate(() => window.__farm.feederCard(0));
await p.waitForTimeout(400);
const card = await p.evaluate(() => ({ kind: window.__farm.gameUI().kind, text: document.querySelector('.gsheet').innerText, btn: document.querySelector('.gsheet .gbtn').textContent }));
ok('the feeder card: empty, fill it for 12 coins', card.kind === 'feeder' && /12/.test(card.btn) && /(Empty|Vide)/.test(card.text), card);
const coinsBefore = s.coins;
await p.tap('.gsheet .gbtn');
await p.evaluate(() => { const f = window.__farm; f.step(0.1, 2); f.gameTick(window.__T); f.draw(); });
s = await state();
ok('filled: 12 coins paid, the save full at once, the farmer on his way, the grain still empty until he pours', s.coins === coinsBefore - 12 && s.feed === 1 && /on the way|arrive/.test(s.hint) && !s.meshOn && s.feedBub === null, s);
let poured = false;
for (let i = 0; i < 9 && !poured; i++) { await sim(10); s = await state(); poured = s.meshOn && s.mesh > 0.06; }
ok('the farmer pours: the grain up to full', poured, s);
// a full nest: no more eggs
await p.evaluate(() => { const g = window.__farm.game(); g.data.coops[0].eggs = 12; g.save(); });
await setT(T0 + 4 * day);
await p.evaluate(() => { const f = window.__farm; f.gameTick(window.__T); f.draw(); });
s = await state();
const full = await p.evaluate(() => window.__farm.gamePlots()[0].bub.eggs.classList.contains('full'));
ok('a full nest: 12, no more laid, the bubble says so (no sparkle: laid long ago)', s.eggs === 12 && s.eggBub === '12' && full && !s.fresh, { full, ...s });
// a reload keeps it all
const keep = () => p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return JSON.stringify({ coins: g.data.coins, xp: g.data.xp, eggs: c.eggs, feed: c.feed, fedAt: c.fedAt, birds: g.data.birds.map(b => b.name + b.pers) }); });
const saved = await keep();
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 10); f.draw(); });
s = await state();
const after = await keep();
ok('a reload: the same farm, the nest and feeder as they were, not flagged', after === saved && s.nest === 12 && !s.edited, { same: after === saved, ...s });
// eggs laid long ago: no fresh ones
const old = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0], xp = g.data.xp, lt = (c.lt || []).length; window.__farm.collectAt(0); return { dx: g.data.xp - xp, lt, hint: document.getElementById('hint').textContent }; });
ok('eggs laid a day or more ago: 1 XP each, none fresh', old.dx === 12 && old.lt > 0 && !/fresh|frais/.test(old.hint), old);
// a clock put back: nothing
await setT(T0 + 2 * day);
await p.evaluate(() => { const f = window.__farm; f.gameTick(window.__T); f.draw(); });
const back = await p.evaluate(() => window.__farm.game().dueLays().length);
ok('a clock put back: nothing due', back === 0, back);
// a save changed outside the game: checked and flagged
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.coops[0].eggs = 999; raw.d.coops[0].feed = 1e6; raw.d.birds.find(b => b.sex === 'h').laid = -1; raw.d.coops[0].lt = [window.__T + 9e9, 'x', window.__T - 60e3]; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 5); f.draw(); });
const t = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return { edited: g.edited, eggs: c.eggs, feed: c.feed, cap: g.feedCap(c), lt: c.lt, now: window.__T }; });
ok('a save changed outside: eggs at most 12, the feeder at most full, lay times none ahead of now, flagged', t.edited && t.eggs === 12 && t.feed <= t.cap && Array.isArray(t.lt) && t.lt.length === 1 && t.lt.every(x => Number.isInteger(x) && x <= t.now), t);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

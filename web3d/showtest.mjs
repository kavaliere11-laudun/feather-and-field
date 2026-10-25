// The game, release 1 step 9a (shows): node showtest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402; SHOTS=folder for pictures)
// A fresh farm on a fake clock (10:00): the rosette up top with a red dot (a show open today); Shows: the Village show (its
// name, any breed, results at 7:00, the prizes), the best bird with her chance of a rosette and "Enter … · 10", the County
// and the National locked; the dot gone once looked at. Entered: the fee, a word, "… is entered", her card says so; no second
// bird in that show; a reload keeps it. The next morning at 7: the results card (her place, the prizes), the coins and XP,
// her rosette on her card; seen, it doesn't come back. Level 4: the level card brings the County show; not enough coins: the
// button says so. A save changed outside (an entry before its show opened, a bird that isn't there, rosettes she can't have
// won, a result with the wrong prize) is checked and flagged.
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
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/show_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const kind = () => p.evaluate(() => window.__farm.gameUI().kind);
const dot = () => p.evaluate(() => !document.querySelector('.gshows .gdot').hidden);
const later = h => p.evaluate(h => { window.__T += h * 3600e3; sessionStorage.setItem('__T', window.__T); }, h);
const T = { title: fr ? /Concours/ : /Shows/, village: fr ? /Concours d(e |’)[A-Z]/ : /[A-Z][a-z]+.* Village Show/, any: fr ? /Toutes les races/ : /Any breed can enter/,
  when: fr ? /Résultats à 7 h, dans/ : /Results at 7:00, in/, prizes: fr ? /Prix : 1er 60 · 2e 30 · 3e 15 pièces/ : /Prizes: 1st 60 · 2nd 30 · 3rd 15 coins/,
  chance: fr ? /chances de cocarde : (faibles|moyennes|bonnes|excellentes) \(\d+\u202f%\)/ : /chance of a rosette: (slim|fair|good|great) \(\d+%\)/, enter: fr ? /^Inscrire .+ · 10$/ : /^Enter .+ · 10$/,
  lock4: fr ? /À partir du niveau 4/ : /From level 4/, lock9: fr ? /À partir du niveau 9/ : /From level 9/, entered: fr ? /est inscrite? au Concours d(e |’)/ : /is entered in the .+ Village Show!/,
  isIn: fr ? /est inscrite? : résultats à 7 h/ : /is entered: results at 7:00/, cardIn: fr ? /Au Concours d(e |’).+ : résultats à 7 h/ : /In the .+ Village Show: results at 7:00/,
  results: fr ? /Résultats des concours/ : /Show results/, placed: fr ? /prend la 1re place au Concours d(e |’)/ : /came 1st in the .+ Village Show!/, ros: fr ? /Cocardes/i : /Rosettes/i,
  county: fr ? /Le concours régional : inscription 40/ : /The County show: entry 40/, broke: fr ? /Pas assez de pièces : l’inscription coûte 40/ : /Not enough coins: the entry is 40/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// a fresh farm: the rosette with its dot
ok('a fresh farm: the rosette up top with a red dot (a show is open today)', await dot() && (await p.evaluate(() => !!document.querySelector('.gbar .gshows'))), await dot());
await p.tap('.gshows'); await run(0.3);
let t = await sheet();
const btn = await p.evaluate(() => { const x = document.querySelector('.gshow .gbtn'); const r = x.getBoundingClientRect(); return { t: x.textContent, top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) }; });
ok('Shows: the Village show (its name, any breed, results at 7:00, the prizes), the best bird and her chance, "Enter … · 10" on screen; the County and National locked; how shows work',
  (await kind()) === 'shows' && T.village.test(t) && T.any.test(t) && T.when.test(t) && T.prizes.test(t) && T.chance.test(t) && T.enter.test(btn.t) && btn.bottom <= H && btn.top > 0 && T.lock4.test(t) && T.lock9.test(t), { t: t.slice(300, 1200), btn, v: T.village.test(t), a: T.any.test(t), w: T.when.test(t), pr: T.prizes.test(t), ch: T.chance.test(t), en: T.enter.test(btn.t) });
ok('looked at: the dot gone', !(await dot()));
await shot('1_sheet');
// entering the best bird
const best = await p.evaluate(() => { const g = window.__farm.game(), s = g.openShows()[0], x = g.showBirds(s)[0]; return { id: x.b.id, name: x.b.name, s: s.id }; });
const c0 = await p.evaluate(() => window.__farm.game().data.coins);
await p.tap('.gshow .gbtn'); await run(0.3);
t = await sheet();
let st = await p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, in: g.data.shows.in, hint: document.getElementById('hint').textContent }; });
ok('entered: the fee paid, a word, the sheet says she\'s in', st.coins === c0 - 10 && st.in.length === 1 && st.in[0].bird === best.id && T.entered.test(st.hint) && T.isIn.test(t) && !(await p.evaluate(() => !!document.querySelector('.gshow .gbtn'))), { st, t: t.slice(0, 300) });
await shot('2_entered');
const second = await p.evaluate(s => { const g = window.__farm.game(), o = g.data.birds.find(b => !g.showOf(b.id)); return { why: g.canEnter(o, g.openShows().find(x => x.id === s)), r: !!g.enterShow(s, o.id) }; }, best.s);
ok('no second bird in the same show', second.why === 'done' && !second.r, second);
t = await p.evaluate(id => { const f = window.__farm; f.gameUI().close(); f.openBirdCard(f.allBirds.find(x => x.gid === id)); return document.querySelector('.gsheet').innerText; }, best.id);
ok('her card: the show she\'s in, no rosettes yet', T.cardIn.test(t) && T.ros.test(t), t.slice(-400));
await shot('3_card');
await p.evaluate(() => window.__farm.gameUI().close());
// a reload keeps it
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
st = await p.evaluate(() => { const g = window.__farm.game(); return { in: g.data.shows.in.length, edited: g.edited }; });
ok('a reload: still entered, not flagged', st.in === 1 && !st.edited, st);
// the next morning at 7: a strong bird wins (her stars and trust raised in the game), the results card
await p.evaluate(id => { const g = window.__farm.game(), b = g.bird(id); b.exp = 350; b.trust = 15; g.save(); }, best.id);
const before = await p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, xp: g.data.xp }; });
await later(21.2); await run(2);
t = await sheet();
st = await p.evaluate(id => { const g = window.__farm.game(); return { kind: window.__farm.gameUI().kind, coins: g.data.coins, xp: g.data.xp, ros: g.bird(id).ros, res: g.data.shows.res, in: g.data.shows.in.length }; }, best.id);
ok('the next morning: the results card (1st, a rosette), the prize and XP in, a rosette for her', st.kind === 'showres' && T.results.test(t) && T.placed.test(t) && st.ros[0] === 1 && st.in === 0 && st.res.length === 1 && st.res[0].place === 1 && st.coins === before.coins + 60 && st.xp === before.xp + 14, { st, t });
await shot('4_results');
await p.tap('.gsheet .gbtn'); await run(0.5);
t = await p.evaluate(id => { const f = window.__farm; f.openBirdCard(f.allBirds.find(x => x.gid === id)); return document.querySelector('.gsheet').innerText; }, best.id);
await run(0.3);
const rosRow = await p.evaluate(() => document.querySelectorAll('.gsheet .grosrow .gros').length);
ok('seen: no card again; her card shows her rosette', !(await p.evaluate(() => window.__farm.game().unseenShows().length)) && rosRow === 1 && T.ros.test(t), { rosRow, t: t.slice(-300) });
await shot('5_rosette');
await p.evaluate(() => window.__farm.gameUI().close()); await run(2);
ok('the results card doesn\'t come back', (await kind()) !== 'showres', await kind());
// level 4: the County show
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 700; g.data.lvSeen = 3; g.save(); }); await run(1.6);
t = await sheet();
ok('level 4: its card brings the County show', (await kind()) === 'levelup' && T.county.test(t), t.slice(0, 400));
await shot('6_level4');
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5);
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 20; g.save(); window.__farm.showsSheet(); }); await run(0.3);
t = await sheet();
const county = await p.evaluate(() => { const g = window.__farm.game(), s = g.openShows().find(x => x.tier === 'c'); return { locked: s.locked, breed: s.breed, list: g.showBirds(s).length }; });
const cbtn = await p.evaluate(() => { const c = [...document.querySelectorAll('.gshow')].find(x => x.dataset.show[0] === 'c'); const b = c && c.querySelector('.gbtn'); return b ? { t: b.textContent, dis: b.disabled } : null; });
ok('the County show open; not enough coins: its button says so', !county.locked && (county.list === 0 || (cbtn && cbtn.dis && T.broke.test(cbtn.t))), { county, cbtn });
await shot('7_county');
await p.evaluate(() => window.__farm.gameUI().close());
// a save changed outside the game
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d, b0 = d.birds[0], b1 = d.birds[2];
  const day = id => id; const v = d.shows.res[0].id, tom = 'v' + (parseInt(v.slice(1)) + 9);
  d.shows.in = [{ id: tom, bird: b0.id, at: window.__T }, { id: 'v' + v.slice(1), bird: 'b999', at: window.__T }];
  b1.ros = [40, 0, 0, 0, 0, 0, 0, 0, 0];
  d.shows.res.push({ ...d.shows.res[0], coins: 5000 });
  localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
st = await p.evaluate(() => { const g = window.__farm.game(), d = g.data; return { edited: g.edited, in: d.shows.in.length, ros: d.birds[2].ros.reduce((a, n) => a + n, 0), coins: d.shows.res.map(r => r.coins) }; });
ok('a save changed outside (an entry before its show, a bird not there, 40 rosettes in a day, a prize of 5000): checked and flagged', st.edited && st.in === 0 && st.ros === 0 && st.coins.every(c => c === 60), st);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

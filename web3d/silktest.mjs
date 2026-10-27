// Release 2 step 1 (the Silkie colours by level): node silktest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402)
// A farm at level 7: Your coops says what level 8 brings (the Black Silkies). Level 8: its card says a new Silkie colour
// has come ("New Silkie colour: Black!"), "Place their coop now": a rustic Pagoda in black (its roof, frames and trim) with
// a black trio, "Welcome, ...!"; a black hen's card says "Black Silkie"; the Breed Book has ten pages, the Black Silkies
// found with their names and picture, the Buff Silkies at level 13; a Silkies-only County show takes a black Silkie; a
// reload keeps it all, unflagged; a save changed outside (the Buff Silkies' coop at level 8, the Black Silkies twice) is
// checked and flagged. No page errors.
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
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/silk_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const xpAt = L => Math.round(60 * Math.pow(L - 1, 2.1)) + 5;
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(); return { level: g.level, waiting: g.waitingCoops().join(), coops: g.data.coops.map(c => c.breed).join(), birds: g.data.birds.length, card: f.gameUI().kind, edited: g.edited, move: f.move.state().on }; });
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const T = { next8: fr ? /Au niveau 8 : Poule soie noire/ : /At level 8: Black Silkie/, col: fr ? /Nouvelle couleur de poule soie : noire !/ : /New Silkie colour: Black!/, place: fr ? /Installer leur poulailler/ : /Place their coop now/,
  welcome: fr ? /Bienvenue, .+ et .+ !/ : /Welcome, .+ and .+!/, black: fr ? /Poule soie noire/ : /Black Silkie/, at13: fr ? /niveau 13/ : /level 13/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 7, seven fields
await p.evaluate(L7 => { const g = window.__farm.game(); g.data.xp = L7; g.data.lvSeen = 7; g.data.coins = 5000; g.data.land = [0, 1, 2, 3, 4, 5, 6]; g.data.guide = { step: 5, done: true }; g.save(); }, xpAt(7));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
await p.tap('.gcoops'); await run(0.3);
let t = await sheet();
ok('level 7, Your coops: what level 8 brings, the Black Silkies', T.next8.test(t), t.slice(-200));
await p.evaluate(() => window.__farm.gameUI().close());
// level 8: its card, then "Place their coop now"
await p.evaluate(L8 => { const g = window.__farm.game(); g.data.xp = L8; g.data.land.push(7); g.save(); }, xpAt(8)); await run(1.6);
let s = await st(); t = await sheet();
await shot('1_level8');
ok('level 8: its card says a new Silkie colour has come, "Place their coop now"', s.level === 8 && s.card === 'levelup' && T.col.test(t) && T.place.test(t), { s, t: t.slice(0, 300) });
await p.tap('.gsheet .gstick .gbtn:first-child'); await run(0.6);
let m = await p.evaluate(() => window.__farm.move.state());
if (!m.ok) { await p.evaluate(() => window.__farm.move.to(-33, -23, 90)); await run(0.1); m = await p.evaluate(() => window.__farm.move.state()); }
await p.tap('.gmove-go'); await run(1.5);
s = await st();
const blk = await p.evaluate(() => { const f = window.__farm, g = f.game(), P = f.coopPlots().find(q => q.line === 'sil_black'), c = g.data.coops.find(x => x.breed === 'sil_black');
  return P && c && { n: P.birds.length, colours: P.birds.map(b => b.colour).join(), breeds: g.birdsIn(c.id).map(b => b.breed).join(), models: f.coopModels(), hint: document.getElementById('hint').textContent, tier: c.tier }; });
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil_black'); f.lookAt(P.centre.x, P.centre.z, 2.6); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await shot('2_coop');
ok('placed: a rustic Pagoda in black with a black trio, "Welcome, ...!"', !s.move && /sil_black/.test(s.coops) && blk && blk.n === 3 && blk.colours === 'black,black,black' && blk.breeds === 'sil_black,sil_black,sil_black' && blk.models.includes('box_sil@black') && T.welcome.test(blk.hint) && blk.tier === 0, { s, blk });
// a black hen's card
await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil_black'); f.openBirdCard(P.birds.find(b => b.kind === 'hen')); }); await run(0.3);
t = await sheet();
await shot('3_card');
ok('a black hen\'s card: "Black Silkie"', T.black.test(t), t.slice(0, 200));
await p.evaluate(() => window.__farm.gameUI().close());
// the Breed Book
await p.evaluate(() => window.__farm.book()); await run(0.3);
await p.waitForFunction(() => { const i = document.querySelector('.gpage[data-breed="sil_black"] img'); return i && i.complete; }, null, { timeout: 20000 }).catch(() => {});
const book = await p.evaluate(() => { const pg = [...document.querySelectorAll('.gpage')]; const bl = document.querySelector('.gpage[data-breed="sil_black"]'), bu = document.querySelector('.gpage[data-breed="sil_buff"]');
  return { n: pg.length, order: pg.map(x => x.dataset.breed).join(), black: bl && { found: !bl.classList.contains('gpage-no'), text: bl.innerText, img: bl.querySelector('img').naturalWidth }, buff: bu && { found: !bu.classList.contains('gpage-no'), text: bu.innerText } }; });
if (SHOTS) { await p.evaluate(() => document.querySelector('.gpage[data-breed="sil_black"]').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); }
await shot('4_book');
ok('the Breed Book: fifteen pages (the rare colours last), the Black Silkies found with their names and picture, the Buff Silkies at level 13',
  book.n === 15 && book.order === 'rir,orp,sil,sil_black,leg,sil_buff,sil_blue,bra,sil_partridge,sil_grey,sil_paint,sil_lavender,sil_red,sil_splash,sil_cuckoo' && book.black.found && T.black.test(book.black.text) && book.black.img > 0 && !book.buff.found && T.at13.test(book.buff.text), book);
await p.evaluate(() => window.__farm.gameUI().close());
// a Silkies-only County show takes a black Silkie
const show = await p.evaluate(() => { const g = window.__farm.game(), hen = g.data.birds.find(b => b.breed === 'sil_black' && b.sex === 'h'), s = { id: 'c20261026', tier: 'c', breed: 'sil', locked: false };
  return { can: g.canEnter(hen, s), list: g.showBirds(s).map(x => x.b.breed).filter(k => k === 'sil_black').length, name: g.kindName('sil') }; });
ok('a Silkies-only County show: a black Silkie can enter it (the show says "Silkie")', show.can === 'ok' && show.list === 3 && (fr ? /^Poule soie$/ : /^Silkie$/).test(show.name), show);
// a reload keeps it
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
const again = await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil_black'); return P && { colours: P.birds.filter(b => b.gid).map(b => b.colour).join(), models: f.coopModels() }; });
ok('a reload: the black Silkies and their coop as they were, not flagged', !s.edited && /sil_black/.test(s.coops) && again && again.colours === 'black,black,black' && again.models.includes('box_sil@black'), { s, again });
// a save changed outside: the Buff Silkies' coop at level 8, the Black Silkies twice
const before = s.coops;
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d;
  const add = (id, breed, x) => { d.coops.push({ ...d.coops[0], id, breed, x, eggs: 0, brood: null }); for (const [k, sex] of [['r', 'r'], ['h', 'h'], ['i', 'h']]) d.birds.push({ id: 'b9' + id.slice(1) + (k === 'r' ? 1 : k === 'h' ? 2 : 3), name: 'Zed', sex, breed, pers: 'diva', coop: id, since: 1, exp: 0, trust: 0, laid: 1 }); };
  add('c901', 'sil_buff', -10); add('c902', 'sil_black', -14);
  localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a save changed outside (the Buff Silkies at level 8, the Black Silkies twice): checked and flagged', s.edited && s.coops === before, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

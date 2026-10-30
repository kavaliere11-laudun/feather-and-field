// Release 2 step 1 (the Silkie colours by level; their order since 30 Oct 2026: White 7, Buff 12, Black 18, Partridge 24, no
// Blue or Grey): node silktest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402)
// A farm at level 11: Your coops says what level 12 brings (the Buff Silkies). Level 12: its card says a new Silkie colour
// has come ("New Silkie colour: Buff!"), "Place their coop now": a rustic Pagoda in buff with a buff trio, "Welcome, ...!";
// a buff hen's card says "Buff Silkie"; the Breed Book has fourteen pages, the Buff Silkies found with their names and
// picture, the Black Silkies at level 18; a Silkies-only County show takes a buff Silkie; a reload keeps it all, unflagged;
// the Partridge Silkies' coop at level 12 or the Buff Silkies twice, put in from outside: checked and flagged. A farm
// from before the new order (Blue Silkies at level 16, Black ones from level 9) keeps them, unflagged: their pages in the
// book, the Splash "hatched by a Buff Silkie or a Blue Silkie"; no Blue or Grey ever waiting. No page errors.
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
const T = { next: fr ? /Au niveau 12 : Poule soie fauve/ : /At level 12: Buff Silkie/, col: fr ? /Nouvelle couleur de poule soie : fauve !/ : /New Silkie colour: Buff!/, place: fr ? /Installer leur poulailler/ : /Place their coop now/,
  welcome: fr ? /Bienvenue, .+ et .+ !/ : /Welcome, .+ and .+!/, buff: fr ? /Poule soie fauve/ : /Buff Silkie/, at18: fr ? /niveau 18/ : /level 18/,
  splash: fr ? /Poule soie fauve.*Poule soie bleue/ : /Buff Silkie.*Blue Silkie/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 11, eleven fields
await p.evaluate(L11 => { const g = window.__farm.game(); g.data.xp = L11; g.data.lvSeen = 11; g.data.coins = 5000; g.data.land = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; g.data.guide = { step: 5, done: true }; g.save(); }, xpAt(11));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
await p.tap('.gcoops'); await run(0.3);
let t = await sheet();
ok('level 11, Your coops: what level 12 brings, the Buff Silkies', T.next.test(t), t.slice(-200));
await p.evaluate(() => window.__farm.gameUI().close());
// level 12: its card, then "Place their coop now"
await p.evaluate(L12 => { const g = window.__farm.game(); g.data.xp = L12; g.data.land.push(11); g.save(); }, xpAt(12)); await run(1.6);
let s = await st(); t = await sheet();
await shot('1_level12');
ok('level 12: its card says a new Silkie colour has come, "Place their coop now"', s.level === 12 && s.card === 'levelup' && T.col.test(t) && T.place.test(t), { s, t: t.slice(0, 300) });
await p.tap('.gsheet .gstick .gbtn:first-child'); await run(0.6);
let m = await p.evaluate(() => window.__farm.move.state());
if (!m.ok) { await p.evaluate(() => window.__farm.move.to(-33, -23, 90)); await run(0.1); m = await p.evaluate(() => window.__farm.move.state()); }
await p.tap('.gmove-go'); await run(1.5);
s = await st();
const bfc = await p.evaluate(() => { const f = window.__farm, g = f.game(), P = f.coopPlots().find(q => q.line === 'sil_buff'), c = g.data.coops.find(x => x.breed === 'sil_buff');
  return P && c && { n: P.birds.length, colours: P.birds.map(b => b.colour).join(), breeds: g.birdsIn(c.id).map(b => b.breed).join(), models: f.coopModels(), hint: document.getElementById('hint').textContent, tier: c.tier }; });
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil_buff'); f.lookAt(P.centre.x, P.centre.z, 2.6); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await shot('2_coop');
ok('placed: a rustic Pagoda in buff with a buff trio, "Welcome, ...!"', !s.move && /sil_buff/.test(s.coops) && bfc && bfc.n === 3 && bfc.colours === 'buff,buff,buff' && bfc.breeds === 'sil_buff,sil_buff,sil_buff' && bfc.models.includes('box_sil@buff') && T.welcome.test(bfc.hint) && bfc.tier === 0, { s, bfc });
// a buff hen's card
await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil_buff'); f.openBirdCard(P.birds.find(b => b.kind === 'hen')); }); await run(0.3);
t = await sheet();
await shot('3_card');
ok('a buff hen\'s card: "Buff Silkie"', T.buff.test(t), t.slice(0, 200));
await p.evaluate(() => window.__farm.gameUI().close());
// the Breed Book
await p.evaluate(() => window.__farm.book()); await run(0.3);
await p.waitForFunction(() => { const i = document.querySelector('.gpage[data-breed="sil_buff"] img'); return i && i.complete; }, null, { timeout: 20000 }).catch(() => {});
const book = await p.evaluate(() => { const pg = [...document.querySelectorAll('.gpage')]; const bl = document.querySelector('.gpage[data-breed="sil_buff"]'), bu = document.querySelector('.gpage[data-breed="sil_black"]');
  return { n: pg.length, order: pg.map(x => x.dataset.breed).join(), mine: bl && { found: !bl.classList.contains('gpage-no'), text: bl.innerText, img: bl.querySelector('img').naturalWidth }, next: bu && { found: !bu.classList.contains('gpage-no'), text: bu.innerText } }; });
if (SHOTS) { await p.evaluate(() => document.querySelector('.gpage[data-breed="sil_buff"]').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); }
await shot('4_book');
ok('the Breed Book: fourteen pages (the rare colours last), the Buff Silkies found with their names and picture, the Black Silkies at level 18',
  book.n === 14 && book.order === 'rir,orp,sil,aya,sil_buff,leg,sil_black,bra,sil_partridge,pol,sil_paint,sil_lavender,sil_splash,sil_cuckoo' && book.mine.found && T.buff.test(book.mine.text) && book.mine.img > 0 && !book.next.found && T.at18.test(book.next.text), book);
await p.evaluate(() => window.__farm.gameUI().close());
// a Silkies-only County show takes a buff Silkie
const show = await p.evaluate(() => { const g = window.__farm.game(), hen = g.data.birds.find(b => b.breed === 'sil_buff' && b.sex === 'h'), s = { id: 'c20261026', tier: 'c', breed: 'sil', locked: false };
  return { can: g.canEnter(hen, s), list: g.showBirds(s).map(x => x.b.breed).filter(k => k === 'sil_buff').length, name: g.kindName('sil') }; });
ok('a Silkies-only County show: a buff Silkie can enter it (the show says "Silkie")', show.can === 'ok' && show.list === 3 && (fr ? /^Poule soie$/ : /^Silkie$/).test(show.name), show);
// a reload keeps it
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
const again = await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil_buff'); return P && { colours: P.birds.filter(b => b.gid).map(b => b.colour).join(), models: f.coopModels() }; });
ok('a reload: the buff Silkies and their coop as they were, not flagged', !s.edited && /sil_buff/.test(s.coops) && again && again.colours === 'buff,buff,buff' && again.models.includes('box_sil@buff'), { s, again });
// a save changed outside: the Partridge Silkies' coop at level 12, the Buff Silkies twice
const before = s.coops;
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d;
  const add = (id, breed, x) => { d.coops.push({ ...d.coops[0], id, breed, x, eggs: 0, brood: null }); for (const [k, sex] of [['r', 'r'], ['h', 'h'], ['i', 'h']]) d.birds.push({ id: 'b9' + id.slice(1) + (k === 'r' ? 1 : k === 'h' ? 2 : 3), name: 'Zed', sex, breed, pers: 'diva', coop: id, since: 1, exp: 0, trust: 0, laid: 1 }); };
  add('c901', 'sil_partridge', -10); add('c902', 'sil_buff', -14);
  localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a save changed outside (the Partridge Silkies at level 12, the Buff Silkies twice): checked and flagged', s.edited && s.coops === before, s);
// a farm from before the new order (30 Oct 2026): at level 16 with Blue Silkies (they came at 15 then) and Black ones (8 then)
await p.evaluate(() => { localStorage.removeItem('ff3d.farm'); sessionStorage.removeItem('__T'); });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 }); await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(L16 => { const g = window.__farm.game(), d = g.data, c0 = d.coops[0]; d.xp = L16; d.lvSeen = 16; d.land = Array.from({ length: 16 }, (_, i) => i); d.guide = { step: 5, done: true };
  const R = d.birds.find(b => b.sex === 'r'), H = d.birds.find(b => b.sex === 'h');      // (birds as the game makes them, in those colours)
  const add = (breed, x) => { const id = 'c' + d.next++; d.coops.push({ ...c0, id, breed, x, eggs: 0, brood: null }); [R, H, H].forEach(t => d.birds.push({ ...JSON.parse(JSON.stringify(t)), id: 'b' + d.next++, name: 'Zed', breed, coop: id })); };
  add('sil_blue', -10); add('sil_black', -14); g.save(); }, xpAt(16));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
await p.evaluate(() => window.__farm.book()); await run(0.3);
const old = await p.evaluate(() => { const pg = [...document.querySelectorAll('.gpage')], g = window.__farm.game(), sp = document.querySelector('.gpage[data-breed="sil_splash"]');
  return { order: pg.map(x => x.dataset.breed).join(), blue: !!document.querySelector('.gpage[data-breed="sil_blue"]:not(.gpage-no)'), splash: sp && sp.innerText, waiting: g.waitingCoops().join() }; });
await p.evaluate(() => window.__farm.gameUI().close());
ok('a farm from before the new order: its Blue and Black Silkies kept, unflagged; the Blue page in the book, the Splash from the Buff or the Blue; no Blue or Grey waiting',
  !s.edited && /sil_blue/.test(s.coops) && /sil_black/.test(s.coops) && old.blue && old.order.split(',').includes('sil_blue') && !old.order.split(',').includes('sil_grey') && !old.order.split(',').includes('sil_red') && T.splash.test(old.splash) && !/sil_blue|sil_grey/.test(old.waiting), { s, old });
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

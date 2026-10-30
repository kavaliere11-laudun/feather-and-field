// Release 2 step 3 (the rare colours' own coops): node rarecooptest.mjs   (LANG=fr; W, H: the screen; SHOTS: a folder)
// A farm at level 7 with the White Silkies (their level is 5 since 30 Oct) and two Paint Silkies in the basket by the fire: Your coops lists them with
// "Their coop: 2,500 coins" (not enough coins) then "Build their coop · 2,500"; built: a rustic Pagoda in the Paint
// colours, 2,500 coins paid, its birds from the basket ("Welcome home, ... and ...!"), the basket empty. The Breed Book has
// fourteen pages (no Red since 30 Oct): the Paint Silkies found, the Lavender ones "Rare: hatched by a Black Silkie". A brood of the Paint pair:
// every chick a Paint Silkie; grown, a young hen waits for your choice (their trio's third hen), the others sold for you
// for less; kept, she joins the Paint coop ("... has joined Pagoda Coop"). A Silkie hen's card: about an egg a day. A
// reload keeps it all, unflagged; a save changed outside (the Paint coop twice, a Lavender one waiting in the Paint coop)
// is checked and flagged. No page errors.
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
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/rarecoop_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const xpAt = L => Math.round(60 * Math.pow(L - 1, 2.1)) + 5;
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const T = { no: fr ? /Leur poulailler : 2[\s  ]500 pièces/ : /Their coop: 2,500 coins/, build: fr ? /Construire leur poulailler · 2[\s  ]500/ : /Build their coop · 2,500/, home: fr ? /Bienvenue chez vous, .+ et .+ !/ : /Welcome home, .+ and .+!/,
  paint: fr ? /Poule soie pie/ : /Paint Silkie/, lav: fr ? /Rare : naît d’une Poule soie noire/ : /Rare: hatched by a Black Silkie/, cuckoo: fr ? /naît d’une Poule soie perdrix$/m : /hatched by a Partridge Silkie$/m,
  joined: fr ? /rejoint Poulailler pagode/ : /has joined Pagoda Coop/, lays: fr ? /environ un œuf par jour/ : /about an egg a day/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(L7 => { const g = window.__farm.game(); g.data.xp = L7; g.data.lvSeen = 7; g.data.coins = 1000; g.data.land = [0, 1, 2, 3, 4, 5, 6]; g.data.guide = { step: 5, done: true }; g.save(); }, xpAt(7));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.place('sil'); f.step(1 / 30, 3); }); await run(0.3);
let m = await p.evaluate(() => window.__farm.move.state());
if (!m.ok) { await p.evaluate(() => window.__farm.move.to(-33, -23, 90)); await run(0.1); }
await p.evaluate(() => window.__farm.move.place()); await run(1.5);
// two Paint Silkies in the basket (kept from the White ones' broods)
await p.evaluate(() => { const g = window.__farm.game(), now = window.__T;
  g.data.basket = [{ id: g.id('b'), name: 'Pip', sex: 'h', breed: 'sil_paint', pers: 'mum', since: now - 86400e3, exp: 200, trust: 0, happy: 0, ros: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { id: g.id('b'), name: 'Paddy', sex: 'r', breed: 'sil_paint', pers: 'brave', since: now - 86400e3, exp: 100, trust: 0, happy: 0, ros: [0, 0, 0, 0, 0, 0, 0, 0, 0] }];
  g.data.rare = []; g.save(); });
await p.evaluate(() => window.__farm.coopsSheet()); await run(0.3);
let t = await sheet();
let btn = await p.evaluate(() => { const e = document.querySelector('.gsheet .grare-build'); return e && { t: e.textContent, off: e.disabled }; });
ok('Your coops: the basket with Pip and Paddy, "Their coop: 2,500 coins" (not enough coins yet)', /Pip/.test(t) && /Paddy/.test(t) && btn && btn.off && T.no.test(btn.t), { btn, t: t.slice(0, 300) });
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 6000; g.save(); window.__farm.gameUI().close(); window.__farm.coopsSheet(); }); await run(0.3);
btn = await p.evaluate(() => { const e = document.querySelector('.gsheet .grare-build'); return e && { t: e.textContent, off: e.disabled }; });
ok('with the coins: "Build their coop · 2,500"', btn && !btn.off && T.build.test(btn.t), btn);
await shot('1_basket');
await p.evaluate(() => document.querySelector('.gsheet .grare-build').click()); await run(0.6);
m = await p.evaluate(() => window.__farm.move.state());
if (!m.ok) { await p.evaluate(() => window.__farm.move.to(-33, -23, 90)); await run(0.1); }
await p.evaluate(() => window.__farm.move.place()); await run(1.5);
const built = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'sil_paint'), P = f.coopPlots().find(q => q.line === 'sil_paint');
  return c && P && { coins: g.data.coins, basket: g.basket().length, birds: g.birdsIn(c.id).map(b => b.name).sort().join(), colours: P.birds.filter(b => b.gid).map(b => b.colour).join(), models: f.coopModels(), hint: document.getElementById('hint').textContent }; });
ok('built: a rustic Pagoda in the Paint colours, 2,500 paid, Pip and Paddy moved in from the basket, "Welcome home, ...!"',
  built && built.coins === 3500 && built.basket === 0 && built.birds === 'Paddy,Pip' && built.colours === 'paint,paint' && built.models.includes('box_sil@paint') && T.home.test(built.hint), built);
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil_paint'); f.lookAt(P.centre.x, P.centre.z, 2.6); f.step(1 / 30, 20); }); await p.waitForTimeout(300); }
await shot('2_coop');
// a Silkie hen's card: about an egg a day
await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.line === 'sil_paint'); f.openBirdCard(P.birds.find(b => b.gid && b.kind === 'hen')); }); await run(0.3);
t = await sheet();
ok('a Silkie hen\'s card: "about an egg a day"', T.lays.test(t), t.slice(0, 300));
await p.evaluate(() => window.__farm.gameUI().close());
// the Breed Book: fourteen pages
await p.evaluate(() => window.__farm.book()); await run(0.3);
const book = await p.evaluate(() => { const pg = [...document.querySelectorAll('.gpage')], one = k => { const e = document.querySelector(`.gpage[data-breed="${k}"]`); return e && { found: !e.classList.contains('gpage-no'), text: e.innerText, img: e.querySelector('img').src.split('/').pop().split('?')[0] }; };
  return { n: pg.length, paint: one('sil_paint'), lav: one('sil_lavender'), cuckoo: one('sil_cuckoo') }; });
ok('the Breed Book: fourteen pages, the Paint Silkies found (Pip and Paddy), the Lavender ones "Rare: hatched by a Black Silkie", the Cuckoo ones from the Partridge (no Grey since 30 Oct)',
  book.n === 14 && book.paint.found && /Pip/.test(book.paint.text) && book.paint.img === 'sil_paint.webp' && !book.lav.found && T.lav.test(book.lav.text) && T.cuckoo.test(book.cuckoo.text), book);
if (SHOTS) { await p.evaluate(() => document.querySelector('.gpage[data-breed="sil_paint"]').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); }
await shot('3_book');
await p.evaluate(() => window.__farm.gameUI().close());
// a brood of the Paint pair: every chick a Paint Silkie; grown: the trio's third hen waits for your choice, the others sold
const brood = await p.evaluate(() => {
  const g = window.__farm.game(), c = g.data.coops.find(x => x.breed === 'sil_paint'), hen = g.birdsIn(c.id).find(b => b.sex === 'h'), now = window.__T;
  for (let k = 0; k < 4000; k++) { const start = now - 77 * 3600e3 - k * 60e3, kids = g.kidsOf(c, { hen: hen.id, start, n: 4 }); if (kids.filter(x => x.sex === 'h').length >= 2) { c.brood = { hen: hen.id, start, n: 4, hatched: true, kids }; c.lastBrood = 0; break; } }
  const kids = c.brood.kids, coins = g.data.coins; g.broodTick(now); const n = g.data.news[g.data.news.length - 1];
  return { allPaint: kids.every(k => k.rare === 'sil_paint'), waiting: g.rareWaiting().map(w => w.sex), sold: n.kids.filter(k => k.full).map(k => [k.coins, Math.round((400 + 50 * k.stars) * 0.4)]), coins: g.data.coins - coins };
});
ok('a brood of the Paint pair: every chick Paint; grown, a young hen waits (their third hen), the others sold for you for less',
  brood.allPaint && brood.waiting.join() === 'h' && brood.sold.length === 3 && brood.sold.every(([c, want]) => c === want), brood);
await p.evaluate(() => window.__farm.game().save()); await run(0.5);
await p.evaluate(() => { const g = window.__farm.game(), w = g.rareWaiting()[0]; window.__farm.gameUI().close(); window.__farm.gameUI().rareCard(w); }); await run(0.3);
await p.evaluate(() => document.querySelector('.gsheet .grare-keep').click()); await run(0.6);
const joined = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'sil_paint'), P = f.coopPlots().find(q => q.line === 'sil_paint');
  return { birds: g.birdsIn(c.id).length, drawn: P.birds.filter(b => b.gid).length, basket: g.basket().length, hint: document.getElementById('hint').textContent }; });
ok('kept: she joins the Paint coop ("... has joined Pagoda Coop"), the trio complete', joined.birds === 3 && joined.drawn === 3 && joined.basket === 0 && T.joined.test(joined.hint), joined);
// a reload keeps it
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const again = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'sil_paint'); return { edited: g.edited, birds: c && g.birdsIn(c.id).length, models: f.coopModels() }; });
ok('a reload: the Paint coop and its trio as they were, not flagged', !again.edited && again.birds === 3 && again.models.includes('box_sil@paint'), again);
// a save changed outside
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d, c = d.coops.find(x => x.breed === 'sil_paint');
  d.coops.push({ ...c, id: 'c950', x: c.x - 8 });
  d.rare = [{ id: 'b951', line: 'sil_lavender', sex: 'h', stars: 3, coop: c.id, i: 0, mum: 'b1', t: 1 }];
  localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const ed = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, paint: g.data.coops.filter(c => c.breed === 'sil_paint').length, rare: g.rareWaiting().length }; });
ok('a save changed outside (the Paint coop twice, a Lavender one waiting in the Paint coop): checked and flagged', ed.edited && ed.paint === 1 && ed.rare === 0, ed);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

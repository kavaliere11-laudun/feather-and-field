// The game, release 1 step 8 (the Breed Book): node booktest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402; SHOTS: a folder for pictures)
// A fresh farm on a fake clock: a real tap on the farmhouse opens the Breed Book: "1 of 10 breeds found", a page for each
// breed in level order, each with its picture; the Rhode Island Reds found (the Red Barn's trio named, the rooster first),
// the others "Comes at level N" with their picture a dark silhouette; each page's eggs (colour, price, a coin more a star)
// and coop (rustic to start); "More pages to come". All in sight: nothing under the top bar, no text cut off. Your coops'
// "Breed Book" opens it too. At night a tap on the farmhouse still opens it. Level 5: the Orpingtons waiting (Place it from
// the book); placed: "2 of 10", their trio named. Names are set as text (a name with code in it shows as text); opening
// the book saves nothing.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS || '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-24T11:00:00+01:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const tag = (fr ? 'fr' : 'en') + '_' + W + 'x' + H;
const shot = async (n) => { if (!SHOTS) return; await p.evaluate(() => document.getAnimations().forEach(a => a.finish())); await p.screenshot({ path: `${SHOTS}/book_${tag}_${n}.png`, timeout: 240000 }); };
const L = fr ? { title: 'Livre des races', found: n => n === 1 ? '1 race trouvée sur 10' : n + ' races trouvées sur 10', farm: 'Dans votre ferme : ', at: n => 'Arrive au niveau ' + n, and: ' et ', price: '6 pièces l’œuf, plus une pièce par étoile de la poule',
    coop: 'Grange rouge, rustique pour commencer', more: 'D’autres pages à venir.', eggs: 'Œufs bruns', waiting: 'Leur poulailler vous attend dans Vos poulaillers', btn: '📖 Livre des races', sil: 'Poule soie blanche' }
  : { title: 'Breed Book', found: n => n + ' of 10 breeds found', farm: 'On your farm: ', at: n => 'Comes at level ' + n, and: ' and ', price: '6 coins an egg, plus a coin for each star of the hen',
    coop: 'Red Barn, rustic to start', more: 'More pages to come.', eggs: 'Brown eggs', waiting: 'Their coop is waiting for you in Your coops', btn: '📖 Breed Book', sil: 'White Silkie' };
// the book as shown: its title, the count, each page (breed, name, its lines, the picture's look and whether it loaded),
// and how it sits on the screen (the top bar, the sheet, anything wider than its box)
const book = () => p.evaluate(async () => {
  const S = document.querySelector('.gsheet'), imgs = [...S.querySelectorAll('.gpic img')];
  await Promise.all(imgs.map(i => i.decode().catch(() => null)));
  const r = S.getBoundingClientRect(), bar = document.querySelector('.gbar').getBoundingClientRect(), x = S.querySelector('.gx').getBoundingClientRect(), body = S.querySelector('.gsheet-body');
  const cut = [...S.querySelectorAll('h2, .gsub, .gcard-t, .gpage-s, .gpage-l, .gnote, .gbtn')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > r.right + 0.5).map(e => e.textContent.slice(0, 40));
  return { kind: window.__farm.gameUI().kind, title: S.querySelector('h2').textContent, sub: S.querySelector('.gsub').textContent, more: S.querySelector('.gsheet-body > .gnote:last-child').textContent,
    pages: [...S.querySelectorAll('.gpage')].map(c => ({ breed: c.dataset.breed, name: c.querySelector('.gcard-t').textContent, status: c.querySelector('.gpage-s').textContent, lines: [...c.querySelectorAll('.gpage-l')].map(l => l.textContent),
      dark: getComputedStyle(c.querySelector('.gpic img')).filter.includes('brightness(0)'), w: c.querySelector('.gpic img').naturalWidth, go: !!c.querySelector('.gpage-go'), egg: getComputedStyle(c.querySelector('.gegg-i')).backgroundColor })),
    imgs: S.querySelectorAll('img').length, sheet: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], barBottom: Math.round(bar.bottom), x: [Math.round(x.left), Math.round(x.top), Math.round(x.right)],
    wide: body.scrollWidth > body.clientWidth + 1, cut, vw: innerWidth, vh: innerHeight };
});
const inSight = k => k.sheet[0] >= 0 && k.sheet[2] <= k.vw && k.sheet[3] <= k.vh + 1 && k.sheet[1] >= k.barBottom && k.x[0] >= 0 && k.x[2] <= k.vw && k.x[1] >= k.barBottom && !k.wide && k.cut.length === 0;
// a real tap on the farmhouse: the view on it (the point up under its roof in the middle of the screen), then a touch there
const tapHouse = async () => {
  const at = await p.evaluate(() => {
    const f = window.__farm, [x, y, z] = f.farmhouseSpot(), D = Math.PI / 180, k = Math.sin(45 * D) * Math.cos(42 * D) / Math.sin(42 * D);
    f.lookAt(x - k * y, z - k * y, 3.2); f.draw(); return f.screenOf(x, z, y);
  });
  await p.touchscreen.tap(at.x, at.y); await run(0.3);
  return at;
};
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// ---- a new farm: a tap on the farmhouse
const at = await tapHouse();
let k = await book();
const trio = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return g.birdsIn(c.id).sort((a, b) => (b.sex === 'r') - (a.sex === 'r')).map(x => x.name); });
ok('a real tap on the farmhouse opens the Breed Book', k.kind === 'book' && k.title === L.title, { at, kind: k.kind, title: k.title });
ok('"1 of 10 breeds found" (the breeds and Silkie colours), a page for each in level order, each picture loaded', k.sub === L.found(1) && k.pages.map(x => x.breed).join() === 'rir,orp,sil,sil_black,leg,sil_buff,sil_blue,bra,sil_partridge,sil_grey' && k.pages.every(x => x.w === 320) && k.imgs === 10, { sub: k.sub, pages: k.pages.map(x => [x.breed, x.w]) });
const rir = k.pages[0];
ok('the Rhode Island Reds found: the Red Barn\'s trio named (the rooster first), their picture in colour', rir.status === L.farm + trio[0] + ', ' + trio[1] + L.and + trio[2] && !rir.dark && !rir.go, rir);
ok('the others not yet: "Comes at level N", a dark silhouette', k.pages.slice(1).every((x, i) => x.status === L.at([5, 6, 8, 11, 13, 15, 17, 20, 23][i]) && x.dark && !x.go), k.pages.slice(1).map(x => [x.breed, x.status, x.dark]));
ok('each page\'s eggs and coop: brown, 6 coins and a coin a star; the Red Barn, rustic to start; the Silkies\' page the white one\'s', rir.lines[0] === L.eggs + ' · ' + L.price && rir.lines[1] === L.coop && k.pages[2].name === L.sil && k.pages.every(x => x.lines.length === 2 && /\d/.test(x.lines[0])) && k.pages[3].egg !== k.pages[0].egg, k.pages.map(x => [x.name, ...x.lines, x.egg]));
ok('"More pages to come"', k.more === L.more, k.more);
ok('all in sight: the sheet under the top bar, its close button on screen, no text cut off', inSight(k), { sheet: k.sheet, bar: k.barBottom, x: k.x, wide: k.wide, cut: k.cut });
await shot('1_new');
await p.evaluate(() => { const b = document.querySelector('.gsheet-body'); b.scrollTop = b.scrollHeight; }); await shot('2_end');
await p.tap('.gsheet .gx'); await run(0.3);
const kept = await p.evaluate(() => { const f = window.__farm, before = localStorage.getItem('ff3d.farm'), closed = !f.gameUI().kind; f.book(); f.gameUI().close(); return closed && localStorage.getItem('ff3d.farm') === before; });
ok('closed with its cross; opening the book saves nothing', kept);
// ---- Your coops: "Breed Book" at its bottom
await p.tap('.gcoops'); await run(0.3);
const cb = await p.evaluate(() => { const e = document.querySelector('.gsheet .gbookbtn'), r = e && e.getBoundingClientRect(), b = document.querySelector('.gsheet-body'); if (e) b.scrollTop = b.scrollHeight; return e && { t: e.textContent, kind: window.__farm.gameUI().kind }; });
await shot('3_coops');
await p.tap('.gsheet .gbookbtn'); await run(0.3);
k = await book();
ok('Your coops: "Breed Book" at its bottom opens the book', cb && cb.kind === 'coops' && cb.t === L.btn && k.kind === 'book' && k.sub === L.found(1), { cb, kind: k.kind });
await p.tap('.gsheet .gx'); await run(0.2);
// ---- at night: a tap on the farmhouse still opens it
await p.evaluate(() => window.__farm.setHour(23.2));
await tapHouse();
k = await book();
ok('at night: a tap on the farmhouse opens the book', k.kind === 'book' && k.sub === L.found(1), k.kind);
await shot('4_night');
await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.setHour(undefined); });
// ---- level 5 (four fields): the Orpingtons waiting, placed from the book
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 1110; g.data.lvSeen = 5; g.data.coins = 3000; g.data.land = [0, 1, 2, 3]; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => window.__farm.book()); await run(0.3);
k = await book();
ok('level 5: the Orpingtons waiting in Your coops ("Place it"), still a silhouette, the Silkies at level 6', k.sub === L.found(1) && k.pages[1].status === L.waiting && k.pages[1].go && k.pages[1].dark && k.pages[2].status === L.at(6), k.pages.slice(1, 3));
ok('level 5: all in sight', inSight(k), { sheet: k.sheet, cut: k.cut });
await p.evaluate(() => { const c = document.querySelector('.gpage[data-breed="orp"]'); c.scrollIntoView({ block: 'center' }); });
await shot('5_waiting');
await p.tap('.gpage[data-breed="orp"] .gpage-go'); await run(0.6);
let m = await p.evaluate(() => window.__farm.move.state());
ok('"Place it" from the book: the coop to put down', m.on && (await p.evaluate(() => window.__farm.gameUI().kind)) === null, m);
if (!m.ok) { await p.evaluate(() => window.__farm.move.to(-33, -23, 90)); await run(0.1); }
await p.evaluate(() => window.__farm.move.place()); await run(1.5);
const orp = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops.find(x => x.breed === 'orp'); return c && g.birdsIn(c.id).sort((a, b) => (b.sex === 'r') - (a.sex === 'r')).map(x => x.name); });
await p.evaluate(() => window.__farm.book()); await run(0.3);
k = await book();
ok('placed: "2 of 10", the Orpingtons found, their trio named, in colour', orp && orp.length === 3 && k.sub === L.found(2) && k.pages[1].status === L.farm + orp[0] + ', ' + orp[1] + L.and + orp[2] && !k.pages[1].dark && !k.pages[1].go && k.pages.slice(2).every(x => x.dark), { orp, sub: k.sub, page: k.pages[1] });
await shot('6_two');
// ---- names are set as text: a name with code in it (as if it got past the checks) shows as text
const safe = await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.birds[0].name = '<img src=x onerror="window.__hacked=1">Zed'; f.book(); const S = document.querySelector('.gsheet');
  return { imgs: S.querySelectorAll('img').length, shown: S.querySelector('.gpage-s').textContent.includes('<img'), hacked: !!window.__hacked }; });
await run(0.2);
ok('names are set as text, never as HTML', safe.imgs === 10 && safe.shown && !safe.hacked && !(await p.evaluate(() => !!window.__hacked)), safe);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

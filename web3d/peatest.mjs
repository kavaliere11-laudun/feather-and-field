// The peafowl in the game (31 Oct 2026, Audrey: "Indian blue (Recommended)", "Peacock + 2 peahens (Recommended)", "Garden
// pavilion (Recommended)"; at level 30): node peatest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402; SHOTS: a folder)
// A farm at level 29: Your coops says what level 30 brings (the peafowl). Level 30: its card says a new breed has come,
// "Place their coop now": the rustic Garden Pavilion with its trio (the peacock first, with his train) in their pen, their
// game names over them; a tap on a peahen: her card ("Indian Blue peafowl · Peahen", "her peachicks"); on the peacock: his
// ("Peacock"); Cuddle the peacock: the farmer comes and crouches by him and strokes him where he stands (never picked up:
// his train), his hand on his back (measured on the drawn farmer and bird), hearts; a peahen: picked up and held as a hen is; her lay when it's due: the egg in the save; the feeder's
// card speaks of peahens; the Breed Book: the peafowl's page found with its picture; the shows take no peafowl; a brood:
// peachicks round their mother (a peachick's card), then young peahens and peacocks (a young peacock is a peahen to look
// at, no train yet); the Snug look: the pen made again round the same three; at night the peacock up on his perch, the
// peahens in bed; a reload keeps it all unflagged; a pea coop at level 29, put in from outside: flagged. No page errors.
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
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/pea_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const look = async (size = 2.6, dx = 0, dz = 0) => { if (SHOTS) { await p.evaluate(([s, dx, dz]) => { const f = window.__farm, Q = f.gamePlots().find(q => q.breed === 'pea'); f.lookAt(Q.centre.x + dx, Q.centre.z + dz, s); f.step(1 / 30, 20); }, [size, dx, dz]); await p.waitForTimeout(300); } };
const xpAt = L => Math.round(60 * Math.pow(L - 1, 2.1)) + 5;
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(); return { level: g.level, waiting: g.waitingCoops().join(), coops: g.data.coops.map(c => c.breed).join(), birds: g.data.birds.length, card: f.gameUI().kind, edited: g.edited, move: f.move.state().on }; });
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const PI = () => p.evaluate(() => window.__farm.gamePlots().findIndex(q => q.breed === 'pea'));
const pen = () => p.evaluate(() => { const f = window.__farm, g = f.game(), i = f.gamePlots().findIndex(q => q.breed === 'pea'), P = f.gamePlots()[i]; if (!P) return null;
  const c = g.data.coops.find(x => x.breed === 'pea');
  return { i, birds: P.birds.filter(x => !x.gameChick && !x.young).map(x => ({ kind: x.kind, name: x.name, gid: x.gid, game: (g.bird(x.gid) || {}).name, train: !!x.train, model: x.rig.model, seen: x.root.visible })), eggs: c && c.eggs, tier: c && c.tier, house: f.coopLook(i).house };
});
// the farmer's task, down to the step he's on
const doing = () => p.evaluate(() => { const L = window.__farm.farmer(); const n = []; let t = L && L.task; while (t) { n.push(t.name); t = t.list ? t.list[t.i] : null; } return n.join('/'); });
const T = { next: fr ? /Au niveau 30 : Paon bleu/ : /At level 30: Indian Blue peafowl/, breed: fr ? /Nouvelle race : Paon bleu/ : /New breed: Indian Blue peafowl/, place: fr ? /Installer leur poulailler/ : /Place their coop now/,
  welcome: fr ? /Bienvenue, .+ et .+ !/ : /Welcome, .+ and .+!/, hen: fr ? /Paon bleu · Paonne/ : /Indian Blue peafowl · Peahen/, cock: fr ? /Paon bleu · Paon/ : /Indian Blue peafowl · Peacock/,
  chicks: fr ? /ses paonneaux/ : /her peachicks/, feed: fr ? /Vos paonnes pondent/ : /Your peahens lay/,
  coop: fr ? /Pavillon de jardin/ : /Garden Pavilion/, egg: fr ? /Gros œufs de paonne crème/ : /Big cream peafowl eggs/, chick: fr ? /paonneau de/ : /’s peachick/, young: fr ? /Jeune pa(on|onne)/ : /Young pea(hen|cock)/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 29, all its fields
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.lvSeen = 29; g.data.coins = 50000; g.data.land = Array.from({ length: 29 }, (_, i) => i); g.data.guide = { step: 5, done: true }; g.save(); }, xpAt(29));
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
await p.tap('.gcoops'); await run(0.3);
let t = await sheet();
ok('level 29, Your coops: what level 30 brings, the peafowl', T.next.test(t), t.slice(-300));
await p.evaluate(() => window.__farm.gameUI().close());
// level 30: its card, then "Place their coop now"
await p.evaluate(L => { const g = window.__farm.game(); g.data.xp = L; g.data.land.push(29); g.save(); }, xpAt(30)); await run(1.6);
let s = await st(); t = await sheet();
await shot('1_level30');
ok('level 30: its card says a new breed has come (the peafowl), "Place their coop now"', s.level === 30 && s.card === 'levelup' && T.breed.test(t) && T.place.test(t), { s, t: t.slice(0, 300) });
await p.tap('.gsheet .gstick .gbtn:first-child'); await run(0.6);
let m = await p.evaluate(() => window.__farm.move.state());
if (!m.ok) m = await p.evaluate(() => { const f = window.__farm; for (const deg of [90, 0]) for (let x = -40; x <= 40; x += 3) for (let z = -40; z <= 40; z += 3) { f.move.to(x, z, deg); const s = f.move.state(); if (s.ok) return s; } return f.move.state(); });
await p.tap('.gmove-go'); await run(1.5);
s = await st();
let P = await pen();
const hint = await p.evaluate(() => document.getElementById('hint').textContent);
ok('placed: the rustic Garden Pavilion with its trio in their pen, the peacock first with his train, their game names', !s.move && /pea/.test(s.coops) && P && P.birds.length === 3 && P.birds.map(x => x.kind + (x.train ? '+train' : '')).join() === 'rooster+train,hen,hen' && P.birds.every(x => x.gid && x.name === x.game) && P.house === 'box_pea' && P.tier === 0 && T.welcome.test(hint), { s, P, hint });
await run(20);
await look(2.6);
await shot('2_pen');
// a tap on a peahen: her card; on the peacock: his
const tapOn = async kind => {
  const at = await p.evaluate(kind => { const f = window.__farm, Q = f.gamePlots().find(q => q.breed === 'pea'), x = Q.birds.find(y => y.kind === kind && !y.gameChick && !y.young);
    x.wait = 1e9; x.route = null; x.act = null; x.target.copy(x.root.position);
    const w = x.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 1.8); f.step(1 / 30, 20); f.draw(); const v = x.root.getWorldPosition(new f.THREE.Vector3()); const q = f.screenOf(v.x, v.z, v.y + x.rig.scale * 0.45); return { x: q.x, y: q.y, gid: x.gid }; }, kind);
  await p.touchscreen.tap(at.x, at.y); await run(0.6);
  return { gid: at.gid, card: await p.evaluate(() => window.__farm.gameUI().kind), t: await sheet() };
};
const hen = await tapOn('hen');
await shot('3_peahen_card');
ok('a tap on a peahen: her card ("Indian Blue peafowl · Peahen", her peachicks)', hen.card === 'bird' && T.hen.test(hen.t) && T.chicks.test(hen.t), { card: hen.card, t: hen.t.slice(0, 400) });
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.3);
const cock = await tapOn('rooster');
await shot('4_peacock_card');
ok('a tap on the peacock: his card ("Indian Blue peafowl · Peacock")', cock.card === 'bird' && T.cock.test(cock.t) && !T.hen.test(cock.t), { card: cock.card, t: cock.t.slice(0, 400) });
// Cuddle the peacock: the farmer comes, crouches by him and strokes him where he stands (never lifted), hearts
await p.tap('.gsheet .gcuddle'); await run(0.4);
const seen = new Set(), touch = []; let lifted = 0, happy = false, closest = 9;
// (the farmer's right hand as drawn, its lowest point, against the top of the peacock's back under it, as drawn: Audrey, "the
// farmer doesn't touch the peacock"; where on him: along his back from his middle, and to the side)
const handOn = gid => p.evaluate(gid => { const f = window.__farm, T = f.THREE, L = f.farmer(), Q = f.gamePlots().find(q => q.breed === 'pea'), x = Q.birds.find(y => y.gid === gid), v = new T.Vector3();
  const M = L.f.rig.mesh, hi = M.skeleton.bones.indexOf(L.f.rig.B.handR), g = M.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight; let lo = 9, n = 0; const c = new T.Vector3(); M.updateMatrixWorld(); M.skeleton.update();
  for (let i = 0; i < si.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hi) w += sw.getComponent(i, k); if (w < 0.5) continue; M.getVertexPosition(i, v); v.applyMatrix4(M.matrixWorld); lo = Math.min(lo, v.y); c.add(v); n++; }
  c.multiplyScalar(1 / Math.max(1, n)); let top = -9;
  x.root.traverse(m => { if (!m.isSkinnedMesh || !m.visible) return; m.updateMatrixWorld(); m.skeleton.update(); const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); if (Math.hypot(v.x - c.x, v.z - c.z) < 0.035) top = Math.max(top, v.y); } });
  const R = x.root.getWorldPosition(new T.Vector3()), fv = new T.Vector3(0, 0, 1).applyQuaternion(x.root.getWorldQuaternion(new T.Quaternion())), dx = c.x - R.x, dz = c.z - R.z, r = q => +q.toFixed(3);
  return { gap: r(lo - top), along: r(dx * fv.x + dz * fv.z), lat: r(-dx * fv.z + dz * fv.x) }; }, gid);
for (let k = 0; k < 60; k++) {
  await run(0.5);
  const q = await p.evaluate(gid => { const f = window.__farm, g = f.game(), Q = f.gamePlots().find(q => q.breed === 'pea'), x = Q.birds.find(y => y.gid === gid), L = f.farmer();
    const others = Q.birds.filter(y => y !== x && y.root.visible).map(y => { const w = y.root.getWorldPosition(new f.THREE.Vector3()); return Math.hypot(w.x - L.pos.x, w.z - L.pos.z); });
    return { carry: !!(x.cuddle && x.cuddle.carry), y: x.root.position.y, happy: g.happyLeft(g.bird(gid)) > 0, others: Math.min(9, ...others) }; }, cock.gid);
  const d = await doing(); for (const n of d.split('/')) seen.add(n);
  if (d.endsWith('stroke')) { closest = Math.min(closest, q.others); touch.push(await handOn(cock.gid)); }
  if (q.carry) lifted++;
  happy = q.happy;
  if (seen.has('stroke') && k === [...seen].length) { /* */ }
  if (SHOTS && d.endsWith('stroke') && !seen.has('_shot')) { seen.add('_shot'); const w = await p.evaluate(gid => { const f = window.__farm, Q = f.gamePlots().find(q => q.breed === 'pea'), x = Q.birds.find(y => y.gid === gid); const v = x.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(v.x, v.z, 1.6); f.step(1 / 30, 1); return 1; }, cock.gid); await p.waitForTimeout(200); await shot('5_stroke'); }
  if (seen.has('stroke') && !d.includes('stroke') && !d.includes('cuddling')) break;
}
ok('Cuddle the peacock: the farmer comes, crouches and strokes him where he stands (never picked up), the cuddle counted, the peahens giving them room', seen.has('stroke') && !seen.has('hug') && lifted === 0 && happy && closest > 0.6, { seen: [...seen], lifted, happy, closest: +closest.toFixed(2) });
ok('…his hand on the peacock\'s back as he strokes him (within 4 cm of his feathers, along the middle of his back)', touch.length >= 3 && touch.every(h => Math.abs(h.gap) < 0.04 && h.along > -0.26 && h.along < 0.06 && Math.abs(h.lat) < 0.09), touch);
// a peahen: picked up and held, as a hen is
await run(4);
const hen2 = await tapOn('hen');
await p.tap('.gsheet .gcuddle'); await run(0.4);
const seen2 = new Set(); let held = 0;
for (let k = 0; k < 60; k++) {
  await run(0.5);
  const q = await p.evaluate(gid => { const f = window.__farm, Q = f.gamePlots().find(q => q.breed === 'pea'), x = Q.birds.find(y => y.gid === gid); return { carry: x.cuddle && x.cuddle.carry && x.cuddle.carry.k }; }, hen2.gid);
  const d = await doing(); for (const n of d.split('/')) seen2.add(n);
  if (q.carry > 0.95) held++;
  if (SHOTS && d.endsWith('hug') && !seen2.has('_shot')) { seen2.add('_shot'); await p.evaluate(gid => { const f = window.__farm, L = f.farmer(); f.lookAt(L.pos.x, L.pos.z, 1.6); f.step(1 / 30, 1); return 1; }, hen2.gid); await p.waitForTimeout(200); await shot('6_hug'); }
  if (seen2.has('hug') && !d.includes('cuddling')) break;
}
ok('Cuddle a peahen: picked up and held in his arms, set down again', seen2.has('hug') && held > 2, { seen: [...seen2], held });
await run(8);
// her lay when it's due: the egg in the save and in the nest
const layer = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'pea'), h = g.birdsIn(c.id).find(x => x.sex === 'h'); g.data.first = { hen: h.id, t: window.__T - 500 }; g.save(); return h.id; });
let went = false, eggs = 0;
for (let k = 0; k < 40; k++) {
  await run(2);
  const q = await p.evaluate(gid => { const f = window.__farm, Q = f.gamePlots().find(q => q.breed === 'pea'), x = Q.birds.find(y => y.gid === gid); return { laying: !!x.laying, eggs: f.game().data.coops.find(c => c.breed === 'pea').eggs }; }, layer);
  if (q.laying) went = true; eggs = q.eggs;
  if (q.eggs > 0 && went) break;
}
ok('her lay when it\'s due: she goes in to lay, the egg in the save', went && eggs === 1, { went, eggs });
// the feeder's card
await p.evaluate(() => { const f = window.__farm; f.feederCard(f.gamePlots().findIndex(q => q.breed === 'pea')); }); await run(0.3);
t = await sheet();
ok('the feeder\'s card: "Your peahens lay while there\'s food in it"', T.feed.test(t), t.slice(0, 300));
await p.evaluate(() => window.__farm.gameUI().close());
// the Breed Book
await p.evaluate(() => window.__farm.book()); await run(0.3);
await p.waitForFunction(() => { const i = document.querySelector('.gpage[data-breed="pea"] img'); return i && i.complete; }, null, { timeout: 20000 }).catch(() => {});
const book = await p.evaluate(() => { const pg = [...document.querySelectorAll('.gpage')], c = document.querySelector('.gpage[data-breed="pea"]'); return { n: pg.length, order: pg.map(x => x.dataset.breed).join(), found: c && !c.classList.contains('gpage-no'), text: c && c.innerText, img: c && c.querySelector('img').naturalWidth }; });
if (SHOTS) { await p.evaluate(() => document.querySelector('.gpage[data-breed="pea"]').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); }
await shot('7_book');
ok('the Breed Book: the peafowl\'s page after the Black Silkies, found, with their eggs, their Garden Pavilion and their picture', book.n === 16 && /,sil_black,pea,/.test(book.order) && book.found && T.egg.test(book.text) && T.coop.test(book.text) && book.img > 0, book);
await p.evaluate(() => window.__farm.gameUI().close());
// the shows take no peafowl
const shows = await p.evaluate(() => { const g = window.__farm.game(), s = { id: 'c20261026', tier: 'c', breed: null, locked: false }; return g.showBirds(s).some(x => x.b.breed === 'pea'); });
ok('the shows take no peafowl', !shows);
// the Snug look: the pen made again round the same three
const before = P.birds.map(x => x.gid).join();
await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops.find(x => x.breed === 'pea'); c.tier = 2; g.save(); f.retier(f.gamePlots().findIndex(q => q.breed === 'pea')); }); await run(3);
P = await pen();
ok('the Snug look: the Garden Pavilion under its turquoise dome, the pen made again round the same three', P.house === 'house_pea' && P.birds.map(x => x.gid).join() === before, P);
await run(10);
await look(2.6);
await shot('8_snug');
// a brood: peachicks round their mother, then young peahens and peacocks
const SIT = 24 * 3600e3, YOUNG = 24 * 3600e3;
const brood = async ago => { await p.evaluate(ago => { const g = window.__farm.game(), c = g.data.coops.find(x => x.breed === 'pea'), h = g.birdsIn(c.id).find(x => x.sex === 'h'); c.eggs = 0; c.brood = { hen: h.id, start: window.__T - ago, n: 4, hatched: true }; c.brood.kids = g.kidsOf(c, c.brood); g.save(); }, ago);
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load(); await p.evaluate(() => { const f = window.__farm; if (f.gameUI().kind) f.gameUI().close(); }); await run(3); };
await brood(SIT + 2 * 3600e3);
const ch = await p.evaluate(() => { const f = window.__farm, i = f.gamePlots().findIndex(q => q.breed === 'pea'), Q = f.gamePlots()[i], c = f.game().data.coops.find(x => x.breed === 'pea'), m = Q.birds.find(x => x.gid === c.brood.hen);
  const kids = Q.birds.filter(x => x.gameChick); const k = kids[0]; if (k) f.chickCard(k);
  return { n: kids.length, models: [...new Set(kids.map(x => x.rig.model))], near: kids.map(x => +x.root.position.distanceTo(m.root.position).toFixed(2)), card: document.querySelector('.gsheet').innerText, youngs: f.youngs(i) }; });
await shot('9_chick_card');
ok('a brood: peachicks round their mother; a peachick\'s card', ch.n === 4 && ch.models.join() === 'chick' && ch.near.every(d => d < 1.6) && T.chick.test(ch.card), ch);
await p.evaluate(() => window.__farm.gameUI().close());
await run(2);
await look(1.9);
await shot('10_peachicks');
await brood(SIT + YOUNG + 2 * 3600e3);
const yg = await p.evaluate(() => { const f = window.__farm, i = f.gamePlots().findIndex(q => q.breed === 'pea'), Q = f.gamePlots()[i];
  const ys = Q.birds.filter(x => x.young); const r = ys.find(x => x.young === 'r') || ys[0]; if (r) f.chickCard(r);
  return { youngs: f.youngs(i), kinds: ys.map(x => x.young + ':' + x.kind + ':' + x.rig.model + (x.train ? '+train' : '')), card: document.querySelector('.gsheet').innerText }; });
await shot('11_young_card');
ok('a day on: young peahens and peacocks (a young peacock a peahen to look at, no train yet); a young one\'s card', yg.youngs.length === 4 && yg.kinds.every(k => /^[hr]:hen:pea_h(_lo)?$/.test(k)) && T.young.test(yg.card), yg);
await p.evaluate(() => window.__farm.gameUI().close());
await run(2);
await look(2.2);
await shot('12_young');
// no brood again (the farewell is the hens')
await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops.find(x => x.breed === 'pea'); c.brood = null; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load(); await p.evaluate(() => { const f = window.__farm; if (f.gameUI().kind) f.gameUI().close(); });
// at night: the peacock up on his perch, his train hanging; the peahens in bed
const night = await p.evaluate(() => {
  const f = window.__farm; f.gameUI().close(); f.setHour(23.0);
  const Q = f.gamePlots().find(q => q.breed === 'pea'), cock = Q.birds.find(x => x.train), hens = Q.birds.filter(x => !x.train);
  for (let k = 0; k < 900 && !(cock.perched && hens.every(x => x.asleep)); k++) f.step(1 / 30, 3);
  return { perched: !!cock.perched, y: +cock.root.position.y.toFixed(2), hang: +(cock.A.hang || 0).toFixed(2), hens: hens.map(x => !!x.asleep) };
});
await look(2.4);
await shot('13_night');
ok('at night: the peacock up on his perch, his train hanging down; the peahens in bed', night.perched && night.y > 0.8 && night.hang > 0.8 && night.hens.every(Boolean), night);
// a reload keeps it all, unflagged
await p.evaluate(() => window.__farm.setHour(11));
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
s = await st(); P = await pen();
ok('a reload: the peafowl\'s coop, its three and its egg, not flagged', /pea/.test(s.coops) && P && P.birds.length === 3 && P.birds.map(x => x.gid).join() === before && !s.edited, { s, P });
// a pea coop at level 29, put in from outside: flagged
await p.evaluate(L => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = L; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); }, xpAt(29));
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
s = await st();
ok('a pea coop at level 29, put in from outside: checked and flagged', s.edited, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

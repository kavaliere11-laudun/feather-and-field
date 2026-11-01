// The full play-through (1 Nov 2026, Audrey: "Full play through please. Pay extra attention to the details of the graphics,
// I want things to look good and properly made"): node farmtour.mjs OUT   (LANG=fr; W, H: the screen, 874x402 the phone
// on its side; PORT; PHASES=start,grow,tour,night,ui (any of them; grow builds the farm the others look at, kept in the
// browser's storage between phases in one run))
// start: a new farm as a player gets it: the welcome, the four first-day pictures, the guide's first card, the farm at
// level 1, the Red Barn close, a hen's card. grow: level by level to 30 as a player goes: each level's card (a picture at
// some), the next field bought, each new breed's coop placed where the game suggests (a picture of it), the decorations,
// the geese and the dog bought as they come, the coops' looks bought, the wheat sown. tour: the finished farm: from far,
// in quarters, each coop at the usual zoom and at the closest, the farmhouse, the pond, the dog, the decorations, the
// wheat, the view turned round. night: the evening, the night, a coop at night and inside it, the morning. ui: the cards
// and sheets (Your coops, a bird of each breed, the shop's tabs, the Breed Book, shows, jobs, Settings, the level). Each
// picture OUT/<n>_<name>.jpg; then OUT/index.html of them all. Prints what it did and any page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/farmtour';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), PH = (process.env.PHASES || 'start,grow,tour,night,ui').split(',');
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-11-02T10:30:00Z').getTime();
// (FARM: a file keeping the grown farm: written after grow, read back when grow isn't asked for, so the tour can be run again)
const FARM = process.env.FARM, RESTORE = FARM && fs.existsSync(FARM) && !PH.includes('grow') && !PH.includes('start');
if (RESTORE) await ctx.addInitScript(d => { if (!sessionStorage.getItem('__restored')) { for (const [k, v] of Object.entries(d.ls)) localStorage.setItem(k, v); sessionStorage.setItem('__restored', '1'); sessionStorage.setItem('__T', String(d.T)); } }, JSON.parse(fs.readFileSync(FARM, 'utf8')));
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
const log = (...a) => console.log(...a);
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 240000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2000); await run(0.5);
};
let n = 0; const shots = [];
const shot = async (name, note = '') => {
  await p.evaluate(() => window.__farm.draw());
  const file = `${String(++n).padStart(3, '0')}_${name}.jpg`;
  await p.screenshot({ path: `${OUT}/${file}`, type: 'jpeg', quality: 88, timeout: 240000 });
  shots.push([file, note]); log('shot', file, note);
};
const kind = () => p.evaluate(() => window.__farm.gameUI().kind);
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const look = async (x, z, size, secs = 0.6) => { await p.evaluate(([x, z, s]) => window.__farm.lookAt(x, z, s), [x, z, size]); await run(secs); };
const lookPlot = async (i, size, dx = 0, dz = 0) => { const c = await p.evaluate(i => { const P = window.__farm.gamePlots()[i]; return [P.centre.x, P.centre.z]; }, i); await look(c[0] + dx, c[1] + dz, size); };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&firstday`;
const xpFor = L => L <= 1 ? 0 : Math.round(60 * Math.pow(L - 1, 2.1));

await p.goto(RESTORE ? URL.replace('&firstday', '') : URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
if (RESTORE) {
  await load(); await close();
  if (await p.evaluate(fr => window.__farm.game().data.lang !== (fr ? 'fr' : 'en'), fr)) {      // (the farm in this run's language)
    await p.evaluate(fr => { const g = window.__farm.game(); g.data.lang = fr ? 'fr' : 'en'; g.save(); }, fr);
    await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load(); await close();
  }
  log('the grown farm restored, level', await p.evaluate(() => window.__farm.game().level), 'in', await p.evaluate(() => window.__farm.game().lang));
}
else await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
// ---------------------------------------------------------------- start
if (PH.includes('start')) {
  await p.waitForTimeout(3000);
  await shot('welcome', 'the welcome over the loading farm');
  await p.tap('.gsheet .gbtn');
  await load();
  for (let i = 0; i < 4; i++) {
    await p.waitForFunction(() => { const i = document.querySelector('.gintro-pic img'); return i && i.complete; }, null, { timeout: 20000 }).catch(() => {});
    await shot('intro' + (i + 1), 'first-day picture ' + (i + 1));
    await p.evaluate(() => document.querySelector('.gstick .gbtn').click()); await run(0.3);
  }
  await run(0.5);
  await shot('guide', 'the guide\'s first card, the farm at level 1');
  await p.evaluate(() => { const s = document.querySelector('.gguide-skip'); if (s) s.click(); }); await run(0.5);
  await lookPlot(0, 2.9); await shot('barn', 'the Red Barn, the usual view');
  await lookPlot(0, 1.4); await shot('barn_close', 'the Red Barn, closest');
  await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[0], h = P.birds.find(x => x.kind === 'hen'); f.openBirdCard(h); }); await run(0.4);
  await shot('hencard', 'a hen\'s card');
  await close();
} else if (!RESTORE) {
  await p.tap('.gsheet .gbtn'); await load();
  await p.evaluate(() => { const s = document.querySelector('.gstick .gbtn.galt'); if (s) s.click(); }); await run(0.3);
  await p.evaluate(() => { const s = document.querySelector('.gguide-skip'); if (s) s.click(); }); await run(0.3);
}
// ---------------------------------------------------------------- grow
const SHOW_LEVELS = new Set([2, 3, 4, 5, 10, 30]);
const DEC = { flowers: 3, birdbath: 4, beehives: 6, duckhouse: 8, greenhouse: 10, windmill: 13, bandstand: 16, statue: 20 };
const TIERS = { rir: 4, orp: 3, sil: 2, aya: 1, call: 3, sil_buff: 4, leg: 2, pol: 3, sil_partridge: 1, bra: 4, sil_black: 0, pea: 0 };
async function placeWaiting(L) {
  const w = await p.evaluate(() => window.__farm.game().waitingCoops());
  for (const breed of w) {
    await p.evaluate(b => window.__farm.place(b), breed); await run(0.4);
    let m = await p.evaluate(() => window.__farm.move.state());
    if (!m.ok) m = await p.evaluate(() => { const f = window.__farm; const a = f.move.state().at; for (let r = 1; r < 40; r += 1) for (let k = 0; k < 16; k++) for (const deg of [0, 90]) { f.move.to(a.x + r * Math.cos(k * Math.PI / 8), a.z + r * Math.sin(k * Math.PI / 8), deg); if (f.move.state().ok) return f.move.state(); } return f.move.state(); });
    if (!m.ok) { log('NO SPOT for', breed, m.why); await p.evaluate(() => window.__farm.move.cancel()); continue; }
    await p.evaluate(() => document.querySelector('.gmove-go').click()); await run(0.5);
    if ((await p.evaluate(() => window.__farm.move.state())).on) {      // (its gate shut in where the game suggested it: somewhere else, as a player would drag it)
      log('level', L, breed, 'not placed where suggested:', (await p.evaluate(() => window.__farm.move.state())).why);
      await p.evaluate(() => { const f = window.__farm, a = f.move.state().at; for (let r = 1; r < 40; r += 1) for (let k = 0; k < 16; k++) for (const deg of [0, 90]) { f.move.to(a.x + r * Math.cos(k * Math.PI / 8), a.z + r * Math.sin(k * Math.PI / 8), deg); if (f.move.state().ok && f.move.place()) return; } });
    }
    await run(1.5);
    let i = -1; for (let k = 0; k < 4 && i < 0; k++) { i = await p.evaluate(b => window.__farm.gamePlots().findIndex(q => q.breed === b || (q.gc && q.gc.breed === b)), breed); if (i < 0) await run(0.5); }
    log('level', L, 'placed', breed, 'as plot', i);
    if (PH.includes('grow') && i >= 0) { await lookPlot(i, 2.9); await shot('placed_' + breed, `level ${L}: the new coop placed where the game suggested (${breed})`); }
  }
}
async function buyDecor(id, L) {
  const ok = await p.evaluate(id => window.__farm.deco.buy(id), id); await run(0.4);
  if (!ok) { log('could not buy', id); return; }
  if (id === 'duckhouse') { log('level', L, 'bought', id); return; }
  let s = await p.evaluate(() => window.__farm.deco.state());
  if (!s.ok) s = await p.evaluate(id => { const f = window.__farm, a = f.deco.state().at; const q = f.deco.free(id, a.x, a.z); if (q) f.deco.to(q.x, q.z); return f.deco.state(); }, id);
  if (!s.ok) { log('NO SPOT for', id, s.why); await p.evaluate(() => window.__farm.deco.cancel()); return; }
  await p.evaluate(() => window.__farm.deco.place()); await run(1);
  log('level', L, 'bought', id);
}
if (!RESTORE && (PH.includes('grow') || PH.some(x => ['tour', 'night', 'ui'].includes(x)))) {
  for (let L = 2; L <= 30; L++) {
    await p.evaluate(([xp, L]) => { const g = window.__farm.game(); g.data.xp = xp; g.data.coins = Math.max(g.data.coins, 2000000); g.save(); }, [xpFor(L), L]);
    await run(0.4);
    if ((await kind()) === 'levelup' && PH.includes('grow') && SHOW_LEVELS.has(L)) await shot('level' + L, `level ${L}'s card`);
    await close(); await run(0.2);
    const land = await p.evaluate(() => window.__farm.land().sale);
    if (land !== null && land !== undefined) { await p.evaluate(() => window.__farm.buyLand()); await run(0.6); }
    await placeWaiting(L);
    for (const [id, lv] of Object.entries(DEC)) if (lv === L) await buyDecor(id, L);
    if (L === 4) { await p.evaluate(() => window.__farm.animal.buy('geese')); await run(1); log('level 4: the geese'); }
    if (L === 9) {
      await p.evaluate(() => window.__farm.animal.buy('dog')); await run(0.4);
      let s = await p.evaluate(() => window.__farm.deco.state());
      if (!s.ok) s = await p.evaluate(() => { const f = window.__farm, a = f.deco.state().at; const q = f.deco.free('kennel', a.x, a.z); if (q) f.deco.to(q.x, q.z); return f.deco.state(); });
      await p.evaluate(() => window.__farm.deco.place()); await run(1);
      if (PH.includes('grow') && await p.evaluate(() => !document.getElementById('dogname').hidden)) await shot('dogname', 'level 9: the dog bought, his name');
      await p.evaluate(() => { const b = document.getElementById('dogname-save'); if (b && !document.getElementById('dogname').hidden) b.click(); }); await run(0.6); await close();
      log('level 9: the dog');
    }
    if (L === 2) { await p.evaluate(() => window.__farm.deco.wheat.sow()); await run(0.5); }
    // the coops' looks, as a player buys them over time: a step at a time, a level or two after each coop came
    const ups = await p.evaluate(T => { const f = window.__farm, out = []; f.gamePlots().forEach((q, i) => { const want = T[q.gc.breed] ?? 1; if ((q.gc.tier || 0) < want) { const r = f.upgrade(i); out.push(q.gc.breed + ':' + r); } }); return out; }, TIERS);
    if (ups.length) { await run(0.6); log('level', L, 'looks', ups.join(' ')); }
  }
  const plots = await p.evaluate(() => window.__farm.gamePlots().map(q => q.gc.breed + '_t' + q.gc.tier));
  await p.evaluate(() => window.__farm.game().save());
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
  await close();
  log('farm at level', await p.evaluate(() => window.__farm.game().level), 'coops', plots.join(','));
  if (FARM) fs.writeFileSync(FARM, await p.evaluate(() => JSON.stringify({ ls: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])), T: window.__T })));
}
// ---------------------------------------------------------------- tour
const farmBox = () => p.evaluate(() => { const f = window.__farm, P = f.gamePlots(); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of P) { x0 = Math.min(x0, q.centre.x); x1 = Math.max(x1, q.centre.x); z0 = Math.min(z0, q.centre.z); z1 = Math.max(z1, q.centre.z); } return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 }; });
if (PH.includes('tour')) {
  await p.evaluate(() => window.__farm.setHour(10.5)); await run(0.5);
  const B = await farmBox();
  await look(B.cx, B.cz, 9); await shot('farm_far', 'the whole farm, zoomed right out');
  for (const [k, dx, dz] of [['nw', -1, -1], ['ne', 1, -1], ['sw', -1, 1], ['se', 1, 1]]) { await look(B.cx + dx * (B.x1 - B.x0) / 4, B.cz + dz * (B.z1 - B.z0) / 4, 4.4); await shot('farm_' + k, 'a quarter of the farm, the usual zoom'); }
  const P = await p.evaluate(() => window.__farm.gamePlots().map(q => q.gc.breed + '_t' + q.gc.tier));
  for (let i = 0; i < P.length; i++) { await lookPlot(i, 2.6); await shot('coop_' + P[i], 'a coop, the usual zoom'); await lookPlot(i, 1.4); await shot('coop_' + P[i] + '_close', 'a coop, closest'); }
  // the farmhouse, the pond, the dog, the decorations, the wheat
  const spots = await p.evaluate(() => { const f = window.__farm, o = []; const fh = f.farmhouseSpot(); o.push(['farmhouse', fh[0], fh[2]]);
    const g = f.game(); for (const d of g.data.decor || []) if (d.x !== undefined && d.x !== null) o.push(['decor_' + d.id, d.x, d.z]);
    const W = (g.data.decor || []).find(d => d.id === 'wheat') || g.data.wheat; if (W && W.x !== undefined) o.push(['wheat', W.x, W.z]);
    const K = g.data.animals && g.data.animals.dog; if (K) o.push(['kennel_dog', K.x, K.z]);
    return o; });
  for (const [k, x, z] of spots) { await look(x, z, 2.2); await shot(k, k.replace('_', ' ')); await look(x, z, 1.4); await shot(k + '_close', k.replace('_', ' ') + ', closest'); }
  // the view turned round
  for (const deg of [90, 180, 270]) { await p.evaluate(d => window.__farm.setViewAz(d + 45), deg); await look(B.cx, B.cz, 5.5); await shot('turned' + deg, 'the view turned ' + deg + ' degrees'); }
  await p.evaluate(() => window.__farm.setViewAz(45)); await run(0.3);
}
// ---------------------------------------------------------------- night
if (PH.includes('night')) {
  const B = await farmBox();
  for (const [h, k] of [[19.6, 'sunset'], [22.9, 'bedtime'], [1.5, 'night'], [6.3, 'morning']]) { await p.evaluate(h => window.__farm.setHour(h), h); await look(B.cx, B.cz, 5.5, 0.8); await shot('farm_' + k, 'the farm, ' + k); }
  await p.evaluate(() => window.__farm.setHour(1.5)); await run(0.5);
  await lookPlot(0, 2.0); await shot('barn_night', 'the Red Barn at night');
  const ok = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[0]; try { f.openInside(P); return true; } catch (e) { return String(e); } }); await run(1.5); await p.waitForTimeout(1500);
  if (ok === true && await p.evaluate(() => !!window.__farm.inside.open)) { await p.evaluate(() => window.__farm.drawInside()); await p.screenshot({ path: `${OUT}/${String(++n).padStart(3, '0')}_inside.jpg`, type: 'jpeg', quality: 88 }); shots.push([`${String(n).padStart(3, '0')}_inside.jpg`, 'inside the Red Barn at night']); }
  else log('inside: not opened', ok);
  await p.evaluate(() => { try { window.__farm.closeInside(); } catch (e) { /* */ } }); await run(1.5); await p.waitForTimeout(1500); await run(0.5);
  log('inside still open after closing:', await p.evaluate(() => !!window.__farm.inside.open));
  await p.evaluate(() => window.__farm.setHour(10.5)); await run(0.5);
}
// ---------------------------------------------------------------- ui
if (PH.includes('ui')) {
  const sheets = [['coops', 'coopsSheet', 'Your coops'], ['shows', 'showsSheet', 'the shows'], ['jobs', 'jobsSheet', "today's jobs"], ['book', 'book', 'the Breed Book']];
  for (const [k, fn, note] of sheets) { await p.evaluate(fn => window.__farm[fn](), fn); await run(0.4); await shot('ui_' + k, note); if (k === 'book') { for (let i = 0; i < 3; i++) { await p.evaluate(() => { const b = [...document.querySelectorAll('.gsheet button')].find(x => /›|→|Next|Suivant/.test(x.textContent)); if (b) b.click(); }); await run(0.3); } await shot('ui_book2', 'the Breed Book, a few pages on'); } await close(); await run(0.2); }
  await p.evaluate(() => window.__farm.deco.shop()); await run(0.4); await shot('ui_shop', 'the shop');
  for (let t = 1; t < 4; t++) { const ok = await p.evaluate(t => { const tabs = document.querySelectorAll('.gsheet .gchip, .gsheet .gtab'); if (tabs[t]) { tabs[t].click(); return true; } return false; }, t); if (!ok) break; await run(0.3); await shot('ui_shop' + (t + 1), 'the shop, tab ' + (t + 1)); }
  await close();
  await p.evaluate(() => window.__farm.gameUI().settings()); await run(0.4); await shot('ui_settings', 'Settings'); await close();
  await p.evaluate(() => window.__farm.gameUI().levelSheet()); await run(0.4); await shot('ui_level', 'the level'); await close();
  const breeds = await p.evaluate(() => window.__farm.gamePlots().map(q => q.gc.breed));
  for (let i = 0; i < breeds.length; i++) {
    const had = await p.evaluate(i => { const f = window.__farm, P = f.gamePlots()[i], h = P.birds.find(x => x.kind === 'rooster' && !x.young && x.gid) || P.birds.find(x => x.gid); if (!h) return false; f.openBirdCard(h); return true; }, i); await run(0.4);
    if (had && (i < 3 || breeds[i] === 'pea' || breeds[i] === 'call')) await shot('card_' + breeds[i], 'a bird\'s card: ' + breeds[i]);
    await close();
    await p.evaluate(i => { const f = window.__farm; f.coopCard(i); }, i); await run(0.4);
    if (i < 2 || breeds[i] === 'pea') await shot('coopcard_' + breeds[i], 'a coop\'s card: ' + breeds[i]);
    await close();
  }
}
// the contact sheet
fs.writeFileSync(`${OUT}/index.html`, `<!doctype html><meta charset="utf-8"><title>Farm tour</title><style>body{font:14px sans-serif;margin:12px;background:#f4f1ea}figure{display:inline-block;margin:6px;width:440px;vertical-align:top}img{width:100%}</style>` + shots.map(([f, note]) => `<figure><img src="${f}"><figcaption>${f}: ${note}</figcaption></figure>`).join('\n'));
log('pictures', shots.length, 'page errors', errs.length, errs.slice(0, 5));
await b.close();

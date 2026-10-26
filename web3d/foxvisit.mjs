// Release 3 step 3 (Rusty's night visits in the game): node foxvisit.mjs   (LANG=fr; W, H: the screen; SHOTS: a folder)
// A farm at level 3: no visits, the nights go by. Level 4: its card says Rusty may come at night. A night he visits with
// the farm shut and a coop's door left open: in the morning "Last night on the farm": he took the nest's eggs (the eggs
// gone, a tip to shut the doors or get the geese), "Watch it": the old film, his head in at the pop door and out with an
// egg, "The End" with "The eggs, not so much"; the film's button gone once watched. A night with every door shut (the
// player's, kept in the save): the doors shut, the eggs kept. A night with the geese: chased home, the eggs kept. A night
// the farm is open at his time: his visit played on the farm, an egg in his mouth, the eggs gone from the nest, nothing
// to tell in the morning. A save changed outside (more eggs than a nest holds, chased by geese the farm hasn't, a door shut
// for a night to come) is checked and flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T11:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); p.setDefaultNavigationTimeout(120000);
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
const run = (secs, dt = 1 / 30) => p.evaluate(([s, dt]) => { const f = window.__farm; for (let i = 0; i < s / dt; i++) { window.__T = Math.round(window.__T + 1000 * dt); f.step(dt, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); }, [secs, dt]);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T, true); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/fox_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const xpAt = L => Math.round(60 * Math.pow(L - 1, 2.1)) + 5;
// the farm's clock to a time (the page's own and the game's), the farm left alone till then (as if it was shut)
const jump = t => p.evaluate(t => { window.__T = t; sessionStorage.setItem('__T', t); }, t);
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(), F = g.fox();
  return { level: g.level, seen: F.seen, last: F.last ? { ...F.last } : null, eggs: g.data.coops.map(c => c.eggs).join(), card: f.gameUI().kind, text: document.querySelector('.gsheet') && !document.querySelector('.gsheet').hidden ? document.querySelector('.gsheet').innerText : '', btn: !document.getElementById('replaybtn').hidden, edited: g.edited }; });
const T = { lvl4: fr ? /Désormais, Rusty le renard peut venir la nuit chercher les œufs/ : /From now on Rusty the fox may come at night for the eggs/,
  title: fr ? /La nuit dernière à la ferme/ : /Last night on the farm/, took: fr ? /a trouvé ouverte la porte du poulailler d(e |’)\S+ et a pris (\d+ œufs|un œuf) dans le nid/ : /found the door of \S+’s coop open and took (\d+ eggs|an egg) from the nest/,
  tip: fr ? /fermez les portes des poulaillers la nuit/ : /shut the coops’ doors at night/, shut: fr ? /les portes étaient fermées/ : /the doors were shut/, geese: fr ? /les oies l’ont entendu/ : /the geese heard him/,
  safeEggs: fr ? /Les œufs, beaucoup moins/ : /The eggs, not so much/ };
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 3: no visits
await p.evaluate(L3 => { const g = window.__farm.game(); g.data.xp = L3; g.data.lvSeen = 3; g.data.coins = 500; g.data.land = [0, 1, 2]; g.data.guide = { step: 5, done: true }; g.save(); }, xpAt(3));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
let nights = await p.evaluate(() => window.__farm.foxGame.nights(window.__T, 30));
const visit0 = nights[0];
await jump(visit0.t + 9 * 3600e3); await run(1);
let s = await st();
ok('level 3: a night he\'d have come goes by with no visit', s.seen >= visit0.key && !s.last && s.card !== 'fox', { s, visit0 });
// level 4: its card
await p.evaluate(L4 => { const g = window.__farm.game(); g.data.xp = L4; g.data.land.push(3); g.save(); }, xpAt(4)); await run(1.6);
s = await st();
await shot('1_level4');
ok('level 4: its card says Rusty may come at night from now on', s.level === 4 && s.card === 'levelup' && T.lvl4.test(s.text), s.text.slice(0, 500));
await p.evaluate(() => window.__farm.gameUI().close());
// a night he comes, the farm shut, the door open, eggs in the nest: in the morning, what he took
const upcoming = async () => p.evaluate(() => window.__farm.foxGame.nights(window.__T, 40).filter(v => v.t > window.__T + 3600e3));
let v = (await upcoming())[0];
await jump(v.t - 3 * 3600e3);                       // (the evening before: the eggs left in the nest)
await run(1);
await p.evaluate(() => { const g = window.__farm.game(); for (const c of g.data.coops) { c.eggs = 3; c.lt = [window.__T - 3600e3, window.__T - 3500e3, window.__T - 3400e3]; } g.save(); });
await jump(v.t + 8 * 3600e3); await run(1.2);
s = await st();
await shot('2_card');
ok('the morning after: "Last night on the farm": he took the nest\'s eggs (gone from it), the tip', s.last && s.last.key === v.key && s.last.open && !s.last.by && s.last.eggs >= 3 && s.card === 'fox' && T.title.test(s.text) && T.took.test(s.text) && T.tip.test(s.text), s);
// the film
const watch = async () => { await p.evaluate(() => [...document.querySelectorAll('.gsheet .gbtn')].find(x => !x.classList.contains('galt')).click()); return p.evaluate(() => {
  const f = window.__farm, R = f.replay(), out = { on: R.on, steps: [], egg: false, ended: null, subs: [] };
  if (!R.on) return out;
  const V = R.c.visit; let last = null;
  for (let n = 0; n < 16 * 120 && R.on; n++) {
    const s = R.steps[R.i]; const k = s ? (s.kind === 'card' ? 'card:' + s.key : s.kind === 'scene' ? s.name : s.kind) : 'done';
    if (k !== last) { out.steps.push(k); last = k; }
    f.replayTick(1 / 16, 1);
    const sub = document.getElementById('film-sub').textContent; if (sub && !out.subs.includes(sub)) out.subs.push(sub);
    if (V.egg && V.egg.parent) out.egg = true;
    if (V.ended) out.ended = V.ended;
    if (V.log.some(x => /^(geese|dog)$/.test(x))) out.chased = true;
  }
  out.stillOn = R.on;
  return out;
}); };
const film = await watch();
await run(0.5);
s = await st();
ok('"Watch it": the film, his head in at the pop door and out with an egg, "The eggs, not so much"; then the button gone', film.on && film.egg && film.ended === 'eggs' && film.steps.includes('grab') && film.steps.includes('card:took') && film.subs.some(x => T.safeEggs.test(x)) && !film.stillOn && s.last.watched && !s.btn, { film, s });
// a night the farm is open at his time (no guards yet)
v = (await upcoming())[0];
await jump(v.t - 30e3);
await p.evaluate(() => { const g = window.__farm.game(); for (const c of g.data.coops) { c.eggs = 3; c.lt = [window.__T - 3600e3, window.__T - 3500e3, window.__T - 3400e3]; } g.save(); window.__farm.setHour(23.6); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => window.__farm.setHour(23.6));
let live = { started: false, egg: false, nestEmptied: false, ended: null };
for (let k = 0; k < 40 && !live.ended; k++) {
  await run(5);
  const r = await p.evaluate(() => { const f = window.__farm, V = f.visit(), g = f.game(); return { on: !!f.foxGame.live(), active: V.active(), egg: !!(V.egg && V.egg.parent), ended: V.ended, last: g.fox().last && g.fox().last.key, eggs: g.data.coops.map(c => c.eggs).join() }; });
  if (r.on || r.active) live.started = true;
  if (r.egg) { live.egg = true; if (SHOTS && !live.shot) { live.shot = true; await p.evaluate(() => { const f = window.__farm, V = f.visit(); f.lookAt(V.fox.pos.x, V.fox.pos.z, 1.8); f.step(1 / 30, 2); }); await shot('4_egg'); } }
  if (r.eggs.split(',').some(n => n === '0')) live.nestEmptied = true;
  if (r.last === v.key) live.ended = r;
}
s = await st();
ok('a night the farm is open at his time: his visit on the farm, an egg in his mouth, the nest emptied, nothing to tell in the morning', live.started && live.egg && live.nestEmptied && s.last && s.last.key === v.key && s.last.eggs >= 3 && s.last.watched && s.last.seen, { live, s });
// a night with every door shut (as the player shuts them): the eggs kept
v = (await upcoming())[0];
await jump(v.t - 2 * 3600e3); await run(1);
await p.evaluate(() => { const g = window.__farm.game(); for (const c of g.data.coops) { c.eggs = 2; c.lt = [window.__T - 3600e3, window.__T - 3500e3]; g.setDoorShut(c.id, true); } g.save(); });
await p.goto(URL + '&time=22:30', { waitUntil: 'domcontentloaded' }); await load();      // (the farm's clock at night, for its doors)
const doors = await p.evaluate(() => window.__farm.gamePlots().map(q => q.door && q.door.shut));
await p.goto(URL, { waitUntil: 'domcontentloaded' }); await load();
await jump(v.t + 8 * 3600e3); await run(1.2);
s = await st();
ok('a night with the doors shut (kept in the save, shut on the farm after a reload): he went home, the eggs kept', doors.every(Boolean) && s.last.key === v.key && !s.last.open && s.last.eggs === 0 && s.card === 'fox' && T.shut.test(s.text) && !T.tip.test(s.text) && s.eggs.split(',').every(n => +n >= 2), { doors, s });
await p.evaluate(() => window.__farm.gameUI().close());
// a night with the geese: chased home
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 5000; g.save(); window.__farm.animal.buy('geese'); });
await run(1);
v = (await upcoming())[0];
await jump(v.t - 2 * 3600e3); await run(1);
await p.evaluate(() => { const g = window.__farm.game(); for (const c of g.data.coops) { c.eggs = 2; c.lt = [window.__T - 3600e3, window.__T - 3500e3]; } g.save(); });
await jump(v.t + 8 * 3600e3); await run(1.2);
s = await st();
await shot('3_geese');
ok('a night with the geese: they chased him home, the eggs kept', s.last.key === v.key && s.last.open && s.last.by === 'geese' && s.last.eggs === 0 && T.geese.test(s.text) && s.eggs.split(',').every(n => +n >= 2), s);
const gfilm = await watch(); await run(0.5);
ok('its film: the geese raise the alarm and Rusty runs for home, no egg', gfilm.on && gfilm.chased && !gfilm.egg && gfilm.steps.includes('geese') && gfilm.steps.includes('card:run') && !gfilm.stillOn, gfilm);
// saves changed outside
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.fox.last.eggs = 99; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a save changed outside (more eggs taken than a nest holds): checked and flagged', s.edited && s.last && s.last.eggs < 99, s);
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.fox.last.by = 'dog'; raw.d.coops[0].shut = '29991231'; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
const shut0 = await p.evaluate(() => window.__farm.game().data.coops[0].shut);
ok('a save changed outside (chased by a dog the farm hasn\'t, a door shut for a night to come): checked and flagged', s.edited && s.last && s.last.by === null && shut0 === undefined, { s, shut0 });
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

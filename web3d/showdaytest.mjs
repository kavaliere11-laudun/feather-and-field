// The game, release 1 step 9b (the show day): node showdaytest.mjs   (LANG=fr; W, H: the screen; SHOTS=folder for pictures)
// A fresh farm on a fake clock: a bird entered in the Village show; the next morning "Show day!"; Watch the judging: the
// show tent on the show field past the farm's edge, the view there (the whole tent on screen), Skip in sight, the other
// entries in their pens, the farm's own farmer and her bird away at the show; the farmer brings her and puts her in her
// pen; the judge looks at every bird and pins three rosettes (hers if she placed); then the results card; closed: the tent
// gone, the farmer and her bird home again, the view back on the farm. A taps on the farm does nothing meanwhile. Another
// show, judged while the farm was shut, opened at night: the results card straight away. Another, watched and skipped:
// straight to the end. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), SHOTS = process.env.SHOTS;
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
  await p.waitForTimeout(3000); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/showday_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const kind = () => p.evaluate(() => window.__farm.gameUI().kind);
const enter = () => p.evaluate(() => { const g = window.__farm.game(), s = g.openShows()[0], x = g.showBirds(s)[0]; g.enterShow(s.id, x.b.id); const b = g.bird(x.b.id); b.exp = Math.max(b.exp, 300); b.trust = 15; g.save(); return x.b.id; });
const toHour = h => p.evaluate(h => { const d = new Date(window.__T); let t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).getTime(); if (t <= window.__T) t += 86400e3; window.__T = t; sessionStorage.setItem('__T', window.__T); }, h);
const state = () => p.evaluate(() => { const f = window.__farm, S = f.showDay(), v = f.view;
  if (!S) return { on: false, kind: f.gameUI().kind, farmer: f.farmer() && f.farmer().group.visible, target: [v.target.x, v.target.z] };
  const c = S.centre(), pts = [S.G.world(-2.3, 0.4, 0.8), S.G.world(2.3, 0.4, 0.8), S.G.world(0, 2.4, 0)].map(w => f.screenOf(w.x, w.z, w.y));
  return { on: true, t: +S.t.toFixed(1), len: +S.len.toFixed(1), kind: f.gameUI().kind, farmer: f.farmer() && f.farmer().group.visible, real: S.real ? S.real.root.visible : null,
    pinned: S.ros.filter(r => r.pinned).length, mine: S.mine, hers: S.ros.findIndex(r => r.pen === S.mine), inPen: !!S.inPen, henY: +S.hen.root.position.y.toFixed(3),
    birds: S.plot.birds.length, skip: !document.querySelector('.gskip').hidden, onScreen: pts.every(q => q.x > 0 && q.x < innerWidth && q.y > 0 && q.y < innerHeight), centreGap: +Math.hypot(v.target.x - c.x, v.target.z - c.z).toFixed(2) }; });
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
const view0 = await p.evaluate(() => [window.__farm.view.target.x, window.__farm.view.target.z]);
const hen = await enter();
await p.evaluate(() => { window.__T += 21.2 * 3600e3; sessionStorage.setItem('__T', window.__T); }); await run(2);
ok('the next morning: "Show day!"', (await kind()) === 'showday', await kind());
// watch the judging
await p.tap('.gsheet .gbtn'); await p.waitForTimeout(2500); await run(1.5);
let s = await state();
ok('watching: the tent on the show field, the view on it with the whole tent on screen, Skip, the other entries in their pens, the farm\'s farmer and her bird away at the show',
  s.on && s.skip && s.onScreen && s.centreGap < 0.2 && s.birds === 6 && s.farmer === false && s.real === false && !s.inPen, s);
await shot('1_arrive');
const tapped = await p.evaluate(() => { const f = window.__farm, c = f.screenOf(f.coopAt(0)[0], f.coopAt(0)[1]); return c; });
await p.touchscreen.tap(Math.min(W - 5, Math.max(5, tapped.x)), Math.min(H - 5, Math.max(5, tapped.y))); await run(0.2);
ok('a tap on the farm does nothing meanwhile', (await kind()) === null, await kind());
await run(5);
s = await state();
ok('the farmer has put her in her pen (on the straw)', s.inPen && Math.abs(s.henY - 0.783) < 0.01, s);
await shot('2_inpen');
let seenPins = 0;
for (let k = 0; k < 40 && s.on && s.kind !== 'showres'; k++) { await run(1); s = await state(); seenPins = Math.max(seenPins, s.pinned || 0); if (k === 14) await shot('3_judging'); if (s.pinned === 3 && !s.shot) { s.shot = true; } }
await shot('4_rosettes');
const res = await p.evaluate(() => window.__farm.game().data.shows.res.slice(-1)[0]);
ok('the judge pinned three rosettes (hers too, as she placed), then the results card', seenPins === 3 && s.kind === 'showres' && (res.place > 3 || s.hers === res.place - 1), { seenPins, s, res });
await p.tap('.gsheet .gbtn'); await run(1.5);
s = await state();
const view1 = await p.evaluate(() => [window.__farm.view.target.x, window.__farm.view.target.z]);
const realBack = await p.evaluate(id => window.__farm.allBirds.find(x => x.gid === id).root.visible, hen);
ok('closed: the tent gone, the farmer and her bird home, the view back on the farm', !s.on && s.farmer === true && realBack && Math.hypot(view1[0] - view0[0], view1[1] - view0[1]) < 3, { s, realBack, view0, view1 });
await shot('5_after');
// judged while the farm was shut, opened at night: the results straight away
await p.evaluate(() => window.__farm.gameUI().close());
await enter();
await toHour(22); await run(1); await toHour(22); await run(2);              // (the night after it's judged)
ok('at night: the results card straight away (no show day)', (await kind()) === 'showres' && !(await state()).on, await kind());
await p.tap('.gsheet .gbtn'); await run(0.5);
// watched and skipped
await enter();
await toHour(9); await run(2);
ok('another morning: "Show day!" again', (await kind()) === 'showday', await kind());
await run(0.3); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await p.waitForTimeout(1500); await run(2);
await p.evaluate(() => document.querySelector('.gskip').click()); await run(2);
s = await state();
ok('Skip: straight to the end, its rosettes pinned, the results card', s.on && s.pinned === 3 && s.kind === 'showres', s);
await p.tap('.gsheet .gbtn'); await run(1);
ok('closed: the tent gone again', !(await state()).on);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

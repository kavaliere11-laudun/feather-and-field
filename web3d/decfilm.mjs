// A film of decorating the farm (release 1 step 9d): node decfilm.mjs OUTDIR [fps]   (LANG=fr, W, H, DSF, PORT)
// A farm at level 10 with coins: a tap on the coins, the shop; "Buy and place" the flower bed: it appears near the view;
// a finger drags it onto the lane (red: why), then on to a good spot (green); "Put it here": the bush in the way cleared,
// the coins down, the word, its butterflies. Then the shop again: the duck house straight onto the pond; and an outfit for
// the farmer, the view to him in it. Prints the marks.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out = 'df', fps = '12'] = process.argv.slice(2), FPS = +fps, fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let n = 0; const marks = [];
const shot = async () => p.screenshot({ path: `${out}/f_${String(n++).padStart(4, '0')}.png`, timeout: 120000 });
const step = dt => p.evaluate(dt => { const f = window.__farm; const k = Math.round(dt * 30); for (let i = 0; i < k; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); } f.gameTick(window.__T, false); f.draw(); }, dt);
const hold = async secs => { for (let i = 0; i < secs * FPS; i++) { await step(1 / FPS); await shot(); } };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500);
};
// a finger on the screen (the film shows where it touches)
const finger = (x, y, on) => p.evaluate(([x, y, on]) => {
  let d = document.getElementById('finger');
  if (!d) { d = document.createElement('div'); d.id = 'finger'; d.style.cssText = 'position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,0.45);border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);pointer-events:none;z-index:99999;transition:none'; document.body.append(d); }
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.display = on ? 'block' : 'none';
}, [x, y, on]);
const tapEl = async sel => {
  const r = await p.evaluate(sel => { const e = document.querySelector(sel); e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
  await finger(r.x, r.y, true); await step(1 / FPS); await shot(); await shot();
  await p.evaluate(sel => document.querySelector(sel).click(), sel);
  await finger(r.x, r.y, false);
};
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = 60 * Math.pow(9, 2.1) + 5; g.data.coins = 12000; g.data.land = [0, 1, 2, 3]; g.data.lvSeen = g.level; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); document.getElementById('hint').classList.remove('on'); f.lookAt(f.view.target.x, f.view.target.z, 3.4); });
marks.push('farm:' + n); await hold(1.2);
// the shop
marks.push('shop:' + n); await tapEl('.gbar .gpill:not(.glvl)');
await p.waitForFunction(() => [...document.querySelectorAll('.gdec img')].every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
await hold(2.4);
// buy and place the flower bed
marks.push('buy:' + n); await tapEl('.gdec[data-decor="flowers"] .gbtn');
await hold(1.8);
// drag it: onto the lane, then a good spot
const plan = await p.evaluate(() => {               // (each where the finger stays well inside the screen, above the bar)
  const f = window.__farm, s = f.deco.state(), at = s.at, bar = document.querySelector('.gmove').offsetTop;
  const inside = (x, z) => { const q = f.screenOf(x, z, 0.15); return q.x > 90 && q.x < innerWidth - 90 && q.y > 170 && q.y < bar - 90; };
  let lane = null, good = null;
  for (let r = 1; r < 8 && !lane; r += 0.5) for (let a = 0; a < 6.28 && !lane; a += 0.3) { const x = at.x + Math.cos(a) * r, z = at.z + Math.sin(a) * r, S = f.deco.spot('flowers', x, z); if (S.why === 'dec_bad_lane' && inside(x, z)) lane = { x, z }; }
  for (let r = 1.5; r < 9 && !good; r += 0.5) for (let a = 0; a < 6.28 && !good; a += 0.3) { const x = Math.round((at.x + Math.cos(a) * r) * 4) / 4, z = Math.round((at.z + Math.sin(a) * r) * 4) / 4, S = f.deco.spot('flowers', x, z); if (S.ok && !S.clear.length && inside(x, z) && f.deco.way('flowers', x, z)) good = { x, z }; }
  const dbg = [];
  for (let r = 2; r < 6; r += 1) for (let a = 0; a < 6.28; a += 0.8) { const x = Math.round((at.x + Math.cos(a) * r) * 4) / 4, z = Math.round((at.z + Math.sin(a) * r) * 4) / 4, S = f.deco.spot('flowers', x, z), q = f.screenOf(x, z, 0.15); dbg.push([x, z, S.why, S.clear.length, Math.round(q.x), Math.round(q.y)]); }
  return { at, lane, good, bar, dbg };
});
if (!plan.good) { console.log(JSON.stringify(plan)); process.exit(1); }
const scr = (x, z) => p.evaluate(([x, z]) => window.__farm.screenOf(x, z, 0.15), [x, z]);
let cur = await scr(plan.at.x, plan.at.z);
await finger(cur.x, cur.y, true); await p.mouse.move(cur.x, cur.y); await p.mouse.down(); await step(1 / FPS); await shot(); await shot();
const dragTo = async (x, z, secs) => {
  const to = await scr(x, z), from = { ...cur }, N = Math.round(secs * FPS);
  for (let i = 1; i <= N; i++) { const u = i / N, k = u * u * (3 - 2 * u), px = from.x + (to.x - from.x) * k, py = from.y + (to.y - from.y) * k; await p.mouse.move(px, py); await finger(px, py, true); await step(1 / FPS); await shot(); }
  cur = to;
};
if (plan.lane) { marks.push('lane:' + n); await dragTo(plan.lane.x, plan.lane.z, 1.4); await hold(1.4); }
marks.push('good:' + n); await dragTo(plan.good.x, plan.good.z, 1.6);
await p.mouse.up(); await finger(0, 0, false);
await hold(1.4);
marks.push('put:' + n); await tapEl('.gmove-go');
await hold(4.5);
// the duck house
marks.push('duck:' + n); await tapEl('.gbar .gpill:not(.glvl)'); await hold(0.8);
await p.evaluate(() => { const c = document.querySelector('.gdec[data-decor="duckhouse"]'); c.scrollIntoView({ block: 'center' }); }); await hold(1.4);
await tapEl('.gdec[data-decor="duckhouse"] .gbtn');
await hold(4.5);
// an outfit for the farmer
marks.push('outfit:' + n); await tapEl('.gbar .gpill:not(.glvl)'); await hold(0.6);
await tapEl('.gshop-tabs .gchip[data-tab="outfits"]'); await p.waitForTimeout(800); await hold(1.6);
await p.evaluate(() => document.querySelector('.gout[data-outfit="market"]').scrollIntoView({ block: 'center' })); await hold(0.8);
await tapEl('.gout[data-outfit="market"] .gbtn'); await p.waitForTimeout(1500);
await hold(4.5);
console.log('frames', n, 'errors', errs, JSON.stringify(plan), marks.join(' | '));
await b.close();

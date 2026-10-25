// A film of the wheat field and the honey (release 1 step 9e): node wheatfilm.mjs OUTDIR [fps]   (LANG=fr, W, H, DSF, PORT)
// A fresh farm: the wheat field by the farmhouse, its sign "Sow"; a tap: its card, Sow; the farmer with the pail,
// scattering the seed; the hours passing (the shoots, tall and green, golden); a tap: he cuts it, the golden puff, the
// grain. Then the beehives (bought for the film) with two jars: the honey pot, a tap, the frame of honey, the jars sold.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out = 'wf', fps = '12'] = process.argv.slice(2), FPS = +fps, fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
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
const finger = (x, y, on) => p.evaluate(([x, y, on]) => {
  let d = document.getElementById('finger');
  if (!d) { d = document.createElement('div'); d.id = 'finger'; d.style.cssText = 'position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,0.45);border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);pointer-events:none;z-index:99999'; document.body.append(d); }
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.display = on ? 'block' : 'none';
}, [x, y, on]);
const tapEl = async sel => {
  const r = await p.evaluate(sel => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
  await finger(r.x, r.y, true); await step(1 / FPS); await shot(); await shot();
  await p.evaluate(sel => document.querySelector(sel).click(), sel);
  await finger(r.x, r.y, false);
};
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
const at = await p.evaluate(() => { const f = window.__farm, s = f.deco.wheat.state(); document.getElementById('hint').classList.remove('on'); f.lookAt(s.at[0] + 0.9, s.at[1] + 0.9, 3.0); return s.at; });
marks.push('field:' + n); await hold(1.4);
marks.push('tap:' + n); await tapEl('.gbub.gwheat'); await hold(2.0);
marks.push('sow:' + n); await tapEl('.gsheet .gbtn');
for (let i = 0; i < 40 * FPS && (await p.evaluate(() => window.__farm.deco.wheat.state().work)); i++) { await step(1 / FPS); await shot(); }
await hold(1.0);
// the hours passing: an hour a second or so, the sign counting down
marks.push('grow:' + n);
for (let i = 0; i < 4.2 * FPS; i++) { await p.evaluate(() => { window.__T += 3600e3 / 12 * 1.0; window.__farm.gameTick(window.__T, true); }); await step(1 / FPS); await shot(); }
await hold(0.8);
marks.push('harvest:' + n); await tapEl('.gbub.gwheat');
for (let i = 0; i < 40 * FPS && (await p.evaluate(() => window.__farm.deco.wheat.state().work)); i++) { await step(1 / FPS); await shot(); }
await hold(2.4);
// the beehives, with two jars
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = Math.round(60 * Math.pow(5, 2.1) + 5); g.data.coins = 3000; g.data.lvSeen = g.level; g.save(); f.gameUI().refresh(); f.deco.start('beehives'); f.deco.place(); window.__T += 16.2 * 3600e3; f.gameTick(window.__T, true); document.getElementById('hint').classList.remove('on'); });
await p.evaluate(() => { const f = window.__farm, it = f.deco.items().find(x => x.id === 'beehives'); f.lookAt(it.at[0] + 0.7, it.at[1] + 0.7, 2.6); });
await step(0.5);
marks.push('honey:' + n); await hold(1.2);
await tapEl('.gbub.ghoney');
for (let i = 0; i < 40 * FPS && (await p.evaluate(() => window.__farm.deco.honey.state().going)); i++) { await step(1 / FPS); await shot(); }
await hold(2.6);
console.log('frames', n, 'errors', errs, marks.join(' | '));
await b.close();

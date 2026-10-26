// A film of buying the geese (release 3 step 1): node geesebuyfilm.mjs OUTDIR [fps]   (LANG=fr, W, H, DSF, PORT)
// A farm at level 4 with coins: a tap on the coins, the shop; the Animals shelf; "Buy · 1,200": they come swimming over the
// pond, come ashore with a shake, a honk and a wing-flap stretch, and look round; a tap on Gertrude: her name. Prints the
// marks (the frame each moment starts at).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out = 'gf', fps = '12'] = process.argv.slice(2), FPS = +fps, fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
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
  if (!d) { d = document.createElement('div'); d.id = 'finger'; d.style.cssText = 'position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,0.45);border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:99999;pointer-events:none;display:none'; document.body.append(d); }
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
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = Math.round(60 * Math.pow(3, 2.1) + 5) + 40; g.data.coins = 2400; g.data.land = [0, 1, 2, 3]; g.data.lvSeen = g.level; g.data.guide = { step: 5, done: true }; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); document.getElementById('hint').classList.remove('on'); f.lookAt(f.view.target.x, f.view.target.z, 3.4); });
marks.push('farm:' + n); await hold(1.0);
// the shop, its Animals shelf
marks.push('shop:' + n); await tapEl('.gbar .gpill:not(.glvl)'); await hold(1.2);
await tapEl('.gshop-tabs .gchip[data-tab="animals"]');
await p.waitForFunction(() => [...document.querySelectorAll('.gsheet img')].every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
await hold(2.2);
// bought: the arrival
marks.push('buy:' + n); await tapEl('.gsheet [data-animal="geese"] .gbtn');
await hold(+(process.env.ARRIVE || 24));
// a tap on Gertrude
const G = await p.evaluate(() => { const f = window.__farm, g = f.geese().lead; return f.screenOf(g.pos.x, g.pos.z, g.pos.y + g.hitY); });
marks.push('tap:' + n); await finger(G.x, G.y, true); await step(1 / FPS); await shot(); await shot();
await p.touchscreen.tap(G.x, G.y); await finger(G.x, G.y, false);
await hold(3);
console.log('frames', n, 'errors', errs, marks.join(' | '));
await b.close();

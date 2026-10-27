// A film of the coop upgrades in the game (release 4): node upgradefilm.mjs OUT   (LANG=fr; W, H (402x874); FPS (12); PORT)
// A new farm with coins to spend, its Red Barn somewhere roomy: its card, a finger on "Upgrade", the coop in its new look
// with hearts, from Rustic to Deluxe; then the Cosy evening: the hens go in and the automatic door shuts by itself.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || 'upfilm', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), FPS = +(process.env.FPS || 12);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-27T10:30:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); p.setDefaultNavigationTimeout(120000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
let n = 0;
const shot = async () => p.screenshot({ path: `${OUT}/f_${String(n++).padStart(4, '0')}.png`, timeout: 180000 });
const tick = (secs) => p.evaluate(([s, fps]) => { const f = window.__farm; for (let i = 0; i < Math.round(30 / fps); i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } f.draw(); }, [secs, FPS]);
const hold = async secs => { for (let i = 0; i < secs * FPS; i++) { await tick(); await shot(); } };
const finger = (x, y, on) => p.evaluate(([x, y, on]) => {
  let d = document.getElementById('finger');
  if (!d) { d = document.createElement('div'); d.id = 'finger'; d.style.cssText = 'position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,0.45);border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:99999;pointer-events:none;display:none'; document.body.append(d); }
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.display = on ? 'block' : 'none';
}, [x, y, on]);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T, true); f.draw(); });
};
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 }); await p.tap('.gsheet .gbtn');
await load();
// a farm a little on: coins, land, the guide done; its coop where the Deluxe pen fits, the view on it
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = 60000; g.data.lvSeen = 30; g.data.coins = 13000; g.data.land = [0, 1, 2, 3, 4, 5]; g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); sessionStorage.setItem('__T', window.__T); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.setHour(10.5); });
const VIEW = process.env.VIEW ? JSON.parse(process.env.VIEW) : [0, 0, 3.6];
// (a spot the Deluxe pen fits, where the view can have the coop in the top half of the screen: near the farm's edge the
// view stops short)
const spot = await p.evaluate(([W, H, V]) => { const f = window.__farm, g = f.game(), c = g.data.coops[0], found = [];
  for (let r = 0; r < 40 && found.length < 60; r += 0.5) for (let k = 0; k < Math.max(1, r * 6); k++) { const a = k / Math.max(1, r * 6) * 6.28, x = Math.round((c.x + Math.cos(a) * r) * 4) / 4, z = Math.round((c.z + Math.sin(a) * r) * 4) / 4;
    const o = { x, z, deg: 90 }; const S = f.coopSpotAt(o, 4); if (S && S.ok) found.push(o); }
  let best = null, bd = 1e9;
  for (const o of found) { f.lookAt(o.x + V[0], o.z + V[1], V[2]); const q = f.screenOf(o.x, o.z, 0.6), d = Math.hypot(q.x - W / 2, q.y - H * 0.3); if (d < bd) { bd = d; best = o; } }
  return best; }, [W, H, VIEW]);
await p.evaluate(sp => { const f = window.__farm; f.moveCoopTo(0, sp); f.gameUI().close(); }, spot);
for (let i = 0; i < 1.2 * FPS; i++) await tick();          // (the move's glide of the view over)
await p.evaluate(([W, H, V]) => { const f = window.__farm, [x, z] = f.coopAt(0); f.lookAt(x + V[0], z + V[1], V[2]); for (let k = 0; k < 12; k++) { const q = f.screenOf(x, z, 0.6); if (Math.abs(q.y - H * 0.3) < 10) break; f.lookAt(x + V[0] + (q.y - H * 0.3) / H * 2.2, z + V[1] + (q.y - H * 0.3) / H * 2.2, V[2]); } f.step(1 / 30, 10); f.draw(); }, [W, H, VIEW]);
await p.addStyleTag({ content: '#readout { display: none !important; }' });
for (let i = 0; i < 4 * FPS; i++) await tick();          // (the "moved" hint gone)
if (process.env.PEEK) { await shot(); console.log('peek'); await b.close(); process.exit(0); }
await hold(1.0);
for (let t = 1; t <= 4; t++) {
  await p.evaluate(() => window.__farm.coopCard(0)); await hold(1.6);
  const r = await p.evaluate(() => { const e = document.querySelector('.gsheet .gup .gbtn'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  if (!r) break;
  await hold(0.4); await finger(r.x, r.y, true); await hold(0.6);
  await p.evaluate(() => document.querySelector('.gsheet .gup .gbtn').click()); await finger(0, 0, false);
  await hold(t === 4 ? 3.5 : 2.6);
}
for (let i = 0; i < 4 * FPS; i++) await tick();          // (its hint gone before the evening)
// the Cosy evening: back to Cosy for the film, the hens go in, the door shuts by itself
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.coops[0].tier = 3; g.save(); f.retier(0); const t = new Date(window.__T); window.__T = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 22, 44).getTime(); f.setHour(22.74); for (const P of f.coopPlots()) for (const x of P.birds) if (x.gid) x.bed = { in: 22.7 + Math.random() * 0.03, out: 6.1 }; });
await p.evaluate(V => { const f = window.__farm, [x, z] = f.coopAt(0); f.lookAt(x + V[0] * 0.5, z + V[1] * 0.5, 2.2); f.draw(); }, VIEW);
await hold(9);
console.log('frames', n, 'errors', errs);
await b.close();

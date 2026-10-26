// A film of buying the dog (release 3 step 2): node dogbuyfilm.mjs OUTDIR [fps]   (LANG=fr, W, H, DSF, PORT; NAME, AFTER)
// A farm at level 9 with coins: a tap on the coins, the shop; the Animals shelf; "Buy and place · 4,000": his kennel to
// place, dragged a little way to a good spot; "Put it here": out he comes with a hop and a play bow; the card for his name,
// "Pepper" typed and saved; a few seconds of his day. Prints the marks (the frame each moment starts at).
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
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = Math.round(60 * Math.pow(8, 2.1) + 5) + 60; g.data.coins = 5200; g.data.land = [0, 1, 2, 3, 4, 5, 6, 7, 8]; g.data.lvSeen = g.level; g.data.guide = { step: 5, done: true }; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); document.getElementById('hint').classList.remove('on'); f.lookAt(f.view.target.x, f.view.target.z, 3.4); });
marks.push('farm:' + n); await hold(1.0);
// the shop, its Animals shelf, the dog's card in view
marks.push('shop:' + n); await tapEl('.gbar .gpill:not(.glvl)'); await hold(1.0);
await tapEl('.gshop-tabs .gchip[data-tab="animals"]');
await p.waitForFunction(() => [...document.querySelectorAll('.gsheet img')].every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
await hold(1.0);
await p.evaluate(() => document.querySelector('.gsheet [data-animal="dog"]').scrollIntoView({ block: 'center' })); await hold(1.6);
// buy and place his kennel: dragged to a good spot a little way off
marks.push('buy:' + n); await tapEl('.gsheet [data-animal="dog"] .gbtn');
await hold(1.6);
const plan = await p.evaluate(() => {
  const f = window.__farm, at = f.deco.state().at, bar = document.querySelector('.gmove').offsetTop;
  const inside = (x, z) => { const q = f.screenOf(x, z, 0.3); return q.x > 90 && q.x < innerWidth - 90 && q.y > 170 && q.y < bar - 120; };
  for (let r = 1.5; r < 5; r += 0.5) for (let a = 0; a < 6.28; a += 0.4) { const x = Math.round((at.x + Math.cos(a) * r) * 4) / 4, z = Math.round((at.z + Math.sin(a) * r) * 4) / 4, S = f.deco.spot('kennel', x, z); if (S.ok && !S.clear.length && inside(x, z) && inside(at.x, at.z)) return { at, good: { x, z } }; }
  return { at, good: null };
});
const scr = (x, z) => p.evaluate(([x, z]) => window.__farm.screenOf(x, z, 0.3), [x, z]);
if (plan.good) {
  let cur = await scr(plan.at.x, plan.at.z);
  await finger(cur.x, cur.y, true); await p.mouse.move(cur.x, cur.y); await p.mouse.down(); await step(1 / FPS); await shot(); await shot();
  const to = await scr(plan.good.x, plan.good.z), N = Math.round(1.4 * FPS);
  for (let i = 1; i <= N; i++) { const u = i / N, k = u * u * (3 - 2 * u), px = cur.x + (to.x - cur.x) * k, py = cur.y + (to.y - cur.y) * k; await p.mouse.move(px, py); await finger(px, py, true); await step(1 / FPS); await shot(); }
  await p.mouse.up(); await finger(0, 0, false); await hold(1.0);
}
marks.push('put:' + n); await tapEl('.gmove-go');
await hold(3.2);
// his name
await p.waitForFunction(() => !document.getElementById('dogname').hidden, null, { timeout: 8000 }).catch(() => {});
marks.push('name:' + n); await hold(1.0);
await p.evaluate(() => { const i = document.getElementById('dogname-in'); i.value = ''; });
for (const ch of process.env.NAME || 'Pepper') { await p.evaluate(ch => { const i = document.getElementById('dogname-in'); i.value += ch; }, ch); await step(1 / FPS); await shot(); await shot(); }
await hold(0.6);
await tapEl('#dogname-save');
await hold(+(process.env.AFTER || 9));
console.log('frames', n, 'errors', errs, JSON.stringify(plan), marks.join(' | '));
await b.close();

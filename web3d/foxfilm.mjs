// A film of Rusty's visit in the game, the morning after (release 3 step 3): node foxfilm.mjs OUTDIR [every]   (LANG=fr, W,
// H, DSF, PORT; NIGHT=geese: a night the geese chased him)
// A farm at level 4, a night he came with a coop's door left open and eggs in the nest (the farm shut): in the morning the
// card "Last night on the farm" (what he took, the tip), a finger on "Watch it", then the old film to "The End" (every:
// one picture each N of its 16 a second), then the farm again. Prints the marks.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out = 'ff', every = '1'] = process.argv.slice(2), fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T11:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); p.setDefaultNavigationTimeout(120000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
let n = 0; const marks = [];
const shot = async () => p.screenshot({ path: `${out}/f_${String(n++).padStart(4, '0')}.png`, timeout: 120000 });
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T, true); f.draw(); });
  await p.waitForTimeout(2500);
};
const finger = (x, y, on) => p.evaluate(([x, y, on]) => {
  let d = document.getElementById('finger');
  if (!d) { d = document.createElement('div'); d.id = 'finger'; d.style.cssText = 'position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,0.45);border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:99999;pointer-events:none;display:none'; document.body.append(d); }
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.display = on ? 'block' : 'none';
}, [x, y, on]);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 4; the evening before a night he comes: eggs left in the nest, the door open (and the geese, for NIGHT=geese)
await p.evaluate(night => {
  const f = window.__farm, g = f.game(); f.gameUI().close();
  g.data.xp = Math.round(60 * Math.pow(3, 2.1) + 5) + 40; g.data.lvSeen = 4; g.data.coins = 2000; g.data.land = [0, 1, 2, 3]; g.data.guide = { step: 5, done: true };
  if (night === 'geese') g.data.animals = { geese: { at: window.__T } };
  const v = f.foxGame.nights(window.__T, 30).find(x => x.t > window.__T + 3600e3);
  window.__T = v.t - 3 * 3600e3;
  for (const c of g.data.coops) { c.eggs = 3; c.lt = [window.__T - 3600e3, window.__T - 3500e3, window.__T - 3400e3]; c.feed = g.feedCap(c); c.fedAt = window.__T; }
  for (const b of g.data.birds) if (b.sex === 'h') b.laid = window.__T;      // (laid up to the evening: the nest as it was)
  g.fox().seen = String(+v.key - 1);
  window.__T = v.t + 8 * 3600e3; sessionStorage.setItem('__T', window.__T);
  g.data.lastSeen = window.__T - 20 * 60e3; g.save();      // (looked at a little while ago: no welcome-back card first)
}, process.env.NIGHT || '');
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => { const f = window.__farm; f.step(1 / 30, 2); f.gameTick(window.__T + 1500, true); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); });
await p.waitForTimeout(800);
// the card
marks.push('card:' + n);
for (let i = 0; i < 16 * 3.4; i++) await shot();
const r = await p.evaluate(() => { const e = [...document.querySelectorAll('.gsheet .gbtn')].find(x => !x.classList.contains('galt')); e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
await finger(r.x, r.y, true); for (let i = 0; i < 5; i++) await shot();
await p.evaluate(() => [...document.querySelectorAll('.gsheet .gbtn')].find(x => !x.classList.contains('galt')).click());
await finger(0, 0, false);
// the film, its own 16 pictures a second (each `every`)
marks.push('film:' + n);
for (let k = 0; k < 16 * 100; k++) {
  const take = k % +every === 0;
  const on = await p.evaluate(take => { const f = window.__farm; f.replayTick(1 / 16, 1); if (f.replay().on && take) f.draw(); return f.replay().on; }, take);
  if (!on) break;
  if (take) await shot();
}
marks.push('after:' + n);
await p.evaluate(() => window.__farm.draw());
for (let i = 0; i < 16 * 1.5; i++) await shot();
console.log('frames', n, 'errors', errs, marks.join(' | '));
await b.close();

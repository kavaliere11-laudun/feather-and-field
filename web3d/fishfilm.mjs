// A short film of fishing at the pond, for Audrey: ./withserver.sh node fishfilm.mjs [OUT]   (LANG=fr; W, H; FPS; LOOK=f
// for Rosie). A new farm at level 3, the farmer out on the dock; the view held on him and the water: a tap on the water (a
// ring where the finger went), the cast, the float, a nibble, the bite, a tap, the reel (holding while the needle's low),
// the fish out of the water and into his hands, hooray, its card, Keep fishing, into the bucket. Frames into OUT/frames,
// then OUT/fishing.mp4 (ffmpeg).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import { execSync } from 'child_process';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/fishfilm', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), FPS = +(process.env.FPS || 15);
fs.rmSync(OUT + '/frames', { recursive: true, force: true }); fs.mkdirSync(OUT + '/frames', { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 1.5 });
const T0 = new Date('2026-11-03T10:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); }); };
let n = 0;
const frame = async () => { await p.screenshot({ path: `${OUT}/frames/${String(n++).padStart(4, '0')}.png`, timeout: 180000 }); };
// a stretch of film: secs of the farm at FPS, each(t) before each frame (the player's hand)
const film = async (secs, each) => { for (let i = 0; i < secs * FPS; i++) { if (each) await each(i / FPS); await run(1 / FPS); await frame(); } };
const finger = (x, y, hold = false) => p.evaluate(([x, y, hold]) => {          // (a ring where the finger touches)
  const d = document.createElement('div'); d.className = 'ffinger'; d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,0.95);background:rgba(255,255,255,0.35);z-index:99;pointer-events:none;box-shadow:0 0 8px rgba(0,0,0,0.25)`;
  document.body.append(d); if (!hold) setTimeout(() => d.remove(), 700); return true; }, [x, y, hold]);
const unfinger = () => p.evaluate(() => document.querySelectorAll('.ffinger').forEach(e => e.remove()));
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30${process.env.LOOK === 'f' ? '&farmer=f' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
if (process.env.LOOK === 'f') await p.evaluate(() => { const b = [...document.querySelectorAll('.gsheet button')].find(x => /Rosie|Rose/.test(x.textContent)); if (b) b.click(); });
await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); sessionStorage.setItem('__T', window.__T); const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 400; g.data.lvSeen = 3; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(1);
await p.addStyleTag({ content: '.vignette { opacity: 0.6; }' });
const r = await p.evaluate(() => window.__farm.startFishing());
for (let i = 0; i < 240 && !(await p.evaluate(() => { const F = window.__farm.fishing(); return F && F.state === 'pickup'; })); i++) await run(0.5);      // (out at the dock's end: he picks his rod up)
// the view: the farmer at the bottom, the water he casts on above him
const aim = await p.evaluate(() => { const f = window.__farm, D = f.dock(); const tx = D.stand[0] + Math.sin(D.face + 0.25) * 2.4, tz = D.stand[1] + Math.cos(D.face + 0.25) * 2.4;
  f.lookAt(D.stand[0] * 0.55 + tx * 0.45, D.stand[1] * 0.55 + tz * 0.45, 2.1); f.draw();
  const T = f.THREE, cam = f.camera, v = new T.Vector3(tx, 0.008, tz).project(cam); return { tx, tz, sx: (v.x + 1) / 2 * innerWidth, sy: (1 - v.y) / 2 * innerHeight }; });
await film(2.2);
await finger(aim.sx, aim.sy);
await p.evaluate(a => window.__farm.fishing().tapWater(a.tx, a.tz), aim);
await film(1.3);                                                  // (the cast)
// watching the float till it goes under
for (let i = 0; i < 25 * FPS && (await p.evaluate(() => window.__farm.fishing().state)) !== 'bite'; i++) { await run(1 / FPS); await frame(); }
await film(0.35);
await finger(W / 2, H * 0.55);
await p.evaluate(() => window.__farm.fishing().press(true));
// the reel: a hand on the screen while holding
let holding = false;
for (let i = 0; i < 40 * FPS; i++) {
  const st = await p.evaluate(() => { const F = window.__farm.fishing(); if (F.state === 'reel') F.press(F.T < 0.5); return { s: F.state, hold: F.hold }; });
  if (st.hold !== holding) { holding = st.hold; if (holding) await finger(W / 2, H * 0.55, true); else await unfinger(); }
  await run(1 / FPS); await frame();
  if (st.s !== 'reel') break;
}
await unfinger();
// out of the water, into his hands, turned round to us; hooray; its card
for (let i = 0; i < 12 * FPS && (await p.evaluate(() => window.__farm.fishing().state)) !== 'card'; i++) { await run(1 / FPS); await frame(); }
await p.evaluate(() => document.getAnimations().forEach(a => a.finish()));
await film(2.6);
const keep = await p.evaluate(() => { const k = document.querySelector('.gsheet button[data-fish=keep]'); if (!k) return null; const r = k.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
if (keep) { await finger(keep[0], keep[1]); await film(0.3); await p.evaluate(() => document.querySelector('.gsheet button[data-fish=keep]').click()); }
await film(5);                                                     // (into the bucket, the rod picked up, ready again)
console.log('frames', n, 'errors', errs);
await b.close();
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${OUT}/frames/%04d.png -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" -c:v libx264 -crf 22 -preset slow -movflags +faststart ${OUT}/fishing${fr ? '_fr' : ''}.mp4`);
console.log('film', OUT + `/fishing${fr ? '_fr' : ''}.mp4`, fs.statSync(OUT + `/fishing${fr ? '_fr' : ''}.mp4`).size);

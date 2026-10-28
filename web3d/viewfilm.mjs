// A short film of turning the farm (release 6), for Audrey: ./withserver.sh node viewfilm.mjs [OUT]   (LANG=fr; W, H; FPS)
// A new farm, the view on the coop and its birds: two fingers (rings on the screen) turn it round, a pause, round
// again, the compass at the top right; a tap on it: back to the usual view. Frames into OUT/frames, then OUT/turn.mp4.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import { execSync } from 'child_process';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/viewfilm', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), FPS = +(process.env.FPS || 15);
fs.rmSync(OUT + '/frames', { recursive: true, force: true }); fs.mkdirSync(OUT + '/frames', { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 1.5 });
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, new Date('2026-11-03T11:00:00+00:00').getTime());
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); }); };
let n = 0;
const frame = async () => { await p.screenshot({ path: `${OUT}/frames/${String(n++).padStart(4, '0')}.png`, timeout: 180000 }); };
const film = async (secs, each) => { for (let i = 0; i < secs * FPS; i++) { if (each) await each(i / FPS); await run(1 / FPS); await frame(); } };
const rings = pts => p.evaluate(pts => { document.querySelectorAll('.ffinger').forEach(e => e.remove()); for (const [x, y] of pts) { const d = document.createElement('div'); d.className = 'ffinger'; d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,0.95);background:rgba(255,255,255,0.35);z-index:99;pointer-events:none;box-shadow:0 0 8px rgba(0,0,0,0.25)`; document.body.append(d); } }, pts);
const fingers = (pts, phase) => p.evaluate(([pts, phase]) => { const c = document.querySelector('canvas'); pts.forEach(([x, y], i) => c.dispatchEvent(new PointerEvent(phase, { pointerId: 11 + i, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: i === 0 }))); }, [pts, phase]);
const cx = W / 2, cy = H * 0.55, R = Math.min(W, H) * 0.24, at = a => [[cx - Math.cos(a) * R, cy - Math.sin(a) * R], [cx + Math.cos(a) * R, cy + Math.sin(a) * R]];
// two fingers turning by deg over secs (eased), filmed
const twistFilm = async (a0, deg, secs) => {
  await fingers(at(a0), 'pointerdown'); await rings(at(a0)); await film(0.25);
  const N = Math.round(secs * FPS);
  for (let i = 1; i <= N; i++) { const u = i / N, e = u * u * (3 - 2 * u), a = a0 + deg * Math.PI / 180 * e; await fingers(at(a), 'pointermove'); await rings(at(a)); await run(1 / FPS); await frame(); }
  const a1 = a0 + deg * Math.PI / 180; await fingers(at(a1), 'pointerup'); await film(0.15); await rings([]);
  return a1;
};
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 400; g.data.lvSeen = 3; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(1);
await p.addStyleTag({ content: '.vignette { opacity: 0.6; } #hint { opacity: 0 !important; }' });
// the view: on the coop
await p.evaluate(() => { const f = window.__farm, h = f.allBirds.find(x => x.gid).root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(h.x - 0.3, h.z + 0.3, 3.0); });
await film(1.2);
let a = await twistFilm(-0.3, 110, 3.0);
await film(0.9);
a = await twistFilm(a, 140, 3.2);
await film(1.2);
const cp = await p.evaluate(() => { const r = document.getElementById('compass').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await rings([cp]); await film(0.35); await rings([]);
await p.evaluate(() => document.getElementById('compass').click());
await film(2.0);
console.log('frames', n, 'errors', errs);
await b.close();
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${OUT}/frames/%04d.png -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" -c:v libx264 -crf 22 -preset slow -movflags +faststart ${OUT}/turn${fr ? '_fr' : ''}.mp4`);
console.log('film', OUT + `/turn${fr ? '_fr' : ''}.mp4`, fs.statSync(OUT + `/turn${fr ? '_fr' : ''}.mp4`).size);

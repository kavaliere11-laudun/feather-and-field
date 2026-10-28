// A short film of a hen finding worms for the farmer, for Audrey: ./withserver.sh node wormfilm.mjs [OUT]   (LANG=fr; W, H;
// FPS; LOOK=f for Rosie). A new farm at level 3, a hen best friends with him: her card, a tap on "Ask for worms", the
// farmer into the pen, crouched with his hand out, she comes beside it, scratches, pecks up three worms one by one and drops
// them into his palm, "Thank you, my lovely!", a heart, his hand closed, into his pocket. Frames into OUT/frames, then
// OUT/worms.mp4 (ffmpeg).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import { execSync } from 'child_process';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/wormfilm', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), FPS = +(process.env.FPS || 15);
fs.rmSync(OUT + '/frames', { recursive: true, force: true }); fs.mkdirSync(OUT + '/frames', { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 1.5 });
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, new Date('2026-11-03T10:30:00+00:00').getTime());
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); }); };
let n = 0;
const frame = async () => { await p.screenshot({ path: `${OUT}/frames/${String(n++).padStart(4, '0')}.png`, timeout: 180000 }); };
const film = async secs => { for (let i = 0; i < secs * FPS; i++) { await run(1 / FPS); await frame(); } };
const finger = (x, y) => p.evaluate(([x, y]) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,0.95);background:rgba(255,255,255,0.35);z-index:99;pointer-events:none;box-shadow:0 0 8px rgba(0,0,0,0.25)`; document.body.append(d); setTimeout(() => d.remove(), 700); }, [x, y]);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30${process.env.LOOK === 'f' ? '&farmer=f' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
if (process.env.LOOK === 'f') await p.evaluate(() => { const b = [...document.querySelectorAll('.gsheet button')].find(x => /Rosie|Rose/.test(x.textContent)); if (b) b.click(); });
await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); sessionStorage.setItem('__T', window.__T); const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 400; g.data.lvSeen = 3; for (const b of g.data.birds) if (b.sex === 'h') b.laid = window.__T; g.data.birds.find(b => b.sex === 'h').trust = 15; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(1);
await p.addStyleTag({ content: '.vignette { opacity: 0.6; }' });
// her card, the tap
await p.evaluate(() => { const f = window.__farm, id = f.game().data.birds.find(b => b.sex === 'h').id; window.__hen = id; f.openBirdCard(f.allBirds.find(x => x.gid === id)); });
await film(0.8); await p.evaluate(() => document.getAnimations().forEach(a => a.finish())); await film(1.4);
const at = await p.evaluate(() => { const r = document.querySelector('.gsheet button[data-worms=ask]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
await finger(at[0], at[1]); await film(0.4);
await p.evaluate(() => document.querySelector('.gsheet button[data-worms=ask]').click());
// the view on the pen, near (never moving by itself in the game: set here once, for the film)
await p.evaluate(() => { const f = window.__farm, Bd = f.allBirds.find(x => x.gid === window.__hen), w = Bd.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 1.6); f.draw(); });
for (let i = 0; i < 40 * FPS && !(await p.evaluate(() => { const L = window.__farm.farmer(); return L.pen && /^cup/.test((L.want || {}).pose); })); i++) { await run(1 / FPS); if (i % 2 === 0) await frame(); }
await p.evaluate(() => { const f = window.__farm, L = f.farmer(), Bd = f.allBirds.find(x => x.gid === window.__hen), w = Bd.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt((L.pos.x + w.x) / 2, (L.pos.z + w.z) / 2, 1.2); f.draw(); });
for (let i = 0; i < 40 * FPS && !(await p.evaluate(() => /^pocket/.test((window.__farm.farmer().want || {}).pose))); i++) { await run(1 / FPS); await frame(); }
await film(2.4);
console.log('frames', n, 'errors', errs);
await b.close();
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${OUT}/frames/%04d.png -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" -c:v libx264 -crf 22 -preset slow -movflags +faststart ${OUT}/worms${fr ? '_fr' : ''}.mp4`);
console.log('film', OUT + `/worms${fr ? '_fr' : ''}.mp4`, fs.statSync(OUT + `/worms${fr ? '_fr' : ''}.mp4`).size);

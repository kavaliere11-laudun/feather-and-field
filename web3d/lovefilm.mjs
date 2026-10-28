// A short film of the pond's secret, for Audrey: ./withserver.sh node lovefilm.mjs [OUT]   (LANG=fr; W, H; FPS; WHERE=pad,bank)
// A new farm, the view held close on the pond: the froglet on her lily pad, his shadow gliding in, up comes his head, they
// gaze (hearts), they kiss, he goes; then the same from the bank. Frames into OUT/frames, then OUT/love.mp4 (ffmpeg).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import { execSync } from 'child_process';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/lovefilm', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), FPS = +(process.env.FPS || 15);
const WHERE = (process.env.WHERE || 'pad,bank').split(',');
fs.rmSync(OUT + '/frames', { recursive: true, force: true }); fs.mkdirSync(OUT + '/frames', { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 1.5 });
const T0 = new Date('2026-11-03T12:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < Math.round(s * 30); i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); }); };
let n = 0;
const frame = async () => { await p.screenshot({ path: `${OUT}/frames/${String(n++).padStart(4, '0')}.png`, timeout: 180000 }); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=12:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); sessionStorage.setItem('__T', window.__T); const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => { window.__farm.gameUI().close(); const F = window.__farm.frogs(); F.o.near = () => []; F.loveIn = 1e9; });
await p.addStyleTag({ content: '#hint { opacity: 0 !important; }' });
await run(1);
for (const where of WHERE) {
  // she sits (on her pad, or on the bank), idle; then their moment, the view close on the two of them
  let go = false;
  for (let i = 0; i < 300 && !go; i++) {
    go = await p.evaluate(w => { const F = window.__farm.frogs(), h = F.her;
      if (w === 'pad' && h.state !== 'pad' && h.root.visible && (!h.task || /^(sit|look|float)$/.test(h.task.name))) { const P = F.herPad; h.pos.set(P.x, 0.0095, P.z); h.state = 'pad'; h.task = null; h.wait = 0; }
      if (w === 'bank' && h.state !== 'bank' && h.root.visible && (!h.task || /^(sit|look|float)$/.test(h.task.name))) {      // (onto the bank nearest her)
        const [, t0] = F.where(h.pos.x, h.pos.z); for (const d of [0, 0.2, -0.2, 0.4, -0.4, 0.7, -0.7]) { const t = t0 + d; if (F.okAt(t) && F.roomAt(h, t)) { const [x, z] = F.at(t, 1.045); h.pos.set(x, 0.003, z); h.heading = F.inward(t); h.state = 'bank'; h.task = null; h.wait = 0; break; } } }
      return h.state === w && h.root.visible && (!h.task || /^(sit|look)$/.test(h.task.name)) && F.loveNow(); }, where);
    if (!go) await run(0.5);
  }
  if (!go) { console.log('no moment', where); continue; }
  await p.evaluate(() => { const f = window.__farm, F = f.frogs(), h = F.her, L = F.loveOn.plan; f.lookAt(h.pos.x * 0.6 + L.X[0] * 0.4, h.pos.z * 0.6 + L.X[1] * 0.4, 1.5); f.draw(); });
  for (let i = 0; i < 14 * FPS; i++) {
    await run(1 / FPS); await frame();
    if (i > 12 * FPS && !(await p.evaluate(() => !!window.__farm.frogs().loveOn))) break;
  }
  for (let i = 0; i < 1.2 * FPS; i++) { await run(1 / FPS); await frame(); }
}
console.log('frames', n, 'errors', errs);
await b.close();
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${OUT}/frames/%04d.png -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" -c:v libx264 -crf 22 -preset slow -movflags +faststart ${OUT}/love${fr ? '_fr' : ''}.mp4`);
console.log('film', OUT + `/love${fr ? '_fr' : ''}.mp4`, fs.statSync(OUT + `/love${fr ? '_fr' : ''}.mp4`).size);
// and a close one: the middle of the screen, as through a magnifying glass
execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${OUT}/frames/%04d.png -vf "crop=iw/2.4:ih/3.2:(iw-iw/2.4)/2:(ih-ih/3.2)/2,scale=trunc(iw*2.4/2)*2:trunc(ih*2.4/2)*2:flags=lanczos,format=yuv420p" -c:v libx264 -crf 20 -preset slow -movflags +faststart ${OUT}/love_close${fr ? '_fr' : ''}.mp4`);
console.log('close film', OUT + `/love_close${fr ? '_fr' : ''}.mp4`);

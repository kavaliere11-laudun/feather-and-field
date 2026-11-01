// The peacock's call on film (1 Nov 2026, for Audrey): the grown farm (FARM: farmtour.mjs's saved farm at level 30), close on
// the peafowl's pen (or, without FARM, the test village with just the peafowl's pavilion, LOOK), the peacock calling three times, each with his recording laid in where he opens his beak (the
// browser in the tests is silent: ffmpeg puts the sound in after). node peacallfilm.mjs OUT.mp4   (FARM=file; W, H; FPS)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import { execFileSync } from 'child_process';
const OUT = process.argv[2] || '/tmp/peacall.mp4', W = +(process.env.W || 874), H = +(process.env.H || 402), FPS = +(process.env.FPS || 20);
const FARM = process.env.FARM, DIR = OUT.replace(/\.mp4$/, '') + '_frames';
fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DSF || 1.5), hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London' });
if (FARM) await ctx.addInitScript(d => { if (!sessionStorage.getItem('__restored')) { for (const [k, v] of Object.entries(d.ls)) localStorage.setItem(k, v); sessionStorage.setItem('__restored', '1'); sessionStorage.setItem('__T', String(d.T)); } }, JSON.parse(fs.readFileSync(FARM, 'utf8')));
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, new Date('2026-11-02T10:30:00Z').getTime());
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/` + (FARM ? 'play.html?q=0' : `index.html?q=0&coopbreeds=pea&looks=${process.env.LOOK || 4}&time=10:30`), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 240000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); if (f.gameTick) f.gameTick(window.__T); if (f.gameUI && f.gameUI()) f.gameUI().close(); f.setHour(10.5); });
await p.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
const step = n => p.evaluate(([n, fps]) => { const f = window.__farm; for (let i = 0; i < n; i++) { window.__T = Math.round(window.__T + 1000 / fps); f.step(1 / fps, 1); if (f.gameTick && f.game && f.game()) f.gameTick(window.__T, false); } f.draw(); }, [n, FPS]);
await step(FPS * 2);
// the peacock: where he is; the view on him, a little from the side
const at = await p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.breed === 'pea'), pk = P.birds.find(b => b.train);
  window.__pk = pk; pk.stay = true; pk.route = null; pk.act = { type: 'rest', left: 3 }; pk.wait = 3; pk.fanGoal = 0; if (pk.A) pk.A.fan = 0;      // (calm, his train down)
  const v = pk.root.getWorldPosition(new f.THREE.Vector3()); return [v.x, v.z, pk.root.rotation.y + P.group.rotation.y]; });
const CALLS = [0.6, 4.2, 7.6], LEN = +(process.env.LEN || 10.2), CLIPS = ['peacall1', 'peacall2', 'peacall3'];
let k = 0, heard = [];
await step(FPS * 1.5);
for (let i = 0; i < Math.round(LEN * FPS); i++) {
  const t = i / FPS, c = CALLS.findIndex(x => Math.abs(x - t) < 0.5 / FPS);
  const now = await p.evaluate(([call, yaw, AZ, EL]) => { const f = window.__farm, pk = window.__pk;
    if (call) { pk.route = null; pk.act = { type: 'call', left: 2.6 }; pk.wait = 2.7; }
    else if (!pk.act) { pk.act = { type: 'rest', left: 1 }; pk.wait = 1; pk.route = null; }      // (he stays put between his calls)
    const v = pk.root.getWorldPosition(new f.THREE.Vector3());
    f.closeShot({ at: [v.x, 0.55, v.z], az: +(AZ ?? 45), el: EL, dist: 2.6, fov: 30 });      // (from the player's side, a little above the fence)
    return !!(pk.act && pk.act.type === 'call' && pk.act.heard); }, [c >= 0, at[2], process.env.AZ === undefined ? null : +process.env.AZ, +(process.env.EL || 26)]);
  if (now && heard.length < CALLS.length && (!heard.length || t - heard[heard.length - 1] > 1.5)) heard.push(t);
  await p.screenshot({ path: `${DIR}/${String(k++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
  await step(1);
}
console.log('frames', k, 'calls heard at', heard.map(x => x.toFixed(2)), errs.slice(0, 2));
await b.close();
// the sound: each call where he opened his beak, over the day's countryside, quietly
const A = '/home/claude/ff-source/web3d/audio/farm/';
const ins = ['-i', A + 'day.mp3', ...CLIPS.flatMap(c => ['-i', A + c + '.mp3'])];
const parts = ['[0:v]scale=1280:-2[v]', '[1:a]volume=0.22,atrim=0:' + LEN + '[bed]', ...heard.map((t, j) => `[${j + 2}:a]adelay=${Math.round(t * 1000)}|${Math.round(t * 1000)},volume=0.9[c${j}]`)];
const mix = parts.join(';') + ';[bed]' + heard.map((_, j) => `[c${j}]`).join('') + `amix=inputs=${heard.length + 1}:normalize=0,afade=t=out:st=${LEN - 0.6}:d=0.6[a]`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${DIR}/%04d.jpg`, ...ins, '-filter_complex', mix, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-c:a', 'aac', '-b:a', '128k', '-shortest', OUT]);
console.log('film', OUT);

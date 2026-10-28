// Close-up pictures of the farmer landing a fish (for checking the hands, the rod and the bucket): ./withserver.sh node
// fishclose.mjs [OUT]   (AZ: the view's turn in degrees, default 0 = the game's view; DIST; PORT; WATER=river: on the river's
// footbridge at level 8)
// A new farm at level 3, out on the dock, a cast, a bite, reeled in; then a close look at each moment: on the line, taken
// in his left hand, the rod laid down, both hands, shown to us, hooray, the card, lowered into the bucket, the rod picked up.
// Pictures OUT/close_NN_<moment>.png (EL: the camera's height in degrees, default 18; AT_Y: the height looked at; DPR).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const RIVER = process.env.WATER === 'river', OUT = process.argv[2] || '/tmp/claude-0/farmer/fishclose', AZ = +(process.env.AZ || 0), DIST = +(process.env.DIST || 5.5), W = 402, H = 874;
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: +(process.env.DPR || 1) });
const T0 = new Date('2026-11-03T10:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); }); };
let n = 0;
const close = async name => {      // (the picture straight off the canvas, just drawn: no waiting on the page for a screenshot)
  const url = await p.evaluate(([az, dist]) => { const f = window.__farm, L = f.farmer();
    f.closeShot({ at: [L.pos.x, L.pos.y + +(window.__atY || 0.6), L.pos.z], az, el: +(window.__el || 18), dist, fov: 30 }); return document.querySelector('canvas').toDataURL('image/png'); }, [AZ, DIST]);
  fs.writeFileSync(`${OUT}/close_${String(n++).padStart(2, '0')}_${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
};
const state = () => p.evaluate(() => { const F = window.__farm.fishing(); return F ? F.state : null; });
const until = async (want, secs) => { for (let t = 0; t < secs * 10 && (await state()) !== want; t++) await run(0.1); return (await state()) === want; };
if (RIVER) await ctx.addInitScript(() => { window.__river = true; });
if (process.env.EL) await ctx.addInitScript(e => { window.__el = e; }, +process.env.EL);
if (process.env.AT_Y) await ctx.addInitScript(y => { window.__atY = y; }, +process.env.AT_Y);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); sessionStorage.setItem('__T', window.__T); const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = window.__river ? 3600 : 400; g.data.lvSeen = window.__river ? 8 : 3; g.fishBag().worms = 4; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(1);
await p.evaluate(() => window.__farm.startFishing(window.__river ? 'river' : 'pond'));
await until('pickup', 120); await run(0.75); await close('pickup');
await until('ready', 10);
await p.evaluate(() => { const f = window.__farm, D = window.__river ? f.river() : f.dock(), F = f.fishing(); return F.tapWater(D.stand[0] + Math.sin(D.face + 0.1) * 2.0, D.stand[1] + Math.cos(D.face + 0.1) * 2.0); });
await until('bite', 30);
await p.evaluate(() => window.__farm.fishing().press(true));
await p.evaluate(() => { const f = window.__farm, F = f.fishing(); for (let i = 0; i < 30 * 90 && F.state === 'reel'; i++) { F.press(F.T < 0.5); window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } F.press(false); f.draw(); });
await run(0.6); await close('lift');
await until('unhook', 5); await run(0.4); await close('taking');
await run(0.6); await close('kneel_rod');
await run(0.45); await close('rod_down');
await run(0.6); await close('both_hands');
await until('show', 5); await run(0.4); await close('show');
if (await until('trophy', 4)) { await run(0.4); await close('hooray'); await run(0.25); await close('hooray2'); }
await until('card', 6); await run(0.5); await close('card');
await p.evaluate(() => document.querySelector('.gsheet button[data-fish=keep]').click());
await run(0.5); await close('turn_bucket');
await run(0.6); await close('crouch');
await run(0.3); await close('lowering');
await run(0.4); await close('in_bucket');
await until('pickup', 4); await run(0.6); await close('pickup_again');
await run(0.5); await close('rod_up');
console.log('pictures', n, 'errors', errs);
await b.close();

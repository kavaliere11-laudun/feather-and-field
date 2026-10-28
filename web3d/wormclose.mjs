// Close-up pictures of a hen finding worms for the farmer (Audrey's idea; for checking his hand, her beak and the worms):
// ./withserver.sh node wormclose.mjs [OUT]   (VIEW=game: from the game's camera instead of from beside them; SIDE: the turn from his heading, radians; EL; DIST; DPR; PORT)
// A new farm at level 3, a hen best friends with him (3 worms), asked; then a look at each moment: crouched with his hand
// out, her scratching, a worm in her beak, dropped into his palm, three in his palm, "thank you", his hand closed, to his
// pocket. Pictures OUT/worm_NN_<moment>.png, straight off the canvas.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/wormclose', GAME = process.env.VIEW === 'game', EL = +(process.env.EL || (GAME ? 50 : 14)), DIST = +(process.env.DIST || (GAME ? 3 : 1.7));
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: +(process.env.DPR || 1) });
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, new Date('2026-11-03T10:30:00+00:00').getTime());
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); }); };
let n = 0;
const close = async name => {
  const url = await p.evaluate(([game, el, dist]) => { const f = window.__farm, L = f.farmer(), h = L.heading, D = 180 / Math.PI;
    const Bd = f.allBirds.find(x => x.gid === window.__hen), hp = Bd.root.getWorldPosition(new f.THREE.Vector3());
    const at = [(L.pos.x + hp.x) / 2, 0.28, (L.pos.z + hp.z) / 2];
    f.closeShot({ at, az: game ? 0 : (h + +(window.__side || 1.1)) * D - 45, el, dist, fov: 30 }); return document.querySelector('canvas').toDataURL('image/png'); }, [GAME, EL, DIST]);
  fs.writeFileSync(`${OUT}/worm_${String(n++).padStart(2, '0')}_${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
};
if (process.env.SIDE) await ctx.addInitScript(s => { window.__side = s; }, +process.env.SIDE);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); sessionStorage.setItem('__T', window.__T); const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 400; g.data.lvSeen = 3; for (const b of g.data.birds) { if (b.sex === 'h') b.laid = window.__T; } g.data.birds.find(b => b.sex === 'h').trust = 15; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(1);
await p.evaluate(() => { const f = window.__farm, id = f.game().data.birds.find(b => b.sex === 'h').id; window.__hen = id; f.openBirdCard(f.allBirds.find(x => x.gid === id)); document.querySelector('.gsheet button[data-worms=ask]').click(); });
const dig = () => p.evaluate(() => { const Bd = window.__farm.allBirds.find(x => x.gid === window.__hen); return Bd.cuddle && Bd.cuddle.dig ? Bd.cuddle.dig.t : -1; });
const pose = () => p.evaluate(() => (window.__farm.farmer().want || {}).pose);
for (let i = 0; i < 600 && !/^cup/.test(await pose()); i++) await run(0.1);
await run(0.5); console.log('hen at', JSON.stringify(await p.evaluate(() => { const P = window.__farm.farmer().pen; return P && P.henAt; }))); await close('hand_out');
for (let i = 0; i < 200 && (await dig()) < 0; i++) await run(0.1);
await run(0.4); await close('scratch');
await run(0.65); await close('peck');
await run(0.3); await close('in_beak');
await run(0.5); await close('dropping');
await run(0.45); await close('in_palm');
await run(2.4 * 2 - 0.2); await close('three');
for (let i = 0; i < 60 && (await p.evaluate(() => !window.__farm.farmer().said.slice(-2).some(k => /^worms/.test(k)))); i++) await run(0.1);
await run(0.4); await close('thanks');
for (let i = 0; i < 60 && !/^pocket/.test(await pose()); i++) await run(0.1);
await run(0.1); await close('closed');
await run(0.7); await close('pocket');
console.log('pictures', n, 'errors', errs);
await b.close();

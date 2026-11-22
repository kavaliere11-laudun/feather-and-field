// A short film of the grooming game with the bird alive (22 Nov 2026, Audrey: "can the move of the chicken be more natural,
// it currently is just an image moving"): ./withserver.sh node groomfilm.mjs OUT   (W=874 H=402: sideways, as she plays;
// SEX=r: the rooster). Her clock stepped by hand (main.js groomLive: manual, step), 30 pictures a second, the tool moved by
// the pointer over her places as a player's finger would: a look about, the sponge on each muddy patch, her shake, the brush
// once the wrong way then with the feathers, the cloth, all ready. Writes OUT/f_00000.jpg... (then: ffmpeg)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/groomfilm'; fs.mkdirSync(OUT, { recursive: true });
const W = +(process.env.W || 874), H = +(process.env.H || 402);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(180000);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
await p.evaluate(sex => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.coins = 500; g.save(); f.gameUI().close(); window.__FF_GROOM_SECS = 600;
  const bird = g.data.birds.find(x => x.sex === sex), s = g.openShows()[0]; f.groom.start(s.id, bird.id); f.groom.now().live.manual(true); }, process.env.SEX || 'h');
await p.addStyleTag({ content: '.groom-clock { visibility: hidden; }' });      // (her clock stepped by hand: the part's seconds left would say nothing true)
await p.waitForTimeout(500);
let n = 0;
const frame = async () => { await p.evaluate(() => window.__farm.groom.now().live.step(1 / 30)); await p.screenshot({ path: `${OUT}/f_${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 }); };
const idle = async k => { for (let i = 0; i < k; i++) await frame(); };
const pic = await p.evaluate(() => { const r = document.querySelector('.groom-pic').getBoundingClientRect(); return [r.left, r.top, r.width]; });
const at = (u, v) => [pic[0] + u * pic[2], pic[1] + v * pic[2]];
const spots = () => p.evaluate(() => window.__farm.groom.now().state().spots);
const step = () => p.evaluate(() => window.__farm.groom.now().state().step);
// a finger over each place till it's done: little circles (the sponge, the cloth) or strokes head to tail (the brush)
async function work(kind) {
  const S = await spots();
  for (let i = 0; i < S.length; i++) {
    const [u, v] = S[i]; let [x, y] = at(u, v);
    await p.mouse.move(x - 20, y); await p.mouse.down();
    for (let k = 0; k < 60 && (await spots())[i][2] < 1; k++) {
      const a = k * 0.9;
      if (kind === 'brush') { const q = (k % 6) / 5; await p.mouse.move(x - 26 + 52 * q, y + 3 * Math.sin(k)); if (k % 6 === 5) { await p.mouse.up(); await p.mouse.move(x - 26, y); await p.mouse.down(); } }
      else await p.mouse.move(x + Math.cos(a) * 16, y + Math.sin(a) * 11);
      await frame();
    }
    await p.mouse.up(); await idle(4);
  }
}
await idle(75);                                            // (a look about, a blink, a cluck)
await work('wash'); await idle(36);                        // (her shake)
{ const [u, v] = (await spots())[0], [x, y] = at(u, v); await p.mouse.move(x + 25, y); await p.mouse.down(); for (let k = 0; k < 8; k++) { await p.mouse.move(x + 25 - k * 7, y); await frame(); } await p.mouse.up(); await idle(10); }      // (the wrong way: ruffled)
await work('brush'); await idle(20);
await work('shine'); await idle(70);                       // (all ready: a hop, proud)
console.log('frames', n, 'step', await step(), 'errors', JSON.stringify(errs));
await b.close();

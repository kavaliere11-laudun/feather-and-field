// Pictures of the morning replay (replay.js) as the player sees it, at a phone's size: from the "Last night" button to the
// end. node replayfilm.mjs OUT [every] [extra]   (every: one picture each N of the film's 16 a second, default 1;
// extra: more of the address, e.g. '&noguard'; LANG=fr; COOP=N, default 3; DSF=2; START=n: from picture n on)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'rf', every = '1', extra = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&replay=${process.env.COOP || 3}${extra}` + (process.env.LANG === 'fr' ? '&lang=fr' : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.waitForFunction(() => !document.getElementById('replaybtn').hidden, null, { timeout: 30000 }).catch(() => {});
await p.evaluate(() => { const h = document.getElementById('hint'); h.classList.remove('on'); });
await p.screenshot({ path: `${out}_btn.png` });                     // the morning, with the button
await p.evaluate(() => window.__farm.pause(true));
await p.click('#replaybtn');
const START = +(process.env.START || 0);                // (pictures from this one on: to finish a film that was cut short)
let n = 0, k = START;
for (; n < 16 * 100; n++) {
  const shot = n % +every === 0 && n >= START;
  const on = await p.evaluate((shot) => { const f = window.__farm; f.replayTick(1 / 16, 1); if (f.replay().on && shot) f.draw(); return f.replay().on; }, shot);
  if (!on) break;
  if (shot) await p.screenshot({ path: `${out}_${String(k++).padStart(4, '0')}.png`, timeout: 120000 });
}
await p.evaluate(() => window.__farm.pause(false));
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: `${out}_after.png` });
console.log('pictures', k, 'film secs', (n / 16).toFixed(1), 'errors', errs);
await b.close();

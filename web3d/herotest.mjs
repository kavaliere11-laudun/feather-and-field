// The welcome picture sideways reaches the screen's right edge wherever the card leaves room above it (tablets and
// computers; 28 Nov 2026, the tablet play-through: a band of plain green down the right on 1280x800). On a phone the
// card fills the height and the picture need only reach under it (as before). ./withserver.sh node herotest.mjs [OUT]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const OUT = process.argv[2];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
for (const s of (process.env.SIZES || '667x375,874x402,932x430,1024x768,1133x744,1180x820,1280x800,1376x1032,1440x900,1920x1080').split(',')) {
  const [W, H] = s.split('x').map(Number);
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: process.env.LOC || 'de-DE', hasTouch: true, isMobile: W < 1000 });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const R = document.querySelector('.ghero img').getBoundingClientRect(), S = document.querySelector('.gsheet').getBoundingClientRect(); return { right: Math.round(R.right), left: Math.round(R.left), top: Math.round(R.top), bottom: Math.round(R.bottom), cardTop: Math.round(S.top) }; });
  const room = r.cardTop > 24, bad = (room && r.right < W - 1) || r.left > 1 || r.top > 1 || r.bottom < H - 1;
  if (bad) fails++;
  console.log((bad ? 'FAIL ' : 'ok   ') + s + ' ' + JSON.stringify(r) + (room ? '' : ' (a phone: the card fills the height)'));
  if (OUT) await p.screenshot({ path: `${OUT}/hero_${s}.png` });
  await ctx.close();
}
await b.close();
console.log(fails ? `PROBLEMS: ${fails}` : 'ALL PASS');
process.exit(fails ? 1 : 0);

// The game on every screen (release 7, before the stores; Audrey: "how does the game show on iPhones, Samsungs, and all
// sort of other phones, as well as tablet, very important"): ./withserver.sh node screens.mjs [OUT]   (ONLY=name,name; LANG=fr; PORT)
// Each phone and tablet upright and sideways: the welcome, the farm, a hen's card, the shop, the Breed Book. A picture of
// each in OUT/<device>_<w>x<h>_<screen>.jpg, and checks: nothing off the screen or under another thing that matters (the
// top bar's buttons all on the screen and apart; a card's title, close button and buttons on the screen; no sideways
// scrolling); then OUT/index.html of them all.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/screens', fr = process.env.LANG === 'fr', ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
fs.mkdirSync(OUT, { recursive: true });
const DEVICES = [
  ['iphone-se', 375, 667, 2], ['iphone-mini', 375, 812, 3], ['iphone-16', 393, 852, 3], ['iphone-16-pro', 402, 874, 3], ['iphone-pro-max', 440, 956, 3],
  ['galaxy-s24', 360, 780, 3], ['pixel-galaxy-a', 412, 915, 2.6], ['android-small', 360, 640, 2], ['fold-closed', 344, 882, 3], ['fold-open', 884, 1104, 2.5],
  ['ipad-mini', 744, 1133, 2], ['ipad', 820, 1180, 2], ['ipad-pro-13', 1032, 1376, 2], ['galaxy-tab', 800, 1280, 2],
];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0; const problems = [], shots = [];
const ok = (name, cond, info) => { if (!cond) { fails++; problems.push(name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); console.log('FAIL ' + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); } };
// what's on the screen: the bar's buttons, an open card's head and buttons, sideways scrolling
const layout = p => p.evaluate(() => {
  const W = innerWidth, H = innerHeight, r = e => { const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height, r: q.right, b: q.bottom }; };
  const vis = e => e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
  const out = { W, H, scrollX: document.documentElement.scrollWidth > W + 1, bar: [], sheet: null, off: [] };
  const bar = document.querySelector('.gbar');
  if (vis(bar)) for (const e of bar.querySelectorAll(':scope > *')) if (vis(e)) { const q = r(e); out.bar.push([e.className, Math.round(q.x), Math.round(q.r), Math.round(q.y), Math.round(q.b)]); if (q.x < -1 || q.r > W + 1 || q.y < -1) out.off.push(e.className); }
  const s = document.querySelector('.gsheet:not([hidden])');
  if (vis(s)) {
    const q = r(s), x = s.querySelector('.gx'), t = s.querySelector('h2'), btns = [...s.querySelectorAll('.gsheet-body button')].filter(vis);
    out.sheet = { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.w), h: Math.round(q.h), title: t && t.textContent };
    if (q.x < -1 || q.r > W + 1 || q.y < -1 || q.b > H + 1) out.off.push('sheet');
    if (x && vis(x)) { const xq = r(x); if (xq.x < 0 || xq.r > W || xq.y < 0 || xq.b > H) out.off.push('close'); }
    for (const e of btns) { const bq = r(e); if (bq.r > q.r + 1 || bq.x < q.x - 1) out.off.push('button ' + e.textContent.trim().slice(0, 20)); }
  }
  // the bar's things overlapping each other
  for (let i = 0; i < out.bar.length; i++) for (let j = i + 1; j < out.bar.length; j++) { const a = out.bar[i], c = out.bar[j]; if (a[1] < c[2] - 1 && c[1] < a[2] - 1 && a[3] < c[4] - 1 && c[3] < a[4] - 1) out.off.push('overlap ' + a[0] + ' / ' + c[0]); }
  return out;
});
for (const [name, w0, h0, dpr] of DEVICES) {
  if (ONLY && !ONLY.includes(name)) continue;
  for (const way of ['up', 'side']) {
    const W = way === 'up' ? Math.min(w0, h0) : Math.max(w0, h0), H = way === 'up' ? Math.max(w0, h0) : Math.min(w0, h0), tag = `${name}_${way}_${W}x${H}`;
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 1 });
    const T0 = new Date('2026-11-03T11:00:00+00:00').getTime();
    await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const settle = () => p.evaluate(() => document.getAnimations().forEach(a => a.finish()));
    const shot = async scr => { await settle(); await p.waitForTimeout(200); const file = `${OUT}/${tag}_${scr}${fr ? '_fr' : ''}.jpg`;
      await p.screenshot({ path: file, type: 'jpeg', quality: 80, timeout: 90000 }).then(() => shots.push([tag, scr, file])).catch(e => console.log('(picture skipped ' + tag + ' ' + scr + ')')); };
    try {
      await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
      await p.waitForTimeout(600); await shot('1_welcome');
      let L = await layout(p); ok(tag + ' welcome: the card all on the screen', !L.off.length && !L.scrollX, L.off);
      await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
      await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
      await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); f.step(1 / 30, 30); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 1200; g.data.coins = 2400; g.save(); f.gameUI().close(); f.gameUI().refresh(); f.draw(); });
      await p.waitForTimeout(300); await shot('2_farm');
      L = await layout(p); ok(tag + ' the farm: the top bar all on the screen, nothing on top of anything', !L.off.length && !L.scrollX && L.bar.length >= 6, { off: L.off, n: L.bar.length });
      await p.evaluate(() => { const f = window.__farm; f.openBirdCard(f.coopPlots()[0].birds[1]); f.draw(); });
      await p.waitForTimeout(300); await shot('3_hen');
      L = await layout(p); ok(tag + ' a hen\'s card all on the screen', L.sheet && !L.off.length, { off: L.off, sheet: L.sheet });
      await p.evaluate(() => { window.__farm.gameUI().close(); document.querySelector('.gbar .gpill:not(.glvl)').click(); });
      await p.waitForTimeout(300); await shot('4_shop');
      L = await layout(p); ok(tag + ' the shop all on the screen', L.sheet && !L.off.length, { off: L.off, sheet: L.sheet });
      await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.book(); });
      await p.waitForTimeout(300); await shot('5_book');
      L = await layout(p); ok(tag + ' the Breed Book all on the screen', L.sheet && !L.off.length, { off: L.off, sheet: L.sheet });
      ok(tag + ' no page errors', errs.length === 0, errs.slice(0, 2));
    } catch (e) { ok(tag + ' ran', false, e.message.split('\n')[0]); }
    await ctx.close();
    console.log('done', tag);
  }
}
fs.writeFileSync(`${OUT}/index.html`, `<html><body style="font:13px sans-serif">${[...new Set(shots.map(s => s[0]))].map(t => `<h3>${t}</h3>${shots.filter(s => s[0] === t).map(s => `<img src="${s[2].split('/').pop()}" style="height:360px;margin:2px">`).join('')}`).join('')}</body></html>`);
console.log(problems.length ? problems.length + ' problems' : 'no problems found');
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

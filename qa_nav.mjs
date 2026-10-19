// QA for the farmer finding his way: on a farm full of coops, send him to cuddle hens and fill feeders in coops all over
// the farm, and to stroll; sample where he walks and check he never walks through a pen (except through the gate of the
// pen he is visiting), the farmhouse or the pond.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const D = (page, fn, arg) => page.evaluate(fn, arg);
const check = (ok, what) => { console.log(ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(what); };
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'en-GB' })).newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
await page.locator('#sheetClose').click(); await page.waitForTimeout(1000);
await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1000);
await D(page, () => { const d = window.__ffDebug; d.rich(); d.quiet(); d.setHour(11); d.inside(g => { for (const id of g.DECOR_IDS) { g.state.decor.includes(id) || g.state.decor.push(id); } g.closeSheet(); }); });
await page.waitForTimeout(2500);
const coops = await D(page, () => window.__ffDebug.inside(g => g.state.coops.map(c => c.id)));
console.log('coops', coops.length);
async function watch(label, targetCoop, ms) {
  let worst = null, n = 0, moved = 0, last = null;
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const [x, y, st, act, task, left] = await D(page, () => window.__ffDebug.farmerXY());
    if (last) moved += Math.hypot(x - last[0], y - last[1]); last = [x, y];
    const loc = await D(page, ([x, y]) => window.__ffDebug.penLocal(x, y), [x, y]);
    for (const [id, lx, ly] of loc) {
      const inside = Math.abs(lx) < 1.75 && ly > -1.45 && ly < 1.45;
      const gate = id === targetCoop && Math.abs(lx + 0.15) < 0.75 && ly < 0.2;          // the way in through the gate, and the kneeling spot
      if (inside && !gate) { n++; if (!worst) worst = { id, lx: +lx.toFixed(2), ly: +ly.toFixed(2), st, act }; }
    }
    if (task == null && st === 'idle' && Date.now() - t0 > 3000 && label !== 'stroll') break;
    await page.waitForTimeout(120);
  }
  check(n === 0, `${label}: walked ${Math.round(moved)} px, inside a pen ${n} times ${worst ? JSON.stringify(worst) : ''}`);
}
// cuddles in coops far apart, one after another (he walks from one pen to the next)
for (const ci of [17, 1, 12, 5, 15]) {
  const id = await D(page, ci => window.__ffDebug.inside(g => { const c = g.state.coops[ci]; const b = g.birdsIn(c).find(b => g.isGrown(b)); b.happy = 0; g.actCuddle(b); return c.id; }), ci);
  await watch('cuddle in coop ' + ci, id, 60000);
}
for (const ci of [3, 16, 8]) { const id = await D(page, ci => window.__ffDebug.sendFeed(ci), ci); await watch('feeding coop ' + ci, id, 45000); }
await D(page, () => window.__ffDebug.speed(1));
await watch('stroll', -1, 40000);
console.log('BAD', JSON.stringify(bad));
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

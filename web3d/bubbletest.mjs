// The farm's bubbles kept clear of the buttons (8 Nov 2026; Audrey: "Yes", after a wheat field's "🌱 4 h" slipped under
// the basket in the corner column): ./withserver.sh node bubbletest.mjs   (LANG=fr; PORT)
// A level-3 farm, sideways. The view is moved so the wheat field's bubble would sit right over each of the corner column's
// buttons, the gear, the level and the coins (and over the compass, the view turned): it never covers one (moved off, or
// hidden where there's no room), its tail still towards the field; in open ground it's where it always was. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 600))); if (!c) fails++; };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}&time=11:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 240000 });
await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(3) + 5; g.data.lvSeen = 3; g.fishBag().gift = true; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 240000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); });
const SEL = '.gbar button, .gacts button, #compass';
// what the bubble does with the view centred at (x, z): where it is, where it points, the buttons it covers
const look = (x, z, size) => p.evaluate(([x, z, size]) => {
  const f = window.__farm; f.lookAt(x, z, size); if (f.gameUI().isOpen) f.gameUI().close(); f.draw();
  const e = document.querySelector('.gbub.gwheat'), r = e.getBoundingClientRect(), at = (e.dataset.at || '').split(',').map(Number);
  const tailPx = parseFloat(getComputedStyle(e).getPropertyValue('--tail')) || 0;
  const over = [...document.querySelectorAll('button')].filter(q => q.matches('.gbar button, .gacts button, #compass')).map(q => q.getBoundingClientRect())
    .filter(q => q.width > 0 && !e.hidden && r.right > q.left && r.left < q.right && r.bottom + 7 > q.top && r.top < q.bottom).length;
  return { hidden: e.hidden, text: e.textContent, x: (r.left + r.right) / 2, bottom: r.bottom + 7, at, tail: tailPx, over };
}, [x, z, size]);
// the view: wide enough to see the field, and how the screen moves when the view does
const [x0, z0] = await p.evaluate(() => window.__farm.viewAt());
let v = [x0, z0], s0 = null;
for (const size of [3.2, 4.4, 6]) { const q = await look(x0, z0, size); if (!q.hidden) { s0 = { size, q }; break; } }
if (!s0) {      // (the field off the first views: find it by walking the view round)
  for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4], [4, 4], [-4, -4], [4, -4], [-4, 4]]) { const q = await look(x0 + dx, z0 + dz, 6); if (!q.hidden) { s0 = { size: 6, q }; v = [x0 + dx, z0 + dz]; break; } }
}
ok('the wheat field\'s bubble on screen to start with', !!s0, s0);
if (s0) {
  const size = s0.size, J = await p.evaluate(() => { const f = window.__farm, a = f.screenOf(0, 0), bx = f.screenOf(1, 0), bz = f.screenOf(0, 1); return [bx.x - a.x, bx.y - a.y, bz.x - a.x, bz.y - a.y]; });
  let A = s0.q.at;      // (where it points, the view at v)
  const viewFor = T => { const ex = A[0] - T[0], ey = A[1] - T[1], det = J[0] * J[3] - J[2] * J[1]; return [v[0] + (ex * J[3] - J[2] * ey) / det, v[1] + (J[0] * ey - ex * J[1]) / det]; };
  v = viewFor([437, 230]); const qm = await look(v[0], v[1], size); A = qm.at;      // (the field in the middle of the screen)
  ok('in open ground: where it always was (no move, its tail in the middle)', !qm.hidden && Math.abs(qm.x - A[0]) < 1.5 && Math.abs(qm.bottom - A[1]) < 1.5 && Math.abs(qm.tail) < 0.5, qm);
  const spots = await p.evaluate(sel => [...document.querySelectorAll(sel)].map(q => ({ name: q.className || q.id, r: q.getBoundingClientRect() })).filter(q => q.r.width > 0).map(q => ({ name: q.name, x: (q.r.left + q.r.right) / 2, y: (q.r.top + q.r.bottom) / 2 + 20 })), SEL);
  const res = [];
  for (const S of spots) {
    const [x, z] = viewFor([S.x, S.y]); const q = await look(x, z, size);
    res.push({ name: S.name, aim: [Math.round(S.x), Math.round(S.y)], ...q });
  }
  const shown = res.filter(q => !q.hidden), moved = shown.filter(q => Math.hypot(q.x - q.at[0], q.bottom - q.at[1]) > 4);
  ok(`aimed under each of the ${spots.length} buttons (the column, the gear, the level, the coins): never over one`, res.every(q => q.hidden || q.over === 0), res.filter(q => !q.hidden && q.over));
  ok('mostly moved off rather than hidden, still showing its words', shown.length >= Math.ceil(res.length * 0.6) && moved.length >= 2, { shown: shown.length, moved: moved.length, of: res.length, hidden: res.filter(q => q.hidden).map(q => q.name) });
  ok('moved off a button: its tail turned towards the field (within the bubble)', moved.every(q => Math.abs(q.x + q.tail - q.at[0]) < 2 || Math.abs(q.tail) > 10), moved.map(q => ({ n: q.name, x: q.x, tail: q.tail, at: q.at })));
  // the compass: the view turned, then the bubble aimed at it
  await p.evaluate(() => window.__farm.turnView(30));
  const cs = await p.evaluate(() => { const c = document.getElementById('compass'), r = c.getBoundingClientRect(); return { shown: !c.hidden, x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 + 20 }; });
  const Jt = await p.evaluate(() => { const f = window.__farm, a = f.screenOf(0, 0), bx = f.screenOf(1, 0), bz = f.screenOf(0, 1); return [bx.x - a.x, bx.y - a.y, bz.x - a.x, bz.y - a.y]; });
  const [vx, vz] = await p.evaluate(() => window.__farm.viewAt());
  const q0 = await look(vx, vz, size);
  let qc = null;
  if (!q0.hidden) {
    const ex = q0.at[0] - cs.x, ey = q0.at[1] - cs.y, det = Jt[0] * Jt[3] - Jt[2] * Jt[1];
    qc = await look(vx + (ex * Jt[3] - Jt[2] * ey) / det, vz + (Jt[0] * ey - ex * Jt[1]) / det, size);
  }
  ok('the view turned, the bubble aimed under the compass: not over it', cs.shown && qc && (qc.hidden || qc.over === 0), { cs, q0, qc });
}
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

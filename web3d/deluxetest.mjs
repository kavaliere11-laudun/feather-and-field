// A coop only where its Deluxe garden fits, on a farm growing level by level (16 Nov 2026, Audrey: "I should not be able
// to put a coop on a place where there is not enough room for the deluxe from the start"; the fields made wider, widen.py):
// ./withserver.sh node deluxetest.mjs OUT      (W=874 H=402)
// Level 1 to 30 with the fields that level allows: each new breed's coop put down where the game first offers it; every
// one must be placed, and its Deluxe garden must fit there. And a bush in a coop's way moves to the nearest free spot
// (it isn't lost), stays there over a reload, and stands clear of every coop's Deluxe garden.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/deluxetest'; fs.mkdirSync(OUT, { recursive: true });
const W = +(process.env.W || 874), H = +(process.env.H || 402);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR || 1), hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(600000);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(Date.now()); if (f.gameUI().isOpen) f.gameUI().close(); }); };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { f.step(1 / 30, 1); f.gameTick(Date.now(), false); } }, s);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await load();
await p.evaluate(() => { const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); });
const fit0 = await p.evaluate(() => { const f = window.__farm, c = f.game().data.coops[0], S = f.coopSpotAt({ x: c.x, z: c.z, deg: c.deg }, 4, 0); return !!(S && S.ok); });
ok('the first coop stands where its Deluxe garden fits', fit0);
const res = [];
for (let L = 2; L <= +(process.env.MAXL || 50); L++) {      // (the road of 50 levels, 22 Nov 2026)
  const wait = await p.evaluate(L => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(L) + 1; g.data.lvSeen = L; g.data.coins = 9e6; let n = 0; while (n < 40 && n + 1 <= L) n++; g.data.land = [...Array(Math.max(1, n)).keys()]; g.save(); return { wait: g.waitingCoops(), land: g.data.land.length }; }, L);
  if (!wait.wait.length) continue;
  await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(0.5);
  for (const breed of wait.wait) {
    const ret = await p.evaluate(b => { const f = window.__farm, g = f.game(); if (f.gameUI().isOpen) f.gameUI().close(); const t0 = performance.now(), r = f.place(b); return { r, ms: Math.round(performance.now() - t0), can: g.placeable(b), hint: document.getElementById('hint').textContent }; }, breed); await run(0.6);
    const st = await p.evaluate(() => window.__farm.move.state());
    const placed = st.on && st.ok ? await p.evaluate(() => !!window.__farm.move.place()) : (await p.evaluate(() => { const f = window.__farm; if (f.move.state().on) f.move.cancel(); }), false);
    await run(1.2);
    const r = await p.evaluate(breed => { const f = window.__farm, g = f.game(), i = g.data.coops.findIndex(c => c.breed === breed), c = g.data.coops[i]; if (!c) return null; const S0 = f.coopSpotAt({ x: c.x, z: c.z, deg: c.deg }, 4, i), room = f.move.room(i, { x: c.x, z: c.z, deg: c.deg }); return { at: [c.x, c.z, c.deg], fit: room.grow, withApple: !!(S0 && S0.ok) }; }, breed);      // (fit: its Deluxe garden; a Glutton's apple tree beside it moves to the other side or waits if its corner doesn't fit: tryUpgrade)
    res.push({ L, land: wait.land, breed, placed, ret, st, grow: st.grow, why: st.why, ...(r || {}) }); console.log(JSON.stringify(res[res.length - 1]));
  }
}
ok('every new breed\'s coop is placed where the game first offers it, at its level', res.length >= 10 && res.every(r => r.placed), res.filter(r => !r.placed));
ok('…and its Deluxe garden fits there', res.every(r => r.fit), res.filter(r => !r.fit));
// a coop moved onto a bush: the bush hops to a new place in sight (17 Nov 2026, Audrey: "I moved a coop and it killed a bush")
const hop = await p.evaluate(async () => { const f = window.__farm, g = f.game(); f.gameUI().close(); f.move.start(0); const c0 = f.coopAt(0);
  for (let z = -40; z <= 0; z += 0.5) for (let x = -45; x <= -5; x += 0.5) { if (Math.hypot(x - c0[0], z - c0[1]) < 6) continue; for (const deg of [90, 0, 45, 315]) { const r = f.move.room(0, { x, z, deg }); if (!r.now || !r.grow) continue; f.move.to(x, z, deg); const s = f.move.state(); if (s.ok && s.at.x === x && s.at.z === z && s.clear.some(id => id[0] === 'b')) { const ids = s.clear.filter(id => id[0] === 'b'), n0 = f.nature().bushes; const placed = !!f.move.place(); return { ids, n0, placed, n1: f.nature().bushes, hops: f.nature().hops() }; } } }
  f.move.cancel(); return null; });
await run(2.5);
const hop2 = hop && await p.evaluate(ids => { const f = window.__farm, mv = f.nature().moved(); return { hops: f.nature().hops(), there: ids.every(id => mv.some(m => m[0] === id)), n: f.nature().bushes }; }, hop.ids);
ok('a coop moved onto a bush: the bush hops away (no puff), and stands at its new place when it lands; as many bushes as before', hop && hop.placed && hop.hops === hop.ids.length && hop2.hops === 0 && hop2.there && hop2.n === hop.n0, { hop, hop2 });
// the bushes: moved, not lost
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.game().save(); }); 
const bush = await p.evaluate(() => { const f = window.__farm, g = f.game(); const cl = g.data.cleared.filter(k => k[0] === 'b'), mv = f.nature().moved(); return { cleared: cl.length, moved: mv.length, mv }; });
ok('bushes that were in a coop\'s way stand somewhere else on the farm (none lost)', bush.cleared > 0 && bush.moved === bush.cleared, { cleared: bush.cleared, moved: bush.moved });
const clear = await p.evaluate(() => { const f = window.__farm, g = f.game(); return f.nature().moved().filter(([id, x, z]) => g.data.coops.some((c, i) => { const G = f.move.grown(i, 4); if (!G) return false; const a = c.deg * Math.PI / 180, dx = x - c.x, dz = z - c.z, lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a); return lx > G.foot.x0 && lx < G.foot.x1 && lz > G.foot.z0 && lz < G.foot.z1; })).length; });
ok('…none of them inside a coop\'s Deluxe garden', clear === 0, clear);
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.focus(-21, -17, 13); }); await run(2); await p.evaluate(() => window.__farm.draw()); await p.waitForTimeout(500);
await p.screenshot({ path: OUT + '/deluxe_1.png' });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const again = await p.evaluate(() => window.__farm.nature().moved());
ok('a reload: each moved bush where it was, the save not flagged', JSON.stringify(again) === JSON.stringify(bush.mv) && !(await p.evaluate(() => window.__farm.game().edited)), { n: again.length });
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);

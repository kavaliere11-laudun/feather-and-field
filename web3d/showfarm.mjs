// A showcase farm for the App Store's pictures (24 Nov 2026): ./withserver.sh node showfarm.mjs OUT.json   (PORT; MAXL: the
// level it grows to (30); DECOR: the decorations bought, comma-separated)
// A new farm grown level by level, every field restored, each breed's coop put down where the game first offers it (as
// deluxetest does), every coop then at its Deluxe look, the geese and Biscuit, a few decorations put where the game offers
// them. Writes the save as the page keeps it ({ save, T }) for storeshots.mjs to open.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/showfarm.json';
const MAXL = +(process.env.MAXL || 30);
const DECOR = (process.env.DECOR || 'flowers,birdbath,beehives,greenhouse,windmill,bandstand').split(',').filter(Boolean);
const T = new Date('2026-11-24T10:30:00Z').getTime();
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(600000);
await ctx.addInitScript(T => { window.__T = T; Date.now = () => window.__T; }, T);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); }); };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { f.step(1 / 30, 1); f.gameTick(Date.now(), false); } }, s);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await load();
await p.evaluate(() => { const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.save(); });
const placed = [];
for (let L = 2; L <= MAXL; L++) {
  const wait = await p.evaluate(L => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(L) + 1; g.data.lvSeen = L; g.data.coins = 9e6; g.data.land = [...Array(Math.min(40, L)).keys()]; g.save(); return g.waitingCoops(); }, L);
  if (!wait.length) continue;
  await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(0.5);
  for (const breed of wait) {
    await p.evaluate(b => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); f.place(b); }, breed); await run(0.6);
    const st = await p.evaluate(() => window.__farm.move.state());
    const ok = st.on && st.ok ? await p.evaluate(() => !!window.__farm.move.place()) : (await p.evaluate(() => { const f = window.__farm; if (f.move.state().on) f.move.cancel(); }), false);
    await run(1.0); placed.push([L, breed, ok]);
  }
}
// every field, every coop at its Deluxe look, the geese and the dog
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.land = [...Array(40).keys()]; for (const c of g.data.coops) c.tier = 4; g.data.coins = 9e6; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(0.5);
await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); f.animal.buy('geese'); }); await run(1);
await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); f.animal.buy('dog'); }); await run(1);
const dog = await p.evaluate(() => { const f = window.__farm, st = f.deco.state(); if (st && st.on && st.ok) return !!f.deco.place(); if (st && st.on) f.deco.cancel(); return false; }); await run(1);
const decor = [];
for (const id of DECOR) {
  const r = await p.evaluate(id => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); f.deco.buy(id); const st = f.deco.state(); if (st.on && st.ok) return !!f.deco.place(); if (st.on) f.deco.cancel(); return false; }, id);
  await run(0.8); decor.push([id, r]);
}
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 24680; g.save(); });
const save = await p.evaluate(() => localStorage.getItem('ff3d.farm'));
fs.writeFileSync(OUT, JSON.stringify({ save, T }));
console.log('placed', JSON.stringify(placed), 'dog', dog, 'decor', JSON.stringify(decor), 'errors', JSON.stringify(errs));
await b.close();

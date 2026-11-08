// A farm to picture looks on (8 Nov 2026, the art style mocks): level 12, seven fields, the Red Barn, the Orpingtons', the
// white and the buff Silkies', the Ayam Cemanis' and the call ducks' houses put where the game offers, a couple of looks
// up, a flower bed, a bird bath, the beehives, the geese, the wheat and the garden growing: ./withserver.sh node
// mockfarm.mjs OUT.json   (PORT). Writes the save (as the page keeps it) for stylemock.mjs to open.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || 'mockfarm.json';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, locale: 'en-GB', timezoneId: 'Europe/London' });
await ctx.addInitScript(() => { window.__T = new Date('2026-11-09T11:00:00Z').getTime(); Date.now = () => window.__T; });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=en`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 }); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } }, s);
const close = () => p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(12) + 5; g.data.lvSeen = 12; g.fishBag().gift = true; g.save(); });
await run(1); await close();
for (let i = 0; i < 7; i++) { await p.evaluate(() => { const f = window.__farm; f.game().data.coins = 90000; f.buyLand(); }); await run(4); await close(); }
for (const breed of ['orp', 'sil', 'aya', 'call', 'sil_buff']) {
  const ok = await p.evaluate(b => { const f = window.__farm; if (!f.place(b)) return 'no place'; const s = f.move.state(); return s.ok ? (f.move.place() ? 'placed' : 'not put') : 'bad ' + s.why; }, breed);
  console.log(breed, ok); await run(3); await close();
}
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.coins = 90000; g.save(); });
for (const [i, n] of [[0, 2], [1, 3], [2, 1], [3, 2]]) for (let k = 0; k < n; k++) { for (let w = 0; w < 30 && await p.evaluate(() => { const L = window.__farm.farmer(); return !!(L && (L.pen || L.pending)); }); w++) await run(1); console.log('upgrade', i, await p.evaluate(i => window.__farm.upgrade(i), i)); await run(2); await close(); }
for (const id of ['flowers', 'birdbath', 'beehives']) { const r = await p.evaluate(id => { const f = window.__farm, c = f.game().data.coops[0]; f.lookAt(c.x + 4, c.z + 4, 4.4); f.deco.start(id); const s = f.deco.state(); return s.ok ? f.deco.place() : 'bad ' + s.why; }, id); console.log(id, r); await run(3); await close(); }
await p.evaluate(() => { window.__farm.animal.buy('geese'); }); await run(4); await close();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.sowWheat(); const G = g.garden(), now = Date.now(); G.beds[0] = { crop: 'carrot', ripe: now + 1800e3 }; G.beds[1] = { crop: 'straw', ripe: now + 3600e3 }; G.beds[2] = { crop: 'pump', ripe: now + 4 * 3600e3 }; g.data.coins = 1250; g.save(); });
await run(3); await close();
const save = await p.evaluate(() => localStorage.getItem('ff3d.farm'));
fs.writeFileSync(OUT, JSON.stringify({ save, T: await p.evaluate(() => window.__T) }));
console.log('saved', save.length, 'chars; coops', await p.evaluate(() => window.__farm.game().data.coops.map(c => c.breed + c.tier).join(' ')), 'errors', errs);
await b.close();

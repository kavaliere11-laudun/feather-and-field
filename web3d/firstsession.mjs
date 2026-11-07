// The first visits of a new farm, minute by minute (the balance of the first levels, 7 Nov 2026): node firstsession.mjs [start hour=10]
// A keen new player: a first visit of 15 minutes (the eggs as they're laid, a cuddle for each bird, the wheat sown, the
// jobs collected, the chickens asked for their worms and the worms fished), then the same again at 19:00, and twice a day
// (8:00 and 19:00) after. Prints the XP and the level as they come.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
let NOW = Date.UTC(2026, 10, 9, +(process.argv[2] || 10), 0);
Date.now = () => NOW;
const G = await import('./src/game.js');
const { Game, WHEAT } = G;
let s = 7; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const g = new Game(null); g.newFarm({ lang: 'en', look: 'f', name: 'Sim' }); g.data.wheat.x = 0; g.data.wheat.z = 0;
const start = NOW, lv = {}; let last = 1;
const visit = (mins) => {
  for (const e of g.dueLays(NOW)) g.layEgg(e.hen, e.t, NOW);
  g.broodTick(NOW);
  for (const c of g.data.coops) g.collect(c.id);
  if (g.wheatStage(NOW) === 'ripe') g.harvestWheat(NOW);
  if (g.wheatStage(NOW) === 'soil' && g.data.coins >= WHEAT.sow) g.sowWheat(NOW);
  for (const b of g.data.birds) g.cuddle(b.id, NOW);
  for (const b of g.data.birds) g.askWorms(b.id, NOW);
  for (let k = 0; k < 3 && g.fishOpen('pond') && g.worms() > 0; k++) { const b = g.castWorm('pond', NOW, Math.random); if (!b) break; g.landFish(); }
  if (g.huntOpen && g.huntOpen()) g.huntFind(NOW);
  if (g.orders) for (const o of [...g.orders(NOW)]) if (g.orderReady(o)) g.deliverOrder(o.id, NOW);
  const J = g.jobs(NOW); J.list.forEach((j, i) => { if (j.got >= j.n && !j.paid) g.claimJob(i, NOW); });
  for (const st of ['eggs', 'cuddle', 'sow', 'jobs', 'shop']) g.guideDid(st);
  if (g.fishGift) g.fishGift();
  if (g.levelNews()) g.seenLevel();
  const sale = g.landForSale(); if (sale && g.data.coins >= sale.price + 40) g.buyLand();
  for (const breed of g.waitingCoops()) { const dft = g.draftCoop(breed, { x: 30, z: 0, deg: 90 }); if (dft) g.placeCoop(dft, { x: 30, z: 0, deg: 90 }); }
  if (g.level !== last) { lv[g.level] = ((NOW - start) / 3600e3); last = g.level; }
};
const out = [];
for (let m = 0; m <= 15; m++) { NOW = start + m * 60e3; visit(); if (m % 5 === 0) out.push(`min ${m}: xp ${g.data.xp} level ${g.level}`); }
const day0 = start - (start % 86400e3);
const visits = [day0 + 19 * 3600e3]; for (let d = 1; d < 14; d++) visits.push(day0 + d * 86400e3 + 8 * 3600e3, day0 + d * 86400e3 + 19 * 3600e3);
for (const t of visits) { for (let m = 0; m <= 10; m += 5) { NOW = t + m * 60e3; visit(); } out.push(`day ${Math.floor((t - day0) / 86400e3)} ${new Date(t).getUTCHours()}:00 xp ${g.data.xp} level ${g.level} coins ${g.data.coins}`); }
console.log(out.join('\n'));
console.log('levels at (hours from the start):', Object.entries(lv).map(([L, h]) => `L${L} ${h < 1 ? Math.round(h * 60) + ' min' : h.toFixed(1) + ' h'}`).join(', '));

// The balance (release 1 step 11): simulated players over a year, through the game's own rules (src/game.js), on a
// fake clock. node balsim.mjs [days=365] [profile=all] [seeds=3]
// Profiles: 'daily' (once a day, 19:00), 'twice' (8:00 and 19:00), 'often' (every 3 hours, 8:00 to 23:00). At each visit
// the player does everything a keen player would: collects the eggs and the honey, asks the chickens for their worms and goes fishing with up to 8 a day (release 5), fills the feeders (grain first), sows
// and harvests the wheat, cuddles every bird, enters the best bird in each open show, collects the jobs, buys the next field
// when it can, places a new breed's coop, upgrades the coops (release 4), and buys decorations, the geese and the dog, and outfits once they leave a reserve
// for feed and land.
// Prints, for each profile: the level reached on days 7, 30, 90, 180, 365, the day each level comes, the coins, the
// birds, and where the coins came from.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
let NOW = Date.UTC(2026, 9, 26, 9, 0);
Date.now = () => NOW;
const G = await import('./src/game.js');
const { Game, DECOR, OUTFITS, WHEAT } = G;
if (process.env.BAL) { const o = JSON.parse(process.env.BAL); for (const k in o) { if (k in G.XPV) G.XPV[k] = o[k]; else if (k.startsWith('fresh.')) G.FRESH[k.slice(6)] = o[k]; } }      // (other values to try)
const DAYS = +(process.argv[2] || 365), WHICH = process.argv[3] || 'all', SEEDS = +(process.argv[4] || 3);
const PROFILES = { daily: [19], twice: [8, 19], often: [8, 11, 14, 17, 20, 23] };
function rngOf(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function simulate(name, seed) {
  NOW = Date.UTC(2026, 9, 26, 9, 0) + seed * 3600e3 * 24 * 7;
  const g = new Game(null), R = rngOf(seed * 7919 + 1);
  Math.random = R;                                   // (the trios' personalities and names, the same each run)
  g.newFarm({ lang: 'en', look: 'f', name: 'Sim' });
  g.data.wheat.x = 0; g.data.wheat.z = 0;            // (the farm puts it somewhere; here, anywhere)
  const xpBy = {}, track = (k, f) => { const x0 = g.data.xp; const r = f(); xpBy[k] = (xpBy[k] || 0) + g.data.xp - x0; return r; };
  const earn = { eggs: 0, chicks: 0, shows: 0, jobs: 0, honey: 0, fish: 0, guide: 0 }, spend = { feed: 0, land: 0, decor: 0, outfits: 0, shows: 0, wheat: 0 };
  const levelDay = {}, at = {}, rares = [], foxes = { n: 0, eggs: 0 }, upDay = {}; let silkDays = 0;
  const start = NOW, hours = PROFILES[name];
  let spot = 0;
  for (let d = 0; d < DAYS; d++) {
    const day0 = start + d * 86400e3 - ((start % 86400e3) - 0);    // (midnight UTC of the day)
    for (const h of hours) {
      NOW = day0 + h * 3600e3 + Math.floor(R() * 40) * 60e3;
      // the game catching up (as the farm does when it opens)
      const coins0 = g.data.coins;
      const news = track('chicks', () => g.broodTick(NOW));
      const chicks = news.filter(n => n.type === 'sold').reduce((a, n) => a + n.coins, 0); earn.chicks += chicks;
      for (const n of news.filter(n => n.type === 'sold')) for (const k of n.news.kids) if (k.rare) rares.push(d);      // (rare babies: kept while there's room, else sold for you)
      for (const e of [...g.rareWaiting()]) g.keepRare(e.id, NOW);
      silkDays += g.data.coops.filter(c => G.RARE_FROM[c.breed]).length / hours.length;
      const shows = track('shows', () => g.showTick(NOW)); for (const r of shows) earn.shows += r.coins || 0;
      { const fx = g.foxTick(NOW); if (fx) { foxes.n++; foxes.eggs += fx.eggs; } }      // (Rusty's visits, release 3: the doors left open; eggs taken until the geese come)
      for (const e of g.dueLays(NOW)) g.layEgg(e.hen, e.t, NOW);
      g.seenShows(); for (const n of g.unseenNews()) g.seenNews(n);
      // the eggs, the honey, the wheat
      for (const c of g.data.coops) { const r = track('eggs', () => g.collect(c.id)); if (r) earn.eggs += r.coins; }
      const hr = track('honey', () => g.collectHoney(NOW)); if (hr) earn.honey += hr.coins;
      if (g.wheatStage(NOW) === 'ripe') track('wheat', () => g.harvestWheat(NOW));
      // fishing (release 5): the chickens asked for their worms (Friendly 1, Trusting 2, Best friend 3 a day), then up to 8
      // worms fished at the first visit (a keen player's few minutes; the river half the time once it's open), most fish
      // landed (fewer of the rare ones, fewer still of the legendary)
      if (h === hours[0]) for (const b of g.data.birds) g.askWorms(b.id, NOW);
      if (h === hours[0]) for (let k = 0; k < 8 && g.fishOpen('pond') && g.worms() > 0; k++) {
        const b = g.castWorm(g.fishOpen('river') && R() < 0.5 ? 'river' : 'pond', NOW, R); if (!b) break;
        if (R() < [0.85, 0.75, 0.6][b.rare]) { const r = track('fish', () => g.landFish()); if (r) earn.fish += r.coins; } else g.loseFish();
      }
      if (g.wheatStage(NOW) === 'soil' && g.data.coins >= WHEAT.sow + 40) { g.sowWheat(NOW); spend.wheat += WHEAT.sow; }
      // the feeders (when below half: the grain first)
      for (const c of g.data.coops) if (g.feedLeft(c, NOW) < 0.5) { const q = track('feed', () => g.fillFeeder(c.id, NOW)); if (q && q.cost) spend.feed += q.cost; }
      // cuddles
      for (const b of g.data.birds) track('cuddles', () => g.cuddle(b.id, NOW));
      // shows: the best bird in each open one (if her chance is fair)
      for (const s of g.openShows(NOW)) {
        if (s.locked || g.shows().in.some(e => e.id === s.id)) continue;
        const cands = g.showBirds(s).filter(x => g.canEnter(x.b, s) === 'ok');
        if (cands.length && cands[0].ch.rosette > 0.15) { const fee = G.SHOWS[s.id[0]].fee; const r = g.enterShow(s.id, cands[0].b.id, NOW); if (r) spend.shows += fee; }
      }
      // the jobs
      const J = g.jobs(NOW); J.list.forEach((j, i) => { if (j.got >= j.n && !j.paid) { const r = track('jobs', () => g.claimJob(i, NOW)); if (r) earn.jobs += r.coins; } });
      // a new level: seen; the next field when it can; a new breed's coop placed
      if (g.levelNews()) g.seenLevel();
      const sale = g.landForSale();
      if (sale && g.data.coins >= sale.price) { const r = track('land', () => g.buyLand()); if (r && !r.broke) spend.land += sale.price; }
      for (const breed of g.waitingCoops()) { spot++; const dft = g.draftCoop(breed, { x: spot * 6, z: 0, deg: 90 }); if (dft) track('coops', () => g.placeCoop(dft, { x: spot * 6, z: 0, deg: 90 })); }
      // decorations and outfits, keeping enough back for the next field and a few days' feed
      const keep = (g.landNext() ? g.landNext().price : 0) + 60 * g.data.coops.length;
      for (const c of g.data.coops) { const n = g.coopNext(c); if (n && g.data.coins - n.price >= keep && track('upgrades', () => g.upgradeCoop(c.id) === 'ok')) { spend.upgrades = (spend.upgrades || 0) + n.price; if (c.breed === 'rir') upDay[n.tier] = d + 1; if (c.breed === 'orp') upDay['orp' + n.tier] = d + 1; if (c.breed === 'sil') upDay['sil' + n.tier] = d + 1; if (c.breed === 'leg') upDay['leg' + n.tier] = d + 1; if (c.breed === 'bra') upDay['bra' + n.tier] = d + 1; if (c.breed === 'pol' || c.breed === 'aya') upDay[c.breed + n.tier] = d + 1; } }      // (the coops' looks, release 4)
      for (const line of g.rareCoops()) if (g.data.coins - G.RARE.coop >= keep) { spot++; const dft = g.draftCoop(line, { x: spot * 6, z: 0, deg: 90 }); if (dft && track('coops', () => g.placeCoop(dft, { x: spot * 6, z: 0, deg: 90 }))) spend.rare = (spend.rare || 0) + G.RARE.coop; }      // (a rare colour's own coop)
      for (const id of Object.keys(DECOR)) if (g.decorNext(id) && g.data.coins - DECOR[id].price >= keep) { spot++; if (track('decor', () => g.buyDecor(id, DECOR[id].pond ? null : { x: -spot * 4, z: 9 }))) spend.decor += DECOR[id].price; }
      for (const id of Object.keys(G.ANIMALS)) if (g.animalNext(id) && g.data.coins - G.ANIMALS[id].price >= keep) { spot++; if (track('animals', () => g.buyAnimal(id, NOW, { x: -spot * 4, z: 14 }))) spend.animals = (spend.animals || 0) + G.ANIMALS[id].price; }      // (the geese and the dog, release 3)
      for (const id of Object.keys(OUTFITS)) if (g.outfitNext(id) && g.data.coins - OUTFITS[id].price >= keep) { if (track('outfits', () => g.buyOutfit(id))) spend.outfits += OUTFITS[id].price; }
      const L = g.level; if (!levelDay[L]) levelDay[L] = d + 1;
    }
    if ([7, 30, 90, 180, 365].includes(d + 1)) at[d + 1] = { level: g.level, coins: g.data.coins, birds: g.data.birds.length, coops: g.data.coops.length, land: g.data.land.length, decor: (g.data.decor || []).length };
  }
  return { levelDay, at, earn, spend, xp: g.data.xp, xpBy, rares, silkDays, basket: g.basket().length, rareCoops: g.data.coops.filter(c => G.RARE_LINES.includes(c.breed)).length, foxes, upDay };
}
const avg = (list, f) => list.reduce((a, x) => a + f(x), 0) / list.length;
for (const name of Object.keys(PROFILES)) {
  if (WHICH !== 'all' && WHICH !== name) continue;
  const runs = []; for (let s = 1; s <= SEEDS; s++) runs.push(simulate(name, s));
  console.log(`\n== ${name} (${PROFILES[name].length} visit${PROFILES[name].length > 1 ? 's' : ''} a day, ${SEEDS} farms)`);
  for (const d of [7, 30, 90, 180, 365]) if (runs[0].at[d]) console.log(`day ${String(d).padStart(3)}: level ${avg(runs, r => r.at[d].level).toFixed(1)}, coins ${Math.round(avg(runs, r => r.at[d].coins))}, birds ${avg(runs, r => r.at[d].birds).toFixed(0)}, coops ${avg(runs, r => r.at[d].coops).toFixed(1)}, fields ${avg(runs, r => r.at[d].land).toFixed(1)}, decorations ${avg(runs, r => r.at[d].decor).toFixed(1)}`);
  const lv = [2, 3, 5, 6, 8, 10, 11, 13, 15, 17, 20, 23, 25, 30].map(L => `L${L}:${runs.every(r => r.levelDay[L]) ? Math.round(avg(runs, r => r.levelDay[L])) : '-'}`);
  console.log('the day each level comes: ' + lv.join(' '));
  console.log('earned: ' + Object.entries(runs[0].earn).map(([k]) => `${k} ${Math.round(avg(runs, r => r.earn[k]))}`).join(', '));
  console.log('XP from: ' + Object.keys(runs[0].xpBy).map(k => `${k} ${Math.round(avg(runs, r => r.xpBy[k] || 0))}`).join(', '));
  console.log('Rusty: ' + avg(runs, r => r.foxes.n).toFixed(1) + ' visits in the time, ' + avg(runs, r => r.foxes.eggs).toFixed(1) + ' eggs taken');
  console.log('rare babies: ' + avg(runs, r => r.rares.length).toFixed(1) + ' in the year, one every ' + (avg(runs, r => r.silkDays / Math.max(1, r.rares.length)) / 30).toFixed(1) + ' months a Silkie coop; the first on day ' + Math.round(avg(runs, r => r.rares[0] || 0)) + '; in the basket at the end ' + avg(runs, r => r.basket).toFixed(1) + ', rare coops ' + avg(runs, r => r.rareCoops).toFixed(1));
  console.log('the Red Barn: ' + [1, 2, 3, 4].map(t => ['', 'Mended', 'Snug', 'Cosy', 'Deluxe'][t] + ' day ' + (runs.every(r => r.upDay[t]) ? Math.round(avg(runs, r => r.upDay[t])) : '-')).join(', '));
  console.log('the Thatched Cottage: ' + [1, 2, 3, 4].map(t => ['', 'Mended', 'Snug', 'Cosy', 'Deluxe'][t] + ' day ' + (runs.every(r => r.upDay['orp' + t]) ? Math.round(avg(runs, r => r.upDay['orp' + t])) : '-')).join(', '));
  console.log('the white Silkies\' Pagoda: ' + [1, 2, 3, 4].map(t => ['', 'Mended', 'Snug', 'Cosy', 'Deluxe'][t] + ' day ' + (runs.every(r => r.upDay['sil' + t]) ? Math.round(avg(runs, r => r.upDay['sil' + t])) : '-')).join(', '));
  console.log('the Stone Cottage: ' + [1, 2, 3, 4].map(t => ['', 'Mended', 'Snug', 'Cosy', 'Deluxe'][t] + ' day ' + (runs.every(r => r.upDay['leg' + t]) ? Math.round(avg(runs, r => r.upDay['leg' + t])) : '-')).join(', '));
  console.log('the Timber Lodge: ' + [1, 2, 3, 4].map(t => ['', 'Mended', 'Snug', 'Cosy', 'Deluxe'][t] + ' day ' + (runs.every(r => r.upDay['bra' + t]) ? Math.round(avg(runs, r => r.upDay['bra' + t])) : '-')).join(', '));
  for (const [k, nm] of [['pol', 'the Little Windmill'], ['aya', 'the Javanese House']])          // (release 7's)
    console.log(nm + ': ' + [1, 2, 3, 4].map(t => ['', 'Mended', 'Snug', 'Cosy', 'Deluxe'][t] + ' day ' + (runs.every(r => r.upDay[k + t]) ? Math.round(avg(runs, r => r.upDay[k + t])) : '-')).join(', '));
  console.log('spent: ' + Object.entries(runs[0].spend).map(([k]) => `${k} ${Math.round(avg(runs, r => r.spend[k]))}`).join(', '));
}

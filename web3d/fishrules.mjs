// Fishing in the game's rules (release 5; src/game.js FISHING, FISH_RULES, castWorm, landFish, buyWorms, the save check):
// node fishrules.mjs   (no browser)
// The pond opens at level 3, the river at 8. Worms: found by the chickens who love the farmer (Audrey's idea: Friendly 1 a
// day, Trusting 2, Best friend 3, all of them when asked, once a day; shy ones none), or from tins (10 for 60 coins); no
// worm, no cast. A cast decides the fish (only that water's, by their weights: the commons most of the time, a
// legendary one now and then), its size within its sizes; landed: sold (a little more the bigger, a legendary one's photo
// at its fixed price), its XP (+10 for a fish new to you), counted, the biggest kept; lost: nothing. The save: kept and
// unflagged; unknown fish, sizes out of range, counts not whole, more worms than a bag holds, a river fish before level 8,
// a hen's worm day ahead: flagged and put right. A farm from before fishing: none, unflagged; one from when worms came free
// each morning: those left kept as worms, unflagged (more than a day's: flagged).
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
let NOW = new Date(2026, 10, 3, 11, 0).getTime();
Date.now = () => NOW;
const G = await import('./src/game.js');
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const mem = {}, store = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
const g = new G.Game(store); g.newFarm({ lang: 'en', look: 'f', name: 'Test' });
ok('a new farm: no fishing yet (level 1), nothing saved for it', !g.fishOpen('pond') && !g.fishOpen('river') && g.castWorm('pond') === null && !('fish' in g.data));
g.data.xp = G.xpFor(3);
ok('level 3: the pond opens, not the river', g.fishOpen('pond') && !g.fishOpen('river') && g.castWorm('river') === null);
ok('no free worms: none in the bag, no cast', g.worms() === 0 && g.castWorm('pond') === null);
// worms from the chickens: by how much each loves the farmer
const [h1, h2, roo] = [g.data.birds.find(b => b.sex === 'h'), g.data.birds.filter(b => b.sex === 'h')[1], g.data.birds.find(b => b.sex === 'r')];
h1.trust = 0; h2.trust = G.TRUST_AT[1]; roo.trust = G.TRUST_AT[3];
ok('a shy hen finds none', g.wormsOf(h1) === 0 && g.askWorms(h1.id) === null && !('worm' in h1));
let w = g.askWorms(h2.id);
ok('a friendly hen: 1 worm, given at once', w && w.n === 1 && g.worms() === 1 && g.wormsGiven(h2));
ok('asked again the same day: no more', g.askWorms(h2.id) === null && g.worms() === 1);
w = g.askWorms(roo.id);
ok('the rooster, best friends: 3 worms', w && w.n === 3 && g.worms() === 4);
h1.trust = G.TRUST_AT[2];
w = g.askWorms(h1.id);
ok('trusting: 2 worms', w && w.n === 2 && g.worms() === 6);
// a seeded random
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const casts = [];
for (let i = 0; i < 6; i++) { casts.push(g.castWorm('pond', NOW, rnd)); g.landFish(); }
ok('six casts, each a pond fish within its sizes; then no worms, no cast', casts.every(c => c && G.FISH_RULES[c.id].water === 'pond' && c.cm >= G.FISH_RULES[c.id].cm[0] && c.cm <= G.FISH_RULES[c.id].cm[1]) && g.worms() === 0 && g.castWorm('pond', NOW, rnd) === null, casts.map(c => c && c.id));
NOW += 86400e3;
ok('the next day: still none till asked; then each gives again', g.worms() === 0 && !g.wormsGiven(h2) && g.askWorms(h2.id).n === 1 && g.askWorms(roo.id).n === 3 && g.worms() === 4);
g.data.fish.worms = 0;
g.data.coins = 50;
ok('a tin of worms: not without 60 coins', g.buyWorms() === null && g.data.coins === 50);
g.data.coins = 200;
const t = g.buyWorms();
ok('a tin of worms: 10 for 60 coins', t && t.n === 10 && t.price === 60 && g.data.coins === 140 && g.worms() === 10, t);
g.castWorm('pond', NOW, rnd); g.loseFish();
ok('a cast: a worm used', g.worms() === 9);
ok('lost: nothing to land', g.landFish() === null);
// the draw: many casts (worms given), the commons most of the time, a legendary one now and then
const count = {}; g.data.fish.worms = 999;
for (let i = 0; i < 5000; i++) { const c = g.castWorm('pond', NOW, rnd); count[c.id] = (count[c.id] || 0) + 1; g.loseFish(); if (g.data.fish.worms < 10) g.data.fish.worms = 999; }
const share = id => (count[id] || 0) / 5000;
ok('the draw: commons about 90%, the rare ones about 8.5%, Big Bertha about 1.5%', Math.abs(share('roach') - 0.3) < 0.03 && Math.abs(share('golden_tench') + share('koi') - 0.085) < 0.02 && share('big_bertha') > 0.007 && share('big_bertha') < 0.025, count);
// landing: coins, XP, the count, the biggest
g.data.fish.got = {}; const c0 = g.data.coins, x0 = g.data.xp;
g.bite = { id: 'perch', cm: 20, water: 'pond', rare: 0 };
let r = g.landFish();
ok('a first perch, 20 cm: sold (its price for its size), XP +1 and +10 for a new fish, counted', r && r.first && !r.best && r.coins === G.fishPrice('perch', 20) && g.data.coins === c0 + r.coins && r.xp === 11 && g.data.xp === x0 + 11 && g.fishGot('perch').n === 1 && g.fishGot('perch').best === 20, r);
g.bite = { id: 'perch', cm: 31, water: 'pond', rare: 0 }; r = g.landFish();
ok('a bigger one: "your biggest yet", 1 XP, a little more for its size', r && !r.first && r.best && r.xp === 1 && r.coins > G.fishPrice('perch', 20) && g.fishGot('perch').n === 2 && g.fishGot('perch').best === 31, r);
g.bite = { id: 'perch', cm: 18, water: 'pond', rare: 0 }; r = g.landFish();
ok('a smaller one: not the biggest; the biggest kept', r && !r.best && g.fishGot('perch').best === 31 && g.fishGot('perch').n === 3, r);
g.bite = { id: 'big_bertha', cm: 90, water: 'pond', rare: 2 }; r = g.landFish();
ok('Big Bertha: her photo, 300 coins, 25 XP and 10 for a new fish, legendary', r && r.legend && r.coins === 300 && r.xp === 35, r);
// the river at level 8
g.data.xp = G.xpFor(8);
const rc = g.castWorm('river', NOW, rnd);
ok('level 8: the river, its own fish', g.fishOpen('river') && rc && G.FISH_RULES[rc.id].water === 'river', rc); g.landFish();
// the save
const re = () => { const h = new G.Game(store); const d = h.load(); return { d, edited: h.edited }; };
let L = re();
ok('a reload: the worms, the counts and the biggest kept, unflagged; the hens\' worm days too', L.d && !L.edited && L.d.fish.got.perch[0] === 3 && L.d.fish.got.perch[1] === 31 && L.d.fish.worms === g.data.fish.worms && L.d.birds.find(b => b.id === roo.id).worm === roo.worm, L.d && L.d.fish);
const raw = JSON.parse(mem[G.SAVE_KEY]);
const tamper = f => { const x = JSON.parse(JSON.stringify(raw)); f(x.d); mem[G.SAVE_KEY] = JSON.stringify(x); return re(); };
L = tamper(d => { d.fish.got.shark = [1, 300]; });
ok('an unknown fish: flagged, dropped', L.edited && !('shark' in L.d.fish.got) && L.d.fish.got.perch[0] === 3);
L = tamper(d => { d.fish.got.perch = [3, 80]; });
ok('a perch of 80 cm: flagged, dropped', L.edited && !('perch' in L.d.fish.got));
L = tamper(d => { d.fish.got.perch = [2.5, 30]; });
ok('half a catch: flagged, dropped', L.edited && !('perch' in L.d.fish.got));
L = tamper(d => { d.fish.worms = 5000; });
ok('more worms than a bag holds: flagged, put right', L.edited && L.d.fish.worms === G.FISHING.maxWorms);
L = tamper(d => { d.birds.find(b => b.id === roo.id).worm = '29991231'; });
ok('a hen\'s worm day ahead of today: flagged, dropped (she can be asked again)', L.edited && !('worm' in L.d.birds.find(b => b.id === roo.id)));
L = tamper(d => { d.birds.find(b => b.id === roo.id).worm = 'tomorrow'; });
ok('a hen\'s worm day that isn\'t one: flagged, dropped', L.edited && !('worm' in L.d.birds.find(b => b.id === roo.id)));
const w0 = raw.d.fish.worms;
mem[G.SAVE_KEY] = JSON.stringify(raw);
{ const h = new G.Game(store); h.data = h.load(); h.lang = 'en'; h.data.fish.day = '20261102'; h.data.fish.free = 3; h.save(); }      // (saved as the game did then)
L = re();
ok('a farm saved when worms came free each morning: the 3 left kept as worms, unflagged', !L.edited && L.d.fish.worms === w0 + 3 && !('free' in L.d.fish) && !('day' in L.d.fish), L.d.fish);
L = tamper(d => { d.fish.day = '20261102'; d.fish.free = 40; });
ok('… with more free worms than a day’s: flagged, a day’s kept', L.edited && L.d.fish.worms === w0 + G.FISHING.oldFree);
L = tamper(d => { d.xp = G.xpFor(3); d.fish.got.chub = [1, 40]; });
ok('a river fish on a level-3 farm: flagged, dropped', L.edited && !('chub' in L.d.fish.got));
mem[G.SAVE_KEY] = JSON.stringify(raw);
{ const h = new G.Game(store); h.data = h.load(); h.lang = 'en'; delete h.data.fish; h.save(); }      // (saved as the game did before fishing)
L = re();
ok('a farm from before fishing: none, unflagged', !L.edited && !('fish' in L.d));
ok('the fish have names, both languages', G.FISH_IDS.every(id => { const e = new G.Game(store); e.lang = 'en'; const f = new G.Game(store); f.lang = 'fr'; return e.fishName(id) !== 'fish_' + id && f.fishName(id) !== 'fish_' + id && (id === 'koi' || e.fishName(id) !== f.fishName(id) || id === 'perch'); }));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');

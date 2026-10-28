// Fishing in the game's rules (release 5; src/game.js FISHING, FISH_RULES, castWorm, landFish, buyWorms, the save check):
// node fishrules.mjs   (no browser)
// The pond opens at level 3, the river at 8. Five free worms each morning, used first, then those from tins (10 for 60
// coins); no worm, no cast. A cast decides the fish (only that water's, by their weights: the commons most of the time, a
// legendary one now and then), its size within its sizes; landed: sold (a little more the bigger, a legendary one's photo
// at its fixed price), its XP (+10 for a fish new to you), counted, the biggest kept; lost: nothing. The save: kept and
// unflagged; unknown fish, sizes out of range, counts not whole, more free worms than a day's, a river fish before level 8,
// a day ahead: flagged and put right. A farm from before fishing: none, unflagged.
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
ok('five free worms this morning', g.worms() === 5);
// a seeded random
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const casts = [];
for (let i = 0; i < 5; i++) { casts.push(g.castWorm('pond', NOW, rnd)); g.landFish(); }
ok('five casts, each a pond fish within its sizes; then no worms, no cast', casts.every(c => c && G.FISH_RULES[c.id].water === 'pond' && c.cm >= G.FISH_RULES[c.id].cm[0] && c.cm <= G.FISH_RULES[c.id].cm[1]) && g.worms() === 0 && g.castWorm('pond', NOW, rnd) === null, casts.map(c => c && c.id));
NOW += 86400e3;
ok('the next morning: five again', g.worms() === 5);
g.data.coins = 50;
ok('a tin of worms: not without 60 coins', g.buyWorms() === null && g.data.coins === 50);
g.data.coins = 200;
const t = g.buyWorms();
ok('a tin of worms: 10 for 60 coins', t && t.n === 10 && t.price === 60 && g.data.coins === 140 && g.worms() === 15 && g.data.fish.worms === 10, t);
g.castWorm('pond', NOW, rnd); g.loseFish();
ok('the free ones used first', g.data.fish.free === 4 && g.data.fish.worms === 10);
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
ok('a first perch, 20 cm: sold (its price for its size), XP +2 and +10 for a new fish, counted', r && r.first && !r.best && r.coins === G.fishPrice('perch', 20) && g.data.coins === c0 + r.coins && r.xp === 12 && g.data.xp === x0 + 12 && g.fishGot('perch').n === 1 && g.fishGot('perch').best === 20, r);
g.bite = { id: 'perch', cm: 31, water: 'pond', rare: 0 }; r = g.landFish();
ok('a bigger one: "your biggest yet", 2 XP, a little more for its size', r && !r.first && r.best && r.xp === 2 && r.coins > G.fishPrice('perch', 20) && g.fishGot('perch').n === 2 && g.fishGot('perch').best === 31, r);
g.bite = { id: 'perch', cm: 18, water: 'pond', rare: 0 }; r = g.landFish();
ok('a smaller one: not the biggest; the biggest kept', r && !r.best && g.fishGot('perch').best === 31 && g.fishGot('perch').n === 3, r);
g.bite = { id: 'big_bertha', cm: 90, water: 'pond', rare: 2 }; r = g.landFish();
ok('Big Bertha: her photo, 300 coins, 40 XP and 10 for a new fish, legendary', r && r.legend && r.coins === 300 && r.xp === 50, r);
// the river at level 8
g.data.xp = G.xpFor(8);
const rc = g.castWorm('river', NOW, rnd);
ok('level 8: the river, its own fish', g.fishOpen('river') && rc && G.FISH_RULES[rc.id].water === 'river', rc); g.landFish();
// the save
const re = () => { const h = new G.Game(store); const d = h.load(); return { d, edited: h.edited }; };
let L = re();
ok('a reload: the worms, the counts and the biggest kept, unflagged', L.d && !L.edited && L.d.fish.got.perch[0] === 3 && L.d.fish.got.perch[1] === 31 && L.d.fish.worms === g.data.fish.worms && L.d.fish.free === g.data.fish.free, L.d && L.d.fish);
const raw = JSON.parse(mem[G.SAVE_KEY]);
const tamper = f => { const x = JSON.parse(JSON.stringify(raw)); f(x.d); mem[G.SAVE_KEY] = JSON.stringify(x); return re(); };
L = tamper(d => { d.fish.got.shark = [1, 300]; });
ok('an unknown fish: flagged, dropped', L.edited && !('shark' in L.d.fish.got) && L.d.fish.got.perch[0] === 3);
L = tamper(d => { d.fish.got.perch = [3, 80]; });
ok('a perch of 80 cm: flagged, dropped', L.edited && !('perch' in L.d.fish.got));
L = tamper(d => { d.fish.got.perch = [2.5, 30]; });
ok('half a catch: flagged, dropped', L.edited && !('perch' in L.d.fish.got));
L = tamper(d => { d.fish.free = 50; d.fish.worms = 5000; });
ok('more free worms than a day’s, more than a bag holds: flagged, put right', L.edited && L.d.fish.free === G.FISHING.free && L.d.fish.worms === G.FISHING.maxWorms);
L = tamper(d => { d.fish.day = '29991231'; });
ok('a day ahead: flagged, today', L.edited && L.d.fish.day <= '29991230');
L = tamper(d => { d.xp = G.xpFor(3); d.fish.got.chub = [1, 40]; });
ok('a river fish on a level-3 farm: flagged, dropped', L.edited && !('chub' in L.d.fish.got));
mem[G.SAVE_KEY] = JSON.stringify(raw);
{ const h = new G.Game(store); h.data = h.load(); h.lang = 'en'; delete h.data.fish; h.save(); }      // (saved as the game did before fishing)
L = re();
ok('a farm from before fishing: none, unflagged', !L.edited && !('fish' in L.d));
ok('the fish have names, both languages', G.FISH_IDS.every(id => { const e = new G.Game(store); e.lang = 'en'; const f = new G.Game(store); f.lang = 'fr'; return e.fishName(id) !== 'fish_' + id && f.fishName(id) !== 'fish_' + id && (id === 'koi' || e.fishName(id) !== f.fishName(id) || id === 'perch'); }));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');

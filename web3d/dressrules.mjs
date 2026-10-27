// The Christmas dress in the game's rules (release 4, seasonal; src/game.js DRESSES, inSeason, buyDress, dressCoop, the
// save check, the shows' top prize): node dressrules.mjs   (no browser)
// On sale from 1 December to 6 January, both days in (over the new year), on the phone's own calendar; 1,500 coins and
// 30 XP; once each; not out of its season, nor without the coins. Kept for good: a coop dressed or undressed any time of
// year, but only with a dress owned. The save: the dresses owned (known ones, once each), a coop's dress (one owned);
// anything else flagged and dropped. A first place at the County show or the National judged in its season: the dress
// won (once); a village win, or out of season: no dress. A farm from before the dresses: none, unflagged.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
let NOW = new Date(2026, 11, 5, 11, 0).getTime();
Date.now = () => NOW;
const G = await import('./src/game.js');
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0).getTime();
ok('in season: 1 Dec to 6 Jan, both days in, over the new year; not 30 Nov or 7 Jan',
  !G.inSeason('xmas', at(2026, 11, 30, 23)) && G.inSeason('xmas', at(2026, 12, 1, 0)) && G.inSeason('xmas', at(2026, 12, 25)) && G.inSeason('xmas', at(2027, 1, 1)) && G.inSeason('xmas', at(2027, 1, 6, 23)) && !G.inSeason('xmas', at(2027, 1, 7, 0)) && !G.inSeason('xmas', at(2027, 7, 1)) && !G.inSeason('easter', at(2026, 12, 25)));
const mem = {}, store = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
const g = new G.Game(store); g.newFarm({ lang: 'en', look: 'f', name: 'Test' });
const c = g.data.coops[0];
ok('a new farm: no dresses', Array.isArray(g.data.dresses) && g.data.dresses.length === 0 && !c.dress);
g.data.coins = 1000;
ok('not without the coins', g.buyDress('xmas') === null && g.data.coins === 1000);
g.data.coins = 5000; NOW = at(2027, 3, 1);
ok('not out of its season', g.buyDress('xmas') === null && !g.dressOwned('xmas'));
NOW = at(2026, 12, 5); const xp0 = g.data.xp;
const r = g.buyDress('xmas');
ok('in its season: bought, 1,500 coins and 30 XP, once', r && r.price === 1500 && r.xp === 30 && g.data.coins === 3500 && g.data.xp === xp0 + 30 && g.dressOwned('xmas') && g.buyDress('xmas') === null, { r, coins: g.data.coins });
ok('a coop dressed, then undressed; not with an unknown dress', g.dressCoop(c.id, 'xmas') && c.dress === 'xmas' && g.dressCoop(c.id, null) && !('dress' in c) && !g.dressCoop(c.id, 'easter') && !c.dress);
NOW = at(2027, 7, 1);
ok('kept for good: dressed out of its season too', g.dressCoop(c.id, 'xmas') && c.dress === 'xmas');
// the save
const re = () => { const h = new G.Game(store); const d = h.load(); return { d, edited: h.edited }; };
let L = re();
ok('a reload: the dress owned, the coop in it, unflagged', L.d && L.d.dresses.join() === 'xmas' && L.d.coops[0].dress === 'xmas' && !L.edited);
const raw = JSON.parse(mem[G.SAVE_KEY]);
const tamper = f => { const x = JSON.parse(JSON.stringify(raw)); f(x.d); mem[G.SAVE_KEY] = JSON.stringify(x); return re(); };
L = tamper(d => { d.dresses = []; });
ok('a coop wearing a dress not owned: flagged, the dress off', L.edited && !L.d.coops[0].dress && L.d.dresses.length === 0);
L = tamper(d => { d.dresses = ['xmas', 'xmas', 'easter', 7]; });
ok('dresses unknown or twice: flagged, known ones kept once', L.edited && L.d.dresses.join() === 'xmas' && L.d.coops[0].dress === 'xmas');
mem[G.SAVE_KEY] = JSON.stringify(raw);
{ const h = new G.Game(store); h.data = h.load(); h.lang = 'en'; delete h.data.dresses; delete h.data.coops[0].dress; h.save(); }      // (saved as the game did before the dresses)
L = re();
ok('a farm from before the dresses: none, unflagged', !L.edited && L.d.dresses.length === 0 && !L.d.coops[0].dress);
mem[G.SAVE_KEY] = JSON.stringify(raw);
// the shows' top prize
const win = (when, tier, owned) => {
  NOW = when; const h = new G.Game(store); h.data = h.load(); h.lang = 'en'; h.data.dresses = owned ? ['xmas'] : []; delete h.data.coops[0].dress; h.data.shows.res = [];
  h.data.xp = 100000; h.data.coins = 100000; h.showScore = () => 999; h.showLuck = () => 0;
  const s = h.openShows(NOW).find(x => x.tier === tier && !x.locked), b = h.data.birds.find(x => h.canEnter(x, s) === 'ok');
  if (!s || !b || !h.enterShow(s.id, b.id, NOW)) return { err: 'no entry' };
  NOW += 26 * 3600e3; const res = h.showTick(NOW);
  return { res: res.map(x => ({ place: x.place, dress: x.dress })), owned: h.data.dresses.slice(), again: (() => { const k = new G.Game(store); const d = k.load(); return { dress: d.shows.res.slice(-1)[0].dress, edited: k.edited }; })() };
};
let w = win(at(2026, 12, 10, 9), 'c', false);
ok('a County win judged in season: the Christmas dress won, on the results (kept so in the save, unflagged)', w.res && w.res[0].place === 1 && w.res[0].dress === 'xmas' && w.owned.join() === 'xmas' && w.again.dress === 'xmas' && !w.again.edited, w);
w = win(at(2026, 12, 12, 9), 'n', true);
ok('already owned: no second one', w.res && w.res[0].place === 1 && !w.res[0].dress && w.owned.join() === 'xmas', w);
w = win(at(2026, 12, 14, 9), 'v', false);
ok('a village win: no dress', w.res && w.res[0].place === 1 && !w.res[0].dress && w.owned.length === 0, w);
w = win(at(2027, 2, 10, 9), 'c', false);
ok('a County win out of season: no dress', w.res && w.res[0].place === 1 && !w.res[0].dress && w.owned.length === 0, w);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');

// The coops' looks in the game's rules (release 4; src/game.js UPGRADE, lookLays, kidsOf, cuddle, the automatic doors):
// node looktest.mjs   (no browser)
// Over 300 days a Red Barn hen lays about 1.67 eggs a day in a Rustic coop, 1.83 Mended, 2 Snug, 2.25 Cosy, 2.5 Deluxe
// (her own times each day, the extra evening ones between 19:30 and 21:00); a Timber Lodge's (its looks not made yet)
// 2 whatever its tier; a Thatched Cottage has its looks too. A farm from before a breed's looks: that breed's coops Snug. The chicks' ratings: a little lower Rustic, higher Cosy and Deluxe. A cuddle counts again after 6,
// 5, 4 hours. The automatic door: none below Cosy; sticks about one night in thirty; on such a night Rusty comes for that
// coop even when he wouldn't have; shut by hand, he finds it shut. The upgrade: the price, the XP, no further than Deluxe,
// none for a coop whose looks aren't made, not without the coins.
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
let NOW = Date.UTC(2026, 9, 26, 9, 0);
Date.now = () => NOW;
const G = await import('./src/game.js');
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const g = new G.Game(null); g.newFarm({ lang: 'en', look: 'f', name: 'Test' });
const c = g.data.coops[0], hen = g.birdsIn(c.id).find(b => b.sex === 'h');
ok('a new farm: its Red Barn comes Rustic', c.tier === 0 && G.lookOf(c) === 0);
// eggs a day by look
const perDay = tier => { c.tier = tier; hen.laid = NOW; hen.since = NOW - 1; const t0 = NOW; let n = 0, eve = 0;
  for (let d = 0; d < 300; d++) { const day = t0 + d * 86400e3, lays = g.dueLays(day + 86400e3).filter(e => e.hen === hen.id && e.t > day && e.t <= day + 86400e3); n += lays.length; eve += lays.filter(e => { const h = new Date(e.t).getHours() + new Date(e.t).getMinutes() / 60; return h >= 19.5 && h <= 21; }).length; hen.laid = day + 86400e3; }
  hen.laid = NOW; return { a: n / 300, eve }; };
const want = [1.667, 1.833, 2, 2.25, 2.5], got = [0, 1, 2, 3, 4].map(perDay);
ok('eggs a day: Rustic 1.67, Mended 1.83, Snug 2, Cosy 2.25, Deluxe 2.5 (roughly)', got.every((x, t) => Math.abs(x.a - want[t]) < 0.1), got.map(x => x.a.toFixed(2)));
ok('the extra eggs come in the evening (19:30 to 21:00), only in a Cosy or Deluxe coop', got[0].eve === 0 && got[2].eve === 0 && got[3].eve > 40 && got[4].eve > got[3].eve, got.map(x => x.eve));
// another breed's coop: as Snug whatever its tier
const leg = { id: 'c9', breed: 'bra', tier: 0 };
ok('a coop whose looks aren\'t made yet: as Snug, no upgrade, no automatic door', G.lookOf(leg) === 2 && g.coopNext(leg) === null && !G.autoDoor({ ...leg, tier: 4 }));
const stc = { id: 'c6', breed: 'leg', tier: 0 };
ok('a Stone Cottage: its looks too', G.lookOf(stc) === 0 && g.coopNext(stc) && g.coopNext(stc).look === 'mended');
const sil = { id: 'c7', breed: 'sil_blue', tier: 0 };
ok('a Pagoda (any Silkie colour\'s): its looks too', G.lookOf(sil) === 0 && g.coopNext(sil) && g.coopNext(sil).look === 'mended' && G.autoDoor({ ...sil, tier: 3 }));
const orp = { id: 'c8', breed: 'orp', tier: 0 };
ok('a Thatched Cottage: its looks too (Rustic as it comes, its upgrade to Mended, the automatic door from Cosy)', G.lookOf(orp) === 0 && g.coopNext(orp) && g.coopNext(orp).look === 'mended' && !G.autoDoor(orp) && G.autoDoor({ ...orp, tier: 3 }));
// loading a farm: one from before a breed's looks has that breed's coops Snug (nothing changes for them); later ones as saved
{
  const mk = (cv, breed, tier) => { const mem = {}, store = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
    const h = new G.Game(store); h.newFarm({ lang: 'en', look: 'f', name: 'Old' });
    h.data.xp = 100000; h.data.coops[0].breed = breed; h.data.coops[0].tier = tier; for (const b of h.data.birds) b.breed = breed;          // (its level: any breed)
    if (cv) h.data.cv = cv; else delete h.data.cv;
    h.save(); const h2 = new G.Game(store); const d = h2.load(); return { tier: d && d.coops[0].tier, cv: d && d.cv, edited: h2.edited };
  };
  const r = { 'before any looks, a barn': mk(0, 'rir', 0), 'before any, a cottage': mk(0, 'orp', 0), 'before any, a Stone Cottage': mk(0, 'leg', 0),
              'after the barn\'s, a barn': mk(1, 'rir', 0), 'after the barn\'s, a cottage': mk(1, 'orp', 0), 'after the barn\'s, a Stone Cottage': mk(1, 'leg', 0),
              'after the cottage\'s, a cottage': mk(2, 'orp', 0), 'after the cottage\'s, a Pagoda': mk(2, 'sil', 0), 'after the cottage\'s, a Black Silkies\' Pagoda': mk(2, 'sil_black', 0),
              'after the Pagoda\'s, a Pagoda': mk(3, 'sil', 0), 'after the Pagoda\'s, a Stone Cottage': mk(3, 'leg', 0), 'now, a Stone Cottage': mk(4, 'leg', 0), 'now, a Deluxe cottage': mk(4, 'orp', 4) };
  const want = [2, 2, 2, 0, 2, 2, 0, 2, 2, 0, 2, 0, 4], got = Object.values(r);
  ok('a farm from before any looks: its coops Snug; from before a breed\'s: that breed\'s coops Snug (every Silkie colour\'s Pagoda), the rest as saved; a new farm: as saved; none flagged',
    got.every((x, i) => x.tier === want[i] && x.cv === 4 && !x.edited), r);
}
// chicks
const rate = tier => { c.tier = tier; let sum = 0, n = 0; for (let k = 0; k < 200; k++) { const kids = g.kidsOf(c, { hen: hen.id, start: NOW + k * 7919, n: 3 }); for (const x of kids) { sum += x.stars; n++; } } return sum / n; };
const r = [0, 2, 4].map(rate);
ok('the chicks: a little lower in a Rustic coop, higher in a Deluxe one', r[0] < r[1] && r[1] < r[2], r.map(x => x.toFixed(2)));
// cuddles
const glow = tier => { c.tier = tier; hen.happy = 0; hen.trust = 0; const out = g.cuddle(hen.id, NOW); return Math.round((hen.happy - NOW) / 3600e3); };
ok('a cuddle counts again after 6 hours (Snug), 5 (Cosy), 4 (Deluxe)', glow(2) === 6 && glow(3) === 5 && glow(4) === 4, [glow(2), glow(3), glow(4)]);
// the automatic doors
c.tier = 2;
ok('a Snug coop: no automatic door', !G.autoDoor(c) && !g.doorStuck(c, NOW));
c.tier = 3;
let stuck = 0, came = 0, extra = 0; const N = 3000;
g.data.xp = 100000;                                          // (Rusty from level 4)
for (let d = 0; d < N; d++) {
  const ev = Date.UTC(2026, 10, 1, 21) + d * 86400e3, k = G.nightKey(ev);
  if (!G.doorStuck(c, k)) continue;
  stuck++;
  NOW = ev; g.fox().seen = G.nightKey(ev - 86400e3); delete c.shut;
  const v = g.foxTonight(NOW);
  if (v && v.coop === c.id && v.open) came++;
  if (!G.foxNight(k)) extra++;
}
ok('a Cosy coop\'s door sticks about one night in thirty', Math.abs(stuck / N - 1 / 30) < 0.012, (stuck / N).toFixed(4));
ok('each night it sticks Rusty comes for it, its door open (on nights he wouldn\'t have come too)', came === stuck && extra > 0, { stuck, came, extra });
// shut by hand on such a night: he finds it shut
for (let d = 0; d < N; d++) { const ev = Date.UTC(2026, 10, 1, 21) + d * 86400e3, k = G.nightKey(ev); if (!G.doorStuck(c, k)) continue; NOW = ev; g.fox().seen = G.nightKey(ev - 86400e3); g.setDoorShut(c.id, true, NOW); const v = g.foxTonight(NOW); ok('shut by hand on a night it sticks: he finds it shut', v && v.open === false, v); break; }
// a night it works: shut by itself
for (let d = 0; d < N; d++) { const ev = Date.UTC(2026, 10, 1, 21) + d * 86400e3, k = G.nightKey(ev); if (G.doorStuck(c, k) || !G.foxNight(k)) continue; NOW = ev; g.fox().seen = G.nightKey(ev - 86400e3); delete c.shut; const v = g.foxTonight(NOW); ok('a night it works and he comes anyway: he finds it shut by itself', v && v.open === false, v); break; }
// the upgrade
NOW = Date.UTC(2026, 9, 26, 9, 0); c.tier = 0; g.data.coins = 299;
ok('not enough coins: no upgrade', g.upgradeCoop(c.id) === 'coins' && c.tier === 0);
g.data.coins = 20000; const xp0 = g.data.xp;
const steps = [1, 2, 3, 4].map(() => g.upgradeCoop(c.id));
ok('each upgrade in turn: 300, 1,000, 3,000, 8,000 coins, 8, 20, 45, 100 XP, up to Deluxe', steps.every(x => x === 'ok') && c.tier === 4 && g.data.coins === 20000 - 12300 && g.data.xp - xp0 === 173, { steps, coins: g.data.coins, xp: g.data.xp - xp0 });
ok('no further than Deluxe', g.upgradeCoop(c.id) === 'top' && c.tier === 4);
console.log(fails ? `${fails} FAILED` : 'ALL PASS');

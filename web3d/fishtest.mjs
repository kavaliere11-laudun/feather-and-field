// Fishing in the game (release 5: the pond; game.js, fishing.js, farmlife.js fishAt, main.js the dock): ./withserver.sh
// node fishtest.mjs [OUT]   (LANG=fr; W, H: the screen, e.g. W=874 H=402; PORT)
// A new farm on a fake clock. Level 2: the dock's card says fishing opens at level 3, no button. Level 3: the pond's seven
// fish (none caught), 4 worms, Go fishing, a tin of worms. Go: the farmer off to the dock (by its gate in the wild meadow's
// fence, opening as he goes in), out to its end on the deck, the rod out; the worms and Stop at the bottom. A tap on the
// water: a worm used, the float out on its line, "Watch the float". A tap too soon: "Too soon!". The bite: a tap, the
// gauge; reeling (a player keeping it in the green): landed, into his hands, turned to us; a fish new to us: held up high;
// its card (its name, its size, new, sold live, coins and XP, Keep fishing with the worms left); coins and XP paid.
// Keep: ready again. A bite missed: "Too late", the worm gone, nothing paid. Held too hard: the line snaps. Too slack: it
// slips the hook. Big Bertha: her photo, back into the pond (he crouches at the edge), 300 coins. The last worm: the card
// has only Stop. Stop: back along the dock and off with the pail, the gate shut, the bar gone. A reload: the catches kept,
// unflagged. Too late in the evening: "asleep: fishing in the morning". No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/fishtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
const T0 = new Date('2026-11-03T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.addStyleTag({ content: '#hint { opacity: 0.0001 !important; }' }).catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/fish_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 180000 }); await p.addStyleTag({ content: '#hint { opacity: 1 !important; }' }).catch(() => {}); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const st = () => p.evaluate(() => { const f = window.__farm, F = f.fishing(), L = f.farmer(), g = f.game(), G = f.dockGate(), D = f.dock();
  return { state: F ? F.state : null, seq: !!f.fishSeq(), pos: [+L.pos.x.toFixed(2), +L.pos.y.toFixed(2), +L.pos.z.toFixed(2)], home: L.home, worms: g.worms(), coins: g.data.coins, xp: g.data.xp,
    gate: G ? +G.open.toFixed(2) : null, D: D && { stand: D.stand, deck: D.deck }, bar: F ? !F.bar.hidden : false, gauge: F ? !F.gauge.hidden : false, hint: document.getElementById('hint').textContent,
    float: F ? F.float.visible : false, said: L.said.slice(-3), got: g.data.fish ? Object.keys(g.data.fish.got) : [] }; });
const sheet = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return null;
  return { kind: window.__farm.gameUI().kind, text: s.innerText, go: !!s.querySelector('button[data-fish=go]'), tin: !!s.querySelector('button[data-fish=tin]'), keep: (s.querySelector('button[data-fish=keep]') || {}).textContent || null,
    stop: !!s.querySelector('button[data-fish=stop]'), fish: s.querySelectorAll('.gfishrow img').length, got: s.querySelectorAll('.gfishrow img.got').length }; });
const settle = () => p.evaluate(() => document.getAnimations().forEach(a => a.finish()));      // (the cards slid up)
const until = async (test, secs, step = 0.25) => { for (let t = 0; t < secs; t += step) { if (await p.evaluate(test)) return true; await run(step); } return p.evaluate(test); };
// a player reeling: holding while the needle's low, letting go when it's high (or `how`: 'hard' always holding, 'slack' never)
const reel = (how = 'good') => p.evaluate(async how => {
  const f = window.__farm, F = f.fishing();
  for (let i = 0; i < 30 * 90 && F.state === 'reel'; i++) {
    if (how === 'good') F.press(F.T < 0.5); else F.press(how === 'hard');
    window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false);
  }
  F.press(false); sessionStorage.setItem('__T', window.__T); f.draw(); return F.state;
}, how);
const castOut = () => p.evaluate(() => { const f = window.__farm, D = f.dock(), F = f.fishing(); return F.tapWater(D.stand[0] + Math.sin(D.face + 0.3) * 2.6, D.stand[1] + Math.cos(D.face + 0.3) * 2.6); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); sessionStorage.setItem('__T', window.__T); const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 70; g.data.lvSeen = 2; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();      // (the first day's pictures done with)
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5);
// level 2: not yet
await p.evaluate(() => window.__farm.dockCard()); await run(0.2);
let sh = await sheet();
ok('level 2: the dock\'s card: the pond, fishing opens at level 3, no button', sh && sh.kind === 'dock' && (fr ? /niveau 3/ : /level 3/).test(sh.text) && !sh.go && sh.fish === 7, sh);
// level 3: its card says fishing's open, with a look at the pond
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = 400; g.save(); f.gameUI().close(); }); await run(1.5);
await p.waitForTimeout(1600); await p.evaluate(() => window.__farm.showNews()); await run(0.2);      // (news waits a moment and a half after the farm opens)
sh = await sheet();
const lvl = await p.evaluate(() => { const c = document.querySelector('.gsheet:not([hidden]) .gfishnew'); return c && c.innerText; });
ok('level 3: its card: fishing at the pond, a look at it', sh && sh.kind === 'levelup' && lvl && (fr ? /pêche à l’étang/ : /Fishing at the pond/).test(lvl) && (fr ? /Voir l’étang/ : /Show me the pond/).test(lvl), { kind: sh && sh.kind, lvl });
await settle(); await p.tap('.gsheet button[data-fish=show]'); await run(1.2);
const va = await p.evaluate(() => { const f = window.__farm, v = f.viewAt(), D = f.dock(); return { v, d: Math.hypot(v[0] - D.end[0], v[1] - D.end[1]) }; });
ok('"Show me the pond": the view over to the dock', va.d < 0.5 && !(await sheet()), va);
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.lvSeen = 3; g.save(); f.gameUI().close(); }); await run(0.5);
await p.evaluate(() => window.__farm.dockCard()); await run(0.2);
sh = await sheet();
ok('level 3: the pond\'s seven fish (none caught yet), 4 worms, Go fishing, a tin of worms', sh && sh.go && sh.tin && sh.fish === 7 && sh.got === 0 && /4/.test(sh.text) && (fr ? /Aller pêcher/ : /Go fishing/).test(sh.text), sh);
await p.tap('.gsheet button[data-fish=go]'); await run(0.3);
let s = await st();
ok('Go: the farmer off to the dock', s.seq && (fr ? /part au ponton/ : /off to the dock/).test(s.hint), s.hint);
let gateOpened = false;
for (let i = 0; i < 120; i++) { await run(1); s = await st(); if (s.gate > 0.5) gateOpened = true; if (s.state === 'ready') break; }
ok('through the dock\'s gate in the wild meadow\'s fence (it opened as he went in)', gateOpened && s.gate !== null, s.gate);
ok('out at the dock\'s end, up on its deck, ready: the worms and Stop at the bottom, "Tap the water to cast"', s.state === 'ready' && Math.hypot(s.pos[0] - s.D.stand[0], s.pos[2] - s.D.stand[1]) < 0.15 && Math.abs(s.pos[1] - s.D.deck) < 0.02 && s.bar && (fr ? /Touchez l’eau/ : /Tap the water/).test(s.hint), s);
await p.evaluate(() => { const f = window.__farm, D = f.dock(); f.lookAt(D.stand[0] - Math.sin(D.face) * 0.3, D.stand[1] - Math.cos(D.face) * 0.3, 2.0); });
await run(0.3); await shoot('1_dock');
// a cast
const before = await st();
ok('a tap on the water: cast', await castOut());
await run(1.3); s = await st();
ok('a worm used, the float out on the water, "Watch the float"', s.worms === before.worms - 1 && s.state === 'wait' && s.float && (fr ? /bouchon/ : /float/).test(s.hint), s);
await p.evaluate(() => window.__farm.fishing().press(true)); s = await st();
ok('a tap too soon: "Too soon!", still waiting', s.state === 'wait' && (fr ? /Trop tôt/ : /Too soon/).test(s.hint), s.hint);
ok('then the bite', await until(() => window.__farm.fishing().state === 'bite', 20));
await shoot('2_bite');
await p.evaluate(() => window.__farm.fishing().press(true)); s = await st();
ok('a tap: reeling, the gauge up', s.state === 'reel' && s.gauge && (fr ? /Maintenez/ : /Hold to reel/).test(s.hint), s);
await run(0.6); await shoot('3_reel');
const c0 = (await st()).coins, x0 = (await st()).xp;
let end = await reel('good');
ok('kept in the green: landed', end === 'lift', end);
let sawTrophy = false;
for (let i = 0; i < 40; i++) { await run(0.2); const q = await p.evaluate(() => window.__farm.fishing().state); if (q === 'show' && i === 4) await shoot('4_show'); if (q === 'trophy') { if (!sawTrophy) { await run(0.6); await shoot('5_trophy'); } sawTrophy = true; } if (q === 'card') break; }
s = await st(); sh = await sheet();
const R = await p.evaluate(() => window.__farm.fishing().result);
ok('a fish new to us: held up high, hooray ("A new fish!")', sawTrophy && s.said.includes('fishnew'), s.said);
ok('its card: its name, its size, new to the book, sold live, coins and XP; Keep fishing with the worms left', sh && sh.kind === 'fish' && sh.text.includes(R.cm + ' cm') && (fr ? /nouveau poisson/ : /New fish/).test(sh.text) && (fr ? /animalerie/ : /aquarium shop/).test(sh.text) && sh.keep && sh.keep.includes(String(s.worms)) && sh.stop, { sh, R });
ok('paid: its coins and its XP', s.coins === c0 + R.coins && s.xp === x0 + R.xp && R.xp === R.xp && s.got.includes(R.id), { c0, s, R });
await shoot('6_card');
await settle(); await p.tap('.gsheet button[data-fish=keep]');
ok('Keep fishing: into the bucket, ready again', await until(() => window.__farm.fishing().state === 'ready', 5));
// a bite missed
let w0 = (await st()).worms, cc = (await st()).coins;
await castOut(); await until(() => window.__farm.fishing().state === 'bite', 25);
ok('a bite missed: "Too late", the worm gone, nothing paid', await until(() => window.__farm.fishing().state === 'ready', 3) && (await st()).worms === w0 - 1 && (await st()).coins === cc && (fr ? /Trop tard/ : /Too late/).test((await st()).hint), await st());
// too hard
await castOut(); await until(() => window.__farm.fishing().state === 'bite', 25); await p.evaluate(() => window.__farm.fishing().press(true));
end = await reel('hard'); s = await st();
ok('held too hard: the line snaps', end === 'ready' && (fr ? /cassé/ : /snapped/).test(s.hint), { end, h: s.hint });
// too slack
await castOut(); await until(() => window.__farm.fishing().state === 'bite', 25); await p.evaluate(() => { const F = window.__farm.fishing(); F.press(true); F.p = 0.2; });
end = await reel('slack'); s = await st();
ok('too slack: it slips the hook', end === 'ready' && (fr ? /décroché/ : /slipped/).test(s.hint), { end, h: s.hint });
// Big Bertha
await p.evaluate(() => { const g = window.__farm.game(); g.data.fish.worms = 1; g.data.fish.free = 0; g.save(); window.__farm.fishing().refreshBar(); });
cc = (await st()).coins;
await castOut(); await p.evaluate(() => { const F = window.__farm.fishing(), g = window.__farm.game(); g.bite = { id: 'big_bertha', cm: 91, water: 'pond', rare: 2 }; F.bite = { ...g.bite }; });
await until(() => window.__farm.fishing().state === 'bite', 25); await p.evaluate(() => window.__farm.fishing().press(true));
end = await reel('good');
ok('Big Bertha, reeled in (harder: the gauge\'s green smaller)', end === 'lift', end);
await until(() => window.__farm.fishing().state === 'card', 12, 0.2);
sh = await sheet(); s = await st();
ok('her card: her photo for the book, back into the pond, 300 coins; the last worm used: only Stop', sh && sh.kind === 'fish' && (fr ? /Grosse Berthe/ : /Big Bertha/).test(sh.text) && (fr ? /retourne dans l’étang/ : /back into the pond/).test(sh.text) && s.coins === cc + 300 && !sh.keep && sh.stop, { sh, coins: s.coins - cc });
await settle();
await p.evaluate(() => document.querySelector('.gsheet button[data-fish=stop]').click()); await run(0.7);
const rel = await p.evaluate(() => { const L = window.__farm.farmer(); return L.f.want.pose; });
await shoot('7_release');
ok('let go: he crouches at the edge and she slips back into the water', rel === 'release', rel);
// Stop: back off the dock with the pail
ok('then back along the dock and off with the pail, the gate shut behind him, the bar gone', await until(() => { const f = window.__farm; return !f.fishSeq() && f.fishing().state === 'off'; }, 60, 0.5) && (await run(1.5), (await st()).gate === 0) && !(await st()).bar && Math.hypot((await st()).pos[0] - (await st()).D.stand[0], (await st()).pos[2] - (await st()).D.stand[1]) > 2, await st());
// a reload
const got = await p.evaluate(() => JSON.stringify(window.__farm.game().data.fish.got));
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const again = await p.evaluate(() => ({ got: JSON.stringify(window.__farm.game().data.fish.got), edited: window.__farm.game().edited }));
ok('a reload: the catches kept, unflagged', again.got === got && !again.edited, again);
// the card again: the fish caught in colour
await p.evaluate(() => window.__farm.dockCard()); await run(0.2); sh = await sheet();
ok('the dock\'s card: the fish caught in colour now', sh && sh.got >= 2, sh && sh.got);
await shoot('8_dockcard');
// late in the evening
await p.evaluate(() => { window.__T += 12 * 3600e3; const f = window.__farm; f.gameUI().close(); f.setHour(22.3); });
await run(0.5);
const late = await p.evaluate(() => window.__farm.startFishing());
ok('too late in the evening: asleep, fishing in the morning', late === 'night', late);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

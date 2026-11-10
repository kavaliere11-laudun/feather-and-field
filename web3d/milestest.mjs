// Milestones, the goodnight round, the morning's worms, Collect all, Cuddle everyone here, How to fish in one look
// (10 Nov 2026, Audrey: "Ok with your 9 recommendations"; milestones "plus keepsake at star", Rusty's three, the secret
// frog-and-salmon one, "Add one about money earnt"): ./withserver.sh node milestest.mjs   (LANG=fr; PORT)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(180000); ctx.setDefaultNavigationTimeout(180000);
await ctx.addInitScript(() => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || new Date('2026-11-09T10:00:00Z').getTime()); Date.now = () => window.__T; });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 600))); if (!c) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); };
const go = async time => { await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}&time=${time}`, { waitUntil: 'domcontentloaded' }); };
const shut = () => p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); });
await go('10:00');
await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(3) + 5; g.data.lvSeen = 3; g.fishBag().gift = true; g.fishBag().worms = 6; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(1); await shut();
// ---- the Book: a Milestones tab, 15 of them, the secret one unnamed
await p.evaluate(() => window.__farm.bookOpen('miles')); await run(0.2);
let M = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('.gbooktabs [data-tab]')].map(x => x.dataset.tab), cards: [...document.querySelectorAll('.gmile')].map(c => ({ id: c.dataset.mile, t: c.querySelector('.gcard-t').textContent, stars: c.querySelectorAll('.gmile-stars span').length, on: c.querySelectorAll('.gmile-stars .on').length, go: !!c.querySelector('[data-collect]'), note: c.querySelector('.gnote').textContent })), keeps: document.querySelectorAll('.gkeep').length, on: document.querySelectorAll('.gkeep.on').length, sub: document.querySelector('.gsheet .gsub').textContent }));
ok('the Book: tabs for the breeds, the fish and the milestones', M.tabs.join() === 'birds,fish,miles', M.tabs);
ok('15 milestones, none to collect on a new farm; a shelf of 15 empty places', M.cards.length === 15 && M.cards.every(c => !c.go && c.on === 0) && M.keeps === 15 && M.on === 0, M);
const sec = M.cards.find(c => c.id === 'love'), coinsCard = M.cards.find(c => c.id === 'coins');
ok('the secret one: "???", nothing about a salmon or a frog', sec && sec.t === '???' && !/salmon|saumon|frog|grenouille/i.test(sec.note), sec);
ok('one about coins earned, in four steps; Rusty\'s three: first visit, got in, sent home', coinsCard && coinsCard.stars === 4 && ['foxfirst', 'foxin', 'rusty'].every(id => M.cards.some(c => c.id === id)), coinsCard);
ok(fr ? 'French: "Objectifs", "Pièces gagnées"' : 'English: "Milestones", "Coins earned"', fr ? /Pièces gagnées/.test(coinsCard.note) : /Coins earned/.test(coinsCard.note), coinsCard);
await shut();
// ---- eggs collected: 50 → a step to collect; the dot on the Book; collected: coins, XP, a star
let S0 = await p.evaluate(() => { const g = window.__farm.game(); g.tallyAdd('eggs', 50); window.__farm.gameUI().refresh(); return { coins: g.data.coins, xp: g.data.xp, dot: !window.__farm.gameUI().bdot.hidden && window.__farm.gameUI().bdot.textContent, ready: g.milesReady() }; });
ok('50 eggs collected: one milestone ready, a "1" on the Book', S0.ready === 1 && S0.dot === '1', S0);
await p.evaluate(() => window.__farm.bookOpen('miles')); await run(0.2);
await p.evaluate(() => document.querySelector('.gmile[data-mile=eggs] [data-collect]').click()); await run(0.2);
let S1 = await p.evaluate(() => { const g = window.__farm.game(), c = document.querySelector('.gmile[data-mile=eggs]'); return { coins: g.data.coins, xp: g.data.xp, on: c.querySelectorAll('.gmile-stars .on').length, go: !!c.querySelector('[data-collect]'), dot: window.__farm.gameUI().bdot.hidden, hint: document.getElementById('hint').textContent, tally: g.tallyOf('coins') }; });
ok('collected: +50 coins, +5 XP, its first star, nothing more to collect, the dot gone', S1.coins === S0.coins + 50 && S1.xp === S0.xp + 5 && S1.on === 1 && !S1.go && S1.dot, { S0, S1 });
ok('…and those 50 coins count as coins earned, once', S1.tally === 50, S1.tally);
// ---- a one-off: Rusty's first visit; all four steps of one: its keepsake on the shelf
await p.evaluate(() => { const g = window.__farm.game(); g.tallyAdd('fox', 1); g.tallyAdd('foxout', 40); });
const claimAll = id => p.evaluate(id => { const f = window.__farm, g = f.game(); const out = []; for (let i = 0; i < 6; i++) { f.bookOpen('miles'); const q = document.querySelector(`.gmile[data-mile=${id}] [data-collect]`); if (!q) break; q.click(); out.push(document.getElementById('hint').textContent); } return { out, got: g.mileClaimed(id), keep: document.querySelector(`.gkeep[data-keep=${id}]`).classList.contains('on') }; }, id);
let R = await claimAll('foxfirst');
ok('Rusty\'s first visit: one step, collected, its keepsake on the shelf', R.got === 1 && R.keep && R.out.length === 1, R);
R = await claimAll('rusty');
ok('Rusty sent home 40 times: four steps one after the other, the keepsake with the last', R.got === 4 && R.keep && R.out.length === 4 && R.out[3] !== R.out[2].replace(/\d+/g, ''), R);
await shut();
// ---- the secret one: the kiss with the pond on the screen and no card open: won; its name shown then
let Lv = await p.evaluate(() => { const f = window.__farm, g = f.game(), P = f.frogPond(), d = f.dock(); f.gameUI().bookSheet({}); P.o.kiss(d.end[0], d.end[1]); const a = g.tallyOf('love'); f.gameUI().close(); f.lookAt(60, 60, 3); f.draw(); P.o.kiss(d.end[0], d.end[1]); const b2 = g.tallyOf('love'); f.lookAt(d.end[0], d.end[1], 3); f.draw(); P.o.kiss(d.end[0], d.end[1]); P.o.kiss(d.end[0], d.end[1]); return { card: a, away: b2, seen: g.tallyOf('love'), ready: g.milesReady() }; });
ok('the kiss behind a card: not seen; the pond off the screen: not seen; on the screen: seen, once', Lv.card === 0 && Lv.away === 0 && Lv.seen === 1 && Lv.ready >= 1, Lv);
await p.evaluate(() => window.__farm.bookOpen('miles')); await run(0.2);
let Lc = await p.evaluate(() => { const c = document.querySelector('.gmile[data-mile=love]'); return { t: c.querySelector('.gcard-t').textContent, go: !!c.querySelector('[data-collect]') }; });
ok('…then it has its name, and its reward to collect', Lc.t !== '???' && Lc.go, Lc);
await shut();
// ---- the save's checks: silly values put right at the next load
await p.evaluate(() => { const g = window.__farm.game(); g.data.tally = { eggs: -5, chicks: 1e15, wheat: 'x', veg: 3.7, nope: 9, coins: 120 }; g.data.mile = { eggs: 99, fish: -1, nope: 2, coins: 'a' }; g.data.gn = '99999999'; g.fishBag().dawn = '99999999'; g.data.jobs.bonus = true; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
let C = await p.evaluate(() => { const g = window.__farm.game(), d = g.data; return { tally: d.tally, mile: d.mile, gn: d.gn, dawn: d.fish.dawn, bonus: d.jobs.bonus, claimedEggs: g.mileClaimed('eggs') }; });
ok('a save with silly milestone numbers: put right (no negatives, no strangers, no step ahead of its number, no evening or morning in the future, no worms bonus unearned)',
  !(C.tally.eggs < 0) && C.tally.chicks <= 1e9 && !('nope' in C.tally) && typeof (C.tally.wheat || 0) === 'number' && Number.isInteger(C.tally.veg || 0) && !('nope' in (C.mile || {})) && !((C.mile || {}).fish < 0) && C.claimedEggs <= 4 && C.gn === undefined && C.dawn !== '99999999' && !C.bonus, C);
// ---- the morning's worms: a new day, the farm opened: 3 worms, once
let W = await p.evaluate(() => { const f = window.__farm, g = f.game(); g.fishBag().worms = 2; const a = g.dawnWorms(Date.now()); const b2 = g.dawnWorms(Date.now()); const c = g.dawnWorms(Date.now() + 26 * 3600e3), d = g.dawnWorms(Date.now() + 26 * 3600e3); g.fishBag().worms = 998; const e = g.dawnWorms(Date.now() + 50 * 3600e3); return { a, b2, c, d, e, worms: g.fishBag().worms }; });
ok('the morning\'s worms: none the day they start, 3 the next morning, once; a bag nearly full: only what fits', W.a === 0 && W.b2 === 0 && W.c === 3 && W.d === 0 && W.e === 1 && W.worms === 999, W);
// ---- Today's jobs: all three done: Collect all, and 5 worms
await p.evaluate(() => { const g = window.__farm.game(); g.fishBag().worms = 2; for (const j of g.jobs().list) j.got = j.n; g.save(); window.__farm.jobsSheet(); }); await run(0.2);
let J0 = await p.evaluate(() => ({ all: !!document.querySelector('[data-jobs=all]'), note: document.querySelector('.gsheet .gcenter').textContent, coins: window.__farm.game().data.coins }));
ok('all three jobs done: a "Collect all" button; the note says what all three bring', J0.all && /5/.test(J0.note), J0);
await p.evaluate(() => document.querySelector('[data-jobs=all]').click()); await run(0.2);
let J1 = await p.evaluate(() => { const g = window.__farm.game(); return { paid: g.jobs().list.every(j => j.paid), worms: g.fishBag().worms, coins: g.data.coins, hint: document.getElementById('hint').textContent, all: !!document.querySelector('[data-jobs=all]') }; });
ok('one tap: all three paid, 5 worms more, said so; the button gone', J1.paid && J1.worms === 7 && J1.coins > J0.coins && /5/.test(J1.hint) && !J1.all, J1);
await shut();
// ---- Cuddle everyone here: from the coop's card; the farmer round each bird in turn
await p.evaluate(() => window.__farm.coopCard(0)); await run(0.2);
let Q0 = await p.evaluate(() => { const q = document.querySelector('.gcuddleall'); const n = window.__farm.game().birdsIn(window.__farm.gamePlots()[0].gc.id).length; if (q) q.click(); return { btn: !!q, n, queue: window.__farm.cuddleQueue().length, open: window.__farm.gameUI().isOpen }; });
ok('a coop\'s card: "Cuddle everyone here"; tapped: the card shuts, every bird is on his round', Q0.btn && Q0.queue === Q0.n && !Q0.open, Q0);
let happy = 0; for (let i = 0; i < 240 && happy < Q0.n; i++) { await run(1); happy = await p.evaluate(() => { const f = window.__farm, g = f.game(); if (f.gameUI().isOpen) f.gameUI().close(); f.tickJobs(); return g.birdsIn(f.gamePlots()[0].gc.id).filter(x => g.happyLeft(x) > 0).length; }); }
ok('…and each one gets her cuddle, one after the other', happy === Q0.n, { happy, n: Q0.n });
for (let i = 0; i < 60 && await p.evaluate(() => !!window.__farm.farmerJob()); i++) await run(1);
await shut();
await p.evaluate(() => window.__farm.coopCard(0)); await run(0.2);
let Q1 = await p.evaluate(() => { document.querySelector('.gcuddleall').click(); return { queue: window.__farm.cuddleQueue().length, hint: document.getElementById('hint').textContent }; });
ok('again straight after: nobody to cuddle, said kindly', Q1.queue === 0 && Q1.hint.length > 10, Q1);
// ---- How to fish: its three steps and the bar all in sight sideways, no scrolling
await p.evaluate(() => window.__farm.gameUI().fishHelp(true)); await run(0.2);
let H = await p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'), body = s.querySelector('.gbody') || s, r = s.getBoundingClientRect(); const inView = n => { const q = n.getBoundingClientRect(); return q.top >= r.top - 1 && q.bottom <= Math.min(innerHeight, r.bottom) + 1; }; const okTop = s.querySelector('[data-fhelp=ok]').getBoundingClientRect().top; return { steps: [...s.querySelectorAll('.gfstep')].map(inView), demo: inView(s.querySelector('.fishdemo')), ok: inView(s.querySelector('[data-fhelp=ok]')), scroll: s.querySelector('.fishdemo').getBoundingClientRect().bottom > okTop + 1 }; });
ok('How to fish, sideways: the three steps, the bar and OK all in sight, none of it under the button', H.steps.length === 3 && H.steps.every(Boolean) && H.demo && H.ok && !H.scroll, H);
await shut();
// ---- the goodnight round: by day no bubble; from 18:00 "Goodnight" over the farmhouse (her choice 10 Nov 22:24: "A bubble
// on the farmhouse"); tapped: doors booked shut, coins, XP, the farmer off round the coops; once an evening
let N0 = await p.evaluate(() => window.__farm.nightBubble());
ok('by day: no Goodnight bubble', N0 === null, N0);
await p.evaluate(() => { window.__T = new Date('2026-11-10T19:00:00Z').getTime(); sessionStorage.setItem('__T', window.__T); });
await go('19:00'); await load(); await run(1); await shut();
let N1 = await p.evaluate(() => { const f = window.__farm, g = f.game(), s = f.farmhouseSpot(); f.lookAt(s[0], s[2], 5); f.draw(); const t = f.nightBubble(), q = document.querySelector('.gnightbub'), r = q.getBoundingClientRect(); return { t, shown: !q.hidden && r.width > 0, coins: g.data.coins, xp: g.data.xp, top: (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) || {}).className, at: [r.left + r.width / 2, r.top + r.height / 2], old: !!document.getElementById('goodnight') }; });
ok('at 19:00: a "Goodnight" bubble over the farmhouse, nothing over it; no loose button any more', N1.shown && /gnightbub/.test(N1.top || '') && (fr ? /Bonne nuit/ : /Goodnight/).test(N1.t || '') && !N1.old, N1);
await p.touchscreen.tap(N1.at[0], N1.at[1]); await run(0.3);
let N2 = await p.evaluate(() => { const f = window.__farm, g = f.game(); return { bub: f.nightBubble(), coins: g.data.coins, xp: g.data.xp, shut: g.data.coops.filter(c => !/duck/.test(c.breed)).every(c => c.shut === g.data.gn), n: g.tallyOf('night'), again: g.goodnight(Date.now(), 19), run: f.nightRun(), job: (f.farmerJob() || {}).kind, home: f.farmer().home }; });
ok('tapped: +10 coins, +5 XP, every coop\'s door booked shut for the night, the bubble gone, counted once', N2.bub === null && N2.coins === N1.coins + 10 && N2.xp === N1.xp + 5 && N2.shut && N2.n === 1 && N2.again === null, { N1, N2 });
ok('…and the farmer, if he\'s out, sets off round the coops', N2.home ? true : N2.run && N2.job === 'night', N2);
let gone = false; for (let i = 0; i < 120 && !gone; i++) { await run(1); gone = await p.evaluate(() => !window.__farm.nightRun()); }
ok('his round ends', gone);
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(1);
let N3 = await p.evaluate(() => window.__farm.nightBubble());
ok('the game opened again that evening: no bubble', N3 === null, N3);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

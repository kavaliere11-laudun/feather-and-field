// Fishing in the game (release 5: the pond; game.js, fishing.js, farmlife.js fishAt, main.js the dock): ./withserver.sh
// node fishtest.mjs [OUT]   (LANG=fr; W, H: the screen, e.g. W=874 H=402; PORT)
// A new farm on a fake clock. Level 1: the dock's card says fishing opens at level 2, no button (since 7 Nov 2026: 3 before). Level 2: the pond's seven
// fish (none caught), 4 worms (from the hens), Go fishing, a tin of worms. Go: the farmer off to the dock (by its gate in the wild meadow's
// fence, opening as he goes in), out to its end on the deck, the rod out; the worms and Stop at the bottom. A tap on the
// water: a worm used, the float out on its line, "Watch the float". A tap too soon: "Too soon!". The bite: a tap, the
// gauge; reeling (a player keeping it in the green): landed, into his hands, turned to us; a fish new to us: held up high;
// its card (its name, its size, new, sold live, coins and XP, Keep fishing with the worms left); coins and XP paid.
// Keep: ready again. The float stays down a long moment; not tapped it bites again, the third time it's off with the worm.
// Reeled against its pull: nothing snaps. Left alone a long while: it
// slips the hook. Big Bertha: her photo, back into the pond (he crouches at the edge), 300 coins. The last worm: the card
// has only Stop. Stop: back along the dock and off with the pail, the gate shut, the bar gone. A reload: the catches kept,
// unflagged. Too late in the evening: "asleep: fishing in the morning". No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/fishtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);      // (a running farm's frames are slow in the test browser's software drawing, Storybook's the more)
const T0 = new Date('2026-11-03T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.addStyleTag({ content: '#hint { opacity: 0.0001 !important; }' }).catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/fish_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); /* (a picture that hangs on a busy machine doesn't stop the checks) */ await p.addStyleTag({ content: '#hint { opacity: 1 !important; }' }).catch(() => {}); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const st = () => p.evaluate(() => { const f = window.__farm, F = f.fishing(), L = f.farmer(), g = f.game(), G = f.dockGate(), D = f.dock();
  return { state: F ? F.state : null, seq: !!f.fishSeq(), pos: [+L.pos.x.toFixed(2), +L.pos.y.toFixed(2), +L.pos.z.toFixed(2)], home: L.home, worms: g.worms(), coins: g.data.coins, xp: g.data.xp,
    gate: G ? +G.open.toFixed(2) : null, D: D && { stand: D.stand, deck: D.deck }, bar: F ? !F.bar.hidden : false, gauge: F ? !F.gauge.hidden : false, hint: F && !F.bar.hidden && F.tipEl.textContent ? F.tipEl.textContent : document.getElementById('hint').textContent, tip: F ? F.tipEl.textContent : '',
    float: F ? F.float.visible : false, said: L.said.slice(-3), got: g.data.fish ? Object.keys(g.data.fish.got) : [] }; });
const sheet = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return null;
  return { kind: window.__farm.gameUI().kind, text: s.innerText, go: !!s.querySelector('button[data-fish=go]'), tin: !!s.querySelector('button[data-fish=tin]'), keep: (s.querySelector('button[data-fish=keep]') || {}).textContent || null,
    stop: !!s.querySelector('button[data-fish=stop]'), fish: s.querySelectorAll('.gfishrow img').length, got: s.querySelectorAll('.gfishrow img.got').length }; });
const settle = () => p.evaluate(() => document.getAnimations().forEach(a => a.finish()));      // (the cards slid up)
const until = async (test, secs, step = 0.25) => { for (let t = 0; t < secs; t += step) { if (await p.evaluate(test)) return true; await run(step); } return p.evaluate(test); };
// a player reeling: holding, letting go while the fish pulls (or `how`: 'hard' always holding, 'slack' never)
const hit = () => p.evaluate(() => { const F = window.__farm.fishing(), G = F.fight(); F.bt = (F.g0 + G.green / 2) * G.sweep; F.press(true); });      // (a tap with the marker in the middle of the green)
const miss = () => p.evaluate(() => { const F = window.__farm.fishing(), G = F.fight(); const x = F.g0 > 0.5 ? F.g0 - 0.2 : F.g0 + G.green + 0.2; F.bt = x * G.sweep; F.press(true); });      // (and one well outside it)
const reel = (how = 'good') => p.evaluate(async how => {
  const f = window.__farm, F = f.fishing();
  for (let i = 0; i < 30 * 90 && F.state === 'reel'; i++) {
    
    window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false);
  }
  F.press(false); sessionStorage.setItem('__T', window.__T); f.draw(); return F.state;
}, how);
const castOut = () => p.evaluate(() => { const f = window.__farm, D = f.dock(), F = f.fishing(); return F.tapWater(D.stand[0] + Math.sin(D.face + 0.3) * 2.6, D.stand[1] + Math.cos(D.face + 0.3) * 2.6); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); sessionStorage.setItem('__T', window.__T); const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 10; g.data.lvSeen = 1; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();      // (the first day's pictures done with)
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5);
// level 1: not yet
await p.evaluate(() => window.__farm.dockCard()); await run(0.2);
let sh = await sheet();
ok('level 1: the dock\'s card: the pond, fishing opens at level 2, no button', sh && sh.kind === 'dock' && (fr ? /niveau 2/ : /level 2/).test(sh.text) && !sh.go && sh.fish === 10, sh);
// level 2: its card says fishing's open, with a look at the pond
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = 20; g.save(); f.gameUI().close(); }); await run(1.5);
await p.waitForTimeout(1600); await p.evaluate(() => window.__farm.showNews()); await run(0.2);      // (news waits a moment and a half after the farm opens)
sh = await sheet();
const lvl = await p.evaluate(() => { const c = document.querySelector('.gsheet:not([hidden]) .gfishnew'); return c && c.innerText; });
ok('level 2: its card: fishing at the pond, a look at it; a tin of 10 worms to start with; a gift of 50 coins', sh && sh.kind === 'levelup' && lvl && (fr ? /pêche à l’étang/ : /Fishing at the pond/).test(lvl) && (fr ? /Voir l’étang/ : /Show me the pond/).test(lvl) && (fr ? /boîte de 10 vers/ : /tin of 10 worms/).test(lvl) && (fr ? /\+50 pièces/ : /\+50 coins/).test(sh.text), { kind: sh && sh.kind, lvl });
const before2 = await p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, worms: g.worms() }; });
await settle(); await p.tap('.gsheet button[data-fish=show]'); await run(1.2);
const va = await p.evaluate(() => { const f = window.__farm, v = f.viewAt(), D = f.dock(); return { v, d: Math.hypot(v[0] - D.end[0], v[1] - D.end[1]) }; });
ok('"Show me the pond": the view over to the dock', va.d < 0.5 && !(await sheet()), va);
const after2 = await p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, worms: g.worms(), gift: g.data.fish.gift }; });
ok('the card closed: its 50 coins paid, the tin\'s 10 worms in the bag (once)', after2.coins === before2.coins + 50 && after2.worms === before2.worms + 10 && after2.gift === true, { before2, after2 });
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.lvSeen = 2; g.fishBag().worms = 4; g.save(); f.gameUI().close(); }); await run(0.5);      // (four worms the hens found: wormtest.mjs)
await p.evaluate(() => window.__farm.dockCard()); await run(0.2);
sh = await sheet();
const props0 = await p.evaluate(() => { const F = window.__farm.fishing(); return F && { rod: F.deckRod.visible, bucket: F.bucket.visible }; });
ok('level 2: his rod lying on the dock and his bucket by it', props0 && props0.rod && props0.bucket, props0);
ok('level 2: the pond\'s ten fish (none caught yet), 4 worms, Go fishing, a tin of worms', sh && sh.go && sh.tin && sh.fish === 10 && sh.got === 0 && /4/.test(sh.text) && (fr ? /Aller pêcher/ : /Go fishing/).test(sh.text), sh);
await p.tap('.gsheet button[data-fish=go]'); await run(0.3);
let s = await st();
ok('Go: the farmer off to the dock', s.seq && (fr ? /part au ponton/ : /off to the dock/).test(s.hint), s.hint);
let gateOpened = false;
for (let i = 0; i < 120; i++) { await run(1); s = await st(); if (s.gate > 0.5) gateOpened = true; if (s.state === 'ready') break; }
ok('through the dock\'s gate in the wild meadow\'s fence (it opened as he went in)', gateOpened && s.gate !== null, s.gate);
const rodNow = await p.evaluate(() => { const F = window.__farm.fishing(), L = window.__farm.farmer(); return { onDeck: F.deckRod.visible, inHand: F.rodIn && !!L.f.rig.rod && L.f.rig.rod.visible }; });
ok('he picked his rod up off the dock (it\'s in his hand now)', !rodNow.onDeck && rodNow.inHand, rodNow);
ok('out at the dock\'s end, up on its deck, ready: the worms and Stop at the bottom, "Tap the water to cast"', s.state === 'ready' && Math.hypot(s.pos[0] - s.D.stand[0], s.pos[2] - s.D.stand[1]) < 0.15 && Math.abs(s.pos[1] - s.D.deck) < 0.02 && s.bar && (fr ? /Touchez l’eau/ : /Tap the water/).test(s.hint), s);
// (9 Nov 2026, Audrey: "there is no instruction as of how it works"): no fish caught yet, the how-to card by itself, its three
// steps and the gauge drawn, "your first catch will be an easy one"; the fish waits while it's open; Got it
let hs = await sheet();
const hInfo = await p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); return s ? { steps: s.querySelectorAll('.gfhelp').length, demo: !!s.querySelector('.fishdemo .fishgreen') && !!s.querySelector('.fishdemo .fishneedle'), ok: !!s.querySelector('button[data-fhelp=ok]') } : null; });
ok('the first time, no fish yet: "How to fish" by itself (cast, strike, reel in, the gauge as it looks, an easy first catch)', hs && hs.kind === 'fishhelp' && hInfo.steps === 3 && hInfo.demo && hInfo.ok && (fr ? /Comment pêcher/.test(hs.text) && /facile/.test(hs.text) : /How to fish/.test(hs.text) && /easy one/.test(hs.text)), { hs, hInfo });
await shoot('0_howto');
await p.evaluate(() => document.querySelector('.gsheet button[data-fhelp=ok]').click()); await run(0.3);
ok('Got it: the card closed, the panel there: what to do, the worms, ? and Stop', !(await sheet()) && await p.evaluate(() => { const F = window.__farm.fishing(); return !F.bar.hidden && !!F.helpBtn && F.helpBtn.offsetWidth > 0; }));
// the panel: nothing over anything (its words, the worms, ?, Stop), on the screen, the farm's own words clear of it
const lay = await p.evaluate(() => { const F = window.__farm.fishing(), r = e => e.getBoundingClientRect(), els = [F.tipEl, F.wormsEl, F.helpBtn, F.stopBtn].map(r);
  const over = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const pairs = []; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (over(els[i], els[j])) pairs.push([i, j]);
  const H = document.getElementById('hint'); H.textContent = 'A test of the farm’s own words, as long as most of them'; H.classList.add('on');
  const hr = r(H), panel = r(F.bar), off = els.some(q => q.left < 0 || q.right > innerWidth || q.bottom > innerHeight);
  H.classList.remove('on');
  return { pairs, off, hintOver: over(hr, panel), panel: [panel.left, panel.top, panel.right, panel.bottom].map(Math.round), hint: [hr.top, hr.bottom].map(Math.round) }; });
ok('the panel: its words, the worms, ? and Stop side by side, nothing over another, on the screen; the farm\'s own words clear of it', !lay.pairs.length && !lay.off && !lay.hintOver, lay);
await p.evaluate(() => window.__farm.fishing().helpBtn.click()); await run(0.2);
ok('"?": the how-to card again (without the easy-catch line once a fish is in: see below)', (await sheet() || {}).kind === 'fishhelp');
await p.evaluate(() => document.querySelector('.gsheet button[data-fhelp=ok]').click()); await run(0.2);
await p.evaluate(() => { const f = window.__farm, D = f.dock(); f.lookAt(D.stand[0] - Math.sin(D.face) * 0.3, D.stand[1] - Math.cos(D.face) * 0.3, 2.0); });
await run(0.3); await shoot('1_dock');
// a cast
const before = await st();
ok('a tap on the water: cast', await castOut());
await run(1.3); s = await st();
ok('a worm used, the float out on the water, "Wait for a bite…"', s.worms === before.worms - 1 && s.state === 'wait' && s.float && (fr ? /morde/ : /bite/).test(s.hint), s);
await p.evaluate(() => window.__farm.fishing().press(true)); s = await st();
ok('a tap too soon: "Not yet", still waiting, no harm done', s.state === 'wait' && (fr ? /Pas encore/ : /Not yet/).test(s.hint), s.hint);
ok('then the bite', await until(() => window.__farm.fishing().state === 'bite', 20));
await shoot('2_bite');
const bar = await p.evaluate(() => { const F = window.__farm.fishing(), g = document.querySelector('.fishgauge'), tr = g.querySelector('.fishtrack'), gr = g.querySelector('.fishgreen').getBoundingClientRect(), t = tr.getBoundingClientRect(); return { up: !g.hidden && !tr.hidden && t.width > 100, green: +(gr.width / t.width).toFixed(2), inside: gr.left >= t.left - 1 && gr.right <= t.right + 1, tries: F.tries, way: g.querySelector('.fishway').hidden, tip: document.querySelector('.fishtip').textContent }; });
ok('the bar up: its green part (the first catch: a wide one, 42%), the marker, three tries, "Tap when the marker is in the green!"', bar.up && bar.inside && Math.abs(bar.green - 0.42) < 0.03 && bar.tries === 3 && bar.way && (fr ? /dans le vert/ : /in the green/).test(bar.tip), bar);
const mv = await p.evaluate(() => { const f = window.__farm, F = f.fishing(), xs = []; for (let i = 0; i < 90; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); xs.push(F.cursor()); } return { min: Math.min(...xs), max: Math.max(...xs), state: F.state }; });
ok('the marker goes to and fro along the whole bar', mv.state === 'bite' && mv.min < 0.08 && mv.max > 0.92, mv);
await miss(); s = await st();
const t1 = await p.evaluate(() => ({ tries: window.__farm.fishing().tries, tip: document.querySelector('.fishtip').textContent }));
ok('a tap outside the green: a try gone ("Missed! 2 tries left"), still on', s.state === 'bite' && t1.tries === 2 && /2/.test(t1.tip), t1);
await hit(); s = await st();
ok('a tap in the green: hooked, in it comes by itself ("Got it!")', s.state === 'reel' && s.gauge && (fr ? /Bravo/ : /Got it/).test(s.hint), s);
await run(0.6); await shoot('3_reel');
const c0 = (await st()).coins, x0 = (await st()).xp;
let end = await reel('good');
ok('kept in the green: landed', end === 'lift', end);
let sawTrophy = false, sawRodDown = false, sawUnhook = false;
for (let i = 0; i < 40; i++) { await run(0.2); const q = await p.evaluate(() => window.__farm.fishing().state); if (q === 'unhook') sawUnhook = true; if (await p.evaluate(() => { const F = window.__farm.fishing(); return F.deckRod.visible && F.state !== 'lift'; })) sawRodDown = true; if (q === 'show' && i === 4) await shoot('4_show'); if (q === 'trophy') { if (!sawTrophy) { await run(0.6); await shoot('5_trophy'); } sawTrophy = true; } if (q === 'card') break; }
s = await st(); sh = await sheet();
const R = await p.evaluate(() => window.__farm.fishing().result);
const held = await p.evaluate(() => { const f = window.__farm, F = f.fishing(), L = f.farmer(), r = F.fish.root.position, h = L.heading, fwd = (r.x - L.pos.x) * Math.sin(h) + (r.z - L.pos.z) * Math.cos(h), B = L.f.rig.B, T = f.THREE, a = B.handL.getWorldPosition(new T.Vector3()), b = B.handR.getWorldPosition(new T.Vector3());
  return { fwd: +fwd.toFixed(2), above: +(r.y - a.y).toFixed(3), aboveR: +(r.y - b.y).toFixed(3), rodOnDeck: F.deckRod.visible }; });
ok('taken off the hook in his hand, the rod laid down on the dock; held out in front of him, resting on his hands (not through them)', sawUnhook && sawRodDown && held.rodOnDeck && held.fwd > 0.22 && held.above > 0.02, held);
ok('a fish new to us: held up high, hooray ("A new fish!")', sawTrophy && s.said.includes('fishnew'), s.said);
ok('its card: its name, its size, new to the book, into the keep net, XP; Keep fishing with the worms left', sh && sh.kind === 'fish' && sh.text.includes(R.cm + ' cm') && (fr ? /nouveau poisson/ : /New fish/).test(sh.text) && (fr ? /bourriche/ : /keep net/).test(sh.text) && sh.keep && sh.keep.includes(String(s.worms)) && sh.stop, { sh, R });
ok('paid: its coins and its XP', s.coins === c0 + R.coins && s.xp === x0 + R.xp && R.xp === R.xp && s.got.includes(R.id), { c0, s, R });
await shoot('6_card');
await settle(); await p.tap('.gsheet button[data-fish=keep]');
let sawLower = false;
for (let i = 0; i < 40 && (await p.evaluate(() => window.__farm.fishing().state)) !== 'ready'; i++) { await run(0.2); if (await p.evaluate(() => window.__farm.farmer().f.want.pose === 'release')) sawLower = true; }
const back = await p.evaluate(() => { const F = window.__farm.fishing(); return { state: F.state, fish: !!F.fish, rodIn: F.rodIn, onDeck: F.deckRod.visible }; });
ok('Keep fishing: he crouches and lowers it into the bucket, picks his rod up again, ready', sawLower && back.state === 'ready' && !back.fish && back.rodIn && !back.onDeck, { sawLower, back });
// a bite missed
let w0 = (await st()).worms, cc = (await st()).coins;
await castOut(); await until(() => window.__farm.fishing().state === 'bite', 25);
await miss(); await miss(); const two = await p.evaluate(() => ({ st: window.__farm.fishing().state, tries: window.__farm.fishing().tries, tip: document.querySelector('.fishtip').textContent })); await miss();
ok('three taps outside the green: "Last try" after two, then off with the worm, nothing paid', two.st === 'bite' && two.tries === 1 && (fr ? /Dernier essai/ : /Last try/).test(two.tip) && (await st()).state === 'ready' && (await st()).worms === w0 - 1 && (await st()).coins === cc && (fr ? /parti avec le ver/ : /got away with the worm/).test((await st()).hint), { two, s: await st() });
// rarer fish: a smaller green, still there to hit
const greens = await p.evaluate(() => { const F = window.__farm.fishing(), was = [F.easy, F.bite]; const out = []; for (const rare of [0, 1, 2]) { F.easy = false; F.bite = { rare }; const G = F.fight(); out.push([G.green, G.sweep, +(G.green * G.sweep).toFixed(2)]); } F.easy = was[0]; F.bite = was[1]; return out; });
ok('the green smaller for a rarer fish, the marker in it at least a fifth of a second each pass', greens[0][0] > greens[1][0] && greens[1][0] > greens[2][0] && greens.every(g => g[2] >= 0.2), greens);
// the bite left alone: off with the worm
await castOut(); await until(() => window.__farm.fishing().state === 'bite', 25);
ok('the bite left alone 15 s: off with the worm', await until(() => window.__farm.fishing().state === 'ready', 17, 0.5) && (fr ? /parti avec le ver/ : /got away/).test((await st()).hint), await st());
// Big Bertha
await p.evaluate(() => { const g = window.__farm.game(); g.data.fish.worms = 1; g.save(); window.__farm.fishing().refreshBar(); });
cc = (await st()).coins;
await castOut(); await p.evaluate(() => { const F = window.__farm.fishing(), g = window.__farm.game(); g.bite = { id: 'big_bertha', cm: 91, water: 'pond', rare: 2 }; F.bite = { ...g.bite }; });
await until(() => window.__farm.fishing().state === 'bite', 25); await hit();
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
ok('then back along the dock and off, his rod left lying on the dock, the gate shut behind him, the bar gone', (await p.evaluate(() => window.__farm.fishing().deckRod.visible)) && await until(() => { const f = window.__farm; return !f.fishSeq() && f.fishing().state === 'off'; }, 60, 0.5) && (await run(1.5), (await st()).gate === 0) && !(await st()).bar && Math.hypot((await st()).pos[0] - (await st()).D.stand[0], (await st()).pos[2] - (await st()).D.stand[1]) > 2, await st());
// a reload
const got = await p.evaluate(() => JSON.stringify(window.__farm.game().data.fish.got));
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
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

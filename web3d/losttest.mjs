// Farm moments, a lost chick (20 Nov 2026, "Carry on"; the 17 Nov mock-up: "Follow the peeps and bring the chick back to
// its mum"): ./withserver.sh node losttest.mjs [OUT]   (LANG=fr; W, H: the screen, e.g. W=874 H=402; PORT)
// A farm at level 3 whose first hen out and first rainy day are past, the Red Barn's hen with three chicks hatched two hours
// ago, ?moments: as the farm opens, the first lost chick for sure: one of them out a few metres from the pen on your land,
// "🐣 A chick is lost!" beside the coins, a word with its mum's name, "peep!" over it; its peeps; the coop still counts it
// (no second one made). A reload: still lost, at the same spot. A tap on it: found (+10 + 2 a level coins), the farmer
// carries it back and sets it down in the pen ("There you are!", "Home you go!"). The save checks: a chick that isn't one
// of the brood's: dropped, flagged. Another lost at 20:30: back by itself, said. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/losttest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-20T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 600) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/lost_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00&moments`;
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const close = () => p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
const S = () => p.evaluate(() => {
  const f = window.__farm, g = f.game(), m = g.moment(), sb = f.moment.bird(), c = g.data.coops[0], P = f.plots.find(q => q.gc && q.gc.id === c.id);
  const kids = P ? P.birds.filter(x => x.gameChick && !x.young) : [], L = f.farmLife(), bw = L && L.busyWith && L.busyWith();
  const pen = P ? P.frame.localToWorld(new f.THREE.Vector3(0, 0, 1.2)) : null;
  return { level: g.level, coins: g.data.coins, moment: m ? { ...m } : null, moments: g.data.moments ? { ...g.data.moments } : null, bird: sb, pill: f.moment.pill(), bub: f.moment.bub(), edited: g.edited,
    inPen: kids.map(x => x.kidI), n: c.brood ? c.brood.n : 0, mum: c.brood ? g.bird(c.brood.hen).name : '', job: bw ? bw.kind : null, said: L ? L.said.slice(-6) : [],
    fromPen: sb && pen ? +Math.hypot(sb.spot[0] - pen.x, sb.spot[1] - pen.z).toFixed(2) : null, field: sb ? f.fieldAt(sb.spot[0], sb.spot[1]) : null, land: g.data.land.slice() };
});
const T = fr ? { pill: /Un poussin s’est perdu/, hint: /Un poussin de .* s’est éloigné\. Suivez les piou-piou/, found: /Vous avez retrouvé le poussin ! .* le ramène à/, back: /Le poussin perdu a retrouvé .* tout seul/, peep: /piou/ }
  : { pill: /A chick is lost!/, hint: /One of .*’s chicks has wandered off\. Follow the peeps and tap it!/, found: /You found the chick! .* takes it back to/, back: /The lost chick found its way back to .* by itself/, peep: /peep!/ };

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(3) + 5; g.data.lvSeen = 3; g.fishBag().gift = true; g.data.moments = { last: 0, hen: 1, rain: 1 };
  const c = g.data.coops[0], hen = g.birdsIn(c.id).find(b => b.sex === 'h'); c.brood = { hen: hen.id, start: window.__T - 26 * 3600e3, n: 3, hatched: true }; c.brood.kids = g.kidsOf(c, c.brood); g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
for (let i = 0; i < 14; i++) { await close(); await run(1); if ((await S()).moment) break; }
let s = await S();
ok('as the farm opens, the first lost chick for sure: one of the three out a few metres from the pen, on your land', s.moment && s.moment.k === 'chick' && s.bird && s.bird.chick && s.fromPen > 3 && s.fromPen < 14 && s.land.includes(s.field), s);
ok('the coop still counts it: the other two in the pen, no second one made', s.inPen.length === 2 && !s.inPen.includes(s.moment.i), s.inPen);
ok('"🐣 A chick is lost!" beside the coins', T.pill.test(s.pill || ''), s.pill);
let h0 = await hintT(); for (let i = 0; i < 6 && !(T.hint.test(h0) && h0.includes(s.mum)); i++) { await run(1.5); h0 = await hintT(); }
ok('a word with its mum\'s name: follow the peeps', T.hint.test(h0) && h0.includes(s.mum), h0);
const spot = s.bird.spot;
await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 1.4); f.draw(); }, spot); await run(3);
s = await S();
ok('it peeps; "🐣 peep!" over it on the screen', s.bird.peeps > 0 && T.peep.test(s.bub || ''), { peeps: s.bird.peeps, bub: s.bub });
await shoot('1_lost');
// (21 Nov 2026, Audrey: "The mum needs to be worried")
const P0 = s.bird.at; await run(0.5); s = await S();
await p.evaluate(([at, m]) => { const f = window.__farm; f.lookAt((at[0] + m[0]) / 2, (at[1] + m[1]) / 2, 4.2); f.draw(); }, [P0, s.bird.mum ? s.bird.mum.mid : P0]); await run(8); s = await S();      // (her pen and her chick both in view)
const Mw = s.bird.mum, dm = Mw && Math.hypot(Mw.at[0] - P0[0], Mw.at[1] - P0[1]), dc = Mw && Math.hypot(Mw.mid[0] - P0[0], Mw.mid[1] - P0[1]);
ok('its mum is worried: over by the fence on its side of her yard, calling', !!Mw && Mw.calls >= 1 && dm < dc - 0.4, { Mw, dm, dc });
await shoot('1b_mum');
let minD = 9; for (let i = 0; i < 16; i++) { await run(0.5); const d = await p.evaluate(() => { const f = window.__farm, m = f.allBirds.find(b => b.worry); if (!m) return 9; return Math.min(9, ...m.plot.birds.filter(x => x !== m && x.kind !== 'chick').map(x => Math.hypot(x.root.position.x - m.root.position.x, x.root.position.z - m.root.position.z))); }); minD = Math.min(minD, d); }
ok('as she paces she never walks into the others of her coop', minD > 0.24, minD);
// a reload
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await close(); await run(1.5);
s = await S();
ok('a reload: still lost, at the same spot, still only one of it', s.bird && Math.hypot(s.bird.spot[0] - spot[0], s.bird.spot[1] - spot[1]) < 0.02 && s.inPen.length === 2 && T.pill.test(s.pill || ''), s);
// found
await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 1.4); f.draw(); }, s.bird.at); await run(0.3);
const c0 = s.coins, L0 = s.level, kid = s.moment.i;
const sc = await p.evaluate(() => window.__farm.moment.screen());
await p.evaluate(() => window.__farm.pause(false)); await p.touchscreen.tap(sc.x, sc.y); await p.waitForTimeout(400); await p.evaluate(() => window.__farm.pause(true)); await run(0.2);
s = await S(); const h1 = await hintT();
ok('a tap on it: found (+10 + 2 a level coins), said, the pill gone, counted', !s.moment && s.coins === c0 + 10 + 2 * L0 && T.found.test(h1) && !s.pill && s.moments.chick === 1, { s, h1, c0 });
ok('the farmer on his way for it', s.job === 'stray', s.job);
let home = false, k = 0, lifted = false;
for (; k < 60 && !home; k++) { await run(2); s = await S(); if (s.bird && s.bird.carry >= 1) { lifted = true; if (!fs.existsSync(`${OUT}/lost_2_carried${fr ? '_fr' : ''}${side ? '_side' : ''}.png`)) { await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 1.6); f.draw(); }, s.bird.at); await shoot('2_carried'); } } home = !s.bird && s.inPen.length === 3; }
const worriedAfter = await p.evaluate(() => window.__farm.allBirds.some(b => b.worry));
ok('he picked it up, carried it back and set it down in the pen ("There you are!", "Home you go!"); its mum not worried any more', !worriedAfter && lifted && home && s.inPen.includes(kid) && s.said.includes('found') && s.said.includes('homego'), { lifted, home, inPen: s.inPen, said: s.said, k });
await run(2); await shoot('3_home');
// the save checks
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.moment = { k: 'chick', c: raw.d.coops[0].id, i: 9, at: [1, 2], t: window.__T - 1000 }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); s = await S();
ok('a save changed outside the game (a chick that isn\'t one of the brood\'s): dropped, flagged', !s.moment && !s.bird && s.edited && s.inPen.length === 3, s);
// at 20:30 one still lost goes back by itself
await p.evaluate(() => { const f = window.__farm; f.setHour(20.2); if (f.gameUI().isOpen) f.gameUI().close(); });
await run(1); await p.evaluate(() => { const f = window.__farm; f.moment.chick(f.game().data.coops[0].id); }); await run(1); s = await S();
ok('another one lost (in the evening)', !!s.moment && !!s.bird && s.inPen.length === 2, s);
await p.evaluate(() => window.__farm.setHour(20.6)); await run(3);
let h2 = await hintT(); for (let i = 0; i < 10 && !T.back.test(h2); i++) { await run(1); h2 = await hintT(); }
s = await S();
ok('at 20:30, not found: back to its mum by itself, said', !s.moment && !s.bird && s.inPen.length === 3 && T.back.test(h2), { s, h2 });
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

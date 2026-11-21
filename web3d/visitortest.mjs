// Farm moments, a visitor (21 Nov 2026, "Ok carry on"; the 17 Nov mock-up: "a villager at the gate with a quick order,
// double pay, ten minutes"; her look Audrey's pick, "2: with glasses"): ./withserver.sh node visitortest.mjs [OUT]   (LANG=fr;
// W, H: the screen, e.g. W=874 H=402; PORT)
// A farm at level 3 (the village orders open) whose first moment (a hen out) is past, with ?moments: as the farm opens, her
// first visit for sure: "🧁 Mrs Potts is here!" beside the coins, saved; her model loads and she comes up the lane to the
// farm stall, her basket on her arm, and waits beside it ("Yoo-hoo! Anyone home?"); over her what she'd like ("🧁 3 🥚").
// A tap on her: her card; not enough: how many more, no Give button. Enough: Give: paid double at once, the eggs taken
// from the pantry, the moment over; the farmer comes over with the pail ("Here you are!"), "Thank you, dear!", and off she
// goes down the lane, gone. A reload while she waits: back beside the stall. Not today: "another day", off she goes. Her ten
// minutes up: she can't wait, said, off she goes. The save checks: a visit of an hour, someone who isn't a villager,
// something she never asks for, too many of it: dropped, flagged. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/visitortest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-21T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 700) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.evaluate(() => { const f = window.__farm; f.setHour(f.day.hour); f.draw(); }); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/visit_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00&moments`;
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), m = g.moment(), v = f.visitor.state();
  return { level: g.level, coins: g.data.coins, xp: g.data.xp, eggs: g.storeOf('eggs'), moment: m ? { ...m } : null, moments: g.data.moments ? { ...g.data.moments } : null, v, pill: f.moment.pill(), edited: g.edited,
    card: f.gameUI().isOpen ? f.gameUI().kind : null, said: f.farmLife() ? f.farmLife().said.slice(-4) : [], job: f.farmLife() && f.farmLife().busyWith && f.farmLife().busyWith() ? f.farmLife().busyWith().kind : null }; });
const T = fr ? { pill: /Mme Potts est là/, hi: /Ohé/, ask: /Pourriez-vous me donner ceci/, need: /Encore \d+ 🥚/, given: /Mme Potts vous a payé le double\s!\s\+\d+ pièces/, thanks: /Merci, mon petit/, byeNo: /Mme Potts reviendra un autre jour/, bye: /ne pouvait plus attendre/, sayBye: /Tant pis/ }
  : { pill: /Mrs Potts is here!/, hi: /Yoo-hoo! Anyone home\?/, ask: /Could I have these, dear\?/, need: /\d+ more 🥚 needed/, given: /Mrs Potts paid you double! \+\d+ coins/, thanks: /Thank you, dear!/, byeNo: /Mrs Potts will come again another day/, bye: /couldn’t wait any longer/, sayBye: /Never mind, dear/ };
const close = () => p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
const tapHer = async () => { await lookAtHer(1.5); const sc = await p.evaluate(() => window.__farm.visitor.tap()); await p.evaluate(() => window.__farm.pause(false)); await p.touchscreen.tap(sc.x, sc.y); await p.waitForTimeout(300); await p.evaluate(() => window.__farm.pause(true)); return sc; };
const lookAtHer = async (s = 1.5) => { await p.evaluate(s => { const f = window.__farm, v = f.visitor.state(); const q = v.at || v.spot; f.lookAt(q[0], q[1], s); f.draw(); }, s); await run(0.2); };
const arrive = async (max = 60) => { let s = await S(); for (let i = 0; i < max && s.v.phase !== 'wait'; i++) { await run(1); s = await S(); } return s; };

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(3) + 5; g.data.lvSeen = 3; g.fishBag().gift = true; g.data.moments = { last: 0, hen: 1 }; const P = g.pantryBag(); P.eggs = 0; P.val = 0; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
for (let i = 0; i < 12; i++) { await close(); await run(1); if ((await S()).moment) break; }
let s = await S();
ok('as the farm opens, her first visit for sure: saved, counted', s.moment && s.moment.k === 'visit' && s.moment.who === 'potts' && s.moment.n >= 1 && s.moment.until - s.moment.t === 10 * 60e3 && s.moments.visit === 1, s);
ok('"🧁 Mrs Potts is here!" beside the coins', T.pill.test(s.pill || ''), s.pill);
for (let i = 0; i < 20 && !s.v.visible; i++) { await run(0.5); s = await S(); }
ok('her model loads and she\'s on her way up the lane, her basket on her arm', s.v.ok && s.v.visible && s.v.phase === 'come' && s.v.len > 3 && s.v.basket && s.v.pose === 'basket', s.v);
const a0 = s.v.at; await run(3); s = await S();
ok('walking along it (fading in as she comes onto the farm)', s.v.phase === 'come' && s.v.s > 1.5 && Math.hypot(s.v.at[0] - a0[0], s.v.at[1] - a0[1]) > 1 && s.v.opacity > 0.9, s.v);
await lookAtHer(1.6); await shoot('1_coming');
s = await arrive();
await lookAtHer(1.5); s = await S();
ok('she gets to the farm stall and waits beside it: "Yoo-hoo! Anyone home?" over her', s.v.phase === 'wait' && Math.hypot(s.v.at[0] - s.v.spot[0], s.v.at[1] - s.v.spot[1]) < 0.05 && T.hi.test(s.v.say || ''), s.v);
await shoot('2a_yoohoo');
await run(3.2); await lookAtHer(2.2); s = await S();
const item = s.moment.item, n = s.moment.n;
ok('over her, what she\'d like ("🧁 ' + n + ' …")', (s.v.bub || '').startsWith('🧁 ' + n + ' '), { bub: s.v.bub, card: s.card, words: s.v.words, screen: s.v.screen, phase: s.v.phase });
await lookAtHer(1.4); await shoot('2_waiting');
// a tap on her: her card; nothing in the pantry: how many more, no Give button
await tapHer(); s = await S();
const card = () => p.evaluate(() => { const b = document.querySelector('.gsheet .gsheet-b') || document.querySelector('.gsheet'); return { text: b.textContent, give: !!document.querySelector('.gsheet [data-visit="give"]'), no: !!document.querySelector('.gsheet [data-visit="no"]') }; });
let c = await card();
ok('a tap on her: her card, what she\'d like', s.card === 'visit' && T.ask.test(c.text) && c.no, { card: s.card, c });
if (item === 'eggs') ok('not enough: how many more, and no Give button', !c.give && T.need.test(c.text), c);
await shoot('3_card_need');
await close();
// enough: give
await p.evaluate(([item, n]) => { const g = window.__farm.game(); if (item === 'eggs') { const P = g.pantryBag(); P.eggs = n + 3; P.val = (n + 3) * 6; } else if (item === 'honey') g.pantryBag().honey = n + 1; else g.vegBasket()[item] = n + 1; g.save(); }, [item, n]);
await tapHer(); c = await card(); s = await S();
ok('enough now: Give her them', s.card === 'visit' && c.give, c);
await shoot('4_card_give');
const pay = await p.evaluate(() => { const g = window.__farm.game(); return g.visitPay(g.moment()); }), c0 = s.coins, x0 = s.xp, e0 = s.eggs;
await p.evaluate(() => window.__farm.pause(false)); await p.tap('.gsheet [data-visit="give"]'); await p.waitForTimeout(300); await p.evaluate(() => window.__farm.pause(true));
await run(0.3); s = await S(); let h1 = await hintT(); for (let i = 0; i < 6 && !T.given.test(h1); i++) { await run(0.5); h1 = await hintT(); }
ok('given: paid double at once, the moment over, the card shut, said', !s.moment && !s.card && s.coins === c0 + pay.coins && s.xp >= x0 + pay.xp && T.given.test(h1) && !s.pill, { s, h1, pay, c0 });
if (item === 'eggs') ok('the eggs taken from the pantry', s.eggs === e0 - n, { eggs: s.eggs, e0, n });
ok('the farmer on his way with it', s.v.phase === 'paid' && s.job === 'order', { v: s.v.phase, job: s.job });
let th = null; for (let i = 0; i < 40 && !th; i++) { await run(1); s = await S(); if (s.v.phase === 'thanks') th = s; if (i === 8) { await lookAtHer(1.5); await shoot('5_handing'); } }
ok('he gives it her ("Here you are!"): "Thank you, dear!"', !!th && th.said.includes('visit') && T.thanks.test(th.v.say || ''), th && { v: th.v, said: th.said });
await lookAtHer(1.5); await shoot('6_thanks');
let gone = null; for (let i = 0; i < 60 && !gone; i++) { await run(1); s = await S(); if (s.v.phase === null) gone = s; }
ok('off she goes, down the lane and away', !!gone && !gone.v.visible, gone && gone.v);
// a reload while she waits
await p.evaluate(() => { const g = window.__farm.game(); g.data.moments.last = 0; g.save(); });
let m2 = await p.evaluate(() => window.__farm.visitor.start()); s = await arrive();
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await close();
for (let i = 0; i < 10 && !(await S()).v.visible; i++) await run(0.5);
s = await S();
ok('a reload while she waits: back beside the stall', !!m2 && s.moment && s.moment.k === 'visit' && s.v.phase === 'wait' && s.v.at && Math.hypot(s.v.at[0] - s.v.spot[0], s.v.at[1] - s.v.spot[1]) < 0.05 && T.pill.test(s.pill || ''), s);
// not today
await tapHer(); await p.evaluate(() => window.__farm.pause(false)); await p.tap('.gsheet [data-visit="no"]'); await p.waitForTimeout(300); await p.evaluate(() => window.__farm.pause(true)); await run(0.3);
s = await S(); let h2 = await hintT();
ok('not today: "another day", "Never mind, dear", off she goes', !s.moment && !s.card && T.byeNo.test(h2) && T.sayBye.test(s.v.words || '') && s.v.phase === 'bye', { s, h2 });
for (let i = 0; i < 60 && (await S()).v.phase; i++) await run(1);
// her ten minutes up
await p.evaluate(() => { const g = window.__farm.game(); g.data.moments.last = 0; g.save(); });
m2 = await p.evaluate(() => window.__farm.visitor.start()); s = await arrive();
await p.evaluate(u => { window.__T = u + 500; sessionStorage.setItem('__T', window.__T); }, m2.until); await run(0.5);
s = await S(); let h3 = await hintT(); for (let i = 0; i < 6 && !T.bye.test(h3); i++) { await run(0.5); h3 = await hintT(); }
ok('her ten minutes up: she can\'t wait, said, off she goes', !s.moment && T.bye.test(h3) && /bye|go/.test(s.v.phase || ''), { s, h3 });
// the save checks
const edit = async (fn, arg) => { await p.evaluate(fn, arg); await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); return S(); };
const bad = async (label, mo) => { s = await edit(mo => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.moment = { ...mo, t: window.__T - 1000, until: window.__T + (mo.until || 60e3) }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); }, mo); ok(label, !s.moment && s.edited, { moment: s.moment, edited: s.edited }); };
await bad('a save changed outside the game (a visit of an hour): dropped, flagged', { k: 'visit', who: 'potts', item: 'eggs', n: 3, until: 3600e3 });
await bad('…someone who isn\'t a villager: dropped, flagged', { k: 'visit', who: 'queen', item: 'eggs', n: 3 });
await bad('…something she never asks for: dropped, flagged', { k: 'visit', who: 'potts', item: 'fish', n: 1 });
await bad('…999 eggs: dropped, flagged', { k: 'visit', who: 'potts', item: 'eggs', n: 999 });
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

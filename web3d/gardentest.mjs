// The vegetable garden (7 Nov 2026, Audrey's choice: "Vegetable garden: grow carrots, strawberries and pumpkins, which grow
// at different speeds; treats the hens love"): ./withserver.sh node gardentest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A new farm on a fake clock. Level 3: no garden. Level 4: its card says so, the garden on your land by the farmhouse,
// "Sow" over it. Its card: three beds, each ready to sow (carrots, strawberries, pumpkins). Carrots sown in bed 1: their
// seeds paid, the farmer sows them, then their sign; shoots, growing, ripe in an hour; "Pick": six carrots in the basket,
// +1 XP, the bed empty again. A reload: all kept, not flagged. A treat for the coop (a bird's card): the carrots it takes
// from the basket, the farmer scatters it in the pen (bits of carrot), and soon after each hen lays an extra egg; one a
// day ("They've had their treat today"). Strawberries: a little experience for every bird too. A village order for
// carrots: delivered from the basket. A save changed outside the game (a bed ripe far ahead, the basket overfull, a treat
// in the future, a garden at level 3) is checked and flagged. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/gardentest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);      // (a running farm's frames are slow in the test browser's software drawing, Storybook's the more)
const T0 = new Date('2026-11-09T09:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const jump = async ms => { await p.evaluate(ms => { window.__T = Math.round(window.__T + ms); sessionStorage.setItem('__T', window.__T); }, ms); await run(1.5); };
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/garden_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(); return { level: g.level, coins: g.data.coins, xp: g.data.xp, garden: g.data.garden ? JSON.parse(JSON.stringify(g.data.garden)) : null, st: f.garden.state(), work: f.garden.work(), edited: g.edited, stages: g.data.garden ? [0, 1, 2].map(i => g.bedStage(i)) : null }; });
const waitWork = async (max = 60) => { for (let i = 0; i < max && await p.evaluate(() => !!window.__farm.garden.work()); i++) await run(1); };
const look = async (z = 2.6) => { await p.evaluate(z => { const f = window.__farm, m = f.garden.mid(1); if (m) { f.lookAt(m[0], m[2], z); f.draw(); } }, z); await run(0.2); };
const T = fr ? { sow: /Semer/, pick: /Récolter/, had: /ont eu leur friandise/, lv: /Nouveau : votre potager/ } : { sow: /Sow/, pick: /Pick/, had: /had their treat today/, lv: /New: your vegetable garden/ };

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=09:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 60; g.data.lvSeen = 3; g.fishBag().gift = true; g.data.coins = 300; g.save(); f.gameUI().close(); });
await run(2);
let s = await S();
ok('level 3: no garden', s.level === 3 && !s.garden && !s.st.at, s);
// level 4
await p.evaluate(() => { const g = window.__farm.game(); g.data.xp = window.__farm.xpFor(4) + 5; g.save(); });
await run(1.5);
const lvText = await sheet();
ok('level 4: its card says the vegetable garden has come', T.lv.test(lvText), lvText.split('\n').filter(l => /garden|potager/i.test(l)));
await close(); await run(1);
for (let i = 0; i < 20 && !(await S()).st.at; i++) await run(1);
s = await S();
ok('the garden on your land, its three beds empty, "Sow" over it', s.st.at && s.st.owned && s.stages.join() === 'empty,empty,empty' && s.st.visible.every(v => !v.length), s);
await look(4.5); s = await S();
ok('"Sow" over it', T.sow.test(s.st.bub || ''), s.st.bub);
await shoot('1_new');
// its card
await p.evaluate(() => window.__farm.garden.tap()); await run(0.3);
let card = await sheet();
const sowBtns = await p.evaluate(() => [...document.querySelectorAll('.gsheet [data-sow]')].map(e => e.dataset.sow));
ok('its card: three beds, each ready to sow carrots, strawberries or pumpkins', sowBtns.join() === 'carrot,straw,pump,carrot,straw,pump,carrot,straw,pump', { sowBtns, card: card.slice(0, 300) });
await shoot('2_card');
// carrots in bed 1
const c0 = (await S()).coins;
await p.evaluate(() => document.querySelector('.gsheet .gbed[data-bed="0"] [data-sow="carrot"]').click()); await run(0.3);
s = await S();
ok('carrots sown: 5 coins, the farmer on his way, the bed as it was till he\'s done', s.coins === c0 - 5 && s.garden.beds[0].crop === 'carrot' && s.work === 'sow' && s.st.visible[0].length === 0, s);
await waitWork(); s = await S();
ok('sown: their sign in the bed', !s.work && s.st.visible[0].join() === 'sign_carrot' && /sown|semées/i.test(await hintT()), { s, h: await hintT() });
await jump(15 * 60e3); s = await S();
ok('a quarter of an hour on: shoots', s.stages[0] === 'shoots' && s.st.visible[0].includes('carrot_1'), s.st.visible);
await look(); await shoot('3_shoots');
await jump(20 * 60e3); s = await S();
ok('half an hour later: growing', s.stages[0] === 'growing' && s.st.visible[0].includes('carrot_2'), s.st.visible);
await jump(26 * 60e3); s = await S();
await look(4.5); s = await S();
ok('an hour after sowing: ripe, "Pick" over it', s.stages[0] === 'ripe' && s.st.visible[0].includes('carrot_3') && T.pick.test(s.st.bub || ''), s);
await look(); await shoot('4_ripe');
// pick
const x0 = s.xp;
await p.evaluate(() => window.__farm.garden.tap(true)); await run(0.3);
s = await S();
ok('picked: six carrots in the basket, +1 XP, the farmer on his way', s.garden.veg.carrot === 6 && s.xp === x0 + 1 && s.work === 'pick' && !s.garden.beds[0].crop, s);
await run(3); await shoot('5_picking');
await waitWork(); s = await S();
ok('done: the bed empty again; "+6 carrots"', !s.work && s.st.visible[0].length === 0 && /\+6/.test(await hintT()), { v: s.st.visible, h: await hintT() });
// a reload
await p.evaluate(() => { const g = window.__farm.game(), G = g.garden(); G.beds[1] = { crop: 'straw', ripe: Date.now() + 3600e3 }; g.save(); });
const keep = await p.evaluate(() => JSON.stringify(window.__farm.game().data.garden));
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await close(); await run(2);
s = await S();
ok('a reload: the garden as it was, not flagged', JSON.stringify(s.garden) === keep && !s.edited && s.st.visible[1].includes('straw_2'), { s, keep });
// a treat
const coop = await p.evaluate(() => window.__farm.game().data.coops[0].id);
const henCard = await p.evaluate(() => { const f = window.__farm, g = f.game(), h = g.data.birds.find(b => b.sex === 'h'); f.openBirdCard(f.allBirds.find(x => x.gid === h.id)); return { text: document.querySelector('.gsheet').innerText, btn: !!document.querySelector('.gsheet [data-treat]') }; });
ok('a bird\'s card: "A treat for the coop"', henCard.btn, henCard.text.split('\n').filter(l => /treat|friandise/i.test(l)));
await p.evaluate(() => document.querySelector('.gsheet [data-treat]').click()); await run(0.2);
card = await sheet();
const gives = await p.evaluate(() => [...document.querySelectorAll('.gsheet [data-give]')].map(e => e.dataset.give + ':' + !e.disabled));
ok('the treat card: carrots (6 in the basket) can be given; no strawberries or pumpkins yet', gives.join() === 'carrot:true,straw:false,pump:false', { gives, card: card.slice(0, 400) });
await shoot('6_treat_card');
const lays0 = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return { eggs: c.eggs, hens: g.birdsIn(c.id).filter(b => b.sex === 'h').length }; });
await p.evaluate(() => document.querySelector('.gsheet [data-give="carrot"]').click()); await run(0.3);
s = await S();
const tr = await p.evaluate(() => window.__farm.game().data.coops[0].treat);
ok('given: three carrots from the basket, the coop\'s treat today, the farmer on his way to the pen', s.garden.veg.carrot === 3 && tr && tr.crop === 'carrot', { veg: s.garden.veg, tr });
let bits = [];
for (let i = 0; i < 40 && !bits.includes('carrot'); i++) { await run(0.5); bits = await p.evaluate(() => window.__farm.treat.corn(0)); }
ok('in the pen: bits of carrot scattered for them', bits.includes('carrot'), bits.slice(0, 8));
await p.evaluate(() => { const f = window.__farm, c = f.game().data.coops[0], P = f.gamePlots()[0].group.position; f.lookAt(P.x, P.z, 2.4); f.draw(); }); await run(1.5);
await shoot('7_treat_pen');
for (let i = 0; i < 30; i++) await run(1);
// the extra eggs: due within the hour
const dueT = await p.evaluate(() => window.__farm.game().dueLays(Date.now() + 3600e3).filter(l => l.treat).length);
ok('soon after: an extra egg due from each hen', dueT === lays0.hens, { dueT, lays0 });
await jump(65 * 60e3);
const laidT = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return g.birdsIn(c.id).filter(b => b.sex === 'h').every(b => b.laid >= c.treat.t + 20 * 60e3); });
ok('an hour later: they\'ve laid them', laidT, laidT);
// one a day
await p.evaluate(id => window.__farm.treat.card(id), coop); await run(0.2);
ok('one a day: "They\'ve had their treat today"', T.had.test(await sheet()), await sheet());
await close();
// strawberries: experience for every bird too (another coop's, or tomorrow)
await jump(24 * 3600e3);
await p.evaluate(() => { const g = window.__farm.game(); g.garden().veg.straw = 4; g.save(); });
const e0 = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return g.birdsIn(c.id).map(b => b.exp); });
const r2 = await p.evaluate(id => window.__farm.treat.give(id, 'straw'), coop);
const e1 = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return g.birdsIn(c.id).map(b => b.exp); });
ok('the next day, strawberries: a little experience for every bird there (+8)', r2 && e1.every((x, i) => x === e0[i] + 8), { r2, e0, e1 });
await waitWork(40);
// a village order for carrots
const ord = await p.evaluate(() => { const g = window.__farm.game(), B = g.orderBook(); B.list = [{ id: 'o90', who: 'potts', t: Date.now(), items: { carrot: 3 }, got: {} }]; g.save(); return { ready: g.orderReady(B.list[0]), have: g.storeOf('carrot') }; });
const del = await p.evaluate(() => window.__farm.game().deliverOrder('o90'));
s = await S();
ok('a village order for 3 carrots: ready from the basket, delivered, the basket 3 fewer', ord.ready && del && s.garden.veg.carrot === ord.have - 3, { ord, del, veg: s.garden.veg });
// a save changed outside the game
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.garden.beds[2] = { crop: 'pump', ripe: Date.now() + 400 * 3600e3 }; raw.d.garden.veg.carrot = 999; raw.d.coops[0].treat = { t: Date.now() + 9 * 86400e3, crop: 'pump' }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await close();
s = await S();
const tr2 = await p.evaluate(() => window.__farm.game().data.coops[0].treat || null), nowP = await p.evaluate(() => Date.now());
ok('a save changed outside the game: a bed ripe no later than its crop takes, the basket no fuller than it holds, no treat in the future; flagged', s.edited && s.garden.beds[2].ripe <= nowP + 8 * 3600e3 + 14 * 3600e3 && s.garden.veg.carrot === 30 && !tr2, { g: s.garden, tr2, edited: s.edited });
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = 60; raw.d.lvSeen = 3; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await close();
s = await S();
ok('a garden at level 3: none, flagged', s.edited && !s.garden && s.level === 3, { level: s.level, garden: s.garden, edited: s.edited });
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

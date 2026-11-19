// Getting a bird ready for a show (17 Nov 2026, groom.js): ./withserver.sh node groomtest.mjs OUT   (LANG=fr; W=874 H=402)
// A new farm: "Enter" on the village show opens the grooming game with her own picture (one bird, alone), nothing paid
// yet; washing (rubbing all over her), brushing (swipes from head to tail; against the feathers doesn't count), shining
// (the sparkles tapped); "Off to the show": the fee paid, she's entered, how well she was groomed kept in the save and her
// chance up a little; a reload: kept, not flagged; a save changed outside (groomed 500 in 100): put right and flagged.
// Closed with its cross: nothing entered, nothing paid. "Enter without grooming": entered as before.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/groomtest'; fs.mkdirSync(OUT, { recursive: true });
const fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(180000);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(Date.now()); if (f.gameUI().isOpen) f.gameUI().close(); f.draw(); }); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click()); await load();
await p.evaluate(() => { const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.coins = 500; g.save(); });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), G = f.groom.now(); return { coins: g.data.coins, in: g.shows().in.map(e => ({ ...e })), open: !!document.querySelector('.groom'), st: G ? G.state() : null, edited: g.edited }; });
const pic = () => p.evaluate(() => { const r = document.querySelector('.groom-pic').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
const drag = async (pts) => { await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); for (const q of pts.slice(1)) await p.mouse.move(q[0], q[1], { steps: 14 }); await p.mouse.up(); };
// her picture: one bird, see-through round her
const por = await p.evaluate(() => { const f = window.__farm, g = f.game(), hen = g.data.birds.find(x => x.sex === 'h'); return { size: f.groom.portrait(hen.id), id: hen.id }; });
ok('her picture is made: a square with her in it', por.size && por.size[0] > 200 && por.size[0] === por.size[1], por);
for (const id of await p.evaluate(() => window.__farm.game().data.birds.map(x => x.id))) { const u = await p.evaluate(id => window.__farm.groom.portrait(id, true), id); if (u) fs.writeFileSync(OUT + '/portrait_' + id + '.png', Buffer.from(u.split(',')[1], 'base64')); }
// Enter on the shows' card: the game, nothing paid yet
await ctx.addInitScript(() => { window.__FF_GROOM_SECS = 45; }); await p.evaluate(() => { window.__FF_GROOM_SECS = 45; });      // (the test browser draws slowly: each part given the time a finger needs in eight seconds)
await p.evaluate(() => window.__farm.showsSheet()); await p.waitForTimeout(300);
const s0 = await S();
await p.evaluate(() => { const bt = [...document.querySelectorAll('.gsheet .gshow .gbtn')].find(x => !x.disabled); bt.click(); }); await p.waitForTimeout(500);
let s = await S();
ok('"Enter": the grooming game opens with her alone, nothing paid, not entered yet', s.open && s.st && s.st.step === 'wash' && s.st.on >= 5 && s.coins === s0.coins && s.in.length === 0, s);
await p.screenshot({ path: OUT + '/groom_1_wash.png' });
const filled = await p.evaluate(() => { const c = document.querySelector('.groom-img'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let a = 0, n = 0; for (let i = 3; i < d.length; i += 4) { n++; if (d[i] > 128) a++; } return a / n; });
ok('her picture: she fills a fair part of it, the rest see-through', filled > 0.15 && filled < 0.8, filled);
// each part: its own tool in hand, five places on her to see to, a bar that fills as they're done (19 Nov 2026)
const XY = async (u, v) => { const R = await pic(); return [R[0] + R[2] * u, R[1] + R[3] * v]; };
const stroke = async (sp, dir = 1) => { const a = await XY(sp[0] - 0.075 * dir, sp[1]), b2 = await XY(sp[0] + 0.075 * dir, sp[1]); await drag([a, b2]); };
const doStep = async (name, both) => { for (let k = 0; k < 14; k++) { const st = (await S()).st; if (st.step !== name) break; for (const sp of st.spots) { if (sp[2] >= 1) continue; await stroke(sp, 1); if (both && (await S()).st.step === name) await stroke(sp, -1); if ((await S()).st.step !== name) break; } } };
s = await S();
ok('washing: a sponge in hand, five muddy patches on her, the bar empty', s.st.tool === 'wash' && s.st.spots.length === 5 && s.st.spots.every(q => q[2] === 0) && (await p.evaluate(() => document.querySelectorAll('.groom-mud').length)) === 5 && (await p.evaluate(() => document.querySelector('.groom-time i').style.width)) === '0%', s.st);
{ const far = [[0.03, 0.03], [0.97, 0.03], [0.03, 0.97], [0.97, 0.97]].sort((a, b2) => Math.min(...s.st.spots.map(q => Math.hypot(q[0] - b2[0], q[1] - b2[1]))) - Math.min(...s.st.spots.map(q => Math.hypot(q[0] - a[0], q[1] - a[1]))))[0]; await drag([await XY(far[0], far[1]), await XY(far[0] + (far[0] < 0.5 ? 0.06 : -0.06), far[1])]); }      // (the corner furthest from every patch)
ok('rubbing where there is no mud does nothing', (await S()).st.scores[0] === 0 && !(await S()).st.started);
await stroke(s.st.spots[0], 1); const half = (await S()).st;
ok('a patch rubbed: it fades, the bar moves on', half.scores[0] > 0 && half.scores[0] < 1 && half.started, half.scores);
await p.screenshot({ path: OUT + '/groom_1b_washing.png' });
await doStep('wash', true);
await p.waitForTimeout(300); s = await S();
ok('washed: every patch gone, on to the brush', s.st.step === 'brush' && s.st.scores[0] > 0.9, s.st);
ok('brushing: a little brush in hand, five ruffled places', s.st.tool === 'brush' && s.st.spots.length === 5 && (await p.evaluate(() => document.querySelectorAll('.groom-tuft').length)) === 5, s.st.tool);
await p.screenshot({ path: OUT + '/groom_2_brush.png' });
const br0 = s.st.scores[1]; await stroke(s.st.spots[0], -1);
const against = (await S()).st.scores[1] - br0;
await doStep('brush', false);
s = await S();
ok('brushed: against the feathers counts for nothing, from head to tail does; on to the shine', against === 0 && s.st.step === 'shine' && s.st.scores[1] > 0.9, { against, st: s.st });
ok('shining: a cloth in hand, five dull spots', s.st.tool === 'shine' && s.st.spots.length === 5 && (await p.evaluate(() => document.querySelectorAll('.groom-dull').length)) === 5, s.st.tool);
await p.screenshot({ path: OUT + '/groom_2b_shine.png' });
await doStep('shine', true);
s = await S();
ok('shone: every spot polished; all three done, her score and her better chance shown', s.st.step === 'done' && s.st.scores[2] > 0.9 && s.st.score > 85, s.st);
const txt = await p.evaluate(() => document.querySelector('.groom-card').innerText);
ok('the card: show-ready, her chance going up', /\d+% → \d+%/.test(txt) || /100%/.test(txt), txt.replace(/\n+/g, ' | '));
await p.screenshot({ path: OUT + '/groom_3_done.png' });
// off to the show
await p.tap('.groom [data-groom=go]'); await p.waitForTimeout(500); s = await S();
ok('"Off to the show": the fee paid, she is entered, how well she was groomed kept', !s.open && s.in.length === 1 && s.in[0].g === s.st?.score || (!s.open && s.in.length === 1 && s.in[0].g > 60 && s.coins < s0.coins), s);
const ch = await p.evaluate(() => { const g = window.__farm.game(), e = g.shows().in[0], b = g.bird(e.bird); return [g.showChance(b, e.id, 0).rosette, g.showChance(b, e.id, e.g).rosette, g.showScore(b, e.id, e.g) - g.showScore(b, e.id, 0)]; });
ok('her chance of a rosette: a little better for it (two points at the most in the judge\'s eyes)', ch[1] >= ch[0] && ch[2] > 0 && ch[2] <= 2.2, ch);
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); let s2 = await S();
ok('a reload: entered, groomed as she was, not flagged', s2.in.length === 1 && s2.in[0].g === s.in[0].g && !s2.edited, s2.in);
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.shows.in[0].g = 500; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); s2 = await S();
ok('a save changed outside (groomed 500 in 100): put right, flagged', s2.in.length === 1 && s2.in[0].g <= 100 && s2.edited, s2.in);
// the cross: nothing entered; "Enter without grooming": as before
await p.evaluate(() => { const g = window.__farm.game(); g.shows().in = []; g.data.coins = 500; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const open = async () => { await p.evaluate(() => window.__farm.showsSheet()); await p.waitForTimeout(300); await p.evaluate(() => { const bt = [...document.querySelectorAll('.gsheet .gshow .gbtn')].find(x => !x.disabled); bt.click(); }); await p.waitForTimeout(500); };
await open(); await p.tap('.groom .groom-x'); await p.waitForTimeout(400); s = await S();
ok('closed with its cross: nothing entered, nothing paid, the shows\' card back', !s.open && s.in.length === 0 && s.coins === 500 && (await p.evaluate(() => window.__farm.gameUI().kind)) === 'shows', s);
await open(); await p.tap('.groom [data-groom=skip]'); await p.waitForTimeout(400); s = await S();
ok('"Enter without grooming": entered as before, the fee paid', !s.open && s.in.length === 1 && s.in[0].g === undefined && s.coins < 500, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);

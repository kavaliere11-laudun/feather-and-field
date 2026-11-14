// Santa's Workshop and its garden (13 Nov 2026; Audrey: "Carry on"; her list: "Leghorns: Santa's Workshop; a little toy
// train they ride round the yard"): ./withserver.sh node traintest.mjs [OUT]   (LANG=fr; PORT)
// A farm with four fields and a Leghorn coop, in December: its card offers Santa's Workshop; bought: the workshop and its own
// winter garden drawn, a bauble where the cabbage hung, the toy train at its station. A hen hops into the wagon, rides round
// the track and back to the station, hops out. Footprints. A reload keeps it, not flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/traintest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-12-05T11:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const jump = async ms => { await p.evaluate(ms => { window.__T = Math.round(window.__T + ms); sessionStorage.setItem('__T', window.__T); }, ms); await run(1.5); };
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/train_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[window.__ci || 0]; return { coins: g.data.coins, theme: c.theme || null, themes: g.data.themes || [], tier: c.tier, tier0: c.tier0, w: f.winterOf(c.id), eggs: c.eggs, kind: f.gameUI().kind, edited: g.edited, drawn: [...new Set(f.coopModels())] }; });


const T = fr ? { name: /Fabrique de jouets du Père Noël/ } : { name: /Santa’s Toy Factory/ };
const view = (lx, lz, z, i = 1) => p.evaluate(([lx, lz, z, i]) => { const f = window.__farm, P = f.gamePlots()[i], w = P.frame.localToWorld(new f.THREE.Vector3(lx, 0, lz)); f.lookAt(w.x, w.z, z); f.draw(); }, [lx, lz, z, i]);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(16) + 5; g.data.lvSeen = 16; for (let i = 0; i < 4; i++) { g.data.coins = 30000; f.buyLand(); for (let k = 0; k < 120; k++) { window.__T += 33; f.step(1 / 30, 1); f.gameTick(window.__T, false); } } g.data.coins = 60000; g.save(); f.gameUI().close(); });
await run(2); await close();
const placed = await p.evaluate(() => { const f = window.__farm; const r = f.place('leg'); const s = f.move.state(); return { r, ok: s.ok, grow: s.grow, put: f.move.place() }; });
await run(2); await close();
ok('a Leghorn coop put down where its Deluxe garden will fit', placed.r && placed.ok && placed.grow === 4 && placed.put, placed);
await p.evaluate(() => { window.__ci = 1; });
await close(); await p.evaluate(() => window.__farm.coopCard(1)); await run(0.2);
let c = await p.evaluate(() => { const r = document.querySelector('.gsheet:not([hidden]) .gtheme-r'), b = r && r.querySelector('button'); return r ? { text: r.innerText, btn: b ? { t: b.textContent, off: b.disabled, go: b.dataset.themego } : null } : null; });
ok('its card offers Santa\'s Workshop for 15,000 coins', c && T.name.test(c.text) && c.btn && c.btn.go === 'buy' && !c.btn.off, c);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gtheme-r button').click()); await run(0.8);
let s = await S();
ok('bought: the workshop, a Deluxe coop while worn, its own winter garden drawn', s.themes.join() === 'winter_leg' && s.theme === 'winter' && s.tier === 4 && s.drawn.includes('theme_winter_leg') && s.drawn.includes('pen_t4_leg_winter#snow') && s.drawn.includes('fence_t4_leg_winter#snow'), s);
ok('its own toys: the toy train at its station, a bauble where the cabbage hung; no igloo, puddle, roundabout, gumdrop or slide', s.w && s.w.train && s.w.train.a === 0 && s.w.treat === 'bauble' && !s.w.igloo && !s.w.ice && !s.w.spin && !s.w.bounce && !s.w.chute, s.w);
await close(); await view(0.1, 1.2, 2.7); await shoot('1_garden');
const went = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1]; for (const b of P.birds) if (b.play) f.endPlay(b, true); for (const b of P.birds) { if (b.kind !== 'hen' || b.asleep) continue; b.layIn = 9999; if (f.startPlay(b, 'train')) return true; } return false; });
await view(-0.4, 2.0, 1.2);
const ph = new Set(); let maxA = 0, shot = 0; const xs = [];
for (let i = 0; i < 400 && went; i++) { await run(0.2); const st = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1], b = P.birds.find(x => x.play && x.play.kind === 'train'), w = f.winterOf(P.gc.id); return b ? { ph: b.play.phase, x: b.root.position.x, a: w.train.a } : null; }); if (!st) break; ph.add(st.ph); if (st.ph === 'ride') { maxA = Math.max(maxA, st.a); xs.push(st.x); if (shot === 0 && st.a > 2) { shot = 1; await shoot('2_riding'); } } }
s = await S();
ok('a hen hops into the wagon, the train takes her round the track at least twice and back to its station, she hops out, a shake', went && ph.has('on') && ph.has('ride') && ph.has('off') && ph.has('shake') && maxA > 11 && Math.max(...xs) - Math.min(...xs) > 0.7 && s.w.train.a === 0 && !s.w.train.by, { went, ph: [...ph], maxA, a: s.w.train });
await run(8);
const went2 = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1]; for (const b of P.birds) if (b.play) f.endPlay(b, true); P.toys.train.pair = true; P.toys.train.next = 0; for (const b of P.birds) { if (b.kind !== 'hen' || b.asleep) continue; b.layIn = 9999; if (f.startPlay(b, 'train')) return true; } return false; });
const ph1 = new Set(), ph2 = new Set(); let both = 0, shot2 = 0, apart = 9, last2 = null;
for (let i = 0; i < 600 && went2; i++) { await run(0.2); const st = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1], a = P.birds.find(x => x.play && x.play.kind === 'train'), b = P.birds.find(x => x.play && x.play.kind === 'train2'); return { a: a ? a.play.phase : null, b: b ? b.play.phase : null, ang: P.toys.train.a, d: a && b ? Math.hypot(a.root.position.x - b.root.position.x, a.root.position.z - b.root.position.z) : null, why: a && a.play.phase === 'wait' ? !!a.play.mate : null }; }); if (st.a) ph1.add(st.a); if (st.b) ph2.add(st.b); last2 = st; if (st.a === 'ride' && st.b === 'ride' && st.ang > 0) { both++; apart = Math.min(apart, st.d); if (!shot2 && st.ang > 2.5) { shot2 = 1; await shoot('3_two'); } } if (!st.a && !st.b && i > 10) break; }
s = await S();
ok('a friend comes along: a second hen hops into the second wagon, they ride round together, each in her own wagon, and both hop out at the station', went2 && ph1.has('wait') && ph1.has('ride') && ph1.has('shake') && ph2.has('on') && ph2.has('ride') && ph2.has('off') && ph2.has('shake') && both > 20 && apart > 0.2 && s.w.train.a === 0 && !s.w.train.by, { went2, ph1: [...ph1], ph2: [...ph2], both, apart, last2 });
await run(12); s = await S();
ok('footprints in its snow', s.w.prints > 3, s.w);
await close();
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
await p.evaluate(() => { window.__ci = 1; }); s = await S();
ok('a reload: kept, not flagged', s.theme === 'winter' && s.tier === 4 && !s.edited && s.drawn.includes('theme_winter_leg') && s.w.train, s);
await p.evaluate(() => window.__farm.setHour(22.5)); await run(0.5); await view(0.1, 1.2, 2.7); await shoot('4_night');
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

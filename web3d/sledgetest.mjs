// The Ski Lodge and its garden (13 Nov 2026; Audrey: "Carry on"; her list: "Brahmas: Ski Lodge; a sledge run down a small
// snowy hill"): ./withserver.sh node sledgetest.mjs [OUT]   (LANG=fr; PORT)
// A farm with a Brahma coop (level 24), in December: its card offers the Ski Lodge; bought: the lodge and its own winter
// garden, a pine cone where the cabbage hung, the sledge at the top of its hill. A hen climbs the hill, rides the sledge
// down, hops off; the sledge is drawn back up. Footprints. A reload keeps it, not flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/sledgetest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
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
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/sledge_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[window.__ci || 0]; return { coins: g.data.coins, theme: c.theme || null, themes: g.data.themes || [], tier: c.tier, tier0: c.tier0, w: f.winterOf(c.id), eggs: c.eggs, kind: f.gameUI().kind, edited: g.edited, drawn: [...new Set(f.coopModels())] }; });


const T = fr ? { name: /Chalet de ski/ } : { name: /Ski Lodge/ };
const view = (lx, lz, z, i = 1) => p.evaluate(([lx, lz, z, i]) => { const f = window.__farm, P = f.gamePlots()[i], w = P.frame.localToWorld(new f.THREE.Vector3(lx, 0, lz)); f.lookAt(w.x, w.z, z); f.draw(); }, [lx, lz, z, i]);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(25) + 5; g.data.lvSeen = 25; for (let i = 0; i < 4; i++) { g.data.coins = 30000; f.buyLand(); for (let k = 0; k < 120; k++) { window.__T += 33; f.step(1 / 30, 1); f.gameTick(window.__T, false); } } g.data.coins = 60000; g.save(); f.gameUI().close(); });
await run(2); await close();
const placed = await p.evaluate(() => { const f = window.__farm; const r = f.place('bra'); const s = f.move.state(); return { r, ok: s.ok, grow: s.grow, put: f.move.place() }; });
await run(2); await close();
ok('a Brahma coop put down where its Deluxe garden will fit', placed.r && placed.ok && placed.grow === 4 && placed.put, placed);
await p.evaluate(() => { window.__ci = 1; });
await close(); await p.evaluate(() => window.__farm.coopCard(1)); await run(0.2);
let c = await p.evaluate(() => { const r = document.querySelector('.gsheet:not([hidden]) .gtheme-r'), b = r && r.querySelector('button'); return r ? { text: r.innerText, btn: b ? { t: b.textContent, off: b.disabled, go: b.dataset.themego } : null } : null; });
ok('its card offers the Ski Lodge for 15,000 coins', c && T.name.test(c.text) && c.btn && c.btn.go === 'buy' && !c.btn.off, c);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gtheme-r button').click()); await run(0.8);
let s = await S();
ok('bought: the lodge, a Deluxe coop while worn, its own winter garden drawn', s.themes.join() === 'winter_bra' && s.theme === 'winter' && s.tier === 4 && s.drawn.includes('theme_winter_bra') && s.drawn.includes('pen_t4_bra_winter#snow') && s.drawn.includes('fence_t4_bra_winter#snow'), s);
ok('its own toys: the sledge at the top of its hill, a pine cone where the cabbage hung; no igloo, puddle, roundabout, gumdrop or train', s.w && s.w.chute && s.w.chute.sled && s.w.chute.sled[1] > 0.35 && s.w.treat === 'pinecone' && !s.w.igloo && !s.w.ice && !s.w.spin && !s.w.bounce && !s.w.train, s.w);
await close(); await view(0.1, 1.2, 2.7); await shoot('1_garden');
const went = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1]; for (const b of P.birds) if (b.play) f.endPlay(b, true); for (const b of P.birds) { if (b.kind !== 'hen' || b.asleep) continue; b.layIn = 9999; if (f.startPlay(b, 'chute')) return true; } return false; });
await view(-0.3, 1.9, 1.0);
const ph = new Set(); let maxY = 0, x0 = null, x1 = null, shot = 0;
for (let i = 0; i < 300 && went; i++) { await run(0.12); const st = await p.evaluate(() => { const P = window.__farm.gamePlots()[1], b = P.birds.find(x => x.play && x.play.kind === 'chute'); return b ? { ph: b.play.phase, x: b.root.position.x, y: b.root.position.y } : null; }); if (!st) break; ph.add(st.ph); maxY = Math.max(maxY, st.y); if (st.ph === 'top' && shot === 0) { shot = 1; await shoot('2_top'); } if (st.ph === 'go') { if (x0 === null) x0 = st.x; x1 = st.x; if (shot === 1 && st.y < 0.3) { shot = 2; await shoot('3_sliding'); } } }
s = await S();
ok('a hen climbs the hill, rides the sledge down, hops off, a shake', went && ph.has('climb') && ph.has('top') && ph.has('go') && ph.has('skid') && ph.has('hopoff') && ph.has('shake') && maxY > 0.4 && x1 - x0 > 0.3 && !s.w.chute.by && (s.w.chute.back > 0 || s.w.chute.sled[0] > 0.2), { went, ph: [...ph], maxY, x0, x1, w: s.w.chute });
await run(5); s = await S();
ok('the sledge drawn back up to the top of its run', s.w.chute.sled[1] > 0.35 && s.w.chute.sled[0] < -0.6 && s.w.chute.back === 0, s.w.chute);
await run(12); s = await S();
ok('footprints in its snow', s.w.prints > 3, s.w);
await close();
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
await p.evaluate(() => { window.__ci = 1; }); s = await S();
ok('a reload: kept, not flagged', s.theme === 'winter' && s.tier === 4 && !s.edited && s.drawn.includes('theme_winter_bra') && s.w.chute, s);
await p.evaluate(() => window.__farm.setHour(22.5)); await run(0.5); await view(0.1, 1.2, 2.7); await shoot('4_night');
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

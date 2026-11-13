// The Gingerbread Cottage and its garden (13 Nov 2026; Audrey: "Can you try to find some uniqueness in the toys for the breeds?";
// her choices for the Buff Orpingtons: hot chocolate mug, peppermint roundabout, gumdrop trampoline, candy versions of the
// rest): ./withserver.sh node gingertest.mjs [OUT]   (LANG=fr; PORT)
// A farm with four fields and a Buff Orpington coop, in December: its card offers the Gingerbread Cottage; bought: the
// cottage and its own winter garden drawn (not the Reds' igloo or puddle), a doughnut where the cabbage hung, the
// roundabout and the gumdrop. A hen rides the roundabout (it turns, she goes round with it, gets off dizzy); a hen bounces on
// the gumdrop (up in the air, the gumdrop squashed); a hen bathes in the mug (marshmallows fly). Footprints in the snow.
// The Reds' coop beside it still gets the Snow Chalet with its igloo. A reload keeps it all, not flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/gingertest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
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
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/ginger_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[window.__ci || 0]; return { coins: g.data.coins, theme: c.theme || null, themes: g.data.themes || [], tier: c.tier, tier0: c.tier0, w: f.winterOf(c.id), eggs: c.eggs, kind: f.gameUI().kind, edited: g.edited, drawn: [...new Set(f.coopModels())] }; });

const T = fr ? { name: /Maison en pain d’épices/ } : { name: /Gingerbread Cottage/ };
const view = (lx, lz, z, i = 1) => p.evaluate(([lx, lz, z, i]) => { const f = window.__farm, P = f.gamePlots()[i], w = P.frame.localToWorld(new f.THREE.Vector3(lx, 0, lz)); f.lookAt(w.x, w.z, z); f.draw(); }, [lx, lz, z, i]);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(6) + 5; g.data.lvSeen = 6; for (let i = 0; i < 4; i++) { g.data.coins = 30000; f.buyLand(); for (let k = 0; k < 120; k++) { window.__T += 33; f.step(1 / 30, 1); f.gameTick(window.__T, false); } } g.data.coins = 60000; g.save(); f.gameUI().close(); });
await run(2); await close();
const placed = await p.evaluate(() => { const f = window.__farm; const r = f.place('orp'); const s = f.move.state(); return { r, ok: s.ok, grow: s.grow, put: f.move.place() }; });
await run(2); await close();
ok('a Buff Orpington coop put down where its Deluxe garden will fit', placed.r && placed.ok && placed.grow === 4 && placed.put, placed);
await p.evaluate(() => { window.__ci = 1; });
const cardOf = async i => { await close(); await p.evaluate(i => window.__farm.coopCard(i), i); await run(0.2); return p.evaluate(() => { const r = document.querySelector('.gsheet:not([hidden]) .gtheme-r'), b = r && r.querySelector('button'); return r ? { text: r.innerText, btn: b ? { t: b.textContent, off: b.disabled, go: b.dataset.themego } : null } : null; }); };
let c = await cardOf(1);
ok('its card offers the Gingerbread Cottage for 15,000 coins', c && T.name.test(c.text) && c.btn && c.btn.go === 'buy' && !c.btn.off && /15[,.\s  ]?000/.test(c.btn.t), c);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gtheme-r button').click()); await run(0.8);
let s = await S();
ok('bought: the cottage, a Deluxe coop while worn, its own winter garden drawn', s.themes.join() === 'winter_orp' && s.theme === 'winter' && s.tier === 4 && s.drawn.includes('theme_winter_orp') && s.drawn.includes('pen_t4_orp_winter#snow') && s.drawn.includes('fence_t4_orp_winter#snow'), s);
ok('its own toys: the roundabout, the gumdrop, a doughnut where the cabbage hung; no igloo, no puddle', s.w && s.w.spin && s.w.bounce && s.w.treat === 'doughnut' && !s.w.igloo && !s.w.ice, s.w);
await close(); await view(0.1, 1.2, 2.7); await shoot('1_garden');
const send = kind => p.evaluate(kind => { const f = window.__farm, P = f.gamePlots()[1]; for (const b of P.birds) if (b.play) f.endPlay(b, true); for (const b of P.birds) { if (b.kind !== 'hen' || b.asleep) continue; b.layIn = 9999; if (f.startPlay(b, kind)) return true; } return false; }, kind);
const watch = async (kind, each) => { const ph = new Set(); for (let i = 0; i < 260; i++) { await run(0.2); const st = await p.evaluate(kind => { const f = window.__farm, P = f.gamePlots()[1], b = P.birds.find(x => x.play && x.play.kind === kind), w = f.winterOf(P.gc.id); return b ? { ph: b.play.phase, x: b.root.position.x, y: b.root.position.y, z: b.root.position.z, w } : null; }, kind); if (!st) break; ph.add(st.ph); await each(st); } return ph; };
// the roundabout
let went = await send('spin'); await view(-0.3, 2.3, 1.1);
let maxW = 0, shot = false; const xs = [];
let ph = await watch('spin', async st => { if (st.ph === 'ride') { maxW = Math.max(maxW, st.w.spin.w); xs.push(st.x); if (!shot && st.w.spin.w > 2.5) { shot = true; await shoot('2_roundabout'); } } });
ok('a hen rides the roundabout: it turns, she goes round with it, gets off dizzy, a shake', went && ph.has('ride') && ph.has('dizzy') && ph.has('shake') && maxW > 2.5 && Math.max(...xs) - Math.min(...xs) > 0.3 && !(await S()).w.spin.by, { went, ph: [...ph], maxW });
// the gumdrop
went = await send('bounce'); await view(1.6, 1.3, 1.1);
let maxY = 0; shot = false;
ph = await watch('bounce', async st => { if (st.ph === 'bounce') { maxY = Math.max(maxY, st.y); if (!shot && st.y > 0.45) { shot = true; await shoot('3_gumdrop'); } } });
ok('a hen bounces on the gumdrop, up in the air, and comes down beside it', went && ph.has('bounce') && ph.has('down') && maxY > 0.45 && !(await S()).w.bounce.by, { went, ph: [...ph], maxY });
// the mug of hot chocolate
went = await send('dust'); await view(1.5, 0.5, 1.1); shot = false;
ph = await watch('dust', async st => { if (st.ph === 'bathe' && !shot) { shot = true; await run(1.5); await shoot('4_mug'); } });
ok('a hen bathes in the mug of hot chocolate', went && ph.has('bathe') && ph.has('shake'), { went, ph: [...ph] });
await run(10); s = await S();
ok('footprints in its snow', s.w.prints > 3, s.w);
// the Reds' coop still gets the Snow Chalet with its igloo
await p.evaluate(() => { window.__ci = 0; const g = window.__farm.game(); g.data.coins = 20000; g.save(); });
c = await cardOf(0);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gtheme-r button').click()); await run(0.8); s = await S();
ok('the Reds\' coop: the Snow Chalet, with its igloo and puddle, a seed ball', s.theme === 'winter' && s.themes.includes('winter_rir') && s.drawn.includes('theme_winter_rir') && s.w && s.w.igloo && s.w.ice && !s.w.spin && s.w.treat === 'seedball', { theme: s.theme, w: s.w, c });
await close();
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
await p.evaluate(() => { window.__ci = 1; }); s = await S();
ok('a reload: both kept, not flagged', s.theme === 'winter' && s.tier === 4 && s.themes.length === 2 && !s.edited && s.drawn.includes('theme_winter_orp') && s.drawn.includes('theme_winter_rir') && s.w.spin && s.w.bounce, s);
await view(0.1, 1.2, 2.7); await shoot('5_reload');
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

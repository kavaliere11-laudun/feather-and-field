// The last four winter buildings and their gardens (14 Nov 2026; Audrey: "carry on with all the other coops"):
// BREED=pol|aya|pea|call ./withserver.sh node wintertest.mjs [OUT]   (LANG=fr; PORT)
// A farm with that breed's coop, in December: its card offers its building (the Snow Globe, the Barrel Sauna, the Winter
// Carousel, the Ice-Fishing Hut); bought: the building drawn, Deluxe while worn, its own winter garden and treat; its own
// play: the Polish roll the snowball till it bursts (and the globe's glass and snow are there), the Ayam Cemani soak in the
// hot spring (steam from pool and chimney), the peahens ride the little carousel (nobody dizzy); the call ducks keep
// their pond, raft and ways, their ball a fishing float. A reload keeps it, not flagged. No page errors.
const BREED = process.env.BREED || 'pol';
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/wintertest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
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
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${BREED}_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[window.__ci || 0]; return { coins: g.data.coins, theme: c.theme || null, themes: g.data.themes || [], tier: c.tier, tier0: c.tier0, w: f.winterOf(c.id), eggs: c.eggs, kind: f.gameUI().kind, edited: g.edited, drawn: [...new Set(f.coopModels())] }; });



const B = { pol: { en: /Snow Globe/, fr: /Boule à neige/, treat: 'mitten', kind: 'roll' }, aya: { en: /Barrel Sauna/, fr: /Sauna tonneau/, treat: 'orange', kind: 'soak' },
  pea: { en: /Winter Carousel/, fr: /Manège d’hiver/, treat: 'bell', kind: 'spin' }, call: { en: /Ice-Fishing Hut/, fr: /Cabane de pêche sur glace/, treat: null, kind: null } }[BREED];
const view = (lx, lz, z, i = 1) => p.evaluate(([lx, lz, z, i]) => { const f = window.__farm, P = f.gamePlots()[i], w = P.frame.localToWorld(new f.THREE.Vector3(lx, 0, lz)); f.lookAt(w.x, w.z, z); f.draw(); }, [lx, lz, z, i]);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30${BREED === 'pea' ? '#big' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(30) + 5; g.data.lvSeen = g.level; for (let i = 0; i < (location.hash === '#big' ? 14 : 4); i++) { g.data.coins = 300000; f.buyLand(); for (let k = 0; k < 120; k++) { window.__T += 33; f.step(1 / 30, 1); f.gameTick(window.__T, false); } } g.data.coins = 60000; g.save(); f.gameUI().close(); });
await run(2); await close();
const placed = await p.evaluate(b => { const f = window.__farm; const r = f.place(b); const s = f.move.state(); return { r, ok: s.ok, grow: s.grow, put: f.move.place() }; }, BREED);
await run(2); await close();
ok('its coop put down where its Deluxe garden will fit', placed.r && placed.ok && placed.put && placed.grow === 4, placed);
await p.evaluate(() => { window.__ci = 1; });
await close(); await p.evaluate(() => window.__farm.coopCard(1)); await run(0.2);
let c = await p.evaluate(() => { const r = document.querySelector('.gsheet:not([hidden]) .gtheme-r'), b = r && r.querySelector('button'); return r ? { text: r.innerText, btn: b ? { t: b.textContent, off: b.disabled, go: b.dataset.themego } : null } : null; });
ok('its card offers its winter building for 15,000 coins', c && (fr ? B.fr : B.en).test(c.text) && c.btn && c.btn.go === 'buy' && !c.btn.off, c);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gtheme-r button').click()); await run(0.8);
let s = await S(); const said = await hintT();
ok('bought: the building drawn, a Deluxe coop while worn', s.themes.join() === 'winter_' + BREED && s.theme === 'winter' && s.tier === 4 && s.drawn.includes('theme_winter_' + BREED) && s.drawn.some(n => /pen_.*#snow/.test(n)) && s.drawn.some(n => /fence_.*#snow/.test(n)), { s, said });
if (BREED === 'call') {
  const d = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1]; return { birds: P.birds.length, call: !!P.callPen, ball: !!(P.callPen && P.callPen.ball), pond: P.callPen ? P.callPen.o && P.callPen.o.pond : null }; });
  ok('the ducks keep their pond and their ball (a fishing float now)', d.call && d.ball && d.pond && d.pond[2] > 1.5, d);
  await run(20);
} else {
  ok('its own winter garden and treat', s.drawn.includes('pen_t4_' + BREED + '_winter#snow') && s.drawn.includes('fence_t4_' + BREED + '_winter#snow') && s.w && s.w.treat === B.treat && !s.w.igloo && !s.w.ice && !s.w.train && !s.w.chute, { drawn: s.drawn, w: s.w });
  const went = await p.evaluate(kind => { const f = window.__farm, P = f.gamePlots()[1]; for (const b of P.birds) if (b.play) f.endPlay(b, true); for (const b of P.birds) { if (b.kind !== 'hen' || b.asleep) continue; b.layIn = 9999; if (f.startPlay(b, kind)) return true; } return false; }, B.kind);
  const ph = new Set(); let maxU = 0, maxW = 0, minY = 1;
  for (let i = 0; i < 420 && went; i++) { await run(0.2); const st = await p.evaluate(kind => { const f = window.__farm, P = f.gamePlots()[1], b = P.birds.find(x => x.play && x.play.kind === kind), w = f.winterOf(P.gc.id); return b ? { ph: b.play.phase, y: b.root.position.y, w } : null; }, B.kind); if (!st) break; ph.add(st.ph); if (st.w.roll) maxU = Math.max(maxU, st.w.roll.u); if (st.w.spin) maxW = Math.max(maxW, st.w.spin.w); minY = Math.min(minY, st.y); }
  s = await S();
  if (BREED === 'pol') ok('a hen rolls the snowball along its run, it grows and bursts, she jumps; the globe has its glass and snow', went && ph.has('push') && ph.has('wow') && ph.has('shake') && maxU > 0.9 && s.w.roll.u === 0 && s.w.globe && !s.w.roll.by, { went, ph: [...ph], maxU, w: s.w });
  if (BREED === 'aya') ok('a hen soaks in the hot spring, low in the water, then out with a shake; steam from the pool and the chimney', went && ph.has('in') && ph.has('soak') && ph.has('out') && ph.has('shake') && minY < 0 && s.w.steam === 2 && !s.w.soak.by, { went, ph: [...ph], minY, w: s.w });
  if (BREED === 'pea') {
    const went2 = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1]; for (const b of P.birds) if (b.play) f.endPlay(b, true); for (const b of P.birds) { if (b.kind !== 'hen' || b.asleep) continue; b.layIn = 9999; if (f.startPlay(b, 'striker')) return true; } return false; });
    const ph2 = new Set(); let maxH = 0, rung = false;
    for (let i = 0; i < 300 && went2; i++) { await run(0.1); const st = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1], b = P.birds.find(x => x.play && x.play.kind === 'striker'), w = f.winterOf(P.gc.id); return b ? { ph: b.play.phase, w } : null; }); if (!st) break; ph2.add(st.ph); maxH = Math.max(maxH, st.w.striker.h); rung = rung || st.w.striker.rung; }
    ok('a peahen jumps on the strength game\'s pad: the puck shoots up, rings the bell, comes back down; she struts', went2 && ph2.has('jump') && ph2.has('watch') && ph2.has('strut') && maxH > 0.9 && rung && (await S()).w.striker.h === 0, { went2, ph: [...ph2], maxH, rung });
    let cock = { ok: false };      // (asked till he's somewhere he can set off from)
    for (let k = 0; k < 40 && !cock.ok; k++) { cock = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1]; for (const b of P.birds) if (b.play) f.endPlay(b, true); const b = P.birds.find(x => x.train); if (!b) return { none: true }; const ok = f.startPlay(b, 'mirror'); return { ok, to: ok && b.flight && b.flight.to, n: [0, 0.4, 0.8, 1.2, 1.6, 2, 2.4, 2.8, 3.2, 3.6, 4, 4.4, 4.8, 5.2, 5.6, 6].map(a => [1.7, 2.4].concat(a)).filter(q => b.fanClear(q[2], q)).length }; }); if (!cock.ok) await run(1.5); }
    let shown = null, last = null; const seen = new Set();
    for (let i = 0; i < 300 && cock.ok; i++) { await run(0.2); const st = await p.evaluate(() => { const P = window.__farm.gamePlots()[1], b = P.birds.find(x => x.train); return { play: !!b.flight, ph: b.flight ? 'fly' : null, clear: b.fanClear(), act: b.act ? b.act.type : null, fan: b.A.fan, x: b.root.position.x, z: b.root.position.z, yaw: b.root.rotation.y, near: Math.hypot(b.root.position.x - 2.55, b.root.position.z - 2.4) }; }); last = st; seen.add((st.play ? st.ph : '-') + '/' + st.act); if (!st.play && st.act === 'display' && st.fan > 0.8) { shown = st; break; } if (!st.play && !seen.has('end')) { seen.add('end'); seen.add('at ' + st.x.toFixed(2) + ',' + st.z.toFixed(2) + ' clear ' + st.clear); } if (!st.play && st.act !== 'display' && i > 100) break; }
    ok('the peacock walks to his ice mirror and fans his train at it', cock.ok && shown && shown.near < 1.5, { cock, shown, last, seen: [...seen] });
    if (shown) { await view(1.6, 2.4, 1.5); await shoot('1b_mirror'); }
  }
  if (BREED === 'pea') ok('a peahen rides the little carousel round, gently, and gets off without being dizzy', went && ph.has('ride') && !ph.has('dizzy') && ph.has('shake') && maxW > 1 && maxW < 2 && s.w.carousel && !s.w.spin.by, { went, ph: [...ph], maxW, w: s.w });
  await run(8); s = await S();
  ok('footprints in its snow', s.w.prints > 2, s.w);
}
await close(); await view(0.1, 1.2, BREED === 'pea' ? 3.3 : 2.7); await shoot('1_garden');
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await close(); await run(1);
await p.evaluate(() => { window.__ci = 1; }); s = await S();
ok('a reload: kept, not flagged', s.theme === 'winter' && s.tier === 4 && !s.edited && s.drawn.includes('theme_winter_' + BREED), s);
await p.evaluate(() => window.__farm.setHour(22.5)); await run(0.5); await view(0.1, 1.2, BREED === 'pea' ? 3.3 : 2.7); await shoot('2_night');
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

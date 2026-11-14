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
const st = () => p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1], b = P.birds.find(x => x.train), q = b.root.position; return { kinds: P.birds.map(x => x.kind + (x.train ? '*' : '')).join(), x: +q.x.toFixed(2), z: +q.z.toFixed(2), yaw: +b.root.rotation.y.toFixed(2), tY: +(b.trainY || 0).toFixed(2), clear: b.trainClear(q.x, q.z, b.trainY, false, b.root.rotation.y), free: b.free(q.x, q.z), room: b.trainRoom(q.x, q.z), play: b.play ? b.play.kind + '/' + b.play.phase + '/' + (b.play.route || []).length : null, act: b.act ? b.act.type : null, fan: +b.A.fan.toFixed(2), asleep: !!b.asleep, roost: !!b.roost }; });
console.log('0', JSON.stringify(await st()));
for (let i = 0; i < 12; i++) { await run(3); console.log('idle', JSON.stringify(await st())); }
for (let k = 0; k < 8; k++) {
  const r = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[1], b = P.birds.find(x => x.train); if (b.play) f.endPlay(b, true); b.act = null; const ok = f.startPlay(b, 'mirror'); return { ok, to: ok && b.play.spot, route: ok && b.play.route }; });
  console.log('start', JSON.stringify(r));
  for (let i = 0; i < 30; i++) { await run(0.5); const s = await st(); console.log(' ', JSON.stringify(s)); if (!s.play && s.act !== 'display' && i > 2) break; if (s.fan > 0.8) { i = 99; k = 99; } }
}
await b.close();

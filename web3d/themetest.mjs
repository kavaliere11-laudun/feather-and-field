// Themed coop buildings (13 Nov 2026, Audrey: "a different design with something extravagant, we could create themes and
// collections … once they bought the design can reuse it later and switch between what they own"; one per breed, no levels,
// 8,000 coins, bought in season, worn any time; the toys take the theme's look): ./withserver.sh node themetest.mjs [OUT]
// In December a Rhode Island Red coop's card offers the Snow Chalet for 8,000 coins; too few coins: not to be tapped. Bought:
// paid, the coop is the chalet at once (its own model drawn, the pen and fence snowed), said. A hen still lays in its nest and
// the birds keep walking (no page errors over a few minutes). "Back to its own coop": the Red Barn again, free; "Move into"
// again: free. A reload: owned, worn, not flagged. Every look of the coop (0 to 4) wears it (pictures). In July it isn't for
// sale but one owned can still be put on. A save changed outside the game (a theme not owned; a made-up one) is put right
// and flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/themetest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
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
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/theme_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; return { coins: g.data.coins, theme: c.theme || null, themes: g.data.themes || [], tier: c.tier, eggs: c.eggs, kind: f.gameUI().kind, edited: g.edited, drawn: [...new Set(f.coopModels())] }; });
const card = async () => { await close(); await p.evaluate(() => window.__farm.coopCard(0)); await run(0.2); return p.evaluate(() => { const r = document.querySelector('.gsheet:not([hidden]) .gtheme-r'), b = r && r.querySelector('button'); return r ? { text: r.innerText, btn: b ? { t: b.textContent, off: b.disabled, go: b.dataset.themego } : null } : null; }); };
const tap = () => p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gtheme-r button').click());
const view = z => p.evaluate(z => { const f = window.__farm, P = f.gamePlots()[0]; f.lookAt(P.gc.x, P.gc.z, z); f.draw(); }, z);
const T = fr ? { name: /Chalet des neiges/, back: /Revenir à son poulailler/, into: /Emménager/, when: /l’hiver/ } : { name: /Snow Chalet/, back: /Back to its own coop/, into: /Move into/, when: /in winter/ };

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.coins = 3000; g.save(); f.gameUI().close(); });
await run(1); await view(2.0);
let c = await card(), s = await S();
ok('December: the coop\'s card offers the Snow Chalet for 8,000 coins; with 3,000: not to be tapped', c && T.name.test(c.text) && c.btn && c.btn.go === 'buy' && c.btn.off && /8[,.\s  ]?000/.test(c.btn.t), c);
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 10000; g.save(); });
c = await card();
ok('with the coins: the button\'s there', c.btn && !c.btn.off, c.btn);
await tap(); await run(0.8); s = await S(); let said = await hintT();
ok('bought: 8,000 paid, owned, the coop is the chalet at once, its pen and fence snowed, said', s.coins === 2000 && s.themes.join() === 'winter_rir' && s.theme === 'winter' && s.drawn.includes('theme_winter_rir') && s.drawn.some(n => /pen_.*#snow/.test(n)) && s.drawn.some(n => /fence.*#snow/.test(n)) && !s.drawn.some(n => /^(box|shed|house|cosy|deluxe)_rir$/.test(n)) && T.name.test(said), { s, said });
await close(); await view(1.9); await shoot('1_chalet');
// life goes on in it: a hen lays in its nest, nobody stuck, no errors
const e0 = s.eggs;
for (let i = 0; i < 10; i++) { await jump(3600e3); await run(8); if ((await S()).eggs > e0) break; }      // (the afternoon's laying comes round)
s = await S();
ok('a hen lays in the chalet\'s nest', s.eggs > e0, { eggs: s.eggs, was: e0 });
await view(1.5); await shoot('2_life');
c = await card();
ok('its card: "Back to its own coop"', c.btn && c.btn.go === 'off' && T.back.test(c.btn.t), c);
await tap(); await run(0.6); s = await S();
ok('…the Red Barn again, nothing paid, still owned', !s.theme && s.coins === 2000 && s.themes.length === 1 && !s.drawn.includes('theme_winter_rir') && !s.drawn.some(n => /#snow/.test(n)), s);
c = await card(); ok('"Move into the Snow Chalet": free', c.btn && c.btn.go === 'on' && T.into.test(c.btn.t), c.btn);
await tap(); await run(0.6); s = await S();
ok('…the chalet again', s.theme === 'winter' && s.coins === 2000 && s.drawn.includes('theme_winter_rir'), s.drawn);
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
s = await S();
ok('a reload: owned, worn, not flagged', s.theme === 'winter' && s.themes.length === 1 && !s.edited && s.drawn.includes('theme_winter_rir'), s);
for (const tier of [0, 1, 2, 3, 4]) {
  await p.evaluate(tier => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; c.tier = tier; g.data.xp = f.xpFor(14); g.data.lvSeen = 14; g.save(); }, tier);
  await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1); await view(tier >= 3 ? 2.5 : 2.0);
  s = await S(); ok('the coop at look ' + tier + ' wears it, its pen snowed', s.tier === tier && s.drawn.includes('theme_winter_rir') && s.drawn.some(n => /#snow/.test(n)), s.drawn);
  await shoot('look' + tier);
}
// out of season
await p.evaluate(() => { window.__T = new Date('2027-07-05T11:30:00+01:00').getTime(); sessionStorage.setItem('__T', window.__T); const g = window.__farm.game(); g.data.themes = []; delete g.data.coops[0].theme; g.data.coins = 50000; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
c = await card();
ok('July, not owned: not for sale, "In the shop in winter"', c && !c.btn && T.when.test(c.text), c);
await p.evaluate(() => { const g = window.__farm.game(); g.data.themes = ['winter_rir']; g.save(); });
c = await card();
ok('July, owned: it can still be moved into', c.btn && c.btn.go === 'on', c);
// a save changed outside the game
await p.evaluate(() => { const g = window.__farm.game(); g.data.themes = ['winter_orp', 'summer_rir', 5]; g.data.coops[0].theme = 'winter'; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(0.5);
s = await S();
ok('themes that don\'t exist dropped, a theme worn without owning it taken off, flagged', s.themes.length === 0 && !s.theme && s.edited === true, s);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

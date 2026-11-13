// Themed coop buildings (13 Nov 2026, Audrey: "a different design with something extravagant, we could create themes and
// collections … once they bought the design can reuse it later and switch between what they own"; one per breed, no levels,
// bought in season, worn any time; "these exclusive coops are available only in deluxe so if you go for this design and you
// pay for it you immediately upgrade. But … if you revert to the regular design, you will need to upgrade up to the deluxe";
// 15,000 coins; "the snow ones can have snow on the floor and they leave foot print in"; "new toys and the chickens need to
// interact with the toys"): ./withserver.sh node themetest.mjs [OUT]
// In December a Rhode Island Red coop's card offers the Snow Chalet for 15,000 coins; too few coins: not to be tapped. No
// room for a Deluxe garden where the coop stands: said, nothing paid; moved somewhere roomier: bought, paid, the coop is the
// chalet at once and a Deluxe coop (its own model drawn, the Deluxe pen and fence snowed, the play things, the frozen puddle),
// said; the card names it and its own coop's look. The birds leave footprints in the snow, which go after a while; a hen
// slides across the puddle. A hen still lays in its nest. "Back to its own coop": the look it had reached again, free, no
// puddle; "Move into" again: free. A reload: owned, worn, Deluxe, not flagged. In July it isn't for sale but one owned can
// still be put on. A save changed outside the game (a theme not owned; a made-up one) is put right (the coop back to its own
// look) and flagged. No page errors.
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
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; return { coins: g.data.coins, theme: c.theme || null, themes: g.data.themes || [], tier: c.tier, tier0: c.tier0, w: f.winterOf(c.id), eggs: c.eggs, kind: f.gameUI().kind, edited: g.edited, drawn: [...new Set(f.coopModels())] }; });
const card = async () => { await close(); await p.evaluate(() => window.__farm.coopCard(0)); await run(0.2); return p.evaluate(() => { const r = document.querySelector('.gsheet:not([hidden]) .gtheme-r'), b = r && r.querySelector('button'); return r ? { text: r.innerText, btn: b ? { t: b.textContent, off: b.disabled, go: b.dataset.themego } : null } : null; }); };
const tap = () => p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gtheme-r button').click());
const view = z => p.evaluate(z => { const f = window.__farm, P = f.gamePlots()[0]; f.lookAt(P.gc.x, P.gc.z, z); f.draw(); }, z);
const T = fr ? { name: /Chalet des neiges/, back: /Revenir à son poulailler/, into: /Emménager/, when: /l’hiver/, own: /Son propre poulailler/ } : { name: /Snow Chalet/, back: /Back to its own coop/, into: /Move into/, when: /in winter/, own: /Its own coop/ };

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.coins = 3000; g.save(); f.gameUI().close(); });
await run(1); await view(2.0);
let c = await card(), s = await S();
const own = s.tier;
ok('December: the coop\'s card offers the Snow Chalet for 15,000 coins; with 3,000: not to be tapped', c && T.name.test(c.text) && c.btn && c.btn.go === 'buy' && c.btn.off && /15[,.\s  ]?000/.test(c.btn.t), c);
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 20000; g.save(); });
c = await card();
ok('with the coins: the button\'s there', c.btn && !c.btn.off, c.btn);
await tap(); await run(0.8); s = await S(); let said = await hintT();
if (!s.theme) {                                // no room for a Deluxe garden here: said; moved somewhere roomier
  ok('no room for a Deluxe garden where it stands: said, nothing paid, nothing owned', (fr ? /déplacez d’abord le poulailler/ : /move the coop somewhere roomier first/).test(said) && s.coins === 20000 && !s.themes.length && s.tier === own, { said, s });
  const spot = await p.evaluate(() => {
    const f = window.__farm, g = f.game(); g.data.xp = Math.max(g.data.xp, 70000); g.data.lvSeen = g.level; if (g.data.land.length < 5) g.data.land = [0, 1, 2, 3, 4]; g.save();
    const c = g.data.coops[0]; let tries = 0; f.gameUI().close();
    for (let r = 0; r < 30; r += 0.5) for (let k = 0; k < Math.max(1, r * 6); k++) { const a = k / Math.max(1, r * 6) * 6.28, x = Math.round((c.x + Math.cos(a) * r) * 4) / 4, z = Math.round((c.z + Math.sin(a) * r) * 4) / 4;
      for (const deg of [90, 0, 180, 270]) { const o = { x, z, deg }; const S = f.coopSpotAt(o, 4); if (!(S && S.ok)) continue;
        if (f.moveCoopTo(0, o)) return o; f.move.cancel(); if (++tries > 40) return null; } }
    return null;
  });
  ok('a roomier spot found, the coop moved there', !!spot, spot);
  await run(1); await close(); await run(0.5);
  c = await card(); await tap(); await run(0.8); s = await S(); said = await hintT();
}
ok('bought: 15,000 paid, owned, the coop is the chalet at once, said', s.coins === 5000 && s.themes.join() === 'winter_rir' && s.theme === 'winter' && s.drawn.includes('theme_winter_rir') && T.name.test(said), { s, said });
ok('…and a Deluxe coop while they live in it (the look it had reached kept aside): the Deluxe pen and fence, snowed', s.tier === 4 && s.tier0 === own && s.w && s.w.tier === 4 && s.drawn.some(n => /pen_.*#snow/.test(n)) && s.drawn.includes('fence_t4#snow') && s.drawn.includes('pen_t4#snow') && !s.drawn.some(n => /^(house|rustic)_rir/.test(n)), { tier: s.tier, tier0: s.tier0, drawn: s.drawn });
ok('its play things, and the frozen puddle in the yard', s.w && s.w.ice && s.w.ice.in && !s.w.ice.by, s.w);
c = await card(); let txt = await sheet();
ok('its card names the chalet, and its own coop\'s look', T.name.test(txt.split('\n').slice(0, 4).join(' ')) && T.own.test(txt), txt.split('\n').slice(0, 4));
await close(); await view(2.6); await shoot('1_chalet');
// footprints in the snow
await run(25); s = await S();
ok('the birds leave footprints in the snow', s.w.prints > 4, s.w);
await view(1.6); await shoot('2_prints');
const before = s.w.prints;
// a hen slides across the puddle
const slid = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[0]; for (const b of P.birds) b.stay = false; for (const b of P.birds) { if (b.kind !== 'hen' || b.play || b.asleep) continue; b.layIn = 9999; if (f.startPlay(b, 'ice')) return true; } return false; });
ok('a hen sets off for the frozen puddle', slid, await S().then(x => x.w));
let phases = new Set(), xs = [];
for (let i = 0; i < 160; i++) { await run(0.25); const st = await p.evaluate(() => { const P = window.__farm.gamePlots()[0], b = P.birds.find(x => x.play && x.play.kind === 'ice'); return b ? { ph: b.play.phase, x: b.root.position.x } : null; }); if (!st) break; phases.add(st.ph); if (st.ph === 'slide') { xs.push(st.x); if (xs.length === 3) await shoot('3_slide'); } }
ok('…she slides right across it, then a shake; the puddle free again after', phases.has('slide') && phases.has('shake') && xs.length > 2 && Math.abs(xs[xs.length - 1] - xs[0]) > 0.5 && !(await S()).w.ice.by, { phases: [...phases], x0: xs[0], x1: xs[xs.length - 1] });
// the footprints go after a while (nobody walking: every bird held still)
await p.evaluate(() => { const P = window.__farm.gamePlots()[0]; for (const b of P.birds) if (b.play) window.__farm.endPlay(b, true); });
// life goes on in it: a hen lays in its nest, nobody stuck, no errors
s = await S(); const e0 = s.eggs;
for (let i = 0; i < 10; i++) { await jump(3600e3); await run(8); if ((await S()).eggs > e0) break; }      // (the afternoon's laying comes round)
s = await S();
ok('a hen lays in the chalet\'s nest', s.eggs > e0, { eggs: s.eggs, was: e0 });
c = await card();
ok('its card: "Back to its own coop"', c.btn && c.btn.go === 'off' && T.back.test(c.btn.t), c);
await tap(); await run(0.6); s = await S();
ok('…its own coop again in the look it had reached, nothing paid, still owned, no snow, no puddle', !s.theme && s.tier === own && s.tier0 === undefined && s.coins === 5000 && s.themes.length === 1 && !s.drawn.includes('theme_winter_rir') && !s.drawn.some(n => /#snow/.test(n)) && !(s.w && s.w.ice), s);
await view(2.2); await shoot('4_own');
c = await card(); ok('"Move into the Snow Chalet": free', c.btn && c.btn.go === 'on' && T.into.test(c.btn.t), c.btn);
await tap(); await run(0.6); s = await S();
ok('…the chalet again, Deluxe again', s.theme === 'winter' && s.tier === 4 && s.tier0 === own && s.coins === 5000 && s.drawn.includes('theme_winter_rir') && s.w.ice, s.drawn);
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
s = await S();
ok('a reload: owned, worn, Deluxe, its own look kept, not flagged', s.theme === 'winter' && s.tier === 4 && s.tier0 === own && s.themes.length === 1 && !s.edited && s.drawn.includes('theme_winter_rir') && s.w && s.w.ice && s.w.ice.in, s);
await run(30); s = await S(); const p1 = s.w.prints;
await view(1.6); await shoot('5_prints');
await p.evaluate(() => { const P = window.__farm.gamePlots()[0]; for (const b of P.birds) if (b.play) window.__farm.endPlay(b, true); window.__kept = P.birds.splice(0); }); await run(60); s = await S();      // (nobody walking there for a minute)
await p.evaluate(() => { const P = window.__farm.gamePlots()[0]; P.birds.push(...window.__kept); }); await run(1);
ok('footprints again after the reload; with nobody walking, the snow closes over them', p1 > 2 && s.w.prints === 0, { p1, now: s.w.prints });
// out of season
await p.evaluate(() => { window.__T = new Date('2027-07-05T11:30:00+01:00').getTime(); sessionStorage.setItem('__T', window.__T); const g = window.__farm.game(); g.data.themes = []; g.wearTheme(g.data.coops[0].id, null); delete g.data.coops[0].theme; delete g.data.coops[0].tier0; g.data.coins = 50000; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
c = await card();
ok('July, not owned: not for sale, "In the shop in winter"', c && !c.btn && T.when.test(c.text), c);
await p.evaluate(() => { const g = window.__farm.game(); g.data.themes = ['winter_rir']; g.save(); });
c = await card();
ok('July, owned: it can still be moved into', c.btn && c.btn.go === 'on', c);
// a save changed outside the game
await p.evaluate(() => { const g = window.__farm.game(); g.data.themes = ['winter_orp', 'summer_rir', 5]; g.data.coops[0].theme = 'winter'; g.data.coops[0].tier0 = g.data.coops[0].tier; g.data.coops[0].tier = 4; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(0.5);
s = await S();
ok('themes that don\'t exist dropped, a theme worn without owning it taken off (the coop back to its own look), flagged', s.themes.length === 0 && !s.theme && s.tier === own && s.edited === true, s);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

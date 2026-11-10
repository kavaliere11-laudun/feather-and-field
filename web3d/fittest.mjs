// A coop let go where it doesn't fit is nudged to where it does; Turn by eighths; a coop tapped at night: its card
// (10 Nov 2026, Audrey: "Seems that there is no way to add a coop in that space of the game that is quite a big one fix
// that"; "I tried to click to know the price to improve the coop but each time it takes me inside the coop as the chickens
// are asleep"; "Cuddle in the morning Audrey is asleep that's confusing"): ./withserver.sh node fittest.mjs  (LANG=fr; PORT)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(180000); ctx.setDefaultNavigationTimeout(180000);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 600))); if (!c) fails++; };
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); };
const go = t => p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}&time=${t}`, { waitUntil: 'domcontentloaded' });
await go('10:00'); await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn'); await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(5) + 5; g.data.lvSeen = 5; g.data.land = [0, 1, 2, 3, 4]; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
// ---- every field that can hold a full-grown pen at all: let go anywhere in it that's refused, it's nudged to a place that fits
const R = await p.evaluate(() => { const f = window.__farm, g = f.game(); f.move.start(0); const d0 = f.move.state().at.deg, out = { tried: 0, refused: 0, settled: 0, turned: 0, far: 0, bad: [] };
  for (let z = -60; z <= 20; z += 2) for (let x = -60; x <= 20; x += 2) { const fl = f.fieldAt(x, z); if (fl !== 1 && fl !== 3) continue; out.tried++; f.move.to(x, z, d0); let s = f.move.state(); if (s.ok) continue; out.refused++;
    const r = f.move.settle(); s = f.move.state(); if (r && s.ok) { out.settled++; if (s.at.deg !== d0) out.turned++; const d = Math.hypot(s.at.x - x, s.at.z - z); if (d > 2.6) out.far++; if (f.fieldAt(s.at.x, s.at.z) < 0) out.bad.push([x, z, s.at]); } }
  f.move.to(-200, -200, d0); const off = f.move.settle(), st = f.move.state(); f.move.cancel(); return { ...out, off, offOk: st.ok }; });
ok('a coop let go on refused ground in fields 2 and 4: more often than not nudged to a place with room to grow, within 2.5 m, sometimes turned by an eighth; never put off the land', R.refused > 5 && R.settled >= R.refused * 0.4 && R.turned > 0 && R.far === 0 && R.bad.length === 0, R);
ok('nowhere near any room (far off the farm): left where it is, still refused', R.off === false && !R.offOk, R);
const T = await p.evaluate(() => { const f = window.__farm; f.move.start(0); const a = f.move.state().at.deg; document.querySelector('.gmove .gmove-b').click(); const b2 = f.move.state().at.deg; f.move.cancel(); return [a, b2]; });
ok('Turn: an eighth of a turn at a time', (T[1] - T[0] + 360) % 360 === 45, T);
// ---- at night: a tap on the coop's house: its card (the price to improve it), Look inside, no cuddle button but a word
await go('23:30'); await load();
await p.evaluate(() => { const f = window.__farm; for (let i = 0; i < 90; i++) f.step(1 / 30, 1); });
const N = await p.evaluate(() => { const f = window.__farm; f.coopCard(0); const u = f.gameUI(), s = document.querySelector('.gsheet:not([hidden])'); return { kind: u.isOpen && u.kind, inside: !!s.querySelector('[data-inside]'), cuddle: !!s.querySelector('.gcuddleall'), up: !!s.querySelector('.gup'), text: s.textContent }; });
ok('at night the coop\'s card: its upgrade and price, "Look inside", no "Cuddle everyone here" but "everyone here is asleep"', N.kind === 'coop' && N.inside && !N.cuddle && N.up && (fr ? /tout le monde dort/ : /everyone here is asleep/).test(N.text), N);
await p.evaluate(() => document.querySelector('[data-inside]').click()); await p.waitForTimeout(300);
ok('"Look inside": inside the coop', await p.evaluate(() => document.body.classList.contains('inside') || !!window.__farm.insideOpen?.()), null);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

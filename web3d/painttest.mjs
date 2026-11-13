// Paint for a coop (13 Nov 2026, Audrey: "Let's add more things" to spend coins on; "Paint and trims for coops"; walls in blue,
// sage green and plum, the roof in slate grey, terracotta, navy and straw yellow; "3,000 walls, 3,000 roof"; "Red Barn first,
// others later"): ./withserver.sh node painttest.mjs [OUT]   (LANG=fr; PORT)
// A Rhode Island Red coop's card has "Paint this coop". Its card: the walls' and the roof's colours, its own first; nothing
// picked: nothing to pay. Blue walls picked: tried on the coop at once (its own painted model drawn), nothing paid; the card
// shut: as it was. Picked again with a slate roof, "Paint it · 6,000 coins": paid, kept, said. A reload: still painted, not
// flagged. The walls back to its own: free. Too few coins: the button says so. Each of the barn's five looks painted (pictures).
// Another breed's coop: no paint button. A save changed outside the game (a colour that doesn't exist; paint on another
// breed's coop) is put right and flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/painttest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-09T09:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const jump = async ms => { await p.evaluate(ms => { window.__T = Math.round(window.__T + ms); sessionStorage.setItem('__T', window.__T); }, ms); await run(1.5); };
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/paint_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const sheet = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden])'); return e ? e.innerText : ''; });
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0], P = f.gamePlots()[0]; return { coins: g.data.coins, paint: c.paint || null, tier: c.tier, kind: f.gameUI().kind, edited: g.edited, drawn: [...new Set(f.coopModels())].filter(n => /_rir/.test(n)) }; });
const pick = c => p.evaluate(c => { const e = [...document.querySelectorAll('.gsheet:not([hidden]) .gpaint-c')].filter(x => x.dataset.colour === c); (c === 'own2' ? document.querySelectorAll('.gsheet:not([hidden]) .gpaint-row')[1].querySelector('[data-colour=own]') : e[0]).click(); }, c);
const goBtn = () => p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden]) [data-paint=go]'); return e ? { t: e.textContent, off: e.disabled } : null; });
const openPaint = async () => { await close(); await p.evaluate(() => window.__farm.coopCard(0)); await run(0.2); const has = await p.evaluate(() => { const e = document.querySelector('.gsheet:not([hidden]) .gpaintbtn'); if (e) e.click(); return !!e; }); await run(0.3); return has; };
const view = z => p.evaluate(z => { const f = window.__farm, P = f.gamePlots()[0]; f.lookAt(P.gc.x, P.gc.z, z); f.draw(); }, z);

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(6) + 5; g.data.lvSeen = 6; g.data.coins = 20000; g.upgradeCoop(g.data.coops[0].id); g.upgradeCoop(g.data.coops[0].id); g.data.coins = 7000; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1); await view(2.2);
let has = await openPaint(), s = await S(), c = await sheet(), bt = await goBtn();
ok('the Red Barn\'s card has "Paint this coop"; its card: walls and roof, nothing picked: nothing to pay', has && s.kind === 'paint' && (fr ? /Murs/ : /Walls/).test(c) && (fr ? /Toit/ : /Roof/).test(c) && bt && bt.off && s.coins === 7000, { kind: s.kind, bt, c: c.slice(0, 160) });
await pick('blue'); await run(0.5); s = await S(); bt = await goBtn();
ok('blue walls picked: tried on the coop at once, nothing paid; "Paint it · 3,000 coins"', s.drawn.some(n => /#blue#/.test(n)) && s.coins === 7000 && !s.paint && bt && !bt.off && /3[,.\s  ]?000/.test(bt.t), { drawn: s.drawn, bt });
await shoot('1_try_blue');
await close(); await run(0.5); s = await S();
ok('the card shut: the coop as it was, nothing paid', !s.drawn.some(n => /#/.test(n)) && s.coins === 7000 && !s.paint, s.drawn);
await openPaint(); await pick('blue'); await pick('slate'); await run(0.3); bt = await goBtn();
ok('blue walls and a slate roof: 6,000 coins', bt && !bt.off && /6[,.\s  ]?000/.test(bt.t), bt);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-paint=go]').click()); await run(0.6);
s = await S(); let said = await hintT();
ok('"Paint it": paid, kept, the card shut, said', s.coins === 1000 && s.paint && s.paint.w === 'blue' && s.paint.r === 'slate' && !s.kind && s.drawn.some(n => /#blue#slate/.test(n)) && /🎨/.test(said), { s, said });
await close(); await view(1.9); await shoot('2_blue_slate');
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1);
s = await S();
ok('a reload: still painted, not flagged', s.paint && s.paint.w === 'blue' && s.paint.r === 'slate' && !s.edited && s.drawn.some(n => /#blue#slate/.test(n)), s);
await openPaint(); await pick('plum'); await run(0.2); bt = await goBtn();
ok('another colour with 1,000 coins: the button says not enough', bt && bt.off && /3[,.\s  ]?000/.test(bt.t), bt);
await pick('own'); await pick('navy'); await pick('slate'); await run(0.2);      // (the walls back to their own, the roof as it is)
await p.evaluate(() => { const r = document.querySelectorAll('.gsheet:not([hidden]) .gpaint-row')[0]; r.querySelector('[data-colour=own]').click(); }); await run(0.2); bt = await goBtn();
ok('the walls back to their own colour: free', bt && !bt.off && (fr ? /gratuit/ : /free/).test(bt.t), bt);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) [data-paint=go]').click()); await run(0.5); s = await S();
ok('…done: the roof still slate, no coins taken', s.coins === 1000 && s.paint && !s.paint.w && s.paint.r === 'slate', s);
// each of the barn's five looks, painted (pictures)
for (const tier of [0, 1, 2, 3, 4]) {
  await p.evaluate(tier => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; c.tier = tier; c.paint = { w: 'sage', r: 'terra' }; g.data.xp = f.xpFor(14); g.data.lvSeen = 14; g.save(); }, tier);
  await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(0.5); await view(tier >= 3 ? 2.3 : 1.8);
  s = await S(); ok('look ' + tier + ' painted sage and terracotta: drawn', s.tier === tier && s.drawn.some(n => /#sage#terra/.test(n)), s.drawn);
  await shoot('look' + tier);
}
// a save changed outside the game
await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; c.paint = { w: 'gold', r: 'navy', x: 1 }; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(0.5);
s = await S();
ok('a colour that doesn\'t exist: dropped (the real one kept), flagged', s.paint && !s.paint.w && s.paint.r === 'navy' && !('x' in s.paint) && s.edited === true, s);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

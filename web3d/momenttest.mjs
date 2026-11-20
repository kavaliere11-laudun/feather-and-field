// Farm moments, the first: a hen out (17 Nov 2026, Audrey's pick "Farm moments"; 20 Nov, "Carry on": "Find her and tap
// her. The farmer carries her home"): ./withserver.sh node momenttest.mjs [OUT]   (LANG=fr; W, H: the screen, e.g. W=874
// H=402; PORT)
// A new farm at level 3, 10:00, with ?moments (the automated checks have none unless asked). As the farm opens, the very
// first moment for sure: one of your hens is out of her pen, somewhere on your own land, away from her coop; "🐔 A hen is
// out!" beside the coins, a word with her name; her name over her when she's on the screen; she potters about her spot.
// Not in her pen meanwhile. A reload: still out, at the same spot. A tap on her: found (+15 + 2 a level coins), the word,
// the pill gone; the farmer hurries over, picks her up, carries her home in his arms and sets her down in her pen
// ("There you are!", "Home you go!"). The save checks: a moment for a bird that isn't there, or off the farm: dropped,
// flagged. Another one out at 20:30: she goes home by herself, said. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/momenttest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-11-20T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 600) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/moment_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00&moments`;
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const S = () => p.evaluate(() => {
  const f = window.__farm, g = f.game(), m = g.moment(), sb = f.moment.bird();
  const inPen = id => f.allBirds.filter(x => x.gid === id && x.plot && x.plot.kind === 'coop').length;
  const L = f.farmLife(), bw = L && L.busyWith && L.busyWith();
  return { level: g.level, coins: g.data.coins, xp: g.data.xp, moment: m ? { ...m } : null, moments: g.data.moments ? { ...g.data.moments } : null, bird: sb, pill: f.moment.pill(), bub: f.moment.bub(),
    inPen: m ? inPen(m.b) : null, field: sb ? f.fieldAt(sb.spot[0], sb.spot[1]) : null, land: g.data.land.slice(), edited: g.edited, job: bw ? bw.kind : null, said: L ? L.said.slice(-6) : [], seq: f.moment.seq(),
    name: m ? g.bird(m.b).name : null, coop: m ? g.bird(m.b).coop : null };
});
const T = fr ? { pill: /Une poule s’est échappée/, hint: /s’est échappée de son enclos\. Trouvez-la/, found: /Vous avez retrouvé .* la ramène chez elle\. \+\d+ pièces/, back: /est rentrée toute seule dans son enclos/ }
  : { pill: /A hen is out!/, hint: /has slipped out of her pen\. Find her on the farm and tap her!/, found: /You found .*! .* carries her home\. \+\d+ coins/, back: /went back to her pen by herself for the night/ };

await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(3) + 5; g.data.lvSeen = 3; g.fishBag().gift = true; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load();
for (let i = 0; i < 12; i++) { await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); }); await run(1); if ((await S()).moment) break; }
let s = await S();
ok('as the farm opens, the very first moment: one of your hens is out', !!s.moment && s.moment.k === 'hen' && !!s.bird && s.moments && s.moments.hen === 0, s);
ok('out on your own land, away from her coop', s.bird && s.land.includes(s.field), { field: s.field, land: s.land });
ok('not in her pen meanwhile', s.inPen === 0, s.inPen);
ok('"🐔 A hen is out!" beside the coins', T.pill.test(s.pill || ''), s.pill);
let h0 = await hintT();
for (let i = 0; i < 6 && !(T.hint.test(h0) && h0.includes(s.name)); i++) { await run(1.5); h0 = await hintT(); }      // (after the words before it)
ok('a word with her name: find her and tap her', T.hint.test(h0) && h0.includes(s.name), h0);
const spot = s.bird.spot, name = s.name;
await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 1.6); f.draw(); }, spot); await run(0.6);
s = await S();
ok('her name over her when she\'s on the screen', (s.bub || '').includes(name), s.bub);
await shoot('1_out');
const a0 = s.bird.at; await run(8); s = await S();
ok('she potters about her spot (a few steps, pecking), never far from it', Math.hypot(s.bird.at[0] - spot[0], s.bird.at[1] - spot[1]) < 1.1, { at: s.bird.at, spot, a0 });
// a reload: still out, at the same spot
await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); }); await run(1);
s = await S();
ok('a reload: still out, at the same spot, not in her pen', s.bird && Math.hypot(s.bird.spot[0] - spot[0], s.bird.spot[1] - spot[1]) < 0.02 && s.inPen === 0 && T.pill.test(s.pill || ''), s);
// found: a tap on her
await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 1.6); f.draw(); }, s.bird.at); await run(0.3);
const c0 = s.coins, L0 = s.level, coop = s.coop, id = s.moment.b;
const sc = await p.evaluate(() => window.__farm.moment.screen());
await p.evaluate(() => window.__farm.pause(false)); await p.touchscreen.tap(sc.x, sc.y); await p.waitForTimeout(400); await p.evaluate(() => window.__farm.pause(true)); await run(0.2);
s = await S(); const h1 = await hintT();
ok('a tap on her: found (+15 + 2 a level coins), the word, the pill gone, counted', !s.moment && s.coins === c0 + 15 + 2 * L0 && T.found.test(h1) && !s.pill && s.moments.hen === 1, { s, h1, c0 });
ok('the farmer is on his way for her', s.job === 'stray' && s.seq, s);
let lifted = 0, home = false, k = 0;
for (; k < 60 && !home; k++) {
  await run(2); s = await S();
  if (s.bird && s.bird.carry > lifted) lifted = s.bird.carry;
  if (lifted >= 1 && k % 3 === 0 && s.bird && s.bird.carry >= 1) { await p.evaluate(at => { const f = window.__farm; f.lookAt(at[0], at[1], 2.2); f.draw(); }, s.bird.at); if (!fs.existsSync(`${OUT}/moment_2_carried${fr ? '_fr' : ''}${side ? '_side' : ''}.png`)) await shoot('2_carried'); }
  home = !s.bird && (await p.evaluate(id => window.__farm.allBirds.filter(x => x.gid === id && x.plot && x.plot.kind === 'coop').length, id)) === 1;
}
ok('he picked her up and carried her in his arms', lifted >= 1, lifted);
ok('home: set down in her pen ("There you are!", "Home you go!")', home && s.said.includes('found') && s.said.includes('homego'), { home, said: s.said, k });
const where = await p.evaluate(id => { const f = window.__farm, b = f.allBirds.find(x => x.gid === id && x.plot && x.plot.kind === 'coop'); return b ? { coop: b.plot.gc.id, free: b.free(b.root.position.x, b.root.position.z) } : null; }, id);
ok('in her own coop\'s yard', where && where.coop === coop && where.free, where);
await run(3); await shoot('3_home');
// the save checks
const edit = async fn => { await p.evaluate(fn); await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); return S(); };
s = await edit(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.moment = { k: 'hen', b: 'b999', at: [1, 2], t: window.__T - 1000 }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
ok('a save changed outside the game (a hen that isn\'t there): dropped, flagged', !s.moment && !s.bird && s.edited, s);
s = await edit(id => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.moment = { k: 'hen', b: id, at: [999, 0], t: window.__T - 1000 }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
ok('…a hen off the farm: dropped, flagged', !s.moment && s.edited, s);
// at 20:30 a hen still out goes home by herself
await p.evaluate(() => { const f = window.__farm; f.setHour(20.2); if (f.gameUI().isOpen) f.gameUI().close(); });
await p.evaluate(id => window.__farm.moment.start(id), id); await run(1); s = await S();
ok('another one out (in the evening)', !!s.moment && !!s.bird, s);
await p.evaluate(() => window.__farm.setHour(20.6)); await run(3); s = await S();
let h2 = await hintT(); for (let i = 0; i < 10 && !T.back.test(h2); i++) { await run(1); h2 = await hintT(); }      // (after the words before it)
const inPen = await p.evaluate(id => window.__farm.allBirds.filter(x => x.gid === id && x.plot && x.plot.kind === 'coop').length, id);
ok('at 20:30, not found: she goes home by herself, said', !s.moment && !s.bird && inPen === 1 && T.back.test(h2), { s, h2, inPen });
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

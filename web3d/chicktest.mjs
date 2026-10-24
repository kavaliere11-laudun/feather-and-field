// The game, release 1 step 4 (chicks): node chicktest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402)
// A fresh farm on a fake clock (24 Oct 2026, 10:00, London), the feeder kept full: no hen broody on the farm's first day;
// some morning at 7:00 one goes broody (the same morning every time: it comes from the hens and the date), walks in and
// sits (the hatching bubble, her card); a reload: she's simply sitting; the next morning her chicks hatch and she
// brings them out (the right number, round her, a chick's card); a reload: they're there round her; two days on, late in
// the morning, they're grown: their coins in, the farmer comes and they follow him out of the gate, gone; she lays again;
// a brood changed outside the game is checked.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-24T10:00:00+01:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30`;
const at = s => new Date(s).getTime();
// jump the clock (the feeder topped up and the eggs collected on the way, as a player would), then the farm's upkeep
const jump = (t, keep = true) => p.evaluate(([t, keep]) => {
  const f = window.__farm, g = f.game(), c = g.data.coops[0];
  while (window.__T + 6 * 3600e3 < t) { window.__T += 6 * 3600e3; g.broodTick(window.__T); for (const e of g.dueLays(window.__T)) g.layEgg(e.hen, e.t, window.__T); if (keep) { g.collect(c.id); if (g.feedLeft(c, window.__T) < 0.6) g.fillFeeder(c.id, window.__T); } }
  window.__T = t; sessionStorage.setItem('__T', t); f.gameTick(t); f.step(0.1, 2); f.draw();
}, [t, keep]);
const sim = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 10; i++) { window.__T += 100; f.step(0.1, 1); if (i % 10 === 0) f.gameTick(window.__T); } sessionStorage.setItem('__T', window.__T); f.gameTick(window.__T); f.draw(); }, secs);
const state = () => p.evaluate(() => {
  const f = window.__farm, g = f.game(), c = g.data.coops[0], P = f.gamePlots()[0], br = c.brood, B = P.bub || {};
  const mum = br && P.birds.find(x => x.gid === br.hen);
  return { coins: g.data.coins, brood: br && { n: br.n, hatched: br.hatched }, mum: mum ? { phase: mum.laying ? mum.laying.phase : null, broody: !!(mum.laying && mum.laying.broody), name: mum.name } : null,
    chicks: f.gameChicks(0), leaving: P.birds.filter(x => x.leaving).length, farmerIn: !!P.farmer, bub: B.brood && !B.brood.hidden ? B.brood.textContent : null,
    hint: document.getElementById('hint').textContent, edited: g.edited };
});
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
};
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// the first day: nobody broody; then each morning at 7 till one is
await jump(at('2026-10-25T06:59:00+01:00'));
let s = await state();
ok('the first day: no hen broody', !s.brood && s.chicks === 0, s);
let day = 25, D = '';
for (; day < 40; day++) {
  D = (n => { const d = new Date(Date.UTC(2026, 9, n)); return d.toISOString().slice(0, 10); })(day);
  const off = day <= 25 ? '+01:00' : '+00:00';                          // (the clocks go back on the 25th)
  await jump(at(D + 'T06:59:00' + off)); await jump(at(D + 'T07:00:20' + off));
  s = await state(); if (s.brood) break;
}
const off = day <= 25 ? '+01:00' : '+00:00', next = n => new Date(at(D + 'T12:00:00' + off) + n * 86400e3).toISOString().slice(0, 10);
await sim(2);
s = await state();
ok('7:00 on the ' + D + ': a hen goes broody (the news, the bubble)', !!s.brood && !s.brood.hatched && s.brood.n >= 2 && s.brood.n <= 4 && /broody|couveuse/.test(s.hint) && /🐣/.test(s.bub || ''), s);
let sat = false;
for (let i = 0; i < 12 && !sat; i++) { await sim(10); s = await state(); sat = s.mum && s.mum.broody && s.mum.phase === 'sit'; }
ok('she walks in and settles on the nest', sat, s.mum);
const card = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; f.openBirdCard(f.gamePlots()[0].birds.find(x => x.gid === c.brood.hen)); return document.querySelector('.gsheet').innerText; });
ok('her card: sitting on her eggs, hatching in about…', /Sitting on \d eggs|Couve \d œufs/.test(card), card.split('\n').filter(l => /egg|œuf/i.test(l)));
await p.evaluate(() => window.__farm.gameUI().close());
// a reload while she sits: she's simply there, sitting
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await state();
ok('a reload while she sits: she is on the nest at once', s.mum && s.mum.broody && s.mum.phase === 'sit' && !s.edited, s.mum);
// the next morning: they hatch and she brings them out
await jump(at(next(1) + 'T07:00:20+00:00'));
s = await state();
ok('the next morning: hatched (the news)', s.brood && s.brood.hatched && /hatched|sont nés/.test(s.hint), s);
let out = false;
for (let i = 0; i < 14 && !out; i++) { await sim(5); s = await state(); out = s.chicks === s.brood.n && !s.mum.phase; }
ok('she comes out with her chicks behind her', out, s);
const near = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[0], c = f.game().data.coops[0], m = P.birds.find(x => x.gid === c.brood.hen); return P.birds.filter(x => x.gameChick).map(x => +x.root.position.distanceTo(m.root.position).toFixed(2)); });
await sim(20);
const near2 = await p.evaluate(() => { const f = window.__farm, P = f.gamePlots()[0], c = f.game().data.coops[0], m = P.birds.find(x => x.gid === c.brood.hen); return P.birds.filter(x => x.gameChick).map(x => +x.root.position.distanceTo(m.root.position).toFixed(2)); });
ok('the chicks keep near their mum', near2.every(d => d < 1.2), { near, near2 });
const ccard = await p.evaluate(() => { const f = window.__farm, ch = f.gamePlots()[0].birds.find(x => x.gameChick); f.chickCard ? f.chickCard(ch) : null; return document.querySelector('.gsheet').innerText; });
ok('a chick\'s card: whose she is, grown in about 2 days, her coins', /chick|poussin/i.test(ccard) && /2 days|2 jours/.test(ccard) && /22/.test(ccard), ccard);
await p.evaluate(() => window.__farm.gameUI().close());
// a reload while they grow: there round her
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await state();
ok('a reload while they grow: the chicks are there', s.chicks === s.brood.n, s);
const n = s.brood.n, coins0 = s.coins;
// grown: their coins in, the farmer comes and they follow him out of the gate
await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; g.collect(c.id); g.fillFeeder(c.id, window.__T); });
const coins1 = (await state()).coins;
await jump(at(next(3) + 'T11:00:20+00:00'), false);
s = await state();
ok('two days on, late morning: grown, their coins in (the news)', !s.brood && s.coins === coins1 + n * 22 && /new farm|nouvelle ferme/.test(s.hint), { n, coins0, ...s });
let gone = false, sawIn = false;
for (let i = 0; i < 30 && !gone; i++) { await sim(5); s = await state(); sawIn = sawIn || s.farmerIn; gone = s.chicks === 0 && s.leaving === 0; }
ok('the farmer comes for them and they follow him out: gone', gone && sawIn, s);
// she lays again
await jump(at(next(4) + 'T19:30:00+00:00'));
const laid = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return c.eggs; });
ok('afterwards she lays again', laid >= 2, laid);
// a brood changed outside the game
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.coops[0].brood = { hen: 'b999', start: 5, n: 9, hatched: true }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const t = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, brood: g.data.coops[0].brood }; });
ok('a brood changed outside the game: dropped, flagged', t.edited && t.brood === null, t);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

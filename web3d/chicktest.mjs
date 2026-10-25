// The game, release 1 step 4 (chicks): node chicktest.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402)
// A fresh farm on a fake clock (24 Oct 2026, 10:00, London), the feeder kept full: no hen broody on the farm's first day;
// some morning at 7:00 one goes broody (the same morning every time: it comes from the hens and the date), walks in and
// sits (the hatching bubble, her card); a reload: she's simply sitting; the next morning her chicks hatch and she
// brings them out (the right number, round her, a chick's card); a reload: they're there round her; a day on they turn
// into young hens and roosters (the news, a young one's card, her card); a reload: still young; the next day, late in the
// morning, they're grown: their coins in, a farewell at the gate (the farmer outside it cheering, the party, out one by
// one and all the way off the farm, him watching them go, the view left alone), gone; the congratulations card (each
// one's rating and coins, the total); "Lovely!": seen, the parents' experience up, not shown again after a reload; she
// lays again; a brood that grew up while away: its card says so; news and a brood changed outside the game are checked.
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
    chicks: f.gameChicks(0), youngs: f.youngs(0), leaving: P.birds.filter(x => x.leaving).length, fw: f.farewell(0), card: f.gameUI().kind, bub: B.brood && !B.brood.hidden ? B.brood.textContent : null,
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
ok('a chick\'s card: whose she is, a young hen or rooster in about 24 hours', /chick|poussin/i.test(ccard) && /24 hours|24 heures/.test(ccard) && /young hen or rooster|jeune poule ou (un )?jeune coq/i.test(ccard), ccard);
await p.evaluate(() => window.__farm.gameUI().close());
// a reload while they grow: there round her
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await state();
ok('a reload while they grow: the chicks are there', s.chicks === s.brood.n, s);
const n = s.brood.n;
// a day on: young hens and roosters
await jump(at(next(2) + 'T07:00:30+00:00'));
s = await state();
ok('a day after hatching: young hens and roosters (the news)', s.youngs.length === n && s.youngs.every(y => y === 'h' || y === 'r') && /turning into young|deviennent de jeunes/.test(s.hint), s);
const ycard = await p.evaluate(() => { const f = window.__farm, y = f.gamePlots()[0].birds.find(x => x.young); f.chickCard(y); return document.querySelector('.gsheet').innerText; });
ok('a young one\'s card: young hen or rooster, whose, off to a new farm in about a day, the rating then', /Young (hen|rooster)|Jeune (poule|coq)/.test(ycard) && /daughter|son|fille|fils/.test(ycard) && /rating|note/.test(ycard) && /(2[0-9]|30) hours|(2[0-9]|30) heures|a day|un jour/.test(ycard), ycard);
const mcard = await p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; f.openBirdCard(f.gamePlots()[0].birds.find(x => x.gid === c.brood.hen)); return document.querySelector('.gsheet').innerText; });
ok('her card: raising young hens and roosters', /young hens and roosters|jeunes poules et coqs/.test(mcard), mcard.split('\n').filter(l => /young|jeune/i.test(l)));
await p.evaluate(() => window.__farm.gameUI().close());
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await state();
ok('a reload: they\'re there, young', s.youngs.length === n && s.youngs.every(y => y !== 'chick') && !s.edited, s);
// grown, late morning the next day: their coins in, a farewell at the gate
await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; g.collect(c.id); g.fillFeeder(c.id, window.__T); });
const before = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0], mum = g.bird(c.brood.hen), dad = g.birdsIn(c.id).find(b => b.sex === 'r'); return { coins: g.data.coins, mumExp: mum.exp, dadExp: dad.exp, mum: mum.id, dad: dad.id }; });
const view0 = await p.evaluate(() => window.__farm.view.target.toArray().join());
await jump(at(next(3) + 'T11:00:20+00:00'), false);
s = await state();
const news = await p.evaluate(() => window.__farm.game().unseenNews());
const nw = news[0] || {};
ok('grown, late morning: their coins in, the news (a rating and coins each), a farewell begins', news.length === 1 && nw.kids.length === n && nw.kids.every(k => k.stars >= 1 && k.stars <= 5 && k.coins >= 17 && k.coins <= 36) && s.coins === before.coins + nw.coins && nw.coins === nw.kids.reduce((a, k) => a + k.coins, 0) && !!s.fw && /off to a new farm|partent pour une nouvelle ferme/.test(s.hint), { s, nw });
let ready = false, party = false;
for (let i = 0; i < 40 && !(s.fw && s.fw.phase === 'exit'); i++) { await sim(2); s = await state(); ready = ready || !!(s.fw && s.fw.ready); party = party || !!(s.fw && s.fw.phase === 'party'); }
const said = await p.evaluate(() => document.querySelectorAll('.gsheet:not([hidden])').length);
ok('the farmer comes to the gate and cheers; the party; then out they go', ready && party && s.fw && s.fw.phase === 'exit' && said === 0, s);
let gone = false;
for (let i = 0; i < 40 && !gone; i++) { await sim(2); s = await state(); gone = s.youngs.length === 0 && s.leaving === 0 && !s.fw; }
const ex = await p.evaluate(() => window.__farm.lastExit(0)), view1 = await p.evaluate(() => window.__farm.view.target.toArray().join());
ok('one by one out of the gate and all the way off the farm (past its edge), the farmer watching them go, then gone', gone && ex && ex.past >= 1.2 && ex.look <= 45, { ex, s });
ok('the view never moved by itself', view1 === view0, { view0, view1 });
await sim(2); await p.waitForTimeout(400);
s = await state();
const cc = await p.evaluate(() => ({ text: document.querySelector('.gsheet').innerText, rows: document.querySelectorAll('.gsheet .gkid').length, stars: [...document.querySelectorAll('.gsheet .gkid .gstars')].map(e => e.querySelectorAll('.on').length) }));
ok('the congratulations card: her babies grown up, each one\'s rating and coins, the total, the parents\' experience', s.card === 'congrats' && /Congratulations|Félicitations/.test(cc.text) && /babies have grown up|petits de .* ont grandi/.test(cc.text) && cc.rows === n && cc.stars.join() === nw.kids.map(k => k.stars).join() && cc.text.includes('+' + nw.coins) && /experience|expérience/.test(cc.text), cc);
await p.tap('.gsheet .gbtn');
const after = await p.evaluate(([m, d]) => { const g = window.__farm.game(); return { unseen: g.unseenNews().length, card: window.__farm.gameUI().kind, mumExp: g.bird(m).exp, dadExp: g.bird(d).exp }; }, [before.mum, before.dad]);
ok('"Lovely!": closed, seen; the mum and the rooster gained experience', after.unseen === 0 && !after.card && after.mumExp === before.mumExp + 60 && after.dadExp === before.dadExp + 30, after);
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.waitForTimeout(1800); await p.evaluate(() => window.__farm.gameTick(window.__T));
ok('a reload: no card again', !(await p.evaluate(() => window.__farm.gameUI().kind)) && !(await state()).edited, await state());
// she lays again
await jump(at(next(4) + 'T19:30:00+00:00'));
const laid = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0]; return c.eggs; });
ok('afterwards she lays again', laid >= 2, laid);
// a brood that grew up while the game was shut: the card when it's opened, saying so
await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0], hen = g.birdsIn(c.id).find(b => b.sex === 'h'); c.brood = { hen: hen.id, start: window.__T - 80 * 3600e3, n: 2, hatched: true }; c.brood.kids = g.kidsOf(c, c.brood); g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.waitForTimeout(1800); await p.evaluate(() => window.__farm.gameTick(window.__T));
const away = await p.evaluate(() => ({ kind: window.__farm.gameUI().kind, text: document.querySelector('.gsheet').innerText, youngs: window.__farm.youngs(0).length }));
ok('grown while away: the card on opening, "while you were away"', away.kind === 'congrats' && /While you were away|Pendant votre absence/.test(away.text) && away.youngs === 0, away);
await p.evaluate(() => window.__farm.gameUI().close());
// news changed outside the game: checked
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.news = [{ type: 'grown', coop: raw.d.coops[0].id, hen: raw.d.birds.find(b => b.sex === 'h').id, dad: '', kids: [{ sex: 'q', stars: 9, coins: 1e9 }, 1, 2, 3, 4, 5], coins: 5e9, xp: -4, t: 1, seen: false }]; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const tn = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, news: g.data.news }; });
const k0 = tn.news[0] && tn.news[0].kids;
ok('news changed outside the game: kept within bounds, flagged', tn.edited && k0 && k0.length <= 4 && k0.every(k => k.stars <= 5 && k.coins <= 1000 && (k.sex === 'h' || k.sex === 'r')) && tn.news[0].coins <= 4000 && tn.news[0].xp >= 0, tn);
await p.evaluate(() => window.__farm.gameUI().close());
// a brood changed outside the game
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.coops[0].brood = { hen: 'b999', start: 5, n: 9, hatched: true }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
const t = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, brood: g.data.coops[0].brood }; });
ok('a brood changed outside the game: dropped, flagged', t.edited && t.brood === null, t);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

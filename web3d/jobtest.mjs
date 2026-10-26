// The game, release 1 step 9c (daily jobs): node jobtest.mjs   (LANG=fr; W, H: the screen; SHOTS=folder for pictures)
// A fresh farm on a fake clock: the clipboard up top with a dot (today's jobs not looked at); Today's jobs: three, one an
// easy one (eggs or cuddles), each with how far along it is and its reward; the dot gone once looked at. Doing them: eggs
// collected, a cuddle, a feeder filled, a bird entered in a show each count; a job done: a word after what was done, the
// clipboard's number; Collect: the coins and XP, "Done ✓", not twice. A reload keeps it all. Midnight: three new jobs, the
// dot again. A save changed outside (more done than the target, paid before done, another day's jobs, a level the farm
// hasn't had) is checked and flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/jobs_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const dot = () => p.evaluate(() => { const d = document.querySelector('.gjobs .gdot'); return d.hidden ? null : d.textContent || 'dot'; });
const jobs = () => p.evaluate(() => { const g = window.__farm.game(), J = g.jobs(); return { day: J.day, lv: J.lv, list: J.list.map(j => [j.k, j.got, j.n, j.paid]), coins: g.data.coins, xp: g.data.xp }; });
const T = { title: fr ? /Les tâches du jour/ : /Today’s jobs/, reward: fr ? /\+20 pièces · \+4 XP/ : /\+20 coins · \+4 XP/, note: fr ? /De nouvelles tâches chaque jour à minuit/ : /New jobs every day at midnight/,
  done: fr ? /Tâche faite : .+ ! Récupérez la récompense/ : /Job done: .+! Collect your reward/, claim: fr ? /Récupérer/ : /Collect/, paid: fr ? /Fait ✓/ : /Done ✓/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
let d = await dot();
ok('a fresh farm: the clipboard up top with a dot', d === 'dot' && (await p.evaluate(() => !!document.querySelector('.gbar .gjobs'))), d);
await p.tap('.gjobs'); await run(0.3);
let t = await sheet(), J = await jobs();
const KIND = { eggs: 1, cuddle: 1, feed: 1, show: 1 };
ok('Today\'s jobs: three different ones, the first an easy one, each with its progress and reward, the dot gone',
  (await p.evaluate(() => window.__farm.gameUI().kind)) === 'jobs' && T.title.test(t) && J.list.length === 3 && new Set(J.list.map(j => j[0])).size === 3 && ['eggs', 'cuddle'].includes(J.list[0][0]) && J.list.every(j => KIND[j[0]] && j[1] === 0)
  && (t.match(T.reward) || []).length >= 1 && T.note.test(t) && (await p.evaluate(() => document.querySelectorAll('.gjob').length)) === 3 && !(await dot()), { t: t.slice(0, 500), J });
await shot('1_sheet');
await p.evaluate(() => window.__farm.gameUI().close());
// doing them: each kind (whatever today's are, all four counted where they are)
const doJob = async k => p.evaluate(k => {
  const f = window.__farm, g = f.game();
  if (k === 'eggs') { const c = g.data.coops[0]; c.eggs = 12; g.save(); f.collectAt(0); }
  if (k === 'cuddle') { for (const b of g.data.birds) { b.happy = 0; } g.save(); for (const b of g.data.birds.slice(0, 3)) f.gameUI().o.cuddle(b.id); }
  if (k === 'feed') { const c = g.data.coops[0]; c.feed = 0; c.fedAt = window.__T; g.data.coins += 50; g.save(); f.fillFeeder(0); }
  if (k === 'show') { f.showsSheet(); document.querySelector('.gshow .gbtn').click(); }
}, k);
const before = await jobs();
for (const [k] of before.list) { await doJob(k); await run(0.3); }
J = await jobs();
const word = await p.evaluate(() => document.getElementById('hint').textContent);
await run(5);
const word2 = await p.evaluate(() => document.getElementById('hint').textContent);
d = await dot();
ok('doing them: each counted to its target, "Job done!" said after what was done, the clipboard shows 3', J.list.every(j => j[1] === j[2] && !j[3]) && (T.done.test(word) || T.done.test(word2)) && d === '3', { J, word, word2, d });
await p.evaluate(() => window.__farm.gameUI().close());
await p.tap('.gjobs'); await run(0.3);
await shot('2_done');
const c0 = await jobs();
await p.evaluate(() => document.querySelector('.gjob .gbtn').click()); await run(0.3);
J = await jobs(); t = await sheet();
ok('Collect: the coins and XP in (+20 and +4 at level 1), "Done ✓", the number down to 2', J.coins === c0.coins + 20 && J.xp === c0.xp + 4 && J.list[0][3] && T.paid.test(t) && (await dot()) === '2', { J, c0 });
const twice = await p.evaluate(() => window.__farm.game().claimJob(0));
ok('not twice', twice === null && (await jobs()).coins === J.coins);
await shot('3_paid');
await p.evaluate(() => window.__farm.gameUI().close());
// a reload keeps it
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const kept = await jobs(), ed = await p.evaluate(() => window.__farm.game().edited);
ok('a reload: the jobs as they were, not flagged', JSON.stringify(kept.list) === JSON.stringify(J.list) && !ed, { kept, ed });
// midnight: new jobs
await p.evaluate(() => { const d = new Date(window.__T); window.__T = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 5).getTime(); sessionStorage.setItem('__T', window.__T); }); await run(1.2);
const nj = await jobs();
ok('midnight: three new jobs for the new day, the dot again', nj.day !== J.day && nj.list.every(j => j[1] === 0 && !j[3]) && (await dot()) === 'dot', { nj, d: await dot() });
// a save changed outside
for (const [what, edit] of [['more done than the target', 'd.jobs.list[1].got = 99'], ['paid before done', 'd.jobs.list[2].got = 0; d.jobs.list[2].paid = true'], ['tomorrow\'s jobs', 'd.jobs.day = "29991231"'], ['a level the farm hasn\'t had', 'd.jobs.lv = 25']]) {
  await p.evaluate(e => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d; eval(e); localStorage.setItem('ff3d.farm', JSON.stringify(raw)); }, edit);
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
  const r = await p.evaluate(() => { const g = window.__farm.game(); return { edited: g.edited, list: g.jobs().list.map(j => [j.k, j.got, j.n, j.paid]), day: g.jobs().day, lv: g.jobs().lv }; });
  ok('a save changed outside (' + what + '): checked and flagged', r.edited && r.list.every(j => j[1] <= j[2] && (!j[3] || j[1] >= j[2])) && r.day <= nj.day && r.lv <= 1, r);
  await p.evaluate(() => { const g = window.__farm.game(); g.edited = false; g.save(); });
}
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

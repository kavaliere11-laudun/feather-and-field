// The store app's reminders (notify.js), with a stand-in for the phone's notifications (window.__fakeNotes) and the app's
// flag (window.__ffApp): node notetest.mjs OUT   (LANG=fr; the page served on PORT)
// - a new farm, the first day's guide done: the card "Reminders?" once; Yes: the phone asked, the plan put on the phone
// - the plan: never between 21:00 and 8:00, two a day at most, nothing within 5 minutes, ids unique; the wheat sown: a
//   note when it's ripe (or 8:00 if that's at night); a show entered: the results at 8:00 the morning after; the farm
//   missing you at 18:00 three days on; the texts in the game's language
// - Settings: Reminders Off: everything taken off the phone; On again: asked, put back; the phone saying no: Off, and why
// - not the app (no flag): no card, no row in Settings, nothing on any phone
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/notetest'; fs.mkdirSync(OUT, { recursive: true });
const LANG = process.env.LANG_GAME || process.env.LANG2 || (process.env.LANG && /^(en|fr|de|es|it|pt)$/.test(process.env.LANG) ? process.env.LANG : 'en');
const PORT = process.env.PORT || 8770;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' · ' + JSON.stringify(x) : '')); if (!c) fails++; };
const FAKE = () => {
  window.__ffApp = true;
  const F = window.__fakeNotes = { perm: 'prompt', answer: 'granted', pending: [], asked: 0, log: [],
    async checkPermissions() { return { display: F.perm }; },
    async requestPermissions() { F.asked++; if (F.perm === 'prompt') F.perm = F.answer; return { display: F.perm }; },
    async getPending() { return { notifications: F.pending.map(n => ({ id: n.id, title: n.title, body: n.body })) }; },
    async cancel({ notifications }) { const ids = notifications.map(n => n.id); F.pending = F.pending.filter(n => !ids.includes(n.id)); F.log.push(['cancel', ids.length]); },
    async schedule({ notifications }) { for (const n of notifications) { F.pending = F.pending.filter(p => p.id !== n.id); F.pending.push({ id: n.id, title: n.title, body: n.body, at: new Date(n.schedule.at).getTime() }); } F.log.push(['schedule', notifications.length]); },
  };
};
async function newFarm(p, lang) {
  await p.goto(`http://localhost:${PORT}/play.html?time=11:00`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 180000 });
  if (lang !== 'en') await p.evaluate(l => { const s = document.querySelector('.gsheet .gselect'); if (s) { s.value = l; s.dispatchEvent(new Event('change')); } }, lang);
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await p.waitForFunction(() => window.__farm && window.__farm.game && window.__farm.game().data && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.waitForTimeout(1500);
}
const until = async (p, fn, arg, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { try { if (await p.evaluate(fn, arg)) return true; } catch (e) { /* */ } await p.waitForTimeout(250); } return false; };
const shot = async (p, name) => { await p.evaluate(() => document.getAnimations().forEach(a => a.finish())); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/${name}.png` }); };

// ---- the app
{
  const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, locale: LANG === 'fr' ? 'fr-FR' : 'en-GB' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(FAKE);
  await newFarm(p, LANG);
  ok(await p.evaluate(() => !document.querySelector('.gnotes-yes')), 'a new farm: not asked yet (the guide first)');
  await p.evaluate(() => { const G = window.__farm.game(); G.guideSkip(); window.__farm.gameUI().close(); });
  ok(await until(p, () => !!document.querySelector('.gnotes-yes'), null, 30000), 'the first day\'s guide done: "Reminders?" asked');
  const card = await p.evaluate(() => document.querySelector('.gsheet').innerText);
  ok(LANG === 'fr' ? /rappels/i.test(card) && /Jamais la nuit/.test(card) : /Reminders/.test(card) && /Never at night/.test(card), 'its words in the game\'s language', card.split('\n').slice(0, 2));
  await shot(p, `${LANG}_ask`);
  // the wheat sown, a show entered: their notes
  const entered = await p.evaluate(() => { const G = window.__farm.game(), now = Date.now(); G.sowWheat(now); G.data.xp += 1500; G.data.coins += 500; G.save(); const S = G.openShows(now).find(s => !s.locked); const bird = S && G.data.birds.find(x => G.canEnter(x, S) === 'ok'); const r = S && bird ? G.enterShow(S.id, bird.id, now) : null; return { lv: G.level, S: S && S.id, why: S && G.data.birds.map(x => G.canEnter(x, S)), in: G.shows().in.length, r: !!r }; });
  ok(entered.in === 1, 'a show entered (for its note)', entered);
  await p.evaluate(() => document.querySelector('.gnotes-yes').click());
  ok(await until(p, () => window.__fakeNotes.asked === 1 && localStorage.getItem('ff3d.notes') === 'on'), 'Yes: the phone asked once, reminders on');
  ok(await until(p, () => window.__fakeNotes.pending.length > 0, null, 15000), 'the plan put on the phone', await p.evaluate(() => window.__fakeNotes.pending.length));
  const P = await p.evaluate(() => { const now = Date.now(); return { now, list: window.__fakeNotes.pending.slice(), plan: window.__farm.notes().planNow(now), wheat: window.__farm.game().wheat().ripe, show: (window.__farm.game().shows().in[0] || {}).id, judged: window.__farm.game().shows().in[0] ? window.__farm.game().showJudgedAt(window.__farm.game().shows().in[0].id) : 0 }; });
  const hours = P.list.map(n => new Date(n.at).getHours() + new Date(n.at).getMinutes() / 60);
  ok(hours.every(h => h >= 8 && h < 21), 'never at night (8:00 to 21:00)', P.list.map(n => [n.title, new Date(n.at).toString().slice(0, 21)]));
  const per = {}; for (const n of P.list) { const k = new Date(n.at).toDateString(); per[k] = (per[k] || 0) + 1; }
  ok(Object.values(per).every(c => c <= 2), 'two a day at most', per);
  ok(P.list.every(n => n.at >= P.now + 4.5 * 60e3), 'nothing within 5 minutes');
  ok(new Set(P.list.map(n => n.id)).size === P.list.length, 'ids unique');
  const q = t => { const d = new Date(t), h = d.getHours(); if (h >= 21) { const x = new Date(t + 86400e3); x.setHours(8, 0, 0, 0); return x.getTime(); } if (h < 8) { d.setHours(8, 0, 0, 0); return d.getTime(); } return t; };
  const has = (kind, at) => P.plan.some(n => n.kind === kind && n.at >= at - 1000 && n.at <= at + 6 * 60e3);      // (two due together: a couple of minutes apart)
  ok(has('wheat', q(P.wheat)), 'the wheat: when it\'s ripe (or 8:00)', new Date(q(P.wheat)).toString().slice(0, 21));
  if (P.show) ok(has('show', q(P.judged)), 'the show: its results at 8:00 the morning after', new Date(q(P.judged)).toString().slice(0, 21));
  const miss = new Date(P.now + 3 * 86400e3); miss.setHours(18, 0, 0, 0);
  ok(has('miss', miss.getTime()), 'the farm missing you: 18:00 three days on', P.plan.filter(n => n.kind === 'miss').map(n => n.body));
  const texts = P.list.map(n => n.title + ' ' + n.body).join(' | ');
  ok(LANG === 'fr' ? /blé|concours|manquez|œufs/.test(texts) && !/wheat|miss you|eggs are/.test(texts) : /wheat|show|miss|eggs/i.test(texts), 'the notes in the game\'s language', texts.slice(0, 300));
  // the plan at other times: at 20:50 nothing before 8:00; a farm run on ahead lays eggs
  const late = await p.evaluate(() => { const d = new Date(); d.setHours(20, 50, 0, 0); const now = d.getTime(); return window.__farm.notes().planNow(now).map(n => ({ k: n.kind, h: new Date(n.at).getHours(), at: n.at - now })); });
  ok(late.every(n => n.h >= 8 && n.h < 21), 'planned at 20:50: nothing at night', late);
  const eggsNote = P.plan.filter(n => n.kind === 'eggs').map(n => [n.body, new Date(n.at).toString().slice(0, 21)]);
  ok(eggsNote.length >= 1 && eggsNote.length <= 2, 'the eggs waiting (one or two days): from the hens\' own laying', eggsNote);
  // a hen sitting (her chicks due in 3 hours): their note, by her name
  const hatch = await p.evaluate(() => { const G = window.__farm.game(), now = Date.now(), c = G.data.coops[0], hen = G.birdsIn(c.id).find(x => x.sex === 'h');
    const save = c.brood; c.brood = { hen: hen.id, start: now - 21 * 3600e3, n: 3, hatched: false };
    const L = window.__farm.notes().planNow(now).filter(n => n.kind === 'hatch'); c.brood = save; return { now, name: hen.name, L: L.map(n => [n.body, n.at]) }; });
  const hq = q(hatch.now + 3 * 3600e3);
  ok(hatch.L.length === 1 && hatch.L[0][0].includes(hatch.name) && hatch.L[0][1] >= hq - 1000 && hatch.L[0][1] <= hq + 22 * 60e3, 'a hen sitting: "chicks have hatched" when they do, with her name', hatch);
  // Settings
  await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !!document.querySelector('.gnotes .gchip.on[data-on="1"]')), 'Settings: Reminders On');
  await shot(p, `${LANG}_settings`);
  await p.evaluate(() => document.querySelector('.gnotes .gchip[data-on="0"]').click());
  ok(await until(p, () => window.__fakeNotes.pending.length === 0 && localStorage.getItem('ff3d.notes') === 'off'), 'Off: everything taken off the phone');
  await p.evaluate(() => document.querySelector('.gnotes .gchip[data-on="1"]').click());
  ok(await until(p, () => window.__fakeNotes.pending.length > 0 && localStorage.getItem('ff3d.notes') === 'on'), 'On again: back on the phone');
  // which ones (Audrey: "for example eggs only"; the "miss you" with any of them): all four at first
  ok(await p.evaluate(() => document.querySelectorAll('.gnotes-kind.on').length === 4 && !document.querySelector('.gnotes-kinds').hidden), 'Settings: the four kinds, all chosen');
  const kinds = async () => p.evaluate(() => [...new Set(window.__fakeNotes.pending.map(n => n.title))]);
  const tap = async ks => { for (const k of ks) { await p.evaluate(k => document.querySelector(`.gnotes-kind[data-k="${k}"]`).click(), k); await p.waitForTimeout(200); } };
  await tap(['chicks', 'crops', 'shows']);       // eggs only
  ok(await until(p, () => localStorage.getItem('ff3d.notesKinds') === 'eggs'), 'eggs only: kept');
  const eggsOnly = await p.evaluate(() => window.__farm.notes().planNow(Date.now()).map(n => n.kind));
  ok(eggsOnly.length && eggsOnly.every(k => k === 'eggs' || k === 'miss') && eggsOnly.includes('miss'), 'eggs only: just the eggs, and the "miss you"', eggsOnly);
  await until(p, () => window.__fakeNotes.pending.every(n => /🥚|miss|manqu/i.test(n.title + n.body)), null, 8000);
  ok((await kinds()).every(t => /🥚|misses|pense/.test(t)), 'eggs only: on the phone too', await kinds());
  await shot(p, `${LANG}_kinds`);
  await tap(['crops', 'eggs']);                  // wheat and honey only (crops on first: eggs alone off would leave none)
  const crops = await p.evaluate(() => window.__farm.notes().planNow(Date.now()).map(n => n.kind));
  ok(crops.every(k => k === 'wheat' || k === 'honey' || k === 'miss') && crops.includes('wheat'), 'wheat and honey only', crops);
  await tap(['crops']);                          // none left: off, nothing on the phone, not even the "miss you"
  ok(await until(p, () => localStorage.getItem('ff3d.notes') === 'off' && window.__fakeNotes.pending.length === 0 && !!document.querySelector('.gnotes .gchip.on[data-on="0"]') && document.querySelector('.gnotes-kinds').hidden), 'none left: Off, nothing on the phone (not even the "miss you")');
  await p.evaluate(() => document.querySelector('.gnotes .gchip[data-on="1"]').click());
  ok(await until(p, () => localStorage.getItem('ff3d.notes') === 'on' && document.querySelectorAll('.gnotes-kind.on').length === 4 && window.__fakeNotes.pending.length > 0), 'On again: all four');
  await p.evaluate(() => localStorage.setItem('ff3d.notesKinds', 'eggs,<script>,eggs,shows'));
  ok(await p.evaluate(() => JSON.stringify(window.__farm.notes().kinds()) === '["eggs","shows"]'), 'a choice changed outside the game: only known kinds, once');
  await p.evaluate(() => localStorage.removeItem('ff3d.notesKinds'));
  // the phone saying no (turned off in its own settings)
  await p.evaluate(() => { window.__fakeNotes.perm = 'denied'; document.querySelector('.gnotes .gchip[data-on="0"]').click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.gnotes .gchip[data-on="1"]').click());
  ok(await until(p, () => !!document.querySelector('.gnotes .gchip.on[data-on="0"]') && /Notifications/.test(document.querySelector('.gnotes-note').textContent)), 'the phone saying no: Off, and where to turn them on', await p.evaluate(() => document.querySelector('.gnotes-note').textContent));
  await shot(p, `${LANG}_denied`);
  // a reload: not asked again
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__farm && window.__farm.game && window.__farm.game().data && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.waitForTimeout(4000);
  ok(await p.evaluate(() => !document.querySelector('.gnotes-yes')), 'after a reload: not asked again');
  ok(!errs.length, 'no page errors', errs.slice(0, 3));
  await ctx.close();
}
// ---- not the app (the website): nothing of it
{
  const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await newFarm(p, 'en');
  await p.evaluate(() => { window.__farm.game().guideSkip(); window.__farm.gameUI().close(); });
  await p.waitForTimeout(5000);
  ok(await p.evaluate(() => !document.querySelector('.gnotes-yes')), 'the website: never asked');
  await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.querySelector('.gnotes')), 'the website: no Reminders in Settings');
  ok(!errs.length, 'website: no page errors', errs.slice(0, 3));
  await ctx.close();
}
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);

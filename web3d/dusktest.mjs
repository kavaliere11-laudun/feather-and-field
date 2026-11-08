// The doors shut from dusk (8 Nov 2026; the play-through's player came at 19:00 and heard "The door stays open in the
// daytime"; Audrey: "Yes" to doors shut from dusk): ./withserver.sh node dusktest.mjs   (LANG=fr; PORT)
// A level-4 farm, its Red Barn Rustic (a door shut by hand). At 15:00 a tap: "The door stays open in the daytime", no
// moon. From 18:00 the moon over the door; at 19:00 a tap, everyone still out: "The door will shut by itself tonight, once
// everyone's in", shut for the night in the save at once (Rusty would find it shut), the door still open for them, no
// moon; tapped again it stays open tonight, again and it's shut for the night. At 21:00 still open (they're out); at
// 23:00, all in, it shuts by itself, saved shut. The app opened again at 21:00 with the door shut for the night: open till
// they're in. The morning: open again at 7:30 as before. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);      // (a running farm's frames are slow in the test browser's software drawing, Storybook's the more)
await ctx.addInitScript(() => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || new Date('2026-11-09T15:00:00Z').getTime()); Date.now = () => window.__T; });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 400))); if (!c) fails++; };
const T = fr ? { day: /reste ouverte la journée/, later: /se fermera toute seule ce soir/, stay: /reste ouverte cette nuit/ } : { day: /stays open in the daytime/, later: /will shut by itself tonight/, stay: /stays open tonight/ };
const URL = t => `http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}` + (t ? '&time=' + t : '');
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); };
await p.goto(URL(), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 }); await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); }, s);
const at = (iso, h) => p.evaluate(([iso, h]) => { window.__T = new Date(iso).getTime(); sessionStorage.setItem('__T', window.__T); window.__farm.setHour(h); }, [iso, h]);
const tap = async () => { await p.evaluate(() => window.__farm.doorTapAt(0)); await run(0.2); return p.evaluate(() => document.getElementById('tag').textContent); };
const door = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; return { ...f.doorOf(0), booked: g.doorBooked(c), shut: g.doorShut(c), saved: c.shut || null }; });
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(4) + 5; g.data.lvSeen = 4; g.fishBag().gift = true; g.save(); });
await run(2); await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
// the afternoon
await at('2026-11-09T15:00:00Z', 15); await run(1);
let t = await tap(), d = await door();
ok('15:00, a tap: "The door stays open in the daytime", no moon', T.day.test(t) && d.goal === 1 && !d.badge && !d.booked, { t, d });
// dusk
await at('2026-11-09T18:10:00Z', 18.15); await run(1);
d = await door();
ok('18:10: the moon over the door', d.badge && d.kind === 'moon', d);
await at('2026-11-09T19:00:00Z', 19); await run(1);
t = await tap(); d = await door();
ok('19:00, everyone still out, a tap: "The door will shut by itself tonight…", shut for the night in the save, the door still open, no moon', T.later.test(t) && d.booked && d.shut && d.saved === '20261109' && d.goal === 1 && !d.badge, { t, d });
t = await tap(); d = await door();
ok('tapped again: "The door stays open tonight", not shut for the night', T.stay.test(t) && !d.booked && d.goal === 1, { t, d });
t = await tap(); d = await door();
ok('and again: shut for the night once more', T.later.test(t) && d.booked, { t, d });
// the evening goes on
await at('2026-11-09T21:00:00Z', 21); await run(3);
d = await door();
ok('21:00: still open, they\'re still out', d.goal === 1 && d.booked, d);
// the app opened again at 21:00, the door shut for the night: open till they're in
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.goto(URL('21:00'), { waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
d = await door();
ok('the app opened again at 21:00: the door open for them, still shut for the night in the save', d.goal === 1 && d.booked, d);
await p.goto(URL(), { waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
// 23:00: all in, it shuts by itself
await at('2026-11-09T23:00:00Z', 23);
let shut = false; for (let k = 0; k < 40 && !shut; k++) { await run(3); shut = (await door()).goal === 0; }
d = await door();
const allIn = await p.evaluate(() => window.__farm.coopPlots()[0].birds.every(b => b.asleep));
ok('23:00: everyone in, the door shuts by itself, saved shut', shut && allIn && d.shut && d.saved === '20261109', { d, allIn });
// the morning: open again at 7:30
await at('2026-11-10T07:40:00Z', 7.67); await run(2);
d = await door();
ok('7:40 the next morning: open again by itself', d.goal === 1 && !d.booked, d);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

// The player's age group (26 Nov 2026, the launch review, Audrey: "Fix all 4, then UK + US"; age.js, FFAgePlugin.swift):
// ./withserver.sh node agetest.mjs [OUT]   (W, H: 874 x 402, sideways; LANG=fr; PORT)
// The pretend account (?account=fake); in the app, Apple's age range and the videos pretended (window.__fakeAge,
// window.__fakeAds, window.__fakeNative).
//  1. The site, nothing known: My account asks the year they were born first (no year picked, OK off until one is), no
//     sign-in buttons yet.
//  2. A year making them under 13: "Saving a farm online is for players aged 13 and over", no buttons; kept as the age
//     group only (no year); a reload doesn't ask again; a new farm's welcome has no "Sign in"; no suggestion a few days in.
//  3. Another phone, an adult's year: Google's button straight away; kept as adult.
//  4. The years on the edge go to the younger side; a changed or made-up age group on the phone is not believed (asked again).
//  5. The app where the law asks for it: Apple's age range at the start. Under 13 from Apple: the line, no buttons, the
//     videos child-directed; someone signed in is signed out (the farm stays). Not shared there: under 13 until Apple
//     shares it; shared at the next start as 18+: the buttons.
//  6. The app where the law doesn't ask: no Apple sheet at the start; Watch on Free coins asks the year first, then the
//     video plays (for an adult: not child-directed). No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import { bandOfYear } from './src/age.js';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/agetest', W = +(process.env.W || 874), H = +(process.env.H || 402), LANG = process.env.LANG || 'en';
fs.mkdirSync(OUT, { recursive: true });
const PORT = process.env.PORT || 8770, sfx = LANG !== 'en' ? '_' + LANG : '';
const URL0 = `http://localhost:${PORT}/play.html?q=0&time=11:00&account=fake` + (LANG !== 'en' ? '&lang=' + LANG : '');
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 300) : '')); if (!cond) fails++; };
const cloud = {}, Y = new Date().getFullYear();
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// app: null (the site) or { law, apple: 'child'|'adult'|'declined' } (sessionStorage keeps the mode over reloads)
async function phone(app) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: LANG === 'fr' ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
  ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
  await ctx.exposeFunction('__fakeCloud', (op, a) => {
    if (op === 'get') return cloud[a.uid] || null;
    if (op === 'put') { const cur = cloud[a.uid]; if ((cur ? cur.n : 0) !== a.base) return { conflict: true }; cloud[a.uid] = { ...a.doc, n: a.base + 1, at: Date.now() }; return { n: a.base + 1, at: cloud[a.uid].at }; }
    if (op === 'del') { delete cloud[a.uid]; return true; }
  });
  if (app) await ctx.addInitScript(app0 => {
    window.__ffApp = true; window.__ageCalls = []; window.__adCalls = []; window.__fakeCreds = [];
    const m = () => { try { return JSON.parse(sessionStorage.getItem('__ageMode') || 'null') || app0; } catch (e) { return app0; } };
    window.__fakeAge = {
      hello: async () => ({ v: 1, api: true }),
      required: async () => { window.__ageCalls.push('required'); return { required: m().law, api: true }; },
      range: async () => { window.__ageCalls.push('range'); const a = m().apple; return a === 'declined' ? { status: 'declined' } : a === 'child' ? { status: 'sharing', upper: 13 } : { status: 'sharing', lower: 18 }; },
    };
    window.__fakeAds = { hello: async () => ({ v: 1, privacy: false }), watch: async o => { window.__adCalls.push(o); await new Promise(r => setTimeout(r, 300)); return { earned: true, privacy: false }; }, choices: async () => ({ shown: false }) };
    window.__fakeNative = { apple: async () => ({ idToken: 'apple-token', name: 'Sam Field', email: '' }), google: async () => ({ idToken: 'google-token' }) };
  }, app);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return p;
}
const farmOpen = p => p.waitForFunction(() => window.__farm && window.__farm.game && document.getElementById('loading') === null, null, { timeout: 180000 });
async function newFarm(p) {
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await farmOpen(p);
  await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); f.gameUI().close(); f.gameUI().refresh(); });
}
async function until(p, fn, arg, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await p.evaluate(fn, arg)) return true; } catch (e) { /* */ } await p.waitForTimeout(200); }
  return false;
}
const T = (p, k, o) => p.evaluate(([k, o]) => window.__farm.game().t(k, o), [k, o]);
const settings = async p => { await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('.gsheet .gacct').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); };
const acct = p => p.evaluate(() => {
  const c = document.querySelector('.gsheet .gacct'); if (!c) return null;
  const q = c.querySelector('.gage'), sel = q && q.querySelector('select'), okb = q && q.querySelector('.gage-ok');
  return { ask: !!q, picked: sel ? sel.value : null, first: sel ? sel.options[0].textContent : null, okOff: okb ? okb.disabled : null, years: sel ? [sel.options[1].value, sel.options[sel.options.length - 1].value] : null,
    ins: [...c.querySelectorAll('.gacct-in')].map(x => x.className.includes('gacct-apple') ? 'apple' : 'google'), kids: (c.querySelector('.gacct-kids') || {}).textContent || null };
});
const answer = (p, y, where = '.gsheet:not([hidden])') => p.evaluate(([y, w]) => { const q = document.querySelector(w + ' .gage'), s = q.querySelector('select'); s.value = String(y); s.dispatchEvent(new Event('change')); q.querySelector('.gage-ok').click(); }, [y, where]);
const stored = p => p.evaluate(() => localStorage.getItem('ff3d.age'));
const shot = async (p, n) => { await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } })); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/${n}${sfx}.png` }); };

// ---- 1-2: the site, a child's year
const A = await phone(null);
await newFarm(A);
await settings(A);
let c = await acct(A);
ok('1: nothing known: the year asked first, none picked, OK off, no sign-in buttons', c && c.ask && c.picked === '' && c.first === await T(A, 'age_year') && c.okOff === true && c.ins.length === 0 && c.years[0] === String(Y) && c.years[1] === String(Y - 100), c);
ok('1: the question in words', (await A.evaluate(() => document.querySelector('.gage-q').textContent)) === await T(A, 'age_q') && (await A.evaluate(() => document.querySelector('.gage-note').textContent)) === await T(A, 'age_note'));
await shot(A, '1_ask');
await answer(A, Y - 11);
c = await acct(A);
ok('2: under 13: the line, no buttons', c && !c.ask && c.ins.length === 0 && c.kids === await T(A, 'acct_kids'), c);
ok('2: kept as the age group only (no year)', (await stored(A)) === '{"b":"child","by":"asked"}', await stored(A));
await shot(A, '2_kids');
await A.reload({ waitUntil: 'domcontentloaded' }); await farmOpen(A); await settings(A);
c = await acct(A);
ok('2: a reload: not asked again, still the line', c && !c.ask && c.kids && c.ins.length === 0, c);
await A.evaluate(() => { const g = window.__farm.game(); g.data.made -= 5 * 86400e3; delete g.data.acctAsk; g.save(); });
ok('2: no suggestion a few days in', (await A.evaluate(() => window.__farm.account().nudge)) === false);
await A.evaluate(() => { localStorage.removeItem('ff3d.farm'); });
await A.reload({ waitUntil: 'domcontentloaded' });
await A.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 }); await A.waitForTimeout(400);
ok('2: a new farm on the same phone: the welcome has no "Sign in", not asked again', await A.evaluate(() => !document.querySelector('.gwelcome-signin') && !document.querySelector('.gage')) && (await stored(A)) === '{"b":"child","by":"asked"}');
ok('2: no page errors', A.errs.length === 0, A.errs);

// ---- 3: another phone, an adult's year
const B = await phone(null);
await newFarm(B); await settings(B);
await answer(B, 1990);
c = await acct(B);
ok('3: an adult: Google\'s button straight away; kept as adult', c && !c.ask && c.ins.join() === 'google' && !c.kids && (await stored(B)) === '{"b":"adult","by":"asked"}', [c, await stored(B)]);
await shot(B, '3_adult');

// ---- 4: the edges, and what's kept on the phone
const at = new Date(Y, 5, 1);
ok('4: the years on the edge go to the younger side', bandOfYear(Y - 13, at) === 'child' && bandOfYear(Y - 14, at) === 'teen' && bandOfYear(Y - 18, at) === 'teen' && bandOfYear(Y - 19, at) === 'adult' && bandOfYear(Y - 5, at) === 'child', [Y - 13, Y - 14, Y - 18, Y - 19].map(y => bandOfYear(y, at)));
for (const bad of ['{"b":"grown","by":"asked"}', '{"b":"adult","by":"me"}', 'adult', '{"b":["adult"],"by":"asked"}']) {
  await B.evaluate(v => localStorage.setItem('ff3d.age', v), bad);
  await B.reload({ waitUntil: 'domcontentloaded' }); await farmOpen(B); await settings(B);
  c = await acct(B);
  ok('4: not believed, asked again: ' + bad, c && c.ask && c.ins.length === 0, c);
}
ok('4: no page errors', B.errs.length === 0, B.errs);

// ---- 5: the app where the law asks for it
const Cp = await phone({ law: true, apple: 'child' });
await newFarm(Cp);
ok('5: Apple\'s age range asked at the start; under 13 kept from Apple', await until(Cp, () => { const a = window.__farm.age(); return a && a.band === 'child' && a.st.by === 'apple'; }) && (await Cp.evaluate(() => window.__ageCalls.join())) === 'required,range', await Cp.evaluate(() => [window.__ageCalls, window.__farm.age()]));
await settings(Cp);
c = await acct(Cp);
ok('5: under 13: the line, no Apple or Google button', c && !c.ask && c.kids && c.ins.length === 0, c);
await Cp.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(4) + 5; g.data.lvSeen = 4; g.save(); f.gameUI().close(); f.deco.shop(); const t = [...document.querySelectorAll('.gsheet:not([hidden]) .gchip')].find(x => x.dataset.tab === 'coins'); if (t) t.click(); });
await Cp.waitForTimeout(300);
await Cp.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gfree .giap-watch').click());
ok('5: the video: no question (Apple said), child-directed', await until(Cp, () => window.__adCalls.length === 1 && !window.__farm.ads().busy) && (await Cp.evaluate(() => window.__adCalls[0].child)) === true, await Cp.evaluate(() => window.__adCalls));
ok('5: no page errors', Cp.errs.length === 0, Cp.errs);

const D = await phone({ law: true, apple: 'adult' });
await newFarm(D);
await until(D, () => window.__farm.age() && window.__farm.age().band === 'adult');
await settings(D);
await D.evaluate(() => document.querySelector('.gacct .gacct-apple').click());
ok('5: an adult signs in with Apple', await until(D, () => window.__farm.account().user));
await D.evaluate(() => sessionStorage.setItem('__ageMode', JSON.stringify({ law: true, apple: 'child' })));
await D.reload({ waitUntil: 'domcontentloaded' }); await farmOpen(D);
ok('5: Apple now says under 13 at the start: signed out, the farm still here', await until(D, () => window.__farm.age().band === 'child' && !window.__farm.account().user) && (await D.evaluate(() => !!window.__farm.game().data && window.__farm.game().data.coins >= 0)), await D.evaluate(() => [window.__farm.age(), !!window.__farm.account().user]));
await D.evaluate(() => sessionStorage.setItem('__ageMode', JSON.stringify({ law: true, apple: 'declined' })));
await D.evaluate(() => localStorage.removeItem('ff3d.age'));
await D.reload({ waitUntil: 'domcontentloaded' }); await farmOpen(D);
ok('5: not shared where the law asks: under 13 until Apple shares it', await until(D, () => { const a = window.__farm.age(); return a && a.band === 'child' && a.st.by === 'law'; }), await D.evaluate(() => window.__farm.age()));
await D.evaluate(() => sessionStorage.setItem('__ageMode', JSON.stringify({ law: true, apple: 'adult' })));
await D.reload({ waitUntil: 'domcontentloaded' }); await farmOpen(D);
ok('5: shared at the next start as 18+: adult, the buttons', await until(D, () => { const a = window.__farm.age(); return a && a.band === 'adult' && a.st.by === 'apple'; }));
await settings(D);
c = await acct(D);
ok('5: …Apple first, then Google', c && c.ins.join() === 'apple,google', c);
ok('5: no page errors', D.errs.length === 0, D.errs);

// ---- 6: the app where the law doesn't ask
const E = await phone({ law: false, apple: 'adult' });
await newFarm(E);
await E.waitForTimeout(800);
ok('6: no Apple sheet at the start, nothing known', (await E.evaluate(() => window.__ageCalls.join())) === 'required' && (await E.evaluate(() => window.__farm.age().band)) === null, await E.evaluate(() => [window.__ageCalls, window.__farm.age()]));
await E.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(4) + 5; g.data.lvSeen = 4; g.save(); f.gameUI().close(); f.deco.shop(); const t = [...document.querySelectorAll('.gsheet:not([hidden]) .gchip')].find(x => x.dataset.tab === 'coins'); if (t) t.click(); });
await E.waitForTimeout(300);
await E.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gfree .giap-watch').click());
await E.waitForTimeout(200);
ok('6: Watch: the year asked first, in the card; no video yet', await E.evaluate(() => !!document.querySelector('.gfree .gage') && window.__adCalls.length === 0));
await shot(E, '6_watch_ask');
await answer(E, 1985, '.gfree');
ok('6: answered (an adult): the video plays, not child-directed', await until(E, () => window.__adCalls.length === 1) && (await E.evaluate(() => window.__adCalls[0].child)) === false, await E.evaluate(() => window.__adCalls));
ok('6: …and its coins', await until(E, () => !window.__farm.ads().busy && window.__farm.game().data.ads && window.__farm.game().data.ads.n === 1));
ok('6: no page errors', E.errs.length === 0, E.errs);

await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);

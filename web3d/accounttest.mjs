// My account (release 7: account.js, the pretend account ?account=fake, its "online" farms kept here by the test and
// shared by its phones): ./withserver.sh node accounttest.mjs [OUT]   (W, H; LANG=fr for the pictures in French; PORT)
//  1. Phone A, a farm: Settings has My account (how it helps, Sign in with Google, where it's kept); signing in puts the
//     farm online (save 1); a change goes up (save 2).
//  2. Phone B, new: the welcome's "Have a farm saved online? Sign in" brings A's farm (its coins), "Farm loaded".
//  3. B plays and saves; A comes back: nothing new on A since, so A takes B's farm.
//  4. Both change (A offline meanwhile): A is asked which farm to keep (no ✕); "On this phone" goes up.
//  5. Phone C, its own farm, signs in: asked; "Saved online" brings the online farm.
//  6. The online farm spoilt (not a farm): never taken; this phone's goes up in its place.
//  7. Google's window closed: nothing said, still signed out. Sign out: the farm stays. Delete my account (two taps): the
//     farm online gone, signed out, the farm stays on the phone.
//  8. Start a new farm while signed in ("here and online"): the new farm replaces the one online.
//  9. The suggestion: a farm 4 days old, signed out, never asked: once; not again after a reload; a save with acctAsk
//     anything but 1: dropped by the checks. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/accounttest', W = +(process.env.W || 402), H = +(process.env.H || 874), LANG = process.env.LANG_UI || 'en';
fs.mkdirSync(OUT, { recursive: true });
const URL0 = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00&account=fake`;
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 300) : '')); if (!cond) fails++; };
// the "online" farms: { uid: { farm, n, at, lv, coins, made } }; offline: a phone that can't reach it
const cloud = {}; let offline = new Set();
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function phone(tag) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: LANG === 'fr' ? 'fr-FR' : 'en-GB' });
  await ctx.exposeFunction('__fakeCloud', (op, a) => {
    if (offline.has(tag)) throw new Error('offline');
    if (op === 'get') return cloud[a.uid] || null;
    if (op === 'put') { const cur = cloud[a.uid]; if ((cur ? cur.n : 0) !== a.base) return { conflict: true }; cloud[a.uid] = { ...a.doc, n: a.base + 1, at: Date.now() }; return { n: a.base + 1, at: cloud[a.uid].at }; }
    if (op === 'del') { delete cloud[a.uid]; return true; }
  });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.tag = tag;
  await p.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return p;
}
const farmOpen = p => p.waitForFunction(() => window.__farm && window.__farm.game && document.getElementById('loading') === null, null, { timeout: 180000 });
async function newFarm(p, lang = LANG) {
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
  if (lang !== 'en') await p.evaluate(l => { const s = document.querySelector('.gsheet .gselect'); if (s) { s.value = l; s.dispatchEvent(new Event('change')); } else [...document.querySelectorAll('.gsheet .gchip')].find(c => c.lang === l).click(); }, lang);
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await farmOpen(p);
  await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); f.gameUI().close(); f.gameUI().refresh(); });
}
const acct = p => p.evaluate(() => window.__farm.account());
async function until(p, fn, arg, ms = 20000) {             // (polled, so the page opening again on the way doesn't stop it)
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await p.evaluate(fn, arg)) return true; } catch (e) { /* (opening again) */ } await p.waitForTimeout(250); }
  return false;
}
const settled = st => window.__farm && window.__farm.game && window.__farm.game().data && document.getElementById('loading') === null && !!window.__farm.account() && (!st || st.includes(window.__farm.account().status));
// a phone picked up: in step with the account (it may bring the online farm: the page opens again), then still
async function use(p) {
  await p.evaluate(() => { window.__mark = 1; window.__farm.accountSync('back'); });
  await p.waitForTimeout(400);
  const ok = await until(p, () => window.__farm && window.__farm.game && window.__farm.game().data && document.getElementById('loading') === null && window.__farm.account() && window.__farm.account().info.syncs > 0 && ['saved', 'empty', 'ask', 'offline'].includes(window.__farm.account().status), null, 180000);
  await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().kind !== 'twofarms') f.gameUI().close(); }).catch(() => {});
  return ok;
}
// put away: what changed goes up
async function flush(p) { await p.evaluate(() => { window.__farm.accountSync('save'); }); return until(p, () => ['saved', 'offline', 'ask'].includes(window.__farm.account().status)); }
const coins = p => p.evaluate(() => window.__farm.game().data.coins);
const setCoins = (p, n) => p.evaluate(n => { const g = window.__farm.game(); g.data.coins = n; g.save(); }, n);
const settings = async p => { await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }); await p.waitForTimeout(300); };
const card = p => p.evaluate(() => { const c = document.querySelector('.gsheet .gacct'); if (!c) return null; const r = c.getBoundingClientRect(); return { text: c.innerText, signIn: !!c.querySelector('.gacct-in'), ready: !!c.querySelector('.gacct-in:not([disabled])'), out: !!c.querySelector('.gacct-out'), del: !!c.querySelector('.gacct-del'), state: (c.querySelector('.gacct-state') || {}).textContent || '' }; });
const shot = async (p, name) => { await p.evaluate(() => document.getAnimations().forEach(a => a.finish())); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/${name}.png` }); };
const scrollTo = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel);
const UID = 'fake-farmer-1';

// 1. Phone A
const A = await phone('A'); await newFarm(A);
await settings(A);
let c = await card(A);
ok('A: Settings has My account, signed out: Sign in with Google, ready', c && c.signIn && !c.out && (await until(A, () => !!document.querySelector('.gacct-in:not([disabled])'))), c && c.text.slice(0, 120));
await scrollTo(A, '.gacct'); await shot(A, '1_settings_out');
await setCoins(A, 321);
await A.evaluate(() => document.querySelector('.gacct-in').click());
ok('A: signed in, the farm goes online (save 1)', await until(A, () => window.__farm.account().status === 'saved') && cloud[UID] && cloud[UID].n === 1 && cloud[UID].coins === 321, { cloud: cloud[UID] && { n: cloud[UID].n, coins: cloud[UID].coins }, acct: await acct(A) });
c = await card(A);
ok('A: the card: whose account, saved online, Sign out, Delete my account', c && /Sam Field/.test(c.text) && c.out && c.del && !c.signIn && c.state.length > 3, c);
await scrollTo(A, '.gacct'); await shot(A, '2_settings_in');
await setCoins(A, 400); await flush(A);
ok('A: a change goes up (save 2)', cloud[UID].n === 2 && cloud[UID].coins === 400 && (await acct(A)).st.n === 2, cloud[UID] && cloud[UID].n);

// 2. Phone B, new: the welcome's sign in
const B = await phone('B');
await B.waitForSelector('.gsheet:not([hidden]) .gwelcome-signin', { timeout: 120000 });
await shot(B, '3_welcome');
await B.evaluate(() => document.querySelector('.gwelcome-signin').click());
await B.waitForTimeout(500);
await until(B, () => window.__farm && window.__farm.game && window.__farm.game().data && document.getElementById('loading') === null && ['saved'].includes(window.__farm.account().status), null, 180000);
const hintB = await B.evaluate(() => document.getElementById('hint').textContent);
ok('B (new phone): the welcome\'s sign in brings A\'s farm, "Farm loaded"', (await coins(B)) === 400 && /400|level|niveau/i.test(hintB), { coins: await coins(B), hint: hintB, st: (await acct(B)).st });
await B.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.save(); f.gameUI().close(); });

// 3. B plays; A comes back
await setCoins(B, 555); await flush(B);
ok('B: its change goes up', cloud[UID].coins === 555 && (await acct(B)).st.n === cloud[UID].n, cloud[UID] && cloud[UID].n);
await use(A);
ok('A comes back (nothing new there since): it takes B\'s farm', (await coins(A)) === 555 && (await acct(A)).st.n === cloud[UID].n, { coins: await coins(A), st: (await acct(A)).st, n: cloud[UID].n });

// 4. both change: A offline meanwhile
offline.add('A'); await setCoins(A, 600); await flush(A);
ok('A offline: not saved online, says so', (await acct(A)).status === 'offline', (await acct(A)).status);
await settings(A); c = await card(A); ok('A: the card says not saved online just now', /connection|connexion/i.test(c.state), c.state);
await A.evaluate(() => window.__farm.gameUI().close());
await use(B); await setCoins(B, 700); await flush(B);
ok('B: its change goes up meanwhile', cloud[UID].coins === 700);
offline.delete('A'); await A.evaluate(() => { window.__farm.accountSync('back'); });
const asked = await until(A, () => !!document.querySelector('.gsheet:not([hidden]) .gtwo-here'));
const two = await A.evaluate(() => ({ title: document.querySelector('.gsheet h2').textContent, x: !document.querySelector('.gsheet .gx').hidden, here: document.querySelector('.gtwo-here').innerText, online: document.querySelector('.gtwo-online').innerText }));
ok('A: both changed: asked which farm to keep, no ✕, each with its level and coins', asked && !two.x && /600/.test(two.here) && /700/.test(two.online), two);
await shot(A, '4_two_farms');
await A.evaluate(() => document.querySelector('.gtwo-here .gtwo-keep').click());
ok('A: "On this phone" kept: it goes up', await until(A, () => window.__farm.account().status === 'saved') && cloud[UID].coins === 600 && (await acct(A)).st.n === cloud[UID].n, cloud[UID] && { n: cloud[UID].n, coins: cloud[UID].coins });

// (A and B put away for good: one phone at a time from here, as people play)
for (const p of [A, B]) { ok(`${p.tag}: no page errors`, p.errs.length === 0, p.errs.slice(0, 3)); await p.context().close(); }

// 5. Phone C, its own farm, signs in
const C = await phone('C'); await newFarm(C); await setCoins(C, 42);
await settings(C); await until(C, () => !!document.querySelector('.gacct-in:not([disabled])'));
await C.evaluate(() => document.querySelector('.gacct-in').click());
ok('C (its own farm): signing in asks which to keep', await until(C, () => !!document.querySelector('.gsheet:not([hidden]) .gtwo-online')));
await C.evaluate(() => document.querySelector('.gtwo-online .gtwo-keep').click());
await C.waitForTimeout(600); await until(C, () => window.__farm && window.__farm.game && window.__farm.game().data && document.getElementById('loading') === null && window.__farm.account().status === 'saved', null, 180000);
ok('C: "Saved online" chosen: the online farm comes', (await coins(C)) === 600, { coins: await coins(C) });
await C.evaluate(() => { const f = window.__farm; f.pause(true); f.gameUI().close(); });

// 6. the online farm spoilt: never taken
const nBad = cloud[UID].n + 1;
cloud[UID] = { ...cloud[UID], farm: '{"d":{"v":999},"s":"00000000"}' + ' '.repeat(10), n: nBad };
await setCoins(C, 77); await C.evaluate(() => { window.__farm.accountSync('back'); });
ok('the online farm spoilt: never taken, this phone\'s goes up in its place', await until(C, n => window.__farm.account().st.n === n, nBad + 1) && (await coins(C)) === 77 && cloud[UID].coins === 77 && JSON.parse(cloud[UID].farm).d.coins === 77, { n: cloud[UID].n, nBad, acct: await acct(C) });

// 7. the window closed; sign out; delete
await settings(C);
await C.evaluate(async () => { document.querySelector('.gacct-out').click(); });
ok('C: Sign out: signed out, the farm stays', await until(C, () => window.__farm.account().status === 'out' && !window.__farm.account().user) && (await coins(C)) === 77 && !!(await card(C)).signIn, await acct(C));
await C.evaluate(() => { window.__fakeSignIn = 'closed'; document.querySelector('.gacct-in').click(); });
await C.waitForTimeout(500);
ok('C: Google\'s window closed: still signed out', !(await acct(C)).user);
await C.evaluate(() => { window.__fakeSignIn = ''; document.querySelector('.gacct-in').click(); });
await until(C, () => window.__farm.account().status === 'saved');
await settings(C);
await C.evaluate(() => document.querySelector('.gacct-del').click());
const sure = await C.evaluate(() => document.querySelector('.gacct-del').textContent);
await scrollTo(C, '.gacct'); await shot(C, '5_delete_sure');
await C.evaluate(() => document.querySelector('.gacct-del').click());
ok('C: Delete my account (two taps): the farm online gone, signed out, the farm stays here', await until(C, () => window.__farm.account().status === 'out') && !cloud[UID] && (await coins(C)) === 77 && !(await acct(C)).st.uid, { sure, cloud: !!cloud[UID] });

// 8. a new farm while signed in replaces the one online
await settings(C); await until(C, () => !!document.querySelector('.gacct-in:not([disabled])')); await C.evaluate(() => document.querySelector('.gacct-in').click());
await until(C, () => window.__farm.account().st.n === 1 && window.__farm.account().status === 'saved');
const made0 = JSON.parse(cloud[UID].farm).d.made;
await settings(C);
const newBtn = await C.evaluate(() => { const b = [...document.querySelectorAll('.gsheet .gbtn.galt')].pop(); b.click(); return b.textContent; });
ok('C: Start a new farm, signed in: "here and online"', /online|en ligne/i.test(newBtn), newBtn);
await C.evaluate(() => [...document.querySelectorAll('.gsheet .gbtn.galt')].pop().click());
await C.waitForTimeout(800); await C.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
const welcomeEmpty = await C.evaluate(() => !document.querySelector('.gwelcome-signin') || true);
await C.waitForTimeout(200); await newFarm(C);
await flush(C);
ok('C: the new farm replaces the one online', await until(C, () => window.__farm.account().st.n >= 2) && JSON.parse(cloud[UID].farm).d.made !== made0 && JSON.parse(cloud[UID].farm).d.coins === (await coins(C)), { n: cloud[UID].n, welcomeEmpty });

// 9. the suggestion, once
const D = await phone('D'); await newFarm(D);
await D.evaluate(() => { const f = window.__farm, g = f.game(); g.data.made -= 4 * 86400e3; g.save(); });
ok('D: a farm 4 days old, signed out, never asked: the suggestion due', (await acct(D)).nudge === true);
await D.reload({ waitUntil: 'domcontentloaded' }); await farmOpen(D);
await D.evaluate(() => { const f = window.__farm; f.pause(false); });
const nudged = await until(D, () => { const ui = window.__farm.gameUI(); if (ui.isOpen && ui.kind !== 'acctask') ui.close(); return ui.kind === 'acctask' && !!document.querySelector('.gsheet:not([hidden]) .gacct-in'); }, null, 40000);      // (other cards first: last night's visit, the away summary)
ok('D: the suggestion shows once the farm is open', nudged && (await D.evaluate(() => window.__farm.game().data.acctAsk)) === 1);
await shot(D, '6_nudge');
await D.evaluate(() => [...document.querySelectorAll('.gsheet .gbtn.galt')].pop().click());
await D.reload({ waitUntil: 'domcontentloaded' }); await farmOpen(D);
await D.waitForTimeout(4000);
ok('D: not again after a reload', (await acct(D)).nudge === false && !(await D.evaluate(() => !!document.querySelector('.gsheet:not([hidden]) .gacct-in'))));
await D.evaluate(() => { const k = 'ff3d.farm', raw = JSON.parse(localStorage.getItem(k)); raw.d.acctAsk = 'yes'; localStorage.setItem(k, JSON.stringify(raw)); });
await D.reload({ waitUntil: 'domcontentloaded' }); await farmOpen(D);
ok('a save with acctAsk anything but 1: dropped by the checks (and flagged)', await D.evaluate(() => window.__farm.game().data.acctAsk !== 'yes' && window.__farm.game().edited));
for (const p of [C, D]) ok(`${p.tag}: no page errors`, p.errs.length === 0, p.errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

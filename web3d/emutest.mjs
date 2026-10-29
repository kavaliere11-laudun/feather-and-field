// My account with the real Firebase code (dist/cloud.js) against Firebase's emulators, the real rules loaded
// (firebase.json, firestore.rules): ./withserver.sh node emutest.mjs [OUT]
//   first: firebase emulators:start --only auth,firestore --project demo-feather-and-field   (auth 9099, firestore 8080)
// The page with ?emu=127.0.0.1 talks only to the emulators; a pretend Google account (window.__emuGoogle) is handed to the
// emulator in place of Google's window (Google's own window is tried on a real phone).
//  1. Phone A: signing in puts the farm online (the document: number 1, the farm, its level and coins, the server's time);
//     a change goes up (number 2); still signed in after the page opens again.
//  2. Phone B, new: the welcome's sign in brings A's farm.
//  3. B plays; A comes back and takes B's farm.
//  4. Delete my account on B: the farm online and the account gone; the farm stays on B. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/emutest', W = 402, H = 874;
fs.mkdirSync(OUT, { recursive: true });
const URL0 = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00&emu=127.0.0.1`;
const FS = 'http://127.0.0.1:8080/v1/projects/demo-feather-and-field/databases/(default)/documents', AUTH = 'http://127.0.0.1:9099/emulator/v1/projects/demo-feather-and-field';
const SAM = { sub: 'sam-field-123', email: 'sam@example.com', email_verified: true, name: 'Sam Field' };
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 300) : '')); if (!cond) fails++; };
// the emulators emptied first
await fetch(`${AUTH}/accounts`, { method: 'DELETE' }); await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-feather-and-field/databases/(default)/documents', { method: 'DELETE' });
const accounts = async () => { const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-feather-and-field/accounts:query', { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: '{}' }); const j = await r.json().catch(() => ({})); return j.userInfo || []; };
const farmDoc = async uid => { const r = await fetch(`${FS}/farms/${uid}`, { headers: { Authorization: 'Bearer owner' } }); if (r.status !== 200) return null; const f = (await r.json()).fields; return { n: +f.n.integerValue, coins: +f.coins.integerValue, lv: +f.lv.integerValue, at: f.at.timestampValue, farm: JSON.parse(f.farm.stringValue) }; };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function phone(tag) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'en-GB' });
  await ctx.addInitScript(u => { window.__emuGoogle = u; }, SAM);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.tag = tag;
  await p.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return p;
}
async function until(p, fn, arg, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await p.evaluate(fn, arg)) return true; } catch (e) { /* (opening again) */ } await p.waitForTimeout(300); }
  return false;
}
const acct = p => p.evaluate(() => window.__farm.account());
const coins = p => p.evaluate(() => window.__farm.game().data.coins);
const setCoins = (p, n) => p.evaluate(n => { const g = window.__farm.game(); g.data.coins = n; g.save(); }, n);
const opened = p => until(p, () => window.__farm && window.__farm.game && window.__farm.game().data && document.getElementById('loading') === null && window.__farm.account() && window.__farm.account().status === 'saved', null, 180000);
const flush = async p => { await p.evaluate(() => { window.__farm.accountSync('save'); }); return until(p, () => window.__farm.account().status === 'saved', null, 30000); };
const still = p => p.evaluate(() => { const f = window.__farm; f.pause(true); f.gameUI().close(); });

// 1. A
const A = await phone('A');
await A.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await A.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await A.waitForFunction(() => window.__farm && window.__farm.game && document.getElementById('loading') === null, null, { timeout: 180000 });
await A.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.coins = 321; g.save(); f.gameUI().settings(); });
ok('A: the online side loads (Firebase, from its own file)', await until(A, () => !!document.querySelector('.gacct-in:not([disabled])')));
await A.evaluate(() => document.querySelector('.gacct-in').click());
ok('A: signed in with Google (the emulator), the farm online', await until(A, () => window.__farm.account().status === 'saved'), await acct(A));
const uid = (await acct(A)).user && (await acct(A)).user.uid;
let d = uid && await farmDoc(uid);
ok('the document: number 1, the farm, its coins and level, the server\'s time', d && d.n === 1 && d.coins === 321 && d.lv >= 1 && d.farm.d.coins === 321 && !!d.at, d && { n: d.n, coins: d.coins, lv: d.lv, at: d.at });
await A.waitForTimeout(2200);                                  // (a save at most every 2 seconds: the rules)
await setCoins(A, 400); await flush(A);
d = await farmDoc(uid);
ok('A: a change goes up (number 2)', d && d.n === 2 && d.coins === 400, d && { n: d.n, coins: d.coins });
await A.screenshot({ path: `${OUT}/1_signed_in.png` });
await A.reload({ waitUntil: 'domcontentloaded' });
ok('A: still signed in when the page opens again', await opened(A) && (await acct(A)).user && (await acct(A)).user.uid === uid, await acct(A));
await still(A);

// 2. B, new
const B = await phone('B');
await B.waitForSelector('.gsheet:not([hidden]) .gwelcome-signin', { timeout: 120000 });
await B.evaluate(() => document.querySelector('.gwelcome-signin').click());
await B.waitForFunction(() => !!document.querySelector('.gwelcome-acct .gacct-in:not([disabled])'), null, { timeout: 30000 });      // (Google's sign-in got ready only now)
await B.evaluate(() => document.querySelector('.gwelcome-acct .gacct-in').click());
await B.waitForTimeout(800);
ok('B (new phone): the welcome\'s sign in brings A\'s farm', await opened(B) && (await coins(B)) === 400, { coins: await coins(B).catch(() => null), acct: await acct(B).catch(() => null) });
await still(B);

// 3. B plays; A comes back
await B.waitForTimeout(2200);
await setCoins(B, 555); await flush(B);
d = await farmDoc(uid);
ok('B: its change goes up', d && d.coins === 555, d && { n: d.n, coins: d.coins });
await A.evaluate(() => { window.__farm.accountSync('back'); });
await A.waitForTimeout(800);
ok('A comes back: it takes B\'s farm', await opened(A) && (await coins(A)) === 555, { coins: await coins(A).catch(() => null) });
await still(A);

// 4. delete on B
await B.evaluate(() => window.__farm.gameUI().settings()); await B.waitForTimeout(300);
await B.evaluate(() => document.querySelector('.gacct-del').click()); await B.evaluate(() => document.querySelector('.gacct-del').click());
ok('B: Delete my account: signed out', await until(B, () => window.__farm.account().status === 'out' && !window.__farm.account().user), await acct(B));
ok('B: the farm online gone, the account gone, the farm still on B', !(await farmDoc(uid)) && !(await accounts()).some(u => u.localId === uid) && (await coins(B)) === 555, { doc: !!(await farmDoc(uid)), users: (await accounts()).length });
for (const p of [A, B]) ok(`${p.tag}: no page errors`, p.errs.length === 0, p.errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

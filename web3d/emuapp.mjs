// My account in the store app with the real Firebase code (dist/cloud.js) against Firebase's emulators (as emutest.mjs:
// first `firebase emulators:start --only auth,firestore --project demo-feather-and-field`): ./withserver.sh node emuapp.mjs
// The game as the app opens it (window.__ffApp), the app's sign-in pretended (window.__fakeNative hands back an
// emulator's token, as FFSignInPlugin.swift hands back Apple's or Google's):
//  1. Sign in with Apple: Firebase signs in with Apple's token and the one-time word (an apple.com account), the name
//     Apple gave kept as the account's name, the farm online.
//  2. Delete my account: Apple asked again, the farm online and the account gone.
//  3. Google through the app: a google.com account, the farm online; deleting asks Google again. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const URL0 = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00&emu=127.0.0.1`;
const FS = 'http://127.0.0.1:8080/v1/projects/demo-feather-and-field/databases/(default)/documents', AUTH = 'http://127.0.0.1:9099/emulator/v1/projects/demo-feather-and-field';
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 300) : '')); if (!cond) fails++; };
await fetch(`${AUTH}/accounts`, { method: 'DELETE' }); await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-feather-and-field/databases/(default)/documents', { method: 'DELETE' });
const accounts = async () => { const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-feather-and-field/accounts:query', { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: '{}' }); const j = await r.json(); return j.userInfo || []; };
const farmDoc = async uid => { const r = await fetch(`${FS}/farms/${uid}`, { headers: { Authorization: 'Bearer owner' } }); return r.status === 200; };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, hasTouch: true, isMobile: true, locale: 'en-GB' });
ctx.setDefaultTimeout(120000);
await ctx.addInitScript(() => {
  window.__ffApp = true; window.__asked = [];
  // (the emulator takes an unsigned token: the account's claims as JSON; Apple's carries the one-time word as Apple's does, hashed)
  const sha = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), x => x.toString(16).padStart(2, '0')).join('');
  window.__fakeNative = {
    apple: async o => { window.__asked.push('apple'); return { idToken: JSON.stringify({ sub: 'apple-sam-001', email: 'x7q2@privaterelay.appleid.com', email_verified: true, nonce: await sha(o.nonce) }), name: 'Sam Field' }; },
    google: async () => { window.__asked.push('google'); return { idToken: JSON.stringify({ sub: 'google-sam-002', email: 'sam@example.com', email_verified: true, name: 'Sam Field' }) }; },
  };
});
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(URL0, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await p.waitForFunction(() => window.__farm && window.__farm.game && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); f.gameUI().close(); });
const until = async (fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await p.evaluate(fn).catch(() => false)) return true; await p.waitForTimeout(250); } return false; };
const settings = async () => { await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }); await until(() => [...document.querySelectorAll('.gacct .gacct-in')].length === 2 && [...document.querySelectorAll('.gacct .gacct-in')].every(x => !x.disabled)); };
const acct = () => p.evaluate(() => window.__farm.account());

await settings();
await p.evaluate(() => document.querySelector('.gacct .gacct-apple').click());
ok('1: signed in with Apple through Firebase, the farm online', await until(() => { const a = window.__farm.account(); return a.user && a.status === 'saved'; }), await acct());
let a = await acct(), us = await accounts();
ok('1: an apple.com account, Apple\'s name kept, the hidden email not shown', a.user.by === 'apple' && us.length === 1 && (us[0].providerUserInfo || []).some(x => x.providerId === 'apple.com') && us[0].displayName === 'Sam Field', us.map(u => [u.displayName, (u.providerUserInfo || []).map(x => x.providerId)]));
await settings();
ok('1: the card: "Apple account: Sam Field"', await p.evaluate(() => document.querySelector('.gacct-who').textContent) === 'Apple account: Sam Field', await p.evaluate(() => document.querySelector('.gacct-who').textContent));
ok('1: the farm document there', await farmDoc(a.user.uid));
const uidA = a.user.uid;
await p.evaluate(() => { document.querySelector('.gacct-del').click(); document.querySelector('.gacct-del').click(); });
ok('2: deleting: Apple asked again, signed out', await until(() => !window.__farm.account().user) && (await p.evaluate(() => window.__asked.join())) === 'apple,apple');
ok('2: the farm online and the account gone', !(await farmDoc(uidA)) && (await accounts()).length === 0);
await settings();
await p.evaluate(() => document.querySelector('.gacct .gacct-google').click());
ok('3: signed in with Google through the app', await until(() => { const a = window.__farm.account(); return a.user && a.status === 'saved'; }), await acct());
a = await acct(); us = await accounts();
ok('3: a google.com account, the farm online', a.user.by === 'google' && us.length === 1 && (us[0].providerUserInfo || []).some(x => x.providerId === 'google.com') && await farmDoc(a.user.uid), us.map(u => (u.providerUserInfo || []).map(x => x.providerId)));
await settings();
await p.evaluate(() => { document.querySelector('.gacct-del').click(); document.querySelector('.gacct-del').click(); });
ok('3: deleting asks Google again; all gone', await until(() => !window.__farm.account().user) && (await p.evaluate(() => window.__asked.join())) === 'apple,apple,google,google' && (await accounts()).length === 0);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

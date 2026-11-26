// My account in the store app (24 Nov 2026: Sign in with Apple and Google, the app's own sign-in, FFSignInPlugin.swift):
// ./withserver.sh node appsignin.mjs [OUT]   (W, H: 874 x 402, sideways; LANG=fr; PORT)
// The game as the app opens it (window.__ffApp), the app's sign-in pretended (window.__fakeNative: what the plugin hands
// back) and the pretend account (?account=fake, its farms kept by the test):
//  1. Settings, signed out: My account says Apple or Google; Sign in with Apple first (black, its logo), then Google's.
//  2. Sign in with Apple: the app asked with a one-time word (64 hex), the token and that word go to the account, the
//     name Apple gave kept; "Apple account: Sam Field"; the farm goes up.
//  3. Delete my account (two taps): Apple asks again (a new word), the farm online gone, signed out.
//  4. Apple's sheet closed: nothing said, still signed out. An Apple account with no name and its hidden email: "Signed
//     in with Apple" (the hidden email never shown). Signed out again.
//  5. Google (the app's): the token to the account; "Google account: Sam Field"; deleting asks Google again.
//  6. The same email made with the other button: says so. The welcome on a new phone and the suggestion a few days in:
//     both buttons. Outside the app (the site): only Google's, as before. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/appsignin', W = +(process.env.W || 874), H = +(process.env.H || 402), LANG = process.env.LANG || 'en';
fs.mkdirSync(OUT, { recursive: true });
const PORT = process.env.PORT || 8770;
const URL0 = `http://localhost:${PORT}/play.html?q=0&time=11:00&account=fake`;
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 300) : '')); if (!cond) fails++; };
const cloud = {};
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function phone(tag, app = true) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: LANG === 'fr' ? 'fr-FR' : 'en-GB' });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('ff3d.age')) localStorage.setItem('ff3d.age', '{"b":"adult","by":"asked"}'); } catch (e) { /* */ } });      // (an adult's age group already given: agetest.mjs tests the question)
  ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
  await ctx.exposeFunction('__fakeCloud', (op, a) => {
    if (op === 'get') return cloud[a.uid] || null;
    if (op === 'put') { const cur = cloud[a.uid]; if ((cur ? cur.n : 0) !== a.base) return { conflict: true }; cloud[a.uid] = { ...a.doc, n: a.base + 1, at: Date.now() }; return { n: a.base + 1, at: cloud[a.uid].at }; }
    if (op === 'del') { delete cloud[a.uid]; return true; }
  });
  if (app) await ctx.addInitScript(() => {
    window.__ffApp = true; window.__fakeCreds = []; window.__asked = [];
    window.__fakeNative = {
      apple: async o => { window.__asked.push(['apple', o && o.nonce]); if (window.__nativeCancel) throw Object.assign(new Error('cancelled'), { code: 'cancelled' }); return { idToken: 'apple-token-' + window.__asked.length, name: window.__nativeName ?? 'Sam Field', email: '' }; },
      google: async () => { window.__asked.push(['google']); if (window.__nativeCancel) throw Object.assign(new Error('cancelled'), { code: 'cancelled' }); return { idToken: 'google-token-' + window.__asked.length }; },
    };
  });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.tag = tag;
  await p.goto(URL0 + (LANG !== 'en' ? '&lang=' + LANG : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
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
const settings = async p => { await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('.gsheet .gacct').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); };
const card = p => p.evaluate(() => {
  const c = document.querySelector('.gsheet .gacct'); if (!c) return null;
  const ins = [...c.querySelectorAll('.gacct-in')], a = c.querySelector('.gacct-apple');
  return { text: c.innerText, ins: ins.map(x => x.className.includes('gacct-apple') ? 'apple' : 'google'), ready: ins.length > 0 && ins.every(x => !x.disabled),
    appleBg: a ? getComputedStyle(a).backgroundColor : '', appleLogo: !!(a && a.querySelector('svg path')), out: !!c.querySelector('.gacct-out'), who: (c.querySelector('.gacct-who') || {}).textContent || '' };
});
const shot = async (p, name) => { await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } })); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/${name}.png` }); };
const T = (p, k, o) => p.evaluate(([k, o]) => window.__farm.game().t(k, o), [k, o]);
const say = p => p.evaluate(() => [...document.querySelectorAll('#hint, .gtoast, .gsay')].map(e => e.textContent).join(' | '));

// 1-3: Apple
const A = await phone('A'); await newFarm(A);
await settings(A);
let c = await card(A);
ok('1: My account signed out in the app: Apple first, then Google', c && c.ins.join() === 'apple,google', c && c.ins);
ok('1: says Apple or Google', c && c.text.includes(await T(A, 'acct_how_app')), c && c.text.slice(0, 140));
ok('1: the buttons get ready', await until(A, () => [...document.querySelectorAll('.gacct .gacct-in')].every(x => !x.disabled)));
c = await card(A);
ok('1: Sign in with Apple: black, with its logo', c.appleBg === 'rgb(0, 0, 0)' && c.appleLogo, c.appleBg);
ok('1: the privacy note names the account you sign in with', c.text.includes(await T(A, 'acct_privacy_app')));
await shot(A, '1_settings_out');
await A.evaluate(() => document.querySelector('.gacct .gacct-apple').click());
ok('2: signed in with Apple', await until(A, () => { const a = window.__farm.account(); return a.user && a.status === 'saved'; }, null, 30000));
let cr = await A.evaluate(() => ({ asked: window.__asked, creds: window.__fakeCreds }));
const cred = cr.creds[0] || {};
ok('2: the app was asked with a one-time word; the token and that word went to the account', cr.asked[0] && cr.asked[0][0] === 'apple' && /^[0-9a-f]{64}$/.test(cr.asked[0][1] || '') && cred.kind === 'apple' && cred.idToken === 'apple-token-1' && cred.rawNonce === cr.asked[0][1] && cred.name === 'Sam Field', cr);
await settings(A); c = await card(A);
ok('2: "Apple account: Sam Field"', c.who === await T(A, 'acct_who_apple', { name: 'Sam Field' }), c.who);
ok('2: the farm went up', Object.keys(cloud).length === 1);
await shot(A, '2_settings_in');
await A.evaluate(() => document.querySelector('.gacct-del').click()); await A.evaluate(() => document.querySelector('.gacct-del').click());
ok('3: deleting: Apple asked again with a new word, the farm online gone, signed out', await until(A, () => !window.__farm.account().user, null, 20000) && Object.keys(cloud).length === 0, null);
cr = await A.evaluate(() => ({ asked: window.__asked, creds: window.__fakeCreds }));
ok('3: …that new word went with it', cr.asked.length === 2 && cr.asked[1][0] === 'apple' && cr.asked[1][1] !== cr.asked[0][1] && cr.creds[1] && cr.creds[1].kind === 'apple' && cr.creds[1].rawNonce === cr.asked[1][1], cr);

// 4: closed, and no name with a hidden email
await settings(A); await until(A, () => [...document.querySelectorAll('.gacct .gacct-in')].every(x => !x.disabled));
await A.evaluate(() => { window.__nativeCancel = true; document.querySelector('.gacct .gacct-apple').click(); });
await A.waitForTimeout(800);
ok('4: Apple\'s sheet closed: nothing said, still signed out', !(await A.evaluate(() => window.__farm.account().user)) && !(await say(A)).includes(await T(A, 'acct_failed')), await say(A));
await A.evaluate(() => { window.__nativeCancel = false; window.__nativeName = ''; window.__fakeAppleName = ''; localStorage.setItem('ff3d.fakeuser', 'null'); });
await A.evaluate(() => { window.__fakeEmail = 'x7q2@privaterelay.appleid.com'; });
await A.evaluate(() => document.querySelector('.gacct .gacct-apple').click());
await until(A, () => !!window.__farm.account().user, null, 20000); await A.waitForTimeout(400);
await settings(A); c = await card(A);
ok('4: no name, hidden email: "Signed in with Apple", the email never shown', c.who === await T(A, 'acct_in_apple') && !c.text.includes('privaterelay'), c.who);
await A.evaluate(() => { window.__fakeEmail = ''; document.querySelector('.gacct-out').click(); }); await until(A, () => !window.__farm.account().user, null, 10000);

// 5: Google, the app's
await settings(A); await until(A, () => [...document.querySelectorAll('.gacct .gacct-in')].every(x => !x.disabled));
await A.evaluate(() => { window.__fakeAppleName = undefined; window.__asked.length = 0; window.__fakeCreds.length = 0; document.querySelector('.gacct .gacct-google').click(); });
ok('5: signed in with Google through the app', await until(A, () => { const a = window.__farm.account(); return a.user && a.status === 'saved'; }, null, 30000));
cr = await A.evaluate(() => ({ asked: window.__asked, creds: window.__fakeCreds }));
ok('5: Google\'s token to the account', cr.asked[0] && cr.asked[0][0] === 'google' && cr.creds[0] && cr.creds[0].kind === 'google' && cr.creds[0].idToken === 'google-token-1', cr);
await settings(A); c = await card(A);
ok('5: "Google account: Sam Field"', c.who === await T(A, 'acct_who', { name: 'Sam Field' }), c.who);
await A.evaluate(() => document.querySelector('.gacct-del').click()); await A.evaluate(() => document.querySelector('.gacct-del').click());
await until(A, () => !window.__farm.account().user, null, 20000);
cr = await A.evaluate(() => ({ asked: window.__asked, creds: window.__fakeCreds }));
ok('5: deleting asks Google again', cr.asked.length === 2 && cr.asked[1][0] === 'google' && cr.creds[1] && cr.creds[1].kind === 'google', cr);

// 6: the other button; the welcome; the suggestion; the site
await settings(A); await until(A, () => [...document.querySelectorAll('.gacct .gacct-in')].every(x => !x.disabled));
await A.evaluate(() => { window.__fakeSignIn = 'other'; document.querySelector('.gacct .gacct-apple').click(); });
ok('6: the same email made with the other button: says so', await until(A, () => document.body.innerText.includes(window.__farm.game().t('acct_other')), null, 5000));
await A.evaluate(() => { window.__fakeSignIn = ''; });
const B = await phone('B');
await B.waitForSelector('.gsheet:not([hidden]) .gwelcome-signin', { timeout: 120000 });
await B.evaluate(() => document.querySelector('.gwelcome-signin').click());
ok('6: the welcome on a new phone: Apple first, then Google', await until(B, () => [...document.querySelectorAll('.gwelcome-acct .gacct-in')].map(x => x.className.includes('gacct-apple') ? 'apple' : 'google').join() === 'apple,google', null, 30000));
await B.evaluate(() => document.querySelector('.gwelcome-acct').scrollIntoView({ block: 'end' })); await B.waitForTimeout(300);
await shot(B, '3_welcome');
await A.evaluate(() => { const f = window.__farm, g = f.game(); g.data.made = Date.now() - 4 * 86400e3; delete g.data.acctAsk; g.save(); f.gameUI().close(); f.gameUI().accountNudge(); });
await A.waitForTimeout(300);
const nud = await A.evaluate(() => { const r = [...document.querySelectorAll('.gsheet:not([hidden]) .gfox-row .gbtn')]; return { btns: r.map(x => x.className.includes('gacct-apple') ? 'apple' : x.className.includes('gacct-google') ? 'google' : 'later'), text: document.querySelector('.gsheet:not([hidden])').innerText, fit: r.every(x => { const b = x.getBoundingClientRect(); return b.right <= innerWidth && b.bottom <= innerHeight + 400 && x.scrollWidth <= x.clientWidth + 1; }) }; });
ok('6: the suggestion: Apple, Google, then Not now', nud.btns.join() === 'apple,google,later' && nud.text.includes(await T(A, 'nudge_how_app')) && nud.fit, nud);
await shot(A, '4_nudge');
const Wb = await phone('W', false); await newFarm(Wb); await settings(Wb); c = await card(Wb);
ok('6: outside the app: only Google\'s, words as before', c && c.ins.join() === 'google' && c.text.includes(await T(Wb, 'acct_how')), c && c.ins);
for (const p of [A, B, Wb]) ok(`${p.tag}: no page errors`, p.errs.length === 0, p.errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

// Free coins for a short video, in the app (24 Nov 2026, Audrey: "Ads before launch"; ads.js, the app's ads part stood in
// for by window.__fakeAds): ./withserver.sh node adtest.mjs [OUT]   (LANG=fr; W, H: 874 x 402 sideways; PORT)
//  1. In the app, level 3 on: the shop's Coins shelf (even with Apple's shop not there) opens with "Free coins": +150, 5
//     left today, Watch. Below level 3: no Coins shelf.
//  2. Watch: "Getting a video…" (the button can't be tapped twice) while the video plays; played to the end: +150 coins,
//     said, 4 left; the day's count saved.
//  3. Closed before the end: no coins, said why. No video to be had: no coins, said. Neither counts.
//  4. Five watched: "Come back tomorrow for more", no button. A reload keeps it. The next day: 5 again.
//  5. A save claiming more than five, or a day ahead: dropped (and flagged as changed outside the game).
//  6. Settings: the ad privacy choices only once Google asks for them; the tap opens Google's form.
//  7. Outside the app: no free-coins card, no Coins shelf without Apple's shop. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/adtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 300) : '')); if (!cond) fails++; };
const T0 = new Date('2026-12-05T11:30:00+00:00').getTime();
async function phone(app) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('ff3d.age')) localStorage.setItem('ff3d.age', '{"b":"adult","by":"asked"}'); } catch (e) { /* */ } });      // (an adult's age group already given: agetest.mjs tests the question)
  ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
  await ctx.addInitScript(([t0, app]) => {
    let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T;
    if (!app) return;
    window.__ffApp = true; window.__adCalls = [];
    const mode = () => { try { return sessionStorage.getItem('__adMode') || 'ok'; } catch (e) { return 'ok'; } };
    window.__fakeAds = {
      hello: async () => ({ v: 1, privacy: false }),
      watch: async o => { window.__adCalls.push(['watch', o]); await new Promise(r => setTimeout(r, 700)); const m = mode();
        if (m === 'noad') throw Object.assign(new Error('no video'), { code: 'noad' });
        return { earned: m !== 'stop', privacy: true }; },
      choices: async () => { window.__adCalls.push(['choices']); return { shown: true, privacy: true }; },
    };
  }, [T0, app]);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30${fr ? '&lang=fr' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await load(p);
  await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.save(); f.gameUI().close(); });
  return p;
}
const load = async p => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); }); };
const level = (p, L) => p.evaluate(L => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(L) + 5; g.data.lvSeen = L; g.save(); f.gameUI().close(); f.gameUI().refresh(); }, L);
const coinsTab = p => p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.deco.shop(); const c = [...document.querySelectorAll('.gsheet:not([hidden]) .gchip')].find(x => x.dataset.tab === 'coins'); if (c) c.click(); return !!c; });
const card = p => p.evaluate(() => { const c = document.querySelector('.gsheet:not([hidden]) .gfree'); if (!c) return null; const go = c.querySelector('.giap-watch'); return { text: c.innerText, btn: go ? go.textContent : null, off: go ? go.disabled : null, first: c === c.parentNode.querySelector('.gcard') }; });
const T = (p, k, o) => p.evaluate(([k, o]) => window.__farm.game().t(k, o), [k, o]);
const st = p => p.evaluate(() => { const d = window.__farm.game().data; return { coins: d.coins, ads: d.ads || null, left: window.__farm.game().adsLeft() }; });
const hint = p => p.evaluate(() => document.getElementById('hint').textContent);
const shot = async (p, n) => { await p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } })); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/${n}${fr ? '_fr' : ''}.png` }); };
const watch = async p => { await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gfree .giap-watch').click()); await p.waitForTimeout(150); };
const settle = p => p.waitForFunction(() => !window.__farm.ads().busy, null, { timeout: 10000 }).then(() => p.waitForTimeout(150));

const A = await phone(true);
await level(A, 2);
ok('1: below level 3: no Coins shelf', !(await coinsTab(A)));
await level(A, 4);
ok('1: level 4, in the app: the Coins shelf (no Apple shop here)', await coinsTab(A));
await A.waitForTimeout(300);
let c = await card(A);
ok('1: "Free coins" first on it: +150, 5 left today, Watch', c && c.first && c.text.includes('+150') && (await A.evaluate(() => document.querySelector('.gfree .gdec-l').textContent)) === await T(A, 'free_l', { n: 150 }) && c.text.includes(await T(A, 'free_left', { n: 5 })) && c.btn === await T(A, 'free_btn'), c);
await shot(A, '1_free');
let s0 = await st(A);
await watch(A);
c = await card(A);
ok('2: while the video plays: "Getting a video…", not tappable again', c.btn === await T(A, 'free_wait') && c.off === true, c);
await A.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gfree .giap-watch').click());
await settle(A);
let s1 = await st(A);
ok('2: played to the end: +150 coins, 4 left, the count saved', s1.coins === s0.coins + 150 && s1.left === 4 && s1.ads && s1.ads.n === 1 && /^\d{8}$/.test(s1.ads.d), [s0, s1]);
ok('2: …said, and only one video asked for', (await hint(A)) === await T(A, 'free_done', { n: 150 }) && (await A.evaluate(() => window.__adCalls.filter(c => c[0] === 'watch').length)) === 1, await hint(A));
c = await card(A);
ok('2: the card says 4 left', c.text.includes(await T(A, 'free_left', { n: 4 })) && c.btn === await T(A, 'free_btn'), c);
await shot(A, '2_after');
await A.evaluate(() => sessionStorage.setItem('__adMode', 'stop')); s0 = await st(A); await watch(A); await settle(A);
s1 = await st(A);
ok('3: closed before the end: no coins, said why, not counted', s1.coins === s0.coins && s1.left === 4 && (await hint(A)) === await T(A, 'free_stop'), [s0, s1, await hint(A)]);
await A.evaluate(() => sessionStorage.setItem('__adMode', 'noad')); await watch(A); await settle(A);
s1 = await st(A);
ok('3: no video to be had: no coins, said, not counted', s1.coins === s0.coins && s1.left === 4 && (await hint(A)) === await T(A, 'free_noad'), await hint(A));
await A.evaluate(() => sessionStorage.setItem('__adMode', 'ok'));
for (let i = 0; i < 4; i++) { await watch(A); await settle(A); }
s1 = await st(A); c = await card(A);
ok('4: the shop\'s own count of coins follows', (await A.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gshop-c').textContent.replace(/\D/g, ''))) === String((await st(A)).coins));
ok('4: no bags without Apple\'s shop (never the preview\'s stand-in)', !(await A.evaluate(() => !!document.querySelector('.gsheet:not([hidden]) .giap-buy'))));
ok('4: five watched: 750 coins in all, "Come back tomorrow for more", no button', s1.coins === s0.coins + 600 && s1.left === 0 && s1.ads.n === 5 && c.btn === null && c.text.includes(await T(A, 'free_none')), [s1, c]);
await shot(A, '3_none');
await A.reload({ waitUntil: 'domcontentloaded' }); await load(A);
ok('4: a reload keeps the day\'s five', (await st(A)).left === 0);
await A.evaluate(() => { window.__T += 86400e3; sessionStorage.setItem('__T', window.__T); });
ok('4: the next day: five again', (await st(A)).left === 5);
// 5: the save's check
const bad = async ads => { await A.evaluate(ads => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.ads = ads; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); }, ads); await A.reload({ waitUntil: 'domcontentloaded' }); await load(A); return A.evaluate(() => ({ ads: window.__farm.game().data.ads || null, edited: window.__farm.game().edited })); };
let r = await bad({ d: '20261206', n: 9 });
ok('5: more than five: dropped, flagged', r.ads === null && r.edited, r);
r = await bad({ d: '20270101', n: 1 });
ok('5: a day ahead: dropped, flagged', r.ads === null && r.edited, r);
// 6: Settings
await A.evaluate(() => { localStorage.removeItem('ff3d.adprivacy'); }); await A.reload({ waitUntil: 'domcontentloaded' }); await load(A);
await A.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }); await A.waitForTimeout(300);
ok('6: Settings: no ad choices before Google asks for them', !(await A.evaluate(() => !!document.querySelector('.gsheet:not([hidden]) .gadchoices'))));
await coinsTab(A); await A.waitForTimeout(300); await watch(A); await settle(A);
await A.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }); await A.waitForTimeout(300);
const ch = await A.evaluate(() => { const c = document.querySelector('.gsheet:not([hidden]) .gadchoices'); if (!c) return null; c.scrollIntoView({ block: 'center' }); return c.innerText; });
ok('6: once Google asks: the ad privacy choices in Settings', !!ch && ch.includes(await T(A, 'ad_choices')) && ch.includes(await T(A, 'ad_choices_l')), ch);
await shot(A, '4_settings');
await A.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gadchoices .gbtn').click()); await A.waitForTimeout(300);
ok('6: the tap opens Google\'s form', await A.evaluate(() => window.__adCalls.some(c => c[0] === 'choices')));
// 7: outside the app
const Wb = await phone(false); await level(Wb, 4);
ok('7: outside the app: no Coins shelf without Apple\'s shop, no free-coins card', !(await coinsTab(Wb)) && !(await card(Wb)));
for (const [n, p] of [['app', A], ['site', Wb]]) ok(`${n}: no page errors`, p.errs.length === 0, p.errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

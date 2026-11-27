// The Settings card as the iPhone app shows it (27 Nov 2026, Audrey: "Review the setting popup to organise it better please"):
// the app's parts stood in for (sign-in, reminders, the shop, Google's ad privacy choices: as the tests do), the showcase farm,
// sideways; the card scrolled from top to bottom, a picture each screenful, and one tall picture of all of it.
// ./withserver.sh node settingspics.mjs FARM.json OUTDIR   (LANG2: the language; SIGNED=1: signed in with Apple)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [FARM, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const farm = JSON.parse(fs.readFileSync(FARM, 'utf8')), W = +(process.env.W || 874), H = +(process.env.H || 402);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'en-GB' });
await ctx.addInitScript(([save, T]) => {
  if (!sessionStorage.getItem('w')) { localStorage.setItem('ff3d.farm', save); localStorage.setItem('ff3d.age', '{"b":"adult","by":"asked"}'); localStorage.setItem('ff3d.adprivacy', '1'); sessionStorage.setItem('w', '1'); }
  window.__T = T; Date.now = () => window.__T;
  window.__ffApp = true;
  window.__fakeNative = { apple: async () => ({ idToken: 'a', name: 'Audrey', email: '' }), google: async () => ({ idToken: 'g' }) };
  const F = window.__fakeNotes = { perm: 'granted', pending: [], async checkPermissions() { return { display: 'granted' }; }, async requestPermissions() { return { display: 'granted' }; }, async getPending() { return { notifications: [] }; }, async cancel() {}, async schedule() {} };
  window.__fakeStore = { products: async o => ({ products: o.ids.map(id => ({ id, price: '£1.99' })) }), owned: async () => ({ ids: [] }), buy: async () => ({ state: 'cancelled', ids: [] }), restore: async () => ({ ids: [] }), pending: async () => ({ list: [] }), finish: async () => ({}) };
  window.__fakeAds = { hello: async () => ({ v: 1, privacy: true }), watch: async () => ({ earned: true, privacy: true }), choices: async () => ({ shown: true }) };
}, [farm.save, farm.T]);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:30${process.env.LANG2 ? '&lang=' + process.env.LANG2 : ''}`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
await p.evaluate(l => { const f = window.__farm, g = f.game(); if (l) g.setLang(l); g.data.acctAsk = 1; g.save(); const u = f.gameUI(); if (u.isOpen) u.close(); f.pause(true); }, process.env.LANG2 || '');
await p.addStyleTag({ content: '#hint { display: none !important; }' });
await p.evaluate(() => { const b = document.querySelector('#settingsbtn, .gset, [data-act=settings]'); if (b) b.click(); else window.__farm.gameUI().settings(); });
await p.waitForTimeout(1500);
const sc = await p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden]) .gsheet-b') || document.querySelector('.gsheet:not([hidden])'); const all = [...document.querySelectorAll('.gsheet:not([hidden]) *')].find(e => e.scrollHeight > e.clientHeight + 20 && getComputedStyle(e).overflowY !== 'visible'); window.__sc = all || s; return { h: window.__sc.scrollHeight, c: window.__sc.clientHeight, cls: window.__sc.className }; });
console.log('scroll', JSON.stringify(sc));
let k = 0;
for (let y = 0; y < sc.h; y += Math.max(100, sc.c - 40)) { await p.evaluate(y => { window.__sc.scrollTop = y; }, y); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${String(++k).padStart(2, '0')}.png` }); if (y + sc.c >= sc.h) break; }
// the whole card's text, in order, for the record
console.log(JSON.stringify(await p.evaluate(() => [...window.__sc.children].map(e => (e.className || e.tagName) + ': ' + e.innerText.replace(/\s+/g, ' ').slice(0, 90)))));
console.log('errors', JSON.stringify(errs));
await b.close();

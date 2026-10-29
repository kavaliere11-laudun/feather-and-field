// Pictures of My account (release 7 step 6), with the pretend account (?account=fake, its "online" farm in the phone's
// own storage): ./withserver.sh node acctpics.mjs [OUT]   (LANGS=en,fr; SIDE=1 sideways too)
// For each language and way round: the Settings card signed out; "Which farm to keep?" (a different farm already online);
// the card signed in; the once-only suggestion. Also checks nothing spills off the cards.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/acctpics';
fs.mkdirSync(OUT, { recursive: true });
const LANGS = (process.env.LANGS || 'en,fr').split(','), LOC = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-BR', it: 'it-IT' };
const SIZES = [[402, 874, 'up'], ...(process.env.SIDE === '0' ? [] : [[874, 402, 'side']])];
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info).slice(0, 300) : '')); if (!cond) fails++; };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const off = p => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return ['(no card)']; const q = s.getBoundingClientRect(), out = [];
  for (const e of s.querySelectorAll('button, .gcard-t, h2, p')) { const r = e.getBoundingClientRect(); if (r.width && (r.right > q.right + 1 || r.left < q.left - 1 || e.scrollWidth > e.clientWidth + 2)) out.push(e.textContent.trim().slice(0, 30)); } return out; });
const shot = async (p, name, sel) => { await p.evaluate(s => { document.getAnimations().forEach(a => a.finish()); const e = s && document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/${name}.png` }); };
for (const L of LANGS) for (const [W, H, way] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: LOC[L] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00&account=fake`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await p.waitForFunction(() => window.__farm && window.__farm.game && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 420; g.data.coins = 380; g.save(); f.gameUI().close(); f.gameUI().refresh(); f.draw(); });
  // a different farm already online (another phone's, further on)
  await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = 5200; raw.d.coins = 2450; raw.d.made -= 9 * 86400e3; raw.d.farmer.name = 'Rosie'; raw.d.farmer.look = 'f';
    localStorage.setItem('ff3d.fakecloud', JSON.stringify({ 'fake-farmer-1': { farm: JSON.stringify(raw), n: 12, at: Date.now() - 26 * 3600e3, lv: 9, coins: 2450, made: raw.d.made } })); });
  await p.evaluate(() => window.__farm.gameUI().settings()); await p.waitForFunction(() => !!document.querySelector('.gacct-in:not([disabled])'));
  ok(`${L} ${way}: the card signed out, nothing off it`, !(await off(p)).length, await off(p));
  await shot(p, `${L}_${way}_1_signed_out`, '.gacct');
  await p.evaluate(() => document.querySelector('.gacct-in').click());
  await p.waitForFunction(() => !!document.querySelector('.gsheet:not([hidden]) .gtwo-here'));
  ok(`${L} ${way}: which farm to keep, nothing off it`, !(await off(p)).length, await off(p));
  await shot(p, `${L}_${way}_2_two_farms`);
  await p.evaluate(() => document.querySelector('.gtwo-here .gtwo-keep').click());
  await p.waitForFunction(() => window.__farm.account().status === 'saved');
  await p.evaluate(() => window.__farm.gameUI().settings()); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.gacct-del').click());
  ok(`${L} ${way}: the card signed in (and "Tap again to delete…"), nothing off it`, !(await off(p)).length, await off(p));
  await shot(p, `${L}_${way}_3_signed_in`, '.gacct');
  // the suggestion (signed out, a farm a few days old)
  await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().accountNudge(); });
  await p.waitForTimeout(300);
  ok(`${L} ${way}: the suggestion, nothing off it`, !(await off(p)).length, await off(p));
  await shot(p, `${L}_${way}_4_suggestion`);
  ok(`${L} ${way}: no page errors`, !errs.length, errs.slice(0, 3));
  await ctx.close();
}
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

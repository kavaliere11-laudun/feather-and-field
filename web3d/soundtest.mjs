// The music (release 7; Audrey, 28 Oct: her tracks 2 and 4, "Now and then"): ./withserver.sh node soundtest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A browser that, like a phone, only lets a page play sound after a tap. Before any tap: silence. The first tap: the music
// comes a few seconds later, fading in, really sounding (heard through an analyser on the game's own output); one of the two
// tracks. A track over: a few minutes of just the farm (2½ to 5), then the other track. Of an evening, softer; at night, it
// fades away and no new track starts; morning: it comes back. Put away: quiet, the music paused; back: it carries on.
// Settings: Music On / Off (Oui / Non in French), the note under it; Off: it fades away at once and stays off after a
// reload; On: a track within seconds. A save with the music typed in wrong: checked (on). No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/soundtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
fs.mkdirSync(OUT, { recursive: true });
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&sound&time=11:00`;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', deviceScaleFactor: 2 });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const info = () => p.evaluate(() => { const s = window.__farm && window.__farm.sound(); return s ? s.info() : null; });
const wait = ms => p.waitForTimeout(ms);
// how loud the game's own output is just now (an analyser on its master volume)
const loud = () => p.evaluate(() => new Promise(res => {
  const s = window.__farm.sound(); if (!s.ctx) return res(0);
  if (!s.an) { s.an = s.ctx.createAnalyser(); s.an.fftSize = 2048; s.master.connect(s.an); }
  const d = new Float32Array(2048); let m = 0, n = 0;
  const go = () => { s.an.getFloatTimeDomainData(d); for (const v of d) m = Math.max(m, Math.abs(v)); if (++n < 8) setTimeout(go, 60); else res(+m.toFixed(4)); }; go();
}));
const until = async (f, ms, step = 250) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await f(); if (r) return r; await wait(step); } return null; };
// a new farm: the welcome's Play is the first tap
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await wait(1500);
let s = await info();
ok('before any tap: no sound at all', s && !s.unlocked && s.state === 'idle', s);
await p.tap('.gsheet .gbtn');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const g = window.__farm.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.save(); window.__farm.gameUI().close(); });
s = await info();
ok('the first tap: the sound wakes (the page\'s audio running)', s.unlocked && s.ctx === 'running', s);
s = await until(async () => { const i = await info(); return i.state === 'playing' && !i.paused && i.at > 0.5 ? i : null; }, 20000);
ok('a few seconds later: one of the two tracks starts', !!s && /champ-de-tournesol|happy-whistling-ukulele/.test(s.track), s);
const first = s && s.track;
await wait(3500);
s = await info(); let lv = await loud();
ok('fading in to its volume, and really sounding', s.gain > 0.3 && s.gain < 0.5 && lv > 0.02, { gain: s.gain, peak: lv });
// to the end of the track: a few minutes of just the farm, then the other
await p.evaluate(() => window.__farm.sound().el.dispatchEvent(new Event('ended')));      // (as if it had played to its end)
s = await until(async () => { const i = await info(); return i.state === 'idle' ? i : null; }, 8000);
ok('the track over: a quiet spell of 2½ to 5 minutes before the next', !!s && s.next >= 145 && s.next <= 300 && s.track !== first, s);
await wait(1200); lv = await loud();
ok('quiet meanwhile', lv < 0.002, lv);
await p.evaluate(() => { const S = window.__farm.sound(); S.nextAt = S.now(); });
s = await until(async () => { const i = await info(); return i.state === 'playing' && !i.paused && i.at > 0.3 ? i : null; }, 25000);
ok('then the other track', !!s && s.track !== first, s);
// evening: softer; night: it fades away, no new one; morning: back
await wait(3000);
await p.evaluate(() => window.__farm.setHour(20.8));
s = await until(async () => { const i = await info(); return i.gain < 0.3 && Math.abs(i.gain - 0.42 * 0.6 * 0.5) < 0.04 ? i : null; }, 20000) || await info();
ok('of an evening: softer', s.state === 'playing' && s.gain > 0.1 && s.gain < 0.3, s.gain);
await p.evaluate(() => window.__farm.setHour(22.5));
s = await until(async () => { const i = await info(); return i.state === 'idle' ? i : null; }, 25000) || await info();
ok('at night: faded away', s.state === 'idle' && s.paused && s.gain < 0.01, s);
await p.evaluate(() => { const S = window.__farm.sound(); S.nextAt = S.now(); }); await wait(1500);
s = await info();
ok('and no new track at night', s.state === 'idle' && s.paused, s);
await p.evaluate(() => { window.__farm.setHour(9); const S = window.__farm.sound(); S.nextAt = S.now(); });
s = await until(async () => { const i = await info(); return i.state === 'playing' && !i.paused ? i : null; }, 8000);
ok('morning: the music comes back', !!s, s);
// put away and back
await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
await wait(800); s = await info();
ok('put away: paused, the sound asleep', s.paused && s.ctx !== 'running', s);
await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
await wait(1500); s = await info();
ok('back: it carries on', !s.paused && s.ctx === 'running' && s.state === 'playing', s);
// the settings: Music On / Off
await p.evaluate(() => window.__farm.gameUI().settings()); await wait(700);
const row = await p.evaluate(() => { const r = document.querySelector('.gmusic'); return r ? { label: r.querySelector('.glabel').textContent, chips: [...r.querySelectorAll('.gchip')].map(c => c.textContent + (c.classList.contains('on') ? '*' : '')), note: r.nextElementSibling.textContent } : null; });
ok('Settings: the music row, On chosen', row && row.label === (fr ? 'Musique' : 'Music') && row.chips.join() === (fr ? 'Oui*,Non' : 'On*,Off') && /silen/.test(row.note), row);
await p.screenshot({ path: `${OUT}/settings_${W}x${H}${fr ? '_fr' : ''}.png` });
await p.tap('.gmusic .gchip:nth-child(2)');
s = await until(async () => { const i = await info(); return i.state === 'idle' ? i : null; }, 10000) || await info();
ok('Off: faded away at once', s.state === 'idle' && s.paused, s);
ok('Off: kept in the farm', await p.evaluate(() => window.__farm.game().data.music === false));
await p.evaluate(() => { const S = window.__farm.sound(); S.nextAt = S.now(); }); await wait(1500);
ok('Off: no track comes', (await info()).state === 'idle');
// a reload: still off, even after a tap
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => window.__farm.gameUI().close()); await wait(500);
await p.tap('#farm', { position: { x: W / 2, y: H * 0.6 } }).catch(() => p.mouse.click(W / 2, H * 0.6));
await wait(8000); s = await info();
ok('after a reload: still off, even after a tap', s.unlocked && s.state === 'idle', s);
await p.evaluate(() => window.__farm.gameUI().settings()); await wait(600);
ok('Settings after the reload: Off chosen', (await p.evaluate(() => [...document.querySelectorAll('.gmusic .gchip')].map(c => c.classList.contains('on')).join())) === 'false,true');
await p.tap('.gmusic .gchip:nth-child(1)');
s = await until(async () => { const i = await info(); return i.state === 'playing' && !i.paused && i.at > 0.3 ? i : null; }, 25000);
ok('On: a track within seconds', !!s, s || await info());
ok('On: the farm keeps no "off"', await p.evaluate(() => window.__farm.game().data.music === undefined));
// a save with the music typed in wrong: checked (on)
await p.evaluate(() => { const k = 'ff3d.farm', raw = JSON.parse(localStorage.getItem(k)); raw.d.music = 'nope'; localStorage.setItem(k, JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
ok('a save with the music typed in wrong: checked (on)', await p.evaluate(() => window.__farm.game().data.music === undefined && window.__farm.game().musicOn()));
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

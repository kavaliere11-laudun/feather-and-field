// The music (release 7; Audrey, 28 Oct: her tracks 2 and 4, "Now and then"): ./withserver.sh node soundtest.mjs [OUT]   (LANG=fr; W, H; PORT)
// A browser that, like a phone, only lets a page play sound after a tap. Before any tap: silence. The first tap: the music
// comes a few seconds later, fading in, really sounding (heard through an analyser on the game's own output); one of the two
// tracks. A track over: a few minutes of just the farm (2½ to 5), then the other track. Of an evening, softer; at night, it
// fades away and no new track starts; morning: it comes back. Put away: quiet, the music paused; back: it carries on.
// Settings: Music On / Off (Oui / Non in French), the note under it; Off: it fades away at once and stays off after a
// reload; On: a track within seconds. Her hens chatting (29 Oct): close to a coop, clear; zoomed out and away, much softer;
// one real moment after another; the birds in bed, none. The farm's own sounds: all loaded; the time of day's bed by the
// hour; the pond's near it; the rooster's crow and a hen's egg song heard when they happen. Sounds On / Off: off, the hens stop and the music carries on. A save
// with the music or the sounds typed in wrong: checked (on). No page errors.
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
// (node: 'master' all of it, 'gain' the music alone, 'fx' the farm's sounds alone)
const loud = (node = 'master') => p.evaluate(node => new Promise(res => {
  const s = window.__farm.sound(); if (!s.ctx) return res(0);
  s.ans = s.ans || {}; if (!s.ans[node]) { const a = s.ctx.createAnalyser(); a.fftSize = 2048; s[node].connect(a); s.ans[node] = a; }
  const d = new Float32Array(2048); let m = 0, n = 0;
  const go = () => { s.ans[node].getFloatTimeDomainData(d); for (const v of d) m = Math.max(m, Math.abs(v)); if (++n < 8) setTimeout(go, 60); else res(+m.toFixed(4)); }; go();
}), node);
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
s = await info(); let lv = await loud('gain');
ok('fading in to its volume, and really sounding', s.gain > 0.3 && s.gain < 0.5 && lv > 0.02, { gain: s.gain, peak: lv });
// to the end of the track: a few minutes of just the farm, then the other
await p.evaluate(() => window.__farm.sound().el.dispatchEvent(new Event('ended')));      // (as if it had played to its end)
s = await until(async () => { const i = await info(); return i.state === 'idle' ? i : null; }, 8000);
ok('the track over: a quiet spell of 2½ to 5 minutes before the next', !!s && s.next >= 145 && s.next <= 300 && s.track !== first, s);
await wait(1200); lv = await loud('gain');
ok('quiet meanwhile (the music)', lv < 0.002, lv);
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
// the hens chatting (Audrey's own, 29 Oct): from the coop near the middle of the view, while its birds are up
const hen = () => p.evaluate(() => window.__farm.sound().info().hens);
await p.evaluate(() => { const f = window.__farm, c = f.coopPlots()[0], v = new f.THREE.Vector3(); c.frame.getWorldPosition(v); f.lookAt(v.x, v.z, 2.6); });
let h = await until(async () => { const i = await hen(); return i.loaded === 7 && i.playing && i.gain > 0.5 ? i : null; }, 30000);
ok('close to the coop: her hens chatting, all seven moments loaded, near and clear', !!h && h.near > 0.6, h || await hen());
lv = await until(async () => { const i = await hen(); if (!i.playing || i.gain < 0.5) return null; const l = await loud('fx'); return l > 0.005 ? l : null; }, 30000, 400);
ok('really sounding', !!lv, lv);
await p.evaluate(() => { const f = window.__farm, c = f.coopPlots()[0], v = new f.THREE.Vector3(); c.frame.getWorldPosition(v); f.lookAt(v.x + 6, v.z + 6, 8.5); });
h = await until(async () => { const i = await hen(); return i.near < 0.2 && (!i.playing || i.gain < 0.35) ? i : null; }, 30000);      // (the volume follows within a second or two)
ok('zoomed out and away: much softer', !!h && h.near < 0.2 && (!h.playing || h.gain < 0.35), h || await hen());
await p.evaluate(() => { const f = window.__farm, c = f.coopPlots()[0], v = new f.THREE.Vector3(); c.frame.getWorldPosition(v); f.lookAt(v.x, v.z, 2.6); });
const seen = new Set(); for (let i = 0; i < 40 && seen.size < 3; i++) { const x = await hen(); if (x.playing) seen.add(x.which); await wait(1000); }
ok('one moment after another, not the same one again and again', seen.size >= 2, [...seen]);
await p.evaluate(() => { window.__farm.pause(true); for (const c of window.__farm.coopPlots()) for (const b of c.birds) { b._was = b.asleep; b.asleep = true; } });      // (held still, so nobody wakes them)
h = await until(async () => { const i = await hen(); return i.near === 0 && (!i.playing || i.gain < 0.02) ? i : null; }, 15000);
ok('the birds in bed: no chatting', !!h, h || await hen());
await p.evaluate(() => { for (const c of window.__farm.coopPlots()) for (const b of c.birds) b.asleep = !!b._was; window.__farm.pause(false); });
// the farm's own sounds (Audrey, 29 Oct: "All good, put them in"): all loaded; the time of day's bed by the hour; the pond's
// near the pond; the rooster's crow and a hen's egg song when they happen; a one-shot from where it happens
const farm = () => p.evaluate(() => window.__farm.sound().info().farm);
const KINDS = ['egg_rebel', 'egg_glutton', 'egg_mum', 'egg_brave', 'egg_diva', 'crow', 'flurry', 'mum', 'chicks', 'quack', 'bark'];
let F = await until(async () => { const f = await farm(); return Object.keys(f.beds).length === 5 && KINDS.every(k => f.groups[k]) ? f : null; }, 45000);
ok('the farm\'s sounds all loaded (eleven kinds, five beds)', !!F, F || await farm());
const bedAt = async (h, bed, name) => {
  await p.evaluate(h => window.__farm.setHour(h), h);
  F = await until(async () => { const f = await farm(); return f.beds[bed] > 0.2 && Object.entries(f.beds).every(([k, v]) => k === bed || k === 'pond' || v < 0.03) ? f : null; }, 25000);
  ok(name + ': its own bed, the others silent', !!F, F ? F.beds : (await farm()).beds);
};
for (const [h, bed, name] of [[11, 'day', 'by day'], [7, 'dawn', 'at dawn'], [20, 'evening', 'of an evening']]) await bedAt(h, bed, name);      // (the night's at the end: the birds go to bed)
await p.evaluate(() => window.__farm.setHour(11));
await p.evaluate(() => { const f = window.__farm, c = f.plan().pond.center; f.lookAt(c[0], c[2], 2.6); });
F = await until(async () => { const f = await farm(); return f.beds.pond > 0.3 ? f : null; }, 20000);
ok('near the pond: its frogs', !!F, (F || await farm()).beds);
await p.evaluate(() => { const f = window.__farm, c = f.plan().pond.center; f.lookAt(c[0] + 14, c[2] + 14, 3); });
F = await until(async () => { const f = await farm(); return f.beds.pond < 0.08 ? f : null; }, 20000);
ok('far from the pond: hardly', !!F, (F || await farm()).beds);
await p.evaluate(() => { const f = window.__farm, c = f.coopPlots()[0], v = new f.THREE.Vector3(); c.frame.getWorldPosition(v); f.lookAt(v.x, v.z, 2.6); });
const before = (await farm()).played;
// (the rooster up and about again after the night: then a crow)
await until(() => p.evaluate(() => { const r = window.__farm.coopPlots()[0].birds.find(b => b.kind === 'rooster'); return !r.asleep && r.root.visible && !r.route && !r.roost; }), 60000);
F = await until(async () => {
  await p.evaluate(() => { const r = window.__farm.coopPlots()[0].birds.find(b => b.kind === 'rooster'); if (!r.act || r.act.type !== 'crow') { r.crowAt = -1e9; r.act = { type: 'crow', left: 2.0 }; r.wait = 2.2; } });
  const f = await farm(); return (f.played.crow || 0) > (before.crow || 0) ? f : null; }, 20000, 700);
ok('the rooster crows: heard', !!F, F && F.last);
const pers = await p.evaluate(() => { const h = window.__farm.coopPlots()[0].birds.find(b => b.kind === 'hen' && !b.laying); h.startLaying(30); Object.assign(h.laying, { phase: 'sing', t: 0, inside: false, beat: -1 }); return h.pers; });
F = await until(async () => { const f = await farm(); return (f.played['egg_' + pers] || 0) > (before['egg_' + pers] || 0) ? f : null; }, 15000);
ok('a hen sings over her egg: her personality\'s song (' + pers + ')', !!F, F && F.last);
const shot = await p.evaluate(() => ['bark', 'quack', 'flurry'].map(k => !!window.__farm.sound().play(k, { near: 0.8, pan: 0.3 })));
ok('a woof, a quack, a flurry from where they happen', shot.every(Boolean), shot);
// the settings: Music On / Off
await p.evaluate(() => window.__farm.gameUI().settings()); await wait(700);
const row = await p.evaluate(() => { const r = document.querySelector('.gmusic'); return r ? { label: r.querySelector('.glabel').textContent, chips: [...r.querySelectorAll('.gchip')].map(c => c.textContent + (c.classList.contains('on') ? '*' : '')), note: document.querySelector('.gsound-note').textContent, sounds: [...document.querySelectorAll('.gsounds .gchip')].map(c => c.textContent + (c.classList.contains('on') ? '*' : '')).join() } : null; });
ok('Settings: the music row and the sounds row, both on', row && row.label === (fr ? 'Musique' : 'Music') && row.chips.join() === (fr ? 'Oui*,Non' : 'On*,Off') && row.sounds === row.chips.join() && /silen/.test(row.note), row);
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
// the sounds switch: off, the hens stop; the music carries on; kept after a reload
await p.evaluate(() => { const f = window.__farm, c = f.coopPlots()[0], v = new f.THREE.Vector3(); c.frame.getWorldPosition(v); f.lookAt(v.x, v.z, 2.6); });
await until(async () => (await hen()).playing, 20000);
await p.tap('.gsounds .gchip:nth-child(2)');
h = await until(async () => { const i = await hen(); return !i.playing ? i : null; }, 8000);
ok('Sounds Off: the hens stop', !!h, h || await hen());
await wait(6000); h = await hen(); s = await info();
ok('Sounds Off: no more, and the music carries on', !h.playing && s.state === 'playing', { hens: h, music: s.state });
F = await farm();
ok('Sounds Off: the beds silent, and no one-shot', Object.values(F.beds).every(v => v < 0.02) && !(await p.evaluate(() => window.__farm.sound().play('bark', { near: 1, pan: 0 }))), F.beds);
ok('Sounds Off: kept in the farm', await p.evaluate(() => window.__farm.game().data.sounds === false));
await p.tap('.gsounds .gchip:nth-child(1)');
h = await until(async () => { const i = await hen(); return i.playing ? i : null; }, 15000);
ok('Sounds On: the hens again', !!h, h || await hen());
ok('Sounds On: the farm keeps no "off"', await p.evaluate(() => window.__farm.game().data.sounds === undefined));
// a save with the music typed in wrong: checked (on)
await p.evaluate(() => { const k = 'ff3d.farm', raw = JSON.parse(localStorage.getItem(k)); raw.d.music = 'nope'; raw.d.sounds = 0; localStorage.setItem(k, JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
ok('a save with the music and the sounds typed in wrong: checked (both on)', await p.evaluate(() => { const g = window.__farm.game(); return g.data.music === undefined && g.data.sounds === undefined && g.musicOn() && g.soundsOn(); }));
await p.evaluate(() => window.__farm.gameUI().close()); await p.tap('#farm', { position: { x: W / 2, y: H * 0.6 } }).catch(() => p.mouse.click(W / 2, H * 0.6));
await until(async () => Object.keys((await farm()).beds).length === 5, 45000); await bedAt(23.2, 'night', 'at night');
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

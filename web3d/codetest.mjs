// The game, release 1 step 9g (the farm code): node codetest.mjs   (LANG=fr; W, H; SHOTS=folder)
// Settings: "Your farm code"; Copy my farm code: copied (and shown, to select by hand); the farm changes; the code pasted
// and loaded (two taps): the page opens the farm as it was when copied, "Farm loaded", not flagged. A broken code: "doesn't
// work", nothing changed. A code from the first game: it says so. A code edited by hand: loaded, checked and flagged (its
// coins kept within what's allowed). No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://localhost:${process.env.PORT || 8770}` });
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/code_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const word = () => p.evaluate(() => document.getElementById('hint').textContent);
const farm = () => p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, xp: g.data.xp, name: g.data.farmer.name, edited: g.edited, birds: g.data.birds.map(b => b.name).join() }; });
const settings = async () => { await p.evaluate(() => window.__farm.gameUI().close()); await p.evaluate(() => document.querySelector('.gbar .ggear').click()); await run(0.3); };
const loadCode = async (code) => {
  await settings();
  await p.fill('.gcode-in', code);
  await p.evaluate(() => document.querySelector('.gcode-load').click()); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('.gcode-load').click());
};
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.fill('#gname', 'Rosie'); await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 777; g.save(); });
await settings();
let t = await p.evaluate(() => document.querySelector('.gsheet').innerText);
ok('Settings: "Your farm code", how, Copy, a box to paste into, Load', (fr ? /Le code de votre ferme/ : /Your farm code/).test(t) && (fr ? /Copier le code de ma ferme/ : /Copy my farm code/).test(t) && !!(await p.$('.gcode-in')) && !!(await p.$('.gcode-load')), t.slice(0, 400));
await p.evaluate(() => document.querySelector('.gcode-copy').click());
await p.waitForFunction(() => !document.querySelector('.gcode-out').hidden, null, { timeout: 15000 });
const code = await p.evaluate(() => document.querySelector('.gcode-out').value);
let clip = ''; try { clip = await p.evaluate(() => navigator.clipboard.readText()); } catch (e) { clip = 'n/a'; }
const w1 = await word();
ok('Copy my farm code: copied, shown too, the word', /^FF[23]-/.test(code) && code.length > 100 && (clip === code || clip === 'n/a') && (fr ? /Code copié|Voici le code/ : /Farm code copied|Here is your farm code/).test(w1), { len: code.length, head: code.slice(0, 12), clip: clip.slice(0, 12), w1 });
await shot('1_settings');
const before = await farm();
// the farm changes, then the code loaded
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 5; g.save(); });
await loadCode(code);
await p.waitForTimeout(1500); await load();
let after = await farm();
const w2 = await word();
ok('the code pasted and loaded: the farm as it was when copied, "Farm loaded", not flagged', after.coins === 777 && after.name === before.name && after.birds === before.birds && !after.edited && (fr ? /Ferme chargée : niveau 1/ : /Farm loaded: level 1/).test(w2), { before, after, w2 });
// a broken code
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 321; g.save(); });
await loadCode(code.slice(0, 60) + 'xyz' + code.slice(80));
await p.waitForTimeout(500);
after = await farm();
ok('a broken code: "doesn\'t work", the farm as it was', after.coins === 321 && (fr ? /Ce code ne fonctionne pas/ : /That farm code doesn’t work/).test(await word()), { after, w: await word() });
// one from the first game
await loadCode('FF1-H4sIAAAAAAAAA6tWKkktLlGyUlAqzs9NVdJRKkhMzwEAqT6g8xYAAAA=');
await p.waitForTimeout(500);
ok('a code from the first game: it says so', (fr ? /premier Feather & Field/ : /first Feather & Field/).test(await word()) && (await farm()).coins === 321, await word());
// one edited by hand (its coins, without the seal)
const edited = await p.evaluate(async (code) => {
  const bytes = Uint8Array.from(atob(code.slice(4)), c => c.charCodeAt(0));
  const json = code[2] === '3' ? new TextDecoder().decode(new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())) : new TextDecoder().decode(bytes);
  const raw = JSON.parse(json); raw.d.coins = 99999999; raw.d.farmer.name = '<b>Hacker</b>';
  const out = new TextEncoder().encode(JSON.stringify(raw)); let s = ''; for (let i = 0; i < out.length; i++) s += String.fromCharCode(out[i]); return 'FF2-' + btoa(s);
}, code);
await loadCode(edited);
await p.waitForTimeout(1500); await load();
after = await farm();
ok('a code edited by hand: loaded, checked and flagged (names cleaned)', after.edited && !/[<>]/.test(after.name), after);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

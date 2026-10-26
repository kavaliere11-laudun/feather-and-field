// The switch (release 1 step 12): node switchtest.mjs <old site> <new site>   (LANG=fr; W, H; SHOTS=folder; PORT)
// Two copies of the published site (a clone of main before and after ./deploy.sh), served as GitHub Pages does, under
// /feather-and-field/. A phone that played the first game: its offline worker at the usual address and a farm saved
// ("Audrey"). The site switched: the usual address opens the 3D game (with the old worker still there), every file found;
// the welcome says the first game's farm is safe; the old worker unregistered and its ff-... caches gone. A new 3D farm;
// Settings: "The first Feather & Field", Open the first game: classic/ opens with "Audrey"'s farm and its own offline
// worker (classic/ only, ffc-... caches); its Settings: "The new Feather & Field", Open the new game: back to the 3D farm.
// 3d/play.html opens the same farm. A new phone (no first game): no welcome line, no card. No page errors, no missing files.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';
const [OLD, NEW] = process.argv.slice(2);
if (!OLD || !NEW) { console.error('usage: node switchtest.mjs <old site> <new site>'); process.exit(1); }
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS, PORT = +(process.env.PORT || 8785);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
// ---- the site, as GitHub Pages serves it (a folder's index.html for the folder; 10 minutes' cache, as there)
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', json: 'application/json', webmanifest: 'application/manifest+json', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', glb: 'model/gltf-binary', css: 'text/css', ttf: 'font/ttf', woff2: 'font/woff2', txt: 'text/plain', md: 'text/markdown' };
let ROOT = OLD;
const missing = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (!u.pathname.startsWith('/feather-and-field/')) { res.writeHead(404); return res.end(); }
  let f = path.join(ROOT, decodeURIComponent(u.pathname.slice('/feather-and-field/'.length)));
  if (!f.startsWith(path.resolve(ROOT))) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { missing.push(u.pathname); res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(PORT, r));
const TOP = `http://localhost:${PORT}/feather-and-field/`;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const errs = [];
async function phone() {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(p.url().split('/feather-and-field/')[1] + ': ' + e.message));
  return p;
}
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/switch_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); };
const workers = p => p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => new URL(r.scope).pathname));
const cacheNames = p => p.evaluate(() => caches.keys());
const until = async (p, f, arg, secs = 30) => { for (let i = 0; i < secs * 2; i++) { try { if (await p.evaluate(f, arg)) return true; } catch (e) { /* (the page reloading) */ } await p.waitForTimeout(500); } return false; };
const farm3d = async p => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 240000 }); await p.waitForTimeout(1500); };
const firstGame = async p => { await p.waitForFunction(() => document.readyState === 'complete' && document.getElementById('gear') && document.getElementById('coins') && document.getElementById('coins').textContent !== '', null, { timeout: 120000 }); await p.waitForTimeout(800); };
// (the first game's code is all inside one function: it's played through its own buttons here)
const tapText = (p, sel, text) => p.evaluate(([sel, text]) => { const x = [...document.querySelectorAll(sel)].find(e => e.textContent.trim() === text); if (!x) throw new Error('no ' + text); x.click(); }, [sel, text]);
const firstSettings = async p => { await p.evaluate(() => document.getElementById('gear').click()); await p.waitForTimeout(500); return p.evaluate(() => document.getElementById('sheet').innerText); };

// ---- a phone that played the first game
let p = await phone();
await p.goto(TOP, { waitUntil: 'load', timeout: 120000 });
await firstGame(p);
if (!(await until(p, () => !!navigator.serviceWorker.controller, null, 60))) await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(2000); await p.waitForLoadState('load'); await firstGame(p);      // (its worker took over: the page reloads once)
await firstSettings(p);
await tapText(p, '#sheet button', fr ? 'Changer' : 'Change'); await p.waitForTimeout(400);
await p.fill('#fname', 'Audrey'); await p.evaluate(() => document.getElementById('fname').dispatchEvent(new Event('change')));
await tapText(p, '#sheet button', fr ? 'C’est parti' : 'Let’s go'); await p.waitForTimeout(800);
const before = { workers: await workers(p), caches: await cacheNames(p), save: await p.evaluate(() => localStorage.getItem('feather-field-save-v1')) };
ok('the first game at the usual address: its offline worker there, its ff- cache, a farm saved', before.workers.includes('/feather-and-field/') && before.caches.some(k => /^ff-/.test(k)) && /Audrey/.test(before.save || ''), { workers: before.workers, caches: before.caches });

// ---- the site switched
ROOT = NEW; missing.length = 0;
await p.goto(TOP, { waitUntil: 'load', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
let t = await p.evaluate(() => document.querySelector('.gsheet').innerText);
ok('the usual address now: the 3D game\'s welcome (the old worker still there when it opened)', !!(await p.$('#farm')) && (fr ? /Bienvenue dans votre ferme/ : /Welcome to your farm/).test(t), t.slice(0, 120));
const heroT = await p.evaluate(() => document.querySelector('.ghero').innerText);
ok('the welcome: the first game\'s farm is safe, in Settings (under the picture\'s tagline)', (fr ? /premier jeu est dans les Réglages/ : /first game is safe in Settings/).test(heroT), heroT);
await p.waitForSelector('.ghero img.on', { timeout: 60000 }).catch(() => {});
await shot(p, '1_welcome');
const gone = await until(p, () => navigator.serviceWorker.getRegistrations().then(rs => !rs.some(r => new URL(r.scope).pathname === '/feather-and-field/')).then(a => caches.keys().then(ks => a && !ks.some(k => /^ff-/.test(k)))), null, 40);
ok('the old worker unregistered and its ff- caches gone', gone, { workers: await workers(p), caches: await cacheNames(p) });
const kept = await p.evaluate(() => localStorage.getItem('feather-field-save-v1'));      // (as the first game left it: it saves as its page closes)
await p.fill('#gname', 'Rosie'); await p.tap('.gsheet .gbtn');
await farm3d(p);
ok('a new 3D farm at the usual address', (await p.evaluate(() => window.__farm.game().data.farmer.name)) === 'Rosie');
// Settings: the first game's card
await p.evaluate(() => { const ui = window.__farm.gameUI(); ui.close(); document.querySelector('.gbar .ggear').click(); });
await p.waitForTimeout(400);
t = await p.evaluate(() => document.querySelector('.gsheet').innerText);
ok('Settings: "The first Feather & Field", Open the first game', !!(await p.$('.gfirst-open')) && (fr ? /Le premier Feather & Field/ : /The first Feather & Field/).test(t), t.slice(0, 600));
await p.evaluate(() => document.querySelector('.gfirst').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
await shot(p, '2_settings');
ok('the first game\'s farm still saved, untouched by the 3D game', /Audrey/.test(kept || '') && (await p.evaluate(() => localStorage.getItem('feather-field-save-v1'))) === kept);
await Promise.all([p.waitForNavigation({ timeout: 60000 }), p.evaluate(() => document.querySelector('.gfirst-open').click())]);
await firstGame(p);
t = await firstSettings(p);
ok('the first game opens in classic/, its farm as it was', p.url() === TOP + 'classic/' && /Audrey/.test(t), { url: p.url(), t: t.slice(0, 300) });
const classicOk = await until(p, () => navigator.serviceWorker.getRegistrations().then(rs => rs.some(r => new URL(r.scope).pathname === '/feather-and-field/classic/' && r.active)).then(a => caches.keys().then(ks => a && ks.some(k => /^ffc-/.test(k)))), null, 60);
ok('its own offline worker, in classic/ only, its ffc- cache', classicOk && !(await workers(p)).includes('/feather-and-field/'), { workers: await workers(p), caches: await cacheNames(p) });
await p.waitForTimeout(1500); await firstGame(p);        // (its worker took over: the page reloads once)
t = await firstSettings(p);
ok('the first game\'s Settings: "The new Feather & Field", Open the new game', (fr ? /Le nouveau Feather & Field/ : /The new Feather & Field/).test(t) && (fr ? /Ouvrir le nouveau jeu/ : /Open the new game/).test(t), t.slice(0, 300));
await shot(p, '3_classic_settings');
await Promise.all([p.waitForNavigation({ timeout: 60000 }), p.evaluate(fr => [...document.querySelectorAll('#sheet button')].find(x => x.textContent === (fr ? 'Ouvrir le nouveau jeu' : 'Open the new game')).click(), fr)]);
await farm3d(p);
ok('Open the new game: back to the 3D farm at the usual address', p.url() === TOP && (await p.evaluate(() => window.__farm.game().data.farmer.name)) === 'Rosie' && (await p.evaluate(() => window.__farm.gameUI().kind)) !== 'welcome', p.url());
await p.goto(TOP + '3d/play.html', { waitUntil: 'load', timeout: 120000 });
await farm3d(p);
ok('3d/play.html: the same farm', (await p.evaluate(() => window.__farm.game().data.farmer.name)) === 'Rosie');
await p.goto(TOP, { waitUntil: 'load', timeout: 120000 }); await farm3d(p);
ok('the usual address again: still the 3D game (the first game\'s worker keeps to classic/)', (await p.evaluate(() => window.__farm.game().data.farmer.name)) === 'Rosie');
await p.context().close();

// ---- a new phone
p = await phone();
await p.goto(TOP, { waitUntil: 'load', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
t = await p.evaluate(() => document.querySelector('.gsheet').innerText);
ok('a new phone: the welcome without the first game\'s line', !(fr ? /premier jeu/ : /first game/).test(t + (await p.evaluate(() => document.querySelector('.ghero').innerText))), t.slice(0, 300));
await p.tap('.gsheet .gbtn'); await farm3d(p);
await p.evaluate(() => { window.__farm.gameUI().close(); document.querySelector('.gbar .ggear').click(); }); await p.waitForTimeout(300);
ok('its Settings: no first game\'s card', !(await p.$('.gfirst')));
ok('no workers, no caches for a new phone', (await workers(p)).length === 0 && (await cacheNames(p)).length === 0, { w: await workers(p), c: await cacheNames(p) });
ok('every file found', missing.length === 0, missing.slice(0, 10));
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); server.close();

// The farm dog's name at phone size: tap Biscuit, tap "Rename Biscuit", type a name, save; then the checks on what a name may
// be, and that it's kept after a reload: node dogname.mjs [OUT_prefix]   (LANG=fr for French)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out] = process.argv.slice(2), FR = process.env.LANG === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [], url = 'http://localhost:' + (process.env.PORT || 8770) + '/index.html?lineup=dog' + (FR ? '&lang=fr' : '');
// each load in a fresh tab of the same browser (the same saved name): leaving a page in the test browser can take minutes
let p = null;
const load = async () => {
  const old = p; p = await ctx.newPage(); if (old) old.close().catch(() => {});
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('dialog ' + d.message()); d.dismiss(); });
  await p.goto(url, { timeout: 120000, waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 30); f.draw(); }); };
await load();
let ok = true; const check = (what, pass, info = '') => { ok = ok && pass; console.log(pass ? 'PASS' : 'FAIL', what, info); };
check('default name', await p.evaluate(() => window.__farm.dogName()) === 'Biscuit');
// tap the first dog
const at = await p.evaluate(() => { const f = window.__farm, d = f.foxLineup().foxes[0], v = d.root.getWorldPosition(new f.THREE.Vector3()); v.y += d.hitY; v.project(f.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
await p.touchscreen.tap(at[0], at[1]);
await p.evaluate(() => { const f = window.__farm; f.step(1 / 30, 10); f.draw(); });
const tagTxt = await p.textContent('#tag'), btnTxt = await p.textContent('#dogbtn'), btnShown = await p.isVisible('#dogbtn');
check('tag on tap', tagTxt.startsWith('Biscuit') && /Border Collie|border collie/.test(tagTxt), tagTxt);
check('rename button', btnShown && btnTxt === (FR ? 'Renommer Biscuit' : 'Rename Biscuit'), btnTxt);
if (out) await p.screenshot({ path: out + '_1.png', timeout: 120000 });
await p.tap('#dogbtn');
check('card open', await p.isVisible('#dogname') && await p.textContent('#dogname-label') === (FR ? 'Le nom de votre chien' : "Your dog's name"));
await p.fill('#dogname-in', '');
await p.type('#dogname-in', FR ? 'Noisette' : 'Pepper');
if (out) await p.screenshot({ path: out + '_2.png', timeout: 120000 });
await p.tap('#dogname-save');
await p.evaluate(() => { const f = window.__farm; f.step(1 / 30, 5); f.draw(); });
const nm = FR ? 'Noisette' : 'Pepper';
check('renamed', await p.evaluate(() => window.__farm.dogName()) === nm && !(await p.isVisible('#dogname')));
check('all dogs relabelled', await p.evaluate((nm) => window.__farm.foxLineup().foxes.every(d => d.name === nm && d.label.startsWith(nm)), nm));
check('saved tag', (await p.textContent('#tag')).includes(nm), await p.textContent('#tag'));
if (out) await p.screenshot({ path: out + '_3.png', timeout: 120000 });
// what a name may be (the same check as the game's names)
const cases = await p.evaluate(() => { const c = window.__farm.cleanName; return [
  c('  Rex   the   Dog ', 'Biscuit'), c('<img src=x onerror=alert(1)>', 'Biscuit'), c('', 'Biscuit'), c('   ', 'Biscuit'), c('\u0000\u0007', 'Biscuit'),
  c('A'.repeat(50), 'Biscuit'), c('Éloïse-Anne d’Arc', 'Biscuit'), c('🐶'.repeat(25), 'Biscuit'), c(null, 'Biscuit'), c({ toString: () => 'Obj' }, 'Biscuit')]; });
const want = ['Rex the Dog', 'img src=x onerror=al', 'Biscuit', 'Biscuit', 'Biscuit', 'A'.repeat(20), 'Éloïse-Anne d’Arc', '🐶'.repeat(20), 'Biscuit', 'Obj'];
cases.forEach((v, i) => check('name check ' + i, v === want[i], JSON.stringify(v)));
// a bad name saved straight into the browser's storage is cleaned on loading; the page shows names only as text
await p.evaluate(() => localStorage.setItem('ff3d.dogName', '<b>Bad</b>\u0000' + 'x'.repeat(40)));
await load();
const loaded = await p.evaluate(() => window.__farm.dogName());
check('cleaned on load', loaded === 'bBad/bxxxxxxxxxxxxxx' && !loaded.includes('<'), JSON.stringify(loaded));
// back to Biscuit: an empty name
await p.evaluate(() => window.__farm.setDogName('   '));
check('empty -> Biscuit', await p.evaluate(() => window.__farm.dogName() === 'Biscuit' && localStorage.getItem('ff3d.dogName') === null));
// kept after a reload
await p.evaluate(() => window.__farm.setDogName('Moss'));
await load();
check('kept after reload', await p.evaluate(() => window.__farm.dogName() === 'Moss' && window.__farm.foxLineup().foxes[0].label.startsWith('Moss')));
check('no dialogs or errors', errs.length === 0, JSON.stringify(errs));
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
await b.close();

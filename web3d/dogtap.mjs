// Tap Biscuit on the farm (at phone size): his label and the Rename button show, he turns to you, hops and bows; renaming
// him changes the name on his kennel too; asleep at night a tap opens one eye: node dogtap.mjs [OUT.png]   (LANG=fr)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out] = process.argv.slice(2), FR = process.env.LANG === 'fr';
let ok = true; const check = (what, pass, info = '') => { ok = ok && pass; console.log(pass ? 'PASS' : 'FAIL', what, info === '' ? '' : JSON.stringify(info)); };
const errs = [];
async function open(hour) {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('dialog'); d.dismiss(); });
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?dog&time=${hour}` + (FR ? '&lang=fr' : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); const c = f.dog().centre(new f.THREE.Vector3()); f.lookAt(c.x - 0.2, c.z - 0.2, 1.6); f.draw(); });
  return [b, p];
}
const where = p => p.evaluate(() => { const f = window.__farm, d = f.dog().dog, v = d.root.getWorldPosition(new f.THREE.Vector3()); v.y += d.hitY; v.project(f.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
// by day
let [b, p] = await open(10);
let at = await where(p); await p.touchscreen.tap(at[0], at[1]);
let r = await p.evaluate(() => { const f = window.__farm, D = f.dog(), d = D.dog; let names = new Set(), h0 = d.heading;
  for (let i = 0; i < 40; i++) { f.step(1 / 30, 1); const t = d.task && d.task.cur ? d.task.cur() : d.task; names.add(t && t.cur ? t.cur().name : t && t.name); }
  f.draw(); return { tag: document.getElementById('tag').textContent, btn: document.getElementById('dogbtn').textContent, btnShown: !document.getElementById('dogbtn').hidden, names: [...names] }; });
check('his label', r.tag.startsWith('Biscuit') && (FR ? /border collie/.test(r.tag) : /Border Collie/.test(r.tag)), r.tag);
check('the Rename button', r.btnShown && r.btn === (FR ? 'Renommer Biscuit' : 'Rename Biscuit'), r.btn);
check('he says hello (turns to you, hops, bows)', r.names.includes('hello') || r.names.includes('hop') || r.names.includes('bow'), r.names);
if (out) await p.screenshot({ path: out, timeout: 120000 });
await p.evaluate(() => window.__farm.setDogName('Moss'));
r = await p.evaluate(() => ({ board: window.__farm.kennelName(), dog: window.__farm.dog().dog.name, label: window.__farm.dog().dog.label }));
check('renamed: on his kennel too', r.board === 'Moss' && r.dog === 'Moss' && r.label.startsWith('Moss'), r);
await p.evaluate(() => window.__farm.setDogName(''));
check('back to Biscuit', await p.evaluate(() => window.__farm.kennelName() === 'Biscuit'));
b.close().catch(() => {});
// at night, asleep in his kennel
[b, p] = await open(23);
r = await p.evaluate(() => ({ asleep: window.__farm.dog().asleep }));
check('asleep in his kennel', r.asleep);
at = await where(p); await p.touchscreen.tap(at[0], at[1]);
r = await p.evaluate(() => { const f = window.__farm, D = f.dog(), d = D.dog; let open = 0;
  for (let i = 0; i < 30; i++) { f.step(1 / 30, 1); open = Math.max(open, 1 - (d.A.shutL || 0)); }
  return { asleep: D.asleep, open: +open.toFixed(2), tag: document.getElementById('tag').textContent }; });
check('tapped asleep: one eye opens, still asleep', r.asleep && r.open > 0.6 && r.tag.startsWith('Biscuit'), r);
check('no page errors or pop-ups', errs.length === 0, errs);
console.log(ok ? 'ALL PASS' : 'SOME FAILED');
b.close().catch(() => {});
process.exit(0);

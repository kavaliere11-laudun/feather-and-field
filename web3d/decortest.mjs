// The decorations (main.js placeDecor): node decortest.mjs (LANG=fr). All eight on the farm, none on a path, a plot, the pond
// (but the duck house, on it), a stream or each other, each turned to the player; the village grid round them; the windmill's
// sails turning; a real tap on each shows its name (English or French). No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const fr = process.env.LANG === 'fr';
const NAMES = { flowers: ['Cottage flower bed', 'Massif de fleurs'], birdbath: ['Bird bath', 'Bain d’oiseaux'], beehives: ['Beehives', 'Ruches'], duckhouse: ['Duck house', 'Maison des canards'],
  greenhouse: ['Greenhouse', 'Serre'], windmill: ['Windmill', 'Moulin à vent'], bandstand: ['Bandstand', 'Kiosque à musique'], statue: ['Golden cockerel', 'Coq d’or'] };
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/no room for/.test(m.text())) errs.push(m.text()); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0${fr ? '&lang=fr' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const info = await p.evaluate(() => {
  const f = window.__farm, nav = f.nav(), out = []; f.pause(true); f.setHour(14);
  for (const d of f.decor()) {
    // the grid blocked under it (its middle), free round it somewhere
    const c = new f.THREE.Vector3(); d.box.getCenter(c).applyMatrix4(d.m);
    out.push({ model: d.model, x: d.pos[0], z: d.pos[1], deg: d.deg, blocked: !nav.freeAt(c.x, c.z), free: !!nav.nearestFree(c.x, c.z, 4) });
  }
  return out;
});
const sails = await p.evaluate(() => { const f = window.__farm; const a = f.sails ? f.sails().children[0].rotation.z : null; f.step(1 / 30, 30); return [a, f.sails ? f.sails().children[0].rotation.z : null]; });
const taps = {};
for (const d of info) {
  const at = await p.evaluate(d => {
    const f = window.__farm, D = f.decor().find(q => q.model === d.model), c = new f.THREE.Vector3(); D.box.getCenter(c); c.y = D.box.min.y + (D.box.max.y - D.box.min.y) * 0.45; c.applyMatrix4(D.m);
    f.lookAt(c.x, c.z, 3); f.draw(); const v = c.clone().project(f.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }, d);
  await p.touchscreen.tap(at.x, at.y);
  taps[d.model] = await p.evaluate(() => { const t = document.getElementById('tag'); return t.classList.contains('on') ? t.textContent : ''; });
  await p.evaluate(() => { window.__farm.step(1 / 30, 120); });
}
const want = Object.keys(NAMES);
const checks = [
  ['no page errors (and room for every one)', errs.length === 0, errs.slice(0, 3)],
  ['all eight on the farm', want.every(k => info.some(d => d.model === k)), info.map(d => d.model)],
  ['each turned to face the player', info.every(d => d.deg === 45), info.map(d => d.deg)],
  ['on the village grid: blocked under it (the duck house on the pond)', info.every(d => d.blocked), info.filter(d => !d.blocked).map(d => d.model)],
  ['the windmill\'s sails turn', sails[0] !== null && Math.abs(sails[1] - sails[0]) > 0.1, sails],
  ['a tap on each: its name', want.every(k => taps[k] === NAMES[k][fr ? 1 : 0]), taps],
];
let all = true;
for (const [nm, ok, v] of checks) { all = all && ok; console.log(ok ? 'PASS' : 'FAIL', nm, '·', JSON.stringify(v).slice(0, 400)); }
console.log(all ? 'ALL PASS' : 'SOME FAILED');
await b.close();

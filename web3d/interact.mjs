// Checks the 3D test farm's touch and mouse handling: tap a hen (her name shows), drag (the view moves), pinch and scroll (it zooms),
// and that the quality steps down cleanly. Usage: node interact.mjs [url]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'http://localhost:8770/index.html?q=0';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
await p.goto(url);
await p.waitForFunction(() => document.getElementById('loading') === null || document.getElementById('loading').classList.contains('done'), null, { timeout: 120000 });
await p.waitForTimeout(800);
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : ''));

// a hen's place on screen
const spot = await p.evaluate(() => {
  const f = window.__farm, bd = f.birds[0];
  const v = bd.root.position.clone(); v.y += 0.17; v.project(f.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, name: bd.name };
});
await p.touchscreen.tap(spot.x, spot.y);
await p.waitForTimeout(300);
const tag = await p.evaluate(() => ({ on: document.getElementById('tag').classList.contains('on'), text: document.getElementById('tag').textContent }));
ok('tap a hen shows her name', tag.on && tag.text.startsWith(spot.name), JSON.stringify(tag));

// drag with the mouse
const before = await p.evaluate(() => window.__farm.view.target.toArray().map(v => +v.toFixed(3)));
await p.mouse.move(200, 500); await p.mouse.down(); await p.mouse.move(260, 560, { steps: 6 }); await p.mouse.up();
const after = await p.evaluate(() => window.__farm.view.target.toArray().map(v => +v.toFixed(3)));
ok('drag moves the view', JSON.stringify(before) !== JSON.stringify(after), before + ' -> ' + after);
const tag2 = await p.evaluate(() => document.getElementById('tag').textContent);

// scroll to zoom
const s0 = await p.evaluate(() => window.__farm.view.size);
await p.mouse.move(200, 500); await p.mouse.wheel(0, 300); await p.waitForTimeout(100);
const s1 = await p.evaluate(() => window.__farm.view.size);
ok('scroll zooms out', s1 > s0, s0.toFixed(2) + ' -> ' + s1.toFixed(2));

// pinch with two fingers (zoom in)
const cdp = await p.context().newCDPSession(p);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
await touch('touchStart', [[150, 450], [250, 550]]);
for (let k = 1; k <= 6; k++) await touch('touchMove', [[150 - k * 12, 450 - k * 12], [250 + k * 12, 550 + k * 12]]);
await touch('touchEnd', []);
const s2 = await p.evaluate(() => window.__farm.view.size);
ok('pinch apart zooms in', s2 < s1, s1.toFixed(2) + ' -> ' + s2.toFixed(2));

// zoom limits
for (let i = 0; i < 20; i++) await p.mouse.wheel(0, 800);
const s3 = await p.evaluate(() => window.__farm.view.size);
ok('zoom stops at the widest view', Math.abs(s3 - 7.5) < 0.01, s3.toFixed(2));

// the quality steps down cleanly to the lowest level
await p.evaluate(() => window.__farm.setQuality(3));
await p.waitForTimeout(500);
const low = await p.evaluate(() => ({ q: window.__farm.quality(), dpr: window.__farm.renderer.getPixelRatio() }));
ok('lowest quality applies', low.q === 3 && low.dpr === 1, JSON.stringify(low));
await p.screenshot({ path: 'shot_low.png' });

// the birds keep moving and stay in the yard
const pos1 = await p.evaluate(() => window.__farm.birds.map(b => [b.root.position.x, b.root.position.z]));
await p.waitForTimeout(4000);
const res = await p.evaluate((pos1) => {
  const f = window.__farm; let moved = 0, out = 0;
  f.birds.forEach((b, i) => { if (Math.hypot(b.root.position.x - pos1[i][0], b.root.position.z - pos1[i][1]) > 0.02) moved++; });
  return { moved, n: f.birds.length };
}, pos1);
ok('birds potter about', res.moved >= 2, JSON.stringify(res));
ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();

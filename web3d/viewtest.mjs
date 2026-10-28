// Turning the farm (release 6, step 1: main.js turnView, the compass): ./withserver.sh node viewtest.mjs [OUT]   (LANG=fr;
// W, H: the screen, e.g. W=874 H=402; PORT)
// A new farm. The usual view: turned 45 degrees, no compass. Two fingers turning on the screen: the farm turns with them,
// as far and the same way, round the middle of the screen; a pinch that hardly turns: no turn. The compass
// then at the top right, its needle pointing the usual way up; it stays turned (nothing turns it back by itself). A drag
// while turned: the ground stays under the finger. A hen tapped while turned: her card, and she turns to face you. Keys Q
// and E turn it too. All the way round (pictures each quarter turn). The compass tapped: back to the usual view, smoothly,
// and the compass gone. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/viewtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 1.5 });
const T0 = new Date('2026-11-03T11:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const shot = async n => { const url = await p.evaluate(() => { window.__farm.draw(); return document.querySelector('canvas').toDataURL('image/png'); }); fs.writeFileSync(`${OUT}/view_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, Buffer.from(url.split(',')[1], 'base64')); };
const az = () => p.evaluate(() => +window.__farm.viewAz().toFixed(2));
// fingers on the canvas (pointer events made in the page: two at once)
const fingers = (pts, phase) => p.evaluate(([pts, phase]) => {
  const c = document.querySelector('canvas');
  pts.forEach(([x, y], i) => c.dispatchEvent(new PointerEvent(phase, { pointerId: 11 + i, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: i === 0 })));
}, [pts, phase]);
// the ground under a point of the screen, and where a ground point is on the screen
const ground = (x, y) => p.evaluate(([x, y]) => { const f = window.__farm, T = f.THREE, cam = f.camera, c = document.querySelector('canvas'), r = new T.Raycaster();
  r.setFromCamera(new T.Vector2(x / c.clientWidth * 2 - 1, -(y / c.clientHeight) * 2 + 1), cam); const g = r.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), new T.Vector3()); return [g.x, g.z]; }, [x, y]);
const screen = (gx, gz) => p.evaluate(([x, z]) => { const f = window.__farm, v = new f.THREE.Vector3(x, 0, z).project(f.camera), c = document.querySelector('canvas'); return [(v.x + 1) / 2 * c.clientWidth, (1 - v.y) / 2 * c.clientHeight]; }, [gx, gz]);
// two fingers turning by deg (clockwise on the screen) round the middle, r px apart from it, in n steps
const twist = async (deg, r = 90, n = 12, spreadTo = 1) => {
  const cx = W / 2, cy = H / 2, at = (a, k) => [[cx - Math.cos(a) * r * k, cy - Math.sin(a) * r * k], [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]];
  await fingers(at(0, 1), 'pointerdown');
  for (let i = 1; i <= n; i++) { await fingers(at(deg * Math.PI / 180 * i / n, 1 + (spreadTo - 1) * i / n), 'pointermove'); await run(1 / 30); }
  await fingers(at(deg * Math.PI / 180, spreadTo), 'pointerup'); await run(0.1);
};
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 400; g.data.lvSeen = 3; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5);
ok('the usual view: turned 45 degrees round, no compass', (await az()) === 45 && !(await p.evaluate(() => window.__farm.compass())), await az());
await shot('0_usual');
// two fingers turning 40 degrees clockwise: the farm turns 40 degrees the same way (a spot under the right finger goes round
// with it, on the ground's slanting circle)
const B0 = [W / 2 + 90, H / 2], gB = await ground(...B0);
await twist(40);
const a1 = await az(), sB = await screen(...gB), wantB = [W / 2 + Math.cos(40 * Math.PI / 180) * 90, H / 2 + Math.sin(40 * Math.PI / 180) * 90 * Math.sin(42 * Math.PI / 180)];      // (the ground seen slanting: its circles are ellipses on the screen)
ok('two fingers turning: the farm turns with them, the same way and as far (a spot under a finger goes round as the ground turns)', Math.abs(Math.abs(a1 - 45) - 40) < 4 && Math.hypot(sB[0] - wantB[0], sB[1] - wantB[1]) < 14, { a1, sB, wantB });
ok('the compass at the top right, its needle turned', await p.evaluate(() => { const c = document.getElementById('compass'), n = c.querySelector('.needle'); return !c.hidden && /rotate\((?!0rad)/.test(n.style.transform) && c.getBoundingClientRect().right > innerWidth - 80 && c.getBoundingClientRect().top < 140; }), await p.evaluate(() => document.querySelector('#compass .needle').style.transform));
ok('the compass labelled in the game\'s language', (await p.evaluate(() => document.getElementById('compass').getAttribute('aria-label'))) === (fr ? 'Revenir à la vue habituelle' : 'Back to the usual view'));
await run(5);
ok('it stays turned: nothing turns it back by itself', (await az()) === a1, await az());
await shot('1_turned');
// a pinch that hardly turns: no turn
await twist(5, 90, 8, 1.4);
ok('a pinch that hardly turns (5 degrees): zoomed, not turned', (await az()) === a1, await az());
// a drag while turned: the ground stays under the finger
const D0 = [W / 2 - 40, H / 2 + 60], gD = await ground(...D0);
await p.evaluate(([x, y]) => { const c = document.querySelector('canvas'); c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 21, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true })); }, D0);
for (let i = 1; i <= 8; i++) await p.evaluate(([x, y]) => { const c = document.querySelector('canvas'); c.dispatchEvent(new PointerEvent('pointermove', { pointerId: 21, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true })); }, [D0[0] + 12 * i, D0[1] - 9 * i]);
await p.evaluate(([x, y]) => { const c = document.querySelector('canvas'); c.dispatchEvent(new PointerEvent('pointerup', { pointerId: 21, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true })); }, [D0[0] + 96, D0[1] - 72]);
const sD = await screen(...gD);
ok('a drag while turned: the ground stays under the finger', Math.hypot(sD[0] - (D0[0] + 96), sD[1] - (D0[1] - 72)) < 6, { sD, want: [D0[0] + 96, D0[1] - 72] });
// a hen tapped while turned: her card; she turns to face you
const hen = await p.evaluate(() => { const f = window.__farm, b = f.allBirds.find(x => x.gid && x.root.visible && !x.laying); const w = b.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 2.4); f.draw(); return b.gid; });
await run(0.3);
const hs = await p.evaluate(id => { const f = window.__farm, b = f.allBirds.find(x => x.gid === id), w = b.root.getWorldPosition(new f.THREE.Vector3()); w.y += 0.15; const v = w.project(f.camera), c = document.querySelector('canvas'); return [(v.x + 1) / 2 * c.clientWidth, (1 - v.y) / 2 * c.clientHeight]; }, hen);
await p.evaluate(([x, y]) => { const c = document.querySelector('canvas'); for (const ph of ['pointerdown', 'pointerup']) c.dispatchEvent(new PointerEvent(ph, { pointerId: 31, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true })); }, hs);
await run(3);
const faced = await p.evaluate(id => { const f = window.__farm, b = f.allBirds.find(x => x.gid === id), q = b.root.getWorldQuaternion(new f.THREE.Quaternion()), fwd = new f.THREE.Vector3(0, 0, 1).applyQuaternion(q), cam = f.camera.position.clone().sub(b.root.getWorldPosition(new f.THREE.Vector3())); fwd.y = 0; cam.y = 0;
  return { kind: f.gameUI().kind, off: +(fwd.angleTo(cam) * 57.3).toFixed(0) }; }, hen);
ok('a hen tapped while turned: her card, and she turns to face you', faced.kind === 'bird' && faced.off < 30, faced);
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.3);
// keys Q and E
const k0 = await az(); await p.keyboard.press('e'); await run(0.1); const k1 = await az(); await p.keyboard.press('q'); await p.keyboard.press('q'); await run(0.1); const k2 = await az();
ok('keys Q and E turn it too (a computer)', Math.abs(Math.abs(k1 - k0) - 12) < 0.5 && Math.abs(Math.abs(k2 - k1) - 24) < 0.5 && Math.sign(k1 - k0) !== Math.sign(k2 - k1), { k0, k1, k2 });
// all the way round: a quarter turn at a time
await p.evaluate(() => { const f = window.__farm; f.setViewAz(45); f.lookAt(f.farmer().pos.x, f.farmer().pos.z, 4.4); });
for (const [k, deg] of [[1, 90], [2, 90], [3, 90], [4, 90]]) { await p.evaluate(d => window.__farm.turnView(d), deg); await run(0.2); await shot('q' + k); }
ok('all the way round (four quarter turns): back where it started', Math.abs((await az()) - 45) < 0.01 || Math.abs((await az()) + 315) < 0.01, await az());
// the compass: back to the usual view, smoothly
await p.evaluate(() => window.__farm.turnView(-130)); await run(0.1);
const c0 = await az();
await p.evaluate(() => document.getElementById('compass').click());
await run(0.2); const mid = await az(); const turning = await p.evaluate(() => window.__farm.viewTurning());
await run(1.2);
ok('the compass tapped: back to the usual view, smoothly (part way after 0.2 s), the compass gone', mid !== c0 && Math.abs(mid - 45) > 3 && turning && (await az()) === 45 && !(await p.evaluate(() => window.__farm.compass())), { c0, mid, end: await az() });
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

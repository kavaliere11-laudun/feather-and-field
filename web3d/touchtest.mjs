// Touches that can't stick, and no black screen at a change of sharpness (9 Nov 2026, Audrey, fishing: "when I tap the
// water nothing happens and the zoom functionality becomes funny"; "the screen sometimes turns black for half a second"):
// ./withserver.sh node touchtest.mjs   (LANG=fr; PORT)
// A level-3 farm, sideways. A finger the page never hears lifted (a pointerdown and nothing after): the next real tap on a
// hen still opens her card, and no finger is counted as down afterwards; again, then the phone saying no finger is on the
// screen (a touchend with none left): none counted; again, the game put away: none counted. Fishing: ready to cast, a
// stuck finger, then a real tap on the pond: the line is cast. A change of sharpness: the farm is on the screen in the
// very frame the picture's size changes (never a blank one). No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const L = process.env.LANG || 'en', fr = L === 'fr';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 874, height: 402 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(180000); ctx.setDefaultNavigationTimeout(180000);
await ctx.addInitScript(() => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || new Date('2026-11-09T10:00:00Z').getTime()); Date.now = () => window.__T; });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' · ' + JSON.stringify(d).slice(0, 500))); if (!c) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); }, s);
const load = async () => { await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 }); await p.evaluate(() => { const f = window.__farm; f.pause(true); if (f.gameUI().isOpen) f.gameUI().close(); }); };
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${L}&time=10:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])'); await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = f.xpFor(3) + 5; g.data.lvSeen = 3; g.fishBag().gift = true; g.fishBag().worms = 6; g.data.fish.got = { minnow: { n: 1, cm: 6 } }; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await run(1);
await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); });
const stick = () => p.evaluate(() => { const c = document.querySelector('canvas'); c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 77, pointerType: 'touch', isPrimary: true, clientX: 300, clientY: 200, bubbles: true })); return window.__farm.pointersDown(); });
const down = () => p.evaluate(() => window.__farm.pointersDown());
const henAt = () => p.evaluate(() => { const f = window.__farm, P = f.coopPlots()[0], x = P.birds.find(y => y.gid && f.game().bird(y.gid).sex === 'h');
  x.wait = 1e9; x.route = null; x.act = null; x.target.copy(x.root.position);
  const w = x.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(w.x, w.z, 1.8); f.step(1 / 30, 20); f.draw(); const v = x.root.getWorldPosition(new f.THREE.Vector3()), q = f.screenOf(v.x, v.z, v.y + x.rig.scale * 0.45); return { x: q.x, y: q.y }; });
// ---- a finger never heard lifted, then a real tap
let n = await stick();
ok('a finger down and never heard lifted: counted as down', n === 1, n);
let at = await henAt(); await p.touchscreen.tap(at.x, at.y); await run(0.5);
let card = await p.evaluate(() => { const u = window.__farm.gameUI(); return u.isOpen && u.kind; });
ok('…the next tap on a hen all the same: her card (a first finger down: none were)', card === 'bird' && await down() === 0, { card, down: await down() });
await p.evaluate(() => window.__farm.gameUI().close());
// ---- the phone says no finger is on the screen
await stick();
await p.evaluate(() => { const e = new Event('touchend', { bubbles: true }); e.touches = []; window.dispatchEvent(e); }); await p.waitForTimeout(50);
ok('stuck again; the phone says no finger is on the screen: none counted', await down() === 0, await down());
await stick();
await p.evaluate(() => window.dispatchEvent(new Event('blur'))); await p.waitForTimeout(20);
ok('stuck again; the game put away: none counted', await down() === 0, await down());
await stick();
await p.evaluate(() => document.querySelector('canvas').dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 77, pointerType: 'touch', bubbles: true }))); await p.waitForTimeout(50);
ok('stuck again; the phone says that touch is lost: not counted', await down() === 0, await down());
// ---- fishing: ready to cast, a stuck finger, a real tap on the pond
await p.evaluate(() => { const f = window.__farm; f.dockCard(); const q = document.querySelector('.gsheet button[data-fish=go]'); if (q) q.click(); });
let st = null; for (let i = 0; i < 120 && st !== 'ready'; i++) { await run(1); st = await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); return f.fishing() && f.fishing().state; }); }
ok('fishing: out on the dock, ready to cast', st === 'ready', st);
await p.evaluate(() => window.__farm.turnView(0.5)); await run(0.2);      // (the view turned a little, as hers was)
await stick();
const W = await p.evaluate(() => { const f = window.__farm, d = f.dock(), h = d.face, x = d.stand[0] + Math.sin(h) * 2.4, z = d.stand[1] + Math.cos(h) * 2.4; f.lookAt(x, z, 4); f.draw(); return { ...f.screenOf(x, z), top: (document.elementFromPoint(f.screenOf(x, z).x, f.screenOf(x, z).y) || {}).tagName }; });
await p.touchscreen.tap(W.x, W.y); await run(0.3);
st = await p.evaluate(() => window.__farm.fishing().state);
ok('…a stuck finger, then a tap on the water in front of him: the line cast', /^(cast|wait|nibble|bite)$/.test(st) && W.top === 'CANVAS', { st, W });
await p.evaluate(() => window.__farm.fishing().stop()); await run(8);
// ---- a change of sharpness: drawn in the frame the picture's size changes
await p.evaluate(() => { const f = window.__farm; if (f.gameUI().isOpen) f.gameUI().close(); f.pause(false); });
const Q = await p.evaluate(() => new Promise(res => {
  const f = window.__farm, c = document.querySelector('canvas'), q0 = f.quality(), w0 = c.width, t0 = performance.now(), probe = document.createElement('canvas'); probe.width = 32; probe.height = 16;
  const g = probe.getContext('2d', { willReadFrequently: true });
  f.wantQuality(q0 + 1);
  const tick = () => {      // (after the game's own frame, in the same screen refresh: what's on the canvas now)
    if (c.width !== w0 || performance.now() - t0 > 60000) { g.drawImage(c, 0, 0, 32, 16); const d = g.getImageData(0, 0, 32, 16).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 24) lit++; res({ q0, q1: f.quality(), w0, w1: c.width, lit, of: 32 * 16 }); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));
ok('a change of sharpness: the picture smaller, and the farm on it in that very frame (not a blank screen)', Q.q1 === Q.q0 + 1 && Q.w1 < Q.w0 && Q.lit > Q.of * 0.9, Q);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close(); process.exit(fails ? 1 : 0);

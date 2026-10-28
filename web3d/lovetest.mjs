// The pond's secret (Audrey, 28 Oct: "A salmon and a frog are in love"; pond.js FrogPond love): ./withserver.sh node
// lovetest.mjs [OUT]   (LANG=fr; W, H; PORT)
// The village page, its pond: four lily pads out on the water (one with a water lily), the froglet a little smaller than
// the others. From the bank: she goes to the water's very edge and turns to him; his shadow glides in; up comes his head in
// front of her (out of the water, his eyes above it); they gaze, hearts rising, his cheeks blushing, her eyes dreamy; they
// kiss (his nose at her mouth, her eyes shut, a burst of hearts); he sinks back and glides away; she's herself again. A tap
// on her doesn't spoil it. From her lily pad: the same, she stays on her pad. Someone coming near: he's gone at once, she
// jumps in. By itself: when its time comes, by day, with the pond on the screen. The salmon is in no water's catch. Close
// pictures of each moment in OUT. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/lovetest', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1.5 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&frogs&time=12:00` + (fr ? '&lang=fr' : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm, F = f.frogs(); f.pause(true); f.setHour(12); window.__near = F.o.near; F.o.near = () => []; F.loveIn = 1e9; });
const step = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < Math.round(s * 30); i++) f.step(1 / 30, 1); }, s);
// a close look at her (from the side, a little above), straight off the canvas
let n = 0;
const shot = async (name, az = 0, dist = 1.1) => {
  const url = await p.evaluate(([az, dist]) => { const f = window.__farm, F = f.frogs(), h = F.her, L = F.loveOn, X = L ? L.plan.X : [h.pos.x, h.pos.z];
    const at = [(h.pos.x + X[0]) / 2, 0.06, (h.pos.z + X[1]) / 2];
    const face = L ? L.plan.face : h.heading, a = (Math.atan2(Math.cos(face), -Math.sin(face)) * 180 / Math.PI) - 45 + az;      // (looking across the two of them)
    f.closeShot({ at, az: a, el: 22, dist, fov: 30 }); return document.querySelector('canvas').toDataURL('image/jpeg', 0.9); }, [az, dist]);
  fs.writeFileSync(`${OUT}/love_${String(n++).padStart(2, '0')}_${name}${fr ? '_fr' : ''}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
};
const st = () => p.evaluate(() => { const F = window.__farm.frogs(), h = F.her, L = F.loveOn, S = F.salmon;
  const r = { state: h.state, task: h.task && h.task.name, t: L ? +L.t.toFixed(2) : null, stage: L && L.stage, blink: +h.P.blink.toFixed(2), salmon: !!(S && S.root.visible), hearts: F.hearts.filter(q => q.life > 0).length, loves: F.loves || 0 };
  if (S && S.root.visible) { S.root.updateMatrixWorld(true); const T = window.__farm.THREE, fx = Math.sin(L.plan.face), fz = Math.cos(L.plan.face), m = F.mouthOf(h, fx, fz), nose = new T.Vector3(0, 0, S.spec.L / 2).applyMatrix4(S.root.matrixWorld);
    const eye = new T.Vector3(0, 0, S.spec.L / 2 - 0.145 * S.spec.L * 0.83).applyMatrix4(S.root.matrixWorld);
    r.kissGap = +nose.distanceTo(m).toFixed(3); r.noseY = +nose.y.toFixed(3); r.eyeY = +eye.y.toFixed(3); r.blush = +S.U.blush.value.toFixed(2); }
  return r; });
// the pads and the froglet
const pads = await p.evaluate(() => { const F = window.__farm.frogs(); return { n: F.pads.length, flower: F.pads.some(q => q.r === 0.1), her: !!F.herPad, small: F.her.small, wet: F.pads.every(q => F.where(q.x, q.z)[0] < 0.85) }; });
ok('four lily pads out on the pond (one with a water lily), hers among them; the froglet a little smaller', pads.n === 4 && pads.flower && pads.her && pads.small < 1 && pads.wet, pads);
// ---- from the bank: wait till she's sitting there, then their moment
const ready = async where => { for (let i = 0; i < 240; i++) { const r = await p.evaluate(w => { const F = window.__farm.frogs(), h = F.her;
    if (w === 'pad' && h.state !== 'pad' && h.root.visible && (!h.task || /^(sit|look|float)$/.test(h.task.name))) { const P = F.herPad; if (h.state === 'bank' || h.state === 'water') { h.pos.set(P.x, 0.0095, P.z); h.state = 'pad'; h.task = null; h.wait = 0; } }
    return h.state === w && h.root.visible && (!h.task || /^(sit|look)$/.test(h.task.name)) && F.loveNow(); }, where); if (r) return true; await step(0.5); } return false; };
ok('from the bank: their moment begins', await ready('bank'));
let s = await st();
for (let i = 0; i < 60 && s.stage !== 'on'; i++) { await step(0.1); s = await st(); }
const edge = await p.evaluate(() => { const F = window.__farm.frogs(), h = F.her; return { s: +F.where(h.pos.x, h.pos.z)[0].toFixed(3), face: +Math.abs(Math.atan2(Math.sin(h.heading - F.loveOn.plan.face), Math.cos(h.heading - F.loveOn.plan.face))).toFixed(3) }; });
ok('she goes to the water\'s very edge (still on the bank) and turns to where he\'ll come', edge.s > 0.98 && edge.s < 1.012 && edge.face < 0.06, edge);
await step(1.4); await shot('1_shadow'); s = await st();
ok('his shadow gliding in under the water; nothing above it yet', !s.salmon && await p.evaluate(() => window.__farm.frogs().sShadow.visible), s);
await step(1.6); await shot('2_rising');
await step(0.6); s = await st(); await shot('3_gaze');
ok('up comes his head in front of her: out of the water, his eye above it', s.salmon && s.noseY > 0.06 && s.eyeY > 0.02 && s.kissGap < 0.09, s);
await step(1.6); s = await st(); await shot('4_hearts');
ok('they gaze: hearts rising between them, his cheeks blushing, her eyes dreamy', s.hearts >= 2 && s.blush > 0.8 && s.blink > 0.3 && s.blink < 0.6, s);
// a tap on her doesn't spoil it
const tap = await p.evaluate(() => { const F = window.__farm.frogs(); F.tapped(F.her); return F.her.task && F.her.task.name; });
ok('a tap on her doesn\'t spoil it', tap === 'love', tap);
for (let i = 0; i < 40 && (await st()).t < 6.85; i++) await step(0.05);
s = await st(); await shot('5_kiss'); await shot('5_kiss_close', 0, 0.7);
ok('they kiss: his nose at her mouth, her eyes shut, a burst of hearts', s.kissGap < 0.025 && s.blink > 0.85 && s.hearts >= 4, s);
await step(1.6); await shot('6_sinking');
await step(1.6); s = await st(); await shot('7_away');
ok('he sinks back and glides away; she watches him go', !s.salmon && s.task === 'love', s);
for (let i = 0; i < 60 && (await st()).task === 'love'; i++) await step(0.2);
s = await st();
ok('then she\'s herself again (her eyes open), his secret kept', s.task !== 'love' && s.blink === 0 && s.loves === 1 && !s.salmon, s);
// ---- from her lily pad
ok('from her lily pad: their moment begins', await ready('pad'));
for (let i = 0; i < 60 && (await st()).stage !== 'on'; i++) await step(0.1);
await step(3.6); s = await st(); await shot('8_pad_gaze', 0, 1.2);
const onPad = await p.evaluate(() => { const F = window.__farm.frogs(), h = F.her, P = F.herPad; return { d: +Math.hypot(h.pos.x - P.x, h.pos.z - P.z).toFixed(3), y: +h.pos.y.toFixed(4) }; });
ok('on her pad: up he comes beside it, she stays on it', s.salmon && s.eyeY > 0.02 && onPad.d < 0.03 && onPad.y > 0.009, { s, onPad });
for (let i = 0; i < 40 && (await st()).t < 6.85; i++) await step(0.05);
await shot('9_pad_kiss', 0, 1.0);
for (let i = 0; i < 80 && (await st()).task === 'love'; i++) await step(0.2);
s = await st();
ok('and it ends the same way: he\'s gone, she\'s still on her pad', s.loves === 2 && !s.salmon && s.state === 'pad', s);
// ---- someone coming near spoils it
await ready('pad') || await ready('bank');
for (let i = 0; i < 60 && (await st()).t < 4.5; i++) await step(0.1);
const near = await p.evaluate(() => { const f = window.__farm, F = f.frogs(), h = F.her; F.o.near = () => [[h.pos.x + 0.4, h.pos.z + 0.3]]; for (let i = 0; i < 4; i++) f.step(1 / 30, 1);
  const task = h.task && h.task.name; for (let i = 0; i < 32; i++) f.step(1 / 30, 1);
  return { task, on: !!F.loveOn, salmon: F.salmon.root.visible, blink: +h.P.blink.toFixed(2) }; });
ok('someone coming near: he\'s gone at once, she jumps in', near.task === 'dive' && !near.on && !near.salmon && near.blink === 0, near);
// ---- by itself, when its time comes (by day, the pond on the screen)
const auto = await p.evaluate(() => { const f = window.__farm, F = f.frogs(), h = F.her; F.o.near = () => [];
  f.lookAt(h.pos.x, h.pos.z, 3.5); f.draw();
  let started = false; F.loveIn = 0;
  for (let i = 0; i < 30 * 240 && !started; i++) { f.step(1 / 30, 1); started = !!F.loveOn; }
  const L1 = F.loveOn; let ended = false; for (let i = 0; i < 30 * 30 && !ended; i++) { f.step(1 / 30, 1); ended = !F.loveOn; }
  return { started, next: Math.round(F.loveIn), loves: F.loves }; });
ok('by itself, when its time comes: their moment, then the next one minutes away', auto.started && auto.next > 280 && auto.loves === 3, auto);
const late = await p.evaluate(() => { const f = window.__farm, F = f.frogs(); f.setHour(23.2); F.loveIn = 0; let started = false; for (let i = 0; i < 30 * 120 && !started; i++) { f.step(1 / 30, 1); started = !!F.loveOn; } f.setHour(12); return started; });
ok('not late at night', !late);
const far = await p.evaluate(() => { const f = window.__farm, F = f.frogs(), h = F.her; f.lookAt(h.pos.x + 30, h.pos.z + 30, 3.5); f.draw(); F.loveIn = 0; let started = false; for (let i = 0; i < 30 * 120 && !started; i++) { f.step(1 / 30, 1); started = !!F.loveOn; } return started; });
ok('not while the pond\'s off the screen', !far);
// ---- the salmon in no water's catch
globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const G = await import('./src/game.js').catch(() => null);
ok('the salmon is in no water\'s catch (and so never in the Book)', G ? !('salmon' in G.FISH_RULES) && !G.FISH_IDS.includes('salmon') : true);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

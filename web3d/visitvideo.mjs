// A short video of a night visit (open door, then the farmer sent): node visitvideo.mjs OUT [plot] [fps]
// Frames OUT_0000.png ...: Rusty out of his den (a few seconds), a cut to him creeping up to the coop, the poke, the flurry
// and the peck, the sneeze, then "Send the farmer" tapped (OUT_taps.json says where and when, for a ring drawn on after),
// the torch coming, and Rusty off over the fence. Stepped exactly at FPS; DPR=2 for a sharp video; LANG=fr for French.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';
const [out = 'vv', plot = '5', fpsArg = '15'] = process.argv.slice(2);
const FPS = parseFloat(fpsArg), PER = Math.round(30 / FPS);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: parseFloat(process.env.DPR || '2'), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coops=10&visit=${plot}${process.env.LANG === 'fr' ? '&lang=fr' : ''}`);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#readout { display: none !important; } #hint, #tag { transition: none !important; }' });
await p.evaluate(() => {
  const f = window.__farm; f.pause(true); window.__sim = 0;
  // hints stay up 4.5 s of the farm's time (the page times them in real time, and frames are slow to draw)
  const h = document.getElementById('hint'); let last = '', since = 0;
  window.__hintTick = (dt) => { window.__sim += dt; if (h.textContent !== last) { last = h.textContent; since = window.__sim; } h.classList.toggle('on', !!last && window.__sim - since < 4.5); };
  f.step(1 / 30, 2);
});
let n = 0;
const taps = [];
async function shoot() { await p.screenshot({ path: `${out}_${String(n++).padStart(4, '0')}.png`, timeout: 240000 }); }
// one frame: step the farm, place the camera, draw
const frame = (cam) => p.evaluate(([per, cam]) => {
  const f = window.__farm, V = f.visit(); f.step(1 / 30, per); window.__hintTick(per / 30);
  if (cam) f.lookAt(cam[0], cam[1], cam[2]); f.draw();
  const fox = V.fox, task = fox.task && fox.task.cur ? fox.task.cur() : fox.task;
  return { phase: V.phase, state: V.state, task: task ? task.name : '', x: fox.pos.x, z: fox.pos.z, take: V.way ? [V.way.take.x, V.way.take.z] : null, active: V.active(), canSend: V.canSend() };
}, [PER, cam]);
// 1. out of the den: the camera on the den's mouth for 4 s
const den = await p.evaluate(() => { const F = window.__farm.foxes(); const [x, z, h] = F.den; return [x + Math.sin(h) * 0.9, z + Math.cos(h) * 0.9 + 0.2]; });
let st;
await p.evaluate(() => { const f = window.__farm, V = f.visit(); for (let k = 0; k < 600 && !V.active(); k++) { f.step(1 / 30, 1); window.__hintTick(1 / 30); } });
for (let i = 0; i < parseFloat(process.env.DEN ?? '4.5') * FPS; i++) { st = await frame([den[0], den[1], 2.6]); await shoot(); }
// 2. the trot there, not filmed, until he's 4 m from the fence
const coop = await p.evaluate((i) => { const f = window.__farm, c = f.plots[i].frame.getWorldPosition(new f.THREE.Vector3()); return [c.x, c.z]; }, parseInt(plot));
for (let k = 0; k < 4000; k++) {
  st = await p.evaluate(() => { const f = window.__farm, V = f.visit(); f.step(1 / 30, 3); window.__hintTick(0.1); return { take: V.way ? [V.way.take.x, V.way.take.z] : null, x: V.fox.pos.x, z: V.fox.pos.z }; });
  if (st.take && Math.hypot(st.take[0] - st.x, st.take[1] - st.z) < 4) break;
}
// 3. at the coop: a steady camera on it, room on the farmhouse side for the torch to come in
const house = await p.evaluate(() => { const fh = window.__farm.plan().props.find(q => q.model === 'farmhouse'); return [fh.pos[0], fh.pos[2]]; });
const toward = Math.atan2(house[0] - coop[0], house[1] - coop[1]);
const cam = [coop[0] + Math.sin(toward) * 1.0, coop[1] + Math.cos(toward) * 1.0 + 0.6, 3.6];
let sent = false, sentAt = 0, outside = 0, endAt = 0;
for (let i = 0; i < 60 * FPS; i++) {
  st = await frame(cam);
  if (!sent && st.phase === 'climb' && st.task === 'sit' && st.canSend) sentAt = sentAt || i;          // sitting after the first peck
  if (process.env.END === 'sneeze') {                        // stop a second after the sneeze (no farmer)
    if (st.phase === 'climb' && st.task === 'sit') endAt = endAt || i + Math.round(1.0 * FPS);
    await shoot(); if (endAt && i >= endAt) break; continue;
  }
  if (!sent && sentAt && i >= sentAt + Math.round(0.8 * FPS)) {
    const r = await p.evaluate(() => { const e = document.getElementById('farmerbtn'), q = e.getBoundingClientRect(); e.click(); return [q.x + q.width / 2, q.y + q.height / 2]; });
    taps.push({ frame: n, x: r[0], y: r[1] }); sent = true;
  }
  await shoot();
  if (sent && st.state === 'fleeing' && !st.task.startsWith('leap') && st.phase) {
    const inside = await p.evaluate(() => window.__farm.visit().inPen());
    if (!inside) outside++;
    if (outside > 1.6 * FPS) break;
  }
  if (!st.active) break;
}
writeFileSync(out + '_taps.json', JSON.stringify(taps));
console.log('frames', n, 'taps', JSON.stringify(taps), 'errors', errs);
await b.close();

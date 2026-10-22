// A short video of the fox family: out of the den in single file, a little play close up, and home again one by one:
// node denvideo.mjs OUT [fps]   (frames OUT_0000.png ...; DPR=2 for a sharp video; OUT=den seconds etc. below)
// OUTS: seconds filming them come out (default 11); PLAY: seconds of play (8); HOME: seconds of going home (12)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'dv', fpsArg = '15'] = process.argv.slice(2);
const FPS = parseFloat(fpsArg), PER = Math.round(30 / FPS);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: parseFloat(process.env.DPR || '2'), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coops=5&foxes&time=16${process.env.LANG === 'fr' ? '&lang=fr' : ''}`);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#readout, #hint, #tag { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); });
let n = 0;
const shoot = () => p.screenshot({ path: `${out}_${String(n++).padStart(4, '0')}.png`, timeout: 240000 });
// one frame: step the farm, place the camera (fixed [x, z, size], or 'family' to follow them gently), draw
const frame = (cam) => p.evaluate(([per, cam]) => {
  const f = window.__farm, F = f.foxes(); f.step(1 / 30, per);
  if (cam === 'family') {
    const c = F.centre(new f.THREE.Vector3()); window.__cam = window.__cam || [c.x, c.z];
    window.__cam[0] += (c.x - window.__cam[0]) * 0.06; window.__cam[1] += (c.z - window.__cam[1]) * 0.06;
    f.lookAt(window.__cam[0] + 0.25, window.__cam[1] + 0.35, 1.9);
  } else f.lookAt(cam[0], cam[1], cam[2]);
  f.draw();
  return F.foxes.map(o => o.home ? 'H' : o.root.visible ? 'o' : '-').join('');
}, [PER, cam]);
const den = await p.evaluate(() => { const F = window.__farm.foxes(); const [x, z, h] = F.den; return [x + Math.sin(h) * 1.1 + 0.15, z + Math.cos(h) * 1.1 + 0.35]; });
for (let i = 0; i < parseFloat(process.env.OUTS || '11') * FPS; i++) { await frame([den[0], den[1], 1.75]); await shoot(); }
// play: a while later, close up on the family
await p.evaluate(() => { const f = window.__farm; f.step(1 / 30, 900); });
for (let i = 0; i < parseFloat(process.env.PLAY || '8') * FPS; i++) { await frame('family'); await shoot(); }
// home: the last of the day, one at a time into the den
await p.evaluate(() => { const f = window.__farm, F = f.foxes(); F.goHome(); f.step(1 / 30, 30 * parseFloat(window.SKIPHOME || '6')); });
for (let i = 0; i < parseFloat(process.env.HOME_S || '12') * FPS; i++) { const s = await frame([den[0] - 0.2, den[1] - 0.1, 1.9]); await shoot(); if (s === 'HHHHH') break; }
console.log('frames', n, 'errors', errs);
await b.close();

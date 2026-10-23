// Frames of the geese line-up, one pose at a time with both geese in view (the game's camera): node geesefilm.mjs OUT
// [poses] [seconds each] [fps]   (OUT_0000.png ...; poses: comma list of stand, walk, honk, graze, preen, wings, hiss, sleep)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'gf', posesArg = 'stand,walk,honk,graze,preen,wings,hiss,sleep', secs = '4', fpsArg = '15'] = process.argv.slice(2);
const FPS = +fpsArg, PER = Math.round(30 / FPS);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 402), height: +(process.env.H || 874) }, deviceScaleFactor: parseFloat(process.env.DPR || '2'), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=1&lineup=geese&time=14' + (process.env.LANG === 'fr' ? '&lang=fr' : ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag' + (process.env.CHROME ? '' : ', .top') + ' { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); });
const rows = ['stand', 'walk', 'honk', 'graze', 'preen', 'wings', 'hiss', 'sleep'];
let n = 0;
// each pose may be pose:cycle:start:seconds: first wait (not filmed) until her clock is at `start` in its `cycle` seconds
for (const spec of posesArg.split(',')) {
  const [pose, cycle, start, sec] = spec.split(':'), i = rows.indexOf(pose);
  if (cycle) await p.evaluate(([cy, st]) => { const f = window.__farm, g = f.geeseLineup().geese[0]; const w = (((st - g.clock) % cy) + cy) % cy; f.step(1 / 30, Math.round(w * 30)); }, [+cycle, +start]);
  for (let k = 0; k < +(sec || secs) * FPS; k++) {
    await p.evaluate(([i, per, size]) => {
      const f = window.__farm, L = f.geeseLineup(), T = f.THREE, a = L.geese[i * 2], h = L.geese[i * 2 + 1];
      for (const o of L.geese) o.root.visible = o === a || o === h;
      f.step(1 / 30, per);
      const c = a.rig.bones.body.getWorldPosition(new T.Vector3()).add(h.rig.bones.body.getWorldPosition(new T.Vector3())).multiplyScalar(0.5);
      const k = (c.y + 0.1) / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2;
      f.lookAt(c.x - k, c.z - k, size); f.draw();
    }, [i, PER, +(process.env.SIZE || 0.75)]);
    await p.screenshot({ path: `${out}_${String(n++).padStart(4, '0')}.png`, timeout: 120000 });
  }
}
console.log('frames', n, 'errors', errs);
await b.close();

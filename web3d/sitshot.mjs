// A hen sitting in each coop's nest, seen at the window (and the eggs once she's gone): node sitshot.mjs [size] [out] [pers]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [size = '0.55', out = 'sit', pers = 'mum'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 360, height: 360 }, deviceScaleFactor: 1.5 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top { display: none !important; }' });
for (let i = 0; i < 5; i++) {
  for (const when of ['sit', 'after']) {
    const ph = await p.evaluate(([i, s, pers, when]) => {
      const f = window.__farm, pl = f.plots[i], G = f.nestOf(pl); f.pause(true); f.freeze(true); f.noLaying();
      if (when === 'sit') { f.layAs(i, pers, 3); window.__h = pl.birds.find(b => b.laying); }
      const h = window.__h;
      for (let k = 0; k < 2400; k++) {
        f.step(1 / 30, 1);
        if (when === 'sit' && h.laying && h.laying.phase === 'sit' && h.laying.t > 1.2) break;
        if (when === 'after' && h.laying && (h.laying.phase === 'sing' || h.laying.phase === 'out' && h.laying.t > 3)) break;
      }
      for (const bd of pl.birds) if (bd !== h && Math.hypot(bd.root.position.x - G.win[0], bd.root.position.z - 0.6) < 0.5) { bd.root.position.set(1.3, 0, 2.1); bd.root.updateMatrixWorld(true); }
      const lh = (G.win[1] + G.win[2]) / 2, w = new f.THREE.Vector3(G.win[0], 0, 0.44); pl.frame.localToWorld(w);
      const k = lh / Math.tan(42 * Math.PI / 180);
      f.lookAt(w.x - Math.SQRT1_2 * k, w.z - Math.SQRT1_2 * k, s); f.draw();
      return h.laying ? h.laying.phase : 'free';
    }, [i, parseFloat(size), pers, when]);
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${out}_${i}_${when}.png` });
    console.log(i, when, ph);
  }
}
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

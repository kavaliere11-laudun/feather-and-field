// Does a hen on her way to lay ever go through the walls? A visit at each coop, sampled 30 times a second: every few vertices
// of her actual (posed) body are checked. A part of her that crosses the house's front wall must do so through the nest window
// or the pop door; nothing may cross the side walls; inside the nest, nothing through the cubby's right side.
// Reports, per coop, how many samples poked and the worst (how far, which phase).  Usage: node laycheck.mjs [pers ...]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const pers = process.argv.slice(2).length ? process.argv.slice(2) : ['diva', 'rebel'];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 300 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=3&coops=5');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
for (const who of pers) {
  const out = await p.evaluate((who) => {
    const f = window.__farm, T = f.THREE, W2 = 0.62, D2 = 0.44, lines = [];
    f.pause(true); f.noLaying();
    for (let i = 0; i < 5; i++) {
      const pl = f.plots[i], G = f.nestOf(pl), inv = new T.Matrix4().copy(pl.frame.matrixWorld).invert();
      f.layAs(i, who, 2); const h = pl.birds.find(b => b.laying), mesh = h.rig.mesh;
      // her body's own surface: the base layer (no fur shells), every third vertex
      const ft = mesh.geometry.getAttribute('furT'), idx = [];
      for (let k = 0; k < ft.count; k += 3) if (ft.getX(k) === 0) idx.push(k);
      const cubbyR = Math.min(G.win[0] + 0.17, 0.6);
      const inOpening = (x, y) => (Math.abs(x - G.win[0]) < G.win[3] / 2 + 0.005 && y > G.win[1] - 0.005 && y < G.win[2] + 0.005) ||
                                  (Math.abs(x + 0.31) < 0.15 + 0.005 && y > G.house - 0.005 && y < G.house + 0.465);
      let n = 0, worst = 0, when = '-'; const ph = {};
      const v = new T.Vector3(), c = new T.Vector3(), M = new T.Matrix4();
      for (let s = 0; s < 30 * 45 && h.laying; s++) {
        f.step(1 / 30, 1);
        const L = h.laying; if (!L || ['go', 'aim', 'sing'].includes(L.phase)) continue;
        h.root.updateMatrixWorld(true); mesh.skeleton.update();
        M.multiplyMatrices(inv, mesh.matrixWorld);
        h.rig.bones.body.getWorldPosition(c); c.applyMatrix4(inv);
        let bad = 0;
        for (const k of idx) {
          mesh.getVertexPosition(k, v); v.applyMatrix4(M);
          let d = 0;
          if (Math.abs(v.x) > W2 && Math.abs(v.z) < D2) d = Math.abs(v.x) - W2;                        // out through a side wall
          if ((c.z - D2) * (v.z - D2) < 0) {                                                       // crosses the front wall
            const t = (D2 - c.z) / (v.z - c.z), x = c.x + (v.x - c.x) * t, y = c.y + (v.y - c.y) * t;
            if (!inOpening(x, y)) d = Math.max(d, Math.abs(v.z - D2));
          }
          if (L.inside && c.z < D2 && c.x > G.win[0] - 0.33 && v.x > cubbyR && v.z < D2 && v.z > D2 - 0.44 && v.y > G.floor) d = Math.max(d, v.x - cubbyR);
          bad = Math.max(bad, d);
        }
        if (bad > 0.01) { n++; const e = ph[L.phase] || (ph[L.phase] = [0, 0]); e[0]++; e[1] = Math.max(e[1], bad); if (bad > worst) { worst = bad; when = L.phase + ' @' + L.t.toFixed(2) + 's'; } }
      }
      lines.push(`${who} ${pl.breed}: ${n} samples poke, worst ${(worst * 100).toFixed(1)} cm (${when})` + (n ? '  [' + Object.entries(ph).map(([k, e]) => k + ' ' + e[0] + 'x ' + (e[1] * 100).toFixed(0) + 'cm').join(', ') + ']' : ''));
      for (let s = 0; s < 30 * 30 && h.laying; s++) f.step(1 / 30, 1);
    }
    return lines.join('\n');
  }, who);
  console.log(out);
}
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

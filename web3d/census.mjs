// Which things the camera draws, and how many triangles each costs (for finding what is heavy).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'http://localhost:8770/index.html?q=0';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1 });
await p.goto(url);
await p.waitForFunction(() => window.__farm && window.__farm.plots.length > 0, null, { timeout: 120000 });
await p.waitForTimeout(1000);
const r = await p.evaluate((look) => {
  const f = window.__farm, T = f.THREE;
  if (look) f.lookAt(...look);
  f.camera.updateMatrixWorld();
  const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(f.camera.projectionMatrix, f.camera.matrixWorldInverse));
  const tally = {};
  f.scene.traverseVisible(o => {
    if (!o.isMesh) return;
    const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    const s = (o.isInstancedMesh && o.boundingSphere ? o.boundingSphere.clone() : g.boundingSphere.clone()).applyMatrix4(o.matrixWorld);
    if (o.frustumCulled && !fr.intersectsSphere(s)) return;
    const tris = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
    let n = o.name || (o.parent && o.parent.name) || o.geometry.type;
    if (o.isInstancedMesh) n = 'batch:' + (o.userData.model || n);
    tally[n] = tally[n] || [0, 0]; tally[n][0] += tris; tally[n][1]++;
  });
  return Object.entries(tally).sort((a, b) => b[1][0] - a[1][0]).slice(0, 25).map(([k, v]) => k + ' ' + Math.round(v[0] / 1000) + 'k x' + v[1]);
}, process.argv[3] ? JSON.parse(process.argv[3]) : null);
console.log(r.join('\n'));
await b.close();

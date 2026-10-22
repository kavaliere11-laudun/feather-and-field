// The foxes against their den's bank, coming out and going in: node denclip.mjs [rounds]
// The den's earth is mapped once as columns 2 cm apart (every surface a ray down meets, and which way it faces). A point of a
// fox's posed body is inside the earth when the first surface above it faces up (it is under the bank, not in the tunnel).
// Prints how many frames had a fox in the bank near the tunnel's mouth (where it would show), how deep at most (up to the
// surface above), and in which moves and parts; deeper in, the tunnel is dark and the bank hides it (counted apart).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const rounds = +(process.argv[2] || 2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 200, height: 300 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=3&coops=5&foxes&time=16`);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
const r = await p.evaluate((rounds) => {
  const f = window.__farm, F = f.foxes(), THREE = f.THREE; f.pause(true);
  let den = null; F.scene.traverse(o => { if (!den && o.name === 'den') den = o; });
  const meshes = []; den.traverse(o => { if (o.isMesh) { meshes.push(o); for (const m of [].concat(o.material)) m.side = THREE.DoubleSide; } });
  den.updateMatrixWorld(true);
  const inv = den.matrixWorld.clone().invert(), box = new THREE.Box3().setFromObject(den);
  // the columns, in the den's own frame
  const lb = box.clone().applyMatrix4(inv), step = 0.02, nx = Math.ceil((lb.max.x - lb.min.x) / step) + 1, nz = Math.ceil((lb.max.z - lb.min.z) / step) + 1;
  const cols = new Array(nx * nz), rc = new THREE.Raycaster(), o = new THREE.Vector3(), down = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    o.set(lb.min.x + i * step, lb.max.y + 0.5, lb.min.z + k * step).applyMatrix4(den.matrixWorld);
    down.set(0, -1, 0); rc.set(o, down);
    const hits = rc.intersectObjects(meshes, false).map(h => { nm.getNormalMatrix(h.object.matrixWorld); const n = h.face.normal.clone().applyMatrix3(nm).normalize(); return [h.point.y, n.y]; });
    cols[i * nz + k] = hits.sort((a, b) => a[0] - b[0]);
  }
  const inside = (w) => {
    const l = w.clone().applyMatrix4(inv), i = Math.round((l.x - lb.min.x) / step), k = Math.round((l.z - lb.min.z) / step);
    if (i < 0 || k < 0 || i >= nx || k >= nz) return 0;
    const c = cols[i * nz + k]; for (const [y, ny] of c) if (y > w.y) return ny > 0.05 ? y - w.y : 0;
    return 0;
  };
  const v = new THREE.Vector3(), stats = { frames: 0, hitFrames: 0, deep: 0, hidden: 0, where: {} };
  const check = () => {
    let any = false;
    for (const fox of F.foxes) {
      if (!fox.root.visible) continue;
      const mesh = fox.q.mesh, g = mesh.geometry, ft = g.attributes.furT.array; let n = 0; while (n < ft.length && ft[n] === 0) n++;
      if (fox.root.position.distanceTo(den.position) > 2.2) continue;
      fox.root.updateMatrixWorld(true); mesh.skeleton.update();
      const task = fox.task && fox.task.cur ? fox.task.cur() : fox.task, name = fox.name + ':' + (task ? task.name : '-');
      for (let i = 0; i < n; i += 2) {
        mesh.getVertexPosition(i, v); mesh.localToWorld(v);
        if (v.y < 0.03 || !box.containsPoint(v)) continue;
        const d = inside(v);
        if (d > 0.004) {
          // deep in the tunnel it's dark and out of sight; near the mouth (the last 30 cm) it would show
          const lx = v.clone().applyMatrix4(inv).x, near = lx > 0.32;
          if (near) { any = true; stats.deep = Math.max(stats.deep, d); } else stats.hidden++;
          const key = name + '/' + mesh.skeleton.bones[g.attributes.skinIndex.array[i * 4]].name + (near ? '@mouth' : '@deep');
          stats.where[key] = Math.max(stats.where[key] || 0, +d.toFixed(3));
        }
      }
    }
    stats.frames++; if (any) stats.hitFrames++;
  };
  for (let rd = 0; rd < rounds; rd++) {
    if (rd > 0) { F.comeOut(); }
    for (let k = 0; k < 30 * 14; k++) { f.step(1 / 30, 1); if (k % 2 === 0) check(); }        // out of the den
    F.goHome();
    for (let k = 0; k < 30 * 40 && !F.foxes.every(x => x.home); k++) { f.step(1 / 30, 1); if (k % 2 === 0) check(); }   // and back in
    F.out = false; F.leaving = false;
  }
  stats.deep = +stats.deep.toFixed(3); stats.home = F.foxes.filter(x => x.home).length;
  return stats;
}, rounds);
console.log(`den: ${r.hitFrames} of ${r.frames} frames with a fox in the bank near the mouth, deepest ${r.deep} m (${r.hidden} points deep in the dark tunnel), home ${r.home}/5`);
console.log(JSON.stringify(r.where, null, 0));
if (errs.length) console.log('ERRORS', errs);
await b.close();

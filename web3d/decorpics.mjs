// The shop's pictures of the decorations (1 Nov 2026, the decorations rebuilt with the coops' detail: their pictures from
// the game's own models, not the first game's): ./withserver.sh node decorpics.mjs [OUT]   (OUT: a folder, default decor/;
// ONLY=windmill,bandstand: just those; H: the pictures' height in pixels, 300)
// Each decoration as it stands in the test village, everything else hidden, shot from the usual side a little above it,
// on black and then on white and cut out from the two shots (see-through round it), cropped round it with a little room,
// shrunk to H high and saved as <id>.webp. The windmill with its sails.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'fs';
const OUT = process.argv[2] || 'decor', H = +(process.env.H || 300);
const ALL = ['flowers', 'birdbath', 'beehives', 'duckhouse', 'greenhouse', 'windmill', 'bandstand', 'statue'];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : ALL;
const CAM = { windmill: { el: 16, fov: 22 }, statue: { el: 22, fov: 22 }, bandstand: { el: 24, fov: 22 } };
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&time=11:00&nolife`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.setHour(11); f.draw(); });
for (const id of ONLY) {
  const res = await p.evaluate(([id, C, H]) => {
    const f = window.__farm, T = f.THREE, d = f.props().find(o => o.model === id); if (!d) return null;
    const keep = new Set(); f.scene.traverse(o => { if (o.userData && o.userData.model === id) o.traverse(c => keep.add(c)); });
    if (id === 'windmill') f.scene.traverse(o => { if (o.isGroup && o.children[0] && o.children[0].name === 'sails') o.traverse(c => keep.add(c)); });
    const hidden = []; f.scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && !keep.has(o)) { o.visible = false; hidden.push(o); } });
    // (the instanced batch: only its instance standing here kept, the others moved far away for the shot)
    const moved = []; for (const o of keep) if (o.isInstancedMesh) { const m = new T.Matrix4(), v = new T.Vector3(); for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); v.setFromMatrixPosition(m); if (Math.hypot(v.x - d.pos[0], v.z - d.pos[2]) > 0.5) { moved.push([o, i, m.clone()]); m.setPosition(v.x, -500, v.z); o.setMatrixAt(i, m); o.instanceMatrix.needsUpdate = true; } } }
    const bb = new T.Box3(); bb.setFromCenterAndSize(new T.Vector3(d.pos[0], 0, d.pos[2]), new T.Vector3(0.1, 0.1, 0.1));
    for (const o of keep) if (o.isMesh && !o.isInstancedMesh) { o.updateMatrixWorld(true); bb.union(new T.Box3().setFromObject(o)); }
    const top = id === 'windmill' ? 9.6 : (d.h || 2), cen = new T.Vector3(d.pos[0], top * 0.45, d.pos[2]);
    const cv = f.renderer.domElement, W = cv.width, Hh = cv.height, c = C[id] || { el: 26, fov: 22 }, D = Math.PI / 180;
    const cam = new T.PerspectiveCamera(c.fov, W / Hh, 0.1, 400);
    const dir = new T.Vector3(0, Math.sin(c.el * D), Math.cos(c.el * D)).applyAxisAngle(new T.Vector3(0, 1, 0), 45 * D);
    const size = Math.max(top, (d.w || 2) * 1.1); cam.position.copy(cen).addScaledVector(dir, size * 0.62 / Math.tan(c.fov * D / 2)); cam.lookAt(cen); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const bg = f.scene.background.clone(), shots = [];
    for (const k of [0, 1]) { f.scene.background = new T.Color(k, k, k); f.renderer.shadowMap.needsUpdate = true; f.renderer.render(f.scene, cam);
      const s = document.createElement('canvas'); s.width = W; s.height = Hh; s.getContext('2d').drawImage(cv, 0, 0); shots.push(s.getContext('2d').getImageData(0, 0, W, Hh).data); }
    f.scene.background = bg; for (const o of hidden) o.visible = true; for (const [o, i, m] of moved) { o.setMatrixAt(i, m); o.instanceMatrix.needsUpdate = true; }
    const [K, Wt] = shots, img = new ImageData(W, Hh), px = img.data; let x0 = W, y0 = Hh, x1 = 0, y1 = 0;
    for (let i = 0, n = 0; i < K.length; i += 4, n++) {
      const a = Math.max(0, Math.min(1, 1 - ((Wt[i] - K[i]) + (Wt[i + 1] - K[i + 1]) + (Wt[i + 2] - K[i + 2])) / 765)); if (a < 1 / 255) continue;
      px[i] = Math.min(255, K[i] / a); px[i + 1] = Math.min(255, K[i + 1] / a); px[i + 2] = Math.min(255, K[i + 2] / a); px[i + 3] = Math.round(a * 255);
      if (a > 0.05) { const x = n % W, y = (n / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const full = document.createElement('canvas'); full.width = W; full.height = Hh; full.getContext('2d').putImageData(img, 0, 0);
    const m = Math.round(0.04 * (y1 - y0)), sx = Math.max(0, x0 - m), sy = Math.max(0, y0 - m), sw = Math.min(W - sx, x1 - x0 + 2 * m), sh = Math.min(Hh - sy, y1 - y0 + 2 * m);
    let src = full, rect = [sx, sy, sw, sh];
    while (rect[3] / 2 >= H * 1.4) { const h = document.createElement('canvas'); h.width = Math.round(rect[2] / 2); h.height = Math.round(rect[3] / 2); const g = h.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, ...rect, 0, 0, h.width, h.height); src = h; rect = [0, 0, h.width, h.height]; }
    const o = document.createElement('canvas'); o.height = H; o.width = Math.round(H * rect[2] / rect[3]); const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, ...rect, 0, 0, o.width, o.height);
    return { webp: o.toDataURL('image/webp', 0.9), size: [o.width, o.height], kept: keep.size };
  }, [id, CAM, H]);
  if (!res) { console.log(id, 'not in the village'); continue; }
  writeFileSync(`${OUT}/${id}.webp`, Buffer.from(res.webp.split(',')[1], 'base64'));
  console.log(id, res.size.join('x'), 'kept', res.kept);
}
console.log('page errors', errs.length, errs.slice(0, 2));
await b.close();

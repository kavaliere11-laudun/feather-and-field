// The app icon's birds (1 Nov 2026; Audrey: "We need to work on the icon of the game too"): the game's own birds from the
// test page's line-up (index.html?lineup), posed and cut out as the Breed Book's pictures are (bookpics.mjs: shot on black
// and on white, the see-through worked out from the two), at full size, for app/icons.py to set on the icon's backgrounds.
//   ./withserver.sh node iconpics.mjs OUT   (ONLY=roo,sil,trio: which; PNGs with see-through, cropped round the birds)
// Each SHOT: the birds (breed, kind, colour), where they stand (metres, +z towards the camera), which way they face (yaw:
// 0 at the camera, less to the left of the picture), their pose (posterPose: crow, proud, lookYaw, lookTilt...), and the
// camera (elevation, azimuth, distance, field of view, where it looks). The birds are only stood and posed: no model,
// colour or look is changed.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/iconpics';
mkdirSync(OUT, { recursive: true });
const SHOTS = {
  // the Rhode Island Red rooster crowing, three-quarters on, chest out
  roo: { birds: [{ breed: 'rir', kind: 'rooster', x: 0, z: 0, yaw: -0.75, pose: { crow: 1, proud: 0.6, lookYaw: 0.1, lookTilt: 0 } }],
    cam: { el: 8, az: 0, dist: 7, fov: 7.6, at: [0, 0.26, 0] } },
  // the Rhode Island Red rooster's head and shoulders, proud, looking round at you
  roohead: { birds: [{ breed: 'rir', kind: 'rooster', x: 0, z: 0, yaw: -0.9, pose: { proud: 0.7, lookYaw: 0.55, lookTilt: -0.05 } }],
    cam: { el: 6, az: 0, dist: 7, fov: 3.4, at: [-0.03, 0.47, 0] } },
  // the white Silkie hen, facing you, her head a little to one side
  sil: { birds: [{ breed: 'sil', colour: 'white', kind: 'hen', x: 0, z: 0, yaw: -0.25, pose: { lookYaw: 0.25, lookTilt: 0.12 } }],
    cam: { el: 10, az: 0, dist: 7, fov: 4.2, at: [0, 0.14, 0] } },
  // the trio: the rooster behind, his two hens in front either side (the line-up has one hen of a breed: each bird shot on
  // its own, trio_0..2.png, back to front, put together by icons.py)
  trio: { apart: true, birds: [
      { breed: 'rir', kind: 'rooster', x: 0.02, z: -0.12, yaw: -0.5, pose: { proud: 0.6, lookYaw: 0.2, lookTilt: -0.02 } },
      { breed: 'rir', kind: 'hen', n: 0, x: -0.17, z: 0.1, yaw: -1.0, pose: { lookYaw: 0.35, lookTilt: 0.05 } },
      { breed: 'rir', kind: 'hen', n: 1, x: 0.2, z: 0.12, yaw: 0.9, pose: { lookYaw: -0.35, lookTilt: 0.05 } }],
    cam: { el: 9, az: 0, dist: 7, fov: 9, at: [0.02, 0.2, 0] } },
};
const ONLY = (process.env.ONLY || Object.keys(SHOTS).join(',')).split(',');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup&coops=0&time=12:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
for (const name of ONLY) for (const [k, one] of (SHOTS[name].apart ? SHOTS[name].birds.map((x, i) => [i, { ...SHOTS[name], birds: [x] }]) : [[-1, SHOTS[name]]])) {
  const res = await p.evaluate(S => {
    const f = window.__farm, T = f.THREE, line = f.allBirds.filter(x => x.plot.kind === 'lineup');
    f.pause(true);
    const used = new Set(), cast = S.birds.map(s => { const x = line.find(q => !used.has(q) && q.breed === s.breed && q.kind === s.kind && (!s.colour || q.colour === s.colour)); used.add(x); return [x, s]; });
    for (const x of line) x.root.visible = used.has(x);
    const stand = () => { for (const [x, s] of cast) { x.root.position.set(s.x, 0.015, s.z); x.root.rotation.y = s.yaw; x.target.copy(x.root.position); x.act = null; x.hopT = -1;
      x.posterPose = A => Object.assign(A, { walk: 0, peck: 0, sit: 0, kick: 0, flap: 0, crow: 0, ruffle: 0, hopT: -1, wag: 0, turn: 0, sing: 0, cluck: 0, kawk: 0, brood: 0, duck: 0, stretch: 0, sleep: 0, proud: 0, lookYaw: 0, lookTilt: 0, ...s.pose }); } };
    stand();
    const frame = cast[0][0].plot.frame; frame.updateMatrixWorld(true);
    const at = frame.localToWorld(new T.Vector3(...S.cam.at));
    f.view.min = 0.2; f.lookAt(at.x, at.z, 0.5);
    f.step(1 / 30, 45); f.draw(); stand(); f.step(1 / 30, 2); f.draw();
    const keep = new Set(); for (const [x] of cast) x.root.traverse(o => keep.add(o));
    const blobs = o => o.isInstancedMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.material && o.material.map;
    const hidden = [];
    f.scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && !keep.has(o) && !blobs(o)) { o.visible = false; hidden.push(o); } });
    const cv = f.renderer.domElement, W = cv.width, H = cv.height;
    const cam = new T.PerspectiveCamera(S.cam.fov, W / H, 0.1, 200), D = Math.PI / 180;
    const dir = new T.Vector3(0, Math.sin(S.cam.el * D), Math.cos(S.cam.el * D)).applyAxisAngle(new T.Vector3(0, 1, 0), frame.rotation.y + S.cam.az * D);
    cam.position.copy(at).addScaledVector(dir, S.cam.dist); cam.lookAt(at); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const bg = f.scene.background.clone(), shots = [];
    for (const c of [0, 1]) {
      f.scene.background = new T.Color(c, c, c); f.renderer.shadowMap.needsUpdate = true;
      f.renderer.render(f.scene, cam);
      const s = document.createElement('canvas'); s.width = W; s.height = H; s.getContext('2d').drawImage(cv, 0, 0); shots.push(s.getContext('2d').getImageData(0, 0, W, H).data);
    }
    f.scene.background = bg; for (const o of hidden) o.visible = true; for (const x of line) x.root.visible = true;
    const [K, Wt] = shots, img = new ImageData(W, H), px = img.data;
    for (let i = 0; i < K.length; i += 4) {
      const a = Math.max(0, Math.min(1, 1 - ((Wt[i] - K[i]) + (Wt[i + 1] - K[i + 1]) + (Wt[i + 2] - K[i + 2])) / 765));
      if (a < 1 / 255) continue;
      px[i] = Math.min(255, K[i] / a); px[i + 1] = Math.min(255, K[i + 1] / a); px[i + 2] = Math.min(255, K[i + 2] / a); px[i + 3] = Math.round(a * 255);
    }
    const full = document.createElement('canvas'); full.width = W; full.height = H; full.getContext('2d').putImageData(img, 0, 0);
    return { names: cast.map(([x]) => x.name), png: full.toDataURL('image/png') };
  }, one);
  const file = k < 0 ? name : `${name}_${k}`;
  writeFileSync(`${OUT}/${file}.png`, Buffer.from(res.png.split(',')[1], 'base64'));
  console.log(file, res.names.join(', '));
}
console.log('errors', errs);
await b.close();

// The Breed Book's pictures (release 1 step 8): ./withserver.sh node bookpics.mjs [OUT]   (OUT: a folder, default book/;
// SIZE: the pictures' side in pixels, 320; PREVIEW: a folder for PNG previews on the book's own backgrounds, found and not)
// Each breed's rooster and hen are the game's own birds from the test page's line-up (index.html?lineup; the Silkies the
// white ones), stood together on their own: the hen in front on the left, the rooster beside her a step behind, chest
// out, both turned to the left and looking round at you. Everything else hidden, they're shot through a long lens a little above
// them, on black and then on white, and cut out from the two shots (so their fur's soft edges and their soft shadow on the
// ground come out see-through), cropped round them, shrunk to SIZE x SIZE and saved as <breed>.webp. The birds are only
// stood and posed for the picture: no model, colour or look is changed.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
const OUT = process.argv[2] || fileURLToPath(new URL('./book/', import.meta.url));
const SIZE = +(process.env.SIZE || 320), PREVIEW = process.env.PREVIEW || '';
const BREEDS = ['rir', 'orp', 'sil', 'leg', 'bra'];
// the pair's places on the line-up's ground (metres; +z towards the camera), which way each faces (0: at the camera; less:
// turned to the left of the picture), the head turned (lookYaw) and tilted, and the camera
const STAGE = { hen: { x: -0.07, z: 0.1, yaw: -1.0, look: 0.32, tilt: 0.05 }, roo: { x: 0.12, z: -0.1, yaw: -0.82, look: 0.22, tilt: -0.03, proud: 0.5 },
  cam: { el: 9, az: 0, dist: 7, fov: 10, at: [0.03, 0.22, 0] }, margin: 0.05 };
// (the round, fluffy Silkies a little further apart, so the two of them read as two)
const APART = { sil: { hen: { x: -0.125, z: 0.12 }, roo: { x: 0.14, z: -0.11 } } };
mkdirSync(OUT, { recursive: true }); if (PREVIEW) mkdirSync(PREVIEW, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup&coops=0&time=12:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
for (const breed of BREEDS) {
  const res = await p.evaluate(([breed, S, SIZE]) => {
    const f = window.__farm, T = f.THREE, line = f.allBirds.filter(x => x.plot.kind === 'lineup');
    f.pause(true);
    const pick = kind => line.find(x => x.breed === breed && x.kind === kind && (breed !== 'sil' || x.colour === 'white'));
    const hen = pick('hen'), roo = pick('rooster');
    // stood together, posed (held each frame, as the welcome picture's birds), everyone else out of sight
    const stand = (x, s) => {
      x.root.position.set(s.x, 0.015, s.z); x.root.rotation.y = s.yaw; x.target.copy(x.root.position); x.act = null; x.hopT = -1;
      x.posterPose = A => Object.assign(A, { walk: 0, peck: 0, sit: 0, kick: 0, flap: 0, crow: 0, ruffle: 0, hopT: -1, wag: 0, turn: 0, sing: 0, cluck: 0, kawk: 0,
        brood: 0, duck: 0, stretch: 0, sleep: 0, proud: s.proud || 0, lookYaw: s.look, lookTilt: s.tilt });
    };
    for (const x of line) x.root.visible = x === hen || x === roo;
    stand(hen, S.hen); stand(roo, S.roo);
    const frame = hen.plot.frame; frame.updateMatrixWorld(true);
    const at = frame.localToWorld(new T.Vector3(...S.cam.at));
    f.view.min = 0.2; f.lookAt(at.x, at.z, 0.5);              // (the finest fur, the full models)
    f.step(1 / 30, 45); f.draw();
    for (const x of [hen, roo]) { x.root.position.set(x === hen ? S.hen.x : S.roo.x, 0.015, x === hen ? S.hen.z : S.roo.z); x.root.rotation.y = x === hen ? S.hen.yaw : S.roo.yaw; }
    f.step(1 / 30, 2); f.draw();
    const keep = new Set(); for (const x of [hen, roo]) x.root.traverse(o => keep.add(o));
    const blobs = o => o.isInstancedMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.material && o.material.map;     // (the birds' soft shadows)
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
    // cut out: on black a pixel is a*colour, on white a*colour + (1 - a)
    const [K, Wt] = shots, img = new ImageData(W, H), px = img.data;
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let i = 0, n = 0; i < K.length; i += 4, n++) {
      const a = Math.max(0, Math.min(1, 1 - ((Wt[i] - K[i]) + (Wt[i + 1] - K[i + 1]) + (Wt[i + 2] - K[i + 2])) / 765));
      if (a < 1 / 255) continue;
      px[i] = Math.min(255, K[i] / a); px[i + 1] = Math.min(255, K[i + 1] / a); px[i + 2] = Math.min(255, K[i + 2] / a); px[i + 3] = Math.round(a * 255);
      if (a > 0.04) { const x = n % W, y = (n / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const full = document.createElement('canvas'); full.width = W; full.height = H; full.getContext('2d').putImageData(img, 0, 0);
    // a square round them (a little room all round), shrunk in halves for smooth edges
    let side = Math.ceil(Math.max(x1 - x0, y1 - y0) * (1 + 2 * S.margin)); side = Math.min(side, W, H);
    const sx = Math.max(0, Math.min(W - side, Math.round((x0 + x1 - side) / 2))), sy = Math.max(0, Math.min(H - side, Math.round((y0 + y1 - side) / 2)));
    let src = full, rect = [sx, sy, side, side];
    while (rect[2] / 2 >= SIZE * 1.4) {
      const h = document.createElement('canvas'); h.width = h.height = Math.round(rect[2] / 2);
      const g = h.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, ...rect, 0, 0, h.width, h.height);
      src = h; rect = [0, 0, h.width, h.height];
    }
    const o = document.createElement('canvas'); o.width = o.height = SIZE;
    const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, ...rect, 0, 0, SIZE, SIZE);
    // previews: on the book's own backgrounds, found and (a dark silhouette) not yet
    const prev = dark => { const c = document.createElement('canvas'); c.width = c.height = SIZE; const q = c.getContext('2d');
      const gr = q.createRadialGradient(SIZE / 2, SIZE * 0.8, 0, SIZE / 2, SIZE * 0.8, SIZE * 0.9);
      if (dark) { gr.addColorStop(0, '#f8f9f3'); gr.addColorStop(1, '#e4e9db'); } else { gr.addColorStop(0, '#fffbea'); gr.addColorStop(0.4, '#f6f1dc'); gr.addColorStop(1, '#dbe7c6'); }
      q.fillStyle = gr; q.fillRect(0, 0, SIZE, SIZE); if (dark) q.filter = 'brightness(0) opacity(0.4)'; q.drawImage(o, 0, 0); return c.toDataURL('image/png'); };
    return { names: [hen.name, roo.name], crop: [sx, sy, side, W, H], webp: o.toDataURL('image/webp', 0.9), found: prev(false), not: prev(true) };
  }, [breed, { ...STAGE, hen: { ...STAGE.hen, ...(APART[breed] || {}).hen }, roo: { ...STAGE.roo, ...(APART[breed] || {}).roo } }, SIZE]);
  const buf = Buffer.from(res.webp.split(',')[1], 'base64');
  writeFileSync(OUT + '/' + breed + '.webp', buf);
  if (PREVIEW) { writeFileSync(PREVIEW + '/' + breed + '.png', Buffer.from(res.found.split(',')[1], 'base64')); writeFileSync(PREVIEW + '/' + breed + '_no.png', Buffer.from(res.not.split(',')[1], 'base64')); }
  console.log(breed, (buf.length / 1024).toFixed(1) + ' KB', 'crop', res.crop.join(' '));
}
console.log('errors', errs);
await b.close();

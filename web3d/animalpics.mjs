// The shop's animal pictures (release 3): ./withserver.sh node animalpics.mjs [OUT]   (OUT: a folder, default decor/; PREVIEW:
// a folder for PNG previews on the shop card's background)
// The geese (decor/geese.webp): Gertrude and Hector from the geese line-up (index.html?lineup=geese), stood together on their
// own: Gertrude in front on the left looking round at you, Hector a step behind on the right flapping his wings.
// Everything else hidden, they're shot through a long lens a little above them, on black and then on white, and cut out
// from the two shots (as the Breed Book's pictures, bookpics.mjs), cropped round them and saved 366 x 300 like the
// decorations' pictures. The geese are only stood and posed for the picture: no model, colour or look is changed.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
const OUT = process.argv[2] || fileURLToPath(new URL('./decor/', import.meta.url));
const PREVIEW = process.env.PREVIEW || '', W0 = 366, H0 = 300;
// where each stands on the line-up's ground (metres, its own frame: +z towards the camera), the way each faces (0: at the
// camera; less: turned to the left of the picture), the pose (the line-up's) and how far into it; the camera
const STAGE = { g: { pose: 'stand', x: -0.2, z: 0.16, h: -1.2, at: 3.0 }, h: { pose: 'wings', x: 0.26, z: -0.2, h: -0.8, at: 1.6 },
  cam: { el: 24, dist: 11, fov: 9, at: [0.03, 0.36, 0] }, margin: 0.1 };
if (process.env.STAGE) { const o = JSON.parse(process.env.STAGE); for (const k of Object.keys(o)) Object.assign(STAGE[k], typeof o[k] === 'object' ? o[k] : { v: o[k] }); if ('margin' in o) STAGE.margin = o.margin; }      // (other places or poses to try)
mkdirSync(OUT, { recursive: true }); if (PREVIEW) mkdirSync(PREVIEW, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coops=0&lineup=geese&time=12:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
const res = await p.evaluate(([S, W0, H0]) => {
  const f = window.__farm, T = f.THREE, L = f.geeseLineup(), all = L.geese;
  f.pause(true);
  const G = all.find(g => g.kind === 'embden' && g.linePose === S.g.pose), H = all.find(g => g.kind === 'toulouse' && g.linePose === S.h.pose);
  for (const g of all) g.root.visible = g === G || g === H;
  const stand = (g, s) => { g.pos.set(s.x, 0, s.z); g.heading = s.h; };
  stand(G, S.g); stand(H, S.h);
  f.view.min = 0.2; L.group.updateMatrixWorld(true);
  const at = L.group.localToWorld(new T.Vector3(...S.cam.at));
  f.lookAt(at.x, at.z, 0.5);                                // (the finest feathers)
  // into each pose to the moment wanted (their clocks set, then a few steps for the joints to settle there)
  for (const [g, s] of [[G, S.g], [H, S.h]]) g.clock = s.at - 0.5 + (g.kind === 'toulouse' ? 0.55 : 0);
  for (let i = 0; i < 15; i++) { for (const [g, s] of [[G, S.g], [H, S.h]]) { stand(g, s); } f.step(1 / 30, 1); }
  f.draw();
  const keep = new Set(); for (const g of [G, H]) g.root.traverse(o => keep.add(o));
  const hidden = [];
  f.scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && !keep.has(o)) { o.visible = false; hidden.push(o); } });
  const cv = f.renderer.domElement, W = cv.width, H2 = cv.height;
  const cam = new T.PerspectiveCamera(S.cam.fov, W / H2, 0.1, 200), D = Math.PI / 180;
  const dir = new T.Vector3(0, Math.sin(S.cam.el * D), Math.cos(S.cam.el * D)).applyAxisAngle(new T.Vector3(0, 1, 0), L.group.rotation.y);
  cam.position.copy(at).addScaledVector(dir, S.cam.dist); cam.lookAt(at); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const bg = f.scene.background.clone(), shots = [];
  for (const c of [0, 1]) {
    f.scene.background = new T.Color(c, c, c); f.renderer.shadowMap.needsUpdate = true;
    f.renderer.render(f.scene, cam);
    const s = document.createElement('canvas'); s.width = W; s.height = H2; s.getContext('2d').drawImage(cv, 0, 0); shots.push(s.getContext('2d').getImageData(0, 0, W, H2).data);
  }
  f.scene.background = bg; for (const o of hidden) o.visible = true; for (const g of all) g.root.visible = true;
  // cut out: on black a pixel is a*colour, on white a*colour + (1 - a)
  const [K, Wt] = shots, img = new ImageData(W, H2), px = img.data;
  let x0 = W, y0 = H2, x1 = 0, y1 = 0;
  for (let i = 0, n = 0; i < K.length; i += 4, n++) {
    const a = Math.max(0, Math.min(1, 1 - ((Wt[i] - K[i]) + (Wt[i + 1] - K[i + 1]) + (Wt[i + 2] - K[i + 2])) / 765));
    if (a < 1 / 255) continue;
    px[i] = Math.min(255, K[i] / a); px[i + 1] = Math.min(255, K[i + 1] / a); px[i + 2] = Math.min(255, K[i + 2] / a); px[i + 3] = Math.round(a * 255);
    if (a > 0.04) { const x = n % W, y = (n / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const full = document.createElement('canvas'); full.width = W; full.height = H2; full.getContext('2d').putImageData(img, 0, 0);
  // a box of the picture's shape round them (a little room all round), shrunk in halves for smooth edges
  const k = W0 / H0; let bw = (x1 - x0) * (1 + 2 * S.margin), bh = (y1 - y0) * (1 + 2 * S.margin);
  if (bw / bh > k) bh = bw / k; else bw = bh * k;
  bw = Math.min(Math.round(bw), W); bh = Math.min(Math.round(bh), H2);
  const sx = Math.max(0, Math.min(W - bw, Math.round((x0 + x1 - bw) / 2))), sy = Math.max(0, Math.min(H2 - bh, Math.round((y0 + y1 - bh) / 2)));
  let src = full, rect = [sx, sy, bw, bh];
  while (rect[2] / 2 >= W0 * 1.4) {
    const h = document.createElement('canvas'); h.width = Math.round(rect[2] / 2); h.height = Math.round(rect[3] / 2);
    const g = h.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, ...rect, 0, 0, h.width, h.height);
    src = h; rect = [0, 0, h.width, h.height];
  }
  const o = document.createElement('canvas'); o.width = W0; o.height = H0;
  const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, ...rect, 0, 0, W0, H0);
  const prev = (() => { const c = document.createElement('canvas'); c.width = W0; c.height = H0; const q = c.getContext('2d'); q.fillStyle = '#fbf6e9'; q.fillRect(0, 0, W0, H0); q.drawImage(o, 0, 0); return c.toDataURL('image/png'); })();
  return { names: [G.name, H.name], crop: [sx, sy, bw, bh, W, H2], webp: o.toDataURL('image/webp', 0.9), prev };
}, [STAGE, W0, H0]);
const buf = Buffer.from(res.webp.split(',')[1], 'base64');
writeFileSync(OUT + '/geese.webp', buf);
if (PREVIEW) writeFileSync(PREVIEW + '/geese.png', Buffer.from(res.prev.split(',')[1], 'base64'));
console.log('geese', res.names.join(' and '), (buf.length / 1024).toFixed(1) + ' KB', 'crop', res.crop.join(' '));
console.log('errors', errs);
await b.close();

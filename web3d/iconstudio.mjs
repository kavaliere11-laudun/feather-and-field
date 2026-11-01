// The app icon's photo (1 Nov 2026; Audrey, of ChatGPT's pictures of a Silkie with her chicks in front of a red barn: "I
// quite like these but the chicken needs to be the same as in the game. Can you do that? Only you really have the
// design"): the game's own white Silkie hen and chick(s) (the line-up's, with their real fur: the shells only the game
// draws), stood on the real farm's grass in front of the Red Barn's pen, shot low and close like a photo.
//   ./withserver.sh node iconstudio.mjs OUT     (SET=a: which set-up below; DSF: sharpness, 3)
// Writes, for app/art/compose_studio.py to finish (a sky, the background softened by its distance, the birds sharp):
//   birds.png  the birds alone, see-through round them (shot on black and on white), with their soft shadows
//   bg.png     the farm without them, the sky see-through
//   depth.png  how far each pixel of bg.png is (red: coarse, green: fine; 0..FAR metres), meta.json: the focus
// Extra light for the close-up (the game's is for looking down from above): a warm key from the front left and a rim
// from behind, so the white fur glows at its edges. The birds are only stood, posed and lit: no model, colour or look is
// changed.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/studio';
mkdirSync(OUT, { recursive: true });
const FAR = 120;
// set-ups: the birds (where, metres on the ground from the spot; yaw: 0 at the camera, less to the left; pose), the spot
// (in the Red Barn's frame: +z out of its pen's front), the camera (from the spot: elevation and azimuth in degrees,
// distance, field of view, aim height), the lights
const SETS = {
  a: { spot: [0.0, 5.4], birds: [
      { kind: 'hen', x: 0.05, z: 0, yaw: -0.8, pose: { lookYaw: 0.1, lookTilt: 0.16 } },
      { kind: 'chick', x: -0.15, z: 0.17, yaw: 0.95, pose: { lookYaw: -0.25, lookTilt: -0.45 } }],
    cam: { el: 5, az: 4, dist: 1.35, fov: 26, aim: 0.15, near: 0.7 },
    daisies: [[-0.26, 0.3, 0.7, 0.9], [0.02, 0.42, 0.65, 1.0], [0.24, 0.34, 0.7, 0.85], [-0.33, -0.12, 0.6, 0.8], [0.3, -0.28, 0.6, 0.7], [-0.12, -0.45, 0.55, 0.7]] },
  b: { spot: [0.0, 5.4], birds: [
      { kind: 'hen', x: 0.03, z: -0.03, yaw: -0.45, pose: { lookYaw: 0.25, lookTilt: 0.05 } },
      { kind: 'chick', x: -0.17, z: 0.12, yaw: 0.85, pose: { lookYaw: -0.3, lookTilt: -0.45 } },
      { kind: 'chick', n: 1, x: 0.17, z: 0.14, yaw: -0.5, pose: { lookYaw: 0.2, lookTilt: -0.1 } }],
    cam: { el: 5, az: 4, dist: 1.4, fov: 26, aim: 0.15, near: 0.7 },
    daisies: [[-0.27, 0.36, 0.7, 0.9], [0.0, 0.45, 0.65, 1.0], [0.27, 0.38, 0.7, 0.85], [-0.34, -0.12, 0.6, 0.8], [0.33, -0.25, 0.6, 0.7], [-0.1, -0.45, 0.55, 0.7]] },
};
SETS.wide = { spot: [0.0, 4.5], birds: SETS.a.birds, cam: { el: 6, az: 0, dist: 3.5, fov: 55, aim: 0.4 } };
const SET = JSON.parse(JSON.stringify(SETS[process.env.SET || 'a']));
if (process.env.SPOT) SET.spot = process.env.SPOT.split(',').map(Number);
if (process.env.CAM) Object.assign(SET.cam, JSON.parse(process.env.CAM));
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const VP = +(process.env.VP || 512);
const p = await b.newPage({ viewport: { width: VP, height: VP }, deviceScaleFactor: +(process.env.DSF || 2) });      // (VP=1024: shot at 2048 and shrunk, so the fur's fine layers don't shimmer)
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup&time=${process.env.TIME || '10:30'}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
const res = await p.evaluate(([S, FAR]) => {
  const f = window.__farm, T = f.THREE, line = f.allBirds.filter(x => x.plot.kind === 'lineup');
  f.pause(true);
  const barn = f.coopPlots().find(q => q.breed === 'rir') || f.coopPlots()[0], frame = barn.frame; frame.updateMatrixWorld(true);
  const spot = frame.localToWorld(new T.Vector3(S.spot[0], 0, S.spot[1]));
  const ground = (x, z) => (f.groundAt ? f.groundAt(x, z) : 0) || 0;
  const rot = new T.Euler().setFromQuaternion(frame.getWorldQuaternion(new T.Quaternion()), 'YXZ').y;
  // the birds: the white Silkie hen and chick(s) from the line-up, taken out to the spot (in the barn's frame's turn)
  const used = new Set(), cast = [];
  for (const s of S.birds) {
    const x = line.find(q => !used.has(q) && q.breed === 'sil' && q.colour === 'white' && q.kind === s.kind) || line.find(q => q.breed === 'sil' && q.colour === 'white' && q.kind === s.kind);
    used.add(x); cast.push([x, s]);
  }
  const twins = cast.filter(([x], i) => cast.findIndex(([y]) => y === x) !== i).length;      // (the line-up has one chick of a colour: a second one is shot on its own)
  const place = ([x, s]) => {
    const w = new T.Vector3(s.x, 0, s.z).applyAxisAngle(new T.Vector3(0, 1, 0), rot).add(spot); w.y = ground(w.x, w.z) + 0.015;
    const parent = x.root.parent; parent.updateMatrixWorld(true);
    x.root.position.copy(parent.worldToLocal(w.clone()));
    const parentYaw = new T.Euler().setFromQuaternion(parent.getWorldQuaternion(new T.Quaternion()), 'YXZ').y;
    x.root.rotation.y = rot + s.yaw - parentYaw;
    x.target.copy(x.root.position); x.act = null; x.hopT = -1;
    x.posterPose = A => Object.assign(A, { walk: 0, peck: 0, sit: 0, kick: 0, flap: 0, crow: 0, ruffle: 0, hopT: -1, wag: 0, turn: 0, sing: 0, cluck: 0, kawk: 0, brood: 0, duck: 0, stretch: 0, sleep: 0, proud: 0, lookYaw: 0, lookTilt: 0, ...s.pose });
  };
  for (const x of f.allBirds) x.root.visible = false;      // (everyone else out of sight: the pens' birds too)
  // the camera: low and close, from out in front, the barn behind them
  const at = spot.clone().add(new T.Vector3(S.cam.aimX || 0, 0, 0).applyAxisAngle(new T.Vector3(0, 1, 0), rot)); at.y = ground(spot.x, spot.z) + S.cam.aim;
  const D = Math.PI / 180, dir = new T.Vector3(0, Math.sin(S.cam.el * D), Math.cos(S.cam.el * D)).applyAxisAngle(new T.Vector3(0, 1, 0), rot + S.cam.az * D);
  f.view.min = 0.2; f.lookAt(at.x, at.z, 1.2);
  const cv = f.renderer.domElement, W = cv.width, H = cv.height;
  const cam = new T.PerspectiveCamera(S.cam.fov, W / H, S.cam.near || 0.03, FAR + 50);      // (near: what's right in front of the lens, a fence say, left out)
  cam.position.copy(at).addScaledVector(dir, S.cam.dist); cam.lookAt(at); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  // a few daisies in the grass round them (for the photo only: white petals round a yellow heart, as the game's flowers
  // are made: simple shapes), none in front of the birds
  const daisies = new T.Group(), petal = new T.MeshLambertMaterial({ color: '#ffffff' }), heart = new T.MeshLambertMaterial({ color: '#f7c531' }), stemM = new T.MeshLambertMaterial({ color: '#5f9a35' });
  for (const [dx, dz, sc, tilt] of S.daisies || []) {
    const w = new T.Vector3(dx, 0, dz).applyAxisAngle(new T.Vector3(0, 1, 0), rot).add(spot), gy = ground(w.x, w.z);
    const fl = new T.Group(); fl.position.set(w.x, gy, w.z);
    const head = new T.Group(); head.position.y = 0.05 * sc; head.rotation.x = -(tilt ?? 0.9); head.rotation.order = 'YXZ'; head.rotation.y = rot + (S.cam.az || 0) * Math.PI / 180;
    for (let i = 0; i < 12; i++) { const m = new T.Mesh(new T.CircleGeometry(1, 10), petal); m.scale.set(0.0075 * sc, 0.019 * sc, 1); m.rotation.z = i / 12 * Math.PI * 2; m.position.set(Math.sin(-i / 12 * Math.PI * 2) * 0.017 * sc, Math.cos(i / 12 * Math.PI * 2) * 0.017 * sc, 0); head.add(m); }
    const c = new T.Mesh(new T.SphereGeometry(0.008 * sc, 12, 8), heart); c.scale.z = 0.5; c.position.z = 0.002; head.add(c);
    const st = new T.Mesh(new T.CylinderGeometry(0.0018 * sc, 0.0022 * sc, 0.05 * sc, 6), stemM); st.position.y = 0.025 * sc;
    fl.add(head, st); daisies.add(fl);
  }
  f.scene.add(daisies);
  // the extra light: a warm key from the front left, a rim from behind
  const key = new T.DirectionalLight('#fff0d2', +(window.__KEY || 1.7)), rim = new T.DirectionalLight('#fff8e8', 1.8), fill = new T.HemisphereLight('#fff6e6', '#a8cc78', 0.5);
  key.position.copy(at).add(new T.Vector3(-1.2, 1.4, 1.6).applyAxisAngle(new T.Vector3(0, 1, 0), rot)); key.target.position.copy(at);
  rim.position.copy(at).add(new T.Vector3(0.9, 1.1, -1.8).applyAxisAngle(new T.Vector3(0, 1, 0), rot)); rim.target.position.copy(at);
  for (const L of [key, rim, fill]) { f.scene.add(L); if (L.target) f.scene.add(L.target); }
  const grab = () => { const s = document.createElement('canvas'); s.width = W; s.height = H; s.getContext('2d').drawImage(cv, 0, 0); return s.getContext('2d').getImageData(0, 0, W, H).data; };
  const cut = (K, Wt) => {
    const img = new ImageData(W, H), px = img.data;
    for (let i = 0; i < K.length; i += 4) {
      const a = Math.max(0, Math.min(1, 1 - ((Wt[i] - K[i]) + (Wt[i + 1] - K[i + 1]) + (Wt[i + 2] - K[i + 2])) / 765));
      if (a < 1 / 255) continue;
      px[i] = Math.min(255, K[i] / a); px[i + 1] = Math.min(255, K[i + 1] / a); px[i + 2] = Math.min(255, K[i + 2] / a); px[i + 3] = Math.round(a * 255);
    }
    const o = document.createElement('canvas'); o.width = W; o.height = H; o.getContext('2d').putImageData(img, 0, 0); return o;
  };
  const bgCol = f.scene.background.clone();
  const twoShots = () => { const r = []; for (const c of [0, 1]) { f.scene.background = new T.Color(c, c, c); f.renderer.shadowMap.needsUpdate = true; f.renderer.render(f.scene, cam); r.push(grab()); } return r; };
  // the birds alone (and their soft shadows), each pose held; a bird used twice (two chicks) shot again in its other place
  const blobs = o => o.isInstancedMesh && o.geometry && o.geometry.type === 'CircleGeometry';
  const birdShot = list => {
    for (const x of f.allBirds) x.root.visible = false;
    for (const c of list) { place(c); c[0].root.visible = true; }
    f.step(1 / 30, 40); for (const c of list) place(c); f.step(1 / 30, 2); f.draw();
    const keep = new Set(); for (const [x] of list) x.root.traverse(o => keep.add(o));
    const hidden = []; f.scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && !keep.has(o) && !blobs(o) && o !== key && o !== rim) { o.visible = false; hidden.push(o); } });
    const [K, Wt] = twoShots(); for (const o of hidden) o.visible = true;
    return cut(K, Wt);
  };
  const firsts = cast.filter(([x], i) => cast.findIndex(([y]) => y === x) === i), seconds = cast.filter(([x], i) => cast.findIndex(([y]) => y === x) !== i);
  const layers = [birdShot(firsts), ...seconds.map(c => birdShot([c]))];
  const birds = document.createElement('canvas'); birds.width = W; birds.height = H; const bg2 = birds.getContext('2d');
  for (const L of layers) bg2.drawImage(L, 0, 0);      // (a second chick: in front of the hen, drawn after)
  // the farm without them (their shadows too), the sky see-through
  for (const x of f.allBirds) x.root.visible = false;
  const blobList = []; f.scene.traverse(o => { if (blobs(o) && o.visible) { o.visible = false; blobList.push(o); } });
  f.step(1 / 30, 2);
  const [K2, W2] = twoShots(), bg = cut(K2, W2);
  // how far each pixel is (the sky: as far as can be)
  const mat = new T.ShaderMaterial({ uniforms: { far: { value: FAR } }, vertexShader: `#include <common>
#include <skinning_pars_vertex>
varying float vD;
void main() {
#include <skinbase_vertex>
#include <begin_vertex>
#include <skinning_vertex>
#include <project_vertex>
  vD = -mvPosition.z;
}`, fragmentShader: `uniform float far; varying float vD;
void main() { float v = clamp(vD / far, 0.0, 1.0); float hi = floor(v * 255.0) / 255.0; gl_FragColor = vec4(hi, fract(v * 255.0), 0.0, 1.0); }` });
  f.scene.overrideMaterial = mat; f.scene.background = new T.Color(1, 0, 0);
  f.renderer.render(f.scene, cam);
  const dc = document.createElement('canvas'); dc.width = W; dc.height = H; dc.getContext('2d').drawImage(cv, 0, 0);
  f.scene.overrideMaterial = null; f.scene.background = bgCol; for (const o of blobList) o.visible = true;
  for (const L of [key, rim, fill]) f.scene.remove(L); f.scene.remove(daisies);
  const focus = cam.position.distanceTo(at);
  return { birds: birds.toDataURL('image/png'), bg: bg.toDataURL('image/png'), depth: dc.toDataURL('image/png'), meta: { focus, far: FAR, fov: S.cam.fov, W, H, names: cast.map(([x]) => x.name), twins } };
}, [SET, FAR]);
for (const k of ['birds', 'bg', 'depth']) writeFileSync(`${OUT}/${k}.png`, Buffer.from(res[k].split(',')[1], 'base64'));
writeFileSync(`${OUT}/meta.json`, JSON.stringify(res.meta, null, 1));
console.log(JSON.stringify(res.meta), 'errors', errs);
await b.close();

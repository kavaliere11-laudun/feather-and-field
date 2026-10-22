// A fox's faces as the player sees them at the closest zoom on a phone (402 x 874, 3x), cropped round the head:
// node faces.mjs OUT [who 0=dad 2=cub] [size=1.4] [angle]   (writes OUT_<face>.png)
// neutral, alert (ears pricked, eyes wide), sly (eyes narrowed), the yelp (eyes shut, ears flat, mouth open), a yawn,
// the play face (a grin), puzzled (one ear up, one back, head tilted), dozing
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'faces', who = '0', size = '1.4', ang = '0.45'] = process.argv.slice(2);
const FACES = [
  ['neutral', {}], ['alert', { ears: 1, wide: 1 }], ['sly', { ears: 1, shutL: 0.35, shutR: 0.35, lookPitch: -0.1 }],
  ['yelp', { ears: -1, shutL: 1, shutR: 1, mouth: 1, lookPitch: -0.3 }], ['yawn', { ears: -0.6, shutL: 0.95, shutR: 0.95, mouth: 1.15, lookPitch: -0.35 }],
  ['play', { ears: 0.7, wide: 0.4, mouth: 0.55 }], ['puzzled', { earL: 0.5, earR: -0.6, headTilt: 0.35, wide: 0.3 }], ['dozing', { ears: -0.3, shutL: 0.85, shutR: 0.85 }],
];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3 });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&foxes&time=14');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #bar, .bar { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 200); });
for (const [name, st] of [FACES[0], ...FACES]) {
  const at = await p.evaluate(([who, st, size, ang]) => {
    const f = window.__farm, F = f.foxes(), fx = F.foxes[who], cam = f.camera.position;
    for (const o of F.foxes) { o.root.visible = o === fx; o.shadow.visible = o === fx; }
    F.butterfly.mesh.visible = false;
    fx.root.position.set(-8, 0, -33);
    fx.heading = Math.atan2(cam.x + 8, cam.z + 33) + ang; fx.root.rotation.y = fx.heading;
    fx.q.pose(Object.assign({ t: 1.0, dt: 1 / 30 }, st)); fx.root.updateMatrixWorld(true);
    f.lookAt(-8, -33, size); f.draw();
    const h = fx.q.bones.head.getWorldPosition(new f.THREE.Vector3()); h.project(f.camera);
    return [(h.x + 1) / 2 * innerWidth, (1 - h.y) / 2 * innerHeight];
  }, [+who, st, +size, +ang]);
  const half = 45 * 1.4 / +size;
  await p.screenshot({ path: `${out}_${name}.png`, clip: { x: at[0] - half * 0.8, y: at[1] - half * 0.85, width: half * 2, height: half * 2 } });
}
await b.close();

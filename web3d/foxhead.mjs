// Close-ups of a fox's head (and the whole fox) from the game's camera, turned to face it at a few angles:
// node foxhead.mjs OUT [who 0=dad 2=cub] [size]   (writes OUT_<angle>.png)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'fhead', who = '0', size = '0.32'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 360, height: 360 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&foxes&time=14');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #tag { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 200); });
for (const ang of [0, 40, -40, 90]) {
  await p.evaluate(([who, ang, size]) => {
    const f = window.__farm, F = f.foxes(), fx = F.foxes[who], cam = f.camera.position;
    for (const o of F.foxes) { o.root.visible = o === fx; o.shadow.visible = o === fx; }
    F.butterfly.mesh.visible = false;
    fx.root.position.set(-8, 0, -33);
    fx.heading = Math.atan2(cam.x + 8, cam.z + 33) + ang * Math.PI / 180; fx.root.rotation.y = fx.heading;
    fx.q.pose({ t: 1.0, dt: 1 / 30 }); fx.root.updateMatrixWorld(true);
    const h = fx.q.bones.head.getWorldPosition(new f.THREE.Vector3());
    const dx = h.x - cam.x, dz = h.z - cam.z, dl = Math.hypot(dx, dz), k = h.y / Math.tan(42 * Math.PI / 180);   // the ground point behind the head
    f.lookAt(h.x + dx / dl * k, h.z + dz / dl * k, size); f.draw();
  }, [+who, ang, +size]);
  await p.screenshot({ path: `${out}_${ang}.png`, timeout: 120000 });
}
await b.close();

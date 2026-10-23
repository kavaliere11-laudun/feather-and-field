// Close films of Biscuit side on, on the grass by his kennel: node dogclose.mjs OUT mode [frames] [per]
// mode grab: he walks up to his ball and picks it up in his mouth; mode shake: he stands and shakes (feet planted)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'dc', mode = 'grab', framesArg = '60', perArg = '2'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&dog&time=10`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top, #dogbtn { display: none !important; }' });
await p.evaluate((mode) => {
  const f = window.__farm, D = f.dog(), d = D.dog, T = f.THREE; f.pause(true);
  const [x, z] = D.K(2.6, -0.2); d.pos.set(x, 0, z); d.lastPos = d.pos.clone();
  const r = new T.Vector3(1, 0, 0).applyQuaternion(f.camera.quaternion); d.heading = Math.atan2(-r.x, -r.z) + 0.35;      // (side on, a little towards you)
  if (mode === 'grab') {
    D.ball.mesh.position.set(x + Math.sin(d.heading) * 1.1, 0.042, z + Math.cos(d.heading) * 1.1); D.ball.state = 'ground';
    d.todo = [D.wrap({ name: 'still', t: 0, run(f, dt) { this.t += dt; f.A.earsGoal = 0.8; f.A.wagGoal = 0.5; f.A.lookPitchGoal = 0.3; return this.t > 0.8; } }), D.wrap(D.fetch(false)), D.wrap({ name: 'proud', t: 0, run(f, dt) { this.t += dt; f.A.wagGoal = 1; f.A.earsGoal = 0.8; return this.t > 3; } })];
  } else {
    d.todo = [D.wrap({ name: 'still', t: 0, run(f, dt) { this.t += dt; look(f, this.t); return this.t > 1; } }), D.wrap(D.shake(1.3)), D.wrap({ name: 'after', t: 0, run(f, dt) { this.t += dt; f.A.earsGoal = 0.5; return this.t > 2; } })];
    function look(f, t) { f.A.earsGoal = 0.6; f.A.lookYawGoal = 0.2; }
  }
  d.task = null; window.__c = null;
}, mode);
for (let n = 0; n < +framesArg; n++) {
  await p.evaluate(([per, size]) => {
    const f = window.__farm, D = f.dog(), d = D.dog, T = f.THREE; f.step(1 / 30, per);
    const h = d.q.bones.head.getWorldPosition(new T.Vector3()), c = d.pos.clone().lerp(h, 0.75); c.y = 0;
    const k = 0.36 * 0.62 / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2;
    window.__c = window.__c || c.clone(); window.__c.lerp(c, 0.15);
    f.lookAt(window.__c.x - k, window.__c.z - k, size); f.draw();
  }, [+perArg, +(process.env.SIZE || 0.95)]);
  await p.screenshot({ path: `${out}_${String(n).padStart(4, '0')}.png`, timeout: 120000 });
}
console.log('frames', framesArg, 'errors', errs);
await b.close();

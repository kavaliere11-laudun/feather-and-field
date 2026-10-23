// One goose in a set pose, seen from several sides, on one sheet: node goosepose.mjs OUT kind 'POSE' [views] [size]
// kind: embden | toulouse; POSE: JSON of the pose numbers (as GooseRig.pose takes: {"wings":1,"flap":0.5,"t":0.1});
// views: comma list of game (the game's camera), side, front, back, top, under, or az:el in degrees (default game,side,top,front)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'gp.png', kind = 'embden', poseArg = '{}', viewsArg = 'game,side,top,front', size = '0.42'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 360, height: 360 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=1&lineup=geese&time=14');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
if (process.env.CLEAN) await p.evaluate(() => { window.CLEAN = 1; });
if (process.env.DY) await p.evaluate((d) => { window.DY = +d; }, process.env.DY);      // the view's centre raised (+) or lowered
if (process.env.NP) await p.evaluate((np) => Object.assign(window.__NECK_POSE, JSON.parse(np)), process.env.NP);      // try neck shapes
await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn { display: none !important; }' });
const views = viewsArg.split(',');
const shots = [];
for (const v of views) {
  await p.evaluate(([kind, pose, v, size]) => {
    const f = window.__farm, L = f.geeseLineup(), T = f.THREE;
    f.pause(true);
    const g = L.geese.find(o => o.kind === kind && o.linePose === 'stand');
    for (const o of L.geese) o.root.visible = o === g;
    if (window.CLEAN) for (const o of f.scene.children) if (o !== L.group && !o.isLight) o.visible = false;      // (just her)
    g.task = null; g.heading = -0.95;
    f.step(1 / 30, 1);
    const P = Object.assign({ t: 0, dt: 1 / 30 }, pose);
    // a few frames so the springs (the tail) settle
    for (let i = 0; i < 20; i++) g.rig.pose(Object.assign({}, P, { t: (P.t || 0) + (pose.still ? 0 : 0), dt: 1 / 30 }));
    g.root.updateMatrixWorld(true);
    const c = g.rig.bones.body.getWorldPosition(new T.Vector3()); c.y += window.DY || 0;
    const cam = f.camera;
    if (v === 'game') { const k = c.y / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2; f.lookAt(c.x - k, c.z - k, size); }
    else {
      // directions in the goose's own frame (+z forward, +y up, +x her left), turned with her
      const wq = g.root.getWorldQuaternion(new T.Quaternion()), fw = new T.Vector3(0, 0, 1).applyQuaternion(wq), lf = new T.Vector3(1, 0, 0).applyQuaternion(wq), up = new T.Vector3(0, 1, 0);
      let d;
      if (v === 'side') d = lf.clone();                                   // from her left (the side the game shows)
      else if (v === 'right') d = lf.clone().multiplyScalar(-1);
            else if (v === 'front') d = fw.clone().add(up.clone().multiplyScalar(0.25));
      else if (v === 'back') d = fw.clone().multiplyScalar(-1).add(up.clone().multiplyScalar(0.35));
      else if (v === 'top') d = up.clone().add(fw.clone().multiplyScalar(-0.02));
      else if (v === 'under') d = up.clone().multiplyScalar(-1).add(fw.clone().multiplyScalar(0.02));
      else { const [az, el] = v.split(':').map(x => +x * Math.PI / 180); d = fw.clone().multiplyScalar(Math.cos(az) * Math.cos(el)).add(lf.clone().multiplyScalar(Math.sin(az) * Math.cos(el))).add(up.clone().multiplyScalar(Math.sin(el))); }
      d.normalize();
      f.lookAt(c.x, c.z, size);
      cam.position.copy(c).addScaledVector(d, 2.2); cam.up.set(0, 1, 0); if (Math.abs(d.y) > 0.95) cam.up.copy(fw);
      cam.lookAt(c); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      window.__noPlace = true;
    }
    f.renderer.render(f.scene, cam);
  }, [kind, JSON.parse(poseArg), v, +size]);
  const fn = out.replace(/\.png$/, '') + '_' + v.replace(':', '_') + '.png';
  await p.screenshot({ path: fn, timeout: 120000 }); shots.push(fn);
}
console.log(JSON.stringify(shots), 'errors', errs);
await b.close();

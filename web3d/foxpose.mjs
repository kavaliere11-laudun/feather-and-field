// Every fox pose, still, close up from the game's camera: node foxpose.mjs [out] [kind 0=dad 2=cub] [heading deg]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'fpose', who = '0', hd = '90'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 360, height: 300 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&foxes&time=14');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #tag { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 200); });
const POSES = { stand: {}, trot: { walk: 1, phase: 1.2 }, run: { walk: 1, run: 1, phase: 2.0 }, sit: { sit: 1 }, lie: { lie: 1, chin: 1 }, bow: { bow: 1, wag: 1 },
  rear: { rear: 1, paw: 1 }, crouch: { crouch: 1 }, air: { air: 1, lift: 0.3, pitch: 0.2 }, dive: { dive: 1 }, back: { roll: 2.85, kick: 1 }, scratch: { sit: 1, scratch: 1 } };
for (const [name, A] of Object.entries(POSES)) {
  await p.evaluate(([who, hd, A]) => {
    const f = window.__farm, F = f.foxes(), fx = F.foxes[who];
    for (const o of F.foxes) { o.root.visible = o === fx; o.shadow.visible = o === fx; }
    F.butterfly.mesh.visible = false;
    fx.root.position.set(-8, 0, -33); fx.heading = hd * Math.PI / 180; fx.root.rotation.y = fx.heading;
    fx.q.tailA = 0; fx.q.tailV = 0;
    fx.q.pose(Object.assign({ t: 1.0, dt: 1 / 30 }, A)); fx.root.updateMatrixWorld(true);
    f.lookAt(-8 + 0.12, -33 + 0.12, fx.kind === 'cub' ? 0.55 : 0.85);
    f.draw();
  }, [+who, +hd, A]);
  await p.screenshot({ path: `${out}_${name}.png`, timeout: 120000 });
}
await b.close();

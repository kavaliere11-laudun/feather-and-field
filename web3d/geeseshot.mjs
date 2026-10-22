// The geese line-up (?lineup=geese) from the game's camera, close up on each goose in each pose: node geeseshot.mjs OUT [size]
// (writes OUT_<pose>_<g|h>.png: stand, walk, honk, graze, preen, wings, hiss, sleep; g Gertrude, h Hector)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'geese', size = '0.45'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 300 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=1&lineup=geese&time=14');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, +(window.SKIP || 75)); });
const rows = ['stand', 'walk', 'honk', 'graze', 'preen', 'wings', 'hiss', 'sleep'];
for (let i = 0; i < rows.length; i++) for (const [j, tag] of [[0, 'g'], [1, 'h']]) {
  await p.evaluate(([i, j, size]) => {
    const f = window.__farm, L = f.geeseLineup(), g = L.geese[i * 2 + j], T = f.THREE;
    for (const o of L.geese) o.root.visible = o === g;                       // (only her in the picture)
    f.step(1 / 30, 1);
    // framed on the middle of her body and her head (the ground point behind it, as the camera looks down at 42 degrees)
    const a = g.rig.bones.body.getWorldPosition(new T.Vector3()), h = g.rig.bones.head.getWorldPosition(new T.Vector3()), c = a.add(h).multiplyScalar(0.5);
    const k = c.y / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2;
    f.lookAt(c.x - k, c.z - k, size); f.draw();
  }, [i, j, +size]);
  await p.screenshot({ path: `${out}_${rows[i]}_${tag}.png`, timeout: 120000 });
}
await p.evaluate(() => { for (const o of window.__farm.geeseLineup().geese) o.root.visible = true; });
console.log('errors', errs);
await b.close();

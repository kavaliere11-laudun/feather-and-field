// Tap each goose in the line-up's first row (at phone size): her name shows (in English or French), she turns to look at
// you and honks: node geesetap.mjs [OUT.png]   (LANG=fr for French)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?lineup=geese' + (process.env.LANG === 'fr' ? '&lang=fr' : ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 30); f.draw(); });
let ok = true;
for (const i of [0, 1]) {
  const at = await p.evaluate((i) => {
    const f = window.__farm, g = f.geeseLineup().geese[i], v = g.root.getWorldPosition(new f.THREE.Vector3()); v.y += g.hitY;
    v.project(f.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
  }, i);
  await p.touchscreen.tap(at[0], at[1]);
  const r = await p.evaluate((i) => {
    const f = window.__farm, g = f.geeseLineup().geese[i]; let jaw = 0, yaw = 0;
    for (let k = 0; k < 30; k++) { f.step(1 / 30, 1); jaw = Math.max(jaw, g.A.jaw || 0); yaw = g.A.lookYaw; }
    f.draw();
    return { name: g.name, tag: document.getElementById('tag').textContent, react: +g.react.toFixed(2), jaw: +jaw.toFixed(2), yaw: +yaw.toFixed(2) };
  }, i);
  const pass = r.tag.startsWith(r.name) && r.jaw > 0.5 && Math.abs(r.yaw) > 0.3 && (process.env.LANG === 'fr' ? /oie|jars/.test(r.tag) : /goose|gander/.test(r.tag));
  ok = ok && pass;
  console.log(pass ? 'PASS' : 'FAIL', JSON.stringify(r));
  if (out && i === 0) await p.screenshot({ path: out, timeout: 400000 });
}
console.log(ok ? 'ALL PASS' : 'SOME FAILED', 'errors', errs);
await b.close();

// Frames of the line-up birds doing something, stepped exactly, for checking movement or making a clip:
// node clip.mjs WHAT frames fps size dx dz out [turn]
//   WHAT: hop (a tap: hop and flap), walk (the line-up birds walk on the spot... see below), or an action (peck, scratch, ruffle, crow)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [what = 'hop', n = '12', fps = '15', size = '1.0', dx = '0', dz = '0', out = 'clip', turn = '1.5708'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 600, height: 420 }, deviceScaleFactor: 1.5 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?lineup&q=0');
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
if (process.env.CLEAN) await p.addStyleTag({ content: '#hint, #readout, .top, nav, header { display: none !important; }' });
await p.evaluate(([what, size, dx, dz, turn]) => {
  const f = window.__farm; f.pause(true); f.freeze(true);
  const c = f.view.target.clone(); f.lookAt(c.x + dx, c.z + dz, size);
  for (const bd of f.allBirds) { bd.root.rotation.y += turn; bd.lastYaw = bd.root.rotation.y; bd.act = null; bd.wait = 99; }
  f.step(1 / 60, 30);
  if (what === 'hop') f.hop();
  else if (what === 'walk') {
    // walk them slowly across: a target 1 m ahead of each
    for (const bd of f.allBirds) { bd.stay = false; bd.wait = 0; bd.act = null; const y = bd.root.rotation.y; bd.target.set(bd.root.position.x + Math.sin(y) * 1, bd.root.position.y, bd.root.position.z + Math.cos(y) * 1); bd.free = () => true; bd.someoneAhead = () => false; }
  } else f.act(what, what === 'ruffle' ? 0.75 : 2.0);
}, [what, parseFloat(size), parseFloat(dx), parseFloat(dz), parseFloat(turn)]);
const per = Math.round(60 / parseFloat(fps));
for (let k = 0; k < parseInt(n); k++) {
  await p.evaluate((per) => { const f = window.__farm; f.step(1 / 60, per); f.draw(); }, per);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}_${String(k).padStart(2, '0')}.png` });
}
if (errs.length) console.log('ERRORS', errs.join(' | '));
await b.close();

// Close pictures of Biscuit in the dog line-up (?lineup=dog), at phone size: node dogshot.mjs OUT [which: 0-5] [heading] [size]
// [steps]   (HEAD=1: on his head; each dog of the line-up alone in the view, turned to the heading: 0 faces the camera's left, 1.6 side on...)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'dog.png', which = '0', heading = '-0.75', size = '0.55', steps = '60'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 402), height: +(process.env.H || 874) }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&lineup=dog' + (process.env.LANG === 'fr' ? '&lang=fr' : '') + (process.env.QS ? '&' + process.env.QS : ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top { display: none !important; }' });
await p.evaluate(([w, h, sz, n, HEAD]) => {
  const f = window.__farm, L = f.foxLineup(), T = f.THREE, d = L.foxes[w];
  for (const o of L.foxes) { o.root.visible = o === d; o.shadow.visible = o === d; }
  f.pause(true);
  for (let i = 0; i < n; i++) { if (d.linePose !== 'trot') d.heading = h; f.step(1 / 30, 1); for (const o of L.foxes) if (o !== d) { o.root.visible = false; o.shadow.visible = false; } }
  const v = HEAD ? d.q.bones.head.getWorldPosition(new T.Vector3()) : d.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.3, 0));
  const k = v.y * (HEAD ? 0.62 : 1) / Math.tan(42 * Math.PI / 180) * Math.SQRT1_2;
  f.lookAt(v.x - k, v.z - k, sz); f.draw();
}, [+which, +heading, +size, +steps, !!process.env.HEAD]);
await p.screenshot({ path: out, timeout: 120000 });
console.log('errors', errs);
await b.close();

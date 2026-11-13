// A film of the winter play (13 Nov 2026: the Snow Chalet's frozen puddle and the footprints in the snow, play.js addWinter):
// node winterfilm.mjs OUTDIR   (FPS (15), SECS (16), W, H, SIZE, PORT)
// The test page's ?looks=4&theme=winter, the Red Barn's pen: a hen sent to slide on the puddle, then another; the others
// walk about leaving their footprints. JPEG frames; prints the frame count.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [OUT = 'winterfilm'] = process.argv.slice(2), look = '4';
const FPS = +(process.env.FPS || 15), SECS = +(process.env.SECS || 16), W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DSF || 2) });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&looks=${look}&theme=winter&time=10:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #replaybtn, #farmerbtn, #henbtns { display: none !important; }' });
await p.evaluate(([size, ox, oz]) => {
  const f = window.__farm; f.pause(true);
  const P = f.coopPlots().find(q => q.breed === 'rir'); window.__P = P;
  for (const x of P.birds) x.layIn = 9999;
  const c = P.frame.localToWorld(new f.THREE.Vector3(ox, 0, oz)); f.lookAt(c.x, c.z, size); f.step(1 / 30, 10); f.draw();
}, [+(process.env.SIZE || 1.5), +(process.env.OX || 0.1), +(process.env.OZ || 1.7)]);
const plan = [['ice', 'hen', 3.0]];
let n = 0;
for (let i = 0; i < FPS * SECS; i++) {
  const t = i / FPS;
  await p.evaluate(([t, fps, plan]) => {
    const f = window.__farm, P = window.__P, T = P.toys;
    for (const [kind, who, at] of plan) {
      if (t < at || T[kind].by || (T[kind].sent || 0) >= 2) continue; T[kind].next = 0;
      const b = P.birds.find(x => x.kind === who && !x.busy() && !x.cuddle) || P.birds.find(x => x.kind === 'hen' && !x.busy());
      if (b && !T[kind].by && f.startPlay(b, kind)) T[kind].sent = (T[kind].sent || 0) + 1;
    }
    f.step(1 / 30, Math.round(30 / fps)); f.draw();
  }, [t, FPS, plan]);
  await p.screenshot({ path: `${OUT}/f_${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92, timeout: 180000 });
}
console.log('frames', n, 'errors', errs);
await b.close();

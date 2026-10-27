// A film of the hens at play (release 4, play.js): node playfilm.mjs OUTDIR [look]   (look 4: Deluxe, all four play
// things; 3: Cosy; FPS (12), SECS (22), W, H (874x402: the phone on its side), SIZE (the view), PORT)
// The test page's ?looks=N, the Red Barn's pen: one bird sent to each play thing a moment apart (the rooster at the
// cabbage), the view still on the pen. Prints the frame count.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [OUT = 'playfilm', look = '4'] = process.argv.slice(2);
const FPS = +(process.env.FPS || 12), SECS = +(process.env.SECS || 22), W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DSF || 2) });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&looks=${look}&time=10:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #replaybtn, #farmerbtn, #henbtns { display: none !important; }' });
await p.evaluate(([size, ox, oz]) => {
  const f = window.__farm; f.pause(true);
  const P = f.coopPlots().find(q => q.breed === 'rir'); window.__P = P;
  for (const x of P.birds) x.layIn = 9999;
  const c = P.frame.localToWorld(new f.THREE.Vector3(ox, 0, oz)); f.lookAt(c.x, c.z, size); f.step(1 / 30, 10); f.draw();
}, [+(process.env.SIZE || 1.45), +(process.env.OX || -0.1), +(process.env.OZ || 1.6)]);
const plan = look === '4' ? [['dust', 'hen', 0.2], ['swing', 'hen', 1.0], ['xylo', 'hen', 3.0], ['cabbage', 'rooster', 4.5]] : [['swing', 'hen', 0.2], ['dust', 'hen', 1.5], ['cabbage', 'rooster', 3.0]];
let n = 0;
for (let i = 0; i < FPS * SECS; i++) {
  const t = i / FPS;
  await p.evaluate(([t, fps, plan]) => {
    const f = window.__farm, P = window.__P, T = P.toys;
    for (const [kind, who, at] of plan) {
      if (t < at || T[kind].sent) continue;
      const b = P.birds.find(x => x.kind === who && !x.busy() && !x.cuddle) || P.birds.find(x => x.kind === 'hen' && !x.busy());
      if (b && !T[kind].by && f.startPlay(b, kind)) T[kind].sent = true;
    }
    f.step(1 / 30, Math.round(30 / fps)); f.draw();
  }, [t, FPS, plan]);
  await p.screenshot({ path: `${OUT}/f_${String(n++).padStart(4, '0')}.png`, timeout: 180000 });
}
console.log('frames', n, 'errors', errs);
await b.close();

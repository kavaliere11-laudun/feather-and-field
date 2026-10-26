// A film of Gertrude and Hector's squabbles (release 3 step 4): node geesesquabblefilm.mjs OUTDIR [kinds]   (kinds: snail,
// puddle,spot; PORT) On the village page (?geese, 11:00): each squabble brought on (its kind) and followed to the making
// up, the view gliding with them; 12 pictures a second at phone size. Prints the number of pictures.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const OUT = process.argv[2], kinds = (process.argv[3] || 'snail').split(','), FPS = 12;
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&geese&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #replaybtn { display: none !important; }' });
let n = 0;
for (const kind of kinds) {
  await p.evaluate(kind => { const f = window.__farm, F = f.geese(); f.pause(true); f.step(1 / 30, 30); let k = 0; while (!F.duet && k++ < 4000) { F.force = kind; F.loveIn = 0; f.step(1 / 30, 1); } }, kind);
  let after = 0;
  for (let i = 0; i < FPS * 40; i++) {
    const r = await p.evaluate(fps => { const f = window.__farm, F = f.geese(); for (let k = 0; k < 30 / fps; k++) f.step(1 / 30, 1);
      const c = F.centre(new f.THREE.Vector3()), v = f.view, t = v.target; const want = F.duet ? [(c.x + F.duet.at[0]) / 2, (c.z + F.duet.at[1]) / 2] : [c.x, c.z]; if (!window.__cam) { window.__cam = 1; t.x = want[0]; t.z = want[1]; } t.x += (want[0] - t.x) * 0.08; t.z += (want[1] - t.z) * 0.08; f.lookAt(t.x, t.z, 2.3); f.draw(); return !!F.duet; }, FPS);
    await p.screenshot({ path: `${OUT}/f_${String(n++).padStart(4, '0')}.png` });
    if (!r && ++after > FPS * 2.5) break;
  }
}
console.log('frames', n);
await b.close();

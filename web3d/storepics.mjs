// The App Store's pictures from the farm itself (24 Nov 2026, Audrey: "App Store ready (Recommended)"; the pictures: "First
// option but make sure it's top quality"): ./withserver.sh node storepics.mjs OUTDIR   (ONLY=coop,farm; W, H: css px of the
// picture under its caption (874 x 326); DSF (4); PORT). The test village with every coop at its Deluxe look (?looks=4), in
// the late-morning light, the page's words and buttons hidden:
//   coop: the Silkies' Pagoda and its garden, the hens at play (the swing, the dust bath, the xylophone, the cabbage);
//   farm: the village from above, its Deluxe coops, the pond, the lanes.
// Each saved as OUTDIR/<name>.png at full size (W x H x DSF); storecompose.py puts its caption above it.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/storepics'; fs.mkdirSync(OUT, { recursive: true });
const W = +(process.env.W || 874), H = +(process.env.H || 326), DSF = +(process.env.DSF || 4);
const ONLY = (process.env.ONLY || 'coop,farm').split(',');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
const SCENES = {
  coop: { time: '10:30', breed: process.env.BREED || 'sil', size: +(process.env.SIZE || 1.55), ox: +(process.env.OX || -0.1), oz: +(process.env.OZ || 1.2), play: [['dust', 'hen', 0.2], ['swing', 'hen', 0.8], ['xylo', 'hen', 1.6], ['cabbage', 'rooster', 2.4]], secs: 6 },
  farm: { time: '10:00', size: +(process.env.FSIZE || 6.5), at: process.env.AT ? process.env.AT.split(',').map(Number) : null, secs: 3 },
};
for (const name of ONLY) {
  const S = SCENES[name];
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&looks=4&time=${S.time}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #replaybtn, #farmerbtn, #henbtns, #compass, #findfarmer, .gbar, .gacts, .vignette { display: none !important; }' });
  const info = await p.evaluate(S => {
    const f = window.__farm; f.pause(true); f.wind(3);
    if (S.breed) {
      const P = f.coopPlots().find(q => q.breed === S.breed); window.__P = P;
      for (const x of P.birds) x.layIn = 9999;
      const c = P.frame.localToWorld(new f.THREE.Vector3(S.ox, 0, S.oz)); f.lookAt(c.x, c.z, S.size);
      return { coop: P.breed };
    }
    if (S.at) f.lookAt(S.at[0], S.at[1], S.size); else { const P = f.coopPlots(); const cx = P.reduce((a, q) => a + q.frame.position.x, 0) / P.length, cz = P.reduce((a, q) => a + q.frame.position.z, 0) / P.length; f.lookAt(cx, cz, S.size); }
    return { coops: f.coopPlots().length };
  }, S);
  for (let t = 0; t < S.secs; t += 1 / 15) {
    await p.evaluate(([t, S]) => {
      const f = window.__farm, P = window.__P;
      if (P && S.play) for (const [kind, who, at] of S.play) {
        const T = P.toys; if (!T || !T[kind] || t < at || T[kind].sent) continue;
        const bd = P.birds.find(x => x.kind === who && !x.busy() && !x.cuddle) || P.birds.find(x => x.kind === 'hen' && !x.busy());
        if (bd && !T[kind].by && f.startPlay(bd, kind)) T[kind].sent = true;
      }
      f.step(1 / 30, 2);
    }, [t, S]);
  }
  await p.evaluate(() => window.__farm.draw());
  await p.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 });
  console.log(name, JSON.stringify(info));
  await p.close();
}
console.log('errors', JSON.stringify(errs));
await b.close();

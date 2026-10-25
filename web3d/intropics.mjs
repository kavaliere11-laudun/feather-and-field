// The onboarding pictures (main.js ?intro=1..4, staged in src/intro.js): ./withserver.sh node intropics.mjs [OUTDIR]
// Each scene is shot through its own camera (intro.js `cam`) at 4:3, W x H css px at DSF (600 x 450 at 4: 2400 x 1800), shrunk
// to 1200 x 900 for smooth edges and fur and saved as OUTDIR/<n>.webp (default intro/; quality 85, full colour, by Python's
// PIL). Scene 3 has words on its sign, so it is made in French too: 3-fr.webp (NOFR=1: not). ONLY=1,3: just those scenes;
// PNG=folder: the full-size shots kept as PNGs as well; T: seconds of posing before the shot (the hearts on their way by
// then); CAM: a look from elsewhere, for checking.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { execFileSync } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
const OUT = process.argv[2] || fileURLToPath(new URL('./intro/', import.meta.url));
const W = +(process.env.W || 600), H = +(process.env.H || 450), DSF = +(process.env.DSF || 4), T = +(process.env.T || 3);
const ONLY = (process.env.ONLY || '1,2,3,4').split(',').map(Number), PNG = process.env.PNG || '';
const CAM = process.env.CAM ? JSON.parse(process.env.CAM) : {};            // (a look from elsewhere, for checking: {"at": [x, y, z], "dist": 2})
const SHOTS = [];
for (const n of ONLY) { SHOTS.push({ n, lang: 'en', name: String(n) }); if (n === 3 && !process.env.NOFR) SHOTS.push({ n, lang: 'fr', name: '3-fr' }); }
mkdirSync(OUT, { recursive: true }); if (PNG) mkdirSync(PNG, { recursive: true });
const tmp = (PNG || OUT) + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
for (const S of SHOTS) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  p.on('pageerror', e => errs.push(S.name + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' / ')));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&intro=${S.n}&coops=0&time=10:30${S.lang === 'fr' ? '&lang=fr' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.addStyleTag({ content: '#hint, #readout, .top, #replaybtn, #farmerbtn, #foxbtn, #tag, .vignette { display: none !important; }' });
  await p.evaluate(([T, aspect, CAM]) => {
    const f = window.__farm; f.pause(true); f.wind(4.2); window.__noBlink = true; f.intro().restart();
    for (let i = 0; i < T * 30; i++) f.step(1 / 30, 1);
    f.posterShot({ ...f.intro().cam, ...CAM, aspect });
  }, [T, W / H, CAM]);
  const png = tmp + S.name + '.png';
  await p.screenshot({ path: png });
  await p.close();
  // shrunk to half (smooth edges), saved as WebP; the full-size PNG kept only if asked for
  execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
im.save(sys.argv[2], 'WEBP', quality=85, method=6)
`, png, OUT + '/' + S.name + '.webp']);
  if (!PNG) rmSync(png, { force: true });
  console.log(S.name, 'done');
}
console.log('errors', errs);
await b.close();

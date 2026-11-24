// The App Store's pictures put together (24 Nov 2026): node compose.mjs PLAN.json OUTDIR
// PLAN: [{ "img": "/path/scene.png", "caption": "A flock to love for good", "name": "01_flock" }, ...]
// Each picture 2868 x 1320 (the 6.9-inch iPhone on its side, as Apple asks): a cream band across the top with its caption in
// the game's own type (Fredoka), the scene under it (2868 x 1070), saved as OUTDIR/<name>.png (and a small .jpg to look at).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const [PLAN, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const FONTS = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../web3d/fonts');
const font = f => 'data:font/woff2;base64,' + fs.readFileSync(path.join(FONTS, f)).toString('base64');
const F1 = font('fredoka-latin-600-normal.woff2'), F2 = font('fredoka-latin-ext-600-normal.woff2');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2868, height: 1320 }, deviceScaleFactor: 1 });
for (const s of plan) {
  const img = 'data:image/png;base64,' + fs.readFileSync(s.img).toString('base64');
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Fredoka; font-weight: 600; src: url(${F1}) format('woff2'); }
@font-face { font-family: Fredoka; font-weight: 600; src: url(${F2}) format('woff2'); unicode-range: U+0100-024F, U+1E00-1EFF; }
html, body { margin: 0; width: 2868px; height: 1320px; overflow: hidden; background: #fbf5e6; }
.band { position: absolute; left: 0; top: 0; width: 2868px; height: 250px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(#fffaf0, #f6eed8); }
.band b { font: 600 ${s.size || 108}px/1 Fredoka, sans-serif; color: #24402c; letter-spacing: 0.2px; padding-top: 6px; }
.scene { position: absolute; left: 0; top: 250px; width: 2868px; height: 1070px; background: url(${img}) center / cover no-repeat; }
.edge { position: absolute; left: 0; top: 246px; width: 2868px; height: 8px; background: linear-gradient(rgba(60,50,20,0.16), rgba(60,50,20,0)); }
</style></head><body><div class="scene"></div><div class="band"><b>${s.caption}</b></div><div class="edge"></div></body></html>`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log(s.name);
}
await b.close();

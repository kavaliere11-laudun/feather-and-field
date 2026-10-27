// The Pagoda's five looks in Silkie colours (release 4): ./withserver.sh node pagodacolours.mjs OUT   (COLS=black,buff,blue;
// W, H (874x402); SIZE, OX, OZ, SHIFT: the framing; NTH: which of the test page's two Pagodas)
// The test page's ?looks=N, its Pagoda in each colour in turn (tintCoop), one picture each, then a sheet (colours.png): a
// row for each look, a column for each colour.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || 'pagodacolours', COLS = (process.env.COLS || 'white,black,buff,blue').split(','), W = +(process.env.W || 874), H = +(process.env.H || 402);
const NAMES = ['Rustic', 'Mended', 'Snug', 'Cosy', 'Deluxe'];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const shots = [];
for (const t of [0, 1, 2, 3, 4]) {
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&looks=${t}&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #replaybtn, #farmerbtn { display: none !important; }' });
  for (const col of COLS) {
    await p.evaluate(([col, nth, sz, ox, oz, sh]) => {
      const f = window.__farm; f.pause(true); const all = f.coopPlots(), P = all.filter(q => q.breed === 'sil')[nth], i = all.indexOf(P);
      f.tintCoop(i, col);
      const c = P.frame.localToWorld(new f.THREE.Vector3(ox, 0, oz)); f.lookFree(c.x + sh, c.z + sh, sz); f.step(1 / 30, 3); f.draw();
    }, [col, +(process.env.NTH || 0), +(process.env.SIZE || 1.3), +(process.env.OX || -0.05), +(process.env.OZ || 0), +(process.env.SHIFT || -0.6)]);
    await p.waitForTimeout(200);
    const file = `${OUT}/c_${t}_${col}.png`; await p.screenshot({ path: file, timeout: 180000 }); shots.push([file, t, col]);
  }
  console.log(NAMES[t]);
}
const img = f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:${W / 2}px;height:${H / 2}px;display:block">`;
const html = `<html><body style="margin:0;background:#f6efdc;font:700 16px system-ui,sans-serif;color:#3b2a1a"><table style="border-spacing:4px">
<tr><td></td>${COLS.map(c => `<td>${c}</td>`).join('')}</tr>${[0, 1, 2, 3, 4].map(t => `<tr><td>${NAMES[t]}</td>${shots.filter(s => s[1] === t).map(s => `<td>${img(s[0])}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
await p.setViewportSize({ width: 80 + COLS.length * (W / 2 + 4), height: 40 + 5 * (H / 2 + 4) }); await p.setContent(html); await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/colours.png`, fullPage: true });
console.log('errors', errs);
await b.close();

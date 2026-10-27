// The Red Barn's five looks side by side (release 4: Rustic, Mended, Snug, Cosy, Deluxe): ./withserver.sh node barnlooks.mjs
// [OUT]   (OUT: a folder; ONLY=3,4: just those looks; TIME=21:30 for an evening; BREED=rir; SIZE, OX, OZ: the framing; W, H: the screen, 874x402 for
// the phone on its side: then the five one under the other)
// The test page with one coop in each look in turn (?looks=N), seen from the game's camera, then one picture of all five
// (looks.png) with their names under them.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || 'barnlooks', TIME = process.env.TIME || '11:00', NAMES = ['Rustic', 'Mended', 'Snug', 'Cosy', 'Deluxe'];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = +(process.env.W || 402), H = +(process.env.H || 874), WIDE = W > H;
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const shots = [];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : [0, 1, 2, 3, 4];
for (const t of ONLY) {
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&looks=${t}&time=${TIME}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #replaybtn, #farmerbtn { display: none !important; }' });
  const info = await p.evaluate(([breed, sz, ox, oz]) => {
    const f = window.__farm, P = f.coopPlots().find(q => q.breed === breed); f.pause(true);
    const c = P.frame.localToWorld(new f.THREE.Vector3(ox, 0, oz)); f.lookAt(c.x, c.z, sz); f.step(1 / 30, 20); f.draw();
    return { tier: P.tier };
  }, [process.env.BREED || 'rir', +(process.env.SIZE || 1.75), +(process.env.OX || 0.1), +(process.env.OZ || 0.7)]);
  await p.waitForTimeout(300);
  const file = `${OUT}/look_${t}.png`; await p.screenshot({ path: file, timeout: 180000 }); shots.push([file, t]);
  console.log(NAMES[t], info);
}
// all five side by side (one under the other for the phone on its side), named
const img = f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="${WIDE ? `width:${W}px;height:${H}px` : 'width:400px;height:870px;object-fit:cover;object-position:50% 40%'};display:block">`;
const html = WIDE
  ? `<html><body style="margin:0;background:#f6efdc;font:700 22px Nunito,system-ui,sans-serif;color:#3b2a1a;width:${W}px">${shots.map(([f, t]) => `<div style="padding:10px 0 6px 12px">${t + 1}. ${NAMES[t]}</div>${img(f)}`).join('')}</body></html>`
  : `<html><body style="margin:0;background:#f6efdc;font:700 34px Nunito,system-ui,sans-serif;color:#3b2a1a;display:flex">${shots.map(([f, t]) => `<div style="text-align:center">${img(f)}<div style="padding:14px 0 18px">${t + 1}. ${NAMES[t]}</div></div>`).join('')}</body></html>`;
await p.setViewportSize(WIDE ? { width: W, height: 600 } : { width: 400 * shots.length, height: 980 }); await p.setContent(html); await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/looks.png`, fullPage: true });
console.log('errors', errs);
await b.close();

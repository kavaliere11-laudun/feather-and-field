// Every coop in its five looks (Rustic, Mended, Snug, Cosy, Deluxe), for the breeds' reference page (2 Nov 2026; Audrey:
// "all the chicken breeds, when, visuals and coops the 5 ones"): ./withserver.sh node coopcatalog.mjs OUT
// (ONLY=rir,orp: which breeds; LOOKS=0,4: which looks). The test village with one coop of the breed (?coopbreeds=B&coops=1)
// in look N (?looks=N), its birds about, seen from the game's own camera, framed a little wider as the pen grows; a square
// PNG each: OUT/<breed>_<look>.png.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/coops'; fs.mkdirSync(OUT, { recursive: true });
const BREEDS = (process.env.ONLY || 'rir,orp,sil,aya,call,leg,pol,bra,pea').split(',');
const LOOKS = (process.env.LOOKS || '0,1,2,3,4').split(',').map(Number);
const SIZE = [1.55, 1.75, 1.95, 2.35, 2.75];       // (the view's size for each look: the pens grow)
const EXTRA = { call: 0.35, pea: 0.5 };              // (the ducks' pond and the peafowl's gardens: a little wider)
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 560, height: 560 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
for (const breed of BREEDS) for (const t of LOOKS) {
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coops=1&coopbreeds=${breed}&looks=${t}&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #replaybtn, #farmerbtn, .vignette, #compass { display: none !important; }' });
  const info = await p.evaluate(([breed, sz]) => {
    const f = window.__farm, P = f.coopPlots()[0]; f.pause(true);
    const c = P.frame.localToWorld(new f.THREE.Vector3(0.1, 0, 0.75));
    f.lookFree(c.x, c.z, sz); f.step(1 / 30, 30); f.draw();
    return { breed: P.breed, tier: P.tier };
  }, [breed, SIZE[t] + (EXTRA[breed] || 0)]);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/${breed}_${t}.png`, timeout: 180000 });
  console.log(breed, t, JSON.stringify(info));
}
console.log('errors', JSON.stringify(errs.slice(0, 3)));
await b.close();

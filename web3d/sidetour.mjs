// A walk round everything on the farm from all four sides (release 6: now the view turns, the backs show): ./withserver.sh
// node sidetour.mjs [OUT]   (ONLY=props,decor,coops; LOOKS=0,4: those coop looks; MODELS=farmhouse,duckhouse: just those; PORT)
// The test village: each kind of thing in it (the farmhouse, the stall, the well, the bridges...), each decoration, and
// each breed's coop in each look (Rustic, Mended, Snug, Cosy, Deluxe), seen close from the usual side and turned a
// quarter, a half and three quarters round: four pictures side by side, OUT/<name>.jpg, then OUT/index.html of them all.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import { execSync } from 'child_process';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/tour', ONLY = (process.env.ONLY || 'props,decor,coops').split(','), LOOKS = (process.env.LOOKS || '0,1,2,3,4').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 480 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
const done = [], PICK = process.env.MODELS ? process.env.MODELS.split(',') : null, picked = m => !PICK || PICK.includes(m);
const open = async q => {
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&time=11:00${q}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #replaybtn, #farmerbtn, #dogbtn { display: none !important; }' });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 30); });
};
// four pictures of what's at (x, z), h tall and w wide, from the usual side and turned round; one strip
const four = async (name, x, z, h, w) => {
  const files = [];
  for (const az of [0, 90, 180, 270]) {
    const url = await p.evaluate(([x, z, h, w, az]) => { const f = window.__farm, d = Math.max(2.2, Math.max(h, w) * 2.1);
      f.closeShot({ at: [x, h * 0.4, z], az, el: 28, dist: d, fov: 32 }); return document.querySelector('canvas').toDataURL('image/jpeg', 0.85); }, [x, z, h, w, az]);
    const file = `${OUT}/_${name}_${az}.jpg`; fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); files.push(file);
  }
  execSync(`montage ${files.join(' ')} -tile 4x -geometry 360x360+2+2 -background white ${OUT}/${name}.jpg`); files.forEach(f => fs.rmSync(f));
  done.push(name);
};
if (ONLY.includes('props') || ONLY.includes('decor')) {
  await open('');
  if (ONLY.includes('props')) {
    const props = await p.evaluate(() => window.__farm.props());
    const seen = new Set();
    for (const q of props) { if (seen.has(q.model) || q.model === 'pasture' || q.model === 'wheat_field' || !picked(q.model)) continue; seen.add(q.model); await four('prop_' + q.model, q.pos[0], q.pos[2], q.h, q.w); }
  }
  if (ONLY.includes('decor')) {
    const list = await p.evaluate(() => window.__farm.decor().map(d => ({ model: d.model, x: d.pos[0], z: d.pos[1], h: d.box.max.y - d.box.min.y, w: Math.max(d.box.max.x - d.box.min.x, d.box.max.z - d.box.min.z) })));
    const seen = new Set();
    for (const d of list) { if (seen.has(d.model) || !picked(d.model)) continue; seen.add(d.model); await four('decor_' + d.model, d.x, d.z, d.h, d.w); }
  }
}
if (ONLY.includes('coops')) {
  const NAMES = ['rustic', 'mended', 'snug', 'cosy', 'deluxe'];
  for (const t of LOOKS) {
    await open('&looks=' + t);
    const coops = await p.evaluate(() => { const f = window.__farm, seen = new Set(), out = []; for (const P of f.coopPlots()) { if (seen.has(P.breed)) continue; seen.add(P.breed); const c = P.frame.localToWorld(new f.THREE.Vector3(0.1, 0, 0.4)); out.push({ breed: P.breed, x: c.x, z: c.z }); } return out; });
    for (const c of coops) await four(`coop_${c.breed}_${t}_${NAMES[t]}`, c.x, c.z, 1.6, 2.2);
  }
}
fs.writeFileSync(`${OUT}/index.html`, `<html><body style="font:14px sans-serif">${done.map(n => `<h3>${n}</h3><img src="${n}.jpg" width="1460">`).join('')}</body></html>`);
console.log('pictures', done.length, done.join(' '), 'errors', errs);
await b.close();

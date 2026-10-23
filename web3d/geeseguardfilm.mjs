// Frames of the geese guarding: Rusty visits coop N; filmed from just before they hear him until they're back to bed (or
// SECS): node geeseguardfilm.mjs OUT [coop] [secs] [fps]   (SIZE: the view; W, H, DPR; LANG=fr)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'gg', coop = '8', secs = '30', fpsArg = '12'] = process.argv.slice(2);
const FPS = +fpsArg, PER = Math.round(30 / FPS);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W || 402), height: +(process.env.H || 874) }, deviceScaleFactor: parseFloat(process.env.DPR || '2'), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&visit=${coop}&geese` + (process.env.LANG === 'fr' ? '&lang=fr' : ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#readout, .top' + (process.env.CHROME ? '' : ', #foxbtn, #farmerbtn') + (process.env.NOHINT ? ', #hint, #tag' : '') + ' { display: none !important; }' });
await p.evaluate((lead) => {
  const f = window.__farm, F = f.geese(), V = f.visit(), G = F.geese[0]; f.pause(true); V.again = () => 1e9;
  for (let i = 0; i < 30 * 200; i++) { f.step(1 / 30, 1); if (V.fox.root.visible && Math.hypot(V.fox.pos.x - G.pos.x, V.fox.pos.z - G.pos.z) < 14 + lead) break; if (F.guarding) break; }
}, +(process.env.LEAD || 2.5));
let n = 0; const log = [];
for (let i = 0; i < +secs * FPS; i++) {
  const s = await p.evaluate(([per, size]) => {
    const f = window.__farm, F = f.geese(), V = f.visit(), T = f.THREE, c = F.centre(new T.Vector3()), fox = V.fox;
    f.step(1 / 30, per);
    // the view: on the geese, and Rusty too while he's near them
    // (Gertrude and Rusty both in view while he's within 12 m of her, the view widening to fit them)
    let x = c.x, z = c.z, sz = size; const G = F.geese[0], d = Math.hypot(fox.pos.x - G.pos.x, fox.pos.z - G.pos.z);
    if (fox.root.visible && d < 12) { x = (G.pos.x + fox.pos.x) / 2; z = (G.pos.z + fox.pos.z) / 2; sz = Math.max(size, d * 0.62 + 0.9); }
    window.__cam = window.__cam || [x, z, sz]; const k = Math.min(1, 0.05 * per);
    window.__cam[0] += (x - window.__cam[0]) * k; window.__cam[1] += (z - window.__cam[1]) * k; window.__cam[2] += (sz - window.__cam[2]) * k;
    f.lookAt(window.__cam[0] + 0.3, window.__cam[1] + 0.3, window.__cam[2]); f.draw();
    return F.geese.map(g => g.act).join('/') + ' ' + (V.state || '') + (F.guarding ? ' guard' : '') + ' d' + Math.round(d);
  }, [PER, +(process.env.SIZE || 2.0)]);
  log.push(s);
  await p.screenshot({ path: `${out}_${String(n++).padStart(4, '0')}.png`, timeout: 120000 });
}
console.log('frames', n, 'errors', errs, [...new Set(log)].join(' | '));
await b.close();

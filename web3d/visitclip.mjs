// Frames of a night visit, following Rusty: node visitclip.mjs PLOT SECONDS FPS OUT [size] [farmerAt] [shut]
// (stepped exactly; DPR=2 for a sharp video; LANG=fr for the French texts). Writes OUT_0000.png ... and OUT_log.json.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';
const [plot = '5', secs = '60', fps = '10', out = 'visit', size = '3.2', farmerAt = '', shut = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: parseFloat(process.env.DPR || '1.5'), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coops=10&visit=${plot}${process.env.LANG === 'fr' ? '&lang=fr' : ''}`);
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint { transition: none !important; } #readout { display: none !important; }' });
await p.evaluate(([shut]) => { const f = window.__farm; f.pause(true); if (shut) for (const pl of f.plots) if (pl.door) f.setDoor(pl, false); f.step(1 / 30, 75); }, [shut]);
const n = Math.round(parseFloat(secs) * parseFloat(fps)), per = Math.max(1, Math.round(30 / parseFloat(fps))), log = [];
let cx = null, cz = null, sent = false;
for (let i = 0; i < n; i++) {
  const st = await p.evaluate(([per, size, fa, i, fps, cx, cz]) => {
    const f = window.__farm, V = f.visit(), fox = V.fox;
    f.step(1 / 30, per);
    if (fa && !V.farmerSent && i / fps >= fa && V.canSend()) { document.getElementById('farmerbtn').click(); V.farmerSent = true; }
    // the camera follows him gently (and between him and the torch while it's out)
    let tx = fox.pos.x, tz = fox.pos.z;
    if (V.farmer && V.torch.on > 0.2) { tx = (tx + V.torch.pos.x) / 2; tz = (tz + V.torch.pos.y) / 2; }
    if (!fox.root.visible && V.target) { const c = V.target.frame.getWorldPosition(new f.THREE.Vector3()); tx = c.x; tz = c.z; }
    const k = 1 - Math.pow(0.9, per); if (cx === null) { cx = tx; cz = tz; } else { cx += (tx - cx) * k; cz += (tz - cz) * k; }
    f.lookAt(cx - 0.25, cz + 0.35, size); f.draw();
    const task = fox.task && fox.task.cur ? fox.task.cur() : fox.task;
    return { cx, cz, phase: V.phase, state: V.state, task: task ? task.name : '', active: V.active() };
  }, [per, parseFloat(size), farmerAt ? parseFloat(farmerAt) : 0, i, parseFloat(fps), cx, cz]);
  cx = st.cx; cz = st.cz; log.push(st);
  await p.screenshot({ path: `${out}_${String(i).padStart(4, '0')}.png`, timeout: 240000 });
  if (!st.active && i > 5 && log[i - 1] && !log[i - 1].active) break;
}
writeFileSync(out + '_log.json', JSON.stringify(log));
console.log('frames', log.length, 'errors', errs);
await b.close();

// Frames of the fox family coming out and playing, the view following them: node foxclip.mjs SECONDS FPS OUT [size]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [secs = '20', fps = '12', out = 'fc', size = '2.6'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&foxes&time=' + (process.env.HOUR || '16'));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#readout, #hint { display: none !important; }' });
const per = Math.max(1, Math.round(30 / +fps));
await p.evaluate(([size, skip]) => { const f = window.__farm, F = f.foxes(); f.pause(true); f.step(1 / 30, skip); const c = F.centre(new f.THREE.Vector3()); window.__cam = [c.x, c.z]; f.lookAt(c.x + 0.3, c.z + 0.3, +size); }, [size, +(process.env.SKIP || 1)]);
for (let k = 0; k < +secs * +fps; k++) {
  await p.evaluate(([per, size]) => {
    const f = window.__farm, F = f.foxes(); f.step(1 / 30, per);
    const c = F.centre(new f.THREE.Vector3()), m = window.__cam; m[0] += (c.x - m[0]) * 0.08; m[1] += (c.z - m[1]) * 0.08;
    f.lookAt(m[0] + 0.3, m[1] + 0.3, +size); f.draw();
  }, [per, size]);
  await p.screenshot({ path: `${out}_${String(k).padStart(3, '0')}.png`, timeout: 240000 });
}
console.log('frames', +secs * +fps);
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

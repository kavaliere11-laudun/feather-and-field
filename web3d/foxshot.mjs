// The fox family in the meadow: node foxshot.mjs [out] [seconds between pictures] [count] [size]  (?foxes brings them out)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'fox', gap = '3', count = '6', size = '2.6'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.VW || 390), height: +(process.env.VH || 760) }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&foxes&time=' + (process.env.HOUR || '16'));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 120); });
for (let i = 0; i < +count; i++) {
  const st = await p.evaluate(([gap, size]) => {
    const f = window.__farm, F = f.foxes(); f.step(1 / 30, Math.round(gap * 30));
    const c = F.centre(new f.THREE.Vector3()); f.lookAt(c.x + 0.3, c.z + 0.3, size); f.draw();
    return F.foxes.map(x => x.name + ':' + (x.task ? x.task.name : '-') + (x.root.visible ? '' : '(in)')).join(' ');
  }, [+gap, +size]);
  console.log(i, st);
  await p.screenshot({ path: `${out}_${i}.png`, timeout: 240000 });
}
if (errs.length) console.log('ERRORS', errs.slice(0, 4).join(' | '));
await b.close();

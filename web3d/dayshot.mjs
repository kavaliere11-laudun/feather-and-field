// The same view at several hours of the day: node dayshot.mjs [hours,comma,separated] [size] [out] (env LX LZ: a world point)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [hours = '7,12.5,17.5,19,20.2,22', size = '4.4', out = 'day'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.VW || 390), height: +(process.env.VH || 700) }, deviceScaleFactor: 1.5 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !m.text().includes('TUNNEL')) errs.push(m.text()); });
await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0' + (process.env.QS || ''));
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top { display: none !important; }' });
for (const h of hours.split(',').map(Number)) {
  await p.evaluate(([h, s, lx, lz]) => {
    const f = window.__farm; f.pause(true); f.freeze(true);
    const t = f.view.target; f.lookAt(lx ?? t.x, lz ?? t.z, s);
    f.setHour(h); f.draw();
  }, [h, parseFloat(size), process.env.LX ? +process.env.LX : null, process.env.LZ ? +process.env.LZ : null]);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}_${String(h).replace('.', '_')}.png` });
}
if (errs.length) console.log('ERRORS', errs.slice(0, 3).join(' | '));
await b.close();

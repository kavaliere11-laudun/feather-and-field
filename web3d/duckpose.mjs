// Close-ups of the mallards' line-up poses for tuning: node duckpose.mjs OUTDIR [who,who..] [secs]
// VARS='[{"tip":1.1},{"tip":1.3}]' tries settings for the up-ending (window.__UP) one picture each; SIZE the view's half height
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'dp', whoS = '12,13', secs = '2.6'] = process.argv.slice(2);
const vars = JSON.parse(process.env.VARS || '[{}]'), who = whoS.split(',').map(Number);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup=ducks`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, #tag, .top { display: none !important; }' });
await p.evaluate(([s]) => { const f = window.__farm; f.pause(true); f.setHour(14); f.step(1 / 30, Math.round(s * 30)); }, [+secs]);
let n = 0;
for (const v of vars) for (const w of who) {
  await p.evaluate(([v, w, size, extra]) => {
    const f = window.__farm; window.__UP = v; f.step(1 / 30, extra || 1); f.view.size = size;
    const L = f.geeseLineup(), d = L.ducks[w], q = d.root.getWorldPosition(new f.THREE.Vector3()); f.lookAt(q.x, q.z); f.draw();
  }, [v, w, +(process.env.SIZE || 0.26), +(process.env.EXTRA || 1)]);
  await p.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}.png`, clip: { x: 0, y: 187, width: 402, height: 500 }, timeout: 120000 });
}
console.log('errors', errs);
await b.close();

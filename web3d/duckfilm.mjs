// Frames following the pond's ducks (their middle, or one of them): node duckfilm.mjs OUT [secs] [fps] [hour] [who] [size]
// (who: -1 their middle, 0 Rocco, 1 Daisy, 2 Dot; SKIP: seconds to run first; PLAN=5:bath,20:rest,40:tap0: what Rocco does
// when (or a tap on one); START: seconds of the film run before the pictures start; NIGHT=h: the hour once SKIP is done)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'df', secs = '20', fps = '15', hour = '14', who = '-1', size = '1.3'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGE ERROR', e.message); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=${process.env.Q || 0}&ducks${process.env.LANG === 'fr' ? '&lang=fr' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #replaybtn { display: none !important; }' });
await p.evaluate(([h, skip, night]) => { const f = window.__farm; f.pause(true); f.setHour(h); for (let i = 0; i < skip; i++) f.step(1 / 30, 30); if (night) f.setHour(night); }, [+hour, +(process.env.SKIP || 1), +(process.env.NIGHT || 0)]);
const log = [];
for (let i = 0; i < +secs * +fps; i++) {
  const s = await p.evaluate(([dt, who, size, t, plan]) => {
    const f = window.__farm, D = f.ducks();
    window.__done = window.__done || {};
    for (const [at, what] of plan) if (t >= at && !window.__done[at]) {
      window.__done[at] = true; const R = D.ducks[0];
      if (what.startsWith('tap')) { const d = D.ducks[+what.slice(3) || 0]; d.tapped(f.THREE ? new f.THREE.Vector3(1, 1.3, 1) : null); }
      else if (what === 'peek') { const F = f.frogs(), d = D.ducks[2], fr = F.frogs.slice().sort((a, b) => Math.hypot(a.pos.x - d.pos.x, a.pos.z - d.pos.z) - Math.hypot(b.pos.x - d.pos.x, b.pos.z - d.pos.z))[0]; d.peekOk = 0; d.curious = 1; D.heard(fr.pos.x, fr.pos.z); }
      else R.task = D.nextLead(R, 14, what);
    }
    f.step(1 / 30, Math.max(1, Math.round(dt * 30))); f.water(100 + t); f.wind(100 + t);
    // the view: all three in it (their spread across the screen and up it, the screen being narrow), or the one asked for
    const ds = who < 0 ? D.ducks.filter(d => d.root.visible) : [D.ducks[who]], SX = d => (d.pos.x - d.pos.z) / Math.SQRT2, SY = d => (d.pos.x + d.pos.z) / Math.SQRT2 * 0.669;
    const x0 = Math.min(...ds.map(SX)), x1 = Math.max(...ds.map(SX)), y0 = Math.min(...ds.map(SY)), y1 = Math.max(...ds.map(SY));
    const sx = (x0 + x1) / 2, sy = (y0 + y1) / 2 / 0.669, cx = (sx + sy) / Math.SQRT2, cz = (sy - sx) / Math.SQRT2;
    const want = Math.max(size, (x1 - x0) / 2 * 874 / 402 + 0.45, (y1 - y0) / 2 + 0.45);
    window.__c = window.__c || [cx, cz, want]; const k = Math.min(1, 1.2 * dt); window.__c[0] += (cx - window.__c[0]) * k; window.__c[1] += (cz - window.__c[1]) * k; window.__c[2] += (Math.min(2.4, want) - window.__c[2]) * k * 0.7;
    f.lookAt(window.__c[0], window.__c[1], window.__c[2]); f.draw();
    return D.plan + ' ' + D.ducks.map(d => (d.task ? d.task.name : '-') + '/' + d.act).join(' ');
  }, [1 / +fps, +who, +size, i / +fps, (process.env.PLAN || '').split(',').filter(Boolean).map(x => { const [a, w] = x.split(':'); return [+a, w]; })]);
  log.push(s);
  if (i / +fps >= +(process.env.START || 0)) await p.screenshot({ path: `${out}_${String(i).padStart(4, '0')}.png`, timeout: 120000 });
}
let last = ''; const marks = []; log.forEach((l, i) => { if (l !== last) { marks.push(i + ':' + l); last = l; } });
console.log('frames', log.length, 'errors', errs, marks.join(' | '));
await b.close();

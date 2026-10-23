// Frames following one of the pond's frogs: node frogfilm.mjs OUT [secs] [fps] [hour] [frog] [size]   (phone size; DSF;
// PLAN: what it does when, e.g. PLAN=2:croak,6:hopAlong,11:dive,30:tap)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'ff', secs = '20', fps = '12', hour = '14', who = '0', size = '1.1'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGE ERROR', e.message); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&frogs`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #replaybtn { display: none !important; }' });
await p.evaluate(([h, skip]) => { const f = window.__farm; f.pause(true); f.setHour(h); f.step(1 / 30, skip); }, [+hour, +(process.env.SKIP || 30)]);
const log = [];
for (let i = 0; i < +secs * +fps; i++) {
  const s = await p.evaluate(([dt, who, size, t, plan]) => {
    const f = window.__farm, F = f.frogs(), fr = F.frogs[who];
    // PLAN="2:croak,6:hopAlong,11:dive,30:tap": what it does when (the moment it's free, as if it chose it)
    window.__done = window.__done || {};
    for (const [at, what] of plan) if (t >= at && !window.__done[at] && (!fr.task || /^(sit|look|float)$/.test(fr.task.name))) {
      window.__done[at] = true;
      if (what === 'tap') F.tapped(fr); else { fr.task = what === 'dive' ? F.dive(fr, false) : F[what](fr); fr.wait = 0; }
    }
    f.step(1 / 30, Math.max(1, Math.round(dt * 30))); f.water(100 + t); f.wind(100 + t);
    window.__c = window.__c || [fr.pos.x, fr.pos.z]; const k = Math.min(1, 2.4 * dt); window.__c[0] += (fr.pos.x - window.__c[0]) * k; window.__c[1] += (fr.pos.z - window.__c[1]) * k;
    f.lookAt(window.__c[0], window.__c[1], size); f.draw();
    return (fr.task ? fr.task.name : '-') + '/' + fr.state;
  }, [1 / +fps, +who, +size, i / +fps, (process.env.PLAN || '').split(',').filter(Boolean).map(x => { const [a, w] = x.split(':'); return [+a, w]; })]);
  log.push(s);
  await p.screenshot({ path: `${out}_${String(i).padStart(4, '0')}.png`, timeout: 120000 });
}
let last = ''; const marks = []; log.forEach((l, i) => { if (l !== last) { marks.push(i + ':' + l); last = l; } });
console.log('frames', log.length, 'errors', errs, marks.join(' | '));
await b.close();

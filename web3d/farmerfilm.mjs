// Frames following the farmer: node farmerfilm.mjs OUT [secs] [fps] [hour] [size]  (SKIP: seconds first; START: seconds
// of film before the pictures; EXTRA: more page options, e.g. &visit=3 to have Rusty out; SEND=t: send the farmer at t;
// PLAN=1:6.6,5:coop,30:fox: at t the hour, what the farmer does next, or whom the camera follows; OFF: the view's centre
// from him along x and z (-0.45 puts him in the middle of the picture); FOLLOW: how quickly the view keeps up, per second)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'ff', secs = '20', fps = '12', hour = '14', size = '2.2'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGE ERROR', e.message); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=${process.env.Q || 0}&farmer${process.env.EXTRA || ''}${process.env.LANG === 'fr' ? '&lang=fr' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#hint, #readout, .top, #replaybtn, #farmerbtn, #foxbtn { display: none !important; }' });
await p.evaluate(([h, skip]) => { const f = window.__farm; f.pause(true); f.setHour(h); for (let i = 0; i < skip * 30; i++) f.step(1 / 30, 1); }, [+hour, +(process.env.SKIP || 0)]);
const log = [];
for (let i = 0; i < +secs * +fps; i++) {
  const t = i / +fps, draw = t >= +(process.env.START || 0);
  const s = await p.evaluate(([dt, size, t, send, draw, off, follow, plan]) => {
    const f = window.__farm, L = f.farmer(), V = f.visit();
    if (send >= 0 && t >= send && !window.__sent && V && V.canSend()) { window.__sent = V.sendFarmer(); }
    window.__done = window.__done || {};
    for (const [at, what] of plan) if (t >= at && !window.__done[at]) { if (!/^([\d.]+|fox|me)$/.test(what) && (L.home || L.f.opacity < 0.99)) continue; window.__done[at] = true; if (/^[\d.]+$/.test(what)) f.setHour(+what); else if (what === 'fox') window.__follow = 'fox'; else if (what === 'me') window.__follow = null; else L.task = L.next(14, what); }
    f.step(1 / 30, Math.max(1, Math.round(dt * 30))); f.water(100 + t); f.wind(100 + t);
    const at = window.__follow === 'fox' && V && V.fox.root.visible ? V.fox.pos : L.pos;
    window.__c = window.__c || [at.x, at.z]; const k = Math.min(1, follow * dt);
    // (looking ahead of him by as much as the view lags behind, so he stays in the middle when he walks or runs)
    const last = window.__last || [at.x, at.z], v = window.__v = window.__v || [0, 0], kv = Math.min(1, 3 * dt);
    if (Math.hypot(at.x - last[0], at.z - last[1]) > 0.6) v[0] = v[1] = 0;      // (a jump: following someone else)
    else { v[0] += ((at.x - last[0]) / dt - v[0]) * kv; v[1] += ((at.z - last[1]) / dt - v[1]) * kv; }
    window.__last = [at.x, at.z];
    const lead = window.__lead ?? 1; window.__c[0] += (at.x + lead * v[0] / follow - window.__c[0]) * k; window.__c[1] += (at.z + lead * v[1] / follow - window.__c[1]) * k;
    f.lookAt(window.__c[0] + off, window.__c[1] + off, size); if (draw) f.draw();
    return (L.home ? 'home' : 'out') + ' ' + (L.task ? L.task.name : L.running ? 'torch' : '-') + (V && V.farmer ? ' F:' + V.farmer.stage : '') + (V ? ' V:' + V.state : '');
  }, [1 / +fps, +size, t, +(process.env.SEND ?? -1), draw, +(process.env.OFF ?? 0.25), +(process.env.FOLLOW ?? 2), (process.env.PLAN || '').split(',').filter(Boolean).map(x => { const [a, w] = x.split(':'); return [+a, w]; })]);
  log.push(s);
  if (draw) await p.screenshot({ path: `${out}_${String(i).padStart(4, '0')}.png`, timeout: 120000 });
}
let last = ''; const marks = []; log.forEach((l, i) => { if (l !== last) { marks.push(i + ':' + l); last = l; } });
console.log('frames', log.length, 'errors', errs, marks.join(' | '));
await b.close();

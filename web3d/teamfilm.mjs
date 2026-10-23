// Frames of the team effort at night: Rusty visits coop N; from the first alarm (FROM=alarm), when Biscuit wakes (FROM=wake) or the parade (FROM=parade),
// the view on Biscuit and Rusty (or the geese, at the parade): node teamfilm.mjs OUT [coop] [secs] [fps]   (LANG=fr; CAM=geese;
// CUT=1, below)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'tf', coop = '8', secs = '20', fpsArg = '8'] = process.argv.slice(2);
const FPS = +fpsArg, PER = Math.round(30 / FPS), FROM = process.env.FROM || 'wake';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&visit=${coop}` + (process.env.LANG === 'fr' ? '&lang=fr' : ''), { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
await p.addStyleTag({ content: '#readout, .top, #foxbtn, #farmerbtn, #dogbtn, #tag { display: none !important; } #hint.keep { opacity: 1 !important; transform: translate(-50%, 0) !important; transition: none !important; } #hint.nokeep { opacity: 0 !important; transition: none !important; }' });
await p.evaluate((from) => {
  const f = window.__farm, D = f.dog(), F = f.geese(), V = f.visit(); f.pause(true); V.again = () => 1e9;
  for (let i = 0; i < 30 * 300; i++) {
    f.step(1 / 30, 1);
    if (from === 'wake' && D.guard) break;
    if (from === 'alarm' && (D.guard || F.guarding)) break;          // (whoever hears him first)
    if (from === 'parade' && D.guard && D.guard.stage === 'parade') break;
  }
}, FROM);
// CUT=1: a cut of the story: each moment (Biscuit's stage / Gertrude's) filmed for at most so many seconds, the rest
// skipped (the view jumping to the next), ending when they head home; or CUT='{"back/await": 6}': only those moments
const CUT = process.env.CUT && process.env.CUT.startsWith('{') ? JSON.parse(process.env.CUT) : process.env.CUT ? { '/wake': 2.5, 'wake/wake': 1.6, 'out/wake': 3, 'out/charge': 3, 'charge/charge': 6, 'pursue/charge': 3, 'pursue/hiss': 2, 'pursue/pursue': 4,
  'pursue/gather': 3, 'pursue/await': 3, 'stand/await': 3.2, 'stand/gather': 3.2, 'back/gather': 2.5, 'back/await': 2.5, 'parade/gather': 2.5, 'parade/await': 2.5, 'parade/victory': 2.6,
  'parade/lap': 7, 'parade/tada': 5.5 } : null;
const log = [];
for (let n = 0; n < +secs * FPS; n++) {
  const s = await p.evaluate(([per, base, cam, cut]) => {
    const f = window.__farm, D = f.dog(), d = D.dog, V = f.visit(), F = f.geese(), fox = V.fox, G = F.geese[0];
    const key = () => (D.guard ? D.guard.stage : '') + '/' + (F.guarding && G.task ? G.task.stage || '' : '');
    if (cut) {
      window.__spent = window.__spent || {};
      let k = key();
      if ((window.__spent[k] || 0) >= (cut[k] || 0)) {                   // (this moment done: on to the next one filmed)
        const h = document.getElementById('hint');
        for (let i = 0; i < 30 * 200 && (window.__spent[k] || 0) >= (cut[k] || 0) && !/home|face/.test(k); i++) {
          f.step(1 / 30, 1); k = key(); window.__t = (window.__t || 0) + 1 / 30;
          if (h.textContent !== window.__hintTxt) { window.__hintTxt = h.textContent; window.__hintAt = window.__t; }        // (a message while skipping: from when it came)
        }
        window.__cam = null;
      }
      if (/home|face/.test(k) || (!D.guard && !F.guarding)) return 'END';
      window.__spent[k] = (window.__spent[k] || 0) + per / 30;
    }
    f.step(1 / 30, per);
    // the view: who's in the story right now, close enough to see them (CAM=geese: the geese, for a cut to them)
    const st = D.guard ? D.guard.stage : '', gst = F.guarding && G.task ? G.task.stage || '' : '';
    const P = o => [o.pos.x, o.pos.z], far = (o, m) => Math.hypot(o.pos.x - d.pos.x, o.pos.z - d.pos.z) > m;
    let who = [P(d)];
    if (cam === 'geese' || (!D.guard && F.guarding)) who = F.geese.map(P);
    else if (/^(charge|pursue|stand)$/.test(st)) { if (fox.root.visible && !far(fox, 7)) who.push(P(fox)); for (const g of F.geese) if (!far(g, 3.5)) who.push(P(g)); }
    else if (/^(back|parade)$/.test(st) || (!D.guard && gst)) { for (const g of F.geese) if (!far(g, 7)) who.push(P(g)); }
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const [a, c] of who) { x0 = Math.min(x0, a); x1 = Math.max(x1, a); z0 = Math.min(z0, c); z1 = Math.max(z1, c); }
    const x = (x0 + x1) / 2, z = (z0 + z1) / 2, sz = Math.min(4.6, Math.max(base, Math.hypot(x1 - x0, z1 - z0) * 0.62 + 1.0));
    window.__cam = window.__cam || [x, z, sz]; const k = Math.min(1, 0.07 * per);
    window.__cam[0] += (x - window.__cam[0]) * k; window.__cam[1] += (z - window.__cam[1]) * k; window.__cam[2] += (sz - window.__cam[2]) * k;
    // the message at the top: on for 4.5 s of the farm's time (the page times it in real seconds, and a frame here takes
    // a few real seconds to draw)
    const h = document.getElementById('hint');
    if (h.textContent !== window.__hintTxt) { window.__hintTxt = h.textContent; window.__hintAt = window.__t || 0; }
    const keep = (window.__t || 0) - window.__hintAt < 4.5; h.classList.toggle('keep', keep); h.classList.toggle('nokeep', !keep);
    f.lookAt(window.__cam[0] - 0.2, window.__cam[1] - 0.2, window.__cam[2]); f.draw();
    window.__t = (window.__t || 0) + per / 30;
    return (+window.__t.toFixed(1)) + ' ' + st + '/' + (F.guarding && G.task ? G.task.stage || G.task.name : '') + '/' + V.state;
  }, [PER, +(process.env.SIZE || 1.9), process.env.CAM || 'dog', CUT]);
  if (s === 'END') break;
  log.push(s);
  await p.screenshot({ path: `${out}_${String(n).padStart(4, '0')}.png`, timeout: 120000 });
}
// (when each stage starts, by frame)
let last = ''; const marks = [];
log.forEach((l, i) => { const k = l.slice(l.indexOf(' ') + 1); if (k !== last) { marks.push(i + ':' + k); last = k; } });
console.log('frames', log.length, 'errors', errs, marks.join(' | '));
await b.close();

// A film of the geese's trust (release 3): node geesetrustfilm.mjs OUTDIR [parts]   (parts: cross,wary,curious,friends, by
// default cross,friends; LANG=fr: in French with Rosie; FPS (12), DSF (2), EVERY: one picture in N (a quick look); PORT)
// A level-4 farm with the geese. Each part: their card (a finger on its button), then the visit from the farmer's arrival
// at their gate to his leaving, the view gliding with him and them. cross: the first day (they chase him out, his hat
// flies off); wary: the third (a hiss from afar, the corn eaten once he's stepped back); curious: the fifth (corn by his
// feet); friends: the seventh (up to him for a stroke, hearts). The farmer starts a few steps from the gate (the walk from
// the farmhouse cut). Prints the frames and the marks.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [OUT = 'gtf', partsArg = 'cross,friends'] = process.argv.slice(2), parts = partsArg.split(','), fr = process.env.LANG === 'fr';
const FPS = +(process.env.FPS || 12), EVERY = +(process.env.EVERY || 1), W = 402, H = 874;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DSF || 2), hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); p.setDefaultNavigationTimeout(120000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
let n = 0, k = 0; const marks = [];
const shot = async () => { if (k++ % EVERY === 0) await p.screenshot({ path: `${OUT}/f_${String(n++).padStart(4, '0')}.png`, timeout: 120000 }); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T, true); f.gameUI().close(); });
};
const finger = (x, y, on) => p.evaluate(([x, y, on]) => {
  let d = document.getElementById('finger');
  if (!d) { d = document.createElement('div'); d.id = 'finger'; d.style.cssText = 'position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,0.45);border:3px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:99999;pointer-events:none;display:none'; document.body.append(d); }
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.display = on ? 'block' : 'none';
}, [x, y, on]);
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 }); await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(fr => { const g = window.__farm.game(); g.data.xp = Math.round(60 * Math.pow(3, 2.1)) + 50; g.data.lvSeen = 4; g.data.land = [0, 1, 2, 3]; g.data.guide = { step: 5, done: true }; g.data.animals = { geese: { at: window.__T - 9 * 86400e3 } }; g.data.lastSeen = window.__T - 60e3; if (fr) { g.data.farmer.look = 'f'; g.data.farmer.name = 'Rosie'; } g.save(); sessionStorage.setItem('__T', window.__T); }, fr);
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.addStyleTag({ content: '#readout, #replaybtn { display: none !important; }' });
const TRUST = { cross: 0, wary: 3, curious: 5, friends: 7 };
for (const part of parts) {
  // the day: trust one short of the part's (this visit makes it), the geese near their gate, the farmer a few steps off
  await p.evaluate(([n, day]) => {
    const f = window.__farm, g = f.game(), F = f.geese(), L = f.farmer();
    window.__T = new Date(2026, 9, 26 + day, 10, 30).getTime(); sessionStorage.setItem('__T', window.__T);
    g.data.animals.geese.trust = Math.max(0, n - 1); if (n > 1) g.data.animals.geese.day = '20261025'; else delete g.data.animals.geese.day; delete g.data.animals.geese.happy; g.save();
    f.step(1 / 30, 2);
    const G = F.geese[0], gate = f.geeseTrust.gates().find(q => q.reg === F.regionAt(G.pos.x, G.pos.z)) || f.geeseTrust.gates()[0];
    L.task = null; L.pending = null; L.home = false; L.placed = true; L.f.fade(1); L.pos.set(gate.flee[0], 0, gate.flee[1]); L.heading = Math.atan2(gate.out[0] - gate.flee[0], gate.out[1] - gate.flee[1]);      // (along the lane, where he'll run to)
    const c = [(gate.meet[0] + L.pos.x) / 2, (gate.meet[1] + L.pos.z) / 2]; f.lookAt(c[0], c[1], 2.5); window.__cam = c;
    f.step(1 / 30, 4); f.draw();
  }, [TRUST[part], TRUST[part] + 1]);
  await p.evaluate(() => window.__farm.geeseTrust.card());
  marks.push(part + ':' + n);
  for (let i = 0; i < FPS * 1.6; i++) await shot();
  const r = await p.evaluate(() => { const e = document.querySelector('.gsheet .gcuddle'); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await finger(r.x, r.y, true); for (let i = 0; i < FPS * 0.5; i++) await shot();
  await p.evaluate(() => document.querySelector('.gsheet .gcuddle').click());
  await finger(0, 0, false);
  if (process.env.DEBUG) console.log(await p.evaluate(() => { const f = window.__farm, L = f.farmer(); return JSON.stringify({ hint: document.getElementById('hint').textContent, V: !!f.geeseTrust.V(), home: L.home, running: L.running, task: L.task && L.task.name, hour: f.game && f.game().data && new Date(window.__T).getHours(), trust: f.game().geeseTrust() }); }));
  // the visit, the view gliding with the farmer and the geese
  let after = 0;
  for (let i = 0; i < FPS * 90; i++) {
    const on = await p.evaluate(fps => {
      const f = window.__farm, F = f.geese(), L = f.farmer(), V = f.geeseTrust.V();
      for (let s = 0; s < 30 / fps; s++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); }
      const G = F.geese[0], H = F.geese[1], gx = (G.pos.x + H.pos.x) / 2, gz = (G.pos.z + H.pos.z) / 2, dg = Math.hypot(gx - L.pos.x, gz - L.pos.z);
      const w = dg < 4.5 && V && V.inside ? 0.42 : dg < 4.5 && L.pen ? 0.3 : 0.12, want = [L.pos.x * (1 - w) + gx * w, L.pos.z * (1 - w) + gz * w], c = window.__cam;
      c[0] += (want[0] - c[0]) * 0.06; c[1] += (want[1] - c[1]) * 0.06; f.lookAt(c[0], c[1], 2.5); f.draw();
      return !!V || !!L.pen;
    }, FPS);
    await shot();
    if (!on && ++after > FPS * 2.5) break;
  }
}
marks.push('end:' + n);
console.log('frames', n, 'errors', errs, marks.join(' | '));
await b.close();

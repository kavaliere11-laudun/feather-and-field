// The fox's night visit: node visittest.mjs  (three nights, stepped exactly: an open door, a shut door, and the farmer sent)
// Checks each visit gets there and home again, what happens at the door, that Rusty keeps to free ground on the way (never
// through a tree, bush, building, another pen, the pond or a stream), the buttons, and no page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : ''));
const PORT = process.env.PORT || 8770;
async function page(q) {
  const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html?q=0&coops=10&${q}`);
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 5); });
  return p;
}
// run until he's home (or `secs` pass), sampling every half second; `farmerAt`: press "Send the farmer" after that many seconds
async function run(p, secs, farmerAt) {
  return p.evaluate(([secs, farmerAt]) => {
    const f = window.__farm, V = f.visit(), fox = V.fox; let t = 0, started = false, offGrid = 0, worst = '', inPenHit = 0, penWorst = '', btn = false, alarm = false, sent = false, sawSend = false;
    for (let k = 0; k < secs * 2; k++) {
      f.step(1 / 30, 15); t += 0.5;
      if (V.active()) started = true;
      if (!document.getElementById('farmerbtn').hidden) sawSend = true;
      if (document.getElementById('foxbtn').classList.contains('alarm')) alarm = true;
      if (farmerAt !== null && !sent && t >= farmerAt && V.canSend()) { document.getElementById('farmerbtn').click(); sent = true; }
      // on the way: free ground (not in the den's mouth, a leap, or inside the pen he's visiting)
      const task = fox.task && fox.task.cur ? fox.task.cur() : fox.task;
      const name = task ? task.name : '';
      if (V.active() && fox.root.visible && !['emerge', 'in', 'leap', 'startle'].includes(name) && !V.inPen() && !V.nav.freeAt(fox.pos.x, fox.pos.z) && !f.onBridge(fox.pos.x, fox.pos.z)) { offGrid++; worst = name + ' ' + fox.pos.x.toFixed(2) + ',' + fox.pos.z.toFixed(2); }
      // in the pen he's visiting: clear of the feeder, the water, the hay and the rest (off the ramp, not in the air)
      if (V.active() && V.inPen() && V.lz == null && V.penGrids && V.penGrids[V.target.breed] && !['leap', 'startle', 'recoil', 'slide', 'climb'].includes(name)) {
        const l = V.target.frame.worldToLocal(fox.pos.clone());
        if (!V.penGrids[V.target.breed].freeAt(l.x, l.z)) { inPenHit++; penWorst = name + ' ' + l.x.toFixed(2) + ',' + l.z.toFixed(2); }
      }
      if (started && !V.active()) break;
    }
    return { t, started, home: started && !V.active() && fox.home, ended: V.ended, log: V.log.slice(), offGrid, worst, inPenHit, penWorst, sawSend, alarm, sent, torch: !!V.farmer };
  }, [secs, farmerAt]);
}

// 1. an open door at coop 5: there, the flurry, two pecks, home with a feather on his nose
let p = await page('visit=5');
let r = await run(p, 150, null);
ok('open door: he goes to coop 5, gets pecked twice and goes home', r.home && r.ended === 'pecked' && r.log.filter(s => s.startsWith('flurry 5')).length === 2, JSON.stringify(r.log) + ' · ' + r.t + ' s');
ok('open door: his way there and back keeps to free ground', r.offGrid === 0, r.worst);
ok('open door: in the pen he keeps clear of the feeder, water, hay and the rest', r.inPenHit === 0, r.penWorst);
ok('the "Fox!" alarm and "Send the farmer" showed while he was out', r.alarm && r.sawSend);
ok('afterwards the buttons are gone', await p.evaluate(() => document.getElementById('farmerbtn').hidden && document.getElementById('foxbtn').hidden));
ok('no page errors (open door)', !p.errs.length, p.errs.join(' | '));
await p.close();

// 2. every door shut: he scratches at a door, sits puzzled and gives up (or tries one more)
p = await page('visit=7');
await p.evaluate(() => { const f = window.__farm; for (const pl of f.plots) if (pl.door) f.setDoor(pl, false); f.step(1 / 30, 60); });
r = await run(p, 150, null);
ok('shut doors: he finds the door shut and goes home', r.home && r.ended === 'shut' && !r.log.some(s => s.startsWith('flurry')), JSON.stringify(r.log) + ' · ' + r.t + ' s');
ok('shut doors: his way keeps to free ground', r.offGrid === 0, r.worst);
ok('no page errors (shut doors)', !p.errs.length, p.errs.join(' | '));
await p.close();

// 3. the farmer: sent while Rusty is on his way; the torch finds him and he runs home
p = await page('visit=2');
r = await run(p, 150, 9);
ok('farmer: sent, he shoos Rusty, who runs home', r.sent && r.home && r.ended === 'shooed' && r.log.includes('shoo'), JSON.stringify(r.log) + ' · ' + r.t + ' s');
ok('farmer: Rusty keeps to free ground', r.offGrid === 0, r.worst);
const torch = await p.evaluate(() => { const f = window.__farm, V = f.visit(); for (let k = 0; k < 80 && V.farmer; k++) f.step(1 / 30, 15); f.step(1 / 30, 30); return { gone: !V.farmer, shown: V.torch.group.visible }; });
ok('the torch goes back to the farmhouse and fades out', torch.gone && !torch.shown, JSON.stringify(torch));
ok('no page errors (farmer)', !p.errs.length, p.errs.join(' | '));
await p.close();

// every coop (all five house styles); on odd ones the farmer comes at a different moment (on the way, at the door, on the ramp)
const every = [];
for (let i = 0; i < 10; i++) {
  p = await page('visit=' + i);
  const fa = i % 2 ? [6, 18, 24, 27, 31][(i - 1) / 2] : null;
  r = await run(p, 160, fa);
  const good = r.home && r.offGrid === 0 && r.inPenHit === 0 && !p.errs.length && (fa === null ? r.ended === 'pecked' : r.ended === 'shooed' || r.ended === 'pecked');
  every.push(i + ':' + (good ? 'ok' : 'BAD') + ' ' + r.ended + ' ' + r.t + 's' + (good ? '' : ' ' + JSON.stringify({ log: r.log, off: r.worst, pen: r.penWorst, errs: p.errs })));
  await p.close();
}
ok('a visit to each of the 10 coops gets there and home, clear of everything, no page errors', every.every(e => e.includes(':ok')), every.join(' | '));

// 4. by day nothing happens, and he isn't out
p = await page('time=12:00');
const day = await p.evaluate(() => { const f = window.__farm, V = f.visit(); f.step(1 / 30, 3000); return { active: V.active(), log: V.log.length }; });
ok('by day: no visit', !day.active && day.log === 0, JSON.stringify(day));
await p.close();
await b.close();

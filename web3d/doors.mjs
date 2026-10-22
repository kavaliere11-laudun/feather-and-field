// The pop doors: node doors.mjs [out]  (at night a badge asks for each door to be shut once everyone's in; a tap shuts it;
// the birds wait inside in the morning until it's opened; it opens by itself at 7:30; by day it stays open; inside too)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const [out = 'door'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : ''));
async function page(time) {
  const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/index.html?q=0&coops=5&time=' + time);
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 120000 });
  await p.addStyleTag({ content: '#hint, #readout { display: none !important; }' });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 10); });
  return p;
}
const look = (p, i, size = 2.2) => p.evaluate(([i, size]) => {
  const f = window.__farm, pl = f.plots[i], w = new f.THREE.Vector3(-0.3, 0, 0.6); pl.frame.localToWorld(w);
  const k = 0.45 / Math.tan(42 * Math.PI / 180); f.lookAt(w.x - Math.SQRT1_2 * k, w.z - Math.SQRT1_2 * k, size); f.step(1 / 30, 1); f.draw();
}, [i, size]);
const doorAt = (p, i) => p.evaluate((i) => {
  const f = window.__farm, pl = f.plots[i], G = f.nestOf(pl), v = new f.THREE.Vector3(G.pop[0], G.house + 0.2, 0.46); pl.frame.localToWorld(v); v.project(f.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
}, i);
const state = (p, i) => p.evaluate((i) => { const f = window.__farm, pl = f.plots[i], d = pl.door; return { goal: d.goal, s: +d.s.toFixed(2), badge: !!(d.badge && d.badge.visible), kind: d.badge && d.badge.visible ? d.kind : null, asleep: pl.birds.filter(b => b.asleep).length, n: pl.birds.length, tag: document.getElementById('tag').textContent }; }, i);
const step = (p, s) => p.evaluate((s) => window.__farm.step(1 / 30, Math.round(s * 30)), s);
const tapDoor = async (p, i) => { await look(p, i); const pt = await doorAt(p, i); await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(200); };

// night: everyone in bed, a moon badge; a tap shuts the door
let p = await page('23');
for (let i = 0; i < 5; i++) {
  const s0 = await state(p, i);
  ok(`coop ${i}: at 23:00 everyone's in and a moon badge asks to shut the door`, s0.asleep === s0.n && s0.badge && s0.kind === 'moon', JSON.stringify(s0));
  if (i === 0 || i === 3) { await look(p, i, 2.6); await p.screenshot({ path: `${out}_badge_${i}.png`, timeout: 240000 }); }
  await tapDoor(p, i); await step(p, 1.2);
  const s1 = await state(p, i);
  ok(`coop ${i}: a tap on the door shuts it`, s1.goal === 0 && s1.s === 0 && !s1.badge && s1.tag === 'Door shut. Sleep well!', JSON.stringify(s1));
  await look(p, i, 1.6); await p.screenshot({ path: `${out}_shut_${i}.png`, timeout: 240000 });
}
// the morning: they wait inside with the door shut (a sun badge), come out once it's opened
await p.evaluate(() => window.__farm.setHour(6.6)); await step(p, 3);
for (let i = 0; i < 5; i++) {
  const s0 = await state(p, i);
  ok(`coop ${i}: 6:36, door shut: everyone waits inside, a sun badge`, s0.asleep === s0.n && s0.kind === 'sun', JSON.stringify(s0));
}
await tapDoor(p, 0); await step(p, 1.2);
let s = await state(p, 0);
ok('coop 0: a tap opens it: "Good morning! Door open"', s.goal === 1 && s.s === 1 && s.tag === 'Good morning! Door open', JSON.stringify(s));
await step(p, 2);
s = await state(p, 0);
ok('coop 0: the birds come out once it is open', s.asleep < s.n, JSON.stringify(s));
await p.evaluate(() => window.__farm.setHour(7.6)); await step(p, 1.5);
s = await state(p, 1);
ok('coop 1: nobody opened it, so it opened by itself at 7:30', s.goal === 1 && s.s === 1, JSON.stringify(s));
await p.evaluate(() => { const f = window.__farm; f.setHour(12); f.step(1 / 30, 30); for (const bd of f.plots[2].birds) { bd.root.position.set(1.3, 0, 2.1); bd.target.set(1.3, 0, 2.1); bd.wait = 30; } });
await tapDoor(p, 2); s = await state(p, 2);
ok('coop 2: by day a tap leaves it open', s.goal === 1 && s.tag === 'The door stays open in the daytime', JSON.stringify(s));
ok('no page errors (night and morning)', !p.errs.length, p.errs.slice(0, 3).join(' | '));
await p.close();

// 22:15: some birds still out, so it can't be shut yet
p = await page('22:15');
const s2 = await state(p, 0);
await tapDoor(p, 0); const s3 = await state(p, 0);
ok('coop 0: 22:15 with birds still out: "Not everyone\'s in yet"', s2.asleep < s2.n && !s2.badge && s3.goal === 1 && s3.tag.startsWith("Not everyone's in yet: "), JSON.stringify(s3));
await p.close();

// inside: the pop door from inside, open then shut by a tap
p = await page('23');
await p.evaluate(() => { const f = window.__farm; f.openInside(f.plots[3]); });
await p.waitForTimeout(700);
const inA = await p.evaluate(() => { const f = window.__farm, R = f.inside.rooms[f.plots[3].breed]; f.drawInside(); return { up: +(f.inside.popDoor.position.y - R.pop[1]).toFixed(2) }; });
ok('inside: the pop door is up (open)', inA.up > 0.4, JSON.stringify(inA));
await p.evaluate(() => { const f = window.__farm; f.inside.pan = -1; });
await p.mouse.move(60, 560); await p.mouse.down(); await p.mouse.move(200, 560, { steps: 4 }); await p.mouse.move(360, 560, { steps: 4 }); await p.mouse.up();
const pt = await p.evaluate(() => {
  const f = window.__farm, R = f.inside.rooms[f.plots[3].breed], v = new f.THREE.Vector3(R.pop[0] + 0.02, R.pop[1] + R.pop_h * 0.5 + (R.pop_h + 0.02), R.pop[2]); f.drawInside(); v.project(f.inside.camera);
  return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
});
await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(200);
await p.evaluate(() => { const f = window.__farm; for (let k = 0; k < 4; k++) f.stepInside(1 / 30, 10); f.step(1 / 30, 36); });
const inB = await p.evaluate(() => { const f = window.__farm, R = f.inside.rooms[f.plots[3].breed]; f.drawInside(); return { up: +(f.inside.popDoor.position.y - R.pop[1]).toFixed(2), goal: f.plots[3].door.goal, tag: document.getElementById('tag').textContent }; });
ok('inside: a tap on the pop door shuts it', inB.up === 0 && inB.goal === 0 && inB.tag === 'Door shut. Sleep well!', JSON.stringify(inB));
await p.screenshot({ path: `${out}_inside.png`, timeout: 240000 });
ok('no page errors (evening, inside)', !p.errs.length, p.errs.slice(0, 3).join(' | '));
await b.close();

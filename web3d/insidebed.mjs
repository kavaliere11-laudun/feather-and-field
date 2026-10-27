// A hen going to bed while you're looking inside her coop (Audrey's polish list, 27 Oct: she used to wait outside till you
// came out): ./withserver.sh node insidebed.mjs [OUT]   (PORT)
// The test page at 21:50: inside a coop, nobody asleep yet; bedtime comes (22:00 to 22:45): each bird comes in at the pop
// door where you see her, crosses the straw, hops up onto a free spot on a perch (no two in one spot) and dozes off; the
// title counts them; out again: everyone asleep, out of sight in the coop. No page errors. A picture of one hopping up (OUT/insidebed_hop.png).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/insidebed';
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&coops=5`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 400000 });
await p.addStyleTag({ content: '#hint, #readout { display: none !important; }' });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.setHour(21.8); f.step(1 / 30, 30); });
const st0 = await p.evaluate(() => { const f = window.__farm, pl = f.plots[0]; f.openInside(pl); return { n: pl.birds.length, asleep: pl.birds.filter(b => b.asleep).length }; });
await p.waitForTimeout(800);
let st = await p.evaluate(() => ({ open: window.__farm.inside.open, birds: window.__farm.inside.birds.length }));
ok('21:50: inside the coop, nobody in bed yet', st.open && st.birds === 0 && st0.asleep === 0, { st, st0 });
// bedtime: the hours go by, a few seconds at a time (the birds outside walking in, the view inside)
const seen = [];
for (let h = 21.8; h <= 23.1; h += 0.02) {
  const r = await p.evaluate(h => { const f = window.__farm; f.setHour(h); for (let k = 0; k < 15; k++) { f.step(1 / 30, 1); f.drawInside(); }
    const pl = f.plots[0], I = f.inside; return { asleep: pl.birds.filter(b => b.asleep).length, inside: I.birds.length, arriving: I.birds.filter(b => b.arrive).map(b => b.arrive.phase),
      at: I.birds.filter(b => !b.arrive).map(b => [+b.root.position.x.toFixed(2), +b.root.position.y.toFixed(2)]), title: document.querySelector('#inside-title, .inside-title') ? document.querySelector('#inside-title, .inside-title').textContent : '' }; }, h);
  seen.push(r);
  if (r.arriving.includes('hop') && !seen.picture) { seen.picture = true; await p.screenshot({ path: `${OUT}/insidebed_hop.png`, timeout: 400000 }); }
}
for (let k = 0; k < 60; k++) {                     // (then a while longer at 23:10: the last ones in and settled)
  const r = await p.evaluate(() => { const f = window.__farm; f.setHour(23.15); for (let k = 0; k < 30; k++) { f.step(1 / 30, 1); f.drawInside(); }
    const pl = f.plots[0], I = f.inside; return { asleep: pl.birds.filter(b => b.asleep).length, inside: I.birds.length, arriving: I.birds.filter(b => b.arrive).map(b => b.arrive.phase),
      at: I.birds.filter(b => !b.arrive).map(b => [+b.root.position.x.toFixed(2), +b.root.position.y.toFixed(2)]), n: pl.birds.length }; });
  seen.push(r); if (r.asleep === r.n && !r.arriving.length) break;
}
const last = seen[seen.length - 1];
ok('everyone who went to bed came in where you see her', last.asleep > 0 && last.inside === last.asleep && seen.every(r => r.inside === r.asleep), seen.filter((r, i) => i % 10 === 0).map(r => [r.asleep, r.inside]));
ok('each walked in and hopped up (or settled in the straw)', seen.some(r => r.arriving.includes('walk')) && seen.some(r => r.arriving.includes('hop') || r.arriving.includes('settle')), seen.flatMap(r => r.arriving).filter((x, i, a) => a.indexOf(x) === i));
const spots = last.at.map(a => a.join());
ok('all of them in, settled, no two in one spot, the grown-ups up on the perches', last.asleep === last.n && last.arriving.length === 0 && new Set(spots).size === spots.length && last.at.filter(a => a[1] > 0.25).length >= 3, last);
const t0 = Date.now(); const alive = await p.evaluate(() => 1 + 1).catch(e => e.message); console.log('page answers', alive, Date.now() - t0, 'ms');
await p.evaluate(() => window.__farm.closeInside()); await p.waitForTimeout(800);
st = await p.evaluate(() => { const f = window.__farm, pl = f.plots[0]; f.step(1 / 30, 5); return { open: f.inside.open, hidden: pl.birds.filter(b => b.asleep).every(b => !b.root.visible), asleep: pl.birds.filter(b => b.asleep).length }; });
ok('out again: everyone asleep in the coop, out of sight', !st.open && st.hidden && st.asleep === last.asleep, st);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

// The hens' play things (release 4, play.js): ./withserver.sh node playtest.mjs [OUT]   (W, H: the screen; PORT; BREED=orp: the
// Thatched Cottage's, its own garden: a tin bath, a round sand pit)
// On the test page's ?looks=3 (Cosy: swing, sand tub, cabbage) and ?looks=4 (Deluxe: also the xylophone; a sandbox beside the barn),
// the Red Barn's pen: a hen sent to each play thing in turn. Checks she gets there and plays (on the swing's perch and it
// swinging, in the sandbox with puffs, the cabbage swinging and spinning, notes from the xylophone), that she ends back on the ground in the yard, free to walk, and that each takes a sensible time. Leaves a
// picture of each at play (OUT/play_<look>_<kind>.png).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/playtest', W = +(process.env.W || 402), H = +(process.env.H || 874), BREED = process.env.BREED || 'rir';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const KINDS = { 3: ['swing', 'dust', 'cabbage'], 4: ['swing', 'dust', 'cabbage', 'xylo'] };
for (const look of [3, 4]) {
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&looks=${look}&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.addStyleTag({ content: '#hint, #readout, .top, #tag, #foxbtn, #replaybtn, #farmerbtn { display: none !important; }' });
  const has = await p.evaluate(breed => { const f = window.__farm; f.pause(true); const P = f.coopPlots().find(q => q.breed === breed); return P && P.toys ? Object.keys(P.toys).filter(k => P.toys[k] && P.toys[k].by !== undefined) : null; }, BREED);
  ok(has && KINDS[look].every(k => has.includes(k)), `look ${look}: the pen has its play things (${has})`);
  if (!has) continue;
  for (const kind of KINDS[look]) {
    const r = await p.evaluate(([kind, breed]) => {
      const f = window.__farm, P = f.coopPlots().find(q => q.breed === breed), T = P.toys;
      if (T[kind].by) f.endPlay(T[kind].by, true);
      const b = P.birds.find(x => x.kind === (kind === 'ladder' ? 'rooster' : 'hen') && !x.busy() && !x.cuddle) || P.birds.find(x => x.kind === 'hen' && !x.busy());
      if (!b) return { err: 'no free bird' };
      b.layIn = 9999;
      const started = f.startPlay(b, kind);
      if (!started) return { err: 'not started' };
      window.__pb = b;
      const out = { phases: [], maxSwing: 0, onPerchY: 0, minY: 9, spin: 0, maxY: 0, fx: 0, time: 0 };
      for (let i = 0; i < 60 * 30 && b.play; i++) {
        f.step(1 / 30, 1); out.time += 1 / 30;
        const ph = b.play && b.play.phase; if (ph && out.phases[out.phases.length - 1] !== ph) out.phases.push(ph);
        if (ph === 'ride') { out.maxSwing = Math.max(out.maxSwing, Math.abs(T.swing.a)); out.onPerchY = Math.max(out.onPerchY, b.root.position.y); }
        if (ph === 'bathe') out.minY = Math.min(out.minY, b.root.position.y);
        if (kind === 'cabbage') out.spin = Math.max(out.spin, Math.abs(T.cabbage.vs));
        out.maxY = Math.max(out.maxY, b.root.position.y);
        out.fx = Math.max(out.fx, f.playFxLive());
      }
      const q = b.root.position;
      out.end = { playing: !!b.play, y: +q.y.toFixed(3), free: b.free(q.x, q.z), byFree: !T[kind].by };
      return out;
    }, [kind, BREED]);
    if (r.err) { ok(false, `look ${look} ${kind}: ${r.err}`); continue; }
    ok(!r.end.playing && r.time < 45, `look ${look} ${kind}: played and done in ${r.time.toFixed(1)} s (${r.phases.join(' → ')})`);
    ok(r.end.y === 0.015 && r.end.free && r.end.byFree, `look ${look} ${kind}: back on the ground in the yard, the ${kind} free again (${JSON.stringify(r.end)})`);
    if (kind === 'swing') ok(r.phases.includes('ride') && r.maxSwing > 0.12 && r.onPerchY > 0.1, `look ${look} swing: on the perch and swinging (up to ${r.maxSwing.toFixed(2)} rad, ${r.onPerchY.toFixed(2)} m up)`);
    if (kind === 'dust') ok(r.phases.includes('bathe') && r.minY > 0.06 && r.minY < 0.13 && r.fx > 2, `look ${look} dust: in the sand (${r.minY.toFixed(3)} m), puffs (${r.fx} at once)`);
    if (kind === 'cabbage') ok(r.spin > 1, `look ${look} cabbage: it spun (${r.spin.toFixed(1)} rad/s)`);
    if (kind === 'ladder') ok(r.phases.includes('top') && r.maxY > 0.4, `look ${look} ladder: up to the top (${r.maxY.toFixed(2)} m)`);
    if (kind === 'xylo') ok(r.fx > 0, `look ${look} xylophone: notes (${r.fx} at once)`);
    // a picture of her at it
    await p.evaluate(([kind, breed]) => {
      const f = window.__farm, P = f.coopPlots().find(q => q.breed === breed), T = P.toys, b = window.__pb;
      if (T[kind].by) f.endPlay(T[kind].by, true);
      f.startPlay(b, kind);
      const want = { swing: 'ride', dust: 'bathe', cabbage: 'peck', ladder: 'top', xylo: 'tap' }[kind];
      for (let i = 0; i < 60 * 30 && b.play && b.play.phase !== want; i++) f.step(1 / 30, 1);
      f.step(1 / 30, kind === 'swing' ? 40 : kind === 'ladder' ? 30 : 25);
      const c = P.frame.localToWorld(b.root.position.clone()); f.lookAt(c.x, c.z, 1.2); f.step(1 / 30, 1); f.draw();
    }, [kind, BREED]);
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/play_${BREED === 'rir' ? '' : BREED + '_'}${look}_${kind}.png` });
  }
}
ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs));
console.log(fails ? `${fails} FAILED` : 'all passed');
await b.close();

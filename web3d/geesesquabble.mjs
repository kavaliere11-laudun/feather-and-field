// Gertrude and Hector's squabbles (release 3): node geesesquabble.mjs [kinds]   (kinds: snail,puddle,spot; SHOTS: a folder for
// a picture of each moment)
// Each kind on the test page (each twice, by default): something on the grass a little ahead of her (a snail, a puddle; the best spot), they face
// each other over it (never walking over it to get there), a stare, a tussle, one of them wins (the snail eaten, the puddle drunk from, the spot sat in) while the
// other sulks, then they make up beside each other with three hearts; afterwards back to their day (the puddle soaking
// away). Every frame: never on anything (the grid's blocked cells, other than the pond and their bed), never into each
// other, never into the water. A squabble comes on its own now and then too. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const kinds = (process.argv[2] || 'snail,puddle,spot,snail,puddle,spot').split(','), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: SHOTS ? 2 : 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=${SHOTS ? 0 : 3}&geese&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 60); });
for (const kind of kinds) {
  // a calm moment (they may be off for a swim first: up to a few minutes), then the squabble
  const r = await p.evaluate(async kind => {
    const f = window.__farm, F = f.geese(), nav = f.nav(), [G, H] = F.geese, out = { stages: [], blocked: 0, closest: 9, wet: 0, hearts: 0, eaten: null, started: false, overIt: 9 };
    let tries = 0;
    while (!F.duet && tries++ < 30 * 400) { F.force = kind; F.loveIn = 0; f.step(1 / 30, 1); }
    out.started = !!F.duet; if (!F.duet) return out;
    out.start = { G: [+G.pos.x.toFixed(2), +G.pos.z.toFixed(2)], H: [+H.pos.x.toFixed(2), +H.pos.z.toFixed(2)], at: F.duet.at.map(v => +v.toFixed(2)), gp: F.duet.gp.map(v => +v.toFixed(2)), hp: F.duet.hp.map(v => +v.toFixed(2)), gway: JSON.stringify(F.duet.gway), hway: JSON.stringify(F.duet.hway) };
    const S = F.duet, H0 = f.heartsLive ? f.heartsLive() : null;
    let last = '';
    for (let i = 0; i < 30 * 40 && F.duet === S; i++) {
      f.step(1 / 30, 1);
      if (S.stage !== last) { out.stages.push(S.stage); last = S.stage; }
      for (const g of F.geese) {
        const dx = g.pos.x - F.pc[0], dz = g.pos.z - F.pc[1], lu = Math.sqrt(F.lu2) + 0.55, lv = Math.sqrt(F.lv2) + 0.55;
        const inPond = ((dx * F.pu[0] + dz * F.pu[1]) / Math.sqrt(F.lu2) / lu) ** 2 + ((dx * F.pv[0] + dz * F.pv[1]) / Math.sqrt(F.lv2) / lv) ** 2 <= 1;
        if (!inPond && !nav.freeAt(g.pos.x, g.pos.z) && !F.bed.some(bd => Math.hypot(bd[0] - g.pos.x, bd[1] - g.pos.z) < 0.56)) out.blocked++;
        out.wet = Math.max(out.wet, g.wet);
      }
      out.closest = Math.min(out.closest, Math.hypot(G.pos.x - H.pos.x, G.pos.z - H.pos.z));
      if (S.eaten) out.eaten = true;
      if (S.stage === 'go' || S.stage === 'eye' || S.stage === 'tussle') for (const g of F.geese) { const d = Math.hypot(g.pos.x - S.at[0], g.pos.z - S.at[1]); if (d < out.overIt) { out.overIt = d; out.overAt = [S.stage, g.name, +S.t.toFixed(2), S.gway.length, S.hway.length]; } }
    }
    out.hearts = S.hearts; out.over = F.duet !== S; out.win = S.win === G ? 'Gertrude' : 'Hector';
    const sn = F.props.snail, pd = F.props.puddle;
    out.snailShown = !!(sn && sn.visible); out.puddleFading = !!(pd && pd.visible && pd.userData.fade);
    for (let i = 0; i < 30 * 6; i++) f.step(1 / 30, 1);
    out.after = [G.task && G.task.name, H.task && H.task.name]; out.puddleGone = !(pd && pd.visible);
    return out;
  }, kind);
  ok(kind + ': over it, a stare, a tussle, one wins, they make up with three hearts; never on anything, into each other or the water; back to their day after',
    r.started && r.stages.join() === 'go,eye,tussle,win,makeup' && r.over && r.hearts === 3 && r.blocked === 0 && r.closest > 0.4 && r.overIt > 0.28 && r.wet < 0.2 && !/squabble/.test(r.after.join()) &&
    (kind !== 'snail' || (r.eaten && !r.snailShown)) && (kind !== 'puddle' || (r.puddleFading && r.puddleGone)), r);
}
// on their own now and then
const own = await p.evaluate(() => { const f = window.__farm, F = f.geese(); F.loveIn = 1; let n0 = F.squabbles || 0; for (let i = 0; i < 30 * 600 && (F.squabbles || 0) === n0; i++) f.step(1 / 30, 1); return { n: (F.squabbles || 0) - n0 }; });
ok('a squabble comes on its own now and then', own.n >= 1, own);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

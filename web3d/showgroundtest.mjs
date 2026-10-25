// Checks the show ground's test view (index.html?lineup=show): it loads with no page errors; the show ground, six pens each
// with its bird standing inside its pen on the straw, four rosettes pinned, the judge and Arthur; the judge goes through
// every pose of his turn (the clipboard and pencil when wanted, the rosette held and brought to the pen's pin); a real tap
// on a bird in a pen shows her name. LANG=fr (or the word fr after it), W, H. ./withserver.sh node showgroundtest.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const W = +(process.env.W || 874), H = +(process.env.H || 402), FR = process.env.LANG === 'fr' || process.argv.includes('fr');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup=show${FR ? '&lang=fr' : ''}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null && window.__show, null, { timeout: 180000 });
const ok = (name, cond, extra = '') => console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : ''));

const S0 = await p.evaluate(() => {
  const S = window.__show, G = S.ground, I = G.info, T = window.__farm.THREE;
  const inPen = S.plot.birds.map((bd, i) => { const P = I.pens[i], q = bd.root.position, half = I.pens[i].room;
    return Math.abs(q.x - P.x) < half[0] / 2 - 0.1 && q.z < P.front - 0.1 && q.z > P.front - half[1] + 0.1 && Math.abs(q.y - I.floor) < 0.01; });
  return { pens: I.pens.length, birds: S.plot.birds.map(bd => bd.breed + '/' + bd.kind), inPen, pinned: G.pinned.filter(Boolean).length,
    parts: Object.keys(G.parts).sort(), sign: G.signMesh.visible, judge: !!S.judge.rig.B.clipboard && !!S.judge.rig.B.pencil, arthur: S.arthur.look };
});
ok('six pens, a bird of each breed in them', S0.pens === 6 && new Set(S0.birds.map(x => x.split('/')[0])).size === 5, S0.birds.join(' '));
ok('each bird stands inside her pen, on the straw', S0.inPen.every(Boolean), JSON.stringify(S0.inPen));
ok('four rosettes pinned', S0.pinned === 4);
ok('the marquee, the pens, the sign (with its words), the judge\'s table and clipboard', S0.parts.length === 5 && S0.sign, S0.parts.join(' '));
ok('the judge (clipboard and pencil on his hands) and Arthur', S0.judge && S0.arthur === 'm');

// every pose of the judge's turn, held for a moment
const poses = await p.evaluate(() => {
  const f = window.__farm, S = window.__show, out = [];
  f.pause(true);
  for (const name of ['judge_look', 'judge_write', 'judge_pin', 'clap', 'judge_carry', 'walk']) {
    S.fixed = name; S.k = -1; f.step(1 / 30, name === 'walk' ? 110 : 50); const x0 = name === 'walk' ? S.ground.info.pens[1].judge[0] : S.judge.pos.x;
    const B = S.judge.rig.B, held = S.held && S.held.parent === B.wristR;
    let gap = null;
    if (name === 'judge_pin') { S.judge.root.updateMatrixWorld(true); const pin = S.held.getWorldPosition(new f.THREE.Vector3()), at = S.ground.world(...S.ground.info.pens[S.penAt ?? 2].pin); gap = +pin.distanceTo(at).toFixed(3); }
    out.push({ name, pose: S.judge.want.pose, clip: B.clipboard.scale.x > 0.5, pencil: B.pencil.scale.x > 0.5, held, gap, moved: name === 'walk' ? +(S.judge.pos.x - x0).toFixed(2) : 0, tableClip: S.ground.parts.show_clipboard.visible });
  }
  f.pause(false);
  return out;
});
for (const q of poses) console.log('  ', JSON.stringify(q));
const P = Object.fromEntries(poses.map(q => [q.name, q]));
ok('writing: clipboard and pencil in his hands, none on his table', P.judge_write.clip && P.judge_write.pencil && !P.judge_write.tableClip);
ok('pinning: a rosette in his hand, its pin at the pen\'s pin', P.judge_pin.held && P.judge_pin.gap < 0.03, 'gap ' + P.judge_pin.gap);
ok('looking, clapping: hands free', !P.judge_look.clip && !P.clap.clip && !P.clap.held);
ok('walking along the pens with his clipboard', P.walk.clip && P.walk.moved > 1, 'moved ' + P.walk.moved);

// a real tap on a bird in her pen: her name
await p.evaluate(() => { const S = window.__show; S.fixed = 'judge_look'; S.k = -1; S.ground.group.updateMatrixWorld(true); const c = S.ground.world(0, 0, S.ground.info.pens[0].front); window.__farm.lookAt(c.x, c.z, 2.0); });
await p.waitForTimeout(600);
const spot = await p.evaluate(() => { const f = window.__farm, bd = window.__show.plot.birds[3], v = bd.root.getWorldPosition(new f.THREE.Vector3()); v.y += 0.3; v.project(f.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, name: bd.name }; });
await p.touchscreen.tap(spot.x, spot.y);
await p.waitForTimeout(400);
const tag = await p.evaluate(() => ({ on: document.getElementById('tag').classList.contains('on'), text: document.getElementById('tag').textContent }));
ok('a tap on a bird in a pen shows her name', tag.on && tag.text.startsWith(spot.name), JSON.stringify(tag));
ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();

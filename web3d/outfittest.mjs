// Checks the farmers' outfits (farmer.js loadOutfit / wear, models/outfit_<id>.glb + json): ?lineup=farmer&set=4 loads with
// no page errors, all five outfits and nothing else; each of the ten farmers wears his row's outfit (the straw hat gone, the
// outfit's hat on the hat's bone, Rosie's hair over her head under it, the rosette or neckerchief), the shirt's colours, how
// fine its check and the knit as the outfit's json says, Rosie's plait ribbon the hat band's colour where it differs; every
// pose and face of POSES and FACES held in every outfit, the torch and the pail; back to Classic (the very same mesh and
// colours as before) and dressed again (the same dressed mesh); a farmer's outfit never changes the other farmers; an
// outfit not loaded, or one that doesn't exist, changes nothing; ?lineup=farmer (Classic) and &outfit=rodeo load only what
// they wear. LANG=fr (or the word fr after it), W, H. ./withserver.sh node outfittest.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const W = +(process.env.W || 402), H = +(process.env.H || 874), FR = process.env.LANG === 'fr' || process.argv.includes('fr');
const IDS = ['market', 'garden', 'winter', 'rodeo', 'show'];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ok = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : '')); if (!cond) fails++; };
let fails = 0;
async function open(q) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const errs = [], got = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()); });
  p.on('request', r => { const m = r.url().match(/outfit_(\w+)\.(glb|json)/); if (m) got.push(m[1] + '.' + m[2]); });
  await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&${q}${FR ? '&lang=fr' : ''}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  return { p, errs, got };
}

// ---- the five outfits, Arthur and Rosie in each
const A = await open('lineup=farmer&set=4');
const S = await A.p.evaluate(async (IDS) => {
  const f = window.__farm, L = f.farmerLineup(), T = f.THREE; f.pause(true);
  const jsons = {}; for (const id of IDS) jsons[id] = await (await fetch('models/outfit_' + id + '.json')).json();
  const out = [];
  L.farmers.forEach((fm, i) => {
    const id = IDS[Math.floor(i / 2)], rig = fm.rig, g = rig.mesh.geometry, names = rig.mesh.skeleton.bones.map(b => b.name);
    const hat = names.indexOf('hat'), si = g.attributes.skinIndex.array, col = g.attributes.color.array, ix = g.index.array;
    let strawLeft = 0, hatTris = 0;
    const nb = g.userData.baseCount;
    for (let t = 0; t < ix.length; t += 3) if (si[ix[t] * 4] === hat) { hatTris++; if (ix[t] < nb) strawLeft++; }
    const C = rig.mesh.material.userData.cloth, J = jsons[id], S = J.shirt;
    const want = S.kind === 'check' ? S.cols : [S.col, S.col, S.col];
    const colOk = want.every((h, k) => new T.Color(h).equals([C.A, C.B, C.C][k].value));
    const rb = J.ribbon && J.ribbon[fm.look];
    let ribbonFrom = 0, ribbonTo = 0;
    if (rb) { const hc = names.indexOf('headc'); for (let v = 0; v < nb; v++) if (si[v * 4] === hc) { const c = [col[v * 4], col[v * 4 + 1], col[v * 4 + 2]]; if (c.join() === rb.from.join()) ribbonFrom++; if (c.join() === rb.to.join()) ribbonTo++; } }
    out.push({ i, look: fm.look, id, wears: fm.outfit, bones: names.length, strawLeft, hatTris, tris: ix.length / 3, colOk, F: C.F.value, knit: C.knit.value, wantF: S.f || 135, wantKnit: S.kind === 'knit' ? 1 : 0,
      rb: !!rb, ribbonFrom, ribbonTo, parts: J.meshes[fm.look].length });
  });
  return out;
}, IDS);
ok('ten farmers, Arthur and Rosie in each of the five outfits', S.length === 10 && S.every(s => s.wears === s.id && s.look === (s.i % 2 ? 'f' : 'm')), S.map(s => s.look + ':' + s.wears).join(' '));
ok('the farmers\' 42 bones', S.every(s => s.bones === 42));
ok('the straw hat gone, the outfit\'s hat on the hat\'s bone', S.every(s => s.strawLeft === 0 && s.hatTris > 300), S.map(s => s.hatTris).join(' '));
ok('Rosie\'s hair over her head under the outfits\' hats (not under the sun hat)', S.every(s => s.parts === (s.look === 'f' && s.id !== 'garden' ? 2 : 1)));
ok('cheap: under 31k triangles dressed (Classic about 26k)', S.every(s => s.tris < 31000), S.map(s => s.tris).join(' '));
ok('the shirt: its colours, its check, the knit', S.every(s => s.colOk && s.F === s.wantF && s.knit === s.wantKnit), S.map(s => s.id + ':' + s.F + '/' + s.knit).join(' '));
ok('Rosie\'s ribbon the hat band\'s colour (garden, rodeo, show)', S.filter(s => s.rb).length === 3 && S.filter(s => s.rb).every(s => s.look === 'f' && s.ribbonFrom === 0 && s.ribbonTo > 50), S.filter(s => s.rb).map(s => s.id + ':' + s.ribbonTo).join(' '));
ok('only the five outfits loaded', [...new Set(A.got)].sort().join() === IDS.flatMap(i => [i + '.glb', i + '.json']).sort().join(), [...new Set(A.got)].join(' '));

// every pose and face in every outfit, with the torch and the pail
const P = await A.p.evaluate(() => {
  const f = window.__farm, L = f.farmerLineup(), T = f.THREE, bad = [];
  const names = L.tests();
  for (const pose of names.poses) for (const face of names.faces) {
    for (const fm of L.farmers) { fm.want = { pose, face, props: { torch: pose === 'torch' || pose === 'panic', pail: pose === 'feed' || pose === 'carry' } }; fm.update(1 / 30); }
  }
  f.draw();
  for (const fm of L.farmers) { fm.want = { pose: 'torch', face: 'neutral', props: { torch: true, pail: true } }; for (let k = 0; k < 30; k++) fm.update(1 / 30);
    if (!(fm.rig.B.torch.scale.x > 0.5 && fm.rig.B.pail.scale.x > 0.5)) bad.push(fm.look + ':' + fm.outfit); }
  f.draw();
  return { n: names.poses.length * names.faces.length, bad };
});
ok('every pose and face held in every outfit, the torch and the pail', P.bad.length === 0 && P.n > 100, P.n + ' poses and faces' + (P.bad.length ? ' · ' + P.bad.join(' ') : ''));

// back to Classic and dressed again; one farmer's outfit never changes another's
const R = await A.p.evaluate(() => {
  const L = window.__farm.farmerLineup(), [a, r] = L.farmers, T = window.__farm.THREE;
  const dressedA = a.rig.mesh.geometry, rGeo = r.rig.mesh.geometry, rA = r.rig.mesh.material.userData.cloth.A.value.clone();
  const back = a.wear(null), classic = a.rig.mesh.geometry, C = a.rig.mesh.material.userData.cloth;
  const plaid = L.tests().plaid.m, plaidOk = plaid.every((h, k) => new T.Color(h).equals([C.A, C.B, C.C][k].value)) && C.F.value === 135 && C.knit.value === 0;
  const classicOk = classic === L.tests().model('m') && a.outfit === null && a.rig.hatSit.tilt === -20;
  const again = a.wear('market'), same = a.rig.mesh.geometry === dressedA;
  const otherOk = r.rig.mesh.geometry === rGeo && r.rig.mesh.material.userData.cloth.A.value.equals(rA) && r.outfit === 'market';
  const notLoaded = a.wear('nope') === false && a.outfit === 'market';
  return { back, plaidOk, classicOk, again, same, otherOk, notLoaded };
});
ok('back to Classic: the very same mesh, the checked shirt\'s colours, the straw hat as it sits', R.back && R.classicOk && R.plaidOk);
ok('dressed again: the same dressed mesh', R.again && R.same);
ok('one farmer\'s outfit never changes another\'s', R.otherOk);
ok('an outfit that doesn\'t exist changes nothing', R.notLoaded);
ok('no page errors (set 4)', A.errs.length === 0, A.errs.join(' | '));
await A.p.close();

// ---- Classic loads no outfit; &outfit=rodeo only the rodeo's; a farmer not dressed stays Classic
const B = await open('lineup=farmer&set=1');
const B1 = await B.p.evaluate(() => { const L = window.__farm.farmerLineup(); return L.farmers.map(f => f.outfit); });
ok('?lineup=farmer: everyone Classic, no outfit loaded', B1.every(o => o === null) && B.got.length === 0, B.got.join(' '));
const B2 = await B.p.evaluate(async () => {
  const L = window.__farm.farmerLineup(); const r = L.farmers[1], g = r.rig.mesh.geometry;
  const res = r.wear('show');          // (not loaded yet: nothing changes)
  return { res, same: r.rig.mesh.geometry === g && r.outfit === null };
});
ok('an outfit not loaded yet changes nothing', B2.res === false && B2.same);
ok('no page errors (set 1)', B.errs.length === 0, B.errs.join(' | '));
await B.p.close();
const C = await open('lineup=farmer&outfit=rodeo');
const C1 = await C.p.evaluate(() => window.__farm.farmerLineup().farmers.map(f => f.outfit + ':' + f.want.pose));
ok('&outfit=rodeo: the rodeo outfit only, in four moods', C1.length === 8 && C1.every(s => s.startsWith('rodeo')) && [...new Set(C.got)].sort().join() === 'rodeo.glb,rodeo.json', C1.join(' ') + ' · ' + C.got.join(' '));
ok('no page errors (&outfit=rodeo)', C.errs.length === 0, C.errs.join(' | '));
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);

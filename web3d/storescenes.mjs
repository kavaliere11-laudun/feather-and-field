// The App Store's pictures, second set (27 Nov 2026, Audrey: "they need better finishing and polish"; her picks: the wooden
// farm sign, "My 8" and fishing): ./withserver.sh node storescenes.mjs FARM.json OUTDIR
//   (ONLY=hero,farm,...; W, H: css px (956 x 440); DSF (3: 2868 x 1320); PORT; LOC/LANG2 for the scenes with the game's words)
// The showcase farm (showfarm.mjs's save) opened in the game itself (play.html). Each scene staged with the game's own test
// hooks and shot either through the game's view or through a perspective camera (closeShot); the top-left corner kept calm
// for the farm sign (app/store/compose2.mjs). Saved as OUTDIR/<name>.png at full size.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [FARM, OUT = '/tmp/claude-0/storescenes'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const farm = JSON.parse(fs.readFileSync(FARM, 'utf8'));
const W = +(process.env.W || 956), H = +(process.env.H || 440), DSF = +(process.env.DSF || 3);
const ONLY = (process.env.ONLY || 'hero').split(',');
// the play things in a garden, in the order the birds are sent to them (a coop's toys object also holds its bookkeeping:
// 'P', 'clock', 'garden', 'prints' are not things to play with: a bird sent to 'clock' stood about "busy")
const TOYS = (process.env.TOYS || 'chute,igloo,ice,swing,xylo,dust,cabbage,pool,ball').split(',');
const HIDE = '#hint, #tag, #foxbtn, #replaybtn, #farmerbtn, #henbtns, #compass, #findfarmer, .gbar, .gacts, .gguide, .gbub, .vignette, .gpill, #moment { display: none !important; }';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
const run = (p, secs, fn, arg) => p.evaluate(async ([secs, fn, arg]) => {
  const f = window.__farm, F = fn ? new Function('f', 't', 'arg', fn) : null;
  for (let t = 0; t < secs; t += 1 / 30) { if (F) F(f, t, arg); f.step(1 / 30, 1); if ((t * 30 | 0) % 15 === 0) f.gameTick(window.__T += 500, false); }
}, [secs, fn ? fn.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, '') : null, arg]);
// each scene: { time, hud, setup(f, arg) → info (in the page), secs, each (per frame), shot: 'view' | closeShot options }
const SCENES = {
  hero: {
    time: '10:15', arg: { breed: process.env.BREED || 'rir', size: +(process.env.SIZE || 1.6), ox: +(process.env.OX || 0), oz: +(process.env.OZ || 0) },
    setup: (f, arg) => {
      const P = f.gamePlots(), i = P.findIndex(p => p.gc && p.gc.breed === arg.breed); window.__i = i;
      const pl = P[i]; for (const x of pl.birds) x.layIn = 9999;
      const g = f.game(); for (const gb of g.birdsIn(pl.gc.id)) gb.happy = 0;      // (all due a cuddle)
      window.__pl = pl; const L = f.farmLife(); window.__fl0 = L ? { home: L.home, running: L.running } : null;
      const w = pl.frame.getWorldPosition(new f.THREE.Vector3()); window.__at = [w.x, w.z];
      if (arg.size) f.lookAt(w.x + (arg.ox || 0), w.z + (arg.oz || 0), arg.size);
      return { i, at: [+w.x.toFixed(2), +w.z.toFixed(2)], rot: +pl.frame.rotation.y.toFixed(2), birds: pl.birds.length, life: window.__fl0, hint: document.getElementById('hint') && document.getElementById('hint').textContent };
    },
    secs: +(process.env.SECS || 17.8),
    shot: { relF: [-0.6, 0.45, 0.5], dist: 5.0, el: 20, fov: 32, az: 34 },   // (the farmer and birds right of centre: the sign on the left)
    each: (f, t) => {
      const pl = window.__pl, T = pl.toys, L = f.farmLife();
      if (!window.__went && L && !L.home && !L.running) { window.__went = t; f.cuddleAll(window.__i); window.__went = pl.hugAll ? t : 0.001; }
      if (!T) return;
      for (const [kind, at] of [['swing', 8], ['dust', 9], ['xylo', 10], ['cabbage', 11]]) {
        if (!T[kind] || t < at || T[kind].sent) continue;
        const bd = pl.birds.find(x => !x.busy() && !x.cuddle);
        if (bd && !T[kind].by && f.startPlay(bd, kind)) T[kind].sent = true;
      }
    },
  },
  // the farm from above: every coop at its Deluxe look, the grand decorations, late-afternoon light
  farm: {
    time: process.env.FTIME || '16:00', arg: { size: +(process.env.SIZE || 11.2), at: process.env.AT ? process.env.AT.split(',').map(Number) : [-17.6, -24.4],      // (the farmhouse left of the sign, which hangs on the right here)
      az: +(process.env.AZ || 0),
      // (27 Nov 2026, Audrey: "I can see you just filled the gaps, can you reorganise it so it looks nice": the coops laid out
      // in tidy columns either side of the lane from the farmhouse, all the same way round, the grand decorations in the
      // places left for them. Places are given in the picture's own terms (u across, w down the screen: x = (u + w)/√2,
      // z = (w - u)/√2); each coop goes to the nearest spot the game itself allows (coopSpot), checked against the coops
      // already placed and those left where they are; each decoration likewise (its free spot nearby))
      layout: process.env.LAYOUT ? JSON.parse(process.env.LAYOUT) : [['rir', -12.3, -29.6, 0], ['sil', -5.9, -29.6, 0], ['aya', -12.3, -22.8, 0], ['call', -5.9, -22.8, 0],
        ['orp', 5.9, -29.6, 0], ['bra', 12.3, -29.6, 0], ['sil_black', 5.9, -22.8, 0], ['pea', 12.6, -22.6, 0]],
      put: process.env.PUT ? JSON.parse(process.env.PUT) : [['fountain', 0, -19.6], ['orchard', 9.6, -16.9], ['hot_air_balloon', -17.5, -24.5]] },
    prep: (f, arg) => {
      const g = f.game(), R = Math.SQRT1_2, all = g.data.coops, mine = (arg.layout || []).map(L => L[0]), out = [];
      const placed = all.filter(c => !mine.includes(c.breed));
      for (const [br, u, w, deg] of arg.layout || []) {
        const c = all.find(x => x.breed === br); if (!c) continue;
        const tx = (u + w) * R, tz = (w - u) * R; let best = null;
        g.data.coops = [...placed, c];
        for (let r = 0; r <= 4 && !best; r += 0.25) for (let k = 0, n = Math.max(1, Math.round(r * 8)); k < n && !best; k++) {
          const a = k / n * 2 * Math.PI, x = Math.round((tx + Math.cos(a) * r) * 4) / 4, z = Math.round((tz + Math.sin(a) * r) * 4) / 4;
          const S = f.coopSpotAt({ x, z, deg }, c.tier, placed.length); if (S && S.ok) best = { x, z, clear: (S.clear || []).map(o => o.id).filter(Boolean) };
        }
        g.data.coops = all;
        if (best) { c.x = best.x; c.z = best.z; c.deg = deg; g.cleared(best.clear); placed.push(c); out.push([br, best.x, best.z]); } else { placed.push(c); out.push([br, 'none']); }
      }
      g.data.acctAsk = 1; g.save(); sessionStorage.setItem('ff.layout', JSON.stringify(out));
    },
    // (the decorations once the coops stand in their new places: after a reload, so the game's free spots know them)
    prep2: (f, arg) => {
      const g = f.game(), R = Math.SQRT1_2, out = [];
      for (const [id, u, w] of arg.put || []) {
        const x = (u + w) * R, z = (w - u) * R, F = f.deco.free(id, x, z); if (!F) { out.push([id, 'none']); continue; }
        const S = f.deco.spot(id, F.x, F.z); if (S.ok) { g.moveDecor(id, { x: F.x, z: F.z }, S.clear); out.push([id, F.x, F.z]); } else out.push([id, S.why]);
      }
      g.save(); sessionStorage.setItem('ff.decor', JSON.stringify(out));
    },
    setup: (f, arg) => {
      const C = f.gamePlots().filter(p => p.gc).map(p => { const w = p.frame.getWorldPosition(new f.THREE.Vector3()); return [p.gc.breed, +w.x.toFixed(1), +w.z.toFixed(1)]; });
      const cx = arg.at ? arg.at[0] : C.reduce((a, c) => a + c[1], 0) / C.length, cz = arg.at ? arg.at[1] : C.reduce((a, c) => a + c[2], 0) / C.length;
      if (arg.az) f.setViewAz(arg.az);
      f.lookAt(cx, cz, arg.size); return { at: [+cx.toFixed(1), +cz.toFixed(1)], coops: C };
    },
    secs: 3,
  },
  // the seasonal coops (27 Nov 2026, Audrey: "this one should be special coops instead, and the view is poor and odd"): three
  // neighbours in their winter buildings (the Reds' Snow Chalet, the Silkies' Ice Palace, the Ayam Cemani's Barrel Sauna) on
  // a snowy day once the flakes have stopped, the ground and roofs white, the birds at their winter toys; a close view
  // through the perspective camera (WINTER: the breeds; SHOT for another view)
  snow: {
    time: process.env.WTIME || '11:00', date: '2026-12-15T11:00:00Z', arg: { size: +(process.env.SIZE || 2.1), at: process.env.AT ? process.env.AT.split(',').map(Number) : [-26.8, -15.7], breeds: (process.env.WINTER || 'rir,sil,orp').split(','), swap: (process.env.SWAP ?? 'orp,aya').split(',').filter(Boolean) },
    prep: (f, arg) => { const g = f.game();
      // (SWAP=orp,aya: two coops change places first, so a third winter building stands with the other two)
      const sw = (arg.swap || []).map(br => g.data.coops.find(x => x.breed === br));
      if (sw.length === 2 && sw[0] && sw[1]) { const [A, B] = sw, k = ['x', 'z', 'deg'], a = k.map(q => A[q]); k.forEach((q, i) => { A[q] = B[q]; B[q] = a[i]; }); }
      for (const br of arg.breeds) { const c = g.data.coops.find(x => x.breed === br); if (!c) continue; g.data.themes = [...(g.data.themes || []), 'winter_' + br]; c.tier0 = c.tier; c.theme = 'winter'; c.tier = 4; } g.data.acctAsk = 1; g.save(); },
    shot: { at: [-26.0, 0.5, -12.6], dist: 10.5, el: 25, fov: 30, az: -40 },      // (from the south: the Chalet, the Palace behind, the Gingerbread Cottage)
    setup: (f, arg) => {
      f.snow.start(); window.__T += 186e3; f.lookAt(arg.at[0], arg.at[1], arg.size);      // (the clock on past the snowfall: the farm white by the clock, the flakes fading out)
      const P = f.gamePlots(); window.__pls = P.filter(p => p.gc && arg.breeds.includes(p.gc.breed)); window.__pl = window.__pls[0];
      return f.snow.state();
    },
    secs: +(process.env.SECS || 14),
    each: (f, t) => {
      for (const pl of window.__pls) { const T = pl.toys; if (!T) continue;
        window.__TOYS.filter(q => T[q]).forEach((kind, k) => { if (!T[kind] || t < 1 + k * 1.2 || T[kind].sent) return; const bd = pl.birds.find(x => !x.busy() && !x.cuddle); if (bd && !T[kind].by && f.startPlay(bd, kind)) T[kind].sent = true; }); }
    },
  },
  // the game's own screens: the Breed Book, the shop's 3D page, the grooming game, fishing
  book: { time: '10:30', hud: true, prep: (f) => { const g = f.game(); g.data.acctAsk = 1; g.save(); }, setup: (f) => { f.lookAt(-24.5, -14.5, 2.4); return {}; }, secs: 2,
    ui: async p => { await p.evaluate(() => window.__farm.bookOpen('birds')); await p.waitForTimeout(1200); } },
  shop: { time: '10:30', hud: true, live: true, prep: (f) => { const g = f.game(); g.data.acctAsk = 1; g.data.coins = Math.max(g.data.coins, 48250); g.save(); }, setup: (f) => { f.lookAt(-24.5, -14.5, 2.4); return {}; }, secs: 1,
    ui: async p => {
      await p.evaluate(() => window.__farm.shopSheet('hens')); await p.waitForTimeout(1000);
      await p.evaluate(want => { const tiles = [...document.querySelectorAll('.gsheet:not([hidden]) .gviewable')]; const t = tiles.find(x => x.textContent.includes(want)) || tiles[0]; const pic = t && (t.querySelector('.gprev-open') || t); if (pic) pic.click(); }, process.env.WANT || 'Cochin');
      await p.waitForTimeout(6000);
      // (Audrey: "the mouse is on the head of the chickens": the trio turned a little by a finger, as a player would, so the
      // swiping hand that says it can be turned has gone, and their faces come round)
      const r = await p.evaluate(() => { const c = document.querySelector('.gprev-stage canvas'); if (!c) return null; const b = c.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height * 0.75]; });
      if (r) { const dx = +(process.env.PDRAG || 60); await p.mouse.move(r[0], r[1]); await p.mouse.down(); for (let k = 1; k <= 12; k++) { await p.mouse.move(r[0] + dx * k / 12, r[1], { steps: 2 }); await p.waitForTimeout(40); } await p.mouse.up(); }
      await p.waitForTimeout(2500);
    } },
  groom: { time: '10:30', hud: true, live: true, prep: (f) => { const g = f.game(); g.data.acctAsk = 1; g.save(); }, setup: (f) => { window.__FF_GROOM_SECS = 3000; return {}; }, secs: 1,
    ui: async p => {
      // (Audrey: "the chicken has no eyes": a Silkie's dark face hides them, so a hen of another breed is groomed, her eyes
      // in sight; GBREED, the Buff Orpington by default: golden and fluffy)
      await p.evaluate(() => window.__farm.showsSheet()); await p.waitForTimeout(500);
      const who = await p.evaluate(want => { const g = window.__farm.game(), s = g.openShows(Date.now()).find(x => !x.locked); if (!s) return null; const L = g.showBirds(s); const x = L.find(q => g.baseOf(q.b.breed) === want && q.b.sex === 'h') || L[0]; return x && { name: x.b.name, first: L[0].b.name === x.b.name }; }, process.env.GBREED || 'orp');
      if (who && !who.first) { await p.evaluate(() => { const o = document.querySelector('.gsheet .gshow .glink'); if (o) o.click(); }); await p.waitForTimeout(500);
        await p.evaluate(n => { const row = [...document.querySelectorAll('.gsheet .gshowrow')].find(r => r.textContent.includes(n)); const bt = row && row.querySelector('.gbtn'); if (bt) bt.click(); }, who.name); }
      else await p.evaluate(() => { const bt = [...document.querySelectorAll('.gsheet .gshow .gbtn')].find(x => !x.disabled); if (bt) bt.click(); });
      await p.waitForTimeout(2500);
      // (Audrey: "she needs to look happy": washed, brushed and polished by the finger, every place seen to: "✨ All ready!",
      // she stands proud, gleaming; GSTOP: stop part way into the shine instead, the cloth in hand)
      const st = () => p.evaluate(() => { const G = window.__farm.groom.now(); return G ? G.state() : null; });
      const box = await p.evaluate(() => { const q = document.querySelector('.groom-pic'); if (!q) return null; const b = q.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
      const XY = sp => [box[0] + sp[0] * box[2], box[1] + sp[1] * box[3]];
      const rub = async (sp, n = 8) => { const [x, y] = XY(sp); await p.mouse.move(x - 22, y); await p.mouse.down(); for (let k = 0; k < n; k++) { await p.mouse.move(x + (k % 2 ? 22 : -22), y + (k % 3) * 3, { steps: 3 }); await p.waitForTimeout(25); } await p.mouse.up(); };
      const sweep = async (sp) => { const [x, y] = XY(sp); for (let r = 0; r < 3; r++) { await p.mouse.move(x - 45, y); await p.mouse.down(); await p.mouse.move(x + 45, y + 2, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(40); } };
      if (box) {
        let S = await st();
        for (let guard = 0; S && S.step === 'wash' && guard < 12; guard++) { const sp = S.spots.find(q => q[2] < 1); if (sp) await rub(sp); await p.waitForTimeout(300); S = await st(); }
        for (let guard = 0; S && S.step === 'brush' && guard < 14; guard++) { const sp = S.spots.find(q => q[2] < 1); if (sp) await sweep(sp); await p.waitForTimeout(300); S = await st(); }
        const stop = +(process.env.GSTOP || 9);
        for (let k = 0; S && S.step === 'shine' && k < stop; k++) { const sp = S.spots.filter(q => q[2] < 1)[0]; if (sp) await rub(sp); await p.waitForTimeout(250); S = await st(); }
        const sp = S && S.step === 'shine' && S.spots.find(q => q[2] < 1);
        if (sp) { const [x, y] = XY(sp); await p.mouse.move(x - 20, y); await p.mouse.down(); for (let k = 0; k < 5; k++) { await p.mouse.move(x + (k % 2 ? 18 : -18), y, { steps: 3 }); await p.waitForTimeout(30); } }
        await p.waitForTimeout(1600);      // (her proud hop over)
        console.log('groom', JSON.stringify(await st()));
      }
      await p.waitForTimeout(600);
    } },
  fish: { time: '10:30', hud: true, prep: (f) => { const g = f.game(); g.data.acctAsk = 1; if (g.data.fish) g.data.fish.worms = 20; g.save(); }, setup: (f) => { return { worms: f.game().worms() }; }, secs: 1,
    ui: async p => {
      const st = () => p.evaluate(() => { const F = window.__farm.fishing(); return F ? F.state : null; });
      const step = n => p.evaluate(n => { const f = window.__farm; for (let i = 0; i < n; i++) { f.step(1 / 30, 1); if (i % 15 === 0) f.gameTick(window.__T += 500, false); } }, n);
      await p.evaluate(() => window.__farm.dockCard()); await p.waitForTimeout(500);
      await p.evaluate(() => { const b = document.querySelector('.gsheet button[data-fish=go]'); if (b) b.click(); });
      for (let i = 0; i < 160; i++) { await step(30); const s = await st(); await p.evaluate(() => { const b = document.querySelector('.gsheet button[data-fhelp=ok]'); if (b) b.click(); }); if (s === 'ready') break; }
      await p.evaluate(() => { const f = window.__farm, D = f.dock(), k = +(window.__FK || 1.1); f.lookAt(D.stand[0] + Math.sin(D.face + 0.3) * k, D.stand[1] + Math.cos(D.face + 0.3) * k, +(window.__FS || 2.3)); });
      await p.evaluate(() => { const f = window.__farm, D = f.dock(), F = f.fishing(); return F.tapWater(D.stand[0] + Math.sin(D.face + 0.3) * 2.6, D.stand[1] + Math.cos(D.face + 0.3) * 2.6); });
      // (Audrey: "make the ducks awake": a duck dabbling or up-ending looks asleep from above; each sent swimming, head up)
      const awake = () => p.evaluate(() => { const D = window.__farm.ducks(); if (!D) return; for (const d of D.ducks) { if (d.task && d.task.act === 'swim') continue; const L = []; D.swimVia(L, [d.pos.x, d.pos.z], D.hop([d.pos.x, d.pos.z], 0.8, 1.8)); const sw = L.find(q => q.act === 'swim'); if (sw) d.task = sw; } });
      for (let i = 0; i < 60; i++) { await awake(); await step(15); if (await st() === 'bite') break; }
      await awake();
      await step(4); await p.evaluate(() => window.__farm.draw());
    } },
  // a dream coop: one breed's Deluxe garden close up through a perspective camera, the birds at play
  coop: {
    time: '10:40', arg: { breed: process.env.BREED || 'sil', chicks: +(process.env.CHICKS ?? 3), swap: (process.env.CSWAP ?? 'sil,pol').split(',').filter(Boolean) },
    // (Audrey: "Would be good to see each of them trying a different toy, and add chicks": a brood hatched this morning,
    // the mum with her chicks, the others each at a different toy)
    prep: (f, arg) => { const g = f.game(); g.data.acctAsk = 1;
      // (Audrey: "please find a better angle": the Silkies' coop moved, for the picture, to the Polish's corner of the farm,
      // the woods behind it and no neighbour in the way)
      const sw = (arg.swap || []).map(br => g.data.coops.find(x => x.breed === br));
      if (sw.length === 2 && sw[0] && sw[1]) { const [A, B] = sw, k = ['x', 'z', 'deg'], a = k.map(q => A[q]); k.forEach((q, i) => { A[q] = B[q]; B[q] = a[i]; }); }
      const c = g.data.coops.find(x => x.breed === arg.breed), hen = c && g.data.birds.find(b => b.coop === c.id && b.sex === 'h');
      if (c && hen && arg.chicks) c.brood = { hen: hen.id, start: Date.now() - 24 * 3600e3 - 3 * 3600e3, n: arg.chicks, hatched: true, kids: Array.from({ length: arg.chicks }, (_, i) => ({ sex: i % 2 ? 'r' : 'h', stars: 2 })) };
      g.save(); },
    setup: (f, arg) => {
      const P = f.gamePlots(), i = P.findIndex(p => p.gc && p.gc.breed === arg.breed), pl = P[i]; window.__i = i; window.__pl = pl;
      for (const x of pl.birds) x.layIn = 9999;
      const w = pl.frame.getWorldPosition(new f.THREE.Vector3()); window.__at = [w.x, w.z];
      return { i, at: [+w.x.toFixed(2), +w.z.toFixed(2)], rot: +pl.frame.rotation.y.toFixed(2), toys: pl.toys ? Object.keys(pl.toys).filter(k => pl.toys[k]) : null };
    },
    secs: +(process.env.SECS || 12),
    each: (f, t) => {
      const pl = window.__pl, T = pl.toys; if (!T) return;
      window.__TOYS.filter(q => T[q]).forEach((kind, k) => { if (!T[kind] || t < 0.5 + k * 0.9 || T[kind].sent) return; const bd = pl.birds.find(x => !x.busy() && !x.cuddle); if (bd && !T[kind].by && f.startPlay(bd, kind)) T[kind].sent = true; });
    },
    shot: { rel: [2.0, 0.3, 0.8], dist: 12, el: 26, fov: 32, az: 125 },      // (Audrey: "the coop is cut on the right bottom corner": the whole garden, right of the sign)      // (the whole coop and garden in, from its garden side: "the coop is cut", "a better angle")
  },
  // a winter themed building (the Silkies' Ice Palace) worn by its coop, the hens at play in its snowy garden
  theme: {
    time: '11:00', date: '2026-12-15T11:00:00Z', arg: { breed: process.env.BREED || 'sil', size: +(process.env.SIZE || 1.7), ox: +(process.env.OX || 0), oz: +(process.env.OZ || 0) },
    prep: (f, arg) => { const g = f.game(), c = g.data.coops.find(x => x.breed === arg.breed); g.data.themes = [...(g.data.themes || []), 'winter_' + arg.breed]; c.tier0 = c.tier; c.theme = 'winter'; c.tier = 4; g.save(); },
    setup: (f, arg) => {
      const P = f.gamePlots(), i = P.findIndex(p => p.gc && p.gc.breed === arg.breed), pl = P[i]; window.__i = i; window.__pl = pl;
      const w = pl.frame.getWorldPosition(new f.THREE.Vector3()); window.__at = [w.x, w.z];
      f.lookAt(w.x + arg.ox, w.z + arg.oz, arg.size); return { i, at: [+w.x.toFixed(2), +w.z.toFixed(2)], theme: pl.gc.theme, toys: pl.toys ? Object.keys(pl.toys) : null };
    },
    secs: +(process.env.SECS || 12),
    each: (f, t) => {
      const pl = window.__pl, T = pl.toys; if (!T) return;
      const ks = Object.keys(T); ks.forEach((kind, k) => {
        if (!T[kind] || t < 0.5 + k * 0.8 || T[kind].sent) return;
        const bd = pl.birds.find(x => !x.busy() && !x.cuddle);
        if (bd && !T[kind].by && f.startPlay(bd, kind)) T[kind].sent = true;
      });
    },
  },
};
for (const name of ONLY) {
  const S = SCENES[name];
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF, hasTouch: true, isMobile: true, locale: process.env.LOC || 'en-GB', timezoneId: 'Europe/London' });
  await ctx.addInitScript(([save, T]) => { if (!sessionStorage.getItem('show')) { localStorage.setItem('ff3d.farm', save); localStorage.setItem('ff3d.age', '{"b":"adult","by":"asked"}'); sessionStorage.setItem('show', '1'); } window.__T = T; Date.now = () => window.__T; }, [farm.save, S.date ? new Date(S.date).getTime() : farm.T]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=${S.time || '10:30'}${process.env.LANG2 ? '&lang=' + process.env.LANG2 : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
  await p.evaluate(live => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); window.__farm.pause(!live); window.__farm.wind(3); }, !!S.live);
  if (process.env.LANG2) await p.evaluate(l => window.__farm.game().setLang(l), process.env.LANG2);      // (the farm's own language: its save keeps it)
  if (S.prep || process.env.LANG2) {
    if (S.prep) await p.evaluate(([fn, arg]) => new Function('f', 'arg', fn)(window.__farm, arg), [S.prep.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, ''), S.arg || {}]);
    await p.evaluate(() => sessionStorage.setItem('show', '1'));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
    await p.evaluate(live => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); window.__farm.pause(!live); window.__farm.wind(3); }, !!S.live);
  }
  if (S.prep2) {
    await p.evaluate(([fn, arg]) => new Function('f', 'arg', fn)(window.__farm, arg), [S.prep2.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, ''), S.arg || {}]);
    await p.evaluate(() => sessionStorage.setItem('show', '1'));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
    await p.evaluate(live => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); window.__farm.pause(!live); window.__farm.wind(3); }, !!S.live);
  }
  if (S.prep) console.log('staged', await p.evaluate(() => [sessionStorage.getItem('ff.layout'), sessionStorage.getItem('ff.decor')].filter(Boolean).join(' ')));
  if (!S.hud) await p.addStyleTag({ content: HIDE });
  else await p.addStyleTag({ content: '#hint { display: none !important; }' });      // (the game's passing words, e.g. the golden egg's, off)
  if (process.env.FS) await p.evaluate(v => { window.__FS = v; }, +process.env.FS);
  const info = await p.evaluate(([fn, arg]) => new Function('f', 'arg', fn)(window.__farm, arg), [S.setup.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, ''), S.arg || {}]);
  await p.evaluate(([t, d]) => { window.__TOYS = t; window.__sharp = d; }, [TOYS, DSF]);
  if (process.env.TALL) await p.evaluate(o => window.__farm.tall(o), { a0: +(process.env.A0 || 956 / 440), up: +process.env.TALL });      // (the iPad's pictures: the phone's framing kept, TALL the share of the extra height above it)      // (the play things, for the scenes' steps in the page)
  if (process.env.EVAL) console.log('eval', JSON.stringify(await p.evaluate(process.env.EVAL)));      // (a look at the farm, for staging)
  const shot = process.env.SHOT ? JSON.parse(process.env.SHOT) : S.shot;
  const SNAPS = process.env.SNAPS ? process.env.SNAPS.split(',').map(Number) : [S.secs || 4];
  let done = 0;
  for (const at of SNAPS) {
  await run(p, at - done, S.each, S.arg); done = at;
  if (S.ui) { await p.evaluate(() => { window.__keepUI = true; }); await S.ui(p); }
  const where = await p.evaluate(o => {
    const f = window.__farm, pl = window.__pl;
    if (!window.__keepUI) { const u = f.gameUI(); if (u.isOpen) u.close(); }
    const out = { birds: pl ? pl.birds.map(x => [x.kind, !!x.cuddle, x.busy && x.busy() ? (x.busy().kind || 'busy') : '']) : null, hugAll: pl && pl.hugAll, went: window.__went, life: (() => { const L = f.farmLife(); return L ? { home: L.home, running: L.running } : null; })() };
    if (o && o.rel && window.__at) { o = { ...o, at: [window.__at[0] + o.rel[0], o.rel[1], window.__at[1] + o.rel[2]] }; }
    const L = f.farmLife && f.farmLife(); if (o && o.relF && L) { o = { ...o, at: [L.pos.x + o.relF[0], o.relF[1], L.pos.z + o.relF[2]] }; out.farmer = [+L.pos.x.toFixed(2), +L.pos.z.toFixed(2)]; }
    const sh = window.__sharp && f.sharp; if (sh) f.sharp(window.__sharp);      // (drawn at the screen's full sharpness, 3x: the game keeps to 2x)
    if (o) f.closeShot(o); else if (!window.__keepUI || sh) f.draw();
    return out;
  }, shot || null);
  const file = SNAPS.length > 1 ? `${name}_${at}` : name;
  await p.screenshot({ path: `${OUT}/${file}.png`, timeout: 180000 });
  console.log(file, JSON.stringify(info), JSON.stringify(where));
  }
  await ctx.close();
}
console.log('errors', JSON.stringify(errs));
await b.close();

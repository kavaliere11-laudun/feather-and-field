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
    time: process.env.FTIME || '16:00', arg: { size: +(process.env.SIZE || 7.2), at: process.env.AT ? process.env.AT.split(',').map(Number) : null, az: +(process.env.AZ || 0) },
    setup: (f, arg) => {
      const C = f.gamePlots().filter(p => p.gc).map(p => { const w = p.frame.getWorldPosition(new f.THREE.Vector3()); return [p.gc.breed, +w.x.toFixed(1), +w.z.toFixed(1)]; });
      const cx = arg.at ? arg.at[0] : C.reduce((a, c) => a + c[1], 0) / C.length, cz = arg.at ? arg.at[1] : C.reduce((a, c) => a + c[2], 0) / C.length;
      if (arg.az) f.setViewAz(arg.az);
      f.lookAt(cx, cz, arg.size); return { at: [+cx.toFixed(1), +cz.toFixed(1)], coops: C };
    },
    secs: 3,
  },
  // a snowy day across the farm: the flakes falling, the ground and roofs white, footprints in the yards
  snow: {
    time: '11:00', date: '2026-12-15T11:00:00Z', arg: { size: +(process.env.SIZE || 2.1), at: process.env.AT ? process.env.AT.split(',').map(Number) : [-26.2, -16.3] },
    prep: (f) => { const g = f.game(), c = g.data.coops.find(x => x.breed === 'sil'); g.data.themes = [...(g.data.themes || []), 'winter_sil']; c.tier0 = c.tier; c.theme = 'winter'; c.tier = 4; g.data.acctAsk = 1; g.save(); },
    setup: (f, arg) => {
      f.snow.start(); f.lookAt(arg.at[0], arg.at[1], arg.size);
      const P = f.gamePlots(); window.__pls = P.filter(p => p.gc && ['sil', 'rir', 'aya'].includes(p.gc.breed));
      return f.snow.state();
    },
    secs: +(process.env.SECS || 150),
    each: (f, t) => {
      for (const pl of window.__pls) { const T = pl.toys; if (!T) continue;
        Object.keys(T).forEach((kind, k) => { if (!T[kind] || t < 100 + k * 1.5 || T[kind].sent) return; const bd = pl.birds.find(x => !x.busy() && !x.cuddle); if (bd && !T[kind].by && f.startPlay(bd, kind)) T[kind].sent = true; }); }
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
    } },
  groom: { time: '10:30', hud: true, live: true, prep: (f) => { const g = f.game(); g.data.acctAsk = 1; g.save(); }, setup: (f) => { window.__FF_GROOM_SECS = 120; return {}; }, secs: 1,
    ui: async p => {
      await p.evaluate(() => window.__farm.showsSheet()); await p.waitForTimeout(500);
      await p.evaluate(() => { const bt = [...document.querySelectorAll('.gsheet .gshow .gbtn')].find(x => !x.disabled); if (bt) bt.click(); }); await p.waitForTimeout(2500);
      const st = await p.evaluate(() => { const G = window.__farm.groom.now(); return G ? G.state() : null; });
      const r = await p.evaluate(() => { const q = document.querySelector('.groom-pic'); if (!q) return null; const b = q.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
      if (r && st && st.spots) for (const sp of st.spots.slice(0, 2)) {
        const x = r[0] + sp[0] * r[2], y = r[1] + sp[1] * r[3];
        await p.mouse.move(x - 25, y); await p.mouse.down();
        for (let k = 0; k < 16; k++) { await p.mouse.move(x + (k % 2 ? 25 : -25), y + (k % 3) * 4, { steps: 3 }); await p.waitForTimeout(30); }
        await p.mouse.up();
      }
      const sp = r && st && st.spots && st.spots[2]; if (sp) { const x = r[0] + sp[0] * r[2], y = r[1] + sp[1] * r[3]; await p.mouse.move(x - 20, y); await p.mouse.down(); await p.mouse.move(x + 10, y + 3, { steps: 4 }); }
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
      for (let i = 0; i < 60; i++) { await step(15); if (await st() === 'bite') break; }
      await step(4); await p.evaluate(() => window.__farm.draw());
    } },
  // a dream coop: one breed's Deluxe garden close up through a perspective camera, the birds at play
  coop: {
    time: '10:40', arg: { breed: process.env.BREED || 'sil' },
    prep: (f) => { const g = f.game(); g.data.acctAsk = 1; g.save(); },
    setup: (f, arg) => {
      const P = f.gamePlots(), i = P.findIndex(p => p.gc && p.gc.breed === arg.breed), pl = P[i]; window.__i = i; window.__pl = pl;
      for (const x of pl.birds) x.layIn = 9999;
      const w = pl.frame.getWorldPosition(new f.THREE.Vector3()); window.__at = [w.x, w.z];
      return { i, at: [+w.x.toFixed(2), +w.z.toFixed(2)], rot: +pl.frame.rotation.y.toFixed(2), toys: pl.toys ? Object.keys(pl.toys).filter(k => pl.toys[k]) : null };
    },
    secs: +(process.env.SECS || 12),
    each: (f, t) => {
      const pl = window.__pl, T = pl.toys; if (!T) return;
      Object.keys(T).forEach((kind, k) => { if (!T[kind] || t < 0.5 + k * 0.9 || T[kind].sent) return; const bd = pl.birds.find(x => !x.busy() && !x.cuddle); if (bd && !T[kind].by && f.startPlay(bd, kind)) T[kind].sent = true; });
    },
    shot: { rel: [0, 0.45, 0.2], dist: 6.0, el: 22, fov: 30, az: 35 },
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
  if (S.prep) {
    await p.evaluate(([fn, arg]) => new Function('f', 'arg', fn)(window.__farm, arg), [S.prep.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, ''), S.arg || {}]);
    await p.evaluate(() => sessionStorage.setItem('show', '1'));
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
    await p.evaluate(live => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); window.__farm.pause(!live); window.__farm.wind(3); }, !!S.live);
  }
  if (!S.hud) await p.addStyleTag({ content: HIDE });
  else await p.addStyleTag({ content: '#hint { display: none !important; }' });      // (the game's passing words, e.g. the golden egg's, off)
  if (process.env.FS) await p.evaluate(v => { window.__FS = v; }, +process.env.FS);
  const info = await p.evaluate(([fn, arg]) => new Function('f', 'arg', fn)(window.__farm, arg), [S.setup.toString().replace(/^[^{]*{/, '').replace(/}\s*$/, ''), S.arg || {}]);
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
    if (o) f.closeShot(o); else if (!window.__keepUI) f.draw();
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

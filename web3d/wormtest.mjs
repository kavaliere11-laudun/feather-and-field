// Worms from the chickens (Audrey, 28 Oct: "that would be cute if the chickens get them to the farmer up to 3 a day per
// chicken if the chicken loves the farmer and the farmer goes and asks for it"; then "Replace them", "1, 2 or 3 by love",
// "One visit, all her worms"): ./withserver.sh node wormtest.mjs [OUT]   (LANG=fr; W, H: the screen, e.g. W=874 H=402; PORT)
// A new farm on a fake clock. Level 2: nothing about worms on a hen's card. Level 3: a shy hen finds none ("cuddles
// help"), her trust card says how many each level finds. Friendly: "Ask for worms · 🪱 1": the worm in the bag at once, the
// card closed, "… is finding a worm for …"; the farmer into the pen, crouched, his hand held out; she comes to him,
// scratches, pecks it up and drops it into his palm; "Thank you, my lovely!", a heart; his hand closed round it, up, to his
// bib pocket; out of the pen, no worm left lying about. Her card then: found today, more tomorrow, no button. The rooster,
// best friends: 3 worms. The dock's card: the worms, where they come from, said once; none: "No worms left" once. The next
// day she can be asked again; at night, not. A reload: kept, unflagged. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/wormtest', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
const T0 = new Date('2026-11-03T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => a.finish()); }, s);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const suffix = (fr ? '_fr' : '') + (side ? '_side' : '');
const shoot = async n => { await p.addStyleTag({ content: '#hint { opacity: 0.0001 !important; }' }).catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/worms_${n}${suffix}.png`, timeout: 180000 }); await p.addStyleTag({ content: '#hint { opacity: 1 !important; }' }).catch(() => {}); };
const card = id => p.evaluate(id => { const f = window.__farm; f.gameUI().close(); f.openBirdCard(f.allBirds.find(x => x.gid === id)); document.getAnimations().forEach(a => a.finish()); return document.querySelector('.gsheet').innerText; }, id);
const btn = () => p.evaluate(() => { const b = document.querySelector('.gsheet:not([hidden]) button[data-worms=ask]'); return b && b.textContent; });
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const worms = () => p.evaluate(() => window.__farm.game().worms());
const setBird = (id, o) => p.evaluate(([id, o]) => { const g = window.__farm.game(); Object.assign(g.bird(id), o); g.save(); }, [id, o]);
const later = h => p.evaluate(h => { window.__T += h * 3600e3; sessionStorage.setItem('__T', window.__T); }, h);
const T = {
  ask1: fr ? /Demander des vers · 🪱 1/ : /Ask for worms · 🪱 1/, ask3: fr ? /Demander des vers · 🪱 3/ : /Ask for worms · 🪱 3/,
  shy: fr ? /est encore farouche : pas de vers pour .+ Les câlins aident/ : /is still shy: no worms for .+ Cuddles help/,
  how: fr ? /Sociable 1 · En confiance 2 · Inséparable 3/ : /Friendly 1 · Trusting 2 · Best friend 3/,
  given: fr ? /a trouvé des vers pour .+ aujourd’hui\. D’autres demain/ : /found worms for .+ today\. More tomorrow/,
  done1: fr ? /cherche un ver pour/ : /is finding a worm for/, done3: fr ? /cherche 3 vers pour/ : /is finding 3 worms for/,
  hens: fr ? /Vos poules qui aiment .+ lui trouvent des vers chaque jour/ : /Your chickens who love .+ find worms every day/,
  none: fr ? /Plus de vers/ : /No worms left/, n4: fr ? /🪱 4 vers/ : /🪱 4 worms/, go: fr ? /Aller pêcher/ : /Go fishing/,
};
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); sessionStorage.setItem('__T', window.__T); const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 70; g.data.lvSeen = 2; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.3);
const ids = await p.evaluate(() => { const B = window.__farm.game().data.birds; return { hen: B.find(b => b.sex === 'h').id, roo: B.find(b => b.sex === 'r').id }; });
await p.evaluate(() => { const g = window.__farm.game(); for (const c of g.data.coops) for (const b of g.birdsIn(c.id)) if (b.sex === 'h') b.laid = window.__T; g.save(); });      // (no one off to lay in the middle of it)
let t = await card(ids.hen);
ok('level 2: nothing about worms on a hen\'s card', !(await btn()) && !T.shy.test(t) && !T.how.test(t), t.slice(0, 200));
// level 3
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = 400; g.data.lvSeen = 3; g.save(); f.gameUI().close(); }); await run(0.3);
t = await card(ids.hen);
ok('level 3, a shy hen: no worms yet ("cuddles help"), no button; her trust card says how many each level finds', !(await btn()) && T.shy.test(t) && T.how.test(t), t);
await setBird(ids.hen, { trust: 3 });
t = await card(ids.hen);
ok('Friendly: "Ask for worms · 🪱 1"', T.ask1.test(await btn()), await btn());
await shoot('1_card');
const w0 = await worms();
await p.evaluate(() => document.querySelector('.gsheet button[data-worms=ask]').click()); await run(0.2);
const ht = await hintT();
const visit = await p.evaluate(() => { const L = window.__farm.farmer(); return !!(L && ((L.task && L.task.name === 'pen') || (L.pending && L.pending.name === 'pen'))); });
ok('asked: the worm in the bag at once, the card closed, "… is finding a worm for …", the farmer on his way into the pen', (await worms()) === w0 + 1 && T.done1.test(ht) && visit && !(await p.evaluate(() => window.__farm.gameUI().kind)), { worms: await worms(), ht, visit });
// the visit, watched: crouched with his hand out; she comes to him, scratches, pecks it up, drops it in his palm; thanks, a
// heart; hand closed, up, to his pocket; out of the pen with nothing left lying about
const watch = async (id, n, pic) => p.evaluate(async ([id, n, pic]) => {
  const f = window.__farm, T3 = f.THREE, Bd = f.allBirds.find(x => x.gid === id), L = f.farmer(), w = { cup: false, dig: false, kick: false, inBill: false, inPalm: 0, closed: false, pocket: false, said: false, out: false, lying: null, pen: false, hearts: 0, pic: null };
  const h0 = f.heartsLive();
  for (let i = 0; i < 60 * 30; i++) {
    window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false);
    const P = L.pen, want = L.want || {};
    if (P) w.pen = true;
    if (Bd.cuddle) { w.called = true; if (P && P.henAt) { const q = Bd.root.position, o = Math.hypot(q.x - P.henAt.at[0], q.z - P.henAt.at[1]); w.minOff = Math.min(w.minOff || 9, +o.toFixed(2)); w.at = P.henAt.at.map(v => +v.toFixed(2)); w.side = P.henAt.side; w.sides = P.henAt.sides; w.room = P.henAt.room; w.reach = Bd.cuddle.reach; if (!w.from) w.from = [+q.x.toFixed(2), +q.z.toFixed(2)]; w.last = [+q.x.toFixed(2), +q.z.toFixed(2)]; w.stuck = Bd.cuddle.stuck; w.hopped = Bd.cuddle.hopped || 0; if (!w.obs) { w.obs = f.penObstacles().map(o => o.map(v => +(+v).toFixed(2))); w.block = (Bd.plot.block || []).map(o => [+o[0].toFixed(2), +o[1].toFixed(2), +o[2].toFixed(2)]); w.free = [Bd.free(0.83, 0.9), Bd.free(0.83, 1.1), Bd.free(0.6, 1.2)]; w.spec = f.penSpecOf(0); } } }
    if (L.task && !w.tasks) w.tasks = []; if (L.task && w.tasks.length < 30) { let t = L.task, nm = []; while (t && t.list) { const c = t.list[t.i]; if (!c) break; nm.push(c.name || '?'); t = c; } const k = nm.join('>'); if (w.tasks[w.tasks.length - 1] !== k) w.tasks.push(k); }
    if (want.pose === 'cup' || want.pose === 'cupL') w.cup = true;
    if (want.pose === 'pocket' || want.pose === 'pocketL') w.pocket = true;
    if (Bd.cuddle && Bd.cuddle.dig) { w.dig = true; if (Bd.cuddle.dig.t < 0.9) w.kick = true; }
    const M = P && P.worms;
    if (M) {
      const head = Bd.rig.bones.head.getWorldPosition(new T3.Vector3()), hand = L.f.rig.B[P.henAt && P.henAt.hand === 'L' ? 'handL' : 'handR'].getWorldPosition(new T3.Vector3());
      let palm = 0;
      const dt = Bd.cuddle && Bd.cuddle.dig ? Bd.cuddle.dig.t : -1;
      for (const m of M) { if (!m.visible) continue; if (dt > 1.15 && dt < 1.7) { const d = m.position.distanceTo(f.billTip(Bd)); w.billD = Math.min(w.billD || 9, +d.toFixed(3)); if (d < 0.05) w.inBill = true; } if (m.position.distanceTo(hand) < 0.09) palm++; }
      w.inPalm = Math.max(w.inPalm, palm);
      if (pic && palm === 1 && !w.pic && Bd.cuddle && Bd.cuddle.dig && Bd.cuddle.dig.t > 2.2) {      // (a close look at it in his palm, her looking up at him)
        f.draw(); f.closeShot({ at: [L.pos.x * 0.5 + Bd.root.getWorldPosition(new T3.Vector3()).x * 0.5, 0.25, L.pos.z * 0.5 + Bd.root.getWorldPosition(new T3.Vector3()).z * 0.5], az: 0, el: 22, dist: 1.6, fov: 30 });
        w.pic = document.querySelector('canvas').toDataURL('image/png');
      }
      if (w.inPalm && /^pocket/.test(want.pose) && M.every(m => !m.visible)) w.closed = true;
      if (P.henAt) { w.side = P.henAt.side; w.henAt = JSON.parse(JSON.stringify(P.henAt)); }
    }
    if (L.said.slice(-3).some(k => /^worms[HR]$/.test(k))) w.said = true;
    if (w.pen && !L.pen) { w.out = true; w.lying = f.scene.children.filter(o => o.isMesh && o.geometry && o.geometry.type === 'TubeGeometry' && o.userData.moves && o.material && o.material.color && o.material.color.getHexString() === 'cf7a72').length; break; }
  }
  w.hearts = f.heartsLive() - h0;
  sessionStorage.setItem('__T', window.__T); f.draw(); return w; }, [id, n, pic]);
const v1 = await watch(ids.hen, 1, true);
if (v1.pic) { fs.writeFileSync(`${OUT}/worms_2_palm${suffix}.png`, Buffer.from(v1.pic.split(',')[1], 'base64')); v1.pic = '(saved)'; }
ok('the visit: into the pen, crouched with his hand held out; she scratches and pecks it up (in her beak), drops it into his palm; "Thank you…", a heart', v1.pen && v1.cup && v1.dig && v1.kick && v1.inBill && v1.inPalm === 1 && v1.said && v1.hearts >= 1, v1);
ok('then his hand closed round it, up to his bib pocket; out of the pen, no worm left lying about', v1.closed && v1.pocket && v1.out && v1.lying === 0, v1);
t = await card(ids.hen);
ok('her card after: found worms today, more tomorrow, no button', T.given.test(t) && !(await btn()), t.slice(0, 300));
ok('asked twice in a day: nothing more', (await p.evaluate(id => window.__farm.game().askWorms(id), ids.hen)) === null && (await worms()) === w0 + 1);
// the rooster, best friends: 3
await setBird(ids.roo, { trust: 15 });
await card(ids.roo);
ok('the rooster, best friends: "Ask for worms · 🪱 3"', T.ask3.test(await btn()), await btn());
await p.evaluate(() => document.querySelector('.gsheet button[data-worms=ask]').click()); await run(0.2);
ok('3 worms in the bag, "… is finding 3 worms for …"', (await worms()) === w0 + 4 && T.done3.test(await hintT()), { worms: await worms(), hint: await hintT() });
const v3 = await watch(ids.roo, 3, false);
ok('his visit: three worms, one after another, all in the farmer\'s palm; "Thanks, old chap!"; out with nothing left lying', v3.inPalm === 3 && v3.said && v3.closed && v3.out && v3.lying === 0, v3);
// the dock's card: the worms, where they come from (once); none: "No worms left" once
await p.evaluate(() => window.__farm.dockCard()); await run(0.2);
t = await p.evaluate(() => document.querySelector('.gsheet:not([hidden])').innerText);
ok('the dock\'s card: 4 worms, where they come from, Go fishing', T.n4.test(t) && T.hens.test(t) && T.go.test(t), t);
await shoot('3_dock');
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.fish.worms = 0; g.save(); f.gameUI().close(); f.dockCard(); }); await run(0.2);
t = await p.evaluate(() => document.querySelector('.gsheet:not([hidden])').innerText);
ok('no worms: "No worms left" said once, where they come from, no Go fishing', (t.match(T.none) || []).length === 1 && t.split(T.none.source.replace(/\\/g, '')).length - 1 <= 1 && T.hens.test(t) && !T.go.test(t), t);
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.fish.worms = 4; g.save(); f.gameUI().close(); });
// the next day: again; at night: not
await later(24); await run(0.5);
await card(ids.hen);
ok('the next day: she can be asked again', T.ask1.test(await btn()), await btn());
await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.setHour(23); }); await run(0.3);
t = await card(ids.hen);
ok('at night: no "Ask for worms"', !(await btn()), t.slice(0, 260));
await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.setHour(undefined); });
// a reload: kept, unflagged
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const re = await p.evaluate(ids => { const g = window.__farm.game(); return { edited: g.edited, worms: g.worms(), roo: g.bird(ids.roo).worm, hen: g.bird(ids.hen).worm }; }, ids);
ok('a reload: the worms and the days they were found kept, unflagged', !re.edited && re.worms === 4 && /^\d{8}$/.test(re.roo) && /^\d{8}$/.test(re.hen), re);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

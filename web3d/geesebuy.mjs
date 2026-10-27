// Release 3 step 1 (the geese to buy): node geesebuy.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402; SHOTS: a folder)
// A farm at level 3: no geese on the farm; the shop's Animals shelf says the geese come at level 4. Level 4: its card says
// "New to buy: Gertrude and Hector, the geese". Too few coins: "Not enough coins yet". Bought (1,200 coins, +24 XP): they
// come swimming over the pond, come ashore with a shake and a honk, and the message says they've come to live by the pond;
// for minutes after they live round it: never on anything in the way, on land only on the pond's own two fields (inside the
// meadow's fence), Hector never far. A tap on a goose: her name. The shelf: "At the pond", See them. A reload keeps them,
// unflagged. At bedtime they go to bed by the water. A save changed outside (the geese's day made up, an animal the game
// doesn't have) is checked and flagged. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T11:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); p.setDefaultNavigationTimeout(120000);       // (a busy machine loads slowly)
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
// the farm's time going on (dt a step), the geese checked every half second: where each is, against the grid and the fields
const run = (secs, dt = 1 / 30) => p.evaluate(([s, dt]) => {
  const f = window.__farm, F = f.geese(), nav = f.nav(), out = { blocked: 0, offField: 0, far: 0, wetMax: 0, n: 0, fields: {} };
  for (let i = 0, k = 0; i < s / dt; i++) {
    window.__T = Math.round(window.__T + 1000 * dt); f.step(dt, 1); f.gameTick(window.__T, false);
    if (F && F.geese.length && (k += dt) >= 0.5) {
      k = 0; out.n++;
      for (const g of F.geese) {
        out.wetMax = Math.max(out.wetMax, g.wet);
        // (as geeseday.mjs: on a blocked cell of the grid other than the pond as the grid marks it, its ellipse grown 0.35 m
        // (+0.2, a cell's half), or their bed (marked for the fox); on land, on the pond's two fields or the bank between)
        const dx = g.pos.x - F.pc[0], dz = g.pos.z - F.pc[1], lu = Math.sqrt(F.lu2) + 0.55, lv = Math.sqrt(F.lv2) + 0.55;
        const inPond = ((dx * F.pu[0] + dz * F.pu[1]) / Math.sqrt(F.lu2) / lu) ** 2 + ((dx * F.pv[0] + dz * F.pv[1]) / Math.sqrt(F.lv2) / lv) ** 2 <= 1;
        if (!inPond && !nav.freeAt(g.pos.x, g.pos.z) && !F.bed.some(b => Math.hypot(b[0] - g.pos.x, b[1] - g.pos.z) < 0.56)) { out.blocked++; (out.at || (out.at = [])).length < 6 && out.at.push([g.name, g.act, +g.pos.x.toFixed(2), +g.pos.z.toFixed(2)]); }
        const fl = f.fieldAt(g.pos.x, g.pos.z); out.fields[fl] = (out.fields[fl] || 0) + 1;
        if (fl !== 10 && fl !== 14 && F.pondAt(g.pos.x, g.pos.z)[0] > 1.3) { out.offField++; (out.off || (out.off = [])).length < 6 && out.off.push([g.name, +g.pos.x.toFixed(2), +g.pos.z.toFixed(2), fl]); }
      }
      if (Math.hypot(F.geese[0].pos.x - F.geese[1].pos.x, F.geese[0].pos.z - F.geese[1].pos.z) > 9) out.far++;
      if (F.geese.every(g => g.wet < 0.1)) out.dry = (out.dry || 0) + 1;      // (both up on the grass: a moment of it at least)
    }
  }
  sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } });
  return out;
}, [secs, dt]);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/geese_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const xpAt = L => Math.round(60 * Math.pow(L - 1, 2.1)) + 5;
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(), F = f.geese();
  return { level: g.level, coins: g.data.coins, xp: g.data.xp, owned: g.animalOwned('geese'), geese: F.geese.length, shown: F.group.visible, card: f.gameUI().kind, edited: g.edited, hint: document.getElementById('hint').textContent }; });
const sheet = () => p.evaluate(() => document.querySelector('.gsheet').innerText);
const animals = async () => { await p.evaluate(() => { window.__farm.deco.shop(); document.querySelector('.gshop-tabs .gchip[data-tab="animals"]').click(); }); await run(0.3); return p.evaluate(() => { const c = document.querySelector('.gsheet [data-animal="geese"]'), btn = c && c.querySelector('button'); return c && { text: c.innerText, btn: btn && btn.textContent, off: btn && btn.disabled, tabs: [...document.querySelectorAll('.gshop-tabs .gchip')].map(x => x.textContent).join('|'), title: document.querySelector('.gsheet').innerText.split('\n')[0] }; }); };
const T = { lvl4: fr ? /Arrive au niveau 4/ : /Comes at level 4/, newbuy: fr ? /Nouveau à acheter : Gertrude et Hector, les oies/ : /New to buy: Gertrude and Hector, the geese/,
  broke: fr ? /Pas encore assez de pièces/ : /Not enough coins yet/, buy: fr ? /^Acheter · 1\s200$/ : /^Buy · 1,200$/, came: fr ? /Gertrude et Hector viennent vivre au bord de l’étang ! \+24 XP/ : /Gertrude and Hector have come to live by the pond! \+24 XP/,
  tabs: fr ? 'Décorations|Animaux|Tenues|Saisons' : 'Decorations|Animals|Outfits|Seasons', title: fr ? /La boutique de la ferme/ : /The farm shop/, at: fr ? /À l’étang/ : /At the pond/, see: fr ? 'Les voir' : 'See them', tag: fr ? /^(Gertrude · oie d'Embden|Hector · jars de Toulouse)$/ : /^(Gertrude · Embden goose|Hector · Toulouse gander)$/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 3: no geese yet; the shelf says level 4
await p.evaluate(L3 => { const g = window.__farm.game(); g.data.xp = L3; g.data.lvSeen = 3; g.data.coins = 1000; g.data.land = [0, 1, 2]; g.data.guide = { step: 5, done: true }; g.save(); }, xpAt(3));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
let s = await st(), a = await animals();
await shot('1_level3');
ok('level 3: no geese on the farm; the shop ("The farm shop": Decorations, Animals, Outfits, Seasons) says the geese come at level 4', s.level === 3 && !s.owned && s.geese === 0 && !s.shown && a && T.lvl4.test(a.text) && !a.btn && a.tabs === T.tabs && T.title.test(a.title), { s, a });
await p.evaluate(() => window.__farm.gameUI().close());
// level 4: its card
await p.evaluate(L4 => { const g = window.__farm.game(); g.data.xp = L4; g.data.land.push(3); g.save(); }, xpAt(4)); await run(1.6);
s = await st(); let t = await sheet();
const pic = await p.evaluate(() => { const i = document.querySelector('.gsheet [data-animal="geese"] img'); return i && i.getAttribute('src'); });
await shot('2_level4');
ok('level 4: its card says "New to buy: Gertrude and Hector, the geese", with their picture', s.level === 4 && s.card === 'levelup' && T.newbuy.test(t) && /^decor\/geese\.webp/.test(pic || ''), { s, t: t.slice(0, 400), pic });
await p.evaluate(() => window.__farm.gameUI().close());
// too few coins
a = await animals();
ok('1,000 coins: "Not enough coins yet", the button off', T.broke.test(a.btn) && a.off, a);
await p.evaluate(() => window.__farm.gameUI().close());
// bought
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 5000; g.save(); });
a = await animals();
await p.waitForFunction(() => { const i = document.querySelector('.gsheet [data-animal="geese"] img'); return i && i.complete; }, null, { timeout: 20000 }).catch(() => {});
await shot('3_shop');
ok('5,000 coins: "Buy · 1,200" (+24 XP)', T.buy.test(a.btn) && !a.off && /\+24 XP/.test(a.text), a);
const xp0 = (await st()).xp;
await p.tap('.gsheet [data-animal="geese"] button'); await run(0.8);
s = await st();
const look = await p.evaluate(() => { const f = window.__farm, F = f.geese(), v = f.view; return { wet: F.geese.map(g => +g.wet.toFixed(2)), task: F.lead.task && F.lead.task.name, d: Math.hypot(v.target.x - F.lead.pos.x, v.target.z - F.lead.pos.z) }; });
await shot('4_bought');
ok('bought: 1,200 coins, +24 XP, the sheet closed; they come swimming over the pond, the view to them; the message', s.owned && s.coins === 3800 && s.xp - xp0 === 24 && s.geese === 2 && s.shown && s.card === null && look.wet.every(w => w > 0.9) && look.task === 'arrive' && look.d < 3 && T.came.test(s.hint), { s, look });
let r = await run(40);
const ashore = await p.evaluate(() => { const F = window.__farm.geese(); return { wet: F.geese.map(g => +g.wet.toFixed(2)), task: F.lead.task && F.lead.task.name, act: F.lead.act }; });
await shot('5_ashore');
ok('forty seconds on: both have come ashore, never on anything, on the pond\'s own fields', r.dry > 4 && ashore.task !== 'arrive' && r.blocked === 0 && r.offField === 0, { ashore, r });
// minutes of their day
r = await run(240, 1 / 15);
ok('four minutes of their day: never on anything, on land only on the pond\'s two fields, Hector never far', r.n > 400 && r.blocked === 0 && r.offField === 0 && r.far === 0, r);
// a tap on a goose: her name
const sp = await p.evaluate(() => { const f = window.__farm, F = f.geese(), G = F.lead; f.lookAt(G.pos.x, G.pos.z, 2.2); f.step(1 / 30, 2); f.draw(); const q = f.screenOf(G.pos.x, G.pos.z, G.pos.y + G.hitY); return q; });
await p.touchscreen.tap(sp.x, sp.y); await run(0.2);
const tag = await p.evaluate(() => { const e = document.getElementById('tag'); return { on: e.classList.contains('on'), text: e.textContent }; });
await shot('6_tap');
ok('a tap on Gertrude: her name', tag.on && T.tag.test(tag.text), tag);
// the shelf: At the pond, See them
await p.evaluate(() => window.__farm.lookAt(-25, -23, 3)); await run(0.2);
a = await animals();
ok('the shelf: "At the pond", See them', T.at.test(a.text) && a.btn === T.see, a);
await p.tap('.gsheet [data-animal="geese"] button'); await run(1);
const seen = await p.evaluate(() => { const f = window.__farm, F = f.geese(), c = F.centre(new f.THREE.Vector3()); return { card: f.gameUI().kind, d: Math.hypot(f.view.target.x - c.x, f.view.target.z - c.z) }; });
ok('See them: the sheet closed, the view on them', seen.card === null && seen.d < 1.5, seen);
// a reload keeps them
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a reload: the geese as they were, not flagged', s.owned && s.geese === 2 && s.shown && !s.edited, s);
// bedtime
await p.evaluate(() => window.__farm.setHour(21.6));         // (the farm's clock: a driven browser's is fixed unless set)
r = await run(240, 1 / 15);
const bed = await p.evaluate(() => { const F = window.__farm.geese(); return { asleep: F.geese.map(g => !!g.asleep), d: F.geese.map((g, i) => +Math.hypot(g.pos.x - F.bed[i][0], g.pos.z - F.bed[i][1]).toFixed(2)), task: F.geese.map(g => g.task && g.task.name) }; });
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, F = f.geese(); f.lookAt(F.bed[0][0], F.bed[0][1], 2.2); f.step(1 / 30, 3); }); await p.waitForTimeout(300); }
await shot('7_bed');
ok('bedtime: asleep side by side in their bed by the water, never on anything on the way', bed.asleep.every(Boolean) && bed.d.every(d => d < 0.3) && r.blocked === 0 && r.offField === 0, { bed, r });
// a save changed outside
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.animals = { geese: { at: 'yesterday' } }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a save changed outside (the geese\'s day made up): checked and flagged, no geese', s.edited && !s.owned && s.geese === 0 && !s.shown, s);
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.animals = { geese: { at: 1 }, unicorn: { at: 1 } }; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a save changed outside (an animal the game doesn\'t have): checked and flagged, the geese kept', s.edited && s.owned && s.geese === 2, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

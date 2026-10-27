// The game, release 4 step 2 (the coops' looks: the Red Barn's five): node upgradetest.mjs [OUT]   (LANG=fr; W, H: the
// screen, e.g. W=874 H=402; PORT; BREED=orp: the same with a Thatched Cottage, placed on the farm and first in the save)
// A fresh farm on a fake clock: its Red Barn comes Rustic (the old crate, a tiny pen); its card says what's next (Mended,
// what it brings, 300 coins; not enough coins: says so). Coins given: upgraded from its card, Mended, then Snug, Cosy and
// Deluxe: each time the price paid, a little XP, the new look there and then (house, pen, fence), its birds in their
// bigger pen and free to walk, the farmer still able to get to its gate, the play things from Cosy; where the bigger pen
// doesn't fit, the card says to move the coop first (moved somewhere roomier, then it fits). A reload keeps the look,
// unflagged. A farm from before the looks: its coops Snug, unflagged. Pictures of each look (OUT/up_<n>.png).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/upgradetest', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), B = process.env.BREED || 'rir';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
const T0 = new Date('2026-10-24T11:00:00+01:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const LOOKS = ['box', 'shed', 'house', 'cosy', 'deluxe'].map(h => h + '_' + B), PENN = t => t === 2 ? 'pen_base' : 'pen_t' + t + (B === 'rir' ? '' : '_' + B);
const state = () => p.evaluate(() => {
  const f = window.__farm, g = f.game(), c = g.data.coops[0], P = f.coopPlots ? null : null, L = f.coopLook(0), plot = f.gamePlots ? null : null;
  return { tier: c.tier, coins: g.data.coins, xp: g.data.xp, cv: g.data.cv, edited: g.edited, house: L.house, pen: L.pen, fence: L.fence, foot: f.footOf(0) };
});
const birds = () => p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.gc && q.gc.id === f.game().data.coops[0].id); return { n: P.birds.length, free: P.birds.filter(b => b.root.visible && !b.busy()).every(b => b.free(b.root.position.x, b.root.position.z)), toys: !!P.toys, gate: !!f.penOut(0) }; });
const out = async () => {                    // (the farmer about his day: out of its pen first, else the card says to try again)
  for (let i = 0; i < 90; i++) { if (!(await p.evaluate(() => { const f = window.__farm, id = f.game().data.coops[0].id; return !!f.coopPlots().find(q => q.gc && q.gc.id === id).farmer; }))) return; await run(1); }
};
const card = async () => {
  await out();
  await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.coopCard(0); });
  await run(0.2);
  return p.evaluate(() => { const s = document.querySelector('.gsheet'), u = s.querySelector('.gup'), bt = u && u.querySelector('.gbtn'), why = u && u.querySelector('.gup-why'); return { kind: window.__farm.gameUI().kind, text: s.innerText, up: u ? u.innerText : null, btn: bt ? bt.textContent : null, dis: bt ? bt.disabled : null, why: why && !why.hidden ? why.textContent : null }; });
};
const shoot = async n => {
  await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); const [x, z] = f.coopAt(0); f.lookAt(x, z, 2.6); f.step(1 / 30, 2); f.draw(); });
  await p.addStyleTag({ content: '#hint { opacity: 0.0001 !important; }' }).catch(() => {});
  await p.screenshot({ path: `${OUT}/up_${B === 'rir' ? '' : B + '_'}${n}${fr ? '_fr' : ''}${W > H ? '_side' : ''}.png`, timeout: 180000 });
};
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
if (B !== 'rir') {                                 // a coop of that breed placed on the farm (its level reached), first in the save
  const ok_ = await p.evaluate(B => {
    window.__T = Math.round(window.__T);           // (whole milliseconds, as a real clock: the save keeps them so)
    const f = window.__farm, g = f.game(); g.data.xp = 60000; g.data.lvSeen = 27; g.data.land = [0, 1, 2, 3, 4, 5]; g.data.guide = { step: 5, done: true }; g.data.first = null;
    const c = g.data.coops[0];
    for (let r = 6; r < 30; r += 0.5) for (let k = 0; k < r * 6; k++) { const a = k / (r * 6) * 6.28, at = { x: Math.round((c.x + Math.cos(a) * r) * 4) / 4, z: Math.round((c.z + Math.sin(a) * r) * 4) / 4, deg: 90 };
      const S = f.coopSpotAt(at, 0); if (!S || !S.ok) continue;
      const d = g.draftCoop(B, at); if (!d) return 'no draft'; g.placeCoop(d, at); g.data.coops.unshift(g.data.coops.pop()); g.save(); sessionStorage.setItem('__T', window.__T); return true; }
    return 'no spot';
  }, B);
  ok(`a ${B} coop placed`, ok_ === true, ok_);
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
  await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); });
}
let s = await state();
ok('a new farm: its coop comes Rustic (a tiny pen), the farm marked as after the looks, unflagged', s.tier === 0 && s.house === LOOKS[0] && s.pen === PENN(0) && s.cv === 4 && !s.edited, s);
let c = await card();
ok('its card: Rustic; next Mended, what it brings, 300 coins; not enough coins yet: says so, the button off', c.kind === 'coop' && (fr ? /Rustique/ : /Rustic/).test(c.text) && (fr ? /style Rafistolé/ : /Upgrade to Mended/).test(c.up) && (fr ? /Pas assez de pièces \(300\)/ : /Not enough coins \(300\)/).test(c.btn) && c.dis === true, c);
await shoot(0);
// coins given (and the land round the home field, for the bigger pens)
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 20000; g.save(); });
for (let t = 1; t <= 4; t++) {
  c = await card();
  const look = [null, fr ? 'Rafistolé' : 'Mended', fr ? 'Confortable' : 'Snug', fr ? 'Douillet' : 'Cosy', fr ? 'De luxe' : 'Deluxe'][t], price = [0, 300, 1000, 3000, 8000][t];
  ok(`next: ${look}, ${price} coins, the button on`, c.up && c.up.includes(look) && c.dis === false && c.btn.replace(/[\s  ,.]/g, '').includes(String(price)), c);
  const s0 = await state();
  await p.tap('.gsheet .gup .gbtn'); await run(0.4);
  s = await state(); c = await p.evaluate(() => { const s = document.querySelector('.gsheet'), w = s && s.querySelector('.gup-why'); return { open: !document.querySelector('.gsheet').hidden, why: w && !w.hidden ? w.textContent : null }; });
  if (s.tier === t - 1 && c.why) {           // no room for the bigger pen here: the card says so; moved somewhere roomier
    ok(`${look}: no room for its pen here, the card says to move the coop first, nothing paid`, (fr ? /déplacez d’abord le poulailler/ : /move the coop first/).test(c.why) && s.coins === s0.coins, { c, s });
    const spot = await p.evaluate(t => {          // (moved there: room for the pen, its gate onto the farm; else the next)
      const f = window.__farm, g = f.game(); g.data.xp = Math.max(g.data.xp, 60000); if (g.data.land.length < 5) g.data.land = [0, 1, 2, 3, 4]; g.save();
      const c = g.data.coops[0]; let tries = 0; f.gameUI().close();
      for (let r = 0; r < 30; r += 0.5) for (let k = 0; k < Math.max(1, r * 6); k++) { const a = k / Math.max(1, r * 6) * 6.28, x = Math.round((c.x + Math.cos(a) * r) * 4) / 4, z = Math.round((c.z + Math.sin(a) * r) * 4) / 4;
        for (const deg of [90, 0, 180, 270]) { const o = { x, z, deg }; const S = f.coopSpotAt(o, t); if (!(S && S.ok)) continue;
          if (f.moveCoopTo(0, o)) return o; f.move.cancel(); if (++tries > 40) return null; } }
      return null;
    }, t);
    ok(`${look}: a roomier spot found, the coop moved there`, !!spot, spot);
    if (!spot) break;
    await run(0.5);
    c = await card(); await p.tap('.gsheet .gup .gbtn'); await run(0.4); s = await state();
  }
  const bd = await birds(), hint = await p.evaluate(() => document.getElementById('hint').textContent);
  ok(`upgraded to ${look}: the price paid, a little XP, its look (house, pen, fence) there and then, a hint`, s.tier === t && s.coins === s0.coins - price && s.xp > s0.xp && s.house === LOOKS[t] && s.pen === PENN(t) && (fr ? new RegExp('style ' + look) : new RegExp('now ' + look)).test(hint), { s, hint });
  ok(`${look}: its pen bigger than before, its birds in it free to walk, the farmer can get to its gate${t >= 3 ? ', the play things' : ''}`, s.foot.x1 - s.foot.x0 >= s0.foot.x1 - s0.foot.x0 && bd.free && bd.gate && bd.toys === t >= 3, { foot: s.foot, bd });
  await run(3);
  await shoot(t);
}
c = await card();
ok('Deluxe: the finest coop on the farm, no more upgrades', !c.up && (fr ? /Le plus beau poulailler/ : /The finest coop/).test(c.text), c);
// a reload keeps it
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
s = await state(); const bd = await birds();
ok('a reload: still Deluxe, its pen and play things, unflagged', s.tier === 4 && s.house === LOOKS[4] && s.pen === PENN(4) && !s.edited && bd.toys && bd.free, { s, bd });
// a farm from before the looks: its coop Snug, unflagged
await p.evaluate(() => {
  const k = Object.keys(localStorage).find(k => { try { return JSON.parse(localStorage.getItem(k)).d.coops; } catch (e) { return false; } });
  const raw = JSON.parse(localStorage.getItem(k)); delete raw.d.cv; for (const c of raw.d.coops) c.tier = 0;
  const seal = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
  raw.s = seal(JSON.stringify(raw.d)); localStorage.setItem(k, JSON.stringify(raw));
});
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
s = await state();
ok('a farm from before the looks: its coop Snug (the house and pen as they were), unflagged', s.tier === 2 && s.house === LOOKS[2] && s.pen === 'pen_base' && s.cv === 4 && !s.edited, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();

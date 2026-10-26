// Release 3 step 2 (the dog to buy): node dogbuy.mjs   (LANG=fr; W, H: the screen, e.g. W=874 H=402; SHOTS: a folder)
// A farm at level 8: no dog; the shop's Animals shelf says he comes at level 9. Level 9: its card says "New to buy: Biscuit,
// the farm dog". Too few coins: "Not enough coins yet". "Buy and place · 4,000": his kennel to place like a decoration (its
// outline, the bar); put down: paid for (4,000 coins, +80 XP), the dog out in front of it, "Biscuit has come to live on your
// farm!", then the card for his name: "Pepper" saved (his label, the board over his door, the shelf's card). The kennel and
// bowls in everyone's way on the grid. Minutes of his day: never into anything outside his own kennel, never off the farm's
// ground he can walk. His kennel moved from the shelf: the dog back at it. A tap on the kennel: the Animals shelf. A reload
// keeps him, his name and his kennel, unflagged. At night he sleeps in his kennel. A save changed outside (a name with
// < >, the dog before level 9) is checked and flagged. No page errors.
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
p.on('dialog', d => { errs.push('dialog: ' + d.message()); d.dismiss(); });
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
// the farm's time going on (dt a step), the dog checked every half second: where he is, against the grid (outside his home)
const run = (secs, dt = 1 / 30) => p.evaluate(([s, dt]) => {
  const f = window.__farm, nav = f.nav(), out = { blocked: 0, n: 0, did: {} };
  for (let i = 0, k = 0; i < s / dt; i++) {
    window.__T = Math.round(window.__T + 1000 * dt); f.step(dt, 1); f.gameTick(window.__T, false);
    const D = f.dog();
    if (D && (k += dt) >= 0.5) {
      k = 0; out.n++; const d = D.dog, [lx, lz] = D.local(d.pos.x, d.pos.z), home = lx > -0.85 && lx < 1.55 && Math.abs(lz) < 1.15;
      if (!home && !nav.freeAt(d.pos.x, d.pos.z) && !f.onBridge(d.pos.x, d.pos.z)) { out.blocked++; (out.at || (out.at = [])).length < 6 && out.at.push([D.doing, d.task && d.task.name, +d.pos.x.toFixed(2), +d.pos.z.toFixed(2)]); }
      if (D.doing) out.did[D.doing] = 1;
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
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/dog_${fr ? 'fr' : 'en'}_${W}x${H}_${name}.png`, timeout: 180000 }); } };
const xpAt = L => Math.round(60 * Math.pow(L - 1, 2.1)) + 5;
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(), D = f.dog(), k = g.kennel();
  return { level: g.level, coins: g.data.coins, xp: g.data.xp, owned: g.animalOwned('dog'), name: g.dogName(), kennel: k && [k.x, k.z], dog: !!D, label: D && D.dog.label, board: f.kennelName(), card: f.gameUI().kind, edited: g.edited, hint: document.getElementById('hint').textContent,
    form: !document.getElementById('dogname').hidden, move: f.deco.state().on }; });
const animals = async () => { await p.evaluate(() => { window.__farm.deco.shop(); document.querySelector('.gshop-tabs .gchip[data-tab="animals"]').click(); }); await run(0.3); return p.evaluate(() => { const c = document.querySelector('.gsheet [data-animal="dog"]'); return c && { text: c.innerText, btns: [...c.querySelectorAll('button')].map(x => x.textContent), off: [...c.querySelectorAll('button')].map(x => x.disabled) }; }); };
const tapBtn = async text => { await p.evaluate(t => [...document.querySelectorAll('.gsheet [data-animal="dog"] button')].find(x => x.textContent === t).click(), text); await run(0.4); };
const T = { lvl9: fr ? /Arrive au niveau 9/ : /Comes at level 9/, newbuy: fr ? /Nouveau à acheter : Biscuit, le chien de la ferme/ : /New to buy: Biscuit, the farm dog/,
  broke: fr ? 'Pas encore assez de pièces' : 'Not enough coins yet', buy: fr ? /^Acheter et placer · 4\s000$/ : /^Buy and place · 4,000$/, came: fr ? /Biscuit vient vivre dans votre ferme ! \+80 XP/ : /Biscuit has come to live on your farm! \+80 XP/,
  named: fr ? /Votre chien s’appelle Pepper/ : /Your dog is called Pepper/, card: fr ? /Pepper, le chien de la ferme/ : /Pepper, the farm dog/, label: fr ? 'Pepper · border collie' : 'Pepper · Border Collie',
  move: fr ? 'Déplacer sa niche' : 'Move his kennel', rename: fr ? 'Renommer' : 'Rename', see: fr ? 'Le voir' : 'See him', moved: fr ? /La niche de Pepper : c’est déplacé !/ : /Pepper’s kennel: moved!/ };
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// level 8, eight fields: no dog yet; the shelf says level 9
await p.evaluate(L8 => { const g = window.__farm.game(); g.data.xp = L8; g.data.lvSeen = 8; g.data.coins = 3000; g.data.land = [0, 1, 2, 3, 4, 5, 6, 7]; g.data.guide = { step: 5, done: true }; g.save(); }, xpAt(8));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
let s = await st(), a = await animals();
ok('level 8: no dog on the farm; the shelf says he comes at level 9', s.level === 8 && !s.owned && !s.dog && a && T.lvl9.test(a.text) && !a.btns.length, { s, a });
await p.evaluate(() => window.__farm.gameUI().close());
// level 9: its card
await p.evaluate(L9 => { const g = window.__farm.game(); g.data.xp = L9; g.data.land.push(8); g.save(); }, xpAt(9)); await run(1.6);
s = await st(); let t = await p.evaluate(() => document.querySelector('.gsheet').innerText);
await shot('1_level9');
ok('level 9: its card says "New to buy: Biscuit, the farm dog"', s.level === 9 && s.card === 'levelup' && T.newbuy.test(t), { s, t: t.slice(0, 400) });
await p.evaluate(() => window.__farm.gameUI().close());
a = await animals();
ok('3,000 coins: "Not enough coins yet", the button off', a.btns[0] === T.broke && a.off[0], a);
await p.evaluate(() => window.__farm.gameUI().close());
// bought: his kennel placed like a decoration
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 6000; g.save(); });
a = await animals();
await p.waitForFunction(() => { const i = document.querySelector('.gsheet [data-animal="dog"] img'); return i && i.complete; }, null, { timeout: 20000 }).catch(() => {});
await shot('2_shop');
ok('6,000 coins: "Buy and place · 4,000" (+80 XP)', T.buy.test(a.btns[0]) && !a.off[0] && /\+80 XP/.test(a.text), a);
const xp0 = (await st()).xp;
await tapBtn(a.btns[0]); await run(1);
let m = await p.evaluate(() => window.__farm.deco.state());
if (!m.ok) { const sp = await p.evaluate(() => { const f = window.__farm; return f.deco.free('kennel', f.view.target.x, f.view.target.z); }); if (sp) { await p.evaluate(sp => window.__farm.deco.to(sp.x, sp.z), sp); await run(0.3); } m = await p.evaluate(() => window.__farm.deco.state()); }
await shot('3_place');
ok('his kennel to place: the bar, a good spot (not paid for yet)', m.on === 'kennel' && m.ok && (await st()).coins === 6000, m);
await p.tap('.gmove-go'); await run(1.6);
await p.waitForFunction(() => !document.getElementById('dogname').hidden, null, { timeout: 8000 }).catch(() => {});
s = await st();
const at = await p.evaluate(() => { const f = window.__farm, D = f.dog(), k = f.game().kennel(), nav = f.nav(), [lx, lz] = D.local(D.dog.pos.x, D.dog.pos.z);
  return { front: lx > 0.6 && lx < 2.2, blockedKennel: !nav.freeAt(k.x, k.z), item: f.deco.items().some(i => i.id === 'kennel' && i.shown) }; });
await shot('4_bought');
ok('put down: 4,000 coins, +80 XP; the dog out in front of his kennel (on the grid with his bowls); the message; the card for his name', s.owned && s.coins === 2000 && s.xp - xp0 === 80 && s.dog && at.front && at.blockedKennel && at.item && !s.move && T.came.test(s.hint) && s.form, { s, at });
// his name
await p.fill('#dogname-in', 'Pepper'); await p.tap('#dogname-save'); await run(0.4);
s = await st(); const tagT = await p.evaluate(() => document.getElementById('tag').textContent);
await shot('5_named');
ok('named Pepper: the message, his label, the board over his door, the save', T.named.test(tagT) && s.name === 'Pepper' && s.label === T.label && s.board === 'Pepper' && !s.form, { s, tagT });
a = await animals();
ok('the shelf: "Pepper, the farm dog", See him, Move his kennel, Rename', T.card.test(a.text) && a.btns.join('|') === [T.see, T.move, T.rename].join('|'), a);
await p.evaluate(() => window.__farm.gameUI().close());
// his day
let r = await run(240, 1 / 15);
ok('four minutes of his day: never into anything outside his own kennel, several things done', r.n > 400 && r.blocked === 0 && Object.keys(r.did).length >= 2, r);
// his kennel moved
const k0 = (await st()).kennel;
a = await animals(); await tapBtn(T.move); await run(0.6);
const sp2 = await p.evaluate(k0 => { const f = window.__farm; for (const [dx, dz] of [[4, 0], [0, 4], [-4, 0], [0, -4], [5, 5], [-5, -5]]) { const sp = f.deco.free('kennel', k0[0] + dx, k0[1] + dz); if (sp && Math.hypot(sp.x - k0[0], sp.z - k0[1]) > 2) return sp; } return null; }, k0);
if (sp2) { await p.evaluate(sp => window.__farm.deco.to(sp.x, sp.z), sp2); await run(0.3); }
m = await p.evaluate(() => window.__farm.deco.state());
await p.tap('.gmove-go'); await run(1.2);
s = await st();
const back = await p.evaluate(() => { const f = window.__farm, D = f.dog(), [lx, lz] = D.local(D.dog.pos.x, D.dog.pos.z); return { lx: +lx.toFixed(2), lz: +lz.toFixed(2), k: [D.k.x, D.k.z] }; });
ok('his kennel moved: the save, the dog back at it, the message', !!sp2 && m.ok && s.kennel[0] === sp2.x && s.kennel[1] === sp2.z && back.k[0] === sp2.x && back.lx > 0.6 && back.lx < 2.2 && T.moved.test(s.hint), { sp2, m, s, back });
// a tap on the kennel: the Animals shelf
const ks = await p.evaluate(() => { const f = window.__farm, k = f.game().kennel(); f.dog().reset(); f.dog().update(1 / 30, 12); f.lookAt(k.x, k.z, 2.4); f.step(1 / 30, 2); f.draw(); return f.screenOf(k.x, k.z, 0.55); });
await p.touchscreen.tap(ks.x, ks.y); await run(0.4);
const shelf = await p.evaluate(() => ({ kind: window.__farm.gameUI().kind, dog: !!document.querySelector('.gsheet [data-animal="dog"]'), on: (document.querySelector('.gshop-tabs .gchip.on') || {}).dataset }));
ok('a tap on his kennel: the Animals shelf', shelf.kind === 'shop' && shelf.dog && shelf.on && shelf.on.tab === 'animals', shelf);
await p.evaluate(() => window.__farm.gameUI().close());
// a reload keeps him
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a reload: Pepper and his kennel as they were, not flagged', s.owned && s.dog && s.name === 'Pepper' && s.board === 'Pepper' && s.kennel[0] === sp2.x && !s.edited, s);
// night
await p.evaluate(() => window.__farm.setHour(22.2));
r = await run(150, 1 / 15);
const night = await p.evaluate(() => { const D = window.__farm.dog(), [lx, lz] = D.local(D.dog.pos.x, D.dog.pos.z); return { asleep: D.asleep, inKennel: lx > -0.62 && lx < 0.62 && Math.abs(lz) < 0.5 }; });
if (SHOTS) { await p.evaluate(() => { const f = window.__farm, k = f.game().kennel(); f.lookAt(k.x, k.z, 2.0); f.step(1 / 30, 3); }); await p.waitForTimeout(300); }
await shot('6_night');
ok('at night: asleep in his kennel, never into anything on the way', night.asleep && night.inKennel && r.blocked === 0, { night, r });
// saves changed outside
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.animals.dog.name = '<b>Rex</b>'; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a save changed outside (a name with < >): checked (the name cleaned) and flagged', s.edited && s.owned && s.name === 'bRex/b' && s.board === 'bRex/b', s);
await p.evaluate(L8 => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')); raw.d.xp = L8; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); }, xpAt(8) + 10);
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a save changed outside (the dog before level 9): checked and flagged, no dog', s.edited && !s.owned && !s.dog, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

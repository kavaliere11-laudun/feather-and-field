// The Christmas dress in the game (release 4, seasonal): ./withserver.sh node dresstest.mjs [OUT]   (LANG=fr; W, H: the
// screen, e.g. W=874 H=402; PORT)
// A fresh farm on a fake clock on 5 December: the shop's Seasons shelf has the Christmas dress (1,500 coins); not enough
// coins: says so, the button off; coins given: bought from the shelf (paid, +30 XP, a hint), "yours for good". Its coop's
// card: "Put on the Christmas dress"; tapped: the coop dressed there and then (the garland on its fence, the tree in its
// pen, the star on its roof, the fairy lights on its eave), its birds free to walk and none in the tree; a picture; in a bigger look (Cosy) its dress follows; a reload keeps it, unflagged; its card: "Take off", the
// dress gone; on again. In July (out of its season): kept (still on), the shelf says it's yours; a farm without it: the
// shelf says when it's on sale, no button. No page errors. Pictures in OUT (dress_*.png).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/dresstest', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
const T0 = new Date('2026-12-05T11:00:00+00:00').getTime();
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
const state = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; return { coins: g.data.coins, xp: g.data.xp, dresses: (g.data.dresses || []).join(), dress: c.dress || null, tier: c.tier, edited: g.edited, parts: f.coopParts(0) }; });
const sheet = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return null; const d = s.querySelector('.gdress'), bt = d && d.querySelector('.gbtn'), cb = s.querySelector('button[data-dress]');
  return { kind: window.__farm.gameUI().kind, text: s.innerText, dress: d ? d.innerText : null, btn: bt ? bt.textContent : null, dis: bt ? bt.disabled : null, coopBtn: cb ? cb.textContent : null }; });
const out = async () => { for (let i = 0; i < 90; i++) { if (!(await p.evaluate(() => { const f = window.__farm, id = f.game().data.coops[0].id; return !!f.coopPlots().find(q => q.gc && q.gc.id === id).farmer; }))) return; await run(1); } };
const shoot = async (n, night) => {
  await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); const [x, z] = f.coopAt(0); f.lookAt(x, z, 2.4); f.step(1 / 30, 2); f.draw(); });
  await p.addStyleTag({ content: '#hint { opacity: 0.0001 !important; }' }).catch(() => {});
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/dress_${n}${fr ? '_fr' : ''}${W > H ? '_side' : ''}.png`, timeout: 180000 });
  await p.addStyleTag({ content: '#hint { opacity: 1 !important; }' }).catch(() => {});
};
const birdsOk = () => p.evaluate(() => { const f = window.__farm, P = f.coopPlots().find(q => q.gc && q.gc.id === f.game().data.coops[0].id), tree = P.pen.obstacles.find(o => o[3] > 0.15 && o[3] < 0.32 && P.dress);
  const ok = P.birds.filter(b => b.root.visible && !b.busy()).every(b => b.free(b.root.position.x, b.root.position.z) && (!tree || Math.hypot(b.root.position.x - tree[0], b.root.position.z - tree[2]) > tree[3] - 0.02));
  return { ok, tree: !!tree, n: P.birds.length }; });
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.coins = 1000; g.save(); f.gameUI().close(); });
// the shop's Seasons shelf
await p.evaluate(() => window.__farm.shopSheet('seasons')); await run(0.2);
let sh = await sheet();
ok('the shop: a Seasons shelf with the Christmas dress, 1,500 coins; not enough coins: says so, the button off', sh && sh.kind === 'shop' && (fr ? /Saisons/ : /Seasons/).test(sh.text) && (fr ? /Parure de Noël/ : /Christmas dress/).test(sh.dress) && /1\D?500/.test(sh.dress) && sh.dis === true && (fr ? /assez de pièces/ : /Not enough/).test(sh.btn), sh);
await p.evaluate(() => { const g = window.__farm.game(); g.data.coins = 5000; g.save(); window.__farm.shopSheet('seasons'); }); await run(0.2);
sh = await sheet();
ok('coins enough: Buy · 1,500', sh && sh.dis === false && (fr ? /Acheter/ : /Buy/).test(sh.btn), sh);
let s0 = await state();
await p.tap('.gdress .gbtn'); await run(0.3);
let s = await state(), hintT = await p.evaluate(() => document.getElementById('hint').textContent);
ok('bought: 1,500 paid, +30 XP, a hint to dress a coop, the sheet closed', s.coins === s0.coins - 1500 && s.xp === s0.xp + 30 && s.dresses === 'xmas' && !s.dress && (fr ? /parure de Noël est à vous/ : /Christmas dress is yours/).test(hintT), { s, hintT });
await p.evaluate(() => window.__farm.shopSheet('seasons')); await run(0.2);
sh = await sheet();
ok('the shelf: yours for good, no button', sh && (fr ? /À vous pour toujours/ : /Yours for good/).test(sh.dress) && sh.btn === null, sh);
// its coop's card: put it on
await out();
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.coopCard(0); }); await run(0.2);
sh = await sheet();
ok('its coop\'s card: "Put on the Christmas dress"', sh && sh.kind === 'coop' && (fr ? /Mettre la parure de Noël/ : /Put on the Christmas dress/).test(sh.coopBtn), sh);
await p.tap('.gsheet button[data-dress]'); await run(0.3);
s = await state(); hintT = await p.evaluate(() => document.getElementById('hint').textContent);
ok('dressed there and then: the garland on its fence, the tree in its pen, the star on its roof, the fairy lights; a hint', s.dress === 'xmas' && ['xmas_fence_t0', 'xmas_tree', 'xmas_star', 'xmas_lights:box_rir'].every(n => s.parts.includes(n)) && (fr ? /Joyeux Noël/ : /Merry Christmas/).test(hintT), { s, hintT });
await run(8);
let bd = await birdsOk();
ok('its birds free to walk, none in the tree', bd.ok && bd.tree, bd);
await shoot('day');
// a bigger look: the dress follows (its pen's garland, a tree where there's room, its roof's lights)
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.coops[0].tier = 3; g.save(); f.retier(0); }); await run(1);
s = await state();
ok('in its Cosy look the dress follows: the Cosy pen\'s garland, the tree, the star, the Cosy barn\'s lights', ['xmas_fence_t3', 'xmas_tree', 'xmas_star', 'xmas_lights:cosy_rir'].every(n => s.parts.includes(n)), s.parts);
bd = await birdsOk(); ok('its birds free to walk there too', bd.ok && bd.tree, bd);
await shoot('cosy');
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.coops[0].tier = 0; g.save(); f.retier(0); }); await run(1);
// a reload
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
s = await state();
ok('a reload: dressed still, unflagged', s.dress === 'xmas' && s.dresses === 'xmas' && !s.edited && s.parts.includes('xmas_tree'), s);
// off, and on again
await out();
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.coopCard(0); }); await run(0.2);
sh = await sheet();
ok('its card: it wears the dress, "Take off the Christmas dress"', sh && (fr ? /Il porte la parure de Noël/ : /It wears the Christmas dress/).test(sh.text) && (fr ? /Retirer la parure de Noël/ : /Take off the Christmas dress/).test(sh.coopBtn), sh);
await p.tap('.gsheet button[data-dress]'); await run(0.3);
s = await state();
ok('taken off: its everyday look again', !s.dress && !s.parts.some(n => n.startsWith('xmas')), s);
await p.evaluate(() => window.__farm.dressCoop(0, 'xmas')); await run(0.3);
s = await state(); ok('on again', s.dress === 'xmas' && s.parts.includes('xmas_star'), s);
// out of its season
await p.evaluate(() => { window.__T = new Date('2027-07-01T11:00:00+01:00').getTime(); sessionStorage.setItem('__T', window.__T); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
s = await state();
ok('July: kept, still on, unflagged', s.dress === 'xmas' && s.dresses === 'xmas' && !s.edited, s);
await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.shopSheet('seasons'); }); await run(0.2);
sh = await sheet(); ok('the shelf: yours for good', sh && (fr ? /À vous pour toujours/ : /Yours for good/).test(sh.dress), sh);
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.dressCoop(g.data.coops[0].id, null); g.data.dresses = []; g.save(); f.retier(0); f.gameUI().close(); f.shopSheet('seasons'); }); await run(0.2);
sh = await sheet();
ok('a farm without it, out of season: when it\'s on sale, no button', sh && (fr ? /En vente du 1er décembre au 6 janvier/ : /On sale from 1 December to 6 January/).test(sh.dress) && sh.btn === null, sh);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

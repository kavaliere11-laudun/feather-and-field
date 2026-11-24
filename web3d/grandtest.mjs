// The grand decorations (24 Nov 2026, Audrey: "Grand decorations (Recommended)", one for each level from 41 to 49, each
// "Yes, put it in (Recommended)" once its picture's seen): node grandtest.mjs   (LANG=fr; W, H: the screen, sideways
// 874x402 by default; SHOTS=folder for pictures; ONLY=fountain,rose_arbour: just those)
// For each, in level order on one farm: the level before, its tile in the shop greyed with its level; at its level, its
// picture, price and button; its page in 3D (the view still); bought and put down: its coins and XP (a fiftieth), on the
// farm, in everyone's way; its life by day (the fountain: its water moving, birds drinking at its rim, drops where the
// water falls in; the Rose Arbour: butterflies on its roses, petals drifting down). A reload: all where they were. A save
// changed outside to have them before their level: flagged, not kept. The orchard's apple thief: a Glutton hen in it, tapped
// she runs out of its gate, the farmer runs after her, catches her and carries her home. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-10-26T10:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
const run = (secs) => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, secs);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await p.waitForTimeout(2500); await run(0.5);
};
const shot = async name => { if (SHOTS) { await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/grand_${fr ? 'fr' : 'en'}_${name}.png`, timeout: 180000 }); } };
const money = () => p.evaluate(() => { const g = window.__farm.game(); return { coins: g.data.coins, xp: g.data.xp, decor: JSON.parse(JSON.stringify(g.data.decor || [])) }; });
const setLevel = (L, coins) => p.evaluate(([L, coins]) => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.xp = f.xpFor(L) + 5; g.data.lvSeen = L; g.data.coins = coins; g.save(); }, [L, coins]);
const openTab = async k => { await p.evaluate(k => { const f = window.__farm; f.gameUI().close(); f.deco.shop(); const t = document.querySelector(`.gsheet:not([hidden]) .gchip[data-tab="${k}"]`); if (t) t.click(); }, k); await p.waitForTimeout(500); };
const tile = id => p.evaluate(id => { const c = document.querySelector(`.gsheet:not([hidden]) .gpage[data-decor="${id}"]`); if (!c) return null; const im = c.querySelector('img');
  return { text: c.innerText.replace(/\s+/g, ' '), btn: !!c.querySelector('.gbtn:not([disabled])'), pic: !!(im && im.complete && im.naturalWidth > 0) }; }, id);

const ALL = {
  fountain: { level: 41, price: 40000, name: fr ? /Fontaine à l’œuf d’or/ : /Golden Egg Fountain/, words: fr ? /boire/ : /drink/,
    life: L => L && L.fountain && L.fountain.some(x => x === 'rim') && L.drops > 0, lifeSays: 'its water moving, little birds drinking at its rim, drops where the water falls in' },
  rose_arbour: { level: 42, price: 45000, name: fr ? /Tonnelle de roses/ : /Rose Arbour/, words: fr ? /pétales/ : /Petals/,
    life: L => L && L.arbour > 0 && L.petals > 0, lifeSays: 'butterflies on its roses, petals drifting down' },
  dovecote: { level: 43, price: 52000, name: fr ? /Pigeonnier/ : /Dovecote/, words: fr ? /colombes/ : /doves/,
    life: L => L && L.doves && L.doves.some(x => x === 'circle'), lifeSays: 'its doves off round it' },
  tractor: { level: 44, price: 60000, name: fr ? /Tracteur rouge/ : /Red Tractor/, words: fr ? /fumée/ : /smoke/,
    life: L => L && L.tractor && L.tractor.on && L.smoke > 0, lifeSays: 'its engine puttering, puffs of smoke' },
  orchard: { level: 45, price: 70000, name: fr ? /Petit verger/ : /Little Orchard/, words: fr ? /merle/ : /blackbird/,
    life: L => L && L.orchard && L.orchard.apples > 0 && L.orchard.bird !== 'away', lifeSays: 'apples dropping, the blackbird about' },
  tree_house: { level: 46, price: 80000, name: fr ? /Cabane dans l’arbre/ : /Tree House/, words: fr ? /écureuil/ : /squirrel/,
    life: L => L && L.squirrel && L.squirrel !== 'away', lifeSays: 'its squirrel out, its swing swaying' },
  hot_air_balloon: { level: 47, price: 92000, name: fr ? /Montgolfière/ : /Hot-Air Balloon/, words: fr ? /brûleur/ : /burner/,
    life: L => L && L.balloon && L.balloon.flame, lifeSays: 'bobbing on its ropes, its pennant fluttering, its burner puffing a flame' },
  clock_tower: { level: 48, price: 105000, name: fr ? /Tour de l’horloge/ : /Clock Tower/, words: fr ? /cloche/ : /bell/,
    life: () => true, lifeSays: 'its hands at the farm\'s time, its bell swinging on the hour' },
  topiary_garden: { level: 49, price: 120000, name: fr ? /Jardin de topiaires/ : /Topiary Garden/, words: fr ? /buis/ : /box/,
    life: L => L && L.topiary && L.topiary.flies > 0 && L.topiary.birds.some(b => b !== 'away'), lifeSays: 'butterflies about it, a little bird on its hedge' },
};
const IDS = process.env.ONLY ? process.env.ONLY.split(',') : Object.keys(ALL);
const fmt = n => new RegExp(String(Math.floor(n / 1000)) + '\\D?' + String(n % 1000).padStart(3, '0'));
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
// (a farm of these levels: its land bought, room for all five)
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = f.xpFor(40) + 5; g.data.lvSeen = 40; g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.land = [0, 1, 2, 3, 4, 5, 6, 7]; g.save(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
const placed = {};
for (const id of IDS) {
  const G = ALL[id];
  // the level before: greyed, its level
  await setLevel(G.level - 1, G.price + 10000); await openTab('decor');
  await p.waitForFunction(id => { const i = document.querySelector(`.gpage[data-decor="${id}"] img`); return i && i.complete; }, id, { timeout: 30000 }).catch(() => {});
  let t = await tile(id);
  ok(`${id}, level ${G.level - 1}: on the decorations shelf, its picture, "level ${G.level}", no button`, t && G.name.test(t.text) && new RegExp(String(G.level)).test(t.text) && !t.btn && t.pic, t);
  // its level: its price and button; its page in 3D
  await setLevel(G.level, G.price + 10000); await openTab('decor');
  await p.waitForFunction(id => { const i = document.querySelector(`.gpage[data-decor="${id}"] img`); return i && i.complete; }, id, { timeout: 30000 }).catch(() => {});
  t = await tile(id);
  ok(`${id}, level ${G.level}: its price and its button`, t && fmt(G.price).test(t.text) && t.btn && t.pic, t);
  await shot(id + '_1_shelf');
  await p.evaluate(id => document.querySelector(`.gsheet:not([hidden]) .gpage[data-decor="${id}"] .gcard-t`).click(), id);
  await p.waitForFunction(() => { const v = window.__farm.gameUI().preview; return v && v.state().frames > 0; }, null, { timeout: 90000 }).catch(() => {});
  const pv0 = await p.evaluate(() => { const v = window.__farm.gameUI().preview; return v ? v.state() : null; });
  await p.waitForTimeout(2500);
  const pg = await p.evaluate(() => { const S = document.querySelector('.gsheet:not([hidden])'), v = window.__farm.gameUI().preview; return { pv: v ? v.state() : null, name: (S.querySelector('.gprev-n') || {}).textContent || '', words: (S.querySelector('.gprev-l') || {}).textContent || '', btn: (S.querySelector('.gprev-b .gbtn') || {}).textContent || '' }; });
  ok(`${id}: its page in 3D (${id === 'fountain' ? 'its water moving, ' : ''}the view still), its name, its words, its button`, pv0 && pg.pv && pg.pv.frames > 0 && (id !== 'fountain' || (pg.pv.live && pg.pv.frames > pv0.frames)) && pg.pv.yaw === pv0.yaw && pg.pv.zoom === pv0.zoom
    && G.name.test(pg.name) && G.words.test(pg.words) && fmt(G.price).test(pg.btn), { pv0, pg });
  await shot(id + '_2_page');
  // bought and put down
  const m0 = await money();
  await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gprev-b .gbtn').click()); await run(0.5);
  const s = await p.evaluate(() => window.__farm.deco.state());
  ok(`${id}: Buy and place: near the view to put down, nothing paid yet`, s.on === id && (await money()).coins === m0.coins, s);
  if (!s.ok) { const f = await p.evaluate(id => { const f = window.__farm, v = f.view.target; return f.deco.free(id, v.x, v.z); }, id); if (f) await p.evaluate(([x, z]) => window.__farm.deco.to(x, z), [f.x, f.z]); await run(0.3); }
  await p.evaluate(() => document.querySelector('.gmove-go').click()); await run(1.5);
  const m = await money(), at = m.decor.find(d => d.id === id); placed[id] = at;
  const water = id === 'fountain' ? await p.evaluate(() => window.__farm.deco.fountainWater()) : ['fountain_pool', 'fountain_fall'];
  const blocked = at && await p.evaluate(([x, z]) => window.__farm.deco.blocked(x, z), [at.x, at.z]);
  ok(`${id}: Put it here: ${G.price} coins and +${G.price / 50} XP, on the farm${id === 'fountain' ? ' with its water' : ''}, in everyone's way`,
    m.coins === m0.coins - G.price && m.xp === m0.xp + G.price / 50 && at && water.includes('fountain_pool') && water.includes('fountain_fall') && blocked, { m: { coins: m.coins, xp: m.xp, c0: m0.coins, x0: m0.xp }, at, water, blocked });
  // its life by day
  await p.evaluate(([x, z]) => window.__farm.focus(x, z, 2.4), [at.x, at.z]);
  const ft0 = await p.evaluate(() => window.__farm.deco.fountainT()); await run(0.2);
  const ft1 = await p.evaluate(() => window.__farm.deco.fountainT());
  let seen = false, L = null;
  const fine = id === 'hot_air_balloon' || id === 'topiary_garden';      // (its flame lasts a second or so: looked for often)
  for (let k = 0; k < (fine ? 110 : 16) && !seen; k++) { await run(fine ? 0.5 : 3); L = await p.evaluate(() => window.__farm.deco.life()); seen = G.life(L); }
  const sw0 = await p.evaluate(() => window.__farm.deco.swing()); await run(0.4); const sw1 = await p.evaluate(() => window.__farm.deco.swing());
  const bb0 = await p.evaluate(() => window.__farm.deco.balloon()); await run(0.4); const bb1 = await p.evaluate(() => window.__farm.deco.balloon());
  let ck = null; if (id === 'clock_tower') { const c0 = await p.evaluate(() => window.__farm.deco.clock()); await p.evaluate(() => window.__farm.deco.ring()); let c1 = null, sw = 0; for (let k = 0; k < 8; k++) { await run(0.15); c1 = await p.evaluate(() => window.__farm.deco.clock()); sw = Math.max(sw, Math.abs(c1.bell)); } const want = -((c0.hour % 12) / 12) * Math.PI * 2, wantM = -(c0.hour % 1) * Math.PI * 2; ck = { c0, c1, ok: Math.abs(c0.hr - want) < 0.01 && Math.abs(c0.mn - wantM) < 0.01 && sw > 0.2, sw }; }
  ok(`${id}: by day ${G.lifeSays}`, seen && (id !== 'clock_tower' || ck.ok) && (id !== 'fountain' || ft1 > ft0) && (id !== 'tree_house' || (sw0 !== null && sw0 !== sw1)) && (id !== 'hot_air_balloon' || (bb0 && bb1 && bb0.y !== bb1.y && bb0.flag !== bb1.flag)), { ft0, ft1, L, sw0, sw1, bb0, bb1, ck });
  await shot(id + '_3_farm');
  if (id === 'orchard') {      // (Audrey: "the glouton chickens would go in and try to steal apples and the farmer can run after them")
    const hen = await p.evaluate(() => { const g = window.__farm.game(), b = g.data.birds.find(x => x.sex === 'h' && g.coop(x.coop)); b.pers = 'glutton'; g.data.moment = null; g.data.moments = { last: 0, hen: 1 }; g.save(); return { id: b.id, name: b.name, coins: g.data.coins }; });
    await run(0.5);
    const m = await p.evaluate(id => { const f = window.__farm; return f.moment.orchard(id); }, hen.id); await run(0.5);
    const th = await p.evaluate(([x, z]) => { const f = window.__farm, b = f.moment.bird(); return { b, pill: f.moment.pill(), bub: f.moment.bub(), d: b ? Math.hypot(b.at[0] - x, b.at[1] - z) : null }; }, [at.x, at.z]);
    ok('the orchard\'s apple thief: a Glutton hen in the orchard under an apple tree, "🍎 Apple thief!" beside the coins, "🍎 her name" over her', m && m.o === 1 && th.b && th.b.orchard && th.d < 1.6 && (fr ? /Voleuse de pommes/ : /Apple thief/).test(th.pill || '') && /🍎/.test(th.bub || '') && th.bub.includes(hen.name), { m, th });
    let up = 0; for (let k = 0; k < 24; k++) { await run(0.25); const y = await p.evaluate(() => { const b = window.__farm.moment.bird(); return b ? b.y : 0; }); up = Math.max(up, y); }
    ok('…pecking at the fallen apples, leaping up at the low ones', up > 0.15, { up });
    await shot(id + '_4_thief');
    const tapped = await p.evaluate(() => window.__farm.moment.tap()); await run(1.2);
    const fl = await p.evaluate(() => window.__farm.moment.bird());
    await run(2.5);
    const out = await p.evaluate(([x, z]) => { const f = window.__farm, b = f.moment.bird(); const L = f.farmer(); return { b, seq: f.moment.seq(), d: b ? Math.hypot(b.at[0] - x, b.at[1] - z) : null, coins: f.game().data.coins, m: f.game().data.moment, farmer: L && { home: L.home, running: L.running, task: L.task && L.task.name, pos: [L.pos.x, L.pos.z] } }; }, [at.x, at.z]);
    ok('tapped: off she runs out of its gate (or over its fence where he can get to her), the farmer running after her; paid', tapped && fl && fl.flee && out.b && !out.b.flee && out.d > 2.1 && out.seq && out.coins > hen.coins && !out.m, { fl, out });
    await shot(id + '_5_chase');
    let home = null, dodged = false; for (let k = 0; k < 40 && !home; k++) { await run(1); const h = await p.evaluate(id => { const f = window.__farm, b = f.moment.bird(); return { d: !!(b && b.dodged), home: !b && f.coopPlots().some(P => P.birds.some(x => x.gid === id)) }; }, hen.id); dodged = dodged || h.d; home = h.home || null; }
    ok('…he runs up to her, she darts off again ("Come back here!"), he catches her and carries her home', !!home && dodged, { home, dodged });
  }
}
// a reload: all still there
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const after = await p.evaluate(() => ({ items: window.__farm.deco.items(), water: window.__farm.deco.fountainWater(), flag: window.__farm.game().edited }));
ok('a reload: each where it was (the fountain with its water), nothing flagged', IDS.every(id => after.items.some(i => i.id === id && i.at[0] === placed[id].x && i.at[1] === placed[id].z)) && (!IDS.includes('fountain') || after.water.length === 2) && !after.flag, after);
// a save that has them before their level: checked
await p.evaluate(() => { const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d; d.xp = window.__farm.xpFor(30) + 5; localStorage.setItem('ff3d.farm', JSON.stringify(raw)); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const chk = await p.evaluate(ids => { const g = window.__farm.game(); return { edited: g.edited, has: g.data.decor.filter(x => ids.includes(x.id)).map(x => x.id), items: window.__farm.deco.items().filter(i => ids.includes(i.id)).length }; }, IDS);
ok('a save changed outside to have them before their level: checked and flagged, not kept', chk.edited && !chk.has.length && !chk.items, chk);
ok('no page errors', errs.length === 0, errs.slice(0, 3));
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);

// A play-through of a new farm, the way a keen player would play it (7 Nov 2026, Audrey's choice after the vegetable
// garden: "Play-through"): ./withserver.sh node playthrough.mjs OUT   (LANG=fr; W, H: the screen (sideways 874 x 402);
// PORT; UNTIL: the level to stop at (10); DAYS: at most (16))
// From the story and the welcome, through the first day's guide, then a visit at 19:00 and two a day after (8:00, 19:00),
// the app opened afresh each time. At each visit, through the game's own buttons and cards: whatever card opens first
// (while you were away, a new level, a hatch...), the golden egg, the eggs, the village orders, a cuddle and the worms for
// each bird, the feeders, the wheat, the vegetable garden and a treat for each coop, the jobs, the next field, a new breed's
// coop, and a little fishing in the morning. Writes OUT/log.txt (every card's and every word's text, with the day, the
// time, the level and the coins) and a picture of each kind of card the first time it opens, each level's card, and the
// new things the first time they're seen (OUT/NNN_*.png). Ends with how far it got and any page errors. Since the second
// play-through (8 Nov 2026) it spends as a keen player would too (SHOP=0: not): the coops' next looks, the geese once the
// fox has called, the decorations, the farmer's outfits, the dog; the shows each day; the honey; the doors shut at night.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/playthrough', LANG = process.env.LANG || 'en', W = +(process.env.W || 874), H = +(process.env.H || 402);
const UNTIL = +(process.env.UNTIL || 10), DAYS = +(process.env.DAYS || 16);
// (10 Nov 2026, Audrey: "create 3 personas players that you will use to play the game": the same play-through as another
// kind of player. VISITS: the hours of the visits each day ("8,19"); CASTS: casts at most a visit (2), at any hour with
// ANYHOUR=1; HIT: how often a tap lands in the green (1); TIN=1: a tin of worms bought each day; KEEPFISH=1: fish kept for
// the orders; CARE=0: no cuddles; SEED: the dice)
const VISITS = (process.env.VISITS || '8,19').split(',').map(Number), CASTS = +(process.env.CASTS ?? 2), HIT = +(process.env.HIT ?? 1), TIN = process.env.TIN === '1', ANYHOUR = process.env.ANYHOUR === '1', KEEPFISH = process.env.KEEPFISH === '1';
let seed = +(process.env.SEED || 7); const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
fs.mkdirSync(OUT, { recursive: true });
const LOC = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-BR' }[LANG];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: LOC, timezoneId: 'Europe/London', deviceScaleFactor: 2 });
const T0 = new Date('2026-11-09T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
const log = [], seen = new Set(); let pic = 0, lastHint = '';
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0&lang=${LANG}&story`;
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); }, s);      // (no drawing: the test browser draws slowly; a frame is drawn just for each picture)
const state = () => p.evaluate(() => { const f = window.__farm, g = f && f.game(), d = new Date(window.__T); if (!g || !g.data) return { day: 0, hm: '--:--', level: 0, coins: 0, xp: 0 }; return { day: Math.floor((window.__T - new Date('2026-11-09T00:00:00Z').getTime()) / 86400e3), hm: String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'), level: g.level, coins: g.data.coins, xp: g.data.xp }; });
const note = async (kind, text) => { const s = await state(); const line = `d${s.day} ${s.hm} L${s.level} ${s.coins}c ${s.xp}xp · ${kind}: ${String(text).replace(/\s*\n\s*/g, ' | ').slice(0, 900)}`; log.push(line); console.log(line); fs.writeFileSync(`${OUT}/log.txt`, log.join('\n') + '\n'); };
const shoot = async name => { await p.evaluate(() => { document.getAnimations().forEach(a => a.finish()); window.__farm.draw(); }).catch(() => {}); await p.waitForTimeout(250); const n = String(++pic).padStart(3, '0'); await p.screenshot({ path: `${OUT}/${n}_${name}.png`, timeout: 120000 }).catch(e => console.log('(picture skipped: ' + e.message.split('\n')[0] + ')')); };
const once = async (key, name) => { if (seen.has(key)) return; seen.add(key); await shoot(name); };
const hintNow = async () => { const h = await p.evaluate(() => { const e = document.getElementById('hint'); return e && e.classList.contains('on') ? e.textContent : ''; }); if (h && h !== lastHint) { lastHint = h; await note('word', h); } return h; };
const cardNow = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); return s ? { kind: window.__farm.gameUI().kind, text: s.innerText } : null; });
const click = sel => p.evaluate(sel => { const e = document.querySelector(sel); if (!e || e.disabled) return false; e.click(); return true; }, sel);
const NEWS = /^(levelup|congrats|showres|showday|rare|fox|away|chick|notesask|acctask)$/;
let inCards = false;
const act = async (secs = 1.5) => { await run(secs); await hintNow(); if (!inCards) { const c = await cardNow(); if (c && NEWS.test(c.kind)) await cards('popped up'); } };      // (a card that opens by itself mid-visit, a new level's: noted and dealt with, not closed unseen)
const safe = async (what, f) => { try { await f(); } catch (e) { await note('ERROR in ' + what, e.message.split('\n')[0]); } };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 300000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(1.5);
};
// whatever cards are open: each noted (its first time pictured; each new level's), then dealt with as a player would
const cards = async (where) => { inCards = true; try { await cards1(where); } finally { inCards = false; } };
const cards1 = async (where) => {
  for (let k = 0; k < 12; k++) {
    await run(0.6);
    const c = await cardNow(); if (!c) return;
    await note('card ' + c.kind, c.text);
    if (c.kind === 'levelup') { const s = await state(); await shoot('level' + s.level); }
    else await once('card:' + c.kind, 'card_' + c.kind);
    if (c.kind === 'away' && await click('.gsheet .gbtn:not(.galt)')) { await act(2); continue; }      // ("Collect all eggs")
    if (c.kind === 'levelup' && await p.evaluate(() => [...document.querySelectorAll('.gsheet .gbtn')].some(e => !e.classList.contains('galt') && e.offsetParent))) {
      const placed = await placeCoop(); if (placed) continue;
    }
    if (/^(congrats|news|showres|rare|grown)$/.test(c.kind) && await click('.gsheet .gbtn:not(.galt)')) { await act(1); continue; }
    if (c.kind === 'showday' && await click('.gsheet .gbtn.galt')) { await act(1); continue; }      // ("Just the results")
    if (/^gintro|^intro|welcome|story/.test(c.kind)) { await click('.gsheet .gbtn:not(.galt)'); await act(0.4); continue; }
    await p.evaluate(() => window.__farm.gameUI().close()); await act(0.5);
  }
};
// a new breed's coop: "Place their coop now", then put it where the farm offers
const placeCoop = async () => {
  const has = await p.evaluate(() => { const b = [...document.querySelectorAll('.gsheet .gbtn')].find(e => !e.classList.contains('galt') && /coop|poulailler|Stall|gallinero|pollaio|galinheiro/i.test(e.textContent)); if (!b) return false; b.click(); return true; });
  if (!has) return false;
  await act(1.5);
  await once('move', 'placing_coop');
  for (let k = 0; k < 6 && !(await p.evaluate(() => window.__farm.move.state().ok)); k++) await p.evaluate(k => { const f = window.__farm, M = f.move.state(); f.move.to(M.at.x + (k % 2 ? -3 : 3), M.at.z + (k > 2 ? 3 : -3)); }, k).catch(() => {});
  await click('.gmove-go'); await act(2);
  await note('placed a coop', JSON.stringify(await p.evaluate(() => window.__farm.game().data.coops.map(c => c.breed))));
  return true;
};
const look = (x, z, size = 2.6) => p.evaluate(([x, z, s]) => { const f = window.__farm; f.lookAt(x, z, s); }, [x, z, size]);
const waitFarmer = async (max = 40) => { for (let i = 0; i < max; i++) { const busy = await p.evaluate(() => { const L = window.__farm.farmer(); return !!(L && (L.pending || (L.task && /^(pen|work|order|out)$/.test(L.task.name)))); }); if (!busy) return; await act(1); } };

// ---- spending (the second play-through, 8 Nov 2026, Audrey: "Yes" to one with the shop): what to buy, in order
const SHOP = process.env.SHOP !== '0', KEEP = 150;
const coins = () => p.evaluate(() => window.__farm.game().data.coins);
const placeIt = async (what) => {      // (a decoration or the kennel being placed: put down where the farm offers, or a step aside)
  await act(1);
  for (let k = 0; k < 8 && !(await p.evaluate(() => window.__farm.deco.state().ok)); k++) await p.evaluate(k => { const f = window.__farm, M = f.deco.state(); f.deco.to(M.at.x + [3, -3, 0, 0, 4, -4, 4, -4][k], M.at.z + [0, 0, 3, -3, 4, 4, -4, -4][k]); }, k);
  const ok = await p.evaluate(() => window.__farm.deco.state().ok);
  await once('decplace:' + what, 'placing_' + what);
  if (!ok) { await note('could not place', what); await p.evaluate(() => window.__farm.deco.cancel()); await act(0.5); return false; }
  await click('.gmove-go'); await act(2);
  return true;
};
const shopTab = async (tab) => { await p.evaluate(() => window.__farm.deco.shop()); await act(0.4); if (tab !== 'decor') { await click(`.gsheet .gchip[data-tab="${tab}"]`); await act(0.3); } await once('shop:' + tab, 'shop_' + tab); };
async function spend() {
  // the coops' next looks, the cheapest first
  const ups = await p.evaluate(() => { const f = window.__farm, g = f.game(); return f.gamePlots().map((q, i) => { const n = g.coopNext(g.coop(q.gc.id)); return n ? { i, price: n.price, look: n.look } : null; }).filter(Boolean).sort((a, b) => a.price - b.price); });
  for (const u of ups) {
    if (await coins() < u.price + KEEP) break;
    await safe('upgrade', async () => {
      await waitFarmer(25);
      await p.evaluate(i => window.__farm.coopCard(i), u.i); await act(0.4); await once('card:coop', 'card_coop');
      const c = await cardNow(); if (c && !seen.has('uptext:' + u.look)) { seen.add('uptext:' + u.look); await note('card coop', c.text); }
      if (!(await click('.gsheet .gup .gbtn:not(.galt)'))) { await p.evaluate(() => window.__farm.gameUI().close()); return; }
      await act(1.5);
      const why = await p.evaluate(() => { const w = document.querySelector('.gsheet .gup-why'); return w && !w.hidden ? w.textContent : ''; });
      if (why) { await note('upgrade refused', why); await p.evaluate(() => window.__farm.gameUI().close()); return; }
      const P = await p.evaluate(i => { const q = window.__farm.gamePlots()[i].group.position; return [q.x, q.z]; }, u.i);
      await look(P[0], P[1], 2.4); await act(1); await once('look:' + u.look, 'coop_' + u.look);
    });
  }
  const g2 = () => p.evaluate(() => { const g = window.__farm.game(); return { level: g.level, fox: !!g.foxLast(), geese: g.animalNext('geese'), dog: g.animalNext('dog'), decor: ['flowers', 'birdbath', 'beehives', 'duckhouse', 'greenhouse'].filter(id => g.decorNext(id)), outfits: ['market', 'garden'].filter(id => g.outfitNext(id)) }; });
  let G = await g2();
  // the geese, once the fox has called
  if (G.geese && G.fox && await coins() >= 1200 + KEEP) await safe('geese', async () => { await shopTab('animals'); if (await click('.gsheet [data-animal="geese"] .gpage-go:not(.galt)')) { await act(3); await once('geese', 'geese_came'); } else await p.evaluate(() => window.__farm.gameUI().close()); });
  // the decorations, the cheapest first
  for (const id of (await g2()).decor) {
    const price = await p.evaluate(id => ({ flowers: 400, birdbath: 800, beehives: 1800, duckhouse: 3000, greenhouse: 6000 })[id], id);
    if (await coins() < price + KEEP) break;
    await safe('decor ' + id, async () => {
      await waitFarmer(20); await shopTab('decor');
      if (!(await click(`.gsheet [data-decor="${id}"] .gpage-go:not(.galt)`))) { await p.evaluate(() => window.__farm.gameUI().close()); return; }
      if (id === 'duckhouse') { await act(2); await once('duckhouse', 'duckhouse'); return; }      // (straight onto the pond)
      await placeIt(id);
    });
  }
  // the farmer's outfits
  for (const id of (await g2()).outfits) {
    const price = id === 'market' ? 1200 : 3500;
    if (await coins() < price + KEEP) break;
    await safe('outfit ' + id, async () => { await shopTab('outfits'); if (await click(`.gsheet [data-outfit="${id}"] .gpage-go:not(.galt)`)) { await p.waitForTimeout(2500); await act(3); const L = await p.evaluate(() => { const q = window.__farm.farmer().pos; return [q.x, q.z]; }); await look(L[0], L[1], 2.0); await act(0.5); await once('outfit:' + id, 'outfit_' + id); } else await p.evaluate(() => window.__farm.gameUI().close()); });
  }
  // the dog: his kennel placed, then his name (Biscuit, as it comes)
  G = await g2();
  if (G.dog && await coins() >= 4000 + KEEP) await safe('dog', async () => {
    await shopTab('animals');
    if (!(await click('.gsheet [data-animal="dog"] .gpage-go:not(.galt)'))) { await p.evaluate(() => window.__farm.gameUI().close()); return; }
    if (!(await placeIt('kennel'))) return;
    await p.waitForTimeout(2200); await act(0.5);
    if (await p.evaluate(() => !document.getElementById('dogname').hidden)) { await once('dogname', 'dog_name'); await note('dog name', await p.evaluate(() => document.getElementById('dogname').innerText)); await click('#dogname-save'); await act(1); }
    const D = await p.evaluate(() => { const d = window.__farm.dog(); return d && d.dog ? [d.dog.pos.x, d.dog.pos.z] : null; }); if (D) { await look(D[0], D[1], 2.2); await act(1); await once('dog', 'dog_came'); }
  });
}
const enterShows = async () => {
  await p.evaluate(() => window.__farm.showsSheet()); await act(0.4); await once('card:shows', 'card_shows');
  const c = await cardNow(); if (c && !seen.has('stext')) { seen.add('stext'); await note('card shows', c.text); }
  for (let k = 0; k < 3; k++) {
    const r = await p.evaluate(() => { for (const c of document.querySelectorAll('.gsheet .gshow')) { const b = [...c.children].find(x => x.matches('button.gbtn') && !x.disabled); if (b && (!b.classList.contains('galt') || c.dataset.show[0] === 'v')) { const t = b.textContent; b.click(); return t; } } return null; });
    if (!r) break; await act(0.5);
  }
  if (await cardNow()) await p.evaluate(() => window.__farm.gameUI().close());
};

// ---- a visit
async function visit(first = false) {
  const s = await state(); await note('VISIT', `day ${s.day} ${s.hm}`);
  await cards('opening');
  const g = () => p.evaluate(() => { const f = window.__farm, G = f.game(); return { level: G.level, coins: G.data.coins, coops: G.data.coops.map(c => ({ id: c.id, eggs: c.eggs, feed: G.feedLeft(c) })), birds: G.data.birds.map(b => b.id), fish: G.fishOpen('pond'), worms: G.worms(), hunt: f.hunt.at(), ordersReady: G.ordersReady(), garden: G.data.garden ? [0, 1, 2].map(i => G.bedStage(i)) : null, veg: G.data.garden ? { ...G.data.garden.veg } : null, wheat: G.wheatStage(), sale: G.landForSale(), jobs: G.jobsReady() }; });
  let S = await g();
  // the golden egg
  if (S.hunt) await safe('golden egg', async () => { await look(S.hunt[0], S.hunt[1], 2.2); await run(0.3); await once('hunt', 'golden_egg'); await p.evaluate(() => window.__farm.hunt.tap()); await act(1.5); });
  // the eggs
  for (let i = 0; i < S.coops.length; i++) if (S.coops[i].eggs) await safe('eggs', async () => { await p.evaluate(i => window.__farm.collectAt(i), i); await act(1.2); });
  // the pantry (10 Nov 2026): what the orders don't want, sold shelf by shelf (the grain kept for the feeders)
  await safe('pantry', async () => { await p.evaluate(() => window.__farm.pantrySheet()); await act(0.3); for (let k = 0; k < 8; k++) { const sold = await p.evaluate(() => { const q = [...document.querySelectorAll('.gpan-r [data-sell]:not([data-all])')].find(x => x.closest('.gpan-r').dataset.shelf !== 'grain'); if (q) q.click(); return !!q; }); if (!sold) break; await act(0.3); } await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen && u.kind === 'pantry') u.close(); }); });
  // the apple eggs under the Gluttons' apple trees
  const apples = await p.evaluate(() => { const f = window.__farm; return f.gamePlots().map((q, i) => { const A = f.apples.of(i); return A && A.egg && A.egg.visible ? i : -1; }).filter(i => i >= 0); });
  for (const i of apples) await safe('apple egg', async () => { const P = await p.evaluate(i => { const e = window.__farm.apples.of(i).egg; e.updateWorldMatrix(true, false); const m = e.matrixWorld.elements; return [m[12], m[14]]; }, i); await look(P[0], P[1], 2.2); await once('apple', 'apple_egg'); await p.evaluate(i => window.__farm.apples.eggTap(i), i); await act(1); });
  await cards('after eggs');
  // the village orders
  S = await g();
  if (S.ordersReady) await safe('orders', async () => {
    await click('.gordbtn'); await act(0.4); await once('orders', 'orders_card');
    const c = await cardNow(); if (c) await note('card orders', c.text);
    if (await click('.gsheet [data-ord=deliver]')) { await act(2); for (let i = 0; i < 40 && await p.evaluate(() => !!window.__farm.orders.run()); i++) await act(1); }
    else await p.evaluate(() => window.__farm.gameUI().close());
  });
  // a cuddle (and the worms) for each bird, the farmer's visits one after another
  for (const id of S.birds) await safe('cuddle', async () => {
    await waitFarmer(25);
    { const c = await cardNow(); if (c && c.kind !== 'bird') await cards('before a cuddle'); }
    const r = await p.evaluate(id => { const f = window.__farm, B = f.allBirds.find(x => x.gid === id); if (!B || !B.root.visible) return null; f.gameUI().close(); f.openBirdCard(B); return { cuddle: !!document.querySelector('.gsheet .gcuddle'), worms: !!document.querySelector('.gsheet button[data-worms=ask]'), treat: !!document.querySelector('.gsheet [data-treat]') }; }, id);
    if (!r) return;
    await once('card:bird', 'card_bird');
    if (r.cuddle) { await click('.gsheet .gcuddle'); await act(1); }
    else if (r.worms) { await click('.gsheet button[data-worms=ask]'); await act(1); }
    else await p.evaluate(() => window.__farm.gameUI().close());
  });
  await waitFarmer(30); await cards('after cuddles');
  // the feeders
  S = await g();
  for (let i = 0; i < S.coops.length; i++) if (S.coops[i].feed < 0.4) await safe('feeder', async () => { await waitFarmer(20); await p.evaluate(i => window.__farm.feederCard(i), i); await act(0.4); await once('card:feeder', 'card_feeder'); const c = await cardNow(); if (c) await note('card feeder', c.text); if (!(await click('.gsheet .gbtn:not(.galt)'))) await p.evaluate(() => window.__farm.gameUI().close()); await act(1.5); });
  // the wheat
  for (let w = 0; w < 2; w++) if (((S = await g()).wheat === 'ripe' || S.wheat === 'soil')) await safe('wheat', async () => { await waitFarmer(30); await p.evaluate(() => window.__farm.deco.wheat.tap()); await act(0.6); const c = await cardNow(); if (c) { await note('card ' + c.kind, c.text); await once('card:wheat', 'card_wheat'); if (!(await click('.gsheet .gbtn:not(.galt)'))) await p.evaluate(() => window.__farm.gameUI().close()); } await act(2); });
  // the vegetable garden: what's ripe picked, the empty beds sown (strawberries in the middle; carrots in the morning,
  // pumpkins in the evening), then a treat for each coop
  if (S.garden) await safe('garden', async () => {
    const at = await p.evaluate(() => window.__farm.garden.mid(1)); await look(at[0], at[2], 3.2); await run(0.3);
    await once('garden', 'garden');
    for (let i = 0; i < 3; i++) if ((await g()).garden[i] === 'ripe') { await waitFarmer(25); await p.evaluate(() => window.__farm.garden.tap(true)); await act(1); }
    await waitFarmer(30);
    for (let i = 0; i < 3; i++) if ((await g()).garden[i] === 'empty') {
      const k = i === 1 ? 'straw' : first || (await state()).hm >= '15:00' ? 'pump' : 'carrot';
      await p.evaluate(() => window.__farm.garden.tap()); await act(0.4); await once('card:garden', 'card_garden');
      const c = await cardNow(); if (c && !seen.has('gtext')) { seen.add('gtext'); await note('card garden', c.text); }
      if (!(await click(`.gsheet .gbed[data-bed="${i}"] [data-sow="${k}"]`))) { await p.evaluate(() => window.__farm.gameUI().close()); continue; }
      await act(1); await waitFarmer(25);
    }
    S = await g();
    for (const c of S.coops) {
      const best = await p.evaluate(id => { const G = window.__farm.game(), c = G.coop(id); return ['pump', 'straw', 'carrot'].find(k => G.treatCan(c, k)) || null; }, c.id);
      if (!best) continue;
      await waitFarmer(25);
      await p.evaluate(id => window.__farm.treat.card(id), c.id); await act(0.4); await once('card:treat', 'card_treat');
      const t = await cardNow(); if (t && !seen.has('ttext')) { seen.add('ttext'); await note('card treat', t.text); }
      if (await click(`.gsheet [data-give="${best}"]`)) { await act(3); if (!seen.has('treatpen')) { const P = await p.evaluate(id => { const f = window.__farm, q = f.gamePlots().find(x => x.gc.id === id); return q ? [q.group.position.x, q.group.position.z] : null; }, c.id); if (P) { for (let k = 0; k < 20 && !(await p.evaluate(() => !!window.__farm.farmer().pen)); k++) await act(1); await act(4); await look(P[0], P[1], 2.2); await once('treatpen', 'treat_in_pen'); } } }
      else await p.evaluate(() => window.__farm.gameUI().close());
    }
  });
  // the jobs
  S = await g();
  if (S.jobs) await safe('jobs', async () => { await p.evaluate(() => window.__farm.jobsSheet()); await act(0.4); await once('card:jobs', 'card_jobs'); const c = await cardNow(); if (c) await note('card jobs', c.text); for (let k = 0; k < 3; k++) { if (!(await p.evaluate(() => { const e = [...document.querySelectorAll('.gsheet .gsmallbtn')].find(x => !x.disabled); if (!e) return false; e.click(); return true; }))) break; await act(0.6); } await p.evaluate(() => window.__farm.gameUI().close()); });
  // the next field
  S = await g();
  if (S.sale && S.coins >= S.sale.price + 60) await safe('land', async () => { await p.evaluate(() => window.__farm.landCard()); await act(0.4); await once('card:land', 'card_land'); const c = await cardNow(); if (c) await note('card land', c.text); await click('.gsheet .gbtn:not(.galt)'); await act(2); });
  // spending, as a keen player would (SHOP=0: not): the coops' next looks first, then the geese (once the fox has called),
  // the decorations, the farmer's outfits, the dog; always keeping some coins back for feed and seed
  if (SHOP) await spend();
  // the shows: the best bird in each show with a fair chance (the village show anyway: it's cheap)
  if (SHOP) await safe('shows', enterShows);
  // the honey
  if (SHOP && await p.evaluate(() => { const h = window.__farm.deco.honey.state(); return !!h.bub; })) await safe('honey', async () => { await waitFarmer(25); const at = await p.evaluate(() => { const it = window.__farm.deco.items().find(x => x.id === 'beehives'); return it && it.at; }); if (at) { await look(at[0], at[1], 2.6); await once('honeypot', 'honey_pot'); } await p.evaluate(() => { const b = document.querySelector('.gbub.ghoney'); if (b) b.click(); else window.__farm.deco.honey.tap(); }); await act(1); for (let i = 0; i < 20 && await p.evaluate(() => !!window.__farm.deco.honey.state().work); i++) await act(1); });
  // the doors shut at night, once the fox has called (as his card says)
  if (SHOP && (await state()).hm >= '17:00' && await p.evaluate(() => !!window.__farm.game().foxLast())) await safe('doors', async () => {
    await waitFarmer(20); await act(20);      // (everyone in for the night)
    const n = await p.evaluate(() => window.__farm.gamePlots().length);
    for (let i = 0; i < n; i++) { const d = await p.evaluate(i => window.__farm.doorOf(i), i); if (d && d.goal === 1) { await p.evaluate(i => window.__farm.doorTapAt(i), i); await act(0.5); const t = await p.evaluate(() => document.getElementById('tag').textContent); if (!seen.has('door:' + t)) { seen.add('door:' + t); await note('door', t); } } }
  });
  // a new breed waiting for its coop
  const wait = await p.evaluate(() => window.__farm.game().waitingCoops());
  if (wait.length) await safe('coop', async () => { await p.evaluate(b => window.__farm.place(b), wait[0]); await act(1.5); await once('move', 'placing_coop'); for (let k = 0; k < 6 && !(await p.evaluate(() => window.__farm.move.state().ok)); k++) await p.evaluate(k => { const f = window.__farm, M = f.move.state(); f.move.to(M.at.x + (k % 2 ? -3 : 3), M.at.z + (k > 2 ? 3 : -3)); }, k).catch(() => {}); await click('.gmove-go'); await act(2); await note('placed a coop', wait[0]); });
  // a little fishing in the morning (two casts)
  S = await g();
  if (TIN && S.fish && !(await p.evaluate(() => window.__farm.game().tinToday())) && S.coins >= 120) await safe('tin', async () => { await p.evaluate(() => window.__farm.dockCard()); await act(0.4); await click('.gsheet button[data-fish=tin]'); await act(0.4); await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen) u.close(); }); });
  S = await g();
  if (CASTS > 0 && S.fish && S.worms > 0 && (first || ANYHOUR || (await state()).hm < '12:00')) await safe('fishing', async () => {
    await waitFarmer(25);
    const t0 = await p.evaluate(() => window.__T);
    await p.evaluate(() => window.__farm.dockCard()); await act(0.4); await once('card:dock', 'card_dock');
    if (!(await click('.gsheet button[data-fish=go]'))) { await p.evaluate(() => window.__farm.gameUI().close()); return; }
    for (let i = 0; i < 90 && (await p.evaluate(() => (window.__farm.fishing() || {}).state)) !== 'ready'; i++) { await act(1); const c = await cardNow(); if (c && c.kind === 'fishhelp') { await note('card fishhelp', c.text); await once('card:fishhelp', 'card_fishhelp'); await click('.gsheet button[data-fhelp=ok]'); } }
    await note('fishing', 'on the dock ready after ' + Math.round(((await p.evaluate(() => window.__T)) - t0) / 1000) + ' s');
    await once('fishready', 'fishing_ready');
    let got = 0, lost = 0;
    for (let k = 0; k < CASTS; k++) {
      if ((await p.evaluate(() => window.__farm.game().worms())) < 1) break;
      await p.evaluate(() => { const f = window.__farm, D = f.dock(), F = f.fishing(); return F.tapWater(D.stand[0] + Math.sin(D.face + 0.3) * 2.6, D.stand[1] + Math.cos(D.face + 0.3) * 2.6); }); await act(0.5);
      for (let i = 0; i < 100 && (await p.evaluate(() => window.__farm.fishing().state)) !== 'bite'; i++) await run(0.25);
      await once('fishbite', 'fishing_bite');
      for (let t = 0; t < 3 && (await p.evaluate(() => window.__farm.fishing().state)) === 'bite'; t++) {      // (up to three taps: in the green, or not)
        const hit = rnd() < HIT;
        await p.evaluate(hit => { const F = window.__farm.fishing(), G = F.fight(); const x = hit ? F.g0 + G.green / 2 : (F.g0 > 0.5 ? F.g0 - 0.2 : F.g0 + G.green + 0.2); F.bt = x * G.sweep; F.press(true); }, hit); await run(0.4);
      }
      if ((await p.evaluate(() => window.__farm.fishing().state)) === 'ready') { lost++; await hintNow(); continue; }
      for (let i = 0; i < 40 && !(await cardNow()); i++) await act(0.5);
      const c = await cardNow(); if (c) { got++; await note('card ' + c.kind, c.text); await once('card:fish', 'card_fish'); if (!(await click('.gsheet button[data-fish=keep]'))) { await click('.gsheet button[data-fish=stop]') || await p.evaluate(() => window.__farm.gameUI().close()); break; } await act(0.6); for (let i = 0; i < 30 && (await p.evaluate(() => window.__farm.fishing().state)) !== 'ready'; i++) await act(0.5); }
    }
    if (await p.evaluate(() => !!window.__farm.fishing() && window.__farm.fishing().state !== 'off')) { await p.evaluate(() => { const F = window.__farm.fishing(); if (F.stop) F.stop(); }); }
    for (let i = 0; i < 12; i++) { await act(1); const c = await cardNow(); if (c && c.kind === 'catch') { await note('card catch', c.text); await once('card:catch', 'card_catch'); if (KEEPFISH) await click('.gsheet button[data-keep="0"]'); await click('.gsheet button[data-catch=sell]'); await act(0.5); break; } }
    await note('fishing done', `${got} caught, ${lost} got away; species so far ${await p.evaluate(() => Object.keys(window.__farm.game().fishBag().got).length)} of 20; worms left ${await p.evaluate(() => window.__farm.game().worms())}`);
    await act(2);
  });
  await cards('end of visit');
  const e = await state(); await note('END', `level ${e.level}, ${e.coins} coins, ${e.xp} XP`);
}

// ---- the start: the story, the welcome, the first day's pictures, the guide
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
for (let k = 0; k < 20; k++) {      // (grandma's story: its own pages, Next on each; then the welcome card)
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => { const g = document.querySelector('.gstory:not(.out)'); return g && !g.hidden && g.getClientRects().length && getComputedStyle(g).display !== 'none' ? g.querySelector('.gstory-text').textContent : null; }).catch(() => null);
  if (st) { await note('story', st); await shoot('story_' + k); await click('.gstory-next'); continue; }
  const c = await cardNow(); if (!c) { if (await p.evaluate(() => !!window.__farm && document.getElementById('loading') === null)) break; continue; }
  await note('start ' + c.kind, c.text); await once('start:' + c.kind + k, 'start_' + c.kind + '_' + k);
  if (c.kind === 'welcome') { await click('.gsheet .gbtn:not(.galt)'); break; }
  await click('.gsheet .gbtn:not(.galt)');
}
await load();
// the first day's pictures (the intro cards) and the guide's steps, as the arrow says
for (let k = 0; k < 8; k++) { const c = await cardNow(); if (!c) break; await note('intro ' + c.kind, c.text); await once('intro' + k, 'intro_' + k); await p.evaluate(() => { const n = [...document.querySelectorAll('.gsheet .gbtn')].find(x => !x.classList.contains('galt')); if (n) n.click(); }); await act(0.6); }
await note('guide', await p.evaluate(() => { const e = document.querySelector('.gguide'); return e ? e.innerText : '(no guide card)'; }));
await shoot('guide_1');
await visit(true);
await note('guide after the first visit', await p.evaluate(() => { const e = document.querySelector('.gguide'); return e ? e.innerText : '(no guide card)'; }));
// then 19:00 the first day, and 8:00 and 19:00 after: the app opened afresh each time
const day0 = new Date('2026-11-09T00:00:00Z').getTime();
const times = VISITS.filter(h => h > 12).map(h => day0 + h * 3600e3); for (let d = 1; d <= DAYS; d++) for (const h of VISITS) times.push(day0 + d * 86400e3 + h * 3600e3);
for (const t of times) {
  if ((await state()).level >= UNTIL) break;
  await p.evaluate(t => { window.__T = Math.max(window.__T, t); sessionStorage.setItem('__T', window.__T); }, t);
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 300000 }); await load(); lastHint = '';
  await visit(false);
}
const s = await state();
await note('DONE', `day ${s.day}, level ${s.level}, ${s.coins} coins; page errors: ${JSON.stringify(errs)}`);
await b.close();

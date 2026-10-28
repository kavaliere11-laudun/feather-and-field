// Fishing in the river (release 5, step 2: main.js riverInfo, riverCast, riverDrift, riverRig, riverRoute; fishing.js):
// ./withserver.sh node rivertest.mjs [OUT]   (LANG=fr; W, H: the screen, e.g. W=874 H=402; PORT)
// A new farm on a fake clock. Level 7: the footbridge's card says the river opens at level 8, no button; no rod or bucket
// on it. Level 8: the level's card (fishing in the river, tap its footbridge, "Show me the river": the view over to it);
// his rod lying on the footbridge and his bucket by it; the card: the river's seven fish (none caught), the worms, Go
// fishing. Go: the farmer off to the footbridge, out to its middle, up on its deck, the rod picked up, facing down the
// stream. A tap on the water: the float out on the stream downstream (in its banks, 0.9 to 3.6 m down), carried off down
// the stream as it waits. The bite, the reel, landed: a river fish, its card; Keep: into the bucket, ready again. Old
// Snapjaw: his photo, back into the river (dropped in from the bridge). Stop: his rod left on the footbridge, back off
// it. A reload: the catches kept, unflagged. The Breed Book's fish pages. No page errors. Pictures in OUT.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/rivertest', fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), side = W > H;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
const T0 = new Date('2026-11-03T10:00:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const shoot = async n => { await p.addStyleTag({ content: '#hint { opacity: 0.0001 !important; }' }).catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/river_${n}${fr ? '_fr' : ''}${side ? '_side' : ''}.png`, timeout: 180000 }); await p.addStyleTag({ content: '#hint { opacity: 1 !important; }' }).catch(() => {}); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const st = () => p.evaluate(() => { const f = window.__farm, F = f.fishing(), L = f.farmer(), g = f.game(), R = f.river();
  return { state: F ? F.state : null, water: F ? F.o.water : null, seq: !!f.fishSeq(), pos: [+L.pos.x.toFixed(2), +L.pos.y.toFixed(2), +L.pos.z.toFixed(2)], heading: +L.heading.toFixed(2), worms: g.worms(), coins: g.data.coins, xp: g.data.xp,
    R, bar: F ? !F.bar.hidden : false, hint: document.getElementById('hint').textContent, float: F ? F.float.visible : false, said: L.said.slice(-3), got: g.data.fish ? Object.keys(g.data.fish.got) : [] }; });
const sheet = () => p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return null;
  return { kind: window.__farm.gameUI().kind, text: s.innerText, go: !!s.querySelector('button[data-fish=go]'), keep: (s.querySelector('button[data-fish=keep]') || {}).textContent || null,
    stop: !!s.querySelector('button[data-fish=stop]'), fish: s.querySelectorAll('.gfishrow img').length, got: s.querySelectorAll('.gfishrow img.got').length, water: (s.querySelector('.gfishrow') || {}).dataset ? s.querySelector('.gfishrow') && s.querySelector('.gfishrow').dataset.water : null }; });
const settle = () => p.evaluate(() => document.getAnimations().forEach(a => a.finish()));
const until = async (test, secs, step = 0.25) => { for (let t = 0; t < secs; t += step) { if (await p.evaluate(test)) return true; await run(step); } return p.evaluate(test); };
const reel = (how = 'good') => p.evaluate(async how => {
  const f = window.__farm, F = f.fishing();
  for (let i = 0; i < 30 * 90 && F.state === 'reel'; i++) { if (how === 'good') F.press(F.T < 0.5); else F.press(how === 'hard'); window.__T += 1000 / 30; f.step(1 / 30, 1); f.gameTick(window.__T, false); }
  F.press(false); sessionStorage.setItem('__T', window.__T); f.draw(); return F.state;
}, how);
const castOut = () => p.evaluate(() => { const f = window.__farm, R = f.river(), F = f.fishing(); return F.tapWater(R.stand[0] + Math.sin(R.face + 0.08) * 2.2, R.stand[1] + Math.cos(R.face + 0.08) * 2.2); });
const onStream = () => p.evaluate(() => { const f = window.__farm, F = f.fishing(), R = f.river(), q = f.streamAt(F.target.x, F.target.z); return { d: +q.d.toFixed(2), ds: +(q.s - R.s0).toFixed(2), s: q.s }; });
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=10:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(() => { window.__T = Math.round(window.__T); sessionStorage.setItem('__T', window.__T); const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.data.xp = 2600; g.data.lvSeen = 7; g.save(); f.gameUI().close(); });
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
await p.evaluate(() => window.__farm.gameUI().close()); await run(0.5);
// level 7: not yet
await p.evaluate(() => window.__farm.riverCard()); await run(0.2);
let sh = await sheet();
ok('level 7: the footbridge\'s card: the river\'s fish, it opens at level 8, no button', sh && sh.kind === 'dock' && sh.water === 'river' && (fr ? /niveau 8/ : /level 8/).test(sh.text) && !sh.go && sh.fish === 7, sh);
ok('level 7: no rod or bucket on the footbridge yet', !(await p.evaluate(() => !!window.__farm.fishers().river)));
// level 8: its card says the river's open, with a look at it
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.xp = 3600; g.save(); f.gameUI().close(); }); await run(1.5);
await p.waitForTimeout(1600); await p.evaluate(() => window.__farm.showNews()); await run(0.2);
sh = await sheet();
const lvl = await p.evaluate(() => { const c = [...document.querySelectorAll('.gsheet:not([hidden]) .gfishnew')].map(x => x.innerText).join(' | '); return c; });
ok('level 8: its card: fishing in the river, tap its footbridge, a look at it', sh && sh.kind === 'levelup' && (fr ? /pêche à la rivière : touchez sa passerelle/ : /Fishing in the river: tap its footbridge/).test(lvl) && (fr ? /Voir la rivière/ : /Show me the river/).test(lvl), { kind: sh && sh.kind, lvl });
await settle(); await p.evaluate(() => [...document.querySelectorAll('.gsheet button[data-fish=show]')].pop().click()); await run(1.2);
const va = await p.evaluate(() => { const f = window.__farm, v = f.viewAt(), R = f.river(); return { v, d: Math.hypot(v[0] - R.mid[0], v[1] - R.mid[1]) }; });
ok('"Show me the river": the view over to the footbridge', va.d < 0.5 && !(await sheet()), va);
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.lvSeen = 8; g.fishBag().worms = 6; g.save(); f.gameUI().close(); }); await run(0.5);
await p.evaluate(() => window.__farm.riverCard()); await run(0.2);
sh = await sheet();
const props0 = await p.evaluate(() => { const F = window.__farm.fishers().river; return F && { rod: F.deckRod.visible, bucket: F.bucket.visible, by: F.bucket.position.y }; });
ok('level 8: his rod lying on the footbridge and his bucket by it (up on its deck)', props0 && props0.rod && props0.bucket && props0.by > 0.15, props0);
ok('level 8: the river\'s seven fish (none caught), 6 worms, Go fishing', sh && sh.go && sh.fish === 7 && sh.got === 0 && sh.water === 'river' && /6/.test(sh.text) && (fr ? /Vairons/ : /Minnows/).test(sh.text), sh);
await shoot('1_card');
await settle(); await p.tap('.gsheet button[data-fish=go]'); await run(0.3);
let s = await st();
ok('Go: the farmer off to the footbridge', s.seq && (fr ? /part à la passerelle/ : /off to the footbridge/).test(s.hint), s.hint);
for (let i = 0; i < 160; i++) { await run(1); s = await st(); if (s.state === 'ready') break; }
const rodNow = await p.evaluate(() => { const F = window.__farm.fishing(), L = window.__farm.farmer(); return { water: F.o.water, onDeck: F.deckRod.visible, inHand: F.rodIn && !!L.f.rig.rod && L.f.rig.rod.visible }; });
ok('out on the footbridge\'s middle, up on its deck, facing down the stream, the rod picked up; the worms and Stop at the bottom', s.state === 'ready' && s.water === 'river' && Math.hypot(s.pos[0] - s.R.stand[0], s.pos[2] - s.R.stand[1]) < 0.15 && Math.abs(s.pos[1] - s.R.deck) < 0.03 && s.R.deck > 0.2 && Math.abs(Math.atan2(Math.sin(s.heading - s.R.face), Math.cos(s.heading - s.R.face))) < 0.3 && rodNow.inHand && !rodNow.onDeck && s.bar, { s, rodNow });
await p.evaluate(() => { const f = window.__farm, R = f.river(); f.lookAt(R.stand[0] + Math.sin(R.face) * 1.2, R.stand[1] + Math.cos(R.face) * 1.2, 2.2); });
await run(0.3); await shoot('2_bridge');
// a tap off the water, behind him: no cast
ok('a tap up the stream, behind the bridge: no cast', !(await p.evaluate(() => { const f = window.__farm, R = f.river(), F = f.fishing(); return F.tapWater(R.stand[0] - Math.sin(R.face) * 2.5, R.stand[1] - Math.cos(R.face) * 2.5); })));
const before = await st();
ok('a tap on the water downstream: cast', await castOut());
await run(1.3); s = await st();
const q0 = await onStream();
ok('a worm used, the float out on the stream downstream (in its banks, 0.9 to 3.6 m down)', s.worms === before.worms - 1 && s.state === 'wait' && s.float && q0.d < 0.3 && q0.ds >= 0.85 && q0.ds <= 3.65, { s, q0 });
await run(3); const q1 = await onStream();
ok('carried off down the stream as it waits', q1.s - q0.s > 0.15 && q1.d < 0.3, { q0, q1 });
await shoot('3_float');
ok('then the bite', await until(() => window.__farm.fishing().state === 'bite', 25));
await p.evaluate(() => window.__farm.fishing().press(true));
const c0 = (await st()).coins;
let end = await reel('good');
ok('reeled in: landed', end === 'lift', end);
await until(() => window.__farm.fishing().state === 'card', 14, 0.2);
sh = await sheet(); s = await st();
const R1 = await p.evaluate(() => window.__farm.fishing().result);
ok('a river fish, its card: sold live, Keep fishing', R1 && R1.water === 'river' && ['minnow', 'gudgeon', 'dace', 'chub', 'brown_trout', 'grayling'].includes(R1.id) && sh && sh.kind === 'fish' && (fr ? /animalerie/ : /aquarium shop/).test(sh.text) && sh.keep && s.coins === c0 + R1.coins, { R1, sh });
await shoot('4_card');
await settle(); await p.tap('.gsheet button[data-fish=keep]');
let sawLower = false;
for (let i = 0; i < 40 && (await p.evaluate(() => window.__farm.fishing().state)) !== 'ready'; i++) { await run(0.2); if (await p.evaluate(() => window.__farm.farmer().f.want.pose === 'release')) sawLower = true; }
const back = await p.evaluate(() => { const F = window.__farm.fishing(); return { state: F.state, fish: !!F.fish, rodIn: F.rodIn }; });
ok('Keep fishing: into the bucket, the rod picked up again, ready', sawLower && back.state === 'ready' && !back.fish && back.rodIn, { sawLower, back });
// Old Snapjaw
await p.evaluate(() => { const g = window.__farm.game(); g.data.fish.worms = 1; g.save(); window.__farm.fishing().refreshBar(); });
const cc = (await st()).coins;
await castOut(); await p.evaluate(() => { const F = window.__farm.fishing(), g = window.__farm.game(); g.bite = { id: 'old_snapjaw', cm: 110, water: 'river', rare: 2 }; F.bite = { ...g.bite }; });
await until(() => window.__farm.fishing().state === 'bite', 25); await p.evaluate(() => window.__farm.fishing().press(true));
end = await reel('good');
ok('Old Snapjaw, reeled in', end === 'lift', end);
await until(() => window.__farm.fishing().state === 'card', 14, 0.2);
sh = await sheet(); s = await st();
ok('his card: his photo for the book, back into the river, 400 coins; the last worm: only Stop', sh && sh.kind === 'fish' && (fr ? /retourne dans la rivière/ : /back into the river/).test(sh.text) && s.coins === cc + 400 && !sh.keep && sh.stop, { sh, coins: s.coins - cc });
await settle();
await p.evaluate(() => document.querySelector('.gsheet button[data-fish=stop]').click());
let into = null;
for (let i = 0; i < 30 && !into; i++) { await run(0.1); into = await p.evaluate(() => { const f = window.__farm, F = f.fishing(); if (!F.fish) return null; const r = F.fish.root.position; return r.y < 0.05 ? { y: +r.y.toFixed(3), on: f.riverWater(r.x, r.z, 0) } : null; }); }
ok('let go from the bridge: he crouches and he drops back into the river', into && into.on, into);
await run(1);
await shoot('5_release');
ok('then back off the footbridge, his rod left lying on it, the bar gone', await until(() => { const f = window.__farm; return !f.fishSeq() && f.fishing().state === 'off'; }, 60, 0.5) && (await p.evaluate(() => window.__farm.fishing().deckRod.visible)) && !(await st()).bar && Math.hypot((await st()).pos[0] - (await st()).R.stand[0], (await st()).pos[2] - (await st()).R.stand[1]) > 1, await st());
// a reload
const got = await p.evaluate(() => JSON.stringify(window.__farm.game().data.fish.got));
await p.reload({ waitUntil: 'domcontentloaded', timeout: 120000 }); await load();
const again = await p.evaluate(() => ({ got: JSON.stringify(window.__farm.game().data.fish.got), edited: window.__farm.game().edited, rod: !!window.__farm.fishers().river && window.__farm.fishers().river.deckRod.visible }));
ok('a reload: the catches kept, unflagged; his rod on the footbridge', again.got === got && !again.edited && again.rod, again);
await p.evaluate(() => window.__farm.riverCard()); await run(0.2); sh = await sheet();
ok('the footbridge\'s card: the fish caught in colour now', sh && sh.got >= 2, sh && sh.got);
await shoot('6_card');
// the Breed Book's fish pages
await p.evaluate(() => { const f = window.__farm; f.gameUI().close(); f.gameUI().bookSheet({}); }); await run(0.2); await settle();
const tabs = await p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .gbooktabs button')].map(b => b.textContent));
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gbooktabs button[data-tab=fish]').click()); await run(0.2); await settle();
const book = await p.evaluate(id => { const s = document.querySelector('.gsheet:not([hidden])'); const pages = [...s.querySelectorAll('.gfishpage')];
  return { text: s.innerText.slice(0, 260), n: pages.length, dark: pages.filter(x => x.classList.contains('gpage-no')).length, first: (pages.find(x => x.dataset.fish === id) || {}).innerText, snap: (pages.find(x => x.dataset.fish === 'old_snapjaw') || {}).innerText, rudd: (pages.find(x => x.dataset.fish === 'rudd') || {}).innerText }; }, R1.id);
ok('the Breed Book: Breeds and Fish; the fish pages: 2 of 14 caught, the pond\'s and the river\'s, the caught ones in colour with their count and size, the others dark', tabs.length === 2 && book.n === 14 && book.dark === 12 && (fr ? /2 poissons pêchés sur 14/ : /2 of 14 fish caught/).test(book.text) && book.first && book.first.includes((fr ? 'Pêché une fois · ' : 'Caught once · ') + R1.cm + ' cm') && (fr ? /Légendaire/ : /Legendary/).test(book.snap) && (fr ? /Pas encore pêché/ : /Not caught yet/).test(book.rudd), { tabs, book });
await shoot('7_book');
await p.evaluate(() => { const s = document.querySelector('.gsheet:not([hidden]) .gsheet-body') || document.querySelector('.gsheet:not([hidden])'); s.scrollTop = 99999; }); await run(0.2); await shoot('8_book_river');
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gbooktabs button[data-tab=birds]').click()); await run(0.2);
ok('… and back to the breeds', await p.evaluate(() => !document.querySelector('.gsheet:not([hidden]) .gfishpage') && !!document.querySelector('.gsheet:not([hidden]) .gpage')));
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

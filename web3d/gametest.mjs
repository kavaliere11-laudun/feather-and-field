// The game, release 1 step 1 (play.html, game.js, gameui.js): node gametest.mjs   (LANG=fr: a French phone; W, H: the screen, e.g. W=874 H=402 sideways)
// A fresh phone: the welcome (language, him or her, a name) over the loading farm; the farm: level 1, 100 coins, a rustic
// Red Barn on the first patch with the Rhode Island Red trio (a rooster and two hens, three different personalities, the
// rooster never a good mum), nobody else's coops, no geese, dog or decorations yet; a real tap on each bird: her card
// (name, breed, hen or rooster, personality, experience, trust, her coop) in the phone's language; the farm the same after
// a reload; a save changed outside the game: checked (a fourth bird, a rooster good mum, code in a name, a level typed
// in, XP as text) and flagged in Settings; Settings: the other language, and a new farm (tap twice). At night: the trio in
// bed, inside the coop with its title in the language. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const fr = process.env.LANG === 'fr', URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: +(process.env.W || 402), height: +(process.env.H || 874) }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB' });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
const ready = () => p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
const W = { en: { hen: 'Hen', rooster: 'Rooster', shy: 'Shy', forever: 'In your flock for good', lives: 'Lives in: Red Barn (rustic)', mum: 'Good mum', brave: 'Brave', rebel: 'Rebel', settings: 'Settings', inside: 'Inside the Red Barn · 3 asleep' },
  fr: { hen: 'Poule', rooster: 'Coq', shy: 'Farouche', forever: 'Dans votre basse-cour pour toujours', lives: 'Habite : Grange rouge (rustique)', mum: 'Mère poule', brave: 'Courageux', rebel: 'Rebelle', settings: 'Réglages', inside: 'Grange rouge · 3 endormis' } };
const T = W[fr ? 'fr' : 'en'];
// ---- a fresh phone: the welcome
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
const welcome = await p.evaluate(() => ({ title: document.querySelector('.gsheet h2').textContent, close: !document.querySelector('.gsheet .gx').hidden, bar: !document.querySelector('.gbar').hidden }));
await p.tap('.gwho .gchip:nth-child(2)');
await p.fill('#gname', '<b>Rosie</b>');
await p.tap('.gsheet .gbtn');
await ready();
const farm = await p.evaluate(() => {
  const f = window.__farm, g = f.game(), d = g.data; f.pause(true);
  const coops = f.coopPlots(), birds = coops.flatMap(c => c.birds);
  return { d, bar: !document.querySelector('.gbar').hidden, lvl: document.querySelector('.gbar .glvl').textContent, coins: document.querySelector('.gbar .gpill:not(.glvl)').textContent,
    coopPlots: coops.map(c => ({ index: c.index, breed: c.breed, rustic: c.rustic })), birds: birds.map(b => ({ name: b.name, kind: b.kind, pers: b.pers, gid: b.gid })),
    geese: !!(f.geese() && f.geese().geese.length), dog: !!f.dog(), decor: f.decor().length, farmer: f.farmer() && f.farmer().o.name, saved: !!localStorage.getItem('ff3d.farm'), edited: g.edited };
});
// ---- a real tap on each bird: her card
const cards = [];
for (let i = 0; i < 3; i++) {
  const at = await p.evaluate(i => {
    const f = window.__farm, plot = f.coopPlots()[0], bird = plot.birds[i]; f.gameUI().close();
    plot.frame.updateMatrixWorld(true); const w = bird.root.getWorldPosition(new f.THREE.Vector3());
    f.lookAt(w.x + 0.4, w.z + 0.4, 1.6); f.draw(); w.y += bird.hitY; w.project(f.camera);
    return { x: (w.x + 1) / 2 * innerWidth, y: (1 - w.y) / 2 * innerHeight, name: bird.name, kind: bird.kind, pers: bird.pers };
  }, i);
  await p.touchscreen.tap(at.x, at.y);
  cards.push(Object.assign(at, await p.evaluate(() => ({ ui: window.__farm.gameUI().kind, text: document.querySelector('.gsheet').innerText }))));
}
// ---- a reload: the same farm
await p.reload({ waitUntil: 'domcontentloaded' }); await ready();
const again = await p.evaluate(() => { const f = window.__farm, g = f.game(); return { d: g.data, welcome: !document.querySelector('.gsheet').hidden && document.querySelector('.gsheet').classList.contains('modal'), edited: g.edited, names: f.coopPlots()[0].birds.map(b => b.name) }; });
// ---- a save changed outside the game
await p.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('ff3d.farm')), d = raw.d;
  d.level = 30; d.xp = 'lots'; d.coins = 5e12;
  d.birds[0].pers = 'mum';                                       // (the rooster a good mum)
  d.birds[1].name = '<img src=x onerror="window.__hacked=1">Ginger';
  d.birds.push({ id: 'b99', name: 'Extra', sex: 'h', breed: 'rir', pers: 'diva', coop: 'c1', since: 0, exp: 0, trust: 0 });   // (a fourth bird)
  d.birds[2].trust = 99; d.coops[0].tier = 'deluxe';
  localStorage.setItem('ff3d.farm', JSON.stringify(raw));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await ready();
const tamper = await p.evaluate(async () => {
  const f = window.__farm, g = f.game(), d = g.data; f.pause(true);
  f.openBirdCard(f.coopPlots()[0].birds[1]);
  const card = document.querySelector('.gsheet').innerHTML;
  f.gameUI().close(); document.querySelector('.gbar .gicon').click();
  return { xp: d.xp, coins: d.coins, level: g.level, rooster: d.birds[0].pers, name: d.birds[1].name, n: d.birds.length, trust: d.birds[2].trust, tier: d.coops[0].tier, edited: g.edited,
    hacked: !!window.__hacked, imgInCard: /<img/i.test(card), warned: /gwarn/.test(document.querySelector('.gsheet').innerHTML), settings: document.querySelector('.gsheet h2').textContent };
});
// ---- night: the trio in bed, inside the coop
const night = await p.evaluate(() => {
  const f = window.__farm; f.gameUI().close(); f.setHour(23.6);
  for (let k = 0; k < 600 && !f.coopPlots()[0].birds.every(b => b.asleep); k++) f.step(1 / 30, 3);
  const plot = f.coopPlots()[0]; f.openInside(plot);
  return { asleep: plot.birds.map(b => !!b.asleep) };
});
await p.waitForFunction(() => window.__farm.inside.open, null, { timeout: 20000 });
const insideTitle = await p.evaluate(() => { const t = document.getElementById('inside-title').textContent; window.__farm.closeInside(); window.__farm.setHour(undefined); return t; });
await p.waitForFunction(() => !window.__farm.inside.open && !window.__farm.inside.busy, null, { timeout: 20000 });
// ---- Settings: the other language, then a new farm (tap twice)
await p.evaluate(() => { window.__farm.gameUI().close(); document.querySelector('.gbar .gicon').click(); });
await Promise.all([p.waitForNavigation({ waitUntil: 'domcontentloaded' }), p.evaluate(fr => [...document.querySelectorAll('.gsheet .gchip')].find(c => c.textContent === (fr ? 'English' : 'Français')).click(), fr)]);
await ready();
const other = await p.evaluate(() => { const g = window.__farm.game(); document.querySelector('.gbar .gicon').click(); return { lang: g.lang, html: document.documentElement.lang, title: document.querySelector('.gsheet h2').textContent }; });
await p.evaluate(() => document.querySelector('.gsheet .gbtn.galt').click());
await Promise.all([p.waitForNavigation({ waitUntil: 'domcontentloaded' }), p.evaluate(() => document.querySelector('.gsheet .gbtn.galt').click())]);
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
const fresh = await p.evaluate(() => ({ save: localStorage.getItem('ff3d.farm'), modal: document.querySelector('.gsheet').classList.contains('modal') }));
const d = farm.d, roo = d.birds.filter(x => x.sex === 'r'), hens = d.birds.filter(x => x.sex === 'h');
const checks = [
  ['no page errors', errs.length === 0, errs.slice(0, 3)],
  ['a fresh phone: the welcome, no close button, no top bar yet', welcome.title.length > 3 && !welcome.close && !welcome.bar, welcome],
  ['the farmer: her, the name cleaned of code', d.farmer.look === 'f' && d.farmer.name === 'bRosie/b' && farm.farmer === 'bRosie/b', d.farmer],
  ['the farm: level 1, 100 coins, the top bar', farm.bar && farm.lvl === '1' && /100/.test(farm.coins) && d.coins === 100 && d.xp === 0, [farm.lvl, farm.coins]],
  ['a rustic Red Barn on the first patch, and nothing else built', d.land.join() === '0' && d.coops.length === 1 && d.coops[0].breed === 'rir' && d.coops[0].tier === 0 && farm.coopPlots.length === 1 && farm.coopPlots[0].index === 0 && farm.coopPlots[0].rustic, farm.coopPlots],
  ['the trio: a rooster and two hens, three different personalities, no good mum rooster', roo.length === 1 && hens.length === 2 && new Set(d.birds.map(x => x.pers)).size === 3 && roo[0].pers !== 'mum' && new Set(d.birds.map(x => x.name)).size === 3, d.birds.map(x => [x.name, x.sex, x.pers])],
  ['the same birds on the farm', farm.birds.length === 3 && farm.birds.every(x => d.birds.some(y => y.id === x.gid && y.name === x.name && y.pers === x.pers && (y.sex === 'r') === (x.kind === 'rooster'))), farm.birds],
  ['no geese, dog or decorations yet', !farm.geese && !farm.dog && farm.decor === 0, [farm.geese, farm.dog, farm.decor]],
  ['saved on the phone, not flagged', farm.saved && !farm.edited, farm.saved],
  ['a real tap on each bird: her card in the phone\'s language', cards.every(c => c.ui === 'bird' && c.text.startsWith(c.name) && c.text.includes(c.kind === 'rooster' ? T.rooster : T.hen) && c.text.includes(T.forever) && c.text.includes(T.shy) && c.text.includes(T.lives) && c.text.includes(T[c.pers] || '?')), cards.map(c => [c.name, c.pers, c.kind, c.text.slice(0, 40), c.text.slice(-70)])],
  ['the same farm after a reload', !again.welcome && !again.edited && JSON.stringify(again.d) === JSON.stringify(farm.d) && again.names.join() === farm.birds.map(x => x.name).join(), [again.welcome, again.edited]],
  ['a save changed outside the game: everything checked', tamper.xp === 0 && tamper.coins === 1e9 && tamper.level === 1 && tamper.rooster !== 'mum' && !/[<>"]/.test(tamper.name) && tamper.n === 3 && tamper.trust === 15 && tamper.tier === 0 && !tamper.hacked && !tamper.imgInCard, tamper],
  ['…and flagged in Settings', tamper.edited && tamper.warned && tamper.settings === T.settings, [tamper.edited, tamper.warned]],
  ['at night: the trio in bed; inside the coop, its title in the language', night.asleep.every(Boolean) && insideTitle === T.inside, [night.asleep, insideTitle]],
  ['Settings: the other language', other.lang === (fr ? 'en' : 'fr') && other.html === other.lang && other.title === (fr ? 'Settings' : 'Réglages'), other],
  ['Settings: a new farm (tap twice): the welcome again', !fresh.save && fresh.modal, fresh],
];
let all = true;
for (const [nm, ok, v] of checks) { all = all && ok; console.log(ok ? 'PASS' : 'FAIL', nm, '·', JSON.stringify(v).slice(0, ok ? 300 : 1200)); }
console.log(all ? 'ALL PASS' : 'SOME FAILED');
await b.close();

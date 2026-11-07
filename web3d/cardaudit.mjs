// Every card, bubble and message, sideways, in every language (6 Nov 2026, Audrey: "Cut message, audit them all please to
// make sure they are all ok"): ./withserver.sh node cardaudit.mjs [OUT]   (LANGS=en,fr; SIZES=874x402,932x430; PORT)
// On each sideways phone (the smallest iPhone to the biggest, and Safari's bars on a small one): the welcome, the five
// first-day cards, then a farm with things going on: every card the game has (a hen's, a chick's, a young hen's, the coop,
// the feeder, the land, the level, a level up, the coops, the Breed Book, the shows, a show day and its results, the jobs,
// the shop's tabs, the wheat, a decoration, the dock, a fish, the fox's night, the geese, a rare chick, the congratulations,
// while you were away (everything at once), the coins, the account and notifications asks, two farms, Settings), and the
// first day's guide, the hint and the label over a tapped thing with the longest words. Checks, each card at the top and
// scrolled to the bottom: on the screen; every line of words seen whole (not cut at a side, not squashed in its box, not
// under the buttons that stay at the bottom, nor under anything else); the buttons' words not cut; messages in the middle,
// the others on the right. A picture of each failing one in OUT. Ends with the problems found, or ALL PASS.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/cardaudit'; fs.mkdirSync(OUT, { recursive: true });
const LANGS = (process.env.LANGS || 'en,fr,de,es,it,pt').split(','), LOC = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-BR', it: 'it-IT' };
const SIZES = (process.env.SIZES || '667x375,844x390,874x402,932x430,956x440,667x320').split(',').map(s => s.split('x').map(Number));
const CENTER = ['away', 'levelup', 'congrats', 'showres', 'fox', 'rare', 'acctask', 'notesask', 'twofarms', 'addemo', 'paydemo', 'thanksdemo', 'intro'];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0, checked = 0; const problems = [];
const bad = (what, info) => { fails++; problems.push(what + ' · ' + JSON.stringify(info)); console.log('FAIL ' + what + ' · ' + JSON.stringify(info)); };
// what's wrong with the open card, at the top and scrolled to the bottom
const AUDIT = () => {
  const s = document.querySelector('.gsheet:not([hidden])'); if (!s) return null;
  document.getAnimations().forEach(a => a.finish());
  const W = innerWidth, H = innerHeight, R = s.getBoundingClientRect(), body = s.querySelector('.gsheet-body'), out = [];
  const vis = e => { if (!e.getClientRects().length) return false; const c = getComputedStyle(e); return c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05; };
  if (R.left < -1 || R.top < -1 || R.right > W + 1 || R.bottom > H + 1) out.push(['off the screen', [R.left, R.top, R.right, R.bottom].map(Math.round)]);
  const words = e => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const leaves = [...s.querySelectorAll('*')].filter(e => vis(e) && !e.closest('svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const stick = s.querySelector('.gstick, .gsheet-body > .gbtn:last-child');
  let scrolling = false;
  const look = (where) => {
    const BR = body.getBoundingClientRect(), S = stick && vis(stick) && getComputedStyle(stick).position === 'sticky' ? stick.getBoundingClientRect() : null;
    for (const e of leaves) {
      const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      // (cut at a side of the card, or its words wider than their box)
      if (r.left < R.left - 1 || r.right > R.right + 1) out.push(['cut at the side', words(e), where]);
      const cs = getComputedStyle(e);
      if (e.scrollWidth > e.clientWidth + 2 && cs.overflowX !== 'visible' && e.clientWidth > 0) out.push(['words cut in their box', words(e), where]);
      // (squashed: its box shorter than its words)
      // (an emoji's glyph a little taller than its line is fine; words spilling out of a box that hides them, or over the next thing, aren't)
      if (e.scrollHeight > e.clientHeight + 3 && e.clientHeight > 0 && cs.display !== 'inline' && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll' && words(e).length > 3) {
        const rg = document.createRange(); rg.selectNodeContents(e); const tr = rg.getBoundingClientRect();
        if (cs.overflowY !== 'visible' || tr.bottom > r.bottom + 4) out.push(['squashed', words(e), e.className, Math.round(tr.bottom - r.bottom), where]);
      }
      // (in sight in the card's scrolling part: under the buttons kept at the bottom, or under anything else)
      const inBody = body.contains(e) && !(stick && stick.contains(e));
      if (inBody && r.top >= BR.top - 1 && r.bottom <= BR.bottom + 1) {
        // (at the top, what goes on below the buttons is simply further down, faded to say so; scrolled to the bottom, nothing's left under them)
        if (S && r.bottom > S.top + 1 && r.top < S.bottom && (where === 'bottom' || !scrolling)) out.push(['under the buttons', words(e), where]);
        for (const fy of [0.3, 0.7]) {
          const x = Math.min(r.right - 3, r.left + Math.min(40, r.width / 2)), y = r.top + r.height * fy, hit = document.elementFromPoint(x, y);
          if (hit && hit !== e && !e.contains(hit) && !hit.contains(e) && !(S && stick.contains(hit) && r.bottom > S.top)) { out.push(['covered', words(e), (hit.className || hit.tagName) + '', where]); break; }
        }
      }
    }
    for (const btn of s.querySelectorAll('button')) if (vis(btn) && btn.scrollWidth > btn.clientWidth + 2) out.push(['button words cut', words(btn), where]);
  };
  scrolling = body.scrollHeight > body.clientHeight + 2;
  body.scrollTop = 0; look('top');
  const scrolls = scrolling;
  // (more below: the fade says so)
  if (body.scrollHeight > body.clientHeight + 4 && !s.classList.contains('gmore') && !/gcongrats|gwelcome/.test(s.className)) out.push(['more below, but no fade to say so', body.scrollHeight - body.clientHeight]);
  if (scrolls) { body.scrollTop = body.scrollHeight; look('bottom'); body.scrollTop = 0; }
  const mid = (R.left + R.right) / 2;
  return { kind: [...s.classList].join(' '), title: (s.querySelector('h2') || {}).textContent, out, scrolls, centred: Math.abs(mid - W / 2) < 24, right: R.right > W - 40, R: [R.left, R.top, R.right, R.bottom], rad: parseFloat(getComputedStyle(s).borderBottomLeftRadius) || 0 };
};
for (const L of LANGS) for (const [W, H] of SIZES) {
  const tag = `${L} ${W}x${H}`;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: LOC[L], deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__T = new Date('2026-11-06T10:00:00Z').getTime(); Date.now = () => window.__T; });
  await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:00`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 }); await p.waitForTimeout(600);
  const report = async (name, a) => {
    checked++;
    if (!a) { bad(`${tag} ${name}: did not open`, {}); return; }
    const wantMid = CENTER.some(k => a.kind.split(' ').includes('g' + k)) || a.kind.includes('gcenter');
    const issues = [...a.out];
    if (/gcenter/.test(a.kind) && !a.centred) issues.push(['a message, not in the middle']);
    if (!/gcenter|gwelcome/.test(a.kind) && !a.right) issues.push(['not on the right']);
    // (its bottom corners round, as drawn: nothing cream painted out into them, 7 Nov, Audrey: "Still cut")
    if (a.rad >= 12) for (const [cx, cy] of [[a.R[0] + 1, a.R[3] - 2], [a.R[2] - 3, a.R[3] - 2]]) {
      const px = await p.screenshot({ clip: { x: Math.max(0, cx), y: Math.max(0, cy), width: 2, height: 1 } });
      const png = await p.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return [...x.getImageData(0, 0, 1, 1).data]; }, px.toString('base64'));
      if (png[0] > 248 && png[1] > 246 && png[2] > 238) { issues.push(['a square corner at the bottom', png.slice(0, 3)]); break; }
    }
    if (issues.length) { bad(`${tag} ${name}`, { title: a.title, issues: issues.slice(0, 6) }); await p.screenshot({ path: `${OUT}/${L}_${W}x${H}_${name}.png` }); }
  };
  await report('welcome', await p.evaluate(AUDIT));
  await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.waitForTimeout(500);
  // the first-day cards, each
  for (let i = 0; i < 5; i++) {
    const a = await p.evaluate(AUDIT); if (!a || !/gintro/.test(a.kind)) break;
    await report('intro' + (i + 1), a);
    await p.evaluate(() => { const n = [...document.querySelectorAll('.gsheet .gbtn')].find(x => !x.classList.contains('galt')); if (n) n.click(); });
    await p.waitForTimeout(300);
  }
  // a farm with things going on: level 12, coins, a Glutton among the hens (her apples on her card)
  await p.evaluate(() => { const f = window.__farm, g = f.game(); f.pause(true); if (f.gameUI().isOpen) f.gameUI().close();
    g.data.guide = { step: 5, done: true }; g.data.xp = Math.round(60 * Math.pow(11, 2.1)) + 5; g.data.coins = 12345; const h = g.data.birds.find(x => x.sex === 'h' && x.pers === 'rebel'); if (h) h.pers = 'glutton'; g.save(); f.gameUI().refresh(); });
  const G = 'window.__farm.game()', U = 'window.__farm.gameUI()';
  const cards = [
    ['hen', `(() => { const g = ${G}, b = g.data.birds.find(x => x.pers === 'glutton') || g.data.birds[1]; ${U}.birdCard(b); })()`],
    ['rooster', `${U}.birdCard(${G}.data.birds.find(x => x.sex === 'r'))`],
    ['chick', `(() => { const g = ${G}, c = g.data.coops[0], m = g.data.birds.find(x => x.sex === 'h'); ${U}.chickCard('Nutmeg', c, m, 5400e3, null); })()`],
    ['young', `(() => { const g = ${G}, c = g.data.coops[0], m = g.data.birds.find(x => x.sex === 'h'); ${U}.youngCard('Nutmeg', 'h', c, m, 5400e3, null); })()`],
    ['coop', `${U}.coopCard(${G}.data.coops[0], () => {}, () => {})`],
    ['feeder', `${U}.feederSheet(${G}.data.coops[0], () => {})`],
    ['land', `${U}.landCard(3, () => {})`],
    ['level', `${U}.levelSheet()`],
    ['levelup', `${U}.levelUpCard(12, null, () => {}, [], null)`],
    ['coops', `${U}.coopsSheet({})`],
    ['book', `${U}.bookSheet({})`],
    ['shows', `${U}.showsSheet({})`],
    ['showday', `${U}.showDayCard('Harvest Fair', () => {}, () => {})`],
    ['showres', `(() => { const g = ${G}, h = g.data.birds.find(x => x.sex === 'h'), r = g.data.birds.find(x => x.sex === 'r'); ${U}.showResults([{ bird: h.id, place: 1, id: 'c20261106', coins: 120, xp: 30 }, { bird: r.id, place: 2, id: 'b20261106', coins: 60, xp: 20 }, { bird: h.id, place: 7, id: 'v20261106', coins: 0, xp: 5 }]); })()`],
    ['jobs', `${U}.jobsSheet({})`],
    ['shop', `${U}.shopSheet({}, 'decor')`],
    ['shop2', `${U}.shopSheet({}, 'animals')`],
    ['shop3', `${U}.shopSheet({}, 'dress')`],
    ['wheat', `${U}.wheatSheet({})`],
    ['decor', `${U}.decorCard('beehives', () => {})`],
    ['dock', `${U}.dockCard({ water: 'pond' }, {})`],
    ['fish', `${U}.fishCard({ id: 'big_bertha', cm: 84, water: 'river', rare: 1, legend: false, first: true, best: false, coins: 160, xp: 40, n: 1 }, () => {})`],
    ['fox', `(() => { const g = ${G}; ${U}.foxCard({ key: '20261105', coop: g.data.coops[0].id, t: window.__T - 6e6, by: 'brave', open: true, eggs: 0 }, { watch() {} }); })()`],
    ['rare', `(() => { const g = ${G}; ${U}.rareCard({ id: 'r1', coop: g.data.coops[0].id, line: 'sil_blue', sex: 'h', stars: 4 }); })()`],
    ['congrats', `(() => { const g = ${G}, h = g.data.birds.find(x => x.sex === 'h'), r = g.data.birds.find(x => x.sex === 'r'); ${U}.congratsCard({ hen: h.id, dad: r.id, coop: g.data.coops[0].id, coins: 240, xp: 46, kids: [{ sex: 'h', stars: 3, coins: 80 }, { sex: 'r', stars: 2, coins: 70 }, { sex: 'h', stars: 5, coins: 90 }] }, true); })()`],
    ['away', `(() => { const g = ${G}, h = g.data.birds.find(x => x.sex === 'h'); ${U}.awayCard({ away: 2 * 86400e3 + 5 * 3600e3, paused: true, eggs: 14, items: [{ k: 'eggs', n: 14 }, { k: 'full', n: 2 }, { k: 'hatched', name: h.name, n: 3 }, { k: 'grown', name: h.name }, { k: 'honey', n: 4 }, { k: 'feathers', n: 2 }, { k: 'apple_egg', n: 1 }, { k: 'wheat_grow', ms: 4440e3 }, { k: 'feed', coop: g.coopName(g.data.coops[0]) }, { k: 'feed_low', coop: g.coopName(g.data.coops[0]) }, { k: 'show' }, { k: 'jobs_ready', n: 3 }] }, { collectAll() {} }); })()`],
    ['away1', `(() => { ${U}.awayCard({ away: 2 * 3600e3 + 46 * 60e3, eggs: 0, items: [{ k: 'wheat_grow', ms: 74 * 60e3 }] }, { collectAll() {} }); })()`],
    ['coins', `${U}.coinSheet()`],
    ['acctask', `${U}.accountNudge()`],
    ['notesask', `${U}.notesAsk()`],
    ['twofarms', `${U}.twoFarms({ name: 'Rosie', look: 'f', lv: 12, coins: 12345, seen: window.__T - 3600e3 }, { name: 'Arthur', look: 'm', lv: 9, coins: 4321, at: window.__T - 86400e3, seen: window.__T - 86400e3 })`],
    ['paydemo', `${U}.payDemo({ what: 'Four Silkie colours', price: 19.99 })`],
    ['thanksdemo', `${U}.thanksDemo('Four Silkie colours are yours')`],
    ['settings', `${U}.settings()`],
  ];
  for (const [name, js] of cards) {
    await p.evaluate(() => { const u = window.__farm.gameUI(); if (u.isOpen || u.kind) u.close(); });
    const err = await p.evaluate(`void (${js})`).then(() => null).catch(e => e.message.split('\n')[0]);
    if (err) { bad(`${tag} ${name}: error opening it`, err); continue; }
    await p.waitForTimeout(120); await p.evaluate(() => document.getAnimations().forEach(a => a.finish())); await p.waitForTimeout(150);
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
    await report(name, await p.evaluate(AUDIT));
  }
  await p.evaluate(() => { const u = window.__farm.gameUI(); u.close(); });
  // the hint, the label over a tapped thing and the first day's guide, with the longest words there are
  const strip = await p.evaluate(() => {
    const f = window.__farm, g = f.game(), out = [], W = innerWidth, H = innerHeight;
    const T = g.texts ? g.texts() : null;
    const long = ['apple_planted', 'apple_laid', 'apple_tree0', 'apple_egg_wait', 'worms_shy', 'fish_noworms', 'wheat_sowed', 'up_busy'].map(k => g.t(k, { name: 'Marguerite', farmer: 'Rosie', t: '2 h 59 min', n: 3, c: 120, coop: 'The Red Barn' }));
    const labels = f.labelWords ? f.labelWords() : [];
    const hint = document.getElementById('hint'), tag = document.getElementById('tag');
    const both = [...long.map(t => [t, 'hint']), ...long.map(t => [t, 'label']), ...labels.map(t => [t, 'label'])];
    for (const [t, nm] of both) {
      for (const e of [nm === 'hint' ? hint : tag]) {
        e.textContent = t; e.classList.add('on'); if (nm === 'label') f.labelAt(0.97, 0.5);
        const r = e.getBoundingClientRect();
        if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) out.push([nm + ' off the screen', t.slice(0, 40), [r.left, r.top, r.right, r.bottom].map(Math.round)]);
        if (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) out.push([nm + ' cut', t.slice(0, 40)]);
        e.classList.remove('on');
      }
    }
    return out;
  });
  checked++;
  if (strip.length) bad(`${tag} hint and label`, strip.slice(0, 4));
  // ---- the other pop-ups (7 Nov 2026, Audrey: "Did you run the audit across all the pop up"): the first day's guide card
  // with each of its lines, the bubbles over the farm with their longest words, the bar for moving a coop or a decoration
  // with each of its messages, the buttons over a tapped hen, the dog's and the farmer's; each on the screen, its words
  // whole, clear of the bar at the top and the buttons in the corner
  const others = await p.evaluate(() => {
    const f = window.__farm, g = f.game(), ui = f.gameUI(), W = innerWidth, H = innerHeight, out = [];
    const v = { name: 'Marguerite', farmer: 'Rosie', t: '2 h 59 min', n: 3, of: 5, c: 120, coop: 'The Red Barn', names: 'Bartholomew, Wilhelmina and Clementine' };
    const keep = [...document.querySelectorAll('.gstat, .gacts, .gbar > .ggear')].map(e => e.getBoundingClientRect());
    const overlap = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const check = (e, what, mustClear = true) => {
      const r = e.getBoundingClientRect(); if (!r.width) { out.push([what, 'not shown']); return; }
      if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.push([what, 'off the screen', [r.left, r.top, r.right, r.bottom].map(Math.round)]);
      for (const x of [e, ...e.querySelectorAll('*')]) {
        if (!x.getClientRects().length) continue;
        const cs = getComputedStyle(x);
        if (x.scrollWidth > x.clientWidth + 2 && cs.overflowX !== 'visible' && x.clientWidth > 0) out.push([what, 'words cut', (x.textContent || '').slice(0, 40)]);
        if (x.tagName === 'BUTTON' && x.scrollWidth > x.clientWidth + 2) out.push([what, 'button words cut', x.textContent.slice(0, 40)]);
      }
      if (mustClear) for (const k of keep) if (overlap(r, k)) { out.push([what, 'over the buttons at the top or in the corner', [r.left, r.top, r.right, r.bottom].map(Math.round)]); break; }
    };
    // the guide card, each line
    const gk = ['guide_cuddle', 'guide_cuddle_card', 'guide_eggs', 'guide_eggs_wait', 'guide_jobs', 'guide_sow', 'guide_sow_card', 'guide_shop', 'guide_did', 'guide_done'];
    for (const k of gk) { const c = f.guideSay(g.t(k, v), g.t('guide_n', v)); check(c, 'guide card · ' + k); }
    f.guideOff();
    // the bubbles over the farm, the longest words
    const bub = document.createElement('button'); bub.className = 'gbub'; document.body.append(bub);
    for (const t of ['🪧 ' + g.t('bub_sale') + ' · 10,000', '🌱 2 h 59 min', '🌾 ' + g.t('bub_harvest'), '🌾 ' + g.t('bub_empty'), '🌾 ' + g.t('bub_low'), '🌾 ' + g.t('bub_sow'), '🍯 6']) {
      bub.textContent = t; bub.style.left = W / 2 + 'px'; bub.style.top = H / 2 + 'px';
      const r = bub.getBoundingClientRect(); if (r.width > W * 0.6) out.push(['bubble', 'wider than a bubble should be', t]);
      if (r.height > 52) out.push(['bubble', 'on more than one line', t, Math.round(r.height)]);
      check(bub, 'bubble · ' + t, false);
    }
    bub.remove();
    // the move bar, each message
    ui.moveBar(true, { turn() {}, cancel() {}, place() {} });
    for (const k of ['move_hint', 'move_ok', 'move_clear', 'move_land', 'move_lane', 'move_room', 'move_coop', 'move_gate', 'dec_bad_way', 'dec_ok_clear']) { ui.moveStatus(g.t(k, v), k === 'move_ok'); check(document.querySelector('.gmove'), 'move bar · ' + k, false); }
    ui.moveBar(false);
    // the buttons over a tapped hen, the dog's, the farmer's
    const w = f.bottomWords();
    const hb = document.getElementById('henbtns'), cu = document.getElementById('cuddlebtn'), fi = document.getElementById('feedbtn');
    if (hb && cu && fi) { cu.textContent = w.cuddle; fi.textContent = w.fill; hb.hidden = false; check(hb, 'buttons over a hen'); hb.hidden = true; }
    const db = document.getElementById('dogbtn'); if (db) { db.textContent = w.dog; db.hidden = false; check(db, 'the dog\'s button'); db.hidden = true; }
    const fb = document.getElementById('farmerbtn'); if (fb && w.farmer) { fb.textContent = w.farmer; fb.hidden = false; check(fb, 'the farmer\'s button'); fb.hidden = true; }
    return out;
  });
  checked++;
  if (others.length) bad(`${tag} the other pop-ups`, others.slice(0, 6));
  // ---- grandma's story: each card's line in its box on the screen, clear of Skip, the dots and Next
  await p.evaluate(() => { window.__farm.gameUI().story(); });
  for (let i = 0; i < 4; i++) {
    await p.waitForTimeout(250); await p.evaluate(() => document.getAnimations().forEach(a => { if (a.animationName !== 'gsken') a.finish(); }));
    const st = await p.evaluate(() => {
      const b = document.querySelector('.gstory'); if (!b) return null;
      const W = innerWidth, H = innerHeight, cap = b.querySelector('.gstory-cap').getBoundingClientRect(), t = b.querySelector('.gstory-text'), foot = b.querySelector('.gstory-foot').getBoundingClientRect(), skip = b.querySelector('.gstory-skip').getBoundingClientRect(), out = [];
      const overlap = (a, c) => a.left < c.right - 1 && a.right > c.left + 1 && a.top < c.bottom - 1 && a.bottom > c.top + 1;
      if (cap.left < 0 || cap.top < 0 || cap.right > W || cap.bottom > H) out.push('its line off the screen');
      if (overlap(cap, foot) || overlap(cap, skip)) out.push('its line under Skip or Next');
      if (t.scrollHeight > t.clientHeight + 2 || t.scrollWidth > t.clientWidth + 2) out.push('its words cut');
      for (const btn of b.querySelectorAll('button')) if (btn.scrollWidth > btn.clientWidth + 2) out.push('button words cut: ' + btn.textContent);
      const on = [...b.querySelectorAll('img')].findIndex(x => x.classList.contains('on'));
      return { on, out, n: b.querySelectorAll('img').length };
    });
    checked++;
    if (!st) { bad(`${tag} story: did not open`, {}); break; }
    if (st.out.length) { bad(`${tag} story card ${st.on + 1}`, st.out); await p.screenshot({ path: `${OUT}/${L}_${W}x${H}_story${st.on + 1}.png` }); }
    if (st.on >= st.n - 1) break;
    await p.click('.gstory-next');
  }
  await p.evaluate(() => { const s = document.querySelector('.gstory-skip'); if (s) s.click(); });
  if (errs.length) bad(`${tag}: page errors`, errs.slice(0, 3));
  console.log(`${tag}: done (${problems.length} problems so far)`);
  await ctx.close();
}
console.log(`\n${checked} checked`);
if (problems.length) { console.log(problems.length + ' PROBLEMS'); fs.writeFileSync(OUT + '/problems.txt', problems.join('\n') + '\n'); }
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

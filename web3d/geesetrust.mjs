// The geese's trust (release 3; Audrey: "A gate in their fence", "About a week", "Cuddles, hearts, a little XP", "They greet
// him", "Braver guards"): ./withserver.sh node geesetrust.mjs   (LANG=fr: in French with Rosie; W, H: the screen; SHOTS: a
// folder for pictures)
// A level-4 farm whose geese came 9 days ago. Checks: a gate in the fence of each of the pond's wild fields, shut; a real
// tap on a goose opens their card (Cross, what it means, 3 more days of visits, "Visit them"); a visit counts (+3 XP) and
// the farmer goes to the gate on their side, in, says hello, and they come at him hissing: he runs out through the gate
// (it shuts behind him), his hat knocked off and landing outside, picked up and put back on, while they parade by the
// gate; nobody ever through the fence or on anything, the geese never out of their field. Again the same day: it doesn't
// count. Day by day: Wary from the 3rd (a hiss from afar, the corn eaten once he's stepped back, never a chase), Curious
// from the 5th (the corn eaten by his feet, a look up at him), Friends from the 7th (+23 XP; the card's "♥ Cuddle": they
// come to meet him, up to him for a stroke, hearts; a cuddle counts once every 6 hours); friends come to the gate to say
// hello and are braver guards (up sooner, Rusty sent off quicker). Saves changed outside the game are checked (trust past
// the days since they came, a day in the future, trust with no day, a cuddle's glow too long) and flagged; a real one isn't.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874), SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T10:00:00Z').getTime(), DAY = 86400e3;
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); p.setDefaultNavigationTimeout(120000);
const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T, true); f.gameUI().close(); });
};
const T = fr ? { cross: 'Fâchés', wary: 'Méfiants', curious: 'Curieux', friends: 'Amis', visit: 'Leur rendre visite', cuddle: '♥ Faire un câlin', next3: /Encore 3 jours de visites avant « Méfiants »/, body0: /ils sifflent et la chassent de leur pré/, today: /La visite d’aujourd’hui a compté/, title: /Gertrude et Hector, les oies/,
  visited: /Rosie va voir Gertrude et Hector\. \+3 XP/, again: /retourne voir Gertrude et Hector/, up1: /s’habituent à Rosie\. \+3 XP/, up2: /s’intéressent à Rosie/, up3: /ont confiance en Rosie ! \+23 XP/, cuddled: /Rosie fait un câlin à Gertrude et Hector ♥ \+1 XP/, happy: /Heureux après un câlin/,
  hello: 'Coucou, vous deux !', whoa: 'Oh là là !', tomorrow: 'Demain, peut-être…', corn: 'Du grain pour vous !' }
  : { cross: 'Cross', wary: 'Wary', curious: 'Curious', friends: 'Friends', visit: 'Visit them', cuddle: '♥ Cuddle', next3: /3 more days of visits to “Wary”/, body0: /they hiss and chase him out of their field/, today: /Today’s visit has counted/, title: /Gertrude and Hector, the geese/,
  visited: /Arthur goes to see Gertrude and Hector\. \+3 XP/, again: /goes to see Gertrude and Hector again/, up1: /getting used to Arthur\. \+3 XP/, up2: /curious about Arthur now/, up3: /trust Arthur now! \+23 XP/, cuddled: /Arthur gives Gertrude and Hector a cuddle ♥ \+1 XP/, happy: /Happy after a cuddle/,
  hello: 'Hello, you two!', whoa: 'Whoa!', tomorrow: 'Maybe tomorrow…', corn: 'Some corn for you!' };
let shotN = 0;
const shot = async name => { if (!SHOTS) return; await p.evaluate(() => window.__farm.draw()); await p.screenshot({ path: `${SHOTS}/trust_${fr ? 'fr' : 'en'}_${W}x${H}_${String(shotN++).padStart(2, '0')}_${name}.png`, timeout: 180000 }); };
// a visit from the card's button, watched to its end: everyone's whereabouts every half second; marks of what happened
const watchVisit = (secs = 90) => p.evaluate(secs => {
  const f = window.__farm, F = f.geese(), L = f.farmer(), nav = f.nav(), gates = f.geeseTrust.gates(), pond = new Set(gates.map(g => g.field));
  const out = { blocked: 0, offField: 0, farmerIn: 0, farmerOff: 0, hatOff: false, hatOn: true, flee: false, charged: false, hissed: false, ate: 0, look: false, stroke: false, hearts: 0, minD: 9, gateOpened: false, gateShut: false, chaseD: 9, said: [], at: [], phases: [], done: false, t: 0, insideMax: 0 };
  const hearts0 = f.heartsLive ? f.heartsLive() : 0;
  const pondIn = (g) => { const dx = g.pos.x - F.pc[0], dz = g.pos.z - F.pc[1], lu = Math.sqrt(F.lu2) + 0.55, lv = Math.sqrt(F.lv2) + 0.55; return ((dx * F.pu[0] + dz * F.pu[1]) / Math.sqrt(F.lu2) / lu) ** 2 + ((dx * F.pv[0] + dz * F.pv[1]) / Math.sqrt(F.lv2) / lv) ** 2 <= 1; };
  let started = false;
  const tn = () => L.task ? L.task.name + (L.task.list ? '@' + L.task.i + ':' + (L.task.list[L.task.i] && L.task.list[L.task.i].name) : '') : '-';
  for (let i = 0; i < secs * 30; i++) {
    window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1);
    const V = f.geeseTrust.V();
    if (V) started = true;
    if (V && V.phase && out.phases[out.phases.length - 1] !== V.phase) out.phases.push(V.phase);
    for (const g of F.geese) {
      const fl = f.fieldAt(g.pos.x, g.pos.z);
      if (!pondIn(g) && !nav.freeAt(g.pos.x, g.pos.z) && !F.bed.some(bd => Math.hypot(bd[0] - g.pos.x, bd[1] - g.pos.z) < 0.56)) { out.blocked++; if (out.at.length < 4) out.at.push([g.name, g.act, +g.pos.x.toFixed(2), +g.pos.z.toFixed(2)]); }
      if (fl >= 0 && !pond.has(fl) && F.pondAt(g.pos.x, g.pos.z)[0] > 1.3) out.offField++;
      if (g.act === 'charge') out.charged = true; if (g.act === 'hiss') out.hissed = true;
      const d = Math.hypot(g.pos.x - L.pos.x, g.pos.z - L.pos.z);
      if (V && V.inside && V.phase !== 'wary') { if (d < out.minD) { out.minD = d; out.minAt = [V.phase, g.name, g.act, tn()]; } if (g.act === 'charge') out.chaseD = Math.min(out.chaseD, d); }
    }
    if (V && V.eaten) out.ate++;
    if (F.geese[0].act === 'look' && F.geese[0].A.tiltGoal > 0.3) out.look = true;
    if (V && V.phase === 'stroke') out.stroke = true;
    // the farmer: never on anything, except going through a gate (as into a pen); in their field only on a visit
    const lf = f.fieldAt(L.pos.x, L.pos.z), inGate = gates.some(g => Math.hypot(L.pos.x - g.p[0], L.pos.z - g.p[1]) < 0.9);
    if (!L.home && !nav.freeAt(L.pos.x, L.pos.z) && !inGate && !L.pen && !f.onBridge(L.pos.x, L.pos.z)) { out.farmerOff++; if (out.at.length < 6) out.at.push(['F', tn(), +L.pos.x.toFixed(2), +L.pos.z.toFixed(2)]); }
    if (pond.has(lf)) { out.farmerIn++; if (!(V && V.inside) && !inGate) { out.farmerOff++; if (out.at.length < 6) out.at.push(['Fin', tn(), +L.pos.x.toFixed(2), +L.pos.z.toFixed(2), lf]); } }
    if (L.hat) { out.hatOff = true; out.hatOn = false; } else if (out.hatOff) out.hatOn = true;
    if (L.task && L.task.list && L.task.list[L.task.i] && L.task.list[L.task.i].name === 'flee') out.flee = true;
    const op = gates.map((g, k) => f.geeseTrust.gates()[k].open); if (op.some(o => o > 0.95)) out.gateOpened = true;
    if (out.gateOpened && op.every(o => o === 0)) out.gateShut = true;
    for (const k of L.said) if (!out.said.includes(k)) out.said.push(k);
    if (started && !V && !L.pen) { out.done = true; out.t = i / 30; break; }
  }
  out.hearts = (f.heartsLive ? f.heartsLive() : 0) - hearts0;
  out.hatPos = L.f.rig.hatWorld ? 'off' : 'on';
  sessionStorage.setItem('__T', window.__T);
  return out;
}, secs);
const card = () => p.evaluate(() => { const s = document.querySelector('.gsheet'); return s && !s.hidden ? { text: s.innerText, btn: [...s.querySelectorAll('.gbtn')].map(x => x.textContent) } : null; });
const tapVisit = async () => { await p.evaluate(() => [...document.querySelectorAll('.gsheet .gbtn')].find(x => x.classList.contains('gcuddle')).click()); return p.evaluate(() => document.getElementById('hint').textContent); };
const st = () => p.evaluate(() => { const g = window.__farm.game(); return { xp: g.data.xp, trust: g.geeseTrust(), edited: g.edited, saved: JSON.stringify(g.data.animals) }; });
const nextDay = (h = 10) => p.evaluate(h => { const d = new Date(window.__T); d.setDate(d.getDate() + 1); d.setHours(h, 0, 0, 0); window.__T = d.getTime(); sessionStorage.setItem('__T', window.__T); window.__farm.step(1 / 30, 2); }, h);

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 }); await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(fr => { const g = window.__farm.game(); g.data.xp = Math.round(60 * Math.pow(3, 2.1)) + 50; g.data.lvSeen = 4; g.data.land = [0, 1, 2, 3]; g.data.guide = { step: 5, done: true }; g.data.animals = { geese: { at: window.__T - 9 * 86400e3 } }; g.data.lastSeen = window.__T - 60e3; if (fr) { g.data.farmer.look = 'f'; g.data.farmer.name = 'Rosie'; } g.save(); sessionStorage.setItem('__T', window.__T); }, fr);
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
// the gates
const gates = await p.evaluate(() => { const f = window.__farm; return { list: f.geeseTrust.gates(), wild: f.game().data.land.length }; });
ok('a gate in the fence of each of the pond\'s wild fields (10 and 14), shut, the farmer\'s places by it on clear ground', gates.list.length === 2 && gates.list.every(g => g.field >= gates.wild && g.open === 0) && new Set(gates.list.map(g => g.reg)).size === 2, gates.list.map(g => [g.field, g.p, g.reg]));
const gcheck = await p.evaluate(() => { const f = window.__farm, nav = f.nav(); return f.geeseTrust.gates().map(g => [g.out, g.gin, g.meet, g.front, g.flee, g.hatAt].every(q => nav.freeAt(q[0], q[1])) && !nav.freeAt(g.p[0], g.p[1])); });
ok('…the gate itself shut on the grid (nobody else gets through), all round it clear', gcheck.every(Boolean), gcheck);
// a real tap on a goose: the card
const sp = await p.evaluate(() => { const f = window.__farm, G = f.geese().geese[0]; f.lookAt(G.pos.x, G.pos.z, 2.2); f.step(1 / 30, 2); f.draw(); return f.screenOf(G.pos.x, G.pos.z, G.pos.y + G.hitY); });
await p.touchscreen.tap(sp.x, sp.y); await p.evaluate(() => window.__farm.step(1 / 30, 3));
let c = await card();
await shot('card_cross');
ok('a tap on a goose: their card: Cross, what it means, 3 more days of visits to Wary, "Visit them"', c && T.title.test(c.text) && c.text.includes(T.cross) && T.body0.test(c.text) && T.next3.test(c.text) && c.btn.includes(T.visit), c);
// the first visit
let s0 = await st(), hintText = await tapVisit(), s1 = await st();
ok('"Visit them": it counts (+3 XP, trust 1, today), the card closed, the hint says so', s1.xp - s0.xp === 3 && s1.trust.n === 1 && s1.trust.today && !(await card()) && T.visited.test(hintText), { xp: s1.xp - s0.xp, trust: s1.trust, hintText });
let r = await watchVisit(100);
await shot('after_cross');
ok('cross: in through the gate (opened, shut after), "Hello, you two!", they come at him hissing; "Whoa!", he runs out', r.done && r.gateOpened && r.gateShut && r.hissed && r.charged && r.flee && r.said.includes('geese') && r.said.includes('whoa') && r.phases.join() === 'chase,charge', r);
ok('…his hat knocked off as he goes, picked up and back on his head ("Maybe tomorrow…")', r.hatOff && r.hatOn && r.hatPos === 'on' && r.said.includes('tomorrow'), { hatOff: r.hatOff, hatOn: r.hatOn, said: r.said });
ok('…they never quite reach him (a nip at the air), never through the fence or on anything, never out of their field; he only in it on his visit', r.chaseD > 0.55 && r.blocked === 0 && r.offField === 0 && r.farmerOff === 0 && r.farmerIn > 0, { chaseD: r.chaseD, blocked: r.blocked, at: r.at, offField: r.offField, farmerOff: r.farmerOff, farmerIn: r.farmerIn });
// again the same day
await p.evaluate(() => window.__farm.geeseTrust.card()); c = await card();
ok('the card again: "Today’s visit has counted"', c && T.today.test(c.text), c && c.text);
s0 = await st(); hintText = await tapVisit(); s1 = await st();
ok('a second visit the same day: no count, no XP ("again")', s1.xp === s0.xp && s1.trust.n === 1 && T.again.test(hintText), { trust: s1.trust, hintText });
await watchVisit(100);
// day 2: a visit (2), day 3: Wary
await nextDay(); s0 = await st(); await p.evaluate(() => window.__farm.geeseTrust.card()); hintText = await tapVisit(); await watchVisit(100);
await nextDay(); s0 = await st(); await p.evaluate(() => window.__farm.geeseTrust.card()); hintText = await tapVisit(); s1 = await st();
ok('day 3: Wary ("getting used to", +3 XP)', s1.trust.level === 1 && s1.trust.n === 3 && T.up1.test(hintText) && s1.xp - s0.xp === 3, { trust: s1.trust, hintText });
r = await watchVisit(110);
await shot('after_wary');
ok('wary: a hiss from afar, never a chase; corn ("Some corn for you!") eaten once he\'s stepped back, well back from him; nobody on anything', r.done && r.hissed && !r.charged && r.ate > 0 && r.said.includes('corn') && r.minD > 1.0 && r.phases.join() === 'wary,back' && r.blocked === 0 && r.offField === 0 && r.farmerOff === 0, { done: r.done, hissed: r.hissed, charged: r.charged, ate: r.ate, minD: r.minD, minAt: r.minAt, phases: r.phases, blocked: r.blocked, farmerOff: r.farmerOff, at: r.at });
// days 4, 5: Curious
await nextDay(); await p.evaluate(() => window.__farm.geeseTrust.card()); await tapVisit(); await watchVisit(110);
await nextDay(); s0 = await st(); await p.evaluate(() => window.__farm.geeseTrust.card()); hintText = await tapVisit(); s1 = await st();
ok('day 5: Curious', s1.trust.level === 2 && T.up2.test(hintText), { trust: s1.trust, hintText });
r = await watchVisit(110);
await shot('after_curious');
ok('curious: corn at his feet eaten close by him (a step clear), a look up at him; never a hiss or a chase', r.done && r.ate > 0 && r.minD < 1.6 && r.minD > 0.45 && r.look && !r.charged && r.blocked === 0 && r.offField === 0, { done: r.done, ate: r.ate, minD: r.minD, minAt: r.minAt, look: r.look, charged: r.charged, blocked: r.blocked });
// days 6, 7: Friends
await nextDay(); await p.evaluate(() => window.__farm.geeseTrust.card()); await tapVisit(); await watchVisit(110);
await nextDay(); s0 = await st(); await p.evaluate(() => window.__farm.geeseTrust.card()); hintText = await tapVisit(); s1 = await st();
ok('day 7: Friends (+23 XP)', s1.trust.level === 3 && s1.trust.n === 7 && T.up3.test(hintText) && s1.xp - s0.xp === 23, { trust: s1.trust, hintText, xp: s1.xp - s0.xp });
r = await watchVisit(110);
await shot('after_friends');
ok('friends: they come to meet him and up to him for a stroke, hearts; a step clear of him', r.done && r.stroke && r.hearts >= 6 && r.minD > 0.45 && r.minD < 1.1 && !r.charged && !r.hissed && r.blocked === 0, { done: r.done, stroke: r.stroke, hearts: r.hearts, minD: r.minD, minAt: r.minAt, charged: r.charged, hissed: r.hissed });
await p.evaluate(() => window.__farm.geeseTrust.card()); c = await card();
ok('their card: Friends, "Happy after a cuddle" (the day-7 visit was the first cuddle)', c && c.text.includes(T.friends) && T.happy.test(c.text), c);
await p.evaluate(() => window.__farm.gameUI().close());
await p.evaluate(() => { window.__T += 6.2 * 3600e3; sessionStorage.setItem('__T', window.__T); window.__farm.setHour && window.__farm.setHour(16.3); window.__farm.step(1 / 30, 2); });
await p.evaluate(() => window.__farm.geeseTrust.card()); c = await card();
s0 = await st(); hintText = c && c.btn.includes(T.cuddle) ? await tapVisit() : ''; s1 = await st();
ok('six hours on: "♥ Cuddle", +1 XP', c && c.btn.includes(T.cuddle) && s1.xp - s0.xp === 1 && T.cuddled.test(hintText), { btn: c && c.btn, hintText, xp: s1.xp - s0.xp });
await watchVisit(110);
// friends: a hello at the gate; braver guards
const gr = await p.evaluate(() => {
  const f = window.__farm, F = f.geese(), G = F.geese[0], gs = f.geeseTrust.gates(), started = f.geeseTrust.greet();
  let near = 9, honk = false;
  for (let i = 0; i < 30 * 60; i++) { f.step(1 / 30, 1); for (const g of gs) near = Math.min(near, Math.hypot(G.pos.x - g.gin[0], G.pos.z - g.gin[1])); if (G.act === 'honk') honk = true; if (honk && near < 0.6) break; }
  F.guarding = true; const al = f.geeseTrust.alarm(); F.guarding = false;
  return { started, near: +near.toFixed(2), honk, brave: f.geeseTrust.brave(), quick: al && al.quick };
});
ok('friends: over to their gate to say hello (a honk); braver guards (the alarm quicker)', gr.started && gr.near < 0.6 && gr.honk && gr.brave && gr.quick, gr);
// a reload: as it was, not flagged
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s1 = await st();
ok('a reload: their trust as it was, not flagged', s1.trust.n === 7 && s1.trust.level === 3 && !s1.edited, s1);
// saves changed outside
const tamper = async (geese) => { await p.evaluate(geese => { const g = window.__farm.game(); g.data.animals = { geese }; g.save(); }, geese); await p.reload({ waitUntil: 'domcontentloaded' }); await load(); return st(); };
const now = await p.evaluate(() => window.__T), dk = t => { const d = new Date(t); return '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
let tt = await tamper({ at: now - DAY, trust: 7, day: dk(now) });
ok('a changed save: Friends a day after they came: no more than a visit a day (flagged)', tt.trust.n <= 3 && tt.edited, tt);
tt = await tamper({ at: now - 9 * DAY, trust: 5, day: dk(now + 5 * DAY) });
ok('…a visit on a day still to come: none (flagged)', tt.trust.n === 0 && tt.edited, tt);
tt = await tamper({ at: now - 9 * DAY, trust: 4 });
ok('…trust with no day of visit: none (flagged)', tt.trust.n === 0 && tt.edited, tt);
tt = await tamper({ at: now - 9 * DAY, trust: 7, day: dk(now), happy: now + 30 * DAY });
ok('…a cuddle\'s glow for a month: six hours at most (flagged)', tt.trust.happy <= 6 * 3600e3 && tt.edited, tt);
tt = await tamper({ at: now - 9 * DAY, trust: 'lots', day: '<b>' });
ok('…nonsense: none (flagged)', tt.trust.n === 0 && tt.edited && !/</.test(tt.saved), tt);
ok('no page errors', errs.length === 0, errs.slice(0, 4));
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
await b.close();

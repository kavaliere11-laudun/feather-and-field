// The automatic doors (release 4; Audrey: "starting at cosy the coop door are automatic. They close automatically but
// sometimes, rarely, it doesn't work and that's when [Rusty] comes", "About once a month"): node doortest.mjs   (LANG=fr;
// W, H; PORT)
// A level-4 farm whose Red Barn is Cosy. A night its door works: once they're all in it shuts by itself (no moon to tap),
// saved shut; at 6:00 it opens by itself. A night it sticks: it stays open, a hint says so and its moon shows; that night
// Rusty comes for it (even on a night he wouldn't have); tapped, it's shut by hand and he'd find it shut. Another night it
// sticks with the farm shut: in the morning the card says the automatic door stuck open, and he took the nest's eggs;
// a reload keeps it, unflagged. A Snug coop's door is still the player's to shut. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const fr = process.env.LANG === 'fr', W = +(process.env.W || 402), H = +(process.env.H || 874);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London' });
const T0 = new Date('2026-10-26T11:00:00Z').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage(); p.setDefaultNavigationTimeout(120000);
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const URL = `http://localhost:${process.env.PORT || 8770}/play.html?q=0`;
const run = (secs, dt = 1 / 30) => p.evaluate(([s, dt]) => { const f = window.__farm; for (let i = 0; i < s / dt; i++) { window.__T = Math.round(window.__T + 1000 * dt); f.step(dt, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* */ } }); }, [secs, dt]);
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T, true); f.draw(); });
  await p.waitForTimeout(1500); await run(0.5);
};
const jump = t => p.evaluate(t => { window.__T = t; sessionStorage.setItem('__T', t); const d = new Date(t); window.__farm.setHour(d.getHours() + d.getMinutes() / 60); }, t);      // (the farm's hour with it)
const xpAt = L => Math.round(60 * Math.pow(L - 1, 2.1)) + 5;
const at = (t, h, m = 0) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime(); };
const st = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0], F = g.fox();
  return { tier: c.tier, auto: g.autoDoor(c), shut: g.doorShut(c), saved: c.shut || null, door: f.doorOf(0), hint: document.getElementById('hint').textContent, tonight: g.foxTonight(), last: F.last ? { ...F.last } : null, edited: g.edited, card: f.gameUI().kind, text: document.querySelector('.gsheet') && !document.querySelector('.gsheet').hidden ? document.querySelector('.gsheet').innerText : '', asleep: f.coopPlots().find(q => q.gc).birds.every(b => b.asleep || !b.root.visible) }; });
await p.goto(URL, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 60000 });
await p.tap('.gsheet .gbtn');
await load();
await p.evaluate(L4 => { const g = window.__farm.game(); g.data.xp = L4; g.data.lvSeen = 4; g.data.coins = 500; g.data.land = [0, 1, 2, 3]; g.data.guide = { step: 5, done: true }; g.data.coops[0].tier = 3; g.save(); }, xpAt(4));
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
await p.evaluate(() => window.__farm.gameUI().close());
// the nights to come: one it works (and no visit), two it sticks
const nights = await p.evaluate(() => { const g = window.__farm.game(), c = g.data.coops[0], out = { good: null, stuck: [] };
  for (let d = 1; d < 500 && out.stuck.length < 2; d++) { const t = new Date(window.__T); const ev = new Date(t.getFullYear(), t.getMonth(), t.getDate() + d, 21, 0).getTime();
    if (g.doorStuck(c, ev)) out.stuck.push(ev); else if (!out.good && !window.__farm.foxGame.nights(ev - 6 * 3600e3, 1).some(v => Math.abs(v.t - ev) < 12 * 3600e3)) out.good = ev; }
  return out; });
ok('a Cosy coop\'s door is automatic; nights it works, about one in thirty it sticks', nights.good && nights.stuck.length === 2, nights);
let s = await st();
ok('the Cosy Red Barn: an automatic door', s.tier === 3 && s.auto === true, s);
// a night it works: once they're all in, it shuts by itself
await jump(at(nights.good, 22, 46)); await run(25);
s = await st();
ok('a night it works: they\'re all in and it has shut by itself, no moon to tap, saved shut', s.asleep && s.door.goal === 0 && !s.door.badge && s.shut && s.saved, s);
await jump(at(nights.good + 86400e3, 6, 2)); await run(2);
s = await st();
ok('in the morning at 6:00 it opens by itself', s.door.goal === 1 && !s.saved, s);
// a night it sticks, the farm open
await jump(at(nights.stuck[0], 22, 46)); await run(25);
s = await st();
const re = fr ? /porte automatique du poulailler \(Grange rouge\) est restée coincée/ : /automatic door of the Red Barn has stuck open/;
ok('a night it sticks: they\'re in, it stays open, a hint says so, its moon shows', s.asleep && s.door.goal === 1 && s.door.badge && s.door.kind === 'moon' && re.test(s.hint) && !s.shut, s);
ok('that night Rusty comes for it (its door open)', s.tonight && s.tonight.open === true && s.tonight.coop === 'c1', s.tonight);
await p.evaluate(() => window.__farm.doorTapAt(0)); await run(1.5);
s = await st();
ok('tapped: shut by hand (saved), he\'d find it shut', s.door.goal === 0 && s.shut && s.saved && s.tonight && s.tonight.open === false, s);
// another night it sticks, the farm shut: in the morning, what happened
await p.evaluate(() => window.__farm.gameUI().close());
await jump(at(nights.stuck[1], 19, 0)); await run(1);
await p.evaluate(() => { const g = window.__farm.game(); for (const c of g.data.coops) { c.eggs = 3; c.lt = [window.__T - 3600e3, window.__T - 3500e3, window.__T - 3400e3]; delete c.shut; } g.save(); });
await jump(at(nights.stuck[1] + 86400e3, 8, 0)); await run(1.5);
s = await st();
const stuckRe = fr ? /Une porte automatique est restée coincée ouverte cette nuit/ : /An automatic door stuck open last night/, took = fr ? /a pris (\d+ œufs|un œuf)/ : /took (\d+ eggs|an egg)/;
ok('the farm shut through a night it stuck: the morning\'s card says the automatic door stuck open, and he took the eggs', s.last && s.last.stuck === true && s.last.open && s.last.eggs >= 3 && s.card === 'fox' && stuckRe.test(s.text) && took.test(s.text), s);
await p.reload({ waitUntil: 'domcontentloaded' }); await load();
s = await st();
ok('a reload keeps it, unflagged', s.last && s.last.stuck === true && !s.edited, s);
// a Snug coop: its door is still the player's
await p.evaluate(() => { const g = window.__farm.game(); g.data.coops[0].tier = 2; g.save(); });
s = await st();
ok('a Snug coop: no automatic door', s.auto === false, s);
ok('no page errors', errs.length === 0, errs);
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();

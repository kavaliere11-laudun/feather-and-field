// The app's shop for real money (14 Nov 2026; store.js, the app's plugin FFStore stood in for by window.__fakeStore):
// ./withserver.sh node storetest.mjs [OUT]
// Outside the app: no money buttons; a save saying a building was bought with money isn't believed (the coop back to its
// own look). In the app: the coop's card offers the building for coins and "Or have it now" at Apple's price, the nine
// together, "Restore purchases"; a cancelled purchase changes nothing; a purchase Apple confirms: owned, worn at once,
// no coins taken; kept over a reload, not flagged; refunded (Apple no longer says it's owned): back to its own look; a
// save edited to claim one: dropped once Apple answers; the nine: all owned; restore: said. No page errors.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/farmer/storetest', fr = process.env.LANG === 'fr', W = +(process.env.W || 874), H = +(process.env.H || 402);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, locale: fr ? 'fr-FR' : 'en-GB', timezoneId: 'Europe/London', deviceScaleFactor: 2 });
ctx.setDefaultTimeout(120000); ctx.setDefaultNavigationTimeout(120000);
const T0 = new Date('2026-12-05T11:30:00+00:00').getTime();
await ctx.addInitScript(t0 => { let t = null; try { t = sessionStorage.getItem('__T'); } catch (e) { /* */ } window.__T = +(t || t0); Date.now = () => window.__T; }, T0);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' / ')));
let fails = 0;
const ok = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' · ' + JSON.stringify(info) : '')); if (!cond) fails++; };
const run = s => p.evaluate(s => { const f = window.__farm; for (let i = 0; i < s * 30; i++) { window.__T = Math.round(window.__T + 1000 / 30); f.step(1 / 30, 1); f.gameTick(window.__T, false); } sessionStorage.setItem('__T', window.__T); f.draw(); }, s);
const jump = async ms => { await p.evaluate(ms => { window.__T = Math.round(window.__T + ms); sessionStorage.setItem('__T', window.__T); }, ms); await run(1.5); };
const shoot = async n => { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/store_${n}${fr ? '_fr' : ''}.png`, timeout: 90000 }).catch(e => console.log('(picture ' + n + ' skipped: ' + e.message.split('\n')[0] + ')')); };
const load = async () => {
  await p.waitForFunction(() => window.__farm && document.getElementById('loading') === null, null, { timeout: 180000 });
  await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 20); f.gameTick(window.__T); f.draw(); });
  await run(0.5);
};
const close = () => p.evaluate(() => window.__farm.gameUI().close());
const hintT = () => p.evaluate(() => document.getElementById('hint').textContent);
const S = () => p.evaluate(() => { const f = window.__farm, g = f.game(), c = g.data.coops[0]; return { coins: g.data.coins, theme: c.theme || null, themes: g.data.themes || [], paid: g.data.paid || [], tier: c.tier, edited: g.edited, drawn: [...new Set(f.coopModels())] }; });
const card = async () => { await close(); await p.evaluate(() => window.__farm.coopCard(0)); await run(0.2); return p.evaluate(() => [...document.querySelectorAll('.gsheet:not([hidden]) .gtheme button')].map(b => ({ t: b.textContent, go: b.dataset.themego, off: b.disabled }))); };
const tap = go => p.evaluate(go => { const b = [...document.querySelectorAll('.gsheet:not([hidden]) .gtheme button')].find(b => b.dataset.themego === go); if (b) b.click(); return !!b; }, go);
const view = z => p.evaluate(z => { const f = window.__farm, P = f.gamePlots()[0]; f.lookAt(P.gc.x, P.gc.z, z); f.draw(); }, z);
const reload = async () => { await p.reload({ waitUntil: 'domcontentloaded' }); await load(); await close(); await run(1.2); };
const PRE = 'com.featherandfield.game.winter.';
// the stand-in for Apple: what's owned and how the next purchase goes kept over reloads (sessionStorage); off: no shop
await ctx.addInitScript(() => {
  const get = (k, d) => { try { const v = sessionStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  if (get('__shop', false)) window.__fakeStore = {
    products: async o => ({ products: o.ids.map(id => ({ id, price: /all$/.test(id) ? '£9.99' : '£1.99' })).concat([{ id: 'com.other.thing', price: '£0.01' }]) }),
    owned: async () => ({ ids: get('__owned', []) }),
    buy: async o => { const how = get('__how', 'bought'), ids = get('__owned', []); if (how === 'bought') { ids.push(o.id); sessionStorage.setItem('__owned', JSON.stringify(ids)); } return { state: how, ids }; },
    restore: async () => ({ ids: get('__owned', []) }),
  };
});
const shop = v => p.evaluate(v => { for (const k of Object.keys(v)) sessionStorage.setItem(k, JSON.stringify(v[k])); }, v);

await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?q=0&time=11:30`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 120000 });
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await load();
await p.evaluate(() => { const f = window.__farm, g = f.game(); g.data.guide = { step: 5, done: true }; g.data.first = null; g.fishBag().gift = true; g.data.coins = 3000; g.save(); f.gameUI().close(); });
await run(1); await view(2.0);
{
  const spot = await p.evaluate(() => {
    const f = window.__farm, g = f.game(); g.data.xp = Math.max(g.data.xp, 70000); g.data.lvSeen = g.level; if (g.data.land.length < 5) g.data.land = [0, 1, 2, 3, 4]; g.save();
    const c = g.data.coops[0]; let tries = 0; f.gameUI().close();
    for (let r = 0; r < 30; r += 0.5) for (let k = 0; k < Math.max(1, r * 6); k++) { const a = k / Math.max(1, r * 6) * 6.28, x = Math.round((c.x + Math.cos(a) * r) * 4) / 4, z = Math.round((c.z + Math.sin(a) * r) * 4) / 4;
      for (const deg of [90, 0, 180, 270]) { const o = { x, z, deg }; const S = f.coopSpotAt(o, 4); if (!(S && S.ok)) continue;
        if (f.moveCoopTo(0, o)) return o; f.move.cancel(); if (++tries > 40) return null; } }
    return null;
  });
  ok('the coop moved where a Deluxe garden fits', !!spot, spot); await run(1); await close();
}
let s = await S(); const own = s.tier;
let c = await card();
ok('outside the app: coins only, no money button, no "Restore purchases"', c.length === 1 && c[0].go === 'buy', c);
// a save that says a building was bought with money, outside the app: not believed
await p.evaluate(() => { const g = window.__farm.game(), k = g.data.coops[0]; g.data.paid = ['winter_rir']; k.tier0 = k.tier; k.tier = 4; k.theme = 'winter'; g.save(); });
await reload(); s = await S();
ok('…a save claiming one bought with money: not believed (the coop in its own look, the claim gone)', !s.theme && s.tier === own && s.paid.length === 0 && !s.drawn.includes('theme_winter_rir'), s);
// in the app
await shop({ __shop: true, __owned: [], __how: 'cancelled' }); await reload();
c = await card();
const pay = c.find(b => b.go === 'pay'), all = c.find(b => b.go === 'all'), res = c.find(b => b.go === 'restore');
ok('in the app: coins (too few: not to be tapped), "Or have it now" at Apple\'s price, the nine together, "Restore purchases"', c[0].go === 'buy' && c[0].off && pay && /£1\.99/.test(pay.t) && (fr ? /Ou tout de suite/ : /Or have it now/).test(pay.t) && all && /£9\.99/.test(all.t) && res && (fr ? /Restaurer les achats/ : /Restore purchases/).test(res.t), c);
await p.evaluate(() => document.querySelector('.gsheet:not([hidden]) .gtheme').scrollIntoView({ block: 'center' })); await p.waitForTimeout(700); await shoot('1_card');
await tap('pay'); await run(1); s = await S();
ok('a purchase cancelled: nothing changes, nothing said wrong', !s.theme && s.paid.length === 0 && s.coins === 3000, { s, said: await hintT() });
await shop({ __how: 'pending' }); await card(); await tap('pay'); await run(1); s = await S(); let said = await hintT();
ok('waiting for a parent\'s yes: said, not owned yet', !s.theme && s.paid.length === 0 && (fr ? /En attente/ : /Waiting for approval/).test(said), said);
await shop({ __how: 'bought' }); await card(); await tap('pay'); await run(1.5); s = await S(); said = await hintT();
ok('bought with money: Apple confirms, owned, the coop is the chalet at once, no coins taken, thanked', s.theme === 'winter' && s.tier === 4 && s.paid.join() === 'winter_rir' && s.themes.length === 0 && s.coins === 3000 && s.drawn.includes('theme_winter_rir') && (fr ? /Merci/ : /Thank you/).test(said), { s, said });
await view(1.6); await shoot('2_bought');
c = await card();
ok('its card: owned (back to its own coop), no money button for it now', c[0].go === 'off' && !c.some(b => b.go === 'pay'), c);
await reload(); s = await S();
ok('a reload: still owned and worn, not flagged', s.theme === 'winter' && s.paid.join() === 'winter_rir' && !s.edited, s);
// refunded: Apple no longer says it's owned
await shop({ __owned: [] }); await reload(); s = await S();
ok('refunded: back to its own look, no longer owned', !s.theme && s.tier === own && s.paid.length === 0 && !s.drawn.includes('theme_winter_rir'), s);
// a save edited to claim buildings, in the app: Apple's answer wins
await p.evaluate(() => { const g = window.__farm.game(), k = g.data.coops[0]; g.data.paid = ['winter_rir', 'winter_orp', 'winter_zzz']; k.tier0 = k.tier; k.tier = 4; k.theme = 'winter'; g.save(); });
await reload(); s = await S();
ok('a save edited to claim some: dropped once Apple answers, flagged', !s.theme && s.paid.length === 0 && s.edited === true, s);
// the nine together
await card(); await tap('all'); await run(1.5); s = await S(); said = await hintT();
ok('the nine together: all nine owned, said', s.paid.length === 9 && (fr ? /neuf bâtiments/ : /All nine/).test(said), { paid: s.paid, said });
c = await card();
ok('…its card: move in, no money buttons left but "Restore purchases"', c[0].go === 'on' && !c.some(b => b.go === 'pay' || b.go === 'all') && c.some(b => b.go === 'restore'), c);
await tap('on'); await run(1); s = await S();
ok('…moved in', s.theme === 'winter' && s.tier === 4, s);
await card(); await tap('restore'); await run(1); said = await hintT(); s = await S();
ok('"Restore purchases": said, all nine still owned', (fr ? /Achats restaurés/ : /Purchases restored/).test(said) && s.paid.length === 9 && s.theme === 'winter', said);
// a farm started again keeps what was bought with money
ok('no page errors', errs.length === 0, errs.slice(0, 3));
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
await b.close();
process.exit(fails ? 1 : 0);

// The shop's real-money preview (?shopdemo, gameui.js IAP_DEMO), shot step by step at phone size for Audrey:
//   ./withserver.sh node iapdemo.mjs OUT   (LANG_GAME=fr; W, H)
// 1 the farm, few coins left · 2 the shop: not enough for something, "Get coins" · 3 the Coins shelf · 4 the iPhone's
// payment (a stand-in) · 5 thank you · 6 the Breed Book: a rare trio to adopt · 7 Settings: Restore purchases.
// Nothing is charged or added: checked at the end (the coins and the birds unchanged).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/claude-0/iapdemo'; fs.mkdirSync(OUT, { recursive: true });
const LANG = process.env.LANG_GAME || 'en', W = +(process.env.W || 402), H = +(process.env.H || 874);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/play.html?shopdemo&time=11:00`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('.gsheet:not([hidden])', { timeout: 180000 });
if (LANG !== 'en') await p.evaluate(l => { const s = document.querySelector('.gsheet .gselect'); if (s) { s.value = l; s.dispatchEvent(new Event('change')); } }, LANG);
await p.evaluate(() => document.querySelector('.gsheet .gbtn').click());
await p.waitForFunction(() => window.__farm && window.__farm.game && window.__farm.game().data && document.getElementById('loading') === null, null, { timeout: 300000 });
await p.waitForTimeout(2500);
// a farm some way in (level 12: the decorations, animals and outfits on sale), a few coins left
const before = await p.evaluate(() => { const G = window.__farm.game(); G.guideSkip(); G.data.xp = 9000; G.data.lvSeen = 30; G.data.coins = 640; window.__farm.gameUI().close(); window.__farm.gameUI().refresh(); return { coins: G.data.coins, birds: G.data.birds.length }; });
await p.waitForTimeout(1500);
const calm = async () => { await p.evaluate(() => document.getAnimations().forEach(a => { if (!a.effect || !a.effect.target || !a.effect.target.classList || !a.effect.target.classList.contains('giap-fly')) a.finish(); })); await p.waitForTimeout(250); };
const shot = async n => { await calm(); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
await p.evaluate(() => { window.__farm.gameUI().close(); });
await p.waitForTimeout(800); await shot('1-farm');
await p.evaluate(() => window.__farm.gameUI().coins.click()); await p.waitForTimeout(700);
// a shelf with something not yet affordable: its "Get coins"
for (const tab of ['decor', 'animals', 'outfits']) {
  await p.evaluate(t => { const c = document.querySelector(`.gshop-tabs .gchip[data-tab="${t}"]`); if (c) c.click(); }, tab); await p.waitForTimeout(500);
  if (await p.evaluate(() => { const g = document.querySelector('.giap-get'); if (g) { g.closest('.gcard').scrollIntoView({ block: 'center' }); return true; } return false; })) break;
}
await shot('2-not-enough');
await p.evaluate(() => document.querySelector('.giap-get').click()); await p.waitForTimeout(600); await shot('3-coins');
await p.evaluate(() => document.querySelector('.giap[data-bag="basket"] .giap-buy').click()); await p.waitForTimeout(600); await shot('4-pay');
await p.evaluate(() => document.querySelector('.giap-ok').click()); await p.waitForTimeout(350); await p.screenshot({ path: `${OUT}/5-thanks.png` }); console.log('shot 5-thanks');
await p.waitForTimeout(1500);
await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().bookSheet({}); }); await p.waitForTimeout(800);
await p.evaluate(() => { const a = document.querySelector('.giap-adopt'); if (a) a.closest('.gcard').scrollIntoView({ block: 'center' }); });
await shot('6-adopt');
await p.evaluate(() => { window.__farm.gameUI().close(); window.__farm.gameUI().settings(); }); await p.waitForTimeout(700);
await p.evaluate(() => { const r = document.querySelector('.giap-restore'); if (r) r.scrollIntoView({ block: 'center' }); });
await shot('7-restore');
const after = await p.evaluate(() => { const G = window.__farm.game(); return { coins: G.data.coins, birds: G.data.birds.length }; });
console.log('nothing added:', after.coins === 640 && after.birds === before.birds ? 'yes' : 'NO', JSON.stringify(after), 'errors', JSON.stringify(errs));
await b.close();

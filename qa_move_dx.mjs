// QA for moving decorations (tap, Move, drag, Place; only on open grass, the duck house on water; saved and checked)
// and for Deluxe coops (the upgrade card, price, XP, the new look on the farm, saves); English and French.
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const shot = (page, n) => page.screenshot({ path: `r/mv_${n}.png` });
const D = (page, fn, arg) => page.evaluate(fn, arg);
const G = (page, fn, arg) => page.evaluate(([f, a]) => window.__ffDebug.inside(g => (new Function('g', 'a', 'return (' + f + ')(g, a)'))(g, a)), [fn.toString(), arg]);
const check = (tag, ok, what) => { console.log(tag, ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(tag + ' ' + what); };
const toasts = page => page.locator('#toasts').innerText().then(x => x.replace(/\n/g, ' / '));
for (const loc of ['en-GB', 'fr-FR']) {
  const tag = loc.slice(0, 2);
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: loc });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) errors.push(tag + ' console: ' + m.text()); });
  await page.goto(process.env.URL); await page.waitForTimeout(1200);
  await page.locator('#sheetClose').click(); await page.waitForTimeout(1000);
  await page.locator('#sheetBody .btn').last().click(); await page.waitForTimeout(1000);
  await D(page, () => { const d = window.__ffDebug; d.quiet(); d.setHour(11); });
  await G(page, g => { g.state.xp = g.xpFor(16); g.state.level = 16; g.state.coins = 100000; for (const id of ['windmill', 'duckhouse', 'flowers']) g.actBuyDecor(id); g.closeSheet(); });
  await page.waitForTimeout(800);

  // ---- tap the windmill: its card, with Move
  await page.waitForTimeout(5000);                                   // let the purchase messages fade
  await G(page, g => g.lookAtDecor('windmill')); await page.waitForTimeout(500);
  const wp = await D(page, () => { const d = window.__ffDebug; const [x, y] = d.inside(g => g.decorPos('windmill')); return d.mapToScreen(x, y - 40); });
  await page.touchscreen.tap(wp[0], wp[1]); await page.waitForTimeout(500);
  const title = (await page.locator('#sheet').isVisible()) ? await page.locator('#sheetTitle').innerText().catch(() => '-') : '-';
  check(tag, /Windmill|Moulin/.test(title), 'tapping the windmill opens its card: ' + title);
  await shot(page, tag + '_1card');
  await page.locator('#sheetBody .btn', { hasText: tag === 'en' ? 'Move' : 'Déplacer' }).click(); await page.waitForTimeout(600);
  const bar = await page.locator('#moveBar').isVisible();
  check(tag, bar, 'the move bar shows: ' + (await page.locator('#moveMsg').innerText().catch(() => '-')));
  await shot(page, tag + '_2moving');
  // ---- drag it onto a path: red, Place disabled
  const from = await D(page, () => { const d = window.__ffDebug; const [x, y] = d.inside(g => g.decorPos('windmill')); return d.mapToScreen(x, y - 100); });
  const path = await D(page, () => window.__ffDebug.mapToScreen(1720, 1250 - 100));      // the road south of the farmhouse... the view follows the windmill, so aim relative
  await G(page, g => g.moveTo(1722, 1000));                                                  // on the main road
  await page.waitForTimeout(300);
  const onRoad = await G(page, g => ({ ok: g.moving.ok }));
  const placeDisabled = await page.locator('#movePlace').isDisabled();
  check(tag, !onRoad.ok && placeDisabled, 'on the road: not allowed, Place disabled (' + (await page.locator('#moveMsg').innerText()) + ')');
  // ---- a real finger drag to open grass near where it is
  await G(page, g => { const [x, y] = g.decorPos('windmill'); g.moveTo(x, y); }); await page.waitForTimeout(200);
  const a = await D(page, () => { const d = window.__ffDebug; const [x, y] = d.inside(g => g.decorPos('windmill')); return d.mapToScreen(x, y - 80); });
  await page.mouse.move(a[0], a[1]); await page.mouse.down(); for (let k = 1; k <= 12; k++) { await page.mouse.move(a[0] - k * 4, a[1] + k * 5); await page.waitForTimeout(16); } await page.mouse.up();
  await page.waitForTimeout(300);
  const dragged = await G(page, g => ({ x: g.moving && g.moving.x, y: g.moving && g.moving.y, ok: g.moving && g.moving.ok, at: g.decorPos('windmill') }));
  check(tag, dragged.x != null && Math.abs(dragged.x - dragged.at[0]) > 30, 'a finger drag moves it: ' + JSON.stringify(dragged));
  // a clear spot: east of the farmhouse, by the wheat field
  await G(page, g => g.moveTo(2950, 640)); await page.waitForTimeout(300);
  const ok2 = await G(page, g => g.moving.ok);
  await shot(page, tag + '_3green');
  check(tag, ok2, 'open grass by the wheat field is allowed');
  await page.locator('#movePlace').click(); await page.waitForTimeout(400);
  const placed = await G(page, g => ({ at: g.decorPos('windmill'), moving: !!g.moving, saved: g.state.decorAt.windmill }));
  console.log(tag, 'toast:', await toasts(page));
  check(tag, !placed.moving && placed.saved && placed.saved[0] === 2950 && placed.saved[1] === 640, 'placed and saved: ' + JSON.stringify(placed));
  // the farmer now walks round it
  const blocked = await G(page, g => { const B = g.navBlock(), C = 16, w = Math.ceil(3440 / C); return !!B[Math.floor((640 - 30) / C) * w + Math.floor(2950 / C)]; });
  check(tag, blocked, 'the farmer\'s map knows the windmill moved');
  // ---- the duck house must stay on the pond
  await G(page, g => g.startMove('duckhouse')); await page.waitForTimeout(300);
  await G(page, g => g.moveTo(2950, 900)); const dGrass = await G(page, g => g.moving.ok);
  await G(page, g => g.moveTo(1850, 1850)); const dPond = await G(page, g => g.moving.ok);
  check(tag, !dGrass && dPond, `duck house: grass ${dGrass}, pond ${dPond}`);
  await page.locator('#moveCancel').click(); await page.waitForTimeout(300);
  check(tag, (await G(page, g => !!g.state.decorAt.duckhouse)) === false, 'Cancel leaves it where it was');
  // ---- not on top of another decoration, a plot or a tree
  await G(page, g => g.startMove('flowers')); await page.waitForTimeout(200);
  const clash = await G(page, g => { const [x, y] = g.decorPos('windmill'); g.moveTo(x + 10, y); const a = g.moving.ok; const s0 = g.state.coops[0], f = window.__ffDebug.slot(0); g.moveTo(f[0], f[1]); const b = g.moving.ok; g.endMove(false); return { onWindmill: a, onPlot: b }; });
  check(tag, !clash.onWindmill && !clash.onPlot, 'not on another decoration or a plot: ' + JSON.stringify(clash));
  // ---- saves
  const sv = await G(page, g => { const o = JSON.parse(JSON.stringify(g.state)); o.decorAt = { windmill: [99999, -5], statue: [500, 500], flowers: ['x', 1], duckhouse: [1850.4, 1850.6] }; const s = g.sanitize(o); return s.decorAt; });
  check(tag, sv.windmill && sv.windmill[0] === 3360 && sv.windmill[1] === 160 && !sv.statue && !sv.flowers && sv.duckhouse[0] === 1850 && sv.duckhouse[1] === 1851, 'saves: ' + JSON.stringify(sv));

  // ---- Deluxe coop
  const cid = await G(page, g => g.state.coops[0].id);
  await D(page, id => window.__ffDebug.openCoop(id), cid); await page.waitForTimeout(500);
  const dxBtn = page.locator('#sheetBody .btn', { hasText: tag === 'en' ? 'Make it Deluxe' : 'Passer en Luxe' });
  for (let k = 0; k < 5; k++) { try { await dxBtn.scrollIntoViewIfNeeded({ timeout: 3000 }); break; } catch (_) { await page.waitForTimeout(300); } }
  await page.waitForTimeout(300);
  await shot(page, tag + '_4dxcard');
  const before = await G(page, g => ({ coins: g.state.coins, xp: g.state.xp, price: g.dxPrice(g.state.coops[0].breed) }));
  for (let k = 0; k < 5; k++) { try { await dxBtn.click({ timeout: 3000 }); break; } catch (_) { await page.waitForTimeout(300); } }
  await page.waitForTimeout(500);
  const after = await G(page, g => ({ coins: g.state.coins, xp: g.state.xp, dx: g.state.coops[0].dx }));
  console.log(tag, 'toast:', await toasts(page));
  check(tag, after.dx && before.coins - after.coins === before.price && after.xp - before.xp >= Math.round(before.price / 50), `deluxe bought for ${before.price}: ${JSON.stringify(after)}`);
  check(tag, (await G(page, g => g.actDeluxe(g.state.coops[0]))) === false, 'cannot buy Deluxe twice');
  await G(page, g => g.closeSheet());
  await D(page, () => { const d = window.__ffDebug; const s = d.slot(0); d.lookAt(s[0], s[1] - 30, 1.2); }); await page.waitForTimeout(1500);
  await shot(page, tag + '_5dxfarm');
  const dsv = await G(page, g => { const o = JSON.parse(JSON.stringify(g.state)); o.coops[0].dx = 'yes'; return g.sanitize(o).coops[0].dx; });
  check(tag, dsv === false, 'a tampered deluxe flag is dropped');
  await ctx.close();
}
console.log('BAD', JSON.stringify(bad));
console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

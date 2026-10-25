// Pictures of the show ground (index.html?lineup=show): OUT=folder, SHOTS=[{ name, w, h, pose, pen, size, at: [x, z] (the show
// ground's own frame), close: { at: [x, y, z] (its frame), az, el, dist, fov }, hour, secs, lang }]. PORT (default 8770).
// ./withserver.sh node showshot.mjs
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const OUT = process.env.OUT || '.';
const shots = JSON.parse(process.env.SHOTS || '[{"name":"play"}]');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
let page = null, pageKey = '';
for (const s of shots) {
  const w = s.w || 874, h = s.h || 402, lang = s.lang || 'en', key = `${w}x${h}${lang}`;
  if (key !== pageKey) {
    if (page) await page.close();
    page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: s.dpr || 1, hasTouch: true, isMobile: true });
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup=show${lang === 'fr' ? '&lang=fr' : ''}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__farm && document.getElementById('loading') === null && window.__show, null, { timeout: 180000 });
    await page.addStyleTag({ content: '#hint, #readout, #tag, .top { display: none !important; }' });
    pageKey = key;
  }
  await page.evaluate((s) => {
    const f = window.__farm, S = window.__show, T = f.THREE; f.pause(true); f.setHour(s.hour ?? 12.5); window.__noBlink = true;
    S.fixed = s.pose || null; S.penAt = s.pen ?? null; S.k = -1;
    f.step(1 / 30, Math.round((s.secs ?? 2) * 30)); f.wind(10); f.water(10);
    const G = S.ground;
    if (s.close) {
      const at = G.world(...s.close.at);
      f.lookAt(at.x, at.z, 2.5);                                   // (the shadows drawn round it)
      f.closeShot({ at: [at.x, at.y, at.z], az: s.close.az || 0, el: s.close.el ?? 25, dist: s.close.dist || 3, fov: s.close.fov || 30 });
    } else {
      const at = G.world((s.at || [0, 0.6])[0], 0, (s.at || [0, 0.6])[1]);
      f.lookAt(at.x, at.z, s.size || 2.03); f.draw();
    }
  }, s);
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
}
console.log('errors', JSON.stringify(errs)); await b.close();

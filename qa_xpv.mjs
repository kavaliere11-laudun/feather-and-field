// the steeper late levels: an older save keeps the level it had reached; a new farm uses the new curve; tampering gains nothing
import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = []; const bad = [];
const G = (page, fn, arg) => page.evaluate(([f, a]) => window.__ffDebug.inside(g => (new Function('g', 'a', 'return (' + f + ')(g, a)'))(g, a)), [fn.toString(), arg]);
const check = (ok, what) => { console.log(ok ? 'OK ' : 'BAD', what); if (!ok) bad.push(what); };
const page = await (await browser.newContext({ viewport: { width: 402, height: 874 } })).newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200);
const r = await G(page, g => {
  const old = L => L <= 1 ? 0 : L === 2 ? 6 : Math.round(60 * (L - 1) ** 1.7);
  const out = {};
  for (const L of [7, 10, 14, 22, 30]) {
    const o = JSON.parse(JSON.stringify(g.state)); delete o.xpv; o.xp = old(L) + 3; o.level = L;
    const s = g.sanitize(o); out['old' + L] = [s.level, s.xp, s.xpv];
  }
  const n = JSON.parse(JSON.stringify(g.state)); n.xpv = 2; n.xp = old(14) + 3; out.new14 = [g.sanitize(n).level];
  const t = JSON.parse(JSON.stringify(g.state)); delete t.xpv; t.xp = 50; t.level = 30; out.tamper = [g.sanitize(t).level];
  out.curve = [10, 11, 15, 20, 25, 30].map(L => [L, g.xpFor(L), old(L)]);
  return out;
});
console.log(JSON.stringify(r));
check(r.old7[0] === 7 && r.old10[0] === 10 && r.old14[0] === 14 && r.old22[0] === 22 && r.old30[0] === 30, 'an older save keeps its level: ' + [7, 10, 14, 22, 30].map(L => r['old' + L][0]).join(','));
check(r.new14[0] < 14, 'with the new curve the same XP is a lower level: ' + r.new14[0]);
check(r.tamper[0] <= 3, 'a level typed into a save gives nothing: ' + r.tamper[0]);
check(r.curve[0][1] === r.curve[0][2] && r.curve[5][1] === Math.round(r.curve[5][2] * 2), 'levels up to 10 are unchanged, level 30 needs twice the XP');
console.log('BAD', JSON.stringify(bad)); console.log(errors.length ? errors.join('\n') : 'no errors'); await browser.close();

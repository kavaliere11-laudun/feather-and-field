// The App Store's pictures, second finish (27 Nov 2026, Audrey: "they need better finishing and polish"):
// node compose2.mjs PLAN.json OUTDIR [STYLE]   (STYLE: sign | banner)
// PLAN: [{ "img": "/path/scene.png", "title": "Raise a flock you'll love", "sub": "Cuddles, chicks and trust", "name": "01" }]
// Each picture 2868 x 1320 (the 6.9-inch iPhone on its side): the scene fills the whole picture, and its words sit on one
// thing only, in the game's own type (Fredoka for the line, Nunito under it):
//   sign: a painted wooden farm sign hanging from the top edge on two ropes, top left (the farm's own signs);
//   banner: a straw-cream panel tucked into the top-left corner, a gold stitched edge.
// Saved as OUTDIR/<name>.png (and a 1400-wide .jpg to look at).
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const [PLAN, OUT, STYLE = 'sign'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const CW = +(process.env.CW || 2868), CH = +(process.env.CH || 1320);      // (the picture's size: the iPad's 2752 x 2064, 27 Nov 2026)
const FONTS = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../web3d/fonts');
const font = f => 'data:font/woff2;base64,' + fs.readFileSync(path.join(FONTS, f)).toString('base64');
const FACES = `
@font-face { font-family: Fredoka; font-weight: 600; src: url(${font('fredoka-latin-600-normal.woff2')}) format('woff2'); }
@font-face { font-family: Fredoka; font-weight: 600; src: url(${font('fredoka-latin-ext-600-normal.woff2')}) format('woff2'); unicode-range: U+0100-024F, U+1E00-1EFF; }
@font-face { font-family: Nunito; font-weight: 800; src: url(${font('nunito-latin-800-normal.woff2')}) format('woff2'); }
@font-face { font-family: Nunito; font-weight: 800; src: url(${font('nunito-latin-ext-800-normal.woff2')}) format('woff2'); unicode-range: U+0100-024F, U+1E00-1EFF; }`;
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const STYLES = {
  // a painted board: oak planks with grain, a darker rim, cream lettering with a soft painted shadow, two ropes up to the
  // top edge, a nail head at each rope; tilted a hair
  sign: s => `
.hang { position: absolute; ${s.side === 'center' ? 'left: 0; right: 0; margin: 0 auto' : (s.side === 'right' ? 'right' : 'left') + ': ' + (s.x || 140) + 'px'}; top: 0; width: fit-content; max-width: ${s.w || 1380}px; }
.ropes { position: absolute; left: 0; right: 0; top: 0; height: 120px; }
.ropes i { position: absolute; top: -10px; width: 14px; height: 140px; border-radius: 7px;
  background: repeating-linear-gradient(160deg, #c9a46a 0 9px, #a98249 9px 16px); box-shadow: 2px 3px 6px rgba(40,25,10,.35); }
.ropes i:first-child { left: 90px; } .ropes i:last-child { right: 90px; }
.sign { position: relative; margin-top: 108px; padding: 46px 70px 52px; box-sizing: border-box;
  transform: rotate(${s.side === 'right' ? 1.1 : s.side === 'center' ? 0.6 : -1.2}deg); transform-origin: 50% 0; border-radius: 26px;
  background:
    repeating-linear-gradient(180deg, rgba(255,255,255,0) 0 74px, rgba(60,30,10,.28) 74px 77px, rgba(255,255,255,.06) 77px 80px),
    repeating-linear-gradient(92deg, rgba(255,235,200,.06) 0 3px, rgba(70,35,10,.07) 3px 9px, rgba(255,235,200,0) 9px 23px),
    linear-gradient(180deg, #a0693d, #8a5530 55%, #7a4a29);
  box-shadow: inset 0 0 0 10px #6b3f22, inset 0 0 0 13px rgba(255,220,170,.18), 0 26px 50px rgba(30,20,5,.42), 0 6px 12px rgba(30,20,5,.3); }
.sign::before, .sign::after { content: ''; position: absolute; top: 20px; width: 26px; height: 26px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #e9e2d2, #8d8676 60%, #57513f); box-shadow: 0 2px 3px rgba(0,0,0,.4); }
.sign::before { left: 87px; } .sign::after { right: 87px; }
.t { font: 600 ${s.size || 118}px/1.04 Fredoka, sans-serif; color: #fff6dd; letter-spacing: .5px;
  text-shadow: 0 3px 0 rgba(60,30,10,.55), 0 8px 18px rgba(40,20,5,.35); }
.s { margin-top: 16px; font: 800 ${s.subSize || 48}px/1.2 Nunito, sans-serif; color: #f5d27a; text-shadow: 0 2px 0 rgba(60,30,10,.5); }
.sign { text-align: center; }`,
  // a straw-cream panel in the top-left corner, its free corner rounded wide, a gold stitch inside its edge
  banner: s => `
.panel { position: absolute; left: 0; top: 0; max-width: ${s.w || 1300}px; padding: 70px 96px 72px 110px; box-sizing: border-box;
  background: linear-gradient(170deg, #fffaf0, #fbefd2); border-bottom-right-radius: 120px;
  box-shadow: 0 24px 60px rgba(20,40,20,.28), 0 4px 10px rgba(20,40,20,.18); }
.panel::after { content: ''; position: absolute; left: -20px; top: -20px; right: 22px; bottom: 22px; border-bottom-right-radius: 100px;
  border: 5px dashed #e3b550; border-left: 0; border-top: 0; pointer-events: none; }
.t { font: 600 ${s.size || 118}px/1.04 Fredoka, sans-serif; color: #1f3d27; text-wrap: balance; }
.s { margin-top: 16px; font: 800 50px/1.2 Nunito, sans-serif; color: #3f7a2e; }`,
};
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: CW, height: CH }, deviceScaleFactor: 1 });
for (const s of plan) {
  const img = 'data:image/png;base64,' + fs.readFileSync(s.img).toString('base64');
  const words = `<div class="t">${esc(s.title)}</div>${s.sub ? `<div class="s">${esc(s.sub)}</div>` : ''}`;
  const body = STYLE === 'sign' ? `<div class="hang"><div class="ropes"><i></i><i></i></div><div class="sign">${words}</div></div>` : `<div class="panel">${words}</div>`;
  // a picture of the game's own screens (s.screen): the sign hangs centred at the top, and the screen itself sits under it,
  // framed, on a soft blurred copy of it (so nothing of the game's buttons is covered); sized to the room the sign leaves
  const SCREEN = s.screen ? `
.scene { filter: blur(34px) saturate(1.15) brightness(.92); transform: scale(1.12); }
.shot { position: absolute; left: 0; right: 0; margin: 0 auto; top: 330px; height: 930px; aspect-ratio: ${s.ratio || 956 / 440}; border-radius: 50px;
  background: url(${img}) center / cover no-repeat; box-shadow: 0 0 0 14px #fff8e7, 0 0 0 17px rgba(110,80,40,.25), 0 40px 80px rgba(20,30,10,.45); }
.hang { left: 0; right: 0; margin: 0 auto; max-width: 2300px; z-index: 2; }
.sign { padding: 38px 90px 42px; }
.t { font-size: ${s.size || 104}px; } .s { margin-top: 12px; font-size: ${s.subSize || 50}px; }` : '';
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${FACES}
html, body { margin: 0; width: ${CW}px; height: ${CH}px; overflow: hidden; background: #3f7a2e; }
.scene { position: absolute; inset: 0; background: url(${img}) ${s.pos || 'center'} / cover no-repeat; }
.shade { position: absolute; inset: 0; background: radial-gradient(120% 90% at 18% 0%, rgba(20,30,10,.22), rgba(20,30,10,0) 55%); }
${STYLES[STYLE](s)}
${SCREEN}
</style></head><body><div class="scene"></div><div class="shade"></div>${s.screen ? '<div class="shot"></div>' : ''}${body}</body></html>`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  // the words fitted to the sign: the line at most two rows (smaller until it is, not under 80 px), the line under it one row
  // if it can be (not under 38 px); the sign no wider than its max
  await p.evaluate(() => {
    const t = document.querySelector('.t'), u = document.querySelector('.s'); if (!t) return;
    const rows = e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight));
    let fs = parseFloat(getComputedStyle(t).fontSize);
    while (rows(t) > 2 && fs > 80) { fs -= 4; t.style.fontSize = fs + 'px'; }
    if (u) { let us = parseFloat(getComputedStyle(u).fontSize); while (rows(u) > 1 && us > 44) { us -= 2; u.style.fontSize = us + 'px'; } }
    if (rows(t) === 2) t.style.textWrap = 'balance';      // (two rows: evened out, no word left alone on the second)
    if (u && rows(u) === 2) u.style.textWrap = 'balance';
    const sh = document.querySelector('.shot'), sg = document.querySelector('.sign');   // (a screen: under the sign, as big as fits)
    if (sh) { const top = Math.round(sg.getBoundingClientRect().bottom - 26); sh.style.top = top + 'px'; sh.style.height = (innerHeight - top - 58) + 'px'; }
  });
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log(s.name);
}
await b.close();

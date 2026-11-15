// Mock-ups of new breeds (15 Nov 2026): the game's own birds lent another paint (birds.js __FF_MOCK), in the line-up page.
// node breedmock.mjs OUT writes OUT/paintN.json (bookpics.mjs MOCKPAINT=OUT/paintN.json ONLY=... makes the posed pictures);
// SHOT=1 SET=N ./withserver.sh node breedmock.mjs OUT: the line-up as it is
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2], SET = process.env.SET || '1'; fs.mkdirSync(OUT, { recursive: true });
const bra = (o = {}) => ({ body: '#f0ece3', top: '#f4f1ea', hackle: '#f2eee6', stripe: '#1f1f23', head: '#f4f0e8', wing: '#ece7dd', prim: '#1e1d21', tail: '#19181b', pattern: 'stripes', capeW: 0.44, capeTone: 0.55, overlap: 0.05, wingLine: true, soft: true, ...o });
const ALL = {
  1: { breeds: 'orp,rir,bra,leg,pol', paint: {
    orp_h: bra(), orp_r: bra({ saddle: '#f2eee6', capeW: 0.22, capeTone: 0.28, prim: '#1c1b1f', tail: '#151417' }),                                   // Light Sussex
    rir_h: { body: '#1c1b20', top: '#222126', hackle: '#b5632b', head: '#a85a27', wing: '#1e1d22', prim: '#151419', tail: '#111014' },               // Black Copper Marans
    rir_r: { body: '#19181d', top: '#201f24', hackle: '#cf7630', saddle: '#c56b2b', head: '#c06a2c', wing: '#7c3d1e', prim: '#151419', tail: '#0f0e12' },
    bra_h: { body: '#e0a650', top: '#e9b562', hackle: '#ecb960', head: '#e6b05a', wing: '#d89c46', prim: '#cf9442', tail: '#dba450', legfeather: '#e2a94f', soft: true },   // Buff Cochin
    bra_r: { body: '#d99a42', top: '#e6ae58', hackle: '#eebb62', saddle: '#ebb65c', head: '#e6ac52', wing: '#d2903c', prim: '#c58838', tail: '#cf8f3e', legfeather: '#dba048', soft: true },
    leg_h: { body: '#b9b4c6', top: '#c5c0d1', hackle: '#cbc6d7', head: '#c7c2d3', crest: '#c7c2d3', wing: '#b0abbe', prim: '#a39eb2', tail: '#aaa5b8' },               // Lavender Araucana
    leg_r: { body: '#b4afc2', top: '#c2bdce', hackle: '#d0cbdb', saddle: '#cdc8d8', head: '#cbc6d6', crest: '#cbc6d6', wing: '#aca7ba', prim: '#9f9aae', tail: '#a6a1b4' },
    pol_h: { body: '#c98a3a', top: '#d39644', hackle: '#cf9040', head: '#c98a3a', crest: '#d49a48', dark: '#241d16', wing: '#c48536', prim: '#3a2c1c', tail: '#3a2c1c', pattern: 'pencil' },   // Gold-laced Polish
    pol_r: { body: '#c48536', top: '#d09242', hackle: '#d9a04c', saddle: '#d39644', head: '#c98a3a', crest: '#dba652', dark: '#241d16', wing: '#bf8032', prim: '#30241a', tail: '#2a2018', pattern: 'pencil' },
    leg: { orp: '#f0dccf', rir: '#c9b6ae', bra: '#efc24a', leg: '#8a927a', pol: '#6c7383' } } },
  2: { breeds: 'pol', paint: {
    pol_h: { body: '#7e8aa0', top: '#8d98ad', hackle: '#8792a8', head: '#7e8aa0', crest: '#f4f1ea', crestFront: [0.62, -0.05], wing: '#79859b', prim: '#6b768c', tail: '#66718a' },   // White-crested Blue
    pol_r: { body: '#7a869c', top: '#8a95aa', hackle: '#929db2', saddle: '#8d98ad', head: '#7e8aa0', crest: '#f6f3ec', crestFront: [-0.1, 0.6], wing: '#768298', prim: '#687389', tail: '#636e86' } } },
  3: { breeds: 'pol', paint: {
    pol_h: { body: '#e3b56a', top: '#ecc47e', hackle: '#eac078', head: '#e3b56a', crest: '#f1d9a6', dark: '#fbf3df', wing: '#deae62', prim: '#f1e2bd', tail: '#f1e2bd', pattern: 'pencil' },   // Buff-laced
    pol_r: { body: '#deae62', top: '#eabf76', hackle: '#f0c984', saddle: '#ecc47e', head: '#e3b56a', crest: '#f4dfb0', dark: '#fbf3df', wing: '#d8a85c', prim: '#eedfb8', tail: '#eedfb8', pattern: 'pencil' },
    leg: { pol: '#8a93a6' } } },
  4: { breeds: 'pol', paint: {
    pol_h: { body: '#ebe8e0', top: '#f2efe8', hackle: '#eeebe3', head: '#ebe8e0', crest: '#f3f0e9', dark: '#232228', wing: '#e6e3da', prim: '#2a292f', tail: '#2a292f', pattern: 'pencil' },   // Silver-laced
    pol_r: { body: '#e8e5dc', top: '#f0ede6', hackle: '#f3f0e9', saddle: '#f0ede6', head: '#ebe8e0', crest: '#f5f2eb', dark: '#232228', wing: '#e2dfd6', prim: '#26252b', tail: '#222127', pattern: 'pencil' } } },
};
for (const k of Object.keys(ALL)) fs.writeFileSync(`${OUT}/paint${k}.json`, JSON.stringify(ALL[k].paint));      // (for bookpics.mjs MOCKPAINT=)
if (process.env.SHOT !== '1') process.exit(0);
const SETS = ALL[SET];

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1400, height: 520 }, deviceScaleFactor: 2 });
await ctx.addInitScript(m => { globalThis.__FF_MOCK = m; }, SETS.paint);
const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
await p.goto(`http://localhost:${process.env.PORT || 8770}/index.html?q=0&lineup&breeds=${SETS.breeds}&coops=0&time=12:00`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => document.getElementById('loading') === null, null, { timeout: 120000 });
await p.waitForTimeout(3000);
await p.evaluate(() => { const f = window.__farm; f.pause(true); f.step(1 / 30, 30); f.draw(); });
await p.screenshot({ path: `${OUT}/set${SET}.png`, timeout: 180000 });
await b.close(); console.log('done', SET);

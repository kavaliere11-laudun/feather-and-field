// Mock-ups of new breeds (15 Nov 2026): the game's own birds lent another paint (birds.js __FF_MOCK), in the line-up page.
// node breedmock.mjs OUT writes OUT/paintN.json (bookpics.mjs MOCKPAINT=OUT/paintN.json ONLY=... makes the posed pictures);
// SHOT=1 SET=N ./withserver.sh node breedmock.mjs OUT: the line-up as it is
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const OUT = process.argv[2], SET = process.env.SET || '1'; fs.mkdirSync(OUT, { recursive: true });
const bra = (o = {}) => ({ body: '#f0ece3', top: '#f4f1ea', hackle: '#f2eee6', stripe: '#1f1f23', head: '#f4f0e8', wing: '#ece7dd', prim: '#1e1d21', tail: '#19181b', pattern: 'stripes', capeW: 0.44, capeTone: 0.55, overlap: 0.05, wingLine: true, soft: true, ...o });
const ALL = {
  1: { breeds: 'orp,rir,bra,leg,pol', paint: {
    // Light Sussex (her photos): white, a broad cape of black feathers edged white round the neck, a black tail
    orp_h: bra({ wingLine: false, prim: '#ece7dd', capeW: 0.55, capeTone: 0.9, capeR: 0.72, capeFront: [0.45, 0.98] }), orp_r: bra({ wingLine: false, saddle: '#f2eee6', capeW: 0.34, capeTone: 0.6, capeR: 0.8, capeFront: [0.35, 0.95], prim: '#ece7dd', tail: '#151417' }),
    // Black Copper Marans: the hen black with a dark copper neck; the rooster's neck and saddle blazing copper, red shoulders, a green-black tail
    rir_h: { body: '#17161b', top: '#1b1a1f', hackle: '#6a3a1c', head: '#3a251b', wing: '#19181d', prim: '#131217', tail: '#0f0e12', legfeather: '#1a191e', sheen: '#2f5a4c', sheen2: '#3a4a6a', tailSheen: '#2f6d58' },
    rir_r: { body: '#141318', top: '#7a2c16', hackle: '#d9772c', saddle: '#c9682a', head: '#d07028', wing: '#8a3016', prim: '#131217', tail: '#0d0c10', legfeather: '#17161b', tailSheen: '#2f7d58' },
    // Buff Cochin: warm golden buff all over, soft
    bra_h: { body: '#dba355', top: '#e3ae60', hackle: '#e6b264', head: '#e2ac5c', wing: '#d59a4a', prim: '#cc9044', tail: '#d9a052', legfeather: '#deaa5a', soft: true, overlap: 0.1 },
    bra_r: { body: '#dd9638', top: '#e6a444', hackle: '#eeae4a', saddle: '#eaa846', head: '#e8a442', wing: '#d68c30', prim: '#c9822c', tail: '#d28a32', legfeather: '#dc9a3e', soft: true, overlap: 0.1 },
    // Lavender Araucana: an even pale lavender grey
    leg_h: { body: '#bcbcc8', top: '#c4c4cf', hackle: '#c6c6d1', head: '#c2c2cd', crest: '#c2c2cd', wing: '#b6b6c3', prim: '#adadbb', tail: '#b2b2bf', soft: true, overlap: 0.07 },
    leg_r: { body: '#b8b8c5', top: '#c2c2ce', hackle: '#cacad5', saddle: '#c8c8d3', head: '#c6c6d1', crest: '#c6c6d1', wing: '#b2b2c0', prim: '#a9a9b8', tail: '#aeaebc', soft: true, overlap: 0.07 },
    pol_h: { body: '#c98a3a', top: '#d39644', hackle: '#cf9040', head: '#c98a3a', crest: '#d49a48', dark: '#241d16', wing: '#c48536', prim: '#3a2c1c', tail: '#3a2c1c', pattern: 'pencil' },   // Gold-laced Polish
    pol_r: { body: '#c48536', top: '#d09242', hackle: '#d9a04c', saddle: '#d39644', head: '#c98a3a', crest: '#dba652', dark: '#241d16', wing: '#bf8032', prim: '#30241a', tail: '#2a2018', pattern: 'pencil' },
    leg: { orp: '#f0dccf', rir: '#dccbc3', bra: '#efc24a', leg: '#7f8878', pol: '#6c7383' } } },
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

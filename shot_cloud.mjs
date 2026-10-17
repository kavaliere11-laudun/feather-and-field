import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
// a stand-in for the claude.ai viewer: an in-memory db for user u1, shared across both "devices"
let store = {};
const mock = s => `(() => { const store = ${JSON.stringify(s)}; window.__store = store;
  const ref = p => ({ async get() { await new Promise(r => setTimeout(r, 50)); return { exists: p in store, data: () => store[p] }; }, async set(d) { await new Promise(r => setTimeout(r, 50)); store[p] = JSON.parse(JSON.stringify(d)); } });
  const db = { collection: c => ({ doc: id => ref(c + '/' + id) }), doc: ref };
  window.claude = { use: async n => (await new Promise(r => setTimeout(r, 300)), n === 'db' ? db : n === 'user' ? { id: async () => 'u1' } : null) }; })();`;
async function device(name, s, act) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(mock(s));
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(name + ': ' + e.message));
  await page.goto(process.env.URL); await page.waitForTimeout(1500);
  await act(page);
  const out = await page.evaluate(() => ({ xp: window.__ffDebug.xp(), cloud: window.__ffDebug.cloud(), keys: Object.keys(window.__store), size: Object.values(window.__store).map(d => d.data.length) }));
  const st = await page.evaluate(() => window.__store);
  await page.screenshot({ path: `r/snd/cloud_${name}.png` });
  await ctx.close(); return [out, st];
}
let [a, st] = await device('A', {}, async p => { await p.locator('#sheetClose').click(); await p.evaluate(() => window.__ffDebug.rich()); await p.waitForTimeout(300); await p.evaluate(() => window.__ffDebug.saveNow()); await p.waitForTimeout(800); });
console.log('device A', JSON.stringify(a));
let [b] = await device('B', st, async p => { await p.waitForTimeout(1500); });
console.log('device B (empty phone, same account)', JSON.stringify(b));
let [c] = await device('C', {}, async p => { await p.waitForTimeout(500); });
console.log('device C (no account farm)', JSON.stringify(c));
const ctx = await browser.newContext(); const page = await ctx.newPage(); page.on('pageerror', e => errors.push('noclaude: ' + e.message));
await page.goto(process.env.URL); await page.waitForTimeout(1200); console.log('outside claude', JSON.stringify(await page.evaluate(() => window.__ffDebug.cloud())));
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

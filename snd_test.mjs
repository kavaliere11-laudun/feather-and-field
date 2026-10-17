import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const browser = await chromium.launch(); const errors = [];
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(process.env.URL); await page.waitForTimeout(1000);
fs.mkdirSync('r/snd', { recursive: true });
for (const [n, secs] of [['hen', 1.5], ['rooster', 1.5], ['peep', 1], ['crow', 2], ['frog', 1], ['quack', 1.2], ['plop', 1], ['bird', 2], ['eggs', 1], ['coin', 1.2], ['buy', 1], ['nope', 1], ['tap', .4], ['feed', 1.2], ['levelup', 2], ['hatch', 2], ['music', 25]]) {
  const r = await page.evaluate(async ([n, secs]) => { const [L, R] = await window.__ffDebug.snd.offline(n, secs); let pk = 0, ss = 0; for (let i = 0; i < L.length; i++) { pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); ss += L[i] * L[i]; }
    const step = 1; const out = new Int16Array(L.length); for (let i = 0; i < L.length; i++) out[i] = Math.max(-1, Math.min(1, (L[i] + R[i]) / 2)) * 32767; return { pk, rms: Math.sqrt(ss / L.length), pcm: Array.from(out) }; }, [n, secs]);
  const pcm = Int16Array.from(r.pcm); const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length * 2, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(44100, 24); hdr.writeUInt32LE(88200, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length * 2, 40);
  fs.writeFileSync(`r/snd/${n}.wav`, Buffer.concat([hdr, Buffer.from(pcm.buffer)]));
  console.log(n.padEnd(8), 'peak', r.pk.toFixed(3), 'rms', r.rms.toFixed(4));
}
await browser.close(); console.log(errors.length ? errors.join('\n') : 'no errors');

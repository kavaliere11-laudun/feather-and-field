// The app's web folder (www/), made from the built game: node make-www.mjs [<the built game: web3d/dist, or main's 3d/>]
// - every file of the game, as the site has them (models, pictures, sounds, fonts, the privacy page)
// - index.html: the game's page (play.html), told it runs inside the app (window.__ffApp: account.js and gameui.js),
//   without the Home Screen manifest (the app is the app); the test village's page is left out
// The app's own pictures (icon, launch screen) are in ios/ and android/, made by icons.py.
// For the simulator check only (.github/workflows/ios.yml): FARM=<a test farm, {"ls": {key: value}}> puts that farm on the
// phone at the first launch, so the check sees a farm and not only the welcome. Never for the stores.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(process.argv[2] || path.join(HERE, '../web3d/dist'));
const out = path.join(HERE, 'www');
if (!fs.existsSync(path.join(src, 'play.html')) || !fs.existsSync(path.join(src, 'app.js'))) { console.error('not the built game (no play.html / app.js): ' + src); process.exit(1); }
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const SKIP = new Set(['index.html', 'play.html', 'play.webmanifest', 'icon-192.png', 'icon-512.png', 'cloud.js']);
for (const f of fs.readdirSync(src)) if (!SKIP.has(f)) fs.cpSync(path.join(src, f), path.join(out, f), { recursive: true });
let page = fs.readFileSync(path.join(src, 'play.html'), 'utf8');
const once = (a, b) => { if (page.split(a).length !== 2) throw new Error('not found once in play.html: ' + a); page = page.replace(a, b); };
once('<link rel="manifest" href="play.webmanifest">\n', '');
once('<head>\n', '<head>\n<script>window.__ffApp = true;</script>\n');
if (process.env.FARM) {
  const ls = JSON.parse(fs.readFileSync(process.env.FARM, 'utf8')).ls;
  if (!ls || typeof ls !== 'object') throw new Error('FARM: not a test farm ({"ls": {...}})');
  once('<script>window.__ffApp = true;</script>\n', `<script>window.__ffApp = true;\ntry { const ls = ${JSON.stringify(ls).replace(/</g, '\\u003c')}; if (!localStorage.getItem('ff3d.farm')) for (const k in ls) localStorage.setItem(k, ls[k]); } catch (e) {}</script>\n`);
  console.log('(a test farm put in: ' + process.env.FARM + ')');
}
fs.writeFileSync(path.join(out, 'index.html'), page);
let n = 0, bytes = 0;
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else { n++; bytes += fs.statSync(p).size; } } })(out);
console.log(`www: ${n} files, ${(bytes / 1048576).toFixed(1)} MB, from ${src}`);

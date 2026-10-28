// The usual address (the switch, release 1 step 12, 26 Oct 2026): node site.mjs <folder>   (run by deploy.sh)
// Writes the top of the published site from the built game (dist/):
// - index.html: the game's page (play.html) at the usual address, its files still in 3d/ (a <base href="3d/">, so every
//   file it and its code ask for comes from there; its manifest from the top, so the Home Screen icon opens the usual address)
// - manifest.webmanifest: the Home Screen app at the usual address (same id as the first game's, so it stays the same app)
// - sw.js: the first game's offline worker there, retired: its ff-... caches deleted and itself unregistered (the first
//   game, in classic/, has its own worker and ffc-... caches; the saves are in localStorage and never touched)
// - README.md, .nojekyll
import fs from 'fs';
const out = process.argv[2];
if (!out || !fs.existsSync(`${out}/3d/play.html`)) { console.error('usage: node site.mjs <clone of main, its 3d/ folder already in place>'); process.exit(1); }
let page = fs.readFileSync(`${out}/3d/play.html`, 'utf8');
const once = (a, b) => { if (page.split(a).length !== 2) throw new Error('not found once: ' + a); page = page.replace(a, b); };
once('<head>\n', '<head>\n<base href="3d/">\n');
once('<link rel="manifest" href="play.webmanifest">', '<link rel="manifest" href="../manifest.webmanifest">');
fs.writeFileSync(`${out}/index.html`, page);
const pm = JSON.parse(fs.readFileSync(`${out}/3d/play.webmanifest`, 'utf8'));
fs.writeFileSync(`${out}/manifest.webmanifest`, JSON.stringify({
  name: pm.name, short_name: pm.short_name, id: './', start_url: './', scope: './', display: 'standalone', orientation: pm.orientation || 'any',
  background_color: pm.background_color, theme_color: pm.theme_color, description: 'Raise, breed and show chickens on your own farm.',
  icons: pm.icons.map(i => ({ ...i, src: '3d/' + i.src })),
}, null, 1) + '\n');
fs.writeFileSync(`${out}/sw.js`, `// Feather & Field: the first game's offline worker at this address, retired (26 Oct 2026). The 3D game is the game here
// now and needs none; the first game, in classic/, keeps its own (ffc-... caches). This deletes the old ff-... caches and
// unregisters itself; the saves (localStorage) are never touched.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('ff-')) await caches.delete(k);
  await self.registration.unregister();
})()));
`);
fs.writeFileSync(`${out}/README.md`, `# Feather & Field

A farm game about raising, breeding and showing chickens, in 3D.

Play: open the GitHub Pages address on your phone and choose **Add to Home Screen**.

- The game: the address itself (its files are in \`3d/\`; \`3d/play.html\` opens it too).
- The first game (2D): \`classic/\`.
- The 3D village's test page: \`3d/\`.
`);
fs.writeFileSync(`${out}/.nojekyll`, '');
console.log('the usual address: index.html, manifest.webmanifest, sw.js, README.md written in ' + out);

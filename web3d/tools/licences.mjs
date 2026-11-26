// The licences page's notices (26 Nov 2026, the launch review: MIT and Apache libraries ask for their notices to be shown):
// node tools/licences.mjs CAPDIR   writes licences/notices.json from the licence files themselves: the game's libraries
// (node_modules: three.js, Firebase and what it brings, as the bundles have them), the app's (Capacitor and its plugins:
// CAPDIR holds their npm packages, unpacked: npm pack @capacitor/core@8.6.0 … ; tar -xzf … into CAPDIR/<name>/package),
// Google's ads kits (their own terms, no file) and the fonts (fonts/OFL-*.txt). Run again when a library changes.
import fs from 'fs';
const DIR = new URL('..', import.meta.url).pathname, CAP = process.argv[2];
const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').trim();
const pkg = p => JSON.parse(fs.readFileSync(DIR + `node_modules/${p}/package.json`, 'utf8'));
const capv = n => { const d = fs.readdirSync(CAP).find(x => x.startsWith(n + '-')); if (!d) throw new Error('no ' + n + ' in ' + CAP); return { dir: `${CAP}/${d}/package`, v: JSON.parse(fs.readFileSync(`${CAP}/${d}/package/package.json`, 'utf8')).version }; };
// (the firebase package names Apache-2.0 but holds no copy of it: the licence's own words, from another copy on disk, to
// its end of terms)
const apache = () => { const t = read(DIR + 'node_modules/@grpc/grpc-js/LICENSE'), i = t.indexOf('END OF TERMS AND CONDITIONS'); if (!t.includes('Apache License') || i < 0) throw new Error('Apache text'); return t.slice(0, i + 27).replace(/^ {3}/gm, '').trim(); };
if (!CAP) { console.error('node tools/licences.mjs CAPDIR'); process.exit(1); }
const core = capv('capacitor-core'), ios = capv('capacitor-ios'), ln = capv('capacitor-local-notifications'), ss = capv('capacitor-splash-screen'), sb = capv('capacitor-status-bar');
const N = [
  { name: 'three.js', v: pkg('three').version, lic: 'MIT', url: 'https://threejs.org', text: read(DIR + 'node_modules/three/LICENSE') },
  { name: 'Firebase JavaScript SDK', v: pkg('firebase').version, lic: 'Apache-2.0', url: 'https://github.com/firebase/firebase-js-sdk', text: 'Copyright Google LLC\n\n' + apache() },
  { name: 'idb', v: pkg('idb').version, lic: 'ISC', url: 'https://github.com/jakearchibald/idb', text: read(DIR + 'node_modules/idb/LICENSE') },
  { name: 'tslib', v: pkg('tslib').version, lic: '0BSD', url: 'https://github.com/microsoft/tslib', text: read(DIR + 'node_modules/tslib/LICENSE.txt') },
  { name: 'Capacitor (core, iOS)', v: core.v, app: true, lic: 'MIT', url: 'https://capacitorjs.com', text: read(core.dir + '/LICENSE') },
  { name: 'Capacitor Local Notifications, Splash Screen, Status Bar', v: [ln.v, ss.v, sb.v].join(', '), app: true, lic: 'MIT', url: 'https://github.com/ionic-team/capacitor-plugins', text: read(ln.dir + '/LICENSE') },
  { name: 'Google Mobile Ads SDK, User Messaging Platform', v: '13.11.0, 3.1.0', app: true, lic: 'Google', url: 'https://developers.google.com/admob/ios', text: '© Google LLC. Used under Google\'s terms for them.' },
  { name: 'Fredoka (font)', lic: 'OFL-1.1', url: 'https://github.com/hafontia/Fredoka-One', text: read(DIR + 'fonts/OFL-Fredoka.txt') },
  { name: 'IM Fell (font)', lic: 'OFL-1.1', url: 'https://iginomarini.com/fell/', text: read(DIR + 'fonts/OFL-IM-Fell.txt') },
  { name: 'Nunito (font)', lic: 'OFL-1.1', url: 'https://github.com/googlefonts/nunito', text: read(DIR + 'fonts/OFL-Nunito.txt') },
];
if (read(ios.dir + '/LICENSE') !== N[4].text) throw new Error('Capacitor iOS has another licence: list it apart');
for (const x of [ss, sb]) if (read(x.dir + '/LICENSE') !== N[5].text) throw new Error('a Capacitor plugin has another licence: list it apart');
fs.mkdirSync(DIR + 'licences', { recursive: true });
fs.writeFileSync(DIR + 'licences/notices.json', JSON.stringify(N, null, 1) + '\n');
console.log('licences/notices.json:', N.length, 'notices');

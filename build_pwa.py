"""Package the game as an installable web app (home-screen icon, full screen, works offline) for GitHub Pages.
Reads the release build in game2/ (run build2.py first) and writes site/, published in the classic/ folder of main since
the 3D game took the usual address (26 Oct 2026). Its offline cache is named ffc-...: the usual address retired the old
ff-... caches (web3d/site.mjs).
Usage: python3 build_pwa.py"""
import os, shutil, json, hashlib, zipfile
from PIL import Image

R = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = f'{R}/game2', f'{R}/site'
if os.path.exists(OUT): shutil.rmtree(OUT)
shutil.copytree(f'{SRC}/img', f'{OUT}/img')

# ---------------------------------------------------------------- icons
os.makedirs(f'{OUT}/icons', exist_ok=True)
ic, mk = Image.open(f'{R}/r/icon/icon1024.png'), Image.open(f'{R}/r/icon/maskable1024.png')
for s in (192, 512): ic.resize((s, s), Image.LANCZOS).save(f'{OUT}/icons/icon-{s}.png', optimize=True)
mk.resize((512, 512), Image.LANCZOS).save(f'{OUT}/icons/maskable-512.png', optimize=True)
ic.resize((180, 180), Image.LANCZOS).save(f'{OUT}/icons/apple-touch-icon.png', optimize=True)
ic.resize((48, 48), Image.LANCZOS).save(f'{OUT}/icons/favicon.png', optimize=True)

# ---------------------------------------------------------------- the page: a full document with the app tags
html = open(f'{SRC}/index.html', encoding='utf-8').read()
assert '__ffDebug' not in html, 'build game2 without TEST first'
head = '''<!doctype html>
<html lang="en">
'''
app_tags = '''<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#4f7a35">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<!-- no apple-mobile-web-app-status-bar-style: since iOS 26.1 a see-through ("black-translucent") status bar gets a dark blur
     drawn over the top of the game; without it the status bar is solid, in the theme colour, and the game starts below it -->
<meta name="apple-mobile-web-app-title" content="Feather &amp; Field">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/favicon.png">
<script>if (navigator.standalone) document.documentElement.classList.add('standalone');</script>
'''
sw_reg = '''<script>
// offline support: keep the game's files on the phone (only on the website, not inside Claude)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {}));
// a newer version just took over: reload once so every file comes from the same version
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) { let done = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (!done) { done = true; try { sessionStorage.setItem('ff_updated', '1'); } catch (e) {} location.reload(); } }); }
</script>
'''
# version tag for every picture: the page asks for img/x.webp?v=<hash>, so it can never be paired with an older copy
av = {}
for d_, _, fs in os.walk(f'{OUT}/img'):
    for f_ in fs:
        pth = os.path.relpath(os.path.join(d_, f_), OUT).replace(os.sep, '/'); av[pth] = hashlib.sha256(open(os.path.join(d_, f_), 'rb').read()).hexdigest()[:10]
assert html.count('/*ASSETV*/{}') == 1
html = html.replace('/*ASSETV*/{}', json.dumps(av, separators=(',', ':')))
html = html.replace('<title>Feather & Field</title>', '<title>Feather &amp; Field</title>\n' + app_tags, 1)
html = head + html + '\n' + sw_reg
open(f'{OUT}/index.html', 'w', encoding='utf-8').write(html)

# ---------------------------------------------------------------- manifest
json.dump({
    'name': 'Feather & Field', 'short_name': 'Feather & Field', 'id': './', 'start_url': './', 'scope': './',
    'display': 'standalone', 'orientation': 'any', 'background_color': '#4f7a35', 'theme_color': '#4f7a35',
    'description': 'Raise, breed and show chickens on your own farm.',
    'icons': [{'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
              {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
}, open(f'{OUT}/manifest.webmanifest', 'w'), indent=1)

# ---------------------------------------------------------------- service worker: keeps every file on the phone. Each file is keyed by its own
# content hash, so an update downloads only the files that changed and reuses the rest from the previous version.
files = sorted(os.path.relpath(os.path.join(d, f), OUT).replace(os.sep, '/') for d, _, fs in os.walk(OUT) for f in fs)
fh = {f: hashlib.sha256(open(f'{OUT}/{f}', 'rb').read()).hexdigest()[:10] for f in files}
ver = hashlib.sha256(json.dumps(fh, sort_keys=True).encode()).hexdigest()[:12]
sw = """// Feather & Field offline cache, version %s
const V = 'ffc-%s';
const FILES = %s;
const OLD = () => caches.keys().then(ks => ks.filter(k => k.startsWith('ffc-') && k !== V && k !== 'ffc-fonts'));
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V), old = await OLD();
    await Promise.all(Object.entries(FILES).map(async ([p, h]) => {
      const key = p + '?v=' + h;
      for (const k of old) { const r = await (await caches.open(k)).match(key); if (r) return c.put(key, r); }   // unchanged: reuse
      const res = await fetch(new Request(p, { cache: 'no-cache' }));
      if (!res.ok) throw new Error('missing ' + p);
      await c.put(key, res);
    }));
    const page = await fetch(new Request('./', { cache: 'no-cache' })); if (page.ok) await c.put('./', page);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(OLD().then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {          // the page: newest when online, the saved copy when offline
      e.respondWith(fetch(req, { cache: 'no-cache' }).catch(() => caches.match('./', { cacheName: V }).then(r => r || caches.match('./'))));
      return;
    }
    e.respondWith(caches.match(req, { cacheName: V }).then(r => r || (url.search ? null : caches.match(req, { ignoreSearch: true, cacheName: V }))).then(r => r || fetch(req)));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('ffc-fonts').then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
  }
});
""" % (ver, ver, json.dumps(fh))
open(f'{OUT}/sw.js', 'w').write(sw)

# a zip of the site, for uploading by hand if needed
with zipfile.ZipFile(f'{R}/feather-and-field-site.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in os.walk(OUT):
        for f in fs: p = os.path.join(d, f); z.write(p, os.path.relpath(p, OUT))
print('site', ver, len(files) + 1, 'files', sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs) // 1024, 'KB')

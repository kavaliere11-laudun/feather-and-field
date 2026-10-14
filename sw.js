// Feather & Field offline cache, version e04fecf6658a
const V = 'ff-e04fecf6658a';
const FILES = ["icons/apple-touch-icon.png", "icons/favicon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "img/atlas/bra.webp", "img/atlas/leg.webp", "img/atlas/orp.webp", "img/atlas/props.webp", "img/atlas/rir.webp", "img/atlas/sil_black.webp", "img/atlas/sil_blue.webp", "img/atlas/sil_buff.webp", "img/atlas/sil_cuckoo.webp", "img/atlas/sil_grey.webp", "img/atlas/sil_lavender.webp", "img/atlas/sil_paint.webp", "img/atlas/sil_partridge.webp", "img/atlas/sil_red.webp", "img/atlas/sil_splash.webp", "img/atlas/sil_white.webp", "img/atlas/trees.webp", "img/b/card_bra_h.webp", "img/b/card_bra_r.webp", "img/b/card_chick_bra.webp", "img/b/card_chick_leg.webp", "img/b/card_chick_orp.webp", "img/b/card_chick_rir.webp", "img/b/card_chick_sil_black.webp", "img/b/card_chick_sil_blue.webp", "img/b/card_chick_sil_buff.webp", "img/b/card_chick_sil_cuckoo.webp", "img/b/card_chick_sil_grey.webp", "img/b/card_chick_sil_lavender.webp", "img/b/card_chick_sil_paint.webp", "img/b/card_chick_sil_partridge.webp", "img/b/card_chick_sil_red.webp", "img/b/card_chick_sil_splash.webp", "img/b/card_chick_sil_white.webp", "img/b/card_leg_h.webp", "img/b/card_leg_r.webp", "img/b/card_orp_h.webp", "img/b/card_orp_r.webp", "img/b/card_rir_h.webp", "img/b/card_rir_r.webp", "img/b/card_sil_black_h.webp", "img/b/card_sil_black_r.webp", "img/b/card_sil_blue_h.webp", "img/b/card_sil_blue_r.webp", "img/b/card_sil_buff_h.webp", "img/b/card_sil_buff_r.webp", "img/b/card_sil_cuckoo_h.webp", "img/b/card_sil_cuckoo_r.webp", "img/b/card_sil_grey_h.webp", "img/b/card_sil_grey_r.webp", "img/b/card_sil_lavender_h.webp", "img/b/card_sil_lavender_r.webp", "img/b/card_sil_paint_h.webp", "img/b/card_sil_paint_r.webp", "img/b/card_sil_partridge_h.webp", "img/b/card_sil_partridge_r.webp", "img/b/card_sil_red_h.webp", "img/b/card_sil_red_r.webp", "img/b/card_sil_splash_h.webp", "img/b/card_sil_splash_r.webp", "img/b/card_sil_white_h.webp", "img/b/card_sil_white_r.webp", "img/farm_map.webp", "img/ov/fence_0.webp", "img/ov/fence_90.webp", "img/ov/ov_bra_0.webp", "img/ov/ov_bra_90.webp", "img/ov/ov_empty_0.webp", "img/ov/ov_empty_90.webp", "img/ov/ov_leg_0.webp", "img/ov/ov_leg_90.webp", "img/ov/ov_orp_0.webp", "img/ov/ov_orp_90.webp", "img/ov/ov_rir_0.webp", "img/ov/ov_rir_90.webp", "img/ov/ov_sale_0.webp", "img/ov/ov_sale_90.webp", "img/ov/ov_sil_0.webp", "img/ov/ov_sil_90.webp", "index.html", "manifest.webmanifest"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(['./', ...FILES])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ff-') && k !== V && k !== 'ff-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {          // the page: newest when online, the saved copy when offline
      e.respondWith(fetch(req).catch(() => caches.match('./', { cacheName: V }).then(r => r || caches.match('index.html'))));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('ff-fonts').then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
  }
});

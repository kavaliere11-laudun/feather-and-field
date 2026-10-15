// Feather & Field offline cache, version d6f125675129
const V = 'ff-d6f125675129';
const FILES = {"icons/apple-touch-icon.png": "150a69daa0", "icons/favicon.png": "4c5edb589a", "icons/icon-192.png": "b50a38f485", "icons/icon-512.png": "c38d2c0085", "icons/maskable-512.png": "5e90410e53", "img/atlas/bra.webp": "40a3c726b1", "img/atlas/leg.webp": "692dd879c0", "img/atlas/orp.webp": "a91b0a3e5c", "img/atlas/props.webp": "851517e2ad", "img/atlas/rir.webp": "ec2ac6a275", "img/atlas/sil_black.webp": "74277489f9", "img/atlas/sil_blue.webp": "71e9f59d98", "img/atlas/sil_buff.webp": "118d532179", "img/atlas/sil_cuckoo.webp": "5bb56bfa08", "img/atlas/sil_grey.webp": "bc85fee51a", "img/atlas/sil_lavender.webp": "9fc415a9c2", "img/atlas/sil_paint.webp": "9bf1fcf5eb", "img/atlas/sil_partridge.webp": "437e257be2", "img/atlas/sil_red.webp": "32f720164e", "img/atlas/sil_splash.webp": "bb96817edd", "img/atlas/sil_white.webp": "0e762a40f5", "img/atlas/trees.webp": "fe993d35a9", "img/b/card_bra_h.webp": "e753276181", "img/b/card_bra_r.webp": "5a4385c6d7", "img/b/card_chick_bra.webp": "774b60b925", "img/b/card_chick_leg.webp": "18b80bd8f0", "img/b/card_chick_orp.webp": "53beaf7322", "img/b/card_chick_rir.webp": "de894affe3", "img/b/card_chick_sil_black.webp": "150849b4d4", "img/b/card_chick_sil_blue.webp": "993030c574", "img/b/card_chick_sil_buff.webp": "8996cee521", "img/b/card_chick_sil_cuckoo.webp": "eae137a21d", "img/b/card_chick_sil_grey.webp": "2ec88aee21", "img/b/card_chick_sil_lavender.webp": "225bc8cb28", "img/b/card_chick_sil_paint.webp": "a61095c41e", "img/b/card_chick_sil_partridge.webp": "ed507b98a5", "img/b/card_chick_sil_red.webp": "f51df5087d", "img/b/card_chick_sil_splash.webp": "405272faf8", "img/b/card_chick_sil_white.webp": "be4eea00b5", "img/b/card_leg_h.webp": "aae62f0126", "img/b/card_leg_r.webp": "7d55af6652", "img/b/card_orp_h.webp": "7939798b0a", "img/b/card_orp_r.webp": "bd208f831f", "img/b/card_rir_h.webp": "c366241721", "img/b/card_rir_r.webp": "f09fc615e5", "img/b/card_sil_black_h.webp": "92c978aea8", "img/b/card_sil_black_r.webp": "f3f9b696d5", "img/b/card_sil_blue_h.webp": "3115dd305d", "img/b/card_sil_blue_r.webp": "62fbe04552", "img/b/card_sil_buff_h.webp": "e1ab4c7e3d", "img/b/card_sil_buff_r.webp": "1abe06c15c", "img/b/card_sil_cuckoo_h.webp": "8570956df5", "img/b/card_sil_cuckoo_r.webp": "030104e8d3", "img/b/card_sil_grey_h.webp": "d658db71d9", "img/b/card_sil_grey_r.webp": "6ec5369f3d", "img/b/card_sil_lavender_h.webp": "e02f2482b7", "img/b/card_sil_lavender_r.webp": "1f45cfea3a", "img/b/card_sil_paint_h.webp": "bfee2dbcaf", "img/b/card_sil_paint_r.webp": "4afc62254d", "img/b/card_sil_partridge_h.webp": "bb763d9e82", "img/b/card_sil_partridge_r.webp": "e8ed060728", "img/b/card_sil_red_h.webp": "00cb145e97", "img/b/card_sil_red_r.webp": "d1cff91b74", "img/b/card_sil_splash_h.webp": "c5dd5af728", "img/b/card_sil_splash_r.webp": "7a47398764", "img/b/card_sil_white_h.webp": "b35f471c13", "img/b/card_sil_white_r.webp": "a60bc2bd42", "img/farm_map.webp": "c3ba4d1720", "img/ov/fence_0.webp": "fe84195eba", "img/ov/fence_90.webp": "6afa28839d", "img/ov/ov_bra_0.webp": "a9438a11a4", "img/ov/ov_bra_90.webp": "dcd6f96103", "img/ov/ov_empty_0.webp": "5eda7e7777", "img/ov/ov_empty_90.webp": "c254880806", "img/ov/ov_leg_0.webp": "7c3b52f02f", "img/ov/ov_leg_90.webp": "665e73f230", "img/ov/ov_orp_0.webp": "f21673575c", "img/ov/ov_orp_90.webp": "246add31b3", "img/ov/ov_rir_0.webp": "cb59d3e28b", "img/ov/ov_rir_90.webp": "7e88fec29b", "img/ov/ov_sale_0.webp": "a4bfce6b83", "img/ov/ov_sale_90.webp": "1692275e9c", "img/ov/ov_sil_0.webp": "0c4d801283", "img/ov/ov_sil_90.webp": "7acd3d5c43", "index.html": "4fb5d0938f", "manifest.webmanifest": "022861af36"};
const OLD = () => caches.keys().then(ks => ks.filter(k => k.startsWith('ff-') && k !== V && k !== 'ff-fonts'));
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
    e.respondWith(caches.open('ff-fonts').then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
  }
});

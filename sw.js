// Feather & Field: the first game's offline worker at this address, retired (26 Oct 2026). The 3D game is the game here
// now and needs none; the first game, in classic/, keeps its own (ffc-... caches). This deletes the old ff-... caches and
// unregisters itself; the saves (localStorage) are never touched.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('ff-')) await caches.delete(k);
  await self.registration.unregister();
})()));

/* 旧预览残留的 Service Worker 占位：立刻停掉自己，不再拦截请求。 */
self.addEventListener('install', function (event) {
    self.skipWaiting();
});
self.addEventListener('activate', function (event) {
    event.waitUntil((async function () {
        const keys = await caches.keys();
        await Promise.all(keys.map(function (key) { return caches.delete(key); }));
        await self.registration.unregister();
        const clientsList = await self.clients.matchAll({ type: 'window' });
        clientsList.forEach(function (client) { client.navigate(client.url); });
    })());
});
self.addEventListener('fetch', function (event) {
    event.respondWith(fetch(event.request));
});

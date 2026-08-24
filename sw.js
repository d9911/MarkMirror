const CACHE_NAME = 'markmirror-static-v2.1.1';

const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/script/index.js',
  '/src/style/index.css',
  '/src/style/editor-actions.css',
  '/src/ui/editor.js',
  '/src/ui/simpleEditor.js',
  '/src/ui/preview.js',
  '/src/ui/analyticsPanel.js',
  '/src/ui/searchReplace.js',
  '/src/utils/markdownParser.js',
  '/src/utils/storage.js',
  '/src/utils/fileHandler.js',
  '/src/utils/analytics.js',
  '/src/utils/editor-actions.js',
  '/src/img/icon-192x192.png',
  '/src/img/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('markmirror-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    }),
  );
});

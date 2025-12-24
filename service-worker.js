self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('my-pwa-store').then((cache) => cache.addAll([
      '/index.html',
      '/login.html',
      '/rentals.html',
      '/products.html',
      '/styles.css',
      '/app.js',
    ])),
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});
const CACHE_NAME = 'calisthenics-trainer-v8';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-64.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isFirebaseRuntimeFile(requestUrl){
  const url = new URL(requestUrl);
  return url.pathname.endsWith('/firebase-config.js') ||
         url.pathname.endsWith('/firebase-cloud.js');
}

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;

  // Firebase runtime/config files: always try the network first.
  // This prevents an old firebase-config.js from locking the app into
  // a stale "not configured" state after a deployment.
  if(isFirebaseRuntimeFile(event.request.url)){
    event.respondWith(
      fetch(event.request, {cache:'no-store'})
        .then(response => {
          if(response && response.status === 200){
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Page navigations: newest network page, offline fallback.
  if(event.request.mode === 'navigate'){
    event.respondWith(
      fetch(event.request, {cache:'no-cache'})
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Remaining static app-shell assets: cache first, then network.
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if(response && response.status === 200 && response.type === 'basic'){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});

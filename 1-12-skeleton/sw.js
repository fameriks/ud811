const CACHE_VERSION = 1;
const CURRENT_CACHES = {
  prefetch: 'prefetch-cache-v' + CACHE_VERSION,
  weatherData: 'weatherData-cache-v' + CACHE_VERSION,
};

const weatherAPIUrlBase = 'https://publicdata-weather.firebaseio.com/';

self.addEventListener('install', function (event) {
  const urlsToPrefetch = [
    '/',
    '/index.html',
    '/scripts/localforage.min.js',
    '/scripts/app.js',
    '/styles/ud811.css'
  ];

  console.log('Handling install event. Resources to prefetch:', urlsToPrefetch);

  event.waitUntil(
    caches.open(CURRENT_CACHES['prefetch']).then(function (cache) {
      return cache.addAll(urlsToPrefetch)
    })
  );
});

self.addEventListener('activate', function(event) {
  const cacheWhitelist = Object.keys(CURRENT_CACHES);

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function (event) {
  const isWeatherDataFetch = event.request.url.startsWith(weatherAPIUrlBase)
  if (isWeatherDataFetch) {
    const cachePromise = caches.match(event.request)
      .then(response => response ? response : new Promise(() => {}))

    const fetchPromise = fetch(event.request).then(response => {
      const responseToCache = response.clone();

      caches.open(CURRENT_CACHES['weatherData'])
        .then(function (cache) {
          cache.put(event.request, responseToCache);
        });
      
      return response;

    })

    return event.respondWith(Promise.race([cachePromise, fetchPromise]))
  }

  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Cache hit - return response
      if (response) {
        return response;
      }

      return fetch(event.request).then(
        function (response) {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CURRENT_CACHES['prefetch'])
            .then(function (cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        }
      );
    })
  );
});

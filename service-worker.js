const CACHE_NAME = '3d-viewer-cache-v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// File extensions to cache
const CACHEABLE_EXTENSIONS = [
  '.glb', '.gltf', '.obj', '.fbx', '.dae', '.3ds', '.ply', '.stl', '.wrl', '.x3d',
  '.bin', '.jpg', '.png', '.jpeg', '.ktx', '.ktx2', '.dds', '.hdr'
];

// URL patterns that indicate 3D model files (for files without extensions)
const MODEL_URL_PATTERNS = [
  '/model/', '/models/', '/3d/', '/mesh/', '/gltf/', '/glb/'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache essential application files
        return cache.addAll([
          '/',
          '/index.html',
          '/build/website_dev/',
          '/assets/'
        ]);
      })
  );
});

// Fetch event - intercept requests and serve from cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if this is a 3D file or related resource
  const isCacheableFile = CACHEABLE_EXTENSIONS.some(ext =>
    url.pathname.toLowerCase().includes(ext)
  );

  // Check if this is a model file request (including files without extensions)
  const isModelRequest = url.pathname.includes('/models/') ||
                        url.pathname.includes('/testfiles/') ||
                        url.searchParams.has('model') ||
                        MODEL_URL_PATTERNS.some(pattern => url.pathname.toLowerCase().includes(pattern)) ||
                        url.pathname.toLowerCase().includes('model') ||
                        url.pathname.toLowerCase().includes('3d');

  if (isCacheableFile || isModelRequest) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.match(event.request)
            .then((response) => {
              if (response) {
                // Check if cache is still valid
                const cacheTime = new Date(response.headers.get('sw-cache-time'));
                const now = new Date();

                if (now - cacheTime < CACHE_DURATION) {
                  console.log('Serving from cache:', url.pathname);
                  return response;
                } else {
                  // Cache expired, remove old entry
                  cache.delete(event.request);
                }
              }

              // Not in cache or expired, fetch from network
              return fetch(event.request, {
                // Preserve authorization headers if present
                headers: event.request.headers
              })
                .then((networkResponse) => {
                  if (networkResponse.status === 200) {
                    // Clone the response to store in cache
                    const responseToCache = networkResponse.clone();

                    // Add cache timestamp
                    const headers = new Headers(responseToCache.headers);
                    headers.set('sw-cache-time', new Date().toISOString());

                    const cachedResponse = new Response(responseToCache.body, {
                      status: responseToCache.status,
                      statusText: responseToCache.statusText,
                      headers: headers
                    });

                    cache.put(event.request, cachedResponse);
                    console.log('Cached new file:', url.pathname);
                  }

                  return networkResponse;
                })
                .catch((error) => {
                  console.error('Fetch failed:', error);
                  // Return cached version if available (even if expired)
                  return cache.match(event.request);
                });
            });
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
});

// Message event - handle cache management commands
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    event.waitUntil(
      caches.delete(CACHE_NAME)
        .then(() => {
          console.log('Cache cleared');
          event.ports[0].postMessage({ success: true });
        })
    );
  }

  if (event.data && event.data.type === 'CACHE_STATUS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.keys();
        })
        .then((requests) => {
          event.ports[0].postMessage({
            success: true,
            cacheSize: requests.length
          });
        })
    );
  }
});

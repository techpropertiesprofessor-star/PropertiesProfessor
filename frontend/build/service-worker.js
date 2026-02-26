/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'pp-crm-v4';
const API_CACHE_NAME = 'pp-crm-api-v4';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js',
];

// Install event — pre-cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Try to cache what we can, skip failures
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to cache: ${url}`, err);
          })
        )
      );
    })
  );
  // Activate immediately without waiting for existing clients
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// Fetch event — network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and socket connections
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/socket.io')) return;
  if (url.protocol === 'chrome-extension:') return;

  // Auth API requests — NEVER cache, always go to network
  if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/auth')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ offline: true, message: 'Network unavailable. Please check your connection.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // API requests: Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Skip caching for mutable list endpoints — always fetch fresh
    const noCachePaths = ['/api/employees', '/api/users', '/api/leads', '/api/tasks', '/api/attendance', '/api/payroll', '/api/salary'];
    const shouldSkipCache = noCachePaths.some(p => url.pathname.startsWith(p));

    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache if response is OK and not a mutable list endpoint
          if (response.ok && !shouldSkipCache) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed — try cache (only for cacheable endpoints)
          if (!shouldSkipCache) {
            const cached = await caches.match(request);
            if (cached) return cached;
          }
          // Return offline JSON response
          return new Response(
            JSON.stringify({ offline: true, message: 'You are offline. Showing cached data.' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // Navigation requests (page loads): Network-first to ensure fresh HTML after updates
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match('/index.html') || new Response('Offline', { status: 503 }))
    );
    return;
  }

  // Static assets: Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses or opaque responses
          if (!response || response.status !== 200) {
            return response;
          }
          // Cache static assets
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If both cache and network fail, return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});

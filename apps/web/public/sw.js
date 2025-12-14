// ASAP Service Worker - Cross-browser compatible
// Supports: Chrome, Firefox, Safari, Edge, Opera, Samsung Internet, UC Browser

'use strict';

const CACHE_VERSION = 'v1';
const STATIC_CACHE = 'asap-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'asap-dynamic-' + CACHE_VERSION;
const IMAGE_CACHE = 'asap-images-' + CACHE_VERSION;
const FONT_CACHE = 'asap-fonts-' + CACHE_VERSION;

// Cache size limits
const MAX_DYNAMIC_CACHE_ITEMS = 50;
const MAX_IMAGE_CACHE_ITEMS = 100;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// URLs that should never be cached
const CACHE_BLACKLIST = [
  /\/api\//,
  /\/auth\//,
  /chrome-extension:/,
  /extensions\//,
  /^chrome:/,
  /__webpack_hmr/,
  /hot-update/,
];

// Helper: Check if URL should be cached
function shouldCache(url) {
  return !CACHE_BLACKLIST.some(function(pattern) {
    return pattern.test(url);
  });
}

// Helper: Limit cache size (FIFO)
function limitCacheSize(cacheName, maxItems) {
  caches.open(cacheName).then(function(cache) {
    cache.keys().then(function(keys) {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(function() {
          limitCacheSize(cacheName, maxItems);
        });
      }
    });
  });
}

// Helper: Safe response clone (handles opaque responses)
function safeClone(response) {
  try {
    return response.clone();
  } catch (e) {
    return response;
  }
}

// Install event - cache static assets
self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        console.log('[SW] Caching static assets');
        // Cache assets one by one to prevent single failure from breaking install
        return Promise.all(
          STATIC_ASSETS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('[SW] Failed to cache:', url, err);
            });
          })
        );
      })
      .then(function() {
        // Activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker...');
  var currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, FONT_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function(name) {
              return name.startsWith('asap-') && currentCaches.indexOf(name) === -1;
            })
            .map(function(name) {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(function() {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip blacklisted URLs
  if (!shouldCache(url.href)) {
    return;
  }

  // For navigation requests (HTML pages) - Network first with offline fallback
  if (request.mode === 'navigate' || request.headers.get('accept').indexOf('text/html') !== -1) {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          // Only cache valid responses
          if (response.status === 200) {
            var responseClone = safeClone(response);
            caches.open(DYNAMIC_CACHE).then(function(cache) {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(function() {
          // Try cache first, then offline page
          return caches.match(request)
            .then(function(cachedResponse) {
              return cachedResponse || caches.match('/offline');
            });
        })
    );
    return;
  }

  // For fonts - Cache first (fonts rarely change)
  if (url.pathname.match(/\.(woff|woff2|ttf|eot|otf)$/) || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request)
        .then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then(function(response) {
            if (response.status === 200) {
              var responseClone = safeClone(response);
              caches.open(FONT_CACHE).then(function(cache) {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // For images - Cache first with stale-while-revalidate
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/)) {
    event.respondWith(
      caches.match(request)
        .then(function(cachedResponse) {
          var fetchPromise = fetch(request)
            .then(function(response) {
              if (response.status === 200) {
                var responseClone = safeClone(response);
                caches.open(IMAGE_CACHE).then(function(cache) {
                  cache.put(request, responseClone);
                  limitCacheSize(IMAGE_CACHE, MAX_IMAGE_CACHE_ITEMS);
                });
              }
              return response;
            })
            .catch(function() {
              return cachedResponse;
            });
          
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // For static assets (JS, CSS) - Stale-while-revalidate
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      caches.match(request)
        .then(function(cachedResponse) {
          var fetchPromise = fetch(request)
            .then(function(response) {
              if (response.status === 200) {
                var responseClone = safeClone(response);
                caches.open(STATIC_CACHE).then(function(cache) {
                  cache.put(request, responseClone);
                });
              }
              return response;
            })
            .catch(function() {
              return cachedResponse;
            });
          
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // Default: Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then(function(response) {
        if (response.status === 200 && shouldCache(url.href)) {
          var responseClone = safeClone(response);
          caches.open(DYNAMIC_CACHE).then(function(cache) {
            cache.put(request, responseClone);
            limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(request);
      })
  );
});

// Handle push notifications (with feature detection)
self.addEventListener('push', function(event) {
  if (!event.data) return;

  var data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'ASAP', body: event.data.text() };
  }

  var options = {
    body: data.body || 'Nouvelle notification ASAP',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'asap-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ASAP', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Focus existing window if available
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  // Analytics or cleanup if needed
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Background sync for offline actions (with feature detection)
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  } else if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

// Periodic background sync (Chrome only, with feature detection)
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

function syncData() {
  console.log('[SW] Background sync: data');
  // Implement background sync for offline form submissions, etc.
  return Promise.resolve();
}

function syncAnalytics() {
  console.log('[SW] Background sync: analytics');
  // Implement background sync for analytics
  return Promise.resolve();
}

function updateContent() {
  console.log('[SW] Periodic sync: updating content');
  // Implement periodic content updates
  return caches.open(DYNAMIC_CACHE).then(function(cache) {
    return cache.add('/').catch(function() {});
  });
}

// Handle messages from clients
self.addEventListener('message', function(event) {
  if (!event.data) return;
  
  var action = event.data.action || event.data.type;
  
  switch (action) {
    case 'skipWaiting':
      self.skipWaiting();
      break;
      
    case 'clearCache':
      event.waitUntil(
        caches.keys().then(function(cacheNames) {
          return Promise.all(
            cacheNames.map(function(name) {
              return caches.delete(name);
            })
          );
        }).then(function() {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true });
          }
        })
      );
      break;
      
    case 'getCacheSize':
      event.waitUntil(
        getCacheSize().then(function(size) {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ size: size });
          }
        })
      );
      break;
  }
});

// Helper: Get total cache size
function getCacheSize() {
  return caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        return caches.open(cacheName).then(function(cache) {
          return cache.keys().then(function(keys) {
            return keys.length;
          });
        });
      })
    );
  }).then(function(sizes) {
    return sizes.reduce(function(a, b) { return a + b; }, 0);
  });
}

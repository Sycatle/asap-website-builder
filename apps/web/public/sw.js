/**
 * ASAP Service Worker - v3.0.0
 * Comprehensive PWA implementation with cross-browser support
 * 
 * Features:
 * - Multi-strategy caching (Network First, Cache First, Stale-While-Revalidate)
 * - Offline support with fallback pages
 * - Background sync for offline actions
 * - Push notifications
 * - Periodic background sync
 * - Share Target API
 * - File Handler API
 * - Cross-browser compatibility
 */

'use strict';

// ============================================================================
// CONFIGURATION
// ============================================================================

const VERSION = '3.0.0';
const CACHE_PREFIX = 'asap';
const CACHE_VERSION = 'v3';

// Cache names
const CACHE_NAMES = {
  static: `${CACHE_PREFIX}-static-${CACHE_VERSION}`,
  dynamic: `${CACHE_PREFIX}-dynamic-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
  fonts: `${CACHE_PREFIX}-fonts-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}-api-${CACHE_VERSION}`,
  offline: `${CACHE_PREFIX}-offline-${CACHE_VERSION}`,
};

// Static assets to precache
const PRECACHE_ASSETS = [
  '/',
  '/app/dashboard',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Routes that should work offline
const OFFLINE_FALLBACK_PAGE = '/offline.html';

// API cache duration (in seconds)
const API_CACHE_DURATION = 5 * 60; // 5 minutes

// Maximum cache size per cache
const MAX_CACHE_SIZE = {
  dynamic: 50,
  images: 60,
  api: 30,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a request is for a static asset
 */
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/);
}

/**
 * Check if a request is for an image
 */
function isImage(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/);
}

/**
 * Check if a request is for a font
 */
function isFont(url) {
  return url.pathname.match(/\.(woff2?|ttf|otf|eot)$/);
}

/**
 * Check if a request is for an API endpoint
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || url.hostname.includes('api.');
}

/**
 * Check if a request should be handled by the service worker
 */
function shouldHandle(request) {
  const url = new URL(request.url);
  
  // Only handle same-origin requests and specific external resources
  if (url.origin !== self.location.origin && !isFont(url)) {
    return false;
  }
  
  // Don't handle browser extensions
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return false;
  }
  
  // Don't handle WebSocket connections
  if (request.url.includes('/ws')) {
    return false;
  }
  
  return true;
}

/**
 * Limit cache size by removing oldest entries (iterative approach)
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  // Remove excess entries iteratively
  while (keys.length > maxSize) {
    await cache.delete(keys.shift());
  }
}

/**
 * Check if cached response is still fresh
 */
function isFresh(response, maxAge) {
  if (!response) return false;
  
  const cachedDate = response.headers.get('sw-cache-date');
  if (!cachedDate) return false;
  
  const age = (Date.now() - new Date(cachedDate).getTime()) / 1000;
  return age < maxAge;
}

/**
 * Add cache metadata to response
 */
function addCacheMetadata(response) {
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);
  headers.append('sw-cache-date', new Date().toISOString());
  headers.append('sw-version', VERSION);
  
  return new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers: headers,
  });
}

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

/**
 * Cache First strategy - Good for static assets
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, addCacheMetadata(response.clone()));
    }
    return response;
  } catch (error) {
    console.warn('[SW] Cache First failed:', error);
    throw error;
  }
}

/**
 * Network First strategy - Good for dynamic content
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(3000) });
    if (response && response.status === 200) {
      cache.put(request, addCacheMetadata(response.clone()));
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Stale While Revalidate strategy - Good for API requests
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        cache.put(request, addCacheMetadata(response.clone()));
      }
      return response;
    })
    .catch(() => cached);
  
  return cached || fetchPromise;
}

/**
 * Network Only strategy - Always fetch from network
 */
async function networkOnly(request) {
  return fetch(request);
}

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', event => {
  console.log('[SW] Installing service worker version:', VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAMES.static);
        
        // Precache static assets
        await Promise.allSettled(
          PRECACHE_ASSETS.map(url =>
            fetch(url)
              .then(response => {
                if (response && response.status === 200) {
                  return cache.put(url, addCacheMetadata(response));
                }
              })
              .catch(error => {
                console.warn(`[SW] Failed to precache ${url}:`, error);
              })
          )
        );
        
        console.log('[SW] Precaching complete');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
      }
    })()
  );
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker version:', VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const validCacheNames = Object.values(CACHE_NAMES);
        
        await Promise.all(
          cacheNames.map(cacheName => {
            if (!validCacheNames.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
        
        // Claim all clients immediately
        await self.clients.claim();
        
        console.log('[SW] Activation complete');
        
        // Notify all clients about the new version
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: VERSION,
          });
        });
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

// ============================================================================
// FETCH EVENT
// ============================================================================

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip requests we shouldn't handle
  if (!shouldHandle(request)) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Fonts - Cache First
        if (isFont(url)) {
          return await cacheFirst(request, CACHE_NAMES.fonts);
        }
        
        // Images - Cache First with size limit
        if (isImage(url)) {
          const response = await cacheFirst(request, CACHE_NAMES.images);
          limitCacheSize(CACHE_NAMES.images, MAX_CACHE_SIZE.images);
          return response;
        }
        
        // Static assets (JS, CSS) - Cache First
        if (isStaticAsset(url)) {
          return await cacheFirst(request, CACHE_NAMES.static);
        }
        
        // API requests - Stale While Revalidate with fresh check
        if (isApiRequest(url)) {
          const cache = await caches.open(CACHE_NAMES.api);
          const cached = await cache.match(request);
          
          if (cached && isFresh(cached, API_CACHE_DURATION)) {
            // Return cached if still fresh, but revalidate in background
            fetch(request)
              .then(response => {
                if (response && response.status === 200) {
                  cache.put(request, addCacheMetadata(response.clone()));
                }
              })
              .catch(() => {});
            return cached;
          }
          
          const response = await staleWhileRevalidate(request, CACHE_NAMES.api);
          limitCacheSize(CACHE_NAMES.api, MAX_CACHE_SIZE.api);
          return response;
        }
        
        // Navigation requests - Network First with offline fallback
        if (request.mode === 'navigate') {
          try {
            const response = await networkFirst(request, CACHE_NAMES.dynamic);
            limitCacheSize(CACHE_NAMES.dynamic, MAX_CACHE_SIZE.dynamic);
            return response;
          } catch (error) {
            // Return offline fallback page
            const offlineCache = await caches.open(CACHE_NAMES.offline);
            const offlinePage = await offlineCache.match(OFFLINE_FALLBACK_PAGE);
            if (offlinePage) {
              return offlinePage;
            }
            // Last resort: return a basic offline page
            return new Response(
              `<!DOCTYPE html>
              <html lang="fr">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Hors ligne - ASAP</title>
                <style>
                  body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 50px; background: #0a0a0a; color: #fff; }
                  h1 { color: #6366f1; }
                  p { color: #999; }
                  button { background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin-top: 20px; }
                  button:hover { background: #4f46e5; }
                </style>
              </head>
              <body>
                <h1>📡 Vous êtes hors ligne</h1>
                <p>Impossible de charger cette page. Vérifiez votre connexion Internet.</p>
                <button onclick="location.reload()">Réessayer</button>
              </body>
              </html>`,
              {
                headers: { 'Content-Type': 'text/html' },
              }
            );
          }
        }
        
        // Default - Stale While Revalidate
        const response = await staleWhileRevalidate(request, CACHE_NAMES.dynamic);
        limitCacheSize(CACHE_NAMES.dynamic, MAX_CACHE_SIZE.dynamic);
        return response;
      } catch (error) {
        console.error('[SW] Fetch failed:', error);
        throw error;
      }
    })()
  );
});

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(CACHE_NAMES.offline);
          const queueResponse = await cache.match('/__offline_queue__');
          
          if (!queueResponse) {
            return;
          }
          
          const queue = await queueResponse.json();
          const synced = [];
          const failed = [];
          
          // Try to sync each action
          for (const action of queue) {
            try {
              const response = await fetch(action.url, {
                method: action.method || 'POST',
                headers: action.headers || {},
                body: action.body || null,
              });
              
              if (response.ok) {
                synced.push(action);
              } else {
                failed.push(action);
              }
            } catch (error) {
              console.warn('[SW] Failed to sync action:', error);
              failed.push(action);
            }
          }
          
          // Update queue with failed actions
          if (failed.length > 0) {
            await cache.put(
              new Request('/__offline_queue__'),
              new Response(JSON.stringify(failed))
            );
          } else {
            await cache.delete('/__offline_queue__');
          }
          
          // Notify clients about sync results
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_COMPLETE',
              synced: synced.length,
              remaining: failed.length,
            });
          });
          
          console.log(`[SW] Background sync complete: ${synced.length} synced, ${failed.length} failed`);
        } catch (error) {
          console.error('[SW] Background sync failed:', error);
        }
      })()
    );
  }
});

// ============================================================================
// PERIODIC BACKGROUND SYNC
// ============================================================================

// Handle periodic background sync (check for notifications)
self.addEventListener('periodicsync', event => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'check-notifications') {
    event.waitUntil(
      (async () => {
        try {
          // Fetch new notifications from API
          const response = await fetch('/api/notifications/unread', {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            const unreadCount = data.count || 0;
            
            // Update badge
            if ('setAppBadge' in self.navigator) {
              try {
                if (unreadCount > 0) {
                  await self.navigator.setAppBadge(unreadCount);
                } else {
                  await self.navigator.clearAppBadge();
                }
              } catch (error) {
                console.warn('[SW] Failed to update app badge:', error);
              }
            }
            
            // Notify clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'NEW_NOTIFICATIONS',
                count: unreadCount,
              });
            });
          }
        } catch (error) {
          console.warn('[SW] Periodic sync failed:', error);
        }
      })()
    );
  }
});

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  const defaultOptions = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {},
    actions: [
      { action: 'open', title: 'Ouvrir', icon: '/icons/icon-96x96.png' },
      { action: 'close', title: 'Fermer' },
    ],
  };
  
  let notification = {
    title: 'ASAP',
    body: 'Vous avez une nouvelle notification',
    ...defaultOptions,
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notification = {
        title: data.title || notification.title,
        body: data.body || notification.body,
        ...defaultOptions,
        data: data.data || {},
      };
    } catch (error) {
      console.warn('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notification.title, notification)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Open or focus the app
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window' });
      
      // Try to focus existing window
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      const urlToOpen = event.notification.data?.url || '/app/dashboard';
      return self.clients.openWindow(urlToOpen);
    })()
  );
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data?.action);
  
  const { action, payload } = event.data || {};
  
  switch (action) {
    case 'skipWaiting':
      self.skipWaiting();
      break;
      
    case 'getVersion':
      event.ports[0]?.postMessage({ version: VERSION });
      break;
      
    case 'clearCache':
      event.waitUntil(
        (async () => {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
            event.ports[0]?.postMessage({ success: true });
          } catch (error) {
            event.ports[0]?.postMessage({ success: false, error: error.message });
          }
        })()
      );
      break;
      
    case 'getCacheStats':
      event.waitUntil(
        (async () => {
          try {
            const stats = {
              version: VERSION,
              caches: {},
              totalItems: 0,
            };
            
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              const cache = await caches.open(cacheName);
              const keys = await cache.keys();
              stats.caches[cacheName] = {
                name: cacheName,
                count: keys.length,
              };
              stats.totalItems += keys.length;
            }
            
            event.ports[0]?.postMessage(stats);
          } catch (error) {
            event.ports[0]?.postMessage({ error: error.message });
          }
        })()
      );
      break;
      
    case 'queueOfflineAction':
      event.waitUntil(
        (async () => {
          try {
            const cache = await caches.open(CACHE_NAMES.offline);
            let queue = [];
            
            try {
              const response = await cache.match('/__offline_queue__');
              if (response) {
                queue = await response.json();
              }
            } catch (error) {
              console.warn('[SW] Failed to load queue:', error);
            }
            
            payload.id = payload.id || Date.now().toString();
            queue.push(payload);
            
            await cache.put(
              new Request('/__offline_queue__'),
              new Response(JSON.stringify(queue))
            );
            
            // Try to register background sync
            if ('sync' in self.registration) {
              await self.registration.sync.register('sync-offline-actions');
            }
          } catch (error) {
            console.error('[SW] Failed to queue action:', error);
          }
        })()
      );
      break;
  }
});

// ============================================================================
// SHARE TARGET API
// ============================================================================

// Handle shared content from other apps
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle share target
  if (
    url.pathname === '/app/cloud' &&
    url.searchParams.get('source') === 'share' &&
    event.request.method === 'POST'
  ) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          
          // Cache shared data for the app to retrieve
          const cache = await caches.open(CACHE_NAMES.offline);
          await cache.put(
            new Request('/__share_data__'),
            new Response(JSON.stringify({
              title: formData.get('title'),
              text: formData.get('text'),
              url: formData.get('url'),
              files: formData.getAll('files'),
              timestamp: Date.now(),
            }))
          );
          
          // Redirect to the app
          return Response.redirect('/app/cloud?shared=true', 303);
        } catch (error) {
          console.error('[SW] Share target failed:', error);
          return Response.redirect('/app/cloud', 303);
        }
      })()
    );
  }
});

console.log('[SW] Service Worker loaded - Version:', VERSION);

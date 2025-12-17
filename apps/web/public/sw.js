// ASAP Service Worker v3 - Enterprise-grade PWA Support
// Supports: Chrome, Firefox, Safari, Edge, Opera, Samsung Internet, UC Browser
// Features: Push Notifications, Background Sync, Offline Queue, Share Target

'use strict';

// ============================================================================
// CONFIGURATION
// ============================================================================

var SW_VERSION = 'v3';
var CACHE_PREFIX = 'asap-';

// Cache names
var CACHES = {
  static: CACHE_PREFIX + 'static-' + SW_VERSION,
  dynamic: CACHE_PREFIX + 'dynamic-' + SW_VERSION,
  images: CACHE_PREFIX + 'images-' + SW_VERSION,
  fonts: CACHE_PREFIX + 'fonts-' + SW_VERSION,
  api: CACHE_PREFIX + 'api-' + SW_VERSION,
  offline: CACHE_PREFIX + 'offline-' + SW_VERSION
};

// Cache size limits
var CACHE_LIMITS = {
  dynamic: 100,
  images: 150,
  api: 50
};

// Cache TTL (in milliseconds)
var CACHE_TTL = {
  api: 5 * 60 * 1000,      // 5 minutes for API responses
  dynamic: 24 * 60 * 60 * 1000 // 24 hours for dynamic content
};

// Critical assets to precache
var PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/login',
  '/app/dashboard',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-72x72.png'
];

// URLs that should NEVER be cached
var CACHE_BLACKLIST = [
  /\/api\/auth\//,           // Auth endpoints
  /\/api\/.*\/upload/,       // Upload endpoints
  /\/api\/files\/[^/]+$/,    // File downloads with tokens
  /chrome-extension:/,
  /extensions\//,
  /^chrome:/,
  /^moz-extension:/,
  /__webpack_hmr/,
  /hot-update/,
  /\.hot-update\./,
  /sockjs-node/,
  /ws:\/\//,
  /wss:\/\//
];

// API endpoints that can be cached briefly
var CACHEABLE_API = [
  /\/api\/extensions\/catalog/,
  /\/api\/websites$/,
  /\/api\/notifications\/unread-count/
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function shouldCache(url) {
  return !CACHE_BLACKLIST.some(function(pattern) {
    return pattern.test(url);
  });
}

function isApiRequest(url) {
  return url.indexOf('/api/') !== -1;
}

function isCacheableApi(url) {
  return CACHEABLE_API.some(function(pattern) {
    return pattern.test(url);
  });
}

function isNavigationRequest(request) {
  var accept = request.headers.get('accept') || '';
  return request.mode === 'navigate' || 
         (request.method === 'GET' && accept.indexOf('text/html') !== -1);
}

function isImageRequest(url) {
  return /\.(png|jpg|jpeg|gif|svg|ico|webp|avif|bmp|tiff)(\?.*)?$/i.test(url);
}

function isFontRequest(url) {
  // Check file extension first
  if (/\.(woff|woff2|ttf|eot|otf)(\?.*)?$/i.test(url)) {
    return true;
  }
  // Check for Google Fonts domains (use URL parsing for security)
  try {
    var parsedUrl = new URL(url);
    var hostname = parsedUrl.hostname;
    return hostname === 'fonts.gstatic.com' || hostname === 'fonts.googleapis.com';
  } catch (e) {
    return false;
  }
}

function isStaticAsset(url) {
  return /\.(js|css|json)(\?.*)?$/i.test(url);
}

// Safe response clone that handles opaque responses
function safeClone(response) {
  try {
    // Check if response body is already used
    if (response.bodyUsed) {
      console.warn('[SW] Response body already used, cannot clone');
      return null;
    }
    return response.clone();
  } catch (e) {
    console.warn('[SW] Failed to clone response:', e.message);
    return null;
  }
}

// Limit cache size using LRU strategy
function limitCacheSize(cacheName, maxItems) {
  caches.open(cacheName).then(function(cache) {
    cache.keys().then(function(keys) {
      if (keys.length > maxItems) {
        // Delete oldest entries (FIFO)
        var toDelete = keys.slice(0, keys.length - maxItems);
        Promise.all(toDelete.map(function(key) {
          return cache.delete(key);
        }));
      }
    });
  });
}

// Check if cached response is stale
function isCacheStale(response, maxAge) {
  var dateHeader = response.headers.get('sw-cache-date');
  if (!dateHeader) return true;
  var cacheDate = new Date(dateHeader).getTime();
  return Date.now() - cacheDate > maxAge;
}

// Add cache date header to response (must receive a cloned response)
function addCacheDate(response) {
  if (!response) return null;
  try {
    // Check if body is already used
    if (response.bodyUsed) {
      console.warn('[SW] Cannot add cache date, body already used');
      return null;
    }
    var headers = new Headers(response.headers);
    headers.set('sw-cache-date', new Date().toISOString());
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  } catch (e) {
    console.warn('[SW] Failed to add cache date:', e.message);
    return null;
  }
}

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker ' + SW_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Precache critical assets
      caches.open(CACHES.static).then(function(cache) {
        console.log('[SW] Precaching critical assets');
        return Promise.all(
          PRECACHE_ASSETS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('[SW] Failed to precache:', url, err.message);
            });
          })
        );
      }),
      // Create offline cache
      caches.open(CACHES.offline)
    ]).then(function() {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker ' + SW_VERSION);
  
  var currentCaches = [CACHES.static, CACHES.dynamic, CACHES.images, CACHES.fonts, CACHES.api, CACHES.offline];
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) {
            return name.indexOf(CACHE_PREFIX) === 0 && currentCaches.indexOf(name) === -1;
          })
          .map(function(name) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(function() {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    }).then(function() {
      // Notify all clients about activation
      return self.clients.matchAll().then(function(clientList) {
        clientList.forEach(function(client) {
          client.postMessage({ type: 'SW_ACTIVATED', version: SW_VERSION });
        });
      });
    })
  );
});

// ============================================================================
// FETCH EVENT - Main request handler
// ============================================================================

self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);
  
  // Skip non-GET requests (except for share target)
  if (request.method !== 'GET') {
    // Handle share target POST
    if (request.method === 'POST' && url.pathname === '/app/cloud') {
      event.respondWith(handleShareTarget(event));
      return;
    }
    return;
  }
  
  // Skip non-http(s) requests
  if (url.protocol.indexOf('http') !== 0) {
    return;
  }
  
  // Skip blacklisted URLs
  if (!shouldCache(url.href)) {
    return;
  }
  
  // Route to appropriate handler
  if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else if (isApiRequest(url.href)) {
    event.respondWith(handleApiRequest(request));
  } else if (isFontRequest(url.href)) {
    event.respondWith(handleFontRequest(request));
  } else if (isImageRequest(url.href)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(url.href)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// ============================================================================
// FETCH HANDLERS
// ============================================================================

// Navigation: Network first with offline fallback
function handleNavigationRequest(request) {
  return fetch(request).then(function(response) {
    if (response.ok) {
      var cloned = safeClone(response);
      if (cloned) {
        caches.open(CACHES.dynamic).then(function(cache) {
          cache.put(request, cloned);
        });
      }
    }
    return response;
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      if (cached) return cached;
      
      // Return offline page
      return caches.match('/offline').then(function(offlinePage) {
        if (offlinePage) return offlinePage;
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    });
  });
}

// API: Network first with optional brief caching
function handleApiRequest(request) {
  var url = request.url;
  
  return fetch(request).then(function(response) {
    // Cache certain API responses briefly
    if (response.ok && isCacheableApi(url)) {
      var cloned = safeClone(response);
      if (cloned) {
        var responseWithDate = addCacheDate(cloned);
        if (responseWithDate) {
          caches.open(CACHES.api).then(function(cache) {
            cache.put(request, responseWithDate);
            limitCacheSize(CACHES.api, CACHE_LIMITS.api);
          });
        }
      }
    }
    return response;
  }).catch(function() {
    // Try cache for cacheable endpoints
    if (isCacheableApi(url)) {
      return caches.match(request).then(function(cached) {
        if (cached && !isCacheStale(cached, CACHE_TTL.api)) {
          console.log('[SW] Serving cached API:', url);
          return cached;
        }
        // Return error response for API failures
        return new Response(
          JSON.stringify({ error: 'Network unavailable', offline: true }),
          { 
            status: 503, 
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      });
    }
    
    return new Response(
      JSON.stringify({ error: 'Network unavailable', offline: true }),
      { 
        status: 503, 
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  });
}

// Fonts: Cache first (fonts rarely change)
function handleFontRequest(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    
    return fetch(request).then(function(response) {
      if (response.ok) {
        var cloned = safeClone(response);
        if (cloned) {
          caches.open(CACHES.fonts).then(function(cache) {
            cache.put(request, cloned);
          });
        }
      }
      return response;
    }).catch(function() {
      return new Response('', { status: 404 });
    });
  });
}

// Images: Stale-while-revalidate
function handleImageRequest(request) {
  return caches.match(request).then(function(cached) {
    var networkPromise = fetch(request).then(function(response) {
      if (response.ok) {
        var cloned = safeClone(response);
        if (cloned) {
          caches.open(CACHES.images).then(function(cache) {
            cache.put(request, cloned);
            limitCacheSize(CACHES.images, CACHE_LIMITS.images);
          });
        }
      }
      return response;
    }).catch(function() {
      return cached || new Response('', { status: 404 });
    });
    
    return cached || networkPromise;
  });
}

// Static assets: Stale-while-revalidate
function handleStaticAsset(request) {
  return caches.match(request).then(function(cached) {
    var networkPromise = fetch(request).then(function(response) {
      if (response.ok) {
        var cloned = safeClone(response);
        if (cloned) {
          caches.open(CACHES.static).then(function(cache) {
            cache.put(request, cloned);
          });
        }
      }
      return response;
    }).catch(function() {
      return cached;
    });
    
    return cached || networkPromise;
  });
}

// Default: Network first with cache fallback
function handleDefaultRequest(request) {
  return fetch(request).then(function(response) {
    if (response.ok && shouldCache(request.url)) {
      var cloned = safeClone(response);
      if (cloned) {
        caches.open(CACHES.dynamic).then(function(cache) {
          cache.put(request, cloned);
          limitCacheSize(CACHES.dynamic, CACHE_LIMITS.dynamic);
        });
      }
    }
    return response;
  }).catch(function() {
    return caches.match(request);
  });
}

// Handle share target
function handleShareTarget(event) {
  return event.request.formData().then(function(formData) {
    var files = formData.getAll('files');
    var title = formData.get('title');
    var text = formData.get('text');
    var url = formData.get('url');
    
    // Store shared data for the app to pick up
    var shareData = {
      files: files.map(function(f) { return { name: f.name, type: f.type, size: f.size }; }),
      title: title,
      text: text,
      url: url,
      timestamp: Date.now()
    };
    
    // Store in cache for the app to read
    return caches.open(CACHES.offline).then(function(cache) {
      return cache.put(
        new Request('/__share_target_data__'),
        new Response(JSON.stringify(shareData))
      );
    }).then(function() {
      // Redirect to cloud page
      return Response.redirect('/app/cloud?source=share&pending=true', 303);
    }).catch(function() {
      return Response.redirect('/app/cloud?source=share', 303);
    });
  });
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', function(event) {
  console.log('[SW] Push received');
  
  var data = {
    title: 'ASAP',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png'
  };
  
  if (event.data) {
    try {
      var pushData = event.data.json();
      data = {
        title: pushData.title || data.title,
        body: pushData.body || pushData.message || data.body,
        icon: pushData.icon || data.icon,
        badge: data.badge,
        image: pushData.image,
        tag: pushData.tag || 'asap-' + Date.now(),
        url: pushData.action_url || pushData.url || '/app/dashboard',
        notificationId: pushData.id,
        category: pushData.category,
        priority: pushData.priority
      };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  var options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    image: data.image,
    tag: data.tag,
    data: {
      url: data.url,
      notificationId: data.notificationId,
      category: data.category,
      timestamp: Date.now()
    },
    vibrate: [100, 50, 100, 50, 100],
    requireInteraction: data.priority === 'high' || data.priority === 'urgent',
    renotify: true,
    silent: false,
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'dismiss', title: 'Ignorer' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  var urlToOpen = '/app/dashboard';
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Focus existing window
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (client.url.indexOf('/app') !== -1 && 'focus' in client) {
            return client.focus().then(function() {
              if ('navigate' in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

self.addEventListener('sync', function(event) {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  } else if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

function syncOfflineActions() {
  console.log('[SW] Syncing offline actions...');
  
  return caches.open(CACHES.offline).then(function(cache) {
    return cache.match('/__offline_queue__');
  }).then(function(response) {
    if (!response) return Promise.resolve();
    
    return response.json().then(function(queue) {
      var successful = [];
      
      var syncPromises = queue.map(function(action) {
        return fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        }).then(function(res) {
          if (res.ok) {
            successful.push(action.id);
          }
        }).catch(function() {
          console.log('[SW] Failed to sync action:', action.id);
        });
      });
      
      return Promise.all(syncPromises).then(function() {
        // Remove successful actions from queue
        var remaining = queue.filter(function(a) {
          return successful.indexOf(a.id) === -1;
        });
        
        return caches.open(CACHES.offline).then(function(cache) {
          if (remaining.length > 0) {
            return cache.put(
              new Request('/__offline_queue__'),
              new Response(JSON.stringify(remaining))
            );
          } else {
            return cache.delete('/__offline_queue__');
          }
        }).then(function() {
          // Notify clients
          return self.clients.matchAll().then(function(clientList) {
            clientList.forEach(function(client) {
              client.postMessage({ 
                type: 'SYNC_COMPLETE', 
                synced: successful.length,
                remaining: remaining.length 
              });
            });
          });
        });
      });
    });
  });
}

function syncAnalytics() {
  console.log('[SW] Syncing analytics...');
  return Promise.resolve();
}

// Periodic background sync (Chromium only)
self.addEventListener('periodicsync', function(event) {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNewNotifications());
  } else if (event.tag === 'update-cache') {
    event.waitUntil(updateCriticalCache());
  }
});

function checkForNewNotifications() {
  return fetch('/api/notifications/unread-count').then(function(response) {
    return response.json();
  }).then(function(data) {
    if (data.count > 0) {
      return self.clients.matchAll().then(function(clientList) {
        clientList.forEach(function(client) {
          client.postMessage({ type: 'NEW_NOTIFICATIONS', count: data.count });
        });
      });
    }
  }).catch(function() {
    console.log('[SW] Failed to check notifications');
  });
}

function updateCriticalCache() {
  return caches.open(CACHES.static).then(function(cache) {
    return Promise.all(
      PRECACHE_ASSETS.map(function(url) {
        return cache.add(url).catch(function() {});
      })
    );
  });
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.addEventListener('message', function(event) {
  if (!event.data) return;
  
  var action = event.data.action || event.data.type;
  console.log('[SW] Message received:', action);
  
  switch (action) {
    case 'skipWaiting':
      self.skipWaiting();
      break;
      
    case 'clearCache':
      event.waitUntil(
        caches.keys().then(function(names) {
          return Promise.all(names.map(function(n) { return caches.delete(n); }));
        }).then(function() {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true });
          }
        })
      );
      break;
      
    case 'getCacheStats':
      event.waitUntil(
        getCacheStats().then(function(stats) {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage(stats);
          }
        })
      );
      break;
      
    case 'queueOfflineAction':
      event.waitUntil(queueOfflineAction(event.data.payload));
      break;
      
    case 'getVersion':
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ version: SW_VERSION });
      }
      break;
  }
});

function getCacheStats() {
  var stats = {};
  return caches.keys().then(function(names) {
    return Promise.all(names.map(function(name) {
      return caches.open(name).then(function(cache) {
        return cache.keys().then(function(keys) {
          stats[name] = {
            count: keys.length,
            name: name
          };
        });
      });
    }));
  }).then(function() {
    var totalItems = 0;
    Object.keys(stats).forEach(function(key) {
      totalItems += stats[key].count;
    });
    
    return {
      version: SW_VERSION,
      caches: stats,
      totalItems: totalItems
    };
  });
}

function queueOfflineAction(action) {
  return caches.open(CACHES.offline).then(function(cache) {
    return cache.match('/__offline_queue__').then(function(response) {
      var queue = [];
      if (response) {
        return response.json().then(function(data) {
          queue = data;
          return queue;
        });
      }
      return queue;
    }).then(function(queue) {
      action.id = action.id || Date.now().toString();
      action.timestamp = Date.now();
      queue.push(action);
      
      return cache.put(
        new Request('/__offline_queue__'),
        new Response(JSON.stringify(queue))
      );
    }).then(function() {
      // Register for background sync if supported
      if ('sync' in self.registration) {
        return self.registration.sync.register('sync-offline-actions').catch(function() {
          console.log('[SW] Background sync not available');
        });
      }
    });
  });
}

// ============================================================================
// PUSH SUBSCRIPTION CHANGE
// ============================================================================

self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[SW] Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey
    }).then(function(subscription) {
      var p256dh = subscription.getKey('p256dh');
      var auth = subscription.getKey('auth');
      
      return fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh))),
            auth: btoa(String.fromCharCode.apply(null, new Uint8Array(auth)))
          }
        }),
        credentials: 'include'
      });
    }).catch(function(error) {
      console.error('[SW] Resubscription failed:', error);
    })
  );
});

console.log('[SW] Service Worker ' + SW_VERSION + ' loaded');

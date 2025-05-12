// Service Worker for PACER Game - Offline Support
const CACHE_NAME = 'pacer-game-cache-v1';
const OFFLINE_URL = '/index.html';

// Only cache essential files that we know exist
const urlsToCache = [
  '/',
  '/index.html'
  // Other assets will be added as they are used
];

// Install event - cache key resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Only cache the most basic files to prevent errors
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache resources:', error);
        // Continue anyway to prevent blocking service worker installation
        return Promise.resolve();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event - respond with cached resources or fetch from network
self.addEventListener('fetch', event => {
  // Skip for API calls
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Skip for manifest file to prevent errors
  if (event.request.url.includes('manifest.json')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the cached response
        if (response) {
          return response;
        }

        // Clone the request since it's a one-time use
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check for a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            try {
              // Clone the response since it's a one-time use
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                })
                .catch(error => {
                  console.error('Failed to cache response:', error);
                });
            } catch (error) {
              console.error('Error processing response:', error);
            }

            return response;
          })
          .catch(error => {
            console.log('Fetch failed; returning index page instead.', error);
            
            // For navigation requests, show the index page
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // Otherwise, just return the error
            throw error;
          });
      })
  );
});

// Background sync for pending actions
self.addEventListener('sync', event => {
  if (event.tag === 'syncPendingActions') {
    event.waitUntil(syncPendingActions());
  }
});

// Function to process pending sync actions
async function syncPendingActions() {
  try {
    // In a real implementation, this would pull data from IndexedDB
    // and process pending actions
    console.log('Background sync triggered for pending actions');
    
    // Signal the app that background sync has completed
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_SYNC_COMPLETED'
        });
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error during background sync:', error);
    return false;
  }
}

/**
 * Service Worker for Calculator App
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'calculator-v1.0.0';
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/assets/css/styles.css',
    '/assets/js/utils/calculator-utils.js',
    '/assets/js/calculator.js',
    '/tests/tests.html',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    // Only log in development mode
    if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
        console.log('Service Worker installing...');
    }
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
                    console.log('Caching static assets');
                }
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
                    console.log('Service Worker installed');
                }
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    // Only log in development mode
    if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
        console.log('Service Worker activating...');
    }
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
                                console.log('Deleting old cache:', cacheName);
                            }
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
                    console.log('Service Worker activated');
                }
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.startsWith('https://fonts.googleapis.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if available
                if (response) {
                    // Cache hit - suppress logs to reduce console spam
                    // Logs are too verbose for normal operation
                    return response;
                }

                // Otherwise fetch from network
                // Only log favicon.ico requests that fail (404s)
                // Other network fetches are suppressed to reduce console spam
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response for caching
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.log('Network fetch failed:', error);
                        
                        // Return offline page for navigation requests
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        
                        throw error;
                    });
            })
    );
});

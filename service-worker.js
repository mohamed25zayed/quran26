const CACHE_NAME = 'qubbah-cache-v4'; // Incremented cache version
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    // Main PWA icons
    '/images/icon-192x192.png',
    '/images/icon-512x512.png',
    // Daily recitation audio
    'https://archive.org/download/quran-abs-as-vf/048.mp3',
    // External assets
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Amiri:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/moment-hijri/2.1.2/moment-hijri.min.js'
];

// Install a service worker
self.addEventListener('install', event => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache).catch(error => {
                    console.error('Failed to cache one or more resources:', error);
                });
            })
    );
});

// Cache and return requests
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Network-first for APIs
    if (requestUrl.hostname.includes('api.aladhan.com') || requestUrl.hostname.includes('api.alquran.cloud') || requestUrl.hostname.includes('random-hadith-generator.vercel.app')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return fetch(event.request)
                    .then(response => {
                        if (response.status === 200) {
                            cache.put(event.request.url, response.clone());
                        }
                        return response;
                    })
                    .catch(() => caches.match(event.request));
            })
        );
    } 
    // Cache-first for other assets
    else {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request);
                })
        );
    }
});

// Update and clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});


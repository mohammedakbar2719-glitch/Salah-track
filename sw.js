/**
 * SalahTrack — Service Worker (Offline Cache)
 */

const CACHE_NAME = 'salahtrack-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/stats.css',
  './css/themes.css',
  './js/models/prayer-types.js',
  './js/models/prayer-record.js',
  './js/utils/date-utils.js',
  './js/utils/dom-utils.js',
  './js/firebase-config.js',
  './js/storage/local-storage.js',
  './js/storage/firestore-adapter.js',
  './js/services/stats-service.js',
  './js/services/qada-service.js',
  './js/services/export-service.js',
  './js/services/prayer-times-calculator.js',
  './js/services/prayer-times.js',
  './js/services/reminder-service.js',
  './js/state.js',
  './js/components/prayer-card.js',
  './js/components/progress-ring.js',
  './js/components/calendar-view.js',
  './js/components/stats-view.js',
  './js/components/qada-view.js',
  './js/components/notes-view.js',
  './js/components/settings-modal.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

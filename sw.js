/* ============================================================
   SONAR — Service Worker (sonar.ax2lan.com)
   But : ouverture quasi instantanée au tap NFC + résilience réseau.
   Stratégie : precache du socle partagé, puis "stale-while-revalidate"
   sur tout le même-origine (chaque app se met en cache au 1er chargement).
   Déployé à la RACINE du domaine → scope "/" couvre /securite, /sauvegarde,
   /hebergement, /contact, /stand.
   ============================================================ */
const VERSION = 'sonar-v1-2026-06-25';
const CORE = [
  '/assets/sonar.css',
  '/assets/sonar-token.js',
  '/assets/qrcode.min.js',
  '/assets/bg-sonar.jpg',
  '/assets/logo-ax2lan.svg',
  '/assets/montserrat-400.woff2',
  '/assets/montserrat-600.woff2',
  '/assets/montserrat-700.woff2',
  '/assets/montserrat-800.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ne touche pas aux appels externes (Web3Forms…)

  e.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});

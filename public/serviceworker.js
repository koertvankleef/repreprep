const CACHE_NAME = 'repreprep-runtime-v2'
const APP_SHELL = [
  './',
  './index.html',
  './site.webmanifest',
  './apple-touch-icon.png',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png',
  './fonts/7cHmv4okm5zmbtYlK-4E4Q.woff2',
  './fonts/7cHmv4okm5zmbtYmK-4E4Q.woff2',
  './fonts/7cHmv4okm5zmbtYnK-4E4Q.woff2',
  './fonts/7cHmv4okm5zmbtYoK-4.woff2',
  './fonts/7cHmv4okm5zmbtYsK-4E4Q.woff2',
  './fonts/7cHov4okm5zmbtYtG-Ec5UIo.woff2',
  './fonts/7cHov4okm5zmbtYtG-gc5UIo.woff2',
  './fonts/7cHov4okm5zmbtYtG-Ic5UIo.woff2',
  './fonts/7cHov4okm5zmbtYtG-Mc5UIo.woff2',
  './fonts/7cHov4okm5zmbtYtG-wc5Q.woff2',
  './fonts/RrQQboN_4yJ0JmiMe2LE0Q.woff2',
  './fonts/RrQQboN_4yJ0JmiMe2zE0YBB.woff2',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match('./index.html')
          return cached ?? Response.error()
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})

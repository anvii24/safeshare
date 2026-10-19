// SafeShare's service worker. It makes the app work offline and receives
// images shared to SafeShare from Android's share menu. It never sends
// anything to a server, and there are no analytics.
/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { SHARE_CACHE, SHARE_FIELD, SHARE_KEY, SHARE_PARAM, SHARE_TARGET_PATH } from './shareTarget'

declare const self: ServiceWorkerGlobalScope

// --- Share target -----------------------------------------------------------
// Registered before Workbox's routes, so this handler sees the POST first.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.pathname === SHARE_TARGET_PATH) {
    event.respondWith(receiveShare(event.request))
  }
})

async function receiveShare(request: Request): Promise<Response> {
  try {
    const form = await request.formData()
    // If several photos are shared, take the first image.
    const file = form.getAll(SHARE_FIELD).find((f): f is File => f instanceof File && f.type.startsWith('image/'))
    if (file) {
      // Kept on this device only, until the app picks it up and deletes it.
      const cache = await caches.open(SHARE_CACHE)
      await cache.put(
        SHARE_KEY,
        new Response(file, {
          headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name || 'shared-image') },
        }),
      )
      return Response.redirect(`/?${SHARE_PARAM}=1`, 303)
    }
  } catch {
    // Fall through to the error redirect below.
  }
  return Response.redirect(`/?${SHARE_PARAM}=error`, 303)
}

// --- Offline ----------------------------------------------------------------
// The app shell, the OCR worker script and the English + Hindi language data
// are precached on install (list injected at build time; see vite.config.ts).
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Every page load (including "/?shared=1") gets the cached app.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// The OCR engine comes in three builds (~3.9 MB each); a device only ever uses
// one. So these are cached the first time they're used rather than all
// precached. The app starts loading the engine as soon as the home screen
// shows, so after the first visit it's cached and the app works offline.
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/tesseract/'),
  new CacheFirst({
    cacheName: 'safeshare-ocr-engine',
    plugins: [new ExpirationPlugin({ maxEntries: 8 })],
  }),
)

// On first install, take control straight away so this first visit already
// caches the OCR engine. Updates still wait until the app is closed, so a
// document someone is working on is never interrupted by a reload.
clientsClaim()

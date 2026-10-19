// Helpers for working offline with the service worker (src/sw.ts).

/** Longest we wait for the service worker before carrying on without it. */
const MAX_WAIT_MS = 15_000

/**
 * Resolves once the service worker controls this page, so files fetched after
 * that (like the OCR engine) go through it and get cached for offline use.
 * On the very first visit the worker is still installing when the page loads.
 * Resolves straight away in development (no service worker) or if service
 * workers aren't available, and after MAX_WAIT_MS at the latest.
 */
export function whenServiceWorkerControls(): Promise<void> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || navigator.serviceWorker.controller) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      navigator.serviceWorker.removeEventListener('controllerchange', done)
      resolve()
    }
    const timer = setTimeout(done, MAX_WAIT_MS)
    navigator.serviceWorker.addEventListener('controllerchange', done)
  })
}

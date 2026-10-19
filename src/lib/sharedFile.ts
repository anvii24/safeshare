// Picks up an image shared to SafeShare from Android's share menu. The service
// worker (src/sw.ts) parked it in a local cache and opened the app with
// ?shared=1. We read it once and delete it immediately.
import { SHARE_CACHE, SHARE_KEY, SHARE_PARAM } from '../shareTarget'

/**
 * The shared image, 'error' if a share arrived but couldn't be read, or null
 * if the app wasn't opened from a share.
 */
export async function takeSharedFile(): Promise<File | 'error' | null> {
  const params = new URLSearchParams(window.location.search)
  const flag = params.get(SHARE_PARAM)

  if (!('caches' in window)) return flag ? 'error' : null
  if (!flag) {
    // Not opened from a share: make sure nothing is left over from an earlier one.
    await caches.delete(SHARE_CACHE)
    return null
  }

  // Drop ?shared=1 from the address, so a reload doesn't try again.
  params.delete(SHARE_PARAM)
  const query = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash)
  if (flag !== '1') return 'error'

  const cache = await caches.open(SHARE_CACHE)
  const response = await cache.match(SHARE_KEY)
  await caches.delete(SHARE_CACHE)
  if (!response) return 'error'

  const blob = await response.blob()
  const name = decodeURIComponent(response.headers.get('X-File-Name') ?? 'shared-image')
  return new File([blob], name, { type: blob.type || response.headers.get('Content-Type') || 'image/jpeg' })
}

// Shared between the app and the service worker (src/sw.ts) for Android's
// "Share → SafeShare". The manifest's share_target POSTs the image to
// SHARE_TARGET_PATH. The service worker keeps it in a local cache and opens the
// app with ?shared=1; the app then reads it and deletes it straight away.
// The image never goes to a server: the POST is answered by the service worker.

export const SHARE_TARGET_PATH = '/share-target'
/** Form field name for the shared file(s), as declared in the manifest. */
export const SHARE_FIELD = 'image'
/** Cache Storage bucket and key that briefly hold the shared image on the device. */
export const SHARE_CACHE = 'safeshare-incoming-share'
export const SHARE_KEY = '/incoming-share'
/** Query parameter the service worker adds when it hands over a share. */
export const SHARE_PARAM = 'shared'

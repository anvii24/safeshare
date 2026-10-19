// "Add to home screen" support: catches the browser's install prompt so we
// can offer our own Install button, and works out how to explain installing
// on browsers that don't have one (iPhone Safari).
import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type Platform = 'ios' | 'android' | 'desktop'

interface InstallState {
  /** We can show our own Install button (Chrome, Edge, Samsung Internet…). */
  canPrompt: boolean
  /** Already running as an installed app. */
  installed: boolean
}

let deferred: BeforeInstallPromptEvent | null = null
let state: InstallState = { canPrompt: false, installed: false }
const listeners = new Set<() => void>()

function update(next: Partial<InstallState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

const runningInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** Call once at startup, before React renders: the prompt event can fire very early. */
export function watchInstallPrompt() {
  state = { canPrompt: false, installed: runningInstalled() }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // hide the browser's own mini-banner; we show a button instead
    deferred = e as BeforeInstallPromptEvent
    update({ canPrompt: true })
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    update({ canPrompt: false, installed: true })
  })
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return
  const event = deferred
  deferred = null // a prompt can only be used once
  update({ canPrompt: false })
  await event.prompt()
  await event.userChoice
}

export function detectPlatform(): Platform {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

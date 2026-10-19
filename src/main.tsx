import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { watchInstallPrompt } from './lib/install'

watchInstallPrompt()
// Offline support and the Android share target (src/sw.ts). In `npm run dev`
// this is a no-op; the service worker only exists in the production build.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

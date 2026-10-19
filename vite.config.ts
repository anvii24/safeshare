import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { SHARE_FIELD, SHARE_TARGET_PATH } from './src/shareTarget.ts'

const THEME = '#0f766e' // teal-700
const BACKGROUND = '#fafaf9' // stone-50

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Our own service worker (src/sw.ts), because the share target needs custom code.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt', // never reload the page under someone mid-document
      injectRegister: false, // registered in main.tsx
      includeManifestIcons: false, // already precached by globPatterns
      injectManifest: {
        // Precached on install: the app, icons, the OCR worker script and both
        // language files. The three OCR engine builds are cached on first use
        // instead (see sw.ts), since a device only needs one of them.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', 'tesseract/worker.min.js', 'tesseract/lang/*.gz'],
        globIgnores: ['tesseract/tesseract-core-*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // eng.traineddata.gz is ~2.9 MB
      },
      manifest: {
        id: '/',
        name: 'SafeShare: hide details before you share',
        short_name: 'SafeShare',
        description:
          'Hide Aadhaar, PAN, bank account and phone numbers on a photo of a document before you share it. Works on your device, even offline.',
        lang: 'en-IN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: THEME,
        background_color: BACKGROUND,
        categories: ['utilities', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Android: lets people pick SafeShare from the share menu in their gallery.
        share_target: {
          action: SHARE_TARGET_PATH,
          method: 'POST',
          enctype: 'multipart/form-data',
          params: { files: [{ name: SHARE_FIELD, accept: ['image/*'] }] },
        },
      },
    }),
  ],
})

# SafeShare

A web app that finds and hides sensitive details on Indian documents before
people share them: Aadhaar numbers, PAN, bank account numbers and phone numbers.
The user picks a photo of a document, SafeShare reads the text (OCR), finds the
sensitive parts and covers them, and the user shares the cleaned image.

## Privacy rule (non-negotiable)

**No server. Nothing leaves the device.**

- No backend, no API calls, no uploads. All processing happens in the browser.
- No analytics, telemetry or error reporting that could carry document content.
- No third-party network requests at runtime: no CDNs, web fonts or remote
  scripts. OCR engine files and language data are self-hosted from
  `public/tesseract/` (copied from `node_modules` by
  `scripts/copy-tesseract-assets.mjs` on install, dev and build).
- Never log OCR text or detected values to the console in committed code.
- Any new dependency must work fully offline in the browser.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Tesseract.js v7 (English, LSTM engine) for OCR, running in a web worker

## Structure

- `src/components/`: UI pieces (`DocumentPicker`, `DocumentViewer`, `OcrStatus`)
- `src/lib/image.ts`: file → upright, size-capped canvas (max 2000px side)
- `src/lib/ocr.ts`: `runOcr(canvas, onProgress)` → words with bbox and line number
- `src/lib/detectors.ts`: sensitive-data detectors (not started)
- `scripts/copy-tesseract-assets.mjs`: copies OCR files into `public/tesseract/`

## Conventions

- Mobile-first. Design for a ~390px-wide phone, then scale up. Tap targets ≥ 48px.
- Calm, clean design: stone neutrals, a single teal accent, rounded cards.
- OCR coordinates are in the processed canvas's pixel space. Overlays use an SVG
  with `viewBox` set to the image size, so they scale with the image.

## Commands

- `npm install`: install dependencies and copy the OCR assets
- `npm run dev`: development server
- `npm run build`: typecheck + production build
- `npm run lint`: oxlint

## Progress

### Day 1 (2026-10-19)
- [x] Project setup (Vite, React, TS, Tailwind, Tesseract.js), git repo
- [x] Self-hosted OCR assets in `public/tesseract/`
- [x] Home screen: "Choose document" (camera or gallery on phones, drag-and-drop on laptops)
- [x] Show the chosen image scaled to the screen width (EXIF rotation fixed)
- [x] `runOcr` returns words with bounding boxes and line numbers
- [x] Debug boxes around every word, with a progress message during OCR

### Next
- [ ] Detectors: Aadhaar (with Verhoeff checksum), PAN, bank account, phone
- [ ] Mask detected regions and export or share the cleaned image
- [ ] Content-Security-Policy that blocks all external network requests

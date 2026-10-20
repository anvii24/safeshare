# SafeShare

A web app that finds and hides sensitive details on Indian documents before
people share them: Aadhaar numbers, PAN, bank account numbers, phone numbers and QR codes.
The user picks a photo of a document, SafeShare reads the text (OCR), finds the
sensitive parts and covers them, and the user shares the cleaned image.

## Privacy rule (non-negotiable)

**No server. Nothing leaves the device.**

- No backend, no API calls, no uploads. All processing happens in the browser.
- No analytics, telemetry or error reporting that could carry document content.
- Enforced by a Content-Security-Policy (`vercel.json`): `connect-src 'self'`, no inline scripts.
  Adding anything that needs another origin means changing the CSP: treat that as a privacy decision.
- No third-party network requests at runtime: no CDNs, web fonts or remote
  scripts. OCR engine files and language data (English + Hindi) are self-hosted from
  `public/tesseract/` (copied from `node_modules` by
  `scripts/copy-tesseract-assets.mjs` on install, dev and build).
- Never log OCR text or detected values to the console in committed code.
- Any new dependency must work fully offline in the browser.
- Masks are SOLID opaque fills. Never blur or pixelate (both can be reversed or read).
- Exported images are fresh JPEGs encoded from a canvas: no EXIF/GPS/metadata from
  the original is ever carried over. Never copy metadata across.
- Sharing only happens when the user taps Share (Web Share API → the phone's own
  share sheet) or Download. The app itself never sends the image anywhere.
- Documents are never persisted. The only on-device storage: Cache Storage for the app +
  OCR files (service worker), Tesseract's own IndexedDB copy of the language data, and an
  incoming Android share, which is held only until the app reads it and then deleted.
- The About page (`AboutPage.tsx`) is a promise to users. If behaviour changes (anything
  stored or sent), update that page in the same change.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Tesseract.js v7 (English + Hindi, LSTM engine) for OCR, running in a web worker
- jsQR for finding QR codes, running in its own web worker
- vite-plugin-pwa (injectManifest) + Workbox: installable PWA, offline, Android share target
- Vitest for unit tests

## Structure

- `src/components/`: UI pieces
  - `DocumentPicker`: choose a file; `ProgressSteps`: 4-step progress checklist
  - `Notice`: friendly error / warning card (bad file, no text, blurry)
  - `ReviewScreen`: review step layout (dark "secure mode"), "N found" badge, masking-style switch,
    bottom bar (Undo / Draw box / Continue)
  - `ReviewCanvas`: image + SVG overlay; bars slide in one by one on open; tap boxes to select,
    drag to draw (pointer events, touch-safe)
  - `ItemList`, `ItemControls`: list rows with hidden/visible switch or delete
  - `ShareScreen`: before/after preview, purpose watermark field, Download / Share bar, "check before sending" reminder
  - `BeforeAfter`: before/after slider (pointer drag with `touch-action: pan-y`, hidden range input for keyboard)
  - `Logo` (`BarMark` + name), `SampleCard`: home hero, a made-up "Sample" ID that redacts itself on loop
- `src/lib/image.ts`: file → upright, size-capped working canvas (max 2000px side); keeps the original
  `file` for the full-size export. Throws `ImageError` (title + message for the user) for bad files
- `src/lib/qr.ts` → `qr.worker.ts` → `qrScan.ts`: QR codes found off the main thread. Only the
  position is used; decoded contents are never stored, shown or logged
- `src/lib/quality.ts`: `assessQuality(words, qrBoxes)` → ok / no_text / blurry, from OCR confidence
- `src/lib/ocr.ts`: `runOcr(canvas, onProgress)` → words with bbox and line number. One fresh
  worker per document (terminated after, to free memory); `preloadOcr()` starts the next one
  while the user is on the choose-photo screen
- `src/lib/detectors.ts`: sensitive-data detectors. Each takes OCR words and
  returns `{ type, text, boxes }`; `detectAll` runs them all and removes overlaps
- `src/lib/detectors.test.ts`: tests for every detector
- `src/lib/pipeline.ts`: `processDocument(file)`: load → OCR + QR scan in parallel → detections + quality.
  Used by App.tsx AND by the evaluation, so the evaluation measures exactly what users get
- `src/lib/evaluate.ts`: scoring for the evaluation (catch rate, false alarms, mislabels, masking)
- `src/lib/review.ts`: review state (reducer with undo), item labels, and `maskRects` /
  `maskPlan`: the exact rectangles to paint over, including "keep last 4 digits"
- `src/lib/review.test.ts`, `qrScan.test.ts`, `quality.test.ts`: tests for those modules
- `src/lib/export.ts`: `renderFinalImage`: re-decodes the original at full resolution
  (capped at 16 MP for iOS), paints `maskPlan` rects scaled up, adds the watermark, exports JPEG
- `src/lib/export.test.ts`: tests for sizing, rect scaling, watermark text, file name
- `src/test/fakes.ts`: test helpers: `fakeAadhaar` (Verhoeff-valid), `ocrWords` (fake OCR layout)
- `scripts/copy-tesseract-assets.mjs`: copies OCR files into `public/tesseract/`
- `scripts/eval.mjs`: detection quality report (headless Chrome + Vite dev server) → `tests/results.md`
- `scripts/make-test-images.mjs`: renders the synthetic test documents + their `tests/expected.json` entries
- `scripts/lib/chrome.mjs`: finds Chrome/Edge for the scripts (or `CHROME_PATH`)
- `tests/`: `images/`, `expected.json` (answers), `results.md` (dated history), `README.md` (how to add images)
- `vercel.json`: Vercel build settings + security headers (CSP etc.); `npm run preview` sends the same headers
- `docs/screenshots/`: README screenshots
- `src/sw.ts`: service worker. Precaches the app shell, OCR worker script and eng + hin
  language data; caches the one OCR engine build the device uses on first use (CacheFirst);
  serves the app for every navigation; handles the share-target POST
- `src/shareTarget.ts`: constants shared by the app and `sw.ts` (path, field, cache name)
- `src/lib/sharedFile.ts`: reads (and deletes) an image the service worker received from a share
- `src/lib/offline.ts`: `whenServiceWorkerControls()`: the OCR preload waits for it, so the
  engine is fetched through the service worker and cached on the very first visit
- `src/lib/install.ts`: install prompt (`beforeinstallprompt`), installed state, platform
- `src/components/HomeInfo.tsx`: landing section (how it works, privacy promise, install)
- `src/components/AboutPage.tsx`: About & privacy page, shown for `#about`
- `vite.config.ts`: PWA manifest (name, icons, theme `#0f766e`, share_target) and precache list
- `tsconfig.sw.json`: type-checks `sw.ts` with WebWorker types (excluded from the app config)
- `public/icons/`: app icons. `icon.svg` / `icon-maskable.svg` are the sources; `node scripts/make-icons.mjs`
  renders the PNGs in headless Chrome (192, 512, maskable 512, apple-touch 180)
- `src/index.css`: design tokens (colours, fonts) and all animations (CSS only)

## Conventions

- Mobile-first. Must work at 360px wide: no horizontal scroll, tap targets ≥ 44px (aim for 48),
  no text smaller than 13px. Inputs use 16px text (stops iOS zooming in).
- Design, "The Redaction Bar": ink `#111111`, paper `#F4F1EA`, one accent, marigold `#F5A524`
  (Tailwind tokens `ink`, `paper`, `card`, `line`, `marigold`, `muted`, `ash` in `index.css`).
  Black redaction bars are the motif (`.redact-word` for a headline word). Review is dark ("secure mode").
  Headings use Archivo (bundled from `@fontsource-variable/archivo`, Latin only, precached); body text uses system fonts.
- Contrast: text on marigold is always ink. Marigold is NEVER text on paper/light backgrounds (1.8:1),
  only on ink (9.3:1) or as a fill. Secondary text: `muted` on paper, `ash` on ink.
- Motion: CSS transform/opacity only, no animation library. Everything has a `prefers-reduced-motion`
  end state (static bars, no scan line). The hero pauses when off screen.
- Tests use made-up numbers only (`fakeAadhaar`, example.com emails). Never real ones.
- Detection rules: number detectors join neighbouring number-like words on the
  same line (not across columns or lines) and fix OCR look-alikes (O→0, I/l→1,
  S→5, B→8). Context keywords ("A/c", "VID", "DOB") must come before the value
  and claim only the first number after them ("Label:" words in between don't block).
- Hindi: OCR text is NFC-normalised and Devanagari digits ०–९ become 0–9 before matching.
  Mixed eng+hin OCR can misread Latin labels (e.g. "DOB" → "008"); keep Hindi keywords
  (जन्म, खाता) as a fallback for every English one.
- QR codes are always a detected item ("QR code – contains personal data"), on by default.
- Quality thresholds in `quality.ts` were calibrated with real OCR on a test card; recheck
  them against real phone photos before changing.
- App flow: pick → reading (prepare → engine → read + QR scan in parallel → detect) → review → share.
- `maskPlan` is the single source of truth for what gets covered: the review
  preview draws it, and `renderFinalImage` paints exactly those rectangles (scaled
  from working-copy pixels to full resolution, rounded outwards).
- Undo covers item changes and the masking style, not selection.
- OCR runs with Tesseract page segmentation mode 3 (automatic layout), set explicitly in `ocr.ts`.
  Tesseract.js otherwise uses mode 6 (single block), which skipped an Aadhaar number next to a QR code.
- PAN and IFSC must be printed in capitals (≤ 1 lowercase OCR slip). QR boxes must be roughly square.
- Measure before and after any detection or OCR change: `npm run eval -- --label "what changed"`.
  Test images must be fake. Don't tune only to the synthetic set; it's easier than real photos.
- OCR coordinates are in the processed canvas's pixel space. Overlays use an SVG
  with `viewBox` set to the image size, so they scale with the image.

## Commands

- `npm install`: install dependencies and copy the OCR assets
- `npm run dev`: development server
- `npm run build`: typecheck + production build (includes the service worker)
- `npm run preview`: serve the build; use this (not `dev`) to test offline, install and share target
- `npm run lint`: oxlint
- `npm test`: run the Vitest tests once (`npm run test:watch` to keep watching)
- `npm run eval`: detection quality on `tests/images/` → `tests/results.md` (needs Chrome or Edge)
- `npm run make-test-images`: regenerate the synthetic test documents

## Progress

### Day 1 (2026-10-19)
- [x] Project setup (Vite, React, TS, Tailwind, Tesseract.js), git repo
- [x] Self-hosted OCR assets in `public/tesseract/`
- [x] Home screen: "Choose document" (camera or gallery on phones, drag-and-drop on laptops)
- [x] Show the chosen image scaled to the screen width (EXIF rotation fixed)
- [x] `runOcr` returns words with bounding boxes and line numbers
- [x] Debug boxes around every word, with a progress message during OCR

### Day 2 (2026-10-19)
- [x] Detectors: Aadhaar (Verhoeff, 2–9 start), Aadhaar VID, PAN, bank account,
      IFSC, phone, email, date of birth
- [x] OCR look-alike fixes inside number-like words
- [x] Vitest tests for every detector (50 tests) + fake Aadhaar generator
- [x] Red boxes on detected items (debug boxes removed); summary chips by type

### Day 3 (2026-10-19)
- [x] Review screen: coloured box per item + list ("Aadhaar number – hidden") with on/off switches
- [x] Tap a box ↔ highlight its list row (and the reverse); on phones a bar above the
      buttons shows the selected item with its switch
- [x] Draw box tool (mouse/touch/pen); custom areas listed as "Custom area", deletable
- [x] Undo
- [x] Masking style: "Hide all" / "Keep last 4 digits" (Aadhaar, VID, account, phone)
- [x] Continue button → placeholder next step

### Day 4 (2026-10-19)
- [x] Export: solid black masks on a full-resolution copy of the original (not the 2000px working copy)
- [x] Optional purpose watermark + today's date, repeated diagonally, semi-transparent
- [x] Fresh JPEG from canvas, so no EXIF/GPS (verified in browser: planted EXIF block is gone)
- [x] Share screen: final preview, Download, Share (Web Share API with the file; hidden when
      file sharing isn't supported), "Check the image once before sending." reminder

### Day 5 (2026-10-19)
- [x] QR codes found with jsQR (several per image; strips on a half-size copy when the
      whole-image pass finds none) and added as "QR code – contains personal data"
- [x] OCR in English + Hindi; Hindi keywords verified with real OCR (खाता संख्या → bank account,
      जन्म तिथि → DOB even when "DOB" is misread as "008"); Devanagari digits handled
- [x] Speed: QR scan moved to a web worker, run in parallel with OCR (main thread blocked
      ≤ 62 ms instead of ~1 s); OCR worker preloaded while choosing a photo
- [x] 4-step progress checklist
- [x] Checked every screen at 360px: no horizontal scroll, no tap target < 44px, no text < 13px
- [x] Friendly errors: PDF, non-image file, unreadable/corrupt image, no text found, blurry photo

### Day 6 (2026-10-19)
- [x] Installable PWA (vite-plugin-pwa): name, icons (incl. maskable + apple-touch), theme colour.
      Chrome reports no installability or manifest errors
- [x] Offline: app shell + OCR worker + eng/hin data precached (17 files, ~4.8 MB); the
      device's OCR engine build cached on first use. Tested: offline reload → full document → export
- [x] Android share target: Share → SafeShare from the gallery. Tested by POSTing a form to
      `/share-target` while offline: the app opens on the photo; the temporary cache is deleted
- [x] Landing section on the home screen; About & privacy page (`#about`)

### Day 7 (2026-10-19)
- [x] Evaluation: `tests/images`, `tests/expected.json`, `npm run eval` → `tests/results.md`
- [x] 10 synthetic test documents (made-up data, incl. a rotated/soft photo, a dim photo, Hindi-only
      labels, and a harmless invoice for false alarms) + generator script
- [x] Baseline 97.1% caught (33/34), 3 false alarms → after fixes 100% (34/34), 1 false alarm
      (public helpline email, kept on purpose). Fixes: page segmentation mode 3; capitals for
      PAN/IFSC; square QR boxes. Synthetic set only, so real-world numbers will be lower
- [x] Content-Security-Policy + security headers (`vercel.json`); full app tested under the CSP
      with zero violations (offline, export, share target)
- [x] README with privacy design, detection, results, screenshots, local setup

### Redesign (2026-10-20, branch `redesign`)
- [x] "The Redaction Bar" look on every screen; new logo, app icon, favicon; manifest theme `#111111`
- [x] Scan line during OCR, bars sliding in on review, before/after slider on share, self-redacting hero card
- [x] Checked at 360/390px under the CSP: no horizontal scroll, taps ≥ 44px, text ≥ 13px, no marigold
      text on light backgrounds, no running animations with reduce motion. Eval unchanged (34/34, 1 false alarm)

### Deployment notes
- Live on Vercel: https://safeshare-nine.vercel.app (GitHub `anvii24/safeshare`, every push to `main` redeploys)
- HTTPS is required (service worker, install, Web Share). `localhost` is exempt.
- `.gz` language files: fine whether or not the host adds `Content-Encoding: gzip`; Tesseract
  checks the gzip magic bytes before unzipping (tesseract.js worker-script/index.js).
- Don't let the host cache `sw.js` long-term, or updates will be slow to arrive.
- `vercel.json` rewrites unknown paths to `/index.html` (SPA fallback before the service worker
  is installed), except `assets/`, `tesseract/` and `icons/`, so a missing file is a real 404.
- Updates wait until every SafeShare tab/app window is closed (no reload mid-document).

### Next
- [ ] Deploy to an HTTPS host and try on real phones: install, offline, Share → SafeShare from the
      Android gallery, Share → WhatsApp, iPhone "Add to Home Screen" and Safari
- [ ] Dates with month names ("14 Aug 1992")
- [ ] Add photos of printed fake documents to `tests/images` for real-world numbers

// Copies the Tesseract OCR engine and English language data from node_modules
// into public/tesseract/, so the app serves them itself and never fetches
// anything from a CDN. Runs automatically after `npm install`, and before
// `npm run dev` / `npm run build`.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'tesseract')
const nm = join(root, 'node_modules')

const files = [
  // The web worker script that runs OCR off the main thread.
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  // The OCR engine (WebAssembly). We only use the LSTM engine, and the worker
  // picks whichever of these three builds the device's CPU supports.
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  // English language model for the LSTM engine.
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'lang/eng.traineddata.gz'],
]

mkdirSync(join(outDir, 'lang'), { recursive: true })

for (const [from, to] of files) {
  const src = join(nm, from)
  if (!existsSync(src)) {
    console.error(`[tesseract-assets] Missing ${from}. Did you run npm install?`)
    process.exit(1)
  }
  copyFileSync(src, join(outDir, to))
}

console.log(`[tesseract-assets] Copied ${files.length} files to public/tesseract/`)

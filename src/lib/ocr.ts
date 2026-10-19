// Runs Tesseract OCR (English + Hindi) in a web worker and returns every word
// it finds, with its bounding box and line number.
//
// All engine files are loaded from /tesseract/ on this site (see
// scripts/copy-tesseract-assets.mjs). Nothing is fetched from a CDN and the
// image never leaves the browser.
import { createWorker, OEM, type Worker } from 'tesseract.js'

export interface BBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrWord {
  text: string
  /** 0–100, Tesseract's confidence in this word. */
  confidence: number
  bbox: BBox
  /** 0-based line index, counted across the whole page (top to bottom). */
  line: number
}

export interface OcrProgress {
  stage: 'loading' | 'reading'
  /** 0–1 */
  progress: number
}

// English and Hindi together: Indian documents mix both, and the detectors
// look for Hindi labels like "खाता" and "जन्म तिथि".
const LANGUAGES = ['eng', 'hin']

// The worker runs from a different context, so it needs absolute URLs.
const assetUrl = (path: string) => new URL(`tesseract/${path}`, document.baseURI).href

// A fresh worker per document, terminated when it's done: an English + Hindi
// worker holds a lot of memory, and phones need that back for the full-size
// export. Starting one from the self-hosted files is quick, and preloadOcr
// starts the next one in the background while the user is choosing a photo.
let preloaded: Promise<Worker> | null = null
let preloadedReady = false
// Progress goes to whichever document is being read right now.
let progressListener: ((p: OcrProgress) => void) | null = null

function startWorker(): Promise<Worker> {
  return createWorker(LANGUAGES, OEM.LSTM_ONLY, {
    workerPath: assetUrl('worker.min.js'),
    corePath: assetUrl(''),
    langPath: assetUrl('lang'),
    workerBlobURL: false,
    logger: (m) => {
      const stage = m.status === 'recognizing text' ? 'reading' : 'loading'
      progressListener?.({ stage, progress: m.progress })
    },
  })
}

/** Starts loading an OCR worker in the background, so it's ready when a photo is chosen. */
export function preloadOcr(): void {
  if (preloaded) return
  const p = startWorker()
  preloaded = p
  p.then(
    () => {
      if (preloaded === p) preloadedReady = true
    },
    () => {
      if (preloaded === p) preloaded = null // runOcr will start a new one and report any error
    },
  )
}

/** True when a preloaded worker is ready (so the "loading" step can be skipped). */
export const isOcrReady = () => preloadedReady

export async function runOcr(image: HTMLCanvasElement, onProgress?: (p: OcrProgress) => void): Promise<OcrWord[]> {
  // Take the preloaded worker if there is one; it's ours alone from here.
  const pending = preloaded ?? startWorker()
  preloaded = null
  preloadedReady = false
  progressListener = onProgress ?? null
  let worker: Worker | undefined
  try {
    worker = await pending
    onProgress?.({ stage: 'reading', progress: 0 })
    const { data } = await worker.recognize(image, {}, { blocks: true })

    const words: OcrWord[] = []
    let line = 0
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const ocrLine of paragraph.lines) {
          for (const word of ocrLine.words) {
            const text = word.text.trim()
            if (!text) continue
            words.push({ text, confidence: word.confidence, bbox: { ...word.bbox }, line })
          }
          line++
        }
      }
    }
    return words
  } finally {
    if (progressListener === onProgress) progressListener = null
    worker?.terminate().catch(() => {})
  }
}

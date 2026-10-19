// Runs Tesseract OCR (English) in a web worker and returns every word it
// finds, with its bounding box and line number.
//
// All engine files are loaded from /tesseract/ on this site (see
// scripts/copy-tesseract-assets.mjs). Nothing is fetched from a CDN and the
// image never leaves the browser.
import { createWorker, OEM } from 'tesseract.js'

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

// The worker runs from a different context, so it needs absolute URLs.
const assetUrl = (path: string) => new URL(`tesseract/${path}`, document.baseURI).href

export async function runOcr(
  image: HTMLCanvasElement,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrWord[]> {
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: assetUrl('worker.min.js'),
    corePath: assetUrl(''),
    langPath: assetUrl('lang'),
    workerBlobURL: false,
    logger: (m) => {
      if (!onProgress) return
      const stage = m.status === 'recognizing text' ? 'reading' : 'loading'
      onProgress({ stage, progress: m.progress })
    },
  })

  try {
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
    await worker.terminate()
  }
}

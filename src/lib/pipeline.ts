// The whole "photo in → sensitive items out" process, in one place. The app
// (App.tsx) and the quality evaluation (scripts/eval.mjs) both run this, so
// the evaluation measures exactly what users get.
import { detectAll, type Detection } from './detectors'
import { loadImage, type LoadedImage } from './image'
import { isOcrReady, runOcr, type BBox, type OcrWord } from './ocr'
import { findQrCodesOnCanvas } from './qr'
import { assessQuality, type ImageQuality } from './quality'

export type WorkStep = 'prepare' | 'engine' | 'read' | 'scan'

export interface PipelineResult {
  image: LoadedImage
  words: OcrWord[]
  /** Text detections, then QR codes. Every one is switched on in the review screen. */
  detections: Detection[]
  qrBoxes: BBox[]
  quality: ImageQuality
}

interface Options {
  /** Progress, for the step list. `progress` is 0–1 while reading. */
  onStep?: (step: WorkStep, progress?: number) => void
  /** The prepared image, as soon as it's ready (so it can be shown while reading). */
  onImage?: (image: LoadedImage) => void
  /** Return false to abandon this run (the user picked another photo). */
  isCurrent?: () => boolean
}

/** Lets the browser paint (e.g. a progress update) before a long task blocks the main thread. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

/** Runs the pipeline; resolves to null if abandoned via `isCurrent`. Throws ImageError for bad files. */
export async function processDocument(file: File, options: Options = {}): Promise<PipelineResult | null> {
  const { onStep, onImage, isCurrent = () => true } = options

  onStep?.('prepare')
  const image = await loadImage(file)
  if (!isCurrent()) {
    URL.revokeObjectURL(image.url)
    return null
  }
  onImage?.(image)
  onStep?.(isOcrReady() ? 'read' : 'engine')

  const reading = runOcr(image.canvas, (p) => {
    if (isCurrent()) onStep?.(p.stage === 'reading' ? 'read' : 'engine', p.progress)
  })
  // Both run in their own worker threads, at the same time.
  const scanning = findQrCodesOnCanvas(image.canvas)
  const words = await reading
  const qrBoxes = await scanning
  if (!isCurrent()) return null

  onStep?.('scan')
  await nextFrame()
  const qrItems: Detection[] = qrBoxes.map((box) => ({ type: 'qr_code', text: '', boxes: [box], words: [] }))
  // A document that's only a QR code is fine; otherwise judge the text.
  const quality = qrBoxes.length > 0 && words.length < 3 ? 'ok' : assessQuality(words, qrBoxes)

  return { image, words, detections: [...detectAll(words), ...qrItems], qrBoxes, quality }
}

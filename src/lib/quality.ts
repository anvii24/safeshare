// Judges from the OCR result whether the photo was good enough to read, so we
// can tell the user when details may have been missed.
import type { BBox, OcrWord } from './ocr'

export type ImageQuality = 'ok' | 'no_text' | 'blurry'

/** Fewer clearly-read words than this and we say no text was found. */
const MIN_CLEAR_WORDS = 3
/** A word Tesseract is at least this sure of counts as clearly read. */
const CLEAR_CONFIDENCE = 70
/**
 * If the typical (median) word confidence is below this, the photo is probably
 * blurry. Calibrated with real OCR on a test card: sharp text scores ~95; at a
 * blur where every sensitive detail was already missed, the median was 65. We
 * warn early, since a false warning costs a retake but a miss leaks data.
 */
const BLURRY_MEDIAN_CONFIDENCE = 75
/** At least this many (uncertain) words means there is text, just unreadable. */
const MIN_WORDS_FOR_BLURRY = 6

const centreInside = (b: BBox, areas: BBox[]) => {
  const x = (b.x0 + b.x1) / 2
  const y = (b.y0 + b.y1) / 2
  return areas.some((a) => x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1)
}

/**
 * `ignore`: areas to leave out, such as QR codes, whose pattern OCR reads as
 * lots of low-confidence junk that would otherwise look like blur.
 */
export function assessQuality(words: OcrWord[], ignore: BBox[] = []): ImageQuality {
  // Only words with at least two letters or digits; stray marks don't count.
  const real = words.filter((w) => /[\p{L}\p{N}]{2}/u.test(w.text) && !centreInside(w.bbox, ignore))
  const clear = real.filter((w) => w.confidence >= CLEAR_CONFIDENCE)

  if (clear.length < MIN_CLEAR_WORDS) {
    // A handful of junk words is "no text". Plenty of words that are all
    // uncertain is text we couldn't read properly: blur.
    return real.length >= MIN_WORDS_FOR_BLURRY && median(real.map((w) => w.confidence)) >= 15 ? 'blurry' : 'no_text'
  }
  return median(real.map((w) => w.confidence)) < BLURRY_MEDIAN_CONFIDENCE ? 'blurry' : 'ok'
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

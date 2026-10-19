// Test helpers: made-up ID numbers and fake OCR output. Never put real
// people's numbers in tests.
import { verhoeffCheckDigit } from '../lib/detectors'
import type { OcrWord } from '../lib/ocr'

/** Small seeded random generator, so failing tests are reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const randomDigit = (rand: () => number, min = 0) => String(min + Math.floor(rand() * (10 - min)))

/** A made-up 12-digit Aadhaar number that starts with 2–9 and passes Verhoeff. */
export function fakeAadhaar(rand: () => number): string {
  let body = randomDigit(rand, 2)
  for (let i = 0; i < 10; i++) body += randomDigit(rand)
  return body + verhoeffCheckDigit(body)
}

/** The same number with its check digit changed, so it fails Verhoeff. */
export function breakChecksum(aadhaar: string): string {
  const last = Number(aadhaar[11])
  return aadhaar.slice(0, 11) + String((last + 1) % 10)
}

/** "123456789012" → "1234 5678 9012" */
export const groupDigits = (digits: string, size = 4) => digits.match(new RegExp(`.{1,${size}}`, 'g'))!.join(' ')

/**
 * Fake OCR output: each string is a line, words are split on spaces and laid
 * out left to right in a fixed-width font (20px per character, 30px tall).
 * Extra spaces make wider gaps, like separate columns.
 */
export function ocrWords(...lines: string[]): OcrWord[] {
  const charWidth = 20
  const height = 30
  const words: OcrWord[] = []
  lines.forEach((text, line) => {
    const y0 = line * 50
    for (const m of text.matchAll(/\S+/g)) {
      const x0 = m.index * charWidth
      words.push({
        text: m[0],
        confidence: 90,
        line,
        bbox: { x0, y0, x1: x0 + m[0].length * charWidth, y1: y0 + height },
      })
    }
  })
  return words
}

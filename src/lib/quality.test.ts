import { describe, expect, it } from 'vitest'
import { ocrWords } from '../test/fakes'
import type { OcrWord } from './ocr'
import { assessQuality } from './quality'

const withConfidence = (words: OcrWord[], ...confidences: number[]) =>
  words.map((w, i) => ({ ...w, confidence: confidences[i % confidences.length] }))

const page = () => ocrWords('GOVERNMENT OF INDIA', 'Name Test Person', 'DOB 01/01/1990', 'Address 12 Example Road')

describe('assessQuality', () => {
  it('is ok when most words are read confidently', () => {
    expect(assessQuality(withConfidence(page(), 92, 88, 95, 40))).toBe('ok')
  })

  it('says no text when nothing (or only junk) was read', () => {
    expect(assessQuality([])).toBe('no_text')
    expect(assessQuality(withConfidence(ocrWords('~ | ,, ._'), 20))).toBe('no_text')
    expect(assessQuality(withConfidence(ocrWords('ab cd'), 15))).toBe('no_text')
  })

  it('says blurry when there is text but it was read with low confidence', () => {
    expect(assessQuality(withConfidence(page(), 45, 52, 38, 71))).toBe('blurry')
  })

  it('ignores junk read from inside a QR code', () => {
    const text = withConfidence(page(), 90)
    const junk = 'Wq7 kZ8 x2P 9vv Lm4 pq0 Zz1 hh3 k9k'
    const qrJunk = withConfidence(ocrWords('', '', '', '', '', junk, junk), 10) // lines 5–6
    const qrBox = { x0: 0, y0: 240, x1: 2000, y1: 350 }
    expect(assessQuality([...text, ...qrJunk])).toBe('blurry')
    expect(assessQuality([...text, ...qrJunk], [qrBox])).toBe('ok')
  })
})

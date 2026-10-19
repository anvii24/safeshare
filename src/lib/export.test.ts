import { describe, expect, it } from 'vitest'
import { exportFileName, exportSize, MAX_EXPORT_PIXELS, scaleRects, watermarkText } from './export'

describe('exportSize', () => {
  it('keeps normal phone photos at full resolution', () => {
    expect(exportSize(4000, 3000)).toEqual({ width: 4000, height: 3000 }) // 12 MP
  })

  it('scales very large photos down to the pixel limit, keeping the shape', () => {
    const { width, height } = exportSize(8000, 6000) // 48 MP
    expect(width * height).toBeLessThanOrEqual(MAX_EXPORT_PIXELS)
    expect(width / height).toBeCloseTo(8000 / 6000, 2)
  })
})

describe('scaleRects', () => {
  it('scales up and rounds outwards so edges are fully covered', () => {
    expect(scaleRects([{ x0: 10.4, y0: 20.6, x1: 30.2, y1: 40.1 }], 2, 1000, 1000)).toEqual([
      { x0: 20, y0: 41, x1: 61, y1: 81 },
    ])
  })

  it('clamps to the image', () => {
    expect(scaleRects([{ x0: -4, y0: -4, x1: 504, y1: 304 }], 2, 1000, 600)).toEqual([
      { x0: 0, y0: 0, x1: 1000, y1: 600 },
    ])
  })
})

describe('watermarkText', () => {
  const date = new Date(2026, 9, 19)

  it('adds the date to the purpose', () => {
    expect(watermarkText('Shared only for flat rental', date)).toBe('Shared only for flat rental · 19 Oct 2026')
  })

  it('tidies spaces, and returns null when nothing was typed', () => {
    expect(watermarkText('  For   KYC  ', date)).toBe('For KYC · 19 Oct 2026')
    expect(watermarkText('   ', date)).toBeNull()
  })
})

describe('exportFileName', () => {
  it('uses the date', () => {
    expect(exportFileName(new Date(2026, 0, 5))).toBe('safeshare-2026-01-05.jpg')
  })
})

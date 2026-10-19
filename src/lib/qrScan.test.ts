import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'
import { findQrCodes } from './qrScan'

/** A white RGBA image with QR codes drawn at the given positions. */
function imageWithQrCodes(width: number, height: number, codes: { text: string; x: number; y: number; module: number }[]) {
  const rgba = new Uint8ClampedArray(width * height * 4).fill(255)
  for (const { text, x, y, module } of codes) {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
    const n = qr.modules.size
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!qr.modules.get(r, c)) continue
        for (let dy = 0; dy < module; dy++) {
          const row = (y + r * module + dy) * width
          rgba.fill(0, (row + x + c * module) * 4, (row + x + (c + 1) * module) * 4)
          for (let dx = 0; dx < module; dx++) rgba[(row + x + c * module + dx) * 4 + 3] = 255
        }
      }
    }
  }
  return rgba
}

const sizeOf = (text: string, module: number) => QRCode.create(text, { errorCorrectionLevel: 'M' }).modules.size * module

describe('findQrCodes', () => {
  it('finds a QR code and covers all of it', () => {
    const text = 'Made-up test data: Name Test Person, DOB 01-01-1990'
    const size = sizeOf(text, 6)
    const [box] = findQrCodes(imageWithQrCodes(800, 600, [{ text, x: 300, y: 150, module: 6 }]), 800, 600)
    expect(box.x0).toBeLessThanOrEqual(300)
    expect(box.y0).toBeLessThanOrEqual(150)
    expect(box.x1).toBeGreaterThanOrEqual(300 + size)
    expect(box.y1).toBeGreaterThanOrEqual(150 + size)
    // …without covering far more than the code.
    expect(box.x1 - box.x0).toBeLessThan(size * 1.25)
  })

  it('finds a large, dense code like the one on an Aadhaar card', () => {
    const text = 'X'.repeat(1200) // made-up payload, ~version 26
    const [box] = findQrCodes(imageWithQrCodes(1000, 1000, [{ text, x: 200, y: 200, module: 4 }]), 1000, 1000)
    expect(box).toBeDefined()
    expect(box.x1 - box.x0).toBeGreaterThanOrEqual(sizeOf(text, 4))
  })

  it('finds more than one code', () => {
    const rgba = imageWithQrCodes(1000, 500, [
      { text: 'first made-up code', x: 60, y: 100, module: 8 },
      { text: 'second made-up code', x: 600, y: 120, module: 8 },
    ])
    const boxes = findQrCodes(rgba, 1000, 500).sort((a, b) => a.x0 - b.x0)
    expect(boxes).toHaveLength(2)
    expect(boxes[0].x1).toBeLessThan(500)
    expect(boxes[1].x0).toBeGreaterThan(500)
  })

  it('finds nothing on a plain image', () => {
    expect(findQrCodes(new Uint8ClampedArray(400 * 300 * 4).fill(255), 400, 300)).toEqual([])
  })
})

describe('findQrCodes: shape check', () => {
  it('still finds a code photographed slightly squashed (up to 1.5:1)', () => {
    // Stretch a code horizontally by 1.3× to mimic a photo taken at an angle.
    const text = 'made-up squashed code'
    const src = imageWithQrCodes(400, 400, [{ text, x: 60, y: 60, module: 8 }])
    const w = 520
    const out = new Uint8ClampedArray(w * 400 * 4)
    for (let y = 0; y < 400; y++) for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / 1.3)
      out.set(src.subarray((y * 400 + sx) * 4, (y * 400 + sx) * 4 + 4), (y * w + x) * 4)
    }
    expect(findQrCodes(out, w, 400)).toHaveLength(1)
  })
})

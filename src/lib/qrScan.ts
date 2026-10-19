// The QR scan itself: pure functions over RGBA pixels, run inside qr.worker.ts.
//
// Finds QR codes on the document. Aadhaar cards and many other documents carry
// a QR code that encodes the holder's details (name, address, photo…), so a
// QR code is always treated as sensitive and covered by default.
//
// Privacy: we only use the code's position. Its decoded contents are never
// stored, shown or logged.
import jsQR from 'jsqr'
import type { BBox } from './ocr'

/** Most QR codes we look for on one image. */
const MAX_CODES = 4
/** Widest width:height (or height:width) ratio accepted as a QR code. */
const MAX_ASPECT = 1.5
/** Extra cover around the code, as a share of its size, so the edge modules are hidden too. */
const PAD_RATIO = 0.06

/**
 * Returns a box around every QR code found in RGBA pixel data.
 *
 * jsQR finds one code at a time, and with several codes in view it can get
 * confused and find none. So we look in the whole image first. Only if that
 * finds nothing do we also look in overlapping strips, on a half-size copy
 * for big images (a quarter of the work). After each find we paint that area
 * white, so it isn't found again.
 */
export function findQrCodes(rgba: Uint8ClampedArray, width: number, height: number): BBox[] {
  const pixels = new Uint8ClampedArray(rgba) // our own copy, since we paint over found codes
  const found = search(pixels, width, height, false)
  if (found.length > 0) return found

  if (Math.min(width, height) < HALVE_ABOVE) return search(pixels, width, height, true)
  const half = halve(rgba, width, height)
  return search(half.pixels, half.width, half.height, true).map((b) => ({
    x0: b.x0 * 2,
    y0: b.y0 * 2,
    x1: Math.min(width, b.x1 * 2),
    y1: Math.min(height, b.y1 * 2),
  }))
}

/** Strip passes run on a half-size copy when the image's short side is at least this. */
const HALVE_ABOVE = 1000

function search(pixels: Uint8ClampedArray, width: number, height: number, withStrips: boolean): BBox[] {
  const boxes: BBox[] = []
  const whole = { x0: 0, y0: 0, x1: width, y1: height }

  const searchIn = (region: BBox) => {
    const before = boxes.length
    while (boxes.length < MAX_CODES) {
      const box = findOne(pixels, width, height, region)
      if (!box) break
      boxes.push(box)
      paintWhite(pixels, width, box)
    }
    return boxes.length > before
  }

  if (searchIn(whole) || !withStrips) return boxes

  // Overlapping half-width columns and half-height rows (at 0, ¼ and ½), so
  // codes side by side or one above the other each get a look on their own.
  // Once a strip finds one and it's painted over, re-searching the whole
  // image picks up the others.
  for (const offset of [0, 0.25, 0.5]) {
    const x0 = Math.floor(width * offset)
    const y0 = Math.floor(height * offset)
    const strips = [
      { x0, y0: 0, x1: Math.min(width, x0 + Math.ceil(width / 2)), y1: height },
      { x0: 0, y0, x1: width, y1: Math.min(height, y0 + Math.ceil(height / 2)) },
    ]
    for (const strip of strips) {
      if (boxes.length >= MAX_CODES) return boxes
      if (searchIn(strip)) searchIn(whole)
    }
  }
  return boxes
}

/** A half-size copy (each output pixel averages a 2×2 block). */
function halve(rgba: Uint8ClampedArray, width: number, height: number) {
  const w = Math.floor(width / 2)
  const h = Math.floor(height / 2)
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = ((y * 2) * width + x * 2) * 4
      const b = a + width * 4
      const o = (y * w + x) * 4
      for (let c = 0; c < 3; c++) out[o + c] = (rgba[a + c] + rgba[a + 4 + c] + rgba[b + c] + rgba[b + 4 + c]) >> 2
      out[o + 3] = 255
    }
  }
  return { pixels: out, width: w, height: h }
}

/** One QR code inside `region`, as a padded box in full-image coordinates. */
function findOne(pixels: Uint8ClampedArray, width: number, height: number, region: BBox): BBox | null {
  const rw = region.x1 - region.x0
  const rh = region.y1 - region.y0
  const crop =
    rw === width && rh === height
      ? pixels
      : (() => {
          const out = new Uint8ClampedArray(rw * rh * 4)
          for (let y = 0; y < rh; y++) {
            const start = ((region.y0 + y) * width + region.x0) * 4
            out.set(pixels.subarray(start, start + rw * 4), y * rw * 4)
          }
          return out
        })()

  // Codes on documents are dark on light, so skip the slower inverted pass.
  const code = jsQR(crop, rw, rh, { inversionAttempts: 'dontInvert' })
  if (!code) return null

  const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = code.location
  const corners = [topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner]
  const xs = corners.map((p) => p.x + region.x0)
  const ys = corners.map((p) => p.y + region.y0)
  const w = Math.max(...xs) - Math.min(...xs)
  const h = Math.max(...ys) - Math.min(...ys)
  // QR codes are square, and stay roughly square in a photo taken at an angle.
  // jsQR occasionally "finds" one in a long strip of text or texture; ignore those.
  if (Math.max(w, h) > MAX_ASPECT * Math.min(w, h)) return null
  const pad = Math.ceil(Math.max(w, h) * PAD_RATIO)
  return {
    x0: Math.max(0, Math.floor(Math.min(...xs) - pad)),
    y0: Math.max(0, Math.floor(Math.min(...ys) - pad)),
    x1: Math.min(width, Math.ceil(Math.max(...xs) + pad)),
    y1: Math.min(height, Math.ceil(Math.max(...ys) + pad)),
  }
}

function paintWhite(pixels: Uint8ClampedArray, width: number, box: BBox) {
  for (let y = box.y0; y < box.y1; y++) {
    pixels.fill(255, (y * width + box.x0) * 4, (y * width + box.x1) * 4)
  }
}

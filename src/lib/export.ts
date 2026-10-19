// Builds the final, shareable image: the original photo at full resolution,
// with every masked area painted over in solid black and an optional purpose
// watermark, exported as a brand-new JPEG.
import type { LoadedImage } from './image'
import type { BBox } from './ocr'

/**
 * Largest canvas we draw, in pixels. iOS Safari refuses canvases above
 * 16,777,216 pixels (4096×4096), so bigger photos are scaled down to fit.
 */
export const MAX_EXPORT_PIXELS = 16_000_000

const JPEG_QUALITY = 0.92
const MASK_COLOR = '#000000'

/** Output size for an image of `width`×`height`, scaled down only if it's over the pixel limit. */
export function exportSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, Math.sqrt(MAX_EXPORT_PIXELS / (width * height)))
  return { width: Math.floor(width * scale), height: Math.floor(height * scale) }
}

/**
 * Scales mask rectangles from the working-image pixel space to the export
 * size, rounding outwards to whole pixels so no half-covered edge pixels let
 * anything show through, and clamping to the image.
 */
export function scaleRects(rects: BBox[], scale: number, width: number, height: number): BBox[] {
  return rects.map((r) => ({
    x0: Math.max(0, Math.floor(r.x0 * scale)),
    y0: Math.max(0, Math.floor(r.y0 * scale)),
    x1: Math.min(width, Math.ceil(r.x1 * scale)),
    y1: Math.min(height, Math.ceil(r.y1 * scale)),
  }))
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)

/** "Shared only for flat rental · 19 Oct 2026", or null if no purpose was typed. */
export function watermarkText(purpose: string, date: Date): string | null {
  const text = purpose.trim().replace(/\s+/g, ' ')
  return text ? `${text} · ${formatDate(date)}` : null
}

/** "safeshare-2026-10-19.jpg" */
export function exportFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `safeshare-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.jpg`
}

/** Repeats `text` diagonally across the whole canvas, semi-transparent. */
function drawWatermark(ctx: CanvasRenderingContext2D, text: string, width: number, height: number) {
  const fontSize = Math.max(14, Math.round(Math.min(width, height) / 22))
  const diagonal = Math.hypot(width, height)

  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(-Math.PI / 6) // 30° up to the right
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  ctx.textBaseline = 'middle'
  // Dark text with a light outline stays readable on both light and dark parts of the photo.
  ctx.fillStyle = 'rgba(40, 40, 40, 0.28)'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.lineWidth = Math.max(1, fontSize / 14)
  ctx.lineJoin = 'round'

  const stepX = ctx.measureText(text).width + fontSize * 3
  const stepY = fontSize * 4
  let row = 0
  for (let y = -diagonal / 2; y <= diagonal / 2; y += stepY, row++) {
    // Shift every other row by half a step so the pattern is staggered.
    for (let x = -diagonal / 2 - (row % 2) * (stepX / 2); x <= diagonal / 2; x += stepX) {
      ctx.strokeText(text, x, y)
      ctx.fillText(text, x, y)
    }
  }
  ctx.restore()
}

/**
 * Renders the final image.
 *
 * Privacy:
 * - Masks are SOLID, fully opaque fills. Never blur or pixelate: those can be
 *   reversed or read, especially for digits.
 * - The result is a fresh JPEG encoded from canvas pixels. A canvas holds only
 *   pixels, never the source file's metadata, so EXIF data (GPS location,
 *   camera model, capture time, thumbnails) from the original photo is NOT
 *   carried over. The browser writes a plain JPEG with no EXIF block. The
 *   photo's EXIF rotation is applied to the pixels on decode, so the output
 *   is upright without needing an orientation tag.
 */
export async function renderFinalImage(image: LoadedImage, rects: BBox[], watermark: string | null): Promise<Blob> {
  // Decode the original file again so the export is full resolution, not the
  // downscaled working copy used for OCR.
  const bitmap = await createImageBitmap(image.file, { imageOrientation: 'from-image' })
  const { width, height } = exportSize(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Could not prepare the image.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // Rects are in the working copy's pixel space; scale them up to this canvas.
  ctx.globalAlpha = 1
  ctx.fillStyle = MASK_COLOR
  for (const r of scaleRects(rects, width / image.width, width, height)) {
    ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0)
  }

  if (watermark) drawWatermark(ctx, watermark, width, height)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  // Release the canvas memory straight away (matters on phones).
  canvas.width = canvas.height = 0
  if (!blob) throw new Error('Could not create the image.')
  return blob
}

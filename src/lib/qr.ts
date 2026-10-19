// Finds QR codes on a canvas, using a web worker (qr.worker.ts → qrScan.ts).
// See qrScan.ts for why QR codes are always treated as sensitive.
import type { BBox } from './ocr'

/**
 * QR code boxes on a canvas. The scan runs in its own web worker
 * (qr.worker.ts), so the page stays responsive while it works. Pixels are
 * handed to the worker in memory; nothing leaves the device.
 */
export function findQrCodesOnCanvas(canvas: HTMLCanvasElement): Promise<BBox[]> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve([])
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const worker = new Worker(new URL('./qr.worker.ts', import.meta.url), { type: 'module' })
  return new Promise<BBox[]>((resolve) => {
    worker.onmessage = (e: MessageEvent<BBox[]>) => resolve(e.data)
    // If the scan fails, carry on without QR boxes rather than block the user.
    worker.onerror = () => resolve([])
    worker.postMessage({ data, width, height }, [data.buffer])
  }).finally(() => worker.terminate())
}

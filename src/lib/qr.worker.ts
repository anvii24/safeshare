// Web worker that runs the QR scan off the main thread (see findQrCodesOnCanvas).
import type { BBox } from './ocr'
import { findQrCodes } from './qrScan'

interface Request {
  data: Uint8ClampedArray
  width: number
  height: number
}

// Typed locally: the project's TypeScript setup uses the DOM types, not the worker ones.
const scope = self as unknown as {
  onmessage: (e: MessageEvent<Request>) => void
  postMessage: (boxes: BBox[]) => void
}

scope.onmessage = (e) => {
  const { data, width, height } = e.data
  scope.postMessage(findQrCodes(data, width, height))
}

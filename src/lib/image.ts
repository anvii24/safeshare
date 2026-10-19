// Turns a user-chosen file into a canvas that is upright and not too big.
// Both the on-screen preview and OCR use this same canvas, so word boxes
// always line up with what the user sees.

// Phone cameras produce 12+ megapixel photos. OCR on those is slow and uses a
// lot of memory, and text on an ID card is still very readable at this size.
const MAX_SIDE = 2000

export interface LoadedImage {
  canvas: HTMLCanvasElement
  width: number
  height: number
  /** Object URL for showing the image in an <img>. Revoke when done. */
  url: string
}

export async function loadImage(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG or WebP).')
  }

  // `from-image` applies the EXIF rotation, so sideways phone photos come out upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare the image.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92),
  )
  if (!blob) throw new Error('Could not prepare the image.')

  return { canvas, width, height, url: URL.createObjectURL(blob) }
}

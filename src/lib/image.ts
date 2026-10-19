// Turns a user-chosen file into a canvas that is upright and not too big.
// Both the on-screen preview and OCR use this same canvas, so word boxes
// always line up with what the user sees.

// Phone cameras produce 12+ megapixel photos. OCR on those is slow and uses a
// lot of memory, and text on an ID card is still very readable at this size.
const MAX_SIDE = 2000

export interface LoadedImage {
  /** The original file, kept so the export can be made at full resolution. */
  file: File
  /** Working copy, at most MAX_SIDE on its long side. OCR and boxes use its pixel space. */
  canvas: HTMLCanvasElement
  width: number
  height: number
  /** Object URL for showing the image in an <img>. Revoke when done. */
  url: string
}

/** A problem with the chosen file, with a message written for the user. */
export class ImageError extends Error {
  readonly title: string
  constructor(title: string, message: string) {
    super(message)
    this.title = title
  }
}

export async function loadImage(file: File): Promise<LoadedImage> {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    throw new ImageError(
      'PDFs aren’t supported yet',
      'Please take a screenshot of the page and choose that instead.',
    )
  }
  if (!file.type.startsWith('image/')) {
    throw new ImageError('This file isn’t a photo', 'Please choose a photo or screenshot (JPG, PNG or WebP).')
  }

  // `from-image` applies the EXIF rotation, so sideways phone photos come out upright.
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageError(
      'We couldn’t open this photo',
      'It may be damaged, or in a format this browser can’t read (like HEIC). Try a JPG or PNG, or a screenshot of it.',
    )
  }

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

  return { file, canvas, width, height, url: URL.createObjectURL(blob) }
}

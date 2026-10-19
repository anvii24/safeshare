import type { LoadedImage } from '../lib/image'
import type { OcrWord } from '../lib/ocr'

interface Props {
  image: LoadedImage
  words: OcrWord[]
}

// Shows the document at the full width of the screen, with a thin debug box
// around every OCR word. The SVG uses the image's own pixel size as its
// coordinate system, so boxes stay aligned at any screen width.
export function DocumentViewer({ image, words }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
      <img src={image.url} alt="Your chosen document" className="block h-auto w-full" />
      <svg
        viewBox={`0 0 ${image.width} ${image.height}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {words.map((w, i) => (
          <rect
            key={i}
            x={w.bbox.x0}
            y={w.bbox.y0}
            width={w.bbox.x1 - w.bbox.x0}
            height={w.bbox.y1 - w.bbox.y0}
            fill="rgb(13 148 136 / 0.08)"
            stroke="rgb(13 148 136 / 0.9)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  )
}

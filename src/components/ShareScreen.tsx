import { useEffect, useRef, useState } from 'react'
import { exportFileName, renderFinalImage, watermarkText } from '../lib/export'
import type { LoadedImage } from '../lib/image'
import type { BBox } from '../lib/ocr'

interface Props {
  image: LoadedImage
  /** Rectangles to paint over, from maskPlan (working-image pixel space). */
  rects: BBox[]
  onBack: () => void
}

interface Result {
  file: File
  url: string
  canShare: boolean
  /** What this image was rendered for, to tell when it's out of date. */
  purpose: string
  rects: BBox[]
}

interface RenderError {
  message: string
  purpose: string
  rects: BBox[]
}

// Wait this long after typing stops before re-rendering the full-size image.
const RENDER_DELAY_MS = 350

// The last step: preview of the final image, optional purpose watermark,
// Download, and Share (only where the browser can share files).
export function ShareScreen({ image, rects, onBack }: Props) {
  const [date] = useState(() => new Date())
  const [purpose, setPurpose] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [renderError, setRenderError] = useState<RenderError | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const renderId = useRef(0)
  const firstRender = useRef(true)

  // Re-render the final image whenever the watermark text changes.
  useEffect(() => {
    const id = ++renderId.current
    const delay = firstRender.current ? 0 : RENDER_DELAY_MS
    firstRender.current = false

    const timer = setTimeout(async () => {
      try {
        const blob = await renderFinalImage(image, rects, watermarkText(purpose, date))
        if (id !== renderId.current) return
        const file = new File([blob], exportFileName(date), { type: 'image/jpeg' })
        const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
        setResult({ file, url: URL.createObjectURL(blob), canShare, purpose, rects })
      } catch (err) {
        if (id !== renderId.current) return
        console.error(err)
        setRenderError({ message: 'Sorry, we couldn’t create the image. Please go back and try again.', purpose, rects })
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [image, rects, purpose, date])

  // Free the previous preview when it's replaced.
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url)
  }, [result])

  const share = async () => {
    if (!result) return
    try {
      // Files only, no text: some apps (WhatsApp on Android) drop the file when text is added.
      await navigator.share({ files: [result.file] })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return // user closed the share sheet
      setShareError('Sharing didn’t work here. Please use Download instead.')
    }
  }

  const isCurrent = (r: { purpose: string; rects: BBox[] } | null) => r?.purpose === purpose && r.rects === rects
  const failed = isCurrent(renderError)
  const busy = !isCurrent(result) && !failed
  const ready = result && !busy
  const error = failed ? renderError!.message : shareError

  return (
    <>
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-12 items-center gap-1 self-start rounded-xl pr-3 text-sm font-medium text-teal-800 hover:bg-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to review
        </button>

        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
          {result ? (
            <img src={result.url} alt="Final image, ready to share" className="block h-auto w-full" />
          ) : (
            <div style={{ aspectRatio: `${image.width} / ${image.height}` }} />
          )}
          {busy && (
            <div role="status" className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium text-stone-700 backdrop-blur-[1px]">
              Preparing image…
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="purpose" className="text-sm font-medium text-stone-700">
            Add a purpose <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <input
            id="purpose"
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            maxLength={60}
            placeholder="e.g. Shared only for flat rental"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="min-h-12 rounded-xl bg-white px-4 text-base ring-1 ring-stone-300 placeholder:text-stone-400 focus:ring-2 focus:ring-teal-600 focus:outline-none"
          />
          <p className="text-[13px] text-stone-500">
            Today’s date is added automatically, and the text is repeated faintly across the image so it can’t be
            reused for something else.
          </p>
        </div>

        <p className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Check the image once before sending.
        </p>

        {error && (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
            {error}
          </p>
        )}
      </div>

      {/* Bottom bar within thumb reach. Share only appears where file sharing works. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-2 px-4 py-3">
          <a
            href={ready ? result.url : undefined}
            download={result?.file.name}
            aria-disabled={!ready}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold ${
              result?.canShare
                ? 'bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-50'
                : 'bg-teal-700 text-white shadow-sm hover:bg-teal-800'
            } ${ready ? '' : 'pointer-events-none opacity-50'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            Download
          </a>
          {result?.canShare && (
            <button
              type="button"
              onClick={share}
              disabled={!ready}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-base font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M12 15V4M7 9l5-5 5 5M5 14v6h14v-6" />
              </svg>
              Share
            </button>
          )}
        </div>
      </div>
    </>
  )
}

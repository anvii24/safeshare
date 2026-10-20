import { useEffect, useRef, useState } from 'react'
import { exportFileName, renderFinalImage, watermarkText } from '../lib/export'
import type { LoadedImage } from '../lib/image'
import type { BBox } from '../lib/ocr'
import { BeforeAfter } from './BeforeAfter'
import { Notice } from './Notice'

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

// The last step: before/after preview of the final image, optional purpose
// watermark, Download, and Share (only where the browser can share files).
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
          className="flex min-h-12 items-center gap-1 self-start rounded-xl pr-3 text-sm font-semibold text-ink hover:bg-card focus-visible:outline-2 focus-visible:outline-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to review
        </button>

        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[32px] leading-[1.05] font-extrabold tracking-tight text-ink">
            Ready to <span className="redact-word">share</span>.
          </h1>
          <p className="text-[15px] text-muted">Drag the handle to compare with your original.</p>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-card shadow-[0_10px_30px_-14px_rgb(17_17_17/0.45)] ring-1 ring-line">
          {result ? (
            <BeforeAfter before={image.url} after={result.url} />
          ) : (
            <div style={{ aspectRatio: `${image.width} / ${image.height}` }} />
          )}
          {busy && (
            <div role="status" className="absolute inset-0 flex items-center justify-center bg-paper/70 text-sm font-semibold text-ink backdrop-blur-[1px]">
              Preparing image…
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="purpose" className="text-sm font-semibold text-ink">
            Add a purpose <span className="font-normal text-muted">(optional)</span>
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
            className="min-h-12 rounded-xl bg-white px-4 text-base text-ink ring-1 ring-line placeholder:text-muted/80 focus:ring-2 focus:ring-ink focus:outline-none"
          />
          <p className="text-[13px] leading-relaxed text-muted">
            Today’s date is added automatically, and the text is repeated faintly across the image so it can’t be
            reused for something else.
          </p>
        </div>

        <p className="flex items-center gap-3 rounded-2xl bg-marigold px-4 py-3 text-sm font-semibold text-ink">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Check the image once before sending.
        </p>

        {error && (
          <Notice tone="error" title="Something didn’t work">
            {error}
          </Notice>
        )}
      </div>

      {/* Bottom bar within thumb reach. Share only appears where file sharing works. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-2 px-4 py-3">
          <a
            href={ready ? result.url : undefined}
            download={result?.file.name}
            aria-disabled={!ready}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 font-display text-base font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              result?.canShare ? 'bg-paper text-ink ring-2 ring-ink hover:bg-white' : 'bg-ink text-paper hover:bg-black'
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
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 font-display text-base font-bold text-paper hover:bg-black focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
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

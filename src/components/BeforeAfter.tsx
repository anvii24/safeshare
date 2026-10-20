import { useRef, useState, type PointerEvent } from 'react'

interface Props {
  /** The photo as chosen (already in memory; nothing extra is loaded or stored). */
  before: string
  /** The final image that will be shared. */
  after: string
}

// Before/after comparison: the original on the left of the handle, the cleaned
// image on the right. Drag anywhere on it (mouse, touch or pen); vertical swipes
// still scroll the page on phones. A visually hidden range input makes it work
// with the keyboard and screen readers.
export function BeforeAfter({ before, after }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [pos, setPos] = useState(50)

  const moveTo = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    setPos(Math.min(Math.max(((clientX - r.left) / r.width) * 100, 0), 100))
  }

  const handleDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    // A mouse click jumps the handle there; a touch only moves it once the finger
    // moves sideways, so starting a scroll on the image doesn't jump it.
    if (e.pointerType === 'mouse') moveTo(e.clientX)
  }

  const stop = () => {
    dragging.current = false
  }

  return (
    <div
      ref={ref}
      className="relative cursor-ew-resize touch-pan-y overflow-hidden select-none"
      onPointerDown={handleDown}
      onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <img src={after} alt="Final image, ready to share" className="block h-auto w-full" draggable={false} />
      <span className="pointer-events-none absolute top-3 right-3 bg-ink px-2 py-1 font-display text-[13px] font-extrabold tracking-[0.1em] text-marigold">
        AFTER
      </span>

      <div className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt="" className="block h-full w-full" draggable={false} />
        <span className="absolute top-3 left-3 bg-paper px-2 py-1 font-display text-[13px] font-extrabold tracking-[0.1em] text-ink">
          BEFORE
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare the original with the cleaned image"
        aria-valuetext={`${Math.round(pos)}% original shown`}
        className="peer sr-only"
      />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-paper shadow-[0_0_0_1px_rgb(17_17_17/0.5)]" style={{ left: `${pos}%` }} />
      <div
        className="pointer-events-none absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink ring-2 ring-paper peer-focus-visible:ring-4 peer-focus-visible:ring-marigold"
        style={{ left: `${pos}%` }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#f5a524" strokeWidth="2.6" className="h-6 w-6">
          <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
        </svg>
      </div>
    </div>
  )
}

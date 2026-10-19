import { useRef, useState, type PointerEvent } from 'react'
import type { LoadedImage } from '../lib/image'
import type { BBox } from '../lib/ocr'
import { MASK_PAD, maskRects, type MaskStyle, type ReviewItem } from '../lib/review'
import { DRAW_COLOR, itemColor } from './itemColors'

interface Props {
  image: LoadedImage
  items: ReviewItem[]
  style: MaskStyle
  selectedId: string | null
  drawing: boolean
  onSelect: (id: string | null) => void
  onDraw: (box: BBox) => void
}

// Smallest box we accept, in screen pixels, so a stray tap doesn't add one.
const MIN_DRAW_SIZE = 12

const padded = (b: BBox) => ({
  x: b.x0 - MASK_PAD,
  y: b.y0 - MASK_PAD,
  width: b.x1 - b.x0 + MASK_PAD * 2,
  height: b.y1 - b.y0 + MASK_PAD * 2,
})

// The document with every item drawn on top: switched-on items show the
// mask preview (dark fill) inside a coloured outline, switched-off items show
// a dashed outline. Tap an item to select it. In drawing mode, drag to add a
// box; works with mouse, touch and pen through pointer events.
export function ReviewCanvas({ image, items, style, selectedId, drawing, onSelect, onDraw }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)

  const toImage = (e: PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    const scale = image.width / r.width
    return {
      x: Math.min(Math.max((e.clientX - r.left) * scale, 0), image.width),
      y: Math.min(Math.max((e.clientY - r.top) * scale, 0), image.height),
      scale,
    }
  }

  const handleDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!drawing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = toImage(e)
    setDraft({ x0: x, y0: y, x1: x, y1: y })
  }

  const handleMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!draft) return
    const { x, y } = toImage(e)
    setDraft({ ...draft, x1: x, y1: y })
  }

  const handleUp = (e: PointerEvent<SVGSVGElement>) => {
    if (!draft) return
    const { scale } = toImage(e)
    const box = {
      x0: Math.min(draft.x0, draft.x1),
      y0: Math.min(draft.y0, draft.y1),
      x1: Math.max(draft.x0, draft.x1),
      y1: Math.max(draft.y0, draft.y1),
    }
    setDraft(null)
    const min = MIN_DRAW_SIZE * scale
    if (box.x1 - box.x0 >= min && box.y1 - box.y0 >= min) onDraw(box)
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${
        drawing ? 'ring-2 ring-violet-500' : 'ring-stone-200'
      }`}
    >
      <img
        src={image.url}
        alt="Your document"
        className="block h-auto w-full select-none"
        draggable={false}
        onClick={() => onSelect(null)}
      />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${image.width} ${image.height}`}
        className={`absolute inset-0 h-full w-full ${drawing ? 'cursor-crosshair touch-none' : 'pointer-events-none'}`}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={() => setDraft(null)}
        aria-hidden="true"
      >
        {items.map((item) => {
          const color = itemColor(item)
          const selected = item.id === selectedId
          return (
            <g
              key={item.id}
              id={`box-${item.id}`}
              onClick={() => !drawing && onSelect(item.id)}
              style={{ pointerEvents: drawing ? 'none' : 'all', cursor: 'pointer' }}
            >
              {selected &&
                item.boxes.map((b, i) => (
                  <rect key={`glow${i}`} {...padded(b)} rx={6} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={10} vectorEffect="non-scaling-stroke" />
                ))}
              {maskRects(item, style).map((r, i) => (
                <rect key={`mask${i}`} x={r.x0} y={r.y0} width={r.x1 - r.x0} height={r.y1 - r.y0} fill="#1c1917" fillOpacity={0.88} />
              ))}
              {item.boxes.map((b, i) => (
                <rect
                  key={`line${i}`}
                  {...padded(b)}
                  rx={4}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={selected ? 3 : 2}
                  strokeDasharray={item.enabled ? undefined : '6 4'}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {/* Wider invisible edge so small boxes are easy to tap. */}
              {item.boxes.map((b, i) => (
                <rect key={`hit${i}`} {...padded(b)} fill="transparent" stroke="transparent" strokeWidth={24} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          )
        })}
        {draft && (
          <rect
            x={Math.min(draft.x0, draft.x1)}
            y={Math.min(draft.y0, draft.y1)}
            width={Math.abs(draft.x1 - draft.x0)}
            height={Math.abs(draft.y1 - draft.y0)}
            fill={DRAW_COLOR}
            fillOpacity={0.15}
            stroke={DRAW_COLOR}
            strokeWidth={2}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  )
}

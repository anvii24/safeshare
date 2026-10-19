import { useEffect, useState, type Dispatch, type ReactNode } from 'react'
import type { LoadedImage } from '../lib/image'
import type { ImageQuality } from '../lib/quality'
import { itemLabel, itemStatus, type MaskStyle, type ReviewAction, type ReviewState } from '../lib/review'
import { itemColor } from './itemColors'
import { DeleteButton, HideSwitch } from './ItemControls'
import { ItemList } from './ItemList'
import { Notice } from './Notice'
import { ReviewCanvas } from './ReviewCanvas'

interface Props {
  image: LoadedImage
  state: ReviewState
  dispatch: Dispatch<ReviewAction>
  quality: ImageQuality
  /** Go back and choose a different photo. */
  onRetake: () => void
  onContinue: () => void
}

const WIDE = '(min-width: 1024px)'

// The review step: the document with coloured boxes, the list of items, the
// masking style, and a bottom bar (Undo, Draw box, Continue) within thumb reach.
export function ReviewScreen({ image, state, dispatch, quality, onRetake, onContinue }: Props) {
  const [drawing, setDrawing] = useState(false)
  const { items, style, selectedId, selectedFrom } = state
  const selected = items.find((it) => it.id === selectedId) ?? null

  // Bring the matching box or list row into view. On phones the list is below
  // the image, so a tap on the image just highlights (and shows the bar below)
  // instead of jumping the page away from the image.
  useEffect(() => {
    if (!selectedId || !selectedFrom) return
    if (selectedFrom === 'image' && !window.matchMedia(WIDE).matches) return
    const target = document.getElementById(selectedFrom === 'image' ? `item-${selectedId}` : `box-${selectedId}`)
    target?.scrollIntoView({ block: selectedFrom === 'list' ? 'center' : 'nearest', behavior: 'smooth' })
  }, [selectedId, selectedFrom])

  const toggle = (id: string) => dispatch({ kind: 'toggle', id })
  const remove = (id: string) => dispatch({ kind: 'remove', id })

  return (
    <>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <section className="flex flex-col gap-3">
          <QualityNotice quality={quality} onRetake={onRetake} />
          {drawing ? (
            <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900 ring-1 ring-violet-200">
              Drag over the area you want to hide.
            </p>
          ) : (
            <p className="text-sm text-stone-600">
              Check the boxes. Tap one to select it, or use <strong>Draw box</strong> for anything we missed.
            </p>
          )}
          <ReviewCanvas
            image={image}
            items={items}
            style={style}
            selectedId={selectedId}
            drawing={drawing}
            onSelect={(id) => dispatch({ kind: 'select', id, from: 'image' })}
            onDraw={(box) => {
              dispatch({ kind: 'add_custom', box })
              setDrawing(false)
            }}
          />
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
          <MaskStyleSwitch style={style} onChange={(s) => dispatch({ kind: 'set_style', style: s })} />
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-stone-500">
              {items.length === 0 ? 'Areas to hide' : `Areas to hide (${items.filter((i) => i.enabled).length} of ${items.length})`}
            </h2>
            <ItemList
              items={items}
              style={style}
              selectedId={selectedId}
              onSelect={(id) => dispatch({ kind: 'select', id, from: 'list' })}
              onToggle={toggle}
              onRemove={remove}
            />
          </div>
        </aside>
      </div>

      {/* Bottom bar: everything reachable with one thumb. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto max-w-xl px-4 lg:max-w-5xl">
          {selected && (
            <div className="flex items-center gap-2 border-b border-stone-100 py-1 lg:hidden">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: itemColor(selected) }} aria-hidden="true" />
              <p className="flex-1 text-sm text-stone-800">
                {itemLabel(selected)} <span className="text-stone-500">– {itemStatus(selected, style)}</span>
              </p>
              {selected.type ? (
                <HideSwitch on={selected.enabled} label={`Hide ${itemLabel(selected)}`} onChange={() => toggle(selected.id)} />
              ) : (
                <DeleteButton label={`Delete ${itemLabel(selected)}`} onClick={() => remove(selected.id)} />
              )}
            </div>
          )}
          <div className="flex gap-2 py-3">
            <BarButton onClick={() => dispatch({ kind: 'undo' })} disabled={state.past.length === 0} label="Undo">
              <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
            </BarButton>
            <BarButton onClick={() => setDrawing((d) => !d)} pressed={drawing} label={drawing ? 'Cancel' : 'Draw box'}>
              {drawing ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 4h6M14 4h6v6M20 14v6h-6M10 20H4v-6M4 10V4" />}
            </BarButton>
            <button
              type="button"
              onClick={onContinue}
              disabled={drawing}
              className="min-h-12 flex-1 rounded-xl bg-teal-700 px-4 text-base font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:scale-[0.98] disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function BarButton(props: {
  onClick: () => void
  label: string
  disabled?: boolean
  pressed?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      aria-pressed={props.pressed}
      className={`flex min-h-12 min-w-20 flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-[13px] font-medium ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-40 ${
        props.pressed ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-stone-700 ring-stone-300 hover:bg-stone-50'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        {props.children}
      </svg>
      {props.label}
    </button>
  )
}

function MaskStyleSwitch({ style, onChange }: { style: MaskStyle; onChange: (s: MaskStyle) => void }) {
  const options: [MaskStyle, string][] = [
    ['hide_all', 'Hide all'],
    ['keep_last_4', 'Keep last 4 digits'],
  ]
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-stone-500" id="mask-style">
        Masking style
      </h2>
      <div role="radiogroup" aria-labelledby="mask-style" className="grid grid-cols-2 gap-1 rounded-2xl bg-stone-200/70 p-1">
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={style === value}
            onClick={() => onChange(value)}
            className={`min-h-11 rounded-xl px-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-600 ${
              style === value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {style === 'keep_last_4' && (
        <p className="text-[13px] text-stone-500">
          Aadhaar, VID, account and phone numbers show like XXXX XXXX 1234. Everything else stays fully hidden.
        </p>
      )}
    </div>
  )
}

function QualityNotice({ quality, onRetake }: { quality: ImageQuality; onRetake: () => void }) {
  const action = { label: 'Try another photo', onClick: onRetake }
  if (quality === 'no_text') {
    return (
      <Notice tone="warning" title="We couldn’t find any text" action={action}>
        Make sure the whole document is in the photo, in good light and in focus. You can also cover areas yourself
        with <strong>Draw box</strong>.
      </Notice>
    )
  }
  if (quality === 'blurry') {
    return (
      <Notice tone="warning" title="This photo looks blurry" action={action}>
        Some details may have been missed. For best results, retake it in good light, holding the phone steady
        and flat above the document. Check the boxes carefully if you continue.
      </Notice>
    )
  }
  return null
}

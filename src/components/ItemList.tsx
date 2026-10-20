import { itemLabel, itemStatus, type MaskStyle, type ReviewItem } from '../lib/review'
import { DeleteButton, HideSwitch } from './ItemControls'

interface Props {
  items: ReviewItem[]
  style: MaskStyle
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

// The list of everything that will be hidden. Detected items have a
// hidden/visible switch; custom areas the user drew have a delete button instead.
export function ItemList({ items, style, selectedId, onSelect, onToggle, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-ink-2 px-4 py-4 text-sm leading-relaxed text-ash ring-1 ring-ink-3">
        Nothing sensitive was found automatically. Check the image, and use <strong className="text-paper">Draw box</strong>{' '}
        to cover anything you want hidden.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-ink-3 overflow-hidden rounded-2xl bg-ink-2 ring-1 ring-ink-3">
      {items.map((item) => {
        const label = itemLabel(item)
        const selected = item.id === selectedId
        return (
          <li
            key={item.id}
            id={`item-${item.id}`}
            className={`flex items-center gap-1 pr-1 transition-colors ${selected ? 'bg-ink-3 shadow-[inset_4px_0_0_#f5a524]' : ''}`}
          >
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selected}
              className="flex min-h-14 flex-1 items-center gap-3 py-2 pl-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marigold"
            >
              <ItemBar on={item.enabled} />
              <span className="text-[15px] text-paper">
                {label}
                <span className={item.enabled ? 'text-ash' : 'font-semibold text-marigold'}>
                  {' – '}
                  {itemStatus(item, style)}
                </span>
              </span>
            </button>
            {item.type ? (
              <HideSwitch on={item.enabled} label={`Hide ${label}`} onChange={() => onToggle(item.id)} />
            ) : (
              <DeleteButton label={`Delete ${label}`} onClick={() => onRemove(item.id)} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** A tiny redaction bar: solid when the item is hidden, an outline when it stays visible. */
export function ItemBar({ on }: { on: boolean }) {
  return (
    <span
      className={`h-3 w-6 shrink-0 ${on ? 'bg-paper shadow-[inset_-5px_-5px_0_#f5a524]' : 'border-2 border-dashed border-ash'}`}
      aria-hidden="true"
    />
  )
}

import { itemLabel, itemStatus, type MaskStyle, type ReviewItem } from '../lib/review'
import { itemColor } from './itemColors'
import { DeleteButton, HideSwitch } from './ItemControls'

interface Props {
  items: ReviewItem[]
  style: MaskStyle
  selectedId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

// The list of everything that will be hidden. Detected items have an on/off
// switch; custom areas the user drew have a delete button instead.
export function ItemList({ items, style, selectedId, onSelect, onToggle, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-white px-4 py-4 text-sm text-stone-600 ring-1 ring-stone-200">
        Nothing sensitive was found automatically. Check the image, and use <strong>Draw box</strong> to cover
        anything you want hidden.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
      {items.map((item) => {
        const label = itemLabel(item)
        const selected = item.id === selectedId
        return (
          <li
            key={item.id}
            id={`item-${item.id}`}
            className={`flex items-center gap-1 pr-1 transition-colors ${selected ? 'bg-stone-100' : ''}`}
          >
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selected}
              className="flex min-h-14 flex-1 items-center gap-3 py-2 pl-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-600"
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: item.enabled ? itemColor(item) : 'transparent',
                  boxShadow: `inset 0 0 0 2px ${itemColor(item)}`,
                }}
                aria-hidden="true"
              />
              <span className="text-[15px] text-stone-800">
                {label}
                <span className={item.enabled ? 'text-stone-500' : 'font-medium text-amber-700'}>
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

// Small shared controls for review items (dark "secure mode"): the
// hidden/visible switch and the delete button.

interface SwitchProps {
  on: boolean
  label: string
  onChange: () => void
}

/** On/off switch with a 48px tap area. "On" (marigold) means the item will be hidden. */
export function HideSwitch({ on, label, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-marigold"
    >
      <span className={`flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${on ? 'bg-marigold' : 'bg-ink-3 ring-1 ring-ash/50'}`}>
        <span className={`h-6 w-6 rounded-full shadow transition-transform motion-reduce:transition-none ${on ? 'translate-x-5 bg-ink' : 'bg-ash'}`} />
      </span>
    </button>
  )
}

export function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl text-ash hover:bg-ink-3 hover:text-paper focus-visible:outline-2 focus-visible:outline-marigold"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

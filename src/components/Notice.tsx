import type { ReactNode } from 'react'

interface Props {
  tone: 'error' | 'warning'
  title: string
  children: ReactNode
  /** Optional button, e.g. "Try another photo". */
  action?: { label: string; onClick: () => void }
  /** On the dark review screen ("secure mode"). */
  dark?: boolean
}

// A friendly message card for errors and photo-quality warnings: a card with a
// marigold edge (a fill, never marigold text on light backgrounds) and an icon.
export function Notice({ tone, title, children, action, dark = false }: Props) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-2xl border-l-[6px] border-marigold px-4 py-3 ${
        dark ? 'bg-ink-2 text-paper ring-1 ring-ink-3' : 'bg-card text-ink ring-1 ring-line'
      }`}
    >
      <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" fill={dark ? '#f5a524' : '#111111'} />
        <path d={tone === 'error' ? 'M8 8l8 8M16 8l-8 8' : 'M12 6.5v7M12 16.5v1'} stroke={dark ? '#111111' : '#f5a524'} strokeWidth="2.6" />
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[15px] font-semibold">{title}</p>
        <div className={`text-sm leading-relaxed ${dark ? 'text-ash' : 'text-muted'}`}>{children}</div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`mt-2 min-h-12 self-start rounded-xl px-4 text-sm font-semibold ring-2 focus-visible:outline-3 focus-visible:outline-offset-2 ${
              dark
                ? 'text-paper ring-paper/70 hover:bg-ink-3 focus-visible:outline-marigold'
                : 'text-ink ring-ink hover:bg-white focus-visible:outline-ink'
            }`}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

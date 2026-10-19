import type { ReactNode } from 'react'

interface Props {
  tone: 'error' | 'warning'
  title: string
  children: ReactNode
  /** Optional button, e.g. "Try another photo". */
  action?: { label: string; onClick: () => void }
}

const TONES = {
  error: { box: 'bg-rose-50 ring-rose-200', title: 'text-rose-900', body: 'text-rose-800', button: 'text-rose-900 ring-rose-300' },
  warning: { box: 'bg-amber-50 ring-amber-200', title: 'text-amber-950', body: 'text-amber-900', button: 'text-amber-950 ring-amber-300' },
}

// A friendly message card for errors and photo-quality warnings.
export function Notice({ tone, title, children, action }: Props) {
  const t = TONES[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex flex-col gap-1 rounded-2xl px-4 py-3 ring-1 ${t.box}`}>
      <p className={`text-[15px] font-semibold ${t.title}`}>{title}</p>
      <div className={`text-sm ${t.body}`}>{children}</div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`mt-2 min-h-12 self-start rounded-xl bg-white px-4 text-sm font-semibold ring-1 hover:bg-white/70 ${t.button}`}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

import type { WorkStep } from '../lib/pipeline'

const STEPS: { id: WorkStep; label: string; hint?: string }[] = [
  { id: 'prepare', label: 'Preparing the photo' },
  { id: 'engine', label: 'Loading the text reader', hint: 'Only slow the first time' },
  { id: 'read', label: 'Reading the text' },
  { id: 'scan', label: 'Finding sensitive details and QR codes' },
]

interface Props {
  step: WorkStep
  /** 0–1, shown while reading. */
  progress?: number
}

// A short checklist of what's happening while a photo is processed.
export function ProgressSteps({ step, progress }: Props) {
  const current = STEPS.findIndex((s) => s.id === step)
  return (
    <div role="status" aria-live="polite" className="rounded-2xl bg-card px-4 py-4 ring-1 ring-line">
      <ol className="flex flex-col gap-3">
        {STEPS.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'todo'
          const percent = s.id === 'read' && state === 'active' && progress ? Math.round(progress * 100) : null
          return (
            <li key={s.id} className="flex items-start gap-3" aria-current={state === 'active' ? 'step' : undefined}>
              <StepIcon state={state} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className={`text-[15px] ${state === 'todo' ? 'text-muted' : 'text-ink'} ${state === 'active' ? 'font-semibold' : ''}`}>
                  {s.label}
                  {percent !== null && <span className="font-normal text-muted"> · {percent}%</span>}
                </p>
                {state === 'active' && s.hint && <p className="text-[13px] text-muted">{s.hint}</p>}
                {state === 'active' && s.id === 'read' && (
                  <div className="h-1.5 overflow-hidden bg-line">
                    <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${percent ?? 0}%` }} />
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function StepIcon({ state }: { state: 'done' | 'active' | 'todo' }) {
  if (state === 'done') {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-ink text-marigold" aria-label="Done">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="h-3 w-3" aria-hidden="true">
          <path d="M5 12l5 5L19 7" strokeLinecap="square" />
        </svg>
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span
        className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-ink border-t-transparent motion-reduce:animate-none motion-reduce:border-t-ink"
        aria-label="In progress"
      />
    )
  }
  return <span className="mt-0.5 h-5 w-5 shrink-0 border-2 border-line" aria-hidden="true" />
}

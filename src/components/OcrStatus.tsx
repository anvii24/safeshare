import type { OcrProgress } from '../lib/ocr'

export type Status =
  | { kind: 'preparing' }
  | { kind: 'ocr'; progress: OcrProgress }
  | { kind: 'done'; wordCount: number; lineCount: number }
  | { kind: 'error'; message: string }

// A small status card: progress while OCR runs, a summary when it's done.
export function OcrStatus({ status }: { status: Status }) {
  if (status.kind === 'error') {
    return (
      <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
        {status.message}
      </p>
    )
  }

  if (status.kind === 'done') {
    return (
      <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-900 ring-1 ring-teal-200">
        Found {status.wordCount} words on {status.lineCount} lines.
      </p>
    )
  }

  const { message, percent } =
    status.kind === 'preparing'
      ? { message: 'Preparing image…', percent: 0 }
      : status.progress.stage === 'loading'
        ? { message: 'Loading text reader…', percent: 0 }
        : {
            message: `Reading text… ${Math.round(status.progress.progress * 100)}%`,
            percent: status.progress.progress * 100,
          }

  return (
    <div role="status" aria-live="polite" className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
      <p className="text-sm text-stone-700">{message}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full bg-teal-600 transition-[width] duration-300 ${
            status.kind === 'ocr' && status.progress.stage === 'reading' ? '' : 'w-1/4 animate-pulse'
          }`}
          style={percent > 0 ? { width: `${percent}%` } : undefined}
        />
      </div>
    </div>
  )
}

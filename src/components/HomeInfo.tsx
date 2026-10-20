import type { ReactNode } from 'react'
import { detectPlatform, promptInstall, useInstallState } from '../lib/install'

// The landing sections under the hero: how it works, the privacy promise, and
// how to install it.
export function HomeInfo() {
  return (
    <div className="flex flex-col gap-4">
      <Card title="How it works">
        <ol className="flex flex-col gap-3">
          <Step n={1}>Choose a photo or screenshot of your document.</Step>
          <Step n={2}>
            SafeShare finds Aadhaar, PAN, bank account and phone numbers, dates of birth, emails and QR codes, and
            covers them with solid black bars.
          </Step>
          <Step n={3}>Check the result, then save it or share it straight to WhatsApp.</Step>
        </ol>
      </Card>

      <section className="flex flex-col gap-2 rounded-2xl bg-ink px-4 py-5 text-paper">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f5a524" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="1" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Your document never leaves your device
        </h2>
        <p className="text-[15px] leading-relaxed text-ash">
          Everything happens inside your phone or computer. Nothing is uploaded, there’s no account, and we don’t
          track what you do. It even works with no internet.
        </p>
        <a
          href="#about"
          className="flex min-h-11 items-center self-start text-sm font-semibold text-marigold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-marigold"
        >
          Read our privacy promise
        </a>
      </section>

      <InstallCard />
    </div>
  )
}

function InstallCard() {
  const { canPrompt, installed } = useInstallState()
  if (installed) return null
  const platform = detectPlatform()

  return (
    <Card title="Install it like an app">
      <p className="text-[15px] text-muted">
        {platform === 'android'
          ? 'Add SafeShare to your home screen to open it in one tap, use it offline, and share photos to it straight from your gallery.'
          : 'Add SafeShare to your home screen to open it in one tap and use it offline.'}
      </p>
      {canPrompt ? (
        <button
          type="button"
          onClick={promptInstall}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-paper px-4 text-base font-semibold text-ink ring-2 ring-ink hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          Install SafeShare
        </button>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {platform === 'ios' ? (
            <>
              <Step n={1}>
                Open this page in <strong>Safari</strong>.
              </Step>
              <Step n={2}>
                Tap the <strong>Share</strong> button (the square with an arrow).
              </Step>
              <Step n={3}>
                Choose <strong>Add to Home Screen</strong>.
              </Step>
            </>
          ) : platform === 'android' ? (
            <>
              <Step n={1}>
                Open this page in <strong>Chrome</strong>.
              </Step>
              <Step n={2}>
                Tap the <strong>⋮</strong> menu at the top right.
              </Step>
              <Step n={3}>
                Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </Step>
            </>
          ) : (
            <Step n={1}>
              In Chrome or Edge, click the <strong>install icon</strong> at the right end of the address bar.
            </Step>
          )}
        </ol>
      )}
    </Card>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-card px-4 py-5 ring-1 ring-line">
      <h2 className="mb-3 font-display text-lg font-extrabold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-[15px] text-ink">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-ink font-display text-[13px] font-bold text-paper" aria-hidden="true">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

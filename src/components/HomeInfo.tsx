import type { ReactNode } from 'react'
import { detectPlatform, promptInstall, useInstallState } from '../lib/install'

// The landing section under "Choose document": what SafeShare does, the
// privacy promise, and how to install it.
export function HomeInfo() {
  return (
    <div className="flex flex-col gap-4">
      <Card title="How it works">
        <ol className="flex flex-col gap-3">
          <Step n={1}>Choose a photo or screenshot of your document.</Step>
          <Step n={2}>
            SafeShare finds Aadhaar, PAN, bank account and phone numbers, dates of birth, emails and QR codes, and
            covers them.
          </Step>
          <Step n={3}>Check the result, then save it or share it straight to WhatsApp.</Step>
        </ol>
      </Card>

      <section className="flex flex-col gap-2 rounded-2xl bg-teal-50 px-4 py-4 ring-1 ring-teal-200">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-teal-950">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden="true">
            <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" strokeLinejoin="round" />
            <path d="M8.5 12l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Your document never leaves your device
        </h2>
        <p className="text-sm text-teal-900">
          Everything happens inside your phone or computer. Nothing is uploaded, there’s no account, and we don’t
          track what you do. It even works with no internet.
        </p>
        <a href="#about" className="flex min-h-11 items-center self-start text-sm font-semibold text-teal-800 underline underline-offset-4">
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
      <p className="text-sm text-stone-600">
        {platform === 'android'
          ? 'Add SafeShare to your home screen to open it in one tap, use it offline, and share photos to it straight from your gallery.'
          : 'Add SafeShare to your home screen to open it in one tap and use it offline.'}
      </p>
      {canPrompt ? (
        <button
          type="button"
          onClick={promptInstall}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-base font-semibold text-teal-800 ring-1 ring-teal-300 hover:bg-teal-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          Install SafeShare
        </button>
      ) : (
        <ol className="mt-3 flex flex-col gap-2 text-sm text-stone-700">
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
    <section className="rounded-2xl bg-white px-4 py-4 ring-1 ring-stone-200">
      <h2 className="mb-3 text-[15px] font-semibold text-stone-900">{title}</h2>
      {children}
    </section>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-stone-700">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[13px] font-semibold text-stone-600" aria-hidden="true">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

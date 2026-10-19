import type { ReactNode } from 'react'

// About & privacy, in plain English. Keep this true: if the app's behaviour
// changes (anything stored, anything sent), update this page in the same change.
export function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <article className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-12 items-center gap-1 self-start rounded-xl pr-3 text-sm font-medium text-teal-800 hover:bg-white"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <h2 className="text-xl font-semibold tracking-tight">About SafeShare and your privacy</h2>

      <Section title="What SafeShare does">
        <p>
          Before you send a photo of your Aadhaar card, PAN card, passbook or another document, SafeShare finds the
          details that could be misused and covers them with solid black boxes. You check the result, add a note like
          “Shared only for flat rental” if you want, and then save or share the cleaned copy.
        </p>
      </Section>

      <Section title="Our promise: your document never leaves your device">
        <ul>
          <li>Reading the text, finding numbers and QR codes, and making the cleaned image all happen on your phone or computer.</li>
          <li>We never upload your photo. There is no SafeShare server that could receive it.</li>
          <li>No account, no sign-in, no ads, no analytics, no tracking.</li>
          <li>The only time your image goes anywhere is when <em>you</em> tap Share or Download.</li>
        </ul>
      </Section>

      <Section title="What stays on your device">
        <ul>
          <li>
            <strong>The app itself</strong>, including the text-reading engine and its English and Hindi language
            files, is saved by your browser so SafeShare opens quickly and works offline.
          </li>
          <li>
            <strong>Your documents are not saved.</strong> They are only kept in memory while you use them, and are
            gone when you close the app or start a new document.
          </li>
          <li>
            If you share a photo to SafeShare from your gallery, it is held briefly so the app can open it, then
            deleted straight away.
          </li>
        </ul>
      </Section>

      <Section title="The cleaned image">
        <ul>
          <li>Hidden areas are covered with solid boxes, not blur, which can sometimes be undone.</li>
          <li>
            The image is saved as a brand-new file, so hidden information in the original, like the location where the
            photo was taken, is removed.
          </li>
          <li>
            The optional note is repeated faintly across the image with today’s date, so the copy is harder to reuse
            for something else.
          </li>
        </ul>
      </Section>

      <Section title="Please check before you send">
        <p>
          SafeShare can miss things, especially in blurry or dark photos, or with unusual layouts and handwriting. Always
          look at the final image before sending it, and use <strong>Draw box</strong> to cover anything we missed.
        </p>
      </Section>

      <p className="text-[13px] text-stone-500">Last updated 19 October 2026.</p>
    </article>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-4 text-[15px] leading-relaxed text-stone-700 ring-1 ring-stone-200 [&_li]:ml-5 [&_li]:list-disc [&_li+li]:mt-2">
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      {children}
    </section>
  )
}

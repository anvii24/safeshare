import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

// The home-page hero: a made-up ID card (clearly marked "Sample") that scans and
// redacts itself on a loop. Not a real card design, and the 12-digit number
// fails the Aadhaar checksum on purpose. Pure CSS animation (see index.css);
// it pauses when scrolled out of view, and is static with "reduce motion".
export function SampleCard() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        ref={ref}
        role="img"
        aria-label="Sample ID card with made-up details. SafeShare covers the date of birth, phone, ID and PAN numbers with black bars."
        className={`relative w-full max-w-[340px] -rotate-1 overflow-hidden rounded-xl bg-white p-4 shadow-[0_10px_30px_-12px_rgb(17_17_17/0.35)] ring-1 ring-ink/10 ${
          visible ? '' : 'hero-paused'
        }`}
      >
        <div aria-hidden="true" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold tracking-[0.14em] text-muted">IDENTITY CARD</span>
            <span className="bg-ink px-2 py-0.5 font-display text-[13px] font-extrabold tracking-[0.12em] text-marigold">SAMPLE</span>
          </div>

          <div className="flex gap-3">
            <div className="flex h-[76px] w-[62px] shrink-0 items-end justify-center overflow-hidden rounded-md bg-paper">
              <svg viewBox="0 0 62 76" className="h-full w-full" fill="#cfc8b9">
                <circle cx="31" cy="28" r="13" />
                <path d="M6 76c2-17 12-26 25-26s23 9 25 26z" />
              </svg>
            </div>
            <dl className="grid min-w-0 grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-[13px]">
              <dt className="text-muted">Name</dt>
              <dd className="font-semibold text-ink">Asha Verma</dd>
              <dt className="text-muted">DOB</dt>
              <dd className="font-mono text-ink">
                <Redacted i={0}>14/08/1992</Redacted>
              </dd>
              <dt className="text-muted">Phone</dt>
              <dd className="font-mono text-ink">
                <Redacted i={1}>98765 43210</Redacted>
              </dd>
            </dl>
          </div>

          <p className="text-center font-mono text-[22px] font-bold tracking-[0.08em] text-ink">
            <Redacted i={2}>4821 7730 1956</Redacted>
          </p>

          <div className="flex items-baseline justify-between gap-2 border-t border-dashed border-line pt-2 text-[13px]">
            <span className="text-muted">PAN</span>
            <span className="font-mono text-ink">
              <Redacted i={3}>ABCDE1234F</Redacted>
            </span>
          </div>
        </div>
        <div className="hero-scan" aria-hidden="true" />
      </div>
      <figcaption className="text-[13px] text-muted">Sample card · all details are made up</figcaption>
    </figure>
  )
}

function Redacted({ i, children }: { i: number; children: ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <span className="hero-bar" style={{ '--bar-delay': `${i * 180}ms` } as CSSProperties} />
    </span>
  )
}

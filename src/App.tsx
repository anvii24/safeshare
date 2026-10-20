import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { AboutPage } from './components/AboutPage'
import { DocumentPicker } from './components/DocumentPicker'
import { HomeInfo } from './components/HomeInfo'
import { Logo } from './components/Logo'
import { Notice } from './components/Notice'
import { ProgressSteps } from './components/ProgressSteps'
import { ReviewScreen } from './components/ReviewScreen'
import { SampleCard } from './components/SampleCard'
import { ShareScreen } from './components/ShareScreen'
import { ImageError, type LoadedImage } from './lib/image'
import { preloadOcr } from './lib/ocr'
import { whenServiceWorkerControls } from './lib/offline'
import { processDocument, type WorkStep } from './lib/pipeline'
import type { ImageQuality } from './lib/quality'
import { initReview, maskPlan, reviewReducer } from './lib/review'
import { takeSharedFile } from './lib/sharedFile'

type Step = 'pick' | 'reading' | 'review' | 'share'

interface Work {
  step: WorkStep
  progress?: number
}

interface Failure {
  title: string
  message: string
}


export default function App() {
  const [step, setStep] = useState<Step>('pick')
  const [image, setImage] = useState<LoadedImage | null>(null)
  const [work, setWork] = useState<Work | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [quality, setQuality] = useState<ImageQuality>('ok')
  const [review, dispatch] = useReducer(reviewReducer, [], initReview)
  // A stable array, so the share screen only re-renders the image when the review changes.
  const rects = useMemo(() => maskPlan(review), [review])
  // Ignore results from an older run if the user picks a new file mid-OCR.
  const runId = useRef(0)
  // "#about" shows the About & privacy page on top of whatever step the user is on.
  const [showAbout, setShowAbout] = useState(() => window.location.hash === '#about')
  // Whether we got to #about from inside the app, so "Back" can use the browser history.
  const openedAboutInApp = useRef(false)

  useEffect(() => {
    const onHash = () => {
      const about = window.location.hash === '#about'
      if (about) openedAboutInApp.current = true
      setShowAbout(about)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])


  // Get an OCR worker ready while the user is choosing a photo. Wait for the
  // service worker first, so the engine files are fetched through it and cached
  // for offline use (on the first visit it's still installing at this point).
  useEffect(() => {
    if (step !== 'pick') return
    let cancelled = false
    whenServiceWorkerControls().then(() => {
      if (!cancelled) preloadOcr()
    })
    return () => {
      cancelled = true
    }
  }, [step])

  // Free the previous image's memory when it is replaced or cleared.
  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url)
  }, [image])

  const handleFile = async (file: File) => {
    const id = ++runId.current
    const current = () => id === runId.current
    setImage(null)
    setFailure(null)
    setStep('reading')
    setWork({ step: 'prepare' })

    try {
      const result = await processDocument(file, {
        isCurrent: current,
        onImage: setImage,
        onStep: (step, progress) => setWork({ step, progress }),
      })
      if (!result) return
      dispatch({ kind: 'init', detections: result.detections })
      setQuality(result.quality)
      setWork(null)
      setStep('review')
    } catch (err) {
      if (!current()) return
      console.error(err)
      setFailure(
        err instanceof ImageError
          ? { title: err.title, message: err.message }
          : {
              title: 'Something went wrong',
              message: 'We couldn’t read this photo. Please try again, and if it keeps happening, reload the page.',
            },
      )
      setWork(null)
      setImage(null)
      setStep('pick')
    }
  }

  // Opened from Android's share menu: start on the shared image.
  useEffect(() => {
    takeSharedFile().then((shared) => {
      if (shared === 'error') {
        setFailure({ title: 'We couldn’t open the shared photo', message: 'Please choose it again with the button below.' })
      } else if (shared) {
        handleFile(shared)
      }
    })
    // Runs once at startup; handleFile only uses setters and refs.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    runId.current++
    setImage(null)
    setWork(null)
    setFailure(null)
    setStep('pick')
  }

  const closeAbout = () => {
    if (openedAboutInApp.current) return window.history.back()
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setShowAbout(false)
  }

  const reviewing = step === 'review' && !showAbout
  const hasBottomBar = (step === 'review' || step === 'share') && !showAbout

  // Review runs in dark "secure mode", edge to edge (see index.css).
  useEffect(() => {
    document.documentElement.classList.toggle('secure', reviewing)
  }, [reviewing])

  return (
    <div className={`min-h-dvh ${reviewing ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}>
      <main className={`mx-auto flex max-w-xl flex-col gap-5 px-4 pt-5 ${hasBottomBar ? 'pb-40' : 'pb-12'} ${reviewing ? 'lg:max-w-5xl' : ''}`}>
        <header className="flex min-h-12 items-center justify-between gap-3">
          <Logo dark={reviewing} />
          {step !== 'pick' && !showAbout && (
            <button
              type="button"
              onClick={reset}
              className={`min-h-12 shrink-0 rounded-xl px-3 text-sm font-semibold whitespace-nowrap ring-1 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                reviewing
                  ? 'text-paper ring-ink-3 hover:bg-ink-2 focus-visible:outline-marigold'
                  : 'text-ink ring-line hover:bg-card focus-visible:outline-ink'
              }`}
            >
              New document
            </button>
          )}
        </header>

        {showAbout && <AboutPage onBack={closeAbout} />}

        {!showAbout && failure && (
          <Notice tone="error" title={failure.title}>
            {failure.message}
          </Notice>
        )}
        {!showAbout && step === 'pick' && (
          <>
            <section className="flex flex-col gap-5 pt-2">
              <h1 className="font-display text-[40px] leading-[1.04] font-extrabold tracking-tight text-ink sm:text-5xl">
                Share the doc. Not your <span className="redact-word">numbers</span>.
              </h1>
              <p className="text-base leading-relaxed text-muted">
                SafeShare covers Aadhaar, PAN, bank and phone numbers with solid black bars, right here on your phone.
                Nothing is uploaded.
              </p>
              <SampleCard />
              <DocumentPicker onFile={handleFile} />
            </section>
            <HomeInfo />
          </>
        )}
        {!showAbout && work && <ProgressSteps step={work.step} progress={work.progress} />}

        {/* While the text is read, a marigold scan line sweeps down the photo. */}
        {!showAbout && step === 'reading' && image && (
          <div className="relative overflow-hidden rounded-xl bg-card ring-2 ring-ink">
            <img src={image.url} alt="Your chosen document, being read" className="block h-auto w-full" />
            <div className="scan-track" aria-hidden="true" />
          </div>
        )}

        {reviewing && image && (
          <ReviewScreen
            image={image}
            state={review}
            dispatch={dispatch}
            quality={quality}
            onRetake={reset}
            onContinue={() => setStep('share')}
          />
        )}

        {!showAbout && step === 'share' && image && <ShareScreen image={image} rects={rects} onBack={() => setStep('review')} />}

        {!reviewing && (
          <footer className="flex flex-col items-center gap-1">
            <p className="flex items-center justify-center gap-2 text-center text-[13px] text-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Your document never leaves this device.
            </p>
            {!showAbout && step !== 'share' && (
              <a
                href="#about"
                className="flex min-h-11 items-center px-3 text-[13px] font-semibold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
              >
                About &amp; privacy
              </a>
            )}
          </footer>
        )}
      </main>
    </div>
  )
}

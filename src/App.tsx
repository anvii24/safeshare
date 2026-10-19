import { useEffect, useRef, useState } from 'react'
import { DocumentPicker } from './components/DocumentPicker'
import { DocumentViewer } from './components/DocumentViewer'
import { OcrStatus, type Status } from './components/OcrStatus'
import { loadImage, type LoadedImage } from './lib/image'
import { runOcr, type OcrWord } from './lib/ocr'

export default function App() {
  const [image, setImage] = useState<LoadedImage | null>(null)
  const [words, setWords] = useState<OcrWord[]>([])
  const [status, setStatus] = useState<Status | null>(null)
  // Ignore results from an older run if the user picks a new file mid-OCR.
  const runId = useRef(0)

  // Free the previous image's memory when it is replaced or cleared.
  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url)
  }, [image])

  const handleFile = async (file: File) => {
    const id = ++runId.current
    setWords([])
    setImage(null)
    setStatus({ kind: 'preparing' })

    try {
      const loaded = await loadImage(file)
      if (id !== runId.current) return URL.revokeObjectURL(loaded.url)
      setImage(loaded)

      const found = await runOcr(loaded.canvas, (progress) => {
        if (id === runId.current) setStatus({ kind: 'ocr', progress })
      })
      if (id !== runId.current) return
      setWords(found)
      const lineCount = new Set(found.map((w) => w.line)).size
      setStatus({ kind: 'done', wordCount: found.length, lineCount })
    } catch (err) {
      if (id !== runId.current) return
      console.error(err)
      const message =
        err instanceof Error && err.message.startsWith('Please')
          ? err.message
          : 'Sorry, we couldn’t read that image. Please try another photo.'
      setStatus({ kind: 'error', message })
    }
  }

  const reset = () => {
    runId.current++
    setImage(null)
    setWords([])
    setStatus(null)
  }

  const showPicker = !image && status?.kind !== 'preparing'

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 pt-8 pb-12">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">SafeShare</h1>
            <p className="text-sm text-stone-500">Hide sensitive details before you share.</p>
          </div>
          {image && (
            <button
              type="button"
              onClick={reset}
              className="min-h-12 shrink-0 whitespace-nowrap rounded-xl px-4 text-sm font-medium text-teal-800 ring-1 ring-stone-300 hover:bg-white"
            >
              New document
            </button>
          )}
        </header>

        {showPicker && <DocumentPicker onFile={handleFile} />}
        {status && <OcrStatus status={status} />}
        {image && <DocumentViewer image={image} words={words} />}

        <p className="flex items-center justify-center gap-2 text-center text-xs text-stone-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Your document never leaves this device.
        </p>
      </main>
    </div>
  )
}

import { useRef, useState, type DragEvent } from 'react'

interface Props {
  onFile: (file: File) => void
}

// The home-screen card: a big "Choose document" button plus a drag-and-drop zone.
// No `capture` attribute on the input, so phones offer both camera and gallery.
export function DocumentPicker({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        dragging ? 'border-teal-500 bg-teal-50' : 'border-stone-300 bg-white'
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true">
          <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
          <path d="M14 3v5h5M10 13h6M10 17h4" strokeLinecap="round" />
        </svg>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full max-w-xs rounded-2xl bg-teal-700 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:scale-[0.98]"
      >
        Choose document
      </button>

      <p className="text-sm text-stone-500">
        Take a photo or pick one from your gallery.
        <span className="hidden sm:inline"> You can also drag an image here.</span>
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = '' // allow choosing the same file again
        }}
      />
    </div>
  )
}

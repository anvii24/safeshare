import { useRef, useState, type DragEvent } from 'react'

interface Props {
  onFile: (file: File) => void
}

// The big black "Choose document" button, which is also a drag-and-drop zone on laptops.
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
      className={`flex flex-col items-center gap-3 rounded-2xl p-2 text-center transition-colors ${
        dragging ? 'bg-card outline-2 outline-offset-2 outline-ink outline-dashed' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group flex min-h-14 w-full max-w-sm items-center justify-center gap-3 rounded-xl bg-ink px-6 py-4 font-display text-lg font-bold text-paper shadow-[0_8px_20px_-10px_rgb(17_17_17/0.6)] transition hover:bg-black focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ink active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
          <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
          <path d="M14 3v5h5" strokeLinejoin="round" />
          <rect x="9.5" y="13" width="7" height="3" fill="#f5a524" stroke="none" />
        </svg>
        Choose document
      </button>

      <p className="text-sm text-muted">
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

import { useRef, useState } from 'react'
import { FileText, Paperclip, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/**
 * Documents (GST certificate, drug licence, shop photos…): images or PDFs.
 * Holds [{ id, name, size, type, url, file? }] — `file` is uploaded in the backend phase.
 */
export function DocumentUploader({ documents, onChange, max = 6, hint = 'GST certificate, drug licence, shop photos' }) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  const add = (list) => {
    setError('')
    const accepted = []
    for (const file of Array.from(list).slice(0, max - documents.length)) {
      if (!ACCEPT.includes(file.type)) {
        setError(`${file.name}: only JPG, PNG, WEBP or PDF.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name}: must be under 5 MB.`)
        continue
      }
      accepted.push({ id: `${Date.now()}-${file.name}`, name: file.name, size: file.size, type: file.type, url: URL.createObjectURL(file), file })
    }
    if (accepted.length) onChange([...documents, ...accepted])
  }

  const remove = (doc) => {
    if (doc.file) URL.revokeObjectURL(doc.url)
    onChange(documents.filter((d) => d.id !== doc.id))
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-wrap gap-3">
        {documents.map((doc) => (
          <div key={doc.id} className="relative flex w-40 flex-col overflow-hidden rounded-xl border border-mint bg-white">
            <a href={doc.url} target="_blank" rel="noreferrer" className="grid h-24 place-items-center bg-bg">
              {doc.type.startsWith('image/') ? (
                <img src={doc.url} alt={doc.name} className="size-full object-cover" />
              ) : (
                <FileText className="size-8 text-green-deep" strokeWidth={1.5} />
              )}
            </a>
            <div className="px-2.5 py-2">
              <p className="truncate text-xs font-semibold text-ink">{doc.name}</p>
              <p className="text-[0.7rem] text-ink-muted">{size(doc.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => remove(doc)}
              aria-label={`Remove ${doc.name}`}
              className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/75 text-white hover:bg-black"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {documents.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              add(e.dataTransfer.files)
            }}
            className={cn(
              'grid h-[9.5rem] w-40 place-items-center rounded-xl border-2 border-dashed text-sm font-semibold transition-colors',
              dragging ? 'border-green-fresh bg-mint-pale text-green-deep' : 'border-mint bg-white text-ink-muted hover:border-green-fresh hover:text-green-deep',
            )}
          >
            <span className="flex flex-col items-center gap-2">
              <Upload className="size-6" /> Upload
            </span>
          </button>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
        <Paperclip className="size-3.5" /> {hint} — JPG, PNG, WEBP or PDF, up to 5 MB each ({documents.length}/{max}).
      </p>
      {error && <p className="mt-1 text-sm font-medium text-destructive">{error}</p>}
      <input ref={inputRef} type="file" multiple hidden accept={ACCEPT.join(',')} onChange={(e) => { add(e.target.files); e.target.value = '' }} />
    </div>
  )
}

import { useId, useRef, useState } from 'react'
import { Inbox, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Big dashed "drag a file here, or click to browse" target.
 * Calls onFile(file); validates the extension against `accept` first.
 */
export function FileDropZone({ onFile, accept = ['.xlsx'], busy, title = 'Drag the updated file here, or click to browse', hint, onReject }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const id = useId()

  const handle = (file) => {
    if (!file) return
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!accept.includes(ext)) return onReject?.(`Please choose a ${accept.join(' or ')} file.`)
    onFile(file)
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handle(e.dataTransfer.files?.[0])
      }}
      className={cn(
        'flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
        dragging ? 'border-green-fresh bg-mint-pale' : 'border-mint bg-bg hover:border-green-soft hover:bg-mint-pale/60',
        busy && 'pointer-events-none opacity-70',
      )}
    >
      {busy ? <Loader2 className="size-9 animate-spin text-green-deep" /> : <Inbox className="size-9 text-green-deep" strokeWidth={1.5} />}
      <span className="text-sm font-semibold text-ink">{busy ? 'Reading file…' : title}</span>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept.join(',')}
        className="sr-only"
        onChange={(e) => {
          handle(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </label>
  )
}

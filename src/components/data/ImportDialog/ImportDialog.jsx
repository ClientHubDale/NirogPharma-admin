import { useId, useRef, useState } from 'react'
import { Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_BYTES = 5 * 1024 * 1024

/**
 * "Import …" modal: Download Sample link, file picker, required-fields note, Submit.
 * Reusable for any list page — pass the sample download and an async onSubmit(file).
 * onSubmit should throw (or reject) with a message to keep the dialog open with an error.
 */
const DEFAULT_ACCEPT = ['.xlsx', '.csv']

export function ImportDialog({ open, onOpenChange, title, requiredNote, onDownloadSample, onSubmit, accept = DEFAULT_ACCEPT }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const inputId = useId()

  const reset = () => {
    setFile(null)
    setError('')
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const pick = (candidate) => {
    setError('')
    if (!candidate) return setFile(null)
    const extension = candidate.name.slice(candidate.name.lastIndexOf('.')).toLowerCase()
    if (!accept.includes(extension)) {
      setFile(null)
      return setError(
        extension === '.xls'
          ? 'Old .xls files aren’t supported. In Excel: File → Save As → Excel Workbook (.xlsx).'
          : `Please choose a ${accept.join(' or ')} file.`,
      )
    }
    if (candidate.size > MAX_BYTES) {
      setFile(null)
      return setError('The file is larger than 5 MB.')
    }
    setFile(candidate)
  }

  const submit = async () => {
    if (!file) return setError('Choose a file to import.')
    setBusy(true)
    try {
      await onSubmit(file)
      reset()
      onOpenChange(false)
    } catch (err) {
      setError(err?.message ?? 'Import failed.')
      setBusy(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-mint-pale bg-white shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <header className="flex items-center justify-between border-b border-mint-pale px-5 py-4">
            <Dialog.Title className="text-lg font-extrabold text-black">{title}</Dialog.Title>
            <Dialog.Close className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-bg hover:text-black" aria-label="Close">
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="space-y-4 px-5 py-5">
            <button
              type="button"
              onClick={onDownloadSample}
              className="inline-flex items-center gap-2 text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
            >
              <Download className="size-4" /> Download Sample
            </button>

            <label
              htmlFor={inputId}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                pick(e.dataTransfer.files?.[0])
              }}
              className={cn(
                'flex cursor-pointer items-center overflow-hidden rounded-lg border bg-white transition-colors',
                error ? 'border-destructive' : dragging ? 'border-green-fresh bg-mint-pale' : 'border-mint hover:border-green-fresh',
              )}
            >
              <span className="flex h-11 shrink-0 items-center gap-2 border-r border-mint-pale bg-bg px-4 text-sm font-semibold text-ink">
                <Upload className="size-4" /> Choose File
              </span>
              <span className={cn('flex min-w-0 flex-1 items-center gap-2 px-3.5 text-sm', file ? 'text-ink' : 'text-ink-muted')}>
                {file && <FileSpreadsheet className="size-4 shrink-0 text-green-deep" />}
                <span className="truncate">{file ? file.name : `No file chosen — or drop a ${accept.join(' / ')} file here`}</span>
              </span>
              {file && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    pick(null)
                    if (inputRef.current) inputRef.current.value = ''
                  }}
                  aria-label="Remove file"
                  className="mr-2 grid size-7 shrink-0 place-items-center rounded text-ink-muted hover:bg-bg hover:text-black"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={accept.join(',')}
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0])}
            />

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <p className="text-sm text-ink">
              <span className="font-semibold">Required:</span> {requiredNote}
            </p>
          </div>

          <footer className="flex justify-end gap-2 border-t border-mint-pale bg-bg px-5 py-3.5">
            <Dialog.Close asChild>
              <Button variant="outline" size="lg">
                Cancel
              </Button>
            </Dialog.Close>
            <Button size="lg" onClick={submit} disabled={!file || busy}>
              {busy && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Submit
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

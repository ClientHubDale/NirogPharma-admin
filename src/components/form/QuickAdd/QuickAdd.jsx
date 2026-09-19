import { useState } from 'react'
import { Check, X } from 'lucide-react'

/**
 * Inline "add a new option" row (Category / Brand "+ New").
 * Calls onAdd(name) and closes; rejects blanks and duplicates (case-insensitive).
 */
export function QuickAdd({ existing, onAdd, onCancel, placeholder = 'New name' }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return setError('Enter a name.')
    if (existing.some((e) => e.toLowerCase() === trimmed.toLowerCase())) return setError('That already exists.')
    onAdd(trimmed)
  }

  return (
    <div>
      <div className="flex h-11 overflow-hidden rounded-lg border border-green-fresh bg-white ring-3 ring-ring/25">
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              onCancel()
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3.5 text-sm outline-none"
        />
        <button type="button" onClick={submit} aria-label="Add" className="grid w-11 place-items-center bg-black text-white hover:bg-black/85">
          <Check className="size-4" />
        </button>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="grid w-11 place-items-center text-ink-muted hover:bg-bg hover:text-black">
          <X className="size-4" />
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}

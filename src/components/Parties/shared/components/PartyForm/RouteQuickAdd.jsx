import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { SearchSelect } from '@/components/form/SearchSelect'

/** "+ New" route: pick the city, type the name. Rejects blanks and duplicates within the city. */
export function RouteQuickAdd({ cityOptions, routes, onAdd, onCancel }) {
  const [cityId, setCityId] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const trimmed = name.trim()
    if (!cityId) return setError('Choose the city first.')
    if (!trimmed) return setError('Enter the route name.')
    if (routes.some((r) => r.cityId === cityId && r.name.toLowerCase() === trimmed.toLowerCase())) return setError('This city already has that route.')
    onAdd({ cityId, name: trimmed })
  }

  return (
    <div className="space-y-2 rounded-lg border border-green-fresh bg-mint-pale/40 p-2.5">
      <SearchSelect aria-label="City for new route" placeholder="City" options={cityOptions} value={cityId} onChange={(v) => { setCityId(v); setError('') }} />
      <div className="flex h-11 overflow-hidden rounded-lg border border-mint bg-white focus-within:border-green-fresh">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit() }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() }
          }}
          placeholder="Route name"
          aria-label="New route name"
          className="min-w-0 flex-1 bg-transparent px-3.5 text-sm outline-none"
        />
        <button type="button" onClick={submit} aria-label="Add route" className="grid w-11 place-items-center bg-black text-white hover:bg-black/85">
          <Check className="size-4" />
        </button>
        <button type="button" onClick={onCancel} aria-label="Cancel new route" className="grid w-11 place-items-center text-ink-muted hover:bg-bg">
          <X className="size-4" />
        </button>
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}

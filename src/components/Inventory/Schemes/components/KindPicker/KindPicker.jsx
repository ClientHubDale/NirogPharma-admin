import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SCHEME_KINDS } from '../../schemeModel'

/**
 * Which scheme this is — asked once, in the words someone would use saying it
 * out loud, with a real example underneath so nobody has to decode a label.
 *
 * Four cards, and between them they are every scheme the client asked for.
 * The pair they stand for (what earns it, what it gives) is the engine's
 * business, not the admin's.
 */
export function KindPicker({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="What kind of scheme" className="grid gap-3 sm:grid-cols-2">
      {SCHEME_KINDS.map(({ value: kind, title, example, icon: Icon }) => {
        const chosen = kind === value
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            id={`scheme-kind-${kind.replace(':', '-')}`}
            aria-checked={chosen}
            disabled={disabled && !chosen}
            onClick={() => onChange(kind)}
            className={cn(
              'relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
              chosen ? 'border-black bg-white shadow-glow' : 'border-mint-pale bg-white hover:border-mint',
            )}
          >
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-lg',
                chosen ? 'bg-black text-white' : 'bg-mint-pale text-forest',
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 pr-5">
              <span className="block font-bold text-black">{title}</span>
              <span className="mt-0.5 block text-sm text-ink-muted">{example}</span>
            </span>
            {chosen && (
              <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-green-deep text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

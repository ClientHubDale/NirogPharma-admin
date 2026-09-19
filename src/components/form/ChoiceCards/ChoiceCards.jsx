import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Big selectable cards (radio group) — e.g. the scheme type picker.
 * options: [{ value, title, description, icon? }]
 */
export function ChoiceCards({ value, onChange, options, label, disabled }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3 md:grid-cols-3">
      {options.map(({ value: v, title, description, icon: Icon }) => {
        const selected = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled && !selected}
            onClick={() => onChange(v)}
            className={cn(
              'relative flex gap-3 rounded-2xl border-2 p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'border-black bg-white shadow-glow' : 'border-mint-pale bg-white hover:border-mint',
            )}
          >
            {Icon && (
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', selected ? 'bg-black text-white' : 'bg-mint-pale text-forest')}>
                <Icon className="size-5" />
              </span>
            )}
            <span className="min-w-0 pr-5">
              <span className="block font-bold text-black">{title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{description}</span>
            </span>
            {selected && (
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

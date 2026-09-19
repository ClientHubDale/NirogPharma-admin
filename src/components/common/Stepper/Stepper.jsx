import { Check } from 'lucide-react'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'

/** Horizontal numbered steps. `current` is 0-based; earlier steps show a tick. */
export function Stepper({ steps, current }) {
  return (
    <ol className="flex items-center gap-3" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <Fragment key={label}>
            {i > 0 && <li aria-hidden className={cn('h-px flex-1', i <= current ? 'bg-green-deep' : 'bg-mint')} />}
            <li className="flex shrink-0 items-center gap-2.5" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'grid size-9 place-items-center rounded-full text-sm font-bold',
                  done && 'bg-green-deep text-white',
                  active && 'bg-black text-white shadow-lift',
                  !done && !active && 'border-2 border-mint text-ink-muted',
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('hidden text-base font-semibold sm:inline', active || done ? 'text-black' : 'text-ink-muted')}>{label}</span>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}

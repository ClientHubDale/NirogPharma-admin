import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Vertical "get started" timeline. Done steps get a green tick; the first
 * pending step is the current one (numbered, solid action button); later
 * steps are muted.
 */
export function SetupChecklist({ steps }) {
  const currentIndex = steps.findIndex((step) => !step.done)

  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex
        const isLast = index === steps.length - 1
        return (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-11 bottom-1 left-[1.3rem] w-0.5 rounded-full',
                  step.done ? 'bg-green-fresh' : 'bg-mint-pale',
                )}
              />
            )}
            <span
              className={cn(
                'relative grid size-11 shrink-0 place-items-center rounded-full text-base font-bold',
                step.done && 'bg-green-fresh text-white shadow-glow',
                isCurrent && 'bg-black text-white shadow-lift',
                !step.done && !isCurrent && 'border-2 border-mint bg-white text-ink-muted',
              )}
            >
              {step.done ? <Check className="size-5" strokeWidth={3} /> : index + 1}
            </span>
            <div className="pt-1.5">
              <p className={cn('text-lg font-bold', !step.done && !isCurrent ? 'text-ink-muted' : 'text-black')}>
                {step.title}
              </p>
              <p className={cn('mt-1 text-[0.95rem]', step.done && !step.action ? 'text-green-deep' : 'text-ink-muted')}>
                {step.description}
              </p>
              {step.action && (
                <Button
                  asChild
                  size="sm"
                  variant={isCurrent ? 'default' : 'outline'}
                  className="mt-3 h-9 px-4 text-sm"
                >
                  <Link to={step.action.path}>{step.action.label}</Link>
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

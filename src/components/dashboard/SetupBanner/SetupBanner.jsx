import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SetupChecklist } from '../SetupChecklist'

/**
 * Compact "finish setting up" strip with a progress bar and the next action.
 * Expands to the full checklist. Hidden once every step is done.
 */
export function SetupBanner({ steps }) {
  const [open, setOpen] = useState(false)
  const done = steps.filter((step) => step.done).length
  const next = steps.find((step) => !step.done)
  if (!next) return null

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-mint to-green-soft shadow-glow">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-forest">
            Finish setting up · {done} of {steps.length} done
          </p>
          <p className="mt-1 text-lg font-bold text-black">Next: {next.title.toLowerCase()}</p>
          <div className="mt-3 h-1.5 max-w-sm overflow-hidden rounded-full bg-white/60">
            <div className="h-full rounded-full bg-forest" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {next.action && (
            <Button asChild size="lg">
              <Link to={next.action.path}>{next.action.label}</Link>
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            {open ? 'Hide steps' : 'All steps'}
            <ChevronDown data-icon="inline-end" className={cn('transition-transform', open && 'rotate-180')} />
          </Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/50 bg-white/85 p-5 sm:p-6">
          <SetupChecklist steps={steps} />
        </div>
      )}
    </section>
  )
}

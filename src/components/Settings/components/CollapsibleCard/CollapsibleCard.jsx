import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A titled block that opens and closes, as on the Settings screens. */
export function CollapsibleCard({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 bg-bg px-5 py-3.5 text-left text-sm font-bold text-black hover:bg-mint-pale/60 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          <ChevronDown className={cn('size-4 text-ink-muted transition-transform', !open && '-rotate-90')} />
          {title}
        </button>
      </h3>
      {open && (
        <div id={id} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          {children}
        </div>
      )}
    </section>
  )
}

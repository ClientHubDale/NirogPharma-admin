import { cn } from '@/lib/utils'

/** Floating "app window": traffic-light dots, centred title, status, then content. */
export function AppWindowMock({ title, status, className, children }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-mint-pale bg-white shadow-glow', className)}>
      <div className="flex items-center justify-between border-b border-mint-pale px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-mint" />
          <span className="size-2.5 rounded-full bg-mint" />
          <span className="size-2.5 rounded-full bg-mint" />
        </div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {status ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <span className="size-2 rounded-full bg-green-fresh" />
            {status}
          </p>
        ) : (
          <span className="w-12" />
        )}
      </div>
      {children}
    </div>
  )
}

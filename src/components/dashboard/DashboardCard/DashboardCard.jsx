import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * White dashboard panel: title (+ optional right-side meta or action) over
 * any content.
 *
 * An action either goes somewhere (`to`) or opens something in place
 * (`onClick`) — the breakdowns the client asked for are panes over the
 * dashboard rather than pages of their own, so the figure and its detail
 * stay on the same screen.
 */
export function DashboardCard({ title, action, meta, children, className, bodyClassName }) {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-2xl border border-mint-pale bg-white', className)}>
      <header className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6">
        <h2 className="text-base font-bold">{title}</h2>
        {meta}
        {action &&
          (action.onClick ? (
            <button
              type="button"
              onClick={action.onClick}
              className="shrink-0 rounded text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              {action.label}
            </button>
          ) : (
            <Link to={action.to} className="shrink-0 text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4">
              {action.label}
            </Link>
          ))}
      </header>
      <div className={cn('flex-1 px-5 pt-4 pb-5 sm:px-6', bodyClassName)}>{children}</div>
    </section>
  )
}

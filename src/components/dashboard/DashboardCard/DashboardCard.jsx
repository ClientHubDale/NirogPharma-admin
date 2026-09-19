import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** White dashboard panel: title (+ optional right-side meta or link) over any content. */
export function DashboardCard({ title, action, meta, children, className, bodyClassName }) {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-2xl border border-mint-pale bg-white', className)}>
      <header className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6">
        <h2 className="text-base font-bold">{title}</h2>
        {meta}
        {action && (
          <Link
            to={action.to}
            className="shrink-0 text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
          >
            {action.label}
          </Link>
        )}
      </header>
      <div className={cn('flex-1 px-5 pt-4 pb-5 sm:px-6', bodyClassName)}>{children}</div>
    </section>
  )
}

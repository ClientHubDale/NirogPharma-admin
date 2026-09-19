import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Dismissible success / error banner shown above a list after an action. */
export function Notice({ tone = 'success', children, onDismiss }) {
  const Icon = tone === 'success' ? CheckCircle2 : CircleAlert
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        tone === 'success' ? 'border-mint bg-mint-pale text-forest' : 'border-danger/25 bg-danger-soft text-danger-ink',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

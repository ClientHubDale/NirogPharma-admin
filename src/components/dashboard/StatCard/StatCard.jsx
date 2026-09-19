import { cn } from '@/lib/utils'
import { TONE_CLASSES } from '@/lib/status'

/**
 * KPI tile: label, big figure, one-line hint.
 * `tone` colours the icon tile and hint (status only — e.g. overdue = danger).
 */
export function StatCard({ icon: Icon, label, value, hint, tone = 'success' }) {
  const toneClass = TONE_CLASSES[tone]
  return (
    <div className="rounded-2xl border border-mint-pale bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-muted">{label}</p>
        {Icon && (
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', toneClass.soft)}>
            <Icon className={cn('size-4', toneClass.text)} />
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-3xl font-medium tracking-tight text-black tabular-nums">{value}</p>
      {hint && <p className={cn('mt-1.5 text-sm font-medium', tone === 'success' ? 'text-ink-muted' : toneClass.text)}>{hint}</p>}
    </div>
  )
}

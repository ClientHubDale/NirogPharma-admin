import { cn } from '@/lib/utils'
import { TONE_CLASSES } from '@/lib/status'

/**
 * Ranked horizontal bars with the label and value always written out.
 * rows: [{ id, label, sublabel?, value, percent (0–100), tone? }]
 */
export function BarList({ rows }) {
  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const tone = TONE_CLASSES[row.tone ?? 'success']
        return (
          <li key={row.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <p className="min-w-0 truncate text-ink">
                <span className="font-medium">{row.label}</span>
                {row.sublabel && <span className="text-ink-muted"> · {row.sublabel}</span>}
              </p>
              <p className="shrink-0 font-mono font-medium text-black tabular-nums">{row.value}</p>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-bg"
              role="progressbar"
              aria-label={row.label}
              aria-valuenow={Math.round(row.percent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.max(row.percent, 2)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

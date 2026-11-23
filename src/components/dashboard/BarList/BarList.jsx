import { cn } from '@/lib/utils'
import { TONE_CLASSES } from '@/lib/status'

/**
 * Ranked horizontal bars with the label and value always written out.
 * rows: [{ id, label, sublabel?, value, percent (0–100), tone?, onClick? }]
 *
 * A row with an `onClick` becomes a button, so the figure can be opened to
 * see what it is made of. Rows without one are plain text, exactly as they
 * were — a bar nobody can press should not look like it invites a press.
 */
export function BarList({ rows }) {
  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const tone = TONE_CLASSES[row.tone ?? 'success']
        const Row = row.onClick ? 'button' : 'div'
        const pressable = row.onClick
          ? {
              type: 'button',
              onClick: row.onClick,
              'aria-label': `${row.label} — ${row.value}, see the detail`,
              className:
                'w-full rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-mint-pale/60 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
            }
          : {}
        return (
          <li key={row.id}>
            <Row {...pressable}>
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
            </Row>
          </li>
        )
      })}
    </ul>
  )
}

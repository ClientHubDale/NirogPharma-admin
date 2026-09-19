import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import { ENTRY_STYLE } from '../entryStyle'

/** Round marker for one timeline entry (check-in, visit, order…). Grows when active. */
export function TrackMarker({ entry, active, onClick }) {
  const style = ENTRY_STYLE[entry.type] ?? ENTRY_STYLE.visit
  const Icon = style.icon
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      title={`${entry.title} · ${formatClock(entry.at)}`}
      aria-label={`${style.label}: ${entry.title} at ${formatClock(entry.at)}`}
      aria-pressed={active}
      className={cn(
        'grid place-items-center rounded-full border-2 border-white shadow-lift transition-transform',
        style.tile,
        active ? 'size-10 scale-110 ring-4 ring-green-fresh/50' : 'size-7',
      )}
    >
      <Icon className={active ? 'size-4' : 'size-3.5'} />
    </button>
  )
}

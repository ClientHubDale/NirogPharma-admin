import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import { ENTRY_STYLE } from '../entryStyle'

/**
 * Day timeline, newest first. Clicking an entry focuses it on the map.
 * entries come oldest-first from the API and are reversed here.
 */
export function TrackTimeline({ entries, activeId, onSelect }) {
  const newestFirst = [...entries].reverse()
  return (
    <ol className="relative">
      <span aria-hidden className="absolute top-5 bottom-5 left-[1.35rem] w-px bg-mint-pale" />
      {newestFirst.map((entry) => {
        const style = ENTRY_STYLE[entry.type] ?? ENTRY_STYLE.visit
        const Icon = style.icon
        const active = entry.id === activeId
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onSelect(active ? null : entry.id)}
              aria-pressed={active}
              className={cn(
                'relative flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors',
                active ? 'bg-mint-pale' : 'hover:bg-bg',
              )}
            >
              <span className={cn('relative grid size-7 shrink-0 place-items-center rounded-full border border-mint-pale ring-4 ring-white', style.tile)}>
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <span className="block truncate text-sm font-bold text-black">{entry.title}</span>
                {entry.subtitle && <span className="block truncate text-xs text-ink-muted">{entry.subtitle}</span>}
              </span>
              <span className="shrink-0 pt-0.5 font-mono text-xs text-ink-muted">{formatClock(entry.at)}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

import { CircleCheck, CircleX, Radio, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LIVE_WINDOW_MINUTES } from '@/constants/maps'

const ITEMS = [
  { key: 'live', label: 'Live', hint: `last ${LIVE_WINDOW_MINUTES} mins`, icon: Radio, iconClass: 'text-green-fresh' },
  { key: 'active', label: 'Active', hint: 'checked in today', icon: CircleCheck, iconClass: 'text-green-deep' },
  { key: 'offline', label: 'Offline', hint: 'not checked in', icon: CircleX, iconClass: 'text-ink-muted' },
  { key: 'all', label: 'All', hint: 'field staff', icon: UsersRound, iconClass: 'text-forest' },
]

/** Four counters that double as filters (Live / Active / Offline / All). */
export function StatusFilterBar({ counts, value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Filter by status" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ITEMS.map(({ key, label, hint, icon: Icon, iconClass }) => {
        const selected = value === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
              selected ? 'border-black bg-black text-white' : 'border-mint-pale bg-white hover:border-mint',
            )}
          >
            <Icon className={cn('size-5 shrink-0', selected ? 'text-green-fresh' : iconClass)} />
            <span className="font-mono text-2xl font-medium tabular-nums">{counts[key]}</span>
            <span className="ml-auto text-right leading-tight">
              <span className="block text-sm font-semibold">{label}</span>
              <span className={cn('block text-[0.7rem]', selected ? 'text-white/65' : 'text-ink-muted')}>{hint}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

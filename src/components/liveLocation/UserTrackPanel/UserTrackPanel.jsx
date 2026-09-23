import { useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3, Gauge, Store } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/format'
import { LIVE_STATUS_STYLE, liveStatusOf } from '@/lib/liveStatus'
import { ROLE_LABELS } from '@/constants/roles'
import { todayISO } from '@/mocks/userTracks'
import { UserSalesList } from '@/components/liveLocation/UserSalesList'
import { Tabs } from '@/components/common/Tabs'
import { TrackTimeline } from './TrackTimeline'

/**
 * Replaces the Users panel when a user is opened from the list:
 * name + back, distance/time totals, a date picker and the day's timeline.
 */
export function UserTrackPanel({ user, track, sales, date, onDateChange, activeEntryId, onEntrySelect, onBack, className }) {
  const [tab, setTab] = useState('timeline')
  const style = LIVE_STATUS_STYLE[liveStatusOf(user)]
  const isToday = date === todayISO()
  const stats = [
    { icon: Gauge, value: `${track.distanceKm.toFixed(2)} km`, label: 'Total distance' },
    { icon: Clock3, value: formatDuration(track.durationMinutes), label: 'Total time' },
    { icon: Store, value: track.visits, label: 'Visits' },
  ]

  return (
    <aside className={cn('flex min-h-0 flex-col overflow-hidden rounded-2xl border border-mint-pale bg-white', className)}>
      <header className="flex items-center gap-3 bg-black px-4 py-3.5 text-white">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to users"
          className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </button>
        <UserAvatar name={user.name} className={cn('size-9 text-xs', style.avatar)} />
        <div className="min-w-0">
          <p className="truncate font-bold uppercase">{user.name}</p>
          <p className="truncate text-xs text-white/65">
            {ROLE_LABELS[user.role]} · {style.label}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-3 divide-x divide-mint-pale border-b border-mint-pale">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="px-2 py-4 text-center">
            <Icon className="mx-auto size-5 text-green-deep" />
            <p className="mt-1.5 font-mono text-base font-medium text-black">{value}</p>
            <p className="text-[0.7rem] text-ink-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <h3 className="text-sm font-bold">{tab === 'timeline' ? 'Entries timeline' : 'Secondary sales'}</h3>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-mint px-2.5 focus-within:border-green-fresh focus-within:ring-3 focus-within:ring-ring/25">
          <CalendarDays className="size-4 text-green-deep" aria-hidden />
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            aria-label="Timeline date"
            className="bg-transparent font-mono text-xs text-ink outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="px-2 [&_[role=tablist]]:px-2"
          tabs={[
            {
              value: 'timeline',
              label: 'Timeline',
              content: track.entries.length ? (
                <TrackTimeline entries={track.entries} activeId={activeEntryId} onSelect={onEntrySelect} />
              ) : (
                <p className="px-4 py-10 text-center text-sm text-ink-muted">
                  {isToday ? `${user.name} hasn’t checked in today.` : 'No activity on this day.'}
                </p>
              ),
            },
            {
              value: 'sales',
              label: `Secondary sales${sales.length ? ` (${sales.length})` : ''}`,
              content: (
                <UserSalesList
                  sales={sales}
                  emptyText={isToday ? `${user.name} hasn’t booked a sale today.` : 'No sales booked on this day.'}
                />
              ),
            },
          ]}
        />
      </div>
    </aside>
  )
}

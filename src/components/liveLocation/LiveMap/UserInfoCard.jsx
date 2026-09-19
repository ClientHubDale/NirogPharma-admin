import { BatteryMedium, Clock, MapPin, Route, ShoppingCart, Store, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/constants/roles'
import { lastSeenRelative, LIVE_STATUS_STYLE, liveStatusOf } from '@/lib/liveStatus'
import { getUserTrack } from '@/mocks/userTracks'

/** Details for the selected user — shown in the Google InfoWindow and in the preview map. */
export function UserInfoCard({ user, onClose, className }) {
  const status = liveStatusOf(user)
  const style = LIVE_STATUS_STYLE[status]
  const today = getUserTrack(user)
  const stats = [
    { icon: Route, label: 'Today', value: `${today.distanceKm.toFixed(1)} km` },
    { icon: Store, label: 'Visits', value: today.visits },
    { icon: ShoppingCart, label: 'Orders', value: today.orders },
  ]

  return (
    <div className={cn('w-72 rounded-xl bg-white p-4 text-left', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold text-black">{user.name}</p>
          <p className="text-xs text-ink-muted">
            {ROLE_LABELS[user.role]}
            {user.manager ? ` · reports to ${user.manager}` : ''}
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-muted hover:text-black">
            <X className="size-4" />
          </button>
        )}
      </div>

      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 text-xs font-semibold text-ink">
        <span className={cn('size-2 rounded-full', style.dot)} />
        {style.label}
      </span>

      <div className="mt-3 space-y-1.5 text-sm text-ink">
        <p className="flex items-center gap-2">
          <MapPin className="size-3.5 shrink-0 text-green-deep" />
          {user.area ?? 'No location today'}
        </p>
        <p className="flex items-center gap-2">
          <Clock className="size-3.5 shrink-0 text-green-deep" />
          Last seen {lastSeenRelative(user)}
        </p>
        {user.battery !== null && (
          <p className={cn('flex items-center gap-2', user.battery < 20 && 'text-danger')}>
            <BatteryMedium className="size-3.5 shrink-0" />
            Battery {user.battery}%{user.battery < 20 ? ' — low' : ''}
          </p>
        )}
      </div>

      {status !== 'offline' && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-mint-pale pt-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <p className="flex items-center gap-1 text-[0.7rem] text-ink-muted">
                <Icon className="size-3" />
                {label}
              </p>
              <p className="font-mono text-sm font-medium text-black">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

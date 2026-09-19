import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { LIVE_STATUS_STYLE, liveStatusOf } from '@/lib/liveStatus'

/** Teardrop map pin with the user's initials; colour = status, bigger when selected. */
export function UserPin({ user, selected }) {
  const style = LIVE_STATUS_STYLE[liveStatusOf(user)]
  return (
    <span
      className={cn(
        'grid origin-bottom place-items-center rounded-full rounded-br-none border-2 border-white shadow-lift transition-transform rotate-45',
        style.pin,
        selected ? 'size-12 scale-110' : 'size-10',
      )}
    >
      <span className="-rotate-45 text-xs font-bold text-white">{initialsOf(user.name)}</span>
    </span>
  )
}

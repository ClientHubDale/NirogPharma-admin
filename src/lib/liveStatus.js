import { LIVE_WINDOW_MINUTES } from '@/constants/maps'

/**
 * Live Location status for one field user:
 *  - live:    checked in and pinged within the last LIVE_WINDOW_MINUTES
 *  - active:  checked in today, but no recent ping (phone idle, no signal…)
 *  - offline: not checked in / checked out
 * "Active" in the filter bar counts live + active (everyone working today).
 */
export function liveStatusOf(user) {
  if (!user.checkedIn) return 'offline'
  if (user.lastSeenMinutesAgo !== null && user.lastSeenMinutesAgo <= LIVE_WINDOW_MINUTES) return 'live'
  return 'active'
}

export const LIVE_FILTERS = ['live', 'active', 'offline', 'all']

export function matchesFilter(user, filter) {
  const status = liveStatusOf(user)
  if (filter === 'all') return true
  if (filter === 'active') return status === 'live' || status === 'active'
  return status === filter
}

/**
 * Pin/avatar colours per status. Status is always also written as text.
 * Live = green (all good), Active = amber (working but no ping in 30 min), Offline = grey.
 */
export const LIVE_STATUS_STYLE = {
  live: { label: 'Live', dot: 'bg-green-fresh', avatar: 'bg-green-deep text-white', pin: 'bg-green-deep' },
  active: { label: 'Active', dot: 'bg-warning', avatar: 'bg-warning-soft text-warning-ink', pin: 'bg-warning' },
  offline: { label: 'Offline', dot: 'bg-ink-muted/50', avatar: 'bg-mint-pale text-ink-muted', pin: 'bg-ink-muted' },
}

/** Clock time of the last ping, e.g. "17:33". */
export function lastSeenClock(user, now = new Date()) {
  if (user.lastSeenMinutesAgo === null) return null
  const seen = new Date(now.getTime() - user.lastSeenMinutesAgo * 60_000)
  return seen.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function lastSeenRelative(user) {
  const m = user.lastSeenMinutesAgo
  if (m === null) return 'Not checked in today'
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  return `${h} hr${h > 1 ? 's' : ''} ago`
}

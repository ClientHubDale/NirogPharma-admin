/** Where the field is, and where it has been. */
import api from './api'

const query = (params = {}) => ({
  params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)),
})

/**
 * Everyone the office watches, in the shape the Live Location screen reads:
 * `{ id, name, role, manager, area, lat, lng, lastSeenMinutesAgo, checkedIn,
 * battery }`, plus today's `distanceKm` / `visits` / `orders` for the pin's
 * popup card.
 *
 * `lat`, `lng` and `lastSeenMinutesAgo` come back as `null` for somebody who
 * has not pinged today, which is what `liveStatusOf` and `LiveMap` both test
 * for — so they are passed through untouched rather than defaulted.
 */
export async function live(params = {}) {
  const { data } = await api.get('/tracking/live', query(params))
  return data.data.users
}

/**
 * One person's day: the line on the map and the timeline beside it.
 *
 * JSON has no date type, so the API sends instants as ISO strings and they
 * are turned back into `Date` objects here. The screen needs them that way
 * and says so plainly — `formatClock` calls `toLocaleTimeString` on them, and
 * the map fits its bounds with `data.checkedInAt?.getTime()`. Reviving them at
 * the edge keeps that true without a single component changing.
 *
 * Every total is a number rather than null for the same reason: the panel
 * formats them without checking, as `track.distanceKm.toFixed(2)`.
 */
export async function track(userId, date) {
  const { data } = await api.get(`/tracking/${userId}`, query({ date }))
  const found = data.data
  const when = (value) => (value ? new Date(value) : null)
  return {
    ...found,
    points: (found.points ?? []).map((point) => ({ ...point, at: new Date(point.at) })),
    entries: (found.entries ?? []).map((entry) => ({ ...entry, at: new Date(entry.at) })),
    checkedInAt: when(found.checkedInAt),
    checkedOutAt: when(found.checkedOutAt),
    distanceKm: Number(found.distanceKm) || 0,
    durationMinutes: Number(found.durationMinutes) || 0,
    visits: Number(found.visits) || 0,
    orders: Number(found.orders) || 0,
  }
}

/** The field app reports its own position; here for completeness. */
export async function ping(body = {}) {
  const { data } = await api.post('/tracking/ping', body)
  return data.data
}

/** A day with nothing in it, shaped so the panel can render while it loads. */
export const emptyTrack = (userId = '', date = '') => ({
  userId,
  date,
  points: [],
  entries: [],
  checkedInAt: null,
  checkedOutAt: null,
  distanceKm: 0,
  durationMinutes: 0,
  visits: 0,
  orders: 0,
})

export { errorFrom } from './usersService'

export default { live, track, ping, emptyTrack }

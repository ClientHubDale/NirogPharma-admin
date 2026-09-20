/** Visit display rules — status, duration and the check-out location check. */
import { formatDistance, haversineKm } from '@/lib/geo'

/** Check-out further than this from the shop's saved location is flagged. */
export const ON_SITE_METRES = 100

export const visitStatus = (v) => (v.outAt ? 'COMPLETED' : 'PENDING')

const toMins = (hm) => {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}

export function durationLabel(v) {
  if (!v.outAt) return null
  const m = Math.max(0, toMins(v.outAt) - toMins(v.inAt))
  return m < 60 ? `${m} min${m === 1 ? '' : 's'}` : `${Math.floor(m / 60)}h ${m % 60}m`
}

/**
 * Where the executive checked out, relative to the shop.
 * → { state: 'on-site' | 'far' | 'no-shop-location' | 'none', label, km? }
 */
export function checkoutPlace(v, party) {
  if (v.outLat === null || v.outLat === undefined) return { state: 'none', label: 'No check-out location' }
  if (!party || party.lat === null) return { state: 'no-shop-location', label: 'Shop location not saved' }
  const km = haversineKm({ lat: v.outLat, lng: v.outLng }, party)
  const label = `${formatDistance(km)} from shop`
  return { state: km * 1000 <= ON_SITE_METRES ? 'on-site' : 'far', label, km }
}

/** "2026-09-19" → "19-09-2026" (as in the reference) */
export const dmy = (iso) => iso.split('-').reverse().join('-')

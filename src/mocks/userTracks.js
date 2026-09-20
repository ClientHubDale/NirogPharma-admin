/**
 * MOCK DATA (UI phase) — one field user's day: GPS route + activity timeline.
 * Backend replacement: GET /tracking/:userId?date=YYYY-MM-DD → same shape:
 *
 *   {
 *     points:  [{ lat, lng, at }],         // GPS pings, oldest first (at = Date)
 *     entries: [{ id, type, title, subtitle, at, lat, lng }], // oldest first
 *     checkedInAt, checkedOutAt,            // Date | null
 *     distanceKm, durationMinutes, visits, orders,
 *   }
 *
 * Generated deterministically from (user, date), so the same day always
 * looks the same while clicking around.
 */
import { DEFAULT_MAP_CENTER } from '@/constants/maps'
import { haversineKm } from '@/lib/geo'

const PARTY_NAMES = [
  'Shree Medicals', 'City Chemist', 'Om Medical Store', 'Jain Pharmacy', 'Shivjivan Medical Store',
  'Sushil Medical Store', 'Dr. Narendra Singh Clinic', 'Gupta Pharma', 'Saraf Medico', 'Krishna Medical',
  'Arogya Medical Hall', 'New Life Chemist', 'Sai Kripa Medicos', 'Balaji Drug House', 'Mahakal Medical',
]

/** Visit outcomes and how often they happen. */
const VISIT_KINDS = [
  { type: 'visit', weight: 4, subtitle: () => 'Party visited' },
  { type: 'order', weight: 4, subtitle: (amount) => `Order booked · ₹${amount.toLocaleString('en-IN')}` },
  { type: 'payment', weight: 2, subtitle: (amount) => `Payment collected · ₹${amount.toLocaleString('en-IN')}` },
  { type: 'party_added', weight: 1, subtitle: () => 'New party added · 3 photos' },
  { type: 'party_updated', weight: 1, subtitle: () => 'Party updated' },
]

/* ── small deterministic helpers ─────────────────────────────── */

function hashString(value) {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619)
  return h >>> 0
}

function seededRandom(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const between = (rand, min, max) => min + rand() * (max - min)

function pickWeighted(rand, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = rand() * total
  return items.find((item) => (roll -= item.weight) < 0) ?? items[0]
}

/* ── dates ───────────────────────────────────────────────────── */

export function todayISO(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function atTime(dateISO, minutesFromMidnight) {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(y, m - 1, d, 0, Math.round(minutesFromMidnight))
}

/* ── generator ───────────────────────────────────────────────── */

const EMPTY = Object.freeze({
  points: [],
  entries: [],
  checkedInAt: null,
  checkedOutAt: null,
  distanceKm: 0,
  durationMinutes: 0,
  visits: 0,
  orders: 0,
})

function buildTrack(user, dateISO, now) {
  const isToday = dateISO === todayISO(now)
  if (dateISO > todayISO(now)) return EMPTY
  if (isToday && !user.checkedIn) return EMPTY

  const rand = seededRandom(hashString(`${user.id}|${dateISO}`))

  // Past days: Sundays off, and ~1 in 8 days not worked.
  if (!isToday) {
    const [y, m, d] = dateISO.split('-').map(Number)
    if (new Date(y, m - 1, d).getDay() === 0 || rand() < 0.12) return EMPTY
  }

  // Where the day ends: today = the user's live position; past days = near their usual area.
  const home = user.lat !== null ? { lat: user.lat, lng: user.lng } : DEFAULT_MAP_CENTER
  const end = isToday
    ? { ...home }
    : { lat: home.lat + between(rand, -0.04, 0.04), lng: home.lng + between(rand, -0.04, 0.04) }

  // Day starts 12–30 km away in a random direction.
  const angle = rand() * Math.PI * 2
  const reach = between(rand, 0.11, 0.27)
  const start = { lat: end.lat + Math.sin(angle) * reach, lng: end.lng + Math.cos(angle) * reach }

  // Visit stops spread along a gently curving path between start and end.
  const visitCount = 3 + Math.floor(rand() * 4)
  const bend = between(rand, -0.35, 0.35)
  const perp = { lat: -(end.lng - start.lng), lng: end.lat - start.lat }
  const stops = [start]
  for (let i = 1; i <= visitCount; i++) {
    const t = i / (visitCount + 1)
    const curve = Math.sin(t * Math.PI) * bend
    stops.push({
      lat: start.lat + (end.lat - start.lat) * t + perp.lat * curve + between(rand, -0.012, 0.012),
      lng: start.lng + (end.lng - start.lng) * t + perp.lng * curve + between(rand, -0.012, 0.012),
    })
  }
  stops.push(end)

  // Road-like wiggle between stops.
  const path = [start]
  const stopIndexes = [0]
  for (let s = 1; s < stops.length; s++) {
    const a = stops[s - 1]
    const b = stops[s]
    const steps = 5 + Math.floor(rand() * 4)
    for (let k = 1; k <= steps; k++) {
      const t = k / steps
      const jitter = k === steps ? 0 : 0.0035
      path.push({
        lat: a.lat + (b.lat - a.lat) * t + between(rand, -jitter, jitter),
        lng: a.lng + (b.lng - a.lng) * t + between(rand, -jitter, jitter),
      })
    }
    stopIndexes.push(path.length - 1)
  }

  // Distance along the path, then timestamps proportional to it.
  const cumulative = [0]
  for (let i = 1; i < path.length; i++) cumulative.push(cumulative[i - 1] + haversineKm(path[i - 1], path[i]))
  const distanceKm = cumulative[cumulative.length - 1]

  let startMin
  let endMin
  if (isToday) {
    const lastPing = new Date(now.getTime() - (user.lastSeenMinutesAgo ?? 0) * 60_000)
    endMin = lastPing.getHours() * 60 + lastPing.getMinutes()
    // Day ends at the last ping and never runs past "now". (Mock is relative to
    // the real clock, so testing at night gives a short, early-morning day.)
    startMin = Math.max(0, endMin - between(rand, 180, 420))
  } else {
    startMin = between(rand, 9 * 60, 10 * 60 + 15)
    endMin = between(rand, 17 * 60 + 30, 19 * 60 + 30)
  }
  const timeAt = (i) => atTime(dateISO, startMin + ((endMin - startMin) * cumulative[i]) / (distanceKm || 1))

  const points = path.map((p, i) => ({ ...p, at: timeAt(i) }))

  // Timeline entries.
  const entries = [
    {
      id: 'check-in',
      type: 'check_in',
      title: 'User checked in',
      subtitle: 'Selfie verified',
      at: points[0].at,
      lat: start.lat,
      lng: start.lng,
    },
  ]
  const partyOffset = Math.floor(rand() * PARTY_NAMES.length)
  let orders = 0
  for (let v = 1; v <= visitCount; v++) {
    const kind = pickWeighted(rand, VISIT_KINDS)
    const amount = Math.round(between(rand, 1500, 28000) / 10) * 10
    if (kind.type === 'order') orders++
    const i = stopIndexes[v]
    entries.push({
      id: `visit-${v}`,
      type: kind.type,
      title: PARTY_NAMES[(partyOffset + v * 3) % PARTY_NAMES.length],
      subtitle: kind.subtitle(amount),
      at: points[i].at,
      lat: points[i].lat,
      lng: points[i].lng,
    })
  }
  const last = points[points.length - 1]
  entries.push(
    isToday
      ? { id: 'last-ping', type: 'live', title: 'Last known location', subtitle: user.area ?? '', at: last.at, lat: last.lat, lng: last.lng }
      : { id: 'check-out', type: 'check_out', title: 'User checked out', subtitle: 'Day ended', at: last.at, lat: last.lat, lng: last.lng },
  )

  return {
    points,
    entries,
    checkedInAt: points[0].at,
    checkedOutAt: isToday ? null : last.at,
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMinutes: Math.round(endMin - startMin),
    visits: visitCount,
    orders,
  }
}

const cache = new Map()

/** The user's route + timeline for a date (YYYY-MM-DD). Cached per user/date. */
export function getUserTrack(user, dateISO = todayISO()) {
  const key = `${user.id}|${dateISO}|${user.lastSeenMinutesAgo}`
  if (!cache.has(key)) cache.set(key, buildTrack(user, dateISO, new Date()))
  return cache.get(key)
}

/**
 * MOCK DATA (UI phase) — daily attendance per field user, as the mobile app
 * would record it: check in / out with a location, odometer and photos.
 * Backend replacement: GET /attendance?from=&to= → same shape.
 */
import { fieldStaff } from './liveLocation'

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hhmm = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`

/** Stand-in check-in selfie (SVG) until real uploads exist. */
function photo(name, n) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="#DDF5E8"/>
  <circle cx="400" cy="380" r="150" fill="#B6EBCF"/>
  <rect x="220" y="580" width="360" height="260" rx="130" fill="#B6EBCF"/>
  <text x="400" y="910" font-family="sans-serif" font-size="34" text-anchor="middle" fill="#0B3D2E">${name} — photo ${n}</text>
  <text x="400" y="960" font-family="sans-serif" font-size="24" text-anchor="middle" fill="#0B3D2E" opacity="0.6">Sample image — real photos come from the field app</text>
</svg>`
  return { id: `${name}-${n}`, name: `check-in-${n}.jpg`, url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }
}

const AREAS = ['Lawad, Meerut', 'Sadar Bazaar', 'Khatauli', 'Saharanpur', 'Muzaffarnagar', 'Shamli', 'Bijnore', 'Amroha', 'Sahibabad', '']

function build(now = new Date()) {
  let seed = 90210
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const records = []
  const today = iso(now)

  for (let back = 89; back >= 0; back--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
    const date = iso(day)
    const sunday = day.getDay() === 0
    for (const user of fieldStaff) {
      // Sundays are mostly off; weekdays are mostly worked.
      if (rand() > (sunday ? 0.12 : 0.86)) continue
      const inMin = 7 * 60 + 20 + Math.floor(rand() * 200) // 07:20 – 10:40
      const worked = 7 * 60 + Math.floor(rand() * 8 * 60) // 7 – 15 hours
      const open = back > 0 || rand() < 0.5 // today some are still out in the field
      const outMin = Math.min(23 * 60 + 30, inMin + worked)
      const odoIn = 12000 + Math.floor(rand() * 40000)
      const shots = Math.floor(rand() * 3)
      records.push({
        id: `att-${user.id}-${date}`,
        userId: user.id,
        date,
        inAt: hhmm(inMin),
        inLat: user.lat ?? 28.9845,
        inLng: user.lng ?? 77.7064,
        outAt: open ? hhmm(outMin) : null,
        outLat: open ? (user.lat ?? 28.9845) + 0.02 : null,
        outLng: open ? (user.lng ?? 77.7064) + 0.02 : null,
        odoIn: rand() < 0.35 ? odoIn : null,
        odoOut: rand() < 0.3 && open ? odoIn + 20 + Math.floor(rand() * 90) : null,
        distanceKm: open ? Math.round((8 + rand() * 60) * 10) / 10 : null,
        images: Array.from({ length: shots }, (_, i) => photo(user.name.split(' ')[0], i + 1)),
        comment: AREAS[Math.floor(rand() * AREAS.length)],
      })
    }
  }
  // Today looks like the reference: one person checked in so far.
  const todays = records.filter((r) => r.date === today)
  todays.slice(1).forEach((r) => records.splice(records.indexOf(r), 1))
  return records
}

export const INITIAL_ATTENDANCE = build()
export const DEFAULT_OFFICE_TIME = { start: '08:00', end: '23:00' }

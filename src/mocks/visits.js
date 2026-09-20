/**
 * MOCK DATA (UI phase) — party visits logged by the field app.
 * Backend replacement: GET /visits?from&to&routeId&userId&status → same shape:
 *   { id, partyId, userId, date: 'YYYY-MM-DD', inAt: 'HH:mm', outAt: 'HH:mm'|null,
 *     outLat, outLng, comment, images: [{ id, url, caption }] }
 * Generated relative to today so the "Today / This week" filters always have data.
 */
import { cssColor } from '@/lib/theme'
import { INITIAL_CUSTOMERS } from './customers'
import { INITIAL_CITIES, INITIAL_ROUTES } from './geography'
import { fieldStaff } from './liveLocation'

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COMMENTS = ['', '', '', 'Stock Available', 'Shop Closed', 'Order booked', 'Payment collected', 'Owner not available', 'Will order next week', 'Scheme explained', 'Asked for new price list']

/** Stand-in "shop photo" (SVG) in brand colours until real uploads exist. */
function photo(label, n) {
  const bg = cssColor('--mint-pale') || 'white'
  const fg = cssColor('--forest') || 'black'
  const accent = cssColor('--green-soft') || 'gray'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <rect width="900" height="1200" fill="${bg}"/>
  <rect x="120" y="260" width="660" height="520" rx="24" fill="${accent}"/>
  <rect x="120" y="200" width="660" height="110" rx="20" fill="${fg}"/>
  <rect x="200" y="420" width="220" height="360" fill="${bg}"/><rect x="480" y="420" width="220" height="200" fill="${bg}"/>
  <text x="450" y="272" font-family="sans-serif" font-size="46" font-weight="700" text-anchor="middle" fill="${bg}">${label.replace(/&/g, 'and').slice(0, 26).toUpperCase()}</text>
  <text x="450" y="900" font-family="sans-serif" font-size="40" text-anchor="middle" fill="${fg}">Shop photo ${n}</text>
  <text x="450" y="960" font-family="sans-serif" font-size="28" text-anchor="middle" fill="${fg}" opacity="0.6">Sample image — real photos come from the field app</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hm = (mins) => `${pad(Math.floor(mins / 60))}:${pad(Math.floor(mins % 60))}`

function build(now = new Date()) {
  const rand = rng(424242)
  const staff = fieldStaff.filter((u) => u.role === 'EXECUTIVE' || u.role === 'MANAGER')
  const parties = INITIAL_CUSTOMERS.filter((c) => c.status === 'ACTIVE')
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const visits = []
  let seq = 1

  for (let back = 0; back < 45; back++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
    if (day.getDay() === 0) continue // Sunday off
    const count = 10 + Math.floor(rand() * 12)
    for (let k = 0; k < count; k++) {
      const party = parties[Math.floor(rand() * parties.length)]
      const user = staff[Math.floor(rand() * staff.length)]
      const inMins = 9 * 60 + 30 + Math.floor(rand() * 570)
      if (back === 0 && inMins > nowMins) continue // no visits in the future
      const quick = rand() < 0.3
      let outMins = inMins + (quick ? 0 : 2 + Math.floor(rand() * 38))
      const pending = (back === 0 && rand() < 0.15) || rand() < 0.01
      if (back === 0 && outMins > nowMins) outMins = nowMins
      // Checked out at the shop (within ~60 m) most of the time; sometimes far away.
      const far = rand() < 0.14
      const spread = far ? 0.004 + rand() * 0.02 : rand() * 0.0005
      const angle = rand() * Math.PI * 2
      // Phones always send a check-out point; shops without a saved location
      // fall back to their city so the office sees roughly where it happened.
      const base = party.lat !== null ? party : INITIAL_CITIES.find((c) => c.id === INITIAL_ROUTES.find((r) => r.id === party.routeId)?.cityId)
      const photos = rand() < 0.33 ? 1 + Math.floor(rand() * 3) : 0
      visits.push({
        id: `vis-${seq++}`,
        partyId: party.id,
        userId: user.id,
        date: iso(day),
        inAt: hm(inMins),
        outAt: pending ? null : hm(outMins),
        outLat: pending || !base ? null : +(base.lat + Math.sin(angle) * spread).toFixed(6),
        outLng: pending || !base ? null : +(base.lng + Math.cos(angle) * spread).toFixed(6),
        comment: COMMENTS[Math.floor(rand() * COMMENTS.length)],
        images: Array.from({ length: photos }, (_, i) => ({ id: `vis-${seq}-img-${i}`, url: photo(party.name, i + 1), caption: `${party.name} · photo ${i + 1}` })),
      })
    }
  }
  return visits.sort((a, b) => (a.date === b.date ? b.inAt.localeCompare(a.inAt) : b.date.localeCompare(a.date)))
}

export const INITIAL_VISITS = build()

export const VISIT_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
]

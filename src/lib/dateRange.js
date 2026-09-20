/**
 * Date-range presets for list filters (Visited, Attendance, Sales, Reports…).
 * Weeks start on Monday. All dates are local YYYY-MM-DD strings.
 */
const pad = (n) => String(n).padStart(2, '0')
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
]

/** Preset → { start, end } (inclusive). */
export function presetRange(preset, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  switch (preset) {
    case 'yesterday':
      return { start: toISO(addDays(today, -1)), end: toISO(addDays(today, -1)) }
    case 'thisWeek':
      return { start: toISO(monday), end: toISO(today) }
    case 'lastWeek':
      return { start: toISO(addDays(monday, -7)), end: toISO(addDays(monday, -1)) }
    case 'thisMonth':
      return { start: toISO(new Date(today.getFullYear(), today.getMonth(), 1)), end: toISO(today) }
    case 'lastMonth':
      return {
        start: toISO(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        end: toISO(new Date(today.getFullYear(), today.getMonth(), 0)),
      }
    default:
      return { start: toISO(today), end: toISO(today) }
  }
}

/** "2026-09-19" → "19/09/2026" */
export const toDMY = (iso) => iso.split('-').reverse().join('/')

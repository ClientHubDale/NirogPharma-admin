/** Number/date formatting in Indian conventions. Components format; data stays raw. */

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** 137513 → "₹1,37,513" */
export const formatINR = (amount) => `₹${inr.format(Math.round(amount))}`

/** Compact rupees: 4280000 → "₹42.8L", 12500000 → "₹1.25Cr", 92000 → "₹92,000" */
export function formatINRCompact(amount) {
  if (amount >= 1e7) return `₹${trim(amount / 1e7, 2)}Cr`
  if (amount >= 1e5) return `₹${trim(amount / 1e5, amount >= 1e6 ? 1 : 2)}L`
  return formatINR(amount)
}

const trim = (value, digits) => Number(value.toFixed(digits)).toString()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-07-24" → "24-Jul-26" (the format used on Indian invoices) */
export function formatShortDate(iso) {
  const [year, month, day] = iso.split('-')
  return `${day}-${MONTHS[Number(month) - 1]}-${year.slice(2)}`
}

/** 1 → "1 day ago", 0 → "today" */
export const formatDaysAgo = (days) => (days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`)

/** "Ashwani Kumar Shukla" → "AK" */
export const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

/** Date → "16:04" (24-hour, as on field reports). */
export const formatClock = (date) =>
  date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

/** 233 → "3h 53m", 45 → "45m" */
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 24.5 → "₹24.50" (prices on item lists and bills) */
export const formatPrice = (amount) => `₹${inr2.format(amount)}`

/** "2026-09-19" → "19 Sep 2026" */
export function formatDisplayDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}

/**
 * Monthly staff payout: salary + TA/DA + incentive, worked out from the
 * attendance, sales and office settings the app already holds.
 *
 * Nothing is stored except what the admin changes — the figures are always
 * recalculated, so a payout can never drift away from the data behind it.
 */
import { docTotals } from '@/components/Transactions/transactionModel'

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100
const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export const PAYOUT_STATUSES = [
  { value: 'DRAFT', label: 'Draft', tone: 'warning', action: 'Move to draft' },
  { value: 'APPROVED', label: 'Approved', tone: 'info', action: 'Approve' },
  { value: 'PAID', label: 'Paid', tone: 'success', action: 'Mark paid' },
]
export const PAYOUT_STATUS = Object.fromEntries(PAYOUT_STATUSES.map((s) => [s.value, s]))
export const PAID_MODES = [
  { value: 'BANK', label: 'Bank transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'UPI', label: 'UPI' },
]

/** The lines an admin can correct, in the order they appear on the bill. */
export const PAYOUT_LINES = [
  { key: 'salary', label: 'Salary' },
  { key: 'ta', label: 'Travel allowance (TA)' },
  { key: 'da', label: 'Daily allowance (DA)' },
  { key: 'incentive', label: 'Incentive on sales' },
]

/** Days the office works in a month, minus its holidays. */
export function workingDaysIn(month, office) {
  const [year, m] = month.split('-').map(Number)
  const holidays = new Set((office.holidays ?? []).map((h) => h.date))
  const days = new Date(year, m, 0).getDate()
  let count = 0
  for (let day = 1; day <= days; day++) {
    const date = new Date(year, m - 1, day)
    const iso = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (office.workingDays.includes(DAY_KEYS[date.getDay()]) && !holidays.has(iso)) count++
  }
  return count
}

/** Kilometres travelled on a day — the odometer when it was filled in, else the track. */
export const dayDistance = (record) =>
  record.odoIn != null && record.odoOut != null ? Math.max(0, record.odoOut - record.odoIn) : (record.distanceKm ?? 0)

/**
 * What the system says this user should be paid for the month.
 * Returns the figures plus the counts they came from, so the editor can show
 * "₹18,000 × 22 / 26 days".
 */
export function calculatePayout({ user, month, attendance, office, sales, parties }) {
  const days = attendance.filter((record) => record.userId === user.id && record.date.startsWith(month))
  const presentDays = days.length
  const workingDays = workingDaysIn(month, office)
  const distanceKm = r2(days.reduce((sum, record) => sum + dayDistance(record), 0))

  // Secondary sales: what this user sold that month, the same rule Live Location uses.
  const soldValue = r2(
    sales
      .filter((doc) => doc.createdBy === user.id && doc.date.startsWith(month) && !['CANCELLED', 'REJECTED'].includes(doc.status))
      .reduce((sum, doc) => sum + docTotals(doc, parties[doc.partyId]).total, 0),
  )

  const salary = workingDays ? r2((Number(user.salary) || 0) * (presentDays / workingDays)) : 0
  return {
    presentDays,
    workingDays,
    distanceKm,
    soldValue,
    salary,
    ta: r2(distanceKm * (Number(user.taPerKm) || 0)),
    da: r2(presentDays * (Number(user.daPerDay) || 0)),
    incentive: r2((soldValue * (Number(user.incentivePercent) || 0)) / 100),
  }
}

/** The figure actually paid for a line: the admin's correction, else the calculation. */
export const lineValue = (calculated, overrides, key) => (overrides?.[key] != null ? r2(overrides[key]) : calculated[key])
export const isEdited = (calculated, overrides, key) => overrides?.[key] != null && r2(overrides[key]) !== calculated[key]

/** Bill totals: the four lines, the admin's bonuses and deductions, and the net. */
export function payoutTotals(calculated, payout) {
  const overrides = payout?.overrides ?? {}
  const lines = Object.fromEntries(PAYOUT_LINES.map(({ key }) => [key, lineValue(calculated, overrides, key)]))
  const adjustments = payout?.adjustments ?? []
  const bonuses = r2(adjustments.filter((a) => a.kind === 'BONUS').reduce((sum, a) => sum + (Number(a.amount) || 0), 0))
  const deductions = r2(adjustments.filter((a) => a.kind === 'DEDUCTION').reduce((sum, a) => sum + (Number(a.amount) || 0), 0))
  const earned = r2(lines.salary + lines.ta + lines.da + lines.incentive)
  return { ...lines, bonuses, deductions, earned, net: Math.max(0, Math.round(earned + bonuses - deductions)) }
}

/** True when the admin has corrected any line of this bill. */
export const hasEdits = (calculated, payout) => PAYOUT_LINES.some(({ key }) => isEdited(calculated, payout?.overrides, key))

export const emptyPayout = (userId, month) => ({
  id: `${userId}:${month}`,
  userId,
  month,
  status: 'DRAFT',
  overrides: {},
  adjustments: [],
  reason: '',
  paidOn: '',
  paidVia: '',
})

/** Returns { field: message } — empty = valid. */
export function validatePayout(draft, { calculated }) {
  const e = {}
  for (const { key, label } of PAYOUT_LINES) {
    const value = draft.overrides?.[key]
    if (value == null || value === '') continue
    if (!(Number(value) >= 0)) e[key] = `${label} cannot be negative.`
  }
  draft.adjustments.forEach((adjustment, i) => {
    if (!adjustment.label.trim() && !adjustment.amount) return // blank row, dropped on save
    if (!adjustment.label.trim()) e[`adj-${i}`] = 'Give this adjustment a name.'
    else if (!(Number(adjustment.amount) > 0)) e[`adj-${i}`] = 'Enter an amount above 0.'
  })
  // A correction has to say why — the client asks later why a payout differs.
  if (hasEdits(calculated, draft) && !draft.reason.trim()) e.reason = 'Say why the calculated figures were changed.'
  if (draft.status === 'PAID' && !draft.paidOn) e.paidOn = 'Choose the date it was paid.'
  return e
}

/** Blank rows are dropped when the bill is saved. */
export const cleanAdjustments = (adjustments) =>
  adjustments.filter((a) => a.label.trim() && Number(a.amount) > 0).map((a) => ({ ...a, label: a.label.trim(), amount: r2(a.amount) }))

export const monthLabel = (month) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

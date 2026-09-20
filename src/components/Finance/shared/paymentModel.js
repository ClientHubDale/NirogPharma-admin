/**
 * Payment maths and rules. A payment settles one or more bills
 * (allocations), plus an "other payment" on account, less a discount.
 */
import { financialYear } from '@/components/Transactions/transactionModel'
import { formatPrice } from '@/lib/format'

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

/** Payment amount = bills settled + other payment − discount. */
export function paymentTotals(payment) {
  const allocated = r2((payment.allocations ?? []).reduce((s, a) => s + (Number(a.amount) || 0), 0))
  const other = r2(payment.otherPayment)
  const discount = r2(payment.discount)
  return { allocated, other, discount, amount: r2(allocated + other - discount) }
}

/** Next number in the FY series: PIN/26-27/0007 */
export function nextPaymentNumber(payments, prefix, isoDate) {
  const series = `${prefix}/${financialYear(isoDate)}/`
  const max = payments
    .filter((p) => p.number?.startsWith(series))
    .reduce((m, p) => Math.max(m, Number(p.number.slice(series.length)) || 0), 0)
  return `${series}${String(max + 1).padStart(4, '0')}`
}

/** Outstanding on a bill, ignoring what this payment itself already settled. */
export const billDue = (bill, total, ownAllocation = 0) => r2(total - (bill.received ?? 0) + ownAllocation)

/** Returns { field: message, allocations: { [docId]: message } } — empty = valid. */
export function validatePayment(payment, { party, payments, editingId, dues }) {
  const e = {}
  if (!party) e.partyId = 'Choose who this payment is with.'
  if (!payment.date) e.date = 'Choose a date.'
  if (!payment.number?.trim()) e.number = 'Enter a payment number.'
  else if (payments.some((p) => p.id !== editingId && p.number.trim().toLowerCase() === payment.number.trim().toLowerCase()))
    e.number = 'This payment number is already used.'
  if (!payment.collectedBy) e.collectedBy = 'Choose who collected it.'

  const allocationErrors = {}
  for (const a of payment.allocations ?? []) {
    const amount = Number(a.amount) || 0
    if (amount < 0) allocationErrors[a.docId] = 'Cannot be negative'
    else if (amount > (dues[a.docId] ?? 0) + 0.01) allocationErrors[a.docId] = `Only ${formatPrice(dues[a.docId] ?? 0)} due`
  }
  if (Object.keys(allocationErrors).length) e.allocations = allocationErrors

  const { amount } = paymentTotals(payment)
  if (amount <= 0) e.amount = 'Enter an amount, or settle at least one bill.'
  if (payment.method === 'CHEQUE' && !payment.reference?.trim()) e.reference = 'Enter the cheque number.'
  return e
}

/** Blank payment for the create drawer. */
export const emptyPayment = ({ type, number, partyType }) => ({
  type,
  number,
  date: new Date().toISOString().slice(0, 10),
  partyType,
  partyId: '',
  collectedBy: 'admin',
  method: 'CASH',
  reference: '',
  comment: '',
  documents: [],
  allocations: [],
  otherPayment: '',
  discount: '',
  status: 'PENDING',
})

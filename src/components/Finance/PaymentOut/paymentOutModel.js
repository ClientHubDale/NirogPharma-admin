/**
 * Finance › Payment Out — the form shape and its rules.
 *
 * Money going out is simpler than money coming in, and for one reason: there
 * is no purchase module, so there are no supplier bills to settle against. A
 * payment out is an amount, who it went to, and how — with the supplier's own
 * bill number carried as plain text where it helps.
 */

export const PAYMENT_OUT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'COUPON', label: 'Coupon' },
]

export const PAYMENT_OUT_STATUSES = [
  { value: 'PENDING', label: 'Pending', tone: 'warning' },
  { value: 'APPROVED', label: 'Approved', tone: 'success' },
  { value: 'REJECTED', label: 'Rejected', tone: 'danger' },
]

export const METHOD_LABEL = Object.fromEntries(PAYMENT_OUT_METHODS.map((m) => [m.value, m.label]))
export const STATUS_LABEL = Object.fromEntries(PAYMENT_OUT_STATUSES.map((s) => [s.value, s.label]))
export const STATUS_TONE = Object.fromEntries(PAYMENT_OUT_STATUSES.map((s) => [s.value, s.tone]))

export const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const emptyPaymentOutForm = (defaults = {}) => ({
  number: '',
  supplierId: '',
  at: today(),
  method: 'CASH',
  reference: '',
  billRef: '',
  amount: '',
  chequeDate: '',
  comment: '',
  ...defaults,
})

export const paymentOutToForm = (payment) => ({
  ...emptyPaymentOutForm(),
  number: payment.number,
  supplierId: payment.supplierId,
  at: payment.at,
  method: payment.method,
  reference: payment.reference ?? '',
  billRef: payment.billRef ?? '',
  amount: payment.amount === '' || payment.amount == null ? '' : String(payment.amount),
  chequeDate: payment.chequeDate ?? '',
  comment: payment.comment ?? '',
})

/** What goes to the API. */
export const formToPayload = (form) => ({
  number: form.number.trim(),
  supplierId: form.supplierId,
  at: form.at,
  method: form.method,
  reference: form.reference.trim(),
  billRef: form.billRef.trim(),
  amount: Number(form.amount) || 0,
  // A date only means anything on a cheque; the server clears it otherwise.
  chequeDate: form.method === 'CHEQUE' ? form.chequeDate : '',
  comment: form.comment.trim(),
})

const isNumber = (value) => value !== '' && !Number.isNaN(Number(value))

export function validatePaymentOutForm(form) {
  const errors = {}

  if (!form.supplierId) errors.supplierId = 'Choose the supplier.'
  if (!form.at) errors.at = 'Pick the day the money went.'
  if (!form.amount) errors.amount = 'Enter how much was paid.'
  else if (!isNumber(form.amount) || Number(form.amount) <= 0) errors.amount = 'Enter an amount above 0.'

  // A cheque dated before the day it was written is not post-dated, it is a
  // mistake — the same rule money coming in follows.
  if (form.method === 'CHEQUE' && form.chequeDate && form.at && form.chequeDate < form.at) {
    errors.chequeDate = 'A cheque cannot be dated before the day it was written.'
  }

  return errors
}

/** The empty supplier the "+ New supplier" drawer starts from. */
export const emptySupplierForm = () => ({
  name: '',
  contactPerson: '',
  mobile: '',
  email: '',
  address: '',
  gstin: '',
  drugLicence: '',
  state: '',
  pincode: '',
  note: '',
})

const MOBILE = /^[6-9]\d{9}$/
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export function validateSupplierForm(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Enter the supplier name.'
  if (form.mobile.trim() && !MOBILE.test(form.mobile.trim())) errors.mobile = 'Enter a 10-digit Indian mobile number.'
  if (form.gstin.trim() && !GSTIN.test(form.gstin.trim().toUpperCase())) {
    errors.gstin = 'A GSTIN is 15 characters, e.g. 23AACVP7781K1Z5.'
  }
  return errors
}

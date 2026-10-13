/**
 * Shared shapes for the two stock screens. The ledger lives on the server —
 * these are only the forms and the small display helpers both screens use.
 */

/** The period the figures are worked out over: this month, by default. */
export function currentMonth() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (date) => date.toISOString().slice(0, 10)
  return { from: iso(first), to: iso(last) }
}

export const today = () => new Date().toISOString().slice(0, 10)

export const EXPIRY_FILTERS = [
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'EXPIRING', label: 'Expiring in 90 days' },
]

/** Expiry is a warning, never a rule — this picks the colour, nothing else. */
export const EXPIRY_TONE = { EXPIRED: 'danger', EXPIRING: 'warning', OK: 'neutral', NONE: 'neutral' }

export const emptyBatchForm = (defaults = {}) => ({
  itemId: '',
  batchNo: '',
  quantity: '',
  mfgDate: '',
  expiryDate: '',
  receivedAt: today(),
  note: '',
  ...defaults,
})

export const batchToForm = (batch) => ({
  ...emptyBatchForm(),
  itemId: batch.itemId,
  batchNo: batch.batchNo,
  quantity: String(batch.quantity ?? ''),
  mfgDate: batch.mfgDate ?? '',
  expiryDate: batch.expiryDate ?? '',
  receivedAt: batch.receivedAt ?? today(),
  note: batch.note ?? '',
})

const isNumber = (value) => value !== '' && !Number.isNaN(Number(value))

/** Returns { field: message } — an empty object means valid. */
export function validateBatchForm(form) {
  const errors = {}

  if (!form.itemId) errors.itemId = 'Choose the product.'
  if (!form.batchNo.trim()) errors.batchNo = 'Enter the batch number.'
  if (!form.quantity) errors.quantity = 'Enter how much was made.'
  else if (!isNumber(form.quantity) || Number(form.quantity) <= 0) errors.quantity = 'Enter a quantity above 0.'

  if (form.mfgDate && form.expiryDate && form.expiryDate <= form.mfgDate) {
    errors.expiryDate = 'Expiry must be after the manufacturing date.'
  }
  if (form.mfgDate && form.mfgDate > today()) errors.mfgDate = 'Can’t be in the future.'

  return errors
}

export const emptyMoveForm = (defaults = {}) => ({
  distributorId: '',
  batchId: '',
  quantity: '',
  at: today(),
  note: '',
  ...defaults,
})

/** `available` is what can go: the factory's holding, or theirs on a return. */
export function validateMoveForm(form, available) {
  const errors = {}

  if (!form.distributorId) errors.distributorId = 'Choose the distributor.'
  if (!form.batchId) errors.batchId = 'Choose the batch.'
  if (!form.quantity) errors.quantity = 'Enter a quantity.'
  else if (!isNumber(form.quantity) || Number(form.quantity) <= 0) errors.quantity = 'Enter a quantity above 0.'
  else if (available !== undefined && Number(form.quantity) > available) errors.quantity = `Only ${available} available.`

  if (form.at && form.at > today()) errors.at = 'Can’t be in the future.'

  return errors
}

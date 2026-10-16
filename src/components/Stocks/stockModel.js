/**
 * Shared shapes for the two stock screens. The ledger lives on the server —
 * these are only the forms and the small display helpers both screens use.
 */

/**
 * A date as YYYY-MM-DD in the browser's own timezone.
 *
 * `toISOString()` cannot be used for this: midnight local in IST is 18:30 the
 * previous day in UTC, so 1 October comes back as 30 September and every period
 * is off by a day at its edges.
 */
export const isoDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const today = () => isoDate(new Date())

/* ── the books: 1 April to 31 March ──────────────────────────────────── */

/** April, zero-based — the month the client's financial year opens on. */
export const FY_START_MONTH = 3

/** Which financial year a date falls in, named after the April it opened. */
export const fiscalYearOf = (date = new Date()) =>
  date.getMonth() >= FY_START_MONTH ? date.getFullYear() : date.getFullYear() - 1

/** 2026 → "2026–27", the way the books are labelled. */
export const fiscalYearLabel = (year) => `${year}–${String((year + 1) % 100).padStart(2, '0')}`

/** The years to choose from, newest first — the client asked for ten. */
export const fiscalYearOptions = (back = 10) => {
  const current = fiscalYearOf()
  return Array.from({ length: back }, (_, i) => current - i).map((year) => ({
    value: String(year),
    label: fiscalYearLabel(year),
  }))
}

/** April … March, in the order the books run. '' is the whole year. */
export const FY_MONTHS = [
  { value: '', label: 'Whole year' },
  ...Array.from({ length: 12 }, (_, i) => {
    const month = (FY_START_MONTH + i) % 12
    return { value: String(month), label: new Date(2000, month, 1).toLocaleString('en-IN', { month: 'long' }) }
  }),
]

/**
 * The window a year and month cover. A month gives that month; no month gives
 * the whole financial year, 1 April to 31 March.
 *
 * This is what makes the four figures read the way the client expects: inside a
 * month, last month's closing is the opening; across a year, last year's
 * closing is the opening and everything produced during the year counts as in.
 */
export function periodFor({ year, month }) {
  const start = Number(year)

  if (month === '' || month === null || month === undefined) {
    return { from: isoDate(new Date(start, FY_START_MONTH, 1)), to: isoDate(new Date(start + 1, FY_START_MONTH, 0)) }
  }

  const index = Number(month)
  // January to March belong to the second half of the financial year.
  const calendarYear = index >= FY_START_MONTH ? start : start + 1
  return { from: isoDate(new Date(calendarYear, index, 1)), to: isoDate(new Date(calendarYear, index + 1, 0)) }
}

/** What the screens open on: this month, in this financial year. */
export const currentPeriod = () => ({ year: String(fiscalYearOf()), month: String(new Date().getMonth()) })

export const EXPIRY_FILTERS = [
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'EXPIRING', label: 'Expiring in 90 days' },
]

/** Expiry is a warning, never a rule — this picks the colour, nothing else. */
export const EXPIRY_TONE = { EXPIRED: 'danger', EXPIRING: 'warning', OK: 'neutral', NONE: 'neutral' }

const isNumber = (value) => value !== '' && !Number.isNaN(Number(value))

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

/** Returns { field: message } — an empty object means valid. */
export function validateBatchForm(form) {
  const errors = {}

  if (!form.itemId) errors.itemId = 'Choose the product.'
  if (!form.batchNo.trim()) errors.batchNo = 'Enter the batch number.'
  if (!form.quantity) errors.quantity = 'Enter how much was made.'
  else if (!isNumber(form.quantity) || Number(form.quantity) <= 0) errors.quantity = 'Enter a quantity above 0.'

  // Everything is required except the note and the date it was entered.
  if (!form.mfgDate) errors.mfgDate = 'Enter the manufacturing date.'
  else if (form.mfgDate > today()) errors.mfgDate = 'Can’t be in the future.'

  if (!form.expiryDate) errors.expiryDate = 'Enter the expiry date.'
  else if (form.mfgDate && form.expiryDate <= form.mfgDate) {
    errors.expiryDate = 'Expiry must be after the manufacturing date.'
  }

  return errors
}

export const emptyMoveForm = (defaults = {}) => ({
  distributorId: '',
  batchId: '',
  quantity: '',
  invoiceNo: '',
  at: today(),
  note: '',
  ...defaults,
})

/**
 * One bill, many lines. A real invoice carries ten or twenty items, and the
 * client will not enter them one at a time — "22 आइटम होते हैं, तो 22 बार
 * अपडेट करना पड़ेगा".
 */
export const emptyIssueForm = (defaults = {}) => ({
  distributorId: '',
  invoiceNo: '',
  at: today(),
  note: '',
  lines: [{ batchId: '', quantity: '' }],
  ...defaults,
})

/**
 * `availableOf(batchId)` says what that batch still holds. A batch may appear
 * on two lines of the same bill, so the check is against the running total.
 */
export function validateIssueForm(form, availableOf) {
  const errors = { lines: [] }

  if (!form.distributorId) errors.distributorId = 'Choose the distributor.'
  if (form.at && form.at > today()) errors.at = 'Can’t be in the future.'

  const taken = new Map()
  form.lines.forEach((line, index) => {
    const problem = {}
    if (!line.batchId) problem.batchId = 'Choose the batch.'
    if (!line.quantity) problem.quantity = 'Enter a quantity.'
    else if (!isNumber(line.quantity) || Number(line.quantity) <= 0) problem.quantity = 'Enter a quantity above 0.'
    else if (line.batchId) {
      const already = taken.get(line.batchId) ?? 0
      const left = Math.round((availableOf(line.batchId) - already) * 100) / 100
      if (Number(line.quantity) > left) problem.quantity = `Only ${left} left.`
      else taken.set(line.batchId, already + Number(line.quantity))
    }
    errors.lines[index] = Object.keys(problem).length ? problem : undefined
  })

  if (!errors.lines.some(Boolean)) delete errors.lines
  return errors
}

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

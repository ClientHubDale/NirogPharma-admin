import { priceWith } from '@/constants/priceTiers'

/**
 * The sales invoice form. Money is not worked out here — the server prices the
 * bill from the distributor's own rate column, so the panel only ever sends
 * what was chosen, never a rate.
 */
export const INVOICE_STATUSES = [
  { value: 'PENDING', label: 'Pending', tone: 'warning' },
  { value: 'CONFIRMED', label: 'Confirmed', tone: 'info' },
  { value: 'DISPATCHED', label: 'Dispatched', tone: 'info' },
  { value: 'DELIVERED', label: 'Delivered', tone: 'success' },
  { value: 'CANCELLED', label: 'Cancelled', tone: 'danger' },
]

export const STATUS_LABEL = Object.fromEntries(INVOICE_STATUSES.map((s) => [s.value, s.label]))
export const STATUS_TONE = Object.fromEntries(INVOICE_STATUSES.map((s) => [s.value, s.tone]))

export const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const emptyLine = () => ({ itemId: '', quantity: '', batches: [] })

export const emptyInvoiceForm = (defaults = {}) => ({
  invoiceNo: '',
  distributorId: '',
  invoiceDate: today(),
  creditDays: '',
  transport: '',
  vehicleNo: '',
  note: '',
  terms: '',
  lines: [emptyLine()],
  ...defaults,
})

export const invoiceToForm = (invoice) => ({
  ...emptyInvoiceForm(),
  invoiceNo: invoice.invoiceNo,
  distributorId: invoice.distributorId,
  invoiceDate: invoice.invoiceDate,
  creditDays: invoice.creditDays ? String(invoice.creditDays) : '',
  transport: invoice.transport ?? '',
  vehicleNo: invoice.vehicleNo ?? '',
  note: invoice.note ?? '',
  terms: invoice.terms ?? '',
  lines: invoice.lines.map((line) => ({
    itemId: line.itemId,
    quantity: String(line.quantity),
    batches: line.batches.map((row) => ({ batchId: row.batchId, quantity: String(row.quantity) })),
  })),
})

/** What goes to the API: the choices, nothing priced. */
export const formToPayload = (form) => ({
  invoiceNo: form.invoiceNo.trim(),
  distributorId: form.distributorId,
  invoiceDate: form.invoiceDate,
  creditDays: Number(form.creditDays) || 0,
  transport: form.transport.trim(),
  vehicleNo: form.vehicleNo.trim(),
  note: form.note.trim(),
  terms: form.terms.trim(),
  lines: form.lines
    .filter((line) => line.itemId)
    .map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
      batches: line.batches
        .filter((row) => row.batchId && row.quantity !== '')
        .map((row) => ({ batchId: row.batchId, quantity: Number(row.quantity) })),
    })),
})

const isNumber = (value) => value !== '' && !Number.isNaN(Number(value))

/**
 * What a line will come to, worked out the same way the server does so the
 * table can show it while it is being typed. The rate a distributor pays
 * already includes GST, so the printed rate is that price with the tax taken
 * back out — see the invoice service for the rule.
 */
export function previewLine({ item, tier, tiers, quantity }) {
  if (!item) return null
  const stored = (item.tierPrices ?? []).find((row) => row.tier === tier)
  const multiplier = tiers.find((row) => row.code === tier)?.multiplier
  const gross = stored ? Number(stored.price) : priceWith(Number(item.mrp), multiplier)
  if (gross === null || gross === undefined) return null

  const gst = Number(item.gst) || 0
  const qty = Number(quantity) || 0
  const grossPaise = Math.round(gross * 100)
  const ratePaise = Math.round(grossPaise / (1 + gst / 100))
  const taxablePaise = Math.round(ratePaise * qty)
  const totalPaise = Math.round(grossPaise * qty)

  return {
    gst,
    grossRate: grossPaise / 100,
    rate: ratePaise / 100,
    taxableValue: taxablePaise / 100,
    taxAmount: (totalPaise - taxablePaise) / 100,
    total: totalPaise / 100,
  }
}

/** The bill's own total, rounded to the rupee the way the server rounds it. */
export function previewTotals(lines) {
  const taxablePaise = lines.reduce((sum, line) => sum + Math.round((line?.taxableValue ?? 0) * 100), 0)
  const taxPaise = lines.reduce((sum, line) => sum + Math.round((line?.taxAmount ?? 0) * 100), 0)
  const beforePaise = taxablePaise + taxPaise
  const roundedPaise = Math.round(beforePaise / 100) * 100

  return {
    taxableValue: taxablePaise / 100,
    taxAmount: taxPaise / 100,
    roundOff: (roundedPaise - beforePaise) / 100,
    total: roundedPaise / 100,
  }
}

/**
 * `availableOf(batchId)` is what the factory still holds in that batch. The
 * batches on a line may add up to less than the line while the bill is only
 * being saved — they have to match before it can be issued, which the server
 * enforces — but they may never add up to more.
 */
export function validateInvoiceForm(form, availableOf) {
  const errors = { lines: [] }

  if (!form.invoiceNo.trim()) errors.invoiceNo = 'Enter the invoice number.'
  if (!form.distributorId) errors.distributorId = 'Choose the distributor.'
  if (!form.invoiceDate) errors.invoiceDate = 'Pick the date.'
  if (form.creditDays !== '' && (!isNumber(form.creditDays) || Number(form.creditDays) < 0))
    errors.creditDays = 'Enter a number of days.'

  const filled = form.lines.filter((line) => line.itemId)
  if (!filled.length) errors.lines_empty = 'Add at least one item.'

  const taken = new Map()
  form.lines.forEach((line, index) => {
    const problem = {}
    if (!line.itemId && (line.quantity || line.batches.length)) problem.itemId = 'Choose the item.'
    if (line.itemId) {
      if (!line.quantity) problem.quantity = 'Enter a quantity.'
      else if (!isNumber(line.quantity) || Number(line.quantity) <= 0) problem.quantity = 'Enter a quantity above 0.'

      const allocated = line.batches.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
      if (allocated > Number(line.quantity)) problem.batches = `The batches add up to ${allocated}, more than the line.`

      line.batches.forEach((row) => {
        if (!row.batchId) return
        const already = taken.get(row.batchId) ?? 0
        const want = Number(row.quantity) || 0
        if (want > availableOf(row.batchId) - already) problem.batches = 'A batch does not hold that much.'
        taken.set(row.batchId, already + want)
      })
    }
    errors.lines[index] = Object.keys(problem).length ? problem : undefined
  })

  if (!errors.lines.some(Boolean)) delete errors.lines
  return errors
}

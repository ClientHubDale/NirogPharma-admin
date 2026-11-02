import { priceWith } from '@/constants/priceTiers'

/**
 * The credit note form. As on a bill, money is not worked out here — the server
 * prices every line from the distributor's own rate column, so the panel only
 * ever sends what was chosen, never a rate.
 */
export const CREDIT_NOTE_STATUSES = [
  { value: 'PENDING', label: 'Draft', tone: 'warning' },
  { value: 'ISSUED', label: 'Issued', tone: 'success' },
  { value: 'CANCELLED', label: 'Cancelled', tone: 'danger' },
]

export const STATUS_LABEL = Object.fromEntries(CREDIT_NOTE_STATUSES.map((s) => [s.value, s.label]))
export const STATUS_TONE = Object.fromEntries(CREDIT_NOTE_STATUSES.map((s) => [s.value, s.tone]))

/**
 * Where these screens live. The same list and editor serve the office and the
 * distributor — the API decides whose notes come back — so the only thing that
 * differs is the path they link to.
 */
export const basePathFor = (pathname) =>
  pathname.startsWith('/distributor') ? '/distributor/credit-notes' : '/admin/sales/credit-notes'

export const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** A line names one batch: the goods have to go back where they came from. */
export const emptyLine = () => ({ itemId: '', batchId: '', quantity: '', boxes: '' })

export const emptyCreditNoteForm = (defaults = {}) => ({
  noteNo: '',
  distributorId: '',
  at: today(),
  debitNoteNo: '',
  debitNoteDate: '',
  debitNotePhotoUrl: '',
  transport: '',
  vehicleNo: '',
  station: '',
  againstInvoiceNo: '',
  otherCharges: '',
  note: '',
  lines: [emptyLine()],
  ...defaults,
})

export const creditNoteToForm = (note) => ({
  ...emptyCreditNoteForm(),
  noteNo: note.noteNo,
  distributorId: note.distributorId,
  at: note.at,
  debitNoteNo: note.debitNoteNo ?? '',
  debitNoteDate: note.debitNoteDate ?? '',
  debitNotePhotoUrl: note.debitNotePhotoUrl ?? '',
  transport: note.transport ?? '',
  vehicleNo: note.vehicleNo ?? '',
  station: note.station ?? '',
  againstInvoiceNo: note.againstInvoiceNo ?? '',
  otherCharges: Number(note.otherCharges) ? String(note.otherCharges) : '',
  note: note.note ?? '',
  lines: (note.lines ?? []).map((line) => ({
    itemId: line.itemId,
    batchId: line.batchId ?? '',
    quantity: String(line.quantity),
    boxes: line.boxes === null || line.boxes === undefined ? '' : String(line.boxes),
  })),
})

/** What goes to the API: the choices, nothing priced. */
export const formToPayload = (form) => ({
  noteNo: form.noteNo.trim(),
  distributorId: form.distributorId,
  at: form.at,
  debitNoteNo: form.debitNoteNo.trim(),
  debitNoteDate: form.debitNoteDate,
  debitNotePhotoUrl: form.debitNotePhotoUrl,
  transport: form.transport.trim(),
  vehicleNo: form.vehicleNo.trim(),
  station: form.station.trim(),
  againstInvoiceNo: form.againstInvoiceNo.trim(),
  otherCharges: Number(form.otherCharges) || 0,
  note: form.note.trim(),
  lines: form.lines
    .filter((line) => line.itemId)
    .map((line) => ({
      itemId: line.itemId,
      batchId: line.batchId,
      quantity: Number(line.quantity),
      boxes: Number(line.boxes) || 0,
    })),
})

/**
 * What a line will come to, worked out the same way the server does so the
 * sheet can show it while it is being typed.
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
    gstRate: gst,
    grossRate: grossPaise / 100,
    rate: ratePaise / 100,
    taxableValue: taxablePaise / 100,
    taxAmount: (totalPaise - taxablePaise) / 100,
    total: totalPaise / 100,
  }
}

/** The note's own total, rounded to the rupee the way the server rounds it. */
export function previewTotals(lines, otherCharges = 0) {
  const taxablePaise = lines.reduce((sum, line) => sum + Math.round((line?.taxableValue ?? 0) * 100), 0)
  const taxPaise = lines.reduce((sum, line) => sum + Math.round((line?.taxAmount ?? 0) * 100), 0)
  const otherPaise = Math.round((Number(otherCharges) || 0) * 100)
  const beforePaise = taxablePaise + taxPaise + otherPaise
  const roundedPaise = Math.round(beforePaise / 100) * 100

  return {
    taxableValue: taxablePaise / 100,
    taxAmount: taxPaise / 100,
    otherCharges: otherPaise / 100,
    roundOff: (roundedPaise - beforePaise) / 100,
    total: roundedPaise / 100,
  }
}

/**
 * `heldOf(batchId)` is what the distributor still holds of that batch. A note
 * may be saved before anyone has sorted the goods, so a line without its batch
 * is allowed — but it may never credit back more than they were given, which
 * the server checks again before the note goes out.
 */
export function validateCreditNoteForm(form, heldOf) {
  const errors = { lines: [] }

  if (!form.distributorId) errors.distributorId = 'Choose the distributor.'
  if (!form.at) errors.at = 'Pick the date.'

  const filled = form.lines.filter((line) => line.itemId)
  if (!filled.length) errors.lines = 'Add at least one item.'

  form.lines.forEach((line, index) => {
    if (!line.itemId) return
    const found = {}
    const quantity = Number(line.quantity)
    if (line.quantity === '' || Number.isNaN(quantity) || quantity <= 0) {
      found.quantity = 'Enter how much came back.'
    } else if (line.batchId) {
      const held = heldOf?.(line.batchId)
      if (held !== undefined && quantity > held) found.quantity = `They only hold ${held}.`
    }
    if (Object.keys(found).length) errors.lines[index] = found
  })

  if (errors.lines.some(Boolean) && !errors.lines.length) errors.lines = 'Check the lines.'
  const hasLineError = Array.isArray(errors.lines) ? errors.lines.some(Boolean) : Boolean(errors.lines)
  const ok = !hasLineError && !errors.distributorId && !errors.at
  return { errors, ok }
}

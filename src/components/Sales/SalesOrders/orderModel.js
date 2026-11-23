import { addressOf, previewLine, previewTotals, today } from '../Invoices/invoiceModel'

/**
 * The sales order form.
 *
 * An order is priced exactly as a bill is, so the preview comes from the
 * bill's own model rather than a second copy of those sums — if the two ever
 * drifted, converting an order would change what a customer owes. Money is
 * not worked out here either way: the server prices the order from the
 * customer's rate column, and the panel only sends what was chosen.
 *
 * What an order does **not** have is batches. It promises goods and reserves
 * nothing; the bill made from it is where batches are picked and stock moves.
 */

/// Re-exported so the order screens reach for one model, not two.
export { addressOf, previewLine, previewTotals, today }

export const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', tone: 'warning' },
  { value: 'ONHOLD', label: 'On hold', tone: 'neutral' },
  { value: 'CONFIRMED', label: 'Confirmed', tone: 'info' },
  { value: 'INVOICED', label: 'Invoiced', tone: 'info' },
  { value: 'DISPATCHED', label: 'Dispatched', tone: 'info' },
  { value: 'DELIVERED', label: 'Delivered', tone: 'success' },
  { value: 'CANCELLED', label: 'Cancelled', tone: 'danger' },
]

export const STATUS_LABEL = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s.label]))
export const STATUS_TONE = Object.fromEntries(ORDER_STATUSES.map((s) => [s.value, s.tone]))

/// While an order is one of these it can still be rewritten — the same rule
/// the server enforces.
export const OPEN_STATUSES = ['PENDING', 'ONHOLD']

/// A line carries an empty `batches` list so the shared lines table, which a
/// bill also uses, can read every line the same way.
export const emptyLine = () => ({ itemId: '', quantity: '', batches: [] })

export const emptyOrderForm = (defaults = {}) => ({
  orderNo: '',
  distributorId: '',
  orderDate: today(),
  creditDays: '',
  transport: '',
  vehicleNo: '',
  station: '',
  packages: '',
  shipTo: '',
  /// The shop or doctor the order was booked from, and their number. This is
  /// what makes an order secondary sales: the executive books at the shop,
  /// the distributor fulfils it, and both have to be on the record for the
  /// Executive Secondary figures to mean anything.
  shopName: '',
  shopMobile: '',
  note: '',
  terms: '',
  lines: [emptyLine()],
  ...defaults,
})

export const orderToForm = (order) => ({
  ...emptyOrderForm(),
  orderNo: order.orderNo,
  distributorId: order.distributorId,
  orderDate: order.orderDate,
  creditDays: order.creditDays ? String(order.creditDays) : '',
  transport: order.transport ?? '',
  vehicleNo: order.vehicleNo ?? '',
  station: order.station ?? '',
  packages: order.packages === '' || order.packages == null ? '' : String(order.packages),
  shipTo: order.shipTo ?? '',
  shopName: order.shopName ?? '',
  shopMobile: order.shopMobile ?? '',
  note: order.note ?? '',
  terms: order.terms ?? '',
  lines: order.lines.map((line) => ({ itemId: line.itemId, quantity: String(line.quantity), batches: [] })),
})

/** What goes to the API: the choices, nothing priced. */
export const formToPayload = (form) => ({
  orderNo: form.orderNo.trim(),
  distributorId: form.distributorId,
  orderDate: form.orderDate,
  creditDays: Number(form.creditDays) || 0,
  transport: form.transport.trim(),
  vehicleNo: form.vehicleNo.trim(),
  station: form.station.trim(),
  packages: form.packages.trim(),
  shipTo: form.shipTo.trim(),
  shopName: form.shopName.trim(),
  shopMobile: form.shopMobile.trim(),
  note: form.note.trim(),
  terms: form.terms.trim(),
  lines: form.lines.filter((line) => line.itemId).map((line) => ({ itemId: line.itemId, quantity: Number(line.quantity) })),
})

const isNumber = (value) => value !== '' && !Number.isNaN(Number(value))

/**
 * What has to be right before an order can be saved. Nothing about stock: an
 * order may be for more than the factory holds today, because it is a promise
 * for later — the bill is where what is actually on the shelf matters.
 */
export function validateOrderForm(form) {
  const errors = { lines: [] }

  if (!form.distributorId) errors.distributorId = 'Choose the customer.'
  if (!form.orderDate) errors.orderDate = 'Pick the date.'
  if (form.creditDays !== '' && (!isNumber(form.creditDays) || Number(form.creditDays) < 0)) errors.creditDays = 'Enter a number of days.'

  const filled = form.lines.filter((line) => line.itemId)
  if (!filled.length) errors.lines_empty = 'Add at least one item.'

  form.lines.forEach((line, index) => {
    const problem = {}
    if (!line.itemId && line.quantity) problem.itemId = 'Choose the item.'
    if (line.itemId) {
      if (!line.quantity) problem.quantity = 'Enter a quantity.'
      else if (!isNumber(line.quantity) || Number(line.quantity) <= 0) problem.quantity = 'Enter a quantity above 0.'
    }
    errors.lines[index] = Object.keys(problem).length ? problem : undefined
  })

  if (!errors.lines.some(Boolean)) delete errors.lines
  return errors
}

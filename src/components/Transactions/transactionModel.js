/**
 * Sales documents (estimates, orders, invoices…): line maths, GST split,
 * totals, numbering, validation. Pure functions — the backend must use the
 * same rules. All money is ₹; rates in a document are EXCLUSIVE of tax.
 */
import { company } from '@/constants/site'
import { formatPrice } from '@/lib/format'

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/* ── prices ───────────────────────────────────────────── */

/** Catalog / list price → tax-exclusive rate for a document line. */
export const toExclusive = (price, gstPct, taxMode) => (taxMode === 'INCL' ? r2(price / (1 + gstPct / 100)) : price)

/**
 * Price for this party: its group's price list if there is one
 * (fixed price, or catalog ± %, capped at MRP), else the catalog price.
 * Returns { price (in the item's tax mode), source }.
 */
export function partyPrice(item, party, priceLists) {
  const lists = priceLists.filter((l) => l.partyGroup === party?.groupId || l.partyGroup === 'all')
  const specific = lists.find((l) => l.partyGroup === party?.groupId) ?? lists[0]
  if (specific) {
    if (specific.strategy === 'FIXED') {
      const row = specific.items.find((r) => r.itemId === item.id)
      if (row) return { price: row.price, source: specific.name }
    } else {
      const sign = specific.strategy === 'INCREASE' ? 1 : -1
      const p = r2(item.sellPrice * (1 + (sign * specific.percent) / 100))
      return { price: item.mrp ? Math.min(p, item.mrp) : p, source: specific.name }
    }
  }
  return { price: item.sellPrice, source: 'Catalog' }
}

/**
 * New line for an item (qty 1).
 * Sales: rate from the party's price list. Purchase: the item's purchase price.
 */
export function lineFor(item, party, priceLists, key, purchase = false) {
  const { price, source } = purchase
    ? { price: item.purchasePrice, source: 'Purchase price' }
    : partyPrice(item, party, priceLists)
  return {
    key,
    itemId: item.id,
    name: item.name,
    code: item.code,
    unit: item.unit,
    mrp: item.mrp,
    gst: Number(item.gst) || 0,
    cess: Number(item.cess) || 0,
    qty: 1,
    rate: toExclusive(price, Number(item.gst) || 0, purchase ? item.purchaseTaxMode : item.sellTaxMode),
    discount: 0, // manual ₹ off per unit
    schemeDiscount: 0, // ₹ off per unit from schemes
    free: false, // added by a Buy X Get Y scheme
    schemeName: '',
    priceSource: source,
  }
}

/* ── line & document totals ───────────────────────────── */

export function lineTotals(line) {
  const qty = Number(line.qty) || 0
  const net = Math.max(0, (Number(line.rate) || 0) - (Number(line.discount) || 0) - (Number(line.schemeDiscount) || 0))
  const taxable = r2(net * qty)
  const gst = r2((taxable * line.gst) / 100)
  const cess = r2((taxable * line.cess) / 100)
  return { net, taxable, gst, cess, amount: r2(taxable + gst + cess) }
}

/** Same state as the company → CGST + SGST; otherwise IGST. */
export const isInterState = (party) => Boolean(party?.stateCode) && party.stateCode !== company.stateCode

/**
 * doc: { lines, adjustments: [{ label, kind: 'DISCOUNT'|'CHARGE', amount }], schemeDiscount }
 * → { taxable, cgst, sgst, igst, cess, discounts, charges, beforeRound, roundoff, total, qty }
 */
export function docTotals(doc, party) {
  const lines = doc.lines.map(lineTotals)
  const taxable = r2(lines.reduce((s, l) => s + l.taxable, 0))
  const gst = r2(lines.reduce((s, l) => s + l.gst, 0))
  const cess = r2(lines.reduce((s, l) => s + l.cess, 0))
  const inter = isInterState(party)
  const adjustments = doc.adjustments ?? []
  const discounts = r2(adjustments.filter((a) => a.kind === 'DISCOUNT').reduce((s, a) => s + (Number(a.amount) || 0), 0) + (Number(doc.schemeDiscount) || 0))
  const charges = r2(adjustments.filter((a) => a.kind === 'CHARGE').reduce((s, a) => s + (Number(a.amount) || 0), 0))
  const beforeRound = r2(Math.max(0, taxable + gst + cess - discounts + charges))
  const total = Math.round(beforeRound)
  return {
    taxable,
    cgst: inter ? 0 : r2(gst / 2),
    sgst: inter ? 0 : r2(gst - r2(gst / 2)),
    igst: inter ? gst : 0,
    inter,
    cess,
    discounts,
    charges,
    beforeRound,
    roundoff: r2(total - beforeRound),
    total,
    qty: doc.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0),
  }
}

/* ── numbering ────────────────────────────────────────── */

/** Indian financial year: Apr–Mar. "2026-09-19" → "26-27" */
export function financialYear(isoDate) {
  const [y, m] = isoDate.split('-').map(Number)
  const start = m >= 4 ? y : y - 1
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`
}

/** Next number in the FY series: EST/26-27/0007 */
export function nextDocNumber(docs, prefix, isoDate) {
  const fy = financialYear(isoDate)
  const series = `${prefix}/${fy}/`
  const max = docs.filter((d) => d.number.startsWith(series)).reduce((m, d) => Math.max(m, Number(d.number.slice(series.length)) || 0), 0)
  return `${series}${String(max + 1).padStart(4, '0')}`
}

/* ── validation ───────────────────────────────────────── */

/**
 * Returns { field: message, lines: { [key]: message } } — empty = valid.
 * sourceDoc = the document this one was converted from; a return or credit
 * note can never be for more than was sold on it.
 */
export function validateDoc(doc, { party, settings, totals, sourceDoc }) {
  const soldQty =
    sourceDoc &&
    sourceDoc.lines.reduce((m, l) => {
      m[l.itemId] = (m[l.itemId] ?? 0) + (Number(l.qty) || 0)
      return m
    }, {})
  const e = {}
  if (!party) e.partyId = 'Choose who this is for.'
  if (!doc.date) e.date = 'Choose a date.'
  const lineErrors = {}
  doc.lines.forEach((l) => {
    const qty = Number(l.qty)
    if (!qty || qty <= 0) lineErrors[l.key] = 'Quantity must be above 0'
    else if (soldQty && qty > (soldQty[l.itemId] ?? 0))
      lineErrors[l.key] = soldQty[l.itemId] ? `Only ${soldQty[l.itemId]} on ${sourceDoc.number}` : `Not on ${sourceDoc.number}`
    else if (!l.free && !(Number(l.rate) > 0)) lineErrors[l.key] = 'Enter a rate'
    else if (!l.free && Number(l.discount) > Number(l.rate)) lineErrors[l.key] = 'Discount is more than the rate'
    else if (!l.free && l.mrp) {
      const withTax = (Number(l.rate) - Number(l.discount || 0)) * (1 + (l.gst + l.cess) / 100)
      if (withTax > l.mrp + 0.01) lineErrors[l.key] = `Above MRP ${formatPrice(l.mrp)} incl. tax`
    }
  })
  if (Object.keys(lineErrors).length) e.lines = lineErrors
  if (!doc.lines.length) e.items = 'Add at least one item.'
  if (doc.lines.length && settings.minOrderValue && totals.total < settings.minOrderValue)
    e.items = `Below the minimum order value of ${formatPrice(settings.minOrderValue)}.`
  if (settings.creditPeriod && doc.creditPeriodDays !== '' && (!Number.isInteger(Number(doc.creditPeriodDays)) || Number(doc.creditPeriodDays) > 365))
    e.creditPeriodDays = 'Whole days, 0 to 365.'
  return e
}

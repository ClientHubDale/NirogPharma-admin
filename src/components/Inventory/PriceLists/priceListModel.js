/**
 * Price list strategies, form ⇄ record, validation, price maths and the
 * Excel round-trip (export catalog → edit New Price → import).
 */
import { formatPrice } from '@/lib/format'

export const PRICING_STRATEGIES = [
  { value: 'FIXED', label: 'Fixed pricing' },
  { value: 'INCREASE', label: 'Increase by a fixed percentage' },
  { value: 'DECREASE', label: 'Decrease by a fixed percentage' },
]

const round2 = (n) => Math.round(n * 100) / 100

/** Price of an item under a percentage strategy. */
export function adjustedPrice(catalogPrice, strategy, percent) {
  const p = Number(percent) || 0
  if (strategy === 'INCREASE') return round2(catalogPrice * (1 + p / 100))
  if (strategy === 'DECREASE') return round2(catalogPrice * (1 - p / 100))
  return catalogPrice
}

/** Price a percentage list charges for an item — never above MRP. */
export function listPriceFor(item, strategy, percent) {
  const price = adjustedPrice(item.sellPrice, strategy, percent)
  return item.mrp ? Math.min(price, item.mrp) : price
}

/** "Fixed pricing · 5 items" / "Catalog +2.5%" / "Catalog −8%" */
export function describeStrategy(list) {
  if (list.strategy === 'FIXED') return `Fixed pricing · ${list.items.length} item${list.items.length === 1 ? '' : 's'}`
  return `Catalog ${list.strategy === 'INCREASE' ? '+' : '−'}${list.percent}% on all items`
}

/** Change vs catalog, e.g. "−5.2%" (null when equal). */
export function changeLabel(catalog, price) {
  if (!catalog || !price || Number(price) === catalog) return null
  const pct = ((Number(price) - catalog) / catalog) * 100
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`
}

/* ── form ────────────────────────────────────────────── */

export const emptyPriceListForm = () => ({
  name: '',
  description: '',
  partyGroup: 'all',
  strategy: 'FIXED',
  percent: '',
  items: [], // [{ itemId, price: string }]
})

export const priceListToForm = (list) => ({
  ...emptyPriceListForm(),
  ...list,
  percent: list.percent === null || list.percent === undefined ? '' : String(list.percent),
  items: list.items.map((row) => ({ itemId: row.itemId, price: String(row.price) })),
})

export const formToPriceList = (form, id) => ({
  id,
  name: form.name.trim(),
  description: form.description.trim(),
  partyGroup: form.partyGroup,
  strategy: form.strategy,
  percent: form.strategy === 'FIXED' ? null : Number(form.percent),
  items: form.strategy === 'FIXED' ? form.items.map((row) => ({ itemId: row.itemId, price: Number(row.price) })) : [],
  updatedAt: new Date().toISOString().slice(0, 10),
})

const isNum = (v) => v !== '' && v !== null && !Number.isNaN(Number(v))

/** Returns { field: message, rows: { [itemId]: message } }. Empty = valid. */
export function validatePriceListForm(form, { priceLists, editingId, itemsById }) {
  const e = {}
  const name = form.name.trim()
  if (!name) e.name = 'Price list name is required.'
  else if (priceLists.some((p) => p.id !== editingId && p.name.toLowerCase() === name.toLowerCase()))
    e.name = 'A price list with this name already exists.'

  if (form.strategy === 'FIXED') {
    if (form.items.length === 0) e.items = 'Add at least one item, or import them from Excel.'
    const rows = {}
    form.items.forEach((row) => {
      const item = itemsById[row.itemId]
      if (!isNum(row.price) || Number(row.price) <= 0) rows[row.itemId] = 'Enter a price'
      else if (item?.mrp && Number(row.price) > item.mrp) rows[row.itemId] = `Above MRP ${formatPrice(item.mrp)}`
    })
    if (Object.keys(rows).length) {
      e.rows = rows
      e.items = e.items ?? `Fix ${Object.keys(rows).length} price${Object.keys(rows).length === 1 ? '' : 's'} below.`
    }
  } else {
    const p = Number(form.percent)
    if (!isNum(form.percent) || p <= 0) e.percent = 'Enter a percentage above 0.'
    else if (form.strategy === 'DECREASE' && p >= 100) e.percent = 'A decrease must be below 100%.'
    else if (form.strategy === 'INCREASE' && p > 100) e.percent = 'An increase can be at most 100%.'
  }
  return e
}

/* ── Excel round-trip ────────────────────────────────── */

/** SKU = item code, or the internal id for items without a code. */
export const skuOf = (item) => item.code || item.id

export const PRICE_SHEET_COLUMNS = [
  { key: 'sku', header: 'SKU', width: 16, required: true, note: 'Do not change — used to match the item.' },
  { key: 'name', header: 'Item Name', width: 36 },
  { key: 'brand', header: 'Brand', width: 16 },
  { key: 'category', header: 'Category', width: 14 },
  { key: 'unit', header: 'Unit', width: 9 },
  { key: 'mrp', header: 'MRP', width: 10, numFmt: '0.00' },
  { key: 'catalogPrice', header: 'Catalog Price', width: 14, numFmt: '0.00' },
  { key: 'newPrice', header: 'New Price', width: 12, required: true, numFmt: '0.00', note: 'Price in this list. Blank = keep the catalog price. Must not exceed MRP.' },
]

export const PRICE_SHEET_INSTRUCTIONS = [
  ['Nirog Pharma — Price list', 'Edit the New Price column, then import this file on the Create Price List page.'],
  ['SKU', 'Keep the SKU column unchanged — it is how items are matched.'],
  ['Remove items', 'Delete the rows for items you don’t want in this price list.'],
  ['Keep catalog price', 'Leave New Price blank to keep the catalog price for that item.'],
  ['MRP', 'A New Price above the item’s MRP is rejected.'],
]

/** Catalog rows for export; existing list prices pre-fill New Price. */
export function priceSheetRows(items, current = []) {
  const priceById = Object.fromEntries(current.map((row) => [row.itemId, row.price]))
  return items.map((item) => ({
    sku: skuOf(item),
    name: item.name,
    brand: item.brand,
    category: item.category,
    unit: item.unit,
    mrp: item.mrp,
    catalogPrice: item.sellPrice,
    newPrice: priceById[item.id] === undefined || priceById[item.id] === '' ? null : Number(priceById[item.id]),
  }))
}

/** Imported rows → { rows: [{ itemId, price }], skipped: [{ line, reason }], keptCatalog } */
export function sheetRowsToPrices(rawRows, items) {
  const bySku = new Map(items.map((i) => [skuOf(i).toLowerCase(), i]))
  const seen = new Set()
  const rows = []
  const skipped = []
  let keptCatalog = 0

  rawRows.forEach((raw, index) => {
    const line = raw.__line ?? index + 2
    const sku = String(raw.sku ?? '').trim()
    const item = bySku.get(sku.toLowerCase())
    if (!sku) return skipped.push({ line, reason: 'missing SKU' })
    if (!item) return skipped.push({ line, reason: `unknown SKU ${sku}` })
    if (seen.has(item.id)) return skipped.push({ line, reason: `${sku} appears twice` })

    const rawPrice = raw['new price']
    let price
    if (rawPrice === '' || rawPrice === null || rawPrice === undefined) {
      price = item.sellPrice
      keptCatalog++
    } else {
      price = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[₹,\s]/g, ''))
      if (Number.isNaN(price) || price <= 0) return skipped.push({ line, reason: `invalid New Price "${rawPrice}"` })
      if (item.mrp && price > item.mrp) return skipped.push({ line, reason: `${sku}: ${formatPrice(price)} is above MRP ${formatPrice(item.mrp)}` })
    }
    seen.add(item.id)
    rows.push({ itemId: item.id, price: String(round2(price)) })
  })
  return { rows, skipped, keptCatalog }
}

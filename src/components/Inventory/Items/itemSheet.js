/**
 * Items ⇄ spreadsheet (.xlsx, and .csv with the same headers).
 * Column order follows the client's existing "sample_import_item.xlsx" so
 * files from their previous system import as-is; Warehouse and Status are
 * our additions at the end (optional).
 */
import { GST_RATES, UNITS, WAREHOUSES } from '@/mocks/items'

const UNIT_CODES = UNITS.map((u) => u.value)
const GST_VALUES = GST_RATES.map((g) => g.value)

export const ITEM_SHEET_COLUMNS = [
  { key: 'name', header: 'Name', width: 34, required: true, note: 'Required. Item name, unique.' },
  { key: 'unit', header: 'Unit', width: 10, required: true, list: UNIT_CODES, note: `Required. One of: ${UNIT_CODES.join(', ')}` },
  { key: 'sellPrice', header: 'Sell Price', width: 12, required: true, numFmt: '0.00', note: 'Required. Selling price per unit.' },
  { key: 'category', header: 'Category', width: 14 },
  { key: 'brand', header: 'Brand', width: 16 },
  { key: 'code', header: 'Product Code', width: 16, note: 'Optional, must be unique.' },
  { key: 'stock', header: 'Stock', width: 10, numFmt: '0', note: 'Opening stock, in the main unit.' },
  { key: 'openingStockDate', header: 'Opening Stock Date', width: 19, numFmt: 'dd-mmm-yyyy', note: 'Date the opening stock was counted.' },
  { key: 'purchasePrice', header: 'Purchase Price', width: 15, numFmt: '0.00' },
  { key: 'hsn', header: 'HSN', width: 11, note: '4, 6 or 8 digits.' },
  { key: 'mrp', header: 'MRP', width: 10, numFmt: '0.00' },
  { key: 'gst', header: 'GST', width: 8, list: GST_VALUES, note: `GST %. One of: ${GST_VALUES.join(', ')}` },
  { key: 'weight', header: 'Weight', width: 10 },
  { key: 'sellWithTax', header: 'Sell Price With Tax', width: 19, list: ['1', '0'], note: '1 = Sell Price includes GST, 0 = excludes (default).' },
  { key: 'purchaseWithTax', header: 'Purchase Price With Tax', width: 23, list: ['1', '0'], note: '1 = Purchase Price includes GST, 0 = excludes (default).' },
  { key: 'conversionFactor', header: 'Multiplier', width: 11, numFmt: '0', note: 'How many Units are in one Sec Unit (e.g. 12).' },
  { key: 'secondaryUnit', header: 'Sec Unit', width: 10, list: UNIT_CODES, note: 'Bigger pack unit, e.g. BOX. Needs Multiplier.' },
  { key: 'erpId', header: 'Erp ID', width: 12, note: 'ID of this item in your accounting / ERP software.' },
  { key: 'warehouse', header: 'Warehouse', width: 34, list: WAREHOUSES.map((w) => w.label), note: 'Where the opening stock is kept. Default: main warehouse.' },
  { key: 'status', header: 'Status', width: 10, list: ['Active', 'Draft'], note: 'Active (default) or Draft.' },
]

/** Header (lower-cased) → field key, including headers from our earlier CSV format. */
const HEADER_KEYS = Object.fromEntries([
  ...ITEM_SHEET_COLUMNS.map((c) => [c.header.toLowerCase(), c.key]),
  ['item name', 'name'],
  ['item code', 'code'],
  ['gst %', 'gst'],
])

export const ITEM_IMPORT_REQUIRED = 'Name, Unit and Sell Price.'

export const ITEM_SHEET_INSTRUCTIONS = [
  ['Nirog Pharma — Item import', 'Fill the "Items" sheet, one item per row. Keep the header row as it is.'],
  ['Required columns', 'Name, Unit and Sell Price (dark green headers). All other columns are optional.'],
  ['Unit / Sec Unit', `Use one of: ${UNIT_CODES.join(', ')}. Words like Pcs, Bottle, Strips or Box are also understood.`],
  ['Multiplier', 'Units inside one Sec Unit. Example: Unit STRIP, Sec Unit BOX, Multiplier 10 → 1 BOX = 10 STRIP.'],
  ['GST', `Percentage without the % sign: ${GST_VALUES.join(', ')}.`],
  ['With Tax columns', '1 if the price already includes GST, 0 (or blank) if GST is added on top.'],
  ['Opening Stock Date', 'Any Excel date, or DD/MM/YYYY.'],
  ['Duplicates', 'Rows whose Name or Product Code already exists are skipped and listed after import.'],
  ['File types', 'Save as .xlsx (recommended) or .csv with the same header row.'],
]

/** Example rows for Download Sample: one fully filled, one with only the required fields. */
export const ITEM_SAMPLE_ROWS = [
  {
    name: 'Nirog Levocetirizine 5 mg',
    unit: 'STRIP',
    sellPrice: 24.5,
    category: 'Tablet',
    brand: 'Nirog',
    code: 'NP-LCZ5',
    stock: 100,
    openingStockDate: new Date(),
    purchasePrice: 18,
    hsn: '30049099',
    mrp: 32,
    gst: '12',
    weight: '10 g',
    sellWithTax: '0',
    purchaseWithTax: '0',
    conversionFactor: 10,
    secondaryUnit: 'BOX',
    erpId: 'TALLY-1001',
    warehouse: WAREHOUSES[0].label,
    status: 'Active',
  },
  { name: 'Nirog Cough Syrup 60 ml', unit: 'BTL', sellPrice: 58 },
]

export function itemsToSheetRows(items) {
  return items.map((item) => ({
    ...item,
    gst: item.gst === null || item.gst === undefined ? '' : String(item.gst),
    sellWithTax: item.sellTaxMode === 'INCL' ? '1' : '0',
    purchaseWithTax: item.purchaseTaxMode === 'INCL' ? '1' : '0',
    openingStockDate: item.openingStockDate ? new Date(item.openingStockDate) : '',
    warehouse: WAREHOUSES.find((w) => w.value === item.warehouseId)?.label ?? '',
    status: item.status === 'ACTIVE' ? 'Active' : 'Draft',
  }))
}

/* ── import ─────────────────────────────────────────────── */

const UNIT_WORDS = {
  PCS: ['pcs', 'pc', 'piece', 'pieces', 'nos', 'no'],
  STRIP: ['strip', 'strips', 'stp'],
  BOX: ['box', 'boxes', 'bx'],
  BTL: ['btl', 'bottle', 'bottles'],
  TUBE: ['tube', 'tubes'],
  VIAL: ['vial', 'vials'],
  PKT: ['pkt', 'packet', 'packets', 'pack', 'pouch', 'sachet'],
  JAR: ['jar', 'jars'],
}

function normalizeUnit(value) {
  const v = String(value ?? '').trim().toLowerCase()
  if (!v) return ''
  return Object.entries(UNIT_WORDS).find(([code, words]) => code.toLowerCase() === v || words.includes(v))?.[0] ?? null
}

const toNumber = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[₹,\s%]/g, ''))
  return Number.isNaN(n) ? NaN : n
}

const truthy = (v) => ['1', 'yes', 'y', 'true', 'incl', 'with tax'].includes(String(v ?? '').trim().toLowerCase())

function toISODate(v) {
  if (!v) return ''
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  const s = String(v).trim()
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s) // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

/** Rename raw headers to field keys; unknown columns are ignored. */
const keyed = (raw) =>
  Object.fromEntries(Object.entries(raw).filter(([h]) => HEADER_KEYS[h]).map(([h, v]) => [HEADER_KEYS[h], v]))

/**
 * Spreadsheet rows (headers lower-cased) → { items, skipped: [{ line, reason }] }.
 * Skips rows with a missing name/unit/price, bad values, or a name/code that
 * already exists (in the catalogue or earlier in the same file).
 */
export function rowsToItems(rawRows, existing) {
  const names = new Set(existing.map((i) => i.name.toLowerCase()))
  const codes = new Set(existing.map((i) => i.code?.toLowerCase()).filter(Boolean))
  const items = []
  const skipped = []

  rawRows.forEach((raw, index) => {
    const line = raw.__line ?? index + 2
    const row = keyed(raw)
    const name = String(row.name ?? '').trim()
    const code = String(row.code ?? '').trim()
    const unit = normalizeUnit(row.unit)
    const sellPrice = toNumber(row.sellPrice)
    const skip = (reason) => skipped.push({ line, reason })

    if (!name) return skip('missing Name')
    if (!row.unit) return skip('missing Unit')
    if (!unit) return skip(`unknown Unit "${row.unit}"`)
    if (sellPrice === null) return skip('missing Sell Price')
    if (Number.isNaN(sellPrice) || sellPrice <= 0) return skip(`invalid Sell Price "${row.sellPrice}"`)
    if (names.has(name.toLowerCase())) return skip(`"${name}" already exists`)
    if (code && codes.has(code.toLowerCase())) return skip(`Product Code ${code} already used`)

    const mrp = toNumber(row.mrp)
    const purchasePrice = toNumber(row.purchasePrice)
    const gst = toNumber(row.gst)
    const stock = toNumber(row.stock)
    const multiplier = toNumber(row.conversionFactor)
    const secondaryUnit = row.secondaryUnit ? normalizeUnit(row.secondaryUnit) : ''
    const openingStockDate = toISODate(row.openingStockDate)
    const hsn = String(row.hsn ?? '').trim()

    if ([mrp, purchasePrice, gst, stock, multiplier].some((n) => Number.isNaN(n))) return skip('a number column has text in it')
    if (gst !== null && !GST_VALUES.includes(String(gst))) return skip(`GST ${gst} is not one of ${GST_VALUES.join(', ')}`)
    if (hsn && !/^\d{4}(\d{2}){0,2}$/.test(hsn)) return skip(`HSN "${hsn}" must be 4, 6 or 8 digits`)
    if (secondaryUnit === null) return skip(`unknown Sec Unit "${row.secondaryUnit}"`)
    if (secondaryUnit && (!multiplier || multiplier < 1)) return skip('Sec Unit needs a Multiplier of 1 or more')
    if (openingStockDate === null) return skip(`Opening Stock Date "${row.openingStockDate}" is not a date`)

    names.add(name.toLowerCase())
    if (code) codes.add(code.toLowerCase())
    const warehouse = WAREHOUSES.find((w) => w.label.toLowerCase() === String(row.warehouse ?? '').trim().toLowerCase())

    items.push({
      id: `itm-imp-${Date.now()}-${index}`,
      name,
      code,
      erpId: String(row.erpId ?? '').trim(),
      category: String(row.category ?? '').trim(),
      brand: String(row.brand ?? '').trim(),
      unit,
      mrp,
      sellPrice,
      sellTaxMode: truthy(row.sellWithTax) ? 'INCL' : 'EXCL',
      purchasePrice,
      purchaseTaxMode: truthy(row.purchaseWithTax) ? 'INCL' : 'EXCL',
      gst: gst ?? 0,
      cess: 0,
      hsn,
      discount: 0,
      discountType: 'AMOUNT',
      offerText: '',
      stock: Math.max(0, Math.floor(stock ?? 0)),
      openingStockDate,
      secondaryUnit,
      conversionFactor: secondaryUnit ? Math.floor(multiplier) : null,
      warehouseId: warehouse?.value ?? WAREHOUSES[0].value,
      weight: String(row.weight ?? '').trim(),
      description: '',
      images: [],
      status: String(row.status ?? '').trim().toLowerCase() === 'draft' ? 'DRAFT' : 'ACTIVE',
      updatedAt: new Date().toISOString().slice(0, 10),
    })
  })

  return { items, skipped }
}

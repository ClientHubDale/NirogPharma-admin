/**
 * Items ⇄ spreadsheet (.xlsx, and .csv with the same headers).
 * Column order follows the client's existing "sample_import_item.xlsx" so
 * files from their previous system import as-is; Warehouse and Status are
 * our additions at the end (optional).
 */
import { BUILT_IN_TIERS, hintFor } from '@/constants/priceTiers'
import { UNITS } from '@/mocks/items'

const UNIT_CODES = UNITS.map((u) => u.value)

/**
 * The columns, with one per rate column at the end. The rate columns are a
 * table now, so the sheet is built per call rather than declared once.
 */
export const itemSheetColumns = (tiers = BUILT_IN_TIERS) => [
  { key: 'name', header: 'Name', width: 34, required: true, note: 'Required. Item name, unique.' },
  { key: 'unit', header: 'Unit', width: 10, required: true, list: UNIT_CODES, note: `Required. One of: ${UNIT_CODES.join(', ')}` },
  { key: 'category', header: 'Category', width: 14 },
  { key: 'quantity', header: 'Quantity', width: 11, numFmt: '0.##', note: 'How much is in one pack. The unit follows the Category (ML, CAP, G).' },
  { key: 'code', header: 'Product Code', width: 16, note: 'Optional, must be unique.' },
  { key: 'stock', header: 'Stock', width: 10, numFmt: '0', note: 'Opening stock, in the main unit.' },
  { key: 'openingStockDate', header: 'Opening Stock Date', width: 19, numFmt: 'dd-mmm-yyyy', note: 'Date the opening stock was counted.' },
  { key: 'hsn', header: 'HSN', width: 11, note: '4, 6 or 8 digits.' },
  { key: 'mrp', header: 'MRP', width: 10, numFmt: '0.00' },
  { key: 'gst', header: 'GST', width: 8, numFmt: '0.##', note: 'GST %, without the % sign. E.g. 12' },
  { key: 'weight', header: 'Weight', width: 10 },
  { key: 'conversionFactor', header: 'Multiplier', width: 11, numFmt: '0', note: 'How many Units are in one Sec Unit (e.g. 12).' },
  { key: 'secondaryUnit', header: 'Sec Unit', width: 10, list: UNIT_CODES, note: 'Bigger pack unit, e.g. BOX. Needs Multiplier.' },
  { key: 'status', header: 'Status', width: 10, list: ['Active', 'Draft'], note: 'Active (default) or Draft.' },
  // One column per rate column. Leave a cell empty and the price follows the
  // formula (MRP × the tier's multiplier); put a number in and that price is
  // this item's own on that tier.
  ...tiers.map(({ code, label, hint, multiplier }) => ({
    key: `tier_${code}`,
    header: `Price ${label}`,
    width: 20,
    numFmt: '0.00',
    note: `Leave blank to use ${hint ?? hintFor(multiplier)}. A number here is a custom price.`,
  })),
]

/** Header (lower-cased) → field key, including headers from our earlier CSV format. */
const headerKeys = (tiers) =>
  Object.fromEntries([
    ...itemSheetColumns(tiers).map((c) => [c.header.toLowerCase(), c.key]),
    ['item name', 'name'],
    ['item code', 'code'],
    ['gst %', 'gst'],
  ])

export const ITEM_IMPORT_REQUIRED = 'Name and Unit.'

export const ITEM_SHEET_INSTRUCTIONS = [
  ['Nirog Pharma — Item import', 'Fill the "Items" sheet, one item per row. Keep the header row as it is.'],
  ['Required columns', 'Name and Unit (dark green headers). All other columns are optional.'],
  ['Unit / Sec Unit', `Use one of: ${UNIT_CODES.join(', ')}. Words like Pcs, Bottle, Strips or Box are also understood.`],
  ['Multiplier', 'Units inside one Sec Unit. Example: Unit STRIP, Sec Unit BOX, Multiplier 10 → 1 BOX = 10 STRIP.'],
  ['GST', 'The percentage without the % sign, e.g. 12 or 2.5.'],
  ['Opening Stock Date', 'Any Excel date, or DD/MM/YYYY.'],
  ['Duplicates', 'Rows whose Name or Product Code already exists are skipped and listed after import.'],
  ['File types', 'Save as .xlsx (recommended) or .csv with the same header row.'],
]

/** Example rows for Download Sample: one fully filled, one with only the required fields. */
export const ITEM_SAMPLE_ROWS = [
  {
    name: 'Nirog Levocetirizine 5 mg',
    unit: 'STRIP',
    category: 'Tablet',
    quantity: 10,
    code: 'NP-LCZ5',
    stock: 100,
    openingStockDate: new Date(),
    hsn: '30049099',
    mrp: 32,
    gst: '12',
    weight: '10 g',
    conversionFactor: 10,
    secondaryUnit: 'BOX',
    status: 'Active',
  },
  { name: 'Nirog Cough Syrup 60 ml', unit: 'BTL' },
]

export function itemsToSheetRows(items, tiers = BUILT_IN_TIERS) {
  return items.map((item) => ({
    ...item,
    gst: item.gst === null || item.gst === undefined ? '' : String(item.gst),
    openingStockDate: item.openingStockDate ? new Date(item.openingStockDate) : '',
    status: item.status === 'ACTIVE' ? 'Active' : 'Draft',
    // Only the item's own prices go out; a formula price is left blank so the
    // file round-trips without turning every row into a custom price.
    ...Object.fromEntries(
      tiers.map(({ code }) => {
        const row = (item.tierPrices ?? []).find((t) => t.tier === code)
        return [`tier_${code}`, row?.isCustom ? row.price : '']
      }),
    ),
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
const keyed = (raw, keys) => Object.fromEntries(Object.entries(raw).filter(([h]) => keys[h]).map(([h, v]) => [keys[h], v]))

/**
 * Spreadsheet rows (headers lower-cased) → { items, skipped: [{ line, reason }] }.
 * Skips rows with a missing name/unit, bad values, or a name/code that
 * already exists (in the catalogue or earlier in the same file).
 */
export function rowsToItems(rawRows, existing, tiers = BUILT_IN_TIERS) {
  const keys = headerKeys(tiers)
  const names = new Set(existing.map((i) => i.name.toLowerCase()))
  const codes = new Set(existing.map((i) => i.code?.toLowerCase()).filter(Boolean))
  const items = []
  const skipped = []

  rawRows.forEach((raw, index) => {
    const line = raw.__line ?? index + 2
    const row = keyed(raw, keys)
    const name = String(row.name ?? '').trim()
    const code = String(row.code ?? '').trim()
    const unit = normalizeUnit(row.unit)
    const skip = (reason) => skipped.push({ line, reason })

    if (!name) return skip('missing Name')
    if (!row.unit) return skip('missing Unit')
    if (!unit) return skip(`unknown Unit "${row.unit}"`)
    if (names.has(name.toLowerCase())) return skip(`"${name}" already exists`)
    if (code && codes.has(code.toLowerCase())) return skip(`Product Code ${code} already used`)

    const mrp = toNumber(row.mrp)
    const quantity = toNumber(row.quantity)
    const gst = toNumber(row.gst)
    const stock = toNumber(row.stock)
    const multiplier = toNumber(row.conversionFactor)
    const secondaryUnit = row.secondaryUnit ? normalizeUnit(row.secondaryUnit) : ''
    const openingStockDate = toISODate(row.openingStockDate)
    const hsn = String(row.hsn ?? '').trim()

    if ([mrp, quantity, gst, stock, multiplier].some((n) => Number.isNaN(n))) return skip('a number column has text in it')
    if (gst !== null && (gst < 0 || gst > 100)) return skip(`GST ${gst} is not a percentage between 0 and 100`)
    if (hsn && !/^\d{4}(\d{2}){0,2}$/.test(hsn)) return skip(`HSN "${hsn}" must be 4, 6 or 8 digits`)
    if (secondaryUnit === null) return skip(`unknown Sec Unit "${row.secondaryUnit}"`)
    if (secondaryUnit && (!multiplier || multiplier < 1)) return skip('Sec Unit needs a Multiplier of 1 or more')
    if (openingStockDate === null) return skip(`Opening Stock Date "${row.openingStockDate}" is not a date`)

    names.add(name.toLowerCase())
    if (code) codes.add(code.toLowerCase())

    items.push({
      id: `itm-imp-${Date.now()}-${index}`,
      name,
      code,
      category: String(row.category ?? '').trim(),
      unit,
      quantity,
      mrp,
      gst: gst ?? 0,
      hsn,
      offerText: '',
      stock: Math.max(0, Math.floor(stock ?? 0)),
      openingStockDate,
      secondaryUnit,
      conversionFactor: secondaryUnit ? Math.floor(multiplier) : null,
      weight: String(row.weight ?? '').trim(),
      description: '',
      images: [],
      status: String(row.status ?? '').trim().toLowerCase() === 'draft' ? 'DRAFT' : 'ACTIVE',
      // A filled tier cell is a custom price; the blanks are worked out from MRP.
      tierPrices: tiers.map(({ code }) => ({ tier: code, price: toNumber(row[`tier_${code}`]), isCustom: true })).filter(
        (t) => t.price !== null && t.price > 0,
      ),
      updatedAt: new Date().toISOString().slice(0, 10),
    })
  })

  return { items, skipped }
}

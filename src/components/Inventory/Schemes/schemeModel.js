/**
 * Scheme types, form ⇄ record conversion, validation and display helpers.
 * The form keeps every type's fields so switching type while creating
 * doesn't wipe what was typed; only the chosen type's fields are saved.
 */
import { Gift, IndianRupee, Layers } from 'lucide-react'
import { formatDisplayDate, formatINR } from '@/lib/format'

export { formatDisplayDate }

export const SCHEME_TYPES = [
  {
    value: 'BUY_X_GET_Y',
    title: 'Buy X Get Y',
    description: 'Buy N of one product, get M of another (or the same) product free or discounted.',
    icon: Gift,
  },
  {
    value: 'TIERED_QTY',
    title: 'Tiered Qty Discount',
    description: 'Per-unit discount depends on which quantity bracket the order falls into.',
    icon: Layers,
  },
  {
    value: 'AMOUNT',
    title: 'Buy Amount, Get Discount',
    description: 'Spend at least ₹N (whole cart or a product set) and get a flat or % discount.',
    icon: IndianRupee,
  },
]
export const SCHEME_TYPE_LABEL = Object.fromEntries(SCHEME_TYPES.map((t) => [t.value, t.title]))
export const SCHEME_TYPE_OPTIONS = SCHEME_TYPES.map((t) => ({ value: t.value, label: t.title }))

export const SCHEME_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export const STACKABLE_OPTIONS = [
  { value: 'no', label: 'No — locks the quantity it uses' },
  { value: 'yes', label: 'Yes — can combine with other schemes' },
]

export const QTY_DISCOUNT_TYPES = [
  { value: 'FLAT', label: 'Flat amount off per unit (₹)' },
  { value: 'PERCENT', label: 'Percentage off (%)' },
]

export const AMOUNT_DISCOUNT_TYPES = [
  { value: 'FLAT', label: 'Flat amount off (₹)' },
  { value: 'PERCENT', label: 'Percentage off (%)' },
]

export const AMOUNT_SCOPES = [
  { value: 'CART', label: 'Whole cart' },
  { value: 'PRODUCTS', label: 'Selected products only' },
]

/* ── dates ───────────────────────────────────────────── */

const pad = (n) => String(n).padStart(2, '0')
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => isoDate(new Date())
const plusOneYear = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return isoDate(d)
}

const daysBetween = (fromISO, toISO) => Math.round((new Date(toISO) - new Date(fromISO)) / 86_400_000)

/* ── form ────────────────────────────────────────────── */

export const emptyTier = () => ({ min: '', max: '', value: '' })

export const emptySchemeForm = () => ({
  type: 'BUY_X_GET_Y',
  name: '',
  partyGroup: 'all',
  priority: '100',
  stackable: 'no',
  startDate: todayISO(),
  endDate: plusOneYear(),
  status: 'ACTIVE',
  // Buy X Get Y
  buyItemId: '',
  buyQty: '2',
  getItemId: '',
  getQty: '1',
  freeDiscountPct: '100',
  // Tiered + Amount
  productIds: [],
  discountType: 'FLAT',
  tiers: [emptyTier()],
  // Amount
  scope: 'CART',
  minSpend: '',
  discountValue: '',
  maxDiscount: '',
})

const s = (v) => (v === null || v === undefined ? '' : String(v))

export const schemeToForm = (scheme) => ({
  ...emptySchemeForm(),
  ...scheme,
  priority: s(scheme.priority),
  stackable: scheme.stackable ? 'yes' : 'no',
  buyQty: s(scheme.buyQty ?? 2),
  getQty: s(scheme.getQty ?? 1),
  freeDiscountPct: s(scheme.freeDiscountPct ?? 100),
  productIds: scheme.productIds ?? [],
  tiers: scheme.tiers?.map((t) => ({ min: s(t.min), max: s(t.max), value: s(t.value) })) ?? [emptyTier()],
  minSpend: s(scheme.minSpend),
  discountValue: s(scheme.discountValue),
  maxDiscount: s(scheme.maxDiscount),
})

const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export function formToScheme(form, id) {
  const common = {
    id,
    type: form.type,
    name: form.name.trim(),
    partyGroup: form.partyGroup,
    priority: Number(form.priority),
    stackable: form.stackable === 'yes',
    startDate: form.startDate,
    endDate: form.endDate,
    status: form.status,
  }
  if (form.type === 'BUY_X_GET_Y')
    return {
      ...common,
      buyItemId: form.buyItemId,
      buyQty: n(form.buyQty),
      getItemId: form.getItemId,
      getQty: n(form.getQty),
      freeDiscountPct: n(form.freeDiscountPct),
    }
  if (form.type === 'TIERED_QTY')
    return {
      ...common,
      productIds: form.productIds,
      discountType: form.discountType,
      tiers: form.tiers
        .map((t) => ({ min: n(t.min), max: n(t.max), value: n(t.value) }))
        .sort((a, b) => a.min - b.min),
    }
  return {
    ...common,
    scope: form.scope,
    productIds: form.scope === 'PRODUCTS' ? form.productIds : [],
    minSpend: n(form.minSpend),
    discountType: form.discountType,
    discountValue: n(form.discountValue),
    maxDiscount: form.discountType === 'PERCENT' ? n(form.maxDiscount) : null,
  }
}

/* ── validation ──────────────────────────────────────── */

const isNum = (v) => v !== '' && v !== null && !Number.isNaN(Number(v))
const isWhole = (v) => isNum(v) && Number.isInteger(Number(v))

function validateTiers(form) {
  const rows = form.tiers.map(() => ({}))
  let general = ''
  const percent = form.discountType === 'PERCENT'

  form.tiers.forEach((t, i) => {
    if (!isWhole(t.min) || Number(t.min) < 1) rows[i].min = 'Whole number, 1+'
    if (t.max !== '' && (!isWhole(t.max) || Number(t.max) < Number(t.min))) rows[i].max = 'Must be ≥ min'
    if (!isNum(t.value) || Number(t.value) <= 0) rows[i].value = 'Enter a discount'
    else if (percent && Number(t.value) > 100) rows[i].value = 'Max 100%'
  })

  if (form.tiers.length === 0) general = 'Add at least one tier.'
  else if (rows.every((r) => !Object.keys(r).length)) {
    const sorted = form.tiers.map((t, i) => ({ ...t, i })).sort((a, b) => Number(a.min) - Number(b.min))
    for (let k = 0; k < sorted.length - 1; k++) {
      const a = sorted[k]
      const b = sorted[k + 1]
      if (a.max === '') {
        general = 'Only the highest tier can have no max quantity.'
        rows[a.i].max = 'Needs a max'
        break
      }
      // Sharing a boundary is fine (higher tier wins there); overlapping further isn't.
      if (Number(b.min) < Number(a.max)) {
        general = `Tiers ${a.min}–${a.max} and ${b.min}–${b.max || '∞'} overlap.`
        rows[b.i].min = `Must be ≥ ${a.max}`
        break
      }
    }
  }

  const hasRowErrors = rows.some((r) => Object.keys(r).length)
  return hasRowErrors || general ? { tiers: rows, tiersGeneral: general || 'Fix the highlighted tiers.' } : {}
}

/** Returns { field: message } (tiers: per-row objects). Empty = valid. */
export function validateSchemeForm(form, { schemes, editingId }) {
  const e = {}
  const name = form.name.trim()
  if (!name) e.name = 'Scheme name is required.'
  else if (schemes.some((sch) => sch.id !== editingId && sch.name.toLowerCase() === name.toLowerCase()))
    e.name = 'A scheme with this name already exists.'

  if (!isWhole(form.priority) || Number(form.priority) < 1 || Number(form.priority) > 999)
    e.priority = 'Whole number from 1 to 999.'

  if (!form.startDate || !form.endDate) e.window = 'Choose both a start and an end date.'
  else if (form.endDate < form.startDate) e.window = 'End date must be on or after the start date.'
  else if (!editingId && form.endDate < todayISO()) e.window = 'This window has already ended.'

  if (form.type === 'BUY_X_GET_Y') {
    if (!form.buyItemId) e.buyItemId = 'Choose the product to buy.'
    if (!isWhole(form.buyQty) || Number(form.buyQty) < 1) e.buyQty = 'Whole number, 1 or more.'
    if (!form.getItemId) e.getItemId = 'Choose the free / discounted product.'
    if (!isWhole(form.getQty) || Number(form.getQty) < 1) e.getQty = 'Whole number, 1 or more.'
    if (!isNum(form.freeDiscountPct) || Number(form.freeDiscountPct) <= 0 || Number(form.freeDiscountPct) > 100)
      e.freeDiscountPct = 'Between 1 and 100 (100 = fully free).'
  }

  if (form.type === 'TIERED_QTY') {
    if (form.productIds.length === 0) e.productIds = 'Add at least one product.'
    Object.assign(e, validateTiers(form))
  }

  if (form.type === 'AMOUNT') {
    if (form.scope === 'PRODUCTS' && form.productIds.length === 0) e.productIds = 'Add at least one product.'
    if (!isNum(form.minSpend) || Number(form.minSpend) <= 0) e.minSpend = 'Enter the minimum spend.'
    if (!isNum(form.discountValue) || Number(form.discountValue) <= 0) e.discountValue = 'Enter the discount.'
    else if (form.discountType === 'PERCENT' && Number(form.discountValue) > 100) e.discountValue = 'Max 100%.'
    else if (form.discountType === 'FLAT' && isNum(form.minSpend) && Number(form.discountValue) >= Number(form.minSpend))
      e.discountValue = 'Must be less than the minimum spend.'
    if (form.discountType === 'PERCENT' && form.maxDiscount !== '' && (!isNum(form.maxDiscount) || Number(form.maxDiscount) <= 0))
      e.maxDiscount = 'Enter a valid cap, or leave blank.'
  }
  return e
}

/* ── display ─────────────────────────────────────────── */

/** Stored status + date window → what the list shows. */
export function schemeState(scheme, today = todayISO()) {
  if (scheme.status === 'INACTIVE') return { label: 'Inactive', tone: 'neutral', note: '' }
  if (today < scheme.startDate) return { label: 'Scheduled', tone: 'warning', note: `Starts in ${daysBetween(today, scheme.startDate)} days` }
  if (today > scheme.endDate) return { label: 'Expired', tone: 'danger', note: `Ended ${formatDisplayDate(scheme.endDate)}` }
  const left = daysBetween(today, scheme.endDate)
  return { label: 'Active', tone: 'success', note: left <= 15 ? `${left} day${left === 1 ? '' : 's'} left` : '' }
}

const shortName = (item) => item?.name.replace(/^Nirog\s+/, '') ?? 'Unknown item'
const money = (v) => formatINR(v)

/** One-line summary: "Buy 10 × Paracetamol 650 mg → 1 free". */
export function describeScheme(scheme, itemsById) {
  if (scheme.type === 'BUY_X_GET_Y') {
    const buy = itemsById[scheme.buyItemId]
    const get = itemsById[scheme.getItemId]
    const reward = scheme.freeDiscountPct === 100 ? 'free' : `at ${scheme.freeDiscountPct}% off`
    const target = scheme.getItemId === scheme.buyItemId ? '' : ` ${shortName(get)}`
    return `Buy ${scheme.buyQty} × ${shortName(buy)} → ${scheme.getQty}${target} ${reward}`
  }
  if (scheme.type === 'TIERED_QTY') {
    const unit = (v) => (scheme.discountType === 'PERCENT' ? `${v}%` : `${money(v)}/unit`)
    const first = scheme.tiers[0]
    const last = scheme.tiers[scheme.tiers.length - 1]
    const count = scheme.productIds.length
    return `${count} product${count === 1 ? '' : 's'} · ${scheme.tiers.length} tier${scheme.tiers.length === 1 ? '' : 's'}: ${unit(first.value)} from ${first.min}${scheme.tiers.length > 1 ? ` up to ${unit(last.value)}` : ''}`
  }
  const off = scheme.discountType === 'PERCENT' ? `${scheme.discountValue}% off${scheme.maxDiscount ? ` (max ${money(scheme.maxDiscount)})` : ''}` : `${money(scheme.discountValue)} off`
  const on = scheme.scope === 'CART' ? 'cart' : `${scheme.productIds.length} product${scheme.productIds.length === 1 ? '' : 's'}`
  return `Spend ${money(scheme.minSpend)} on ${on} → ${off}`
}

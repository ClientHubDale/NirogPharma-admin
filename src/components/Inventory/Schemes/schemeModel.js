/**
 * Schemes: what a distributor has to do to earn something, and what they get.
 *
 * The client asked for three — "आइटम पे आइटम, अमाउंट पे आइटम, अमाउंट पे
 * अमाउंट" — but they are not three unrelated things. Every scheme is one
 * **trigger** (what earns it) paired with one **reward** (what they get):
 *
 *            │ Free item            │ Discount
 *   ─────────┼──────────────────────┼──────────────────────
 *   Item qty │ buy 24, get 5 free   │ per-unit slab discount
 *   Amount   │ spend ₹1,000 → sugar │ spend ₹25,000 → ₹750 off
 *
 * Saying it this way means a new combination is a choice on a screen rather
 * than a new type with its own form, and the fourth square falls out free.
 *
 * Both triggers are read in **slabs** — `min → reward`, the way their own
 * printed scheme sheet reads: ₹1,000 brings sugar, ₹2,000 brings rice, and
 * they are different rewards, not more of the first. One slab is the simple
 * case and is all a "buy 24 get 5" needs.
 */
import { Gift, IndianRupee, Package, Percent } from 'lucide-react'
import { formatDisplayDate, formatINR } from '@/lib/format'

export { formatDisplayDate }

/* ── what a scheme is made of ────────────────────────── */

/** What earns the scheme. */
export const SCHEME_TRIGGERS = [
  {
    value: 'ITEM_QTY',
    title: 'Item quantity',
    description: 'Buy so many of a product — counted in the product’s own selling unit.',
    icon: Package,
  },
  {
    value: 'ORDER_AMOUNT',
    title: 'Order amount',
    description: 'Spend at least so much on the order, across everything or a chosen set.',
    icon: IndianRupee,
  },
]

/** What they get for it. */
export const SCHEME_REWARDS = [
  {
    value: 'FREE_ITEM',
    title: 'A free item',
    description: 'A product off our shelf, or a giveaway like a pen or a bag.',
    icon: Gift,
  },
  {
    value: 'DISCOUNT',
    title: 'Money off',
    description: 'A flat amount or a percentage, taken off the bill.',
    icon: Percent,
  },
]

export const TRIGGER_LABEL = Object.fromEntries(SCHEME_TRIGGERS.map((t) => [t.value, t.title]))
export const REWARD_LABEL = Object.fromEntries(SCHEME_REWARDS.map((r) => [r.value, r.title]))

/**
 * The four schemes, written the way someone setting one up would say it out
 * loud, with a real example underneath.
 *
 * Underneath they are still a trigger and a reward, which is what keeps the
 * form and the engine from growing a branch per scheme — but nobody setting
 * one up should have to answer two questions to get to one answer, so the
 * screen asks once and these carry both halves.
 */
export const SCHEME_KINDS = [
  {
    value: 'ITEM_QTY:FREE_ITEM',
    trigger: 'ITEM_QTY',
    reward: 'FREE_ITEM',
    title: 'Buy items → get items free',
    example: 'Buy a 24-piece box, get 5 pieces free',
    icon: Gift,
  },
  {
    value: 'ORDER_AMOUNT:FREE_ITEM',
    trigger: 'ORDER_AMOUNT',
    reward: 'FREE_ITEM',
    title: 'Spend money → get an item free',
    example: 'Spend ₹1,000, get 1 kg sugar',
    icon: Package,
  },
  {
    value: 'ORDER_AMOUNT:DISCOUNT',
    trigger: 'ORDER_AMOUNT',
    reward: 'DISCOUNT',
    title: 'Spend money → get money off',
    example: 'Spend ₹25,000, get ₹750 off',
    icon: IndianRupee,
  },
  {
    value: 'ITEM_QTY:DISCOUNT',
    trigger: 'ITEM_QTY',
    reward: 'DISCOUNT',
    title: 'Buy items → get money off',
    example: 'Buy 50 or more, get ₹2 off each',
    icon: Percent,
  },
]

export const kindOf = (scheme) => `${scheme.trigger}:${scheme.reward}`
export const SCHEME_KIND_LABEL = Object.fromEntries(SCHEME_KINDS.map((kind) => [kind.value, kind.title]))
export const SCHEME_KIND_OPTIONS = SCHEME_KINDS.map((kind) => ({ value: kind.value, label: kind.title }))
export const splitKind = (value) => {
  const [trigger, reward] = value.split(':')
  return { trigger, reward }
}

export const SCHEME_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

export const STACKABLE_OPTIONS = [
  { value: 'no', label: 'No — locks the quantity it uses' },
  { value: 'yes', label: 'Yes — can combine with other schemes' },
]

export const DISCOUNT_TYPES = [
  { value: 'FLAT', label: 'Flat amount off (₹)' },
  { value: 'PERCENT', label: 'Percentage off (%)' },
]

export const AMOUNT_SCOPES = [
  { value: 'CART', label: 'The whole order' },
  { value: 'PRODUCTS', label: 'Only the chosen products' },
]

/* ── dates ───────────────────────────────────────────── */

const pad = (n) => String(n).padStart(2, '0')
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayISO = () => isoDate(new Date())

/** A scheme runs for a stated while — "1 महीने के अंदर अंदर", or three. */
export const VALIDITY_PRESETS = [
  { months: 1, label: '1 month' },
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 12, label: '1 year' },
]

/** The day a window that starts on `startISO` and runs `months` months ends. */
export function endAfterMonths(startISO, months) {
  const start = new Date(startISO)
  const end = new Date(start)
  end.setMonth(end.getMonth() + months)
  // The last day the scheme still counts, not the first day it does not.
  end.setDate(end.getDate() - 1)
  return isoDate(end)
}

/** Which preset a window matches, so the chosen button can look chosen. */
export const presetFor = (startISO, endISO) =>
  VALIDITY_PRESETS.find((preset) => endAfterMonths(startISO, preset.months) === endISO)?.months ?? null

const daysBetween = (fromISO, toISO) => Math.round((new Date(toISO) - new Date(fromISO)) / 86_400_000)

/* ── the form ────────────────────────────────────────── */

/**
 * One rung of the scheme: reach `min` and this is what comes with it.
 *
 * The free thing is held as one string — `item:<id>` or `gift:<id>` — so it is
 * impossible to have both at once, which is the same trick the item form uses.
 */
export const emptySlab = () => ({
  min: '',
  max: '',
  // reward = FREE_ITEM
  freeRef: '',
  freeQty: '1',
  freeDiscountPct: '100',
  // reward = DISCOUNT
  value: '',
})

export const emptySchemeForm = () => ({
  trigger: 'ITEM_QTY',
  reward: 'FREE_ITEM',
  name: '',
  partyGroup: 'all',
  priority: '100',
  stackable: 'yes',
  startDate: todayISO(),
  endDate: endAfterMonths(todayISO(), 3),
  status: 'ACTIVE',
  // trigger = ITEM_QTY
  buyItemIds: [],
  // trigger = ORDER_AMOUNT
  scope: 'CART',
  productIds: [],
  // reward = DISCOUNT
  discountType: 'FLAT',
  maxDiscount: '',
  slabs: [emptySlab()],
})

const s = (v) => (v === null || v === undefined ? '' : String(v))
const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

/** `item:<id>` / `gift:<id>` ⇄ the two ids a record carries. */
export const refOf = (slab) => (slab.freeItemId ? `item:${slab.freeItemId}` : slab.freeGiftId ? `gift:${slab.freeGiftId}` : '')
export const splitRef = (ref) => ({
  freeItemId: ref.startsWith('item:') ? ref.slice(5) : null,
  freeGiftId: ref.startsWith('gift:') ? ref.slice(5) : null,
})

export const schemeToForm = (scheme) => ({
  ...emptySchemeForm(),
  ...scheme,
  priority: s(scheme.priority),
  stackable: scheme.stackable === false ? 'no' : 'yes',
  buyItemIds: scheme.buyItemIds ?? [],
  productIds: scheme.productIds ?? [],
  maxDiscount: s(scheme.maxDiscount),
  slabs: (scheme.slabs ?? []).length
    ? scheme.slabs.map((slab) => ({
        min: s(slab.min),
        max: s(slab.max),
        freeRef: refOf(slab),
        freeQty: s(slab.freeQty ?? 1),
        freeDiscountPct: s(slab.freeDiscountPct ?? 100),
        value: s(slab.value),
      }))
    : [emptySlab()],
})

export function formToScheme(form, id) {
  const common = {
    id,
    trigger: form.trigger,
    reward: form.reward,
    name: form.name.trim(),
    partyGroup: form.partyGroup,
    priority: Number(form.priority),
    stackable: form.stackable === 'yes',
    startDate: form.startDate,
    endDate: form.endDate,
    status: form.status,
  }

  const slabs = form.slabs
    .map((slab) => ({
      min: n(slab.min),
      max: n(slab.max),
      ...(form.reward === 'FREE_ITEM'
        ? { ...splitRef(slab.freeRef), freeQty: n(slab.freeQty), freeDiscountPct: n(slab.freeDiscountPct) }
        : { value: n(slab.value) }),
    }))
    .sort((a, b) => a.min - b.min)

  return {
    ...common,
    ...(form.trigger === 'ITEM_QTY'
      ? { buyItemIds: form.buyItemIds }
      : { scope: form.scope, productIds: form.scope === 'PRODUCTS' ? form.productIds : [] }),
    ...(form.reward === 'DISCOUNT'
      ? { discountType: form.discountType, maxDiscount: form.discountType === 'PERCENT' ? n(form.maxDiscount) : null }
      : {}),
    slabs,
  }
}

/* ── validation ──────────────────────────────────────── */

const isNum = (v) => v !== '' && v !== null && !Number.isNaN(Number(v))
const isWhole = (v) => isNum(v) && Number.isInteger(Number(v))

/**
 * The rungs, checked as a ladder rather than one at a time: they may share a
 * boundary — the higher rung wins there — but they may not overlap, and only
 * the top one may run on without a ceiling.
 */
function validateSlabs(form) {
  const rows = form.slabs.map(() => ({}))
  const amount = form.trigger === 'ORDER_AMOUNT'
  const percent = form.discountType === 'PERCENT'
  let general = ''

  form.slabs.forEach((slab, i) => {
    if (amount) {
      if (!isNum(slab.min) || Number(slab.min) <= 0) rows[i].min = 'Enter an amount'
    } else if (!isWhole(slab.min) || Number(slab.min) < 1) {
      rows[i].min = 'Whole number, 1+'
    }
    if (slab.max !== '' && (!isNum(slab.max) || Number(slab.max) < Number(slab.min))) rows[i].max = 'Must be ≥ min'

    if (form.reward === 'FREE_ITEM') {
      if (!slab.freeRef) rows[i].freeRef = 'Choose what they get'
      if (!isWhole(slab.freeQty) || Number(slab.freeQty) < 1) rows[i].freeQty = 'Whole number, 1+'
      if (!isNum(slab.freeDiscountPct) || Number(slab.freeDiscountPct) <= 0 || Number(slab.freeDiscountPct) > 100)
        rows[i].freeDiscountPct = '1 to 100'
    } else {
      if (!isNum(slab.value) || Number(slab.value) <= 0) rows[i].value = 'Enter a discount'
      else if (percent && Number(slab.value) > 100) rows[i].value = 'Max 100%'
      else if (!percent && amount && isNum(slab.min) && Number(slab.value) >= Number(slab.min))
        rows[i].value = 'Must be less than the spend'
    }
  })

  if (!form.slabs.length) general = 'Add at least one slab.'
  else if (rows.every((row) => !Object.keys(row).length)) {
    const sorted = form.slabs.map((slab, i) => ({ ...slab, i })).sort((a, b) => Number(a.min) - Number(b.min))
    for (let k = 0; k < sorted.length - 1; k++) {
      const lower = sorted[k]
      const upper = sorted[k + 1]
      if (lower.max === '') {
        general = 'Only the top slab can be left open-ended.'
        rows[lower.i].max = 'Needs a limit'
        break
      }
      if (Number(upper.min) < Number(lower.max)) {
        general = `${lower.min}–${lower.max} and ${upper.min}–${upper.max || '∞'} overlap.`
        rows[upper.i].min = `Must be ≥ ${lower.max}`
        break
      }
    }
  }

  const broken = rows.some((row) => Object.keys(row).length)
  return broken || general ? { slabs: rows, slabsGeneral: general || 'Fix the highlighted slabs.' } : {}
}

/** Returns { field: message } — `slabs` is an array of per-row objects. Empty = valid. */
export function validateSchemeForm(form, { schemes, editingId }) {
  const e = {}
  const name = form.name.trim()
  if (!name) e.name = 'Give the scheme a name.'
  else if (schemes.some((row) => row.id !== editingId && row.name.toLowerCase() === name.toLowerCase()))
    e.name = 'A scheme with this name already exists.'

  if (!isWhole(form.priority) || Number(form.priority) < 1 || Number(form.priority) > 999)
    e.priority = 'Whole number from 1 to 999.'

  if (!form.startDate || !form.endDate) e.window = 'Choose when it starts and when it ends.'
  else if (form.endDate < form.startDate) e.window = 'It cannot end before it starts.'
  else if (!editingId && form.endDate < todayISO()) e.window = 'That window has already passed.'

  if (form.trigger === 'ITEM_QTY' && !form.buyItemIds.length) e.buyItemIds = 'Choose which product earns it.'
  if (form.trigger === 'ORDER_AMOUNT' && form.scope === 'PRODUCTS' && !form.productIds.length)
    e.productIds = 'Choose which products the amount counts across.'

  if (form.reward === 'DISCOUNT' && form.discountType === 'PERCENT' && form.maxDiscount !== '' && !isNum(form.maxDiscount))
    e.maxDiscount = 'Enter a cap, or leave it blank.'

  Object.assign(e, validateSlabs(form))
  return e
}

/* ── display ─────────────────────────────────────────── */

/** Stored status + the window → what the list shows today. */
export function schemeState(scheme, today = todayISO()) {
  if (scheme.status === 'INACTIVE') return { label: 'Inactive', tone: 'neutral', note: '' }
  if (today < scheme.startDate)
    return { label: 'Scheduled', tone: 'warning', note: `Starts in ${daysBetween(today, scheme.startDate)} days` }
  if (today > scheme.endDate) return { label: 'Expired', tone: 'danger', note: `Ended ${formatDisplayDate(scheme.endDate)}` }
  const left = daysBetween(today, scheme.endDate)
  return { label: 'Active', tone: 'success', note: left <= 15 ? `${left} day${left === 1 ? '' : 's'} left` : '' }
}

const shortName = (thing) => thing?.name?.replace(/^Nirog\s+/, '') ?? '(removed)'
const money = (v) => formatINR(v)

/** What one slab gives, in words. */
export function describeSlab(scheme, slab, { itemsById = {}, giftsById = {} } = {}) {
  if (scheme.reward === 'FREE_ITEM') {
    const thing = slab.freeItemId ? itemsById[slab.freeItemId] : giftsById[slab.freeGiftId]
    const how = slab.freeDiscountPct === 100 ? 'free' : `at ${slab.freeDiscountPct}% off`
    // "10 KG Sugar", not "10 × Sugar" — ten of something sold by weight is a
    // different promise from ten pieces of it.
    const unit = thing?.unit ? `${thing.unit} ` : '× '
    return `${slab.freeQty} ${unit}${shortName(thing)} ${how}`
  }
  const off = scheme.discountType === 'PERCENT' ? `${slab.value}% off` : `${money(slab.value)} off`
  const cap = scheme.discountType === 'PERCENT' && scheme.maxDiscount ? ` (max ${money(scheme.maxDiscount)})` : ''
  return `${off}${cap}`
}

/** The threshold a slab starts at, written the way its trigger reads. */
export const describeThreshold = (scheme, slab) =>
  scheme.trigger === 'ORDER_AMOUNT' ? money(slab.min) : `${slab.min} unit${slab.min === 1 ? '' : 's'}`

/**
 * The stretch a slab covers — "24–47", "60+", "₹1,000–₹1,999".
 *
 * Naming both ends matters once there are three rungs: a reader who is only
 * shown the first and the last cannot tell what the middle one does, and a
 * scheme nobody can read back is a scheme nobody can check.
 */
export function describeRange(scheme, slab) {
  const amount = scheme.trigger === 'ORDER_AMOUNT'
  const from = amount ? money(slab.min) : String(slab.min)
  if (slab.max === null || slab.max === undefined || slab.max === '') return `${from}+`
  return `${from}–${amount ? money(slab.max) : slab.max}`
}

/** One line for the list: "Buy 24 × Vir 60gm → 5 × Vir 10gm free". */
export function describeScheme(scheme, itemsById = {}, giftsById = {}) {
  const slabs = scheme.slabs ?? []
  if (!slabs.length) return 'No slabs yet'

  /**
   * Naming more than one product does not mean "either one will do": the
   * quantities are **added together** before the slabs are read, so 15 of one
   * and 12 of the other reaches 27. Saying "any of 2 products" read as though
   * each stood alone, which is the opposite of what the engine does.
   */
  const earned = (ids, join) => {
    // A product that is no longer in the catalogue earns nothing, so it is
    // left out of the sentence rather than spelled out at length. The editor
    // still shows it as a chip, which is where it can actually be removed.
    const names = (ids ?? []).map((id) => itemsById[id]).filter(Boolean).map(shortName)
    if (!names.length) return 'nothing yet'
    if (names.length === 1) return names[0]
    if (names.length <= 3) return `${names.join(' + ')} ${join}`
    return `${names.length} products ${join}`
  }

  const earns =
    scheme.trigger === 'ITEM_QTY'
      ? `Buy ${earned(scheme.buyItemIds, 'together')}`
      : `Spend on ${scheme.scope === 'CART' ? 'the order' : earned(scheme.productIds, 'together')}`

  if (slabs.length === 1) {
    const only = slabs[0]
    // A single quantity rung stands: every lot of that many earns it again.
    const standing = scheme.trigger === 'ITEM_QTY' ? ', and again every ' + only.min : ''
    return `${earns} ${describeThreshold(scheme, only)} → ${describeSlab(scheme, only, { itemsById, giftsById })}${standing}`
  }

  // Every rung, not the first and the last: the ones in between are exactly
  // the ones a reader would otherwise have to open the scheme to find out.
  const rungs = slabs.map(
    (slab) => `${describeRange(scheme, slab)} → ${describeSlab(scheme, slab, { itemsById, giftsById })}`,
  )
  const shown = rungs.length <= 4 ? rungs : [...rungs.slice(0, 3), `+${rungs.length - 3} more`]
  return `${earns} · ${shown.join(' · ')}`
}


/**
 * The rung this document has not reached, and how far short it is.
 *
 * The distributor cannot want what he does not know about — "यूज़र को पता कैसे
 * चलेगा कि [और] डालेगा तो यह मिलने वाला है" — so the next rung up is worked
 * out from the same slabs the server reads and shown while he is still typing.
 *
 * `reachedFor(scheme)` says how far this document has got on that scheme's own
 * terms: a quantity for an item scheme, an amount for a spend one.
 */
export function nextRung(scheme, reached, { itemsById = {}, giftsById = {} } = {}) {
  const slabs = [...(scheme.slabs ?? [])].sort((a, b) => Number(a.min) - Number(b.min))
  const up = slabs.find((slab) => reached < Number(slab.min))
  if (!up) return null

  return {
    schemeId: scheme.id,
    kind: scheme.trigger === 'ORDER_AMOUNT' ? 'AMOUNT' : 'QTY',
    short: Math.round((Number(up.min) - reached) * 100) / 100,
    gives: describeSlab(scheme, up, { itemsById, giftsById }),
  }
}

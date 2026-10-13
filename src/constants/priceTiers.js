/**
 * The client's rate columns: every distributor is on one of them, and an item's
 * price for that distributor is its MRP times the tier's multiplier.
 *
 * The list itself lives in the database now — the admin adds a column from the
 * item form — and reaches the panel through `usePriceTiers()`. What stays here
 * is the arithmetic, which must match NirogPharma-backend/src/utils/priceTiers.js
 * exactly, and the four the business started with, as a fallback for the moment
 * before the list has loaded.
 *
 * Multipliers are integers out of 10,000 and the sum is done in paise, because
 * 345 × 0.495 is 170.77499… in binary floating point and would round down to
 * 170.77; in paise it is 170.775 → 170.78, which is what the sheet says.
 */
export const DEFAULT_PRICE_TIER = 'MRP'

export const BUILT_IN_TIERS = [
  { code: 'MRP', label: 'Default — full MRP', hint: '1 × MRP', multiplier: 10000, discounts: [], isBuiltIn: true },
  { code: 'D50_12', label: '−50% −12%', hint: '0.44 × MRP', multiplier: 4400, discounts: [50, 12], isBuiltIn: true },
  { code: 'D50_15', label: '−50% −15%', hint: '0.425 × MRP', multiplier: 4250, discounts: [50, 15], isBuiltIn: true },
  { code: 'D45_10', label: '−45% −10%', hint: '0.495 × MRP', multiplier: 4950, discounts: [45, 10], isBuiltIn: true },
]

/**
 * A discount chain as a multiplier out of 10,000. The steps are applied one
 * after the other, not added up: −50% then −12% is 0.5 × 0.88 = 0.44, not 0.38.
 */
export function multiplierFromDiscounts(discounts = []) {
  return discounts.reduce((multiplier, percent) => Math.round((multiplier * (100 - percent)) / 100), 10000)
}

/** "−50% −12%", the way the client's sheet heads the column. */
export const labelFromDiscounts = (discounts = []) =>
  discounts.length ? discounts.map((percent) => `−${percent}%`).join(' ') : 'Default — full MRP'

/** "0.44 × MRP" — what the multiplier means, for the hint under a label. */
export const hintFor = (multiplier) => `${Number((multiplier / 10000).toFixed(4))} × MRP`

/** The price itself: MRP in paise, times the multiplier, back to rupees. */
export function priceWith(mrp, multiplier) {
  const value = Number(mrp)
  if (multiplier === undefined || multiplier === null || !Number.isFinite(value) || value <= 0) return null

  const paise = Math.round(value * 100)
  return Math.round((paise * multiplier) / 10000) / 100
}

/**
 * What a distributor on `tier` pays for an item with this MRP.
 * Returns null when there is no MRP to work from — an item with no price is not
 * an item priced at zero.
 */
export function priceFor(mrp, tier, tiers = BUILT_IN_TIERS) {
  return priceWith(mrp, tiers.find((row) => row.code === tier)?.multiplier)
}

/** For a SelectField: the discount reads first, the multiplier is the hint. */
export const tierOptions = (tiers) => tiers.map(({ code, label, hint }) => ({ value: code, label, hint }))
export const tierLabels = (tiers) => Object.fromEntries(tiers.map((tier) => [tier.code, tier.label]))

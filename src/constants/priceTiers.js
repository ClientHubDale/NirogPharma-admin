/**
 * The client's rate columns: every distributor is on one of them, and an item's
 * price for that distributor is its MRP times the tier's multiplier.
 *
 * Keep in step with NirogPharma-backend/src/utils/priceTiers.js — the server
 * does the same sum when an order is priced. Nothing else may restate a
 * multiplier.
 *
 * Multipliers are integers out of 10,000 and the sum is done in paise, because
 * 345 × 0.495 is 170.77499… in binary floating point and would round down to
 * 170.77; in paise it is 170.775 → 170.78, which is what the sheet says.
 */
export const PRICE_TIERS = [
  { value: 'MRP', label: 'Default — full MRP', hint: '1.0 × MRP', multiplier: 10000 },
  { value: 'D50_12', label: '−50% −12%', hint: '0.44 × MRP', multiplier: 4400 },
  { value: 'D50_15', label: '−50% −15%', hint: '0.425 × MRP', multiplier: 4250 },
  { value: 'D45_10', label: '−45% −10%', hint: '0.495 × MRP', multiplier: 4950 },
]

/** For a SelectField: the discount reads first, the multiplier is the hint. */
export const PRICE_TIER_OPTIONS = PRICE_TIERS.map(({ value, label, hint }) => ({ value, label, hint }))

export const PRICE_TIER_VALUES = PRICE_TIERS.map((tier) => tier.value)
export const PRICE_TIER_LABEL = Object.fromEntries(PRICE_TIERS.map((tier) => [tier.value, tier.label]))
export const DEFAULT_PRICE_TIER = 'MRP'

const multiplierOf = (tier) => PRICE_TIERS.find((t) => t.value === tier)?.multiplier

/**
 * What a distributor on `tier` pays for an item with this MRP.
 * Returns null when there is no MRP to work from — an item with no price is not
 * an item priced at zero.
 */
export function priceFor(mrp, tier) {
  const m = multiplierOf(tier)
  const value = Number(mrp)
  if (m === undefined || !Number.isFinite(value) || value <= 0) return null

  const paise = Math.round(value * 100)
  return Math.round((paise * m) / 10000) / 100
}

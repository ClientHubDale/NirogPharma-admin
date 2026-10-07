import { RotateCcw } from 'lucide-react'
import { Switch } from '@/components/form/Switch'
import { TextField } from '@/components/form/TextField'
import { PRICE_TIERS, priceFor } from '@/constants/priceTiers'
import { cn } from '@/lib/utils'

/**
 * What this item costs on each of the client's rate columns.
 *
 * Each row starts as the formula — MRP times the tier's multiplier — and
 * follows the MRP as it is typed. Typing in a row makes it the admin's own
 * number ("Custom"), which the formula then leaves alone until it is reset.
 *
 * Confectionery is sold at one rate whoever buys it, so the toggle collapses
 * all four into a single price.
 */
export function TierPrices({ mrp, flat, tierPrices, onChange, onFlatChange }) {
  const hasMrp = Number(mrp) > 0
  const money = (value) => value.replace(/[^\d.]/g, '')

  /** The price to show: the admin's own, else the formula, else nothing. */
  const shown = (tier) => {
    const own = tierPrices[tier]
    if (own?.isCustom) return own.price
    const price = priceFor(mrp, tier)
    return price === null ? '' : String(price)
  }

  const setPrice = (tier, value) => onChange({ ...tierPrices, [tier]: { price: value, isCustom: true } })

  const reset = (tier) => {
    const next = { ...tierPrices }
    delete next[tier]
    onChange(next)
  }

  const flatPrice = Object.values(tierPrices)[0]?.price ?? ''

  return (
    <div className="sm:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Tier prices</p>
          <p className="text-xs text-ink-muted">What each kind of distributor pays. Filled in from the MRP; type to override.</p>
        </div>
        <Switch
          id="item-flat-tier"
          checked={flat}
          onCheckedChange={onFlatChange}
          label="Same price for all tiers"
        />
      </div>

      {flat ? (
        <TextField
          id="item-tier-flat"
          label="Price for every tier"
          size="md"
          prefix="₹"
          inputMode="decimal"
          placeholder="0"
          value={flatPrice}
          onChange={(e) => {
            const value = money(e.target.value)
            onChange(Object.fromEntries(PRICE_TIERS.map(({ value: tier }) => [tier, { price: value, isCustom: true }])))
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-mint-pale">
          {PRICE_TIERS.map(({ value: tier, label, hint }, index) => {
            const custom = Boolean(tierPrices[tier]?.isCustom)
            return (
              <div
                key={tier}
                className={cn(
                  'flex flex-wrap items-center gap-3 px-3.5 py-2.5 sm:flex-nowrap',
                  index > 0 && 'border-t border-mint-pale',
                  custom && 'bg-bg',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {label}
                    {custom && (
                      <span className="rounded-full bg-mint-pale px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-forest uppercase">
                        Custom
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-muted">{hint}</p>
                </div>

                {hasMrp ? (
                  <div className="flex items-center gap-2">
                    <TextField
                      id={`item-tier-${tier}`}
                      aria-label={`${label} price`}
                      size="md"
                      prefix="₹"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-36"
                      value={shown(tier)}
                      onChange={(e) => setPrice(tier, money(e.target.value))}
                    />
                    <button
                      type="button"
                      onClick={() => reset(tier)}
                      disabled={!custom}
                      title="Back to the formula"
                      aria-label={`Reset ${label} to the formula`}
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-bg hover:text-green-deep disabled:pointer-events-none disabled:opacity-0"
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-ink-muted">—</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

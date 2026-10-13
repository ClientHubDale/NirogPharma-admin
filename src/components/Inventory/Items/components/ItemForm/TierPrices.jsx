import { useState } from 'react'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Switch } from '@/components/form/Switch'
import { TextField } from '@/components/form/TextField'
import { hintFor, labelFromDiscounts, multiplierFromDiscounts, priceWith } from '@/constants/priceTiers'
import { cn } from '@/lib/utils'

/**
 * What this item costs on each of the client's rate columns.
 *
 * Each row starts as the formula — MRP times the tier's multiplier — and
 * follows the MRP as it is typed. Typing in a row makes it the admin's own
 * number ("Custom"), which the formula then leaves alone until it is reset.
 *
 * Confectionery is sold at one rate whoever buys it, so the toggle collapses
 * them into a single price.
 *
 * The columns themselves are a table, not a fixed list: "+ New" adds one here
 * and it appears on every item at once. The four the business started with are
 * built in and cannot be removed.
 */
export function TierPrices({ mrp, flat, tierPrices, tiers, onChange, onFlatChange, onAddTier, onRemoveTier }) {
  const [adding, setAdding] = useState(false)
  const hasMrp = Number(mrp) > 0
  const money = (value) => value.replace(/[^\d.]/g, '')

  /** The price to show: the admin's own, else the formula, else nothing. */
  const shown = (tier) => {
    const own = tierPrices[tier.code]
    if (own?.isCustom) return own.price
    const price = priceWith(mrp, tier.multiplier)
    return price === null ? '' : String(price)
  }

  const setPrice = (code, value) => onChange({ ...tierPrices, [code]: { price: value, isCustom: true } })

  const reset = (code) => {
    const next = { ...tierPrices }
    delete next[code]
    onChange(next)
  }

  const flatPrice = Object.values(tierPrices)[0]?.price ?? ''

  return (
    <div className="sm:col-span-2">
      {/* The heading gives way, not the controls: with "+ New" beside the
          toggle the row is wide enough to wrap, and the toggle would drop
          under the text. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Tier prices</p>
          <p className="text-xs text-ink-muted">What each kind of distributor pays. Filled in from the MRP; type to override.</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {onAddTier && !flat && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              aria-label="Add rate column"
              className="inline-flex items-center gap-1 text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
            >
              <Plus className="size-3.5" /> New
            </button>
          )}
          <Switch id="item-flat-tier" checked={flat} onCheckedChange={onFlatChange} label="Same price for all tiers" />
        </div>
      </div>

      {adding && <NewTier mrp={mrp} onCancel={() => setAdding(false)} onAdd={onAddTier} />}

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
            onChange(Object.fromEntries(tiers.map(({ code }) => [code, { price: value, isCustom: true }])))
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-mint-pale">
          {tiers.map((tier, index) => {
            const { code, label, isBuiltIn } = tier
            const custom = Boolean(tierPrices[code]?.isCustom)
            return (
              <div
                key={code}
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
                  <p className="text-xs text-ink-muted">{tier.hint ?? hintFor(tier.multiplier)}</p>
                </div>

                {hasMrp ? (
                  <div className="flex items-center gap-2">
                    <TextField
                      id={`item-tier-${code}`}
                      aria-label={`${label} price`}
                      size="md"
                      prefix="₹"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-36"
                      value={shown(tier)}
                      onChange={(e) => setPrice(code, money(e.target.value))}
                    />
                    <button
                      type="button"
                      onClick={() => reset(code)}
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

                {/* Only the admin's own columns can go, and only when nothing
                    uses them — the server has the last word on that. */}
                <button
                  type="button"
                  onClick={() => onRemoveTier?.(tier)}
                  title={isBuiltIn ? 'One of the four original rate columns' : 'Remove this rate column'}
                  aria-label={`Remove ${label}`}
                  disabled={isBuiltIn || !onRemoveTier}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-0"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * The discounts the client quotes, in the order they are applied. They chain —
 * −20% then −10% is 0.72 × MRP, not 0.70 — so the preview does the sum before
 * anything is saved.
 */
function NewTier({ mrp, onCancel, onAdd }) {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const digits = (value) => value.replace(/\D/g, '').slice(0, 2)
  const discounts = [first, second].map(Number).filter((n) => Number.isInteger(n) && n > 0 && n < 100)
  const multiplier = multiplierFromDiscounts(discounts)
  const preview = priceWith(Number(mrp) > 0 ? mrp : 100, multiplier)

  const submit = async () => {
    if (!discounts.length) return setError('Enter at least one discount.')
    setBusy(true)
    const failed = await onAdd({ discounts, label: labelFromDiscounts(discounts) })
    setBusy(false)
    if (failed) return setError(failed)
    onCancel()
  }

  return (
    <div className="mb-3 rounded-xl border border-green-fresh bg-bg p-3.5">
      <p className="mb-2.5 text-sm font-semibold text-ink">New rate column</p>
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          id="tier-discount-1"
          label="Discount"
          size="md"
          suffix={<span className="flex h-full items-center border-l border-mint-pale px-3 text-sm font-medium text-ink-muted">%</span>}
          className="w-32"
          inputMode="numeric"
          placeholder="20"
          value={first}
          onChange={(e) => {
            setFirst(digits(e.target.value))
            setError('')
          }}
        />
        <TextField
          id="tier-discount-2"
          label="Then"
          size="md"
          suffix={<span className="flex h-full items-center border-l border-mint-pale px-3 text-sm font-medium text-ink-muted">%</span>}
          className="w-32"
          inputMode="numeric"
          placeholder="10"
          value={second}
          onChange={(e) => {
            setSecond(digits(e.target.value))
            setError('')
          }}
        />
        <div className="flex items-center gap-2 pb-0.5">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="h-11 rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-black/85 disabled:opacity-60"
          >
            {busy ? 'Adding…' : 'Add column'}
          </button>
          <button type="button" onClick={onCancel} className="h-11 rounded-lg px-3 text-sm font-semibold text-ink-muted hover:bg-white">
            Cancel
          </button>
        </div>
      </div>

      <p className="mt-2.5 text-xs text-ink-muted">
        {discounts.length ? (
          <>
            <span className="font-semibold text-ink">{labelFromDiscounts(discounts)}</span> · {hintFor(multiplier)} ·{' '}
            ₹{Number(mrp) > 0 ? mrp : 100} → <span className="font-semibold text-green-deep">₹{preview}</span>
          </>
        ) : (
          'Discounts apply one after the other: 50 then 12 is 0.44 × MRP, not 0.38.'
        )}
      </p>
      {error && <p className="mt-1.5 text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}

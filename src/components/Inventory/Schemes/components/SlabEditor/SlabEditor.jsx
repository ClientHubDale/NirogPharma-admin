import { useState } from 'react'
import { Gift, Info, Plus, Trash2 } from 'lucide-react'
import { NewGift } from '@/components/form/NewGift'
import { SearchSelect } from '@/components/form/SearchSelect'
import { cn } from '@/lib/utils'
import { emptySlab } from '../../schemeModel'

/** A boxed input that matches the rest of the form without a floating label. */
function Cell({ value, onChange, placeholder, error, prefix, suffix, label, digitsOnly }) {
  return (
    <div className="min-w-0">
      <div
        className={cn(
          'flex h-10 items-center overflow-hidden rounded-lg border bg-white',
          error ? 'border-destructive' : 'border-mint focus-within:border-green-fresh focus-within:ring-3 focus-within:ring-ring/25',
        )}
      >
        {prefix && <span className="pl-3 text-sm text-ink-muted">{prefix}</span>}
        <input
          value={value}
          inputMode="decimal"
          aria-label={label}
          aria-invalid={Boolean(error)}
          placeholder={placeholder}
          onChange={(e) => onChange(digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value.replace(/[^\d.]/g, ''))}
          className="h-full w-full min-w-0 bg-transparent px-3 text-sm outline-none placeholder:text-ink-muted/60"
        />
        {suffix && <span className="pr-3 text-sm text-ink-muted">{suffix}</span>}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

/**
 * The rungs of a scheme: reach this much, get that.
 *
 * It is one editor for all four kinds of scheme because the shape never
 * changes — only the words do. The threshold is a quantity or an amount
 * depending on what triggers the scheme, and the right-hand side is either a
 * free thing or money off. Writing it once means a new combination needs no
 * new screen.
 *
 * Slabs may share a boundary; at that exact figure the higher one wins.
 */
export function SlabEditor({ slabs, onChange, trigger, reward, discountType, freeOptions, onAddGift, errors = [], generalError }) {
  /**
   * Which row is waiting for a new giveaway — `-1` when none is.
   *
   * A kilo of sugar is not in the catalogue and never will be — it is not
   * made, priced or stocked — so the only place to put it is here, at the
   * moment somebody needs it. Created, it drops straight into the row that
   * asked, because that is plainly what was wanted.
   */
  const [addingFor, setAddingFor] = useState(null)
  const amount = trigger === 'ORDER_AMOUNT'
  const percent = discountType === 'PERCENT'
  const free = reward === 'FREE_ITEM'

  const update = (index, field, value) => onChange(slabs.map((slab, i) => (i === index ? { ...slab, [field]: value } : slab)))

  const add = () => {
    const last = slabs[slabs.length - 1]
    onChange([...slabs, { ...emptySlab(), min: last?.max ? String(last.max) : '' }])
  }

  const thresholdLabel = amount ? 'Spend from (₹)' : 'Buy from (qty)'
  const ceilingLabel = amount ? 'Up to (blank = no limit)' : 'Up to qty (blank = no limit)'

  // Free-item slabs need three fields on the right, discount slabs only one.
  const grid = free
    ? 'sm:grid-cols-[1fr_1fr_1.6fr_5rem_5.5rem_2.5rem]'
    : 'sm:grid-cols-[1fr_1fr_1fr_2.5rem]'

  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-sm font-semibold text-ink">
        {amount ? 'Spend slabs' : 'Quantity slabs'} <span className="text-danger">*</span>
      </p>

      {addingFor !== null && (
        <NewGift
          onCancel={() => setAddingFor(null)}
          onAdd={onAddGift}
          onPicked={(id) => {
            // Into the first row still asking for something; if every row is
            // already filled it simply joins the list to be picked from.
            if (addingFor >= 0) update(addingFor, 'freeRef', `gift:${id}`)
          }}
        />
      )}

      <div className="rounded-xl border border-mint-pale">
        <div className={cn('hidden gap-3 border-b border-mint-pale bg-bg px-3 py-2 text-xs font-semibold tracking-wide text-ink-muted uppercase sm:grid', grid)}>
          <span>{thresholdLabel}</span>
          <span>{ceilingLabel}</span>
          {free ? (
            <>
              <span>They get</span>
              <span>Qty</span>
              <span>% off</span>
            </>
          ) : (
            <span>{percent ? 'Discount (%)' : 'Discount (₹)'}</span>
          )}
          <span />
        </div>

        <ol className="divide-y divide-mint-pale">
          {slabs.map((slab, i) => (
            <li key={i} className={cn('grid grid-cols-2 gap-3 p-3 sm:items-start', grid)}>
              <Cell
                label={`Slab ${i + 1} ${thresholdLabel}`}
                placeholder={amount ? 'e.g. 1000' : 'e.g. 24'}
                prefix={amount ? '₹' : undefined}
                digitsOnly={!amount}
                value={slab.min}
                onChange={(v) => update(i, 'min', v)}
                error={errors[i]?.min}
              />
              <Cell
                label={`Slab ${i + 1} ceiling`}
                placeholder="No limit"
                prefix={amount ? '₹' : undefined}
                digitsOnly={!amount}
                value={slab.max}
                onChange={(v) => update(i, 'max', v)}
                error={errors[i]?.max}
              />

              {free ? (
                <>
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <SearchSelect
                      id={`slab-${i}-free`}
                      aria-label={`What slab ${i + 1} gives`}
                      options={freeOptions}
                      value={slab.freeRef}
                      limit={10}
                      placeholder="Product or giveaway…"
                      invalid={Boolean(errors[i]?.freeRef)}
                      onChange={(v) => update(i, 'freeRef', v)}
                    />
                    {errors[i]?.freeRef && <p className="mt-1 text-xs font-medium text-destructive">{errors[i].freeRef}</p>}
                  </div>
                  {/* The unit comes from the thing being given, never typed:
                      10 of a giveaway counted in KG is 10 KG, and showing it
                      here is the only way to tell that from 10 pieces. */}
                  <Cell
                    label={`Slab ${i + 1} free quantity`}
                    placeholder="1"
                    digitsOnly
                    value={slab.freeQty}
                    onChange={(v) => update(i, 'freeQty', v)}
                    error={errors[i]?.freeQty}
                    suffix={freeOptions.find((option) => option.value === slab.freeRef)?.unit}
                  />
                  <Cell
                    label={`Slab ${i + 1} discount on the free item`}
                    placeholder="100"
                    suffix="%"
                    value={slab.freeDiscountPct}
                    onChange={(v) => update(i, 'freeDiscountPct', v)}
                    error={errors[i]?.freeDiscountPct}
                  />
                </>
              ) : (
                <Cell
                  label={`Slab ${i + 1} discount`}
                  placeholder={percent ? 'e.g. 5' : 'e.g. 750'}
                  prefix={percent ? undefined : '₹'}
                  suffix={percent ? '%' : undefined}
                  value={slab.value}
                  onChange={(v) => update(i, 'value', v)}
                  error={errors[i]?.value}
                />
              )}

              <button
                type="button"
                onClick={() => onChange(slabs.filter((_, k) => k !== i))}
                disabled={slabs.length === 1}
                aria-label={`Remove slab ${i + 1}`}
                className="grid h-10 w-10 place-items-center justify-self-end rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-2 border-t border-mint-pale p-3">
          <button
            type="button"
            id="scheme-add-slab"
            onClick={add}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-green-soft px-3.5 py-2 text-sm font-semibold text-green-deep hover:bg-mint-pale"
          >
            <Plus className="size-4" /> Add slab
          </button>
          {free && onAddGift && (
            <button
              type="button"
              id="scheme-new-gift"
              onClick={() => setAddingFor(slabs.findIndex((row) => !row.freeRef))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-green-soft px-3.5 py-2 text-sm font-semibold text-green-deep hover:bg-mint-pale"
            >
              <Gift className="size-4" /> New giveaway
            </button>
          )}
        </div>
      </div>

      {generalError && <p className="mt-1.5 text-sm font-medium text-destructive">{generalError}</p>}
      <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {amount
          ? 'Each slab can give something different — ₹1,000 a bag of sugar, ₹2,000 a bag of rice. At a shared boundary the higher slab wins.'
          : 'At a shared boundary (say exactly 10, with 5–10 and 10–15) the higher slab wins.'}
      </p>
    </div>
  )
}

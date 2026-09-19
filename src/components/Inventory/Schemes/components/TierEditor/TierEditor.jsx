import { Info, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { emptyTier } from '../../schemeModel'

function Cell({ value, onChange, placeholder, error, prefix, suffix, label }) {
  return (
    <div>
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
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          className="h-full w-full min-w-0 bg-transparent px-3 text-sm outline-none placeholder:text-ink-muted/60"
        />
        {suffix && <span className="pr-3 text-sm text-ink-muted">{suffix}</span>}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

/**
 * Quantity brackets: Min qty · Max qty (blank = no limit) · Discount.
 * Tiers may share a boundary; the higher tier wins at that exact quantity.
 */
export function TierEditor({ tiers, onChange, discountType, errors = [], generalError }) {
  const percent = discountType === 'PERCENT'
  const update = (i, field, value) => onChange(tiers.map((t, k) => (k === i ? { ...t, [field]: value } : t)))
  const add = () => {
    const last = tiers[tiers.length - 1]
    onChange([...tiers, { ...emptyTier(), min: last?.max ? String(last.max) : '' }])
  }

  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-sm font-semibold text-ink">
        Quantity tiers<span className="text-danger">*</span>
      </p>
      <div className="rounded-xl border border-mint-pale">
        <div className="hidden grid-cols-[1fr_1fr_1fr_2.5rem] gap-3 border-b border-mint-pale bg-bg px-3 py-2 text-xs font-semibold tracking-wide text-ink-muted uppercase sm:grid">
          <span>Min qty</span>
          <span>Max qty (blank = no limit)</span>
          <span>{percent ? 'Discount (%)' : 'Discount per unit (₹)'}</span>
          <span />
        </div>
        <ol className="divide-y divide-mint-pale">
          {tiers.map((tier, i) => (
            <li key={i} className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-[1fr_1fr_1fr_2.5rem] sm:items-start">
              <Cell label={`Tier ${i + 1} min qty`} placeholder="Min" value={tier.min} onChange={(v) => update(i, 'min', v)} error={errors[i]?.min} />
              <Cell label={`Tier ${i + 1} max qty`} placeholder="No limit" value={tier.max} onChange={(v) => update(i, 'max', v)} error={errors[i]?.max} />
              <Cell
                label={`Tier ${i + 1} discount`}
                placeholder={percent ? 'e.g. 5' : 'e.g. 2'}
                prefix={percent ? undefined : '₹'}
                suffix={percent ? '%' : undefined}
                value={tier.value}
                onChange={(v) => update(i, 'value', v)}
                error={errors[i]?.value}
              />
              <button
                type="button"
                onClick={() => onChange(tiers.filter((_, k) => k !== i))}
                disabled={tiers.length === 1}
                aria-label={`Remove tier ${i + 1}`}
                className="grid h-10 w-10 place-items-center justify-self-end rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-30"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ol>
        <div className="border-t border-mint-pale p-3">
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-green-soft px-3.5 py-2 text-sm font-semibold text-green-deep hover:bg-mint-pale"
          >
            <Plus className="size-4" /> Add tier
          </button>
        </div>
      </div>
      {generalError && <p className="mt-1.5 text-sm font-medium text-destructive">{generalError}</p>}
      <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        At a shared boundary (e.g. exactly 10, with brackets 5–10 and 10–15) the higher tier wins.
      </p>
    </div>
  )
}

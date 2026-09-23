import { Minus, RotateCcw } from 'lucide-react'
import { StatusPill } from '@/components/data/StatusPill'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isEdited, monthLabel, PAID_MODES, PAYOUT_LINES, PAYOUT_STATUS, payoutTotals } from '../../payoutModel'

/** How each line was worked out — shown under its name, so a wrong figure is easy to spot. */
const workingOut = (key, calc, user) => {
  if (key === 'salary') return `${formatPrice(user.salary || 0)} × ${calc.presentDays} of ${calc.workingDays} working days`
  if (key === 'ta') return `${calc.distanceKm} km × ${formatPrice(user.taPerKm || 0)} per km`
  if (key === 'da') return `${calc.presentDays} days × ${formatPrice(user.daPerDay || 0)} per day`
  return `${user.incentivePercent || 0}% of ${formatPrice(calc.soldValue)} sold`
}

/**
 * The payout bill: every calculated line with an input beside it, so the admin
 * can correct a mistake without losing what the system worked out.
 */
export function PayoutEditor({ draft, calculated, user, errors, onChange, locked }) {
  const totals = payoutTotals(calculated, draft)
  const status = PAYOUT_STATUS[draft.status]

  const setOverride = (key, value) => onChange('overrides', { ...draft.overrides, [key]: value === '' ? undefined : value })
  const setAdjustment = (index, changes) =>
    onChange('adjustments', draft.adjustments.map((a, i) => (i === index ? { ...a, ...changes } : a)))

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mint-pale bg-white p-5">
        <div>
          <p className="text-base font-extrabold text-black uppercase">{user.name}</p>
          <p className="text-sm text-ink-muted">
            {monthLabel(draft.month)} · {calculated.presentDays} of {calculated.workingDays} days present · {calculated.distanceKm} km
          </p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </section>

      <section className="rounded-2xl border border-mint-pale bg-white p-5">
        <h3 className="mb-1 text-sm font-bold text-black">Payout bill</h3>
        <p className="mb-4 text-xs text-ink-muted">Change any figure that is wrong. The calculated one stays beside it.</p>

        <ul className="divide-y divide-mint-pale">
          {PAYOUT_LINES.map(({ key, label }) => {
            const edited = isEdited(calculated, draft.overrides, key)
            return (
              <li key={key} className="grid grid-cols-[1fr_auto] items-start gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black">
                    {label}
                    {edited && <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-[0.7rem] font-bold text-warning-ink">Edited</span>}
                  </p>
                  <p className="text-xs text-ink-muted">{workingOut(key, calculated, user)}</p>
                  {edited && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                      <span className="font-mono">{formatPrice(calculated[key])} calculated</span>
                      <button
                        type="button"
                        onClick={() => setOverride(key, '')}
                        className="inline-flex items-center gap-1 font-semibold text-green-deep hover:underline"
                      >
                        <RotateCcw className="size-3" /> Reset
                      </button>
                    </p>
                  )}
                </div>
                <div className="w-36">
                  <TextField
                    id={`payout-${key}`}
                    aria-label={label}
                    size="md"
                    inputMode="decimal"
                    disabled={locked}
                    prefix={<span className="pl-3 text-sm text-ink-muted">₹</span>}
                    value={draft.overrides?.[key] ?? String(calculated[key])}
                    onChange={(e) => setOverride(key, e.target.value.replace(/[^\d.]/g, ''))}
                    error={errors[key]}
                    inputClassName={cn(edited && 'font-semibold text-warning-ink')}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-mint-pale bg-white p-5">
        <h3 className="mb-1 text-sm font-bold text-black">Bonuses and deductions</h3>
        <p className="mb-3 text-xs text-ink-muted">Anything outside the calculation — an incentive top-up, an advance taken, a penalty.</p>
        <ul className="space-y-2">
          {draft.adjustments.map((adjustment, i) => (
            <li key={adjustment.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <TextField
                id={`adj-label-${i}`}
                aria-label={`Adjustment ${i + 1} name`}
                size="md"
                placeholder="Reason, e.g. Diwali bonus"
                disabled={locked}
                className="flex-1"
                value={adjustment.label}
                onChange={(e) => setAdjustment(i, { label: e.target.value })}
                error={errors[`adj-${i}`]}
              />
              <SelectField
                id={`adj-kind-${i}`}
                aria-label={`Adjustment ${i + 1} type`}
                options={[
                  { value: 'BONUS', label: 'Bonus (+)' },
                  { value: 'DEDUCTION', label: 'Deduction (−)' },
                ]}
                value={adjustment.kind}
                onChange={(v) => setAdjustment(i, { kind: v })}
                className="sm:w-44"
              />
              <TextField
                id={`adj-amount-${i}`}
                aria-label={`Adjustment ${i + 1} amount`}
                size="md"
                inputMode="decimal"
                placeholder="0"
                disabled={locked}
                className="sm:w-32"
                prefix={<span className="pl-3 text-sm text-ink-muted">₹</span>}
                value={adjustment.amount}
                onChange={(e) => setAdjustment(i, { amount: e.target.value.replace(/[^\d.]/g, '') })}
              />
              <button
                type="button"
                aria-label={`Remove adjustment ${i + 1}`}
                disabled={locked}
                onClick={() => onChange('adjustments', draft.adjustments.filter((_, index) => index !== i))}
                className="grid size-9 shrink-0 place-items-center self-center rounded-full border border-mint text-ink-muted hover:border-danger hover:text-danger focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <Minus className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={locked}
          onClick={() => onChange('adjustments', [...draft.adjustments, { id: `adj-${Date.now()}`, label: '', kind: 'BONUS', amount: '' }])}
          className="mt-2 h-11 w-full rounded-lg border border-mint bg-white text-sm font-semibold text-ink hover:border-green-fresh hover:text-green-deep focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
        >
          Add bonus or deduction
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-mint-pale bg-white p-5">
        <TextAreaField
          id="payout-reason"
          label="Reason for the change"
          rows={2}
          placeholder="e.g. TA was counted twice for the Saharanpur trip"
          disabled={locked}
          value={draft.reason}
          onChange={(e) => onChange('reason', e.target.value)}
          error={errors.reason}
        />
        {draft.status === 'PAID' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField id="payout-paid-on" label="Paid on" size="md" type="date" value={draft.paidOn} onChange={(e) => onChange('paidOn', e.target.value)} error={errors.paidOn} />
            <SelectField id="payout-paid-via" label="Paid by" placeholder="Select mode" options={PAID_MODES} value={draft.paidVia} onChange={(v) => onChange('paidVia', v)} />
          </div>
        )}
        <div className="space-y-1.5 border-t border-mint-pale pt-3 text-sm">
          <Row label="Salary + TA + DA + incentive" value={formatPrice(totals.earned)} />
          {totals.bonuses > 0 && <Row label="Bonuses" value={`+ ${formatPrice(totals.bonuses)}`} />}
          {totals.deductions > 0 && <Row label="Deductions" value={`− ${formatPrice(totals.deductions)}`} />}
          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-extrabold text-black">Net payable</span>
            <span aria-live="polite" className="font-mono text-xl font-extrabold text-green-deep tabular-nums">{formatPrice(totals.net)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink">{label}</span>
      <span className="font-mono font-semibold text-black tabular-nums">{value}</span>
    </div>
  )
}

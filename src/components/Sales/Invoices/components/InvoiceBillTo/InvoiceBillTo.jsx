import { BadgeCheck, MapPin } from 'lucide-react'
import { SearchSelect } from '@/components/form/SearchSelect'
import { TextField } from '@/components/form/TextField'

/**
 * The distributor on the left with everything that prints on the bill, the
 * document's own details on the right.
 *
 * The party-type picker, the warehouse, Created by and the running balance are
 * all gone — the client sells to distributors only, out of one factory, under
 * one admin, and did not want the balance on the bill.
 */
export function InvoiceBillTo({ form, errors, distributors, firm, onChange, disabled, locked, rules = {} }) {
  // What the bill IS cannot change once it exists — its number, who it is for
  // and the day it carries. The rest of the paperwork still can.
  const settled = disabled || locked
  return (
    <section className="grid grid-cols-1 gap-6 rounded-2xl border border-mint-pale bg-white p-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="min-w-0">
        <p className="mb-3 text-xs font-bold tracking-wide text-ink-muted uppercase">Distributor</p>
        <SearchSelect
          id="invoice-distributor"
          aria-label="Distributor"
          placeholder="Enter distributor name"
          limit={10}
          options={distributors.map((row) => ({
            value: row.id,
            label: row.name,
            hint: [row.city, row.mobile].filter(Boolean).join(' · '),
          }))}
          value={form.distributorId}
          onChange={(v) => onChange('distributorId', v)}
          invalid={Boolean(errors.distributorId)}
          disabled={settled}
        />
        {errors.distributorId && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.distributorId}</p>}

        {firm && (
          <div className="mt-3 space-y-1.5 rounded-xl bg-bg p-3.5 text-sm">
            <p className="flex items-center gap-1.5 font-bold text-black">
              {firm.name} {firm.isActive && <BadgeCheck className="size-4 text-green-deep" />}
            </p>
            {firm.address && (
              <p className="flex gap-1.5 text-ink">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-muted" /> {firm.address}
                {firm.pincode ? ` — ${firm.pincode}` : ''}
              </p>
            )}
            <p className="text-xs text-ink-muted">
              {firm.gstin ? `GSTIN ${firm.gstin}` : 'No GSTIN (unregistered)'}
              {firm.state && ` · ${firm.state}`}
              {firm.mobile && ` · +91 ${firm.mobile}`}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2">
        <TextField
          id="invoice-no"
          label="Invoice No."
          size="md"
          placeholder="e.g. INV/26-27/0175"
          maxLength={40}
          value={form.invoiceNo}
          onChange={(e) => onChange('invoiceNo', e.target.value)}
          error={errors.invoiceNo}
          disabled={settled}
          labelAction={locked && !disabled ? <span className="text-xs font-medium text-ink-muted">Settled when the bill was made</span> : undefined}
        />
        <TextField
          id="invoice-date"
          label="Date"
          size="md"
          type="date"
          value={form.invoiceDate}
          onChange={(e) => onChange('invoiceDate', e.target.value)}
          error={errors.invoiceDate}
          disabled={settled}
        />
        <TextField
          id="invoice-credit-days"
          label="Credit period"
          size="md"
          inputMode="numeric"
          value={form.creditDays}
          onChange={(e) => onChange('creditDays', e.target.value.replace(/\D/g, ''))}
          error={errors.creditDays}
          disabled={disabled}
          suffix={<span className="flex h-full items-center border-l border-mint-pale bg-bg px-3 text-sm text-ink-muted">days</span>}
        />
        <TextField
          id="invoice-transport"
          label="Transport"
          size="md"
          placeholder="Self / transporter"
          maxLength={60}
          value={form.transport}
          onChange={(e) => onChange('transport', e.target.value)}
          disabled={disabled}
        />
        {/* Both are always on the bill. Settings only decide whether it can
            go out without them — "इशू हमेशा इनवाइस और ईवे दोनों होंगे". */}
        <TextField
          id="invoice-vehicle"
          label="Vehicle No."
          required={Boolean(rules.vehicleNoRequired)}
          size="md"
          placeholder="e.g. UP 10 DE 5566"
          maxLength={20}
          value={form.vehicleNo}
          onChange={(e) => onChange('vehicleNo', e.target.value.toUpperCase())}
          error={errors.vehicleNo}
          disabled={disabled}
        />
        <TextField
          id="invoice-eway"
          label="E-way bill No."
          required={Boolean(rules.ewayBillRequired)}
          size="md"
          placeholder="e.g. 1234 5678 9012"
          maxLength={30}
          value={form.ewayBillNo}
          onChange={(e) => onChange('ewayBillNo', e.target.value.toUpperCase())}
          error={errors.ewayBillNo}
          disabled={disabled}
        />
        <TextField
          id="invoice-note"
          label="Comment"
          size="md"
          maxLength={240}
          placeholder="Anything to note"
          value={form.note}
          onChange={(e) => onChange('note', e.target.value)}
          disabled={disabled}
        />
      </div>
    </section>
  )
}

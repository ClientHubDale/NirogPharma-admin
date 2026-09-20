import { Receipt } from 'lucide-react'
import { DocumentUploader } from '@/components/form/DocumentUploader'
import { SearchSelect } from '@/components/form/SearchSelect'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { formatPrice } from '@/lib/format'
import { paymentTotals } from '../../paymentModel'
import { PAYMENT_METHODS } from '../../paymentTypes'

const dmy = (iso) => iso.split('-').reverse().join('-')

/**
 * "Create payment" drawer body: who and how at the top, the party's unpaid
 * bills in the middle, the amount at the bottom.
 * bills = [{ id, number, date, total, due }] for the chosen party.
 */
export function PaymentForm({ config, payment, set, errors, partyOptions, userOptions, bills, onAllocate }) {
  const totals = paymentTotals(payment)
  const allocationOf = (id) => payment.allocations.find((a) => a.docId === id)?.amount ?? ''

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-mint-pale bg-white p-5 sm:grid-cols-2">
        <SelectField
          id="pay-party-type"
          label="Party Type"
          options={[{ value: config.partyType, label: config.partyType === 'SUPPLIER' ? 'Supplier' : 'Customer' }]}
          value={config.partyType}
          onChange={() => {}}
          disabled
        />
        <TextField id="pay-number" label="Payment No." size="md" placeholder="Enter payment number" value={payment.number} onChange={(e) => set('number', e.target.value)} error={errors.number} />
        <div>
          <label htmlFor="pay-party" className="mb-1.5 block text-sm font-semibold text-black">Party name</label>
          <SearchSelect id="pay-party" aria-label="Party name" placeholder="Enter party name" options={partyOptions} value={payment.partyId} onChange={(v) => set('partyId', v)} invalid={Boolean(errors.partyId)} />
          {errors.partyId && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.partyId}</p>}
        </div>
        <SelectField id="pay-collected" label="Collected By" placeholder="Select user" options={userOptions} value={payment.collectedBy} onChange={(v) => set('collectedBy', v)} error={errors.collectedBy} />
        <TextField id="pay-date" label="Payment date" size="md" type="date" value={payment.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />
        <SelectField id="pay-method" label="Payment type" options={PAYMENT_METHODS} value={payment.method} onChange={(v) => set('method', v)} />
        {payment.method !== 'CASH' && payment.method !== 'COUPON' && (
          <TextField
            id="pay-reference"
            label={payment.method === 'CHEQUE' ? 'Cheque no.' : 'Reference / UTR'}
            size="md"
            placeholder={payment.method === 'CHEQUE' ? 'Cheque number' : 'Transaction reference'}
            value={payment.reference}
            onChange={(e) => set('reference', e.target.value)}
            error={errors.reference}
          />
        )}
        <TextAreaField id="pay-comment" label="Comment" rows={2} placeholder="Comment" value={payment.comment} onChange={(e) => set('comment', e.target.value)} />
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-semibold text-black">Attachment</p>
          <DocumentUploader documents={payment.documents} onChange={(docs) => set('documents', docs)} max={3} hint="Receipt, cheque photo or bank slip" />
        </div>
      </section>

      <section className="rounded-2xl border border-mint-pale bg-white p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-black">Settle bills</h3>
          {bills.length > 0 && (
            <button type="button" onClick={() => onAllocate('ALL')} className="text-sm font-semibold text-green-deep hover:underline">
              Settle oldest first
            </button>
          )}
        </div>
        {!payment.partyId ? (
          <p className="rounded-xl bg-bg px-4 py-6 text-center text-sm text-ink-muted">Choose a {config.partyNoun} to see their unpaid {config.billNoun}s.</p>
        ) : bills.length === 0 ? (
          <p className="flex items-center justify-center gap-2 rounded-xl bg-mint-pale px-4 py-6 text-center text-sm font-medium text-forest">
            <Receipt className="size-4" /> Nothing outstanding — this will be kept on account.
          </p>
        ) : (
          <ul className="divide-y divide-mint-pale">
            {bills.map((bill) => (
              <li key={bill.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-black">{bill.number}</p>
                  <p className="text-xs text-ink-muted">
                    {dmy(bill.date)} · {formatPrice(bill.total)} · due <span className="font-medium text-ink">{formatPrice(bill.due)}</span>
                  </p>
                </div>
                <div className="w-32">
                  <TextField
                    id={`alloc-${bill.id}`}
                    aria-label={`Amount for ${bill.number}`}
                    size="md"
                    inputMode="decimal"
                    placeholder="0"
                    prefix={<span className="pl-3 text-sm text-ink-muted">₹</span>}
                    value={allocationOf(bill.id)}
                    onChange={(e) => onAllocate(bill, e.target.value.replace(/[^\d.]/g, ''))}
                    error={errors.allocations?.[bill.id]}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-mint-pale bg-white p-5">
        <Row label="Bills settled" value={formatPrice(totals.allocated)} />
        <Row
          label="Other Payment"
          control={
            <TextField id="pay-other" aria-label="Other payment" size="md" inputMode="decimal" placeholder="0" value={payment.otherPayment} onChange={(e) => set('otherPayment', e.target.value.replace(/[^\d.]/g, ''))} />
          }
        />
        <Row
          label="Discount ( - )"
          control={
            <TextField id="pay-discount" aria-label="Discount" size="md" inputMode="decimal" placeholder="0" value={payment.discount} onChange={(e) => set('discount', e.target.value.replace(/[^\d.]/g, ''))} />
          }
        />
        <div className="flex items-center justify-between border-t border-mint-pale pt-3">
          <span className="text-base font-extrabold text-black">Payment amount</span>
          <span aria-live="polite" className="font-mono text-xl font-extrabold text-green-deep tabular-nums">{formatPrice(totals.amount)}</span>
        </div>
        {errors.amount && <p className="text-sm font-medium text-destructive">{errors.amount}</p>}
      </section>
    </div>
  )
}

function Row({ label, value, control }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-ink">{label}</span>
      {control ? <div className="w-36">{control}</div> : <span className="font-mono text-sm font-semibold text-black tabular-nums">{value}</span>}
    </div>
  )
}

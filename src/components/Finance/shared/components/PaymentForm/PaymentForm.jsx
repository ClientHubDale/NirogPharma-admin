import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { DocumentUploader } from '@/components/form/DocumentUploader'
import { ImageUploader } from '@/components/form/ImageUploader'
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
/**
 * `staff` turns Collected By into the two people a payment counts towards —
 * "पार्टी असाइन मैनेजर" and "पार्टी असाइन एग्जीक्यूटिव" (16:13, 17:18) —
 * because targets are worked out from money in. Payment Out has no such
 * people, so it passes none and keeps Collected By.
 */
export function PaymentForm({ config, payment, set, errors, partyOptions, userOptions, bills, onAllocate, staff, account, creditNotes, areaOptions }) {
  const totals = paymentTotals(payment)
  const allocationOf = (id) => payment.allocations.find((a) => a.docId === id)?.amount ?? ''

  /**
   * "अगर ये क्लियर हो गया तो कितना बकाया बचेगा" (19:31) — the one figure the
   * person taking the money is actually asked for at the shop.
   *
   * Counted against what is owed **today**, which is money already approved:
   * this payment is still a piece of paper, so it is the thing being asked
   * "what if". A negative answer means they have overpaid, which is said in
   * their favour rather than as a minus.
   */
  const owedNow = account?.outstanding ?? null
  const leftAfter = owedNow === null ? null : Math.round((owedNow - totals.amount) * 100) / 100

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-mint-pale bg-white p-5 sm:grid-cols-2">
        <TextField id="pay-number" label="Payment No." size="md" placeholder="Enter payment number" value={payment.number} onChange={(e) => set('number', e.target.value)} error={errors.number} />
        <div>
          <label htmlFor="pay-party" className="mb-1.5 block text-sm font-semibold text-black">Party name</label>
          <SearchSelect id="pay-party" aria-label="Party name" placeholder="Enter party name" options={partyOptions} value={payment.partyId} onChange={(v) => set('partyId', v)} invalid={Boolean(errors.partyId)} />
          {errors.partyId && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.partyId}</p>}
        </div>
        {staff ? (
          <>
            {/* Both come off the party. They stay changeable, because the
                person who actually went is not always the one on the file. */}
            <SelectField
              id="pay-manager"
              label="Party Assigned Manager"
              placeholder={!payment.partyId ? 'Choose a party first' : 'Nobody on this party'}
              options={staff.managerOptions}
              value={payment.managerId}
              onChange={(v) => set('managerId', v)}
              error={errors.managerId}
              disabled={!payment.partyId}
            />
            <SelectField
              id="pay-executive"
              label="Party Assigned Executive"
              placeholder={
                !payment.partyId
                  ? 'Choose a party first'
                  : staff.executiveOptions.length
                    ? // Several work this firm, so the one who collected has
                      // to be said: the target follows whoever is picked.
                      'Who collected it?'
                    : 'Nobody on this party'
              }
              options={staff.executiveOptions}
              value={payment.executiveId}
              onChange={(v) => set('executiveId', v)}
              error={errors.executiveId}
              disabled={!payment.partyId}
            />
          </>
        ) : (
          <SelectField id="pay-collected" label="Collected By" placeholder="Select user" options={userOptions} value={payment.collectedBy} onChange={(v) => set('collectedBy', v)} error={errors.collectedBy} />
        )}
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
        {/* "आज 16 तारीख है, चेक 20 का है" — a post-dated cheque cannot be
            banked before the day written on it, so that day is asked for
            separately from the day it was handed over. */}
        {payment.method === 'CHEQUE' && (
          <TextField
            id="pay-cheque-date"
            label="Cheque date"
            size="md"
            type="date"
            min={payment.date}
            value={payment.chequeDate ?? ''}
            onChange={(e) => set('chequeDate', e.target.value)}
            error={errors.chequeDate}
            hint="The date written on the cheque"
          />
        )}
        {/* "एरिया ऐड करना है, एग्जीक्यूटिव सिलेक्ट करेगा" (22:47). Typed for
            now — Region → City → Area is a screen with no table behind it
            yet, and the cash book must not wait on that. */}
        {staff && (
          <TextField
            id="pay-area"
            label="Area"
            size="md"
            placeholder="Which beat was this collected on?"
            value={payment.area ?? ''}
            onChange={(e) => set('area', e.target.value)}
            error={errors.area}
            list="pay-area-options"
          />
        )}
        {staff && areaOptions?.length > 0 && (
          <datalist id="pay-area-options">
            {areaOptions.map((one) => (
              <option key={one} value={one} />
            ))}
          </datalist>
        )}
        <TextAreaField id="pay-comment" label="Comment" rows={2} placeholder="Comment" value={payment.comment} onChange={(e) => set('comment', e.target.value)} />
        {/* "चेक की फोटो, आगे और पीछे" — the back carries the endorsement and
            the bank's stamp, which is what settles an argument later. */}
        {payment.method === 'CHEQUE' && (
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            <ChequeSide
              id="cheque-front"
              label="Cheque — front"
              photo={payment.chequeFront}
              onChange={(one) => set('chequeFront', one)}
              error={errors.chequeFront}
            />
            <ChequeSide
              id="cheque-back"
              label="Cheque — back"
              photo={payment.chequeBack}
              onChange={(one) => set('chequeBack', one)}
              error={errors.chequeBack}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-semibold text-black">Attachment</p>
          <DocumentUploader documents={payment.documents} onChange={(docs) => set('documents', docs)} max={3} hint="Receipt, cheque photo or bank slip" />
        </div>
      </section>

      {/* "उसका क्रेडिट नोट भी दिखाओ" (20:29) — goods they sent back are money
          in their favour, and the person asking for a cheque should not be
          the last to hear about it. Issued notes only: a draft is not money. */}
      {creditNotes?.length > 0 && (
        <section className="rounded-2xl border border-mint-pale bg-white p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-black">Their credit notes</h3>
            <span className="font-mono text-sm font-semibold text-green-deep">
              {formatPrice(creditNotes.reduce((sum, note) => sum + note.total, 0))} in their favour
            </span>
          </div>
          <ul className="divide-y divide-mint-pale">
            {creditNotes.map((note) => (
              <li key={note.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-black">{note.noteNo}</p>
                  <p className="text-xs text-ink-muted">{dmy(note.at)}</p>
                </div>
                <span className="font-mono text-sm tabular-nums">{formatPrice(note.total)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">
            Already taken off what they owe. Nothing to settle here — it is shown so the figure asked for is the right one.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-mint-pale bg-white p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-black">Settle bills</h3>
          {bills.length > 0 && (
            <button type="button" onClick={() => onAllocate('ALL')} className="text-sm font-semibold text-green-deep hover:underline">
              Settle everything
            </button>
          )}
        </div>

        {/* The office is handed a sum, not a breakdown. Typing it here puts it
            against the oldest bill first and keeps going down the list —
            "जो सबसे पुराना इनवॉइस है उसमें चला जाए". */}
        {bills.length > 0 && (
          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl bg-bg p-3">
            <div className="w-36">
              <TextField
                id="pay-spread"
                label="Amount received"
                size="md"
                inputMode="decimal"
                placeholder="0"
                prefix={<span className="pl-3 text-sm text-ink-muted">₹</span>}
                value={payment.spread ?? ''}
                onChange={(e) => set('spread', e.target.value.replace(/[^\d.]/g, ''))}
              />
            </div>
            <button
              type="button"
              onClick={() => onAllocate('SPREAD', payment.spread)}
              disabled={!(Number(payment.spread) > 0)}
              className="h-11 rounded-lg bg-green-deep px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              Put on oldest bills
            </button>
            <p className="flex-1 text-xs text-ink-muted">
              Oldest bill first, down the list. Anything left over is kept on account.
            </p>
          </div>
        )}
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
        {/* "किस चीज़ का पेमेंट है" — money kept on account with no reason
            given is the kind nobody can account for six months later. */}
        {Number(payment.otherPayment) > 0 && (
          <TextField
            id="pay-other-note"
            aria-label="What the other payment is for"
            size="md"
            placeholder="What is this payment for?"
            value={payment.otherNote ?? ''}
            onChange={(e) => set('otherNote', e.target.value)}
            error={errors.otherNote}
          />
        )}
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

        {/* What they will still owe once this is really in the bank. */}
        {leftAfter !== null && totals.amount > 0 && (
          <p id="pay-after" aria-live="polite" className="rounded-xl bg-bg px-3.5 py-2.5 text-sm text-ink">
            If this clears,{' '}
            {leftAfter > 0 ? (
              <>
                <span className="font-mono font-semibold text-black">{formatPrice(leftAfter)}</span> is still outstanding.
              </>
            ) : leftAfter < 0 ? (
              <>
                they are <span className="font-mono font-semibold text-green-deep">{formatPrice(Math.abs(leftAfter))}</span> in credit.
              </>
            ) : (
              <span className="font-semibold text-green-deep">their account is clear.</span>
            )}
          </p>
        )}
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

/**
 * One photographed side of a cheque.
 *
 * A single slot rather than a pile of attachments, because "front" and
 * "back" are two different things and a loose heap of three photos never
 * says which is which.
 */
function ChequeSide({ id, label, photo, onChange, error }) {
  const [problem, setProblem] = useState('')

  return (
    <div id={id} data-filled={photo ? 'yes' : 'no'}>
      <p className="mb-1.5 text-sm font-semibold text-black">{label}</p>
      <ImageUploader
        label={label}
        images={photo ? [photo] : []}
        max={1}
        onChange={(images) => {
          setProblem('')
          onChange(images[0] ?? null)
        }}
        onError={setProblem}
      />
      {(problem || error) && <p className="mt-1.5 text-sm font-medium text-destructive">{problem || error}</p>}
    </div>
  )
}

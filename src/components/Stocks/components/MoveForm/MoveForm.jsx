import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { FormSection } from '@/components/form/FormSection'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { today } from '../../stockModel'

const SHOWN = 10

/** A fact the admin cannot change, shown where its field would have been. */
function Fixed({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
      <div className="flex h-11 items-center rounded-xl border border-mint-pale bg-bg px-3.5 text-sm font-medium text-ink">
        {value || '—'}
      </div>
    </div>
  )
}

/**
 * Stock moving between the factory and a distributor — out on an issue, back
 * on a return. The same shape both ways; only the wording and what counts as
 * "available" differ, which the page passes in.
 *
 * A return is tied to a holding that already exists, so the distributor and the
 * batch are settled before the drawer opens — stock has to go back to the very
 * batch it came out on, never a fresh one. They are shown, not asked.
 */
export function MoveForm({ form, errors, distributors, batches, available, unit, onChange, direction = 'OUT', holding, batchesHeld = [], nextNoteNo }) {
  /**
   * The note number is handed out by the series unless the admin takes it
   * over. Blank means "give me the next one", so typing a number is a decision
   * he has to make deliberately — hence the pencil rather than an open field.
   */
  const [ownNumber, setOwnNumber] = useState(false)

  const set = (field) => (e) => onChange(field, e.target.value)
  const number = (field) => (e) => onChange(field, e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))

  const out = direction === 'OUT'

  const rest = (
    <>
      <TextField
        id="move-quantity"
        label={out ? 'Quantity to issue' : 'Quantity coming back'}
        required
        size="md"
        inputMode="decimal"
        placeholder="10"
        value={form.quantity}
        onChange={number('quantity')}
        error={errors.quantity}
        suffix={
          <span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm font-medium text-ink-muted">
            {unit || '—'}
          </span>
        }
      />

      <TextField id="move-date" label="On" size="md" type="date" max={today()} value={form.at} onChange={set('at')} error={errors.at} />

      {/* On a return this names the bill the goods first went out on. The
          credit note gets its own number — shown below, never this one. */}
      <TextField
        id="move-invoice"
        label={out ? 'Invoice number' : 'Against which bill'}
        size="md"
        placeholder={out ? 'NP/26-27/673' : 'NP/26-27/673'}
        value={form.invoiceNo}
        onChange={set('invoiceNo')}
        error={errors.invoiceNo}
        className="sm:col-span-2"
      />

      {/* "इनवाइस नंबर नया जनरेट होना चाहिए" — the number this return will be
          credited under, so the admin sees it before confirming. The pencil
          hands it over to him: a note raised against a paper book the office
          already keeps has to carry that book's number, not ours. */}
      {!out && (ownNumber ? (
        <div className="sm:col-span-2">
          <TextField
            id="move-note-no"
            label="Credit note number"
            size="md"
            placeholder={nextNoteNo || 'CN/26-27/001'}
            value={form.noteNo}
            onChange={set('noteNo')}
            error={errors.noteNo}
          />
          <button
            type="button"
            id="move-note-no-auto"
            onClick={() => {
              setOwnNumber(false)
              onChange('noteNo', '')
            }}
            className="mt-2 text-xs font-semibold text-green-deep underline underline-offset-2 hover:text-black"
          >
            {nextNoteNo ? `Use ${nextNoteNo} instead` : 'Use the next number instead'}
          </button>
        </div>
      ) : nextNoteNo ? (
        <p className="flex items-center gap-2 rounded-xl border border-mint-pale bg-mint-pale/40 px-3.5 py-2.5 text-sm sm:col-span-2">
          <span className="min-w-0 flex-1">
            <span className="text-ink-muted">Credit note </span>
            <span className="font-mono font-bold text-black">{nextNoteNo}</span>
            <span className="text-ink-muted"> will be raised for this return.</span>
          </span>
          <button
            type="button"
            id="move-note-no-edit"
            aria-label="Change the credit note number"
            title="Change the credit note number"
            onClick={() => {
              setOwnNumber(true)
              onChange('noteNo', nextNoteNo)
            }}
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-mint-pale bg-white text-ink-muted hover:bg-bg hover:text-green-deep"
          >
            <Pencil className="size-3.5" />
          </button>
        </p>
      ) : null)}

      <TextAreaField
        id="move-note"
        label="Note"
        rows={2}
        maxLength={240}
        placeholder={out ? 'Vehicle, driver, docket number…' : 'Why it came back'}
        value={form.note}
        onChange={set('note')}
        className="sm:col-span-2"
      />

      {available !== undefined && (
        <p className="text-sm text-ink-muted sm:col-span-2">
          {out ? 'In this batch right now: ' : 'They are holding: '}
          <span className="font-mono font-semibold text-ink">
            {available} {unit}
          </span>
        </p>
      )}
    </>
  )

  // Stock goes back to the batch it came out on, so a return states the
  // distributor and the batch rather than asking for them again.
  if (!out && holding) {
    return (
      <FormSection title="Take stock back">
        <Fixed label="Distributor" value={holding.distributorName} />
        <Fixed label="Item" value={holding.itemName} />

        {/* The holding is item-wise, but the goods go back into a real batch.
            We know which batches we sent them, so those are the choices — and
            when there is only one there is nothing to choose. */}
        {batchesHeld.length > 1 ? (
          <SelectField
            id="move-batch"
            label="Back into which batch"
            required
            placeholder="Choose the batch"
            limit={SHOWN}
            options={batchesHeld.map((batch) => ({
              value: batch.batchId,
              label: batch.batchNo,
              hint: `${batch.outstanding} with them${batch.expiryDate ? ` · expires ${batch.expiryDate}` : ''}`,
            }))}
            value={form.batchId}
            onChange={(v) => onChange('batchId', v)}
            error={errors.batchId}
            className="sm:col-span-2"
          />
        ) : (
          <Fixed label="Batch" value={batchesHeld[0]?.batchNo ?? '—'} className="sm:col-span-2" />
        )}

        {rest}
      </FormSection>
    )
  }

  return (
    <FormSection title={out ? 'Issue stock' : 'Take stock back'}>
      <SelectField
        id="move-distributor"
        label="Distributor"
        required
        placeholder="Search distributors"
        limit={SHOWN}
        options={distributors.map((row) => ({ value: row.id, label: row.name, hint: row.city || row.mobile }))}
        value={form.distributorId}
        onChange={(v) => onChange('distributorId', v)}
        error={errors.distributorId}
        className="sm:col-span-2"
      />

      <SelectField
        id="move-batch"
        label="Batch"
        required
        placeholder="Search batches"
        limit={SHOWN}
        options={batches}
        value={form.batchId}
        onChange={(v) => onChange('batchId', v)}
        error={errors.batchId}
        className="sm:col-span-2"
      />

      {rest}
    </FormSection>
  )
}

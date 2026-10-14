import { FormSection } from '@/components/form/FormSection'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { today } from '../../../stockModel'

/** The catalogue is long: ten at a time, and search reaches the rest. */
const SHOWN = 10

/**
 * One production run: which product, its batch number, how much was made and
 * the dates on the carton. The quantity becomes the batch's first ledger
 * movement, which is why it cannot be changed once any of it has gone out.
 */
export function BatchForm({ form, errors, items, onChange, editing }) {
  const set = (field) => (e) => onChange(field, e.target.value)
  const number = (field) => (e) => onChange(field, e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))

  const item = items.find((row) => row.id === form.itemId)
  const options = items.map((row) => ({
    value: row.id,
    label: row.name,
    hint: [row.category, row.unit].filter(Boolean).join(' · '),
  }))

  return (
    <FormSection title="Batch Details">
      <SelectField
        id="batch-item"
        label="Item"
        required
        placeholder="Search the catalogue"
        limit={SHOWN}
        options={options}
        value={form.itemId}
        onChange={(v) => onChange('itemId', v)}
        error={errors.itemId}
        className="sm:col-span-2"
      />

      <TextField
        id="batch-no"
        label="Batch Number"
        required
        size="md"
        placeholder="e.g. B-2401"
        maxLength={40}
        value={form.batchNo}
        onChange={set('batchNo')}
        error={errors.batchNo}
      />

      <TextField
        id="batch-quantity"
        label="Quantity made"
        required
        size="md"
        inputMode="decimal"
        placeholder="500"
        value={form.quantity}
        onChange={number('quantity')}
        error={errors.quantity}
        disabled={editing?.out > 0}
        suffix={
          <span className="flex h-full items-center border-l border-mint-pale bg-bg px-3.5 text-sm font-medium text-ink-muted">
            {item?.unit || '—'}
          </span>
        }
      />

      <TextField
        id="batch-mfg"
        label="Manufactured on"
        required
        size="md"
        type="date"
        max={today()}
        value={form.mfgDate}
        onChange={set('mfgDate')}
        error={errors.mfgDate}
      />
      <TextField
        id="batch-expiry"
        label="Expires on"
        required
        size="md"
        type="date"
        value={form.expiryDate}
        onChange={set('expiryDate')}
        error={errors.expiryDate}
      />

      {/* The two the client left optional: when it was entered, and why. */}
      <TextField
        id="batch-received"
        label="Entered stock on (optional)"
        size="md"
        type="date"
        max={today()}
        value={form.receivedAt}
        onChange={set('receivedAt')}
        error={errors.receivedAt}
      />

      <TextAreaField
        id="batch-note"
        label="Note (optional)"
        rows={2}
        maxLength={240}
        placeholder="Anything worth recording about this batch"
        value={form.note}
        onChange={set('note')}
        className="sm:col-span-2"
      />
    </FormSection>
  )
}

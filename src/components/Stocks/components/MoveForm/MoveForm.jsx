import { FormSection } from '@/components/form/FormSection'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { today } from '../../stockModel'

const SHOWN = 10

/**
 * Stock moving between the factory and a distributor — out on an issue, back
 * on a return. The same shape both ways; only the wording and what counts as
 * "available" differ, which the page passes in.
 */
export function MoveForm({ form, errors, distributors, batches, available, unit, onChange, direction = 'OUT' }) {
  const set = (field) => (e) => onChange(field, e.target.value)
  const number = (field) => (e) => onChange(field, e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))

  const out = direction === 'OUT'

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
    </FormSection>
  )
}

import { Plus, X } from 'lucide-react'
import { FormSection } from '@/components/form/FormSection'
import { SelectField } from '@/components/form/SelectField'
import { TextAreaField } from '@/components/form/TextAreaField'
import { TextField } from '@/components/form/TextField'
import { today } from '../../stockModel'

const SHOWN = 10

/**
 * Stock going out of the factory, on one bill.
 *
 * The invoice number is typed in by the staff from the bill they cut — it is
 * not generated here. One bill carries as many batches as it needs: "एक
 * इनवाइस में 10 आइटम गए हैं", and they are all written together or not at all.
 */
export function IssueForm({ form, errors, distributors, batches, onChange, unitOf }) {
  const set = (field) => (e) => onChange(field, e.target.value)
  const number = (value) => value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')

  const setLine = (index, field, value) =>
    onChange(
      'lines',
      form.lines.map((line, at) => (at === index ? { ...line, [field]: value } : line)),
    )

  const addLine = () => onChange('lines', [...form.lines, { batchId: '', quantity: '' }])
  const dropLine = (index) =>
    onChange(
      'lines',
      form.lines.filter((_, at) => at !== index),
    )

  const filled = form.lines.filter((line) => line.batchId).length

  return (
    <>
      <FormSection title="Issue stock">
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

        <TextField
          id="move-invoice"
          label="Invoice number"
          size="md"
          placeholder="e.g. INV-2610-18"
          maxLength={40}
          value={form.invoiceNo}
          onChange={set('invoiceNo')}
          error={errors.invoiceNo}
        />
        <TextField id="move-date" label="On" size="md" type="date" max={today()} value={form.at} onChange={set('at')} error={errors.at} />

        <TextAreaField
          id="move-note"
          label="Note"
          rows={2}
          maxLength={240}
          placeholder="Vehicle, driver, docket number…"
          value={form.note}
          onChange={set('note')}
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection
        title="What is going"
        action={
          <button
            type="button"
            onClick={addLine}
            aria-label="Add another batch"
            className="inline-flex items-center gap-1 text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
          >
            <Plus className="size-3.5" /> Batch
          </button>
        }
      >
        <div className="space-y-3 sm:col-span-2">
          {form.lines.map((line, index) => {
            const problem = errors.lines?.[index] ?? {}
            return (
              <div key={index} className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                <SelectField
                  id={`issue-batch-${index}`}
                  label={index === 0 ? 'Batch' : undefined}
                  placeholder="Search batches"
                  limit={SHOWN}
                  options={batches}
                  value={line.batchId}
                  onChange={(v) => setLine(index, 'batchId', v)}
                  error={problem.batchId}
                  className="min-w-0 flex-1"
                />
                <TextField
                  id={`issue-quantity-${index}`}
                  label={index === 0 ? 'Quantity' : undefined}
                  size="md"
                  inputMode="decimal"
                  placeholder="10"
                  className="w-36"
                  value={line.quantity}
                  onChange={(e) => setLine(index, 'quantity', number(e.target.value))}
                  error={problem.quantity}
                  suffix={
                    <span className="flex h-full items-center border-l border-mint-pale bg-bg px-3 text-sm font-medium text-ink-muted">
                      {unitOf(line.batchId) || '—'}
                    </span>
                  }
                />
                <button
                  type="button"
                  onClick={() => dropLine(index)}
                  disabled={form.lines.length === 1}
                  aria-label={`Remove line ${index + 1}`}
                  className={`grid size-11 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-0 ${
                    index === 0 ? 'mt-[1.85rem]' : ''
                  }`}
                >
                  <X className="size-4" />
                </button>
              </div>
            )
          })}

          {filled > 0 && (
            <p className="text-xs text-ink-muted">
              {filled} line{filled === 1 ? '' : 's'} on this bill. Nothing goes out unless all of it can.
            </p>
          )}
        </div>
      </FormSection>
    </>
  )
}

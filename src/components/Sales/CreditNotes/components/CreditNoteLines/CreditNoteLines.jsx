import { Trash2 } from 'lucide-react'
import { SearchSelect } from '@/components/form/SearchSelect'
import { cn } from '@/lib/utils'
import { emptyLine } from '../../creditNoteModel'

/**
 * The items on a credit note, typed straight onto the sheet.
 *
 * A line names the batch the goods go back into — "मल्टीपल बैच है, तो इसका
 * मैच जिससे कर सके" — and the choices are only the batches that distributor is
 * actually holding, so nothing can be credited back that never went out.
 */
const FIELD =
  'w-full rounded-[2px] border border-black/40 bg-white px-1 py-px text-[9px] outline-none focus:border-green-deep disabled:border-black/20 disabled:bg-bg disabled:text-ink-muted'

const money = (value) => (Number(value) || 0).toFixed(2)

export function CreditNoteLines({ form, errors, items, holdings, priced, disabled, onChange }) {
  const lines = form.lines

  const set = (index, key, value) =>
    onChange(
      'lines',
      lines.map((line, i) => (i === index ? { ...line, [key]: value } : line)),
    )

  const addLine = (itemId) => {
    const blank = lines.findIndex((line) => !line.itemId)
    const next = blank === -1 ? [...lines, { ...emptyLine(), itemId }] : lines.map((line, i) => (i === blank ? { ...line, itemId } : line))
    onChange('lines', next)
  }

  const removeLine = (index) =>
    onChange('lines', lines.length === 1 ? [emptyLine()] : lines.filter((_, i) => i !== index))

  /** The batches this distributor still holds of that item. */
  const batchesFor = (itemId) => holdings.find((row) => row.itemId === itemId)?.batches ?? []

  const itemOptions = items.map((item) => ({ value: item.id, label: item.name, hint: item.code }))

  return (
    <div className="space-y-2">
      <table className="w-full border-collapse border-t border-black text-center text-[9px]">
        <thead>
          <tr>
            {['S.NO', 'DESCRIPTION OF GOODS', 'BATCH', 'HSN', 'QTY.', 'UOM', 'RATE', 'TOTAL', 'TAXABLE VALUE', ''].map((head) => (
              <th key={head} className="border border-black px-1 py-[3px] font-bold">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const item = items.find((row) => row.id === line.itemId)
            const figures = priced[index]
            const problem = Array.isArray(errors.lines) ? errors.lines[index] : null
            const batches = batchesFor(line.itemId)

            return (
              <tr key={index}>
                <td className="border border-black px-1 py-[3px] font-bold">{index + 1}</td>
                <td className="border border-black px-1 py-[3px] text-left">
                  {item ? (
                    <span className="font-semibold">{item.name}</span>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="border border-black px-1 py-[3px]">
                  <select
                    id={`line-${index}-batch`}
                    aria-label={`Batch for line ${index + 1}`}
                    value={line.batchId}
                    disabled={disabled || !item}
                    onChange={(e) => set(index, 'batchId', e.target.value)}
                    className={FIELD}
                  >
                    <option value="">Choose…</option>
                    {batches.map((batch) => (
                      <option key={batch.batchId} value={batch.batchId}>
                        {batch.batchNo} · {batch.outstanding} left
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border border-black px-1 py-[3px] font-bold">{item?.hsn || ''}</td>
                <td className="border border-black px-1 py-[3px]">
                  <input
                    aria-label={`Boxes on line ${index + 1}`}
                    inputMode="numeric"
                    value={line.boxes}
                    disabled={disabled || !item}
                    onChange={(e) => set(index, 'boxes', e.target.value.replace(/\D/g, ''))}
                    className={FIELD}
                  />
                </td>
                <td className="border border-black px-1 py-[3px]">
                  <input
                    aria-label={`Quantity on line ${index + 1}`}
                    inputMode="decimal"
                    value={line.quantity}
                    disabled={disabled || !item}
                    onChange={(e) => set(index, 'quantity', e.target.value.replace(/[^\d.]/g, ''))}
                    className={cn(FIELD, problem?.quantity && 'border-destructive')}
                  />
                  {problem?.quantity && <p className="mt-px text-[8px] text-destructive">{problem.quantity}</p>}
                </td>
                <td className="border border-black px-1 py-[3px] text-right font-bold">{figures ? money(figures.rate) : ''}</td>
                <td className="border border-black px-1 py-[3px] text-right font-bold">{figures ? money(figures.total) : ''}</td>
                <td className="border border-black px-1 py-[3px] text-right font-bold">
                  {figures ? money(figures.taxableValue) : ''}
                </td>
                <td className="border border-black px-1 py-[3px]">
                  {!disabled && (
                    <button
                      type="button"
                      aria-label={`Remove line ${index + 1}`}
                      onClick={() => removeLine(index)}
                      className="text-ink-muted hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {!disabled && (
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <SearchSelect
            aria-label="Add product"
            options={itemOptions}
            value=""
            limit={10}
            placeholder="Add a product that came back…"
            onChange={addLine}
            className="max-w-sm"
          />
          {typeof errors.lines === 'string' && <p className="text-xs text-destructive">{errors.lines}</p>}
        </div>
      )}
    </div>
  )
}

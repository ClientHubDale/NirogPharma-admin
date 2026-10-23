import { Gift, PackageSearch, Plus, Trash2 } from 'lucide-react'
import { SearchSelect } from '@/components/form/SearchSelect'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { monthYear } from '../InvoicePrint/billFormat'
import { previewLine } from '../../invoiceModel'

function NumberCell({ value, onChange, label, prefix, invalid, readOnly, width = 'w-24' }) {
  return (
    <div
      className={cn(
        'flex h-9 items-center overflow-hidden rounded-lg border bg-white',
        width,
        invalid ? 'border-destructive' : 'border-mint focus-within:border-green-fresh',
        readOnly && 'border-transparent bg-transparent',
      )}
    >
      {prefix && <span className="pl-2 text-xs text-ink-muted">{prefix}</span>}
      <input
        value={value}
        readOnly={readOnly}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
        className="h-full w-full min-w-0 bg-transparent px-2 text-right font-mono text-sm outline-none"
      />
    </div>
  )
}

/**
 * The items on the bill: S.No · Items · MRP · Quantity · Batch · Rate · Tax ·
 * Amount, with the product search underneath.
 *
 * The Batch cell is the new part. A line can be drawn from more than one batch
 * — "बैच 1 में 10 पीस, बैच 2 में 15, भेज रहे हैं 12" — so it holds a stack of
 * batch-and-quantity pairs, each showing that batch's manufacturing and expiry
 * dates underneath. Issuing the bill takes those quantities out of those
 * batches.
 *
 * Rate is not typed: it comes from the distributor's rate column, with the GST
 * taken back out of it, and the server has the last word on save.
 */
export function InvoiceLines({ form, errors, items, batchesFor, onChange, tier, tiers, disabled, interState = false }) {
  const setLine = (index, patch) =>
    onChange(
      'lines',
      form.lines.map((line, at) => (at === index ? { ...line, ...patch } : line)),
    )

  const lines = form.lines.filter((line) => line.itemId)
  const used = new Set(lines.map((line) => line.itemId))

  // Picking an item already on the bill does nothing, as the client asked.
  const itemOptions = items
    .filter((row) => !used.has(row.id))
    .map((row) => ({ value: row.id, label: row.name, hint: [row.category, row.unit].filter(Boolean).join(' · ') }))

  const addItem = (itemId) => {
    if (!itemId) return
    const blank = form.lines.findIndex((line) => !line.itemId)
    if (blank === -1) onChange('lines', [...form.lines, { itemId, quantity: '', batches: [] }])
    else setLine(blank, { itemId, quantity: '', batches: [] })
  }

  return (
    <section className="overflow-hidden rounded-xl border border-ink/25 bg-white">
      <p className="border-b border-mint-pale px-5 py-4 text-xs font-bold tracking-wide text-ink-muted uppercase">Items</p>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            {/* The columns of the bill the client prints, in their order. */}
            <tr className="border-b border-mint-pale bg-bg text-center text-[10px] font-bold tracking-wide text-ink-muted uppercase">
              <th className="w-10 px-2 py-2">S.<br />No</th>
              <th className="px-2 py-2 text-left">Description of goods</th>
              <th className="min-w-[14rem] px-2 py-2">Batch No.</th>
              <th className="w-16 px-1 py-2">Mfd.</th>
              <th className="w-16 px-1 py-2">Exp.</th>
              <th className="w-20 px-1 py-2">HSN<br />Code</th>
              <th className="w-12 px-1 py-2">Qty.<br />(in box)</th>
              <th className="w-24 px-1 py-2">UOM<br />(in bottle)</th>
              <th className="w-20 px-1 py-2 text-right">MRP</th>
              <th className="w-20 px-1 py-2 text-right">Rate</th>
              <th className="w-24 px-1 py-2 text-right">Taxable<br />value</th>
              <th className="w-20 px-1 py-2 text-right">CGST</th>
              <th className="w-20 px-1 py-2 text-right">SGST</th>
              <th className="w-20 px-1 py-2 text-right">IGST</th>
              <th className="w-10 px-2 py-2">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mint-pale">
            {lines.length === 0 && (
              <tr>
                <td colSpan={15} className={cn('px-4 py-12 text-center text-sm', errors.lines_empty ? 'text-destructive' : 'text-ink-muted')}>
                  <PackageSearch className="mx-auto mb-2 size-7 text-green-deep" strokeWidth={1.5} />
                  {errors.lines_empty ?? 'No items added yet. Search below to add your first item.'}
                </td>
              </tr>
            )}

            {form.lines.map((line, index) => {
              if (!line.itemId) return null
              const item = items.find((row) => row.id === line.itemId)
              const problem = errors.lines?.[index] ?? {}
              const batches = batchesFor(line.itemId)
              const money = previewLine({ item, tier, tiers, quantity: line.quantity })
              const allocated = line.batches.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
              // MFD. and EXP. come off the batch, so the first one chosen fills them.
              const firstBatch = batches.find((b) => b.id === line.batches.find((row) => row.batchId)?.batchId)

              // What the item's scheme gives away at this quantity, and what
              // it looks like — a giveaway carries its own picture, a
              // catalogue item its first one.
              const quantity = Number(line.quantity) || 0
              const giving = item?.schemeBuyQty && item?.schemeFreeQty && quantity >= item.schemeBuyQty
              const freeItem = item?.schemeFreeItemId ? items.find((row) => row.id === item.schemeFreeItemId) : null
              const free = giving
                ? `${Math.floor(quantity / item.schemeBuyQty) * item.schemeFreeQty} ${
                    item.schemeFreeItem?.name ?? item.schemeFreeGift?.name ?? 'free'
                  } free`
                : ''
              const freeImage = item?.schemeFreeGift?.imageUrl || freeItem?.images?.[0]?.url || ''

              return (
                <tr key={index}>
                  <td className="px-4 py-2.5 align-top font-mono text-xs text-ink-muted">{lines.indexOf(line) + 1}</td>
                  <td className="px-3 py-2.5 align-top">
                    <p className="font-semibold text-black">{item?.name ?? 'Unknown item'}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                      <span className="font-mono">{item?.code || '—'}</span>
                      {free && (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-green-deep">
                          {freeImage ? (
                            <img src={freeImage} alt="" className="size-5 shrink-0 rounded border border-mint-pale object-cover" />
                          ) : (
                            <Gift className="size-3" />
                          )}
                          {free}
                        </span>
                      )}
                    </p>
                    {problem.quantity && <p className="text-xs font-medium text-destructive">{problem.quantity}</p>}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="space-y-2">
                      {line.batches.map((row, at) => {
                        const batch = batches.find((b) => b.id === row.batchId)
                        return (
                          <div key={at} className="flex items-start gap-1.5">
                            <div className="min-w-0 flex-1">
                              <SearchSelect
                                id={`line-${index}-batch-${at}`}
                                aria-label={`Batch ${at + 1} for ${item?.name ?? 'item'}`}
                                placeholder="Select batch"
                                limit={10}
                                options={batches.map((b) => ({ value: b.id, label: b.batchNo, hint: `${b.available} ${b.unit} left` }))}
                                value={row.batchId}
                                onChange={(v) => setLine(index, { batches: line.batches.map((b, i) => (i === at ? { ...b, batchId: v } : b)) })}
                                disabled={disabled}
                              />
                              {batch && (
                                <p className="mt-0.5 font-mono text-[0.7rem] text-ink-muted">
                                  {batch.mfgDate ? `MFG ${batch.mfgDate}` : 'No MFG'} · {batch.expiryDate ? `EXP ${batch.expiryDate}` : 'No expiry'}
                                </p>
                              )}
                            </div>
                            <NumberCell
                              label={`Quantity from batch ${at + 1}`}
                              value={row.quantity}
                              readOnly={disabled}
                              onChange={(v) => setLine(index, { batches: line.batches.map((b, i) => (i === at ? { ...b, quantity: v } : b)) })}
                              width="w-16"
                            />
                            <button
                              type="button"
                              onClick={() => setLine(index, { batches: line.batches.filter((_, i) => i !== at) })}
                              aria-label={`Remove batch ${at + 1} from line ${index + 1}`}
                              disabled={disabled}
                              className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )
                      })}

                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => setLine(index, { batches: [...line.batches, { batchId: '', quantity: '' }] })}
                          aria-label={`Add a batch to line ${index + 1}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-green-deep hover:underline"
                        >
                          <Plus className="size-3" /> Batch
                        </button>
                      )}
                      {line.quantity && (
                        <p className={cn('text-[0.7rem]', allocated === Number(line.quantity) ? 'text-ink-muted' : 'text-warning-ink')}>
                          {allocated} of {line.quantity} picked
                        </p>
                      )}
                      {problem.batches && <p className="text-xs font-medium text-destructive">{problem.batches}</p>}
                    </div>
                  </td>

                  {/* Taken from the batch and the item, never typed again. */}
                  <td className="px-1 py-2.5 text-center align-top font-mono text-xs text-ink-muted">{monthYear(firstBatch?.mfgDate)}</td>
                  <td className="px-1 py-2.5 text-center align-top font-mono text-xs text-ink-muted">{monthYear(firstBatch?.expiryDate)}</td>
                  <td className="px-1 py-2.5 text-center align-top font-mono text-xs text-ink-muted">{item?.hsn || '—'}</td>
                  <td className="px-1 py-2.5 text-center align-top font-mono text-xs text-ink-muted">1</td>
                  <td className="px-1 py-2.5 align-top">
                    <div className="flex items-center justify-end gap-1">
                      <NumberCell
                        label={`Quantity of ${item?.name ?? 'item'}`}
                        value={line.quantity}
                        readOnly={disabled}
                        onChange={(v) => setLine(index, { quantity: v })}
                        invalid={Boolean(problem.quantity)}
                        width="w-16"
                      />
                      <span className="text-[10px] text-ink-muted">{item?.unit}</span>
                    </div>
                  </td>
                  <td className="px-1 py-2.5 text-right align-top font-mono text-xs text-ink-muted">
                    {item?.mrp ? formatPrice(item.mrp) : '—'}
                  </td>
                  <td className="px-1 py-2.5 text-right align-top font-mono text-sm whitespace-nowrap">
                    {money ? formatPrice(money.rate) : '—'}
                  </td>
                  <td className="px-1 py-2.5 text-right align-top font-mono text-sm whitespace-nowrap">
                    {money ? formatPrice(money.taxableValue) : '—'}
                  </td>
                  {/* The bill splits the tax into its halves, or shows IGST. */}
                  <td className="px-1 py-2.5 text-right align-top font-mono text-xs whitespace-nowrap">
                    {money && !interState ? formatPrice(Math.round((money.taxAmount / 2) * 100) / 100) : '0.00'}
                  </td>
                  <td className="px-1 py-2.5 text-right align-top font-mono text-xs whitespace-nowrap">
                    {money && !interState
                      ? formatPrice(Math.round((money.taxAmount - Math.round((money.taxAmount / 2) * 100) / 100) * 100) / 100)
                      : '0.00'}
                  </td>
                  <td className="px-1 py-2.5 text-right align-top font-mono text-xs whitespace-nowrap">
                    {money && interState ? formatPrice(money.taxAmount) : '0.00'}
                  </td>
                  <td className="px-2 py-2.5 align-top">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          'lines',
                          form.lines.filter((_, at) => at !== index),
                        )
                      }
                      aria-label={`Remove ${item?.name ?? 'item'}`}
                      disabled={disabled}
                      className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* No "+ New" here: the client does not create items while billing. */}
      <div className="flex items-center gap-3 border-t border-mint-pale p-4">
        <SearchSelect
          aria-label="Add product"
          placeholder="Enter product name"
          limit={10}
          options={itemOptions}
          value=""
          onChange={addItem}
          disabled={disabled}
          className="flex-1"
        />
      </div>
    </section>
  )
}

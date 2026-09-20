import { Gift, PackageSearch, Plus, Trash2 } from 'lucide-react'
import { SearchSelect } from '@/components/form/SearchSelect'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import { lineTotals } from '../../transactionModel'

function NumberCell({ value, onChange, label, prefix, invalid, readOnly, width = 'w-24' }) {
  return (
    <div className={cn('flex h-9 items-center overflow-hidden rounded-lg border bg-white', width, invalid ? 'border-destructive' : 'border-mint focus-within:border-green-fresh', readOnly && 'border-transparent bg-transparent')}>
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

/** Items table: S.No · Item · MRP · Qty · Rate · Discount · Tax · Amount, then "+ New" and product search. */
export function LineItemsTable({ lines, onChange, itemOptions, onAddItem, onNewItem, errors = {}, error }) {
  const update = (key, field, value) => onChange(lines.map((l) => (l.key === key ? { ...l, [field]: value } : l)))

  return (
    <section className="overflow-hidden rounded-2xl border border-mint-pale bg-white">
      <p className="border-b border-mint-pale px-5 py-4 text-xs font-bold tracking-wide text-ink-muted uppercase">Items</p>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-mint-pale bg-bg text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
              <th className="w-12 px-4 py-2.5">S.No</th>
              <th className="px-3 py-2.5">Items</th>
              <th className="px-3 py-2.5 text-right">MRP</th>
              <th className="px-3 py-2.5 text-right">Quantity</th>
              <th className="px-3 py-2.5 text-right">Rate / item</th>
              <th className="px-3 py-2.5 text-right">Discount / item</th>
              <th className="px-3 py-2.5 text-right">Tax</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
              <th className="w-10 px-2 py-2.5"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mint-pale">
            {lines.length === 0 && (
              <tr>
                <td colSpan={9} className={cn('px-4 py-12 text-center text-sm', error ? 'text-destructive' : 'text-ink-muted')}>
                  <PackageSearch className="mx-auto mb-2 size-7 text-green-deep" strokeWidth={1.5} />
                  {error ?? 'No items added yet. Search below to add your first item.'}
                </td>
              </tr>
            )}
            {lines.map((l, i) => {
              const t = lineTotals(l)
              const err = errors[l.key]
              return (
                <tr key={l.key} className={cn(l.free && 'bg-mint-pale/40')}>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-black">{l.name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                      <span className="font-mono">{l.code || '—'}</span>
                      {l.free ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-green-deep"><Gift className="size-3" /> {l.schemeName}</span>
                      ) : (
                        <>
                          {l.priceSource && l.priceSource !== 'Catalog' && <span className="font-semibold text-forest">{l.priceSource}</span>}
                          {l.schemeDiscount > 0 && <span className="font-semibold text-green-deep">Scheme −{formatPrice(l.schemeDiscount)}/unit</span>}
                        </>
                      )}
                    </p>
                    {err && <p className="text-xs font-medium text-destructive">{err}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-muted">{l.mrp ? formatPrice(l.mrp) : '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <NumberCell label={`Quantity of ${l.name}`} value={l.qty} readOnly={l.free} onChange={(v) => update(l.key, 'qty', v)} invalid={Boolean(err) && !(Number(l.qty) > 0)} width="w-20" />
                      <span className="w-10 text-xs text-ink-muted">{l.unit}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><div className="flex justify-end"><NumberCell label={`Rate of ${l.name}`} prefix="₹" value={l.rate} readOnly={l.free} onChange={(v) => update(l.key, 'rate', v)} invalid={Boolean(err) && !l.free} /></div></td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      {l.free ? (
                        <span className="text-xs font-semibold text-green-deep">{l.schemeDiscount >= l.rate ? 'FREE' : `−${formatPrice(l.schemeDiscount)}`}</span>
                      ) : (
                        <NumberCell label={`Discount on ${l.name}`} prefix="₹" value={l.discount || ''} onChange={(v) => update(l.key, 'discount', v)} width="w-20" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs whitespace-nowrap">
                    <span className="text-ink">{l.gst}%{l.cess ? ` + ${l.cess}%` : ''}</span>
                    <span className="block font-mono text-ink-muted">{formatPrice(t.gst + t.cess)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap text-black">{formatPrice(t.amount)}</td>
                  <td className="px-2 py-2.5">
                    <button type="button" onClick={() => onChange(lines.filter((x) => x.key !== l.key))} aria-label={`Remove ${l.name}`} className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 border-t border-mint-pale p-4">
        <button type="button" onClick={onNewItem} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-green-deep hover:underline">
          <Plus className="size-3.5" /> New
        </button>
        <SearchSelect aria-label="Add product" placeholder="Enter product name" options={itemOptions} value="" onChange={onAddItem} className="flex-1" />
      </div>
    </section>
  )
}

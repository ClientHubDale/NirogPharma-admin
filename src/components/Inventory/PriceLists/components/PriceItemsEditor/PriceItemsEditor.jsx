import { useMemo, useState } from 'react'
import { ListPlus, PackageSearch, Trash2 } from 'lucide-react'
import { SearchSelect } from '@/components/form/SearchSelect'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import { changeLabel } from '../../priceListModel'

/**
 * "Add items manually": search-to-add + a table of item · MRP · catalog · new price.
 * rows: [{ itemId, price }] (price is a string while editing).
 */
export function PriceItemsEditor({ rows, onChange, items, itemsById, rowErrors = {}, error }) {
  const [picker, setPicker] = useState('')
  const inList = useMemo(() => new Set(rows.map((r) => r.itemId)), [rows])
  const options = useMemo(
    () =>
      items
        .filter((i) => i.status === 'ACTIVE' && !inList.has(i.id))
        .map((i) => ({ value: i.id, label: i.name, hint: `${i.code || 'No code'} · catalog ${formatPrice(i.sellPrice)}` })),
    [items, inList],
  )

  const add = (itemId) => {
    const item = itemsById[itemId]
    if (item) onChange([...rows, { itemId, price: String(item.sellPrice) }])
    setPicker('')
  }
  const addAll = () =>
    onChange([...rows, ...items.filter((i) => i.status === 'ACTIVE' && !inList.has(i.id)).map((i) => ({ itemId: i.id, price: String(i.sellPrice) }))])
  const setPrice = (itemId, price) => onChange(rows.map((r) => (r.itemId === itemId ? { ...r, price } : r)))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <SearchSelect
          aria-label="Search item to add"
          placeholder="Search item to add"
          options={options}
          value={picker}
          onChange={add}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="lg" className="h-11" onClick={addAll} disabled={options.length === 0}>
          <ListPlus data-icon="inline-start" /> Add all active items
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className={cn('grid place-items-center rounded-xl border-2 border-dashed px-6 py-12 text-center', error ? 'border-destructive/50' : 'border-mint')}>
          <PackageSearch className="size-8 text-green-deep" strokeWidth={1.5} />
          <p className="mt-3 font-semibold text-black">No items in this price list yet</p>
          <p className="mt-1 text-sm text-ink-muted">Search above to add items one by one, or use Import from Excel.</p>
        </div>
      ) : (
        <div className="relative max-h-[28rem] overflow-auto rounded-xl border border-mint-pale">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="sticky top-0 z-10 bg-bg">
              <tr className="border-b border-mint-pale text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
                <th className="px-4 py-2.5">Item</th>
                <th className="px-3 py-2.5 text-right">MRP</th>
                <th className="px-3 py-2.5 text-right">Catalog</th>
                <th className="px-3 py-2.5">New price</th>
                <th className="px-3 py-2.5 text-right">Change</th>
                <th className="w-10 px-2 py-2.5">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mint-pale">
              {rows.map((row) => {
                const item = itemsById[row.itemId]
                if (!item) return null
                const rowError = rowErrors[row.itemId]
                const change = changeLabel(item.sellPrice, row.price)
                return (
                  <tr key={row.itemId}>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-black">{item.name}</p>
                      <p className="font-mono text-xs text-ink-muted">{item.code || '—'}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap text-ink-muted">{item.mrp ? formatPrice(item.mrp) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap text-ink">{formatPrice(item.sellPrice)}</td>
                    <td className="px-3 py-2.5">
                      <div
                        className={cn(
                          'flex h-9 w-32 items-center overflow-hidden rounded-lg border bg-white',
                          rowError ? 'border-destructive' : 'border-mint focus-within:border-green-fresh focus-within:ring-3 focus-within:ring-ring/25',
                        )}
                      >
                        <span className="pl-2.5 text-sm text-ink-muted">₹</span>
                        <input
                          value={row.price}
                          inputMode="decimal"
                          aria-label={`New price for ${item.name}`}
                          aria-invalid={Boolean(rowError)}
                          onChange={(e) => setPrice(row.itemId, e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
                          className="h-full w-full min-w-0 bg-transparent px-2 font-mono text-sm outline-none"
                        />
                      </div>
                      {rowError && <p className="mt-1 text-xs font-medium text-destructive">{rowError}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap text-ink-muted">{change ?? '—'}</td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => onChange(rows.filter((r) => r.itemId !== row.itemId))}
                        aria-label={`Remove ${item.name}`}
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
      )}
      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : <span />}
        {rows.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-sm font-semibold text-ink-muted hover:text-danger">
            Remove all ({rows.length})
          </button>
        )}
      </div>
    </div>
  )
}

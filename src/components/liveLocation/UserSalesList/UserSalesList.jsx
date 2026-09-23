import { useState } from 'react'
import { ChevronDown, ShoppingBag } from 'lucide-react'
import { StatusPill } from '@/components/data/StatusPill'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The secondary sales a field user booked on the open day — what they sold to
 * retailers. Opening one shows the items on that document.
 * sales: [{ id, kind, number, partyName, status, total, qty, lines }]
 */
export function UserSalesList({ sales, emptyText }) {
  const [openId, setOpenId] = useState(null)

  if (!sales.length) return <p className="px-4 py-10 text-center text-sm text-ink-muted">{emptyText}</p>

  const total = sales.reduce((sum, sale) => sum + sale.total, 0)

  return (
    <div className="px-2 pb-4">
      <p className="px-2 pb-2 text-xs text-ink-muted">
        {sales.length} {sales.length === 1 ? 'sale' : 'sales'} · <span className="font-mono font-semibold text-black">{formatPrice(total)}</span>
      </p>
      <ul className="space-y-2">
        {sales.map((sale) => {
          const open = openId === sale.id
          return (
            <li key={sale.id} className="overflow-hidden rounded-xl border border-mint-pale">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : sale.id)}
                className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors', open ? 'bg-mint-pale' : 'hover:bg-bg')}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg text-green-deep">
                  <ShoppingBag className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-black">{sale.partyName}</span>
                  <span className="block truncate font-mono text-[0.7rem] text-ink-muted">{sale.number}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm font-semibold text-black">{formatPrice(sale.total)}</span>
                  <span className="block text-[0.7rem] text-ink-muted">
                    {sale.lines.length} item{sale.lines.length === 1 ? '' : 's'} · {sale.qty} units
                  </span>
                </span>
                <ChevronDown className={cn('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} />
              </button>

              {open && (
                <div className="border-t border-mint-pale bg-white px-3 py-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <StatusPill tone={sale.tone}>{sale.status}</StatusPill>
                    <span className="text-xs font-medium text-ink-muted">{sale.kind}</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-ink-muted">
                        <th className="pb-1 font-semibold">Item</th>
                        <th className="pb-1 text-right font-semibold">Qty</th>
                        <th className="pb-1 text-right font-semibold">Rate</th>
                        <th className="pb-1 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mint-pale">
                      {sale.lines.map((line) => (
                        <tr key={line.key}>
                          <td className="py-1.5 pr-2">
                            <span className="block font-medium text-black">{line.name}</span>
                            {line.free && <span className="text-[0.7rem] font-semibold text-green-deep">Free — {line.schemeName}</span>}
                          </td>
                          <td className="py-1.5 text-right font-mono whitespace-nowrap text-ink">
                            {line.qty} {line.unit}
                          </td>
                          <td className="py-1.5 text-right font-mono whitespace-nowrap text-ink">{formatPrice(line.rate)}</td>
                          <td className="py-1.5 text-right font-mono whitespace-nowrap font-medium text-black">{formatPrice(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
